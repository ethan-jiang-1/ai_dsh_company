# 推敲：驾驭者表面包（driver-surface）实施待触发

> 状态：待触发→已毕业（2026-10-06：用户定次序 A→B→C→D→E 并确认以 ongoing goal 推进，开工令兑现；五条目当日全部毕业）｜毕业门判断 = 已兑现｜去向 = [毕业 Note driver-surface-package](../../../notes/implemented/2026-10-06-driver-surface-package.md)（验证记录与输掉的方案在其节内；RFC 原文已随毕业改写为已交付现在时）

## 背景 / 触发

2026-10-06 驾驭轮：用户（本项目驾驭者）反馈可驾驭性痛点——dev/ 目录混合、运行链不可见、缺白话单页、
测试资产「一问四家」、loop/run bundle 不显性、AGENTS.md 太密、docs 难读；端到端被当成唯一验证手段。
已消化为 RFC：[driver-surface-package](../../../notes/implemented/2026-10-06-driver-surface-package.md)
（批准：2026-10-06 用户令三工作面合并立项 + AGENTS 减密、docs 可读性两补充痛点；`pnpm verify` 全绿；毕业时改写为已交付现在时）。

## 已知与未决

已核实（带出处）：

- RFC 五条目（A 拆 dev/ → B `pnpm orient` → C 驾驭者单页 → D AGENTS.md 减密 → E docs 可读层）与逐条
  红绿验收已成文，输掉的方案已留尸（RFC「输掉的方案」节）。
- RFC 建议默认序 A→B→C→D→E（先定形目录，观测引用新形，导航收口三线）。

未决（四问开放点）：

- 次序：实施次序由用户逐条给（D32）；默认序尚未获用户确认。
- 何时/怎么推：是否 setup ongoing goal 推进（形态按 dev-loop §0.5 交付型——按用户指定的已批条目清单
  逐条实施，清单空即收口；每条一 commit + push + 简报）。
- 该不该：已由 RFC 批准标记背书，无未决。
- 细节终裁：A 条目 `runtime/` 命名（runtime/ vs state/，RFC 建议 runtime/，非隐藏显性）。

## 候选与取舍

- 开工令（用户给次序 / goal 启动）一到，本卡即毕业离场（完成即离场），任务源 = RFC 本身，不挂双账。
- 用户决定不设 goal：卡保持待触发，触发条件不变，仍以点名方式逐条进。
- 用户撤销 RFC：卡迁 _suspended 并在状态行记去向。

## 毕业门

四门满足条件：该做 = RFC 批准标记（已满足）；何时 = 用户开工令；次序 = 用户一句话定（默认序或改）；
放弃 = 用户明示撤销。满足后 `git mv` 到[`_closed_plans/`](./README.md)（本卡 2026-10-06 已迁入），文件名不变，
状态行补去向指针。
