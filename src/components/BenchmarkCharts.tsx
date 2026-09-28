import { useMemo } from 'react'
import {
  HIGHS_COLOR, OUTCOME_LABEL, PROFILE_COLORS, formatSeconds, outcomeOf, sizeLabel,
  type BenchRow, type Outcome,
} from '@/lib/benchmarks'

const W = 560, H = 330, PAD = { left: 58, right: 18, top: 18, bottom: 46 }
const FLOOR = 1e-4
const SWEEP_SUITES = new Set(['Synthetic scale', 'GPU showcase'])

function decades(values: number[]) {
  const lo = Math.floor(Math.log10(Math.max(FLOOR, Math.min(...values))))
  const hi = Math.max(lo + 1, Math.ceil(Math.log10(Math.max(...values))))
  return [lo, hi] as const
}
function logScale([lo, hi]: readonly [number, number], a: number, b: number) {
  return (v: number) => a + (Math.log10(Math.max(FLOOR, v)) - lo) / (hi - lo) * (b - a)
}
const tick = (p: number) => p >= 0 ? `${10 ** p} s` : p >= -3 ? `${10 ** (p + 3)} ms` : `${10 ** (p + 6)} µs`
const count = (p: number) => 10 ** p >= 1000 ? `${10 ** (p - 3)}k` : `${10 ** p}`

function Axes({ x, y, xr, yr, xLabel, yLabel, xTick = tick }: {
  x: (v: number) => number; y: (v: number) => number; xr: readonly [number, number]; yr: readonly [number, number]
  xLabel: string; yLabel: string; xTick?: (p: number) => string
}) {
  const xs = Array.from({ length: xr[1] - xr[0] + 1 }, (_, i) => xr[0] + i)
  const ys = Array.from({ length: yr[1] - yr[0] + 1 }, (_, i) => yr[0] + i)
  return <g className="chart-axes">
    {xs.map(p => <g key={`x${p}`}>
      <line x1={x(10 ** p)} x2={x(10 ** p)} y1={PAD.top} y2={H - PAD.bottom} className="chart-grid" />
      <text x={x(10 ** p)} y={H - PAD.bottom + 16} textAnchor="middle">{xTick(p)}</text>
    </g>)}
    {ys.map(p => <g key={`y${p}`}>
      <line x1={PAD.left} x2={W - PAD.right} y1={y(10 ** p)} y2={y(10 ** p)} className="chart-grid" />
      <text x={PAD.left - 8} y={y(10 ** p) + 4} textAnchor="end">{tick(p)}</text>
    </g>)}
    <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} textAnchor="middle" className="chart-axis-label">{xLabel}</text>
    <text transform={`translate(14 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="chart-axis-label">{yLabel}</text>
  </g>
}

function Legend({ items }: { items: Array<{ key: string; label: string; color: string; hollow?: boolean; diamond?: boolean }> }) {
  return <div className="chart-legend">
    {items.map(item => <span key={item.key}>
      <svg width="12" height="12" aria-hidden="true">
        {item.diamond
          ? <rect x="2.5" y="2.5" width="7" height="7" transform="rotate(45 6 6)" fill={item.color} />
          : <circle cx="6" cy="6" r="4.5" fill={item.hollow ? 'white' : item.color} stroke={item.color} strokeWidth="1.5" />}
      </svg>
      {item.label}
    </span>)}
  </div>
}

function profileLegend(rows: BenchRow[]) {
  const seen = new Map<string, string>()
  for (const r of rows) seen.set(r.profile, r.profileLabel)
  return [...seen].map(([key, label]) => ({ key, label, color: PROFILE_COLORS[key] ?? '#555' }))
}

/** Sovereign time against HiGHS time for the same file on the same machine. */
export function SpeedScatter({ rows }: { rows: BenchRow[] }) {
  const points = useMemo(() => rows.filter(r =>
    r.runtimeSeconds != null && r.reference?.runtimeSeconds != null &&
    (r.status === 'OPTIMAL' || r.status === 'FEASIBLE') && r.reference.status === 'OPTIMAL'), [rows])
  if (!points.length) return <ChartEmpty text="Points appear when a model has finished on both Sovereign and HiGHS." />
  const all = points.flatMap(r => [r.runtimeSeconds!, r.reference!.runtimeSeconds!])
  const range = decades(all)
  const x = logScale(range, PAD.left, W - PAD.right)
  const y = logScale(range, H - PAD.bottom, PAD.top)
  const lo = 10 ** range[0], hi = 10 ** range[1]
  return <figure className="chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scatter plot of Sovereign solve time against HiGHS solve time, logarithmic axes">
      <polygon points={`${x(lo)},${y(lo)} ${x(lo)},${y(hi)} ${x(hi)},${y(hi)}`} className="chart-zone-slow" />
      <polygon points={`${x(lo)},${y(lo)} ${x(hi)},${y(lo)} ${x(hi)},${y(hi)}`} className="chart-zone-fast" />
      <Axes x={x} y={y} xr={range} yr={range} xLabel="HiGHS time (log scale)" yLabel="Sovereign time (log scale)" />
      <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} className="chart-diagonal" />
      <text x={x(lo) + 10} y={y(hi) + 18} className="chart-zone-label">Sovereign slower</text>
      <text x={x(hi) - 10} y={y(lo) - 10} textAnchor="end" className="chart-zone-label">Sovereign faster</text>
      {points.map(r => {
        const color = PROFILE_COLORS[r.profile] ?? '#555'
        const ok = r.agrees === true
        return <circle key={r.id} cx={x(r.reference!.runtimeSeconds!)} cy={y(r.runtimeSeconds!)} r={5.5}
          fill={ok ? color : 'white'} stroke={color} strokeWidth={1.8} className="chart-point">
          <title>{`${r.dataset} · ${r.profileLabel}\nSovereign ${formatSeconds(r.runtimeSeconds)} · HiGHS ${formatSeconds(r.reference!.runtimeSeconds)}\n${OUTCOME_LABEL[outcomeOf(r)]}`}</title>
        </circle>
      })}
    </svg>
    <Legend items={[...profileLegend(points), { key: 'hollow', label: 'Objective or status differs', color: '#555', hollow: true }]} />
  </figure>
}

/** Solve time against model size: shows how each method scales. */
export function ScalingChart({ rows }: { rows: BenchRow[] }) {
  const points = useMemo(() => rows.filter(r => r.runtimeSeconds != null && (r.shape?.nonzeros ?? 0) > 0 &&
    (r.status === 'OPTIMAL' || r.status === 'FEASIBLE')), [rows])
  const references = useMemo(() => {
    const byDataset = new Map<string, BenchRow>()
    for (const r of rows) if (r.reference?.status === 'OPTIMAL' && r.reference.runtimeSeconds != null && (r.shape?.nonzeros ?? 0) > 0) byDataset.set(r.dataset, r)
    return [...byDataset.values()]
  }, [rows])
  if (!points.length) return <ChartEmpty text="Points appear as models finish. Use the scale sweep preset to see growth with size." />
  const sizes = [...points, ...references].map(r => r.shape.nonzeros!)
  const times = [...points.map(r => r.runtimeSeconds!), ...references.map(r => r.reference!.runtimeSeconds!)]
  const xr = [Math.floor(Math.log10(Math.min(...sizes))), Math.max(Math.floor(Math.log10(Math.min(...sizes))) + 1, Math.ceil(Math.log10(Math.max(...sizes))))] as const
  const yr = decades(times)
  const x = (v: number) => PAD.left + (Math.log10(v) - xr[0]) / (xr[1] - xr[0]) * (W - PAD.left - PAD.right)
  const y = logScale(yr, H - PAD.bottom, PAD.top)
  const series = new Map<string, BenchRow[]>()
  for (const r of points.filter(p => SWEEP_SUITES.has(p.suite))) {
    const key = `${r.suite}|${r.profile}`
    series.set(key, [...(series.get(key) ?? []), r])
  }
  const highsLines = [...SWEEP_SUITES].map(suite => references.filter(r => r.suite === suite).sort((a, b) => a.shape.nonzeros! - b.shape.nonzeros!))
  return <figure className="chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Solve time against number of nonzeros, logarithmic axes">
      <Axes x={x} y={y} xr={xr} yr={yr} xLabel="Model size: constraint nonzeros (log scale)" yLabel="Solve time (log scale)" xTick={count} />
      {[...series].map(([key, list]) => {
        const sorted = [...list].sort((a, b) => a.shape.nonzeros! - b.shape.nonzeros!)
        return sorted.length > 1 && <polyline key={key} fill="none" stroke={PROFILE_COLORS[sorted[0].profile] ?? '#555'} strokeWidth={1.6} strokeOpacity={0.55}
          points={sorted.map(r => `${x(r.shape.nonzeros!)},${y(r.runtimeSeconds!)}`).join(' ')} />
      })}
      {highsLines.map((line, i) => line.length > 1 && <polyline key={`highs-${i}`} fill="none" stroke={HIGHS_COLOR} strokeWidth={1.6} strokeDasharray="4 3"
        points={line.map(r => `${x(r.shape.nonzeros!)},${y(r.reference!.runtimeSeconds!)}`).join(' ')} />)}
      {references.map(r => {
        const cx = x(r.shape.nonzeros!), cy = y(r.reference!.runtimeSeconds!)
        return <rect key={`ref-${r.dataset}`} x={cx - 4.5} y={cy - 4.5} width={9} height={9} transform={`rotate(45 ${cx} ${cy})`} fill={HIGHS_COLOR} className="chart-point">
          <title>{`${r.dataset} · HiGHS\n${sizeLabel(r.shape)} · ${r.shape.nonzeros!.toLocaleString()} nonzeros\n${formatSeconds(r.reference!.runtimeSeconds)}`}</title>
        </rect>
      })}
      {points.map(r => <circle key={r.id} cx={x(r.shape.nonzeros!)} cy={y(r.runtimeSeconds!)} r={5} fill={PROFILE_COLORS[r.profile] ?? '#555'} className="chart-point">
        <title>{`${r.dataset} · ${r.profileLabel}\n${sizeLabel(r.shape)} · ${r.shape.nonzeros!.toLocaleString()} nonzeros\n${formatSeconds(r.runtimeSeconds)}${r.gpuUsed ? ` · ${r.gpuOperations} GPU operations` : ''}`}</title>
      </circle>)}
    </svg>
    <Legend items={[...profileLegend(points), ...(references.length ? [{ key: 'highs', label: 'HiGHS reference', color: HIGHS_COLOR, diamond: true }] : [])]} />
  </figure>
}

const OUTCOME_ORDER: Outcome[] = ['agree', 'verified', 'unproven', 'disagree', 'limit', 'error', 'cancelled', 'pending']

/** How each method's runs ended. */
export function OutcomeBars({ rows }: { rows: BenchRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; counts: Record<Outcome, number>; total: number }>()
    for (const r of rows) {
      const g = map.get(r.profile) ?? { label: r.profileLabel, counts: Object.fromEntries(OUTCOME_ORDER.map(o => [o, 0])) as Record<Outcome, number>, total: 0 }
      g.counts[outcomeOf(r)]++
      g.total++
      map.set(r.profile, g)
    }
    return [...map]
  }, [rows])
  if (!groups.length) return null
  return <div className="outcome-bars">
    {groups.map(([profile, g]) => <div className="outcome-row" key={profile}>
      <span className="outcome-name"><i style={{ background: PROFILE_COLORS[profile] }} />{g.label}</span>
      <span className="outcome-track" role="img" aria-label={OUTCOME_ORDER.filter(o => g.counts[o]).map(o => `${g.counts[o]} ${OUTCOME_LABEL[o]}`).join(', ')}>
        {OUTCOME_ORDER.filter(o => g.counts[o]).map(o => <span key={o} className={`outcome-seg outcome-${o}`} style={{ flexGrow: g.counts[o] }} title={`${g.counts[o]} ${OUTCOME_LABEL[o]}`}>{g.counts[o]}</span>)}
      </span>
    </div>)}
    <div className="outcome-key">
      {OUTCOME_ORDER.filter(o => groups.some(([, g]) => g.counts[o])).map(o => <span key={o}><i className={`outcome-seg outcome-${o}`} />{OUTCOME_LABEL[o]}</span>)}
    </div>
  </div>
}

function ChartEmpty({ text }: { text: string }) {
  return <div className="chart-empty">{text}</div>
}
