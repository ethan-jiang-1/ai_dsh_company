# profile · host 组合的现在时（company）

> 什么时候读：改 host 组合、换部署形状（源码直跑 vs 持久安装）时。路线 = 行清单表 → dump 对照。
> 顶层合同：部署形状与 host 行清单语义。行清单源文件（bundle 层）：
> [packages/company-pack/cordis.patch.yml](../packages/company-pack/cordis.patch.yml)；
> 设计依据 [design/architecture.md](./design/architecture.md) §6（共享行在 host、preset 只放差异）。

## 部署形状（R1 实测）

| 形状 | 命令 | 状态 |
|---|---|---|
| 源码直跑 | `source run/env.sh && pnpm dsh --profile headless "…"` | ✅ R0 已验收 |
| **开发 web 观察窗**（现行） | `pnpm dsh web -- --port 0 --no-open`（端口是环境状态：系统分配，从启动横幅读端口与 token） → 用 `runtime/harness-home/profiles/web`，pack 走 **`link:`**（改 presets/** 即刻生效，无需重装） | ✅ 现行 |
| 组合验证 | `pnpm dsh --profile web --dump-config` | ✅ 通过（**行数与行名以当次 dump 为准，别在此写死**——2026-09-26 实测本行曾写"88 行，四新行"，而清单早已是 6 行） |
| ~~company profile 持久部署~~ | ~~`plugin --profile company add file:./packages/company-pack`~~ | ⚠ **已退役**：该 profile 是 R1 的残留（`file:` 装法 + web-app 钉在 `0.1.5-rc.2`，差两代），现行开发用上面的 web profile；真实安装形状的验收归 `release-smoke`（合同 = [release.md](./release.md)） |

部署的四个实证细节（坑与解法）：

1. **patch 语法**：`- id: X` 只能替换 base 已有行；**新增行必须 `- insert:` 子列表**
   （教义源自 shipped dsh-headless 的 cordis.patch.yml）。
2. **strictDepBuilds**：profile 首次安装会拦 `koffi` 构建脚本——CLI 已在 profile 的
   `pnpm-workspace.yaml` 预置占位（`koffi: set this to true or false`），改成 `koffi: true` 后重装。
3. **安装形状按装法定**（2026-09-26 实测更正）：**`file:` = 真拷贝**（安装副本与源文件 **inode 不同、
   link count 1**——旧文写的"硬链接/同 inode"是错的，实测反证）；**`link:` = 符号链接**，改 presets/**
   persona/skills **即刻生效、无需重装**。现行 dev profile 用 `link:`；只有改 pack 依赖或 bundle 行才需要
   `plugin --profile web remove` + `add`（纪律见 [guides/bootstrap](./guides/bootstrap.md)）。正式形状由 `release-smoke` 验证。
4. **patchReload 必须 `'startup'`**（R1 实证）：自定义 profile 默认 `'live'`（热重载 watcher
   常驻）——headless 动议会跑完但进程永不退、stdout 不 flush。company profile 的
   package.json 已改 `"patchReload": "startup"`；将来 web 观察窗 profile 才用 live。

preset roster 走 **`agent-preset-registry` 一行 + 每预设一行声明**（0.1.7 起的模型；旧模型的
`roots` 目录扫描已废，见 [cordis.patch.yml](../packages/company-pack/cordis.patch.yml) 头注与
[术语映射](./terminology.md)）。

## host 行清单（现在时，bundle 承载）

| 行 | 语义 | 状态 |
|---|---|---|
| `agent-preset-registry`（**替换**出厂行；default: ceo） | preset roster；五角色各一行 `agent-preset` 声明（`presets/<role>/agent.cordis.yml`）经 `dsh.bundle.patch` 数组并入 | ✅ dump 实测在列 |
| `session-persistence-jsonl` | 会话持久化；team 激活前提 | ✅（base 已有，bundle 确认语义） |
| `tool-present`（insert） | 交付物声明（deliverables 卡片） | ✅ dump 实测在列 |
| `agent-team` + `tool-agent-team`（insert） | 团队协作主通道（M4/D4；直插行，无续驶冲突，architecture §3 冲突注①） | ✅ dump 实测在列 |
| `ui-agent-team`（insert） | 团队 Web 可视面：Team 按钮 / 名册 / 实时任务板 / 点进 VP 会话 | ✅ 前端加载列表含其 client 模块 |
| `company-client`（insert，`name: dsh-company-pack`） | 本包 client 面：浏览器半注册 `sidebar.brand.name`（品牌皮肤） | ✅ 前端加载列表含 `dsh-company-pack/client.js` |
| `session-query-sqlite`（**替换**出厂行；批 2 收割） | 会话日志 SQL 查询（`tool-session-query` ×5 的 host 侧；`openAt: first-search` 懒开） | ✅ 行在 [cordis.patch.yml](../packages/company-pack/cordis.patch.yml) |
| `time-context`（**替换**出厂行；批 3 收割） | 日期通道（注入日期供记账与 journal 命名；pack 侧钉 `timeZone: Asia/Shanghai`） | ✅ 行在 [cordis.patch.yml](../packages/company-pack/cordis.patch.yml) |

工具行走 preset 的自包含组合，不随 host bundle 增补（R1 实证，机制见 [architecture §6 要点 1](./design/architecture.md)）。

## 已知开放点

- ~~pack 的 runtime deps 精确钉 `0.1.5-rc.2`~~ **已闭（R5a）**：改 peerDependencies +
  compatibility 矩阵，合同与程序见 [release.md](./release.md)（`release-smoke` /
  `sync-dsh`）。
- `plugin add` 的行注册顺序：pnpm 成功后 CLI 才写 bundles 列表——若中途失败，手动补
  `dsh.profile.bundles`（R1 实证一次）。

**Team 容量与信箱背压（rc.2 可调参数，收割 #11）**：编制上限（`maxMembers`：代码默认 16，官方 bundle
与本仓 patch 均显式钉 8）与信箱背压
（`maxPendingMessagesPerMember` / `maxMessageBytes`）在组合层调——行清单与默认值见
`vendor/dsh/packages/experimental/agent-team/src/mailbox.ts` 与 `agent-team-profile`；调参 = bundle 行
config，不动 preset。
