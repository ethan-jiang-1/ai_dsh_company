---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-303：台账解析静默丢掉列数不对的动议行——4 行文件只显示 2 行，没有「坏行」提示

> 严重级别：P2（次要偏重：台账是「公司累计干了什么」的审计视图；坏行/结论里带竖线的行会静默消失，统计也随之少报）｜发现：2026-11-22（E2E 第三轮）｜状态：已修｜审查：agent — 逐条核对已修判定（解析层记账 + 面板级 4 行夹具）
>
> **留痕**：commit 1a2a0eb7（client 公开呈现面，材料性；批次 Note 覆盖）。

## 症状

写一份 4 行动议的 `kb/motion-ledger.md`：

- 2 行正常；
- 1 行结论里带一个裸 `|`（`这里有一个 | 竖线`），被拆成 8 个 cell；
- 1 行少一个 cell（没有「一句话结论」）。

打开「台账」：

- 统计显示 **「共 2 场动议」**，列表只有 2 行；
- 第 3/4 行完全不出现；
- 面板没有任何「坏行/格式错误/已跳过」提示。

即：文件里有 4 条动议，UI 声称只有 2 条，且不告诉用户它丢了什么。

## 运行面

- **面 = lib 解析 + client 台账页签**：`packages/company-pack/src/lib/accounting/ledger.ts` 的 `parseMotionLedger`；`client/tabs/LedgerTab.tsx` 的渲染。
- 数据面 = `kb/motion-ledger.md`（部署侧可人工编辑）。

## 复现

1. 隔离公司盘写：

```sh
cat > .dsh-company/kb/motion-ledger.md <<'EOF'
# 台账

| slug | 日期 | 类型 | 参与 | 墙钟 | 成品 | 一句话结论 |
|---|---|---|---|---|---|---|
| good-1 | 2026-11-21 | 决策 | CEO | 未记 | ✅ | 正常行一 |
| good-2 | 2026-11-22 | 评估 | CEO+COO | 未记 | — | 正常行二 |
| broken-pipe | 2026-11-22 | 决策 | CEO | 未记 | ✅ | 这里有一个 | 竖线 |
| broken-cells | 2026-11-22 | 决策 | CEO | 未记 | ✅ |
EOF
```

2. 起实例，打开右栏「台账」。
3. 实测：`共 2 场动议 · 成品 1 · 墙钟未记 2`；`broken-pipe` / `broken-cells` 不出现；无错误行。

## 根因与证据

`parseMotionLedger` 遇到列数不对的行直接 `continue`：

- `packages/company-pack/src/lib/accounting/ledger.ts:40`：按 `|` 切 cell；
- `:46`：`if (cells.length !== HEADER.length) continue`——**静默跳过**，没有计数、没有行号、没有告警。
- `LedgerTab` 只拿到 `rows`，没有「坏行」输入，因此不可能提示；`ledgerStats` 只统计幸存行（`ledger.ts:61-67`）。

这不是「文件坏到读不了」：读面成功，文件里也确实有 4 行动议；只是解析器选择不显示其中 2 行。

## 失败类与同类排查

**失败类 = 解析器静默跳过坏形状（silent drop）**。同类：

- 结论里带裸 `|` 是 Markdown 表格常见写法；用户不一定知道要转义成 `\|`；解析器也没有转义处理。
- 少 cell / 多 cell 的 typo 同样静默消失。
- 对比：`parseRecord` 对坏培养记录会进 `brokenRecords` 并在面板说「N 条记录读不动」；台账没有这个面。
- `ledger-participation` 门禁只查**仓库内**台账格式，部署盘运行态没有同样的保护。
- 不是读上限问题（BUG-298 已修）；这是行级解析丢弃。

## 修复方案与范围

- **根因修法**：`parseMotionLedger` 返回 `{ rows, malformed: [{ line, reason }] }`（或等价），`LedgerTab` 在统计旁显示「N 行格式不对，已跳过（第 X/Y 行）」；是否支持 `\|` 转义作为第二层决定（至少不能静默）。
- 如果合同明确禁止裸 `|`，就在坏行提示里点名「结论列含未转义 `|`」；如果支持，就按 Markdown 表格规则解析 `\|`。
- **判据**：4 行 fixture → 2 好 + 2 坏，统计显示 2 且坏行提示为 2；只有好行时无提示；zh/en 同步。
- **不改**：`ledgerStats` 的统计口径（幸存行）；仓库内 `ledger-participation` 门禁。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 列数不对/未转义 `|` 的台账行不再静默消失：面板明确说「跳过了 N 行」并给行号或原因；
- 统计数字旁能看出「有坏行」，不再把 2 当成全部；
- 正常 4 行文件若全部合法则显示 4；zh/en 两态各一条断言。

## 修复证据

- 改动面：`packages/company-pack/src/lib/accounting/ledger.ts`（`parseMotionLedger` → `{ rows, badRows }`、`LedgerBadRow`）、`packages/company-pack/src/client/tabs/LedgerTab.tsx`、`packages/company-pack/src/client/locales.ts`
- 红：`vitest run tests/lib/accounting/ledger.spec.ts tests/client/tabs/ledger-tab.spec.ts` —— 去掉坏行记账（恢复静默 `continue`）后 2 failed（`badRows` 为空 + 面板不提示跳过）
- 绿：`vitest run tests/lib/accounting/ledger.spec.ts tests/client/tabs/ledger-tab.spec.ts` —— 7/7 + 6/6（4 行文件：坏行 line 6 / 3 列被记账；面板「共 1 场动议」+「有 1 行格式不符已被跳过」）
- 提交：commit 1a2a0eb7
