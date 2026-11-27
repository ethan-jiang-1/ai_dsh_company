# 2026-11-28 · 十三维接手就绪全绿收口与 0.11.11 发布认证（All-Green 13D Readiness Closure）

状态：implemented（2026-11-28 落地；批准：用户 `/goal` 授权按 13 维全绿推进蓝图执行 Wave 0 → Wave 6；决定号 = [D72](../../docs/decisions.md#d72)；取代已归档前序接手轮次收据 [2026-11-15-handoff-drift-repair](../archived/receipts/2026-11-15-handoff-drift-repair.md)、[2026-11-15-source-handoff-green](../archived/receipts/2026-11-15-source-handoff-green.md) 与 [2026-11-16-handoff-audit-gap-closure](../archived/receipts/2026-11-16-handoff-audit-gap-closure.md)）

## 决定

1. **Wave 1 · Per-Agent 双 Owner 生命周期原语与真 Cordis 夹具（`19562e6f`，消红维 3 · 硬化维 11）**：
   - 新增 [`packages/company-pack/src/host/run-bundle/for-each-agent.ts`](../../packages/company-pack/src/host/run-bundle/for-each-agent.ts)（`injectEachAgent`）：在 `agent/disposed` 与插件自身 `ctx.effect` 双侧幂等释放 Cordis fiber，对重复 `agent/created` 去重，并在插件挂载时立即遍历 `ctx.get('agents')?.list()` 补挂已在场活跃 agent。
   - 重构全部 9 个会话级 host 模块（`handbook.ts`、`startup-prompt.ts`、`delegation-contracts.ts`、`language-policy.ts`、`contracts.ts`、`delegation-control.ts`、`subagent-retry.ts`、`workflow-runs.ts`、`team-seat-guard.ts`）统一走 `injectEachAgent`，清零裸 `agent.ctx.inject`。
   - 新增真 Cordis 双层测试夹具 [`tests/support/cordis-agent-harness.ts`](../../tests/support/cordis-agent-harness.ts) 升级 [`tests/host/index/apply-lifecycle.spec.ts`](../../tests/host/index/apply-lifecycle.spec.ts)，并将 `R5:dual-owner-agent-inject` 与 `R5:no-fake-cordis-ctx` 两条静态规则并入既有 [`checks/lib/company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs)（不新建 gate 文件）。
2. **Wave 2 · 全量 Spec 接回 Typecheck 与开发内环守护（`90a953fe`，变绿维 8 & 7A）**：
   - 新增 [`tsconfig.test-vendor-bridge.json`](../../tsconfig.test-vendor-bridge.json)（继承 `vendor/dsh/tsconfig.base.json` 并通过 composite `references` 对接 `vendor/dsh/vendor/*`），清退原 `tsconfig.test-client.json`、`tsconfig.test-harness.json`、`tsconfig.test-company.json` 排除缺口，推翻前序「18 份混面 spec 结构性不进 tsc」旧结论；修平 5 份 spec 真实类型漂移，由 [`tests/repo/docs/typecheck-coverage-claim.spec.ts`](../../tests/repo/docs/typecheck-coverage-claim.spec.ts) 机械断言 100% `.spec.ts` 纳入 `pnpm typecheck`。
   - 根 [`package.json`](../../package.json) 新增 `"dev:pack"` 监听构建脚本并同步 [`docs/reference/commands.md`](../../docs/reference/commands.md)。
3. **Wave 3 · CI 真挂载闭环与 Keyless `company-pack` 回放场景（`936a1a53`，消红维 9 · 变绿维 7B & 11B）**：
   - [`tools/dev/company.mjs`](../../tools/dev/company.mjs) 新增 `--install-only` 与 `.build-fingerprint` 写入；升级 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)（补齐 `test:checks`/`typecheck`/`lint`/`dup`/`test` 及条件 macOS Chromium 真挂载 `preset.entry` + `client-load.entry`）与 [`.github/workflows/fresh-clone.yml`](../../.github/workflows/fresh-clone.yml)（`setup-macos` 装 Chromium 实跑 `preset.entry`、`client-load.entry`、`company-entry.entry`）。
   - 新增 [`snapshots/replay/company-handbook-smoke/snapshot.yml`](../../snapshots/replay/company-handbook-smoke/snapshot.yml)（`profile: web`、`agentPreset: ceo`、`llm-replay` 无 key 驱动真挂 `dsh-company-pack`），扩展 [`checks/lib/replay-fixture-freshness.mjs`](../../checks/lib/replay-fixture-freshness.mjs) 校验 v3 `system-prompt*.expected.md` 手册注入段，使 `replay-fixture-freshness` 从长期 `SKIP` 转为真跑 `PASS`。
4. **Wave 4 · 单源 137 条目包契约、三向依赖镜像、`engines.dsh` 收窄与 Setup/Zsh 引导（`8e653baa`，变绿维 2、4、12）**：
   - 收窄 [`packages/company-pack/package.json`](../../packages/company-pack/package.json) 的 `files` 为精确 3 份可达 `.d.ts`（并在 `cultivation.ts` 改用结构化 `subscribe` 签名消除内部类型外溢），使源包 `npm pack --dry-run` 与 `_dist` 完全同构（`137 == 137`）；在 [`packages/company-pack/scripts/prepack-check.mjs`](../../packages/company-pack/scripts/prepack-check.mjs) 与 `prepublishOnly` 增加无 `DSH_SANITIZED_PUBLISH=1` 时的裸 `npm publish` 硬拒锁；同步 [`checks/gates/pack-shape.mjs`](../../checks/gates/pack-shape.mjs)（并补齐漏接的 `pack-meta` 断言）。
   - 对齐 `src` 导入、组合行、`pack` 依赖与根 `devDependencies`（补齐 `@deepseek-ai/cordis` 及 6 个组合行 workspace 链接），将三向镜像校验并入 [`checks/gates/preset-row-deps.mjs`](../../checks/gates/preset-row-deps.mjs)。
   - 将 `engines.dsh` 收窄至已认证 minor 窗口 `>=0.2.1-rc.2 <0.2.2`；在 [`tools/dev/setup.mjs`](../../tools/dev/setup.mjs) 内置 `vendorTsc` 6GB 堆上限与 `--step` 单步排障参数；[`run/env.sh`](../../run/env.sh) 兼容 `bash` 与 `zsh`（`${BASH_SOURCE[0]:-${(%):-%x}}`）。
5. **Wave 5 · 角色总常驻预算、双语策略与诊断命令、权限围栏与孤岛清零（`8a5bc85e`，变绿维 5、6、10、13）**：
   - [`checks/gates/handbook-budget.mjs`](../../checks/gates/handbook-budget.mjs) 新增 `role-resident-budget`（纳入 T0 手册 + persona + skill 目录 + `plan-mode` + host 常驻 `workflow`/`delegation`/`language`/`startup-settings` 合成总常驻上限：角色 ≤ `23296B`、support ≤ `3686B`）；[`packages/company-pack/src/host/startup/startup-prompt.ts`](../../packages/company-pack/src/host/startup/startup-prompt.ts) 接入 `CompanyLanguage` 实现 `en` 纯英文输出，`ceo` `plan-mode` 增补语言跟随规则。
   - [`packages/company-pack/src/host/commands/client-diagnostics.ts`](../../packages/company-pack/src/host/commands/client-diagnostics.ts) 新增无参 / `status` 双语自检分支（汇总 `workspace`、数据闸门、`presetHealth.report()`、`cache/company` 体积与最近客户端错误）。
   - [`run/env.sh`](../../run/env.sh) 遇 Seatbelt 失败默认保持 fail-closed（须显式 `DSH_ALLOW_UNCONFINED_DEV=1` 才导出 `danger-full-access`）；[`packages/company-pack/content/AGENTS.md`](../../packages/company-pack/content/AGENTS.md) 修正第 34 行取证条款以遵守会话沙箱与审批策略；卸载文档与 [`probes/lib/orient.mjs`](../../probes/lib/orient.mjs) 补齐 `rm -rf <DSH_HOME>/cache/company`、`localStorage` 键前缀与 `> 100 MiB` 缓存告警。
   - 清退 [`tools/lib/core/asset-lanes.mjs`](../../tools/lib/core/asset-lanes.mjs) 恒空的 `lastRed` 死字段；3 篇前序接手轮次收据 `git mv` 至 `notes/archived/receipts/`，其余 24 篇活跃实现 Note 全部挂入对应 `docs/` 合同/指南与 `tests/README.md`，实现 `orphansAnyDoc = 0`。
6. **Wave 6 · `0.11.11` 全链路发布验收与 `READY` 盖章（`b4e67378`）**：
   - 执行 `pnpm release --bump patch` 升至 `0.11.11`，同步 [`CHANGELOG.md`](../../CHANGELOG.md)、[`market-index.json`](../../market-index.json)、[`market-index.staged.json`](../../market-index.staged.json)、[`_dist/安装手册.md`](../../_dist/安装手册.md) 与 [`docs/reference/package-catalog.generated.md`](../../docs/reference/package-catalog.generated.md)，跑通 `release --verify` 全部 8 项真入口及 `ui-scene --isolated --expected`、`channel-matrix --channel vendor`，最终 `--stamp` 并验出 `release: READY 0.11.11`。

## 输掉的方案

- **新建独立门禁或探针文件承载新规则**：`checks/gates/` 已处于 `75/75` 硬顶（`MAX_GATES = 75`、`MAX_PROBES = 66`，`policy §P2`），新建文件直接违反资产棘轮；全部新增机械判据分别并入既有 owner（`company-static-audit`、`pack-shape`、`preset-row-deps`、`handbook-budget`、`replay-fixture-freshness`）。
- **在 `cultivation.ts` 保留跨目录内部类型导出并把 `company-language.d.ts` 加入随包 `files`**：会把内部 host 实现细节扩进公共类型契约并改变 137 条目包清单；改为最小结构化 `{ subscribe }` 接口签名即可保持精确 3 份 `.d.ts` 导出闭包与 `137 == 137` 单源同构。
- **保留「18 份混面 spec 不进 tsc」豁免或用 `@ts-ignore` 强压报错**：会持续掩盖契约漂移（Wave 2 接入后当场抓出 5 份 spec 真实类型不匹配）；通过 `tsconfig.test-vendor-bridge.json` 复用 `vendor/dsh/tsconfig.base.json` 与 composite `references` 在零修改 `vendor/dsh/` 前提下实现 307/307 全覆盖。
- **`run/env.sh` 遇 Seatbelt 失败继续自动静默导出 `danger-full-access`**：违反最小权限默认安全原则；改为默认保持 `workspace-write` 并打印显式 `DSH_ALLOW_UNCONFINED_DEV=1` 逃生指引。
- **将含 `_backlog/_archive/` 入链的 24 篇实现 Note 强行移入 `archived/`**：`md-links` 会扫描 `_backlog/_archive/`，移动会导致冻结归档死链或被迫篡改冻结归档正文；只对零入链的前序接手收据执行 `git mv`，其余活跃决定补齐现行合同文档入链。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| Per-Agent 双 Owner 注入原语 | [`packages/company-pack/src/host/run-bundle/for-each-agent.ts`](../../packages/company-pack/src/host/run-bundle/for-each-agent.ts) | 9 个会话级 host 模块调用；`company-static-audit` `R5` 门禁阻断裸 `agent.ctx.inject` |
| 全量 Spec 类型检查桥接 | [`tsconfig.test-vendor-bridge.json`](../../tsconfig.test-vendor-bridge.json) · [`package.json`](../../package.json) | `pnpm typecheck` 串联四套 `tsconfig.test-*`；[`tests/repo/docs/typecheck-coverage-claim.spec.ts`](../../tests/repo/docs/typecheck-coverage-claim.spec.ts) 守 0 漏检 |
| Keyless `company-pack` 回放与新鲜度 | [`snapshots/replay/company-handbook-smoke/snapshot.yml`](../../snapshots/replay/company-handbook-smoke/snapshot.yml) | `replay.e2e.mjs` 重放；[`checks/gates/replay-fixture-freshness.mjs`](../../checks/gates/replay-fixture-freshness.mjs) 核对手册注入段 |
| 137 条目单源包形状与三向依赖 | [`packages/company-pack/package.json`](../../packages/company-pack/package.json) · [`checks/gates/pack-shape.mjs`](../../checks/gates/pack-shape.mjs) · [`checks/gates/preset-row-deps.mjs`](../../checks/gates/preset-row-deps.mjs) | 源 `npm pack` == `_dist`（137 条目）；`prepack-check.mjs` 拦裸 `npm publish` |
| 角色总常驻上下文账本 | [`checks/gates/handbook-budget.mjs`](../../checks/gates/handbook-budget.mjs) | `role-resident-budget`（角色 ≤ `23296B` · support ≤ `3686B`） |
| 运行态会话内自检与权限围栏 | [`packages/company-pack/src/host/commands/client-diagnostics.ts`](../../packages/company-pack/src/host/commands/client-diagnostics.ts) · [`run/env.sh`](../../run/env.sh) | `/company-diagnostics [status]` 双语输出；`DSH_ALLOW_UNCONFINED_DEV=1` 显式降级开关 |
| `0.11.11` 发布物与就绪状态 | [`_dist/安装手册.md`](../../_dist/安装手册.md) · [`market-index.staged.json`](../../market-index.staged.json) | `dsh-company-pack-0.11.11.tgz`（137 entries，sha256 `f95ab6fa…`）；`release --check --allow-pre-publish-index` |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| Per-Agent 双 Owner 与静态门 `R5` | 注册生命周期 | 重构前 [`tests/host/index/apply-lifecycle.spec.ts`](../../tests/host/index/apply-lifecycle.spec.ts) 用真 Cordis `Context` 实跑 → `expected 9 sections to be 0` 红；`subagent-retry.ts` 留裸 `agent.ctx.inject` → `FAIL [R5:dual-owner-agent-inject]`；接入 `injectEachAgent` 后全绿 |
| 全量 Spec Typecheck 覆盖 | 导出形态 / 纯逻辑 | 接回被排除 spec 首跑 `tsc --incremental false` 抓出 5 份 spec 真实类型漂移；修复后 4 套 `tsconfig.test-*` 冷跑 exit 0，307/307 spec 100% 纳管 |
| `replay-fixture-freshness`（`pnpm verify`） | 会话持久化 / 模型可见文本 | 真树篡改 `content/AGENTS.md` 一行 → `FAIL replay-fixture-freshness: company-handbook-smoke … 与现行手册不一致`；刷新/还原 → `PASS ×1 场景 1 处注入面与现行手册一致` |
| `pack-shape` & `preset-row-deps`（`pnpm verify`） | 导出形态 / 配置组合 | 真树向 `files` 加 `lib/types/**/*.d.ts` → `FAIL pack-files: files 仍整树收 lib/types/**`；从根 `devDependencies` 删 `@deepseek-ai/dsh-tool-bash` → `FAIL root-row-dep`；还原 → 绿；源 `npm pack --dry-run` 与 `_dist` 同为 `137 == 137` |
| `role-resident-budget`（`pnpm verify`） | 模型可见文本 / 文档指针 | 真树向 `content/contracts/workflow.md` 追加 3000B → `FAIL role-resident-budget: … vp-eng 24008B > 23296B`；还原 → `PASS role-resident-budget 角色合成总常驻最大 21006B（vp-eng）≤ 23296B` |
| 全量门禁 / 单测 / 覆盖率 / 孤岛审计 | 纯逻辑 / 文档指针 | `pnpm verify` ALL PASS（75 门）；`pnpm test:checks` ALL PASS；`pnpm test` 307 files / 2928 tests PASS；`pnpm typecheck` / `pnpm lint` / `pnpm dup` / `pnpm coverage:ratchet` 全绿；`pnpm notes:audit --strict` 硬项 0 且 `orphansAnyDoc = 0`；`vendor/dsh` 零改动 |
| `0.11.11` 8 项发布真入口 + 视觉/通道车道 | 导出形态 / client UI / 配置组合 | `release --verify` 8/8 PASS（`verify`、`coverage:ratchet`、`release-smoke`、`company-entry-smoke`、`client-load-smoke`、`preset-smoke`、`replay-smoke`、`present-catalog-smoke`）；`ui-scene.entry.mjs --isolated --expected` ALL PASS（3 页签金样一致，错误环 0）；`channel-matrix.entry.mjs --channel vendor` ALL PASS；`release.mjs --check --allow-pre-publish-index` 输出 `release: READY 0.11.11 @ b4e67378（tgz 137 条目；8 项检查 pass）` |

## 未覆盖轴

- [covered] Per-Agent 双边 fiber 释放、全量 Spec 类型覆盖、`137 == 137` 单源包契约、三向依赖镜像、角色常驻总预算与双语诊断命令 → [`tests/checks/gates-negative.test.mjs`](../../tests/checks/gates-negative.test.mjs)
- [covered] `0.11.11` 真实打包安装、首启落盘、11 预设真挂载、浏览器首屏、隔离视觉金样与无 key 会话重放 → [`checks/lanes/release.entry.mjs`](../../checks/lanes/release.entry.mjs)
- [policy] `npm publish` 与公开市场索引托管属人工发布交接，保留 `market-index.staged.json` 防误托管哨兵 → [`docs/guides/publish-handoff.md`](../../docs/guides/publish-handoff.md)
- [environment-gap] 真模型多角色端到端探针（需在线消耗 `DEEPSEEK_API_KEY` 配额，不进自动化回归门）→ [`checks/lanes/product-team-e2e.entry.mjs`](../../checks/lanes/product-team-e2e.entry.mjs)
- [unprovable] 跨平台 Desktop GUI 真机安装未逐平台认证（发布合同已明示适用边界）→ [`docs/contracts/release.md`](../../docs/contracts/release.md)
