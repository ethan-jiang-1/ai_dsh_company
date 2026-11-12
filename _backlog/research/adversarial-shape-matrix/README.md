---
status: 已定性
opened: 2026-11-13
---

# 对抗性边界矩阵与跨载体一致性 spec：测试资产怎么补

> 问题：测试资产为什么没拦住 66 个边界缺陷？要补什么样的资产，才能拦住下一批而不是再追一遍已知 bug？
> 消费者：用户 2026-11-13 点名研究（承上一轮 git 复盘）；落地卡 = [2026-11-13 P0](../../issues/2026-11-13-adversarial-shape-matrix-p0.md)。
> 产出的卡：[2026-11-13 对抗性边界矩阵 P0](../../issues/2026-11-13-adversarial-shape-matrix-p0.md)（待落地）。
> 结论：补三类资产 + 一道门禁——共享世界形状库、不变量矩阵（Safety / Agreement / Atomicity / Idempotence / Non-destruction / Convergence）、载体登记 + 门禁；P0 只覆盖 `company-root` / `safe-file` / `write-gate` 三个 choke point，不按 66 张卡逐张补测试。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-13-design.md](2026-11-13-design.md) | 形状轴、六类不变量、数据模型、spec 骨架、门禁设计、落地顺序与验收 | 2026-11-13 |
