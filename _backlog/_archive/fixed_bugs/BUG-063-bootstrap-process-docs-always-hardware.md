---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-063：fresh 盘恒播 hardware-software 编号合同，business-software 部署拿到五层硬软合同

> 严重级别：P1（重要）｜发现：2026-11-11｜状态：已修
>
> **用户指令（2026-11-11）**：「_backlog/bugs 也发现了几个bug，你看一看，判断一下修的次序，我们把它都修好吧」——本句即本轮授权（材料性：presets/content/docs）。
>
> **留痕**：Note — [产品类型轴单一来源](../../../notes/implemented/2026-11-11-product-type-single-source.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E4

## 症状

- fresh workspace 初始化后，`.dsh-company/kb/process-docs.md` 恒为
  `content/product-types/hardware-software/requirements-model.md` 的副本。
- 即使 `company.md` 写的是 `productType: business-software`，播种结果也与
  `hardware-software` **逐字节相同**：出现 `SyRS / IRS / V&V` 五层硬软合同。
- 后果：business-software 部署里，agent 读 `kb/process-docs.md` 会看到系统层与接口层；
  `/req check` 却按 `business-software` 的三层规则判——同一部署里“文档合同”和“机器规则”互相矛盾。

## 根因（假设）

`content/kb-setup/seed.json` 是一条静态清单，`process-docs.md` 的 source 固定写死为
`product-types/hardware-software/requirements-model.md`；`bootstrapCompanyWorkspace` 先按清单补文件，
不解析 `company.md` 的 `productType`，也没有“先播 company、再按类型选合同”的两阶段逻辑。
`seed-integrity` 只校验源存在 / target 唯一，不校验“播种内容与产品类型匹配”。

## 暴露的失败类

**类型无关的初始化**：安装时把某个类型的合同当成所有类型的默认合同。同型检查：
其他随类型变化的 seed（模板、术语、check-rules 的 workspace 副本）是否也被写死成单一类型。

## 复现

```sh
node --import tsx/esm _backlog/_archive/research/two-product-structure-audit/experiments/e4-bootstrap-seed.mjs
```

输出要点（完整见 raw）：

- 两个临时 workspace 仅 `company.md` 的 `productType` 不同：`business-software` / `hardware-software`
- 两者 `plan entry: source=product-types/hardware-software/requirements-model.md`
- 两者 `sha256` 相同（`7502db2644f99b28…`）
- 两者 `has hardware-software: true`、`has SyRS/IRS/V&V: true/true/true`
- 差分：`business == hardware: true`

原始输出：[raw/e4.txt](../research/two-product-structure-audit/experiments/raw/e4.txt)

## 修复方向（未授权）

- **两阶段播种**：先播 `company.md`，读其 `productType`，再决定 `process-docs.md` 的 source：
  `business-software` → 三层合同；`hardware-software` → 五层合同。
- 保持 only-fill：既有 `process-docs.md` 一个字节不覆盖（与现有 bootstrap 语义一致）。
- `productType` 缺失或未知时 fail-closed：不猜一个类型播种；回执点名缺什么。
- 测试：两个类型各跑一次 fresh bootstrap，断言层数/关键节不同；既有文件不被覆盖；
  `seed-integrity` 增加“process-docs 的 source 必须与 `product-types/<id>` 可解析”的形状检查。

## 修复关联

未修。修复面 = `content/kb-setup/seed.json`、`packages/company-pack/src/host/run-bundle/bootstrap.ts`、
`tests/host/run-bundle/bootstrap.spec.ts`、`checks/gates/seed-integrity.mjs`。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. fresh bootstrap：`company.md productType=business-software` → `kb/process-docs.md` 是三层合同；
   `hardware-software` → 五层合同；E4 差分 `business == hardware` 从 `true` 变 `false`。
2. only-fill 保持：既有 `process-docs.md` 一个字节不覆盖。
3. `productType` 缺失/未知时 fail-closed：不播种 `process-docs.md`，计划带 warning 点名缺什么；
   其余 seed 照常。
4. `seed-integrity` 增加：`process-docs.md` 的 source 必须含 `{productType}`；每个类型包都能
   解析到该 source；默认类型可解析。
5. bootstrap spec 覆盖两个类型 + 缺/未知 + only-fill；
   `pnpm test tests/host/run-bundle tests/harness/tools/kb-seeds.spec.ts` 绿。

## 修复与验证

- `content/kb-setup/seed.json`：process-docs source =
  `product-types/{productType}/requirements-model.md`。
- `bootstrap.ts`：`resolveCompanyProductType`（workspace `kb/company.md` > pack `state/company.md`）+
  `readSeeds` 解析占位；缺 / 未知类型 → 跳过该条 + `plan.warnings`，其余 seed 照常；only-fill 不变。
  `src/index.ts` 把 warnings 写日志；`tools/lib/kb-seeds.mjs` 同占位语义（缺 / 未知抛错）。
- `seed-integrity` 增三条守卫；反证：process-docs 写死 hardware → 红；删 business requirements-model
  → 红；默认 nope → 红；还原 → PASS。
- E4 复跑：`business == hardware: false`；business sha `fbbb32d3…` / hardware `7502db26…`。
- bootstrap spec 13 项覆盖两类型 + 缺 / 未知 + only-fill；kb-seeds spec 8 项覆盖类型 / 缺省 / 抛错。
- 证据 = [Note](../../../notes/implemented/2026-11-11-product-type-single-source.md)「验证」节。
