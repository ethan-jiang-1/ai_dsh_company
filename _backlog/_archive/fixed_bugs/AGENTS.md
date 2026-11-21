# fixed_bugs/ · agent 门牌

> 你为什么看到本文件：正要把卡迁进或改在已修区。**迁移动作不是修复**——门禁只认证据。

## 迁卡前三问

1. 卡顶有 `留痕：`，状态行有 `审查：`。
2. `## 修复证据` 四行齐：改动面 / 红 / 绿（同一条命令）/ 提交（在当前分支历史上且改到改动面）。
3. `pnpm verify` 绿；`fix-evidence` 红 = 只是搬卡，回到修复。

规则原文 = [../../README.md](../../README.md)「缺陷的通道」；证据强度与未覆盖轴 = [修复证据 Note](../../../notes/implemented/2026-11-14-fix-evidence-gate.md)。**撤回/非缺陷卡也住这里，但不翻 `已修`**：反证、测试选址、spec 误用这类「原主张不成立」的卡 `status` 只能是 `已结`，卡头写「撤回」或「非缺陷」（`backlog-liveness` 查；理由 = [2026-11-22 Note](../../../notes/implemented/2026-11-22-retracted-bugs-in-fixed-bugs.md)）。
