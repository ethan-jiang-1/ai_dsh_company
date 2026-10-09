# 用发布前暂停验证同版本竞写

状态：implemented｜批准：用户review实验顺序后要求继续推进并留证于_backlog；范围是机制实验，不是角色规则或生产锁。

## 决定

[确定性探针](../../probes/fs-taskboard/observed-write-conflict-probe.mjs)在同一真实fs-local实例上收集两份读取内容与version，用钉住vendor已有inspectTemp钩子暂停首个写者于发布前，提交第二次同version写请求后放行。分别让A/B先提交，不依赖sleep或随机重复。

证据保留两次读取、两次写结果、发布次数、独立在盘胜者载荷、败者重读版本与合并终态；只有实际FS_STALE_VERSION算冲突拒绝，FS_NOT_OBSERVED不能代替。实验失败保留JSON和文件，不删除现场；输出只包含本实验固定载荷与版本，无密钥。

## 输掉的方案

- 再跑模型直到出现拒绝：时序和是否重读受模型影响，不能稳定触发同版本竞争。
- 加sleep或只并发调用：不能明确第二次请求提交时第一写者仍在发布前；已有inspectTemp提供确切暂停点。
- 两写者都到inspectTemp再放行：同实例有per-target串行锁，第二写者无法进入暂停点，会死锁。

## 后果与既有owner

活跃notes检索同版本/inspectTemp后，[判据Note](2026-10-09-collaboration-probe-evidence.md)仍拥有事件判据决定，本Note只拥有可控交错取舍，两者无取代关系。[研究](../../_backlog/_archive/research/collaboration/2026-10-09-deterministic-write-conflict-seam.md)给出源码与现场数据，服务既有协作issue与BUG-007；这个机制结果不能替代BUG-007的模型入口C1b，也不证明跨实例/跨进程同文件安全。合并由脚本显式执行，fs服务不会替调用者自动合并。

## 验证

- `node --import tsx/esm probes/fs-taskboard/observed-write-conflict-probe.mjs --unguarded-control` 实际exit1：两次写成功，`exactly one successful guarded write required`断言收到2而非1；观察到失败而非修改vendor来造错误。
- `node --import tsx/esm probes/fs-taskboard/observed-write-conflict-probe.mjs` 实际exit0：A先、B先均同version一胜一stale，拒绝者未到staging；胜者完整在盘，败者重读合并后精确base+A+B或base+B+A。
- 未执行真模型合并质量、多root provider拓扑、跨进程仲裁与安装认证；详细检查收据留研究，不在此累积运行日志。
