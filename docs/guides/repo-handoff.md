# 源码 handoff：接手本仓库（维护者）

> 什么时候读：新维护者第一次 clone，或收件人误把本仓库当安装包时。
> 边界：本仓库是**维护者源码 handoff**，不随仓库分发可安装 tarball；收件人的两件套 =
> `_dist/dsh-company-pack-<version>.tgz` + `安装手册.md`，由 `pnpm release --prepare` 生成。
> 唯一入口：环境 = [bootstrap](./bootstrap.md)；发布 = [release-runbook](./release-runbook.md)；
> 本页只回答「先读什么、先跑什么、不要读什么」。

## 0 先选路径

| 你拿到的是 | 先做 |
|---|---|
| 本仓库（源码） | 下面第 1 节；需要构建，首次分钟级 |
| 一个 `.tgz` + 安装手册 | 读安装手册；不要从源码 build，也不要 `npm pack` 本仓库 |
| 只有 `_dist/安装手册.md`（clone 里常见） | 手册是收件人文档；tarball 被 gitignore，源码维护者按第 1 节重建 |

## 1 clean clone 首跑

```sh
git submodule update --init
corepack enable pnpm
pnpm install
pnpm bundle:init
pnpm setup                 # vendor host/client/native/web + pack；首次分钟级
node tools/dev/setup.mjs --check
pnpm verify && pnpm test
pnpm typecheck
```

- `pnpm setup` 无参数；`--check/--types` 用 `node tools/dev/setup.mjs ...`。
- `lib/`、`_dist/*.tgz`、`runtime/` 都是 gitignored：clean clone 没有它们，`npm pack` 会被
  `prepack-check` 拒绝空包。
- 验收：`setup --check` 全产物、`verify` ALL PASS、`test` 全绿；这就是「源码 handoff 可跑」的证据。

## 2 第一次真挂载 / 首屏

```sh
source run/env.sh
pnpm company --no-open           # 缺 company profile 时用 web 模板初始化；构建 + file: 安装 + exec
node checks/lanes/preset.entry.mjs
pnpm dlx playwright install chromium   # 只有 client-load 需要；pnpm setup 不装浏览器
node checks/lanes/client-load.entry.mjs
```

- `pnpm company` 的默认 home = `runtime/harness-home`，workspace = `company-workspace`；不要用日用 `~/.dsh`。
- 真挂载看 11/11 零 broken + 逐个 `session/create`；首屏看无 `Failed to load plugins` + 品牌槽在场。
- 卸载检查：`dsh plugin --profile company remove dsh-company-pack`；`.dsh-company/` 默认留下。

## 3 发布点态

```sh
pnpm release --check --allow-pre-publish-index   # staged 哨兵在场时的预检
# 提交后，若要 READY 钉在交接 commit：
pnpm release --stamp
pnpm release --check --allow-pre-publish-index
```

- `release --check` 是点态：只对 `--stamp` 的 commit 成立；之后再有提交变红是设计
  （[release.md](../contracts/release.md) §版本纪律）。
- `market-index.staged.json` 是未发布哨兵，不是失败；不要为了变绿删它。

## 4 先读 / 不要读

- **start set**：本页 → [README](../../README.md) → [AGENTS](../../AGENTS.md) →
  [bootstrap](./bootstrap.md) → [tests/README](../../tests/README.md)。
- `notes/` 与 `_backlog/` 是决策记忆/推敲层，不是任务源；清单=目录本身（体量现算 `find notes -name '*.md' | wc -l` / `find _backlog -name '*.md' | wc -l`，别写死篇数），任务源 = 用户点名或已批 RFC。
- `_dist/安装手册.md` 是生成物；`market-index.staged.json` 是发布哨兵；
  `checks/INDEX.generated.md`、`tests/CENSUS.generated.md` 是生成库存，不要手改。
- `vendor/` 只读；`lib/` 是构建产物；不要用 `npm pack` 代替 `pnpm release --prepare`。

## 5 卡点

- 构建慢/缺原生：按 [bootstrap](./bootstrap.md) 的单步排障；Linux 全量构建仍有已知缺口
  （[release.md](../contracts/release.md) 的 fresh-clone CI 口径）。
- 浏览器缺失：`pnpm dlx playwright install chromium`；`pnpm setup` 不下载浏览器。
- 发布红：先看 `_dist/release-manifest.json` 的 `gitSha` 与
  [release-runbook](./release-runbook.md) §3，别先删 staged。
