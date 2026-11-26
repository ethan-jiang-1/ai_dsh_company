---
status: 已定性
opened: 2026-11-26
---

# dsh-native-ux-feasibility：不魔改前提下利用 DSH 原生能力的 UX/UI 可行性探索

> 问题：在不改 `vendor/dsh`、不魔改 DSH 壳层内部结构、且未来 DSH 升级能自然继承上游能力的前提下，哪些 DSH 原生扩展面可支撑梦之队 UX/UI 升级，哪些现存脆弱债应同步清退，以及如何通过低成本实验逐项验证边界？
> 消费者：[2026-11-26-dsh-native-ux-upgrade](../../settled_issues/2026-11-26-dsh-native-ux-upgrade.md)
> 产出的卡：[2026-11-26-dsh-native-ux-upgrade](../../settled_issues/2026-11-26-dsh-native-ux-upgrade.md)
> 结论：已通过源码审计与 E1–E4 真机/无头实验全部定性——零改动 `vendor/dsh` 下，12 项 UX 能力可通过 `L0`/`L1` 官方契约稳定落地并彻底清退 `[data-composer-seat]` / `dockkit` / `CultivationChatPanel` 脆弱债，拆为 S1–S4 四波渐进实施并已产出自含 `/goal` 驱动 Issue 卡。
> 归档：2026-11-26

## 调研原则（升级安全红线）

1. **零 `vendor/` 改动**：严格遵守本仓 `vendor` 只读铁律，所有扩展完全落在 `packages/company-pack/` 内。
2. **只走官方契约面**：通过 `SlotMap`、`ctx.sidebarRightTabs`、`ctx.resources`、`ctx.shortcuts`、`ctx.inputTriggers`、`ctx.uiConversation`、`PLATFORM_MODULES` 与 `--dsw-alias-*` 令牌接入，不依赖壳层私有 DOM / CSS 属性。
3. **协同透传不劫持**：`chain`、`documentPreviews`、`toolview` 等多方竞争点必须保留上游默认项与后续新功能的生长空间，不独占通用入口。
4. **先证后改**：先在源码层面对齐契约与打包边界，再以小范围真机实验（E1–E4）实测运行时约束，之后再立项实施。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-26-dsh-extension-surface-feasibility.md](2026-11-26-dsh-extension-surface-feasibility.md) | DSH 扩展面源码级可行性与升级安全矩阵（L0–L3 分级、现存脆弱债盘点与最终定性总结） | 2026-11-26 |
| [2026-11-26-live-experiments-e1-e3.md](2026-11-26-live-experiments-e1-e3.md) | E1–E3 真机浏览器实验（`dsh --profile company` + Chromium）与 E2 无头 Chain 实证报告及踩坑约束 | 2026-11-26 |
| [2026-11-26-gates-and-migration-map-e4.md](2026-11-26-gates-and-migration-map-e4.md) | E4 现存门禁/单测/`ui.expected.json`/探针影响盘点与 S1–S4 四波迁移路径图谱 | 2026-11-26 |
