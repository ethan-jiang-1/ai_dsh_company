#!/usr/bin/env node
// 状态：常驻
// 何时跑：converge 的执行步骤/归档搬移/清 journal/台账/索引接线改动后；真入口 ~10s、无模型。
// 作用：在 runtime/ 下的**临时工作区**真跑一次完整收敛（CONVERGE_WS_REL 测试缝），断言六步的实际盘面：
//   证据副本 → 归档搬移 → 清 live journal → 台账追加 → 索引重建 → backfill 指引；跑完清理，不碰 live 公司盘。
// 为什么：`assess`/`steps` 有单测，但 `executeStep` 的六个分支只有「结构上与原内联代码一一对应」这一层保证——
//   本探针是那条缺掉的端到端证据（2026-10-23 架构评审候选 1 第二刀的未验项）。
// 前置：`source run/env.sh`（审计步骤需要 DSH_HOME，缺了收敛会 fail-closed）。
// 退出码：0 = ALL PASS；1 = 有断言失败；2 = 环境不满足。
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const SLUG = 'converge-e2e-probe'
const DIR = `2026-10-23-${SLUG}`
const TODAY = new Date().toISOString().slice(0, 10)

try { (await import('../../tools/lib/runtime-home.mjs')).requireDevHome('converge-e2e-probe') }
catch (error) { console.error(`converge-e2e-probe: ${error.message}`); process.exit(2) }

const wsRel = `runtime/probe-converge-${String(Date.now())}`
const ws = join(ROOT, wsRel)
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `（${detail}）` : ''}`) }

const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })

try {
  // 夹具：一个已闭合动议 + 一篇 journal + 一张有数据行的台账 + 空归档根。
  mkdirSync(join(ws, 'deliverables', DIR), { recursive: true })
  mkdirSync(join(ws, 'deliverables-archive'), { recursive: true })
  mkdirSync(join(ws, 'kb', 'ceo', 'journal'), { recursive: true })
  writeFileSync(join(ws, 'deliverables', DIR, 'meta.md'), [
    `slug: ${SLUG}`, 'kickoff: 2026-10-23', '类型: 决策', '参与: CEO', '墙钟: 1h',
    '一句话结论: 端到端探针自检', 'closed: 2026-10-23', '',
  ].join('\n'))
  writeFileSync(join(ws, 'deliverables', DIR, 'final.md'), '# e2e\n')
  writeFileSync(join(ws, 'kb', 'ceo', 'journal', `2026-10-23-${SLUG}.md`), '# journal\n')
  writeFileSync(join(ws, 'kb', 'motion-ledger.md'), [
    '| slug | kickoff | 类型 | 参与 | 墙钟 | 成品 | 结论 |',
    '|---|---|---|---|---|---|---|',
    '| seed | 2026-10-01 | 决策 | CEO | 1h | ✅ | 种子 |', '',
  ].join('\n'))

  const run = spawnSync(process.execPath, [join(ROOT, 'tools', 'converge.mjs'), '--slug', DIR], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, CONVERGE_WS_REL: wsRel, DELIVERABLES_WS_REL: wsRel },
  })
  const out = `${run.stdout ?? ''}${run.stderr ?? ''}`
  check('收敛退出码 0', run.status === 0, `exit=${String(run.status)}`)
  check('输出含完成行', out.includes('✓ 收敛完成'), out.trim().split('\n').slice(-2).join(' / '))

  const archiveDir = join(ws, 'deliverables-archive', DIR)
  check('交付物已入归档家', existsSync(join(archiveDir, 'final.md')))
  check('活跃区目录已消失', !existsSync(join(ws, 'deliverables', DIR)))
  check('live journal 已清', !existsSync(join(ws, 'kb', 'ceo', 'journal', `2026-10-23-${SLUG}.md`)))
  const evDir = join(ROOT, 'snapshots', 'archive', `convergence-${TODAY}`, DIR)
  check('证据副本已落盘', existsSync(join(evDir, 'journal', 'ceo', `2026-10-23-${SLUG}.md`)))
  check('台账已追加本 slug 行', readFileSync(join(ws, 'kb', 'motion-ledger.md'), 'utf8').includes(`| ${SLUG} |`))
  const indexText = existsSync(join(ws, 'kb', 'deliverables-index.json')) ? readFileSync(join(ws, 'kb', 'deliverables-index.json'), 'utf8') : ''
  check('索引已重建且含本 slug', indexText.includes(SLUG))
  // 清理证据目录（tracked 区里由本次探针创建，必须删干净）
  rmSync(evDir, { recursive: true, force: true })
} finally {
  git('reset', '-q', '--', wsRel)
  rmSync(ws, { recursive: true, force: true })
  const evParent = join(ROOT, 'snapshots', 'archive', `convergence-${TODAY}`)
  rmSync(join(evParent, DIR), { recursive: true, force: true })
  // 空父目录也删：snapshot-index 门禁把「盘上多一个场景目录」当未登记
  try { if (readdirSync(evParent).length === 0) rmSync(evParent, { recursive: true, force: true }) } catch { /* 不存在即已干净 */ }
}

const failed = results.filter(entry => !entry.ok)
console.log(failed.length === 0 ? `\nconverge-e2e-probe: ALL PASS（${results.length}/${results.length}）` : `\nconverge-e2e-probe: ${failed.length} FAILURE(S)`)
process.exit(failed.length === 0 ? 0 : 1)
