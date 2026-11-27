# 2026-11-27 · BUG-406：pre-push 热路径按面收敛、全量测试并发上限与慢项根治

状态：implemented（2026-11-27 落地；用户批准方案 A）

> **部分取代**：[2026-11-13-test-asset-loop](./2026-11-13-test-asset-loop.md) 第 6 项（`coverage:ratchet` 不再无条件塞进 `.githooks/pre-push` 每次运行；下沉至 `pnpm release --verify`、每周 CI 与手动 `pnpm coverage:ratchet`）；[2026-11-18-release-docs-only-and-pre-push-budget](./2026-11-18-release-docs-only-and-pre-push-budget.md) 第 2 项（原 pre-push 46s 预算挂起与「输掉的方案：pre-push 去掉 coverage」因触发条件兑现由本决定取代）。另本决定第 3 项中「`pre-push` 阻塞执行真入口面与拆两次跑 `vitest related` + `targeted`」已于同日被 [2026-11-27-prepush-decouple-live-lanes-and-single-vitest](./2026-11-27-prepush-decouple-live-lanes-and-single-vitest.md) 进一步演进取代。

上游 = 用户 2026-11-27 指令修复 [BUG-406](../../_backlog/_archive/fixed_bugs/BUG-406-regression-coverage-prepush-cpu-saturation-and-timeouts.md) 并批准方案 A。

## 决定

1. **Vitest 运行底座设默认并发上限并切换 `threads` 池**：`vitest.config.ts` 启用 `pool: 'threads'` 与默认 `maxWorkers = clamp(floor(cpus/2), 2, 4)`（支持 `VITEST_MAX_WORKERS` 或 `--maxWorkers` 覆盖），消除 Vitest 4 默认 `forks` 池为 305 份 spec 反复派生 OS 进程、打满 10 核 CPU 触发 30s/90s 超时假红的根因。
2. **覆盖率棘轮下沉并加并发上限与同 `HEAD` 干净缓存复用**：`checks/audit/coverage-ratchet.mjs` 强制传入 `resolveCoverageWorkers` 上限，在工作树干净且 `HEAD` 与 `runtime/coverage-ratchet/` 缓存元数据（`cache-meta.json`）一致时复用上次 `coverage-summary.json`（`--force` 强制重跑；任何脏树改动绝不复用）。覆盖率棘轮从 `.githooks/pre-push` 移出，接进 `tools/release/release.mjs`（`--verify`）、`.github/workflows/fresh-clone.yml`（每周 CI）与阶段收口手动 `pnpm coverage:ratchet`。
3. **`.githooks/pre-push` 收敛为「无条件 `verify` + 按出站改动面精准分派」**：`tools/lib/core/asset-lanes.mjs` 将步骤拆分为 `UNCONDITIONAL_STEPS = ['verify']` 与 `SCOPED_STEPS = ['typecheck', 'lint', 'dup', 'smoke:fast', 'test:checks', 'test:spec']`，新增纯函数 `planPrePush(paths)` 由 `checks/pre-push-surfaces.mjs --exec-plan` 执行：
   - docs-only 变更仅跑无条件 `verify`（跳过 `typecheck` / `lint` / `dup` / `vitest`）；
   - 代码 / 测试 / 工具 / 门禁 / 探针变更仅跑受影响面检查 + `vitest related`（或定向 spec）+ 按面真入口；
   - `probes/**` 精准触发 `tests/repo/structure/entry-import-graph.spec.ts`，保持 BUG-206「真解析入口图」与 BUG-199 未分类面 fail-closed 承诺。
4. **系统根治慢门禁、慢单测、冷编译与浏览器硬 `sleep`**：
   - `checks/gates/fix-evidence.mjs` 以单次 `git log` 批量建 HEAD 祖先索引并缓存 `package.json`（消灭 ~800 次 `git` 子进程，仅未命中祖先索引时回落原 `cat-file`/浅克隆分支）；
   - `tools/lib/core/markdown-links.mjs` 加有界进程内 AST 缓存，`tools/lib/core/repo-markdown.mjs` 消除 `headingSections()` 双次 `mdast` 解析；
   - `checks/lib/company-static-audit.mjs` 为 `createVirtualProgram` 与 `loadTsProgram` 共享只读 `node_modules/**/*.d.ts` `SourceFile` 缓存；
   - `tools/lib/repo/asset-consumers.mjs` 增加大小写不敏感子串快速短路过滤；
   - `tests/host/contract/structure-agreement.spec.ts` 与 `tests/lib/docs/markdown-shape.property.spec.ts` 日常抽样收敛为 `60` 例 / `27` 组（覆盖全部语法分支、历史回归 seed=0/1/3 与 9 类故障 × 3 轮），全量 `1000` 例 / `90` 组保留在 `checks/lanes/generative.e2e.mjs`；
   - `tests/client/company-client-composition.spec.ts` 用微任务 flush 替代 40 次 `setTimeout(0)`；
   - 三个 `tsconfig.test-*.json` 开启 `incremental: true` 并把 `.tsbuildinfo` 重定向至 `runtime/tsc-cache/`（符合 `policy §P4`）；
   - `tools/repo/run-check-tests.mjs` 改为 3 并发有序汇总执行；`tests/support/content-worlds.mjs` 缓存 `package.json` 读取；
   - `checks/lanes/{client-load,multi-window-banner,client-error-chain}.entry.mjs` 与 `probes/browser-visual/cdp-probe.mjs` 用 DOM/状态条件等待替代固定 1.5s–12s 硬睡。

## 输掉的方案

- **方案 B（移出 coverage，改代码仍每次 pre-push 跑全量 `pnpm test`）**：即便全量 `pnpm test` 已优化至 ~30s，单行代码改动仍要重跑全部 305 份 spec，不符合快速高频 push 的最小面成本边界。
- **方案 C（仅限并发 + 提速，仍保留全量 `coverage:ratchet` 在每次 pre-push）**：每次新 commit 都会使 HEAD 缓存失效，每次 push 仍强制承受全量 V8 插桩与 305 份 spec 耗时，且与 `vitest.config.ts` 注释及 BUG-406 原则冲突。
- **提高 `testTimeout` 或整文件串行化**：属于 `docs/testing.md §3.5` 掩盖黑名单，未解决 CPU 过载与算法 O(N×M)/重复解析的真根因。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | Vitest 并发与池策略、覆盖率棘轮落点与缓存复用、pre-push 按面执行计划、以及核心门禁/测试性能基线 |
| 唯一入口 | `vitest.config.ts`、`tools/lib/core/asset-lanes.mjs`（`planPrePush`）、`checks/pre-push-surfaces.mjs`（`--exec-plan`）、`.githooks/pre-push`、`checks/audit/coverage-ratchet.mjs`、`checks/lib/coverage-baseline.mjs`、`tools/release/release.mjs` |
| 读载体 | `docs/testing.md` §5、`tests/README.md`、`tests/repo/budget/asset-lanes.spec.ts`、`tests/tools/lane-match.spec.ts`、`tests/tools/coverage-baseline.spec.ts` |
| 一致性判据 | `asset-lanes.spec.ts` 核对 `UNCONDITIONAL_STEPS`、`SCOPED_STEPS`、`coveredBy` 真实被 `planPrePush` 触发、`probes/**` 命中 `entry-import-graph.spec.ts` 且 `.githooks/pre-push` 不再调用 `coverage-ratchet.mjs` |

## 验证

实测前后对比（同一台 10 核 Mac）：
- 全量覆盖率棘轮 `node checks/audit/coverage-ratchet.mjs --force`：198.68s–357.23s（累计 CPU >1500s，多项超时假红）→ **35.03s**（累计 CPU ~105s，305/305 文件、2906+ 用例零超时，PASS）；
- 全量 keyless `pnpm test`：→ **29.56s**（305/305 文件 PASS）；
- `checks/run-gates.mjs`：28.95s → **10.31s**（其中 `fix-evidence` ~15s→0.24s、`backlog-liveness` 12.8s→0.70s、`link-debt` 15.9s→0.70s）；
- `pnpm typecheck`（热增量）：11.13s → **3.34s**；
- `pnpm test:checks`：21.45s → **5.75s**（11/11 PASS）；
- 前 6 大慢 spec（实测优化前 → 优化后）：`company-static-audit` 38.4s → <4s、`company-client-composition` 31.4s → 4.76s、`bug-coverage` 18.1s → 0.99s（覆盖率档 4.18s）、`test-census` 12.4s → 0.18s（覆盖率档 0.27s）、`structure-agreement` 6.0s → 0.25s、`markdown-shape.property` 1.2s（高并发 32.5s）→ 0.35s；六件合并墙钟 27.03s → 5.33s；
- 浏览器车道（真 Chromium 实跑）：`client-load` PASS、`multi-window-banner` ~30s → **7s** PASS、`client-error-chain` ~40s → **26s** PASS、`ui-scene --isolated --expected`（含 `cdp-probe`）~40s → **27s** PASS。

| 层 | 失败类 | 实跑命令 | 负控（见过红）与结果 |
|---|---|---|---|
| keyless 单测 | 性能 / 配置组合 | `pnpm test tests/tools/coverage-baseline.spec.ts tests/tools/lane-match.spec.ts tests/repo/budget/asset-lanes.spec.ts tests/tools/repo-markdown.spec.ts tests/tools/company-static-audit.spec.ts` | 负例：① 覆盖率棘轮初跑即报 `markdown-links.mjs` 96.98% < 97.43% 红，补缓存命中/禁写/清零测试后绿；② `coverage-baseline.spec.ts` 覆盖 dirty/force/HEAD 不匹配与 `summarySha256` 篡改全拒绝分支；③ `asset-lanes.spec.ts` 与 `lane-match.spec.ts` 核对 hook、`planPrePush`、fixtures、lib 与 README 规则全绿 |
| 门禁自测 + 分支变异 | 文档指针 | `pnpm test:checks` 与 `node checks/lanes/generative.e2e.mjs` | `fix-evidence.test.mjs` 增补 7 位短 SHA 与 merge 提交空 log 回落对账用例全绿；`gate-mutation.test.mjs` 对 `fix-evidence` 5 分支定向变异全杀；`pre-push-surfaces.test.mjs` 8/8 PASS；`generative.e2e.mjs` 1000 例 + 90 组 + 14 项变异 2s 全绿 |
| 覆盖率棘轮 | 纯逻辑 / 性能 | `node checks/audit/coverage-ratchet.mjs --force` | 305/305 文件全绿，0 FAILURE，`coverage-ratchet: PASS（242 文件）` |
| 静态门 / 类型 / lint / dup / fast | 文档指针 / 纯逻辑 | `pnpm verify && pnpm typecheck && pnpm lint && pnpm dup && pnpm smoke:fast && pnpm notes:audit` | `verify: ALL PASS`（75 门全绿，`fix-evidence ×244`、`surface-coverage ×2332`、`notes-supersession ×138`）；负例：`surface-coverage` 去掉 `src/**/README.md` 窄规则实跑红（`packages/company-pack/src/host/README.md（缺 smoke:fast/test:spec/typecheck）`），补回转绿；`notes-audit` 死路径 0 / 取代缺回链 0 / 状态行不符 0 |
| 真浏览器装配与场景冒烟 | client UI / 性能 | `source run/env.sh && node checks/lanes/{client-load,multi-window-banner,client-error-chain,ui-scene}.entry.mjs`（`ui-scene` 带 `--isolated --expected`） | 4 条真 Chromium 车道全部 PASS：`client-load` 3/3、`multi-window-banner` 7s、`client-error-chain` 26s（5/5）、`ui-scene --isolated --expected` 27s（`cdp-probe` 3 聚合页签 + 金样一致 + 0 错误环） |

**盲审记录**（独立只读 `research` 子代理，输入集 = `docs/policy.md §P5`）：
1. 第 1 轮：BLOCKER 5（`coverage-ratchet` 脏树覆写投毒缓存、`planPrePush` 漏 `tests/fixtures/**/*.md`/数据 JSON/`tools/lib` 入口图与删文件零测、`company-static-audit` `String(lang)` 常量键碰撞、`docs/guides/dev-loop.md` 活文档漂移、3 条浏览器车道未实跑且 `cdp-probe` 后台子树可见性判据缺失）+ SUGGESTION 7 → 逐项修复并补测/真浏览器实跑。
2. 第 2 轮：一轮 B1/B3/B4/B5 与 S1–S7 全清；新抓 BLOCKER 2（`tests/fixtures/**` 映射未对齐盘上 5 组真实消费者、`packages/company-pack/src/host/README.md` 在 `SURFACE_RULES` 与 `planPrePush` 间漂移）+ SUGGESTION 5 → 补齐 5 组夹具精确映射、调整 `src/**/README.md` 规则顺序并将全集 `coveredBy ↔ planPrePush` 一致性合入现有 `checks/gates/surface-coverage.mjs` 门禁（不增门禁文件，带真红→真绿负例留证），同时吸收全部 5 条建议。
3. 第 3 轮：**BLOCKER: 0**（全量核验 B1/B2/S1–S5 与 `surface-coverage` 门禁全部闭合；已顺手补齐 S-1 同 `target` 复用断言与 S-2 缓存淘汰断言）。

## 未覆盖轴

- [covered] Vitest 并发上限、同 `HEAD` + `summarySha256` 缓存复用判据与 `planPrePush` 按面规则 → `tests/tools/coverage-baseline.spec.ts`、`tests/tools/lane-match.spec.ts`、`tests/repo/budget/asset-lanes.spec.ts`、`tests/checks/pre-push-surfaces.test.mjs`
- [covered] `fix-evidence` 批量 git 索引（含 7 位短 SHA 与 merge 回落）与 5 分支拒绝语义 → `tests/checks/fix-evidence.test.mjs`、`tests/checks/gate-mutation.test.mjs`
- [covered] 4 条改写等待逻辑的浏览器车道与探针（`client-load`、`multi-window-banner`、`client-error-chain`、`ui-scene` + `cdp-probe`）均已真 Chromium 实跑 PASS → `checks/lanes/client-load.entry.mjs`、`checks/lanes/multi-window-banner.entry.mjs`、`checks/lanes/client-error-chain.entry.mjs`、`probes/browser-visual/cdp-probe.mjs`
- [policy] 全仓覆盖率棘轮在 `pre-push` 不再逐次触发，改由发布前 `release:verify`、每周 `fresh-clone.yml` CI 与阶段收口手动 `pnpm coverage:ratchet` 守底线 → `docs/testing.md`
