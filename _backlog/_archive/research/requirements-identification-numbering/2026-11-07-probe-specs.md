---
topic: A8 五层真跑 / B2 VP-Eng 组队 / B1 根=Lead 的探针规格——实现时照此落 probes/team/
intent: 把还没跑的三条真模型/真挂载证据写成可执行的 prompt 与断言；不声称已经跑过
---

# 探针规格（A8 / B2 / B1）

> **这份材料是什么**：A8/B2 的真模型 probe 与 B1 的 keyless probe 的**规格**，给实现时直接照此落 `probes/team/*.mjs`。**不是已跑证据**；跑完把 session id/日志/命令写进程序 Note 验证节。
> **为什么现在写**：这三条是“实现后才能跑”的风险；先把 prompt/断言/成本固定，避免实现时临时发明。

## 1. B1 keyless：VP-Eng 根门 = Team Lead

**目的**：证明 `vp-eng` 根会话的 `agentTeam` 投影是 `{ role: 'lead', name: 'lead' }`，且 `spawn_teammate` 不是死行（工具面由 `tool-agent-team` 按成员身份装）。

**步骤**：

1. `source run/env.sh`；`startWeb({ profile: 'company' })`。
2. `session/create`：`cwd = runtime/rehearsal-workspace`，`agentPreset = 'vp-eng'`。
3. `session/projections`：读 `values.agentTeam`。
4. 断言：`members.length === 1`；`members[0].role === 'lead'`；`members[0].name === 'lead'`；`tasks` 为数组。
5. 不调模型、不 spawn；退出即 kill web。

**已跑（手工，2026-11-07）**：同一逻辑建 `vp-eng` root，`agentTeam = { members: [{ name: "lead", role: "lead" }], tasks: [] }`；正式 `vp-eng-root-lead-probe.mjs`（待建，落 probes/team/） 待建。

**成本**：boot ~10–20s，零模型调用。**不是**“spawn 成功”的证明；spawn 成功由 B2 证。

## 2. A8 五层真跑：MRD→StRS→PRD→SyRS→IRS→TC

**目的**：一轮真模型产出五层文档 + TC，`/req check` 绿，`traces` 可解析，SQA TC 覆盖。

**Setup**：排练场；CEO 根会话（现有两件套 team 路径），任务书要求：

```text
产品定义动议（验证用；一轮内完成；不要问我）：
1) 用 spawn_teammate 起 cmo 与 vp-eng；任务板建 T1（CMO：drafts/mrd.md + drafts/strs.md）、T2（VP-Eng：drafts/prd.md），T2 blockedBy T1。
2) 任务书写明：落地项目才起 system_architect / system_qa；本轮要 SyRS + IRS + V&V。
3) VP-Eng 用 system_architect 出 drafts/syrs.md + drafts/irs.md，用 system_qa 出 drafts/vv-plan.md + drafts/sqa-review.md。
4) 每份文档头写 layer/definition；层/状态/专业域/验证方不进 ID；退役词不得出现。
5) 跑 /req check <slug>；不绿就改；SQA 结论原样；不写 final.md。
6) ≤ 20 个工具轮；现在开始。
```

**断言**：

| # | 断言 | 证据 |
|---|---|---|
| 1 | `drafts/{mrd,strs,prd,syrs,irs}.md` + `vv-plan.md` 在场 | 文件系统 |
| 2 | 每份头有 `layer` + `definition`；PRD=json-ledger；StRS/SyRS/IRS=headings 或 table-rows；allocation 若有=`definition: none` | 文件头 |
| 3 | 一个 REQ 序列；MR/IF/TC 各自唯一；AC 父 REQ 存在；无退役词 | checker |
| 4 | `traces` 全部解析；无悬空/重复/孤儿 | checker |
| 5 | 每条 IF/REQ 至少一条 TC；SQA 结论原样 | checker + `sqa-review.md` |
| 6 | `/req check <slug>` 绿 | 命令输出 |
| 7 | 没有 `final.md`（成品归 CEO；本探针只看 draft 链） | 文件系统 |

**成本**：真模型 10–20 分钟；不进 `pnpm test`。**不证**：一般可靠性、业务价值、真实客户。

## 3. B2 VP-Eng 根门组队：研发小队 + 命名专家

**目的**：证明 VP-Eng 根门能 spawn 工程师、能命名委托 CMO/SA/SQA，且 teammate/命名 child 的 preset/depth 正确；SQA 结论原样。

**Setup**：`vp-eng` 根会话；任务书：

```text
研发包动议（验证用；一轮内完成；不要问我）：
1) 用 spawn_teammate 起一个工程师 prd-detail，任务：拆 PRD 的 S1 细节 + 一致性检查；成员是 VP-Eng 带的工程师，不是 VP-Eng 本人，也不是别的角色。
2) 用 vp_cmo 请 CMO 出 drafts/mrd.md + drafts/strs.md；用 system_architect 出 drafts/syrs.md + drafts/irs.md；用 system_qa 出 drafts/vv-plan.md + drafts/sqa-review.md。
3) 任务书写明：MRD/StRS 署 CMO；PRD 署 VP-Eng；SQA 结论原样，不得删；成员不得冒充 SQA/CMO。
4) 写 drafts/vp-eng-package.md 包索引（每份产物/owner/状态/未决）；不写 final.md。
5) ≤ 20 个工具轮；现在开始。
```

**断言**：

| # | 断言 | 证据 |
|---|---|---|
| 1 | `prd-detail` 是 teammate；child 首帧 `agentPreset = vp-eng`；`parentSession = 根`；`delegationDepth = 1` | child 会话日志 |
| 2 | `cmo` / `system-architect` / `system-qa` 三个命名 child 的 `agentPreset` 分别是 `cmo` / `system-architect` / `system-qa`；`delegationDepth = 1`；同一 parent | child 会话日志 |
| 3 | `drafts/{mrd,strs,prd,syrs,irs,vv-plan,sqa-review}.md` + `vp-eng-package.md` 在场 | 文件系统 |
| 4 | SQA 结论原样；包索引点名 SQA | `sqa-review.md` + package |
| 5 | 没有 `final.md`（成品归 CEO） | 文件系统 |
| 6 | `/req check <slug>` 绿（若 A6 已落） | 命令输出 |

**负例**：

- 若 teammate 被当成 SQA 出结论 → 红；若 SQA 结论被删 → 红；若 `prd-detail` 的 `agentPreset` 不是 `vp-eng` → 说明机制变了，重审。
- **CEO 回归**（另跑）：`node checks/lanes/product-team-e2e.entry.mjs`，必须绿；两件套仍走 CEO team。

**成本**：真模型 10–20 分钟 + CEO smoke 3–7 分钟；不进 `pnpm test`。

## 4. 探针头注（未来脚本）

每个 `probes/team/*.mjs` 头注写：

```text
// 状态：常驻
// 何时跑：A8/B2 卡验收；改 VP-Eng 组队/编号链/CEO 组队后
// 为什么存在：...
// 判据：...
// 成本/预算：真模型 ~$1–2 / 10–20min；keyless B1 ~20s
// 用法：source run/env.sh && node probes/team/<name>.mjs
```

## 5. 边界

- 本材料是规格，**没有跑**；跑完把 session id/命令/结果写程序 Note 验证节。
- 不替代 `checks/lanes/product-team-e2e.entry.mjs`（CEO 回归）；不替代 A5 的纯逻辑单测。
- 真模型/真浏览器不进 `pnpm test`（测试宪法）。
