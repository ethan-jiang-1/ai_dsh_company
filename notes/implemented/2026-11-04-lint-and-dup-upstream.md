# 2026-11-04 · 静态分析与重复检测：接上游 oxlint/jscpd

状态：implemented（2026-11-04；授权 = 用户令「setup goal 来推动落地」，计划先呈批；起因 = ub-mode 对照的 G1）

> 上游 = DSH 钉住基线 `vendor/dsh/package.json` 的 `lint`（oxlint 1.81.0）与 `duplication`（jscpd 5.1.2）。
> 本仓此前**既没接也没登记**（D13「沿用 DSH；偏离须登记」反例）。

## 决定

- **lint = oxlint 1.81.0，correctness 档 + `--deny-warnings`**，范围 `packages/company-pack/src` + `tests`。
  规则表住 `.oxlintrc.json`；`no-unused-vars` 对 `_` 前缀放行（vendor 同款）。
- **dup = jscpd 5.1.2，minLines 10 / minTokens 100 / mode mild / exit 1**，范围 `packages/company-pack/src` + `tools/lib`
  （drivers 在抽完 CDP 会话后同轮纳入）。范围与阈值住 `.jscpd.json` 的 `path`（单家）。
- 两者是 `package.json` 的 `lint` / `dup` 命令；**不进 `checks/gates/`**（P2：没有复发事故，gates 是要维护的代码）。
- 首轮读数：lint 19 条（15 error + 4 warn）→ **0/0**；dup 1 处 → **0**。

## 输掉的方案

- **直接搬 vendor `.oxlintrc.json` 全量**：override globs 是 `packages/*/*/src`（本仓是 `packages/company-pack/src` 两级，不匹配）；
  type-aware 段还要 `oxlint-tsgolint` + program 接线。搬过去会得到「规则很多、实际一条不跑」的假门禁。
- **`.mjs` 工具面一起 lint**：100 条（53 `no-unused-vars` + 42 `no-unused-expressions`）；后者多是 `a && b()` / 三元的
  **有意**写法，规则要先定型。进本轮会把门禁变成噪声。
- **jscpd 扫全工具面**：101 处 / 3.82% 行，绝大多数是一次性仪器（门禁/探针）的合理样板；范围放宽 = 判据失效。
- **做成 `verify` 门禁**：P2 不满足（无复发事故，且每加一门都是维护面）。
- **只写散文约定**：违反 D13/P5，vendor 已有现成载体。

## 走了两遍的坑（真证据）

第一版 ignore 写了 `**/lib/**`，本意是排构建产物，实际把 **`src/lib` 与 `tools/lib` 整棵树排掉**：
jscpd 的文件数从 61 掉到 42（9999 → 6616 行），lint 的 `no-control-regex` 也随之消失。
是「分析文件数/行数比预期少」暴露的——**门禁的覆盖面要读它自己的计数**。改成 `packages/company-pack/lib/**` 后：
lint 230 文件、dup 101 文件 / 14,692 行。

## 验证（实跑，2026-11-04 16:2x +08）

```text
pnpm -s lint   → 0 warnings / 0 errors（230 files，exit 0）
造红：把 instance-guard 的 if/else 改回三元 → Found 1 warning / exit 1；还原 → 0/0
pnpm -s dup    → 0 clones（101 files / 14,692 lines，exit 0）
造红：tools/lib/__dup-probe.mjs 复制 repository-layout 的 14 行块 → 1 clone（14 lines / 159 tokens）/ exit 1；删除 → 0
pnpm typecheck → exit 0（pack 两面 + tests 三面）
pnpm test      → 142 files / 1122 tests
pnpm verify    → ALL PASS（57 门，2 门无对象）
```

存储重构的局部判据：`tests/company/cultivation-maintenance.spec.ts` + `revoke-journal.spec.ts` 9 例绿
（`resolveMethodDir` 抽出前后同一份断言；读/删共用一条路径阶梯）。

## 边界与触发

- 不覆盖 `.mjs` 工具面（触发 = 一次真实缺陷归因到未使用变量/误用表达式，或 `.mjs` 重构轮）；
  type-aware 档（触发 = 一次 floating-promise 类缺陷）；`reportUnusedDisableDirectives` 暂关
  （现有 `eslint-disable` 指向未启用的 react-hooks，重开与 react 插件一起评估）。
- 复杂度读数 / 变异测试：触发写进 [testing.md §6](../../docs/testing.md)。
- pre-push 接线在 Commit C（接线后 `--no-verify` 仍是逃生门，理由纪律不变）。

## 取代

无。这是新增质量面，不取代任何既有 Note。G5（攻前提）/ G6（第一性重设计）本轮不做：
本仓已有「同类第二次 → 立卡/升门禁」触发器与整片 revert 纪律，再加通用散文规则的维护成本高于收益（D34/D36 的教训）。
