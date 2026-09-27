import { useEffect, useState } from 'react'
import { CloudDashboard } from '@/components/CloudDashboard'
import { watchAuth } from '@/lib/firebase'
import '@/workspace.css'

export default function App() {
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    return watchAuth((user) => {
      if (!user) {
        const next = `${window.location.pathname}${window.location.search}`
        window.location.replace(`/login?next=${encodeURIComponent(next || '/app')}`)
        return
      }
      setSignedIn(true)
      setReady(true)
    })
  }, [])

  if (!ready || !signedIn) {
    return <div className="workspace"><main style={{ padding: '48px 24px' }}>Checking your session…</main></div>
  }

  return <CloudDashboard />
}
