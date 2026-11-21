---
status: 调查中
severity: P2
opened: 2026-11-21
---

# BUG-294：培养页把「没有待处理记录」说成「这个工作区还没有培养记录」——采纳最后一条后自相矛盾

> 严重级别：P2（次要偏重：空态文案说假话，用户会以为记录丢了；采纳/拒绝后的第一眼就是这个状态）｜发现：2026-11-21（E2E 设计轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-21 指令「发现问题直接报 bug，别急着修」）。

## 症状

隔离公司盘里放一条 `status: open` 的培养记录，打开「培养」页签 → 点「采纳」：

- 「需要我处理」块显示：**「这个工作区（workspace）下还没有培养记录。」**
- 同屏往下：「我提交的」显示这条记录 **「目标角色语境下的人已采纳 → method-…」**；
- 「已采纳的方法」列出这个方法与「已采纳 / 未验证」标签；
- 盘上 `.dsh-company/cultivation/records/20261121-120000-e2e1.md` 仍然存在（status 已变 `adopted`）。

同一条记录在三处同时「存在（已采纳）／不存在（工作区没有记录）」，空态文案与事实冲突。拒绝最后一条 open 记录、或盘上只有 adopted/rejected 记录时，同样出现。

证据（原型 E2E 轮，gitignored）：`runtime/tmp/e2e-evidence/2026-11-21T15-39-34/10-cultivation-adopted.png`。

## 运行面

- **面 = client**：`packages/company-pack/src/client/cultivation/CultivationInbox.tsx` 的「需要我处理」空态分支；文案在 `cultivation-actions.ts` 的 `inboxEmpty`。
- 数据面 = `cultivation-data.ts` 的 `records`（全量记录）与读模型 `inbox.needsDecision`（待处理子集）。

## 复现

1. 起隔离公司实例（`DSH_COMPANY_HOME` 指向临时 workspace，`.dsh-company/cultivation/records/` 放一条合法 open 记录，`targetRole` 与会话品牌一致，例如 CEO）。
2. 打开该 CEO 会话 → 右栏「培养」→ 记录行点「采纳」。
3. 观察「需要我处理」与「我提交的 / 已采纳的方法」同屏。

期望：「需要我处理」说「没有需要你处理的记录」（或等价），不否认工作区里有记录；实际说「这个工作区（workspace）下还没有培养记录」。

## 根因与证据

`CultivationInbox.tsx:65-70` 的三态判定只区分 `records === null`（加载中/不可达）与 `inbox.needsDecision.length === 0`，后者直接落到 `inboxEmpty(workspaceLabel)`：

```tsx
{records === null
  ? <div className="wk-meta">{recordsProblem === null
    ? CULTIVATION_COPY.inboxLoading
    : CULTIVATION_COPY.inboxUnread(recordsProblem.path, recordsProblem.reason)}</div>
  : inbox.needsDecision.length === 0
    ? <div className="wk-meta">{CULTIVATION_COPY.inboxEmpty(workspaceLabel)}</div>
    : ( ...列表... )}
```

而 `inboxEmpty` 的原文（BUG-291 引入）描述的是**记录目录为空**这一种状态：`这个工作区（<ws>）下还没有培养记录。`（`cultivation-actions.ts:132`）。`records` 非空、只是 `needsDecision` 为空（adopted/rejected 记录）时，代码把两种状态混成一种。

为什么单测没抓到：`tests/client/cultivation/cultivation-board.spec.ts` 钉了「空态点名 workspace / 不冒充读不到」与「不可达」两态，但「records 非空 + needsDecision 为空」是第三种组合，未被命名。

## 失败类与同类排查

**失败类 = 状态混同（空集合 vs 无待办）/ 文案说假话**。同类扫描：

- 同一组件里 `recordsProblem === null` 与 `records === null` 已经分开过（BUG-291 的成果），但「records 空」与「待办空」仍被合并；
- 「我提交的」与「已采纳的方法」使用同一份 `records`，所以矛盾可见；
- 拒绝流程 `confirmReject` 走同一分支，同样中招；`journalRows` 的「无待审」是另一套诚实文案，不受影响。

## 修复方案与范围

- **根因修法**：「需要我处理」的空态按数据分两态：
  - `records.length === 0` → 现 `inboxEmpty(workspaceLabel)`（工作区还没有记录）；
  - `records.length > 0 && inbox.needsDecision.length === 0` → 新文案（例如「没有需要你处理的记录；已处理的在下面。」），不点名 workspace 为空。
- **判据补强**：`cultivation-board.spec` 增加「一条 adopted 记录 + 零 pending」组合，断言出现「没有需要你处理」而不是「还没有培养记录」；zh/en 同步。
- **不改**：`recordsProblem` 三态、采纳/拒绝命令面、workspace 点名的实现（`workspaceLabelOf`）。
- **材料性**：client 公开文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 盘上只有 adopted/rejected 记录时，「需要我处理」不再说「这个工作区下还没有培养记录」，而是明确「没有待处理的记录」；
- 记录目录真为空时，仍保留 BUG-291 的 workspace 点名空态；
- `npx vitest run tests/client/cultivation/cultivation-board.spec.ts` 的两种空态各自绿，真实页面同形复核。
