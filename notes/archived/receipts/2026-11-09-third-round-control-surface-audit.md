# 2026-11-09 · 第三轮探索收口：控制面/多层的模型可见面审计

状态：implemented（2026-11-09；第三轮探索收口，3 张新卡 + 3 处文本修正）
上游 = [探索性测试问题卡](../../../_backlog/issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)
（修复轮 = [委派面合同修复](../../implemented/2026-11-08-delegation-contract-repair.md)；运行表 = [研究材料 §17](../../../_backlog/research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)）

## 决定

- 修复轮之后按 [NEXT-ROUND-ADVICE](../../../runtime/tmp/explore/NEXT-ROUND-ADVICE.md) 只探未覆盖面：
  多层结果变换、cold resume/新控制工具、团队继承×新控制名、compaction×skill；workspace-write 本机
  Seatbelt 阻塞，不测不声称。
- **新发现分诊**（不是全部都要修）：
  - [BUG-042](../../../_backlog/_archive/fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md)（P2）：
    `list_subagents` 的 `lastTurnEnd` 真实装配恒缺——`company-session-query-sqlite` 在
    `isolate:{sessionQuery:true}` 组内，host 的 `ctx.get('sessionQuery')` 拿不到；修复轮 spec 用 fake
    service，所以门禁绿。C2/C2b/C7 三次复现。**修复 Agent 已接 042，本轮不动。**
  - [BUG-043](../../../_backlog/_archive/fixed_bugs/BUG-043-list-subagents-includes-teammates.md)（P2）：`list_subagents`
    也列 teammate，与 team `list_agents` 名册重叠；工具描述只说“child 不是 roster member”。
  - [BUG-044](../../../_backlog/_archive/fixed_bugs/BUG-044-background-job-lost-on-restart.md)（P2）：后台 workflow job
    不跨宿主重启（`job_list` 空/`unknown job`/无通知）；child 会话仍在且可 `send_to_subagent` 冷恢复，
    但只能重读当前值，原 job 输出不可恢复（C7R）。
- **当场修的文本**（简单缺陷，无卡）：
  - `eng-teaming`“返回聚合/异常”补：spill 长行用 `bash tail -c`/`sed` 按字节取（`read` 按 2000 字符/行
    截断；P1）；分支自述的“是否截断/长度”不可信，父用指针 + `read`/`tail` 自己核（C11）。
  - `docs/contracts/delegation.md` §1、CEO `assembling-the-team`/persona、`eng-teaming` 两处：改稿优先
    `send_to_subagent` 续同一个 named child（带上一稿），不可续再委派。C10 红（模型照工具描述做了对的事，
    书面契约却相反）。
- **只记观察、不立卡的**：F18（V2 里 vp-sales 没提/没用新工具，但 C12/C13b 证明能力可用，属方法选择）；
  F19（C8 Lead 花 300s 自读 vendor/等待 teammate，turn 未收口；不是深度机制失败）；C13a 的 eng-4 没加载
  `eng-teaming`、两跳间用 `bash sleep`（F7/F5 的 teammate 版）。

## 输掉的方案

- **给其他职能逐个加 `list_subagents`/`send_to_subagent` guidance**：C12（vp-sales）与 C13b（teammate）
  在自然任务里都能自己选对，工具描述已够；再加只增 token 税。F18 降为观察。
- **把 teammate 从 `list_subagents` 过滤掉**：会丢“成员也是 activation”的可见性；更合理的是行上标
  `role/kind`（BUG-043 的候选），本轮不擅自改代码。
- **抬高 `read` 的按行上限**：vendor 行为，本仓不改；用 bash 按字节取是现成路径。
- **把 042 的 lastTurnEnd 用 host 侧 fake 兜底**：等于造平行读面；正确修法在装配/isolate 边界（卡内已写）。
- **为这批发现新增 verify 门禁**：P2 准入要求“本仓复发过 + 可机械判定 + 负例已证”，且门禁是要维护的
  代码；资产落在卡与既有 pin/smoke 已足够。

## 后果与边界

- 双控制面（`list_agents`/`send_message` vs `list_subagents`/`send_to_subagent`）在 C13b 里被 teammate
  自然选对：先看到 child 不在 roster，再用 `send_to_subagent`；C10 里 CEO 也用它复用 named child。
- 三张新卡已由修复 Agent 收口（042/043/044 归档）；本轮随后做了 20–30 分钟定向回归：C2f
  （`lastTurnEnd: interrupted` + cold resume 读到 1.4.2）、C7b（`workflow_runs` 报 `lost` + 4 child）、
  C13c（`role: teammate` / `address: eng-7`），三条 PASS，未发现新缺陷。
- 未覆盖：one-shot child 的 resume 拒绝（本 profile 的 workflow/命名 child 实测都是 continuable）；
  更深 compaction（`/compact` 摘要保留了 eng-teaming，未测“摘要丢规则”的边界）；teammate 对新控制面的
  正式选择矩阵（只做了 C13b 一条自然样本）；workspace-write（Seatbelt 阻塞）。

## 验证（实跑）

- `pnpm verify` → ALL PASS（2 门无对象）。
- `pnpm test` → **153 files / 1239 tests passed**；改 preset 文本后另跑 `npx vitest run tests/presets`
  （54 passed）与 `node checks/smoke/preset-smoke.mjs`（ALL PASS）。
- 本轮真模型/机制证据：P1（spill 全文 71,703 字节、`read` 按行截断）、C2/C2b（cold resume：
  turn1 interrupted → turn2 completed、`1.4.2`，但无 `lastTurnEnd`）、C3（`list_subagents` 含 teammate）、
  C6（`/compact` 摘要保留 eng-teaming，4 模块仍走 workflow）、C7/C7R（job 丢失；child 冷恢复但原输出丢）、
  C8（teammate depth 链 PASS；Lead 300s 未收口）、C9（bash 尾标记保留）、C10（CEO 复用 named child；
  旧指引过期）、C11（嵌套指针跨 child→parent 可达；child 自述截断不可信）、C12/C13b（vp-sales/teammate
  自然选对 `send_to_subagent`）。
- 会话/证据路径在[研究材料 §17](../../../_backlog/research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)
  与三张卡内；原始证据在 `runtime/tmp/explore/`（gitignored）。
