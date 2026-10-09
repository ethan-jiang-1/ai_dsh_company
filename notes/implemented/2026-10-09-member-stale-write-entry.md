# 成员同轮 stale 写入口：真实 read 后外部改盘再写

状态：implemented｜批准：用户「GIT COMMIT」提交此前已落地的 BUG-007 C1b 模型入口探针；只改诊断资产，不改生产协议/preset/vendor/锁服务。

## 决定

BUG-007 保留活跃卡的唯一剩余缺口是 concurrency C1b——模型入口从未在真实会话里触发过写拒绝。本 Note 记录补这个入口的仪器取舍：一个 lead + 一个成员的同轮受控场景，用「外部改盘」制造真实版本漂移，而不是靠两个成员并发竞写撞运气。

判据落在 [成员 stale evidence](../../tools/lib/member-stale-evidence.mjs)（纯函数，不变量自身），真实驱动 [member-stale-write-probe](../../probes/team/member-stale-write-probe.mjs) 与 keyless 回归 [spec](../../tests/harness/member-stale-evidence.spec.ts) 复用同一实现。七个条件全为真才算通过：

- `phase1Read`：成员**完整**读了基线（全文一次读到底，`offset=1`、`totalLines == lines.length`、行号连续、正文精确等于基线），且此刻盘上未被写、外部改盘已应用、水位 `externalAfterEventCount` 为正整数。
- `firstWriteStale`：败者第一次写确实报 `FS_STALE_VERSION`（不是 `FS_NOT_OBSERVED`），是本次第一笔写，且发生在外部改盘之后，载荷精确为旧观察 `BASE\nMEMBER\n`。
- `noReadBeforeWrite`：水位之后、旧写之前**没有**任何重读——证明这是「读了、盘变了、还拿旧版本写」，而非「没读」。
- `recovery`：stale 之后先完整重读到 `BASE\nEXTERNAL\n`，再发布合并结果。
- `finalExact`：盘上终态精确等于 `BASE\nEXTERNAL\nMEMBER\n`。
- `noLeadWrites`：lead 全程不碰目标文件。
- `completed`：预算未到时 lead 与成员都出现 `turn/end reason=completed`。

合并载荷按工具分别校验：`write` 要求 `content` 字面等于终态；`edit` 要求 `old_string`/`new_string` 经替换后精确等于终态，避免「终态对但补丁语义错」蒙混。

## 输掉的方案

- 靠两个成员并发竞写触发 C1b：同实例 per-target 锁把两笔写串行化，第二次提交时首写者通常已发布完，能否撞上同版本取决于时序，靠重复跑取绿。已有 [可控机制探针](../../probes/fs-taskboard/observed-write-conflict-probe.mjs)在 provider 层用测试钩子做确定性机制证明；本探针要的是**模型入口**证据，故改为单成员 + 外部改盘，把竞写变成必然的时间序，不依赖运气。
- 让 lead 也去写目标文件：会把「成员是否守住新鲜度」和「lead 行为」混在一起，`noLeadWrites` 明确排除。
- 接受 `FS_NOT_OBSERVED` 当冲突拒绝：它只说明「没读就写」，不证明读后竞争，[既有机制研究](../../_backlog/research/collaboration/2026-10-09-deterministic-write-conflict-seam.md)已明确不认可。首跑正是栽在这里（见验证），探针如实判红。
- 把 run 目录留在 rehearsal 盘：会污染 `pnpm verify` 的 `md-newline` 门禁（见验证末条），故失败现场保留在 gitignored 的 `runtime/harness-home/member-stale-evidence/`，rehearsal 下的 run 目录属可清残留。

## 后果与既有 owner

判据 Note = [协作探针的事实判据与退出条件](./2026-10-09-collaboration-probe-evidence.md)（本 Note 只补 C1b 模型入口这一个面，不重述其退出码与配对规则）；机制侧 owner = [可控同版本竞写研究](../../_backlog/research/collaboration/2026-10-09-deterministic-write-conflict-seam.md)；缺陷范围仍归 [BUG-007](../../_backlog/bugs/BUG-007-collaboration-probe-false-positives.md)。

本 Note 只证明「模型在受控场景下会撞到真实 stale 并重读合并」，**不**证明：两个成员同时竞写的仲裁、认领败者让位、跨进程文件仲裁、连续 reader 的原子发布、或 concurrency 探针全项 PASS。BUG-007 不因本 Note 关闭。

## 验证

- `pnpm test`：41 文件 / 413 用例全过（新增 spec 4 例）。spec 覆盖四组反例——缺水位、错误码 `FS_NOT_OBSERVED` 冒充、只读无写、部分读元数据（`totalLines` 与行数不符）、载荷错但盘对、中间插入重读、预算超时、成员未结束、lead 写目标、终态多一个换行。
- `pnpm verify`：ALL PASS。
- 真模型首跑（session `...56290b3c`）**判红**：成员没有先读就写，得到 `FS_NOT_OBSERVED`，`firstWriteStale`/`recovery`/`finalExact` 全 false；终态还多一个空行。这是探针如实区分「没读」与「读后竞争」的证据，未记为通过。
- 真模型第二跑（session `...5f0732ef`）**判绿**：`FS_STALE_VERSION` + 重读 + 合并，七项全 true，盘上精确 `BASE\nEXTERNAL\nMEMBER\n`。
- 两跑的现场 JSON 保留在 gitignored 的 `runtime/harness-home/member-stale-evidence/`。注意它们的判据键名是**改名前**的 `phase2Complete`/`noPhase2ReadBeforeWrite`（已提交的 [证据库](../../tools/lib/member-stale-evidence.mjs)与驱动里均已不存在这对键，改用 `completed`/`noReadBeforeWrite`），故这两跑不证明本次提交的那一版代码；改名后的同实现只有 keyless spec 覆盖，真实入口重跑未执行。
- 未执行：concurrency 探针全项、改名后版本的真实入口重跑、跨进程仲裁、多 root 拓扑、安装认证。
- 收尾时 `pnpm verify` 曾红一次：`md-newline` 指向 `runtime/rehearsal-workspace/journal/member-stale-nGtHJ4/target.md`——首跑留下的探针残留（该路径被 gitignore）。删除该残留目录后 ALL PASS；残留成因与「run 目录不放 rehearsal 盘」的取舍见上节。
