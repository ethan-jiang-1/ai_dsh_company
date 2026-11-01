# ai_dsh_company · 梦之队

**插件即产品**：一个 DSH 产品包（`packages/company-pack`）提供五个角色 preset（CEO / VP-Eng /
VP-Sales / COO / CFO）+ 委派子人格 `researcher`，以独立 `company` profile 启动；启动时指定/询问
用户 workspace，插件的全部能力施加到那个 workspace 上。

- **插件内容在包内**：persona / skills / client / host / 出厂骨架随 `dsh-company-pack` 发布；
- **run bundle 在用户 workspace**：公司盘、`bundle.json`（v2）、升级日志、治理导出都住
  `<workspace>/.dsh-company/` 与盘根；
- **home 只留 DSH 运行时 + host 治理**：sessions / 凭据 / workspace 登记 / lease / 方法层 /
  审计账本，另留一份身份备份；方法层/账本不搬进模型可写区（D25/M2）。

**最小启动（维护者 dev）**

```sh
git submodule update --init && corepack enable pnpm && pnpm install
pnpm bundle:init                 # fresh clone：建 dev workspace（已有盘一个字节不动）
source run/env.sh                # dev home + 裸 dsh 拦截
pnpm company --workspace "$PWD/company-workspace" --no-open
# 需要 Web 观察窗时按 docs/demo.md §前置；端口/token 从启动横幅读
```

**安装 / 交付**：`_dist/安装手册.md`（生成物）与 tarball 是唯一收件人路径：
独立 `DSH_HOME` → `dsh --profile company --from-default-profile web` → `dsh plugin --profile company
add <tgz>` → 启动器 `--workspace`。安装形状、升级、备份、卸载、回退见
[docs/release.md](./docs/release.md) 与 `_dist/安装手册.md`。

| 层 | 放什么 | 谁拥有 |
|---|---|---|
| 插件包 `packages/company-pack/**` | 角色定义、client/host 代码、出厂骨架（只读） | 维护者；随包版本 |
| 产品 home `<DSH_HOME>` | `profiles/company`、sessions、凭据、workspace 登记、lease、方法层、审计账本、身份备份 | DSH + host 治理 |
| 公司 workspace | 公司盘（`AGENTS.md`/`COMPANY.md`、`kb/`、`templates/`、`deliverables/`、`cultivation/`）+ `.dsh-company/`（`bundle.json`、日志、导出） | 用户；可携带的 run bundle |

**入口**：[项目地图](./docs/project-map.md) · [运行态地图](./docs/runtime-map.md) ·
[profile 合同](./docs/profile.md) · [数据模型](./docs/data-model.md) · [发布合同](./docs/release.md) ·
[驾驭者七问](./docs/orient.md) · [AGENTS.md](./AGENTS.md)（coding agent）。

**纪律**：默认严格照做钉住的 DSH 研发纪律，偏离必须登记（对照 = [AGENTS.md](./AGENTS.md) §纪律）；
`vendor/dsh` 是唯一只读权威，`pnpm verify` / `pnpm test` / `pnpm typecheck` 是三条常驻命令。历史
决策与证据在 [notes](./notes/README.md)；未成熟问题在 [_backlog](./_backlog/README.md)。
