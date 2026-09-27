export type Machine = {
  id: string; name: string; online: boolean; seen: number
  capabilities: { hostname?: string; platform?: string; cpu_threads?: number; cuda_available?: boolean; gpu_name?: string; engine_version?: string }
}
export type Job = {
  id: string; name: string; state: string; created: number; updated: number
  worker_id?: string; device: string; target?: string; message?: string
  routing?: { preferred_device: string; execution_device?: string | null; reason: string }
  solver_status?: string; runtime_seconds?: number; gpu_used?: boolean
  result?: {
    status: string; objective_value?: number | null; runtime_seconds?: number; optimality_gap?: number
    primal?: Record<string, number>; message?: string; warnings?: string[]
    gpu_used?: boolean; gpu_operations?: number; requested_device?: string
    verification?: { is_valid: boolean; issues: string[] }
  }
}
export type Workspace = { workers: Machine[]; jobs: Job[] }
export class WorkspaceError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method, credentials: 'same-origin', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data?.detail
    throw new WorkspaceError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((x: { msg: string }) => x.msg).join('. ') : `Request failed (${response.status})`, response.status)
  }
  return data as T
}
export const SAMPLE = JSON.stringify({
  problem_type: 'MILP', sense: 'maximize',
  variables: ['a', 'b', 'c'].map(name => ({ name, type: 'binary', lower_bound: 0, upper_bound: 1 })),
  objective: { linear: { a: 5, b: 4, c: 3 } },
  constraints: [{ name: 'capacity', linear: { a: 1, b: 1, c: 1 }, sense: '<=', rhs: 2 }],
}, null, 2)
