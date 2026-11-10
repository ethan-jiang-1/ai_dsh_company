---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-064：business-software 成默认，CFO/COO/VP-Sales 方法仍是项目制

> 严重级别：P1（重要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note — [经营侧方法契约](../../../notes/implemented/2026-11-11-method-contract-type-facts.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E6

## 症状

- 默认产品类型已改为 `business-software`（[company.md](../../../packages/company-pack/content/state/company.md) 第 4 行），
  但三个经营角色的方法里**没有任何 business-software 术语**：
  E6 扫描 `SaaS|私有化|永久授权|订阅|ARR|CAC|churn|留存|SLO|tenant`，CFO/COO/VP-Sales 的
  skills + charters 全部 **0 命中**；硬件词（BOM/质保/认证/试产/返修/供应链/固件）也全部 **0 命中**。
- 命中的全是项目制假设：
  - [project-economics](../../../packages/company-pack/presets/cfo/skills/project-economics/SKILL.md)（第 9 行）：
    “合同额按里程碑拆收款曲线（公司惯例 3-4-3）；维护年费单列（≈ 项目额 15–20%）”。
  - [ops-feasibility](../../../packages/company-pack/presets/coo/skills/ops-feasibility/SKILL.md)（第 10 行）：
    “交付类工作必须走 SOW + 里程碑验收（UAT 通过才算数）”。
  - [vp-sales 章程](../../../packages/company-pack/content/charters/vp-sales.md)（第 12 行）：
    “项目按里程碑收款（3-4-3）”。
- 结果：一个 SaaS / 私有化 / 永久授权的 business-software 动议，CFO 仍按项目 3-4-3 + 维护年费算，
  COO 仍按 SOW/UAT 判承接，VP-Sales 仍按项目里程碑报价——**产品类型只改了文档链，没改经营模型**。

## 根因（假设）

产品类型目前只驱动 CMO/VP-Eng 的需求文档链（MRD/StRS/PRD + playbook）；CFO/COO/VP-Sales 的
方法 skill 是产品类型无关的单一套，且这套是项目制/SI 的形状。没有“类型 → 方法包”的映射，
也没有“该类型缺方法时 fail-closed”的闸门，于是默认类型换了，方法没换。

## 暴露的失败类

**类型切换不触达经营模型**：同一个词“产品类型”在研发侧决定文档链，在财务/运营/销售侧不生效。
同型检查：所有“类型相关”的方法（定价、交付、验收、成本、合规）是否都显式声明适用类型，
或缺类型时拒绝出结论。

## 复现

```sh
node _backlog/_archive/research/two-product-structure-audit/experiments/e6-method-coverage.mjs
```

- 输出矩阵：CFO/COO/VP-Sales 的 business-software 列全 0、hardware 列全 0、project 列有命中。
- 原始输出：[raw/e6.txt](../research/two-product-structure-audit/experiments/raw/e6.txt)

## 修复方向（未授权）

- **首选**：给 CFO/COO/VP-Sales 增加按类型的方法包——business-software 至少要有订阅/私有化/永久授权的
  收入确认、毛利口径、升级/回滚/SLA 验收；硬件类型至少要有 BOM/认证/质保/返修的成本与验收口径。
- **次选（更小）**：把现有方法显式标成“项目制/SI 专用”；business-software 动议在 CFO/COO 出结论前
  fail-closed，要求先加载对应类型的方法包，缺了报缺，不拿项目制口径硬算。
- 无论哪条，都要有“类型 → 方法”的单一映射与守卫，避免再出现“默认类型换了、方法没换”。

## 修复关联

未修。修复面 = `presets/cfo/skills/`、`presets/coo/skills/`、`presets/vp-sales/skills/`、
`content/charters/{cfo,coo,vp-sales}.md`，以及产品类型包的方法映射。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. 三个经营角色的每个 skill 都有 `方法契约`（适用产品类型 + 需要事实 + 缺则 fail-closed）；
   `method-contract` 门禁常驻 `pnpm verify`。
2. `project-economics` / `ops-feasibility` / `pricing` 明确只适用 `hardware-software`（项目制 / SI）；
   `business-software` 的 CFO/COO/VP-Sales 路径 fail-closed 报缺，不再套 3-4-3 / SOW / 维护年费。
3. 三个 workflow（cfo/ops/sales）都有“读动议产品类型 → 选方法 → 缺则 fail-closed”的分派步骤。
4. 反证：删契约 / 类型写 `nope` / 需要事实写未播种路径 / workflow 去掉 fail-closed → 门禁红；还原 → 绿。
5. E6 复跑：`business-software` 列不再是全 0 的静默默认；命中都在明确的“不适用 / fail-closed”句子里。

## 修复与验证

- 10 个经营侧 skill 全部加 `> **方法契约**`；三个 workflow 加类型分派；新增 `pricing` skill。
- `project-economics` / `ops-feasibility` / `pricing` 的 `适用产品类型 = hardware-software`；
  `business-software` 走 fail-closed（不套 3-4-3 / SOW / 维护年费）。
- 新门禁 `checks/gates/method-contract.mjs`：类型 id 解析、需要事实必须已播种、workflow 有分派。
- 红→绿：删契约 / 类型 nope / 事实 `kb/nope.md` / 删 workflow fail-closed → 红；还原 → PASS。
- `tests/presets/presets.spec.ts` 新增 3 条契约钉；`pnpm test` 174 files / 1458 tests；
  `preset-smoke` ALL PASS（含 pricing）。
- E6 复跑：business-software 命中只出现在“不适用 / fail-closed”句。
- 证据 = [Note](../../../notes/implemented/2026-11-11-method-contract-type-facts.md)「验证」节。
