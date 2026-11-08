# bugs/ · 这次不修的缺陷

当场修掉的不建卡。建卡表示发现时决定这次不修。一文件一张 `BUG-<NNN>-<slug>.md`，新卡与索引行同次新增。

**下一个缺陷号**：Next BUG ID = 45；已分配 BUG-001..044。本目录与 [已修缺陷](../_archive/fixed_bugs/README.md)、[待修缺陷](../_archive/suspended_bugs/README.md) 一起算，取已分配最大号加一；编号在本文件维护。

修好 `git mv` 到 [fixed_bugs](../_archive/fixed_bugs/README.md)，查明未修到 [suspended_bugs](../_archive/suspended_bugs/README.md)；挂起不是修好。保留文件名与讨论正文，frontmatter 的 `status` 分别改成 `已修` / `待修`，状态行补修复或未修原因，修相对链接并更新两边清单。

## 活跃清单

| 卡 | 一句话 | 严重级 |
|---|---|---|
| [BUG-042](BUG-042-list-subagents-lastturnend-missing.md) | `list_subagents` 的 `lastTurnEnd` 真实装配恒缺（sessionQuery 在 isolate 组） | P2 |
| [BUG-043](BUG-043-list-subagents-includes-teammates.md) | `list_subagents` 把 teammate 也列出来，与 `list_agents` 重叠且描述未说明 | P2 |
| [BUG-044](BUG-044-background-job-lost-on-restart.md) | 后台 workflow job 不跨宿主重启：job_list 空/unknown，结果与通知丢失 | P2 |
| —（历史） | BUG-034 / BUG-035 已修并迁 [fixed_bugs](../_archive/fixed_bugs/)：SA/SQA 证据链必查（时间源 + 故障路径耐受）+ 审计 Q8–Q11；2026-11-07 E2E v8 验收 | — |

**2026-11-08 六张卡同轮来源**：workflow + subagent 探索性测试（问题卡
[exploratory bug hunt](../issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)）。发现方向 =
R2 强制 workflow + 缺失/坏源（036）、R3 委派深度链（037）、R5 W 分支内再委派（038）、
R7 原样返回全量 rows 的溢出压力（039）、R10 后台 W 中模型自选文本回答（040）、RS1 宿主重启（041）；同轮当场修掉的两条（命名 child 双重回执、CEO sleep 轮询）
记在 [探索 Note](../../notes/implemented/2026-11-08-workflow-subagent-exploration-fixes.md) 与
[研究材料结果节](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。

**2026-11-07 BUG-034/035 收口**：两张 P1 同源——「属性没人测 = 属性不存在」。修法 = 两侧 skill 各加两条条件必查
（记录与时间可信、故障路径的耐受）+ `sa-sqa-quality-audit` 新增 Q8–Q11（SA 侧 + SQA 侧）+ 两条 keyless 用例；
E2E `2026-11-07-portable-overload-detection-v8` 的 SA/SQA 产物 Q1–Q11 全 PASS、收口审计 10/10。
顺带修掉一个让所有 skill 改动都失效的前置缺陷：两个子人格 preset 缺 `tool-skill`、persona 未点名先加载，
技能正文从没被模型读到（run#3/run#4 日志 0 次 skill 名）。教训同 2026-10-19 三张卡：
**量得再准，量的也可能是别的东西**——这次是「技能装上了 ≠ 模型读到了」。

**2026-10-19 BUG-028 收口**：闸门④认总锚（title 或 prompt 点名即算，依赖链一并传递），lingang-recon 由 3 条误报 → 0 条违规；
守卫 = `tests/harness/tools/deliverables-audit.spec.ts` 两条 keyless 断言（锚粒度 + 依赖链）。教训同 BUG-014：
**锚的粒度选错**——判据把纪律的意图（有真跟进为证）翻译成了一种形状（每个 T 号各一条锚），
于是纪律自己鼓励的"一条复查盯全部缺料"反倒撞红。

**2026-10-19 三张卡收口**：BUG-025 四条判定逐条成立，已修迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；
BUG-026 经实证为**误报**（wire 视图 ownerName 273/273 齐全，卡读的是 projcache 的 **state** 行）
已结迁 [settled_issues](../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md)；
BUG-027 症状真实但**根因不成立**（`ready ?? readyOf()` 在真 wire 上不可达），按真根因（徽章渲染门槛不看
status）修复后迁 [fixed_bugs](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)。

⚠ **三张卡共用的教训**：复现脚本必须指到**消费者真正读的那一层**。025 量的是盘上的 deliverables
（面板读的是动议表）、026/027 量的是 projcache 的 state（浏览器收的是 wire 视图）——
量得再准，量的也是别的东西。

BUG-001..022 已修迁、BUG-023 误报已结、BUG-024 已修 [fixed_bugs](../_archive/fixed_bugs/README.md)。

## 2026-11-08 修复交接（另一 Agent）

**用户指令（2026-11-08）**：“那这样我们可以先停一下，让另外一个Agent去修复发现的所有的bug。”
本区 6 张卡已翻 `修复就绪`：该翻转即门票；**因为修复会触碰 company-pack 公开行为 / docs 合同 /
常设指令，正常自授权不覆盖——本节的用户明确指示才是授权**。修卡不重新推敲范围，按各卡「已修判定」收口。

| 卡 | 级别 | in-repo 修复面（可改） | vendor 侧（只提上游，不改 `vendor/dsh`） |
|---|---|---|---|
| [BUG-036](../_archive/fixed_bugs/BUG-036-workflow-schema-enum-type.md) ✅ | P2 | 已修（2026-11-08）：`eng-teaming` 四条子集约束 + 合同钉子 `tests/harness/contract/json-schema-subset.spec.ts` | `tool-workflow` 的 model-facing description / 子集校验提示（提案待上游） |
| [BUG-037](../_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md) ✅ | P2 | 已修（2026-11-08）：新增 `list_subagents` / `send_to_subagent`（官方 `ctx.subagents`，名字不被团队版 shadow）+ docs/§4 + `eng-teaming` | agent-team 的 `tryMembership` shadow（提案待上游；修好后退役两工具） |
| [BUG-038](../_archive/fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md) ✅ | P2 | 已修（2026-11-08）：`eng-teaming` 分支叶子规则 + 真跑观察（模型首轮自纠）+ 钉子 `workflow-contract-smoke` 第 6 条 | `workflow-ptc` 分支结果只取最后一轮结论（提案待上游） |
| [BUG-039](../_archive/fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md) ✅ | P1 | 已修（2026-11-08）：vp-eng preset 抬 `maxResultChars` 到 200k；探针证 spill 全文 71,677 字符可读；钉子 `tests/harness/contract/workflow-result-budget.spec.ts` | `tool-workflow` 默认值下先截断再落盘的语义（提案待上游） |
| [BUG-040](../_archive/fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md) ✅ | P2 | 已修（2026-11-08，产品规避）：`eng-teaming` 分支禁传 schema、改单行 JSON + 父 parse；smoke 第 7 条 | `runtime.ts` 缺形状不匹配诊断（上游提案保留，恢复 schema 前必须有） |
| [BUG-041](../_archive/fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) ✅ | P1 | 已修（2026-11-08）：`list_subagents` 带 `lastTurnEnd`（durable 日志读，RS1 实测 interrupted）；ops 部署前置一行 | resume 时补 `subagent/end` 通知（体验增强，不再阻塞） |

**收口要求**：每卡修完翻 `修复已落地`，写 `## 已修判定` 对应的真红→绿证据与 `审查：` 记录，再 `git mv`
到 [fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引；`pnpm verify` + `pnpm test` 全绿；
不修改 `vendor/dsh/`（vendor 侧写清上游提案即可）。探索轮已落地的缓解（skill/docs/注释）不重复做，
先核对再补缺口；证据落 `runtime/tmp/explore/`（gitignored）或新 keyless spec。

## frontmatter 与模板

第一行 `---`，字段按 `status` / `severity` / `opened` 顺序。活跃状态 = `调查中`（原 `活跃`，2026-10-12 改名——与「活跃清单」撞词）/ `修复就绪` / `修复已落地` / `等人拍板`，出口值 `已修`/`待修`；翻转法与修复授权边界唯一家 = 章程「双轨状态生命周期」「缺陷的通道」。严重级为 `P0` 阻断 / `P1` 重要 / `P2` 次要——哪个级别走哪条通道见章程（severity 的消费者）。迁档时仅改 `status`，其余字段保留，状态行补 `审查：agent｜用户｜跳过 — 理由`。

```markdown
---
status: 调查中
severity: P1
opened: YYYY-MM-DD
---

# BUG-<NNN>：<一句话标题>

> 严重级别：P1（重要）｜发现：YYYY-MM-DD｜状态：调查中

## 症状

## 根因（假设）

## 暴露的失败类
本缺陷代表哪类失败；是否需要横切排查及其范围。

## 复现

## 修复关联

## 已修判定
修成什么算修好；可点名验证搭载的工作（其验证随那次运行给出真实答案才动）。翻转到 `修复就绪` 前必须写好——该翻转即门票且授权（限 P1/P2 修复型；排除项见[章程](../README.md)「缺陷的通道」，此处不列）。`修复就绪`/`修复已落地` 缺这一节 = `pnpm verify` 红（门禁查形状，不查判据写得对不对）。
```
