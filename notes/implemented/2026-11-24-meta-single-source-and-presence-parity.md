状态：implemented（2026-11-24）；批准：用户 2026-11-24 指令「重新规划并修最新一批缺陷」并建批次 goal 推进｜上游 = [BUG-370](../../_backlog/_archive/fixed_bugs/BUG-370-numbering-parser-differs-from-yaml-scalar.md)、[BUG-374](../../_backlog/_archive/fixed_bugs/BUG-374-req-declared-layers-splitter-diverges.md)、[BUG-375](../../_backlog/_archive/fixed_bugs/BUG-375-meta-field-parsers-fence-blind.md)

# BUG-370..376 批次收口：meta 单一来源与在场 live/replay 一致

## 决定

1. **`meta.md` 字段解析单一来源（[BUG-370](../../_backlog/_archive/fixed_bugs/BUG-370-numbering-parser-differs-from-yaml-scalar.md) / [BUG-374](../../_backlog/_archive/fixed_bugs/BUG-374-req-declared-layers-splitter-diverges.md) / [BUG-375](../../_backlog/_archive/fixed_bugs/BUG-375-meta-field-parsers-fence-blind.md)）**：
   `lib/docs/requirements-check.ts` 导出 `metaScalarField(meta, name)`（结构行过滤围栏/注释 + `yamlScalarOrProblem`）与
   `metaListField(meta, name)`（标量解后走 `parseList`）。`numberingMarker`、host 的 `parseProductType`、
   两处 `parseDeliveryMode`、`hasDeclaredDeliveryMode`、`parseDeclaredLayers` 全部改用它：
   - 模板占位 `<…>` = 未声明（不报错、不放行闸门）；
   - 坏引号 = 已声明但非法（保留原文报错，不折成未声明）；
   - `numbering :`（冒号前空格）、引号、行尾注释、`[MRD, SyRS]` 与引号列表都按同一口径解析。
2. **`meta.md` 形状单一判据（[BUG-371](../../_backlog/_archive/fixed_bugs/BUG-371-meta-shape-validators-three-way-split.md)）**：
   面板 `metaProblemsOf`（TS）、catalog 孪生（JS）、仓库审计 `validateMeta` 三处逐字同判据：
   `kickoff`/`type` 缺失或空 = 缺行；`result` 可留空（未收口），只在非空时校验词表；`slug` 可省略（回退目录名），
   但写成日期前缀形式判红。`tests/tools/meta-shape-parity.spec.ts` 对拍三处，fuzz 同步更新。
3. **在场 live/replay 同口径（[BUG-372](../../_backlog/_archive/fixed_bugs/BUG-372-diff-activity-shows-raw-lead-owner.md) / [BUG-376](../../_backlog/_archive/fixed_bugs/BUG-376-replay-lead-row-loses-current-tasks.md)）**：
   新增 `taskOwnerDisplayName`（`lead → CEO`）供看板与 `diffActivity` 共用；回放 lead 行不再手拼
   `inactive/currentTasks:null`，改用与 live 相同的 `idle` 和「按 ownerId 现算进行中任务」。

## 输掉的方案

- **只修 `numberingMarker` 的正则**：370 会绿，但 374/375 仍是另外两套解析器，下一轮还会分叉；抽 helper 一次收口。
- **让 host 直接从 client 目录字典取字段**：host 不依赖 client 面（分层守卫），helper 必须住 `lib`。
- **宽容解析坏标量为空串/未声明**：370 的 `numbering :` 事故正是「合法声明被折成未声明」导致整道闸门豁免；坏形状必须有信号。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| meta 标量字段 | [`metaScalarField`](../../packages/company-pack/src/lib/docs/requirements-check.ts) | `numberingMarker` / req / delivery 命令消费 |
| CEO 任务 owner 显示名 | [`taskOwnerDisplayName`](../../packages/company-pack/src/lib/presence/presence-status.ts) | 看板 / 动态 / 回放三面共用 |
| meta 列表字段 | [`metaListField`](../../packages/company-pack/src/lib/docs/requirements-check.ts) | `metaLayers` 与 `/req check` 的层提醒同用 |

## 验证（真跑过）

- **U1**：`pnpm test tests/lib/docs/requirements-check.spec.ts tests/host/commands/req-command.spec.ts tests/host/commands/delivery-command.spec.ts` —— 还原三处解析前 6 failed（引号/注释/冒号空格/占位符/围栏/方括号）；修复后 90/90 passed。
- **U2**：`pnpm test tests/tools/meta-shape-parity.spec.ts tests/lib/shared/parsers-fuzz.property.spec.ts` —— 还原三处判据前 5 failed；修复后 parity 10/10、`tests/content tests/tools tests/client/data` 490/490。
- **U3**：`pnpm test tests/lib/presence/presence-board.spec.ts` —— 还原前 2 failed（裸 `lead`；回放 `inactive/null`）；修复后 34/34、联动 presence 面 141/141。
- `pnpm verify` ALL PASS。

## 未覆盖轴

- [covered] numbering 六种写法、围栏里的 productType、layers 的 `[…]`/引号 → 去向：[requirements-check.spec.ts](../../tests/lib/docs/requirements-check.spec.ts) / [req-command.spec.ts](../../tests/host/commands/req-command.spec.ts)
- [policy] `delivery-command` 只消费 `deliveryMode`；其它 delivery-rules 字段没有结构判据（content 未声明要校验）→ 去向：[delivery-command.ts](../../packages/company-pack/src/host/commands/delivery-command.ts)
