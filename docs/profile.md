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
3. **file: 依赖刷新**：pack 内容变更后 pnpm 缓存命中不刷新目录副本——开发期直接同步
   `cp packages/company-pack/cordis.patch.yml <profile>/node_modules/dsh-company-pack/`，
   或 bump pack 版本重装；正式形状 R5 release-smoke 验证。
4. **patchReload 必须 `'startup'`**（R1 实证）：自定义 profile 默认 `'live'`（热重载 watcher
   常驻）——headless 动议会跑完但进程永不退、stdout 不 flush。company profile 的
   package.json 已改 `"patchReload": "startup"`；将来 web 观察窗 profile 才用 live。

preset roster 的 `roots` 已改**自定位**（`!!js` + `baseUrl` 解析到本包安装目录的
`presets/`），任何安装位置都对，不再依赖绝对路径。

## host 行清单（现在时，bundle 承载）

| 行 | 语义 | 状态 |
|---|---|---|
| `agent-presets`（insert；roots 自定位 + default: ceo） | preset roster；四角色 presets 随包安装 | ✅ dump 实测在列 |
| `session-persistence-jsonl` | 会话持久化；team 激活前提 | ✅（base 已有，bundle 确认语义） |
| `tool-fs` / `tool-fs-search` / `tool-skill` | 共享工具面（base 已有） | ✅ |
| `tool-present`（insert） | 交付物声明（deliverables 卡片） | ✅ dump 实测在列 |
| `agent-team` + `tool-agent-team`（insert） | 团队协作主通道（M4/D4；直插行，无续驶冲突，10 §3 冲突注①） | ✅ dump 实测在列 |

R1 起按需增补 tool-bash / tool-web / tool-todo / compaction 行（[40 号](./design/40-role-content-plan.md)）。

## 已知开放点

- pack 的 runtime deps 精确钉 `0.1.5-rc.2`（8 个，npm 实测同版可用）；R5 转 peerDependencies
  + compatibility 矩阵（guides/60 §5 时点表）。
- `plugin add` 的行注册顺序：pnpm 成功后 CLI 才写 bundles 列表——若中途失败，手动补
  `dsh.profile.bundles`（R1 实证一次）。
