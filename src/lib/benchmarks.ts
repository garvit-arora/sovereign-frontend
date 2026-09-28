export type Kind = 'LP' | 'MILP' | 'QP'

export type Shape = { columns?: number; rows?: number; nonzeros?: number; integer_variables?: number; problem_type?: string }

export type LabDataset = { id: string; suite: string; source: string; modelFormat: string; shape: Shape }
export type LabProfile = { id: string; label: string; kind: Kind; cpuOnly: boolean }
export type LabPreset = { id: string; label: string; description: string; datasets: string[]; profiles: string[] }
export type LabCatalogue = { datasets: LabDataset[]; profiles: LabProfile[]; presets: LabPreset[] }

export type Reference = {
  state: string; status: string | null; objective: number | null; runtimeSeconds: number | null
  version?: string | null; message?: string
}

export type BenchRow = {
  id: string; dataset: string; suite: string; kind: Kind; shape: Shape
  profile: string; profileLabel: string; state: string; executionDevice?: string
  status: string | null; objective?: number | null; runtimeSeconds?: number | null
  verified?: boolean; gpuUsed?: boolean; gpuOperations?: number; iterations?: number | null; nodes?: number | null
  message?: string; reference: Reference | null; agrees: boolean | null; sameObjective?: boolean
}

export type BenchSummary = {
  jobs: number; jobsFinished: number; rows: number; finished: number; running: number; queued: number
  verified: number; compared: number; agreements: number; disagreements: number
  timeLimits: number; errors: number; geomeanTimeRatio: number | null; ratioCount: number
}

export type RunMachine = {
  id: string; name: string; cpuThreads?: number; gpu?: string | null; platform?: string
  engineVersion?: string; highsVersion?: string | null
}

export type RunConfig = { datasets?: string[]; profiles?: string[]; device?: string; reference?: boolean; timeLimitSeconds?: number }

export type BenchRun = {
  runId: string; created: number; updated: number; state: 'running' | 'finished'
  config: RunConfig; machines: RunMachine[]; rows: BenchRow[]; summary: BenchSummary
}

export type RecordedRun = {
  rows: BenchRow[]; summary: BenchSummary | null
  recorded: { generatedAt: string; platform: string; cpuThreads: number; gpu: string; timeLimitSeconds: number; note: string } | null
}

export type RunListItem = { runId: string; created: number; updated: number; jobs: number; finished: number }

export const PROFILE_COLORS: Record<string, string> = {
  lp_simplex: '#2c63e0',
  lp_ipm: '#0f8a7e',
  lp_auto: '#7a5af0',
  milp_bc: '#c2410c',
  milp_bb: '#b7791f',
  qp_ipm: '#0e7490',
  qp_fw: '#9d4edd',
}
export const HIGHS_COLOR = '#8a8d94'

export function formatSeconds(s?: number | null) {
  if (s == null) return '—'
  if (s === 0) return '< 1 ms'
  if (s < 0.001) return `${(s * 1e6).toFixed(0)} µs`
  if (s < 1) return `${(s * 1000).toFixed(s < 0.01 ? 1 : 0)} ms`
  return `${s.toFixed(s < 10 ? 2 : 1)} s`
}

export function formatObjective(n?: number | null) {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e9)) return n.toExponential(4)
  return Number(n.toPrecision(9)).toLocaleString()
}

export function sizeLabel(shape?: Shape) {
  if (!shape?.columns) return ''
  const k = (n: number) => n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString()
  return `${k(shape.columns)} vars × ${k(shape.rows ?? 0)} rows`
}

export type Outcome = 'agree' | 'verified' | 'unproven' | 'disagree' | 'limit' | 'error' | 'pending' | 'cancelled'

export function outcomeOf(row: BenchRow): Outcome {
  if (row.state === 'QUEUED' || row.state === 'SOLVING') return 'pending'
  if (row.status === 'CANCELLED') return 'cancelled'
  if (row.agrees === true) return 'agree'
  if (row.status === 'TIME_LIMIT' || row.status === 'ITERATION_LIMIT') return 'limit'
  if (row.agrees === false && row.status === 'FEASIBLE' && row.sameObjective) return 'unproven'
  if (row.agrees === false) return 'disagree'
  if (row.verified && (row.status === 'OPTIMAL' || row.status === 'FEASIBLE')) return 'verified'
  if (row.status === 'INFEASIBLE' || row.status === 'UNBOUNDED') return 'verified'
  return 'error'
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  agree: 'Matches HiGHS',
  verified: 'Verified',
  unproven: 'Same objective, not proven optimal',
  disagree: 'Differs from HiGHS',
  limit: 'Hit limit',
  error: 'Failed',
  pending: 'Pending',
  cancelled: 'Cancelled',
}
