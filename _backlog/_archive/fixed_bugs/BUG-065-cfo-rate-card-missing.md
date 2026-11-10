---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-065：CFO 的“费率基准”没有事实出处——org.md / CHARTER / policy-lines 都没有费率

> 严重级别：P1（重要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note — [经营侧方法契约](../../../notes/implemented/2026-11-11-method-contract-type-facts.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E7

## 症状

- [cfo-workflow](../../../packages/company-pack/presets/cfo/skills/cfo-workflow/SKILL.md)（第 10 行）说备料要读
  `.dsh-company/kb/org.md` 的“编制与**费率基准**”。
- [project-economics](../../../packages/company-pack/presets/cfo/skills/project-economics/SKILL.md)（第 10 行）说
  “人力按‘人·周’× 条线分摊（**编制与费率基准**见 `.dsh-company/kb/org.md` 与 `.dsh-company/kb/cfo/CHARTER.md`）”。
- 但事实搜索（E7）：
  - `org.md` 的“费率/rate/工资/成本基准”命中 **0**；它只有岗位人数。
  - `cfo.md` 的费率命中 **0**；它只有编制人数、SoD、免费人天个案口径。
  - `policy-lines.md` 的费率命中 **0**；它只有毛利/折扣/维护年费/预算/并行上限。
- 结果：CFO 按 skill 去读一个不存在的费率表。要么编一个费率，要么停在“未证明成立”，
  项目经济性测算（毛利签字线、垫资、人·周成本）无法可靠落数。

## 根因（假设）

`org.md` 的所有权是“编制（人数/岗位）”，不是“人力费率”；费率表在全仓没有家。
skill 把“编制”误写成“编制与费率基准”，把不存在的事实当成已存在。E7 的 0 命中说明这不是
“文档写得不清楚”，而是**引用的事实没有出处**。

## 暴露的失败类

**方法引用了不存在的事实**：skill 的输入契约写“去 X 读 Y”，但 X 里没有 Y。同型检查：
所有 skill 里的“见 <路径> 的 <字段>”是否都能解析到真实段落/字段，而不是只解析到文件。

## 复现

```sh
node _backlog/_archive/research/two-product-structure-audit/experiments/e7-evidence-gaps.mjs
```

输出要点：

- `org` 的费率命中 0；`cfo charter` 0；`policy` 0。
- `cfo-workflow` 与 `project-economics` 都点名“费率基准见 org.md / CHARTER”。
- 原始输出：[raw/e7.txt](../research/two-product-structure-audit/experiments/raw/e7.txt)

## 修复方向（未授权）

- **给出处**：在 `policy-lines.md` 或新的 `kb/rates.md` 里放可维护的费率卡（按条线/职级的
  人·周成本，标明币种、口径、有效期），并在 `org.md` 里只留指针；skill 改为读这个真实家。
- **或改口径**：如果费率是部署私有事实、pack 不应带，则把 skill 改为“先问费率，拿不到就用区间/
  上界并标【未证明成立】”，不再声称 org.md 有费率。
- **守卫**：skill 里的“见 X 的 Y”要么链到真实锚点，要么加一条测试/门禁抽查关键引用；
  至少不要让“编制与费率基准”这种复合名词混过去。

## 修复关联

未修。修复面 = `content/state/org.md`、`content/charters/cfo.md`、`content/company/policy-lines.md`、
`presets/cfo/skills/cfo-workflow/`、`presets/cfo/skills/project-economics/`。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. 费率有唯一出处：`content/company/rates.md`（seed → `kb/rates.md`），含条线 / 职级、币种、口径、有效期；
   出厂 `<待填>`，不编样例数字。
2. `cfo-workflow` / `project-economics` / `budget-check` 不再声称 org.md / CHARTER 有费率；改读 rates.md；
   `<待填>` = 配置缺口：先要费率，拿不到用区间 / 上界并标【未证明成立】，不编美元数。
3. `org.md` 只留指针；`policy-lines.md` 只放政策数字，不承担费率。
4. `method-contract` 检查 `需要事实 = kb/rates.md` 确实在 seed；`seed-integrity` / guide 已列。
5. 反证：删 rates seed / 把契约需要事实改成 `kb/nope.md` → 红；还原 → 绿。

## 修复与验证

- 新增 `content/company/rates.md` → seed `.dsh-company/kb/rates.md`；guide / manifest / skeleton /
  base-clean 同 diff 登记；出厂 `<待填>` + 口径模板。
- `cfo-workflow` / `project-economics` / `budget-check` 改读 rates.md；`<待填>` = 配置缺口，
  不编美元数；`org.md` / charter 只留指针。
- 门禁 `method-contract` 把 `需要事实 = kb/rates.md` 对到 seed；反证改成 `kb/nope.md` → 红；还原 → PASS。
- E7 复跑：`cfo-workflow` / `project-economics` 的“费率基准见 org.md/CHARTER” claim 消失
  （`claim: (no match)`）；`org.md` / `policy-lines.md` 的费率命中只在指针 / 不承担。
- `pnpm verify` ALL PASS；`seed-integrity` 17 条；`content-manifest` T1 2 / T2 23。
- 证据 = [Note](../../../notes/implemented/2026-11-11-method-contract-type-facts.md)「验证」节。
