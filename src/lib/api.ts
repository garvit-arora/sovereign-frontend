export type SystemInfo = {
  version: string
  hardware_threads: number
  worker_threads: number
  device: string
  cuda_available: boolean
  capabilities: Record<string, boolean>
  model_root: string
}

export type EngineInfo = {
  available: boolean
  reason?: string
  path?: string
  version?: string
  compiler?: string
  cuda?: boolean
  /** Solve workers the local server started. */
  workers?: number
}

export type Health = {
  status: string
  engine: EngineInfo
  /** Solve workers, reported at the top level by the C++ server. */
  workers?: number
  reportCount: number
}

/**
 * A model the local server can list.
 *
 * Shape matches the C++ server's GET /api/problems, which is what actually
 * ships. The retired Python bridge used a richer per-model summary
 * (problemType, rows, columns, nonzeros); the C++ server lists files only and
 * reports a model's shape on demand via /api/validate, which is cheaper for a
 * directory with thousands of files and keeps the listing honest -- it does not
 * have to parse every model just to list them.
 */
export type ModelEntry = {
  name: string
  path: string
  format: 'json' | 'mps' | string
}

export type BenchmarkRow = {
  suite: string
  problem: string
  solver: string
  status: string
  objective: number | null
  runtimeSeconds: number | null
  gap: number | null
  nodes: number | null
  iterations: number | null
  milpStats: string | null
}

export type Verification = {
  is_valid: boolean
  issues: string[]
  max_constraint_violation: number
  max_bound_violation: number
  max_integrality_violation: number
  recomputed_objective: number
}

export type ModelSummary = {
  valid: boolean
  error?: string
  problem_type?: string
  sense?: string
  rows?: number
  columns?: number
  nonzeros?: number
  equalities?: number
  inequalities?: number
  integer_vars?: number
  binary_vars?: number
  objective_terms?: number
  quadratic_terms?: number
}

export type SubmitJob = {
  modelJson?: string
  modelFormat?: string
  modelPath?: string
  algorithm?: string | null
  threads?: number
  /** Requested compute device. 'cuda' is accepted but not implemented. */
  device?: 'cpu' | 'cuda'
  timeLimitSeconds?: number
  mipGap?: number
  presolve?: boolean
}

export type SolveResponse = {
  modelId?: string
  /** Job lifecycle: QUEUED | SOLVING | COMPLETED | FAILED | CANCELLED */
  state?: string
  status: string
  /** Terminal solver verdict, present once the job COMPLETES. */
  solver_status?: string
  message?: string
  has_objective?: boolean
  objective?: number
  objective_value?: number
  optimality_gap?: number
  mip_gap?: number
  iterations?: number
  lp_iterations?: number
  nodes?: number
  runtime_seconds?: number
  runtimeSeconds?: number
  primal?: Record<string, number>
  solution?: Record<string, number>
  warnings?: string[]
  verification?: Verification
}

export type SolutionExport = {
  jobId: string
  solver_status: string
  objective: number | null
  runtime_seconds: number
  mip_gap: number
  solution: Record<string, number>
  verification?: Verification
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * In-flight request de-duplication.
 *
 * `/api/health` is read by three separate components on mount, and StrictMode
 * double-invokes effects in development, so without this the browser fires the
 * same request five or six times. We cache the *promise* rather than the
 * resolved value: concurrent callers share one round trip, and the entry is
 * dropped as soon as it settles so a later mount can retry.
 */
const inFlight = new Map<string, Promise<unknown>>()

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = run().finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new ApiError(`Malformed response from ${res.url}`, res.status)
  }
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : text.slice(0, 300)
    throw new ApiError(detail || `${res.status} ${res.statusText}`, res.status)
  }
  return data
}

function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return dedupe(`GET ${path}`, async () => {
    const res = await fetch(path, { signal, headers: { Accept: 'application/json' } })
    return (await parse(res)) as T
  })
}

/** POST helper. Not deduped: a POST is a state change, not a cacheable read. */
function post<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  }).then(parse) as Promise<T>
}

export const api = {
  health: (signal?: AbortSignal) => get<Health>('/api/health', signal),
  system: (signal?: AbortSignal) => get<SystemInfo>('/api/system', signal),
  models: (signal?: AbortSignal) => get<{ models: ModelEntry[] }>('/api/problems', signal),
  benchmarks: (signal?: AbortSignal) => get<{ rows: BenchmarkRow[] }>('/dashboard/data/benchmarks.json', signal),

  /** Parse a model and report its shape, without solving it. */
  validate: (modelJson: string) =>
    post<ModelSummary>('/api/validate', { modelJson }),

  /** Queue a solve. Returns the job id immediately; progress comes over SSE. */
  submitJob: (body: SubmitJob) => post<{ jobId: string; state: string }>('/api/jobs', body),

  /** One-shot snapshot of a job's progress. */
  job: (jobId: string) => get<SolveResponse>(`/api/jobs/${jobId}`),

  /** The solved point plus its verification report, for export. */
  solution: (jobId: string) => get<SolutionExport>(`/api/jobs/${jobId}/solution`),

  cancel: (jobId: string) => post<{ cancelled: boolean }>(`/api/jobs/${jobId}/cancel`, {}),

  /**
   * Blocking solve. Kept for the one-shot path and for scripts; the UI uses
   * submitJob + SSE so a long solve never freezes a fetch.
   */
  solve: (body: { modelId: string; algorithm?: string | null; verify?: boolean }) =>
    // Deliberately not deduped: every solve is a distinct, stateful engine run.
    fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then(parse) as Promise<SolveResponse>,
}
