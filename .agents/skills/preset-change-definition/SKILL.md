---
name: preset-change-definition
description: Use when changing persona or skill copy under packages/company-pack/presets/, or any preset or bundle composition line, to run the definition of done for that change — keyless preset specs, the real-mount preset smoke, same-diff behavior scenarios when judgment criteria moved, and the end-of-run harvest questions — before claiming the change is done.
---

# Preset 改动的完成定义

适用：改 `packages/company-pack/presets/**`（persona/skills 文案）或 preset/bundle 组合行。
改动面 → 最小证据的映射 = [tests/README](../../../tests/README.md)；分层判据唯一家 = [docs/testing.md](../../../docs/testing.md)。

## 步骤

1. **keyless 回归**：`pnpm test tests/presets`。
2. **真挂载冒烟**：`source run/env.sh && node checks/smoke/preset-smoke.mjs`——触发条件、前置与成本见[脚本头注](../../../checks/smoke/preset-smoke.mjs)；挂载失败为什么只有它能在上线前抓住 = 同处头注。
3. **行为判据面改动**（改变"模型被要求做什么/判据怎么落"）→ 同 diff 必带回放场景；与纯措辞润色的分流判据 = [docs/testing.md §2](../../../docs/testing.md#2-改动面--最小证据同-diff-交付)。
4. **收尾收割三问**：清单唯一家 = [dev-loop §12](../../../docs/guides/dev-loop.md#12-记录与收尾)；三问全「无」也是合法答案，如实记。

## 判据

- 挂载成功 ≠ 行为对 ≠ 已获批——四不等式各需独立观察，前一条绿不豁免后一条 = [dev-loop §1](../../../docs/guides/dev-loop.md#1-执行链从授权到有证据交接)。
- 只报告实跑过的命令；证据纪律（假绿黑名单 / prove-it-red）唯一家 = [docs/testing.md §3](../../../docs/testing.md#3-证据纪律dsh-教义的本仓投影)。
