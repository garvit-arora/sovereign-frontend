export type Machine = {
  id: string; name: string; online: boolean; seen: number
  capabilities: {
    hostname?: string; platform?: string; cpu_threads?: number; cuda_available?: boolean; gpu_name?: string; engine_version?: string
    reference_solvers?: string[]; highs_version?: string
  }
}
export type Job = {
  id: string; name: string; state: string; created: number; updated: number
  worker_id?: string; device: string; target?: string; message?: string
  routing?: { preferred_device: string; execution_device?: string | null; reason: string; shape?: { problem_type?: string } }
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
import { getIdToken } from '@/lib/firebase'

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let token = await getIdToken()
  if (!token) token = await getIdToken(true)
  if (!token) throw new WorkspaceError('Sign in to continue.', 401)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
  let response: Response
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin', signal: AbortSignal.timeout(45000),
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    throw new WorkspaceError(
      timedOut ? 'The server took too long to respond. Render may be waking up — try again in a moment.' : (error as Error).message,
      timedOut ? 504 : 0,
    )
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data?.detail
    throw new WorkspaceError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((x: { msg: string }) => x.msg).join('. ') : `Request failed (${response.status})`, response.status)
  }
  return data as T
}
