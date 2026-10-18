---
status: 调查中
severity: P2
opened: 2026-10-18
---

# BUG-024：命令面失败后，那一行的「采纳」按钮消失（疑似 pending 卡死或行降级）

> 立卡：2026-10-18 ｜ 状态：调查中 ｜ 发现：探索轴②（`probes/browser-visual/cultivation-ux-scenarios.mjs` S12 故障注入）
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

## 已修判定（待写：定位到 H1/H2 之后补）

- [ ] S12 恢复硬判并稳定 ALL PASS（连跑两轮不复现"按钮消失"）；
- [ ] 失败路径明确：要么按钮回到可用态（可重试），要么行内明说不可用原因；
- [ ] 若 H1 成立：`run()` 的 pending 清理放进 `finally`（并补一条"命令面抛异常时按钮回到可用"的交互档断言）。
