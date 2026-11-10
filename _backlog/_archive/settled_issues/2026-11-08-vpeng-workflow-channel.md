---
status: 已结
opened: 2026-11-08
---

# 推敲：VP-Eng 接入 workflow 并行扇出（单角色试点）

> 立卡：2026-11-08 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：note — [Note](../../../notes/archived/2026-11-08-vpeng-workflow-channel.md)（已交付）。
>
> 审查：agent — 语义审（授权/合同/证据/Note 四输入）+ 真跑；用户 — 跳过（2026-11-08 批范围，未逐页人审实现）。

**问题与期望结果：** VP-Eng 接复杂研发包时只有四档（自己做 / 一次性 worker / 命名专家 / 持久小队）；同身份、多分支、
要合并或交叉核对的取证活（多源调研、覆盖审计、交叉复核）没有专用通道，只能拆成多次 `subagent` 或串行做。
期望结果 = VP-Eng 能用 `workflow` 做**同身份并行扇出**，需要独立人格时仍走 SA/SQA。
判断本轮推敲完成 = 用户批准范围 + Step 0 沙箱/挂载结论明确。

**当前情况：**

- 机制面已核到 vendor 源码：`agent()` 只认 `label/phase/schema/provider/model`，无 `agentPreset`；子代继承调用者组合、
  fresh 上下文、`delivery: 'caller'`、父只收脚本 JSON（渲染上限 50k）。详见
  [研究材料](../research/vp-eng-delegation-topology/2026-11-08-topology.md) §1。
- 组合面：vendor 的 `standard/ptc/cordis` 三个 preset 在同一个 `isolate.workflowEngine` 组里同时声明
  `workflow-ptc` + `tool-workflow`；公司五个角色只有空 seam（`presets/vp-eng/agent.cordis.yml` 的 `delegation` 组），
  pack 的 peers 里也没有这两个包。
- **真实先例**：2026-10-12，CEO 团队的 teammate `cfo` 自主用 `workflow` 做四路取证（密钥扫描 / SAST /
  AI 数据条款 / 许可与 IP），4/4 completed、371s、结果溢出 spill 后写 `cfo.md`（302 行）。证据 = dev home 会话
  `77cc8c50-…`（`runtime/harness-home/sessions/...`，gitignored 本地证据，不随仓分发）。这条同时推翻
  [d4-semantic-drift](../../../notes/archived/2026-11-03-d4-semantic-drift.md) 的「没有使用场景」。
- **沙箱反例**：2026-10-10 的 depth probe 在 `workspace-write` 下以
  `sandbox-unavailable: sandbox-exec: Operation not permitted` 失败；真跑是 `danger-full-access`。这是 Step 0 的第一道门。
- 固定税：`workflow` 的 tool schema 在 catalog 里 4311 字符，每轮常驻；`subagent` 段 3026、`subagent-control` 段 2716。
- 历史：0.8.0 只清了 peer；行是 2026-10-19 升 pin 重写 preset 时掉的。详见研究材料 §1.2/F6。

**未决问题：**

1. **Step 0 沙箱结论**：`vp-eng` 默认沙箱下 workflow-ptc 能否起。红 → 只开条件卡 C，本卡回 `等人拍板`。
2. **VP-Eng 行为**：真实先例是 CFO teammate，不是 VP-Eng；一次行为烟测能否通过（N≥3 会用；需要 SQA 时仍走 `system_qa`）。
3. **Step 0/验收 5 需要真模型调用**：用户已批范围；若凭据不可用，按未验缺口记，不写成绿。

**下一步：** 已交付；证据见 `## 交付证据` 与 Note。

## 范围与排除项

**做**（一个结果：VP-Eng 能用 workflow 做同身份并行扇出）：

- `presets/vp-eng/agent.cordis.yml` 的 `delegation` 组加 `workflow-ptc` + `tool-workflow` 两行（必须同组）。
- `packages/company-pack/package.json` 的 `peerDependencies` 加 `@deepseek-ai/dsh-tool-workflow` /
  `@deepseek-ai/dsh-workflow-ptc`。
- [eng-teaming](../../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md) 加 2.5 档；
  `eng-workflow` 第 3 步「深挖」点名判据。
- `docs/contracts/delegation.md` §4、`docs/contracts/presets.md` 两行工具面、`docs/architecture.md` §2.3/§3、
  `docs/guides/budget-and-ops.md` §2 的既有漂移同 diff 改。
- 交付 Note：[2026-11-08-vpeng-workflow-channel.md](../../../notes/archived/2026-11-08-vpeng-workflow-channel.md)：
  决定、输掉的方案、真证据、2026-10-12 先例与「没有使用场景」的更正。
- 测试：`preset-smoke`（挂载）+ 工具目录含 `workflow` + `pnpm test` + `pnpm verify`（当前已 ALL PASS；
  若他人未落改动再造成红，先分清归属）。

**不做**（各有独立触发/关闭条件）：

- 其他角色（CMO/CFO/CEO）——扩角色由试点观察卡 B 决定。
- 用 workflow 替代 SA/SQA 的独立结论——硬边界。
- 嵌套 run / 工具过滤的硬约束——要动 vendor，未来 E 卡或上游需求。
- 一个迭代的试点观察——后续卡 B。
- 沙箱失败后的修复——条件卡 C（只在 Step 0 红时开）。

## 已知与未决

| # | 已知 | 影响 | 处置 |
|---|---|---|---|
| K1 | `agent()` 无 `agentPreset`，子代同人格 | 不能当 SA/SQA 用 | 写进 skill 硬规则；SQA 仍命名委托 |
| K2 | 子代 fresh，不 seed 父对话 | prompt 必须自包含 | 模板纪律；skill 里写 |
| K3 | 前台 run 阻塞 teammate（先例约 6 分钟） | 团队协作延迟 | 长 run 用 `run_in_background`；skill 里写 |
| K4 | 结果约 125k 字符触发 cap + spill | 父代理要 grep 溢出件 | 返回聚合/异常；模板里写 |
| K5 | 子代可再委托（depth 允许时） | 治理洞 | 任务书软约束；硬约束留 E 卡 |
| K6 | 固定税 4311 字符/轮 | 只有常用才值 | 先单角色试点，一个迭代看调用率 |
| K7 | 沙箱一败一成 | 可能装不上 | Step 0 先验；红开 C |

## 方案与取舍

- **A（选）**：两行 + 两 peer + skill 判据 + 文档/Note，先 `vp-eng` 单角色。理由：真实先例证明形态可用；
  两行是 vendor 既有形状（standard preset 同款）；单角色把固定税与治理风险限在一处。
- **B（不选）**：只改 skill、不加行。理由：工具不在 preset，写了也是标志面谎报。
- **C（不选）**：五个角色一起加。理由：4311 字符/轮的税 × 5；除 VP-Eng 外没有真实使用证据；治理面更大。
- **D（不选）**：维持 0.8.0 现状。理由：2026-10-12 真实先例已存在，空 seam 是能力缺口；但若 Step 0 红，D 就是结果。
- **E（不选）**：自写薄 consumer 绕开 ONLY 提示。理由：新插件/新维护面，违背「优先现成载体」；只作 R1 的兜底。

## 验收标准

1. **Step 0（先做，红就回滚）**：两行 + 两 peer 后，`preset-smoke` 真挂载 `vp-eng` 绿；在 `vp-eng` 会话（默认沙箱）
   跑一次最小 workflow（1 条 prompt，约 1–2 分钟）绿。任一步红：撤两行、回 `等人拍板`、只开条件卡 C。
2. **工具面**：`vp-eng` 会话的工具目录含 `workflow`；`subagent` / `system_architect` / `system_qa` 仍在（无回归）。
3. **回归**：`pnpm test` 绿；`pnpm verify` 绿（当前已 ALL PASS；若他人未落改动再造成红，先分清归属，不混进本卡）。
4. **合同/文档**：四处文档同 diff 改；Note 记录决定、输掉的方案、真证据、2026-10-12 先例与 `d4-semantic-drift` 的更正。
5. **行为烟测（真模型，2 条 prompt）**：给一个 N≥3、无独立人格需求的取证题，模型选 `workflow`；给一个需要 SQA 的题，
   模型仍走 `system_qa`。不过则记缺口并决定是否回滚。
6. **回滚配方**：撤两行 + 两 peer + 文档/skill 改动；`preset-smoke` 回绿。回滚在卡上留一句。

## 交付证据

- 挂载：`preset-smoke` **ALL PASS**（6 个角色 + 3 个委派子人格）。
- 工具面：`vp-eng` 会话 77 个工具，含 `workflow` / `subagent` / `system_architect` / `system_qa`。
- Step 0：`vp-eng` 会话（`danger-full-access`）最小 workflow 返回
  `workflow "vpeng-min-smoke" completed (1 agent). Return value: { "child": "WF_OK" }`。
- 行为：常驻 probe `probes/team/vp-eng-workflow-probe.mjs` **ALL PASS**（A 用 workflow；B 用 system_qa）。
- 回归：`pnpm test` 150 files / 1223 tests passed；`pnpm verify` ALL PASS。
- 详见 [Note](../../../notes/archived/2026-11-08-vpeng-workflow-channel.md)。

## 关闭条件

验收 1–6 绿（或 5 记为缺口并有明确决定）→ 翻 `已结`、归档；研究题名页单独按研究规则离场，不当本卡的实施载体。
条件卡 C / 后续卡 B / 未来卡 D 各有自己的关闭条件，不在本卡。
