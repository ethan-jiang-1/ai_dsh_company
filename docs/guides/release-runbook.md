# 发布 runbook

> 什么时候读：每次发布/导出/升 pin 前。性质：操作步骤（how）。合同（发布形态 / 兼容 / 版本政策）唯一家 = [release.md](../contracts/release.md)；
> 本文只把“每次发布到底做什么”固定成一条可执行路径。命令入口 = `tools/release.mjs`。

## 0. 先决

- 工作树干净；`CHANGELOG.md` 顶部条目 = `package.json` 版本且有实际变化；`vendor/dsh` 干净、pin 簿记一致；`pnpm verify` 通过。
- `pnpm notes:audit --strict` 通过（硬项 0）；收据/死路径成片增长时按 [notes/README §五](../../notes/README.md) 做语义分诊。
- 真模型冒烟需要凭据时才用 `--with-key`；发布预检与安装冒烟本身 keyless。

## 1. 五步

```sh
# ① 选版本；改 package.json + CHANGELOG；market-index.json 自动重生成
pnpm release --bump patch        # 或 minor / major

# ② 填 CHANGELOG 的“本版变化”（用户可见；删掉 TODO）
$EDITOR CHANGELOG.md

# ③ 构建 + 导出 + 写 manifest
pnpm release --prepare

# ④ 全套验收（verify/test + 真实安装/生命周期/独立启动/client/preset）
pnpm release --verify
#   需要手册注入的真模型验收时：
pnpm release --verify --with-key

# ⑤ 提交发布字节，再在干净树上做最终核对
git add -A && git commit -m "chore(release): <version>"
pnpm release --stamp              # 把 manifest 的 gitSha 钉到发布 commit，不改产物
pnpm release --check --allow-pre-publish-index   # pre-publish；publish 后删 staged 再用默认 --check
```

`--prepare` / `--verify` 会改 tracked 的 `_dist/安装手册.md`，所以它们允许发布产物造成的脏树；`--check` 默认要求干净树。`--verify` 装 `_dist` 同一份 tarball，并用 `sourceFingerprint` 拒绝“源变但产物没重打”；`--all` = prepare + verify，不 commit/push/publish。pre-publish 阶段（仓库根有 `market-index.staged.json`）默认 `--check` 会拒绝 READY；这是发布哨兵，不是失败。用 `--allow-pre-publish-index` 预检，发布成功后删 staged 再跑默认 `--check`。
READY 是点态（只对 `--stamp` 的 commit 成立，之后提交再红是设计）；语义与证据要求 = [release.md §版本纪律](../contracts/release.md)。

## 2. 产物与证据

- `_dist/dsh-company-pack-<version>.tgz`、`.tgz.sha256`、`安装手册.md`。
- `_dist/release-manifest.json`（gitignored）：版本、git SHA、tgz sha256、条目数、手册 sha256、每项检查
  的 pass/fail。它是“这次交付对应哪个 commit、跑过什么”的唯一机器可读回执。
- `pnpm release:check` 的 `READY` 行 = manifest、tgz、手册、版本、HEAD 五者对得上。

## 3. 失败时先看哪里

| 症状 | 先查 |
|---|---|
| `release: 工作树不干净` | 先 commit；只在明确要带着未提交改动预演时用 `--allow-dirty` |
| `CHANGELOG ... 顶部是 ...` | 版本 bump 与 changelog 条目不同步 |
| `手册版本 ... ≠ package` | 忘了 `--prepare`，或 export-dist 没重跑 |
| `tgz sha256 ... ≠ sidecar` | 产物被换过；重跑 `--prepare`，别手改 sha |
| `manifest gitSha 不是当前 HEAD` | prepare 之后又提交；在干净树上跑 `--stamp`（产物不变），再 `--check` |
| 安装/生命周期 smoke 红 | 先看 `_dist` 产物是否最新，再按对应 smoke 的 FAIL 行定位；不要先改测试 |

## 4. 已内化的规则（不用每次重想）

| 规则 | 现在的载体 |
|---|---|
| 运行时兼容只看 `engines.dsh` | `pack-engines` 门禁 + release-smoke 真装 |
| 版本/变化/手册/sha 必须同步 | `release-ready` 门禁 + `release --check` |
| 每次交付有可追溯回执 | `_dist/release-manifest.json` |

## 5. 供应链（T8）

`pnpm verify` 已跑 `tracked-secrets` / `security-scan`；包没有 install/postinstall 脚本。npm publish 的
签名/构建证明/`npm audit signatures` 与顺序见 [publish-handoff](./publish-handoff.md)（provenance/CI 后续）。

## 6. 不在这条命令里

npm publish 与 market index 已立 [handoff](./publish-handoff.md)；本命令仍不 publish。预构建离线包、Windows、真容器未到触发条件。
