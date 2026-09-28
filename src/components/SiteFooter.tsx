import { Cpu, FolderGit2, Terminal } from 'lucide-react'

import { api } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'

export function SiteFooter() {
  // Shares the in-flight request with ModelRunner, so mounting both costs one
  // call rather than two.
  const { data: health } = useAsync((signal) => api.health(signal), [])

  const engine = health?.engine

  return (
    <footer className="w-full max-w-[1400px] mx-auto px-2 pb-16 pt-4">
      <div className="rounded-[32px] bg-[#0a152d] px-8 py-10 text-white md:px-12">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[13px]">
                &#10038;
              </span>
              <span className="font-display text-[17px] font-medium tracking-tight">
                Sovereign
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-white/60">
              An indigenous mathematical optimization engine. LP, MILP and convex QP solved by
              algorithms implemented from scratch in C++, with independent solution verification.
            </p>
          </div>

          <div className="min-w-[240px] rounded-2xl bg-white/5 px-5 py-4">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              <Cpu className="h-3 w-3" />
              Engine
            </p>
            {engine?.available ? (
              <>
                <p className="mt-2 font-mono text-[11.5px] text-white/80">{engine.version}</p>
                <p className="mt-1 font-mono text-[10.5px] text-white/40">{engine.path}</p>
                <p className="mt-2 text-[11px] text-white/50">
                  CUDA: {engine.cuda ? 'GPU available' : 'no usable GPU'}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[11.5px] text-white/50">
                {engine?.reason ?? 'Checking engine status...'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center gap-5 border-t border-white/10 pt-6 text-[11.5px] text-white/40">
          <span className="inline-flex items-center gap-1.5 font-mono">
            <Terminal className="h-3.5 w-3.5" />
            sovereign solve model.json --verify
          </span>
          <a
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            href="https://github.com/abhishekmishra2808/sovereign"
            target="_blank"
            rel="noreferrer"
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            Source
          </a>
          <span className="ml-auto">Built for learning, benchmarked in the open.</span>
        </div>
      </div>
    </footer>
  )
}
