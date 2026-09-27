import { Component, type ErrorInfo, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Props = { children: ReactNode; className?: string }
type State = { error: Error | null }

/**
 * Keeps one failing section from taking down the page.
 *
 * The engine bridge is a separate process, so it can be down or mid-rebuild
 * while the static page is fine. Without a boundary the first failed fetch would
 * unmount the whole tree and leave a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Sovereign UI error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        className={cn(
          'rounded-[28px] border border-rose-100 bg-rose-50/50 p-6',
          this.props.className,
        )}
        role="alert"
      >
        <p className="text-[13px] font-semibold text-rose-800">This section failed to load</p>
        <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-rose-700/80">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 rounded-full bg-rose-100 px-4 py-1.5 text-[11.5px] font-semibold text-rose-800 transition-colors hover:bg-rose-200"
        >
          Try again
        </button>
      </div>
    )
  }
}
