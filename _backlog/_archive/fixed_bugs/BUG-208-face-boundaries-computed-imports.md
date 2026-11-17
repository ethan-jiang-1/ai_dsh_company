---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-208：face-boundaries 对计算型 import 不可见，checks/lib 与 probes/lib 又没有 tools/lib 那样的 keyless 图兜底

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— 3 blocker 已修（归档同批 / Note 一致 / 红证配方），S1–S4 已处置
>
> **关联**：[C12 归属波次探索卡](../../issues/2026-11-17-ownership-wave-exploratory.md)（C12-2 / N1）。
> **留痕**：批次 Note [2026-11-17-c12-ownership-wave-repairs](../../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)（本批共用）。

## 症状

归属波次的机械守卫 [face-boundaries.spec.ts](../../../tests/repo/structure/face-boundaries.spec.ts)
只消费 `parseKeylessImports()` 的 `imports`，不读同一解析器返回的 `unresolvedImports`：

- 计算型动态 import（`await import(['../../checks', 'lib/entry-probe.mjs'].join('/'))`）不会产生边；
- 该 spec 头注承认「不证明运行时通过动态字符串/非字面量路径拼接的依赖」，但合同同时写「本仓禁手搓裸路径」——
  两边没有机械交点；
- `tools/lib` 另有 [layering.spec.ts](../../../tests/repo/structure/layering.spec.ts) 的 `inspectKeylessGraph`
  兜底（且只允许 3 条已审阅的 markdown-links 表达式），但 `checks/lib`/`probes/lib` 没有同样的图守卫。

## 复现

在 `probes/lib/orient.mjs`（show 专属库，按规则不得 import judge）末尾注入一条计算型反向 import：

```sh
python3 - <<'PY'
from pathlib import Path
p = Path('probes/lib/orient.mjs')
p.write_text(p.read_text() + "\nconst _bypass = await import(['../../checks', 'lib/entry-probe.mjs'].join('/'))\n")
PY
pnpm exec vitest run tests/repo/structure/face-boundaries.spec.ts
git checkout -- probes/lib/orient.mjs
```

实测修复前 `Test Files 1 passed (1)` / `Tests 4 passed (4)`、`exit=0`；`layering.spec` 只扫 `tools/lib`，
不会看到这条 `probes/lib → checks/lib` 反向边。还原后 `git status` 干净。

## 根因与证据

- 根因：`face-boundaries.spec.ts` 的边构造只 `for (const { specifier } of parsed.imports)`；
  `unresolvedImports` 被丢弃。`parseKeylessImports` 的注释明确「Returned unresolved expressions are
  observations, not certified-safe dependencies」，但没有任何门禁把「观测到却未证明」变成红/白名单。
- `checks/lib`/`probes/lib` 不在 `layering.spec` 的 `libRoot = tools/lib` 扫描面；`face-boundaries` 是
  唯一的跨面判据，因此计算型边在这两个面完全无判据。
- 证据：上负控实跑；`parseKeylessImports` 源码；`face-boundaries` 的 `FORBIDDEN_EDGES`。
- 影响：一次「为了图方便」的 `join`/模板拼接即可绕过归属方向；这正是 BUG-186/205 同族的
  「守卫的判据面小于声称面」，只是这次是语法形式而不是目录面。

## 失败类与同类排查

**失败类 = 服务装配 / 依赖方向**（判据只覆盖字面量 import）。

同类：

- `tools/lib` 的计算型动态 import 由 `layering.spec` 的 `unresolvedImports.every(...)` 兜底；本卡不重复。
- `checks/lanes/replay.e2e.mjs` 的 built presence 动态 import 是已登记的构建产物路径，不是跨面依赖。
- `tools/lib/core/markdown-links.mjs` 的 3 条 parser 表达式是已审阅白名单。
- 注释里的 spec 路径缺口是另一条 → [BUG-205](BUG-205-live-pointer-faces-miss-moved-libs.md)。

## 已修判定

修成什么算修好：

1. `face-boundaries.spec.ts` 对 `checks/lib`、`checks/gates/lib`、`checks/lanes/lib`、`probes/lib`、`tests/support` 断言 `unresolvedImports` 为空；扫描面/边数仍非空。
2. 计算型动态 import（`.join`/模板/变量）不再隐身；`tools/lib` 的 3 条 vendor parser 表达式仍由 `layering.spec` 白名单管辖。
3. 最小负例（同一条命令）：`pnpm test tests/repo/structure/face-boundaries.spec.ts`——向 `probes/lib/orient.mjs` 注入 `await import([...].join('/'))` → 红；删除 → 绿。

## 修复方向（不授权，仅记录）

- 优先扩 `layering.spec` 的图守卫（已有 `inspectKeylessGraph` 与白名单机制），把 `checks/lib`/
  `probes/lib` 作为独立 root 跑；每面单独白名单，避免一个面的白名单给另一个面开后门。
- 或在 `face-boundaries` 里直接断言 `unresolvedImports` 为空并维护白名单；两处会重复，选一处。

## 修复证据

- 改动面：`tests/repo/structure/face-boundaries.spec.ts`
- 红：`pnpm test tests/repo/structure/face-boundaries.spec.ts`（同一条命令；红证注入配方见下一行）
- 红证（注入配方，非证据命令）：向 probes/lib/orient.mjs 末尾注入 `const _bypass = await import(["../../checks", "lib/entry-probe.mjs"].join("/"))` → 同一条 spec 红；删除 → 绿
- 红输出：`AssertionError: 计算型动态 import 不得绕过归属方向: expected [ Array(1) ] to deeply equal []`
- 绿：`pnpm test tests/repo/structure/face-boundaries.spec.ts`（修复后绿；日志 = `runtime/tmp/c12-fix/evidence/208-green.log`）
- 提交：commit eccd5f16
