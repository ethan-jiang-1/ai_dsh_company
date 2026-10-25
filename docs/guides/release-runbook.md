# 发布 runbook（0.3.x 起）

> 性质：操作步骤（how）。合同（发布形态 / 兼容 / 版本政策）唯一家 = [release.md](../release.md)；
> 本文只把“每次发布到底做什么”固定成一条可执行路径。命令入口 = `tools/release.mjs`。

## 0. 先决

- 工作树干净；`CHANGELOG.md` 顶部条目 = `package.json` 的版本，且已有实际变化（不是 TODO）。
- `vendor/dsh` 干净、pin 簿记一致；`pnpm verify` 通过。
- 真模型冒烟需要凭据时才用 `--with-key`；发布预检与安装冒烟本身 keyless。

## 1. 五步

```sh
# ① 选版本；只改 package.json + CHANGELOG + docs/release.md 的版本行
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
git add -A && git commit -m "chore(release): 0.3.4"
pnpm release --stamp              # 把 manifest 的 gitSha 钉到发布 commit，不改产物
pnpm release --check
```

`--prepare` / `--verify` 会改 tracked 的 `_dist/安装手册.md`，所以它们允许发布产物造成的脏树；`--check`
默认要求干净树。`--all` = prepare + verify，不会替你 commit/push/publish。

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
| 发布物是 bundle；profile 是用户侧；preset 是行 | `package.json` 的 `dsh.bundle.patch` + preset 文件 |
| 运行时兼容只看 `engines.dsh` | `pack-engines` 门禁 + release-smoke 真装 |
| 已认证 tag 是本地台账，不是 DSH 字段 | `checks/gates/lib/compat-tags.json`（不随包） |
| 包目录只读；用户数据在 workspace/home/session | README Data 节 + release-smoke 包目录零写入 |
| 版本/变化/手册/sha 必须同步 | `release-ready` 门禁 + `release --check` |
| 每次交付有可追溯回执 | `_dist/release-manifest.json` |
| 测试按失败面分层 | [testing.md](../testing.md) + `checks/` 索引 + release runbook 第 1 节 |

## 5. 不在这条命令里

npm publish、market 索引、预构建离线包、Windows、真容器：未到触发条件；出现第二个消费者时另立 RFC。
