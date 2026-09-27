import { motion } from 'motion/react'

import { PIPELINE } from '@/data/capabilities'
import { Card, Section } from '@/components/ui'

export function Pipeline() {
  return (
    <Section
      eyebrow="Request lifecycle"
      title="From model file to verified solution"
      description="This is the actual call path. Each stage is a module in solver/, and the last stage is deliberately independent of the stage that produced the answer."
    >
      <Card className="p-6 md:p-8">
        <ol className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {PIPELINE.map((step, index) => (
            <motion.li
              key={step.stage}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.06, duration: 0.45 }}
              className="relative rounded-2xl border border-slate-200/60 bg-slate-50/70 px-4 py-4"
            >
              <span className="font-mono text-[10px] font-semibold text-slate-400">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-1.5 text-[13px] font-semibold text-slate-800">{step.stage}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{step.detail}</p>
            </motion.li>
          ))}
        </ol>
      </Card>
    </Section>
  )
}
