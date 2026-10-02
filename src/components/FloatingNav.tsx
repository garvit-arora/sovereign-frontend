import { ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

const textButton =
  'text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition-colors px-3 py-2'

export function FloatingNav() {
  const reduce = useReducedMotion()

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
      <motion.nav
        initial={{ opacity: 0, y: reduce ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center bg-white/90 backdrop-blur-2xl px-1.5 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-200/40"
      >
        <div className="flex w-9 h-9 items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm text-[13px] text-slate-800">
          &#10038;
        </div>

        {/*
          These targets must exist in the DOM. A link to a missing id silently
          does nothing, which is exactly the bug this nav had: it pointed at
          #dashboard before that section existed. Ids live on the Section
          components: #dashboard, #capabilities, #benchmarks, #runner.
        */}
        <a href="#dashboard" className={textButton}>
          Dashboard
        </a>
        <a href="#benchmarks" className={textButton}>
          Docs
        </a>
        <a href="/evidence" className={textButton}>
          Evidence
        </a>

        <a
          href="#runner"
          className="flex items-center gap-1 bg-white px-5 py-2 rounded-full text-[12px] font-semibold text-slate-800 border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all"
        >
          Get in touch
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </motion.nav>
    </div>
  )
}
