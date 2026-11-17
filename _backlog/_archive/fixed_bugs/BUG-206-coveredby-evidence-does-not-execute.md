---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-206：coveredBy 只登记命令名，不证明该命令执行被覆盖的入口——probes/** / tools/** 的 pre-push 证据是空的

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— 3 blocker 已修（归档同批 / Note 一致 / 红证配方），S1–S4 已处置
>
> **关联**：[C12 归属波次探索卡](../../issues/2026-11-17-ownership-wave-exploratory.md)（C12-7 / N2/N6）。
> **留痕**：批次 Note [2026-11-17-c12-ownership-wave-repairs](../../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)（本批共用）。

## 症状

`tools/lib/core/asset-lanes.mjs` 的 `SURFACE_RULES` 对两个大面只写 `coveredBy`：

- `probes/**` → `coveredBy: ['verify']`，理由「探针与真模型档按头注手动跑」；
- `tools/**`、`checks/**` → `coveredBy: ['test:checks', 'coverage:ratchet', 'verify']`。

`checks/gates/surface-coverage.mjs` 只判「每条 tracked 路径有 asset 或 coveredBy 申报」，不判
「该步骤有没有加载/执行这条路径」。实测：给 `probes/analyze/explore-evidence-probe.mjs` 注入一条
不存在的 import，pre-push 仍说「命中 probes/**；证据 = 无条件 verify」，`pnpm verify` ALL PASS；
只有真的运行探针才 `ERR_MODULE_NOT_FOUND`。

## 复现

```sh
python3 - <<'PY'
from pathlib import Path
p = Path('probes/analyze/explore-evidence-probe.mjs')
p.write_text(p.read_text() + "\nimport './definitely-missing-helper.mjs'\n")
PY
node checks/pre-push-surfaces.mjs --dry-run --paths probes/analyze/explore-evidence-probe.mjs
node checks/run-gates.mjs
node probes/analyze/explore-evidence-probe.mjs --latest
git checkout -- probes/analyze/explore-evidence-probe.mjs
```

实测：pre-push `exit=0` 并打印「证据 = 无条件 verify」；`run-gates` `exit=0` / `verify: ALL PASS`；
探针 `exit=1` / `ERR_MODULE_NOT_FOUND`。同一形状适用于 `tools/dev/company.mjs` 等入口（verify 不加载它们）。

## 根因与证据

- 根因：`coveredBy` 是**声明**（`UNCONDITIONAL_STEPS` 里的词表），不是执行证据；
  `checks/gates/surface-coverage.mjs` 只对 `selectSurfaces()` 的 `unseen` 判红。`asset-lanes.spec.ts`
  只核对词表标签是 `package.json` 脚本，不核对脚本真的读/跑被改文件。
- 证据：上负控实跑；`SURFACE_RULES` 原文；`surface-coverage` 注释明确「本门只管不漏」。
- 影响：本波把 7 件探针搬进 `probes/analyze/`、把 63 个 lib 搬进 `tools/lib`，改这些路径的
  import 时 pre-push 可以全绿；只有 `smoke:all`（不在 hook）或人手动跑才会红。这正是 C11
  BUG-185 的同类（replay 的 built import 只在真入口炸），只是这次面更大、更便宜发现。

## 失败类与同类排查

**失败类 = 配置组合 / 验证面**（「有登记」≠「被执行」）。

同类：

- BUG-186 修过「面规则缺 src/lib/tools」；BUG-192 修过「未分类路径」；本卡是 inherited 的第三层：
  分类/申报齐了，但申报的步骤不执行。
- `probes/**` 的 `verify` 标签同时被 `asset-lanes.spec` 词表检查背书，造成「双重绿灯」。
- `tests/checks` 的 gate 自测（10 条）只测门禁，不测探针入口。
- 与 [BUG-205](BUG-205-live-pointer-faces-miss-moved-libs.md) 的「注释不扫」不同：本卡是
  **可执行入口不加载**。

## 已修判定

修成什么算修好：

1. 新增 `tests/repo/structure/entry-import-graph.spec.ts`：对 `tools/**`、`checks/**`、`probes/**` 的每个 `.mjs` 解析本地静态/字面量动态 import，目标必须是普通文件；扫描面与边数非空。
2. `SURFACE_RULES` 把 `probes/**` 从 docs 面拆出，`coveredBy` = `coverage:ratchet`（真跑该 spec）+ `verify`；why 写清「可解析 ≠ 运行时跑通」。
3. 最小负例（同一条命令）：`pnpm test tests/repo/structure/entry-import-graph.spec.ts`——向探针注入不存在 import → 红；删除 → 绿。

## 修复方向（不授权，仅记录）

- 加一个 keyless 的「入口 import 图」检查（静态解析即可）：对 `PROBES`/`ASSETS`/`tools` 入口逐条
  解析本地 import 并断言目标存在；成本秒级，可进 `verify` 或 `test:checks`。
- 或在 `surface-coverage` 里为 `coveredBy` 增加「执行证明」字段（例如该步骤的入口 import 面），
  没有证明就红；但这会把声明面扩得较大，需先写决定。

## 修复证据

- 改动面：`tests/repo/structure/entry-import-graph.spec.ts`、`tools/lib/core/asset-lanes.mjs`、`tests/repo/budget/asset-lanes.spec.ts`
- 红：`pnpm test tests/repo/structure/entry-import-graph.spec.ts`（同一条命令；红证注入配方见下一行）
- 红证（注入配方，非证据命令）：向 probes/analyze/explore-evidence-probe.mjs 末尾注入 `import './definitely-missing-helper.mjs'` → 同一条 spec 红；删除 → 绿
- 红输出：`AssertionError: 入口 import 指向不存在的本地目标: expected [ Array(1) ] to deeply equal []`
- 绿：`pnpm test tests/repo/structure/entry-import-graph.spec.ts`（修复后绿；日志 = `runtime/tmp/c12-fix/evidence/206-green.log`）
- 提交：commit eccd5f16
