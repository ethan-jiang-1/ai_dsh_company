# 2026-11-27 · BUG-407：`pre-push` 解耦真浏览器/真服务器车道、合并单次 Vitest 与快门禁提速

状态：implemented（2026-11-27 落地；用户批准方案 1）

> **部分取代**：[2026-11-13-test-asset-loop](./2026-11-13-test-asset-loop.md) 与 [2026-11-27-prepush-fast-path-and-test-budget](./2026-11-27-prepush-fast-path-and-test-budget.md) 第 3 项中「`git push` 热路径阻塞执行 `client-load`/`preset`/`replay` 真入口面，且 `vitest related` 与 `targeted` 拆成两次独立冷启」由本决定取代。

上游 = 用户 2026-11-27 针对真实 push 仍耗时 3m21s 要求换位反思并立案 [BUG-407](../../_backlog/_archive/fixed_bugs/BUG-407-prepush-serial-pipeline-duplicate-vitest-and-double-web-boot.md)，随后显式批准推荐的方案 1。

## 决定

1. **`.githooks/pre-push` 定位于「100% 免浏览器 / 免 `DSH_HOME` 的秒级确定性安全网」**：
   - 将需要启动真实 `dsh` Web 服务器与 headless Chromium 的三条 surface lane（`client-load` / `preset` / `replay`）从 `git push` 阻塞热路径解耦；
   - `checks/pre-push-surfaces.mjs --exec-plan` 仍保留 `SURFACE_RULES` 全集分类与 `unseen` fail-closed（BUG-199），命中真入口面时输出清晰的非阻塞收口提醒（`source run/env.sh && pnpm smoke:surface`），不再因本地环境或浏览器冷启卡死小步提交推送。
2. **真入口面归位「开发收口一键命令 + 发版前强制门」（并如实界定每周 CI 射程）**：
   - 根 `package.json` 新增 `pnpm smoke:surface`（`node checks/pre-push-surfaces.mjs --lanes-only`，支持 `--all`、`--paths` 及自动嗅探工作树 + 未推送提交 + 单提交仓安全退化），与 `docs/reference/commands.md`（已由 `50e64d4c` 同步登记）双向对齐；
   - `tools/release/release.mjs` `--verify` 补齐 `replay-smoke`（与已有 `client-load-smoke`、`preset-smoke` 构成全三项 `SURFACE_LANE_ASSETS` 强制兜底，由 `asset-lanes.spec.ts` 动态派生机械守卫）；
   - 如实边界：每周 CI（`.github/workflows/fresh-clone.yml` 的 `keyless-lane.mjs --ci`）覆盖 `replay`、`coverage:ratchet` 及全局通道 `channel-matrix`，`client-load`（需 `--browser`）与 `preset`（`ciSafe: false`）在 `--ci` 中显式跳过，故这两项的硬兜底在 `pnpm smoke:surface` 与 `pnpm release --verify`。
3. **消灭 `vitest related` + `vitest targeted` 双次冷启与倒挂**：
   - `tools/lib/core/asset-lanes.mjs` 新增纯函数 `planVitestRun({ existingRelated, expandedTargeted })`（阈值 `VITEST_FULL_FALLBACK_RELATED = 10` / `VITEST_FULL_FALLBACK_TARGETED = 20`），`checks/pre-push-surfaces.mjs` 先将目录型 targeted 展开为具体 `.spec.ts` 文件；
   - 保证每次 `git push` **最多启动一次 Vitest**：小改动合并进单次 `vitest related --run --passWithNoTests ...merged`（实证同时运行关联 spec 与显式 spec 且天然去重），改动面超阈值直接回退单次全量 `vitest run`（~29–38s 封顶，彻底消除双轮冷启 84.8s 倒挂全测 29.6s）。
4. **轻量检查保持遇红即停串行，`verify` 与 `preset.entry.mjs` 自身提速**：
   - 实测将 `typecheck` / `lint`（10 线程 oxlint）/ `dup` / `smoke:fast` / `test:checks`（3 并发）再包一层并发 3 反而因 CPU/IO 争抢从 ~15s 膨胀至 36.3s，故 Wave 1 保持干净串行遇红即停；
   - `tools/lib/core/markdown-links.mjs` 将 `MAX_AST_CACHE_ENTRIES` 提至 `4096` 并给 `checks/gates/link-debt.mjs` 补路径存在性缓存；`checks/gates/security-scan.mjs` 用原生 `crypto` git blob SHA-1 替代 34 次 `git hash-object` 子进程，并以 6 路异步并发替代 46 次串行自测/扫描子进程（`checks/run-gates.mjs` `await securityScan.run(ctx)`）；
   - `checks/lanes/preset.entry.mjs` 将 11 次 `session/create` 与 6 次 `skills/list` 改为 `Promise.all` 并发（保留「并发两会话创建不串」专测与稳定顺序日志输出），实测独立耗时由 10.80s 降至 **5.45s**。

## 输掉的方案

- **方案 2（保留 `client-load`/`preset`/`replay` 在 `git push` 内，仅靠共享 Web 与并发硬压耗时）**：仍让每次 `git push` 强耦合本地 `DSH_HOME`、前端构建产物与 Chromium，迫使开发者/agent 少推攒大包，且开发收口刚跑完真浏览器、推代码时又重复冷启，边际价值为零。
- **方案 3（`pre-push` 彻底去掉 `vitest`，只留 `verify` + `typecheck`/`lint`/`dup`）**：当前 `.github/workflows/ci.yml` 仅跑 `pnpm verify`、不跑 `pnpm test`（全量测试只在每周一 `fresh-clone.yml` 的 macOS runner 跑），在 CI 补齐每次 push 跑单测前放掉窄单测会让 AI agent 偶发遗漏单测的逻辑回归直入 `master`。
- **Wave 1 轻量步骤外层并发（实测否决）**：实测同机 23 提交大推下并发 3 把 `typecheck` 3s→28s、`lint` 3.5s→29.5s、`smoke:fast` 2.2s→19.5s（总计 36.3s vs 串行 14.7s），实证证伪后当场撤回。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | `pre-push` 免浏览器/免 `DSH_HOME` 边界、单次 Vitest 合并与全量回退阈值、`pnpm smoke:surface` 收口入口及 `release --verify` 全三项 surface lane 兜底 |
| 唯一入口 | `tools/lib/core/asset-lanes.mjs`（`planVitestRun`、`SURFACE_LANE_ASSETS`）、`checks/pre-push-surfaces.mjs`（`--exec-plan` / `--lanes-only`）、`.githooks/pre-push`、`package.json`（`smoke:surface`）、`tools/release/release.mjs`、`checks/gates/security-scan.mjs`、`checks/lanes/preset.entry.mjs` |
| 读载体 | `docs/testing.md` §5、`docs/guides/dev-loop.md` §5、`docs/reference/commands.md`、`tests/tools/lane-match.spec.ts`、`tests/repo/budget/asset-lanes.spec.ts`、`tests/checks/pre-push-surfaces.test.mjs` |
| 一致性判据 | `command-refs` 核对 `package.json` `smoke:surface` ↔ `docs/reference/commands.md` 双向对齐；`asset-lanes.spec.ts` 核对 `release.mjs` 覆盖全部 3 条 surface lane；`lane-match.spec.ts` 核对 `planVitestRun` 全分支；`pre-push-surfaces.test.mjs` 核对 `--exec-plan` / `--lanes-only` |

## 验证

实测前后对比（同一台 10 核 Mac）：
- 23 提交全命中大推 `checks/pre-push-surfaces.mjs --exec-plan`：181.91s → **53.52s**（降幅 **70.6%**；其中 Wave 1 五项 14.67s + 单次 `vitest full` 38.84s，彻底消灭 84.75s 双轮 Vitest 与 80.82s 真入口阻塞）；
- 日常单模块代码 push（`src/client/wiring/error-ring.ts`）：**14.17s**（`typecheck` 3.07s + `lint` 3.00s + `dup` 0.38s + `smoke:fast` 2.23s + 单次 `vitest related` 5.48s，零浏览器、零 `DSH_HOME` 依赖）；
- `checks/run-gates.mjs`（75 门）：10.31s → **9.20s**（`security-scan` 6 路异步 + 原生 SHA-1 全部 8+3 自测与 34 件冻结指纹 PASS）；
- `checks/lanes/preset.entry.mjs`（11 preset 真挂载）：10.80s（push 下 47.63s）→ **5.45s**（ALL PASS）。

| 层 | 失败类 | 实跑命令 | 负控（见过红）与结果 |
|---|---|---|---|
| keyless 单测 | 纯逻辑 / 配置组合 | `pnpm test tests/tools/lane-match.spec.ts tests/repo/budget/asset-lanes.spec.ts tests/tools/repo-markdown.spec.ts` | 核对 `planVitestRun` 全 5 种模式（`none`/`targeted`/`related`/`merged`/`full`）、`SURFACE_LANE_ASSETS`、`release.mjs` 三项 surface lane 兜底全绿 |
| 门禁自测 | 文档指针 / 纯逻辑 | `pnpm test:checks` | `pre-push-surfaces.test.mjs` 9/9 PASS：覆盖 `--exec-plan` 提示解耦、`merged`/`full` 规划、`--lanes-only --all`、单 commit 干净仓、无 upstream 多提交分支与 `unseen` fail-closed |
| 静态门 + 覆盖率棘轮 | 文档指针 / 性能 | `pnpm verify && pnpm typecheck && pnpm lint && pnpm dup && pnpm notes:audit && node checks/audit/coverage-ratchet.mjs --force` | 75 门全绿（含 `security-scan` 原生 SHA-1 漂移负控红→绿验证与 `command-refs` 双向对齐）；`bug-coverage` / `test-census` 生成物同步；`coverage-ratchet` 305/305 文件 PASS 零退步 |
| 真挂载真入口 | 配置组合 | `source run/env.sh && node checks/lanes/preset.entry.mjs` | 6 角色 + 5 support 并发建会话 + `并发两会话创建不串` + skills 隔离 + 模块闭包全部 PASS（5.45s） |

**盲审记录**（独立只读 `research` 子代理，输入集 = `docs/policy.md §P5`）：
1. 第 1 轮：BLOCKER 3（每周 CI 覆盖度口径夸大——`fresh-clone.yml --ci` 仅跑 `replay`、`client-load`/`preset` 显式跳过；`tests/README.md:44` 与 `checks/README.md:13` 等活文档未同步；`localSurfacePaths()` 单 commit 仓 `HEAD~1` 崩溃且无 upstream 多提交分支漏父提交面）+ SUGGESTION 5 → 全部逐项修复并补自测。
2. 第 2 轮：一轮 3 BLOCKER + 5 SUGGESTION 全部闭合；仅因 S-1 改写 `asset-lanes.spec.ts` 后未重刷两份生成物触发 BLOCKER 1（`bug-coverage.spec.ts` / `test-census.spec.ts` 漂移）+ 2 条旧注释建议 → 立即重刷 `tests/BUG-COVERAGE.generated.md` 与 `tests/CENSUS.generated.md` 并同步旧注释。
3. 第 3 轮：**BLOCKER: 0**（`bug-coverage`/`test-census`/`asset-lanes`/`lane-match` 39/39 PASS，75 门 `verify` 全绿）。

## 未覆盖轴

- [covered] `planVitestRun` 单次去重与回退阈值、`pre-push-surfaces` `--exec-plan`/`--lanes-only`（含单 commit 仓、无 upstream 多提交与 `unseen` fail-closed）、`release.mjs` 三项 surface lane 动态派生兜底 → `tests/tools/lane-match.spec.ts`、`tests/repo/budget/asset-lanes.spec.ts`、`tests/checks/pre-push-surfaces.test.mjs`
- [covered] `preset.entry.mjs` 并发建会话真挂载与 `security-scan.mjs` 6 路自测 + 原生 git blob SHA-1 指纹 → `checks/lanes/preset.entry.mjs`、`checks/gates/security-scan.mjs`
- [policy] 真浏览器/真服务器 surface lane（`client-load`/`preset`/`replay`）不再阻塞 `git push`，改由开发收口 `pnpm smoke:surface` 与发版前 `pnpm release --verify` 强制兜底（每周 CI 另覆盖 `replay`、`coverage:ratchet` 与 `channel-matrix`） → `docs/testing.md` §5
