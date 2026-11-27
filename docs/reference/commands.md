# 命令参考（根 `package.json` 脚本全集）

> 什么时候读：查找本仓库所有可执行的 `pnpm <script>` 命令、用途与对应入口脚本时。
> 机械一致性：`checks/gates/command-refs.mjs` 双向校验本文件与根 [`package.json`](../../package.json) `scripts` 键一一对应（新增或删除脚本须同 diff 更新本表）；非 `package.json` 的独立 `node` 检查/探针/工具入口清单见 [`checks/INDEX.generated.md`](../../checks/INDEX.generated.md)。

## 1. 环境初始化与本地运行

| 命令 | 用途 | 实现入口 |
|---|---|---|
| `pnpm setup` | fresh clone 一键配置与构建验证（无参；`--check`/`--types` 用 `node tools/dev/setup.mjs`） | `tools/dev/setup.mjs` |
| `pnpm prepare` | 安装仓库 git hooks（pre-push 接线） | `tools/dev/hooks-install.mjs` |
| `pnpm bundle:init` | 初始化 dev 盘 `company-workspace/.dsh-company/`（不覆盖已有盘） | `tools/dev/bundle-init.mjs` |
| `pnpm methods:init` | 初始化或同步公司方法层目录 | `tools/dev/methods-init.mjs` |
| `pnpm company` | repo dev-only：打包 + `plugin add file:` + 启动 Web 观察窗（支持 `--no-open` / `--link`） | `tools/dev/company.mjs` |
| `pnpm dsh` | 从钉 SHA 的 `vendor/dsh` 源码直接运行 DSH CLI（需先 `source run/env.sh`） | `vendor/dsh/apps/cli/src/bin.ts` |

## 2. 门禁、静态检查与测试回归

| 命令 | 用途 | 实现入口 |
|---|---|---|
| `pnpm verify` | 执行全量结构门禁（`checks/gates/` 全集） | `checks/run-gates.mjs` |
| `pnpm test` | 运行 Vitest keyless 回归测试全集 | `vitest run` |
| `pnpm test:spec` | 运行 Vitest 单元/契约 spec（`pnpm test` 别名） | `vitest run` |
| `pnpm test:checks` | 运行 `tests/checks/*.test.mjs` 门禁自测与变异断言 | `tools/repo/run-check-tests.mjs` |
| `pnpm test:coverage` | 运行 Vitest 并产出 V8 覆盖率报告 | `vitest run --coverage` |
| `pnpm test:e2e` | 运行 keyless `*.e2e.mjs` 端到端车道 | `checks/lanes/keyless-lane.mjs` |
| `pnpm test:entry` | 运行 keyless `*.entry.mjs` 真实入口车道 | `checks/lanes/keyless-lane.mjs` |
| `pnpm smoke:fast` | 运行 pre-push 快速无头车道（4 项核心烟测） | `checks/lanes/fast-lane.mjs` |
| `pnpm smoke:surface` | 按改动面一键运行真入口车道（`client-load`/`preset`/`replay`；支持 `--all`/`--paths`） | `checks/pre-push-surfaces.mjs` |
| `pnpm smoke:all` | 运行全量 keyless 周检车道 | `checks/lanes/keyless-lane.mjs` |
| `pnpm coverage:ratchet` | 执行覆盖率棘轮检查（只升不降 + 新文件下限） | `checks/audit/coverage-ratchet.mjs` |
| `pnpm typecheck` | 检查 `packages/company-pack` 双面与三套 `tsconfig.test-*.json` | `tsc -b` / `tsc -p` |
| `pnpm lint` | 运行 oxlint 与 `company-static-audit --strict` | `checks/audit/company-static-audit.mjs` |
| `pnpm dup` | 运行 jscpd 重复代码扫描（0 克隆门禁） | `.jscpd.json` |

## 3. 诊断、只读审计与目录生成

| 命令 | 用途 | 实现入口 |
|---|---|---|
| `pnpm orient` | keyless 只读运行态全景（home、凭据、profiles、run trace） | `probes/analyze/orient-probe.mjs` |
| `pnpm diagnose` | 读取会话日志输出失败摘要（支持 `--session <slug>/<id>`） | `probes/analyze/diagnose-probe.mjs` |
| `pnpm notes:audit` | 审计 `notes/` 活跃度、死路径、取代回链与收据候选（支持 `--strict`） | `probes/analyze/notes-audit-probe.mjs` |
| `pnpm gen:catalog` | 校验或生成 `docs/reference/package-catalog.generated.md`（`-- --write` 写入） | `tools/repo/gen-catalog.mjs` |

## 4. 发布与分发

| 命令 | 用途 | 实现入口 |
|---|---|---|
| `pnpm release` | 发布主入口（按子参数执行 check/prepare/verify/stamp/all） | `tools/release/release.mjs` |
| `pnpm release:check` | 检查 `_dist/` 与源码指纹的发布就绪状态 | `tools/release/release.mjs` |
| `pnpm release:prepare` | 生成 `_dist/` tarball 与安装手册两件套 | `tools/release/release.mjs` |
| `pnpm release:verify` | 全套发布验收（`verify`、`coverage:ratchet`、真实 tarball 安装与入口冒烟） | `tools/release/release.mjs` |
| `pnpm release:stamp` | 为当前发布版本打指纹戳与清单记录 | `tools/release/release.mjs` |
| `pnpm release:shape` | 校验已导出 tarball 的 shipped 文件形状与链接 | `tools/release/shipped-shape.mjs` |
| `pnpm release:all` | 串行执行准备、校验与落戳完整发布流 | `tools/release/release.mjs` |
| `pnpm market:hosted` | 检查托管市场索引与发布包一致性 | `tools/release/market-index.mjs` |
