# 运行态地图：一次公司运行从代码到证据的时序与状态轴

> 性质：顶层合同——profile / bundle / preset / session / cwd / 日志 / workspace / snapshot 的**时序关系**与
> **四条状态轴**的唯一家。什么时候读 = 排查运行链时序、确认某状态在哪条轴、或分不清「现场 vs 证据」时。
> 空间导航 = [项目地图](project-map.md)；runtime/ 运行残留逐件 owner = [runtime/README](../runtime/README.md)、
> run/ 启动配置 = [run/README](../run/README.md)；证据政策 = [testing.md](testing.md)；四形态 = [presets.md](presets.md)。

## 一、完整 Web 链（时序）

```text
安装（Plugins 页 / CLI 仅 web）→ profile boot（$DSH_HOME/profiles/company）
  → 组合层：bundles → profile patch → home patch → --patch
  → company-pack（bundle 行 + 五 preset 声明 + content/ 只读内容）
  → host startup：workspace 解析（DSH_COMPANY_HOME → cwd → saved → none）
  → 公司状态清单（<workspace>/.dsh-company/bundle.json v3 = id / createdAt / pack）
  → 公司状态（.dsh-company/ 只补缺；不 seed 手册/模板）
  → host：workspace 登记（早于 readiness；失败只告警）
  → Web host（team / present / company-client）
  → 浏览器 client（品牌 / 卡片 / 公司视图页签；无 workspace 时由 DSH picker 回答，本包不自建 onboarding）
  → session cwd = workspace（首屏选中目标；默认 ceo 会话）
  → preset persona / 工具 / skills / handbook systemPrompt section 进会话
  → vendor agent loop → 会话日志（$DSH_HOME/sessions/）
  → workspace 产物（.dsh-company/kb、deliverables、cultivation、exports）
  → 证据（smoke / probe / audit / replay / snapshot）
```

并列面别混：**headless 通用 CLI**（无 preset 装配）；**Web 观察窗**（完整公司面）；
**会话四形态**（独立 preset 根/CEO Lead/teammate/命名 child；[presets.md](presets.md)）。spawn 成员
**继承 Lead 组合** ≠ 根会话「自包含、无继承」——分水岭 = [roles-isolation §2](design/roles-isolation.md)。

## 二、四条状态轴（权威位置、生命周期、不能推断什么）

| 轴 | 权威位置 | 生命周期 | 不能从这里推断什么 |
|---|---|---|---|
| 代码与构建 | `vendor/dsh`（钉 SHA 只读）、company-pack `src/` → `lib/`（generated）、`content/`（只读） | 源码长期；lib 构建产物 | 改 src ≠ 浏览器已重建；改 content ≠ workspace 已更新 |
| DSH 运行状态 | `runtime/harness-home/`（dev 安装的 home；+ 第二 home；逐件 = runtime/README） | gitignored、按 profile/session 生成 | 不是公司业务事实，不是证据快照 |
| 会话事实与业务产物 | `company-workspace/.dsh-company/`（dev 安装的公司状态；**gitignored**）；用户侧 = 用户自己的 workspace | live 共享盘持续演进 | 不是排练盘，不是历史证据，不是本仓源码 |
| 验证与历史证据 | `snapshots/<类型>/<场景>/` | 按场景冻结或追加 | 场景在场 ≠ 可执行 replay；`workspace.expected` ≠ 总是独立 oracle |

## 二·五、公司状态（workspace 单元）与 run trace

**公司状态 = 一个 workspace 的运行单元**：用户 workspace + `<workspace>/.dsh-company/`（v3 身份 +
状态/产物）。**home 不是 bundle 的业务部分**：home 只留 DSH 运行时与公司治理（sessions / 凭据 /
workspace 登记 / lease / 方法层 / presented 账本 / 身份备份）。一个安装 = 一个公司，可顺序服务多个
workspace；换项目不新建 home。bundle 不在 git；本仓 dev 的 `company-workspace/` 由
`pnpm bundle:init` 建（整树 ignored；只有 `.dsh-company/`）。

| 层 | 内容 | 谁维护 | 进 git | 随包 | 升级 |
|---|---|---|---|---|---|
| 插件内容 | persona / skills / 手册 / 模板 / 默认章程 / 状态默认值 | 维护者 | ✅（pack 源） | ✅ | 随 pack；**不落 workspace** |
| 公司状态 | `.dsh-company/`：kb（公司/org/owners/台账/章程/journal）、deliverables、cultivation、logs、exports、overrides | 用户 / 角色 | ❌ | ❌ | 只补缺，不覆盖 |
| 身份 | `<workspace>/.dsh-company/bundle.json` + home `company/identity/<id>.json` 备份 | 插件 | ❌ | ❌ | 只创建；v2 原地升 v3 |
| 导出 | `<workspace>/.dsh-company/exports/`（methods/ledger 派生） | 插件 | ❌ | ❌ | 可重建；非权威 |

**run trace** = 一次运行的四件套**追溯视图（引用不复制）**：代码与组合 / home 运行状态 / 会话 cwd /
证据；合同 = [snapshots/README](../snapshots/README.md)「Run trace 引用合同」。**别把 run trace 复制成目录**。

补充轴：排练盘 `runtime/rehearsal-workspace/`、浏览器 localStorage（按 origin）、系统 tmp 出口
（[runtime/README §三](../runtime/README.md)）——不同类状态，别拿一轴推断另一轴。

## 三、错误入口（首跑常踩）

- `pnpm dsh --profile company` 需 workspace：从项目目录启动或设 `DSH_COMPANY_HOME`；没有 ⇒ 停写并告警。
  裸 `dsh`/未 source `run/env.sh` 会落到日用 `~/.dsh`（另有同名 `web` profile）。
- 首启只在 workspace 建 `.dsh-company/`（状态只补缺）；**不写**根手册/模板；用户项目指令文件不动。
- **fresh clone 没有 `company-workspace/`** ⇒ 先 `pnpm bundle:init`；已有盘一个字节不动。
- 同一 home 顺序服务多个 workspace；不同公司新开 `DSH_HOME`。
- 进程 cwd ≠ 会话 cwd；启动成功 ≠ 六角色已装配（挂载证据 = preset-smoke）。
- 搬 home/workspace 后 DSH 的 `storages/workspace.json` 与 session `header.cwd` 仍是旧绝对路径；
  侧栏重新添加/接受旧会话不可续。

## 四、五问直达

| 问 | 唯一入口 |
|---|---|
| 怎么启动公司运行 | [demo.md §前置](demo.md) / 根 README；`cd company-workspace && pnpm dsh --profile company` 或 `pnpm company` |
| 改哪里 | [项目地图](project-map.md) + [pack owner 表](../packages/company-pack/README.md) + [四形态](presets.md) |
| 用什么局部验证 | [tests/README](../tests/README.md) + [testing.md §2](testing.md) |
| 运行卡点先查什么 | [项目地图](project-map.md) 现象表 + [debugging](guides/debugging.md) |
| 产物与证据从哪来 | 本图 §一/§二·五 + [快照规则](../snapshots/README.md) |
