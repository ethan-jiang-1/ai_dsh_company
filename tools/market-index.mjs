#!/usr/bin/env node
// 状态：常驻
// 何时跑：发布前生成/校验仓库根 market-index.json（format 1）；发版 bump 后同 diff 重生成
// 成本：秒级 keyless（只读包 manifest/locale/icon + 真校验器）
// 前置：vendor 已按 bootstrap 构建（校验器在 vendor/dsh/packages/util/plugin-market-index/lib/）；
//       `--prepare` 读当前包 manifest，不要求 _dist 先在
// 用法：node tools/market-index.mjs --prepare [--out market-index.json]
//       node tools/market-index.mjs --check   [--out market-index.json]
//
// 为什么不是手写 index：形状的唯一权威 = DSH 的 @deepseek-ai/dsh-plugin-market-index。
// 本工具只做 manifest→条目的映射（字段来源 = vendor apps/plugin-market-generator README），
// 写完立刻用 DSH 的 parseMarketIndex 真验；不兼容由它报 JSON path。
// 默认输出 = 仓库根 market-index.json（tracked，可经 raw/jsDelivr 直接托管）；图标内联 data URL，单文件。
// publishTimestamp 生成时刻；真实 publish 后可用 vendor generator 读 registry 的发布时间再生成。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { buildMarketIndex } from './lib/market-index.mjs'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'

const args = process.argv.slice(2)
const has = flag => args.includes(flag)
const valueOf = flag => {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}
if (has('--help') || has('-h') || (!has('--prepare') && !has('--check'))) {
  console.log(`用法：
  node tools/market-index.mjs --prepare [--out market-index.json]
  node tools/market-index.mjs --check   [--out market-index.json]

--prepare：从 packages/company-pack 的 manifest/locale/icon 生成单文件 index（图标内联），并用 DSH 校验器验。
--check  ：校验已有 index（名称/版本/图标与包 manifest 一致）。`)
  process.exit(has('--help') || has('-h') ? 0 : 2)
}
// DSH 的校验器（vendor built ESM）；路径与 docs 里的 VALIDATOR_REL 同源。
const VALIDATOR_REL = 'vendor/dsh/packages/util/plugin-market-index/lib/index.js'
/** 真校验：DSH 的 parseMarketIndex；失败抛带 JSON path 的 MarketIndexError。 */
const parseWithDshValidator = async (index, indexUrl = 'https://example.invalid/index.json') => {
  const { parseMarketIndex } = await import('../vendor/dsh/packages/util/plugin-market-index/lib/index.js')
  return parseMarketIndex(index, indexUrl)
}

const out = resolve(ROOT, valueOf('--out') ?? 'market-index.json')
const file = out.endsWith('.json') ? out : join(out, 'index.json')
const packDir = join(ROOT, 'packages/company-pack')
const manifest = JSON.parse(readFileSync(join(packDir, 'package.json'), 'utf8'))
const locales = Object.fromEntries(['en', 'zh'].map(lang => [
  lang,
  JSON.parse(readFileSync(join(packDir, 'locale', `${lang}.json`), 'utf8')),
]))

if (!existsSync(join(ROOT, VALIDATOR_REL))) {
  console.error(`market-index: 缺 ${VALIDATOR_REL}；先按 docs/guides/bootstrap.md 构建 vendor（不构建就无法用 DSH 的校验器）`)
  process.exit(2)
}

const fail = (message) => {
  console.error(`market-index: ${message}`)
  process.exit(1)
}

if (has('--prepare')) {
  const svg = readFileSync(join(packDir, 'icon.svg'))
  const icon = `data:image/svg+xml;base64,${svg.toString('base64')}`
  const index = buildMarketIndex({ manifest, locales, publishTimestamp: Math.floor(Date.now() / 1000), icon })
  try {
    await parseWithDshValidator(index, 'https://example.invalid/index.json')
  } catch (error) {
    fail(`生成的 index 未通过 DSH 校验：${error.message}`)
  }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(index, null, 2)}\n`)
  console.log(`market-index: ${manifest.name}@${manifest.version} → ${file}`)
} else {
  if (!existsSync(file)) fail(`缺 ${file}；先 --prepare`)
  const index = JSON.parse(readFileSync(file, 'utf8'))
  try {
    await parseWithDshValidator(index, 'https://example.invalid/index.json')
  } catch (error) {
    fail(`index 未通过 DSH 校验：${error.message}`)
  }
  // 校验器会把相对 icon 解析成绝对 URL；本地断言要看原始条目。
  const entry = index.plugins?.find(plugin => plugin.name === manifest.name)
  if (entry === undefined) fail(`index 里没有 ${manifest.name}`)
  const versions = Array.isArray(entry.versions) ? entry.versions : []
  if (!versions.some(version => version?.version === manifest.version)) {
    fail(`index 里没有 ${manifest.name}@${manifest.version}（现有 ${versions.map(version => version?.version).join(', ')}）`)
  }
  const icon = typeof entry.icon === 'string' ? entry.icon : ''
  if (!icon.startsWith('data:') && !existsSync(join(dirname(file), icon.replace(/^\.\//, '')))) fail(`图标不在 index 同目录：${icon}`)
  console.log(`market-index: OK ${manifest.name}@${manifest.version}（${versions.length} 个版本；icon ${icon}）`)
}
