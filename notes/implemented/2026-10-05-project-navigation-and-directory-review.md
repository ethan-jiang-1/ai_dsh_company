# 2026-10-05 · 项目导航与目录边界审查

状态：implemented（第一阶段导航与入口断链修复已实施；本 Note 的「保留平铺目录」决定已由用户本轮长期整理令逆转，当前目录决定见[职责分区迁移 Note](2026-10-05-repository-responsibility-layout.md)；以下保留当时取舍与验证记录）

## 决定

本轮不物理重排 `scripts/`、`tests/` 或 `snapshots/`。先用项目地图和脚本逐文件索引降低导航成本，并修复实际命令断链。现有目录边界已经足够表达主要职责；整批迁移的风险高于当前可证明收益。

## 依据

- `scripts/run-gates.mjs`、`package.json`、`.githooks/pre-push`、CI 和多个操作合同把 `scripts/<name>.mjs` 当作稳定入口。脚本头注已经机械声明触发条件、成本和状态，当前入口平铺并不等于无法判断用途。
- `tests/` 的 `vitest.config.ts` 递归发现 `tests/**/*.spec.ts`，而 `tests/layering.spec.ts` 明确把它作为 keyless 回归层。文件夹具使用隔离临时目录是合法 keyless 证据，不能按“有文件 IO”整体移出。
- `snapshots/` 的一场景一目录把 sessions、replay、sidecar、workspace oracle 和场景声明作为一个消费单元。`workspace.actual` 的路径形状被 journal 审计识别，顶层 `memory-convergence-*` 也参与预算门禁；增加 archive/replay/visual 父层会造成静默漏扫或误报。
- `scripts/lib/` 已是维护者共享实现的自然 seam；其中既有纯逻辑，也有隔离夹具可测逻辑和真实进程/浏览器驱动。不能用文件 IO 或 import 路径把它整体判成错误归属。
- `tests/dag-visual-fixture.spec.ts` 同时承担静态视觉回归和 `DAG_VISUAL_EMIT` 夹具导出，但目前只有 `dag-visual-probe` 一个消费者。没有第二消费者或复发性误用时，不提取新模块。

## 本轮修复

- CI 从已不存在的 `node scripts/verify.mjs` 改为当前唯一命令入口 `pnpm verify`。
- `scripts/export-dist.mjs` 从 `scripts/run-gates.mjs` 读取 pin，并在清理旧导出与 `npm pack` 前校验该输入，避免旧路径在破坏性步骤之后才失败。
- `scripts/sync-dsh.mjs` 的诊断文字统一称 `run-gates.mjs`。
- Markdown source discovery 纳入 `scripts/`，并用 foundation link fixture 覆盖脚本索引的死链；`scripts/lib/` 仍按共享实现目录排除。
- 新增 `docs/project-map.md` 与完整 `scripts/README.md`；根 `AGENTS.md` 和 `docs/index.md` 只保留入口指针，不复制易腐脚本清单。

## 输掉的方案与重启条件

- **按 smoke/probe/audit 整桶重排脚本**：这些后缀已经表达证据层，许多入口又跨模型/浏览器模式；目录分桶不会自动解决选择验证的问题，却会改变命令与 ROOT/import。先保留入口，以完整索引导航。
- **将 tests 按当前主题分子目录**：尚无不同成本层混入的证据；导航收益暂不足以支持大量相对路径迁移。
- **给 snapshots 加 replay/archive/visual 父层**：会拆开或改写现有场景查找、journal 识别与预算合同，且不降低资产体积。保持完整场景，增长沿快照规则处理。
- **移动已耗仪器或驱动库**：状态头注已机械声明已耗仪器的资格，驱动准入则主要是测试导入问题。若完整索引后仍发生误跑，或驱动准入需独立演进，再评估小范围物理分离。

出现持续误用、明确责任冲突或独立演进压力时重新提出迁移计划。实施前盘点受影响脚本的 ROOT/import、当前命令与文档引用；历史证据仍按时点保留，不全仓替换旧路径。移动脚本时先扩展触发/状态/端口扫描并反证；移动快照时先扩展 budget/journal/replay 的相应消费合同。完成后核对受影响入口和 `pnpm verify` / `pnpm test`，稳定命令的兼容方式由该次计划决定。

新增脚本同 diff 增加本索引入口，触发条件、成本与状态仍留在脚本头注。

## 验证与未覆盖面

脚本索引链接扫描已完成红绿反证：保留新增的脚本文档夹具时，旧扫描实现漏掉脚本索引并导致一个测试失败；扩展扫描后，专项 16 项通过。

本轮实跑：`pnpm verify` ALL PASS（包含新增脚本文档出链）；`pnpm test` 30 文件、283 项通过；`node scripts/sync-dsh.mjs` 只读簿记一致；`node scripts/export-dist.mjs` ALL PASS（139 个 tarball 条目、18 个 preset 文件，手册更新打包日期）；磁盘入口与索引比对 42 项全部覆盖；`git diff --check` 通过。回归仍输出既有的 React useLayoutEffect 静态渲染警告，本轮未修改该面。

独立只读审阅确认全部脚本入口覆盖，发现项目地图漏写 home patch；已按 vendor profile boot 补齐 bundle → profile → home → 命令行 overlays → telemetry 的顺序，审阅未发现其他必须修复的问题。

真模型、Web 和 E2E 不属于本轮变更的必要证据；GitHub 的干净环境 CI 未在本机复现。现有 layering 对 `scripts/lib/` 整体放行，仍不能证明传递导入不会启动进程或网络；本轮不改变该测试准入实现，也不以目录重排声称解决此风险。
