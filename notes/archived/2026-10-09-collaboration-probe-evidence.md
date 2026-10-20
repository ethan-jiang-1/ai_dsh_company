# 协作探针的事实判据与退出条件

状态：implemented｜批准：用户「先按 BUG-007 修复判据与驱动退出条件，再用可信证据决定协作协议或机制要补到哪一层」；只改诊断资产，不改协作产品协议。

## 决定

探针依据配对工具结果、持久任务快照、消息身份及恢复水位判断，不从模型正文推断动作。纯判据由 [协作 evidence](../../tools/lib/collaboration-evidence.mjs)、[恢复/跨根 evidence](../../tools/lib/recovery-scope-evidence.mjs)及[双成员barrier evidence](../../tools/lib/team-barrier-evidence.mjs)提供，真实驱动复用同一实现；[退出码回归](../../tests/harness/collaboration-probe-verdict.spec.ts)执行真实脚本判分段，双成员读屏障/发布链由[spec](../../tests/harness/team-barrier-evidence.spec.ts)钉住。

结束条件采用 Lead 与成员最新轮 completed，加目标产物，不要求未被提示的第二轮；子成员日志用带父身份的 subagent 地址。恢复只接受重启提示后的状态与回报，旧 completed 轮不算恢复完成。正常拒绝或未触发所需路径退出1，环境/工具读取失败退出2，均不能当PASS。

双成员入口以仅probe挂载的post-execute插件，在双方真实read body成功后阻塞结果交付，按memberId/path/callId共同放行；最终将ready/released记录绑定到配对全文read及同轮write链。task claim是独立CAS实验，任务书明确授权双方参加文件实验；失败者让位与文件stale不是同一性质。该插件不进入公司pack或生产preset，没有修改version guard。

## 输掉的方案

- 保留关键词匹配并补更多词：没有真实动作的正文仍能过，且恢复前历史能污染结论。
- 只测 helper，不检查驱动：此前 B3=false 仍 exit0；判据全绿不证明 required 条件接入实际退出码。
- 只验六行末态并承诺任意 reader 永不见半截：末态不观测全过程。当前 [atomicity 探针](../../probes/team/team-atomicity-probe.mjs)只承诺每轮成功追加后的实际完整 read 采样与精确终态；连续读侧原子性仍需独立机制测试。
- 修探针时加生产锁/owner写权限：用户只授权修判据；任务owner与文件写权限是不同机制，本次不扩展。

## 后果与既有 owner

活跃 notes 按协作探针、concurrency、writeScopeWarnings 检索，无同决定 owner；当前研究与问题范围继续由 [协作研究](../../_backlog/_archive/research/collaboration/2026-10-09-teamagent-locks-and-acceptance-audit.md)拥有，本 Note 只记判据取舍。真实模型没有触发冲突时保持失败证据，不靠重复运行随机取绿；机制和模型质量不能互相替代。scope warning 的任务本身可 completed，只有所指另一任务必须 in_progress，判据遵循钉住的 [task-view](../../vendor/dsh/packages/experimental/agent-team/src/task-view.ts)。

## 验证

- 旧 [零模型 oracle](../../probes/fs-taskboard/collaboration-oracle-probe.mjs)实际执行原判据，修前 exit1、5/5 坏样本接受；修后直接用驱动共享判据，exit0、0/11 坏样本接受。若只读、无配对写入、重复/额外行、历史恢复正文或缺真实任务结果被接受，它返回1。
- `pnpm test tests/harness/collaboration-evidence.spec.ts tests/harness/collaboration-probe-verdict.spec.ts tests/harness/recovery-scope-evidence.spec.ts`：3 files、30 tests passed；正例、路径/任务/成员错误、未配对调用、无第二轮、每项required失败退出均有覆盖。实施中先观察到2项失败，随后实际接口核验发现 ownerId/ownerName、子会话地址和warning状态条件问题并修正；具体现场证据在研究。
- 已存真实日志回放：同 Team CAS 一胜一stale与owner一致、写拒绝、两个回报投递、六行末态、三轮读回及warning均通过；该回放使用已测文件载荷，不冒充新模型运行。
- 修复前真模型 `source run/env.sh && node probes/team/team-concurrency-probe.mjs`：正常结束4/5 exit1，C1b未触发写拒绝；该历史样本不改写。修复后同一原入口以本地read-post-execute barrier overlay执行，首次启动在Lead工具前 `REQUEST_EXTENSION`，修正实验插件package identity后实际5/5 exit0：w1/w2同轮成功read、共同放行、一笔 `FS_STALE_VERSION`、败者完整read/成功合并、双方目标write成功、Lead无目标写、CAS、消息投递与completed皆满足；完整真实事件和边界见[双成员研究](../../_backlog/_archive/research/collaboration/2026-10-09-team-read-barrier-acceptance.md)。当前helper重放首个成功会话日志五项全true；最终驱动调整放行条件后，另一个真实会话session-1ed110bf也正常5/5、exit0。`source run/env.sh && node probes/team/team-atomicity-probe.mjs`：最终4/4 exit0；`source run/env.sh && node probes/fs-taskboard/fs-guard-probe.mjs`：三项PASS exit0。
- 恢复与跨根真实入口结果、最终结构/回归检查由研究收据记录；纯事件回归不替代真实恢复认证，也不证明跨进程文件仲裁。
