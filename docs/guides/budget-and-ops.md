# 预算限流与 demo 运维

> 五个角色 + 各自 workers 的组织会烧 token、会出状况。本篇收拢**限流旋钮**与
> **demo 运维 runbook**（症状→动作），并给回放复盘的路径。数值默认值均核实自
> DSH 工作树（`packages/experimental/agent-team/src/index.ts`、
> `packages/subagent/tool-subagent/README.md`、`packages/workflow/workflow-worker-thread/src/runtime.ts`）。

## 1. 限流旋钮总表

| 旋钮 | 默认 | 在哪调 | 对本项目的意义 |
|---|---|---|---|
| team `maxMembers` | 8 | host 行 config（startup 校验 fail-loud） | CEO+4 职能=5，留 3 个余量；扩编制才调 |
| team `maxTasks` / `maxPendingMessagesPerMember` / `maxMessageBytes` | 256 / 64 / 64KiB | 同上 | 默认够一场 demo；消息超 64KiB 会拒（长稿走文件+消息里给路径） |
| workflow `maxTotalAgents` | per-run 上限（tool/consumer 可压低） | `dsh-tool-workflow` 行 / 调用参数 | CEO 写循环脚本时的 runaway 保险；冲刺前显式设小 |
| workflow 并发槽 | engine 配置（`acquireSlot`） | workflow-worker-thread 行 | 限制同时跑的 agent() 数 |
| subagent `maxDepth` | 3 | `dsh-tool-subagent` 行 | 组织深度：CEO(0)→VP(1)→worker(2)→grand-worker(3)——默认够 4 层，别乱调大 |
| `maxTokens`（每次请求输出上限） | adapter/route 默认 | 会话创建 `agentOptions` / 委托工具行 | 防单角色长篇失控（路由 = 全员同模型默认，D16） |
| compaction 阈值 | preset 行配置 | 各角色 preset 的 compaction 行 | VP 长会话靠压缩保上下文；按角色差异化 |

## 2. 成本结构（每场 demo 的 token 面）

- **常驻成本**：CEO 会话（全程）+ 4 个 VP 会话（spawn 后 resident）——每个会话独立计费、
  独立 KV cache（persona prefix 稳定对 cache 友好，roles-isolation §1）。
- **脉冲成本**：workers（one-shot，随生随灭）、workflow 冲刺（脚本内 agent() 并发）。
- **省钱杠杆**：① `fork` teammate 下发会议上下文，比"CEO 逐个转述 brief"省重复输入；
  ② 稳定事实放 KB 文件按需读，不进 persona（role-content-plan §0.2）；③ 长稿交割走 workspace 文件 +
  消息里给路径（避开 64KiB 邮箱上限同时也省 token）；④ 需要压彩排成本时，在彩排动议的委托工具
  `agentOptions` 上临时收紧（正式场不动——D16 默认全员同模型）。

## 3. demo 运维 runbook（症状 → 动作）

| 症状 | 判断 | 动作 |
|---|---|---|
| 浏览器里找不到某场会话 | 会话列表按**工作目录**过滤，且必须用带 token 的 URL | 先选/加 `company-workspace`；直接开端口会卡鉴权（启动横幅里的 `/?token=` 一定要带上） |
| `pnpm dsh web` 报 `EADDRINUSE 3086` | 已经有一个观察窗在跑 | 先 `lsof -nP -iTCP:3086 -sTCP:LISTEN` 复用旧窗（token 在它自己的启动横幅里）；**3080 是本 GUI，永不动** |
| 重启后/换端口后调 API 报鉴权失败 | 启动 token **随进程生灭**（重启即换），cookie 名**每次启动随机** | 从**新进程**的启动横幅重取 `/?token=`；cookie 从响应头**显式带**（`curl -D -` 抓 set-cookie；**别用 `-c jar`**，脚本同法见 [harvest-probe.mjs](../../scripts/harvest-probe.mjs) 的 `getSetCookie()`） |
| 失控的团队跑怎么停 | Lead 的 `session/cancel` 有效；teammate 由 subagent 路由托管 | teammate 会报 `agent-busy` / `not found (not attached)`——只能等其本轮结束或停进程（2026-09-22 实测）；**日志已落盘**，停完照常归档 |
| 找不到某位 VP 的空间 | teammate 会话是**子会话**，不在顶层列表 | 会话头部 **Team 名册** → 点成员名打开；R5b 已交付**驾驶舱页签**（在场板行可点，见 notes/implemented/2026-09-22-org-presence-board.md） |
| VP 一直 running 不出活 | `list_agents` 看状态 | Lead 调 `interrupt_agent`（只断当前轮，任务归属与邮箱保留），改派或重试 |
| 消息"发了没反应" | 发送结果是 `queued`（已持久化，**不得重发**）还是 `accepted` | `queued`＝对方 inactive，冷恢复时必达；等或用 `wait_agent`；别重发造成重复 |
| 任务板编辑被拒 | `TEAM_TASK_STALE_REVISION`（CAS） | 重新 `team_task_get` 拿最新修订再改——两个人同时改一任务是设计内冲突 |
| teammate 建不出来 | roster/名册报错连原因列出（fail-loud） | 按报错修 preset 行/名字（名字永久占用不复用，`provisioning` 失败也占名）；超编检查 `maxMembers` |
| VP 会话被 compaction 洗糊涂 | 长会话压缩后丢细节 | 指引它重读自己 journal/CHARTER（role-content-plan §0.3 的开工动作就是为此） |
| Web 第 4 个窗口卡死 | FAQ 12：rev 轮换+陈旧缓存（动态模块 404） | 按 FAQ 12 runbook：重打补丁→重启→验证；demo 前升过 vendor 必走一遍 |
| 演示中途要撤回某 VP 的话 | — | Lead `interrupt_agent` + 任务板 reopen；会话日志不可改，复盘时用回放解释 |
| demo 崩了要重来 | 所有团队状态在 Lead session log（durable） | 重开进程冷恢复：teammates inactive 冷恢复收 queued 消息；或从 JSONL 回放叙事 |

## 4. 回放与复盘

- **一切皆日志**：roster/task/mailbox 事件 log-only 存 Lead 会话 JSONL；`foldTeam()` 可重放
  整场（`docs/subsystems/agent-team.md` §Replay）。复盘 = 读日志，不靠记忆。
- 每场 demo 收尾动作：CEO `present` 交付物；人（你）把"值得留的教训"追加进对应角色
  journal——这是组织学习闭环的 v0。
- 升级纪律（experimental 漂移、`sync-dsh.mjs` 升级环、兼容矩阵）见 [10](../design/architecture.md) §8，
  不在此重复。

## 5. 开工前检查单

- [ ] §1 旋钮按 demo 规模过一遍（默认值即可跑通，冲刺类动议显式压 workflow 总量）
- [ ] §3 runbook 通读一遍（现场出状况时按表行动，不临场发明）
