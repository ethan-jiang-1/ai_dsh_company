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

- 手册三态表 `deliverables/<slug>/` 与本文件命名规则 `<日期>-<slug>` 的漂移**无法随修**：
  修注入源 → 门禁红 → 重录不可重放 → 只能回滚。本轮已回滚手册改动，本卡解除阻塞后才能再修。
- 任何未来想改手册的人都会撞同一堵墙。

## 已修判定（解除阻塞）

`--record` 后立即 `replay-smoke`（无 `--ui`）ALL PASS，且连续两次 `--record` 都稳定复现该性质。
