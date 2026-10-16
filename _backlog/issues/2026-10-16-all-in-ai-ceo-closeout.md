---
status: 等人拍板
opened: 2026-10-16
---

# 推敲：收口纪律缺口——动议可「结果=已完成」收口而不经 `present`（all-in-ai-2026 现场）

> 立卡：2026-10-16 ｜ 状态：等人拍板 🔒 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否

**问题与期望结果：** `deliverables-check` 在真盘常红一条 `final-not-presented`（`deliverables/2026-10-13-all-in-ai-2026/final.md`）。追查到底发现**不是工具误判**：该动议的收口会话**从未调用 `present`**，而公司手册的收口纪律要求 CEO 用 `present` 声明成品。期望结果 = 拍板「收口纪律怎么落地」（改公司侧流程 / 加收敛前置 / 两者都做），把这条红变成一次可解释的处置而不是常年噪声。

**当前情况（2026-10-16 全量实取，非推测）：**
- 现场 = `deliverables/2026-10-13-all-in-ai-2026/`：`final.md` 在盘、`meta.md` 自述 `结果: 已完成（final v2 已 present）`，但工具侧查无声明。
- 收口会话 = `session-350eb581`（`all-in-ai-2026 @ 2026-10-13T09:51`，`journal-audit` 认得它）。557 行日志里：**95 次 `tool/call`、16 类工具，没有 `present`**；收口靠 `write` 写 `final.md` + `team_task_update` 收任务。
- **`present` 当时在工具表里**（该会话 `request/header` 的工具清单含 `{"name":"present","description":"Declare existing files as final del…`）⇒ 工具在手、没用。
- **全量严格重扫 2783 份会话日志（两 home × v3 610 + v4 2173）= 真 present 事件 0 条**（用判据自己的 `parseSessionLog` 解析，不靠 grep）。
- ⚠ 取证自省：首轮只扫 v3（610 份）漏了 v4（2173 份），结论「证据已丢失」**被推翻**——详见 [BUG-019](../bugs/BUG-019-final-present-evidence-lost.md)（该卡已按深挖结果改判为「判别盲区，本案不是它的实例」）。
- 同族已修先例：[BUG-003](../_archive/fixed_bugs/BUG-003-present-no-role-gate.md)（present 无角色门）——那条修的是**谁能 present**，本条问的是**必须不必须 present**。

**未决问题：** 收口纪律落在哪一层？① 公司侧（手册 + preset skill 的收口清单：`结果=已完成` 前必须 `present`）；② 工具侧（converge 前置拦「无 present 却已闭合」）；③ 两者都做。**仅用户可判（🔒）**：它改的是公司角色的行为纪律，且涉及 `packages/company-pack/presets/**` 与 `company-workspace/AGENTS.md`（两者都属"公司公开行为"面）。

**下一步：** 用户回拍板 → 毕业头改「做」并同改去向 → 按选定层实施（含 red 配方：造一件「已完成但无 present」的动议，验证所选闸门拦得住）。若选「不改，接受这条常红」，同样毕业为「不做」并记录该决定，本卡离场。

## 范围与排除项

- **在射程**：收口动作与判据的一致性（present 是否为闭合的必要条件）；`all-in-ai-2026` 这一条的处置（补做 `present` / 记录豁免 / 保持红）。
- **不在射程**：判据本身的判别盲区（会话日志残缺时的不可证伪）——那条归 [BUG-019](../bugs/BUG-019-final-present-evidence-lost.md)；`present` 的角色门（已由 BUG-003 修）；`meta.md` 形状（2026-10-16 已归一，见 `cdd0919`）。

## 已知与未决

- **已知**：判据要求「Lead 会话 present 过」才算成品（`tools/lib/deliverables.mjs` 头注 + 公司手册承诺权节）；「写盘 final + 结果=已完成」**不构成**声明。
- **已知**：`converge.mjs` 的收敛前置现为 `final + meta.closed + 一句话结论 + ≥1 篇 journal`（后者 2026-10-16 立），**不含「有 present」**。
- **未决**：`present` 缺失时，该动议算「未完成」（该继续挂）还是「已完成但声明缺失」（该补声明）？——这决定工具侧闸门的语义，属人对流程的判断。
- **未决**：补做 `present` 在今天做，是否等于「补造 10-13 的声明」？本仓既有的「不假装历史」纪律倾向**不做**，但也可能判为「收口动作补做，日期如实记今天」。

## 方案与取舍

| 方案 | 内容 | 取舍 |
|---|---|---|
| A（推荐） | **公司侧立纪律**：手册 + 各角色 preset 的收口清单把「`present` 后方可标 `结果=已完成`」写成硬步骤 | 治根（跳步本身被挡住）；代价 = 改 `company-workspace/AGENTS.md` + 5 个 preset（公开行为面，须用户拍板） |
| B | **工具侧加前置**：`converge` 拦「meta 标终态却查无 present 背书」的动议（照 2026-10-16 零 journal 前置的先例） | 与 A 互补；但需要判据能读会话日志（converge 目前不读）⇒ 成本更高，且会与 BUG-019 的判别盲区纠缠 |
| C | **只处置本条**：为 `all-in-ai-2026` 记录一次「确认是真违规、接受常红」或补做 present | 最省；但不防下一场（同缺口会再产生红） |
| D | **不改，接受常红** | 诚实但把真信号当噪声（`deliverables-check` 会永远 exit 1） |

## 关闭条件

用户拍板（A/B/C/D 或改条目）且去向已记录 → 毕业头改「做」/「不做」并按章程处理（做则迁 settled_issues 前先实施或另立任务；不做则记录决定）。本卡推敲完成 = 收口纪律落在哪一层已定 + `all-in-ai-2026` 这一条的去向已定。
