import { AlertTriangle, CheckCircle2, CircleDashed, Cpu, FlaskConical } from 'lucide-react'

import { CAPABILITIES, SUPPORT_LABEL, type SupportLevel } from '@/data/capabilities'
import { Card, Section } from '@/components/ui'
import { cn } from '@/lib/cn'

const LEVEL_STYLE: Record<SupportLevel, { chip: string; icon: typeof CheckCircle2 }> = {
  ready: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  beta: { chip: 'bg-sky-50 text-sky-700 border-sky-100', icon: FlaskConical },
  limited: { chip: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
  planned: { chip: 'bg-slate-50 text-slate-500 border-slate-200', icon: CircleDashed },
}

export function EngineCapabilities() {
  return (
    <Section
      id="capabilities"
      eyebrow="What actually works"
      title="Honest capability matrix"
      description="Support levels reflect what the engine does today and where it is structurally blocked, not what the roadmap intends. Anything unimplemented is labelled Planned rather than implied."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {CAPABILITIES.map((group) => (
          <Card key={group.area} className="p-6">
            <h3 className="font-display text-[15px] font-medium tracking-tight text-slate-800">
              {group.area}
            </h3>

            <ul className="mt-4 space-y-4">
              {group.items.map((item) => {
                const style = LEVEL_STYLE[item.level]
                const Icon = style.icon
                return (
                  <li key={item.name}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[13px] font-semibold text-slate-700">{item.name}</span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                          style.chip,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {SUPPORT_LABEL[item.level]}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">{item.note}</p>
                  </li>
                )
              })}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-4 flex items-start gap-3 border-amber-100 bg-amber-50/40 p-5">
        <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-[12px] leading-relaxed text-amber-900">
          <span className="font-semibold">No external solver is ever called.</span> HiGHS and
          other engines appear only inside the offline benchmarking harness, used to check our
          answers after the fact. Every objective reported by this engine is produced by
          algorithms implemented in <code className="font-mono">solver/</code>.
        </p>
      </Card>
    </Section>
  )
}
