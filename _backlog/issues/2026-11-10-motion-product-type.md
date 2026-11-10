---
status: 待落地
opened: 2026-11-10
---

# 推敲：动议级产品类型——`meta.md` 声明 + `/req check` 解析

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：note — 实现后落 `notes/implemented/2026-11-10-motion-product-type.md`。
>
> 上游研究：[产品类型模型 §4](../research/org-coordination-topology/2026-11-10-product-type-model.md)；
> 组织拓扑 [README](../research/org-coordination-topology/README.md)。
> 前置：产品类型语义由[另一卡](2026-11-10-product-type-semantics.md)定；本卡只做“怎么按动议切换”。
>
> **已定（实现）：** `meta.md` 加 `产品类型`；`/req check` 解析顺序 = 动议 `meta.md` > `company.md`；
> `company.md` 只做公司默认，不逐动议改写；声明的类型不在盘上报错并列可用类型。

**问题与期望结果：** 用户 2026-11-10 提出：不固定公司默认类型；动议说硬软一体就用 `hardware-software`，
说纯软就用 `business-software`。当前 `company.md` 的 `productType` 是**部署级唯一来源**
（[`company.md:4`](../../packages/company-pack/content/state/company.md)），`/req check` 只读它
（[`req-command.ts:49-62`](../../packages/company-pack/src/host/commands/req-command.ts)），`meta.md`
只有 `需求层`、没有 `产品类型`（[`meta.md`](../../packages/company-pack/content/templates/meta.md)）。
期望结果：CEO 开局按用户声明记录类型；缺省回落公司默认；`/req check` 用对类型的 check-rules；
`company.md` 仍是公司身份，不被动议改写。推敲完成 = 字段形状、解析顺序、未知类型行为、迁移口径
写清，能直接拆实施卡。

**当前情况：**

- `company.md` 是公司身份（client 也读它显示公司信息，
  [`company-identity.ts`](../../packages/company-pack/src/client/data/company-identity.ts)）。
- `meta.md` 是动议户口，已有 `需求层`、`编号体系`；没有 `产品类型`。
- `/req check` 读 `company.md` → `product-types/<id>/check-rules.json`；未知类型返回 null，
  退到五层默认（[`req-command.ts:49-62`](../../packages/company-pack/src/host/commands/req-command.ts)）。
- `/prd check` 不读 `productType`；它认 MRD/PRD JSON，两种拟议类型都可以不读（见 product-type 材料 §4.3）。
- 角色侧 CEO 的 `assembling-the-team` 只说“按产品类型包的 owner/路由”，没有“开局记录类型”的步骤
  （[`assembling-the-team/SKILL.md`](../../packages/company-pack/presets/ceo/skills/assembling-the-team/SKILL.md)）。
- 测试 `tests/host/commands/req-command.spec.ts` 覆盖 `b2b-saas` 的 custom-layers 分支，但没有
  “meta 优先/回落”的用例。

**未决问题：**

1. `产品类型` 必填还是可选？建议可选 + 回落 `company.md`，旧动议不红。
2. 未知类型（meta 写了 `foo`）怎么处理：报错、回落、还是警告？建议报错并列出可用类型。
3. `meta.md` 的字段名用 `产品类型` 还是 `productType`？建议中文 `产品类型`，与 `需求层` 同风格；
   值用 kebab id。
4. 是否也允许 `drafts/ceo.md` 的派活行声明？建议只在 `meta.md`，一个家。
5. 多人类模式/根会话：产品类型由谁写？建议 CEO 门写；多人模式下 CEO 仍写 meta，各角色读。
6. 是否要在 UI 交付物卡片显示动议类型？可选，另卡。

**下一步：** 用户拍板 1–4；若做，实施面 = `meta.md` 模板 + `req-command.ts` 解析 + `tests/host/commands`
用例 + CEO/CMO/VP-Eng 角色指引 + 文档。名字已定 `business-software`；仍依赖语义卡定链/check-rules。

## 范围与排除项

- **在范围内**：`meta.md` 字段、解析顺序、回落、未知类型、校验器用例、CEO 开局记录/询问的合同。
- **排除**：产品类型内容/文档链（另卡）；SA/SQA 方法包（另卡）；COO/CFO 通道（另卡）；
  改 `company.md` 的语义（它是公司默认，不动）。

## 已知与未决

- 已知：`/req check` 是唯一读 `productType` 的 host 命令；`/prd check` 不需要它。
- 未知：真实会话里 CEO 会不会稳定地写 `meta.md` 的 `产品类型`（需要一次真模型探针）；
  旧动议的 `meta.md` 没有该字段，回落后是否会出现“公司默认与动议实际不符”的误判（需要迁移说明）。

## 方案与取舍

| 选项 | 做法 | 优点 | 代价 |
|---|---|---|---|
| **A meta 优先 + 回落** | `产品类型` 可选；`/req check` 先读 meta，再读 company | 兼容旧动议；不动公司身份；按动议切换 | 要改 host 命令 + 测试；CEO 要记得写 |
| B 必填 + 报错 | 新动议必须写；缺了红 | 类型永远明确 | 旧动议/模板迁移成本；可能挡住小动议 |
| C 只改 company.md | 每个动议前改公司默认 | 零 host 改动 | 污染公司身份；并发动议会互相踩；不推荐 |
| D 角色口头约定 | 只在 persona/skill 说按类型选 | 零代码 | checker 仍按公司默认；口径会漂；不推荐 |

**建议 A**。

## 验收标准

- `meta.md` 模板有 `产品类型:`；`/req check` 按「动议 meta > `company.md`」解析；未知类型报错并列可用类型；
  没有任何声明时回落五层默认。
- `tests/host/commands/req-command.spec.ts` 覆盖 meta 优先、company 回落、未知类型、模板占位 `<...>`、
  `business-software` 三层、`custom` custom-layers。
- `product-definition` / CEO `assembling-the-team` / `content/AGENTS.md` /
  `docs/guides/product-definition.md` / `packages/company-pack/README.md` 写清开局记录与解析顺序。
- `pnpm test tests/presets`、`pnpm verify`、`pnpm typecheck`、`preset-smoke` 绿；
  Note 落 `notes/implemented/2026-11-10-motion-product-type.md`；卡归档。

## 关闭条件

- 选定字段名、必填性、解析顺序、未知类型行为、迁移口径；
- 若做，写出实施验收：`meta` 优先/回落/未知类型三条 keyless 用例；`business-software` /
  `hardware-software` 两种类型各一条 `/req check` 预期；旧 `b2b-saas` 迁移/alias 行为一条；
  CEO 开局记录类型的合同；
- 用户确认结论，卡顶补 `> **结论/去向**：...`，状态翻 `待落地` 或 `已结`。

## 抽象度

- 换公司要改吗？→ **不会**；`meta.md` 字段与解析是机制，公司默认由 `company.md` 给。
- 换产品类型要改吗？→ **会**；新增类型要有 `check-rules.json` 与合法的 `产品类型` 值。
- 换做法要改吗？→ **不会**；这是 host/内容合同，不是角色方法。
- 只有机制本身变才改吗？→ 是；字段/解析属于机制面，放 host + 模板，不进 persona。
- 第二消费者：所有交付目录的 `/req check`；未来 `/prd check` 若需要也可以复用解析函数。
- 搬家成本：高（host 命令 + 模板 + 角色合同 + 测试）。值得第一天做对；不要先写进某个角色 skill
  再搬。
