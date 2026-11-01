---
status: 已结
opened: 2026-11-01
---

# 推敲：产品生命周期——安装、首启、升级、回滚、迁移、卸载、修复

> 立卡：2026-11-01 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：已结（2026-11-01）。install/first-run/upgrade/downgrade/rollback/backup/restore/move/uninstall/
> repair 均有实现与证据；运行中升级/坏安装/坏 profile 由 `upgrade-while-running-smoke`/`interrupted-install-smoke`
> 覆盖；`doctor` 只读检查。v1 边界：Web onboarding 另案。去向 = [v2 manifest Note](../../../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md)
> + `lifecycle-smoke`/`isolation-matrix-smoke`。

## 问题与期望结果

**问题**：插件即产品不只是“换个 profile + 把盘搬到 workspace”。产品从安装到卸载是一条状态机：
预检 → 安装 → 首启 → 日常 → 升级 → 降级/回滚 → 移动/改名 → 备份/恢复 → 卸载 → 修复。
当前仓只在“安装/首启/升级”的 happy path 上有脚本；降级、回滚、搬 workspace、恢复、卸载后的
清理、坏 manifest/stale lock/半安装的修复，多数只有文档口径或未测。没有这些，产品在真实用户
手里第一次升级/搬家就会坏。

**期望结果**：给出一条可执行、可回退、可诊断的生命周期合同：
1. 每个状态有入口/出口/持久副作用/失败模式/证据；
2. 升级/降级不静默覆盖用户改过的基部，不静默写更高 schema；
3. 搬 home/workspace 有明确步骤与失败提示（不靠 rebind）；
4. 备份/恢复分 business/full，恢复顺序与缺 sessions 的后果写清；
5. 卸载保留什么、彻底删什么写清；
6. 坏 manifest、stale lock、缺 workspace、半安装/半升级有 `doctor`/人工步骤，不静默重置。

**本轮判断完成的标志**：伞卡的 Q1–Q7 已拍板；本卡的「未决问题」已答；候选验收定稿并转
RFC/实施。**本卡不是实施授权。**

## 当前情况

- 生命周期主稿：[研究稿](../research/plugin-as-product/2026-11-01-product-lifecycle.md)
  （状态机、失败面、失败注入、测试矩阵）。
- 已有证据：`release-smoke`（真 tarball 安装/首启/二启）、`lifecycle-smoke`（升级/卸载/搬 home/
  business 恢复）、`external-workspace-smoke`（外部盘/搬 home）、`isolation-matrix-smoke`
  （落点/搬家）、`concurrent-home-smoke`（lease）。这些证明“现有 happy path”，不证明产品化后的
  `company` profile/`bundle.json` v2/`COMPANY.md` 碰撞/导出/无 consent 等新面。
- 现有文档教“装新 tgz + 重启、删 manifest 重建、rebind”；新形状下 rebind 退役、manifest 在
  workspace、方法/账本留 home，旧步骤部分失效（C：`docs/release.md`、`_dist/安装手册.md`）。
- 未测：升级中断、降级到更高 schema、workspace 搬移、恢复后 identity/方法/账本、profile 被
  `--from-default-profile` 替换、磁盘满/权限、运行中升级（C/U）。

## 未决问题

1. **v1 是否做 `doctor` / `repair` 命令？** 建议至少 `company doctor --check`（只读诊断 +
   下一步命令）；自动 repair 只做安全项（缺 pack、stale lock、重写 consent），不自动重建/
   替换 profile/manifest。
2. **升级前是否自动备份点？** 建议提示 + 复制 `bundle.json`/profile manifest 到 `.bak`，
   不做整 home 快照（隐私/成本）；用户要整机备份走 full。
3. **运行中升级是否明确不支持？** 建议 v1 明确“停 → 装 → 起”，不承诺热升级；文档写清。
4. **降级支持到什么程度？** 建议“旧 tarball + 旧数据可读”为底线；新 schema 不静默降级写，
   fail loud + 保留原文件；不承诺自动 down-migrate。
5. **失败注入进 CI 的范围？** 建议 keyless 覆盖坏 manifest/无 consent/搬盘/半安装；真 tarball
   的升级/卸载/恢复在 `lifecycle-smoke`；不把真模型/跨 OS 塞进 CI。

## 范围与排除项

**范围**
- 生命周期合同（状态机/失败面/证据）与 `doctor` 检查项；
- 升级/降级/回滚/移动/备份/恢复/卸载/修复的脚本与 smoke 扩展；
- 与 `bundle.json` v2、seed consent、`COMPANY.md` 碰撞、治理导出的交叉断言；
- 手册/README 的生命周期章节（与 [发布与文档卡](./2026-11-01-release-and-docs.md) 共写）。

**排除**
- 自动更新/自动下载（v1 不做；用户手动 `plugin add`）；
- 多租户/跨机器同步/HA；
- Windows/容器（继续 POSIX；不承诺）；
- Session 删除 API/物理删会话；
- 替用户决定数据保留期。

## 方案与取舍

| 选择 | 建议 | 输掉的方案 | 理由 |
|---|---|---|---|
| 生命周期载体 | 合同 + `doctor --check` + smoke | 只写文档 | 文档不能发现坏 manifest/半安装 |
| 升级前备份 | 提示 + manifest/profile `.bak` | 整 home 快照 / 不备份 | 隐私/成本；manifest/profile 是恢复关键 |
| 运行中升级 | 不支持，停→装→起 | 热升级 | vendor/产品都没有事务保证 |
| 降级 | 旧 tarball + 旧数据可读；更高 schema fail loud | 自动 down-migrate | schema 迁移不可逆，静默降级会写坏 |
| 搬 workspace | 重新登记 + 新会话；旧会话不可续 | 改 manifest/rebind | DSH 存绝对路径；rebind 已退役 |
| 修复 | 安全项自动、危险项人工 | 全自动 repair | 自动重置会丢身份/数据 |

## 验收标准

1. **升级**：v2 tarball 升 v3；未改基部替换、改过保留、扩张面不动；`bundle.json` v2 id/
   createdAt 保留、pack 版本前移；升级日志在 workspace；方法/账本/导出不被覆盖。
2. **降级**：装回 v2 + 重启；旧数据可读；更高 schema 的 manifest/ledger/records 不静默写；
   失败可见、原文件保留。
3. **中断**：安装/升级中途杀进程 → 重跑幂等或明确诊断；不把半安装当成功；不重复写 bundle。
4. **搬 home**：home 改名/移动 → 启动点名 stale 登记；profile `link:` 可重指/重装；workspace
   数据不动；旧会话不可续写清。
5. **搬 workspace**：workspace 改名/移动 → 新路径重新登记；`bundle.json` 跟随；旧 session cwd
   仍旧路径并提示；不自动改 DSH 存储。
6. **备份/恢复**：business = workspace + home 治理导出（或 methods/ledger）；恢复后公司盘/
   身份/方法/账本可读；sessions 不回来写清；full 搬移后 profile 依赖修复。
7. **卸载**：`plugin remove` 后 workspace/home 数据仍在；彻底删除清单明确；不误删。
8. **修复**：坏 `bundle.json`/stale lock/缺 workspace/半安装各有 `doctor` 输出与下一步；
   安全项可修，危险项不自动。
9. **文档**：手册/README 的生命周期章节与实现同 diff；旧步骤（rebind/删 manifest）标为迁移/
   历史，不作产品主路径。
10. **红/绿**：每条新判据有红→还原→绿原话；真 tarball 的升级/卸载/搬移在认证档 smoke。

## 实施回执（2026-11-01）

- ✅ 升级/降级/中断之外的恢复：`lifecycle-smoke`（v1→v2、改基部保留、降级、卸载、business 恢复、搬 home）。
- ✅ 搬 workspace：`isolation-matrix-smoke` 新 case（v2 id 不变）。
- ✅ 真实旧 home v1 迁移演练 T（id/createdAt 保留、旧文件 `.migrated-*`）。
- ✅ `doctor` 只读检查（home/profile/pack/workspace/consent/manifest/身份备份/settings/lease）。
- ✅ 运行中升级：`upgrade-while-running-smoke`（旧实例不崩、重启 0.5.1、旧 session/数据在）。
- ✅ 坏安装/坏 profile：`interrupted-install-smoke`（坏 tarball/缺文件/坏 package 后数据不丢、re-add 恢复）。
- v1 边界：Web onboarding 另案（终端启动器已覆盖）。

## 关闭条件

- 伞卡 Q1–Q7 已拍板；本卡「未决问题」已答；`## 验收标准` 定稿。
- 下游 RFC/实施申请已提交并记录去向（`rfc` / `implementation` / `用户（日期）`）。
- 满足后写 `可关闭：是`、卡顶补 `> **结论/去向**`，`git mv` 到
  [_archive/settled_issues](./README.md)，更新两边清单。

## 关联

- 伞卡：[插件即产品](2026-11-01-plugin-as-product.md)（Q1–Q7 是前置）
- 研究：[生命周期](../research/plugin-as-product/2026-11-01-product-lifecycle.md)、
  [信任/数据](../research/plugin-as-product/2026-11-01-trust-and-data.md)、
  [发布/验证](../research/plugin-as-product/2026-11-01-release-and-verification.md)
- 相邻卡：[workspace 与数据安全](2026-11-01-workspace-and-data-safety.md)、
  [发布与文档](./2026-11-01-release-and-docs.md)
