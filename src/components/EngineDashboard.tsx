import { motion } from 'motion/react'
import {
  Boxes,
  Cpu,
  Gauge,
  Layers,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { api, type ModelEntry } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { Card, Section } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * Engine dashboard.
 *
 * This is the section the hero's "Explore the engine" button targets, and the
 * landing point for the floating nav. It answers, at a glance: is the engine
 * present, what can it actually solve, and what is it capable of right now.
 *
 * Every number here is read from the running local server. Nothing is
 * hardcoded, and nothing claims a capability the engine has not got.
 */

type Tile = {
  label: string
  value: ReactNode
  hint?: string
  icon: typeof Cpu
  tone?: 'ok' | 'warn' | 'off'
}

const TONE: Record<NonNullable<Tile['tone']>, string> = {
  ok: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  warn: 'text-amber-600 bg-amber-50 border-amber-100',
  off: 'text-slate-400 bg-slate-50 border-slate-200',
}

function TileBox({ tile }: { tile: Tile }) {
  const Icon = tile.icon
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl border',
            TONE[tile.tone ?? 'off'],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3.5 font-display text-[22px] font-medium tracking-tight text-slate-800 tabular-nums">
        {tile.value}
      </p>
      <p className="mt-0.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {tile.label}
      </p>
      {tile.hint ? (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">{tile.hint}</p>
      ) : null}
    </Card>
  )
}

const CAPABILITY_ROWS: { key: string; label: string; implemented: boolean }[] = [
  { key: 'LP', label: 'Linear Programming', implemented: true },
  { key: 'MILP', label: 'Mixed Integer LP', implemented: true },
  { key: 'QP', label: 'Convex Quadratic', implemented: true },
  { key: 'MPS', label: 'MPS file format', implemented: false },
  { key: 'MIQP', label: 'Mixed Integer QP', implemented: false },
  { key: 'NLP', label: 'Nonlinear Programming', implemented: false },
]

export function EngineDashboard() {
  const { data: health } = useAsync((signal) => api.health(signal), [])
  const { data: system } = useAsync((signal) => api.system(signal), [])
  const { data: catalogue } = useAsync((signal) => api.models(signal), [])

  const models: ModelEntry[] = catalogue?.models ?? []
  const engineUp = health?.status === 'ok'
  const cuda = system?.cuda_available ?? false

  const tiles: Tile[] = [
    {
      label: 'Engine',
      value: engineUp ? 'Online' : 'Offline',
      hint: engineUp
        ? 'The native solver is responding on loopback.'
        : 'No local server detected. Start sovereign-launcher, or use the CLI directly.',
      icon: Cpu,
      tone: engineUp ? 'ok' : 'warn',
    },
    {
      label: 'CPU threads',
      value: system?.hardware_threads ?? '—',
      hint: system
        ? `${system.worker_threads} solve worker${system.worker_threads === 1 ? '' : 's'} available.`
        : 'Reported by the local server.',
      icon: Layers,
      tone: 'ok',
    },
    {
      label: 'GPU',
      value: cuda ? 'Available' : 'Not in use',
      hint: cuda
        ? 'Interior-point factorizations can run on the CUDA GPU.'
        : 'No usable NVIDIA GPU was detected. The CPU performs all work.',
      icon: Gauge,
      tone: cuda ? 'ok' : 'off',
    },
    {
      label: 'Models on disk',
      value: models.length,
      hint: 'Discoverable by the local model browser.',
      icon: Boxes,
      tone: models.length > 0 ? 'ok' : 'warn',
    },
  ]

  return (
    <Section
      id="dashboard"
      eyebrow="Local engine"
      title="Dashboard"
      description="Live status read from the running solver. If this panel is empty, the local server is not running — the CLI works regardless."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <TileBox tile={tile} />
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <div className="flex items-center gap-2.5">
            <Workflow className="h-4 w-4 text-slate-400" />
            <h3 className="font-display text-[15px] font-medium tracking-tight text-slate-800">
              Problem classes
            </h3>
          </div>

          <ul className="mt-4 space-y-2.5">
            {CAPABILITY_ROWS.map((row) => {
              // Prefer what the server reports over our static list, so the UI
              // cannot drift from the engine.
              const live = system?.capabilities
                ? system.capabilities[row.key] === true
                : row.implemented
              return (
                <li key={row.key} className="flex items-center justify-between gap-4">
                  <span className="text-[13px] text-slate-600">{row.label}</span>
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                      live
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400',
                    )}
                  >
                    {live ? 'Supported' : 'Not implemented'}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <h3 className="font-display text-[15px] font-medium tracking-tight text-slate-800">
              Guarantees
            </h3>
          </div>

          <ul className="mt-4 space-y-3 text-[12.5px] leading-relaxed text-slate-500">
            <li>
              <span className="font-semibold text-slate-700">Runs offline.</span> No CDN, no
              remote fonts, no hosted frontend. All assets are bundled and verified by an
              automated audit.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Loopback only.</span> The server
              binds 127.0.0.1 and validates Host and Origin on every request, so a website
              you visit cannot reach it.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Nothing is fabricated.</span> A
              status is only reported once the algorithm can justify it. Optimality claims
              carry a measured duality gap.
            </li>
            <li>
              <span className="font-semibold text-slate-700">No external solver.</span> Every
              objective is computed by algorithms implemented in this repository.
            </li>
          </ul>
        </Card>
      </div>
    </Section>
  )
}
