import type { User } from 'firebase/auth'
import { userInitials } from '@/lib/user'

type Props = {
  user: User
  className?: string
  title?: string
}

export function UserAvatar({ user, className = 'profile-avatar', title }: Props) {
  return (
    <span className={className} title={title ?? user.email ?? 'Your account'} aria-hidden="true">
      {userInitials(user)}
    </span>
  )
}
