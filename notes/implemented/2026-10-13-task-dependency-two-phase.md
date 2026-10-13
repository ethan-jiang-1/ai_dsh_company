# 任务依赖"两拍落"：板面 id 由板子发号（CEO 建 DAG 的协议更正）

状态：implemented（2026-10-13；起因 = 用户贴来一张红卡：`Error: blocker task "3" not found`）

## 决定

CEO 技能 `chairing-staff-meeting` 第 2 步（拆解分派）改为**两拍落依赖**，并把**两套 id 空间**点破：

1. **先建任务**（可一批并行建多个）——`team_task_create` 的 `blocked_by` **只许引用已存在的 id**；
2. **再补依赖**——`team_task_update(action='set_dependencies', blocked_by=[…])`；
3. `task-N` = **板面 id（板子 create 落地时才发号）**；任务书派活行里的 `T1/T2` = **纸面号**——落板前用
   create 的返回或 `team_task_list` 换一次；**同批建的任务彼此还没有 id，不许猜**。

同 diff 在**派活行格式的 owner**（`company-workspace/AGENTS.md`「机器可读派活行」）补一句
"`T<N>` 是纸面号——板面 id 是板子发号的 `task-N`，依赖落板前先换号"，让两处说法不再各说各话。

## 现场（真会话证据，不是推演）

会话 `session-663ff4b6`（company-workspace 盘，dev home）/ turn 1 / **step 9 四条 `team_task_create` 同批并行**：

| 调用 | 结果 |
|---|---|
| T1 · VP-Sales | ✅ 板子发号 `task-1` |
| T2 · CFO | ✅ `task-2` |
| T3 · VP-Eng | ✅ `task-3`（`blocked_by` 传的是**空数组**——同批取不到 id） |
| T4 · VP-Eng | ❌ `blocked_by: ["3","1","2"]` ⇒ **`Error: blocker task "3" not found`**（`TEAM_TASK_NOT_FOUND`，vendor `agent-team/src/task-board.ts:226`；id 生成 = 同文件 `task-${state.nextTaskNumber}`，校验是精确匹配） |

自愈过程（同轮 step 10/11）：重建 `task-4`（不带依赖）→ `team_task_update(task-4, set_dependencies,
blocked_by=[task-1,task-2,task-3])` ✅。**但 task-3 的依赖从未落板**（subject 写着"依赖 T1,T2"，
`blockedBy` 一路 `[]`）⇒ 依赖图页签缺两条边、看板会把 T3 算成"依赖已就绪"——静默缺口比红卡更贵。

## 输掉的方案

1. **只改措辞（把 `blockedBy` 改成 `blocked_by` 就完事）**：字段名是硬错，但**同批并行 + 猜 id** 的病根在"一拍建图"这个形状；只正名，下一次照样猜。
2. **教串行建图**（建一个→读 id→再建下一个，天然拿得到前置 id）：能根治，但 N 个任务要 N 拍、且把"并行建一批"这条正常路径堵死；实际动议里 CEO 就是一批建 4 个。⇒ 取"并行建 + 第二拍补依赖"，串行只是它的特例。
3. **让我方 host 侧容错**（把 `"3"` 归一成 `task-3`）：板子是 vendor 的（`agent-team`），本仓铁律不改 vendor；且归一化会掩盖真错（猜错号也能蒙对）。
4. **只给上游提 tool 描述**（`blocked_by: 'Task ids that must complete first.'` 没说 id 由板子发、同批引用不可能）：值得提，但改不了当前批次的行为——我方文案是可立即生效的那一半。
5. **不动，靠模型自愈**（本例它两拍内自己改对了）：T3 缺边就是"靠自愈"的代价，静默且不会被谁发现。

## 后果与边界

- **多一拍**：有依赖的任务从"1 个 create"变成"create + update"；无依赖的任务不受影响（仍是 1 拍）。
- **纸面号与板面 id 并存是设计事实**（任务书给人看 T 号、板子给机器发 `task-N`），技能与手册现在都把这次换号写明；`blocked_by` 的取值只看 create 返回/`team_task_list`。
- **对在跑的动议无效**：preset 文案在会话创建时装载；`session-663ff4b6` 那场仍按旧文案跑（T3 的边需要 CEO 自己用 `team_task_update` 补）。
- 上游缺口仍在（tool 描述不提 id 生命周期、错误码不提示 id 形状）——如需，可整理成一份上游提案。

## 验证（都真跑过）

- `pnpm test tests/presets` —— **17 tests 绿**（含新增守卫「任务依赖必须教两拍落」）。
- 守卫反证（红→还原→绿）：把 skill 里第二拍的 `blocked_by` 改回驼峰 `blockedBy`（= 真缺陷原形）
  ⇒ 红（`AssertionError: 不许再出现驼峰 blockedBy（真缺陷原形）`）→ 还原 ⇒ 绿。
- `source run/env.sh && node checks/smoke/preset-smoke.mjs` —— **ALL PASS**（5 个 preset 全部可挂载；
  挂载成功 ≠ 行为对，本改动"行为对"的证据是上面那场真会话的事件链）。
- `pnpm verify` + `pnpm test` —— 全绿（结构门禁含 handbook-budget：手册字节 + 1024B ≤ 32768）。
- **未跑**（如实登记）：真模型复跑一场动议（要 $ 与真 key，且不是本改动的完成判据）；replay 场景（本仓无
  "CEO 建 DAG" 的可回放录制；本改动的行为证据 = 现场会话日志逐事件，见上表）。

## 落点

- 指令：`packages/company-pack/presets/ceo/skills/chairing-staff-meeting/SKILL.md` 第 2 步。
- 格式 owner：`company-workspace/AGENTS.md`「机器可读派活行」。
- keyless 守卫：`tests/presets/presets.spec.ts`「任务依赖必须教"两拍落"」。
- 机制权威（只读）：`vendor/dsh/packages/experimental/agent-team/src/task-board.ts`（`dependencies()` / id 生成）、
  `vendor/dsh/packages/experimental/tool-agent-team/src/index.ts`（`team_task_create` / `team_task_update` 参数）。
