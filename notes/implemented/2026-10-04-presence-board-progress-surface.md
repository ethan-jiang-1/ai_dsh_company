# 2026-10-04 · H6 落地选 (a) 现状钉死：在场板 = 成员进展唯一面（小修，无 RFC）

状态：已交付（2026-10-04 用户令「如法炮制」推动落地；形状 (a) 按用户既定原则「最正确、不短视」
选定——零新代码；**小修不设 RFC**——章程毕业四门明文；推敲卡 =
[work-status-visibility](../../_backlog/_done/_closed_plans/2026-10-04-work-status-visibility.md)）

## 问题

H6 悬案（2026-10-04 走查）：注意力中心只推「需要你」四类（问询/审批/升级/完成），成员"被派了、
在干活、汇报了"一概不推——人想知道成员干到哪只能**主动**切在场板。用户裁决（2026-10-04）：
进度只要有状态就行（至少"已被领走、加工中"两态可见）；ETA 显式不做。

## 采用方案（(a) 现状钉死）

- **在场板 = 成员进展唯一面**（行为已在场：成员行带上线状态 running/inactive + 当前任务 =
  本人 in_progress 任务的 subject；动态流含成员上线/任务生命周期/消息投递）；
- **注意力中心保持纯「需要你」四类**——问询节流是设计哲学，不是缺陷；
- 合同行落 [multi-human.md §2](../../docs/multi-human.md) 开门配方第 6 条（预期行为 +
  判据指针 + ETA 不做）；
- **零新代码**；行为判据 = `tests/presence-board.spec.ts`（D-a/D-b），本轮实跑 16/16 PASS。

## 输掉的方案（留尸——均为「现在不做」，非证伪）

- **(b) 注意力中心顶部态势条**（"N 名成员运行中 · 0 项待你"，小开发）：原料已在动态流，但它是
  产品可见 UI 变更——按测试政策要录快照 + preset-smoke，且当前无真人反馈"懒得点开场板"。
  **复活触发 = 真实使用中有人要"不点开就看总数"**（届时小 RFC）。
- **(c) 增强动态流/主动推送**：与问询节流哲学直接相抵（公司手册「问询节流」：非阻塞项不拦人），
  H6 裁决也只要状态不要推送——证伪性搁置。

## 后果 / 验证

- 合同行已落；`tests/presence-board.spec.ts` 16/16 PASS（本轮实跑）；`pnpm verify` 绿。
- **待真实验证 → 已判收（2026-10-04 probe 首跑 5/5）**：[taskboard-presence-probe](../../scripts/probes/taskboard-presence-probe.mjs)
  真会话实证 P2a/P2b（名册 w1/w2 在册；in_progress 快照 subject↔owner 经名册映射对上 2/2；成员回报链
  7 条）；渲染半边 keyless 已钉（presence-board.spec 16/16）——两态（已领走 / 加工中）在真会话流转中
  可读成立。资产 =
  [snapshots/taskboard-presence-probe/2026-10-04](../../snapshots/probes/taskboard-presence-probe/2026-10-04/probe-stdout.md)。

## 依据

- 推敲卡（H6 裁决原文与两态已知）：[work-status-visibility](../../_backlog/_done/_closed_plans/2026-10-04-work-status-visibility.md)
- 行为判据：`tests/presence-board.spec.ts`（D-a/D-b）
