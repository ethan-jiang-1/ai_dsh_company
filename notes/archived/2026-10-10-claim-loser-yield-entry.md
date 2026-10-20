# 认领让位判据与对照仪器：零调用让位 + 同会话双景

状态：implemented｜批准：用户 2026-10-10 裁决协作安全 issue 四问（均 A）并授权 claim-loser 有界探针「先 keyless 判据回归（tdd 红→绿），再真模型实跑」；只加诊断资产，不改生产协作协议/preset/vendor。

## 决定

「认领失败让位」的机器判读 = 败者对该任务 owner-bound 目标的**零 write/edit 工具调用**（含被拒尝试）——尝试本身就是违规，不放宽为零成功写。判据落在 [claim-loser evidence](../../tools/lib/claim-loser-evidence.mjs)（纯函数），真实驱动 [team-claim-loser-probe](../../probes/team/team-claim-loser-probe.mjs)、keyless [spec](../../tests/harness/claim-loser-evidence.spec.ts) 与判据↔退出码连接复用同一实现。同 revision 竞争按 `TEAM_TASK_STALE_REVISION` 判定（revision CAS 先于 owner 占用检查触发），`TEAM_TASK_ALREADY_CLAIMED` 不冒充同 revision 竞争。

对照仪器 = 同一真实会话双任务只翻一个变量：owner-bound 主景（仅 claim 胜者可写）与 shared 正对照（双成员无论 claim 成败均被显式授权写）；胜负自然互换时判据与成员归属无关（spec 含互换正例）。claim 竞争不用屏障 overlay：任务书强制首次 claim `expected_revision=1` 且失败不重试，第二笔同 revision 提交必然 stale——CAS 拒绝由 revision 数值决定、与提交时序无关。探针收尾删排练盘两个目标文件，证据（含终态文件内容）全落 gitignored dev home。

## 输掉的方案

- 败者零**成功**写就算让位：被拒尝试仍是违规意图，「反正会被拒」会稀释执行层强制的讨论；变异实测（放宽为只数成功写）被「被拒尝试」反例打红后还原。
- 用 read-barrier 式 overlay 拦 claim 调用：屏障是 freshness 同轮读窗的确定性手段；CAS 拒绝不需要同时序——强制 revision 的任务书即可确定性触发，无需新插件与挂载面。
- shared 正对照不含 claim 竞争（只验「能不能写」）：失去「同场同竞争、只翻授权变量」的对照力，无法排除「败者胆小/放弃」混淆；改为同款 rev1 竞争。
- 分两次会话跑两景：多一倍预算并引入会话间差异；同会话双任务使每名成员既当胜者也当败者（本次实际胜负互换，是对照的最强形态）。
- 让败者的写由执行层拦截后再判：预设了本轮被排除的强制层；证据未触发前不先造机制。

## 后果与既有 owner

判据纪律 owner = [协作探针的事实判据与退出条件](./2026-10-09-collaboration-probe-evidence.md)（本 Note 只补 claim-loser 让位判据这一个面，不重述其 callId 配对与退出码规则）；C1b 模型入口仪器 = [成员 stale 写入口](./2026-10-09-member-stale-write-entry.md)。行为事实与边界 owner = [认领让位对照研究](../../_backlog/_archive/research/collaboration/2026-10-10-claim-loser-yield-acceptance.md)；问题范围与裁4 结论归 [协作安全 issue](../../_backlog/_archive/settled_issues/2026-10-09-collaboration-safety-acceptance.md)。真实运行的单次结论不外推遵循性；未来运行若出现败者违规写目标，以该次红为准，不以本次绿覆盖。

## 验证

- `pnpm test tests/harness/claim-loser-evidence.spec.ts`：9/9 绿；红形态 = 库缺失时整文件 fail（实施首跑实际发生）。反例覆盖被拒尝试、revision 漂移/错误码、胜者未发布、终态多行、缺投递、lead 代写、shared 败者未写、未 claim、未结束、durable owner 不符。
- 变异反证①（实际执行）：把 loserYields 放宽为只数成功写 → 仅「被拒尝试也算违规」用例红（1 failed / 9）；还原后 9/9 绿。
- `pnpm test tests/harness/collaboration-probe-verdict.spec.ts`：33/33 绿（新增 claim-loser 块 10 用例：每个 required 判据缺失 exit1、全真 exit0）。变异反证②（实际执行）：驱动删 A3 check 行 → 10 例全红；还原后绿。
- `pnpm verify` ALL PASS；`pnpm test` 43 文件 / 441 用例全过。
- 真模型 `source run/env.sh && node probes/team/team-claim-loser-probe.mjs`：8/8、exit0（lead session-fa43b067-4437-4138-8756-405dd4867458，证据在本机 gitignored runtime/harness-home/claim-loser-evidence-TOm5tf/）；真实行为、判据命中与边界见研究，本 Note 不复述运行收据。
