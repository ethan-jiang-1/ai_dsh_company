---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-300：培养记录的「采纳/拒绝时间」原样显示 ISO 字符串，与旁边的「1 小时前」不是一种人话

> 严重级别：P2（次要：不影响判断，但同一块面板里一个时间是「11 小时前」、另一个是 `2026-11-21T18:40:21.725Z`，用户要自己脑内换算；审计时间也没有标 UTC）｜发现：2026-11-22（E2E 第二轮）｜状态：已修｜审查：agent — 逐条核对已修判定（正文人话 + title 精确 + 解析失败回落）
>
> **留痕**：commit d27c508a（client 公开文案，材料性；批次 Note 覆盖）。

## 症状

采纳/拒绝一条培养记录后，面板同屏出现三种时间口径：

- 「提出时间：1 小时前」（`stampOf` → `timeLabel`，人话相对时间）；
- 「采纳时间：`2026-11-21T18:40:21.725Z`」（原样 ISO）；
- 「目标角色语境下的人拒绝 · 拒绝时间：`2026-11-21T18:40:21.159Z`」（原样 ISO）。

证据（本轮隔离实例）：`10-cultivation-adopted.png`、`03-cultivation-reject.png`（原型证据目录，gitignored）。

## 运行面

- **面 = client**：`packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx` 的两处时间渲染；`cultivation-actions.ts` 的 `mineRejectedAt` / `adoptedDecidedAt` 文案。
- 数据面 = 记录 frontmatter 的 `decidedAt`（host 写入 ISO）。

## 复现

1. 隔离公司盘放一条 `status: open`、`targetRole: ceo` 的培养记录。
2. 打开 CEO 会话 → 右栏「培养」→ 点「采纳」（或拒绝）。
3. 看「我提交的 / 已采纳的方法」行：
   - 提出时间是人话；
   - 采纳/拒绝时间是 `YYYY-MM-DDTHH:mm:ss.sssZ` 原样。

## 根因与证据

- 采纳行：`CultivationBoardSections.tsx:143`
  ```tsx
  {record.decidedAt !== undefined && <span className="wk-meta">{CULTIVATION_COPY.adoptedDecidedAt(record.decidedAt)}</span>}
  ```
- 拒绝行：`CultivationBoardSections.tsx:51`
  ```tsx
  {record.decidedAt !== undefined && <span className="wk-meta">{CULTIVATION_COPY.mineRejectedAt(record.decidedAt)}</span>}
  ```
- 文案只是拼字符串：`cultivation-actions.ts:179`（`拒绝时间：${time}`）与 `:213`（`采纳时间：${time}`）。
- 同文件已经有 `timeLabel()`（`lib/cultivation/cultivation-record.ts:236`）负责「刚刚 / N 分钟前 / 昨天 HH:MM / MM-DD HH:MM」；提出时间走的是它，`decidedAt` 没走。
- `decidedAt` 是 host 写入的完整 ISO（本轮实测 `2026-11-21T18:40:21.725Z`），不是日期串。

## 失败类与同类排查

**失败类 = 机器时间直接进人话面**（同一面板时间口径不一致）。同类：

- `adoptedRaisedAt` 用的是 `stampOf` → `timeLabel`，是正确范式；
- `record.decidedAt` 还出现在 verification 历史/其他记录面？本轮扫 `grep -rn decidedAt packages/company-pack/src/client/cultivation`：只有上述两处直接渲染；其余是数据/解析；
- `LedgerTab` 的日期来自台账 `YYYY-MM-DD`，不属同类；
- 审计精度如果确有必要，应把 ISO 放 `title`，正文用本地时间。

## 修复方案与范围

- **根因修法**：`decidedAt` 解析成 epoch 后用 `timeLabel`（或 `toLocaleString` 带时区说明）渲染；解析失败回落原字符串并标注「原始时间」。
- **判据**：两条 keyless（采纳/拒绝各一）断言正文不再出现 `T..Z` 形状；解析失败分支仍显示原值；zh/en 同步。
- **不改**：host 写 ISO 的事实（审计需要精确值）；`stampOf` 对记录 id 的解析。
- **材料性**：client 公开文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 采纳/拒绝时间显示为本地人话（与提出时间同一种口径），或明确标注 UTC 的可读格式；
- 不再在正文出现裸 `2026-11-21T18:40:21.725Z`；
- 解析失败时不崩、不编时间；
- zh/en 两态各一条断言。

## 修复证据

- 改动面：`packages/company-pack/src/lib/cultivation/cultivation-record.ts`（`decidedAtLabel`）、`packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx`、`tests/lib/cultivation/cultivation-record-time.spec.ts`
- 红：`vitest run tests/client/cultivation/cultivation-board.spec.ts` —— 拒绝回执用例断言「正文不出现裸 ISO」在修复前失败（实际 `拒绝时间：2026-10-29T11:20:00.000Z`）
- 绿：`vitest run tests/client/cultivation/cultivation-board.spec.ts` —— 27/27（正文人话、`title` 仍是精确 ISO）；`vitest run tests/lib/cultivation/cultivation-record-time.spec.ts` —— 2/2（相对人话、解析失败回落原值）
- 提交：commit d27c508a
