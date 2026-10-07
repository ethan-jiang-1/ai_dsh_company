# tests/ · keyless 回归的领域分区与导航

> 四区各测什么、**不证明什么**、改动面 → 最窄检查怎么选——本文件只做导航。分层与证据政策唯一家 =
> [docs/testing.md](../docs/testing.md)（九层证明边界 / 证据纪律 / 改动面→最小证据）；逐脚本触发/成本/状态
> 唯一源 = 脚本头注（[scripts/README](../checks/README.md) 只索引，门禁强制自述）——本文件不复述，防漂移。
> 真模型 / 真浏览器**不进本树**（[harness/layering.spec](./harness/layering.spec.ts) 机械守卫）。
> 行业三分 → 本仓层的对照：**单元 ≈ keyless 单测（本树）；集成 ≈ 装配/机制冒烟与 CLI 集成（[checks/smoke/](../checks/smoke/)）；
> 端到端 ≈ 重放 lane 与认证档（录制回放 / 真模型）**——逐层证明边界唯一家 = [testing.md §1](../docs/testing.md)。

## 四区

| 区 | 测什么 | 不证明什么 |
|---|---|---|
| [tests/company](./company/) | 公司读模型判据：board / dag / ledger / presence / deliverables / authorship / budget / signoff / cultivation 纯逻辑与 oracle | 装配、真挂载、会话级行为 |
| [tests/client](./client/) | client 面板视图模型 + 静态渲染 + CSS 守卫（delegation-card / dag-panel / attention / float-geometry …） | 真浏览器渲染交互（→ client-load-smoke） |
| [tests/presets](./presets/) | persona / skills 声明内容（presets.spec） | 组合装配与工具行实际生效（→ preset-smoke + 会话日志证据） |
| [tests/harness](./harness/) | 结构与合同守卫：layering / keyless-imports / pack-exports / release-foundation / foundation-links / workspace-oracle / entry-probe / repository-layout / navigation-assets | 运行行为（结构检查不证明行为） |

## 改动面 → 最窄检查

| 改动 | 最窄检查（先跑这个） | 受影响时升档 |
|---|---|---|
| persona / skill 文案（`packages/company-pack/presets/`） | `pnpm test tests/presets` | [preset-smoke](../checks/smoke/preset-smoke.mjs)；行为判据面 → 场景同 diff |
| client 面板（视图模型/组件/CSS，`src/client/`） | `pnpm test tests/client`（按模块点名 spec） | [client-load-smoke](../checks/smoke/client-load-smoke.mjs) + 视觉夹具 |
| company 读模型逻辑（`src/lib/`） | `pnpm test tests/company`（按模块点名 spec） | oracle 反证（真样本钉列，testing.md §2）；**新增模块/影响导出面 → 加 `pnpm test tests/harness`（pack-exports 守卫）** |
| host 注册 / 打包 / 发布形状 | `pnpm test tests/harness`（pack-exports 等） | [release-smoke](../checks/smoke/release-smoke.mjs)（合同 = [release.md](../docs/release.md)） |
| 检查与工具入口（`checks/**`、`probes/**`、`tools/**`） | 消费它的 keyless spec + `pnpm verify`（头注/结构门禁） | 真实入口冒烟按脚本头注「何时跑」 |
| 文档 / 指针 | `pnpm verify`（md-links / bare-path / doc-budget） | [entry-probe-smoke](../checks/smoke/entry-probe-smoke.mjs)（入口链文档改动后） |

换档原则与每层证明边界唯一家 = [testing.md §1](../docs/testing.md)；命令与预算速查 = [dev-loop §9.1](../docs/guides/dev-loop.md)。

## 新 Agent 首跑验收（推荐，非强制）

- **有 `DEEPSEEK_API_KEY`**：`source run/env.sh && node checks/smoke/entry-probe-smoke.mjs`——真模型认证档，
  逐题验证入口链路由与证据（机器分 + 来源哈希；成本与触发见头注）；不进 `pnpm test`、**不作门禁**。
- **无 key**：`pnpm verify` + `pnpm test` + `node checks/smoke/client-load-smoke.mjs`——结构门禁 + keyless
  回归 + client 真挂载三件套。

## 新 spec 落点

keyless 单测唯一后缀 `*.spec.ts`（testing.md §1.1）；按四区归位；需要真进程 / 浏览器 / 模型的检查写
`checks/smoke/` 或 `probes/` 下的 `.mjs` 并在头注自述「何时跑 / 成本 / 状态」——不塞进 tests/（layering 守卫拦截）。
本文件骨架由 [harness/navigation-assets.spec](./harness/navigation-assets.spec.ts) 钉进回归（2026-10-05 红→绿落地）。
