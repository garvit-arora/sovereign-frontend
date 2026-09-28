export type MarqueeItem = {
  /** Display name rendered inside the card. */
  name: string
  /** Optional supporting line, e.g. the suite an item belongs to. */
  caption?: string
  /**
   * Optional logo asset. Left undefined for wordmarks so we never ship a broken
   * image or imply a partnership that does not exist.
   */
  src?: string
  alt?: string
  /** Two hex stops for the hover wash. */
  gradient: { from: string; to: string }
}

/**
 * The engine's real ecosystem: the problem classes it solves and the public
 * benchmark suites it is measured against.
 *
 * These are deliberately wordmarks rather than third-party brand logos. Listing
 * a vendor here would read as a partnership or an endorsement the project does
 * not have, and the point of this page is to be accurate about what Sovereign
 * is. Add an `src` to any entry to render an image instead; the card styling and
 * hover treatment are identical either way.
 */
export const MARQUEE_ITEMS: MarqueeItem[] = [
  { name: 'LP', caption: 'dual simplex', gradient: { from: '#3b82f6', to: '#1d4ed8' } },
  { name: 'MILP', caption: 'branch-and-cut', gradient: { from: '#8b5cf6', to: '#6d28d9' } },
  { name: 'QP', caption: 'Mehrotra IPM', gradient: { from: '#0ea5e9', to: '#0369a1' } },
  { name: 'Netlib', caption: 'LP suite', gradient: { from: '#10b981', to: '#047857' } },
  { name: 'MIPLIB', caption: 'MILP suite', gradient: { from: '#f59e0b', to: '#b45309' } },
  { name: 'QPLIB', caption: 'QP suite', gradient: { from: '#ec4899', to: '#be185d' } },
  { name: 'MPS', caption: 'exchange format', gradient: { from: '#14b8a6', to: '#0f766e' } },
  { name: 'CUDA', caption: 'GPU backend', gradient: { from: '#22d3ee', to: '#0e7490' } },
]
