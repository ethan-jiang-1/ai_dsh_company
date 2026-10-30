# replay --ui 金样新鲜度门禁：指纹旁记 + 静态复算

状态：implemented（2026-10-23；P8；上游事故 = 同日 r3 金样比第六次重录早 9 小时）

> **2026-10-27 部分取代（运行模式）**：`--ui` / `--refresh-ui` 已停用（本仓没有声明 `uiEvidence` 的场景），
> r3 金样随真实证据移出产品仓；本文的“当前模式”作废。机制判据（sha256 sidecar + 静态复算）保留在
> [replay-ui-freshness 门禁](../../checks/gates/replay-ui-freshness.mjs)；现行 UI 回归 = [ui-scene-smoke](../../checks/smoke/ui-scene-smoke.mjs)。

## 决定

1. **指纹旁记**：`--ui --refresh-ui` 在写 `ui.expected.md` 的同时写旁文件
   `ui.expected.session.sha256`（内容 = session fixture 的 sha256 + 文件名）。金样本身保持纯 aria 文本，
   不掺头注——它要和捕获逐行比对。
2. **新门禁 `replay-ui-freshness`**（`checks/gates/`，由 run-gates 装配）：对每个「有 ui 金样」的场景，
   复算 `session.v3.jsonl` 的 sha256 与旁记比对；不一致即红，报两段前缀与处置
   （重跑 `--ui --refresh-ui` 或回滚 session）。缺旁记 / 缺 session 也红（金样无从认领）。
3. **红配方**：给 `session.v3.jsonl` 追加一个字节、不重录 → 门禁红；还原 → 绿（已实跑）。

## 输掉的方案

- **把指纹写进金样头注**：金样是按行比对的 aria 快照，任何头注都会进入 diff；旁文件零侵入。
- **比 mtime**：git checkout 后全树 mtime 相同，判断失效；内容哈希才跨机器可复现。
- **比 git blob**：门禁要看的是**工作树**里即将被 `--ui` 使用的那份 session，不是 HEAD。

## 后果

- 「重录了会话但忘了刷金样」这一类红，从「看起来像 UI 回归」变成一条点名处置的门禁红。
- 刷新金样的动作现在是**一对**（金样 + 指纹），由同一个 `--refresh-ui` 保证同代。

## 验证（真跑）

```text
source run/env.sh && node checks/smoke/replay-smoke.mjs --scenario r3-delegation --ui --refresh-ui
#   ALL PASS；生成 ui.expected.session.sha256 = 64a18819…  session.v3.jsonl
printf '\n' >> snapshots/replay/r3-delegation/replay/session.v3.jsonl && pnpm verify
#   FAIL replay-ui-freshness: r3-delegation 金样所对的 session 已变（64a18819… vs a48dcd3c…）
# 还原 → PASS replay-ui-freshness（金样与 session 同代）；verify ALL PASS
pnpm test     # 756 passed
```

## 未验

- 只覆盖 r3 一个场景（当前唯一带 ui 金样的场景）；r2-motion 加 `--ui` 时会自动进入射程。
- 门禁不判断金样**内容**是否仍代表产品意图——那仍由 `--ui` 的逐行比对与人的判读负责。
