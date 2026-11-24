---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-355：`useCultivationFeedback` 切换会话保留旧赞踩，`useCultivationPanelData` 中止报错且并发 `load` 缺代次守卫

> 严重级别：P2（异步状态错乱：切换 `sessionId` 后仍展示上一个会话的赞踩或在目录被中止时误写「列目录被拒」，且同会话多次触发 `load()` 时慢请求会用旧数据覆写新数据）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（三场景 happy-dom 红→绿）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（批次 351..359：效应恢复点守卫 + 代次）

## 症状

[`cultivation-data.ts`](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L237-L403) 中的两个 React data hook 存在三处并发与切换期竞态：

1. [`useCultivationFeedback`](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L377-L403)：`useEffect` 依赖 `[enabled, sessionId, followEvents]`，切换 `sessionId` 或 `enabled` 变为 `false` 时从未清空上一次的 `feedback`（缺 `setFeedback(null)`）。若新会话流首连失败（进入 `catch` 分支）或在首帧到达前，面板会持续展示**上一个会话**的赞踩记录；
2. [`useCultivationPanelData`](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L281-L284)：在 `await files.listRecords(sessionId, controller.signal)` 返回后、第 326 行的 `if (controller.signal.aborted) return` 检查**之前**，就无条件调用 `setRecordsProblem(...)`。因为 `makeCultivationFiles` 里的 `listDir`（[第 161-181 行](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L161-L181)）把 `AbortError` 也折成 `{ ok: false, reason: 'dir-denied' }`，切换会话/卸载恰好中断 `listRecords` 时会把过期的 `'dir-denied'` 写进 `recordsProblem`；
3. [`useCultivationPanelData`](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L254-L347)：30s 定时器、`focus`、`visibilitychange`、`CULTIVATION_CHANGED_EVENT` 与 `refresh` 触发的多个 `load()` 共用同一个 `controller` 且没有按次序递增的代次序号（`seq`）。先发起但较慢的 `load()` 在后发起且已完成的 `load()` 之后返回时，会用旧快照直接覆盖掉新数据。

## 运行面

- **面 = client UI**：[`packages/company-pack/src/client/cultivation/cultivation-data.ts`](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L161-L181)、[第 237-403 行](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L237-L403)。

## 复现

在 `happy-dom` 下挂在真实 React 根上运行两个 hook：

1. `useCultivationFeedback` 先对 `sess-1` 收到 `positive` 反馈，随后切换 `sessionId` 为 `sess-2`（新流首连 reject），实测 `feedback` 仍保留 `sess-1` 的记录；
2. `useCultivationPanelData` 在 `listRecords` 挂起期间切换 `sessionId` 触发 `abort`，实测 `recordsProblem` 被设为 `{ path: '.dsh-company/cultivation/records', reason: 'dir-denied' }`；同会话下首次慢 `load()` 在 `CULTIVATION_CHANGED_EVENT` 触发的新 `load()` 完成后才 resolve，实测 `records` 从 1 条被旧结果覆盖回 `0` 条。

## 根因与证据

1. `useCultivationFeedback`（第 383–401 行）重置/切换效应缺少 `setFeedback(null)`；
2. `useCultivationPanelData`（第 283–284 行）把副作用 state 写入放到了第 326 行 `controller.signal.aborted` 守卫之前，`listDir`（第 176 行）也未区分 `signal.aborted`，且多次 `load()` 之间缺少 `loadSeq` 代次丢弃检查。

## 失败类与同类排查

- **失败类**：React `useEffect` 异步流切换缺态复位、中止路径误写 UI 状态、以及同类并发 `load()` 缺少最新代次竞态守卫。
- **同类排查**：需对照检查同 hook 第 257–276 行读 journal 期间的中止与错误呈现，以及其余 `client/` 数据 hook 在 `sessionId` 切换时是否及时清空旧会话状态。

## 修复方案与范围

- **根因修法**：
  1. `useCultivationFeedback` 在 `useEffect` 入口重置 `setFeedback(null)`；
  2. `useCultivationPanelData` 给每次 `load()` 分配单调 `seq` 并在每次 `await` 恢复后的状态提交点同时检查 `if (controller.signal.aborted || seq !== activeSeq) return`，保证被中止或过期的 `load()` 绝不写 `recordsProblem` / `records` / `journalRows`。

## 已修判定

- `sessionId` 切换且新流失败时 `useCultivationFeedback` 返回 `null` 而非上一会话数据；`listRecords` 被中止时不更新 `recordsProblem`；旧 `load()` 晚于新 `load()` 完成时不回滚 `records`。

## 修复证据

- 改动面：`packages/company-pack/src/client/cultivation/cultivation-data.ts`、`tests/client/cultivation/cultivation-data-races.spec.ts`
- 红：`pnpm test tests/client/cultivation/cultivation-data-races.spec.ts` —— 还原前 3 failed（旧会话赞踩仍在、中止写 `dir-denied`、旧 load 把 1 条覆盖回 0）
- 绿：`pnpm test tests/client/cultivation/cultivation-data-races.spec.ts` —— 3/3 passed；联动 `pnpm test tests/client/cultivation tests/lib/cultivation` 217/217、`pnpm lint` 绿
- 提交：commit ebe92e7c
