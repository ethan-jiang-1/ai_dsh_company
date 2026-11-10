# 2026-11-10 · 架构决策：repo 形态、组合层与角色=preset

状态：implemented（2026-11-10 由原 design/architecture 稿转为 Note；现行语义以 `contracts/` 与 `docs/architecture.md` 为准，本 Note 只留决定与理由）
上游 = [docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)（步 3：design/ → notes/ + architecture.md）

> 现行语义（canonical）= 文末链接；本 Note 只留决定/理由/证据，不复制现行表。

## 决定

- repo 形态 = Option A + 单 company pack；角色 = agent preset，不是插件包。
- 工具面归 preset 自包含；host/profile 层只放全局行。
- 协作通道 = A 命名委托 / B Agent Teams / C dsh-sdk / D workflow（D 只在 vp-eng）。
- KB 三载体；双 home；headless 不挂 preset，角色内容只在 Web 面生效。

## 输掉的方案

- N 个角色插件包；共享行放 host、preset 只放差异；自造调度器；自建数据库 / 记忆。

## 为什么

- DSH 的原生载体已经够用：package → bundle → profile/patch → agent preset；角色是 preset（组合），不是新插件，避免自造调度器/身份层。
- 一个 company pack 覆盖公司组合：host 共享行 + 六个角色 preset + 共享 KB/模板；只有真代码才拆包（FAQ 13）。
- 工具面必须逐 preset 自包含：DSH 无 patch 继承；R1 首跑漏了工具行，CEO 只拿到 10 个团队工具，读不了 CHARTER、写不出交付物。
- 协作按“隔离 vs 协作”选 A/B/C/D：没有单一机制同时给足独立组合与持续对话；不自造调度器。
- KB 按寿命分三载体；双 home 把开发态与日用态隔开；headless 不挂 preset，角色内容只在 Web 面生效。

## 证据 / 历史

- 完整原稿：`git show ab0fd622^:docs/design/architecture.md`（2026-11-10 迁移前）；本 Note 只留决定与理由，不复制现行表。
- 机制核对：vendor/dsh 钉住 tag 的 `packages/preset/*`、`subagent/*`、`experimental/agent-team/*`、`workflow/*`；R1 首跑证据与 R3 判定见原稿/相关 Note。
- 决策台账：[D1–D5/D7](../../docs/reference/decisions.md)。

## 现行语义（canonical）

- [docs/architecture.md](../../docs/architecture.md)（组合/地图）· [contracts/profile.md](../../docs/contracts/profile.md)（host 行）· [contracts/presets.md](../../docs/contracts/presets.md)（角色/四形态）· [contracts/delegation.md](../../docs/contracts/delegation.md)（通道/深度）· [runtime-map.md](../../docs/runtime-map.md)（时序/轴）。

## 相关

- 现行语义与地图：[docs/architecture.md](../../docs/architecture.md)；文档层规矩：[docs/AGENTS.md](../../docs/AGENTS.md)。
- 上游卡：[docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)。
