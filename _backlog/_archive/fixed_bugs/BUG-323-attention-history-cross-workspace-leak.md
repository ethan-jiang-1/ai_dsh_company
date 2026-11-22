---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-323：当前会话 cwd 未加载时，跨会话重建把**所有工作区**的会话都扫进来

> 严重级别：P2（次要偏重：待办声称只看「同工作区」；currentCwd 未解析时 `||` 分支放行全部工作区，别的 workspace 的挂起审批会出现在这里）｜发现：2026-11-22（E2E 第五轮）｜状态：已修｜审查：agent — 逐条核对已修判定（cwd 缺失/空串/不在清单都不扫 + 同工作区过滤）
>
> **留痕**：commit 1d563e89（client 读面边界，材料性；批次 Note 覆盖）。

## 症状

`AttentionTab` 的候选过滤：

```ts
const currentCwd = byId[props.sessionId]?.cwd
return Object.values(byId).filter(summary =>
  summary.id !== props.sessionId
  && summary.origin !== 'subagent'
  && (currentCwd === undefined || summary.cwd === currentCwd))
```

当当前会话的投影还没加载（`byId[props.sessionId]` 是 undefined/cwd 缺失）时，`currentCwd === undefined` 放行**所有** root 会话——包括别的 workspace。页面首帧/会话切换窗口里，待办可能扫到并显示另一个 workspace 的审批；面板没有任何 workspace 过滤/提示。

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/tabs/AttentionTab.tsx` 的 `historyKey`；`byId` 来自 `useSessions`。
- 数据面 = `sessions` 摘要的 `cwd`。

## 复现

1. 两个 workspace A/B，各有一个带未决审批的 root 会话。
2. 打开 A 的会话，但在 `byId` 尚未填上 A 的 cwd 时打开「待办」（或直接 mock `byId` 缺当前 id、其它 id 的 cwd 不同）。
3. 期望：不扫/只扫 A；实际：A、B 都会进入 `historyKey`，B 的审批出现在 A 的待办。

## 根因与证据

- `AttentionTab.tsx:131-134`：
  ```ts
  const currentCwd = byId[props.sessionId as SessionId]?.cwd
  ...
  && (currentCwd === undefined || summary.cwd === currentCwd)
  ```
  `undefined` 被当成「不限制」，而不是「未知 → 先不扫」。
- `historyKey` 没有把 `currentCwd` 写进 key；currentCwd 从 undefined 变为 A 时 key 可能变化（因为候选变了），但首轮/窗口期的错误结果已经显示。
- 304/305 修的是读取失败/窗口边界；本卡是候选集的工作区归属。

## 失败类与同类排查

**失败类 = 「未知」与「不限制」共用同一分支**（scope fail-open）。同类：

- `AttentionTab` 的 `currentCwd === undefined`：本卡。
- `Cultivation` 的 `recordsProblem` 已区分「空/读不到」；注意力候选没有。
- 同工作区的其他过滤（origin/subagent）是 fail-closed；只有 cwd 是 fail-open。

## 修复方案与范围

- **根因修法**：`currentCwd` 未定义时返回空候选（等待）或只扫当前会话；绝不扫所有工作区。`historyKey` 把 `currentCwd` 纳入，cwd 解析完成后再扫。
- 面板可显示「正在确定工作区…」而不是扫全盘。
- **判据**：cwd 缺失 → 0 个跨会话候选；cwd=A → 只 A；cwd=B → 只 B；subagent/当前会话排除不回归；zh/en 同步。
- **不改**：跨会话 800/20 边界；审批配对。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 当前 cwd 未解析时不扫任何其它工作区；
- cwd=A 时只出现 A 的审批；
- cwd 从缺失到解析后结果收敛；
- 纯函数/组件 spec + 双 workspace 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/client/presence/attention-history.ts`（`historyCandidates` fail-closed）、`packages/company-pack/src/client/tabs/AttentionTab.tsx`、`packages/company-pack/src/client/locales.ts`、`tests/client/presence/attention-history.spec.ts`、`tests/client/tabs/attention-tab.spec.ts`
- 红：`vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 把过滤改回 fail-open（cwd 未知 ⇒ 都匹配）后 3 failed（不扫的用例与「看不到其它 workspace」失败）
- 绿：`vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 23/23（cwd 缺失/空串/当前会话不在清单 ⇒ `ok:false`；同工作区过滤排除自己与 subagent；面板出「工作区还没就绪」且 page 面零调用）
- 提交：commit 1d563e89
