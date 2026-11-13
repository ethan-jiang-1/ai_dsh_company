#!/usr/bin/env node
/**
 * lease 探针（被 company-root-process-smoke 调用；不单独跑）。
 * 用法：node --import tsx/esm lease-probe.mjs <dshHome>
 * 输出：{ acquired, warning?, reason? }；拿到锁后立即 release。
 */
import { acquireCompanyLease } from '../../../packages/company-pack/src/host/run-bundle/lease.ts'

const home = process.argv[2]
if (home === undefined) throw new Error('用法：lease-probe.mjs <dshHome>')
const result = acquireCompanyLease(home)
console.log(JSON.stringify(result.acquired
  ? { acquired: true, warning: result.warning }
  : { acquired: false, reason: result.reason }))
if (result.acquired) result.release()
