import { CalendarDays, LayoutGrid, LogOut, ShieldCheck, UserRound } from 'lucide-react'
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
        <UserAvatar user={user} className="avatar avatar-lg" />
        <div className="account-hero-text">
          <h2>{userDisplayName(user)}</h2>
          <p>{user.email ?? 'No email on file'}</p>
        </div>
        <div className="account-hero-meta">
          <span><ShieldCheck size={14} strokeWidth={1.75} />{userProviderLabel(user)}</span>
          <span><CalendarDays size={14} strokeWidth={1.75} />Member since {userMemberSince(user)}</span>
        </div>
      </section>

      <div className="account-grid">
        <section className="surface">
          <div className="surface-heading"><h2><UserRound size={16} strokeWidth={1.75} />Profile</h2></div>
          <dl className="detail-list">
            <div><dt>Display name</dt><dd>{user.displayName?.trim() || 'Not set'}</dd></div>
            <div><dt>Email</dt><dd>{user.email ?? '—'}</dd></div>
            <div><dt>Sign-in method</dt><dd>{userProviderLabel(user)}</dd></div>
            <div><dt>Account ID</dt><dd className="mono">{user.uid}</dd></div>
          </dl>
        </section>

        <section className="surface">
          <div className="surface-heading"><h2><LayoutGrid size={16} strokeWidth={1.75} />Workspace</h2></div>
          <dl className="detail-list">
            <div><dt>Paired machines</dt><dd>{ready ? data.workers.length : '—'}</dd></div>
            <div><dt>Online now</dt><dd>{ready ? online : '—'}</dd></div>
            <div><dt>Jobs saved</dt><dd>{ready ? data.jobs.length : '—'}</dd></div>
          </dl>
          <p className="account-note">
            Jobs and machine pairings are linked to this account and follow you across browsers and devices.
          </p>
        </section>
      </div>

      <section className="surface account-actions">
        <div>
          <strong>Sign out</strong>
          <p>End this session on this browser. Paired machines keep their connection.</p>
        </div>
        <button
          className="secondary-button danger-text"
          type="button"
          onClick={() => void logout('/login')}
        >
          <LogOut size={15} />Sign out
        </button>
      </section>
    </div>
  )
}
