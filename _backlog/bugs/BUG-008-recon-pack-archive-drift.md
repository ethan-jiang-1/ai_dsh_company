---
status: 活跃
severity: P2
opened: 2026-10-10
---

# BUG-008：recon-pack 存量判据漂移（final 无 present 事件 + meta 词表过时）

> 严重级别：P2（次要）｜发现：2026-10-10｜状态：活跃

## 症状

`node checks/audit/deliverables-check.mjs` exit=1，违规 2 条全落
`deliverables-archive/2026-10-07-recon-pack/`：

1. `final-not-presented`——成品在盘上，但查无任何 Lead 会话的 `deliverables/presented` 事件
   声明过这份交付物。
2. `meta-shape-bad`——meta.md 类型「立项评估」、结果「通过（有条件）」不在现行词表
   （["决策","生产","诊断","口径问答"] / ["进行中","已采纳","已否决","已搁置","已废弃","判不了","已完成"]）。

## 根因（假设）

2026-10-07 建档时的 meta 词表与现行词表不同（词表后来收窄，存量未随迁）；present 事件追踪
的会话日志覆盖面可能不含该动议的原始会话。属**存量迁移漏项**，不是判据错。

## 修复方向（2026-10-10 用户拍板：注记豁免）

历史就历史、不改写归档件。修复 = 审计对**归档件**的两类存量加"存量豁免"观察项口径：
`final-not-presented` 与 `meta-shape-bad` 落在 `deliverables-archive/` 时降为观察项并注记
"前审计时代动议"，不再计违规（active `deliverables/` 照旧严判）。实施 = deliverables-check
小改一轮（含红绿：改前 exit=1 两条、改后 0 违规 + 观察项 +2）。
