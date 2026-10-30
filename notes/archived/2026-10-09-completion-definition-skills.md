# 三个完成定义 skill：写 Note / 加门禁 / 收尾

状态：已消化（2026-10-09；用户令「能修的就修，能补的就补」——本条 = 第二遍深挖 gap N6）。

## 问题

本仓 `.agents/skills/` 只有 **2** 个 skill（`preset-change-definition`、`web-window-ops`），vendor 有 **15** 个。
形状是对的（2026-10-08 试点轮已验证机制可用），**覆盖面太窄**。

而本仓压着三套**高频、多步、无法化为布尔**的判断程序，散在长文档里，每次靠 agent 自己记得去翻：

| 程序 | 现在的住处 | 症状 |
|---|---|---|
| 写 Note 的完成定义 | `notes/README.md`（69 行）+ dev-loop §12 | 规则齐但**没有执行次序**；「输掉的方案」是 DSH 唯一**普遍强制**的正文条款，而本仓 135 篇 implemented 里 **36 篇缺**（27%）且**无门禁** |
| 加门禁的完成定义 | 根 AGENTS 纪律表一行 + vendor Conventions | 本轮自己踩了两次：`ledger-routing` 首版**假守卫**（永假分支）、`doc-budget` 缺失文件**抛异常中断整轮** |
| 收尾的完成定义 | dev-loop §12 + §13 | 「语义审阅：未执行」曾在 entry-probe 连续 24 次答卷里空转（grep 实数）——**只有边界声明、没有执行形状** |

三者的共同点：**都是「什么时候算做完」的程序**，而不是事实。事实有家（各 owner 文件），
完成定义**没有**——它既不是 docs（docs 只写 now 的语义），也不是 Note（那是决定记录）。
DSH 给的载体就是 skill：procedural memory，按上下文触发加载。

## 决定

新增三个 skill，**只写次序与判据，规则一律指针化**（防第二事实家）：

| skill | 触发面 | 完成判据的关键一条 |
|---|---|---|
| [`agent-note-definition`](../../.agents/skills/agent-note-definition/SKILL.md) | 写/改 `notes/**`；非平凡变更宣布完成前 | 第 1 步**先搜再写**（D34/D36 两次造第二本账的实地案例）+ 「输掉的方案」非空且非稻草人 |
| [`gate-change-definition`](../../.agents/skills/gate-change-definition/SKILL.md) | 加/改 `checks/gates/` 门禁模块 | **先造红，再相信绿**；分档门禁**两个方向都跑** |
| [`close-out-definition`](../../.agents/skills/close-out-definition/SKILL.md) | 任何非平凡变更收尾前 | 语义审**真跑过并写出结论**（不是"已阅"）；四链证据未跑的显式标「未执行」 |

三者的 `description` 按 DSH 五步形状写（触发分支前置），正文只链规则 owner 不复述——
`agent-note-definition` 指向 `notes/README.md`，`close-out-definition` 指向 dev-loop §12/§13，
`gate-change-definition` 指向 checks/gates/ 目录（门禁清单唯一源；2026-10-14 拆分轮起门禁一文件一门）。

**为什么先写这三个**：它们的失败模式在本仓都**已实地发生**（36/135 缺备选、两次假守卫、24 次空转），
不是推测出来的需求。DSH 试点轮的判据同样适用：「无复发证据不建满载」。

## 输掉的方案

- **一次铺满更多 skill**（升 pin 重校 / 改动面选检 / 独立盲审流程…）：否决。沿用 2026-10-08 试点轮的
  口径——先三个真程序，被会话真用后再扩。铺满 = 建了没人走的程序，还占常驻 description 预算。
- **把完成定义写进 `docs/`**：否决。`docs/` 只写 now 的**语义**；完成定义是**程序**，且需要在
  「做这件事时」被按需加载——只有 `.agents/skills/` 是机制载体（DSH `roots()` 自动发现），
  docs 里的段落不会被触发加载。DSH 语料同款判据：skill = guidance。
- **把完成定义做成门禁**：否决——**Skill ≠ gate**。可机械判断的才进门禁（如「状态行合规」已有
  `notes-liveness`）；「备选是不是真考虑过的」判不了，只能靠程序引导 + 语义审。
  这也是本轮的边界：**36 篇缺备选没加门禁**（判不了真假），改为写进 skill 的第 3 步 + 完成判据。
- **在 skill 里复述规则正文**：否决。`notes/README.md` 与 dev-loop 是那些规则的唯一家；
  skill 复述 = 两处维护 + 漂移（D28 那类病的标准配方）。
- **给 skill 加集中索引页**：否决。路径树即清单（D34/D36 同款教义）；DSH 的 catalog 自动列出。

## 验收

- 三个 SKILL.md 在盘上，frontmatter 带 `name`/`description`，`name` 与目录名一致。
- 每个 skill 的 Markdown 链接**全部可解析**（md-links 门禁扫描面已含 `.agents/skills`，见 2026-10-08 试点轮）。
- **真入口证据**：起一次真会话，从会话 durable 日志的 `skill-catalog` 事件读 catalog——
  三个新名在场，catalog 从 14 条涨到 17 条。收据归档
  该快照已随 2026-10-25 真实证据移出产品仓。
- `pnpm verify` + `pnpm test` 全绿。

## 验证记录（2026-10-09 实施）

| 步 | 实跑命令 | 判据与结果 |
|---|---|---|
| 链接面 | 手写解析三个 SKILL.md 的全部 `](…)` | 5 + 5 + 7 = 17 链接，**0 死** |
| 门禁面 | `pnpm verify` | `PASS md-links (含 notes) ×1176 / 238 files`（扫描面含 `.agents/skills`）；`verify: ALL PASS` |
| **真 catalog（绿）** | `source run/env.sh && pnpm dsh --profile headless "只回复两个字：收到。不要调用任何工具。"` 然后 `zstd -dc <session>.jsonl.zstd` 读 `skill-catalog` 事件 | catalog **17** 条；三名在场：`agent-note-definition` / `gate-change-definition` / `close-out-definition` |
| 红基线对照 | 2026-10-08 试点轮同一断言器 | 建 `.agents/skills/` 前 **12** 条 → 建两个 skill 后 **14** 条 → 本轮 **17** 条（增量 = 3，与预期一致） |
| **独立红（本轮补）** | 把三个 skill 目录 `mv` 出 `.agents/skills/` → 起真会话 → 读 catalog | **14** 条，三个名字**全部不在场**（`NONE — red confirmed`）；会话内 catalog 同步由 17 掉到 14（当场可见） |
| **还原即绿（本轮补）** | `mv` 回三个目录 → 起真会话 → 读 catalog | **17** 条，三名齐在 ⇒ 红→还原→绿三步闭环，不再依赖 2026-10-08 的历史读数 |
| 回归 | `pnpm test` | 36 files / 355 tests 绿 |

**注**：真会话共起 **3** 次（红 1 / 绿 2），**已补齐独立红证**（见下）。
