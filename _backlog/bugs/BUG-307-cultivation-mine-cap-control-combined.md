---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-307：「我提交的」两个子列表各折 5 条、控件却按合并总数——4+4 时 8 条全显示还挂「显示全部」

> 严重级别：P2（次要：控件看起来能收起/展开，但实际没有可折叠的内容；计数与实际隐藏数不一致）｜发现：2026-11-22（E2E 第四轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 8–10 个，别管那边怎么修」）。

## 症状

「我提交的 · 我已处理」块有两个子列表：`processedForViewer`（我拒绝的）与 `mine`（我提交的）。BUG-306 的修复给两个子列表**各自**套了 `capList('mine', …)`（各 5 条），但折叠控件的 `total` 用的是两者之和（`processed.length + mine.length`）。

于是：

- 4 条 processed + 4 条 mine：两边都 ≤5，**8 条全部渲染**；但总数 8 > 5，控件仍然出现「显示全部（共 8 条）」；点它没有任何新内容出现。
- 6 条 processed + 1 条 mine：收起时显示 5+1=6 条，控件说「共 7 条」；点开后只多出第 6 条 processed，计数与实际隐藏数（1）不一致。

## 运行面

- **面 = client**：`packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx` 的 `CultivationMine`；`use-cultivation-board.tsx` 的 `LIST_CAPS` / `capList` / `capControl`。
- 数据面 = `recordInbox(...).processedForViewer` / `.mine`。

## 复现

1. 隔离公司盘写 4 条 `targetRole: ceo, proposerRole: cfo, status: rejected`（processed）与 4 条 `targetRole: cfo, proposerRole: ceo, status: rejected`（mine）。
2. 以 CEO 会话打开「培养」→「我提交的 · 我已处理」。
3. 实测：8 条全部可见，同时出现「显示全部（共 8 条）」；点开/收起不改变可见条数。

纯代码等价：`capList('mine', 4 条)` 返回 4；`capList('mine', 4 条)` 返回 4；`capControl('mine', 4+4)` 因 8>5 返回控件。渲染面没有「合并后再切 5 条」。

## 根因与证据

`CultivationMine`：

```tsx
const processed = capList('mine', inbox.processedForViewer)  // 各 5
const mine = capList('mine', inbox.mine)                    // 各 5
...
{capControl('mine', inbox.processedForViewer.length + inbox.mine.length)} // 合并总数
```

- 两个子列表各自最多 5，合计最多 10；
- 控件的显示条件是「合并总数 > 5」，与「实际隐藏了多少」无关；
- 4+4 时没有任何一行被隐藏，控件却出现；6+1 时控件计数 7，但实际隐藏 1。
- `capList`/`capControl` 共用一个 `expandedLists.mine` 开关，也无法表达「先合并再切 5」的语义。

## 失败类与同类排查

**失败类 = 折叠上限与折叠控件计数不同源**（BUG-306 的修复只补了「接上 capList」，没统一「计数按什么集合」）。同类：

- `inbox`/`adopted` 是单列表，`capList` 与 `capControl` 用同一数组，计数自洽；
- `mine` 是唯一由两个子列表拼成的块，因此暴露了这个问题；
- 不是数据面问题：`recordInbox` 返回全量是正确的。

## 修复方案与范围

- **根因修法（二选一）**：
  - 把 processed + mine 先合并成一个数组，再整体 `capList('mine', combined)` / `capControl('mine', combined.length)`；渲染时按来源加标签区分；
  - 或保留两个子列表，但控件总数只统计「超过 5 的子列表里被隐藏的条数」，且没有隐藏时不渲染控件。
- **判据**：4+4 → 8 条可见且无控件；6+1 → 6 条可见 + 控件「共 7 条」（隐藏 1）；展开后 7 条；收起回 6；zh/en 同步。
- **不改**：`LIST_CAPS.mine=5` 的预算；其它两个列表。
- **材料性**：client 公开交互；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 控件出现 = 确实有行被折叠；控件计数 = 折叠前总数；点开/收起改变的行数 = 计数差；
- 4+4 组合不再出现「8 条全显示却有显示全部」；
- 6+1 / 0+7 / 7+0 三种组合各一条断言。
