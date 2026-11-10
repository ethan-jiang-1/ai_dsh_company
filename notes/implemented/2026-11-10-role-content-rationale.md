# 2026-11-10 · 角色内容决策：persona / skills / KB 的分工

状态：implemented（2026-11-10 由原 design/role-content-plan 稿转为 Note；现行角色语义 = `contracts/presets.md`）
上游 = [docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)（步 3：design/ → notes/ + architecture.md）

> 现行语义（canonical）= 文末链接；本 Note 只留决定/理由/证据，不复制现行表。

## 决定

- CEO 是个体，VP 是职能；persona 管是谁、skills 管怎么做、KB 管知道什么。
- 模板即流程；角色内容按 R2 + CMO 落地，逐角色清单已退役。

## 为什么

- persona 每个请求都进 context；可复用方法进 skills（按需加载），事实/历史进 KB（fs 读）——按 token 成本分层。
- 角色 skills 走 per-preset layer 硬隔离；公司手册/模板是 pack 只读内容，公司事实留 workspace（D17）。
- 模板即流程：写作类工作流的第一版是模板 + skill 指引，不写代码。

## 输掉的方案

- 把操作细节堆进 persona prefix（每请求计费、难复用）。
- 逐角色内容清单写进文档（D28：枚举家 = 实现自己；清单已退役）。
- 分身运行时自改 skill / 自动提升 journal（写隔离与质量门槛不过）。

## 证据 / 历史

- 完整原稿：`git show ab0fd622^:docs/design/role-content-plan.md`。
- 六角色内容随 R2 + CMO 落地；探针 = `checks/smoke/probe-smoke.mjs`；决策台账（D8/D17/D25/D43）= [decisions](../../docs/reference/decisions.md)。
- 逐角色清单已退役；本 Note 不复制清单。

## 现行语义（canonical）

- [contracts/presets.md](../../docs/contracts/presets.md)（角色语义/四形态）· [content/AGENTS.md](../../packages/company-pack/content/AGENTS.md)（公司手册）· [contracts/cultivation.md](../../docs/contracts/cultivation.md)（方法层）。

## 相关

- 现行语义与地图：[docs/architecture.md](../../docs/architecture.md)；文档层规矩：[docs/AGENTS.md](../../docs/AGENTS.md)。
- 上游卡：[docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)。
