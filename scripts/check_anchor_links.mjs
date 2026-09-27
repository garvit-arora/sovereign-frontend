#!/usr/bin/env node
/**
 * Verify that every in-page anchor link resolves to a real element id.
 *
 * WHY THIS EXISTS
 * ---------------
 * The hero's "Explore the engine" button pointed at #dashboard, and the floating
 * nav pointed at #capabilities and #runner. None of those ids existed. A link to
 * a missing id is not an error -- the browser just does nothing -- so this class
 * of bug is invisible until a user clicks it. It shipped that way through a
 * build, a lint pass and a test run.
 *
 * This check closes the loop: it parses the built JS for href="#..." targets and
 * asserts each one appears as an id= in the same bundle.
 *
 * USAGE
 *   node scripts/check_anchor_links.mjs            # audit ../api/static
 *   node scripts/check_anchor_links.mjs --dir path
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DIR = path.resolve(HERE, '..', '..', 'api', 'static')

/** Anchors that legitimately point at a different page, not an element id. */
const EXTERNAL = new Set()

function collectFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else if (/\.(js|html|tsx|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

/**
 * Pull id="x" and id={'x'} / id={`x`} out of a source blob.
 *
 * The minifier can rewrite quotes, so accept both quote styles. Dynamic ids built
 * by template concatenation are intentionally not detected; this checks the
 * static anchors, which is where the bug actually was.
 */
function collectIds(text) {
  const ids = new Set()
  const re = /\bid\s*=\s*["'`]([A-Za-z][\w-]*)["'`]/g
  let m
  while ((m = re.exec(text)) !== null) ids.add(m[1])
  return ids
}

function collectAnchors(text) {
  const targets = new Set()
  const re = /\bhref\s*=\s*\{?["'`]#([A-Za-z][\w-]*)["'`]/g
  let m
  while ((m = re.exec(text)) !== null) targets.add(m[1])
  return targets
}

/**
 * Collect relative FILE links, e.g. href="styles.css" or href="./".
 *
 * This gap is not theoretical: the landing page linked to "dashboard.html"
 * while the real app was served from /dashboard/index.html. Nothing failed --
 * no build error, no lint warning, no test -- the link just 404'd for users.
 * The anchor checker could not see it because it only looked at "#" targets.
 */
function collectFileLinks(text) {
  const out = new Set()
  // Skip absolute URLs, protocol-relative URLs, and pure fragments.
  const re = /\bhref\s*=\s*\{?["'`]([^"'`#][^"'`]*)["'`]/g
  let m
  while ((m = re.exec(text)) !== null) {
    const href = m[1].trim()
    if (!href) continue
    if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(href)) continue
    if (href.startsWith('#')) continue
    out.add(href.split('#')[0].split('?')[0])
  }
  return out
}

/** Directory-style URLs resolve to their index.html. */
function resolveFileLink(baseDir, fromRel, href) {
  const fromDir = path.dirname(path.join(baseDir, fromRel))
  const target = path.resolve(fromDir, href === './' ? 'index.html' : href)
  const candidates = [target]
  if (href.endsWith('/')) candidates.push(path.join(target, 'index.html'))
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}

function main() {
  const args = process.argv.slice(2)
  let dir = DEFAULT_DIR
  const i = args.indexOf('--dir')
  if (i >= 0 && args[i + 1]) dir = path.resolve(args[i + 1])

  if (!fs.existsSync(dir)) {
    console.error(`ERROR: ${dir} does not exist. Run the web build first.`)
    process.exit(2)
  }

  const files = collectFiles(dir)
  const ids = new Set()
  const anchors = new Map() // target -> [files]
  const fileLinks = new Map() // href -> [files]

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const id of collectIds(text)) ids.add(id)
    for (const a of collectAnchors(text)) {
      if (EXTERNAL.has(a)) continue
      if (!anchors.has(a)) anchors.set(a, [])
      anchors.get(a).push(path.relative(dir, file))
    }
    for (const href of collectFileLinks(text)) {
      if (!fileLinks.has(href)) fileLinks.set(href, [])
      fileLinks.get(href).push(path.relative(dir, file))
    }
  }

  console.log(`scanned ${files.length} file(s) under ${dir}`)
  console.log(`  element ids found  : ${ids.size}`)
  console.log(`  anchor links found : ${anchors.size}`)
  console.log(`  file links found   : ${fileLinks.size}`)

  if (anchors.size === 0 && fileLinks.size === 0) {
    console.log('\nPASS: no links to check.')
    return
  }

  const brokenAnchors = []
  for (const [target, where] of anchors) {
    if (!ids.has(target)) brokenAnchors.push({ target, where })
  }

  const brokenFiles = []
  for (const [href, where] of fileLinks) {
    // Only validate links that resolve inside the audited tree. Anything
    // pointing outside it is a route handled by the server, not a file.
    if (href.startsWith('/')) continue
    const fromRel = where[0]
    if (!resolveFileLink(dir, fromRel, href)) {
      brokenFiles.push({ href, where })
    }
  }

  for (const [target, where] of [...anchors.entries()].sort()) {
    console.log(`  ${ids.has(target) ? 'OK     ' : 'BROKEN '} #${target}  (${where[0]})`)
  }
  for (const [href, where] of [...fileLinks.entries()].sort()) {
    const ok = href.startsWith('/') || resolveFileLink(dir, where[0], href)
    console.log(`  ${ok ? 'OK     ' : 'BROKEN '} ${href}  (${where[0]})`)
  }

  if (brokenAnchors.length || brokenFiles.length) {
    const parts = []
    if (brokenAnchors.length) {
      parts.push(
        `${brokenAnchors.length} anchor link(s) point at ids that do not exist:\n` +
          brokenAnchors.map((b) => `  #${b.target}  in ${b.where[0]}`).join('\n'),
      )
    }
    if (brokenFiles.length) {
      parts.push(
        `${brokenFiles.length} file link(s) point at files that do not exist:\n` +
          brokenFiles.map((b) => `  ${b.href}  in ${b.where[0]}`).join('\n'),
      )
    }
    console.error(
      `\nFAIL:\n${parts.join('\n\n')}\n\n` +
        'A link to a missing target is silently ignored by the browser or ' +
        'returns 404, so this ships as a dead button or a blank page that no ' +
        'build or test catches.',
    )
    process.exit(1)
  }

  console.log('\nPASS: every anchor resolves to a real id, and every file link resolves.')
}

main()
