import { useEffect, useRef, useState } from 'react'

type AsyncState<T> = {
  data: T | null
  error: string | null
  loading: boolean
}

/**
 * Run an async loader once, cancelling the in-flight request if the component
 * unmounts first.
 *
 * Two problems this solves:
 *
 * 1. Without the abort, a slow `/api/benchmarks` can resolve after the user has
 *    moved on and write state onto a dead component — a wasted render plus a
 *    React warning. The `cancelled` flag also covers responses that landed
 *    before the abort took effect.
 * 2. Callers pass an inline arrow, so its identity changes every render. Keying
 *    the effect on that would refetch forever. The loader is therefore held in a
 *    ref and the effect depends only on the caller's explicit `deps`.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  })

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      })
      .catch((err: unknown) => {
        // An aborted request is a cancellation, not a failure — surfacing it
        // would flash a spurious error on the way out.
        if (cancelled || controller.signal.aborted) return
        setState({
          data: null,
          error: err instanceof Error ? err.message : 'Request failed',
          loading: false,
        })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
