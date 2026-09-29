import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import {
  Activity, ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, CircleAlert, CircleCheck, CircleSlash, CircleX,
  Clock3, Copy, Cpu, FileCode2, Gauge, Inbox, LayoutGrid, ListChecks, Loader2, Menu, Monitor, Plus, Search, Server, ShieldCheck,
  Terminal, Trash2, Unplug, Upload, type LucideIcon,
} from 'lucide-react'
import { EXAMPLES, EXAMPLE_GROUPS, type ExampleGroup } from '@/lib/examples'
import { logout } from '@/lib/firebase'
import { pathForView, viewFromPath, type AppView } from '@/lib/routes'
import { userDisplayName } from '@/lib/user'
import { request, WorkspaceError, type Job, type Machine, type Workspace } from '@/lib/workspace'
import { AccountPage } from './AccountPage'
import { AlgorithmOptions } from './AlgorithmOptions'
import { BenchmarkLab } from './BenchmarkLab'
import { ResultSummary } from './ResultSummary'
import { SovereignMark } from './SovereignMark'
import { UserAvatar } from './UserAvatar'
import { ConfirmDialog, WorkspaceModal } from './WorkspaceModal'
import { DEFAULT_ALGORITHMS } from '@/lib/algorithms'

type View = AppView
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'jobs', label: 'Jobs', icon: ListChecks },
  { id: 'benchmarks', label: 'Benchmarks', icon: Gauge },
  { id: 'machines', label: 'Machines', icon: Server },
] as const
const PAGE: Record<View, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Jobs, machines and recent activity in this workspace.' },
  jobs: { title: 'Jobs', description: 'Optimization models submitted from this account, with their status and results.' },
  benchmarks: { title: 'Benchmarks', description: 'Run public test sets on your machine right now and compare every answer and timing with HiGHS.' },
  machines: { title: 'Machines', description: 'Computers paired with this workspace. Every solve runs on one of them.' },
  account: { title: 'Account', description: 'Profile, sign-in method and workspace usage.' },
}
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'SOLVING', label: 'Running' },
  { id: 'QUEUED', label: 'Queued' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]
const CONNECTOR_VERSION = '0.4.2'
const CONNECTOR_INSTALL = `npm install -g sovereign-compute@${CONNECTOR_VERSION}`
const terminal = (state: string) => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(state)
const nice = (text: string) => text.toLowerCase().replaceAll('_', ' ').replace(/^./, x => x.toUpperCase())
const stateLabel = (state: string) => state === 'SOLVING' ? 'Running' : nice(state)
const when = (seconds: number) => new Date(seconds * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const formatNumber = (n?: number | null) => n == null ? '—' : Number(n.toPrecision(8)).toLocaleString()
const deviceLabel = (device: string) => device === 'cuda' ? 'GPU (CUDA)' : device === 'auto' ? 'Automatic' : 'CPU'
const problemKind = (job: Job) => job.routing?.shape?.problem_type?.toUpperCase()
function ago(seconds: number) {
  const diff = Math.max(0, Date.now() / 1000 - seconds)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  return `${Math.floor(diff / 86400)} d ago`
}
function hardwareSummary(w: Machine) {
  const parts = [w.capabilities.gpu_name, w.capabilities.cpu_threads ? `${w.capabilities.cpu_threads} CPU threads` : null]
  return parts.filter(Boolean).join(' · ') || 'Waiting for first connection'
}
function GpuTag({ caps }: { caps: Machine['capabilities'] }) {
  if (caps.cuda_available) {
    const detail = [caps.gpu_memory_mb ? `${caps.gpu_memory_mb} MB` : null,
      caps.gpu_compute_capability ? `compute ${caps.gpu_compute_capability}` : null,
      caps.cuda_driver_version ? `CUDA ${caps.cuda_driver_version} driver` : null].filter(Boolean).join(' · ')
    return <span className="tag" title={detail || undefined}>CUDA</span>
  }
  if (!caps.gpu_name) return null
  return <span className="tag warn" title={caps.cuda_reason || 'This machine\u2019s engine cannot use its GPU. Update the connector.'}>GPU not usable</span>
}

type ConfirmState = {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  action: () => Promise<void>
} | null

export function CloudDashboard({ user }: { user: User }) {
  const [view, setView] = useState<View>(() => viewFromPath())
  const [data, setData] = useState<Workspace>({ workers: [], jobs: [] })
  const [ready, setReady] = useState(false), [error, setError] = useState('')
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [mobile, setMobile] = useState(false)
  const [dialog, setDialog] = useState<'job' | 'machine' | 'help' | null>(null)
  const [selected, setSelected] = useState<Job | null>(null), [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null), [confirmBusy, setConfirmBusy] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const refresh = useCallback(async () => {
    try { setData(await request<Workspace>('/api/workspace')); setError(''); setReady(true) }
    catch (e) {
      if (e instanceof WorkspaceError && e.status === 401) {
        const next = `${window.location.pathname}${window.location.search}`
        await logout(`/login?next=${encodeURIComponent(next || '/app')}`)
        return
      }
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let polling = false
    const poll = async () => {
      if (!active || polling) return
      polling = true
      try { await refresh() } finally { polling = false }
      if (active) timer = setTimeout(poll, 3000)
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [refresh])
  useEffect(() => {
    const onPopState = () => setView(viewFromPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const selectedId = selected?.id, selectedState = selected?.state
  // A response that lands after the card was closed (or switched) must not reopen it.
  const openRequest = useRef(0)
  useEffect(() => {
    if (!selectedId || !selectedState || terminal(selectedState)) return
    let active = true
    const timer = setInterval(() => {
      request<Job>(`/api/jobs/${selectedId}`)
        .then(job => { if (active) setSelected(current => current?.id === job.id ? job : current) })
        .catch(e => { if (active) setError(e.message) })
    }, 2000)
    return () => { active = false; clearInterval(timer) }
  }, [selectedId, selectedState])
  async function openJob(id: string) {
    const ticket = ++openRequest.current
    try {
      const job = await request<Job>(`/api/jobs/${id}`)
      if (ticket === openRequest.current) setSelected(job)
    } catch (e) { setError((e as Error).message) }
  }
  function closeJob() { openRequest.current++; setSelected(null) }
  async function cancelJob(id: string) {
    setBusy(true)
    try { await request(`/api/jobs/${id}/cancel`, 'POST', {}); await openJob(id); await refresh() }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  function askDisconnect(machine: Machine) {
    setConfirm({
      title: 'Disconnect machine',
      message: `Disconnect ${machine.name}? Its worker key will be revoked and it will stop receiving jobs.`,
      confirmLabel: 'Disconnect',
      danger: true,
      action: async () => {
        await request(`/api/workers/${machine.id}`, 'DELETE')
        await refresh()
      },
    })
  }
  function askCancelJob(job: Job) {
    setConfirm({
      title: 'Cancel job',
      message: `Stop "${job.name}"? The solver will be interrupted if it is already running.`,
      confirmLabel: 'Cancel job',
      danger: true,
      action: async () => { await cancelJob(job.id) },
    })
  }
  function askDeleteJob(job: Job) {
    setConfirm({
      title: 'Delete job',
      message: `Delete "${job.name}"? Its model and result will be removed from this workspace. This cannot be undone.`,
      confirmLabel: 'Delete job',
      danger: true,
      action: async () => {
        await request(`/api/jobs/${job.id}`, 'DELETE')
        setSelected(current => current?.id === job.id ? null : current)
        await refresh()
      },
    })
  }
  function askDeleteFinished() {
    const finished = data.jobs.filter(j => terminal(j.state))
    setConfirm({
      title: 'Delete finished jobs',
      message: `Delete ${finished.length} finished ${finished.length === 1 ? 'job' : 'jobs'}? Completed, failed and cancelled jobs and their results will be removed. This cannot be undone.`,
      confirmLabel: `Delete ${finished.length} ${finished.length === 1 ? 'job' : 'jobs'}`,
      danger: true,
      action: async () => {
        try {
          for (const job of finished) await request(`/api/jobs/${job.id}`, 'DELETE')
        } finally {
          await refresh()
        }
      },
    })
  }
  async function runConfirm() {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      await confirm.action()
      setConfirm(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setConfirmBusy(false)
    }
  }
  const online = data.workers.filter(w => w.online)
  const running = data.jobs.filter(j => j.state === 'SOLVING')
  const completed = data.jobs.filter(j => j.state === 'COMPLETED')
  const queued = data.jobs.filter(j => j.state === 'QUEUED')
  const failed = data.jobs.filter(j => j.state === 'FAILED')
  const finishedCount = data.jobs.filter(j => terminal(j.state)).length
  const jobs = data.jobs.filter(j => j.name.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || j.state === filter))
  const rows = view === 'overview' ? data.jobs.slice(0, 5) : jobs.slice(0, 100)
  const filtering = view === 'jobs' && (search !== '' || filter !== 'all')
  const countFor = (id: string) => id === 'all' ? data.jobs.length : data.jobs.filter(j => j.state === id).length
  const machineFor = (job: Job) => {
    const id = job.worker_id || job.target
    return id ? { id, machine: data.workers.find(w => w.id === id) } : null
  }
  const connected = ready && !error
  const go = (next: View) => {
    setView(next)
    setMobile(false)
    const path = pathForView(next)
    if (window.location.pathname !== path) window.history.pushState(null, '', path)
  }
  return <div className="workspace">
    {mobile && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`workspace-nav ${mobile ? 'is-open' : ''}`}>
      <a className="brand" href="/" aria-label="Sovereign home"><SovereignMark size={22} /><span>Sovereign</span></a>
      <nav className="nav-group" aria-label="Main navigation">
        <p className="nav-label">Workspace</p>
        {NAV.map(item => (
          <button key={item.id} onClick={() => go(item.id)} className={`nav-item ${view === item.id ? 'active' : ''}`} aria-current={view === item.id ? 'page' : undefined}>
            <item.icon size={16} strokeWidth={1.75} />
            <span>{item.label}</span>
            {item.id === 'jobs' && data.jobs.length > 0 && <span className="nav-count">{data.jobs.length}</span>}
            {item.id === 'machines' && data.workers.length > 0 && <span className="nav-count">{online.length}/{data.workers.length}</span>}
          </button>
        ))}
      </nav>
      <div className="nav-group nav-machines">
        <div className="nav-label">
          Machines
          <button className="icon-button" aria-label="Connect a machine" onClick={() => setDialog('machine')}><Plus size={14} /></button>
        </div>
        {data.workers.length
          ? data.workers.slice(0, 6).map(w => (
            <button className="nav-machine" key={w.id} onClick={() => go('machines')}>
              <span className={`status-dot ${w.online ? 'is-online' : ''}`} />
              <span className="ellipsis">{w.name}</span>
            </button>
          ))
          : <p className="nav-empty">No machines paired yet.</p>}
      </div>
      <div className="nav-footer">
        <button className="nav-item" onClick={() => setDialog('help')}><BookOpen size={16} strokeWidth={1.75} /><span>Getting started</span></button>
        <button className={`nav-user ${view === 'account' ? 'active' : ''}`} onClick={() => go('account')} aria-current={view === 'account' ? 'page' : undefined} aria-label="Open account">
          <UserAvatar user={user} className="avatar" />
          <span className="nav-user-text"><strong>{userDisplayName(user)}</strong><small>{user.email ?? 'Account settings'}</small></span>
          <ChevronRight size={14} />
        </button>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={18} /></button>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{PAGE[view].title}</strong></div>
        <div className="search-box">
          <Search size={15} />
          <input ref={searchRef} aria-label="Search jobs" placeholder="Search jobs" value={search} onChange={e => { setSearch(e.target.value); go('jobs') }} />
          <kbd>Ctrl K</kbd>
        </div>
        <button className="primary-button" onClick={() => setDialog('job')}><Plus size={15} />New job</button>
      </header>
      <main>
        {error && <div role="alert" className="error-banner"><CircleAlert size={16} /><span>{error}</span><button onClick={() => void refresh()}>Retry</button></div>}
        <div className="page-heading">
          <div>
            <h1>{PAGE[view].title}</h1>
            <p>{PAGE[view].description}</p>
          </div>
          {(view === 'overview' || view === 'machines') && <button className="secondary-button" onClick={() => setDialog('machine')}><Plus size={15} />Connect machine</button>}
        </div>
        {view === 'overview' && <div className="stat-grid">
          <Stat tone="neutral" icon={Monitor} label="Machines online" value={ready ? online.length : null} detail={ready ? `of ${data.workers.length} paired` : ''} />
          <Stat tone="blue" icon={Activity} label="Running" value={ready ? running.length : null} detail="Solving now" />
          <Stat tone="amber" icon={Clock3} label="Queued" value={ready ? queued.length : null} detail="Waiting for a machine" />
          <Stat tone="green" icon={CircleCheck} label="Completed" value={ready ? completed.length : null} detail={ready ? `${failed.length} failed` : ''} />
        </div>}
        {(view === 'overview' || view === 'jobs') && <section className="surface">
          <div className="surface-heading">
            <h2>{view === 'overview' ? 'Recent jobs' : 'All jobs'}</h2>
            {view === 'overview'
              ? <button className="link-button push-right" onClick={() => go('jobs')}>View all<ArrowRight size={14} /></button>
              : <div className="segmented push-right" role="group" aria-label="Filter jobs by status">
                {FILTERS.map(f => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
                    {f.label}<span>{countFor(f.id)}</span>
                  </button>
                ))}
              </div>}
            {view === 'jobs' && finishedCount > 0 && <button className="quiet-button danger-text" onClick={askDeleteFinished}><Trash2 size={14} />Delete finished</button>}
          </div>
          {rows.length > 0 && <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Job</th><th>Status</th><th className="hide-sm">Machine</th><th className="hide-sm">Compute</th><th className="num hide-sm">Runtime</th><th className="hide-sm">Created</th><th><span className="sr-only">Open job</span></th></tr></thead>
              <tbody>{rows.map(j => {
                const assigned = machineFor(j)
                const kind = problemKind(j)
                return <tr key={j.id}>
                  <td><button className="job-link" onClick={() => void openJob(j.id)}><span className="job-icon"><FileCode2 size={15} strokeWidth={1.75} /></span><span className="ellipsis">{j.name}</span>{kind && <KindTag kind={kind} />}</button></td>
                  <td><Status state={j.state} /></td>
                  <td className="muted nowrap hide-sm">{assigned
                    ? <span className="machine-cell"><span className={`status-dot ${assigned.machine?.online ? 'is-online' : ''}`} />{assigned.machine?.name ?? 'Removed machine'}</span>
                    : 'Any available'}</td>
                  <td className="muted nowrap hide-sm">{deviceLabel(j.device)}</td>
                  <td className="num muted hide-sm">{j.runtime_seconds != null ? `${j.runtime_seconds.toFixed(2)} s` : '—'}</td>
                  <td className="muted nowrap hide-sm">{when(j.created)}</td>
                  <td className="row-action">
                    <div className="row-buttons">
                      {j.state === 'SOLVING'
                        ? <span className="row-button-spacer" />
                        : <button className="icon-button delete-button" aria-label={`Delete ${j.name}`} title="Delete job" onClick={() => askDeleteJob(j)}><Trash2 size={15} /></button>}
                      <button className="icon-button" aria-label={`Open ${j.name}`} onClick={() => void openJob(j.id)}><ChevronRight size={16} /></button>
                    </div>
                  </td>
                </tr>
              })}</tbody>
            </table>
          </div>}
          {!rows.length && <EmptyState
            icon={!ready ? Loader2 : Inbox}
            spin={!ready}
            title={!ready ? 'Loading jobs' : filtering ? 'No matching jobs' : 'No jobs yet'}
            text={!ready ? 'Fetching jobs and machines for this workspace.' : filtering ? 'Try a different search term or status filter.' : 'Submit a JSON or MPS model and a connected machine will solve it.'}
            action={ready && !filtering ? <button className="secondary-button" onClick={() => setDialog('job')}><Plus size={15} />New job</button> : undefined}
          />}
          {rows.length > 0 && <div className="table-footer">
            <span>{view === 'overview' ? `${rows.length} most recent of ${data.jobs.length}` : `${rows.length} of ${data.jobs.length} jobs`}</span>
            <span className="live"><span className={`status-dot ${connected ? 'is-online' : ''}`} />{connected ? 'Updating live' : 'Reconnecting'}</span>
          </div>}
        </section>}
        {view === 'overview' && <div className="overview-grid">
          <section className="surface">
            <div className="surface-heading"><h2>Machines</h2><button className="link-button push-right" onClick={() => go('machines')}>Manage<ArrowRight size={14} /></button></div>
            {data.workers.length
              ? <div className="machine-list">{data.workers.slice(0, 4).map(w => <MachineRow key={w.id} machine={w} />)}</div>
              : <EmptyState icon={Server} title="No machines connected" text="Install the connector on a laptop or server, then approve its pairing code here." action={<button className="secondary-button" onClick={() => setDialog('machine')}><Plus size={15} />Connect a machine</button>} />}
          </section>
          <section className="surface">
            <div className="surface-heading"><h2>{data.jobs.length ? 'Activity' : 'Get started'}</h2></div>
            <div className="activity-list">{data.jobs.length
              ? data.jobs.slice(0, 5).map(j => (
                <button className="activity-item" key={j.id} onClick={() => void openJob(j.id)}>
                  <StateIcon state={j.state} />
                  <span><strong>{j.name}</strong><small>{stateLabel(j.state)} · {ago(j.updated)}</small></span>
                  <ChevronRight size={14} />
                </button>
              ))
              : <>
                <StartStep number="1" title="Connect a machine" text="Run the connector on the laptop or server you want to use." done={online.length > 0} onClick={() => setDialog('machine')} />
                <StartStep number="2" title="Submit a model" text="Upload a JSON or MPS model, or start from the bundled example." onClick={() => setDialog('job')} />
                <StartStep number="3" title="Review the result" text="Solution, verification report and compute used, in one place." onClick={() => setDialog('help')} />
              </>}</div>
          </section>
        </div>}
        {view === 'machines' && <section className="surface">
          <div className="surface-heading"><h2>Paired machines</h2><span className="count-pill">{data.workers.length}</span></div>
          {data.workers.length
            ? <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Machine</th><th>Status</th><th className="hide-sm">Hardware</th><th className="hide-sm">Engine</th><th>Last seen</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{data.workers.map(w => (
                  <tr key={w.id}>
                    <td><div className="machine-name"><MachineIcon machine={w} /><span><strong>{w.name}</strong><small>{[w.capabilities.hostname, w.capabilities.platform].filter(Boolean).join(' · ') || '—'}</small></span></div></td>
                    <td><MachineState machine={w} /></td>
                    <td className="muted hide-sm"><span className="hardware">{hardwareSummary(w)}<GpuTag caps={w.capabilities} /></span></td>
                    <td className="muted mono hide-sm">{w.capabilities.engine_version ? `v${w.capabilities.engine_version}` : '—'}</td>
                    <td className="muted nowrap">{w.seen ? ago(w.seen) : 'Never'}</td>
                    <td className="row-action"><button className="quiet-button danger-text" onClick={() => askDisconnect(w)}><Unplug size={14} />Disconnect</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            : <EmptyState icon={Server} title="No machines connected yet" text="Run the connector where your hardware is. This website routes jobs and stores results; it never solves them." action={<button className="primary-button" onClick={() => setDialog('machine')}><Plus size={15} />Connect machine</button>} />}
        </section>}
        {view === 'benchmarks' && <BenchmarkLab machines={data.workers} />}
        {view === 'account' && <AccountPage user={user} data={data} ready={ready} />}
        <footer className="workspace-footer">
          <span className={`status-dot ${connected ? 'is-online' : ''}`} />
          {connected ? 'Connected to coordinator' : 'Connecting to coordinator'}
          <span className="footer-right">Connector v{CONNECTOR_VERSION}</span>
        </footer>
      </main>
    </div>
    {dialog === 'job' && <NewJob machines={data.workers} onClose={() => setDialog(null)} onCreated={async id => { setDialog(null); await refresh(); await openJob(id) }} />}
    {dialog === 'machine' && <ConnectMachine onClose={() => setDialog(null)} onPaired={refresh} />}
    {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} busy={confirmBusy} onConfirm={runConfirm} onClose={() => setConfirm(null)} />}
    {dialog === 'help' && <WorkspaceModal title="How a job runs" onClose={() => setDialog(null)}>
      <div className="help-flow">
        <div><LayoutGrid size={18} strokeWidth={1.75} /><strong>Website</strong><small>Submit and review</small></div>
        <ArrowRight size={16} />
        <div><Server size={18} strokeWidth={1.75} /><strong>Coordinator</strong><small>Routes and stores</small></div>
        <ArrowRight size={16} />
        <div><Cpu size={18} strokeWidth={1.75} /><strong>Your machine</strong><small>Runs the solver</small></div>
      </div>
      <p className="dialog-intro">Jobs are stored with your account. A connector on your laptop or server picks them up, runs the Sovereign solver locally and sends the result back.</p>
      <ol className="steps">
        <li><span className="step-index">1</span><div><strong>Install the connector</strong><p>Includes the Windows solver. No git clone or build step.</p><CommandLine value={CONNECTOR_INSTALL} /></div></li>
        <li><span className="step-index">2</span><div><strong>Connect, then submit</strong><p>Run <code>sovereign connect</code>, approve the pairing code in this workspace, then submit a model as a new job.</p></div></li>
      </ol>
      <div className="info-note">GPU acceleration currently covers sparse matrix multiplication. Other solver steps may still run on the CPU; each result reports the GPU operations it actually executed.</div>
      <div className="dialog-actions"><button className="primary-button" onClick={() => setDialog('machine')}>Connect a machine<ArrowRight size={15} /></button></div>
    </WorkspaceModal>}
    {selected && <WorkspaceModal title={selected.name} onClose={closeJob} wide>
      <div className="result-top">
        <Status state={selected.state} />
        <span className="muted">Submitted {when(selected.created)}</span>
        <span className="muted">{deviceLabel(selected.device)}</span>
        {problemKind(selected) && <KindTag kind={problemKind(selected)!} />}
        <span className="result-actions">
          {!terminal(selected.state) && <button disabled={busy} className="quiet-button danger-text" onClick={() => askCancelJob(selected)}><CircleSlash size={14} />Cancel job</button>}
          {selected.state !== 'SOLVING' && <button disabled={busy} className="quiet-button danger-text" onClick={() => askDeleteJob(selected)}><Trash2 size={14} />Delete</button>}
        </span>
      </div>
      {selected.message && <div className="info-note">{selected.message}</div>}
      {selected.routing && <div className="routing-note"><Cpu size={14} /><span>{selected.routing.execution_device ? `Assigned to ${selected.routing.execution_device.toUpperCase()}` : `Prefers ${selected.routing.preferred_device.toUpperCase()}`}. {selected.routing.reason}</span></div>}
      {selected.result ? <>
        <div className="result-metrics">
          <div><small>Solver status</small><strong>{nice(selected.result.status)}</strong></div>
          <div><small>Objective</small><strong>{formatNumber(selected.result.objective_value)}</strong></div>
          <div><small>Runtime</small><strong>{selected.result.runtime_seconds?.toFixed(3) ?? '—'} s</strong></div>
        </div>
        <div className="result-facts">
          <span><Cpu size={14} />{selected.result.gpu_used ? `GPU + CPU · ${selected.result.gpu_operations} GPU operations` : 'Computed on CPU'}</span>
          <span className={selected.result.verification?.is_valid ? 'is-ok' : 'is-warn'}><ShieldCheck size={14} />{selected.result.verification?.is_valid ? 'Solution verified' : selected.result.verification ? 'Verification did not pass' : 'No verification report'}</span>
        </div>
        <ResultSummary job={selected} />
        {(selected.device === 'cuda' || selected.routing?.execution_device === 'cuda') && !selected.result.gpu_used && <p className="danger-text">CUDA was requested, but this solve executed no GPU kernels. Check the job message and the CUDA-enabled worker.</p>}
        <p className="result-message">{selected.result.message}</p>
        {selected.result.verification?.issues?.map((issue, i) => <p className="danger-text" key={i}>{issue}</p>)}
        {selected.result.warnings?.map((warning, i) => <p className="info-note" key={i}>{warning}</p>)}
        <div className="solution-heading">
          <h3>Solution variables<span className="count-pill">{Object.keys(selected.result.primal || {}).length}</span></h3>
          <button className="secondary-button" onClick={() => download(selected)}><ArrowDownToLine size={15} />Download result</button>
        </div>
        <div className="solution-table">
          <table className="data-table">
            <thead><tr><th>Variable</th><th className="num">Value</th></tr></thead>
            <tbody>{Object.entries(selected.result.primal || {}).slice(0, 200).map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td className="num mono">{formatNumber(v)}</td></tr>)}</tbody>
          </table>
          {Object.keys(selected.result.primal || {}).length > 200 && <p className="muted table-note">Showing 200 variables. Download the result for the full solution.</p>}
        </div>
      </> : <EmptyState
        icon={!terminal(selected.state) ? Loader2 : FileCode2}
        spin={!terminal(selected.state)}
        title={selected.state === 'QUEUED' ? 'Waiting for a matching machine' : selected.state === 'SOLVING' ? 'Solving on your machine' : stateLabel(selected.state)}
        text={selected.state === 'QUEUED' ? 'Keep the connector running. GPU jobs wait for a CUDA-ready machine.' : selected.state === 'SOLVING' ? 'You can close this panel. The result will be saved here.' : 'No solution was returned for this job.'}
      />}
    </WorkspaceModal>}
  </div>
}

function Stat({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: number | null; detail: string; tone: 'neutral' | 'blue' | 'amber' | 'green' }) {
  return <div className="stat">
    <div className="stat-top">
      <span className="stat-label">{label}</span>
      <span className={`stat-icon tone-${tone}`}><Icon size={15} strokeWidth={1.9} /></span>
    </div>
    <strong>{value ?? '—'}</strong>
    <small>{detail || '\u00a0'}</small>
  </div>
}
function EmptyState({ icon: Icon, title, text, action, spin }: { icon: LucideIcon; title: string; text: string; action?: ReactNode; spin?: boolean }) {
  return <div className="empty-state">
    <span className="empty-icon"><Icon size={18} strokeWidth={1.75} className={spin ? 'spin' : undefined} /></span>
    <h3>{title}</h3>
    <p>{text}</p>
    {action}
  </div>
}
function KindTag({ kind }: { kind: string }) {
  return <span className={`kind-tag kind-${kind.toLowerCase()}`}>{kind}</span>
}
function Status({ state }: { state: string }) {
  return <span className={`status status-${state.toLowerCase()}`}><span className="status-indicator" />{stateLabel(state)}</span>
}
function StateIcon({ state }: { state: string }) {
  const Icon = state === 'COMPLETED' ? CircleCheck : state === 'FAILED' ? CircleX : state === 'SOLVING' ? Activity : state === 'QUEUED' ? Clock3 : CircleSlash
  return <span className={`state-icon state-${state.toLowerCase()}`}><Icon size={15} strokeWidth={1.75} /></span>
}
function MachineIcon({ machine: w }: { machine: Machine }) {
  return <span className="machine-icon">{w.capabilities.platform === 'Linux' ? <Server size={16} strokeWidth={1.75} /> : <Monitor size={16} strokeWidth={1.75} />}</span>
}
function MachineState({ machine: w }: { machine: Machine }) {
  return <span className={`machine-state ${w.online ? 'online' : ''}`}><span className={`status-dot ${w.online ? 'is-online' : ''}`} />{w.online ? 'Online' : w.seen ? 'Offline' : 'Not connected'}</span>
}
function MachineRow({ machine: w }: { machine: Machine }) {
  return <div className="machine-row">
    <MachineIcon machine={w} />
    <div className="machine-text">
      <strong>{w.name}</strong>
      <small>{hardwareSummary(w)}<GpuTag caps={w.capabilities} /></small>
    </div>
    <MachineState machine={w} />
  </div>
}
function StartStep({ number, title, text, done, onClick }: { number: string; title: string; text: string; done?: boolean; onClick: () => void }) {
  return <button className="start-step" onClick={onClick}>
    <span className={`step-index ${done ? 'done' : ''}`}>{done ? <Check size={13} /> : number}</span>
    <span><strong>{title}</strong><small>{text}</small></span>
    <ChevronRight size={14} />
  </button>
}
function CommandLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return <div className="command">
    <Terminal size={14} />
    <code>{value}</code>
    <button type="button" className="icon-button" aria-label={copied ? 'Copied' : 'Copy command'} title={copied ? 'Copied' : 'Copy'} onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
  </div>
}
function download(job: Job) { const url = URL.createObjectURL(new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `sovereign-${job.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }

function NewJob({ machines, onClose, onCreated }: { machines: Machine[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState(''), [model, setModel] = useState(''), [format, setFormat] = useState('json'), [device, setDevice] = useState('auto'), [target, setTarget] = useState(''), [algorithms, setAlgorithms] = useState(DEFAULT_ALGORITHMS), [limit, setLimit] = useState(300), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [exampleId, setExampleId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const example = EXAMPLES.find(e => e.id === exampleId)
  function loadExample(id: string) {
    setExampleId(id)
    const chosen = EXAMPLES.find(e => e.id === id)
    if (!chosen) return
    setModel(chosen.model)
    setFormat(chosen.format)
    setName(chosen.title)
    setError('')
  }
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { const payload = { name, modelJson: model, modelFormat: format, device, workerId: target || null, ...algorithms, timeLimitSeconds: limit }; if (new Blob([model]).size > 3_500_000 || new Blob([JSON.stringify(payload)]).size > 4_000_000) throw new Error('Choose a smaller model for hosted jobs (maximum request: 4 MB).'); const result = await request<{ jobId: string }>('/api/jobs', 'POST', payload); onCreated(result.jobId) } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  return <WorkspaceModal title="New optimization job" onClose={busy ? undefined : onClose} wide>
    <form onSubmit={submit}>
      <label>Job name<input autoFocus required maxLength={120} placeholder="e.g. Weekly production plan" value={name} onChange={e => setName(e.target.value)} /></label>
      <div className="model-toolbar">
        <label htmlFor="model-input">Model</label>
        <select className="example-select" aria-label="Load an example model" value={exampleId} onChange={e => loadExample(e.target.value)}>
          <option value="">Load an example…</option>
          {(Object.keys(EXAMPLE_GROUPS) as ExampleGroup[]).map(group => (
            <optgroup key={group} label={EXAMPLE_GROUPS[group]}>
              {EXAMPLES.filter(e => e.group === group).map(e => <option key={e.id} value={e.id}>{e.title} ({e.kind})</option>)}
            </optgroup>
          ))}
        </select>
        <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={14} />Upload file</button>
        <input ref={fileRef} hidden type="file" accept=".json,.mps" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 3_500_000) { setError('Choose a file smaller than 3.5 MB.'); return } try { setModel(await f.text()); setName(f.name.replace(/\.(json|mps)$/i, '')); setFormat(f.name.toLowerCase().endsWith('.mps') ? 'mps' : 'json'); setExampleId(''); setError('') } catch { setError('Could not read that file.') } }} />
      </div>
      {example && <p className="example-note"><KindTag kind={example.kind} />{example.format === 'mps' && <span className="kind-tag">MPS</span>}<span>{example.description}</span></p>}
      <textarea id="model-input" className="model-editor" required spellCheck={false} value={model} onChange={e => setModel(e.target.value)} placeholder="Paste a JSON or MPS optimization model, load an example, or upload a file" />
      <div className="form-grid">
        <label>Format<select value={format} onChange={e => setFormat(e.target.value)}><option value="json">JSON</option><option value="mps">MPS</option></select></label>
        <label>Run on<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Any available machine</option>{machines.map(w => <option key={w.id} value={w.id}>{w.name}{w.online ? '' : ' (offline)'}</option>)}</select></label>
        <label>Compute<select value={device} onChange={e => setDevice(e.target.value)}><option value="auto">Automatic</option><option value="cuda">GPU (CUDA)</option><option value="cpu">CPU</option></select></label>
        <label>Time limit (seconds)<input type="number" min={1} max={86400} required value={limit} onChange={e => setLimit(Number(e.target.value))} /></label>
      </div>
      <AlgorithmOptions value={algorithms} onChange={setAlgorithms} />
      {!machines.some(w => w.online && (device !== 'cuda' || w.capabilities.cuda_available) && (!target || w.id === target)) && <p className="info-note">No matching machine is online. This job will stay queued until one connects.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" disabled={busy} className="secondary-button" onClick={onClose}>Cancel</button>
        <button className="primary-button" disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}Submit job</button>
      </div>
    </form>
  </WorkspaceModal>
}
function ConnectMachine({ onClose, onPaired }: { onClose: () => void; onPaired: () => Promise<void> }) {
  const [pending, setPending] = useState<Array<{ code: string; name: string; expiresInSeconds: number; capabilities: { cuda_available?: boolean; hostname?: string; gpu_name?: string } }>>([])
  const [manualCode, setManualCode] = useState(''), [duration, setDuration] = useState(8), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const server = 'https://sovereign-we6b.onrender.com'
  const install = CONNECTOR_INSTALL
  const command = `sovereign connect --server "${server}" --duration ${duration}`
  async function refreshPending() { try { const result = await request<{ pending: typeof pending }>('/api/worker/connect/pending'); setPending(result.pending) } catch (e) { setError((e as Error).message) } }
  async function approve(code: string) { setBusy(true); setError(''); try { await request('/api/worker/connect/approve', 'POST', { code, durationHours: duration }); await refreshPending(); await onPaired() } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  useEffect(() => { void refreshPending(); const timer = window.setInterval(() => { void refreshPending() }, 4000); return () => window.clearInterval(timer) }, [])
  return <WorkspaceModal title="Connect a machine" onClose={busy ? undefined : onClose} wide>
    <p className="dialog-intro">All solving runs on your computer. The website and coordinator only route jobs and store results.</p>
    <ol className="steps">
      <li><span className="step-index">1</span><div>
        <strong>Install the connector</strong>
        <p>Installs the connector and the Windows solver. No git clone or build step.</p>
        <CommandLine value={install} />
      </div></li>
      <li><span className="step-index">2</span><div>
        <strong>Connect this machine</strong>
        <p>Run this in a terminal on the machine that should do the solving.</p>
        <CommandLine value={command} />
      </div></li>
      <li><span className="step-index">3</span><div>
        <strong>Approve the pairing code</strong>
        <p>The terminal prints a 6-digit code. Choose how long this machine stays connected, then approve it.</p>
        <label>Connection duration<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={1}>1 hour</option><option value={2}>2 hours</option><option value={4}>4 hours</option><option value={8}>8 hours</option><option value={12}>12 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>72 hours</option></select></label>
        {pending.length
          ? pending.map(item => (
            <div className="token-box" key={item.code}>
              <div><strong>{item.name}</strong><small>{item.capabilities.hostname || 'Waiting machine'} · {item.capabilities.cuda_available ? `CUDA ready${item.capabilities.gpu_name ? ` (${item.capabilities.gpu_name})` : ''}` : item.capabilities.gpu_name ? `${item.capabilities.gpu_name}, CUDA unavailable` : 'CPU only'} · expires in {Math.max(1, Math.round(item.expiresInSeconds / 60))} min</small></div>
              <code>{item.code}</code>
              <button className="primary-button" disabled={busy} onClick={() => void approve(item.code)}><Check size={14} />Approve</button>
            </div>
          ))
          : <p className="info-note waiting"><Loader2 size={14} className="spin" />Waiting for a pairing request. Run <code>sovereign connect</code> on your computer.</p>}
        <div className="manual-code">
          <label>Or enter the code manually<input inputMode="numeric" maxLength={6} value={manualCode} onChange={e => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" /></label>
          {manualCode.length === 6 && <button className="secondary-button" disabled={busy} onClick={() => void approve(manualCode)}>Approve {manualCode}</button>}
        </div>
      </div></li>
    </ol>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button className="primary-button" onClick={onClose}><Check size={15} />Done</button></div>
  </WorkspaceModal>
}
