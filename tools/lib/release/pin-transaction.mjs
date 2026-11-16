import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

/** Require exactly one bookkeeping marker; never silently publish a partial update. */
export function replaceOne(text, pattern, replacement) {
  const matches = [...text.matchAll(new RegExp(pattern.source, 'g'))]
  if (matches.length !== 1) throw new Error(`pin marker must occur once (found ${matches.length}): ${pattern}`)
  return text.replace(pattern, replacement)
}

/** Validate a human's recorded assertion, not the semantic quality of that review. */
export function assertProcessReview(review, fromSha, toSha) {
  if (review?.fromSha !== fromSha || review?.toSha !== toSha) throw new Error('process-review must name the exact fromSha and toSha')
  for (const field of ['reviewedBy', 'reviewedAt', 'processContractReview']) {
    if (typeof review[field] !== 'string' || review[field].trim() === '') throw new Error(`process-review missing ${field}`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) || !Number.isFinite(Date.parse(review.reviewedAt))) {
    throw new Error('process-review reviewedAt must be YYYY-MM-DD')
  }
}

const read = path => existsSync(path) ? readFileSync(path) : null
const same = (a, b) => a === null || b === null ? a === b : a.equals(b)
const restore = (path, value) => value === null ? rmSync(path, { force: true }) : writeFileSync(path, value)

/**
 * Validate before publishing staged metadata. On caught failure restore only owned bytes.
 * observe() records an install-owned lockfile immediately after the install command settles.
 * Refuse rollback over a later edit. No reset/clean, and no node_modules/build rollback.
 */
export async function pinTransaction({ updates, observedPaths = [], validate, verify, rollback }) {
  const entries = updates.map(({ path, content }) => ({ path, before: read(path), after: Buffer.from(content), applied: false }))
  const observed = observedPaths.map(path => ({ path, before: read(path), after: undefined }))
  const observe = path => {
    const entry = observed.find(item => item.path === path)
    if (!entry) throw new Error(`unowned observed path: ${path}`)
    entry.after = read(path)
  }
  try {
    await validate({ observe })
    for (const entry of entries) {
      if (!same(read(entry.path), entry.before)) throw new Error(`concurrent metadata edit; refusing publish: ${entry.path}`)
    }
    for (const entry of entries) {
      entry.applied = true
      writeFileSync(entry.path, entry.after)
    }
    await verify()
  } catch (cause) {
    const errors = []
    for (const entry of [...entries].reverse().filter(item => item.applied)) {
      try {
        const current = read(entry.path)
        if (same(current, entry.before)) continue
        if (!same(current, entry.after)) throw new Error(`concurrent metadata edit retained; restore manually: ${entry.path}`)
        restore(entry.path, entry.before)
      } catch (error) { errors.push(error) }
    }
    for (const entry of observed.filter(item => item.after !== undefined)) {
      try {
        const current = read(entry.path)
        if (same(current, entry.before)) continue
        if (!same(current, entry.after)) throw new Error(`concurrent lockfile edit retained; restore manually: ${entry.path}`)
        restore(entry.path, entry.before)
      } catch (error) { errors.push(error) }
    }
    try { await rollback() } catch (error) { errors.push(error) }
    if (errors.length) throw new AggregateError([cause, ...errors], `pin failed; rollback incomplete: ${errors.map(e => e.message).join('; ')}`, { cause })
    throw cause
  }
}
