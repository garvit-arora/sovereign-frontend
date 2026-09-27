import type { User } from 'firebase/auth'

export function userDisplayName(user: User): string {
  const name = user.displayName?.trim()
  if (name) return name
  const email = user.email?.split('@')[0]?.trim()
  if (email) return email
  return 'Your account'
}

export function userInitials(user: User): string {
  const name = user.displayName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  const email = user.email?.trim()
  if (email) return email.slice(0, 2).toUpperCase()
  return 'U'
}

export function userProviderLabel(user: User): string {
  const provider = user.providerData[0]?.providerId
  if (provider === 'google.com') return 'Google'
  if (provider === 'password') return 'Email and password'
  if (provider === 'github.com') return 'GitHub'
  return provider?.replace('.com', '') ?? 'Sovereign'
}

export function userMemberSince(user: User): string {
  if (!user.metadata.creationTime) return '—'
  return new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
