import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  tall,
}: {
  id?: string
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** Taller intrinsic-size hint, for sections holding a table or form. */
  tall?: boolean
}) {
  return (
    <section
      id={id}
      className={cn(
        'deferred-section w-full max-w-[1400px] mx-auto px-2',
        tall && 'deferred-section--tall',
        className,
      )}
    >
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-[28px] md:text-[34px] font-medium tracking-tight text-slate-800">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-slate-500">{description}</p>
      ) : null}
      <div className="mt-8">{children}</div>
    </section>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[28px] bg-white border border-slate-200/60 shadow-[0_18px_50px_-30px_rgba(10,27,51,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 font-display text-[20px] font-medium tracking-tight text-slate-800 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  )
}
