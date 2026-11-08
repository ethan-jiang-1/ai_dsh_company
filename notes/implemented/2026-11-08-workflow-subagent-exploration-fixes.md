# 2026-11-08 · workflow + subagent 探索性测试第一轮：6 张卡（2×P1 + 4×P2）+ 2 条当场修

状态：implemented（2026-11-08；第一轮探索已执行并收口）
上游 = [探索性测试 bug-hunt 问题卡](../../_backlog/issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)

## 决定

- 按问题卡执行一轮**探索性测试**（不是固定矩阵全绿）：forced 锚点 + guided natural charters +
  keyless fake-provider 重试档；入口 R（VP-Eng root）/ C（CEO→`vp_eng`）/ T（teammate）/ N（负例）。
- **发现的方向与处置**（完整表 = [研究材料 §16](../../_backlog/research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)）：
  - **F1**（方向 R2 强制 workflow + 模型自拟 schema）：`agent({schema})` 的 `enum`/`const` 必须配 `type`，
    模型面描述没说 → 首跑整轮 `UNSUPPORTED_SCHEMA`。已加 `eng-teaming` 规则；机制/上游留
    [BUG-036](../../_backlog/_archive/fixed_bugs/BUG-036-workflow-schema-enum-type.md)。
  - **F2**（方向 R3 委派深度链）：根会话 = Lead，团队版 `send_message`/`list_agents` shadow 全局版；
    契约 §4.4 与五个 preset 注释误写“职能根会话不是成员”。已修 docs/注释/`eng-teaming` 控制面规则；
    M2 natural 复跑仍见 `wait_agent`（`no-active-peer`），已把它补进控制面列表；机制留
    [BUG-037](../../_backlog/_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md)。
  - **F3**（方向 R5 W 分支内再委派）：分支返回值把回执和结论拼在一起（`started subagent … <值>`），
    带 schema 的分支会 null。已加“分支默认是叶子”规则；机制留
    [BUG-038](../../_backlog/_archive/fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md)。
  - **F4**（方向 C1 CEO→vp_eng）：命名 child 同时用 `send_message` + 完成通知回报，父收到两份。
    已修 `eng-workflow` 第 5 步：作为命名 child / worker 时终稿就是回执，不再 `send_message` 给父。
  - **F5**（方向 C1）：CEO 用 `bash sleep 25/30` 轮询 child，而不是派发后结束本轮。已修 CEO
    `assembling-the-team` + persona：明确禁止 sleep/轮询，派发后立即结束本轮、完成通知开新轮。
  - **F6**（方向 R7 溢出压力）：workflow >50k 返回值是**硬截断**，spill notice 说 “Full formatted result”，
    但 spill 文件同样是截断副本（50,102 字符，含同一 `[truncated: 35806 more characters]` 标记），
    缺段在模型可读面不可恢复。已修 `eng-teaming`“返回聚合/异常”+ 研究材料 §1.1 更正；
    R9 验证绿色替代（6 分支各写 400 行文件、父只拿 path/行数，~0.6k 字符无截断、wc/awk/md5 全过）；
    机制/上游留 [BUG-039](../../_backlog/_archive/fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md)（P1）。
  - **F9**（方向 R10 后台 W 自然完成）：带 schema 的分支只回文本、`turn/end completed`，父却拿到
    `null`（文本答案被丢弃、无诊断），job/run 仍 `completed`。已修 `eng-teaming`（schema 分支明确要
    `structured_output`；验收看 null/count）；机制/上游留
    [BUG-040](../../_backlog/_archive/fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md)（P2）。
  - **F10**（方向 RS1 宿主重启）：child 在跑时 SIGTERM 宿主再重启，父 durable 无新 turn/notice，
    child durable 记 `interrupted`；父再问时 `list_agents` 只 lead、`job_list` 空，无法查询。
    已在 `eng-teaming` 长跑条加“别跨重启等通知”；机制/上游留
    [BUG-041](../../_backlog/_archive/fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md)（P1）。
  - **F1 补充**（R13）：schema 子集还拒 `type: ['string','null']`；已把“type 只接受单个字符串、
    联合类型用 oneOf”写进 `eng-teaming`，BUG-036 补第二实例。
  - **F11**（方向 R12 fork 上下文）：`subagent_fork` 只播种**已完成轮**；同一 turn 内刚读的 tool
    result 不在前缀里。已修 `eng-teaming` 五档表（fork 带上下文但要写明这条）；模型如实报
    `NOT-IN-CONTEXT`，未伪造继承。
  - **F12**（方向 V1 其他职能负例）：vp-sales 根门没有 workflow，如实改用 4 个 subagent（PASS）；
    但每个 generic child 都 `send_message` + 完成通知双份——F4 的跨角色版，未改（无共享规则的合适家）。
  - **F13**（方向 R13 fork after completed turn）：fork 仍 `cat` 源文件却声称“来自继承上下文”，
    父只能记 `not_provable`。方法教训：验证继承/来源要用**磁盘上不存在的 token**，别用可重读的 fixture。
  - **WW1**（workspace-write 探针）：本机 `sandbox-exec: sandbox_apply: Operation not permitted`；
    模型如实报错、未绕道。宿主阻塞，不记 bug；部署面仍需 Linux/WSL 或修 Seatbelt 后复验。
- 不把“小任务自己做”（R1/T1）、“natural 选另一条合法通道”记成 bug；不宣称未命中的面没有 bug。
- 六张缺陷卡（036/037/038/040 P2、039/041 P1）都是 `调查中`：当场修的是**本仓提示面/合同**，vendor 机制
  （schema 子集、团队 shadow、嵌套结果形状、50k 硬截断）未改。

## 输掉的方案

- **直接在 vendor 改**：vendor 只读铁律；正确载体是缺陷卡 + 上游提案。
- **把三条都当“简单”当场修完**：036/037/038 的根因在 vendor 机制/工具合同，改 skill 只是缓解；
  把“缓解”写成“已修”会让下一轮误判机制已解决。
- **给 keyless retry 加门禁**：vendor 已有同语义测试；本仓加门禁需 P2 判据（复发过 + 可机械判定 +
  负例），本轮只留证据脚本，不预铺。
- **把 50k 截断当“显示问题”不建卡**：R7 证明 spill 文件也截断、缺段找不回；只加 skill 提示会让下一轮
  仍误以为可恢复。
- **让 CEO 前台等 child**：activation 合同是完成通知开新轮；用 sleep 等待会占住 turn、依赖固定睡眠。
- **在 skill 写“任何 null 都重试一次”**：`null` 不保留 stopReason，refusal/error/aborted/缺结构化结果
  无法区分；只允许对**声明为幂等且可重试**的任务有界重派一次。

## 后果与边界

- `eng-teaming` 多了 4 条硬规则（schema 子集 / 失败不自动重跑 / 分支默认叶子 / 控制面 shadow）；
  `eng-workflow` 第 5 步区分 team 任务板与命名 child 回执；CEO 两处加“禁 sleep 轮询”。
- 机制事实（读侧）：根门 `list_agents` 只列 lead；child 那层才有全局版控制名；workflow 分支内再委派
  的值会跨轮拼接。这些已写进 [delegation 合同](../../docs/delegation.md) §4.4 与技能。
- 未覆盖：长期采纳率、其他四职能行为、`workspace-write`、release-smoke、natural S-only/M2、
  max-tokens/aborted 自然案例；R7 覆盖了 >50k 截断，但未覆盖“分支落文件再汇总”的绿色替代（详见研究材料 §16.3）。

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
- **红**（R7）：`session-c839c3c9-6117-49dd-a9ab-2a21e47b865b` 完整渲染 ~85.9k 字符 → tool result
  49,929 字符 + `[truncated: 35806 more characters]`；spill 文件 50,102 字符且含同一标记；父落 rows 0–2
  完整、row 3 半段、row 4/5 null。
- **取消收敛**（R8）：`session-485bf924-eaf4-459f-b7f2-a3e8ff548318` 12s 后 `session/cancel` →
  `turn/end aborted(user)`、run `cancelled`、6 agents `cancelled`、child `aborted(parent)`、无残留 sleep。
- **pipeline**（R11）：`session-f97fcc10-4ecc-4d40-97e6-be8c2264e5f4` 1 run/8 agents，4 模块值正确；
  8 agents 超出本轮 6-agent 探索上限（未强制，过程记录）。
- **其他职能负例**（V1）：`session-7ce4fba0-67a7-4aae-a795-dfbbc0450636` tools=73 无 workflow，
  4 subagent 核查、无假调用；children 均 `send_message`（F12）。
- **workspace-write**（WW1）：`session-c40f3947-d771-49d7-829e-13d8f55c9d71` bash 在 sandbox 初始化
  阶段失败（`sandbox_apply: Operation not permitted`），模型未绕道。
- **fork 上下文**（R12）：`session-2a257704-2d79-4921-ba09-a5e7626448de` 同一 turn 内 read a →
  fork 报 `a = NOT-IN-CONTEXT`（拒绝重读伪造）；b/c workflow 值正确；父记 `fork_inherited_a: false`。
- **fork after completed turn**（R13）：`session-1351d1e2-4159-43da-9b0a-4ef5f87d8339` fork 仍
  `cat fixtures/a/package.json` 并声称继承；父记 `not_provable`（F13 方法教训）。同会话 first run
  因 `type: ['string','null']` fatal（BUG-036 第二实例）。
- **nullable schema 绿**（R15）：`session-c6704a13-7917-410d-8f66-240f9c177f75` 1 run/2 agents
  completed；`oneOf` 替代 type 数组、两分支均调 `structured_output`、missing 返回 null，首跑无 fatal。
- **fork token 继承**（R14）：`session-9b46b434-10b0-4ecf-b354-1412444f9788` turn1 只记 token，
  turn2 fork 无工具、原样复述 `FORK-TOKEN-7f3a9c`——已完成轮继承成立（F11 绿）。
- **宿主重启**（RS1）：父 `session-24da0c1b-…` 无新 turn；child `48eb730a-…` `turn/end interrupted`；
  父再问时 `list_agents` 只 lead、`job_list` 空，自述无法查询。
- **多轮混合**（M2）：`session-0ae9def6-d13e-4e49-8b91-8b1a364bc93a` 1 workflow（4 agents）+
  2 subagent；report.json 三轮原文、冲突 1 条、分歧保留；`wait_agent` 残留一次（F7 已补规则）。
- **C 入口 depth 链**（CD2）：`session-a146504e-a210-401d-8201-c3099066e2ab` → child
  `6ac3bddb-…`；W1 的 `subagent` 被拒 `subagent depth 3 exceeds maxDepth 2`，声明面
  `current 2 / max 2 / remaining 0`；W1 未读文件、未重试；child 用 `bash sleep 90/75`（F8 观察）。
- **溢出绿替代**（R9）：`session-b93091e6-2829-4436-a55c-c711e6c18c36` workflow 返回 ~0.6k 字符、
  6 文件各 400 行；父用 `wc -l`/`awk`/`md5` 独立核对全过。
- **schema 文本丢弃**（R10）：`session-2f4657e5-ecf4-4004-8007-4d2836d4068b` 后台 W 4 agents；
  child `a1401bf0-…` read 成功、回文本、`turn/end completed`；父 `modules[0]=null`、`count:3`；
  补跑 subagent 拿到 m01。
- **机制**：`node --import tsx/esm runtime/tmp/explore/keyless-retry.ts` 4/4 PASS（retry-once /
  AGENT_START fatal 穿 parallel / AGENT_RESULT fatal / 两次失败停在 2 starts）。
- 证据目录：`runtime/tmp/explore/`（gitignored）；研究材料只留脱敏摘要与 session id。
