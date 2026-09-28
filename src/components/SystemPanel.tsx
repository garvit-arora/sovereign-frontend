import { Cpu, Network, Package, Server, Terminal } from 'lucide-react'

import { api } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { Card } from '@/components/ui'

/**
 * System panel: what is actually running, and what is not.
 *
 * Deliberately reports the absent things as clearly as the present ones. A
 * dashboard that quietly omits "CUDA: no usable GPU" invites the reader to
 * assume it exists.
 */

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--app-border)] py-2 last:border-0">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span
        className={
          mono
            ? 'text-right font-mono text-[12px] text-slate-800'
            : 'text-right text-[12px] text-slate-800'
        }
      >
        {value}
      </span>
    </div>
  )
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Cpu
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 font-display text-[13px] font-medium tracking-tight text-slate-900">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </Card>
  )
}

export function SystemPanel() {
  const { data: system } = useAsync((s) => api.system(s), [])
  const { data: health } = useAsync((s) => api.health(s), [])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Block icon={Server} title="Service">
          <Row label="Status" value={health?.status ?? 'unreachable'} />
          <Row label="Bind" value="127.0.0.1 (loopback only)" />
          <Row label="Workers" value={String(health?.workers ?? '-')} />
          <Row label="Model root" value={system?.model_root ?? '-'} />
        </Block>

        <Block icon={Cpu} title="Compute">
          <Row label="Hardware threads" value={String(system?.hardware_threads ?? '-')} />
          <Row label="Solve workers" value={String(system?.worker_threads ?? '-')} />
          <Row label="Device" value={system?.device ?? '-'} />
          <Row label="CUDA" value={system?.cuda_available ? 'available' : 'no usable GPU'} />
        </Block>

        <Block icon={Package} title="Capabilities">
          {Object.entries(system?.capabilities ?? {}).map(([k, v]) => (
            <Row key={k} label={k} value={v ? 'implemented' : 'not implemented'} />
          ))}
        </Block>

        <Block icon={Terminal} title="Engine">
          <Row label="Version" value={system?.version ?? '-'} />
          <Row label="Build" value="Visual Studio 2022, MSVC 14.44, x64" />
          <Row label="Standard" value="C++17" />
          <Row label="Third party" value="cpp-httplib (MIT), Monocypher (CC0)" />
        </Block>
      </div>

      <Card className="p-5">
        <p className="flex items-center gap-2 font-display text-[13px] font-medium tracking-tight text-slate-900">
          <Network className="h-3.5 w-3.5 text-slate-500" />
          Offline guarantee
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          Every font, script and style the application needs is bundled. An
          automated audit fails the build if any shipped file references a remote
          origin, so the product keeps working with the network disconnected.
          The only permitted remote reference is the optional hero video fallback
          on the landing page, and the page degrades to a gradient without it.
        </p>
      </Card>
    </div>
  )
}
