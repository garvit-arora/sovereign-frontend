export type AppView = 'overview' | 'jobs' | 'machines' | 'settings' | 'account'

const PATH_TO_VIEW: Record<string, AppView> = {
  '/app': 'overview',
  '/app/jobs': 'jobs',
  '/app/machines': 'machines',
  '/app/settings': 'settings',
  '/app/account': 'account',
}

export function viewFromPath(pathname = window.location.pathname): AppView {
  const path = pathname.replace(/\/$/, '') || '/app'
  return PATH_TO_VIEW[path] ?? 'overview'
}

export function pathForView(view: AppView): string {
  if (view === 'overview') return '/app'
  return `/app/${view}`
}
