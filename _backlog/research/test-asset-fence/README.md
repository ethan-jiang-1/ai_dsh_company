---
status: 已定性
opened: 2026-11-13
---

# 测试资产围栏复核：慢资产出环之后，怎么防止它们在环外腐烂

> 问题：现有 242 个 spec / 32 个 smoke / 69 个 probe / 71 个 gate 里，哪些该更新、哪些该补快层、哪些该淘汰？怎样让默认迭代环只依赖秒级 unit/integration，同时不丢掉真安装 / 真进程 / 真浏览器 / 真模型才有的证据？
> 消费者：用户 2026-11-13 点名研究；后续落卡（issue/bug）与资产改动。
> 产出的卡：[2026-11-13-test-asset-fence-p0](../../_archive/settled_issues/2026-11-13-test-asset-fence-p0.md)（P0：两条红资产 + `smoke:fast`）
> 初步判断：围栏方向是对的（`pnpm test` 26s / 1997 tests；慢资产出环），真正的漏洞是「环外没有新鲜度回路」；「纯逻辑只住在驱动里」第二遍复核后只剩 `export-dist` 一个案例，且已降级为可选。
> 结论：围栏方向对；P0 = 修 `two-axis` / `replay` 新鲜度 / `candidate` 状态 + 6 条 `smoke:fast`；不拉回慢资产，A2/A4 不在本轮。
> 第二遍复核（2026-11-13）：两条红资产确认；U2 改首选 `--refresh`；A2 降级；A4 收窄；预算叙事（pre-push 旧读数 1.3s vs 实测 26s）也要更新。详见材料二 §8。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-13-asset-inventory-and-health.md](2026-11-13-asset-inventory-and-health.md) | 资产盘子、成本实测、环外资产的健康检查与两条红资产根因 | 2026-11-13 |
| [2026-11-13-fence-remediation.md](2026-11-13-fence-remediation.md) | 更新/补充/淘汰清单、围栏规则与优先级 | 2026-11-13 |
