#!/usr/bin/env node
// 排练场成型（轮间待办②「练习场 ≠ 运行场」）：dev/rehearsal-workspace/ 幂等成型。
//
// 四个 smoke 脚本（preset / probe / handbook / delegation）的默认 cwd 已经指到这里，
// 且启动时会自建（ensureRehearsalWorkspace）；本命令用于手动初始化/刷新参考镜像。
//
// 镜像什么、不动什么（详见 scripts/lib/rehearsal.mjs 头注）：
//   刷新 = kb/<role>/CHARTER.md + kb/org.md + templates/ + AGENTS.md 符号链接
//   不动 = journal/（不镜像真实 journal）、deliverables/、排练会话写出的任何文件
// 真盘 company-workspace/ 零写入。用法：node scripts/rehearsal-init.mjs
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from './lib/rehearsal.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
ensureRehearsalWorkspace(ROOT)
console.log(`rehearsal-init: 排练场就绪 ${REHEARSAL_REL}（参考镜像已刷新；排练产物未动；真盘零写入）`)
