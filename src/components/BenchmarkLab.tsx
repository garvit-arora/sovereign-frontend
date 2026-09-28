import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive, CircleAlert, CircleCheck, Clock3, Cpu, FlaskConical, Gauge, History, Loader2, Play, Plus, Scale,
  ShieldCheck, Square, Trash2, type LucideIcon,
} from 'lucide-react'
import { request, type Machine } from '@/lib/workspace'
import {
  OUTCOME_LABEL, formatObjective, formatSeconds, outcomeOf, sizeLabel,
  type BenchRow, type BenchRun, type BenchSummary, type Kind, type LabCatalogue, type RecordedRun, type RunListItem,
} from '@/lib/benchmarks'
import { OutcomeBars, ScalingChart, SpeedScatter } from './BenchmarkCharts'

const RUN_KEY = 'sovereign.benchmark.run'
const COORDINATOR = 'https://sovereign-we6b.onrender.com'
const KIND_ORDER: Kind[] = ['LP', 'MILP', 'QP']
const SUITE_NOTE: Record<string, string> = {
  'Netlib LP': 'Classic public LP test set.',
  'MIPLIB LP relaxation': 'Official MIPLIB files with integrality removed.',
  'MIPLIB official': 'Full integer problems from MIPLIB 2017.',
  'Synthetic robustness': 'Built to break naive solvers.',
  'Synthetic scale': 'Same structure, growing size.',
  'Industrial example': 'Repository examples, not proprietary data.',
  'QP example': 'Convex quadratic objectives.',
  'GPU showcase': 'Dense enough for CUDA to matter.',
  'Sparse scale': 'Thousands of rows; sparse factorization.',
}
const when = (seconds: number) => new Date(seconds * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function BenchmarkLab({ machines }: { machines: Machine[] }) {
  const [catalogue, setCatalogue] = useState<LabCatalogue | null>(null)
  const [runs, setRuns] = useState<RunListItem[]>([])
  const [runId, setRunId] = useState<string | null>(() => localStorage.getItem(RUN_KEY))
  const [run, setRun] = useState<BenchRun | null>(null)
  const [recorded, setRecorded] = useState<RecordedRun | null>(null)
  const [mode, setMode] = useState<'live' | 'recorded'>('live')
  const [setupOpen, setSetupOpen] = useState(false)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)

  const [preset, setPreset] = useState('quick')
  const [datasets, setDatasets] = useState<Set<string>>(new Set())
  const [profiles, setProfiles] = useState<Set<string>>(new Set())
  const [device, setDevice] = useState('cpu'), [reference, setReference] = useState(true)
  const [limit, setLimit] = useState(30), [target, setTarget] = useState('')

  const applyPreset = useCallback((id: string, cat: LabCatalogue | null) => {
    const p = cat?.presets.find(x => x.id === id)
    if (!p) return
    setPreset(id)
    setDatasets(new Set(p.datasets))
    setProfiles(new Set(p.profiles))
    setDevice(p.device ?? 'cpu')
    setLimit(p.timeLimitSeconds ?? 30)
  }, [])

  const loadRuns = useCallback(async () => {
    const list = (await request<{ runs: RunListItem[] }>('/api/benchmarks/runs')).runs
    setRuns(list)
    return list
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cat, list] = await Promise.all([request<LabCatalogue>('/api/benchmarks/catalogue'), loadRuns()])
        if (cancelled) return
        setCatalogue(cat)
        applyPreset('quick', cat)
        const stored = localStorage.getItem(RUN_KEY)
        const current = list.find(r => r.runId === stored) ?? list[0]
        if (current) setRunId(current.runId)
        else setSetupOpen(true)
      } catch (e) { if (!cancelled) setError((e as Error).message) }
    })()
    return () => { cancelled = true }
  }, [loadRuns, applyPreset])

  useEffect(() => {
    if (!runId) return
    localStorage.setItem(RUN_KEY, runId)
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const next = await request<BenchRun>(`/api/benchmarks/runs/${runId}`)
        if (!active) return
        setRun(next)
        setError('')
        if (next.state === 'running') timer = setTimeout(poll, 1500)
        else void loadRuns()
      } catch (e) {
        if (!active) return
        if ((e as { status?: number }).status === 404) { localStorage.removeItem(RUN_KEY); setRun(null); setRunId(null); setSetupOpen(true); return }
        setError((e as Error).message)
        timer = setTimeout(poll, 4000)
      }
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [runId, loadRuns])

  useEffect(() => {
    if (mode !== 'recorded' || recorded) return
    request<RecordedRun>('/api/benchmarks/recorded').then(setRecorded).catch(e => setError((e as Error).message))
  }, [mode, recorded])

  const online = machines.filter(m => m.online)
  const highsReady = online.some(m => m.capabilities.reference_solvers?.includes('highs') && (!target || m.id === target))
  const gpuMachine = online.find(m => m.capabilities.cuda_available && (!target || m.id === target))
  const gpuPreset = catalogue?.presets.find(p => p.device === 'cuda')
  const kindOf = useMemo(() => new Map((catalogue?.datasets ?? []).map(d => [d.id, (d.shape.problem_type ?? 'LP').toUpperCase() as Kind])), [catalogue])
  const plannedJobs = useMemo(() => {
    let n = 0
    for (const id of datasets) {
      const matching = (catalogue?.profiles ?? []).filter(p => profiles.has(p.id) && p.kind === kindOf.get(id)).length
      if (matching) n += matching + (reference ? 1 : 0)
    }
    return n
  }, [datasets, profiles, reference, catalogue, kindOf])

  async function start() {
    setBusy(true); setError('')
    try {
      const created = await request<{ runId: string; jobs: number }>('/api/benchmarks/runs', 'POST', {
        datasets: [...datasets], profiles: [...profiles], device, reference, timeLimitSeconds: limit, workerId: target || null,
      })
      setRun(null)
      setRunId(created.runId)
      setSetupOpen(false)
      setMode('live')
      void loadRuns()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function cancelRun() {
    if (!runId) return
    setBusy(true)
    try { await request(`/api/benchmarks/runs/${runId}/cancel`, 'POST', {}); setRun(await request<BenchRun>(`/api/benchmarks/runs/${runId}`)) }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function deleteRun() {
    if (!runId) return
    setBusy(true)
    try {
      await request(`/api/benchmarks/runs/${runId}`, 'DELETE')
      localStorage.removeItem(RUN_KEY)
      const list = await loadRuns()
      setRun(null)
      setRunId(list[0]?.runId ?? null)
      if (!list.length) setSetupOpen(true)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const toggle = (set: Set<string>, id: string, update: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update(next)
    setPreset('')
  }

  const suites = useMemo(() => {
    const map = new Map<string, LabCatalogue['datasets']>()
    for (const d of catalogue?.datasets ?? []) map.set(d.suite, [...(map.get(d.suite) ?? []), d])
    return [...map]
  }, [catalogue])

  const shown = mode === 'recorded' ? recorded?.rows ?? [] : run?.rows ?? []
  const summary = mode === 'recorded' ? recorded?.summary ?? null : run?.summary ?? null

  return <div className="bench">
    {error && <div role="alert" className="error-banner"><CircleAlert size={16} /><span>{error}</span></div>}

    <section className="surface bench-explainer">
      <div className="bench-steps">
        <Step icon={FlaskConical} title="Pick models and methods" text="Public test sets, stress cases and industrial examples." />
        <Step icon={Cpu} title="Your machine solves them now" text="Sovereign solves each model; HiGHS solves the same file on the same machine for reference." />
        <Step icon={ShieldCheck} title="Every answer is checked" text="An independent verifier recomputes constraints, bounds and the objective." />
      </div>
      <div className="bench-explainer-actions">
        <div className="segmented" role="group" aria-label="Choose what to show">
          <button type="button" className={mode === 'live' ? 'active' : ''} aria-pressed={mode === 'live'} onClick={() => setMode('live')}><Gauge size={14} />Live runs</button>
          <button type="button" className={mode === 'recorded' ? 'active' : ''} aria-pressed={mode === 'recorded'} onClick={() => setMode('recorded')}><Archive size={14} />Recorded evidence</button>
        </div>
        {mode === 'live' && !setupOpen && <button className="primary-button" onClick={() => setSetupOpen(true)}><Plus size={15} />New run</button>}
      </div>
    </section>

    {mode === 'live' && setupOpen && <section className="surface bench-setup">
      <div className="surface-heading"><h2><Play size={15} />New benchmark run</h2>
        {run && <button className="quiet-button push-right" onClick={() => setSetupOpen(false)}>Close</button>}
      </div>
      {!catalogue ? <div className="bench-loading"><Loader2 size={16} className="spin" />Loading datasets</div> : <div className="bench-setup-body">
        <div className="bench-presets" role="group" aria-label="Presets">
          {catalogue.presets.map(p => <button key={p.id} type="button" className={`bench-preset ${preset === p.id ? 'active' : ''}`} aria-pressed={preset === p.id} onClick={() => applyPreset(p.id, catalogue)}>
            <strong>{p.label}</strong><small>{p.description}</small>
          </button>)}
        </div>
        <div className="bench-pickers">
          <div>
            <h3>Models <span className="count-pill">{datasets.size}</span></h3>
            <div className="bench-suites">
              {suites.map(([suite, items]) => <fieldset key={suite} className="bench-suite">
                <legend>{suite}<small>{SUITE_NOTE[suite]}</small></legend>
                {items.map(d => <label key={d.id} className="bench-check">
                  <input type="checkbox" checked={datasets.has(d.id)} onChange={() => toggle(datasets, d.id, setDatasets)} />
                  <span className="mono">{d.id}</span>
                  <span className={`kind-tag kind-${(d.shape.problem_type ?? 'lp').toLowerCase()}`}>{(d.shape.problem_type ?? 'LP').toUpperCase()}</span>
                  <small>{sizeLabel(d.shape)}</small>
                </label>)}
              </fieldset>)}
            </div>
          </div>
          <div>
            <h3>Methods <span className="count-pill">{profiles.size}</span></h3>
            {KIND_ORDER.map(kind => <fieldset key={kind} className="bench-suite">
              <legend>{kind === 'LP' ? 'Linear programs' : kind === 'MILP' ? 'Mixed-integer programs' : 'Quadratic programs'}</legend>
              {catalogue.profiles.filter(p => p.kind === kind).map(p => <label key={p.id} className="bench-check">
                <input type="checkbox" checked={profiles.has(p.id)} onChange={() => toggle(profiles, p.id, setProfiles)} />
                <span>{p.label}</span>
                {p.cpuOnly && device !== 'cpu' && <span className="tag">CPU only</span>}
              </label>)}
            </fieldset>)}
            <div className="bench-options">
              <label>Compute<select value={device} onChange={e => setDevice(e.target.value)}>
                <option value="cpu">CPU</option><option value="auto">Automatic routing</option><option value="cuda">GPU (CUDA)</option>
              </select></label>
              <label>Time limit per job<select value={limit} onChange={e => setLimit(Number(e.target.value))}>
                {[10, 30, 60, 120, 300].map(s => <option key={s} value={s}>{s} seconds</option>)}
              </select></label>
              <label>Run on<select value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">Any available machine</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}{m.online ? '' : ' (offline)'}</option>)}
              </select></label>
              <label className="bench-check bench-toggle">
                <input type="checkbox" checked={reference} onChange={e => setReference(e.target.checked)} />
                <span>Compare with HiGHS on the same machine</span>
              </label>
            </div>
          </div>
        </div>
        {!online.length && <p className="info-note">No machine is online. Jobs will wait in the queue until one connects.</p>}
        {reference && online.length > 0 && !highsReady && <div className="info-note">
          <strong>No machine with HiGHS is online</strong>
          <p>Sovereign jobs run on any machine. HiGHS reference jobs only go to a machine that reports HiGHS; until one connects they stay queued. On Windows, <code>sovereign-compute</code> 0.4.0 and later include HiGHS, so update the connector and connect again:</p>
          <pre className="bench-command">{`npm install -g sovereign-compute@0.4.0\nsovereign connect --server ${COORDINATOR}`}</pre>
        </div>}
        {device === 'cpu' && gpuMachine && gpuPreset && preset !== gpuPreset.id && <div className="info-note">
          <strong>{gpuMachine.name} has a CUDA GPU{gpuMachine.capabilities.gpu_name ? ` (${gpuMachine.capabilities.gpu_name})` : ''}</strong>
          <p>This run is set to CPU, so every job runs on the CPU. The {gpuPreset.label} preset runs interior point on the GPU and on the CPU for the same large models, so you can compare them.</p>
          <button type="button" className="quiet-button" onClick={() => applyPreset(gpuPreset.id, catalogue)}>Use {gpuPreset.label}</button>
        </div>}
        {device === 'cuda' && online.length > 0 && !gpuMachine && <p className="info-note">No CUDA-ready machine is online. GPU jobs will wait in the queue; simplex, Frank-Wolfe and branch-and-bound jobs still run on the CPU.</p>}
        {device !== 'cpu' && <p className="info-note">CUDA runs the dense factorization inside LP and QP interior point, the main cost of each iteration. On the CPU, LP and QP interior point factor a sparse system instead, which is often faster when the model is sparse. Automatic routing sends large models to a GPU machine and lets the engine pick the faster of the two. Simplex, Frank-Wolfe and branch-and-bound always run on the CPU. Each result reports how many GPU operations it actually executed.</p>}
        <div className="bench-setup-footer">
          <span className="muted">{plannedJobs} jobs{reference ? ', including one HiGHS reference per model' : ''}</span>
          <button className="primary-button" disabled={busy || !plannedJobs} onClick={() => void start()}>{busy ? <Loader2 size={15} className="spin" /> : <Play size={15} />}Start run</button>
        </div>
      </div>}
    </section>}

    {mode === 'live' && run && <RunHeader run={run} runs={runs} busy={busy} onSelect={id => { setRun(null); setRunId(id) }} onCancel={() => void cancelRun()} onDelete={() => void deleteRun()} />}
    {mode === 'live' && !run && runId && <section className="surface bench-loading"><Loader2 size={16} className="spin" />Loading run</section>}
    {mode === 'recorded' && recorded?.recorded && <div className="info-note bench-recorded">
      <strong>Recorded run, not live</strong>
      <p>Measured {new Date(recorded.recorded.generatedAt).toLocaleString()} on {recorded.recorded.platform} with {recorded.recorded.cpuThreads} CPU threads, {recorded.recorded.timeLimitSeconds} s per job. The solver has changed since then; start a live run to measure the current build.</p>
    </div>}
    {mode === 'recorded' && !recorded && <section className="surface bench-loading"><Loader2 size={16} className="spin" />Loading recorded evidence</section>}

    {summary && shown.length > 0 && <>
      <Tiles summary={summary} />
      <div className="bench-charts">
        <section className="surface">
          <div className="surface-heading"><h2><Gauge size={15} />Speed against HiGHS</h2></div>
          <p className="chart-caption">Each dot is one model and method. Below the diagonal, Sovereign finished first. Same file, same machine; HiGHS uses one thread.</p>
          <SpeedScatter rows={shown} />
        </section>
        <section className="surface">
          <div className="surface-heading"><h2><Scale size={15} />Time as models grow</h2></div>
          <p className="chart-caption">Solve time against model size. Lines connect the synthetic scale sweep; grey diamonds are HiGHS on the same models.</p>
          <ScalingChart rows={shown} />
        </section>
      </div>
      <section className="surface">
        <div className="surface-heading"><h2><CircleCheck size={15} />Outcome by method</h2></div>
        <OutcomeBars rows={shown} />
      </section>
      <ResultsTable rows={shown} />
    </>}
  </div>
}

function Step({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="bench-step"><span className="stat-icon tone-blue"><Icon size={15} strokeWidth={1.9} /></span><span><strong>{title}</strong><small>{text}</small></span></div>
}

function RunHeader({ run, runs, busy, onSelect, onCancel, onDelete }: {
  run: BenchRun; runs: RunListItem[]; busy: boolean; onSelect: (id: string) => void; onCancel: () => void; onDelete: () => void
}) {
  const s = run.summary
  const pct = s.jobs ? Math.round(s.jobsFinished / s.jobs * 100) : 0
  const cfg = run.config
  return <section className="surface bench-run">
    <div className="bench-run-top">
      <div>
        <div className="bench-run-title">
          {run.state === 'running'
            ? <span className="status status-solving"><span className="status-indicator" />Running</span>
            : <span className="status status-completed"><span className="status-indicator" />Finished</span>}
          <strong>Live run · {when(run.created)}</strong>
        </div>
        <p className="muted">
          {cfg.device === 'cuda' ? 'GPU (CUDA)' : cfg.device === 'auto' ? 'Automatic routing' : 'CPU'} · {cfg.timeLimitSeconds} s limit per job · {cfg.reference ? 'HiGHS reference on' : 'no reference solver'}
        </p>
      </div>
      <div className="bench-run-actions">
        {runs.length > 1 && <label className="bench-history"><History size={14} /><select aria-label="Previous runs" value={run.runId} onChange={e => onSelect(e.target.value)}>
          {runs.map(r => <option key={r.runId} value={r.runId}>{when(r.created)} · {r.jobs} jobs</option>)}
        </select></label>}
        {run.state === 'running'
          ? <button className="quiet-button danger-text" disabled={busy} onClick={onCancel}><Square size={13} />Stop run</button>
          : <button className="quiet-button danger-text" disabled={busy} onClick={onDelete}><Trash2 size={14} />Delete run</button>}
      </div>
    </div>
    <div className="bench-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Run progress">
      <span style={{ width: `${pct}%` }} />
    </div>
    <div className="bench-run-meta">
      <span>{s.jobsFinished} of {s.jobs} jobs finished{s.running ? ` · ${s.running} solving` : ''}{s.queued ? ` · ${s.queued} queued` : ''}</span>
      {run.machines.map(m => <span key={m.id} className="bench-machine"><Cpu size={13} />{m.name}
        {m.cpuThreads ? ` · ${m.cpuThreads} threads` : ''}{m.gpu ? ` · ${m.gpu}` : ''}{m.engineVersion ? ` · engine v${m.engineVersion}` : ''}{m.highsVersion ? ` · HiGHS ${m.highsVersion}` : ''}</span>)}
    </div>
  </section>
}

function Tiles({ summary: s }: { summary: BenchSummary }) {
  const ratio = s.geomeanTimeRatio
  const speed = ratio == null ? '—' : ratio >= 1 ? `${ratio.toFixed(1)}× slower` : `${(1 / ratio).toFixed(1)}× faster`
  return <div className="stat-grid">
    <Tile icon={Clock3} tone="neutral" label="Finished" value={`${s.finished} / ${s.rows}`} detail={s.timeLimits || s.errors ? `${s.timeLimits} hit the limit · ${s.errors} failed` : 'Sovereign runs'} />
    <Tile icon={ShieldCheck} tone="green" label="Independently verified" value={`${s.verified} / ${s.finished}`} detail="Constraints, bounds and objective rechecked" />
    <Tile icon={CircleCheck} tone="blue" label="Match HiGHS" value={`${s.agreements} / ${s.compared}`} detail={s.disagreements ? `${s.disagreements} differ; see the table` : 'Same status and objective'} />
    <Tile icon={Gauge} tone="amber" label="Speed vs HiGHS" value={speed} detail={ratio == null ? 'Needs runs that match HiGHS' : `Geometric mean over ${s.ratioCount} matched runs; single runs, not averaged`} />
  </div>
}

function Tile({ icon: Icon, tone, label, value, detail }: { icon: LucideIcon; tone: 'neutral' | 'blue' | 'amber' | 'green'; label: string; value: string; detail: string }) {
  return <div className="stat">
    <div className="stat-top"><span className="stat-label">{label}</span><span className={`stat-icon tone-${tone}`}><Icon size={15} strokeWidth={1.9} /></span></div>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
}

function ResultsTable({ rows }: { rows: BenchRow[] }) {
  const order = useMemo(() => {
    const first = new Map<string, number>()
    rows.forEach((r, i) => { if (!first.has(r.dataset)) first.set(r.dataset, i) })
    return [...rows].sort((a, b) => first.get(a.dataset)! - first.get(b.dataset)!)
  }, [rows])
  return <section className="surface">
    <div className="surface-heading"><h2>Results<span className="count-pill">{rows.length}</span></h2>
      <span className="muted push-right bench-table-note">Solve times as reported by each solver, excluding file loading.</span>
    </div>
    <div className="table-scroll">
      <table className="data-table bench-table">
        <thead><tr><th>Model</th><th>Method</th><th>Sovereign</th><th className="num">Objective</th><th className="num">Time</th><th className="num hide-sm">HiGHS time</th><th>Outcome</th></tr></thead>
        <tbody>{order.map((r, i) => {
          const outcome = outcomeOf(r)
          const firstOfModel = i === 0 || order[i - 1].dataset !== r.dataset
          return <tr key={r.id} className={`bench-row ${firstOfModel ? 'first-of-model' : ''}`}>
            <td>{firstOfModel && <div className="bench-model">
              <span className="mono">{r.dataset}</span>
              <small>{r.suite} · {sizeLabel(r.shape)} <span className={`kind-tag kind-${r.kind.toLowerCase()}`}>{r.kind}</span></small>
            </div>}</td>
            <td><div className="bench-method"><span>{r.profileLabel}</span>
              <small>{r.gpuUsed ? `CUDA · ${r.gpuOperations} GPU ops` : (r.executionDevice ?? 'cpu').toUpperCase()}{r.nodes ? ` · ${r.nodes} nodes` : ''}</small></div></td>
            <td>{outcome === 'pending'
              ? <span className={`status status-${r.state === 'SOLVING' ? 'solving' : 'queued'}`}><span className="status-indicator" />{r.state === 'SOLVING' ? 'Solving' : 'Queued'}</span>
              : <span className="mono bench-status" title={r.message}>{r.status ?? '—'}{r.verified && <ShieldCheck size={13} aria-label="verified" />}</span>}</td>
            <td className="num mono">{formatObjective(r.objective)}</td>
            <td className="num mono">{formatSeconds(r.runtimeSeconds)}</td>
            <td className="num mono muted hide-sm" title={r.reference?.message}>{r.reference
              ? r.reference.state === 'QUEUED' || r.reference.state === 'SOLVING' ? 'waiting' : r.reference.status === 'OPTIMAL' ? formatSeconds(r.reference.runtimeSeconds) : r.reference.status ?? '—'
              : '—'}</td>
            <td><span className={`bench-outcome outcome-${outcome}`} title={r.message}>{OUTCOME_LABEL[outcome]}</span></td>
          </tr>
        })}</tbody>
      </table>
    </div>
  </section>
}
