---
topic: presets-delegation-architecture
intent: 从 awesome-dsh-plugin 的 18 个协作样本（源码级 memo）提炼“围绕 workflow/subagent 组织插件”的可迁移模式，补强本仓 presets 的结构结论
---

# 外部补遗：awesome-dsh-plugin 的 18 个协作样本给了什么启发

> 来源：本机 `~/awesome-dsh-plugin/_leverage/leverage-agent-collaboration/`（18 个样本卡 + 固定
> commit 的源码 memo + R0–R7 实测账本）。这是该项目的**二级分析**，不是我的独立源码复核；卡内
> 标了 `[SRC-TARGET]`/`[SRC-DSH]`/`[RUN]` 与行号。我读了它的章程、接缝表、反例、清单与 6 张关键
> 样本卡，**没有逐个重拉 18 个仓库**。引用时保留这一层证据边界。

## 1. 18 个样本的坐标（与 workflow/subagent 直接相关）

| # | 样本 | 机制一句话 | 对本仓的直接含义 |
|---|---|---|---|
| 15 | dsh-subagent-models | 在 `agent/request` 上统一覆盖 child 的 provider/model/effort | 路由是**调用配置**，不是每个 preset 的 persona |
| 16 | dsh-subagent-route-pin | 包装 provider + `startActivation` 钩子钉 child 路由；`provider.start` 只在 external 分支生效 | 用**一个 provider 名**当路由开关；先确认方法面 |
| 17 | dsh-subagent-fork-lite | 只 seed 最近 N 个完成 turn | fork 的上下文窗口是产品决策 |
| 01 | dsh-agent-teams | 可续子代理 + 磁盘 team.json + idle 边沿调度 + 邮箱三态 | 成员可续是“结果不可读”的补丁；邮箱要 ack 三态 |
| 04 | limuyang2/agent-team | 成员=独立根 Agent、异构配置、入队冻结 | 异构成员的代价是放弃父子/委派面 |
| 03 | dsh_workflow | 代码即编排 + 胶囊快照 + 内容键缓存 | “可复现”≠“断点续跑” |
| 18 | agent-dag-workflow | 声明式 DAG + checkpoint/`semanticHash` + 三档重放；额度取 min | 要 DAG/暂停/重放就得自建控制面 |
| 07 | file-claim | 边车认领 + `tools` 的 `pre-execute` 事件（deny） | 真互斥只能写在写路径上 |

## 2. 十个可迁移模式

### P1 接缝优先，偏离要登记

18 个样本的“六条立场”：委派走 `startActivation`、团队状态用宿主 storage/会话日志、拦截走
`tools` 的 `pre-execute`、文件隔离用 worktree、远程用 gateway/ACP、状态诚实（denied/stale/blocked）。
自建不是不行，但要写**代价 + 退出条件**（样本 03/04/11/18 的偏离登记）。
→ 本仓：`list_subagents`/`send_to_subagent`/`workflow_runs` 是**宿主控制面之外的补丁**，应在
能力清单/Note 里按“偏离登记”写清接缝、代价、退役条件（现有 Note 已有退役条件，但未用这个框架）。

### P2 三笔税：状态 / 冲突 / 收敛

每个协作设计必须回答：权威状态在哪、冲突谁裁决、崩了谁收敛。样本 04 的教训最狠：
**schema 里有 `leases` 表、`dependencyIds` 字段，代码里零读取、硬写 `[]`**——读字段表会高估它。
→ 本仓：能力清单不能只是“文档字段”，必须被生成器/测试**消费**；否则就是第四份副本。

### P3 三个买点 + 默认单 agent

并行上下文、独立验证、异构角色；一样不占就不该多 agent；写入保持单线程；多 agent 约 15× token。
→ 本仓五档方向正确，但缺“默认 + 预算”的显式判据；委派政策应把这三条写成默认规则。

### P4 额度是 min(模板, 宿主)，重试先声明幂等

样本 18：模板 policies 只能比宿主 ceiling 小；节点 `retry: never/safe/idempotent`，编译期拒绝
不安全重试；权限是 `requires` 交集、未声明即 fail closed。
→ 本仓：每角色/每通道的深度、并发、预算应写上限与来源；worker/团队不得“自己给自己提额”。

### P5 路由用稳定身份，不用 label

样本 16：一条 provider row 管所有 child，`experts` 按 label 文本开例外；label 来自模型写的
`description`，会漂。样本 15：用 `agents.isOwnedBy` 只改被委派 child，不覆盖顶层用户选择。
→ 本仓：worker/profile 的稳定身份是 `agentPreset`/provider 名/行 id，不是 `description` 文案；
043 的 `role/address` 应朝这个方向，而不是继续用 label 做路由。

### P6 结果可读性是设计约束，continuability 是补丁

样本 01 的因果链：子代理最终消息**不可程序化读取** → 成员把报告持久化到邮箱/任务板 →
成员必须可续。团队/`send_to_subagent` 都是在补“结果不可读”。
→ 本仓：039/040 的根因也是结果通道有损；优雅解是**结构化输出 + 文件/引用**，而不是更多续驶。

### P7 状态归属唯一，第二真相源要认领同步代价

样本 01 用磁盘 `team.json` 当真相源但只有进程内锁 → 两进程丢更新（R4a，退出码 0）；
样本 18 用 SQLite journal + checkpoint，恢复要过 authority/`semanticHash`。
→ 本仓：能力信息目前散在 YAML、docs、skills、host 代码；要么生成器单一源，要么明确“文档不是真相”。

### P8 调度挂 idle 边沿；投递 ≠ 消费

样本 01：`agent/status` idle 时原子认领 ready 任务；邮箱 `deliveryClaimedAt → deliveredAt →
readAt`，ack 只在 `agent/pre-step` 准入；消息带 `attemptId` 防上一代污染。
→ 本仓：team/worker 的“完成通知”语义应区分“投递成功/被消费”；042 的 `lastTurnEnd` 也是
“终态记录 ≠ 父已读到”。

### P9 两种团队架构，别混着假装

- 01：成员=可续子代理，保留父子与委派面，但结果要邮箱/持久化；
- 04：成员=独立根 Agent，可异构配置，但放弃 spawn/interrupt/wait 与父子上下文。
DSH 官方 team 继承 Lead（affordance 已核）——是第三种约束。
→ 本仓：不要用 preset 散文把“成员可异构”说成事实；若要异构成员，那是 04 类插件/架构，
不是 presets 能给的。

### P10 workflow 的三个承诺分开：恢复 / 重放 / 重跑

原生 workflow 是脚本编排，没有 DAG/暂停/断点；样本 03 卖“可复现”（胶囊+内容键缓存，整体重跑），
样本 18 卖“DAG+checkpoint+三档重放”，两者都自建控制面并认领语义；额度取 min；重放不还原隐藏思维链。
→ 本仓：preset 只该决定“这条通道开不开、预算多少”，不应在 skill 里假装有 DAG/暂停；
若产品需要断点/重放，明确选 03/18 类插件或上游，而不是在 eng-teaming 里加句。

## 3. 直接映射到本仓的四个缺口

| 缺口 | 外部证据 | 补强动作（研究建议） |
|---|---|---|
| G1 组合重复/能力隐晦 | P2/P4 的“schema≠code”“min(template,host)” | 能力清单必须**被测试/生成器消费**；上限写来源 |
| G2 worker=角色克隆 | P5/P9 的稳定身份与两种团队架构 | worker 用 `agentPreset` 稳定钉组合；异构成员另立架构，不写进 prose |
| G3 合同散落 | P1/P6 的接缝与结果可读性 | 合同挂接缝/工具描述；结果形状进合同，不靠续驶补 |
| G4 三通道+面级验证 | P8/P10 的投递/消费、三个承诺 | 通道语义一张表；workflow 的暂停/重放承诺显式分级 |

## 4. 对 A/B/C 方案的两条加强

1. **A 计划加“可执行清单”**：能力清单不是文档，而是被 keyless 矩阵（dump-config）与生成器读取的
   数据；否则会重演样本 04 的“schema 有、代码没有”。
2. **A 计划加“偏离登记”**：`list_subagents`/`send_to_subagent`/`workflow_runs` 按外部框架写
   “接缝 / 代价 / 退出条件”；并加“结果可读性”规则（结构化输出/文件引用优先，续驶是补丁）。

## 5. 不要照抄的

- 证据链停在 README 的样本（03 未发布、10/12/17 旧版本、11 下架、13/14 在 rc.3 有问题）——本仓
  只借模式，不借安装。
- 用 label/description 做路由；把 `writeScopes` 当互斥；把 approval 当并发控制；把提示词当拦截；
  把“记录存在”当“可恢复”；把 DAG 图当“能暂停”；把多 agent 当省 token。
- 在共享 checkout 上并行写；把“投递成功”当“被消费”；把 schema/字段表当实现。

## 6. 证据与边界

- 来源目录：`_leverage/leverage-agent-collaboration/`（章程、接缝表、样本卡、memo、R0–R7 账本）。
- 我只读了章程/接缝/反例/清单与 6 张关键卡；**没有重新验证 18 个仓库的源码**；样本卡自称 L1/L2，
  引用时按“二级分析”对待。
- 外部的 90.2%/15×/40% 等数字与外部文献引用，保留其适用面，不作为本仓收益承诺。
