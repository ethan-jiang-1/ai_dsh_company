# tests/ · keyless 回归的领域分区与导航

> 四区各测什么、**不证明什么**、改动面 → 最窄检查怎么选——本文件做导航 + 改动面映射表（单家，2026-10-10 自 testing.md §2 迁入行级表）。分层与证据政策唯一家 =
> [docs/testing.md](../docs/testing.md)（九层证明边界 / 证据纪律 / 改动面→最小证据）；逐脚本触发/成本/状态
> 唯一源 = 脚本头注（[检查索引](../checks/README.md) 只索引，门禁强制自述）——本文件不复述，防漂移。
> 真模型 / 真浏览器**不进本树**（[harness/layering.spec](./harness/layering.spec.ts) 机械守卫）。
> 行业三分 → 本仓层的对照：**单元 ≈ keyless 单测（本树）；集成 ≈ 装配/机制冒烟与 CLI 集成（[checks/smoke/](../checks/smoke/)）；
> 端到端 ≈ 重放 lane 与认证档（录制回放 / 真模型）**——逐层证明边界唯一家 = [testing.md §1](../docs/testing.md)。

## 四区

| 区 | 测什么 | 不证明什么 |
|---|---|---|
| [tests/company](./company/) | 公司读模型与审计判据的 keyless 逻辑 + 已注册 Host 工具/命令对临时真实文件的行为（对象面 = [company-pack 源码图](../packages/company-pack/src/README.md)与审计口径） | Cordis 真装配、profile 挂载、会话级行为 |
| [tests/client](./client/) | client 面板视图模型 + 静态渲染 + CSS 守卫；Lead/follow 适配器与 tab 类型/body/title/guide keyed 注册对齐；用真实 Cordis `Context` 与 `SlotRegistry` 分别覆盖声明等待、折叠重装与插件卸载 | 真浏览器渲染交互（→ client-load-smoke） |
| [tests/presets](./presets/) | persona / skills 声明内容 | 组合装配与工具行实际生效（→ preset-smoke + 会话日志证据） |
| [tests/harness](./harness/) | 仓库结构与测试分层合同 + `tools/lib/` 纯逻辑判据（如 replay normalization/judges） | 运行时或 CLI 端到端行为 |

spec 清单 = 各区**目录本身**（DSH no-index 教义；D28——清单随仓库增长，写进文档必过期）；导航到区，不到件。

## 改动面 → 最窄检查

| 改动面 | 最窄检查（先跑这个） | 受影响时升档 | 同 diff 义务（政策原则 = [testing.md §2](../docs/testing.md)） |
|---|---|---|---|
| persona / skill 文案（`packages/company-pack/presets/`） | `pnpm test tests/presets` | [preset-smoke](../checks/smoke/preset-smoke.mjs) | **行为判据面**改动（改变"模型被要求做什么/判据怎么落"）→ 场景同 diff 必带；纯措辞润色 → 连通档 + 内容档兜 |
| bundle / preset 行 config（机制面） | `pnpm test tests/presets` | + [delegation-smoke](../checks/smoke/delegation-smoke.mjs)（工具行） | 同 diff 必带 |
| client 面板（用户可见面：视图模型/组件/文案/CSS，`src/client/`） | `pnpm test tests/client`（按模块点名 spec，含 `client-face` / `style-lifecycle`） | [client-load-smoke](../checks/smoke/client-load-smoke.mjs) + 视觉夹具 | 用户可见改动 → 同 diff 场景或视觉夹具 |
| company 读模型逻辑（`src/lib/` 判据：deliverables / authorship / ledger） | `pnpm test tests/company`（按模块点名 spec） | oracle 反证（真样本钉列）；**新增模块/影响导出面 → 加 `pnpm test tests/harness`（pack-exports 守卫）** | — |
| pack 导出/注册面（Host / Client 注册改动） | `pnpm test tests/harness`（导出形态）+ `pnpm test tests/company`（Host 注册回调行为）+ `pnpm test tests/client`（Client 槽注册） | [release-smoke](../checks/smoke/release-smoke.mjs)（真实安装形状） | — |
| 发布 / 升 pin | `pnpm test tests/harness`（release-foundation 等） | [release-smoke](../checks/smoke/release-smoke.mjs) + 升 pin 程序（合同 = [release.md](../docs/release.md)；**语料回放全绿 = 升 pin 回归网第一道**） | — |
| 检查与工具入口（`checks/**`、`probes/**`、`tools/**`） | 消费它的 keyless spec + `pnpm verify`（头注/结构门禁） | 真实入口冒烟按脚本头注「何时跑」 | — |
| 文档 / 指针 | `pnpm verify`（md-links / bare-path / doc-budget） | [entry-probe-smoke](../checks/smoke/entry-probe-smoke.mjs)（入口链文档改动后） | — |

换档原则与每层证明边界唯一家 = [testing.md §1](../docs/testing.md)；同 diff 义务列的政策（含「不替代组装转录」）= [testing.md §2](../docs/testing.md)；命令与预算速查 = [dev-loop §9.1](../docs/guides/dev-loop.md)。

## 新 Agent 首跑验收（推荐，非强制）

- **有 `DEEPSEEK_API_KEY`**：`source run/env.sh && node checks/smoke/entry-probe-smoke.mjs`——真模型认证档，
  逐题验证入口链路由与证据（机器分 + 来源哈希；成本与触发见头注）；不进 `pnpm test`、**不作门禁**。
- **无 key**：`pnpm verify` + `pnpm test` + `node checks/smoke/client-load-smoke.mjs`——结构门禁 + keyless 回归 + client 真挂载三件套（前置：[bootstrap](../docs/guides/bootstrap.md) 配方已跑完——pack 已装、client/前端 dist 已构建，否则末件报 client bundles not found）。

## 新 spec 落点

keyless 单测唯一后缀 `*.spec.ts`（testing.md §1.1）；按四区归位；需要真进程 / 浏览器 / 模型的检查写
`checks/smoke/` 或 `probes/` 下的 `.mjs` 并在头注自述「何时跑 / 成本 / 状态」——不塞进 tests/（layering 守卫拦截）。
本文件骨架由 [harness/navigation-assets.spec](./harness/navigation-assets.spec.ts) 钉进回归（2026-10-05 红→绿落地）。
