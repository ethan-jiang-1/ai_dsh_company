#!/usr/bin/env node
/**
 * company-root 进程探针（被 company-root-process-smoke 调用；不单独跑）。
 * 用法：node --import tsx/esm company-root-probe.mjs write <ws> <rel> <text> [delayMs]
 *      node --import tsx/esm company-root-probe.mjs read  <ws> <rel>
 */
import { readCompanyText, writeCompanyAtomic } from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'

const [mode, workspace, rel, text, delay] = process.argv.slice(2)

if (mode === 'write') {
  if (delay !== undefined && Number(delay) > 0) {
    await new Promise(resolve => setTimeout(resolve, Number(delay)))
  }
  writeCompanyAtomic(workspace, rel, text)
} else if (mode === 'read') {
  process.stdout.write(readCompanyText(workspace, rel) ?? '<missing>')
} else {
  throw new Error(`unknown mode: ${String(mode)}`)
}
