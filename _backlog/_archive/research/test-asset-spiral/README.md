---
status: 已定性
opened: 2026-11-14
---

# 测试资产螺旋：从“例子”到“生成器 / 模型 / 元测试”

> 问题：repo 已有 247 个 spec、74 道门禁、29 个冒烟、覆盖率棘轮和失败类表，为什么 exploratory test 每轮还能稳定抓到 8 个 bug？首轮杠杆落地（`2b155ea4..95d05326`）为什么又滑回了“加几个脚本 + 勾完归档”，怎样从宪章、流程、元门禁三层真正让螺旋上升？
> 消费者：用户 2026-11-14 点名研究；承接卡 [2026-11-14-institutional-test-ratchet](../../settled_issues/2026-11-14-institutional-test-ratchet.md)。
> 产出的卡：[2026-11-14-test-asset-leverage](../../settled_issues/2026-11-14-test-asset-leverage.md)（首轮局部落地，已归档）、[2026-11-14-institutional-test-ratchet](../../settled_issues/2026-11-14-institutional-test-ratchet.md)（二阶制度棘轮，已落地并归档）
> 归档：2026-11-14
> 结论：**例子型资产关不掉“类”，而外围加脚本也治不了制度性滑坡。** 二阶实测证实首轮落地仍留有内部双状态机分叉、门禁注释与裸切片相反、`prd-gate` 混合分隔符绕过、`asset-consumers` 漏算自动 lane 与 67 探针零减法；根治必须同时锁死三层——**宪章层（横切语义禁裸解析 + 共享层必须交独立真值差分/全矩阵 + 门禁/探针总量封顶）、流程层（废除作者收尾自查、强制独立只读子代理盲审 + 封死未覆盖轴口头支票）、元门禁层（静态禁裸解析 + `mdast` 真值差分与路径全通道矩阵 + 分支级变异与负债棘轮）**。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-14-test-asset-spiral.md](2026-11-14-test-asset-spiral.md) | 现状数字、三轮螺旋证据、四类新资产、退役清单、棘轮与路线图 | 2026-11-14 |
| [2026-11-14-leverage-postmortem-and-institutional-ratchet.md](2026-11-14-leverage-postmortem-and-institutional-ratchet.md) | 首轮杠杆落地逐项实测审计（4 个活漏洞/失真复现）、全仓裸解析/门禁/探针/行预算底数与宪章×流程×元门禁三层方案 | 2026-11-14 |
