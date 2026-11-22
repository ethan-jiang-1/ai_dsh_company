---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-318：跨会话重建只扫 20 个会话——第 21 个会话里的挂起审批静默消失

> 严重级别：P2（次要偏重：工作区超过 20 个 root 会话时，最旧的会话里的审批不会被读；面板没有「候选被截」边界）｜发现：2026-11-22（E2E 第五轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

`AttentionTab` 的 `historyKey` 在按 `updatedAt` 排序后 `slice(0, HISTORY_SCAN_CAP=20)`。一个有 21 个以上 root 会话的工作区里：

- 第 21 个（更旧）会话里挂着审批；
- 面板的「等你处理」没有它；
- `history.window`/`failed` 都正常（`scanned=20`），没有提示「还有会话没扫」。

面板文案声称「同工作区其它会话里挂着的审批都会出现在这里」——不成立。

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/tabs/AttentionTab.tsx` 的 `historyKey` / `HISTORY_SCAN_CAP`；`readPendingAcrossSessions` 只拿到这 20 个 id。
- 数据面 = `sessions` 列表 + `remote.session.page`。

## 复现

1. 同工作区建 21 个 root 会话（`origin !== subagent`），第 21 个（`updatedAt` 最旧）里留一条未决审批。
2. 打开「待办」。
3. 期望：能看到，或明确说「只扫了 20 个会话」；实际：看不到，`history.scanned=20`，无提示。

## 根因与证据

- `AttentionTab.tsx:52` 附近：`const HISTORY_SCAN_CAP = 20`。
- `historyKey`：
  ```ts
  .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  .slice(0, HISTORY_SCAN_CAP)
  .map(summary => summary.id)
  ```
- `PendingAcrossSessions` 有 `scanned`/`failed`/`window`，**没有** `candidates` 或 `capped`；`readPendingAcrossSessions` 只收到切好的 ids。
- 304/305 为 800 条事件加了 `window`；候选数的 20 上限没有对应边界。

## 失败类与同类排查

**失败类 = 候选集被切但结果态不携带「候选被切」**（与 304 同族，切的是会话数不是事件数）。同类：

- 跨会话事件 800：已修。
- 跨会话候选 20：本卡。
- `HISTORY_PAGE_MESSAGES` 是页大小，不是候选数；不混淆。

## 修复方案与范围

- **根因修法**：`historyKey` 同时产出 `candidateCount`/`capped`（或把全部候选传给 `readPendingAcrossSessions` 并返回 `window`/`capped`）；面板在 `candidateCount > scanned + failed` 时显示「还有 N 个会话未扫描」。
- 更好的修法：按需分页/增量扫描，不要固定 20。
- **判据**：21 个候选 → 至少警告；20 个 → 无警告；0 个 → 空态正常；zh/en 同步。
- **不改**：800 事件窗口（已修）；`HISTORY_REFRESH_MS`。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 候选数 >20 时面板明确说「只扫描了最近 20 个会话 / 还有 N 个未扫描」；
- ≤20 无提示；
- 全部扫到且无审批时仍显示真正的空态；
- 纯函数/组件 spec + 真页面一条。
