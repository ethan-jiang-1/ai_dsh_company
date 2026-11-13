# 2026-11-13 · 后缀 = lane：spec / e2e / entry / checks 四层对齐

状态：implemented（2026-11-13 落地）

上游 = 用户 2026-11-13 四行对齐表 +「一次做对」；卡 = [suffix-lane-alignment](../../_backlog/_archive/settled_issues/2026-11-13-suffix-lane-alignment.md)。

## 决定

1. **后缀是证据类型的唯一声明**：`*.spec.ts`（进程内，vitest）/ `*.e2e.mjs`（真进程，含 keyless process/built）/
   `*.entry.mjs`（真浏览器/真 profile/真 tarball）/ `tests/checks/*.test.mjs`（门禁自身）。
2. **唯一偏差：进程内保留 `.spec.ts`**。246 个类型化 spec 改 `.mjs` = 降级 JS 并丢掉 tests 的 tsc 面；
   DSH 原生该行也是 `.spec.ts`。后缀表达 lane，扩展名表达语言。
3. checks/smoke/（旧目录，已删） → `checks/lanes/`；29 个资产按证据类型改为 `.e2e.mjs`（5）/ `.entry.mjs`（24）；
   runner `fast-lane.mjs` / `keyless-lane.mjs` 留下；两条门禁自测 → `tests/checks/*.test.mjs`。
4. 四条命令：`test:spec` / `test:e2e` / `test:entry` / `test:checks`；`pnpm test` 保留兼容（= vitest）。
   `keyless-lane --suffix` 是 e2e/entry 的分派器；`test:checks` 由 `tools/run-check-tests.mjs` 发现执行。
5. 注册表加 `SUFFIX_BY_NAME` / `suffixOf()`；资产名 = base，文件 = `<name>.<suffix>.mjs`。census 冒烟 29。

## 输掉的方案

- **`.spec.mjs`**：会把类型化测试降级成 JS 且丢掉 tests 的 tsc 面；DSH 原生也是 `.spec.ts`。
- **保留 checks/smoke/（旧目录，已删） 只换后缀**：目录名继续撒谎（smoke 里住 e2e/entry/browser/tarball）。
- **把 e2e/entry 搬进 `tests/`**：撞 layering 守卫（tests 禁子进程/浏览器/密钥）。
- **沿用 `*-smoke` 兼容别名**：两套后缀 = 两套事实，正是本次要消灭的。

## 验证（实跑原话，2026-11-13）

| 判据 | 命令 | 原话 |
|---|---|---|
| 四层文件 | `ls checks/lanes` / `ls tests/checks` | 29 资产 + 2 runner；2 个 `.test.mjs` |
| spec | `pnpm test` | 246 files / 2018 tests passed |
| e2e 分派 | `keyless-lane --suffix e2e --list` | 5 条 |
| entry 分派 | `keyless-lane --suffix entry --list` | 11 条 weekly classic（browser/model 按 kind 不进） |
| 单条实跑 | `keyless-lane --ci --suffix e2e --filter company-root-process` | `1 PASS / 0 FAIL / 28 SKIP（0.44s）` |
| 门禁自测 | `pnpm test:checks` | `2 PASS / 0 FAIL` |
| 结构 | `pnpm verify` | ALL PASS（含 naming-contract、script-index、md-links） |

## 状态事实与载体

- 唯一入口：`tools/lib/asset-lanes.mjs`（资产 + `SUFFIX_BY_NAME`）、`checks/lanes/`（e2e/entry + runner）、
  `tests/checks/`（门禁自测）、`package.json` 四条命令。
- 门禁：`naming-contract` 改为 lanes/test.mjs 规则；`script-index`/`script-triggers` 识别新后缀。
- 读载体：tests/README（分层与命令）、checks/README、AGENTS 命令表。

## 未覆盖轴

- `.spec.ts` 未改 `.mjs`（见决定 2；如用户坚持，另开 TS→JS 迁移，会登记丢掉的类型面）。
- `test:entry` 全量实跑未做（分钟级、需真浏览器/真 profile/真 tarball）；本轮只证分派与单条 e2e。
- 历史研究/决策 Note 正文里的旧名（smoke/golden）作为历史叙述保留；活指针与命令已全部更新。
