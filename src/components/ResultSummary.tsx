import type { Job } from '@/lib/workspace'

function number(value?: number | null): string {
  return value == null ? 'not reported' : Number(value.toPrecision(8)).toLocaleString()
}

export function ResultSummary({ job }: { job: Job }) {
  const result = job.result
  if (!result) return null
  const lines: string[] = []
  const verified = result.verification?.is_valid === true

  if (job.state === 'FAILED') {
    lines.push('This job was not accepted as a completed result. Review the message and verification details below.')
  }
  if (result.status === 'OPTIMAL') {
    lines.push(`The solver reported an optimal objective of ${number(result.objective_value)}.`)
  } else if (result.status === 'FEASIBLE') {
    lines.push(`A feasible objective of ${number(result.objective_value)} was found; optimality was not established.`)
    if (typeof result.optimality_gap === 'number') {
      lines.push(`The reported relative MIP gap is ${number(result.optimality_gap * 100)}%.`)
    }
  } else {
    lines.push(`The solver stopped with status ${result.status.replaceAll('_', ' ').toLowerCase()}.`)
  }
  lines.push(verified
    ? 'The recorded primal solution and objective passed the independent feasibility check.'
    : 'The result has no passing verification report; do not treat it as a verified solution.')

  if (result.gpu_used && (result.gpu_operations ?? 0) > 0) {
    lines.push(`CUDA executed ${result.gpu_operations} sparse matrix operations; other solver steps may have run on CPU.`)
  } else if (job.device === 'cuda') {
    lines.push('CUDA was requested, but this result recorded no GPU kernel execution.')
  } else {
    lines.push('This solve recorded CPU execution only.')
  }
  return <section className="info-note" aria-label="Result summary"><strong>Result summary</strong>
    {lines.map((line, index) => <p key={index}>{line}</p>)}
  </section>
}
