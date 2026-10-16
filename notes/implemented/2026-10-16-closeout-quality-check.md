# 收口机制端到端质检（2026-10-16）：真 CEO 会话补做收口＋撞出 converge 崩溃缺陷

状态：implemented（授权 = 用户 2026-10-16「你来模拟做, 你有测试能力, 然后看看实际质量如何, 我授权你…完整完成」；现场 = [settled_issues/2026-10-16-all-in-ai-ceo-closeout](../../_backlog/_archive/settled_issues/2026-10-16-all-in-ai-ceo-closeout.md)；新缺陷 = [BUG-020](../../_backlog/bugs/BUG-020-converge-crash-untracked-journal.md)；commit = 见本 Note 同轮）

## 做了什么（方法）

在 **Web 面**起一条**真 CEO 会话**（`session-f2ef793e`，`agentPreset=ceo`；preset 只在 Web 面挂载，`dev-loop §3.6`），经 `docs/guides/web-rpc.md` 的 RPC 面从外部驱动：`session/create`（cwd = 公司盘）→ `session/prompt`。**动议只给意图**（「那场只把稿子写进了盘、没走完收口动作，请按公司纪律把它收口」），**不点名任何工具**——由会话自己按纪律判断该做什么。会话跑完一轮（`turn/end`，54 次 `tool/call`），再用仓库既有仪器验收。

## 质量评估（用户要的「实际质量如何」）

**结论：会话自身的收口质量高（超出预期）；被它压出来的两处基础设施缺陷才是这轮的主要收获。**

做得对的（逐条有据）：

| 观察点 | 实测 | 判 |
|---|---|---|
| **自己想到调 `present`**（本轮新纪律的核心） | 工具序列第 38/54 次调用 = `present`，**在 meta 改终态之前** | ✅ 顺序纪律被遵守（先 present、后终态） |
| 报告是否给依据 | 逐步给依据：skill §5「合稿依据 = 稿面原文」、meta 模板 G1/G2、手册「状态由 CEO 对齐盘面」 | ✅ 不是自述式断言 |
| 有没有假装看到的东西 | 明写「本会话任务板为空，**按盘面证据对齐，不假装看到板面**」 | ✅ 边界诚实（这正是 BUG-012 那类病要防的） |
| 有没有顺手抹平 | 「判词一字未改」；两处发现如实记（列表行形状、派活行过期） | ✅ 不掩盖 |
| 不确定时怎么办 | `墙钟` 标「两读不自洽、未复核」（原场纪要 35 分钟与其自附时间窗矛盾） | ✅ 宁缺勿错，不自造数字 |
| `present` 的 description 形状 | `【全员 AI 化 · 收口】结论三条：①…②…③…` = 手册要求的「一分钟摘要」 | ✅ 格式合规 |
| 记账 | 新建 `kb/ceo/journal/2026-10-16-…-收口补记.md`：缺口逐条（主缺口 + 两处连带） | ✅ 收工留痕硬闸门 |

**验收（机器面，全用既有仪器）**：`deliverables-check --only all-in-ai-2026` 由 **违规 1 → 0**（`ALL PASS`）；全盘 `deliverables-check` → **违规 0 条**；`converge` 计划模式该 slug → **✓ 可收敛** → 已收敛（入归档家 + 台账行 + CHARTER 5 份 + 证据副本 6 篇 journal）；`authorship-audit` ALL PASS。

**顺手确认纪律送达**：会话日志里手册正文（含本轮新立的「成品收口必须先 `present`」与「没有 present 就没有」）确实在上下文里 ⇒ 上一轮的 A 面改动**真的到了角色手上**，不是只改了文件。

## 撞出的基础设施缺陷（本轮主要收获）

真会话一跑，收敛路径立刻暴露两处，已立 [BUG-020](../../_backlog/bugs/BUG-020-converge-crash-untracked-journal.md)：

1. **`converge` 崩在未跟踪的 journal 上（本轮已修）**：CEO 新建的收口补记是**未跟踪**文件，而清 live journal 走 `git rm` ⇒ `fatal: pathspec … did not match`，收敛**中断在半途**（交付物已搬、journal 清一半、台账未追加）。修法 = 先 `git ls-files --error-unmatch` 判 tracked，未跟踪走 `rmSync`；头注里那句「git rm 只动 tracked 文件」的**假设**改成明示分支。此文同时更正了工具头注与自身合同的失真。
2. **崩后无续跑（未修，BUG-020 主项）**：重跑同命令得 `✗ deliverables/ 下无此目录或缺 meta.md`——收敛器只从活跃区找 slug，认不出半态。本轮只能**按证据手工补完**（证据副本与 live 原件逐字节 `cmp` 全同 ⇒ `git rm` 清 4 份副本；台账行用收敛器自己的口径逐字取 meta 结论补 1 行）。**「人按证据手工补完」正是该被 ② 消掉的那件事。**

## 输掉的方案

- **在 headless/sdk 里跑「CEO 收口」**：败于 preset 只在 Web 面挂载（`dev-loop §3.6`）——headless 绕过 preset，那样收口的是「没有角色的 agent」，不是 CEO。
- **我自己替它调 `present`**：败于这轮质检的目的——要测的是**会话能不能自己按纪律收口**；我代调就测不出 A 面是否生效（实测它自己调了，这正是结论的一半）。
- **动议里点名「用 present 工具」**：败于污染样本——那会变成「我告诉它、它照做」，测不出纪律驱动。动议只给意图与授权。
- **崩溃后直接 `--allow-open-findings`/手工改 meta 让它变绿**：败于掩盖——半态是真缺陷现场，绕过去就等于把工具缺陷藏进一次「成功收口」里。
- **崩溃现场整片回滚重来**：败于信息损失——半态本身是 BUG-020 的第一手证据（记录在卡里）；且交付物已搬移、证据副本已在，回滚反而制造第二处不一致。

## 后果

- **all-in-ai-2026 正式闭合**：活跃 `deliverables/` 由 4 件降到 3 件；台账、CHARTER、证据链齐；`deliverables-check` 全盘 0 违规。
- **收敛路径比之前健壮一格**：未跟踪 journal 不再致崩（真现场验证）。
- **EN 已知未决**：半态续跑仍无入口（BUG-020）；`journal-audit` 仍红 6 条（v4 既有缺口，与本次无关）。
- 质检方法可复用：**真会话 + RPC 驱动 + 只给意图不给工具**，是验证「纪律是否真的驱动行为」的最小成本形状。

## 验证（全部实跑）

- **真会话**：`session/create`（preset=ceo）→ `session/prompt` → 轮次结束（`turn/end`，54 `tool/call`；`present` 在第 38 位）；用 `zstd -dc` 解帧读 `session.v4.jsonl.zstd` 逐事件核对（工具序列、present payload、journal 内容）。
- **机器验收**：`deliverables-check --only all-in-ai-2026` → `违规 0 条 —— ALL PASS`（改前 1 条）；全盘同档 → `违规 0 条`；`converge` 计划 → `✓ 可收敛` 后收敛成功；`authorship-audit` ALL PASS。
- **崩后手工补完的证据**：5 份 journal 逐对 `cmp` 与证据副本**逐字节相同**（才敢删 live）；台账行按 `appendLedger` 同款口径（逐字取 meta、插末数据行之后）补 1 行。
- **全量**：`pnpm verify` ALL PASS（backlog-liveness 曾红 1 条：BUG-020 状态行带括号说明与 frontmatter 不一致，已修）；`pnpm test` → `62 passed (62)` / `572 passed (572)`。
