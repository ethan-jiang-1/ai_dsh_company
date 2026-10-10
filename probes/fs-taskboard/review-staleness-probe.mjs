#!/usr/bin/env node
// 状态：常驻
// S6 互审稿版本穿透探针（多人 UX bug 猎捕二轮第 3/4 题，2026-10-06 用户立项）。
// 何时跑：手册「互审稿命名」或「稿首署名行」改动时；真模型 ≈$0.1、排练场。
//
// 为什么猎它：多人模式下 CEO 门读 CFO 的 v1 进行互审时，CFO 门可能同时返工为 v2——
//   CEO 的互审稿引用的是过期版本（v1），但互审稿上**没有版本引用标记**（只有 -review.md 命名约定）
//   ⇒ 下游读互审稿的人无从知道「这份互审是对哪个版本的评审」。
//
// 判据（先行，2026-10-06 定）：
//   B1：CEO 互审稿（drafts/ceo-review.md）引用的版本号与盘面当前版本**一致**（互审后重读确认）
//     = 理想路径；引用过期版本（盘面 v2 但互审稿写「对 v1 的意见」）= 版本穿透缺口。
//   B2（观察）：互审稿是否标注「评审对象版本 = v<N>」——手册互审稿命名只有 -review.md 后缀约定，
//     没有要求标注版本——这是设计缺口还是可接受约定？记录为观察。
// 用法：DSH_HOME=runtime/harness-home node probes/fs-taskboard/review-staleness-probe.mjs
// 退出码：0 = B1 过（CEO 互审引用了当前版本或显式标注了版本差）；1 = B1 失败（穿透）；2 = 环境。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const SLUG = '2026-10-06-review-staleness'
const DELIV = join(REHEARSAL, 'deliverables', SLUG)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('review-staleness-probe')
} catch (error) { console.error(error.message); process.exit(2) }

// 预置 CFO v1 稿
rmSync(DELIV, { recursive: true, force: true })
mkdirSync(join(DELIV, 'drafts'), { recursive: true })
const CFO_V1 = `出稿：cfo｜版本 v1｜任务书 = deliverables/${SLUG}/drafts/ceo.md\n\n# CFO 稿 · 报价经济性\n\n## 结论\n\n**毛利 32.4%**（过 30% 底线，+2.4pp）——$85k 合同额，$57.5k 交付成本。\n\n## 算式\n\ng = (85,000 - 57,500) / 85,000 = 27,500 / 85,000 = 32.35% ≥ 30%\n`
const CFO_V2 = `出稿：cfo｜版本 v2｜任务书 = deliverables/${SLUG}/drafts/ceo.md\n\n# CFO 稿 · 报价经济性（v2：修正成本口径）\n\n## 结论\n\n**毛利 24.7%**（破 30% 底线，-5.3pp）——$85k 合同额，$64k 交付成本（v1 漏了 $6.5k 外包费）。\n\n## 算式\n\ng = (85,000 - 64,000) / 85,000 = 21,000 / 85,000 = 24.71% < 30% ⇒ **触双签线**\n\n## v2 改动\n\n- 成本修正：$57.5k → $64k（补外包费 $6.5k——v1 漏项）\n- 结论翻转：过线 → 破线（32.4% → 24.7%）\n`
writeFileSync(join(DELIV, 'drafts', 'cfo.md'), CFO_V1)

// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：前缀 `rsp-` 由调用方传入，不推导；
// spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝，真进程/真网络由本驱动层自己带）。
const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(e => { console.error(e.message); process.exit(2) })
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'rsp-' })

console.log(`review-staleness-probe: 场景 = CEO 互审 CFO v1 期间盘面变 v2（${SLUG}，排练盘）`)
const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
const sessionId = created.sessionId
await rpc('session/prompt', { request: {
  requestId: `rsp-${String(Date.now())}`, sessionId, mode: 'queue',
  content: [{ type: 'text', text:
    `排练指令（你的 CEO 根会话；只做这一件事）：\n`
    + `请对 deliverables/${SLUG}/drafts/cfo.md 做互审——`
    + `评审稿落 deliverables/${SLUG}/drafts/ceo-review.md（一角色一稿）。评审完即止。` }],
  clientTimeZone: 'Asia/Shanghai',
} })

// 等 CEO 读了 cfo.md 之后、终稿之前——注入 v2
let v2Injected = false
const deadline = Date.now() + 300_000
let events = []
while (Date.now() < deadline) {
  events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(r => r.event).filter(Boolean)
  const hasRead = events.some(e => e?.type === 'tool/call' && e?.data?.name === 'read' &&
    JSON.stringify(e?.data?.arguments ?? '').includes('cfo.md'))
  if (hasRead && !v2Injected) {
    writeFileSync(join(DELIV, 'drafts', 'cfo.md'), CFO_V2)
    v2Injected = true
    console.log('  [v2 已注入——CEO 读过 v1 后、终稿前]')
  }
  if (events.some(e => e?.type === 'turn/end')) break
  await sleep(3_000)
}

// 检查互审稿
let review = ''
try { review = readFileSync(join(DELIV, 'drafts', 'ceo-review.md'), 'utf8') } catch { /* 没写 */ }
const finalCfo = readFileSync(join(DELIV, 'drafts', 'cfo.md'), 'utf8')
const reviewMentionsV1 = /v1|32\.4|32\.35|57\.5/.test(review)
const reviewMentionsV2 = /v2|24\.7|24\.71|64[, ]?000|64k/.test(review)
const reviewNotesVersionChange = /v1.*v2|v2.*v1|版本.*变更|修正|改动/.test(review)
console.log(`  互审稿存在: ${String(review !== '')}（${String(review.length)} 字）`)
console.log(`  引用 v1 内容(32.4%/57.5k): ${String(reviewMentionsV1)}  引用 v2 内容(24.7%/64k): ${String(reviewMentionsV2)}`)
console.log(`  标注版本变更: ${String(reviewNotesVersionChange)}`)

// B1：互审稿引用的内容与盘面当前版本（v2）一致 = 过；引用 v1（过期）= 穿透
const b1 = review !== '' && (reviewMentionsV2 || reviewNotesVersionChange)
console.log(`  判据B1(互审引用当前版本或标注变更): ${String(b1)}`)
const pass = b1
console.log(`review-staleness-probe: ${pass
  ? 'PASS（互审感知了版本变更/引用了当前版本）'
  : review === '' ? 'FAIL（互审稿未产出——另定性）' : 'FAIL（版本穿透：互审引用了过期 v1，未感知 v2）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)
