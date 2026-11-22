---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-304：跨会话历史只读最近 800 条——更早的挂起审批永远不出现在待办

> 严重级别：P2（次要偏重：待办是「等你处理」的完整清单；长会话里的老 pinned 审批会被新事件挤出窗口，面板却仍说「没有等你的事」）｜发现：2026-11-22（E2E 第三轮）｜状态：已修｜审查：agent — 逐条核对已修判定（窗口/失败/扫到数 + 面板两条边界行）
>
> **留痕**：commit 51747ad0（同一提交收 304+305：读面结果态 + 面板边界行，材料性；批次 Note 覆盖）。

## 症状

一个会话在很早的时候挂起了一条审批（`approval/asked`），之后又产生了 900 条普通事件；该审批没有 decided。

打开另一个会话的「待办」：

- 这条审批**不出现**；
- 面板显示「没有等你的事」；
- 没有任何「历史只扫描了最近 N 条」的提示。

因为 `readSessionEvents` 只取 `throughSeq = 当前游标, maxMessages = 800` 的一页；审批在窗口外，`pendingApprovals` 根本看不到它。

## 运行面

- **面 = client 读模型**：`packages/company-pack/src/client/presence/attention-history.ts` 的 `HISTORY_PAGE_MESSAGES` / `readSessionEvents`；`tabs/AttentionTab.tsx` 的 `HISTORY_SCAN_CAP` 与空态。
- 数据源 = `remote.session.page`（单页读取）。

## 复现

纯函数，无需浏览器：

```sh
node --import tsx/esm - <<'EOF'
import { readPendingAcrossSessions } from './packages/company-pack/src/client/presence/attention-history.ts'
const events = [{ event: { type: 'approval/asked', time: 1, data: { id: 'old', toolName: 'request_signoff', reason: 'old pending' } } }]
for (let i = 0; i < 900; i += 1) events.push({ event: { type: 'turn/start', time: 2 + i, data: { i } } })
const page = async (req) => {
  const max = req.maxMessages ?? 1
  const through = req.throughSeq === Number.MAX_SAFE_INTEGER ? events.length : req.throughSeq
  return { ok: true, value: { records: events.slice(Math.max(0, through - max), through) } }
}
console.log('events', events.length)
console.log('rebuilt', (await readPendingAcrossSessions(page, ['session-1'])).length)
EOF
```

本轮实测：

```
events 901
rebuilt 0
```

期望：1（那条 `old` 审批仍在挂起）。实际：0，且无任何截断/降级信号。

## 根因与证据

1. 单页上限写死 800：`attention-history.ts:17`
   ```ts
   export const HISTORY_PAGE_MESSAGES = 800
   ```
2. `readSessionEvents` 探到当前游标后只取一页：`attention-history.ts:65`
   ```ts
   const full = await page({ address, throughSeq: cursor, maxMessages: HISTORY_PAGE_MESSAGES }, signal)
   ```
   不关心 `eof` / 是否还有更早的页——vendor 的 page 结果本身有分页信息，但这里没有消费。
3. `pendingApprovals` 只能看到这一页里的事件；更早的 `approval/asked` 不可见。
4. `AttentionTab` 没有「历史窗口截断」状态；空态仍按「没有等你的事」渲染。
5. `HISTORY_SCAN_CAP = 20` 是另一条候选会话上限（策略已记录），但**单会话 800 条窗口**没有在 Note 的未覆盖轴里说明。

## 失败类与同类排查

**失败类 = 固定窗口静默截断（与 BUG-298 同族，但这里发生在会话事件分页）**。同类：

- 候选会话 cap 20（`AttentionTab.tsx:136`）同样会让第 21+ 个会话的挂起审批消失；这是显式策略，但 UI 不提示。
- `session/page` 的 `maxMessages` 上限是单页；要读更长历史必须多页/向后翻。
- 活体 observer 只覆盖本页在场期，不能补历史；历史读取是唯一通道。
- 不是「未打开会话零帧」的旧问题（BUG-288），而是打开/未打开都一样的分页窗口。

## 修复方案与范围

- **根因修法（二选一）**：
  - 向后分页直到 `eof`（或读到第一条 `approval/asked` 之前的一页），再配对 asked/decided；需要给 `readSessionEvents` 加页循环和总事件上限（可配，但超过时必须告警）；
  - 或走宿主聚合查询（如果 vendor 提供）；本包不新增 `@Remote`，先用 `session/page` 分页。
- **UI**：如果仍保留窗口，待办必须显示「历史只扫描了最近 N 条，可能有遗漏」；空态不能无条件说「没有等你的事」。
- **判据**：901 事件 fixture → 1 条重建；刚好 800/801 边界各一条；多页顺序正确；decided 在更早页时仍能配对。
- **不改**：活体 observer 的 2s 路径；候选 cap 20 的策略（另议是否提示）。
- **材料性**：client 公开行为；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 901 事件、审批在最早处：待办显示这条审批（或明确「历史窗口截断，可能有遗漏」），不再静默 0；
- 801 事件边界与 decided 在窗口外两种配对都正确；
- 正常短会话不回归；
- 纯函数 spec + 真页面复核各一条。

## 修复证据

- 改动面：`packages/company-pack/src/client/presence/attention-history.ts`（`readSessionEvents` → `{events, windowTruncated}`、`readPendingAcrossSessions` → `{items, scanned, failed, window}`）、`packages/company-pack/src/client/tabs/AttentionTab.tsx`、`packages/company-pack/src/client/locales.ts`
- 红：`vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 把 window 强制为 `'none'`、并把空态改回无条件渲染后 3 failed / 15 passed（窗口提示不出现；全失败仍显示「没有等你的事」）
- 绿：`vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 18/18（拿满一页 ⇒ window=some；全失败 ⇒ failed=N、items 空；面板出「有 N 个会话的历史读不到」并压住空态；拿满一页出「只扫描了最近 800 条」）
- 提交：commit 51747ad0
