---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-062：默认 `productType=hardware-software` 与公司业务 / 机会清单相反

> 严重级别：P1（重要）｜发现：2026-11-11｜状态：已修
>
> **用户指令（2026-11-11）**：「_backlog/bugs 也发现了几个bug，你看一看，判断一下修的次序，我们把它都修好吧」——本句即本轮授权（材料性：presets/content/docs）。
>
> **留痕**：Note — [产品类型轴单一来源](../../../notes/implemented/2026-11-11-product-type-single-source.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E3

## 症状

- [company.md](../../../packages/company-pack/content/state/company.md)（第 4 行）的默认是 `productType: hardware-software`，
  正文还写明“出厂 = `hardware-software`”。
- [org.md](../../../packages/company-pack/content/state/org.md)（第 5 行）的公司业务是
  “软件开发 / 服务 / 系统集成”；交付条线的主力是 8 名 ERP/财务系统集成工程师
  （[org.md](../../../packages/company-pack/content/state/org.md)，第 60 行），编制里没有硬件 / 固件 / 认证 / 试产席位。
- [CMO 章程](../../../packages/company-pack/content/charters/cmo.md)（第 9 行）把“硬软一体产品”列为**可能的新机会方向**，
  不是当前业务。
- 按 `product-definition` 的回落规则，动议没写 `产品类型` 时用 `company.md` 的默认 ⇒ 首个动议会继承
  hardware-software 的 playbook（BOM / 认证 / 试产 / 供应链），而公司实际做的是软件 / 服务 / 系统集成。

## 根因（假设）

默认值是在 hardware-software 还是首个（或唯一）类型时定的；2026-11-10 新增 `business-software` 时
只加了类型包与 checker，没有回头校准 `company.md` 的默认，也没有把“默认类型应等于公司当前主业”
写成可核对的约束。样例公司的业务叙事与部署默认成了两份事实。

## 暴露的失败类

**默认值不随业务事实走**：部署配置里的默认值被当成常量，而不是“由公司业务派生、可被动议覆盖”的值。
同型检查：其他“默认值”（默认层、默认模板、默认 owner）是否也有类似的“新增类型后没回头校准”。

## 复现

```sh
node _backlog/_archive/research/two-product-structure-audit/experiments/e1-allowed-values.mjs
```

- E3 段输出：
  - `company.md productType: hardware-software`
  - `company.md > productType 决定加载哪份产品类型包…出厂 = hardware-software`
  - `org.md > 公司业务…三类业务 = 软件开发 / 服务 / 系统集成`
  - `cmo.md - 可能的新机会方向：…硬软一体产品…`
- 原始输出：[raw/e1.txt](../research/two-product-structure-audit/experiments/raw/e1.txt) 末节。

## 修复方向（未授权）

- 若样例公司继续代表“软件 / 服务 / 系统集成”，把默认改成 `business-software`（或把
  `project-services` 补成第三类后改成它），并让 CMO 的“新机会”与默认值不再互斥。
- 若 hardware-software 是刻意默认（例如演示硬件能力），则必须同步改 org.md / CMO 章程的业务叙事，
  否则“默认”和“公司是什么”仍是两份事实。
- 更稳的做法：**取消静默默认**，动议必须在 `meta.md` 显式写 `产品类型`；缺省时 fail-closed 提示选择，
  而不是继承一个可能与业务相反的类型。
- 加一条测试：默认类型必须有 `content/product-types/<id>/check-rules.json`；默认值与
  `company.md` / `org.md` 的业务叙事同 diff 审查（后者可人工复核，不必机械）。

## 修复关联

未修。修复面 = `content/state/company.md`、`content/state/org.md`、`content/charters/cmo.md`、
`presets/_shared/skills/product-definition/SKILL.md` 的回落规则、`content/templates/meta.md`。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. `content/state/company.md` 的 `productType` = `business-software`，正文「出厂 = …」与之一致；
   该默认解析到真实类型包。
2. 新动议无 `meta.md` 类型时的 `/req check` 回执显式点名来源
   （`company.md 默认，未在 meta 声明`），不再静默继承。
3. E3 复跑不再出现「默认 hardware-software / 业务 software」矛盾。
4. 门禁含「默认类型必须可解析」；反证实跑：把 company.md 的 productType 改成 `nope` → 红；
   还原 → 绿。
5. 不推翻 2026-11-10 的「`产品类型` 可选 + 回落」决定：旧动议仍绿，新动议靠回执可见。

## 修复与验证

- `content/state/company.md` 默认改 `business-software`，正文「出厂 = business-software（主业：软件 / 服务 / 系统集成）」；
  默认只兜底，项目制 / 集成是预留类型，向用户报缺。
- `/req check` 回执从静默改为括注：`动议类型 = X（meta.md）` /
  `动议类型 = X（company.md 默认，未在 meta 声明）`；spec 已断言回落回执。
- 门禁 `product-type-sources` 增「默认类型必须可解析」；反证：`company.md` 改 `nope` → 红；
  还原 → PASS。
- E3 复跑：`productType: business-software` + `出厂 = business-software` + org「软件 / 服务 / 系统集成」
  + CMO「新机会」不再互斥。
- 证据 = [Note](../../../notes/implemented/2026-11-11-product-type-single-source.md)「验证」节。
