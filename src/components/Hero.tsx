import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

import { FloatingNav } from '@/components/FloatingNav'
import { resolveHeroVideo } from '@/lib/heroMedia'

/**
 * Hero video is optional by design. `resolveHeroVideo` returns null on a machine
 * with no network and no bundled copy, and we fall back to a static gradient.
 * The hero must render fully offline, so nothing here may block on a fetch.
 */
function HeroBackdrop({ src }: { src: string | null }) {
  if (!src) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[radial-gradient(120%_120%_at_15%_0%,#eef4ff_0%,#f8fafc_45%,#ffffff_100%)]"
      />
    )
  }
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover scale-105 transition-transform duration-1000"
      />
    </div>
  )
}

export function Hero() {
  // Slide-up entrances are decorative. If the OS asks for reduced motion we
  // still fade in (so nothing pops in abruptly) but drop the translation.
  const reduce = useReducedMotion()
  const [video, setVideo] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void resolveHeroVideo().then((src) => {
      if (!cancelled) setVideo(src)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white border border-slate-200/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)] overflow-hidden h-[600px] flex flex-col">
      <HeroBackdrop src={video} />

      <div className="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start"
        >
          <h1
            className="font-display text-[42px] md:text-[56px] font-medium tracking-tight text-slate-800"
            dangerouslySetInnerHTML={{
              __html: 'Optimization engines<br />built from first principles',
            }}
          />

          <p className="mt-6 max-w-xl font-sans text-[14px] md:text-[15px] leading-relaxed text-slate-500">
            Sovereign is an independent LP, MILP and QP solver written from mathematical
            foundations — dual simplex, Mehrotra interior point and branch-and-cut — with
            every returned solution independently re-verified before it is called optimal.
          </p>

          <motion.a
            href="#dashboard"
            whileHover={reduce ? undefined : { scale: 1.04 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#0a152d] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(10,21,45,0.6)]"
          >
            Explore the engine
          </motion.a>
        </motion.div>
      </div>

      <FloatingNav />
    </section>
  )
}
