#!/usr/bin/env node
// 状态：常驻
// Resolve a current or frozen evidence reference; print its canonical path without reading or writing evidence.
// Usage: node tools/snapshot-path.mjs snapshots/r2-motion/sessions/lead.jsonl
import { repositoryRoot, snapshotReference } from './lib/repository-layout.mjs'
import { existsSync } from 'node:fs'
const reference = process.argv[2]
try {
  if (process.argv.length !== 3) throw new Error('Usage: snapshot-path.mjs <scene or snapshots/path>')
  const path = snapshotReference(repositoryRoot, reference)
  if (!existsSync(path)) throw new Error(`Evidence target not found: ${path}`)
  console.log(path)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
