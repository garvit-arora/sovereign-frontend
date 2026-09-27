import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { CloudDashboard } from '@/components/CloudDashboard'
import { waitForUser } from '@/lib/firebase'
import '@/workspace.css'

export default function App() {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let active = true
    void waitForUser().then((nextUser) => {
      if (!active) return
      if (!nextUser) {
        const next = `${window.location.pathname}${window.location.search}`
        window.location.replace(`/login?next=${encodeURIComponent(next || '/app')}`)
        return
      }
      setUser(nextUser)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  if (!ready || !user) {
    return <div className="workspace"><main style={{ padding: '48px 24px' }}>Checking your session…</main></div>
  }

  return <CloudDashboard user={user} />
}
