export type Algorithms = {
  algorithm: string; qpAlgorithm: string; milpMethod: string; branchRule: string
  presolve: boolean; parallelBranching: boolean; maxNodes: number
}

export const DEFAULT_ALGORITHMS: Algorithms = {
  algorithm: 'auto', qpAlgorithm: 'auto', milpMethod: 'branch_and_cut', branchRule: 'strong',
  presolve: true, parallelBranching: false, maxNodes: 100000,
}
