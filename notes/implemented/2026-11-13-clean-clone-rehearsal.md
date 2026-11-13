# 2026-11-13 · 干净 clone 零到一复核：修掉两处「只在暖树绿」

状态：implemented（2026-11-13；验证见下）

上游 = 用户同轮「弥补gap…」+ 二评的 U1（干净 clone 构建）、U2（真页面）、probes 逐件审计。

## 问题

- **verify 的暖树假绿**：在临时目录的干净 clone（repo HEAD `3f9506f7` + 钉住 submodule）上装完跑 `pnpm verify`，3 处 `bare-path` 红：hooks 组、vendor 根级 `lib`、session-query 下的 tool-session-query。三处都只存在于 warm 树——它们是被 gitignore 的旧构建残壳，pin 源码树 `git ls-tree` 零命中；warm 树 verify 因此把「残壳」当成了事实。
- **test 的双 React**：同 clone 的 `pnpm test` 在 `tests/client/i18n/tab-copy.spec.ts` 报 `TypeError: Cannot read properties of null (reading 'useId')`。根因 = vendor 自己的安装落下第二份 react（bootstrap 的正规步），与根 `react-dom` 的 dispatcher 不同源；warm 树因为没有 vendor `node_modules` 才绿。

## 决定

1. **测试面 dedupe**：`vitest.config.ts` 加 `resolve.dedupe: ['react','react-dom']`。只影响测试解析，不改产品源码、不改构建、不删 vendor 安装。
2. **按源码真值改三处指针**：`_backlog/_archive/research/wiki-knowledge-map/` 的三份研究页把「事实」改成 clean clone 的 `git ls-tree` 复核；明确「warm 残壳 ≠ 源码」，且不写不存在的路径字面量（写了 bare-path 还会红）。
3. **证据落本 Note**：clean clone 链、真页面 10 页签金样、probes 逐件消费者三件证据都记在这里；release Note 的未覆盖轴改为指向本 Note。

## 输掉的方案

- **删 vendor 的 `node_modules` 让测试绿**：bootstrap 明确要 vendor 安装（vendor 自己的 lock 与 pi-ai/vite 版本）；删掉是绕过，不是修复。
- **给 vendor 的 react 加 pin/override**：同版本仍是两份实例，hooks 照样不同源；dedupe 才是测试面的正解。
- **把三处研究指针改成 warm 树绝对路径**：把机器状态写进研究页，换 clone 再红；应写源码真值。
- **跳过 tab-copy / 给 bare-path 加白名单**：把假绿固化。

## 状态事实与载体

- **修复提交**：`ea21dee7`（warm 树起点 `3f9506f7`）；`vitest.config.ts` 的 `resolve.dedupe`；三份研究页的修订行。
- **clean clone**：临时目录里的干净 clone，repo HEAD 从 `3f9506f7` pull 到 `ea21dee7`；submodule 从本机维护者的 deepseek-harness checkout init 到 `b830ec950faba0a46dda564be3e2d854afed94f1`（避免网络拉 submodule）。依赖用父仓 pnpm store（`--store-dir`）+ 网络补了至少一个包（react），**不是离线证明**。
- **真页面证据**：`snapshots/visual/company-shell/ui.expected.json`（10 页签金样）；本次证据目录落 `runtime/harness-home/diagnosis/`（gitignored）。
- **probes 审计**：`git ls-files probes` 70 件；69 件有 `checks/`、`tools/`、`tests/`、`snapshots/` 的可执行消费者；剩 1 件是 read-barrier 探针包的 manifest（被同目录探针以包形式加载）。0 死载体。

## 未覆盖轴

- clean clone 的 3 个 skip = `tests/lib/ledger.spec.ts` 的 dev-only 真台账用例（clean clone 无 dev 台账；skip-budget 已登记，属预期）。
- clean clone 不产出 `_dist` tarball（`pnpm setup` 不跑 export-dist）；READY 仍只对暖树成立（release 合同边界）。
- `npm publish` / `channel-matrix-smoke --channel all`（人工 handoff）。
- 浏览器的任意交互路径：本次是 10 页签 + 错误环 + 金样，不是全点击路径。

## 验证

| 命令 | 结果 |
|---|---|
| clean clone `pnpm install` / vendor install / `pnpm bundle:init` | 根 22.7s / vendor 10.8s / seed kb ×16；exit 0（有网络补包） |
| clean clone `pnpm setup` | exit 0（vendor host types → typert → client types → native → web → pack；约 5 分钟） |
| clean clone `node tools/setup.mjs --check` | `setup: 产物齐全（vendor CLI / client / web / pack）` |
| clean clone `pnpm verify`（修前） | `verify: 3 FAILURE(S)`：`bare-path` 三处（hooks 组 / vendor 根 lib / tool-session-query） |
| clean clone `pnpm test`（修前） | `1 failed / 241 passed`；`TypeError: Cannot read properties of null (reading 'useId')` @ tab-copy |
| clean clone `pnpm verify`（修后） | `verify: ALL PASS；3 门无对象（dist-freshness / replay-fixture-freshness / replay-ui-freshness）` |
| clean clone `pnpm test`（修后） | `242 passed (242)`；`1994 passed / 3 skipped (1997)`（3 skip = dev-only 台账） |
| warm tree `pnpm verify` / `pnpm test`（修后） | `ALL PASS` / `242 files / 1997 tests` |
| `node checks/lanes/ui-scene.entry.mjs --isolated --expected` | `ALL PASS（自起实例 + 全部公司页签 + 浏览器错误环零命中）`；`金样一致（10 个页签）` |
| probes 逐件审计（`git grep -l -F <path>`） | 69/70 有可执行消费者；1 件为探针包 manifest；0 死载体 |
