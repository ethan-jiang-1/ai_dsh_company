---
topic: issue-bug-traceability
intent: 盘点问题/缺陷从发现到留痕的实际覆盖——卡、Note、落点与入口的实测证据
---

# 问题与缺陷的留痕覆盖：实测盘点

> 本文只记事实与断点；判断、取舍与建议住 [判断与取舍](2026-11-10-strengthening-judgment.md)。

## 问的是什么

用户的观察有两条：重要 issue 按预期应经过 Note 留痕，但常发现没留；bug 一多就只顾修，修理过程没有稳定形状。研究要回答的是：**现有制度实际覆盖了哪类工作、断在哪、fresh agent 只靠仓库文本能不能走到正确动作。**

## 方法与证据边界

- 读：[_backlog 章程](../../../README.md)、[门牌](../../../AGENTS.md)、[问题卡规则](../../../issues/README.md)、[缺陷卡规则](../../../bugs/README.md)、[交接方法](../../../methods/issue-to-note.md)、[notes 判据](../../../../notes/README.md)、[收尾 skill](../../../../.agents/skills/close-out-definition/SKILL.md)、[开发环](../../../../docs/guides/dev-loop.md)、[政策](../../../../docs/policy.md)。
- 统计：`_backlog/_archive/fixed_bugs/BUG-*.md` 53 张；`_backlog/_archive/settled_issues/*.md` 96 张（排除 README）；对每张卡 grep 是否出现指向 `notes/` 的 Markdown 链接；对 `去向=note` 的卡逐张检查落点。
- 实跑：`pnpm verify`（ALL PASS）；`pnpm notes:audit`（只读工作表）。
- 边界：计数是文件枚举 + grep，不是语义判定；「链了 Note」只证链接存在，不证内容相关；没有做真人或 fresh-context 走查；没有逐张复核 96 张卡的去向是否选得对。
- 术语：本文的「材料性」是待议概念，定义见判断材料的推荐；不是现行章程用语。

## 事实

### 1. 两条轨关门时问的不是同一个问题

| | 问题轨 | 缺陷轨 |
|---|---|---|
| 关门动作 | 结论 + `去向` + `审查：` | `已修判定` + `审查：` |
| 去向值域 | `rfc｜note｜implementation｜pending｜none｜rejected` | 无 |
| 谁决定 Note | 关门时按 notes 判据提申请，用户确认 | 没有这个决定点 |

问题轨的 `去向` 在归档时由门禁查封闭集（[lib](../../../../tools/lib/backlog-liveness.mjs)）；缺陷轨只查 `修复就绪` / `修复已落地` 的 `## 已修判定` 在场。**「修完之后要不要留一篇 Note」在缺陷轨没有位置。**

### 2. 数字：留痕率与落点

- 53 张已修缺陷卡中，**20 张**卡上链到 `notes/`。P1 的 [BUG-041](../../fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) 正文提到「收口 Note」，但没有链接；真正的理由在 [探索 Note](../../../../notes/implemented/2026-11-08-workflow-subagent-exploration-fixes.md)。
- 96 张已结问题卡中，**79 张**链到 `notes/`；**13 张** `去向=note`，其中 **2 张**的落点是同目录同名卡：
  - [2026-11-08-vpeng-workflow-channel.md](../../settled_issues/2026-11-08-vpeng-workflow-channel.md) 第 10 行；
  - [2026-11-08-user-facing-readme-and-first-use.md](../../settled_issues/2026-11-08-user-facing-readme-and-first-use.md) 第 10 行。

  两篇真正的 Note 都在 `notes/archived/` 下，同名。
- [_archive/README.md](../../README.md) 另有 **6 行**「去向 = Note」的链接指向卡本身（第 25、26、53、54、56、57 行）。
- 以上状态下 `pnpm verify` **ALL PASS**。

### 3. 落点只查词，不查解析

`backlog-liveness` 的 `destination()` 只从卡顶块里取一个封闭集词；它不检查落点是不是 `notes/` 下的真实文件。所以 `note — [Note](./同名卡.md)` 能过门。`md-links` 也不会红：那个链接指向的文件确实存在——就是卡自己。

这不是「Note 没留」，而是「Note 留了，卡指向了自己」。两种失败对 fresh agent 的效果一样：顺着卡找不到理由。

### 4. 两份文本互相打架

- [章程第 9 行](../../../README.md)：「当场修掉的不建卡，其同类横切排查一句话记在该轮轮次回执①行（有 Note 随 Note）。」
- [缺陷规则第 3 行](../../../bugs/README.md)：「当场修掉的不建卡。建卡表示发现时决定这次不修。」
- [收尾 skill 第 30 行](../../../../.agents/skills/close-out-definition/SKILL.md)：「①抓到异常没（→BUG 卡 + 红绿修复）」。
- [budget-and-ops 第 53 行](../../../../docs/guides/budget-and-ops.md) 抄了同一句。

同一件事，两套文本给出相反动作。fresh agent 读哪份，决定它做不做卡。

### 5. 入口不在「开工最小路径」上

- 根 [AGENTS.md](../../../../AGENTS.md) 的「开工最小路径」只点名五份 owner 文档 + 测试索引；`_backlog` 只出现在布局块和「一条流水线」段。
- [_backlog/AGENTS.md](../../../AGENTS.md) 是门牌，但平台在**第一次动 `_backlog/` 下的文件**时才注入——也就是说，agent 得先决定去 `_backlog`，才会看到怎么用 `_backlog`。
- 技能目录里有 Note 定义、门禁定义、收尾定义，没有「分诊」这一课。

结果：流程对「已经知道要去 `_backlog` 的 agent」是清楚的；对「手上有个 bug、正准备直接修」的 agent，第一道门是隐形的。

### 6. 有效样本：批量根因分组

2026-11-08（6 张）、11-09（5 张）、11-10（3 张）三轮都按根因分组再逐卡修，产出 Note 和红→绿证据。触发句都是用户明确要求「系统性看规律」或「如法炮制」。
反过来说：**质量目前靠用户提示，不靠流程。**

### 7. 不是所有缺陷都该有 Note

53 张已修卡里至少 4 张后来被证伪或重定性（BUG-023/026/027/050）。这些卡的价值不在「修了什么」，而在「先确认根因」这一步。若当初是当场修掉，四个改动会以「修了但没用」收场。
但反过来，给 53 张卡逐张补 Note 也会制造噪声；notes 判据本身排除机械单步修正。

### 8. 旁证：已有 Note 的可发现性

`pnpm notes:audit` 报 10 篇 implemented Note 零 Note 入链、1 篇零任何活文档入链。这不是本轮主题，但说明「留了」与「找得到」是两件事。

## 断点

- **G1 当场修 = 无卡**：设计使然；非材料性修复只剩 commit message。
- **G2 缺陷轨没有留痕决定点**：关门只问「修好了吗」。
- **G3 材料性判据只用于授权**：章程的排除项清单是现成的分类器，但没接到「要不要留痕」。
- **G4 落点只查词**：self-link 能过门；失败是「指向自己」，不是「缺失」。
- **G5 入口不可见**：最小路径不点名，门牌在决定之后才注入。
- **G6 批量分组靠用户**：有效实践没有写成规则。

## 什么没坏

- 卡的生命周期与门禁形状（状态↔出口物、门票、审查、索引）是完整的。
- 红→绿证据、根因确认、下游 Note 的「上游」回链，在最近的批次里都在。
- 误报 / 重定性有记录，说明「先确认根因」这道门确实在拦东西。

## 读数

问题不在「卡机制」，在「工作 → 记录」的那一步：**什么算重要、什么时点决定、落点怎么证明**。三问分别对应 G3、G2、G4；G1 是它们的上游。
