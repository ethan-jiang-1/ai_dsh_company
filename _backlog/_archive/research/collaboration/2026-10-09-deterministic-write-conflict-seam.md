---
topic: 协作
intent: "为同 fs-local 实例的同观察版本竞写与败者重读合并实验确定真实 API、无 sleep 的屏障与证据边界。"
---

# Deterministic observed-version write conflict seam

Consumer: [协作安全验收](../../settled_issues/2026-10-09-collaboration-safety-acceptance.md). Source baseline: read-only `vendor/dsh` HEAD `639ed015397290b3745d163aafe02ffee4aa3f84` (confirmed with `git rev-parse HEAD`). This note records source inspection; live experiment results remain for the parent to append. Authorization covers a mechanism experiment, not production locks.

## Proven from pinned primary sources

- Mount using `const ctx = new Context(); const fiber = await ctx.plugin(LocalFileSystem, { cwd: dir }); const fs = ctx.fs;` and finally `await fiber.dispose()`. Use the mounted instance rather than constructing with an unvalidated partial config: Cordis applies defaults. The official fixture uses exactly this mounting pattern ([filesystem.spec.ts:25–34](../../../../vendor/dsh/packages/fs/fs-local/tests/filesystem.spec.ts#L25), [index.ts:92–115](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L92)).
- Provider API: `target = await fs.resolve(path)`; `info = await fs.stat(target)` returns optional metadata including `version`; `text = await fs.readText(target)` returns text only. Guarded replacement is `fs.writeText(target, content, { kind: 'replaceIfVersion', version }, signal?)`; guarded literal edit is `fs.editText(target, { oldString, newString, replaceAll }, { version }, signal?)`. Mutations return an outcome containing a post-write `version`. Omitting `expected` permits unconditional mutation ([index.ts:133–175](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L133), [index.ts:202–290](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L202)).
- **One shared object is the locking scope.** Its private `locks` map serializes mutations FIFO by `target.targetKey`; it is neither a global map nor a disk lock. Both writes and edits use it. Two caller-owned observation records can share this object without sharing their captured versions. Two independently mounted objects—even in one process with identical cwd/targetKey—have separate maps ([index.ts:99–131](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L99), [index.ts:208](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L208), [index.ts:263](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L263)). Symlink aliases resolve to one realpath identity; the official test covers this ([filesystem.spec.ts:804–825](../../../../vendor/dsh/packages/fs/fs-local/tests/filesystem.spec.ts#L804)).
- Official same-instance tests launch `Promise.allSettled` with two mutations using one version and require one success plus one `FS_STALE_VERSION`: writes, edits, and write-versus-edit are covered ([filesystem.spec.ts:641–654](../../../../vendor/dsh/packages/fs/fs-local/tests/filesystem.spec.ts#L641), [753–765](../../../../vendor/dsh/packages/fs/fs-local/tests/filesystem.spec.ts#L753), [788–800](../../../../vendor/dsh/packages/fs/fs-local/tests/filesystem.spec.ts#L788)). These are inspected tests, not tests executed during this research.
- `FS_STALE_VERSION` means the guarded replacement probe found the target absent or its metadata version different. An edit can also emit it for a missing target **without any guard**; guarded edits check version before matching. The code alone does not identify another writer, prove concurrent execution, prove a correct merge, or guarantee cross-instance compare-and-swap ([index.ts:214–219](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L214), [264–278](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L264), [filesystem.spec.ts:696–699](../../../../vendor/dsh/packages/fs/fs-local/tests/filesystem.spec.ts#L696)).
- Version is an opaque token built from device, inode, size, nanosecond mtime, and nanosecond ctime; it is not a content hash. Metadata aliasing can defeat it. Replacement guard validation occurs before staging; publication later uses rename/native replacement with no second expected-version check. Another instance/process can pass its guard before either publishes ([fsio.ts:74–76](../../../../vendor/dsh/packages/fs/fs-local/src/fsio.ts#L74), [index.ts:214–243](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L214), [fsio.ts:632–650](../../../../vendor/dsh/packages/fs/fs-local/src/fsio.ts#L632), [README.md:133–138](../../../../vendor/dsh/packages/fs/fs-local/README.md)).
- Guarded **creation differs**: `createIfAbsent` passes a no-replace publication flag and hard-links the staged file to the destination. A competing creator is rejected with `FS_NOT_OBSERVED`; lack of hard-link support is an error, not an overwrite fallback ([index.ts:220–243](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L220), [fsio.ts:633–638](../../../../vendor/dsh/packages/fs/fs-local/src/fsio.ts#L633), [README.md:137–138](../../../../vendor/dsh/packages/fs/fs-local/README.md)).

## Deterministic seam and planned experiments

The existing writable test hook is `fs.internals.inspectTemp = async ({ stagingDir, tempPath }) => { ... }`. It is explicitly test-only, called after the temp is written and synced, before final chmod/publication. A shared-instance mutation still holds its lock here; this hook delays real I/O and does not fabricate an error ([index.ts:99–100](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L99), [fsio.ts:79–103](../../../../vendor/dsh/packages/fs/fs-local/src/fsio.ts#L79), [fsio.ts:625–649](../../../../vendor/dsh/packages/fs/fs-local/src/fsio.ts#L625)).

1. **Shared instance conflict + recovery:** each caller captures its own `stat → readText → stat` record; assert the bracketing versions agree and both records have the same base/version before either mutates. Install a first-arrival hook with two deferred promises: `staged` notification and `release` gate. Start A guarded write; await `staged`; invoke B guarded write synchronously so it queues on the same map; resolve `release`; await both settled outcomes. Require A success, B actual `FS_STALE_VERSION`, one staging arrival, and independent disk bytes exactly equal A's payload. Repeat with A/B reversed. **Never wait for two staging arrivals on one instance:** B cannot enter the hook while A holds the lock, so that barrier deadlocks.
2. **Loser reread merge:** after settling the race, B rereads current text and version, rebases only its intended contribution onto the winner's text, and retries with the fresh `replaceIfVersion`. Independently read final disk bytes and require both contributions exactly once. Merge is caller logic, not a provider API. `stat/read/stat` is a controlled-fixture consistency check, not a general atomic snapshot: external mutations are outside this lock and tokens can alias (read methods are unlocked [index.ts:157–176](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L157)).
3. **Negative control:** repeat the same paused ordering while omitting guards; expect two successful writes and the second payload replacing the first. The guarded acceptance assertions should reject that run, demonstrating that the seam itself does not create stale errors ([index.ts:224](../../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L224)).
4. **Distinct instances, separately scoped experiment:** install one hook on each instance, wait until both are staged, then release A and await its completion before releasing B. Both guard checks already passed, so source predicts both replacements succeed and B becomes final. This exercises the guard-to-publication gap deterministically; it does not establish a production lock design. With actual processes, coordinate READY-at-hook and RELEASE via IPC, not a start-time signal or sleep.

## Existing probe pitfalls and new probe review

[Existing cross-process probe](../../../../probes/fs-taskboard/cross-process-fs-probe.mjs#L25) imports built `lib` artifacts, so a source SHA alone does not establish artifact freshness. Its T1 uses one provider and a single captured version ([89–107](../../../../probes/fs-taskboard/cross-process-fs-probe.mjs#L89)). Its T3 workers report readiness after `stat`, then `runWorker` sends GO separately to each worker as soon as that worker is ready; it does **not** await both readiness messages or compare their versions. Thus “cross-process same version simultaneously released” is not enforced ([50–56](../../../../probes/fs-taskboard/cross-process-fs-probe.mjs#L50), [67–85](../../../../probes/fs-taskboard/cross-process-fs-probe.mjs#L67), [122–136](../../../../probes/fs-taskboard/cross-process-fs-probe.mjs#L122)). T3 counts are exploratory, excluded from the final verdict ([154–158](../../../../probes/fs-taskboard/cross-process-fs-probe.mjs#L154)). T4's comments describing guarded-create replacement races are outdated for this pin: hard-link no-replace publication owns that behavior. Neither an empty directory after completion nor one observed stale error proves a filesystem-wide lock.

Independent read-only review of [new observed-write probe](../../../../probes/fs-taskboard/observed-write-conflict-probe.mjs#L28): **no blocker for the requested one-instance experiment**. Two caller records are independent; second `attempt()` reaches `withLock` before `release.resolve()`; the hook only pauses; failures come from real provider calls; node `readFile` checks disk separately; role order reverses; final merge checks exact bytes; explicit FIFO winner/loser label assertions are present ([32–85](../../../../probes/fs-taskboard/observed-write-conflict-probe.mjs#L32)). This is a bare-provider mechanism experiment, not observation-policy/session integration. Artifact freshness and actual exit codes belong in the live evidence below.

## 已实跑证据

最终入口使用 `node --import tsx/esm`，直接加载钉住的fs-local源码，避免把旧lib产物当源码SHA证据；源码平面依赖按既有tsconfig paths解析。此前built版也实跑红/绿，但以下只列最终源码入口结果。没有修改vendor。

```sh
node --import tsx/esm probes/fs-taskboard/observed-write-conflict-probe.mjs --unguarded-control
# exit1：2次成功而非1；真实静默覆盖，末态base+B，A丢失
node --import tsx/esm probes/fs-taskboard/observed-write-conflict-probe.mjs
# exit0：A先/B先均PASS；同version一胜一FS_STALE_VERSION，败者重读合并
```

| 输入/顺序 | 写结果 | 独立盘面 | 判定 |
|---|---|---|---|
| 无version条件，A先 | A与B均成功、2次staging | `base\nB\n` | FAIL exit1，一胜一stale验收拒绝 |
| 同version，A先 | A成功，B真实stale；仅1次staging | 竞写后`base\nA\n`；合并后`base\nA\nB\n` | PASS |
| 同version，B先 | B成功，A真实stale；仅1次staging | 竞写后`base\nB\n`；合并后`base\nB\nA\n` | PASS |

原始JSON/在盘文件保留在仓内gitignored运行区：[反例现场](../../../../runtime/harness-home/write-conflict-evidence/run-sJkV3S/evidence.json)、[正常现场](../../../../runtime/harness-home/write-conflict-evidence/run-GHUEKa/evidence.json)。前序built现场run-SXv6Gu/run-PzA4Qf/run-XJUsZo仅辅助对照。运行预算30秒、两种固定提交顺序、无sleep、无模型调用。JSON含双方独立version/text、两写结果、staging次数、胜者在盘载荷、败者新版本及合并终态；不会只以最终文件猜竞争。

结论：所选本地文件系统上，同实例的真实版本守卫在受控交错下拒绝第二次旧版本写。取消version条件仍由provider串行发布，却静默覆盖，说明串行发布本身不保留业务更新。败者正确合并由实验调用者实现，不能推断模型也会做对。不会用此机制绿关闭BUG-007的模型入口C1b缺口，也没有把FS_NOT_OBSERVED升级成同版本竞争证明。

## 收尾与后续

授权对照：完成用户review的第一步确定性机制实验并留_backlog；未改生产角色/协议、未引锁，未执行后续角色行为认证。依据现行测试宪法选择零模型机制档；挂载是裸provider实验，不能写成会话/安装通过。

独立语义审已阅读当前实现与钉住源码：无阻断；建议显式FIFO胜/败身份，已补并重跑源码入口。检查四输入为授权、测试合同、真实机制选层及[实验取舍Note](../../../../notes/archived/2026-10-09-observed-write-conflict.md)。收割三问：①新probe未发现同实例机制异常，但旧跨进程T3屏障与T4描述问题留本研究，旧20/20双成功只作为探索观察而非严格同version认证；②值得钉=保留可控探针及实际负对照；③运行事实=inspectTemp时仍持有实例锁，不能等待两次钩子到齐。

下一步仍是角色任务书明确「认领失败就让位」后的行为实验；先验动作，再判断是否补规则或执行层。多root fs实例共享关系、跨进程仲裁、模型合并质量、任意外部写者和持续reader原子性未验证。旧T3/T4仪器问题暂记录在[协作issue](../../settled_issues/2026-10-09-collaboration-safety-acceptance.md)，不得继承其过强承诺。最终 `set -o pipefail; pnpm verify && pnpm test && git diff --check && git -C vendor/dsh status --short` exit0：verify ALL PASS，40 files / 409 tests passed，diff卫生通过，vendor零修改。首次verify因两处Markdown文档使用行号锚而红，改为真实文档链接后绿；没有放宽门禁。
