# 2026-11-10 · 产品类型：b2b-saas → business-software（MRD → StRS → PRD）

状态：implemented（2026-11-10 落地；验证见下）

上游 = [产品类型语义卡](../../_backlog/_archive/settled_issues/2026-11-10-product-type-semantics.md)；
证据 = [产品类型模型](../../_backlog/_archive/research/org-coordination-topology/2026-11-10-product-type-model.md)；
相关 = [产品定义指南](../../docs/guides/product-definition.md)。

## 问题

`b2b-saas` 是**交付模式**（订阅制/SaaS），却被当成**产品类型**：它的文档链是
`ROADMAP → US → RELEASE`，不进 `/prd check`（读 MRD/PRD JSON），也不进 `/req check`
（遇到非五层只回“按 overview 自查”）。用户 2026-11-10 说“太窄”，要求一个能覆盖纯软/企业软件、
又给未来其他软件类型留空间的名字。

## 决定

1. 产品类型 id = **`business-software`**；`software` 太宽，保留为未来上位命名空间，不现在使用。
2. 文档链 = **`MRD → StRS → PRD`**，到产品层为止；没有 SyRS/IRS/V&V。
   `check-rules.json` 的 `layers` / `defaultLayers` 都是 `[MRD, StRS, PRD]`。
3. SaaS / 私有化 / 永久授权是**交付模式**，写在 `overview.md` 与 PRD，不另立需求层、不另开 productType。
4. 旧的 `content/product-types/b2b-saas/` 目录改名为 `business-software/`；不保留 alias
   （当前盘上只有 fixture/样例，没有已知真实部署）。
5. `project-services` 仍是后续第三类（本轮不补）；服务/集成动议暂不套 `business-software`。
6. `product-definition` 增加 `references/business-software.md`；品类表加“纯软/企业软件”行。
7. 测试 fixture `beta-b2b-saas` 改名为 `beta-business-software`，`productType` 同步；
   custom-layers 分支保留一条合成 `custom` 测试，不再拿已退役类型当夹具。

## 输掉的方案

- **保留 `b2b-saas` / `ROADMAP-US-RELEASE`**：仍进不了两条 checker；名不副实。
- **`software`**：太宽，未来要加 `consumer-software` / `embedded-software` / `project-services` 时没有分层
  空间；用户明确否掉。
- **双链（SaaS 自己的 ROADMAP/US/RELEASE + 主链）**：两套编号/两套门，维护面大；SaaS 交付文档已降为
  `overview`/PRD 的交付模式附录。
- **只改目录名、链不动**：仍然没有机械校验；不解决根本问题。
- **恢复 `project-services` 同期补**：服务/集成没有真实动议，先留第三类，不在本轮硬塞。

## 后果

- `business-software` 与 `hardware-software` 共用 `MRD/StRS/PRD` 脊柱；硬软多出可选的 SyRS/IRS/V&V。
- `/prd check` 与 `/req check` 都能用于纯软；custom-layers 分支仍保留给未来的非五层类型。
- `content/manifest.json` / `mrd.md` 示例 / `product-definition` / 文档 / fixture / gate 正则同步。
- 旧 `b2b-saas` 活跃引用清零；历史 Note/研究/归档保留原文，不回填。

## 验证

- 已跑：`pnpm vitest run tests/content/product-types.spec.ts tests/host/commands/req-command.spec.ts tests/host/run-bundle/company-fixture.spec.ts tests/presets` → **9 files / 118 tests passed**。
- 已跑：`pnpm verify` → **ALL PASS**（含 `content-manifest` / `generic-clean` / `backlog-liveness` / `md-links`）。
- 已跑：`source run/env.sh && node checks/lanes/preset.entry.mjs` → **ALL PASS**（6 角色 + 5 support 全部真挂载；改 `product-definition` skill 后必跑）。
- 已跑：`pnpm test` → **170 files / 1409 tests passed**；`pnpm typecheck` → 绿（pack + 三套 tests）。
- 红形态：删 `business-software/check-rules.json` → `product-types` 文件在场红；把 `check-rules` 的层改成
  `ROADMAP` → `product-types` 自洽红；把 `business-software` 的 `productType` 改成 `b2b-saas` → 同名红。
