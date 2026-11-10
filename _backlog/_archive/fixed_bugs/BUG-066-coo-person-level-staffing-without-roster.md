---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-066：COO 要求“列到人”，但没有 seat 级名册；fresh 盘会误判“没人”

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note — [经营侧方法契约](../../../notes/implemented/2026-11-11-method-contract-type-facts.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E7

## 症状

- [ops-feasibility](../../../packages/company-pack/presets/coo/skills/ops-feasibility/SKILL.md)（第 9 行）要求：
  “每项工作量列到人——具体到‘8 人编制里谁、每周几小时’；**写不出人名 = ‘没人’，直接判‘接不住’**。”
- 但 [org.md](../../../packages/company-pack/content/state/org.md)（第 60 行）只有岗位数：
  “系统集成工程师 | 8 | ERP/财务集成 4 + 业务系统集成 4”，**没有 8 个人的名字**。
- [owners.md](../../../packages/company-pack/content/state/owners.md) 是部署起动件：角色归属表里 8 个 `<待填>`，
  且它映射的是“角色 → 物理人”（CEO/CFO/…），不是“8 名系统集成工程师 → 谁”。
- 结果：fresh 部署按 skill 执行时，COO 无法合法“列到人”——要么误判“没人 / 接不住”，
  要么编出人名。E7 显示 `owners 有真人名=false`、`<待填>=8`。

## 根因（假设）

把“编制里有 8 个席位”（org.md 的事实）与“这 8 个席位分别是谁”（seat 级名册）混成了同一个证据要求。
`owners.md` 只到角色级，没有 seat 级名册；skill 却把“写不出人名”直接判成“没人”，
没有区分“部署还没填名册”和“真的没有这个岗位”。

## 暴露的失败类

**证据要求与事实载体错位**：流程要求一个粒度（人），组织模型只提供另一个粒度（岗位数）。
同型检查：所有“列到人 / 具体到人 / 谁执行”的要求，是否都有 seat 级名册可读；
没有时是报“配置缺口”，还是直接判“没人”。

## 复现

```sh
node _backlog/_archive/research/two-product-structure-audit/experiments/e7-evidence-gaps.mjs
```

- `org` 有 8 名系统集成工程师的岗位行，无姓名。
- `owners` 的 `<待填>=8`；`owners 有真人名=false`。
- `ops-feasibility` 的 claim 行要求“8 人编制里谁、每周几小时”。
- 原始输出：[raw/e7.txt](../research/two-product-structure-audit/experiments/raw/e7.txt)

## 修复方向（未授权）

- **补载体**：在 run bundle 里增加 seat 级名册模板（角色/席位/姓名/投入比例/可承接项目），
  首启只补缺；`owners.md` 保留角色级授权面，两者分工写清。
- **改判据**：skill 区分三种状态——① 有名有分配 = 可承接；② 有席位但名册未填 = 配置缺口
  （报“待补名册”，不判“没人”）；③ 连席位都没有 = 真“没人/接不住”。
- **守卫**：fresh 盘的 `owners.md` / seat 名册含 `<待填>` 时，COO 结论必须标“配置缺口”，
  不能静默判“接不住”，也不能编人名。

## 修复关联

未修。修复面 = `content/state/owners.md`、`content/state/org.md`、`presets/coo/skills/ops-feasibility/`、
`content/kb-setup/seed.json`（若新增 seat 名册模板）。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. `content/state/roster.md`（seed → `kb/roster.md`）是席位级名册：席位 → 姓名 / 投入 / 可承接；
   `org.md` 管岗位数，`owners.md` 管角色授权，三者分工写清。
2. `ops-feasibility` 三态：有名有分配 = 可承接；有席位但名册 `<待填>` = 配置缺口（报「待补名册」，
   不判「没人」）；连席位都没有 = 真「没人 / 接不住」。不得编人名。
3. COO charter 指向 roster.md，`<待填>` = 配置缺口；workflow 备料读 roster。
4. `method-contract` 检查 `需要事实 = kb/roster.md` 已播种；presets spec 钉文案。
5. 反证：删 roster seed / 把契约需要事实改成 `kb/nope.md` → 红；还原 → 绿。

## 修复与验证

- 新增 `content/state/roster.md` → seed `.dsh-company/kb/roster.md`；guide / manifest / skeleton /
  base-clean 同 diff 登记；8 个系统集成席位 + 交付支撑席位，出厂 `<待填>`。
- `ops-feasibility` 改成三态（有名有分配 / 配置缺口 / 真没人）；COO charter 与 ops-workflow 指向 roster.md。
- 门禁 `method-contract` 把 `需要事实 = kb/roster.md` 对到 seed；反证改成 `kb/nope.md` → 红；还原 → PASS。
- `tests/presets` 钉住“配置缺口”与 roster.md，删除旧的“写不出人名 = 没人”断言。
- E7 复跑：`owners <待填>=8` 仍是部署状态；但 skill 不再把它判成“没人”，改为配置缺口。
- `pnpm verify` ALL PASS；`preset-smoke` ALL PASS。
- 证据 = [Note](../../../notes/implemented/2026-11-11-method-contract-type-facts.md)「验证」节。
