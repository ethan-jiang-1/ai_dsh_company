# 2026-11-10 · UI 演示层决策：现成团队 UI + 公司皮肤

状态：implemented（2026-11-10 由原 design/ui-demo 稿转为 Note；现行 UI 语义以 `contracts/profile.md` 与 `packages/company-pack/src/README.md` 为准）
上游 = [docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)（步 3：design/ → notes/ + architecture.md）

> 现行语义（canonical）= 文末链接；本 Note 只留决定/理由/证据，不复制现行表。

## 决定

- 第 0 层用官方团队 UI（零代码）；公司皮肤层进本包 client 面；UI 不改变“一个包”。
- demo 分镜与验收归 `contracts/demo.md`；本 Note 只留 UI 层选择与机制依据。

## 为什么

- 官方 `client-ui-agent-team` 已覆盖会议/成员/任务板的主视觉；第 0 天不写 UI，避免把团队 UI 变成自维护产品。
- 公司差异只在品牌/皮肤层：slots + Remote 数据面进本包 client 面，host/client 同一个 npm 包；不新开 UI 包。
- 演示分镜与验收归 `contracts/demo.md` + `guides/demo-scenes.md`；本 Note 只解释 UI 层选择。

## 输掉的方案

- 第 0 天自写团队 UI / 社区任务板：重、和官方实验面重复；先借现成。
- 单独 UI 包 / 独立部署：发布与版本成本翻倍，收益不足。
- client 面直接读 session/team 内部状态：应走 Remote/projection，避免多源漂移。

## 证据 / 历史

- 完整原稿：`git show ab0fd622^:docs/design/ui-demo.md`。
- 官方范本逐行读过：`packages/experimental/client-ui-agent-team/`、`packages/client/ui-deliverables/`；呈现验证 = `cdp-probe` / `client-load-smoke`。
- 决策台账：[D6 / D22 / D44](../../docs/reference/decisions.md)。

## 现行语义（canonical）

- [contracts/profile.md](../../docs/contracts/profile.md)（host/client 行）· [src/README](../../packages/company-pack/src/README.md)（实现）· [contracts/demo.md](../../docs/contracts/demo.md) / [guides/demo-scenes.md](../../docs/guides/demo-scenes.md)（演示）。

## 相关

- 现行语义与地图：[docs/architecture.md](../../docs/architecture.md)；文档层规矩：[docs/AGENTS.md](../../docs/AGENTS.md)。
- 上游卡：[docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)。
