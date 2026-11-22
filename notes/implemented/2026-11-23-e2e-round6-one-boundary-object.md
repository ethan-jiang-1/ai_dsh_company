状态：implemented（2026-11-23）｜上游 = [BUG-325](../../_backlog/_archive/fixed_bugs/BUG-325-attention-question-live-history-id-mismatch.md)、[BUG-326](../../_backlog/_archive/fixed_bugs/BUG-326-cultivation-command-description-inner-errors-chinese.md)、[BUG-327](../../_backlog/_archive/fixed_bugs/BUG-327-attention-current-approval-cap-still-silent.md)、[BUG-328](../../_backlog/_archive/fixed_bugs/BUG-328-attention-empty-state-ignores-boundaries.md)、[BUG-329](../../_backlog/_archive/fixed_bugs/BUG-329-cultivation-en-list-delimiters-chinese.md)、[BUG-330](../../_backlog/_archive/fixed_bugs/BUG-330-attention-question-copy-and-cap-still-approval-only.md)、[BUG-331](../../_backlog/_archive/fixed_bugs/BUG-331-attention-multi-question-request-only-first.md)、[BUG-332](../../_backlog/_archive/fixed_bugs/BUG-332-attention-exact-800-window-false-positive.md)

# E2E 第六轮：一个边界对象 / 跨源身份 / 可证伪的启发式 / 标点也是 i18n

## 决定

八张里**五张是上一轮的接缝**（325/327/328/330/332）。上一轮我把「**报出边界**」当成目标，
真正的目标是「**所有边界进同一个状态、名字与内容一致**」。这轮把目标改对了：

1. **S 一条管线只有一个边界对象（327 / 328 / 330）**
   上一轮把边界「沿管线传」，却传成三个变量、各自被部分消费：当前会话的 `capped` 没人读、
   空态只认三个边界、字段名在 question 并入后仍叫 `approvals`。
   现在：`AttentionBoundaries`（`eventsTruncated` / `candidates` / `asksCapped` / `window` / `failed`）
   + `hasBoundary()` **单一判据**——一处算、一处渲染、一处决定空态；文案统一到「待你处理（审批与问询）」，
   上限数字取 `ASKS_CAP`（不再在面板里写死 5）。
2. **I 身份跨源一致（325）**
   312 给问询活体合成 id、319 给历史 `callId`——各自都对，拼起来同一条问询两行。
   `mergeAttention` 增**跨源**内容去重（仅 live↔history），源内仍按 id（312 的「同文两条不合并」不回退）。
3. **B 保守启发式要可证伪（332）**
   「拿满一页」≠「还有更早」。窗口截断只看 vendor 的 `hasMore`；恰好 800 条的完整历史不再误报。
4. **多问题请求（331）**
   一次 `ask_user_question` 可带 N 个问题，过去只读 `questions[0]`。新增 `questionListOf` + `questionCopy`：
   摘要 = 第一个问题 +「共 N 个问题」，`detail` 列出全部；活体与历史两处同源。
5. **E 表达层包括元数据与标点（326 / 329）**
   命令 `description`/`input.hint`、停写回执（`blockedCompanyTextPair`）、
   `UnsafeCultivationPathError`/`CompanyWriteBlockedError` 的 `messageEn` 都走 `t`；
   列表分隔符收进 `ui/list-separator.ts`（zh「、」/ en `", "`），团队工具卡的令牌参数只带 id 数组。

## 输掉的方案

- **给 `AttentionTab` 的每个边界各加一个布尔**：那就是上一轮的写法，组合起来必漏；正解是一个对象 + 一个判据。
- **问询只按 id 去重、容忍两行**：用户看到的是「同一条问询两行」，属可见缺陷。
- **问询按内容全局去重**：会让 312 的「同文两条不同 id」再次塌成一条；只能限在 live↔history 之间。
- **`hasMore` 缺失时继续用 `>= limit`**：本仓的 `SessionPage.hasMore` 是**必填**字段，退化路径不存在；若将来出现再补「多取一条」。
- **把 `CompanyWriteBlockedError.message` 整体翻译**：那是运行前提的原话，翻译等于编造；只给「停写」这句英文，原文保留。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 注意力读取的全部边界 | `AttentionBoundaries` + `hasBoundary()` | 待办面板提示与空态 | `eventsSeen` / `historyCandidates` / `pendingAsks` |
| 问询的跨源身份 | `mergeAttention`（跨源按内容、源内按 id） | 待办列表 | 观察者合成 id / `callId` |
| 窗口是否被截 | `readSessionEvents` 的 `windowTruncated`（只看 `hasMore`） | 「只扫描了最近 N 条」行 | `remote.session.page` |
| 一次问询有几个问题 | `questionListOf` + `questionCopy` | 待办行摘要与 `detail` | `ask_user_question` 的 `arguments` |
| 列表分隔符 | `listSeparator(t)` / `joinList` | 任务成员 / 依赖 / 看板 / 培养坏记录 | `ui.listSeparator`（zh「、」/ en `", "`） |
| 命令元数据与错误语言 | `registerCultivation(…, t)` + 两类错误的 `messageEn` | 命令面板 / 错误行 | `locale.preference` |

## 验证（真跑过）

- **327/328/330**：`vitest run tests/client/tabs/attention-tab.spec.ts tests/client/wiring/attention.spec.ts` —— 21/21 + 47/47。
  红证：去掉 `ownAsks.capped` → 「本会话审批被截」失败；空态改回手写三条件 → 矩阵五档失败。
  **边界组合矩阵**覆盖六种边界 × 空/有项：提示出现且空态被压住。
- **325/331/332**：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts tests/client/presence/attention-history.spec.ts` —— 47/47 + 12/12 + 17/17。
  红证：去掉跨源去重 → 同一条问询两行；只读 `questions[0]` → 缺「共 N 个问题」；窗口改回 `>= limit` → 恰好一页误报。
- **326**：`vitest run tests/host/cultivation/cultivation-command.spec.ts tests/host/commands/blocked-text.spec.ts` —— 24/24 + 3/3（en 下 description/hint 无 CJK；两类错误 `messageEn` 无 CJK 且保留原文片段；停写回执 en 出 `writes are paused`）。
- **329**：`vitest run tests/client/ui/list-separator.spec.ts tests/client/ui/team-tool-card.spec.ts` —— 3/3 + 12/12。
- 收尾：`test` 2604、`verify` ALL PASS、`typecheck` 0、`lint` 0、`dup` 0、`coverage-ratchet` PASS（211 文件）。

## 未覆盖轴

- [environment-gap] 325/331 的真会话复核未跑（隔离实例没有带多问题/未答问询的会话日志）→ `packages/company-pack/src/lib/presence/attention.ts`
- [policy] 跨源去重按 `what` 比对；若历史与活体的摘要被折叠成同一串（>160 字截断），同一条会合并、不同条也可能合并 → `packages/company-pack/src/lib/presence/attention.ts`
- [policy] `listSeparator` 依赖 `ui.listSeparator` 字典；新增语言需同时加这一格 → `packages/company-pack/src/client/locales.ts`
- [covered] 边界组合矩阵六档 → `tests/client/tabs/attention-tab.spec.ts`
- [covered] 跨源/源内身份与多问题 → `tests/client/wiring/attention.spec.ts`
- [covered] 元数据与两类错误语言 → `tests/host/cultivation/cultivation-command.spec.ts`
