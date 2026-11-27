# 运行环境、调试阶梯与现场运维（Run & Ops）

> 什么时候读：双 home / 凭据 / 端口隔离出问题、按组合层→会话层排查故障、调限流旋钮、或 demo 现场出状况按「症状 → 动作」排障时。
> 上游：冷启动构建 = [bootstrap](./bootstrap.md)；系统分层与状态轴 = [architecture.md](../architecture.md)；演示流程 = [demo-scenes](./demo-scenes.md)。

## 1. 运行环境：双 home 与双 DSH 隔离

1. **环境兜底优先**：一切开发/验证会话先 `source run/env.sh`（`DSH_HOME=<repo>/runtime/harness-home`），靠环境不靠提醒。
2. **dev home 配一次 key**：凭据按 home 隔离，`runtime/harness-home/.credentials.yaml` 单独配置 `DEEPSEEK_API_KEY`（否则真模型测试 self-skip）；自检用 `source run/env.sh && pnpm orient`。
3. **双 DSH（代码层）**：`pnpm dsh` 走钉 SHA 的 `vendor/dsh/` 源码；PATH 里的裸 `dsh` 是全局安装（版本随全局漂移，`env.sh` 已拦截提醒，确需日用跑 `command dsh`）。注意 `DSH_HOME` 只护数据层，不护代码层。
4. **coding 会话继承陷阱**：coding 会话常继承日用 `DSH_HOME=~/.dsh`，“未设即报错”不会触发。因此判据/审计脚本统一接入 `tools/lib/core/runtime-home.mjs`（拒绝日用 home、重叠路径与符号链接；接入清单由 `rg -l runtime-home checks tools -g '*.mjs'` 现算）。
5. **端口与交付形态**：headless 形态无端口，日志落 `$DSH_HOME/sessions/`；Web 形态起本地 HTTP 端口（以启动横幅为准），与日用实例完全独立。一个安装可顺序服务多个 workspace，公司状态落 `<workspace>/.dsh-company/`；dev 用 `pnpm company --no-open`。
6. **排练场 ≠ 运行场**：排练/探针默认 cwd = `runtime/rehearsal-workspace/`（`node tools/dev/rehearsal-init.mjs` 幂等成型，刷新 `kb/` 事实与章程、不镜像 journal）；真盘 `company-workspace/` 只收真实动议产物。
7. **沙箱后端探测**：`env.sh` 启动时探测 `sandbox-exec`，不可用时默认保持 fail-closed（`workspace-write`，向 stderr 打明示告警），仅在显式指定 `DSH_ALLOW_UNCONFINED_DEV=1` 时导出 `DSH_PERMISSION_MODE=danger-full-access`；逃生阀 = `DSH_SKIP_SANDBOX_PROBE=1` 或显式设 `DSH_PERMISSION_MODE`（依据见 [sandbox-backend-probe](../../notes/archived/2026-10-10-sandbox-backend-probe.md)）。

## 2. 调试阶梯（组合层 → 会话层，不跳层）

| 层 | 手段 | 核对什么 |
|---|---|---|
| 1 组合层 | `pnpm dsh --profile <p> --dump-config` | 打印最终组合树（bundle → profile patch → home patch → `--patch` overlay，见 `vendor/dsh/apps/cli/src/dump-config.ts`）；patch 语法见 [bootstrap](./bootstrap.md) |
| 2 装载层 | 查看 preset roster 报错 | roster 连原因一起列出（fail-loud），报错即诊断，不静默跳过 |
| 3 生效层 | 核对 `hmr` row 与重启边界 | 长驻 Web 默认启用 HMR；headless/sdk/acp 通过 `hmr` row `disabled: true` 关闭（判据 = `vendor/dsh/packages/bundle/base/cordis.patch.yml`） |
| 3.5 退出层 | 任务跑完但进程不退 + stdout 零输出 | 查组合里的 `hmr` row；一次性自定义 profile 需退出时设 `disabled: true`，或直接用 shipped `headless` |
| 3.6 表面层 | 角色没入戏 / persona 不生效 | preset 只在 Web 面挂载（`web-app` 组合 `session-controller`）；headless/sdk/acp 绕过 preset，验证角色必须走 Web 会话 |
| 3.7 工具面层 | 角色不能读写文件 / 加载 skill / 写交付物 | preset composition 自包含（不继承 profile）；核对会话日志 `request/header.tools`（多帧 zstd 用 `zstd -d -c` 读全量） |
| 3.8 Web RPC 层 | 新建会话 UI 静默无反应 | 直接调 `session/create` RPC（见 [web-rpc](./web-rpc.md)）拿 `agent-preset/invalid` 与缺失必填 config 字段 |
| 3.9 客户端模块层 | 整窗只剩 HARNESS / Failed to load plugins | 先跑 `node checks/lanes/client-load.entry.mjs` 定位失败入口，按下方客户端排障要点核对 |
| 4 会话层 | 先跑 `pnpm diagnose`，再读 `$DSH_HOME/sessions/` JSONL | `model-visible ⟺ logged`，上下文从日志重建；headless 会话收尾会删目录，分析趁进程存活时进行 |
| 5 回归层 | `snapshots/` 回放对比 | 回答「行为为什么变了」的最快路径 |

### 客户端模块层（阶梯 3.9）排障要点

- **不静默失败**：client `apply` 抛错会直接进入 BootPage 错误屏，浏览器 console 输出 `failed to apply loader entry <id> (<name>)`。
- **`dsh.client.inject` 是模块到达依赖边**：浏览器模块 factory 沿此边在 consumer 前到达；shell baseline（`PLATFORM_MODULES`：`react`/cordis/store/ui-slots/ui-primitives/ui-dockkit）隐式提供基础模块。
- **静默不出现通常是 fiber PENDING**：声明的 Cordis 服务无人提供时会无限等待，贡献安静不挂载。
- **禁止重复 `$mount`**：复用已有贡献（如官方 Team remote）必须走服务 `inject` 等待，重复 `$mount` 会抛 `already mounted` 导致整窗失败。

### 通用诊断与临时实验

- **栈采样先于二分**：`sample <pid> 3` 看主线程——kevent 空转表示等未到达事件，CPU 满载表示死循环。
- **一次性实验不落盘**：`pnpm dsh --profile <p> --patch ./run/try-x.patch.yml` 风险限单次进程；指令层临时叠加可用 `AGENTS.local.md` / `CLAUDE.local.md`（不进 git）。
- **进程内自省**：会话内 `cordis_inspect_list` / `cordis_inspect_query` 与 `dsh --dump-config-schema` 查看实际装配（仅可见性，不构成权限边界）。

## 3. 限流旋钮与成本结构

| 旋钮 | 默认 | 在哪调 | 对本项目的意义 |
|---|---|---|---|
| team `maxMembers` | 8 | host 行 config（startup fail-loud） | 当前团队规模下 8 够用；扩编制再调 |
| team `maxTasks` / `maxMessageBytes` | 256 / 64KiB | 同上 | 消息超 64KiB 会拒，长稿走文件 + 消息给路径 |
| subagent `maxDepth` | **1** | `tool-subagent` 行（CEO 委托行 = 1；职能行 = 2；vp-eng = 3） | 默认仅一层（root→child），调大前评估失控半径 |
| `maxTokens` | adapter/route 默认 | 会话 `agentOptions` / 委托工具行 | 防单角色长篇失控（默认全员同模型，见 [D16](../decisions.md#d16)） |
| compaction 阈值 | preset 行配置 | 各角色 preset 的 compaction 行 | VP 长会话靠压缩保上下文，按角色差异化 |

- **常驻成本**：CEO + 已 spawn 的 resident VP 各自独立计费与 KV cache（稳定 persona prefix 利于 cache 复用）。
- **脉冲成本**：one-shot workers 与 `vp-eng` workflow 并发冲刺。
- **省钱杠杆**：① 默认 fresh + 任务书（`context: 'fork'` 仅带已完成轮）；② 稳定事实放 KB 文件按需读，不进 persona（[role-content Note](../../notes/implemented/2026-11-10-role-content-rationale.md)）；③ 长稿交割走 workspace 文件 + 路径；④ 彩排可临时在委托 `agentOptions` 收紧，正式场不动。

## 4. 现场排障 runbook（症状 → 动作）

| 症状 | 判断 | 动作 |
|---|---|---|
| **面板空白 / 页签点不开 / 按钮无反应** | 区分环境未就绪与渲染失败 | 跑 `node checks/lanes/ui-scene.entry.mjs`（exit 2 = 未登录，exit 1 = 真断言失败）；加 `--steps <file>` 复现交互；证据落 `runtime/harness-home/diagnosis/` |
| **用户报「页面报错了」或查预设/数据闸门状态** | 浏览器错误进错误环并追加到 `$DSH_HOME/logs/company-client-errors.log`；预设挂载由 `presetHealth` 跟踪 | 会话内敲 `/company-diagnostics`（或 `/company-diagnostics status`）看 `workspace`、数据闸门、broken preset、检索缓存体积与最近错误；整链回归 = `node checks/lanes/client-error-chain.entry.mjs` |
| **会话卡住 / 以为崩了** | 多在等人回答或审批，非进程死 | 跑 `pnpm diagnose --session <slug>/<id>`：`NONZERO` 列非零 bash；中断轮标明等回答/等审批/真崩溃；child 目录也可点名 |
| **重启时仍有 subagent 在跑** | 宿主退出把 in-flight child 记为 `interrupted`，父侧无补发通知 | 重启前先等 child 终态或 cancel；重启后父会话用 `list_subagents` 查，要结果则 `send_to_subagent` 冷恢复 |
| **改了手册/CHARTER，进行中会话看不到** | 指令注入是触达驱动（无 watcher） | 让成员碰一次工作区文件（read/edit）或重开会话 |
| **启动报错随终端消失** | `pnpm company` 自动 tee 到 `runtime/web-logs/company-<ts>.log`（已脱敏） | 查看 `company(dev): 启动日志 → …`；vendor 直起时手动 `2>&1 \| tee`（原文含 token，绝不提交） |
| **浏览器找不到会话** | 会话列表按工作目录过滤且须带 token URL | 先选 `company-workspace`；用启动横幅里的 `/?token=` 打开 |
| **`pnpm company` 报 `EADDRINUSE`** | 已有观察窗在监听 | `lsof -nP -iTCP:<port> -sTCP:LISTEN` 复用旧窗；**日用 GUI 永不动**（见 [multi-human-runbook](./multi-human-runbook.md)） |
| **重启/换端口后 API 鉴权失败** | 启动 token 随进程生灭，cookie 名每次随机 | 从新进程横幅重取 `/?token=`；cookie 从响应头 `getSetCookie()` 显式带，不用 `-c jar` |
| **失控团队怎么停** | Lead 的 `session/cancel` 有效，teammate 由 subagent 托管 | 等待本轮结束或停进程；日志已落盘，停完照常归档 |
| **找不到某 VP 空间** | teammate 是子会话，不在顶层列表 | 会话头部 **Team 名册** → 点成员，或右栏**团队 → 在场**点击成员行旁路打开 |
| **VP 一直 running 不出活** | `list_agents` 看状态 | Lead 调 `interrupt_agent`（保留任务归属与邮箱），改派或重试 |
| **消息「发了没反应」** | 区分 `queued`（已持久化，**不得重发**）与 `accepted` | `queued` 会在对方冷恢复时必达；用 `wait_agent` 等待，勿重发 |
| **任务板编辑被拒** | `TEAM_TASK_STALE_REVISION`（CAS 冲突） | 重跑 `team_task_get` 取最新修订再改 |
| **teammate 建不出来** | roster fail-loud 报错 | 按报错修 preset 行/名字（名字永久占用，失败也占名）；超编查 `maxMembers` |
| **VP 被 compaction 洗糊涂** | 长会话压缩丢细节 | 指引其重读自身 journal / CHARTER（见 [presets.md](../contracts/presets.md)） |
| **演示中途需撤回某 VP 输出** | 日志不可改 | Lead `interrupt_agent` + 任务板 reopen，复盘时以日志回放解释 |
| **demo 崩了要重来** | 团队状态在 Lead session log（durable） | 重开进程冷恢复（teammate 收 queued 消息），或从 JSONL 回放叙事 |

- **每场 demo/排练收割三问**（机制家 = [close-out-definition skill](../../.agents/skills/close-out-definition/SKILL.md)）：① 抓到材料性异常没（判据 = [policy §P1-B](../policy.md#p1-b-缺陷材料性与修复自授权边界唯一定义家)）；② 行为值得钉吗 → `--record` 录场景或补判据；③ 撞到运行态事实没 → 更新本篇。

## 5. 回放复盘与开工前检查单

- **一切皆日志**：roster/task/mailbox 事件 log-only 存 Lead JSONL，`agentTeam` 投影可重放整场（`foldSubagentDescriptor`）。每场收尾由 CEO `present` 交付物，人将值得保留的教训追加进对应角色 journal。
- 升级纪律（experimental 漂移与 `sync-dsh.mjs` 升级环）见 [architecture Note](../../notes/implemented/2026-11-10-architecture-rationale.md) §8。
- **开工前检查单**：① 按 demo 规模过一遍 §3 旋钮（冲刺类动议显式压 workflow 总量）；② 通读 §4 症状表，现场按表行动不临场发明。
