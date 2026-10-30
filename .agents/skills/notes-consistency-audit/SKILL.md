---
name: notes-consistency-audit
description: Use when notes/ feels noisy or self-contradictory, when a mechanism is re-decided, or before a major release, to run a read-only consistency audit — classify every Note as current decision / stale facts / superseded / receipt / RFC residue, prove each conflict against current docs and code, and dispose with the smallest correct move.
---

# notes/ 一致性分诊

适用：notes/ 读起来“打架”或“像年鉴”；某机制被重新决定；大版本前；或 `pnpm notes:audit`
报出成片候选。**不适用**：单篇 Note 的写法（→ [agent-note-definition](../agent-note-definition/SKILL.md)）。

规则唯一家 = [notes/README.md](../../../notes/README.md)；本 skill 只管**次序与判据**，不复述词表。
原则：**目录树是清单，现行合同是 now，最新决定赢；报告不是 Note。**

## 步骤

1. **机械基线。** 跑 `pnpm notes:audit --json`（只读，<1s）。
   *完成*：拿到每篇的入链数、死路径、收据特征、取代缺回链、状态行异常。
2. **定现行真值。** 给本次范围画一张「机制 → 现行 owner」表：合同文档 / 代码符号 / 门禁。
   *完成*：每一条被 Note 断言的行为，都能指到一个**现在**的 owner；指不到 = 先不要判旧文对错。
3. **逐篇抽 claim。** 把「当时的事实与证据」和「对现在的断言」分开：路径、符号、默认值、计数、
   UI 入口、版本窗口。**只把后者拿去对账**；前者是历史证据，不改写。
   *完成*：每篇一张 claim 行（断言 / 出处行号），空 claim 的 Note 标为“纯证据”。
4. **分类。** 每篇只给一个主类，附一条证据（引用行号）：
   - `KEEP`：仍是现行决定的 owner（决定 + 输掉的方案 + 证据）。
   - `FIX-FACTS`：决定仍成立，但路径/符号/默认值/计数过期（按 D38 就地改新）。
   - `SUPERSEDED`：后来有 owner 推翻或完整吸收它；指出**哪一篇**。
   - `RECEIPT`：收据/状态快照/批次流水/首跑证据——没有持久决定（判据 = notes/README §二负例）；
     落 `archived/receipts/`，不进 archive 顶层。
   - `RFC-RESIDUE`：已毕业但正文仍是提案体（问题/当前事实/方案/实施顺序、未来时、迁移指令）。
   - `CONFLICT`：旧断言与现行合同相反且无标记；必须给**两侧原句 + 行号**。
   *完成*：每篇有类；`CONFLICT` 全部成对引用；拿不准的标 `UNCONFIRMED`，不猜。
5. **开处方。** 按最小改动选：`banner`（加“被取代”指针）/ `fix-facts` / `archive`（`git mv`；旧决定已非
   现行 owner）/ `receipt`（`git mv` 到 `archived/receipts/` + digest 一行）/ `delete`（完整吸收且无剩余
   否决，或收据失效/重复；需点头）/ `rewrite`（RFC 体改现在时）。
   *完成*：一张可执行表（文件 → 动作 → 目标 owner）；**没有“清理一下”这种不可执行项**。
6. **执行。** 删除需用户明确点头；archive 顶层与 receipts 按 §五 的默认处置执行（旧决定已非现行 owner
   才进 archive）。`archived/` 冻结，不回写（由新 Note 单侧承载指针）。
   移动/删除后同 diff 修全部反链；`pnpm verify` 只覆盖非 archived 面——archived 的链接自己用
   `rg`/抽查兜底（md-links 不扫该层）。
   *完成*：`pnpm verify` 全绿；`notes:audit` 的硬项（缺回链/状态行）为 0。
7. **留痕。** 报告落 `_backlog/_archive/research/notes-consistency/<日期>-<范围>.md`（不是 Note）：
   范围、命令、分类表、冲突对、已执行/待批、残余风险。只有**规则或机制变了**才写 Note。
8. **防复发。** 同一类矛盾出现第二次 → 按 policy P2 提议门禁/技能改动；不靠下一次人工清扫。
   *完成*：要么有机械拦截，要么有明确的“为什么这格不能机械判”。

## 红旗（看到就先怀疑，不急着定罪）

- 标题/状态自述“不是新决定”“只记测量”“不是产品合同”“批次”“走查/模拟” → 先看有没有 `## 决定`；没有才是收据。
- 首节是“问题 / 当前事实 / 方案 / 实施顺序”，状态却是 implemented → RFC 残留。
- 文内路径在 `root` 与 `vendor/dsh/root` 都找不到 → 死指针；若在“当时证据”段，标历史，不改写。
- 两篇都自称同一机制的 owner，规则不一致 → `CONFLICT`；现行合同/代码赢，旧文加 banner 或归档。
- 零入链 + 早于最近一次机制改口 → 优先复核，不直接删。
- 旧文说“明确不做/等触发”，后文却做了且没记触发依据 → 不是普通过期，是**否决被绕过**，单列。

## 输出模板

```markdown
# notes 分诊 · <日期> · <范围>
命令：`pnpm notes:audit --json` / `pnpm verify`
现行真值：<机制 → 合同/代码/门禁>

| Note | 类 | 证据（行） | 处方 | 目标 owner |
|---|---|---|---|---|

## 硬矛盾
- 旧：<file:line 原句>
  新：<file:line 原句>
  判：<谁赢，为什么>

## 已执行 / 待批 / 残余
```

## 指针（别复述）

规则与词表 = [notes/README.md](../../../notes/README.md)；Note 写法 = [agent-note-definition](../agent-note-definition/SKILL.md)；
收尾与语义审 = [close-out-definition](../close-out-definition/SKILL.md)；机械面 = `pnpm notes:audit`；
证据分层 = [testing.md](../../../docs/testing.md)。
