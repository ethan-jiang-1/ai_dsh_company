---
status: 已定性
opened: 2026-11-08
---

# workflow + subagent 探索测试：只有 W / 只有 S / 混合一次 / 混合多次

> 问题：在 VP-Eng 根 / CEO 命名 child / VP-Eng teammate 三个入口下，workflow 与 subagent 的四类用法
> （只 workflow / 只 subagent / 混合一次 / 混合多次）是否都能看见、选对、跑通、合对？并发与 depth 边界如何？
> 消费者：[探索性测试 bug-hunt 问题卡](../../issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)、
> [eng-teaming](../../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md)、
> [delegation 合同](../../../docs/delegation.md)、[workflow 通道 Note](../../_archive/settled_issues/2026-11-08-vpeng-workflow-channel.md)、
> 常驻 probe [vp-eng-workflow-probe](../../../probes/team/vp-eng-workflow-probe.mjs)。
> 产出的卡：[探索性测试 bug-hunt 问题卡](../../issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)；具体缺陷按证据另行分诊。
> 结论：（重构前探索轮（§16–§18）已跑并收口：6 张缺陷卡（2×P1 + 4×P2）+ 2 条当场修；后续 042/043/044 已归档；
> 2026-11-09 委派面重构后，第四轮已执行（约 22 分钟/19 turns/27 children）：**5 张缺陷卡
> BUG-045–049**（1×P1 retry 深度绕过 + 4×P2）；D1 的 CEO→VP→workflow→worker depth 3 首次真跑 PASS。
> **修复后验证（2026-11-09 晚）**：045–049 真装配/真挂载通过；BUG-050 复核为 dev profile 旧安装副本
> 假阳性（误报归档）；teammate/workflow 身份行与 retry 正样本无新缺陷。**第五轮（修复后探索）**：
> 重启身份 / vp-sales/teammate 预算 / workflow 分支 retry / 分支 depth 3 边界四条 PASS；
> **新发现 BUG-051（P2）**：worker-orchestrator 的“1–2 leaf”只是 persona，4 件 brief 起 4 个 leaf；
> vp-sales generic depth 2 的 retry 边界仍正确拒绝；**第六轮新发现 BUG-052（P2）**：worker leaf 的工具面仍有 control，sibling 发送被运行时拒绝；**第七轮新发现 BUG-053（P1）**：取消 parent turn 不能中止 `subagent_retry` 的阻塞 child，root/child 无 `turn/end`；depth 4 负例 PASS（`depth 4 exceeds maxDepth 3`）；W7-C 重启后 retry child/workflow 分支身份行 PASS；W7-E coo/cfo retry 预算 PASS；W7-F 重启后 retry 正样本 PASS（新 child/second-ok）；W7-G retry child 跨宿主重启 PASS（interrupted + unknown-outcome 诊断）；W7-D 的客户端图模型在真实 session 数据上 PASS（W7C 4 nodes/d1、D1 8 nodes/d3），React 真页面 harness-blocked 未覆盖。
> 运行表/未覆盖/资产收割 = [第四轮 §9](2026-11-09-post-refactor-round.md)）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-08-exploration-plan.md](2026-11-08-exploration-plan.md) | 重构前探索计划与结果：背景/已证事实/场景矩阵/两遍法/fixtures/判据/预算/处置/§16–§18 运行表 | 2026-11-08 |
| [2026-11-09-post-refactor-round.md](2026-11-09-post-refactor-round.md) | 重构后第四轮：当前机制事实、delta、入口矩阵、charters、假设、fixtures、预算、停止与交接；§9 = 2026-11-09 执行结果 | 2026-11-09 |
