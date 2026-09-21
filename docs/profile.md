# profile · host 组合的现在时（company）

> 顶层合同：部署形状与 host 行清单语义。部署源文件：
> [packages/company-pack/profiles/company.cordis.yml](../packages/company-pack/profiles/company.cordis.yml)；
> 设计依据 [design/10-architecture.md](./design/10-architecture.md) §6（共享行在 host、preset 只放差异）。

## 部署形状（R0 实测）

| 形状 | 命令 | 状态 |
|---|---|---|
| 源码直跑 | `source dev/env.sh && pnpm dsh --profile headless "…"` | ✅ 已验收（真实 API 会话，2026-09-22） |
| 持久安装（探针） | `pnpm dsh plugin --profile probe add file:./packages/company-pack` | ✅ 实测：pack 落 `<DSH_HOME>/profiles/<p>/node_modules/dsh-company-pack/`，四角色 presets 齐全 |
| company profile 部署 | 同上改 `--profile company` + 本合同源文件行并入 profile | R1 首次部署时执行 |

preset roster 的 `roots` 用绝对路径指向部署后的 `presets/`（probe 实测模式；见源文件注释）。

## host 行清单（现在时）

| 行 | 语义 | 状态 |
|---|---|---|
| `agent-presets`（roots + default: ceo） | preset roster；roots 指向 pack 的 presets/（trust: system） | 路径已实测回填（消除 CHANGE-ME） |
| `session-persistence`（jsonl） | 会话持久化；team 激活前提 | 就位 |
| `tool-fs` / `tool-fs-search` / `tool-skill` / `tool-present` | 全员共享工具面；角色差异在各自 preset | 就位 |

R1 起按需增补 tool-bash / tool-web / tool-todo / compaction 行（[40 号](./design/40-role-content-plan.md)）；
R2 装 team web bundle（观察窗）；R3 团队两行从 bundle 改直插（[10 §3](./design/10-architecture.md) 冲突注）。

## 已知开放点

- `cordis.patch.yml` 为空列表（bundle 层无默认行，D2/D5：host 共享行走 profile 部署）。probe 已装
  未起会话——空列表的 Loader 接受性在 R1 首次 company profile 会话时验证；若被拒 → 共享行折叠
  进 bundle（届时记新 Note）。
