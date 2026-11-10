---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-061：产品类型允许值多源——project-services 被 agent 面点名，checker 不认；CMO 章程漏 business-software

> 严重级别：P1（重要）｜发现：2026-11-11｜状态：已修
>
> **用户指令（2026-11-11）**：「_backlog/bugs 也发现了几个bug，你看一看，判断一下修的次序，我们把它都修好吧」——本句即本轮授权（材料性：presets/content/docs）。
>
> **留痕**：Note — [产品类型轴单一来源](../../../notes/implemented/2026-11-11-product-type-single-source.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E1/E2

## 症状

- `product-definition` skill 的品类表把“项目制 / 系统集成”列为可选类型，指向
  `references/project-services.md`；[CMO 章程](../../../packages/company-pack/content/charters/cmo.md)（第 10 行）的
  “品类 playbook”也点名 `project-services` / `hardware-software`，并漏掉唯一受支持的 `business-software`；
  [产品定义指南](../../../docs/guides/product-definition.md)（第 52 行）同样列三类。
- 但 `content/product-types/` 只有 `hardware-software` / `business-software` 两个包；
  [meta 模板](../../../packages/company-pack/content/templates/meta.md)（第 22 行）与
  [CEO 组队 skill](../../../packages/company-pack/presets/ceo/skills/assembling-the-team/SKILL.md)（第 56 行）
  只列两类；`/req check` 对 `project-services` 直接报错。
- 结果：CMO 照 skill 表选“项目制/系统集成”，CEO 照 meta 模板只写两类，checker 只认两类——
  同一套指令有三个答案。

## 根因（假设）

产品类型的**允许值**没有单一来源：机器面是 `content/product-types/*/check-rules.json`，agent 面是
skill 表、CMO 章程、模板与 docs 指南各自手写。新增/改名类型时没有一处“生成或校验允许值”的机制，
所以 agent 面可以合法地承诺一个机器面不存在的类型。

## 暴露的失败类

**宣告面 / 执行面分裂**（同 BUG-051/052 的“能力面两份事实”）：角色被告知“可以选 A”，机器只认 B。
同型检查：所有 agent 可读的类型清单（skill 表、charter、模板、docs）是否都能解析到
`content/product-types/<id>/check-rules.json`。

## 复现

```sh
node _backlog/_archive/research/two-product-structure-audit/experiments/e1-allowed-values.mjs
node --import tsx/esm _backlog/_archive/research/two-product-structure-audit/experiments/e2-req-check-project-services.mjs
```

- E1：`project-services` 在 skill/CMO/docs 为 `YES`，在 content 目录、meta、mrd、CEO skill、check-rules 为 `—`。
- E2：同一份 MRD/StRS/PRD，`business-software` → success；`project-services` →
  `未知产品类型「project-services」…可用类型：business-software / hardware-software`。
- 原始输出：[raw/e1.txt](../research/two-product-structure-audit/experiments/raw/e1.txt) ·
  [raw/e2.txt](../research/two-product-structure-audit/experiments/raw/e2.txt)

## 修复方向（未授权）

- **先定产品类型清单的唯一来源**：从 `content/product-types/*` 生成或校验 agent 面清单；不再手写第二套。
- **project-services 的定位二选一**：本轮就补 `content/product-types/project-services/`（check-rules +
  requirements-model + overview + templates），或在 skill/CMO/docs 明标“未来类型，当前未支持”，
  并从“可选”表移出直到随包发布。
- **CMO 章程同步**：playbook 列表至少包含 `business-software`，不允许漏掉受支持类型。
- **门禁**：agent 面出现 `hardware-software|business-software|project-services` 等类型 id 时，
  必须能在 `content/product-types/<id>/check-rules.json` 解析到；否则红。

## 修复关联

未修。修复面 = `presets/_shared/skills/product-definition/`、`content/charters/cmo.md`、
`content/templates/{meta,mrd}.md`、`presets/ceo/skills/assembling-the-team/`、`docs/guides/product-definition.md`、
`content/product-types/` 与对应门禁/test。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. **唯一枚举** = `content/product-types/*/` 目录；`product-definition` 品类表与目录一一对应
   （每个包一行、每行解析到真实包），不再有第二套手写清单。
2. 所有 agent 面（skill / CMO 章程 / meta+mrd 模板 / CEO skill / docs 指南 / 类型包正文）里
   **可被选为 `产品类型` 的 id** 都能解析到 `content/product-types/<id>/check-rules.json`；
   CMO 章程不再漏 `business-software`（改为指向唯一表）。
3. `project-services` 按 2026-11-10 决定保留为**未来类型**：从可选表移出，reference 标
   「未随包发布」；`/req check` 对它仍报未知类型（E2 复跑）。
4. 新门禁 `product-type-sources` 常驻 `pnpm verify`；反证实跑：把 project-services 行放回表 → 红；
   把 company.md 默认改成不存在的 id → 红；还原 → 绿。
5. E1/E2 复跑：E2 的 business-software = success、project-services = error；E1 的可选面
   不再出现 project-services（未来类型字样除外）。

## 修复与验证

- 允许值唯一来源 = `content/product-types/*/`；`product-definition` 品类表只列 hardware-software /
  business-software，CMO 章程 / meta+mrd 模板 / CEO skill / 产品定义指南改指针；
  `project-services` 从可选表移出，reference 标「未来类型（未随包发布）」。
- 新门禁 `checks/gates/product-type-sources.mjs`（接 `run-gates`）：品类表↔类型包双向对账、
  默认可解析、选值面 id 可解析、孤儿 reference 自报未来类型。
- 红→绿：修前门红原话（`品类表指向 project-services ... 不存在` / `孤儿 playbook ...` /
  `CMO 章程:10 ... 解析不到` / `docs/guides/product-definition.md:52 ...`）；三类反证
  （放回表 / 默认 nope / 删未来标记）→ 红，还原 → PASS。
- E1/E2 复跑：`project-services` 选值面全 `—`；`/req check` 对它仍 `kind: error`（可用 2 类）；
  business-software success。
- 证据 = [Note](../../../notes/implemented/2026-11-11-product-type-single-source.md)「验证」节。
