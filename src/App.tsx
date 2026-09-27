import { useEffect, useState } from 'react'
import { CloudDashboard } from '@/components/CloudDashboard'
import { waitForUser } from '@/lib/firebase'
import '@/workspace.css'

export default function App() {
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let active = true
    void waitForUser().then((user) => {
      if (!active) return
      if (!user) {
        const next = `${window.location.pathname}${window.location.search}`
        window.location.replace(`/login?next=${encodeURIComponent(next || '/app')}`)
        return
      }
      setSignedIn(true)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  if (!ready || !signedIn) {
    return <div className="workspace"><main style={{ padding: '48px 24px' }}>Checking your session…</main></div>
  }

  return <CloudDashboard />
}
