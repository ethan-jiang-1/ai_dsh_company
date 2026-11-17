---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-209：搬移后的两处 live 声明仍按旧树写：tests/README 的「lib → replay」与 lib-ownership Note 的库件数

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— 3 blocker 已修（归档同批 / Note 一致 / 红证配方），S1–S4 已处置
>
> **关联**：[C12 归属波次探索卡](../../issues/2026-11-17-ownership-wave-exploratory.md)（C12-6 / N4）。
> **留痕**：批次 Note [2026-11-17-c12-ownership-wave-repairs](../../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)（本批共用）。

## 症状

搬移后有两个 **live 声明**仍按旧树写，而且都不在任何机械判据的射程：

1. [tests/README.md](../../../tests/README.md) 第 44 行仍写 pre-push 面「…content → `replay-smoke`、
   `lib` → `replay-smoke`」。`SURFACE_RULES` 里只有
   `packages/company-pack/src/lib/**` → replay；`2450d0ef` 之后新出现的 `tools/lib/**` 走的是
   `coveredBy: test:checks / coverage:ratchet / verify`，**不会**触发 replay。读者把 `tools/lib`
   当「lib」会预期错的证据。
2. [lib-ownership-split Note](../../../notes/implemented/2026-11-17-lib-ownership-split.md) 第 31 行
   「`checks/lib/` 16 件 + 冻结 CI 套件；…测试专属 1 件」。实盘：
   - `checks/lib` 顶层 = 14 个 `.mjs` + 1 个 `.json` + `ci-security-gates/` 目录 = **16 个条目**，
     「16 件 + 冻结套件」把冻结套件算了两次；
   - `tests/support` 的测试专属模块 = `keyless-imports.mjs` 与 `mutation.mjs` **2 件**（`mutation`
     在 `e27a5318` 才迁入），「1 件」是迁移中途的旧值。

## 复现

```sh
# 1) 面规则实际返回什么
node --input-type=module -e "import { selectSurfaces } from './tools/lib/core/asset-lanes.mjs'; console.log(selectSurfaces(['tools/lib/core/asset-lanes.mjs']))"
# 2) 实盘计数
ls checks/lib/*.mjs | wc -l; ls checks/lib/*.json | wc -l; ls -d checks/lib/ci-security-gates
ls tests/support/keyless-imports.mjs tests/support/mutation.mjs
```

实测：`selectSurfaces` 返回 `coveredBy: ['test:checks','coverage:ratchet','verify']`，没有 replay；
`checks/lib` 为 14+1+1；`tests/support` 两件都存在。文档文字与实盘如上。

## 根因与证据

- 根因：两处都是**手写声明**；`tests/README.md` 的按面表没有被 `surface-coverage`/`asset-lanes` 逐行
  对账；Note 的件数没有生成器。`typecheck-coverage-claim` 只抓 `x/y spec`，`live-pointer` 只抓
  `tests/*.spec.ts`，都不覆盖这两类。
- 证据：上命令与文件行号；`SURFACE_RULES` 原文；`e27a5318` 把 `mutation`
  移入 `tests/support`，晚于 Note 的 2450d0ef）。
- 影响：读者/agent 会按错误的面期望跑 replay，或在盘点库时把冻结套件算两次；属于「声明与实盘
  不一致」的同类（BUG-191 是计数，本卡是面/件数）。

## 失败类与同类排查

**失败类 = 文档指针 / 手写声明无单一来源**。

同类：

- `tests/README.md` 第 44 行的面表其余项（client/presets/content）仍与 `SURFACE_RULES` 一致；
  只有「lib」在 split 后歧义。
- `checks/README.md` / `tools/README.md` 的库分组与实盘一致（本次复核）。
- `CENSUS`/`INDEX` 是生成物，不属于本卡。

## 已修判定

修成什么算修好：

1. `tests/README.md` 删除手抄面表（含 `lib → replay-smoke` 歧义句），只保留「规则与成员唯一家 = SURFACE_RULES」指针。
2. `lib-ownership-split` Note 删掉 `16 件` / `1 件` 等手写件数，改成结构口径（判据模块 + 基线 + 冻结套件；测试专属 = `tests/support` 的具名模块）。
3. 最小负例（同一条命令）：`pnpm test tests/repo/docs/live-declarations.spec.ts`——旧文本在场时红；改后绿。

## 修复证据

- 改动面：`tests/README.md`、`tests/repo/docs/live-declarations.spec.ts`
- 红：`pnpm test tests/repo/docs/live-declarations.spec.ts`（同一条命令；红证注入配方见下一行）
- 红证（注入配方，非证据命令）：把 tests/README 的 `lib → replay-smoke` 面表与 lib-ownership Note 的「16 件 + 冻结 CI 套件 / 测试专属 1 件」接回 → 同一条 spec 红；改回 → 绿
- 红输出：expected '# tests/ · keyless 回归的领域分区与导航…' not to contain 'lib → replay-smoke'
- 绿：`pnpm test tests/repo/docs/live-declarations.spec.ts`（修复后绿；日志 = `runtime/tmp/c12-fix/evidence/209-green.log`）
- 提交：commit eccd5f16
