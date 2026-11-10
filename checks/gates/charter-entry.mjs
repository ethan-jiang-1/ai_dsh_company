// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 内容宪章入口门（charter-entry，2026-11-10 立）───────────────────────────────
// 为什么：宪章是「归位与抽象层次的唯一家」，但**只写一份宪章 = 散文**——下一个 agent 会从手上的文件
// 开始改，撞不到它（历史证据：旧 SA/SQA 把方法写进 persona/skill，换公司要改包，2026-11-09 整套退役）。
// 本门把「撞得到」变成必须：宪章在场 + 四处入口同 diff 在场——三条文档链（开工最小路径 / 书架 / 层表）
// 与一条执行链（归位 skill）。
// 规则唯一家 = 宪章本身（docs/content-charter.md），本文件不复述四槽/四问；本门只查**指针在场**。
// ⚠ 不查的反面：不查 agent 是否读懂、是否真答出四问——那是真模型冷读的证据（会话 id + 原文摘录进
// 落地 Note），门禁证明不了行为（testing.md §1）。形状锚 = 链到**宪章文件名**，且必须是 Markdown
// 链接形状：纯文本提及不算"撞得到"（agent 读到的入口要能点进去）。
// 负例留证 2026-11-10（实跑，逐条破坏真东西 → 红 → 还原 → 绿）：
//   ① 删 AGENTS.md 里的 `](docs/content-charter.md)` → `FAIL charter-entry: AGENTS.md 未以 Markdown
//      链接指向 content-charter.md（开工最小路径；纯文本提及不算入口）`；还原 → 绿。
//   ② 删归位 skill 里的链回 → `FAIL … .agents/skills/capability-addition-definition/SKILL.md 未以
//      Markdown 链接指向 …（归位 skill …）`；还原 → 绿。
//   ③ `git mv` 走宪章本体 → `FAIL … docs/content-charter.md 不在盘上——…（文件不许消失：内容该搬就搬，壳留着）`；
//      还原 → 绿。
//   ④ 删 docs/index.md 书架链接 → `FAIL … docs/index.md 未以 Markdown 链接指向 content-charter.md（书架；…）`；还原 → 绿。
//   ⑤ `mv` 走 docs/AGENTS.md（指针面文件缺失这一支）→ `FAIL … docs/AGENTS.md 缺失（层表：入口面不许消失）`；还原 → 绿。
const CHARTER = 'docs/content-charter.md'
/** 四处入口：三条文档链 + 一条执行链（拆除任一条 = 一半 agent 撞不到）。 */
const POINTERS = [
  { file: 'AGENTS.md', what: '开工最小路径' },
  { file: 'docs/index.md', what: '书架' },
  { file: 'docs/AGENTS.md', what: '层表' },
  { file: '.agents/skills/capability-addition-definition/SKILL.md', what: '归位 skill' },
]
const CHARTER_LINK = /\]\([^)\n]*content-charter\.md\)/

export function run({ root, ok, fail }) {
  if (!existsSync(join(root, CHARTER))) {
    // 缺失报「不在盘上」而不是抛异常：抛异常会中断整个 run-gates，后面门禁一行都不出（doc-budget 2026-10-09 教训）。
    fail('charter-entry', `${CHARTER} 不在盘上——内容宪章是归位规则的唯一家（文件不许消失：内容该搬就搬，壳留着）`)
    return
  }
  const problems = []
  for (const { file, what } of POINTERS) {
    if (!existsSync(join(root, file))) {
      problems.push(`${file} 缺失（${what}：入口面不许消失）`)
      continue
    }
    if (!CHARTER_LINK.test(readFileSync(join(root, file), 'utf8'))) {
      problems.push(`${file} 未以 Markdown 链接指向 content-charter.md（${what}；纯文本提及不算入口）`)
    }
  }
  problems.length === 0
    ? ok(`charter-entry（宪章在场 + 四处入口：文档链 3 + 归位 skill 1）`)
    : fail('charter-entry', problems.join('；'))
}
