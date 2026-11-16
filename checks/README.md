# 检查与工具索引（judge · show · operate 三面）

> 面：judge（会拦人的判断）。规则与例外 = [surface-contract](../docs/surface-contract.md)。

> 什么时候读：要跑/新增门禁、冒烟、探针或审计时。按要证明的对象选下面的入口。
本文件是**索引**（政策 = [测试宪法](../docs/testing.md)；改动面映射/验证分层/命令预算 = [tests/README](../tests/README.md)）；**触发条件、成本、状态与参数的唯一家 = 脚本头注**，这里只分类与链接（复述必漂）；开发环境 = [开发环](../docs/guides/dev-loop.md)。

## 快速选择

| 当前目标 | 入口 |
|---|---|
| 检查结构、引用与簿记 | `pnpm verify` → [run-gates](run-gates.mjs) |
| pre-push 按面分派 | [pre-push-surfaces](pre-push-surfaces.mjs)：从 git ref 算 outgoing 范围 → 选 surface lane；未分类 fail-closed |
| 看运行态全景 / 场景 / 会话历史 | `pnpm orient` → [orient](../probes/analyze/orient-probe.mjs) |
| 看最近会话的失败摘要（中断轮、非零 bash、待审批也算） | `pnpm diagnose [--strict]` → [diagnose](../probes/analyze/diagnose-probe.mjs) |
| 检查密钥与凭据暴露面 | [security-scan](gates/security-scan.mjs) · [tracked-token](gates/tracked-token.mjs) · [tracked-secrets](gates/tracked-secrets.mjs) |
| 检查局部逻辑或静态渲染 | `pnpm test` → [tests](../tests/)；分层守卫 = [layering.spec](../tests/repo/structure/layering.spec.ts) |
| 确认测试资产还活着 | `pnpm smoke:fast` → [fast](lanes/fast-lane.mjs)（4 条，秒级；pre-push）；全量 = `pnpm smoke:all` → [keyless-lane](lanes/keyless-lane.mjs)（每周 CI 跑 `--ci`；成员唯一家 = [lane 注册表](../tools/lib/core/asset-lanes.mjs)） |
| 类型 / 导入签名改动 | `pnpm typecheck`（命令与预算 = [tests/README §验证分层与预算](../tests/README.md)） |
| 确认角色真的挂载 | [preset-smoke](lanes/preset.entry.mjs) |
| 确认 client 真的装配 | [client-load-smoke](lanes/client-load.entry.mjs) |
| **看真页面 / 复现 UI 症状** | [ui-scene-smoke](lanes/ui-scene.entry.mjs)：自起实例 → 全部公司页签 + 浏览器错误环 → 证据（`--keep` 留实例；`--isolated --expected` = 隔离空壳金样档；`--steps` = 复现点击/输入） |
| 查看已运行页面 | [cdp-probe](../probes/browser-visual/cdp-probe.mjs)；指南 = [CDP 指南](../docs/guides/cdp-probe.md) |
| **页面报错了但日志里没有** | [client-error-chain-smoke](lanes/client-error-chain.entry.mjs)：隔离单 writer 真页面 → `console.error` → 错误环 → `$DSH_HOME/logs/company-client-errors.log`（keyless ~40s） |
| 确认录制行为与工作区判据 | [replay-smoke](lanes/replay.e2e.mjs)（当前仅 headless 合成场景） |
| 确认 workflow 引擎机制（失败重试/fatal/null/回执拼接） | [workflow-contract-smoke](lanes/workflow-contract.e2e.mjs)（keyless ~2s，fake provider + 真引擎） |
| 审计动议输出与角色留痕 | [deliverables-check](audit/deliverables-check.mjs) · [authorship-audit](audit/authorship-audit.mjs) · [journal-audit](audit/journal-audit.mjs) |
| 核对发布链或导出交付包 | [release-smoke](lanes/release.entry.mjs) · [channel-matrix-smoke](lanes/channel-matrix.entry.mjs) · [export-dist](../tools/release/export-dist.mjs) · [market-index](../tools/release/market-index.mjs) |
| **dev 启动** | `pnpm company --no-open` → [company](../tools/dev/company.mjs)：缺 profile 时初始化；默认构建 + `npm pack` + `plugin add file:<tgz>` → exec `dsh --profile company`；`--link` 快速通道 |
| 启动入口端到端（真 tarball 装 profile → `dsh --profile company` → workspace/公司状态） | [company-entry-smoke](lanes/company-entry.entry.mjs)（keyless，~1-2 分钟） |

## 清单

分区 = 目录本身；逐脚本的触发条件、成本与状态 = **各自头注**（`script-triggers` / `script-status` 门禁强制）。

- **公开入口自动库存** = [INDEX.generated.md](INDEX.generated.md)（生成物，勿手改；
  `node tools/repo/checks-index.mjs --write` 更新，`script-index` 门禁校验它与目录一致）。
- **结构门禁** = `checks/gates/` 目录（清单唯一源；装配 = [run-gates](run-gates.mjs)，
  `gate-wiring` 强制接线一致；pin 常量 = [tools/lib/core/pin.mjs](../tools/lib/core/pin.mjs)）。

## 共享实现与目录选择

[lib](./lib/) 保存 judge-wide 判据（作者/交付物核对、覆盖基线、分层与面判据、回放与快照判据、密钥与 token 扫描）；[gates/lib](gates/lib/) / [lanes/lib](lanes/lib/) 是 gate-local / lane-local 支撑（只许各自子树 import）；跨面共享地基住 [tools/lib](../tools/lib/)（core/ 路径与会话、probe/ 探针骨架、注册表等）；真实驱动住 [tools/drivers](../tools/drivers/)。
驱动不进入 keyless spec，准入由 [分层守卫](../tests/repo/structure/layering.spec.ts) 检查。

目录取舍见 [driver-purpose-top-level](../notes/archived/2026-10-07-driver-purpose-top-level.md)；顶层导航 = [项目地图](../docs/project-map.md)。

## 待触发复查（触发条件 → 该做什么）

触发条件与依据留在各自 Note（一处事实一个家），本表只做指针：

| 触发条件 | 该做什么 |
|---|---|
| 真实盘**待处理 > 30 条**（或已采纳 > 5 个） | 折叠开始挡东西 ⇒ 先决定上**筛选**（优先于分页）。量法 `ls company-workspace/.dsh-company/cultivation/records \| wc -l`；依据 = [场景轮 Note](../notes/archived/2026-10-18-cultivation-scenario-audit.md) 追加十四 |
| 再攒 **~20 场真实收口仍 0 次自发提案** | 考虑在 persona/技能加一句引导（先查是不是被别的机制压住）。先跑 [propose-sampler](../probes/analyze/propose-sampler-probe.mjs) 看分箱；依据 = 同上 追加十六 |
| **升 pin** 或动培养面（面板 / host / preset 工具行） | 复跑三档真入口：[cultivation-ux-walkthrough-probe](../probes/browser-visual/cultivation-ux-walkthrough-probe.mjs)、[cultivation-ux-scenarios-probe](../probes/browser-visual/cultivation-ux-scenarios-probe.mjs)、[cultivation-method-layer](../probes/session-context/cultivation-method-layer-probe.mjs)；培养页点击交互另用 [ui-scene-smoke](lanes/ui-scene.entry.mjs) `--steps`；动 preset 另跑 [preset-smoke](lanes/preset.entry.mjs) |
| 想复核**问询窗口 120s** 还要不要改 | `node probes/analyze/ask-latency-probe.mjs`（只读报数，不改配置）；依据 = [BUG-021 Note](../notes/archived/2026-10-18-bug021-timed-user-question.md) |
| 命令面行为 / 事件形状要变 | 先看 S12（故障注入恢复）与 `probes/lib/question-stop.mjs` 的形状漂移判据——它们会先红；依据 = [BUG-022 Note](../notes/archived/2026-10-18-bug022-question-stop-guard.md) |
