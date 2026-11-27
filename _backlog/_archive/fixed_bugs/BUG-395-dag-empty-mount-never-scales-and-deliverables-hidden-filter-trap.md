---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-395：`DagPanel` 空图初挂后 `ResizeObserver` 失灵与全局 SVG marker 冲突，及 `DeliverablesView` 隐藏筛选器卡死空态

> 严重级别：P1（功能与排版退化：`DagPanel` 在空态先挂载后再动态出现任务节点时，`ResizeObserver` 永不附着导致 SVG 缩放永远冻结在 `scale(1)` 无法自适应栏宽，多窗格同挂时箭头 `<marker>` ID 冲突；`DeliverablesView` 当前选中「台账外/未 present」筛选后数量归零时，筛选按钮消失却未回退至「全部」，画面永久卡死空态）｜发现：2026-11-27｜状态：已修｜审查：待本批收口独立盲审
>
> **留痕**：commit `e2337ab8`（批次 392..398 顺位 2：`DagPanel` 按 `hasNodes` 重挂 `ResizeObserver` + `useId()` 隔离 `<marker>`；`DeliverablesView` 归零筛选回正 `'all'`）

## 症状

1. **空图先挂 `DagPanel` 永远不缩**：用户会话开始阶段打开 `作战板 -> 依赖图`（此时无任务，渲染空态说明 `dag.empty`），随后任务创建或切到有任务的会话（保持 `DagTab` 挂载不卸载），DAG SVG 以 `scale(1)` 全尺寸绘制而不跟随侧栏宽度自适应缩放；
2. **多窗格 `DagPanel` 全局 `<marker>` ID 冲突**：两个窗格（分栏/浮出叠加）同时渲染 `DagPanel` 时共享固定 `id="wk-arrow-wait"` 与 `id="wk-arrow-done"`，卸载其中一个会破坏另一图层的箭头引用；
3. **`DeliverablesView` 隐藏筛选项导致死锁空态**：用户在成品目录选中 `台账外`（或 `未 present`）过滤按钮，当数据刷新后对应计数降至 `0` 时，该筛选按钮从工具条被隐藏（条件 `{counts.unledgered > 0}`），但内部 `filter` state 仍停在 `'unledgered'`，界面在仍有 `全部 N 份` 成品时显示「没有符合筛选的成品。」且用户看不到任何激活中的筛选标签。

## 运行面

- **面 = client**：
  - [company-panels.tsx](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L185-L240)（`DagPanel` 的 `useEffect(..., [hasNodes])` 与 `useId()` 隔离 `<marker>`）；
  - [DeliverablesTab.tsx](../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx#L136-L202)（`DeliverablesView` 派生 `activeFilter` 与归零回正 effect）。

## 复现

```sh
pnpm test tests/client/tabs/dag-panel.spec.ts tests/client/tabs/deliverables-tab-states.spec.ts
```

- 白盒复现用例 `H2`：`layout.nodes` 从 `[]` 更新为带 1 个 width=900 的节点后，`ResizeObserver.observe` 调用次数为 `0`，`.wk-dag-svg` 维持 `transform: scale(1)`；
- 白盒复现用例 `H8`：点击 `台账外` 后重传 `ledgered: true` 目录，`台账外` 按钮从 DOM 消失但界面持续显示 `没有符合筛选的成品。`。

## 根因与证据

1. [company-panels.tsx](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L188-L199) 将 `ResizeObserver` 挂在 `useEffect(..., [])` 中，而当 `layout.nodes.length === 0` 时第 199 行早退 `<StateNote>`，导致首次 effect 运行时 `fitRef.current === null` 直接退出，后续节点到来也不再重挂 observer。第 217–222 行使用硬编码字符串 ID，未使用 `useId()` 隔离作用域。
2. [DeliverablesTab.tsx](../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx#L176-L179) 动态隐藏零计数条件筛选项，却未在派生渲染或 effect 中将失效的 `activeFilter` 回退到 `'all'`。

## 失败类与同类排查

- **失败类**：条件早退使首轮 `useEffect(..., [])` 错过 DOM ref 附着；条件渲染移除了当前仍激活的状态切换入口。
- **同类排查**：[CultivationView.tsx](../../../packages/company-pack/src/client/cultivation/CultivationView.tsx#L73-L79) 通过 `useLayoutEffect` 对固定常驻容器 `splitRef` 挂载 observer，不受空子项早退影响。

## 已修判定

- `DagPanel` 在 `layout.nodes.length > 0`（或切换空/非空态及 container ref 可用时）可靠附着 `ResizeObserver` 测量宽度，并用 `useId()` 为 `<marker>` 生成实例唯一 ID；
- `DeliverablesView` 当当前选中条件筛选（`unledgered`/`unpresented`）按钮隐藏或计数归零时自动退回 `'all'`（或保留激活按钮并允许一键退出）。

## 修复证据

- 改动面：`packages/company-pack/src/client/tabs/company-panels.tsx`、`packages/company-pack/src/client/tabs/DeliverablesTab.tsx`、`tests/client/tabs/dag-panel.spec.ts`、`tests/client/tabs/deliverables-tab-states.spec.ts`
- 红：`pnpm test tests/client/tabs/dag-panel.spec.ts tests/client/tabs/deliverables-tab-states.spec.ts`（修前 2 个文件新增 BUG-395 负例均红：空图转非空后 `.wk-dag-svg` 维持 `scale(1)` 且双实例 `<marker>` id 同为 `#wk-arrow-wait`；`unledgered` 归零后仍渲染 `没有符合筛选的成品。`）
- 绿：`pnpm test tests/client/tabs/dag-panel.spec.ts tests/client/tabs/deliverables-tab-states.spec.ts`（2 files, 18/18 passed）
- 提交：commit e2337ab8
