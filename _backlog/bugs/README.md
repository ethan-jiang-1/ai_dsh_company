# bugs/ · 这次不修的缺陷

当场修掉的不建卡。建卡表示发现时决定这次不修。一文件一张 `BUG-<NNN>-<slug>.md`，新卡与索引行同次新增。

**下一个缺陷号**：Next BUG ID = 28；已分配 BUG-001..027。本目录与 [已修缺陷](../_archive/fixed_bugs/README.md)、[待修缺陷](../_archive/suspended_bugs/README.md) 一起算，取已分配最大号加一；编号在本文件维护。

修好 `git mv` 到 [fixed_bugs](../_archive/fixed_bugs/README.md)，查明未修到 [suspended_bugs](../_archive/suspended_bugs/README.md)；挂起不是修好。保留文件名与讨论正文，frontmatter 的 `status` 分别改成 `已修` / `待修`，状态行补修复或未修原因，修相对链接并更新两边清单。

## 活跃清单

| 卡 | 一句话 | 严重级 |
|---|---|---|
| [BUG-025](BUG-025-ledger-reads-wrong-data-face.md) | 台账面板读的是 40 行动议表，不是 993 份成品——父卡第一优先级论据作废 | P1 |
| [BUG-026](BUG-026-owner-missing-from-team-projection.md) | `agentTeam` 投影不带 `ownerName`（ownerId 有 344/379）⇒ 看板/依赖图/任务板 owner 全「未分配」 | P1 |
| [BUG-027](BUG-027-false-dependency-ready-badge.md) | `ready ?? readyOf()` 把官方语义放宽 ⇒ 131 张已完成卡白挂「依赖已就绪」 | P1 |

三条均**无浏览器、读码+真数据即可复核**；修法与判定见各卡。BUG-001..022 已修迁、BUG-023 误报已结、BUG-024 已修 [fixed_bugs](../_archive/fixed_bugs/README.md)。

## frontmatter 与模板

第一行 `---`，字段按 `status` / `severity` / `opened` 顺序。活跃状态 = `调查中`（原 `活跃`，2026-10-12 改名——与「活跃清单」撞词）/ `修复就绪` / `修复已落地` / `等人拍板`，出口值 `已修`/`待修`；翻转法与修复授权边界唯一家 = 章程「双轨状态生命周期」「缺陷的通道」。严重级为 `P0` 阻断 / `P1` 重要 / `P2` 次要——哪个级别走哪条通道见章程（severity 的消费者）。迁档时仅改 `status`，其余字段保留。

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
修成什么算修好；可点名验证搭载的工作（其验证随那次运行给出真实答案才动）。翻转到 `修复就绪` 前必须写好——该翻转即门票且授权（P0/严重/变向走用户，见章程）。
```
