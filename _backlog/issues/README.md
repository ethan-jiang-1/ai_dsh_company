# issues/ · 还没结束的问题

一文件一张卡。先找已有问题，用户点名后再推敲；缺陷记在 [bugs](../bugs/README.md)。流程与关闭条件在 [backlog 入口](../README.md)。

## 活跃清单

当前活跃 1 张：[第四轮六维打扫](2026-10-28-repo-hygiene-round4.md)（推敲中；等用户 REVIEW 选批）。2026-10-28 六维提分已结归档（D1/D4/D5 → A-；三批 + 认证档，去向 = 三篇 Note，见[归档卡](../_archive/settled_issues/2026-10-27-six-dim-raise.md)）。2026-10-27 的第三轮六维度打扫已结归档（A/B/C/D 全批；去向 = 六篇 implemented Note，见[归档卡](../_archive/settled_issues/2026-10-27-repo-hygiene-round3.md)）。

2026-10-27 数据模型复盘卡已结并归档（F1–F10 落 [review-followup Note](../../notes/implemented/2026-10-27-data-model-review-followup.md)）。2026-10-27 的数据模型两卡（12 Gap + R1–R6 收尾）已结并归档，去向 = 三份 implemented Note；见 [归档](../_archive/README.md)。2026-10-25 的 6 张收尾卡已结并归档（分发契约 / 生命周期 / 内容自足 / 成品目录 / 独立启动 / 身份守卫），去向 = 三份 implemented Note；见 [归档](../_archive/README.md)。

## 近期归档

- run bundle 卡 2026-10-24 已结：按建议转 RFC 并实施，Note =
  [run-bundle-install-unit](../../notes/implemented/2026-10-24-run-bundle-install-unit.md)；卡在
  [归档](../_archive/settled_issues/2026-10-24-run-bundle-clean-base.md)。
- 培养背景卡 2026-10-23 已交付归档：D1=A/D2=A；RFC 实施为
  [Note](../../notes/implemented/2026-10-23-cultivation-context.md)，卡在
  [归档](../_archive/settled_issues/2026-10-23-cultivation-context.md)。
- fresh-agent-repo-hygiene 卫生审计卡（2026-10-21）已毕业归档：两轮审计 + 全部发现修复
  （P0–P4 + notes 归档 + 手册重构），收口记录 =
  [归档卡](../_archive/settled_issues/2026-10-20-fresh-agent-repo-hygiene.md) 与
  [Phase B–F Note](../../notes/implemented/2026-10-21-followup-sweep-phases-b-f.md)。
- 此前六张卡（issue 卡质量 / 公司面优先级 / 看板+依赖图 / 任务板 / 台账 / 成品台账）均已归档，见
  [归档](../_archive/README.md)（含 agent-cultivation、workspace-convergence 与 ceo-minimal-assembly）。

## 边界与尺寸

卡的单位是**一个能说明的结果或待判问题**，不是一个技术主题、一个文件或一串任务。头部必须能读出期望结果、当前情况、未决问题、下一步；范围与排除项在讨论前写清。

- **简单问题**：几段话足以说明问题、结论与依据就简写，不强填全部章节。
- **正常问题**：围绕一个结果，记录事实、选择、范围、关闭条件；决定做的补验收标准。
- **大问题**：先在同卡保留粗粒度目标、判断依赖、尚未规定与范围外，只细化本轮讨论的分支。一次聚焦一个需要人判断的分支，独立事实查证可以并行。
- **何时拆卡**：能独立决定、独立关闭，且有不同结果或触发条件时考虑拆开；来源相同不意味着必须同卡。拆出内容保留来源链接，避免两个当前 owner。

分步确有必要时，每步写交付结果、验收和真实前提，仍留当前卡。小问题不发明分解；候选步骤不成为执行队列或实施授权。长证据移到 [research](../research/README.md)，短判断留卡；方法见 [澄清需求](../methods/requirements-elicitation.md) 与 [整理结论](../methods/requirements-synthesis.md)。

## 写一张卡

文件名 `YYYY-MM-DD-<slug>.md`。新卡可写 `Feature`（可观察行为改变）、`Task`（交出代码、文档、配置或结论）、`未定`；旧卡不强制回填类型。

```markdown
---
status: 推敲中
opened: YYYY-MM-DD
---

# 推敲：<标题>

> 立卡：YYYY-MM-DD ｜ 状态：推敲中 ｜ 类型：未定 ｜ 毕业：未定 ｜ 可关闭：否
>
> **结论/去向**：（关闭时写：结论 + 下游落点；状态行不承载去向）

**问题与期望结果：** 触发、期望结果、如何判断本轮推敲完成。
**当前情况：** 已确认的事实与出处。
**未决问题：** 尚缺的事实或人的选择。
**下一步：** 谁来做什么，或等什么具体条件。

## 范围与排除项

## 已知与未决

## 方案与取舍

## 关闭条件
```

决定做的按 [验收设计](../methods/validation-design.md) 在同卡加 `## 验收标准`。这描述下游做成什么算合格，不要求未来检查已执行；`关闭条件` 不复制实施验收。

双轨处理门票与全部翻转规则唯一家 = [章程](../README.md)「双轨状态生命周期」：门票 = **把问题说清 + 给出验收手段，由格式承载**（问题轨 = 毕业时 `## 验收标准`；缺陷轨 = 修复就绪时 `## 已修判定`）；`毕业：` 封闭头 `未定｜做｜以后做｜不做｜消化`；状态行镜像 frontmatter（门禁互查）。

## 关闭或叫停

按 [关闭条件](../README.md#关闭条件) 检查；翻转的守卫、谁翻、记录什么 = [章程](../README.md)「双轨状态生命周期」翻转表。需要后续处理的提交申请并记录去向；授权由用户裁决，RFC/Note 形态按 notes 规则。满足条件后写 `可关闭：是`，在卡顶补 `> **结论/去向**` 块，并同次归档，不留活跃清单。

- 有结论：`git mv` 进 [settled_issues](../_archive/settled_issues/README.md)，frontmatter `status: 已结`，卡顶补 `结论/去向` 块（状态行只做镜像）。
- 用户叫停且无结论：进 [suspended_issues](../_archive/suspended_issues/README.md)，`status: 叫停`；重启需用户明确新决定。

搬迁保留文件名和讨论正文，修相对链接，更新两边清单。frontmatter 不复制正文长说明：`status` 活跃用 `推敲中` 或 `等人拍板`，`opened` 为立卡日；离开时只改 `status`。🔒 卡只由用户判定触发，agent 不自行删卡或实施。
