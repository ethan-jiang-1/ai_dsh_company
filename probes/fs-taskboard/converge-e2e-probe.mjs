#!/usr/bin/env node
// 状态：常驻
// 何时跑：converge 的执行步骤/归档搬移/清 journal/台账/索引接线改动后；真入口 ~10s、无模型。
// 作用：在 runtime/ 下的**临时工作区**真跑一次完整收敛（CONVERGE_WS_REL 测试缝），断言实际盘面：
//   journal 副本随交付物入归档件 → 清 live journal → 台账追加 → 索引重建 → backfill 写入 CHARTER；
//   另验 resume --dry-run 不动盘、backfill 全员/按角色/带时间 kickoff 幂等。跑完清理，不碰 live 公司盘。
// 为什么：`assess`/`steps` 有单测，但 `executeStep` 的六个分支只有「结构上与原内联代码一一对应」这一层保证——
//   本探针是那条缺掉的端到端证据（2026-10-23 架构评审候选 1 第二刀的未验项）。
// 前置：`source run/env.sh`（审计步骤需要 DSH_HOME，缺了收敛会 fail-closed）。
// 退出码：0 = ALL PASS；1 = 有断言失败；2 = 环境不满足。
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const SLUG = 'converge-e2e-probe'
const DIR = `2026-10-23-${SLUG}`

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
  if (run.status !== 0) console.log(out)
  check('收敛退出码 0', run.status === 0, `exit=${String(run.status)}`)
  check('输出含完成行', out.includes('✓ 收敛完成'), out.trim().split('\n').slice(-2).join(' / '))

  const archiveDir = join(ws, 'deliverables-archive', DIR)
  check('交付物已入归档家', existsSync(join(archiveDir, 'final.md')))
  check('活跃区目录已消失', !existsSync(join(ws, 'deliverables', DIR)))
  check('live journal 已清', !existsSync(join(ws, 'kb', 'ceo', 'journal', `2026-10-23-${SLUG}.md`)))
  const evDir = join(archiveDir, 'journal')
  check('journal 副本随归档件落盘', existsSync(join(evDir, 'ceo', `2026-10-23-${SLUG}.md`)))
  check('台账已追加本 slug 行', readFileSync(join(ws, 'kb', 'motion-ledger.md'), 'utf8').includes(`| ${SLUG} |`))
  const indexText = existsSync(join(ws, 'kb', 'deliverables-index.json')) ? readFileSync(join(ws, 'kb', 'deliverables-index.json'), 'utf8') : ''
  check('索引已重建且含本 slug', indexText.includes(SLUG))

  const backfill = spawnSync(process.execPath, [join(ROOT, 'tools', 'converge.mjs'), '--charter-backfill', DIR], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, CONVERGE_WS_REL: wsRel, DELIVERABLES_WS_REL: wsRel },
  })
  if (backfill.status !== 0) console.log(`${backfill.stdout ?? ''}${backfill.stderr ?? ''}`)
  check('backfill 退出码 0', backfill.status === 0, `exit=${String(backfill.status)}`)
  const charter = existsSync(join(ws, 'kb', 'ceo', 'CHARTER.md')) ? readFileSync(join(ws, 'kb', 'ceo', 'CHARTER.md'), 'utf8') : ''
  check('CHARTER 历史纪要指向归档件 journal/ceo/', charter.includes(`deliverables-archive/${DIR}/journal/ceo/`))

  // 2026-10-30 复核回归：resume --dry-run 不动盘；backfill 认识「全员」/kickoff 带时间/缺角色目录。
  const RESUME = `${DIR}-resume`
  const RESUME_SLUG = RESUME.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  const resumeDir = join(ws, 'deliverables-archive', RESUME)
  mkdirSync(join(resumeDir, 'journal', 'ceo'), { recursive: true })
  writeFileSync(join(resumeDir, 'meta.md'), [
    `slug: ${RESUME_SLUG}`,
    'kickoff: 2026-10-23 09:30', '类型: 决策', '参与: 全员五人', '一句话结论: 续跑/补登边界自检',
    'closed: 2026-10-23', '',
  ].join('\n'))
  writeFileSync(join(resumeDir, 'journal', 'ceo', `2026-10-23-${RESUME}.md`), '# journal\n')
  const resumeJournal = join(ws, 'kb', 'ceo', 'journal', `2026-10-23-${RESUME}.md`)
  writeFileSync(resumeJournal, '# live journal\n')
  const dryResume = spawnSync(process.execPath, [join(ROOT, 'tools', 'converge.mjs'), '--resume', RESUME, '--dry-run'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, CONVERGE_WS_REL: wsRel },
  })
  check('resume --dry-run 退出 0', dryResume.status === 0, `exit=${String(dryResume.status)}`)
  check('resume --dry-run 不动 live journal', existsSync(resumeJournal))

  const backfillAll = () => spawnSync(process.execPath, [join(ROOT, 'tools', 'converge.mjs'), '--charter-backfill', RESUME], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, CONVERGE_WS_REL: wsRel, DELIVERABLES_WS_REL: wsRel },
  })
  const b1 = backfillAll()
  const b2 = backfillAll()
  check('backfill 全员退出 0（两次幂等）', b1.status === 0 && b2.status === 0, `exit=${String(b1.status)}/${String(b2.status)}`)
  const roles = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']
  check('backfill 全员写 5 角色 CHARTER', roles.every(role => existsSync(join(ws, 'kb', role, 'CHARTER.md'))))
  const ceoCharter = readFileSync(join(ws, 'kb', 'ceo', 'CHARTER.md'), 'utf8')
  const cfoCharter = readFileSync(join(ws, 'kb', 'cfo', 'CHARTER.md'), 'utf8')
  check('backfill journal 按角色（ceo 有 / cfo 无）',
    ceoCharter.includes(`deliverables-archive/${RESUME}/journal/ceo/`) && cfoCharter.includes('该角色无 journal 副本'))
  check('backfill 幂等：kickoff 带时间也只一行', (ceoCharter.match(new RegExp(`^- .* · ${RESUME_SLUG}（`, 'gm')) ?? []).length === 1)
} finally {
  git('reset', '-q', '--', wsRel)
  rmSync(ws, { recursive: true, force: true })
}

const failed = results.filter(entry => !entry.ok)
console.log(failed.length === 0 ? `\nconverge-e2e-probe: ALL PASS（${results.length}/${results.length}）` : `\nconverge-e2e-probe: ${failed.length} FAILURE(S)`)
process.exit(failed.length === 0 ? 0 : 1)
