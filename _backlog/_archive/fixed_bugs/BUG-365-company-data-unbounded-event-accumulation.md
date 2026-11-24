---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-365：`useCompanyData` 把 follow 流事件无界追加进 state，长会话下内存与每次渲染的开销线性增长

> 严重级别：P2（资源：`setEvents(prev => [...prev, frame.event])` 永不裁剪；`activityFromEvents(events, …)` 与 `teamWithEventTasks(team, events)` 在**每次事件**上重跑整段历史 ⇒ 内存 O(n)、累计 CPU O(n²)。同族事故已有 `BUG-146`（OOM）与 `BUG-355`（并发/代次）先例）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（窗口 + capped 语义）
>
> **留痕**：Note [2026-11-24-boundary-window-and-bad-shape-batch](../../../notes/implemented/2026-11-24-boundary-window-and-bad-shape-batch.md)（批次 360..369：数据层有界窗口）

## 症状

[`useCompanyData`](../../../packages/company-pack/src/client/data/use-company-data.ts#L117-L148) 订阅 `session/follow`：首帧 `history` 一次性塞入全部事件，其后每来一个 `event` 帧就 `[...prev, frame.event]`——**数组只增不减**。同一数组同时喂给三个 `useMemo`（活动折算、任务补齐），它们都在整个数组上重算。

展示层已经做了有界裁剪（`takeBounded(activityFromEvents(events, names), MAX_ACTIVITY, 'tail')`），所以**数据层的无界**完全被展示层掩盖，测试也看不出来（现有用例最长 55 条）。

## 运行面

- **面 = client**：[`packages/company-pack/src/client/data/use-company-data.ts`](../../../packages/company-pack/src/client/data/use-company-data.ts#L102-L148)；消费方 = 在场/任务板/依赖图三个页签。

## 复现

构造一个持续产出的 follow 流并断言 state 里的事件数持续增长（结构上即代码事实）：

```sh
grep -n "setEvents(prev =>" packages/company-pack/src/client/data/use-company-data.ts
# 121:        setEvents(prev => (frame.kind === 'history' ? frame.events : [...prev, frame.event]))
grep -n "activityFromEvents(events, names)\|teamWithEventTasks(team, stream ? events : \[\])" packages/company-pack/src/client/data/use-company-data.ts
# 138 / 144：两个 useMemo 都在整个 events 上重算
```

按现实现，N 条事件的内存与累计计算量分别是 O(N) 与 O(N²)：经验值上 `session/follow` 对一个长会话可以持续推送数千条事件（成员/任务/消息每类都发）。

## 根因与证据

1. 事件数组是「流的历史累积」，但只有展示层有界；裁剪点开在错误的一层。
2. `MAX_ACTIVITY` 只约束渲染条数，没有被用作数据层窗口。
3. 同文件注释已记录 `BUG-146`（OOM）教训，但那条只处理了投影面，流面没跟上。

## 失败类与同类排查

- **失败类**：把「无限流」原样累积进 React state，只在渲染层裁剪（内存/CPU 的真实上界不在渲染层）。
- **同类排查**：`attention.ts`/`pendingAsks` 的调用方（`AttentionTab`）自建 `MAX_EVENTS = 1_000` 窗口，是正确做法，可对照；`cultivation-data` 只读窗口文本，不累积。

## 修复方案与范围

- **根因修法**：在写入点做有界（例如 `setEvents(prev => takeBounded([...prev, frame.event], EVENT_WINDOW, 'tail').items)`，窗口 ≥ 最大展示条数，并把「窗口外还有」作为既有 `capped` 语义上报）；同时把 `history` 帧也裁到同窗口并保留 `total` 以支持「更早的动态」提示。

## 已修判定

- 连续推入 10 000 条事件后 `events` 长度 ≤ 声明窗口（不再线性增长）；活动列表的最后 50 条与当前实现一致；新增用例在旧实现下因长度超窗而红、新实现下绿。

## 修复证据

- 改动面：`packages/company-pack/src/client/data/company-stream.ts`、`packages/company-pack/src/client/data/use-company-data.ts`、`tests/client/data/company-stream.spec.ts`
- 红：`pnpm test tests/client/data/company-stream.spec.ts` —— 还原无界追加前 1 failed（窗口封顶/丢弃计数）
- 绿：`pnpm test tests/client/data/company-stream.spec.ts` —— 2/2 passed（history 裁到 1000 并记丢弃；追加封顶、最后一条保留）
- 提交：commit 64fc1a5f
