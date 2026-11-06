// 状态：常驻
// 何时跑：SA/SQA 相关改动后要复核**已完成的真实运行**是否满足收口判据（零模型成本，纯读盘）。
// 为什么存在：真模型 E2E 每次 ~$1/7–25 分钟，且收口耗时不定；这份审计把「哪些运行真的跑完了」写死成
//   可复跑的判据，任何人可随时复核，不需要重跑模型。
// 用法：node probes/team/sa-sqa-closeout-audit.mjs   （退出码 0 = 全部运行的 10 条判据都成立）
// 判据（每条都读本轮自己的 session 头 + 交付物，不猜）：CEO 根会话 depth 0 / VP-Eng 是 CEO 的
//   team 成员 depth 1 / SA、SQA 各自独立会话且 depth 2 / 两者同一 parent = VP-Eng /
//   final.md 存在且点名 SQA 且带裁决词 / SQA 稿与 SA 稿都已落盘。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
// 注：zstd 输出可达数 MB，必须给足 maxBuffer——默认 1MB 会让 header() 抛错被吞成 undefined，
// 表现为「假失败」（2026-11-06 实踩：run#1 的 vp-eng 会话 1MB+ 被判 FAIL）。
import { join } from 'node:path'
const ROOT='/Users/bowhead/ai_dsh_company'
const DELIV=join(ROOT,'company-workspace/.dsh-company/deliverables')
const SESS=join(ROOT,'runtime/harness-home/sessions/--Users-bowhead-ai_dsh_company-company-workspace--')
const header=(id)=>{const f=join(SESS,id,'session.v4.jsonl.zstd'); if(!existsSync(f))return undefined; try{return JSON.parse(execFileSync('zstd',['-dc',f],{maxBuffer: 64*1024*1024, stdio:['ignore','pipe','ignore']}).toString().split('\n')[0])}catch{return undefined}}
const runs=[
 {name:'run#1 18:04', lead:'session-69573cd5-54ac-4564-970c-4da7bea30da7', vp:'0f76976f-3f49-4ae3-ae14-194659422ed1', sa:'8e052efa-ae0d-4d30-b366-07c7b6e62331', qa:'3bfbbcba-2156-45c7-aaa8-87a66b4e612b', slug:'2026-11-06-portable-overload-detection'},
 {name:'run#2 19:04', lead:'session-c7bbb913-6cce-44e7-b116-8de41ab1d96c', vp:'66c53afe-5ac6-44d0-a730-401d9bbb4b65', sa:'54ebdb28-572e-4f42-81e0-6cf1319209cc', qa:'04a2c289-4dd6-45d6-8dbb-ea85a0de61c2', slug:'2026-11-06-portable-overload-detection-v2'},
]
for (const r of runs){
  const lead=header(r.lead), vp=header(r.vp), sa=header(r.sa), qa=header(r.qa)
  const DEL=join(DELIV,r.slug)
  const fin=existsSync(join(DEL,'final.md'))?readFileSync(join(DEL,'final.md'),'utf8'):''
  const drafts=existsSync(join(DEL,'drafts'))?readdirSync(join(DEL,'drafts')).filter(n=>n.endsWith('.md')).map(n=>readFileSync(join(DEL,'drafts',n),'utf8')):[]
  const c=[
   ['CEO 根会话 depth 0', lead?.agentPreset==='ceo'&&lead?.delegationDepth===0],
   ['VP-Eng 是 CEO 的 team 成员（depth 1）', vp?.delegationDepth===1&&vp?.parentSession===r.lead],
   ['SA 独立会话 preset=system-architect depth2', sa?.agentPreset==='system-architect'&&sa?.delegationDepth===2],
   ['SQA 独立会话 preset=system-qa depth2', qa?.agentPreset==='system-qa'&&qa?.delegationDepth===2],
   ['SA/SQA 同一 parent（=VP-Eng）', sa?.parentSession===r.vp&&qa?.parentSession===r.vp],
   ['final.md 存在', fin.length>0],
   ['final 点名 SQA', /SQA|system_qa/i.test(fin)],
   ['final 带裁决词', /不通过|否决|待验|通过/.test(fin)],
   ['SQA 稿落盘且含否决', drafts.some(x=>/SQA|system_qa/.test(x)&&/不通过|否决/.test(x))],
   ['SA 稿落盘且含架构/接口', drafts.some(x=>/系统架构|IF-\d{3}/.test(x))],
  ]
  console.log(`\n=== ${r.name}（${r.slug}）===`)
  for(const [l,ok] of c) console.log(`  ${ok?'PASS':'FAIL'} ${l}`)
  r._ok = c.every(([,ok])=>ok)
  console.log(`  → ${r._ok?'10/10 PASS':'FAIL'}`)
}

if (!runs.every(r => r._ok)) process.exitCode = 1
