#!/usr/bin/env node
// 状态：常驻
// 何时跑：要按产品形状（独立 company profile + 自有 workspace）启动公司实例时。
// 用法：pnpm company [--workspace <dir>] [--home <dir>] [--profile <n>] [--port <n>] [--no-open] [--yes] [--print] [--reset]
//
// `pnpm company`：repo 形态的产品入口；转发到 pack 内的唯一启动器实现。
// 不复制 profile/workspace 逻辑——bin 是唯一实现，repo 只是路径解析的另一种入口。
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = fileURLToPath(import.meta.url)
const bin = join(dirname(here), '../packages/company-pack/bin/dsh-company.mjs')
const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(result.status ?? 1)
