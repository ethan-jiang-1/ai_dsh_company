# profile · host 组合的现在时（company）

> 顶层合同：部署形状与 host 行清单语义。行清单源文件（bundle 层）：
> [packages/company-pack/cordis.patch.yml](../packages/company-pack/cordis.patch.yml)；
> 设计依据 [design/10-architecture.md](./design/10-architecture.md) §6（共享行在 host、preset 只放差异）。

## 部署形状（R1 实测）

| 形状 | 命令 | 状态 |
|---|---|---|
| 源码直跑 | `source dev/env.sh && pnpm dsh --profile headless "…"` | ✅ R0 已验收 |
| company profile 持久部署 | `pnpm dsh plugin --profile company add file:./packages/company-pack` | ✅ R1 已部署实测（`dev/harness-home/profiles/company/`，bundles = [dsh-base, dsh-company-pack]） |
| 组合验证 | `pnpm dsh --profile company --dump-config` | ✅ 88 行，四新行在列 |

部署的四个实证细节（坑与解法）：

1. **patch 语法**：`- id: X` 只能替换 base 已有行；**新增行必须 `- insert:` 子列表**
   （教义源自 shipped dsh-headless 的 cordis.patch.yml）。
2. **strictDepBuilds**：profile 首次安装会拦 `koffi` 构建脚本——CLI 已在 profile 的
   `pnpm-workspace.yaml` 预置占位（`koffi: set this to true or false`），改成 `koffi: true` 后重装。
3. **`file:` 副本是硬链接**（R1 更正）：profile 里的 pack 文件与源文件**同 inode**——改**已有文件**
   自动同步（不必 `cp`）；只有**新增文件**（新 preset/skill 目录）与**依赖变化**才需要
   `plugin add`（必要时先 `remove` 强制重解析；bump 版本也会触发）。正式形状 `release-smoke` 验证（合同 = [release.md](./release.md)）。
4. **patchReload 必须 `'startup'`**（R1 实证）：自定义 profile 默认 `'live'`（热重载 watcher
   常驻）——headless 动议会跑完但进程永不退、stdout 不 flush。company profile 的
   package.json 已改 `"patchReload": "startup"`；将来 web 观察窗 profile 才用 live。

preset roster 的 `roots` 已改**自定位**（`!!js` + `baseUrl` 解析到本包安装目录的
`presets/`），任何安装位置都对，不再依赖绝对路径。

## host 行清单（现在时，bundle 承载）

| 行 | 语义 | 状态 |
|---|---|---|
| `agent-presets`（insert；roots 自定位 + default: ceo） | preset roster；五角色 presets 随包安装 | ✅ dump 实测在列 |
| `session-persistence-jsonl` | 会话持久化；team 激活前提 | ✅（base 已有，bundle 确认语义） |
| `tool-present`（insert） | 交付物声明（deliverables 卡片） | ✅ dump 实测在列 |
| `agent-team` + `tool-agent-team`（insert） | 团队协作主通道（M4/D4；直插行，无续驶冲突，10 §3 冲突注①） | ✅ dump 实测在列 |
| `ui-agent-team`（insert） | 团队 Web 可视面：Team 按钮 / 名册 / 实时任务板 / 点进 VP 会话 | ✅ 前端加载列表含其 client 模块 |
| `company-client`（insert，`name: dsh-company-pack`） | 本包 client 面：浏览器半注册 `sidebar.brand.name`（品牌皮肤） | ✅ 前端加载列表含 `dsh-company-pack/client.js` |

工具行走 preset 的自包含组合，不随 host bundle 增补（R1 实证，机制见 [10 §6 要点 1](./design/10-architecture.md)）。

## 已知开放点

- ~~pack 的 runtime deps 精确钉 `0.1.5-rc.2`~~ **已闭（R5a）**：改 peerDependencies +
  compatibility 矩阵，合同与程序见 [release.md](./release.md)（`release-smoke` /
  `sync-dsh`）。
- `plugin add` 的行注册顺序：pnpm 成功后 CLI 才写 bundles 列表——若中途失败，手动补
  `dsh.profile.bundles`（R1 实证一次）。
