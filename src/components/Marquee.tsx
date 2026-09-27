import { MARQUEE_ITEMS, type MarqueeItem } from '@/data/marquee'
import { cn } from '@/lib/cn'

function MarqueeCard({ item }: { item: MarqueeItem }) {
  return (
    <div className="group relative h-24 w-40 shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all overflow-hidden">
      {/* Hover wash: collapsed and invisible at rest, blooming to full scale on hover. */}
      <div
        aria-hidden
        className="absolute inset-0 scale-150 opacity-0 transition-all duration-500 ease-out group-hover:scale-100 group-hover:opacity-100"
        style={{
          backgroundImage: `linear-gradient(135deg, ${item.gradient.from}, ${item.gradient.to})`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center leading-tight">
        {item.src ? (
          <img
            src={item.src}
            alt={item.alt ?? item.name}
            loading="lazy"
            decoding="async"
            className="h-7 w-auto max-w-[7.5rem] object-contain transition-all duration-500 group-hover:brightness-0 group-hover:invert"
          />
        ) : (
          <span className="font-display text-[19px] font-medium tracking-tight text-slate-700 transition-colors duration-500 group-hover:text-white">
            {item.name}
          </span>
        )}

        {item.caption ? (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 transition-colors duration-500 group-hover:text-white/80">
            {item.caption}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Seamless, dependency-free wordmark scroller.
 *
 * The track holds the list twice and animates translateX(0) -> translateX(-50%).
 * For that to be truly seamless the track must be exactly twice one copy's width,
 * which means the spacing between cards has to live *inside* each copy rather
 * than between cards on the track. A `gap` on the track would leave -50% half a
 * gap short of the seam, and the loop would visibly stutter once per cycle. So:
 * two copy wrappers, each owning its own gap plus a trailing pad, on a track
 * with no gap of its own.
 *
 * No JS, no measurement, no rAF loop. The animation lives in index.css and only
 * touches `transform`, so it stays on the compositor.
 */
export function Marquee({
  items = MARQUEE_ITEMS,
  durationSeconds = 42,
  className,
}: {
  items?: MarqueeItem[]
  durationSeconds?: number
  className?: string
}) {
  const copy = (keySuffix: string, decorative: boolean) => (
    <div
      className="flex shrink-0 items-center gap-5 pr-5"
      aria-hidden={decorative || undefined}
    >
      {items.map((item) => (
        <MarqueeCard key={`${item.name}${keySuffix}`} item={item} />
      ))}
    </div>
  )

  return (
    <div className={cn('marquee-viewport overflow-hidden', className)}>
      <div
        className="marquee-track flex w-max items-center"
        style={{ '--marquee-duration': `${durationSeconds}s` } as React.CSSProperties}
      >
        {copy('', false)}
        {copy('-dup', true)}
      </div>
    </div>
  )
}
