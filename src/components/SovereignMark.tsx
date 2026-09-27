const CELLS: Array<[number, number, boolean?]> = [
  [1, 0], [2, 0],
  [0, 1], [1, 1], [2, 1, true], [3, 1],
  [2, 2], [3, 2],
]

export function SovereignMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={(size * 27) / 37} viewBox="0 0 37 27" aria-hidden="true">
      {CELLS.map(([x, y, accent]) => (
        <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="7" height="7" rx="1.2" fill={accent ? 'var(--ws-accent, #2f6bea)' : 'currentColor'} />
      ))}
    </svg>
  )
}
