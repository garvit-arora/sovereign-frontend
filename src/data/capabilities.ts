export type SupportLevel = 'ready' | 'beta' | 'limited' | 'planned'

export type Capability = {
  area: string
  items: { name: string; level: SupportLevel; note: string }[]
}

/**
 * Support levels are deliberately conservative and mirror what the engine
 * actually does today, not what the roadmap hopes it will do:
 *
 *   ready   exercised by the test suite and reproduced against a reference
 *   beta    works, but with a caveat we can point at
 *   limited correct on small instances, blocked by a known structural limit
 *   planned not implemented yet
 */
export const CAPABILITIES: Capability[] = [
  {
    area: 'Problem classes',
    items: [
      {
        name: 'Linear Programming',
        level: 'ready',
        note: 'Revised simplex with product-form updates; matches reference objectives on Netlib AFIRO and the scale suite.',
      },
      {
        name: 'Mixed Integer LP',
        level: 'beta',
        note: 'Branch-and-cut with strong branching and parallel child LPs. Correct on small instances; official MIPLIB sets still exceed the time limit.',
      },
      {
        name: 'Convex QP',
        level: 'beta',
        note: 'Mehrotra primal-dual IPM with Q in the KKT (1,1) block, plus a Frank-Wolfe fallback.',
      },
      { name: 'MIQP / NLP / MINLP', level: 'planned', note: 'Not implemented. No claim is made here.' },
    ],
  },
  {
    area: 'Numerical core',
    items: [
      {
        name: 'CSC / CSR sparse matrices',
        level: 'ready',
        note: 'Compressed sparse row and column, transposed multiply, dense basis extraction.',
      },
      {
        name: 'Presolve + postsolve',
        level: 'ready',
        note: 'Singleton and substitution reductions with reconstruction of the original solution.',
      },
      {
        name: 'Row/column equilibration',
        level: 'ready',
        note: 'Two-pass geometric scaling applied during standard-form build.',
      },
      {
        name: 'Interior-point LP',
        level: 'limited',
        note: 'Converges, but the termination test uses average complementarity, which is too loose on large sparse LPs. Being reworked.',
      },
      {
        name: 'Basis factorization',
        level: 'limited',
        note: 'Dense LU with partial pivoting. Correct, but memory and time are O(m^2)/O(m^3) in the number of rows, which caps realistic model size.',
      },
    ],
  },
  {
    area: 'Performance',
    items: [
      {
        name: 'Parallel branch-and-bound',
        level: 'planned',
        note: 'Only the two strong-branching child LPs run concurrently today. A real worker pool over the node queue is not built.',
      },
      {
        name: 'Warm-started node LPs',
        level: 'planned',
        note: 'Each node re-solves from a cold logical basis instead of inheriting the parent basis. This is the single biggest known MILP cost.',
      },
      {
        name: 'CUDA backend',
        level: 'planned',
        note: 'A CPU SpMV reference exists and the GPU path correctly declines to run without measured benefit. No CUDA kernels are written yet.',
      },
    ],
  },
]

export const PIPELINE = [
  { stage: 'Model / MPS', detail: 'JSON and linear MPS, validated before solving' },
  { stage: 'Presolve', detail: 'Reductions with solution reconstruction' },
  { stage: 'LP relaxation', detail: 'Revised simplex / Mehrotra IPM' },
  { stage: 'Branch-and-cut', detail: 'Strong branching, cuts, heuristics' },
  { stage: 'Parallel CPU', detail: 'Child LP concurrency only' },
  { stage: 'Verified solution', detail: 'Independent feasibility re-check' },
]

export const SUPPORT_LABEL: Record<SupportLevel, string> = {
  ready: 'Ready',
  beta: 'Beta',
  limited: 'Limited',
  planned: 'Planned',
}
