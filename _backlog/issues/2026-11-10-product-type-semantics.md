---
status: 待落地
opened: 2026-11-10
---

# 推敲：产品类型语义——`b2b-saas` 太窄，`business-software` 怎么定

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：note — 实现后落 `notes/implemented/2026-11-10-business-software-product-type.md`。
>
> 上游研究：[产品类型模型](../research/org-coordination-topology/2026-11-10-product-type-model.md)（组织拓扑研究题的一份材料）。
> 本卡只决定「产品类型是什么、文档链是什么、要不要 `project-services`」；动议级路由另卡
> [动议级产品类型](2026-11-10-motion-product-type.md)。
>
> **已定（用户 2026-11-10）：** 名字用 `business-software`；`software` 太宽泛，不现在使用，保留给未来的
> 其他软件类型（命名空间留白）。链取 A：`MRD → StRS → PRD`；SaaS 作为交付模式附录，不另立需求层。

**问题与期望结果：** 用户 2026-11-10 指出 `b2b-saas`「太窄」。当前它把**交付模式（SaaS）**当成
**产品类型**：文档链是 `ROADMAP → US → RELEASE`，既进不了 `/prd check` 的 MRD/PRD 结构检查，也
进不了 `/req check` 的五层编号检查（后者遇到非五层只回一句「按 overview 自查」）。期望结果是：
定清楚「产品类型 = 工程学科」还是「产品类型 = 交付模式」；给出纯软类型的文档链、check-rules、
playbook 与命名；决定 `project-services` 是否同期补。本轮推敲完成 = 上述边界有结论、有验收口径，
能直接拆实施卡。

**当前情况：**

- 改名后的 `business-software/check-rules.json`：`layers = [MRD, StRS, PRD]`，
  `defaultLayers = [MRD, StRS, PRD]`，`files` 与三层一一对应
  （[`check-rules.json`](../../packages/company-pack/content/product-types/business-software/check-rules.json)）。
- `business-software/overview.md`：纯软/企业软件；SaaS / 私有化 / 永久授权是交付模式；
  明确「没有 SyRS/IRS/V&V」
  （[`overview.md`](../../packages/company-pack/content/product-types/business-software/overview.md)）。
- `product-definition` 的品类表已含 `business-software` reference
  （[`product-definition/SKILL.md`](../../packages/company-pack/presets/_shared/skills/product-definition/SKILL.md)）。
- `/prd check` 读 MRD/PRD JSON 账本；`business-software` 现在有 MRD/PRD/StRS 三层。
  （[`prd-command.ts`](../../packages/company-pack/src/host/commands/prd-command.ts)）。
- `/req check` 读 `company.md` 的 `productType`；非五层走“说明”分支
  （[`req-command.ts:49-62`](../../packages/company-pack/src/host/commands/req-command.ts)、
  [`:100`](../../packages/company-pack/src/host/commands/req-command.ts)）。
- `hardware-software` 是唯一「文档链 + 检查器 + playbook + 模板」都闭合的类型
  （[`requirements-model.md`](../../packages/company-pack/content/product-types/hardware-software/requirements-model.md)）。
- `project-services` 只有 `product-definition` reference，没有 `content/product-types/project-services/`；
  `content/templates/mrd.md` 的 JSON 示例还写着 `"productType": "project-services"`
  （[`mrd.md:17`](../../packages/company-pack/content/templates/mrd.md)），是悬空示例。

**未决问题：**

1. 纯软的链定 `MRD → StRS → PRD`，还是保留 `ROADMAP → US → RELEASE`？（建议前者，才能进现有 checker。）
2. SaaS 的 tenant/SLA/activation/retention 放 `overview` 子类，还是保留一个 `saas` 子类型？
3. `project-services` 本轮补第三类，还是等真实服务动议再补？
4. 旧 `b2b-saas` 部署怎么迁移：alias、启动报错提示，还是静默改名？
5. 纯软要不要独立的 `document-map.md` / `requirements-model.md`，还是复用共享模板 + 短 overview？

**下一步：** 名字已定；用户拍板 1–3。若选“收窄链”，立实施卡：改
`content/product-types/business-software/*`、`product-definition/references/business-software.md`、
`manifest.json`、tests/fixtures、docs；同时把 `b2b-saas` 的 SaaS 词表降为子类。动议级路由由
[另一卡](2026-11-10-motion-product-type.md)承接。

## 范围与排除项

- **在范围内**：产品类型语义、`business-software` 包的内容/文档链/check-rules、`product-definition`
  reference、命名与迁移、`project-services` 是否同期补。
- **排除**：`meta.md` 的动议级 `产品类型` 与 `/req check` 解析（另卡）；SA/SQA 方法包（另卡）；
  把 `b2b-saas` 直接改名的代码实施（本卡只做决定，未批准不动）。

## 已知与未决

- 已知：`b2b-saas` 的两条 checker 都进不去；`hardware-software` 的默认层到 PRD，可扩系统层。
- 未知：纯软动议在真实会话里是否会主动写 MRD/StRS/PRD（而不是 ROADMAP/US）；旧 `b2b-saas`
  部署数量与迁移成本（当前只有测试 fixture 与样例，未见真实部署）。

## 方案与取舍

名字已定 `business-software`；剩下的选择是**文档链**：

| 选项 | 做法 | 优点 | 代价 |
|---|---|---|---|
| **A 收窄链** | `business-software`；链 `MRD/StRS/PRD`；SaaS 词表降为 `overview` 子类 | 进入 `/prd check` + `/req check`；与硬软共脊柱；语义干净 | 要重写 overview/glossary/check-rules/manifest/tests；旧 SaaS 链需迁移 |
| B 保留 SaaS 链 | `business-software`；链仍 `ROADMAP/US/RELEASE` | 保留现有 SaaS 文档习惯 | 仍进不了两条 checker；名不副实；不推荐 |
| C 主链 + SaaS 交付文档 | 主链 `MRD/StRS/PRD`；SaaS 的 roadmap/release 作为交付模式附录，不进 `/req check` | 兼顾 SaaS 交付语义与机械检查 | 要定附录边界，避免第二套编号；复杂度中 |
| D 只改名 | `business-software`；链不动 | 改动最小 | 与 B 同类问题；不推荐 |

**建议 A**；如果 SaaS 交付文档确实需要保留，选 C（附录不算需求层，不立 REQ/IF/TC）。
`project-services` 作为后续第三类，不在本轮硬塞。

## 验收标准

- `content/product-types/business-software/` 含 `check-rules.json` / `overview.md` / `glossary.md` /
  `document-map.md` / `requirements-model.md`；`b2b-saas` 目录与活跃引用清零。
- `check-rules` 为 `layers/defaultLayers = [MRD, StRS, PRD]`，`files` 与层一一对应；`overview` ≤4096B。
- `product-definition` 的品类表含 `business-software` reference；`content/manifest.json` 列全新包；
  `content/templates/mrd.md` 示例用 `business-software`。
- `tests/content/product-types.spec.ts`、`tests/host/commands/req-command.spec.ts`、
  `tests/host/run-bundle/company-fixture.spec.ts` 绿；`business-software` 走五层 checker，
  `custom` 的 custom-layers 分支仍有覆盖。
- `pnpm verify`、`pnpm test`、`pnpm typecheck` 绿；改 `product-definition` skill 后跑 `preset-smoke`。
- Note 落 `notes/implemented/2026-11-10-business-software-product-type.md`；卡归档。

## 关闭条件

- 名字已定 `business-software`；选定文档链 A/B/C/D 中的一个，并写明 check-rules、playbook、迁移口径；
- 若选 A/C，写出实施验收：包内文件清单、`/prd check` + `/req check` 的 fixture、旧 `b2b-saas`
  迁移/alias 行为、文档更新点；
- 用户确认链的结论，卡顶补 `> **结论/去向**：...`，状态翻 `待落地`（带 `## 验收标准`）或 `已结`。

## 抽象度

- 换公司要改吗？→ **框架不会，内容会**。产品类型契约是通用的；具体公司有哪些类型、每类的
  overview/词表要按公司改。
- 换产品类型要改吗？→ **会**。新增类型就是新增一个 `product-types/<id>/` 包与 playbook reference；
  这正是本卡要定的扩展方式。
- 换做法要改吗？→ **不会**。这是内容层，不是 host 机制；改的是包内容与角色 playbook。
- 只有机制本身变才改吗？→ 不是；产品类型内容会随公司/业务变，所以放内容层，不进 preset persona。
- 第二消费者：`business-software` 的 CMO/VP-Eng/CEO 会话；未来 `project-services` 同构复用。
- 搬家成本：中（content product-type 包 + playbook + tests）。先具体到 `business-software`，
  不预先抽象出“类型 DSL”。
