import { LogOut, Mail, Shield, UserRound } from 'lucide-react'
import type { User } from 'firebase/auth'
import { logout } from '@/lib/firebase'
import { userDisplayName, userMemberSince, userProviderLabel } from '@/lib/user'
import { UserAvatar } from './UserAvatar'
import type { Workspace } from '@/lib/workspace'

type Props = {
  user: User
  data: Workspace
  ready: boolean
}

export function AccountPage({ user, data, ready }: Props) {
  const online = data.workers.filter((worker) => worker.online).length

  return (
    <div className="account-layout">
      <section className="surface account-hero">
        <div className="account-hero-main">
          <UserAvatar user={user} className="account-avatar" />
          <div>
            <h2>{userDisplayName(user)}</h2>
            <p>{user.email ?? 'No email on file'}</p>
          </div>
        </div>
        <div className="account-hero-meta">
          <span><Shield size={14} />{userProviderLabel(user)}</span>
          <span>Member since {userMemberSince(user)}</span>
        </div>
      </section>

      <div className="account-grid">
        <section className="surface account-card">
          <div className="surface-heading"><h2><UserRound size={18} />Profile</h2></div>
          <div className="account-details">
            <div><small>Display name</small><strong>{user.displayName?.trim() || 'Not set'}</strong></div>
            <div><small>Email</small><strong>{user.email ?? '—'}</strong></div>
            <div><small>Sign-in method</small><strong>{userProviderLabel(user)}</strong></div>
            <div><small>Account ID</small><strong className="account-id">{user.uid}</strong></div>
          </div>
        </section>

        <section className="surface account-card">
          <div className="surface-heading"><h2><Mail size={18} />Workspace</h2></div>
          <div className="account-stats">
            <div><small>Connected machines</small><strong>{ready ? data.workers.length : '—'}</strong></div>
            <div><small>Online now</small><strong>{ready ? online : '—'}</strong></div>
            <div><small>Jobs saved</small><strong>{ready ? data.jobs.length : '—'}</strong></div>
          </div>
          <p className="account-note">
            Your jobs and machine pairings stay linked to this account across browsers and devices.
          </p>
        </section>
      </div>

      <section className="surface account-card">
        <div className="surface-heading"><h2>Account actions</h2></div>
        <div className="account-actions">
          <button
            className="secondary-button danger-text"
            type="button"
            onClick={() => void logout('/login')}
          >
            <LogOut size={15} />Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
