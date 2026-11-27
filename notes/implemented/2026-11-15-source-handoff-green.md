# 2026-11-15 · 源码 handoff 全绿：入口、首屏、发布点态

状态：implemented（2026-11-15；上游 = 接手成本只读诊断 + 用户 2026-11-15「所有颜色变绿」）

## 决定

1. **源码 handoff 有单一入口。** 新增 [repo-handoff](../../docs/guides/repo-handoff.md)：先选路径
   （源码 / tarball / 只有手册）、clean clone 五步、真挂载与首屏、发布点态、start set 与「不要读什么」。
   根 [README](../../README.md) 首屏加一句话边界（本仓库是源码 handoff，不是收件人安装包），
   [AGENTS](../../AGENTS.md) 开工路径与命令表、[docs/index](../../docs/README.md) 第一次接管行都指向它。
   此前边界只在 README 尾部，fresh agent 会先走「5 分钟装好」的收件人路径。
2. **命令表补前置。** `pnpm company --no-open` 在 AGENTS 命令表与「五条命令」里都改为
   `source run/env.sh && pnpm company --no-open`；`run/env.sh` 的双 home/裸 dsh 拦截不再靠读者自己想起。
3. **浏览器前置显式化。** `pnpm setup` 不下载 Playwright chromium；[bootstrap](../../docs/guides/bootstrap.md)
   的 client-load 行与 [tests/README](../../tests/README.md) 首跑节都写明
   `pnpm dlx playwright install chromium`，避免 clean machine 上首屏检查报 `Executable doesn't exist`。
4. **发布点态不靠删哨兵变绿。** 文档-only 交接 commit 上重跑 `pnpm release --stamp` 把 manifest 的
   `gitSha` 钉到 HEAD；`release --check --allow-pre-publish-index` 的绿是 pre-publish 口径，
   `market-index.staged.json` 保留（未 publish = 真实状态）。不 bump 包版本、不重打 tarball：
   `packages/company-pack/**` 一个字节没变。
5. **证据分层。** clean clone 证明源码首跑；`release.entry` 证明真安装/首启/卸载/重装；
   `preset` / `client-load` 证明真挂载与首屏；暖树 `verify` / `test` / `typecheck` 证明文档改动未破坏门禁。

## 输掉的方案

- **抬 README/bootstrap 行预算**：拒绝。README 90、bootstrap 165 是棘轮；本轮用压缩与合并保持
  README 90、bootstrap 156（headroom ≥5%），不靠提额。
- **新建集中 handoff 索引**：拒绝。违反 no-index 教义；guide 是操作 runbook，不是第二份文档清单。
- **删 `market-index.staged.json` 让 `release --check` 默认绿**：拒绝。那会把未发布说成已发布；
  pre-publish 口径必须显式 `--allow-pre-publish-index`。
- **只引用上一轮 clean clone Note**：拒绝。上一轮是不同 commit；本轮在 `/tmp` 新 clone 重跑，
  且把 `release.entry --keep` 的 profile 直接用于真挂载/首屏。
- **为文档-only 改动 bump 0.11.9**：拒绝。包字节未变；发布字节重打只会制造无意义的版本。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | repo = 维护者源码 handoff；收件人两件套 = tarball + 安装手册；源码首跑含 vendor 构建 |
| 唯一入口 | [repo-handoff](../../docs/guides/repo-handoff.md)（人）；[AGENTS](../../AGENTS.md) 命令表（agent）；[bootstrap](../../docs/guides/bootstrap.md)（构建配方） |
| 读载体 | fresh maintainer agent、发布者、误把 repo 当安装包的收件人 |
| 写载体 | 本 Note 同 diff 的 README / AGENTS / docs/index / bootstrap / tests README；`pnpm verify` 的 doc-budget / md-links / command-refs 守 |
| 发布点态 | `_dist/release-manifest.json`（gitignored）是机器回执；`market-index.staged.json` 是未发布哨兵 |

## 未覆盖轴

- [environment-gap] Linux clean clone 全量构建未跑（本轮 macOS `/tmp` clone）→ `docs/contracts/repo-hygiene.md`
- [environment-gap] 无 Playwright cache 的干净机器首屏未跑（本轮用本机 chromium cache）→ `checks/lanes/client-load.entry.mjs`
- [unprovable] Desktop 真机安装未认证（合同已声明）→ `docs/contracts/release.md`
- [policy] npm publish / 市场托管不在本轮；staged 保持 → `docs/guides/publish-handoff.md`

## 验证

| 层 | 实跑命令 | 结果 |
|---|---|---|
| clean clone 构建 | `git clone --recurse-submodules --no-hardlinks` → `pnpm install` → `bundle:init` → `pnpm setup` → `node tools/dev/setup.mjs --check` | 产物齐全（vendor CLI / client / web / pack） |
| clean clone 门禁 | `pnpm verify` | **ALL PASS**；3 门无对象（dist-freshness / replay-fixture / replay-ui） |
| clean clone 回归 | `pnpm test` | **249 files / 2117 passed + 3 skipped**（dev-only 台账） |
| clean clone 类型 | `pnpm typecheck` | exit 0 |
| clean clone 生命周期 | `node checks/lanes/release.entry.mjs --keep` | **ALL PASS**：安装 applied、11 roster、首启 46 件、二次启动零变更、remove 后公司状态字节不变、重装恢复 |
| 真挂载 | `node checks/lanes/preset.entry.mjs --profile release-check`（保留的干净 profile） | **ALL PASS**：6 角色 + 5 support 全部挂载；skills 隔离；client 闭包 70 模块 |
| 真首屏 | `node checks/lanes/client-load.entry.mjs --profile release-check` | **ALL PASS**：无 mount banner、零 loader 错误、品牌槽在场 |
| 暖树门禁 | `pnpm verify` / `pnpm test` / `pnpm typecheck` | ALL PASS / **249 files / 2120 tests** / exit 0 |
| 文档预算 | `wc -l` + `pnpm verify` 的 doc-budget | README 90/90、bootstrap 156/165、AGENTS 84/84；无 FAIL |
| 发布点态 | 交接 commit 上 `pnpm release --stamp` + `pnpm release --check --allow-pre-publish-index` | 在最终回执中记录；manifest gitSha = 交接 HEAD，staged 保留 |

**范围诚实**：上述 clean clone 与生命周期证据在 `/tmp/dsh-handoff-clean`（独立树、独立 home），
不碰工作区；真首屏用的是该 clean clone 保留下来的 `release-check` profile，不是日用 `~/.dsh`。
