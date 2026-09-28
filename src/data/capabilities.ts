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
        note: 'Bounded dual simplex with steepest-edge pricing on a sparse LU, primal revised simplex as fallback; matches HiGHS on Netlib AFIRO, MIPLIB relaxations and transport LPs up to 40,000 variables.',
      },
      {
        name: 'Mixed Integer LP',
        level: 'beta',
        note: 'Branch-and-cut with reliability branching, warm-started node LPs, plunging, diving and validated cuts. Proves MIPLIB flugpl and gt2 optimal; harder instances return a verified incumbent at the time limit.',
      },
      {
        name: 'Convex QP',
        level: 'beta',
        note: 'Mehrotra primal-dual IPM. The KKT system is factored once per iteration by a sparse quasi-definite LDL^T with minimum-degree ordering, or as a dense system (on the GPU when available) when Q is dense. Solves a 20,000-asset portfolio QP in about 1.3 s, matching HiGHS. Frank-Wolfe remains as a fallback.',
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
        level: 'ready',
        note: 'Mehrotra predictor-corrector. The normal equations are factored once per iteration by a sparse LDL^T with minimum-degree ordering, or as a dense system on the GPU. Solves a 10,200-row planning LP in about 1 s, matching HiGHS.',
      },
      {
        name: 'Basis factorization',
        level: 'ready',
        note: 'Sparse LU (left-looking, threshold partial pivoting, sparsest-column order) with sparse product-form updates between refactorizations.',
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
        level: 'ready',
        note: 'Each node re-solves with the dual simplex from its parent\'s optimal basis; new cut rows start with their slack basic.',
      },
      {
        name: 'CUDA backend',
        level: 'ready',
        note: 'Loads the NVIDIA driver at run time, so any machine with an NVIDIA GPU can use it without installing the CUDA toolkit. Interior point for LP and QP factors its dense system on the GPU: 10x faster than the CPU dense LU at 1,000 rows and 21x at 1,500 on an RTX 2050. For sparse LPs and QPs the CPU sparse factorization is often faster, so automatic mode picks per model. Simplex, Frank-Wolfe and branch-and-bound stay on the CPU.',
      },
    ],
  },
]

export const PIPELINE = [
  { stage: 'Model / MPS', detail: 'JSON and linear MPS, validated before solving' },
  { stage: 'Presolve', detail: 'Reductions with solution reconstruction' },
  { stage: 'LP relaxation', detail: 'Dual simplex / Mehrotra IPM' },
  { stage: 'Branch-and-cut', detail: 'Reliability branching, cuts, diving' },
  { stage: 'Parallel CPU', detail: 'Child LP concurrency only' },
  { stage: 'Verified solution', detail: 'Independent feasibility re-check' },
]

export const SUPPORT_LABEL: Record<SupportLevel, string> = {
  ready: 'Ready',
  beta: 'Beta',
  limited: 'Limited',
  planned: 'Planned',
}
