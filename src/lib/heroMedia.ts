/**
 * Hero background media.
 *
 * Offline-first constraint: the hero video is a nice-to-have, never a
 * dependency. It is a multi-megabyte remote asset, so bundling it would bloat
 * every install for something decorative. Instead:
 *
 *   1. If a local copy is present at /media/hero.mp4 it is used.
 *   2. If VITE_HERO_VIDEO_URL is set at build time, that URL is used.
 *   3. Otherwise there is no video at all and the hero falls back to a static
 *      gradient, which is a perfectly good hero on its own.
 *
 * The hero must never depend on a network fetch succeeding. The previous
 * implementation hard-coded a CloudFront URL, which meant the flagship
 * background silently failed on an offline machine.
 */

/** Resolve a bundled local asset if it exists. Returns null when absent. */
async function probeLocalVideo(path: string): Promise<string | null> {
  try {
    const res = await fetch(path, { method: 'HEAD', cache: 'force-cache' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('video/')) return null
    return path
  } catch {
    return null
  }
}

export async function resolveHeroVideo(): Promise<string | null> {
  const local = await probeLocalVideo('/media/hero.mp4')
  if (local) return local
  return import.meta.env.VITE_HERO_VIDEO_URL || null
}
