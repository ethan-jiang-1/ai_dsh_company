---
status: 调查中
severity: P1
opened: 2026-10-23
---

# BUG-032：r3 重录不可重放——子代理显式 send_message 后，重放侧消息 id 位移

> 严重级别：P1（挡住合法重录：改任何注入源后都无法把 r3 刷绿）｜发现：2026-10-23（C 项验证轮 P1）｜状态：调查中

## 症状

手册（注入源）改一行后，按 `replay-fixture-freshness` 门禁要求跑：

```text
node checks/smoke/replay-smoke.mjs --scenario r3-delegation --record
node checks/smoke/replay-smoke.mjs --scenario r3-delegation
# replay-smoke: 2 FAILURE(S)
#   归一化日志零 diff（投递簿记除外）
#   投递内容集合等价
```

连续三次 `--record` 都是同一形态；回滚注入源后旧 fixture 立刻 ALL PASS。

## 事实

- 新录制的**子会话**（vp-eng）显式调用 `send_message`（`{"agent_id":"{{session:1}}","message":"收到"}`），
  文件里出现 `tool/call` + `tool/result` + 两条 `delivery-accepted`；
  旧 fixture（2026-10-21 第六次录制）子会话**没有** tool/call，只有一条 delivery。
- 重放差异：lead 归一化消息 id 位移（expected `{{message:14}}` / actual `{{message:13}}`），
  另有一条「session#0 的 inbox 投递内容不同」。
- **已排除** cwd 复述噪音：模型会把「工作目录已切换到 <临时目录>」写进回复正文，两侧必然不同；
  已加 `normalizeReplayTempPaths`（tools/lib/replay-logic.mjs，先 vendor 归一化再 token 化），
  该噪音消除后本症状仍在。

## 疑似根因（待查）

重放侧对「子代理 send_message」的投递簿记与消息块拆分和录制侧不同：录制里它是一次显式工具调用，
重放时该调用由脚本重放，投递事件（`agent/inbox/spliced` / `delivery-accepted`）的时序或条数漂移，
导致 lead 的归一化消息块计数差一。查点 = `deriveReplayScript` 对 tool 消息的处理 + 投递事件的分流判据。

## 影响

- **`--record` 这条路坏了**：三次重录产物都不可重放，而 `replay-fixture-freshness` 只认 fixture 与现行手册一致。
- 存在一条**文档化的手工旁路**（snapshot.yml 里三次用过：2026-10-11 / 10-16×2 / 10-18）：
  `--keep` 保留现场 → 把两处注入体（手册正文 + source digest）与 sidecar 外科同步进 fixture。它无 key、能过门禁，
  但纯手工、易错，且每次手册改动都要重做。
- 因此本卡**不直接挡住手册改动**，挡住的是「干净重录」；修它的价值 = 让改手册回到一条命令。

## 旁路实测（2026-10-23）

同一轮里手册修复就是走这条旁路落地的：`--keep` → 用实际运行的 `agent-instructions` 事件替换两份 fixture 的注入体
→ 默认 lane + `--ui` 双 ALL PASS、freshness 门禁绿。卡仍开——它修的是 `--record` 这条路，不是旁路。

## 已修判定（解除阻塞）

`--record` 后立即 `replay-smoke`（无 `--ui`）ALL PASS，且连续两次 `--record` 都稳定复现该性质。
