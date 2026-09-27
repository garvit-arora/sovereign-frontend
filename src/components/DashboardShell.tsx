import { useState, useEffect } from 'react'
import { Activity, Play, Server } from 'lucide-react'

import { api } from '@/lib/api'

export type ViewId = 'solve' | 'system'

const NAV = [
  { id: 'solve' as ViewId, label: 'Solve', icon: Play },
  { id: 'system' as ViewId, label: 'System', icon: Server },
]

export function DashboardShell({
  view,
  onViewChange,
  children,
}: {
  view: ViewId
  onViewChange: (v: ViewId) => void
  children: React.ReactNode
}) {
  const [system, setSystem] = useState<any>(null)

  useEffect(() => {
    api.system().then(setSystem).catch(console.error)
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 space-y-2">
        <div className="text-lg font-bold mb-6">Sovereign</div>

        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded ${
              view === item.id ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{NAV.find(n => n.id === view)?.label}</h1>

          {system && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Activity size={16} />
                <span>{system.hardware_threads} threads</span>
              </div>
              <div className="flex items-center gap-2">
                <Server size={16} />
                <span>{system.device}</span>
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
