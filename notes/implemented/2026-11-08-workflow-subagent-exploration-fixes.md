# 2026-11-08 · workflow + subagent 探索性测试第一轮：3 张 P2 卡 + 2 条当场修

状态：implemented（2026-11-08；第一轮探索已执行并收口）
上游 = [探索性测试 bug-hunt 问题卡](../../_backlog/issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)

## 决定

- 按问题卡执行一轮**探索性测试**（不是固定矩阵全绿）：forced 锚点 + guided natural charters +
  keyless fake-provider 重试档；入口 R（VP-Eng root）/ C（CEO→`vp_eng`）/ T（teammate）/ N（负例）。
- **发现的方向与处置**（完整表 = [研究材料 §16](../../_backlog/research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)）：
  - **F1**（方向 R2 强制 workflow + 模型自拟 schema）：`agent({schema})` 的 `enum`/`const` 必须配 `type`，
    模型面描述没说 → 首跑整轮 `UNSUPPORTED_SCHEMA`。已加 `eng-teaming` 规则；机制/上游留
    [BUG-036](../../_backlog/bugs/BUG-036-workflow-schema-enum-type.md)。
  - **F2**（方向 R3 委派深度链）：根会话 = Lead，团队版 `send_message`/`list_agents` shadow 全局版；
    契约 §4.4 与五个 preset 注释误写“职能根会话不是成员”。已修 docs/注释/`eng-teaming` 控制面规则；
    机制留 [BUG-037](../../_backlog/bugs/BUG-037-root-team-tool-shadowing.md)。
  - **F3**（方向 R5 W 分支内再委派）：分支返回值把回执和结论拼在一起（`started subagent … <值>`），
    带 schema 的分支会 null。已加“分支默认是叶子”规则；机制留
    [BUG-038](../../_backlog/bugs/BUG-038-workflow-branch-nested-delegation-result.md)。
  - **F4**（方向 C1 CEO→vp_eng）：命名 child 同时用 `send_message` + 完成通知回报，父收到两份。
    已修 `eng-workflow` 第 5 步：作为命名 child / worker 时终稿就是回执，不再 `send_message` 给父。
  - **F5**（方向 C1）：CEO 用 `bash sleep 25/30` 轮询 child，而不是派发后结束本轮。已修 CEO
    `assembling-the-team` + persona：明确禁止 sleep/轮询，派发后立即结束本轮、完成通知开新轮。
- 不把“小任务自己做”（R1/T1）、“natural 选另一条合法通道”记成 bug；不宣称未命中的面没有 bug。
- 三张缺陷卡都是 P2、`调查中`：当场修的是**本仓提示面/合同**，vendor 机制（schema 子集、团队 shadow、
  嵌套结果形状）未改。

## 输掉的方案

- **直接在 vendor 改**：vendor 只读铁律；正确载体是缺陷卡 + 上游提案。
- **把三条都当“简单”当场修完**：036/037/038 的根因在 vendor 机制/工具合同，改 skill 只是缓解；
  把“缓解”写成“已修”会让下一轮误判机制已解决。
- **给 keyless retry 加门禁**：vendor 已有同语义测试；本仓加门禁需 P2 判据（复发过 + 可机械判定 +
  负例），本轮只留证据脚本，不预铺。
- **让 CEO 前台等 child**：activation 合同是完成通知开新轮；用 sleep 等待会占住 turn、依赖固定睡眠。
- **在 skill 写“任何 null 都重试一次”**：`null` 不保留 stopReason，refusal/error/aborted/缺结构化结果
  无法区分；只允许对**声明为幂等且可重试**的任务有界重派一次。

## 后果与边界

- `eng-teaming` 多了 4 条硬规则（schema 子集 / 失败不自动重跑 / 分支默认叶子 / 控制面 shadow）；
  `eng-workflow` 第 5 步区分 team 任务板与命名 child 回执；CEO 两处加“禁 sleep 轮询”。
- 机制事实（读侧）：根门 `list_agents` 只列 lead；child 那层才有全局版控制名；workflow 分支内再委派
  的值会跨轮拼接。这些已写进 [delegation 合同](../../docs/delegation.md) §4.4 与技能。
- 未覆盖：长期采纳率、其他四职能行为、`workspace-write`、release-smoke、natural S-only/M2、结果 spill、
  max-tokens/aborted 自然案例（详见研究材料 §16.3）。

## 验证（实跑）

- `npx vitest run tests/presets`：**54 passed**。
- `node checks/smoke/preset-smoke.mjs`：**ALL PASS**（6 角色 + 3 委派子人格）。
- **红**（R2）：`session-375dd67f-3d57-437c-a1fc-17a7955c7c80` 第一次 workflow run
  `run-end stopReason=error`、零 agent，错误 `schema.properties.status.enum requires type or oneOf`。
- **绿**（R6）：`session-e25adbbf-22c5-4e38-a999-1b4edb56ca11` 单 run / 7 agents / `completed`，
  schema 写成 `{ type: 'string', enum: [...] }`，无第一次 fatal。
- **红**（C1）：`session-5d8e2e80-8321-484b-a90a-c8c7eb8c10ca` CEO `bash sleep 25/30` 轮询；child
  `send_message` + 完成通知双份。
- **绿**（C2）：`session-08fd1621-98e9-4956-bc89-ee7d0be09c75` CEO 派发后立即结束本轮
  （“已派活，本轮结束”），无 sleep；child 未发 `send_message`。
- **机制**：`node --import tsx/esm runtime/tmp/explore/keyless-retry.ts` 4/4 PASS（retry-once /
  AGENT_START fatal 穿 parallel / AGENT_RESULT fatal / 两次失败停在 2 starts）。
- 证据目录：`runtime/tmp/explore/`（gitignored）；研究材料只留脱敏摘要与 session id。
