# tests/ · keyless 回归的领域分区与导航

> 本文件管「改动面 → 检查」与「命令与预算」；政策与证明边界 = [testing.md](../docs/testing.md)，逐脚本触发/成本 = 头注 + [checks/README](../checks/README.md)。
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
| [tests/client](./client/) | client 面板视图模型 + 静态渲染 + CSS 守卫；Lead/follow 适配器与 tab 注册目录（真实 Cordis `Context`/`SlotRegistry`）；多实例探活 disposer 契约；whole-client 档（真 `bootClient` × web profile bundle roster）覆盖 `apply` 组合与 fiber 卸载/重载（company-client-composition） | 真浏览器渲染交互（→ client-load-smoke；真页面页签/错误环 → ui-scene-smoke） |
| [tests/presets](./presets/) | persona / skills 声明内容 | 组合装配与工具行实际生效（→ preset-smoke + 会话日志证据） |
| [tests/harness](./harness/) | 仓库结构与测试分层合同 + `tools/lib/` 纯逻辑判据（如 replay normalization/judges） | 运行时或 CLI 端到端行为 |

spec 清单 = 各区**目录本身**（DSH no-index 教义；D28——清单随仓库增长，写进文档必过期）；导航到区，不到件。

## 改动面 → 最窄检查

| 改动面 | 最窄检查（先跑这个） | 受影响时升档 | 同 diff 义务（政策原则 = [testing.md §2](../docs/testing.md)） |
|---|---|---|---|
| persona / skill 文案（`packages/company-pack/presets/`） | `pnpm test tests/presets` | [preset-smoke](../checks/smoke/preset-smoke.mjs) | **行为判据面**改动（改变"模型被要求做什么/判据怎么落"）→ 场景同 diff 必带；纯措辞润色 → 连通档 + 内容档兜 |
| 手册 / CHARTER / 模板（`packages/company-pack/workspace/`——**会话注入面**，company-workspace 是其符号链接） | `pnpm verify`（handbook-budget + **replay-fixture-freshness**：runnable+full 场景的注入新鲜度静态比对） | [handbook-smoke](../checks/smoke/handbook-smoke.mjs)（真注入与隔离根）+ 受影响 replay 场景重跑（[replay-smoke](../checks/smoke/replay-smoke.mjs)；2026-10-20 实证：纯 docs 手册提交曾打断 r3 full 档而无人拦） | 注入内容变化 ⇒ 受影响 runnable+full 场景**同 diff 重录**或声明降档（带日期理由）；规矩变化 ⇒ 行为判据面义务同上行 |
| bundle / preset 行 config（机制面） | `pnpm test tests/presets` | + [delegation-smoke](../checks/smoke/delegation-smoke.mjs)（工具行） | 同 diff 必带 |
| client 面板（用户可见面：视图模型/组件/文案/CSS，`src/client/`） | `pnpm test tests/client`（按模块点名 spec，含 `client-face` / `style-lifecycle`） | [client-load-smoke](../checks/smoke/client-load-smoke.mjs) + [cdp-probe](../probes/browser-visual/cdp-probe.mjs)（全部页签 + 面板体内容）/ 对应 visual probe | 用户可见改动 → 同 diff 场景或视觉夹具 |
| company 读模型逻辑（`src/lib/` 判据：deliverables / authorship / ledger） | `pnpm test tests/company`（按模块点名 spec） | oracle 反证（真样本钉列）；**新增模块/影响导出面 → 加 `pnpm test tests/harness`（pack-exports 守卫）** | — |
| 类型面（改 `src/**` 的导出/导入签名） | `pnpm typecheck`（`tsc -b` 两面；fresh clone 需先按 [bootstrap](../docs/guides/bootstrap.md) 构建 vendor client 类型） | [release-smoke](../checks/smoke/release-smoke.mjs)（发布前）；`verify` 的 src-layering 只守方向不守类型 | — |
| pack 导出/注册面（Host / Client 注册改动） | `pnpm test tests/harness`（导出形态）+ `pnpm test tests/company`（Host 注册回调行为）+ `pnpm test tests/client`（Client 槽注册） | [release-smoke](../checks/smoke/release-smoke.mjs)（真实安装形状；含 researcher） | — |
| 发布 / 升 pin | `pnpm test tests/harness`（release-foundation 等） | [release-smoke](../checks/smoke/release-smoke.mjs) + 升 pin 程序（合同 = [release.md](../docs/release.md)；**语料回放全绿 = 升 pin 回归网第一道**） | — |
| 检查与工具入口（`checks/**`、`probes/**`、`tools/**`） | 消费它的 keyless spec + `pnpm verify`（头注/结构门禁） | 真实入口冒烟按脚本头注「何时跑」 | — |
| 文档 / 指针 | `pnpm verify`（md-links / bare-path / doc-budget） | [entry-probe-smoke](../checks/smoke/entry-probe-smoke.mjs)（入口链文档改动后） | — |

换档原则与每层证明边界唯一家 = [testing.md §1](../docs/testing.md)；同 diff 义务列的政策（含「不替代组装转录」）= [testing.md §2](../docs/testing.md)；命令与预算速查 = 本文件「验证分层与预算」。

## 新 Agent 首跑验收（推荐，非强制）

- **有 `DEEPSEEK_API_KEY`**：`source run/env.sh && node checks/smoke/entry-probe-smoke.mjs`——真模型认证档，
  逐题验证入口链路由与证据（机器分 + 来源哈希；成本与触发见头注）；不进 `pnpm test`、**不作门禁**。
- **无 key**：`pnpm verify` + `pnpm test` + `node checks/smoke/client-load-smoke.mjs`——结构门禁 + keyless 回归 + client 真挂载三件套（前置：[bootstrap](../docs/guides/bootstrap.md) 配方已跑完——pack 已装、client/前端 dist 已构建，否则末件报 client bundles not found）。

## 验证分层与预算（命令速查；2026-10-27 自开发环 §9.1 迁出）

**教训（R3）**：把"真浏览器 + 真模型 + 真 UI"的委派卡 e2e 当回归门禁——240s 都没等到（CEO persona 的
开工仪式先烧 5–6 步模型往返），且**依赖模型配合**：模型不调那个工具就永远绿不了。**这是层次放错，不是脚本写得不好。**

**分层（按"要不要模型"切，不按"重不重要"切）**：**层定义与证明边界唯一见 [testing.md §1](../docs/testing.md)**；
本表只给**命令与预算速查**。每个脚本自己的触发条件与成本在它头注里（`// 何时跑：…`，
门禁 `script-triggers` 强制自述）——**别把逐个脚本的触发条件抄回本表**（2026-09-26 实测本表曾漏 6 个已存在脚本，而 AGENTS.md 又把
"何时跑"指回本表，成环）：

| 层 | 时间 | 跑什么（代表脚本；**它自己的触发条件在头注**） |
|---|---|---|
| 文档/结构 keyless | 秒级 | `pnpm verify`（含当前 Markdown 链接、物理行预算、裸路径、分层方向与 pin 一致性门禁） |
| **类型面 keyless** | 秒级（增量） | `pnpm typecheck`（`tsc -b` 包两面；改导出/导入签名时跑——verify 与 test 都不做类型检查） |
| **单元/组件 keyless** | 秒级 | `pnpm test` 或相关 Vitest 文件——含 UI 组件的**纯函数视图模型 + 静态渲染**（`react-dom/server`，不需要浏览器） |
| 装配 keyless | ~25s | `client-load-smoke`（真页面零挂载失败；slot 名写错会在这里炸） |
| 机制/边界（1 条 prompt） | ~30s | `delegation-smoke`（模型可见工具目录 + shadow 边界） |
| **重放 lane（第三档，无 key）** | 现行场景 ~2s | `replay-smoke`（会话日志 + sidecar；已声明 workspace oracle 的场景另比完整工作区）——要起进程，不进 `pnpm test`。真页面车道 = `ui-scene-smoke`（自起实例，~40s） |
| CLI 集成（keyless，需子进程） | 秒级 | `node checks/smoke/snapshot-motion-smoke.mjs`（真实 CLI + 临时 fixture；不进 `pnpm test`） |
| 发布形状（无 key） | 分钟级 | `release-smoke`（构建→npm pack→干净 profile→plugin add→built 入口 boot 冒烟；合同 [release.md](../docs/release.md)） |
| 认证档（真模型） | 分钟级 | 按面选择（**逐个脚本的触发条件与成本见其头注「何时跑」**；`script-triggers` 门禁强制） |
| 行为质量档（认证） | 分钟级 | `probe --full`（内容档三探针）+ `candidate-scan-eval`（语料判据家 = [testing.md §4](../docs/testing.md)） |

**证明边界（每层只证明自己能观察的性质）的唯一家 = [testing.md §1](../docs/testing.md)**
（2026-10-04 立测试宪法时自开发环迁入——宪法还拥有：改动面→最小证据政策（行级映射表 = 本文件「改动面 → 最窄检查」）、证据纪律（条数以宪法 §3
实列为准，别在此复述数字）、资产
三分法、自测轮授权、已知未覆盖面、升级地图；本节只留命令与预算）。换档先问"这一层能证明我关心的
性质吗"，不为安心堆档。

**三条硬规矩**：

1. **真模型 / 真浏览器不进迭代环的秒级回归档**：keyless 单测与结构检查保持快速；认证档仅在受影响面或验收要求时运行，不按“轮末/每轮”机械触发。需要真入口 → 写 `checks/smoke/*-smoke.mjs`，别塞进 `tests/`。**这条有机械门禁**：[`harness/layering.spec.ts`](harness/layering.spec.ts) 扫 `tests/**`，出现 `node:child_process` / `spawn(` / playwright /
   `fetch(` / 密钥即红（已反证：塞一行 `import { spawn } from 'node:child_process'` 立刻变红）。**R5a 起另禁两条**（均双红证）：tests/
   不得 import `tools/` 下的驱动脚本（`tools/lib/` 纯逻辑库除外）；任何 vitest 配置不得把
   `checks|probes|tools` 编进测试发现——重放 lane 是第三档，只由 `checks/smoke/replay-smoke.mjs` 驱动。
2. **能做成纯函数就做成纯函数**：UI 组件把"展示事实"抽成纯函数（范本 `delegationCardModel`），
   keyless 单测直接断言它——组件层就永远不需要模型与浏览器。
3. **认证档要能"重放"而不是"重跑"**：真模型跑一次 → 会话日志归档 → 后续用归档做回放断言
   （R5a replay harness）。**重跑只在升 pin 或行为确实要改时做**；R3 的委派卡端到端（模型→工具→卡片）
   就留给 R5a 的 replay harness（试过的慢 e2e 已否决，原因见 [delegation.md §6](../docs/delegation.md)）。

**回归层预算**：`pnpm test` 的 **tests 阶段秒级**（vitest 输出 Tests 行；进程全程含 transform/imports，视缓存冷温与用例数波动——2026-10-20 实测 Tests 4–14s、全程热 5–24s / 冷 55s，不算超）。tests 阶段自身明显变大才先怀疑"有人把模型/浏览器塞进来了"，拆层而不是加超时。

## 新 spec 落点

keyless 单测唯一后缀 `*.spec.ts`（[testing.md §1.1](../docs/testing.md)）；按四区归位；需要真进程 / 浏览器 / 模型的检查写
`checks/smoke/` 或 `probes/` 下的 `.mjs` 并在头注自述「何时跑 / 成本 / 状态」——不塞进 tests/（layering 守卫拦截）。
本文件骨架由 [harness/navigation-assets.spec](./harness/navigation-assets.spec.ts) 钉进回归（2026-10-05 红→绿落地）。
