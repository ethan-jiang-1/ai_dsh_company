---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-024：命令面失败后，那一行的「采纳」按钮消失（疑似 pending 卡死或行降级）

> 立卡：2026-10-18 ｜ 状态：已修 ｜ 发现：探索轴②（`probes/browser-visual/cultivation-ux-scenarios.mjs` S12 故障注入）
> 严重级别：P2（不损坏数据；但"失败之后连重试的入口都没了"= 人只能刷新页面，且看不出为什么）

## 症状

真浏览器，注入把 `commands/execute` 全部 abort（等价命令面断）：

1. 点「采纳」→ 行内**确实出现**「命令面不可达…」（这一半是对的，S12 首次跑 PASS 过）；
2. 但随后断言"行仍可操作"时，该行里**找不到「采纳」按钮了**（`count() === 0`）。
   **间歇性**（这是本卡最要紧的特征）：同日连跑三轮——PASS / FAIL / PASS；失败那轮在此点整条 S12 断掉，
   下一轮同样输入又全绿 ⇒ 不是"稳定坏"，更像**时序竞态**（失败后紧接一次重渲染/刷新，把按钮换成了别的态）。
   探针现已改成"遇到就记现场不判红"（见 S12 的 notes），所以它不再把这条间歇红冒充成常态。

## 两个待证假设（别当结论）

- **H1 pending 卡死**：`CultivationBoard.run()` 里 `setPendingId(key)` 之后若 `actions.run` **抛出**（而非按契约返回
  `{ok:false}`），后续 `setPendingId(null)` 不执行 ⇒ 按钮永久停在 disabled 的「处理中…」——按名字找「采纳」自然为 0。
  契约上 `makeCultivationActions.run` **永不抛**（内部 catch 全包），但"路由 abort"这条路径是否绕过了那层 catch 未证。
- **H2 行/面板降级**：失败后列表重渲染把该行挪走或整块降级（`records` 变 null ⇒ 行消失）。

## 复现

```sh
source run/env.sh && node probes/browser-visual/cultivation-ux-scenarios.mjs --shots
# S12；截图 runtime/human-exits-evidence/ux-scenarios/S12-command-face-down.png
```

## 结论（2026-10-18 当日修）：**H1 成立**——`run()` 的 pending 清理不在 `finally`

读码坐实（`CultivationBoard.tsx` 的 `run()` 原文）：

```ts
setPendingId(key)
const result = await actions.run(line)   // ← 这里抛错的话…
setPendingId(null)                       // ← …这行永远不执行 ⇒ 按钮永久 disabled + 文案「处理中…」
```

`makeCultivationActions.run` 契约上"永不抛"，但**连接层在断连/竞态下确实可能让 await 抛**（S12 的路由 abort 复现）
⇒ 按钮永久停在「处理中…」：**人连重试入口都没有**。间歇性也解释得通：只有走到抛错那条路径才复现。

**修**：`run()` 改成 `try { … } catch { 折成"面板内部出错…可重试"这一条显式结果 } finally { setPendingId(null) }`；
新增文案 `CULTIVATION_COPY.unexpected(reason)`（单一事实）+ 复用 `renderThrown`。

## 已修判定

- [x] S12 恢复硬判（去掉"已知缺陷档"）：**两轮连跑均 PASS**（第一轮硬判前先跑过一次绿、硬判后复跑绿），不再复现"按钮消失"。
- [x] 失败路径明确：抛错折成「面板内部出错（已收回按钮，可重试）：boom」，行内可见、按钮回到可用。
- [x] `finally` 收 pending + 交互档断言：「抛错 ⇒ pending 收回、按钮可再点、行内说清原因」（点第二次必须真的再发一次命令）。
