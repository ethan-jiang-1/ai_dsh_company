# 2026-11-08 · VP-Eng 接入 workflow 并行扇出（单角色试点）

状态：implemented（2026-11-08；用户 2026-11-08 批范围；单角色试点）

## 决定

- `presets/vp-eng/agent.cordis.yml` 的 `delegation` 组加 **`workflow-ptc` + `tool-workflow`** 两行（必须同组：
  `tool-workflow` 消费组内 `isolate.workflowEngine` 的引擎）。`peerDependencies` 加
  `@deepseek-ai/dsh-tool-workflow` / `@deepseek-ai/dsh-workflow-ptc`。
- `eng-teaming` 五档（新增 **2.5 并行扇出（workflow）**）：≥3 个同构分支、要合并/交叉核对/只回异常、
  且不需要独立人格时用；判据满足即属于「大型多代理编排」，用户点名时直接照办。
- `eng-workflow` 第 3 步「深挖」按 1–2 件 `subagent` / ≥3 件同构 `workflow` / 独立结论命名专家分流。
- **边界**：`workflow` 子代无 `agentPreset`、fresh 上下文、继承调用者组合——只做同身份扇出，
  **不能替代 SA/SQA 的独立结论**；SQA 结论原样。正式交付物父代理单写；分支只读或一分支一文件。
- `docs/delegation.md` §4、`docs/presets.md` 工具面/VP-Eng 节、`docs/design/architecture.md` §2.3/§3、
  `docs/guides/budget-and-ops.md` §2 同 diff 对齐；`retired-claims` 的「四条协作通道」条目删除
  （workflow 以 vp-eng 同身份扇出回归，四条通道重新成立；旧条目会把真话判红）。

## 输掉的方案

- **只改 skill、不加两行**：工具不在 preset，写了也是标志面谎报（R1 同款）。
- **五个角色一起加**：4311 字符/轮的固定税 × 5；除 VP-Eng 外没有真实使用证据；治理面更大。
- **维持 0.8.0 现状**：2026-10-12 已有一次真实自主使用（见下），空 seam 是能力缺口；但若 Step 0 沙箱红，
  现状就是结果（条件卡 C）。
- **自写薄 consumer 绕开工具自带的 ONLY 提示**：新插件/新维护面，违背「优先现成载体」；只留作真跑证明
  ONLY 段稳定压过 skill 时的兜底。
- **只在前台跑**：真实先例 371s 前台 run 把 teammate 阻塞约 6 分钟，Lead 消息排队；长跑必须
  `run_in_background`。

## 后果与边界

- **固定税**：`workflow` 的 tool schema 在 catalog 里 4311 字符（同口径 `subagent` 段 3026、
  `subagent-control` 段 2716），vp-eng 每轮常驻；这也是只开单角色的理由。
- **团队继承**：teammate 继承 Lead 组合 ⇒ 队里的工程师也能开 workflow；`eng-teaming` 已写「一个复杂包只由
  Lead 或任务板指名的 owner 开一摊」（workflow 没有深度闸，嵌套 run 会叠加）。
- **沙箱前提**：本机 dev 的 vp-eng 会话是 `danger-full-access`，最小 workflow 绿；2026-10-10 的
  depth probe 在 `workspace-write` 下曾以 `sandbox-unavailable` 失败——部署侧若是 `workspace-write`，
  必须重新验这道门（卡 C 的条件）。
- **结果尺寸**：真实先例 4 路 × ~20 行 → ~125k 字符 JSON，触发 50k 渲染上限 + spill；模板约定返回
  聚合/异常，别回全量 rows。
- **历史更正**：`notes/implemented/2026-11-03-d4-semantic-drift.md` 的「没有使用场景」是事实错误——
  2026-10-12 CEO 团队的 teammate `cfo` 真实用过 workflow（四路取证，4/4 completed、371s）。d4 的决定
  （文档跟随实现、不恢复已退役能力）仍成立；被更正的是它的事实前提。行是 2026-10-19 升 pin 重写 preset 时掉的，
  peer 是 2026-11-03 清的；本次不是「恢复旧能力」，是「把用过的能力装回目标角色」。

## 验证（实跑）

- `pnpm test tests/presets`：**54 passed**（presets spec）。
- `preset-smoke`：**ALL PASS**（6 个角色 + 3 个委派子人格全部可挂载）。
- **Step 0 最小 workflow（真模型，vp-eng 会话）**：会话 `session-65ac58d6-…`，sandbox `danger-full-access`，
  工具目录 77 个含 `workflow`；脚本 `agent("Reply with exactly: WF_OK")` 返回
  `workflow "vpeng-min-smoke" completed (1 agent). Return value: { "child": "WF_OK" }`。
- **行为烟测（真模型，2 条 prompt）**：A（N≥3 四路取证）调用
  `["skill","workflow","subagent","wait_agent","bash"]`，`workflow=1`；B（独立 V&V）调用
  `["skill","system_qa","wait_agent"]`，`system_qa=1`、`workflow=0` → **PASS**（A 用 workflow；B 用 system_qa）。
- **常驻行为探针（2026-11-08）**：`probes/team/vp-eng-workflow-probe.mjs` 跑通——A 调用
  `["skill","bash","bash","workflow","bash","job_output","bash","bash","present"]`（`workflow=1`）；
  B 调用 `["skill","system_qa","list_agents"]`（`system_qa=1`、`workflow=0`）→ **ALL PASS**。
  这一步还暴露了「缺来源坐标的极简 brief 会逼 worker 编造/拒绝」——已写进 `eng-teaming` 硬规则。
- **CEO → VP-Eng E2E（2026-11-08，深度修复后）**：CEO 会话 `session-ea85593e-…` 调 `vp_eng`，child
  `session-755101e2-…`（depth 1）调用 `["bash","bash","workflow","subagent","bash","send_message"]`；
  `workflow` 1 个 run / 3 agents 全部 completed，3 个 agent 的 start 在 127ms 内
  （1794128698693 / 699 / 820）、end 在 5.6–6.1s 后（1794128704441 / 451 / 788）——运行窗口重叠，是真并行；
  `subagent` 返回 `started subagent a03f62f5-…`；VP-Eng 最终回报 3/3 一致。
  修复前同一路径：`subagent` → `Error: subagent depth 2 exceeds maxDepth 1`。
- `pnpm verify`：**ALL PASS**（含 `preset-row-deps ×27`、`retired-claims ×41（清单 2 条）`）。
- `pnpm test`：**150 files / 1223 tests passed**。
- **gate 负例留证（2026-11-08）**：在 `docs/` 放临时文件写「四条协作通道」→ 旧 `retired-claims` 红
  （`docs/tmp-retired-claim-check.md:3 → 已证伪断言「四条协作通道」…`）；删条目后同文件
  `retired-claims ×41（清单 2 条）` PASS；临时文件同轮删除，`pnpm verify` 全绿。

## 未验 / 限制

- 真实先例是 CFO teammate，不是 VP-Eng；VP-Eng 的行为只做了上面的 2 条烟测，不是长期采纳率。
- `workspace-write` 下的 workflow 未验（历史一败一成）；部署前按卡 C 重验。
- 回滚配方（撤两行 + 两 peer + skill/文档）未实跑；卡上留了配方。
- 行为判据由常驻 probe 覆盖（真模型，不进 `pnpm test`）；长期采纳率仍是后续卡 B 的事。
- Step 0 的最小 workflow 用一次性探针（`runtime/tmp`，gitignored，未入库）；常驻 probe 覆盖的是通道选择，
  不是引擎启动。
- **generic `subagent` 深度限制（已修，2026-11-08）**：CEO 委派的 VP-Eng（depth 1）原先调 `subagent`
  会被 `depth 2 exceeds maxDepth 1` 拒绝；已把五个职能 preset 的 `subagent` / `subagent_fork` 两行
  `maxDepth` 调到 2（worker 到 depth 2 不能再往下；与命名专家行同档）。CEO → VP-Eng E2E 复跑：
  `workflow` 3 agents + `subagent started` 都绿。`workflow` 仍不受 `maxDepth` 约束（引擎不传），
  嵌套 run 的治理留后续卡 E。同一 bug 在 vp-sales / coo / cfo / cmo 的相同两行也存在，按用户
  「简单 bug 立刻修」同轮改掉；这四个角色只验了 `preset-smoke` 挂载，未做各自行为 E2E（机制同构，
  以 vp-eng 为代表证据）。
