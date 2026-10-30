// 状态：常驻
// notes/ 一致性审计（2026-10-30 立）——只读工作表，不是门禁。
//
// 何时跑：notes 分诊轮；机制改口后；发布前（release runbook §0）想看一眼记忆层有没有新漂移。
// 为什么：硬矛盾（旧文与现行合同相反）靠语义审；但死路径、取代缺回链、收据特征、
// 零 Note 入链这些**可机械判**的部分不该每次靠人记得。这里把它们一次列出来。
// 成本：<1s，无模型、无浏览器、不写盘。
//
// 边界：输出是**候选**，不是判决。收据候选可能是有否决价值的短记录；零入链不等于该删。
// 语义分诊 = `.agents/skills/notes-consistency-audit/SKILL.md`。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { auditNotes } from './lib/notes-audit.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--json', '--strict', '--root'])
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue
  if (!KNOWN.has(argv[i])) {
    console.error(`未知旗标 ${argv[i]}——认识：--root <仓库根> / --json / --strict`)
    process.exit(2)
  }
  if (argv[i] === '--root') {
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
      console.error('用法：node tools/notes-audit.mjs [--root <仓库根>] [--json] [--strict]')
      process.exit(2)
    }
    i++
  }
}
const rootAt = argv.indexOf('--root')
const root = rootAt === -1 ? process.cwd() : argv[rootAt + 1]
const asJson = argv.includes('--json')
const strict = argv.includes('--strict')

function readDir(dir, { required = false } = {}) {
  const full = join(root, dir)
  if (!existsSync(full)) {
    if (required) throw new Error(`${dir} 不存在（用 --root 指到仓库根）`)
    return []
  }
  return readdirSync(full)
    .filter(file => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map(file => ({ file: `${dir}/${file}`, text: readFileSync(join(full, file), 'utf8') }))
}

let receipts
let notes
try {
  receipts = readDir('notes/archived/receipts')
  const implemented = readDir('notes/implemented', { required: true })
  if (implemented.length === 0) throw new Error('notes/implemented 无 Note（检查 --root）')
  notes = [...implemented, ...readDir('notes/archived'), ...readDir('notes/postmortem')]
} catch (error) {
  console.error(`notes-audit: ${error.message}`)
  process.exit(2)
}
const result = auditNotes(notes, { root })
result.summary.receiptsArchived = receipts.length

if (asJson) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else {
  const { summary } = result
  const list = (label, rows, detail) => {
    process.stdout.write(`${label} ${String(rows.length)}\n`)
    for (const row of rows.slice(0, 20)) {
      process.stdout.write(`  · ${typeof row === 'string' ? row : row.file}\n`)
      if (detail && typeof row !== 'string') {
        for (const item of row.paths ?? row.links ?? []) {
          process.stdout.write(`      ${typeof item === 'string' ? item : JSON.stringify(item)}\n`)
        }
      }
    }
    if (rows.length > 20) process.stdout.write(`  … 另有 ${String(rows.length - 20)} 条\n`)
  }
  process.stdout.write(`notes-audit · implemented ${String(summary.implemented)} / archived ${String(summary.archived)} / receipts ${String(summary.receiptsArchived)}（只读工作表）\n`)
  list('收据候选', summary.receipts)
  list('无决定节', summary.noDecision)
  list('死路径', summary.deadPaths, true)
  list('取代缺回链', summary.missingBacklinks, true)
  list('零 Note 入链（docs 路由不计）', summary.orphans)
  list('状态行不符', summary.statusMismatch)
  process.stdout.write('提示：机械面只出候选；语义分诊 = .agents/skills/notes-consistency-audit/SKILL.md\n')
}

if (strict && (result.summary.missingBacklinks.length > 0 || result.summary.statusMismatch.length > 0)) {
  process.exitCode = 1
}
