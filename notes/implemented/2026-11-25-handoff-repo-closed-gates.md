状态：implemented（2026-11-25）｜动机 = 源码 handoff 接手评估 L2：CI run 45421906380 连红 22 次、本机 `verify ALL PASS`

# 接手面收口：repo-closed 链接判据 / 计数去重 / preset 挂载健康面

## 决定

1. **链接判据改为 repo-closed**（`tools/lib/core/markdown-links.mjs` + `checks/gates/md-links.mjs`）。
   以前 `existsSync` 放行两类目标，导致门禁的绿依赖作者磁盘：①相对链接逃出仓库根
   （`../../../../../deepseek-harness/…`，只在作者机器上与相邻研究树重合）；②目标存在但被 git 忽略
   （`packages/company-pack/lib/**` 构建产物——本机有、干净 clone 无）。新增 `outside` / `ignored` 两个
   reason；git 忽略查询住 judge 层（`checks/gates/md-links.mjs`），`tools/lib` 只收注入的 `isIgnored`——
   `tests/repo/structure/layering.spec.ts` 不许 `node:child_process` 进 tools/lib（实测第一次实现就被它拦下）。
   同轮 `checks/gates/bare-path.mjs` 对 `packages/company-pack/lib/**` **存在也判红**（构建产物不是活指针），
   `BUILD_OUTPUT_PREFIXES` 是唯一判据。修掉 4 个归档/Note 文件的 18 条仓库外链接、2 条 `lib/client.js`
   链接与 1 条 Note 里的构建指纹路径。

2. **计数/深度字面量去重**。9 处 preset 计数（`AGENTS.md`×2 / architecture / presets / repo-handoff /
   bootstrap×2 / project-map×2 / profile）改成「清单 = `presets/` 目录」；`docs/contracts/delegation.md`
   的 maxDepth 表格与散文改成「值见 `presets/<role>/agent.cordis.yml`」（本章不再复制数字）。
   `checks/gates/nav-count-claims.mjs` 增 `PRESET_COUNT_PHRASE` 分支，负例进 `tests/checks/gates-negative.test.mjs`。

3. **preset 挂载健康面**（`packages/company-pack/src/host/startup/preset-health.ts`）。preset 行的 config
   校验发生在会话创建时，UI 会把失败吞成“点了没反应”。现在启动时软 inject `agentPresets`，把 broken 行
   （id + 原因）写 logger 与 stderr；registry 不在组合里（headless）时 `report()` 返回 `ready:false`，
   不谎报“全好”。日志文案用英文：`src/host` 的 CJK 棘轮只降不升（`company-static-audit` R2），
   新面不占额度；诊断信息给运维读，不冒充 UI 文案。

## 输掉的方案

- **在 CI/开发机建 `../deepseek-harness` 空壳让 verify 变绿**：把环境补成假绿，任意 clone 仍红。
- **保留 `existsSync`、只修现有指针**：构建产物每天都在重生，下一条链接会再长出来。
- **给 `bare-path` 加 allowlist 登记 `lib/`**：把「产物当指针」合法化，等于把红改判成豁免。
- **用测试钉住散文计数**（docs == 目录数）：把第二事实源合法化，增员时仍要两处改。
- **在 `tools/lib` 里直接 `spawnSync('git')`**：破坏 keyless 纯逻辑分层，`layering.spec` 立即红（实跑）。
- **只保留 `preset-smoke` 的诊断**：用户在浏览器里仍无第二条路，运维必须开终端跑 lane。
- **把新文案塞进 `/company-diagnostics` 子命令**：host 命令的 CJK 棘轮（该文件 10）只降不升，为一条诊断文案涨额度 = 把结构预算当橡皮。诊断走启动日志，命令面保持原样。

## 后果

- `pnpm verify` 的链接/裸路径判据在作者树与干净 clone 上同结果；CI 的 verify job 不再依赖作者磁盘状态。
- 新增 preset 或改 `maxDepth` 时文档无需同改；计数回潮由 `nav-count-claims` 拦。
- preset 挂载失败在启动日志点名（id + 原因），可再用 `/company-diagnostics presets` 复查。

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| 静态门（链接） | 12 文档/指针 | `node tests/checks/gates-negative.test.mjs` → `PASS md-links：相对链接逃出仓库根 → 红`（`FAIL link: docs/outside.md:3 → ../../outside.md (repo 外目标…)`）、`PASS md-links：gitignored 产物目标 → 红`（`(gitignored 目标…)`）、`PASS md-links：仓库内链接 → 绿`；三向全跑 |
| 静态门（裸路径） | 12 | 在构建输出目录真造一个探针文件（存在）+ `docs/index.md` 加一行 → `FAIL bare-path docs/index.md:46 → … 是构建产物（gitignored：本机有、干净 clone 无…）`；还原 → `OK` |
| 静态门（计数） | 12 | `node tests/checks/gates-negative.test.mjs` → `PASS nav-count-claims：preset 计数（6 个 preset）→ 红`（`preset 计数声明「六公司角色」`）；真盘改完 → `OK nav-count-claims ×121` |
| 全量 | 3 导出/入口 + 12 | `npm_config_verify_deps_before_run=false pnpm verify` → `verify: ALL PASS；2 门无对象`（134 PASS）；`validateMarkdownLinks(process.cwd()).violations` = `0`（8150 链接 / 951 文件） |
| 真挂载 | 10 配置/组合 | `source run/env.sh && node checks/lanes/preset.entry.mjs` → `preset-smoke: ALL PASS（6 个角色 + 5 个非角色 preset 全部可挂载）`，25s；含 11 次 `session/create`、session-search 隔离组、skills 隔离 |
| 干净路径 | 12 | `/tmp/dsh-diag`（rsync 副本、`git add -A` 后；父目录无 `../deepseek-harness`）`pnpm verify` → `ALL PASS`；修复前同一路径 `26 FAILURE(S)`（25 link + 1 link-debt） |
| 发布字节 | 3 导出 / 13 数据 | `pnpm release --verify` → 7 项 pass（154s）：`release-smoke` ALL PASS（真 tarball→干净 profile→boot→`plugin remove` 后 bundles 摘净、`.dsh-company` 数据不变→重装恢复）；`preset-smoke` 11/11；`client-load` 真页面。`pnpm release --check --allow-pre-publish-index` → `READY 0.11.10 @ 378113aa`（tgz 137 条目） |
| 单元（健康面） | 2 服务/注册表 | `npx vitest run tests/host/startup/preset-health.spec.ts` → 4 passed（broken 清单、ready:false、启动告警文案） |

## 状态事实与载体

| 事实 | 唯一入口 |
|---|---|
| 链接判据（outside/ignored） | `tools/lib/core/markdown-links.mjs`；git 查询住 `checks/gates/md-links.mjs` |
| 构建产物不作裸指针 | `checks/gates/bare-path.mjs` 的 `BUILD_OUTPUT_PREFIXES` |
| preset 计数禁写 | `checks/gates/nav-count-claims.mjs` 的 `PRESET_COUNT_PHRASE` |
| preset 挂载健康 | `packages/company-pack/src/host/startup/preset-health.ts`（启动日志点名 broken） |
| 负例 | `tests/checks/gates-negative.test.mjs`、`tests/host/startup/preset-health.spec.ts` |

发布字节已重打并点态 READY（暖树口径，`--check` 自述）；CI 证据 = push 后的 run，未绿前不写“发布就绪”。

## 未覆盖轴

- [covered] tools/lib 不得出现运行时调用（`node:child_process` 等）→ `tests/repo/structure/layering.spec.ts`
- [covered] preset 真挂载失败会红（R1 反证：去掉必填 config 即红） → `checks/lanes/preset.entry.mjs`
- [environment-gap] 干净 clone 全量 `pnpm setup` 未在本机重放（需 submodule 网络与分钟级构建）→ `docs/guides/bootstrap.md`
- [policy] CI verify 转绿需 push 后观察（run 列表 = 外部状态，仓内不可断言）→ `.github/workflows/ci.yml`
