import { motion } from 'motion/react'

import { api, type BenchmarkRow } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { memo, useMemo, useState } from 'react'
import { Card, Section } from '@/components/ui'
import { cn } from '@/lib/cn'

const STATUS_STYLE: Record<string, string> = {
  OPTIMAL: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  FEASIBLE: 'bg-sky-50 text-sky-700 border-sky-100',
  INFEASIBLE: 'bg-rose-50 text-rose-700 border-rose-100',
  UNBOUNDED: 'bg-rose-50 text-rose-700 border-rose-100',
  TIMEOUT: 'bg-amber-50 text-amber-700 border-amber-100',
}

function fmt(value: number | null | undefined, digits = 4) {
  if (value === null || value === undefined) return '—'
  if (value === 0) return '0'
  if (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e7) return value.toExponential(2)
  return value.toFixed(digits)
}

/**
 * One table row. Memoised because the stagger animation re-renders the tbody on
 * every frame of the entrance, and each row is otherwise pure props.
 */
const Row = memo(function Row({ row, index }: { row: BenchmarkRow; index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.012, 0.3) }}
      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
    >
      <td className="px-5 py-2.5 font-mono text-[12px] text-slate-700">{row.problem}</td>
      <td className="px-3 py-2.5 text-[12px] text-slate-500">{row.solver}</td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            'inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold',
            STATUS_STYLE[row.status] ?? 'bg-slate-50 text-slate-500 border-slate-200',
          )}
        >
          {row.status || '—'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-700">
        {fmt(row.objective)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-500">
        {fmt(row.runtimeSeconds, 3)}
      </td>
      <td className="px-5 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-500">
        {row.nodes && row.nodes > 0 ? row.nodes : '—'}
      </td>
    </motion.tr>
  )
})

export function Benchmarks() {
  const { data, error, loading } = useAsync((signal) => api.benchmarks(signal), [])
  const rows = data?.rows ?? null
  const [suite, setSuite] = useState<string>('all')

  const suites = useMemo(
    () => ['all', ...Array.from(new Set((rows ?? []).map((r) => r.suite))).sort()],
    [rows],
  )

  const visible = useMemo(
    () => (rows ?? []).filter((r) => suite === 'all' || r.suite === suite).sort((a, b) => a.problem.localeCompare(b.problem) || a.solver.localeCompare(b.solver)),
    [rows, suite],
  )

  return (
    <Section
      id="benchmarks"
      eyebrow="Measured, not asserted"
      title="Benchmark evidence"
      tall
      description="Recorded snapshot of benchmarks/reports/latest.csv, bundled at build time. These runs describe the recorded build, not a fresh measurement. Reference solvers appear here for comparison only - they never run inside the engine."
    >
      {visible.length > 0 ? <RuntimeChart rows={visible} /> : null}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            {suites.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSuite(s)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                  suite === s
                    ? 'bg-[#0a1b33] text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400">
            {rows ? `${visible.length} of ${rows.length} runs` : 'loading…'}
          </span>
        </div>

        {error ? (
          <p className="px-5 py-10 text-center text-[13px] text-rose-600">
            Could not load the report: {error}
          </p>
        ) : !rows ? (
          <p className="px-5 py-10 text-center text-[13px] text-slate-400">
            {loading ? 'Loading report…' : 'No report available.'}
          </p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-slate-400">
            No runs recorded for this suite yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/60 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-5 py-3 font-semibold">Problem</th>
                  <th className="px-3 py-3 font-semibold">Solver</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Objective</th>
                  <th className="px-3 py-3 text-right font-semibold">Time (s)</th>
                  <th className="px-5 py-3 text-right font-semibold">Nodes</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <Row key={`${row.problem}-${row.solver}-${i}`} row={row} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Section>
  )
}


function RuntimeChart({ rows }: { rows: BenchmarkRow[] }) {
  const times = rows.filter((r) => r.status === 'OPTIMAL' && r.runtimeSeconds !== null && r.runtimeSeconds > 0).map((r) => r.runtimeSeconds!)
  if (!times.length) return null
  const min = Math.floor(Math.log10(Math.min(...times))) - 1
  const max = Math.max(min + 1, Math.ceil(Math.log10(Math.max(...times))))
  const x = (seconds: number) => 310 + (Math.log10(seconds) - min) / (max - min) * 390
  const height = rows.length * 30 + 45
  return <Card className="mb-4 overflow-x-auto p-4">
    <p className="mb-3 text-xs text-slate-600">Recorded runtimes ? logarithmic seconds ? shorter is faster. Unsolved runs have status labels instead of bars.</p>
    <svg role="img" aria-label="Recorded solver runtimes by problem on a logarithmic scale" viewBox={`0 0 880 ${height}`} className="min-w-[880px] w-full text-slate-600">
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((power) => <g key={power}>
        <line x1={x(10 ** power)} x2={x(10 ** power)} y1={25} y2={height} stroke="var(--app-border)" />
        <text x={x(10 ** power)} y={14} fill="currentColor" fontSize={10} textAnchor="middle">{10 ** power}s</text>
      </g>)}
      {rows.map((row, i) => <g key={`${row.problem}-${row.solver}-${i}`} transform={`translate(0,${i * 30 + 38})`}>
        <title>{`${row.problem}: ${row.solver}, ${row.status}, ${row.runtimeSeconds ?? 'unreported'} seconds`}</title>
        <text x={0} y={0} fill="currentColor" fontSize={10}>{row.problem.slice(0, 27)} ? {row.solver.slice(0, 20)}</text>
        {row.status === 'OPTIMAL' && row.runtimeSeconds !== null && row.runtimeSeconds > 0 ? <>
          <rect x={310} y={-11} width={Math.max(1, x(row.runtimeSeconds) - 310)} height={14} rx={2} fill={row.solver.startsWith('OurSolver') ? '#38bdf8' : '#a78bfa'} />
          <text x={710} y={0} fill="currentColor" fontSize={10}>{fmt(row.runtimeSeconds, 4)}s</text>
        </> : <text x={315} y={0} fill="#fbbf24" fontSize={10}>{row.status || 'NO RESULT'}</text>}
      </g>)}
    </svg>
  </Card>
}
