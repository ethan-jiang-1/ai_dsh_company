---
topic: 协作
intent: "复核多人协作的锁与 teamagent 保证、历史研究的落地和验收资产，给当前协作安全问题提供可复现依据。"
---

# 多人协作：teamagent、锁与验收资产复核

消费者：[协作安全问题卡](../../issues/2026-10-09-collaboration-safety-acceptance.md)、[BUG-007](../../bugs/BUG-007-collaboration-probe-false-positives.md)。授权：用户要求先研究、实验，不默认旧研究正常落地，并明确研究 MD 先落本目录。本轮没有改生产代码、preset 或 vendor。

## 结论先行

**用户并非多虑：已证实验收资产存在假绿，且旧“内建够了”的推断超出证据。不是所有底层机制都坏了。** 同 Team 的 task CAS、同 fs-local 实例的 stale 拒绝都真实有效；它们没有形成跨根会话的任务仲裁，更没有把 task owner 绑定到文件写入。多人模式主要依赖共享盘规则与人/模型遵守约定，不能说已借 teamagent 充分防范了竞争。

优先修的是判据与承诺边界，而不是先加 Redis。锁如果被需要，必须先说清锁什么、哪些写者参与、谁有 authority、失败与恢复如何验收。

## 基线、方法与限制

- 日期：2026-10-09（实际运行 `date +%Y-%m-%d`）；仓库 HEAD `6d9117f6844e7f2c1a2e997cafa57af73992c2ec`；vendor pin `639ed015397290b3745d163aafe02ffee4aa3f84`。vendor tracked 工作树检查无改动。
- 按 [validation-design](../../methods/validation-design.md)、[validation-evidence](../../methods/validation-evidence.md)、[validation-judgment](../../methods/validation-judgment.md) 选择行为、输入/状态、独立信号与反例；[测试宪法](../../../docs/testing.md)禁止把模型自述当事实。
- 独立子代理做源码研究与事件核验；父代理实跑机制/模型探针，并复读关键原始事件。主源来自钉住的源码、工具结果、任务事件、终态文件，不从归档状态继承通过。
- 此文保留命令、样本、摘要与事件定位；原始导出位于本机 [实验目录](../../../runtime/harness-home/collab-audit/)，gitignored，不是 fresh clone 可依赖的证据资产。无新 snapshot 类型、无模型可靠性百分比推断。

## 1. 先分清四种保证与三个拓扑

| 性质 | 实际保证 | 不保证 | 主源 |
|---|---|---|---|
| task CAS / owner | 同 Team 日志中旧 revision 被拒；任务生命周期有 owner 权限 | 文件写权限、跨 root 仲裁、owner 自动释放 | [task-board](../../../vendor/dsh/packages/experimental/agent-team/src/task-board.ts)、[上游限制](../../../vendor/dsh/packages/experimental/agent-team/README.md#known-limitations-and-deferred-work) |
| freshness guard | 同实例 read-check-publish 串行；读后版本变化拒写 | 重读后的业务覆盖是否合理；非参与写者；跨实例事务 | [fs-local:101–130](../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L101-L130)、[write:202–254](../../../vendor/dsh/packages/fs/fs-local/src/index.ts#L202-L254) |
| atomic publish | 替换文件只发布完整载荷；createIfAbsent 用 hard-link no-replace | 多次读改写之间互斥、两个更新都保留 | [fsio:573–586](../../../vendor/dsh/packages/fs/fs-local/src/fsio.ts#L573-L586) |
| 逻辑单 owner | 手册要求先认领再动笔、占位后重读让位 | 机制强制只一个人干活、没有重复劳动 | [公司手册](../../../company-workspace/AGENTS.md)、[多人合同](../../../docs/multi-human.md) |

| 拓扑 | Team 层 | 文件层 | 判断 |
|---|---|---|---|
| 一 Lead + teammates | 共享 Lead 日志、事务与 CAS | 共享 fs 实例时有新鲜度保护；scope advisory | 可借原生协调，但非文件锁 |
| 多人各自 root，同一服务 | 各 root 一个 Team；跨门 task list 不共享 | 是否共享 provider 不能只凭“同进程”概括；本轮仅在同 team 观察到 stale | task CAS 不构成跨门认领 |
| 多 DSH 进程同盘 | 无共享进程内事务队列 | 同版本替换会双成功覆盖；新路径创建是另一个操作 | 不能承诺该形态更新安全 |

[TeamJournal:11–52](../../../vendor/dsh/packages/experimental/agent-team/src/journal.ts#L11-L52) 的 tails 是实例内 Map。[task-view:43–48](../../../vendor/dsh/packages/experimental/agent-team/src/task-view.ts#L43-L48) 只对其他 in_progress 任务计算 warning。上游明确无文件锁、owner 不自动释放、多个 harness 进程操作一个 Team 不受支持。不要把“root 不同”和“进程不同”混成同一件事。

## 2. 本轮实跑结果

### 2.1 跨进程文件反例（零模型）

命令：`node probes/fs-taskboard/cross-process-fs-probe.mjs`，退出 0，其含义是探针成功复现预设边界，**不是协作安全通过**。

| 子项 | 本轮结果 | 合理解释 |
|---|---|---|
| T1 同实例两路同版本写 | 1 胜 / 1 FS_STALE_VERSION | 实例内保护确实生效 |
| T2 两进程无守卫替换 | 双成功、终态只有 B payload | 可以覆盖，没有参与者互斥 |
| T3 两进程同版本替换 ×20 | 双成功 20，一胜一 stale 0 | 检查与发布不形成跨进程事务 |
| T4 两进程同新路径创建 ×20 | 双创建 0，一胜一拒 20 | 不能套用 T3 的结论；源码 no-replace 与此结果一致 |

T3 是 barrier 同时放行的机制采样，不是模型服从性评分。T4 探针头注暗示“创建竞态窗”，但当前 pin 的 [fsio](../../../vendor/dsh/packages/fs/fs-local/src/fsio.ts#L584-L586)已明确 hard-link no-replace；不能用“本轮未命中”抹掉操作语义，更不能宣称所有 create 都不安全。

### 2.2 上游 task board（零模型）

首次 `pnpm exec vitest ...` 在 vendor 目录触发依赖检查/install，postinstall 的 lefthook 因 submodule core.worktree 配置失败，退出 1，测试未启动；没有更改 vendor 来绕开。随后按既有 Vitest 入口直接运行：

```sh
# cwd = vendor/dsh；使用仓库已安装的 Vitest，避免 pnpm 自动 install
node /Users/bowhead/ai_dsh_company/node_modules/vitest/vitest.mjs run packages/experimental/agent-team/tests/team.spec.ts -t 'Team shared task DAG'
```

实际结果：**7 passed / 39 按 -t 未选中**，退出 0，3.65 秒。覆盖 task CAS、owner、依赖、状态变更、scope warning；不是文件或跨门安全验收。原始 [team.spec:597–671](../../../vendor/dsh/packages/experimental/agent-team/tests/team.spec.ts#L597-L671)拒 stale revision 与别人成员重复 claim；[854–874](../../../vendor/dsh/packages/experimental/agent-team/tests/team.spec.ts#L854-L874)允许重叠范围两任务均 claim，再断言 advisory warning。

### 2.3 跨 root 真会话

`source run/env.sh && node probes/fs-taskboard/taskboard-scope-probe.mjs`，退出 0。本轮 CFO root `session-ccc2dcc5-7c2d-4fa7-b443-5e7bf9b9400c` 的 create seq23、list seq29 工具结果有 renewal-z；COO root `session-16044bf6-6676-4b93-a3df-f150eb650c2b` 的 list seq22 工具结果为 `{"tasks":[]}`。源码与真实工具观察一致。旧脚本用回复关键词打分且退出码只看 b1，本轮须结合真实工具结果，而不能把脚本绿直接升级为强证据。

### 2.4 同 Team 真会话：保护生效，但不是 owner 写锁

并发 probe lead `session-3b2164eb-b89e-4e48-a478-3a678a617ec0`：

- w1 child `8143fe5c-2e79-422c-85f2-be50325379f8`，seq24/25：claim revision1 成功，task-1 owner=w1、revision2。
- w2 child `201cc6bf-7f9a-45f6-bd1b-f286acf8d9e7`，seq24/25：claim revision1 被 `TEAM_TASK_STALE_REVISION` 拒；seq32/33 re-list 后 owner 已是 w1。**没有第二次 claim**，成员回报“重试后仍失败”不符合实际调用。
- 败者 seq38/39 write 被 `FS_NOT_OBSERVED` 拒；seq44/45 重读、seq50/51 edit 成功；seq56/57 真读回两行。没有此次写入的 FS_STALE_VERSION。败者能写是探针指令要求，不定性成框架越权 bug。
- lead seq79/80 task list 调用/结果仍 owner=w1、in_progress；seq100 最终 read 得两行；seq111 turn/end completed。

`team-concurrency-probe` 指令把 claim 与写盘放成独立后继步骤，认领失败也继续写。因此它证明本轮追加收敛，不证明“失败方不动笔”。旧 C2 验收“败者 re-list 后重试成功”对仍被另一人持有的任务不可成立，应区分 stale 重试与 owner 占用后让位，不能靠重试凑绿。

原子性 probe lead `session-180bee19-9dc2-484f-b612-e6cab8aa92a4`：

- w1/w2 spawn 的 scope-a/scope-b 指令正确；lead seq55/56 的真实 task list 工具结果有双方重叠警告，非仅模型自述。
- w1 child `efe8b6d8-6467-44b8-9374-63beed3cc2a4` seq42/43、54/55 两次 edit 被 FS_STALE_VERSION 拒；重读后 seq66/67 成功；seq96/97 真读回 w2 三行+w1 三行。
- w2 child `03b6979c-ec93-4821-9d60-3991b989a157` seq80/81 完成 task-2；w1 保留 task-1 in_progress。lead 创建的任务描述写“本任务不做任何写入”，spawn 却要求追加；这份任务书矛盾真实影响了收口。
- lead seq116：task-1 in_progress warning=[]，task-2 completed 仍有对 task-1 warning；seq118 真读回6行；seq138 turn/end completed。warning 的派生按“other 是否 in_progress”，不能概括成两边必须都 in_progress。

两条真实探针均已取得关键事实、lead 第1轮 completed。驱动却等 `turn/end >= 2`，并未保证启动第2轮，故保持等待；本轮主动停止 managed jobs，**没有正常驱动 PASS/退出0，不能记绿**。这次运行不测读者在发布过程中的连续可见性，六行终态不证明“所有时刻无半截”。

## 3. 已执行的判据反例：5 类假绿

保留最窄复现：[collaboration-oracle-probe](../../../probes/fs-taskboard/collaboration-oracle-probe.mjs)。它执行当前原探针的判据片段，用独立坏样本喂入，不修改生产实现。命令 `node probes/fs-taskboard/collaboration-oracle-probe.mjs`：**退出1，5/5 FAIL**；这里 FAIL 才准确表示验收漏洞。未来源码变形时提取失败返回2，不把失效静默算绿。

| 原子项 | 独立反例 | 实际判据输出 | 失败原因 |
|---|---|---|---|
| concurrency C1b/C2a/C2b | 只有“claim revision 未实际认领”正文与2条普通 user 消息，无 task/write 事件 | 三项 true | 关键词与消息数量不是操作证据；不证明完整 probe 全绿 |
| atomicity C4a | 6期望行+重复 w1 round1+额外 scope-note，共8行 | true | includes + 宽正则，无长度/频数约束；不测读者持续可见性 |
| fs-guard E1 | 只有 read call，零 write | judge=true，标“先读后写” | 只检查读是否在场，没有成功写的 call/result 闭环 |
| recovery R1/R4 | 只提供崩溃前含 res/收到恢复标记的正文 | 两项 true | 全历史扫词，缺 kill/resume 水位与新事件证据；不证明整个 recovery probe 全绿 |
| taskboard B3 | 两 root 回答均含 renewal-z，B3=false | process.exit(0) | 实际退出只看 b1，与头注 B1+B3 承诺不一致 |

以上归 [BUG-007](../../bugs/BUG-007-collaboration-probe-false-positives.md)，本轮未修原探针。与“模型会出错”无关：坏样本是给独立 oracle 的，接受它们就是验收代码缺陷。

语义审另发现新仪器若提取片段仍在、check已移出，空集合可能被误记PASS；本轮已修新仪器，强制核对check名称、数量、布尔类型，并验证E1结果形状与B3出口实际执行。实际在内存读取替身中对concurrency/atomicity/recovery各移除check调用（未改原文件），三项均以明确 `oracle check set changed` 返回exit2；真实原文件仍5/5 FAIL exit1。此验证只证明仪器不会把这三种空检查当绿，不证明BUG-007已修。

## 4. 旧研究→落地→验收链，哪些结论不能继承

| 历史材料 | 可保留 | 不能继承的判断 |
|---|---|---|
| [旧走查](../../_archive/research/2026-10-04-multi-user-ux-walk.md) | 一次交错里盲写被拒、重读追加，两行俱全 | “多次采样=全排列证明”；没 barrier、没完整独立 oracle 的采样只能增加观察 |
| [C系毕业卡](../../_archive/settled_issues/2026-10-04-multi-user-concurrency-bdd.md) | C1–C7 是有用的待验行为类别 | “C1–C7 内建够”；C2 retry-success 对 owner 占用不成立；C4 从同时读改成终态六行丢失原验收性质 |
| [跨进程毕业方案](../../_archive/settled_issues/2026-10-04-cross-process-shared-disk.md) | 一个写服务、task scope 提示、审计分层可减风险 | “丢更新机制上无法静默发生”过强：重读后完整覆盖仍合法，task owner 也不拦写；多人 root 无共同 Team |
| [R0落地 Note](../../../notes/implemented/2026-10-03-redis-r0-native-collab.md) | 手册声明 freshness≠独占、引用版号审计、出厂变更卡边界 | E1全绿不是所有安全性质成立；占位是可观察声明，不是逻辑任务原子抢占 |
| [BUG-004已修卡](../../_archive/fixed_bugs/BUG-004-claim-yield-not-machine-readable.md) | 让位首行规范改善机器判读，重读要求改善流程 | 不等于已解决全过程双工作；双方对同一逻辑任务写不同文件，并无共同争用点或确定 tie-break |

旧归档保持冻结，不“改写历史以让新结论绿”；当前复核结论在本问题卡/研究上。原计划是否实施、原验收是否足够、当前事实是否仍成立，是三个独立判断。

### 本轮逐项判断

| 目标/旧落地 | 判断 | 边界 |
|---|---|---|
| 同 Team task CAS/owner 元数据 | pass（所选7项机制用例与本次真实claim） | 不含文件owner强制或跨root |
| 同 fs-local 实例 freshness 守卫 | pass（T1及两次真实stale） | 不含业务语义安全、跨实例与所有写者 |
| 不同root共享任务板 | fail（对共享承诺）；隔离本身符合上游合同 | CFO/COO真实list结果分离，不是上游taskboard bug |
| 多进程同版本替换不丢更新 | fail（T3 20/20双成功） | 不影响新路径createIfAbsent的独立保证 |
| 占位/让位首行规则已经存在 | pass（实施存在，现行手册/BUG-004） | 全过程不双工作/确定仲裁：证据不足，本轮未重跑claim-race |
| 旧C1/C2/C4与E1所用验收 | fail（已执行判据反例） | 不反推当年每个真实运行都失败，也不抹除本轮两行/六行终态 |
| C4全过程原子读可见性 | 证据不足（当前终态probe不测该性质） | 原子发布源码有机制，不把未观察当机制失败 |
| C5 advisory warning | pass（本次真实工具结果+官方测试） | 不含scope写权限阻断 |
| C6 interrupt、C7 cold-resume不丢不重 | 证据不足（本轮未跑） | R1/R4子判据假绿=验收fail，不等于恢复机制已被证明失败 |
| R0手册/审计/出厂观察面的实施 | 部分复核：文案存在；本轮未重验所有发布/审计/UI链 | 不能用E1旧绿继承为整体锁安全 |
| 两条Team探针驱动能及时正常结束 | fail（本轮完成第1轮但仍等第2轮，已停止） | 关键世界事实保留，驱动未PASS |

## 5. 怎样验收才对（候选，不是批准的实施计划）

| 要承诺的行为 | 输入/状态与独立信号 | 负例/恢复 | 证据 owner 与不足 |
|---|---|---|---|
| 同 Team claim 不双持 | 同 revision barrier 双 claim；持久 task revision序列、owner 与错误码 | stale重读仍被owner占用→让位，不写；显式 release/reassign 后才能接手 | vendor taskboard spec + 真实工具日志；后半“败者不写”是本仓协议，需角色场景 |
| 共享文件不丢更新 | 同一 fs-local 实例、所有参与调用带同一 observed version，两调用→1胜1 stale；受拒者重读做合并；精确独立终态 | 最新版本读到别人工作后不得按旧任务意图整文件覆写；非参与写者 | fs 原 seam机制用例；模型业务合并不能由CAS替代 |
| 原子发布读侧 | 写暂停在stage/publish边界，独立reader反复读，载荷只能旧/新 | 中止、异常发布、完整超大载荷 | vendor fs-local官方 seam；当前六行终态probe不足 |
| scope提示可行动 | 校验真实 task list中的scope/status/warnings，包含无重叠与pending情况 | 成员越scope写→是否禁止由合同决定，advisory不自动改成拒绝 | task-view/spec + 日志；提示不等于执行阻断 |
| 多人root不双工作 | 先定唯一owner或明确tie-break；两个角色只在授权范围产出 | 双占位、双方同时让位、同角色双门、长时间不在场、返工 | 现有claim-race只是文本终态；需要全过程工具/产物检查，不能仅末尾一人持认 |
| 崩溃恢复不丢不重 | 精确messageId，强杀前未投递队列，resume后水位、真实delivered与接收事件 | 同ID不重复、投递后未确认崩溃、owner残留处置 | recovery probe需收紧；本轮只验了其两个子判据漏洞，未跑强杀认证 |
| 驱动及时结束 | 名册inactive + 必需消息到场 + lead completed | 超时/工具异常→取消会话并teardown，输出证据不足而非PASS | 现存>=2轮条件不代表实际完成状态 |

按 methods：未触发负例=证据不足；错误实现=fail；模型与人的质量判断分开。不能把加sleep、加重试、改弱断言当修复。

## 6. 最小改进方向与保留的选择

1. **先使绿可信**：BUG-007 中的实际坏输入都必须拒绝，正常样本必须接受；真实 task/工具事件按 callId、caller、路径与顺序归因，恢复按水位；修复>=2轮等错条件。不要只把正则换一个更复杂正则。
2. **同 Team 满载原生**：每份独立稿一个任务、真实 scope；认领失败不写该任务稿，重叠warning要lead明确协调，blocker把合稿放在依赖完成之后。独立role稿避免不必要同文件写。completion须真事件，不接受“完成”正文。
3. **多 root 明示退化**：CAS跨门不可用；优先预先指定唯一负责人，而不是在不同role稿里竞速“先到先得”。若产品要求自动抢占/超时接管，再申请上游共享协作seam；完整说清进程、workspace、task identity、权限及恢复。
4. **不急上 Redis**：它不能修正oracle假绿，也不会自动介入所有file writer。[atomic-write库](../../../vendor/dsh/packages/util/atomic-write/README.md)能协调合作脚本的完整read-modify-write，限同host/PID namespace、无fsync durability；不是角色工具即插锁，也不是网络盘/多机协调。

需要用户决定：多人模式是否接受“明确分工+人工裁决”的运行合同，还是需要机制保证任务自动认领、无人值守接管。用户尚未批准产品方案；本轮研究不写已实施Note。

## 收尾与尚未验证

- 授权对照：已研究、实跑、复核旧归档、保留正式MD与负例；未改产品行为、未引新锁服务、未提交/push。
- 语义审输入=用户原话+现行协作/测试合同+本轮diff/实际选层+既有R0决定；当前证据证明边界与判据缺陷，不证明任意模型都可靠。长期决定尚未形成，不新建implemented Note。
- 收割：①异常=5类假绿及驱动等待错，BUG-007；②值得钉=保留负例probe；③运行事实=同root/跨root/跨进程边界与任务书矛盾，回本研究。
- 最终检查：`set -o pipefail; pnpm verify && pnpm test`（实际分别tee至本机实验目录），verify ALL PASS；37 test files、379 tests passed；`git diff --check`通过，vendor工作树零改动。首次verify发现4个新MD链接锚点错误，修后重跑通过。test有现存React SSR useLayoutEffect warning，不影响本次退出0。
- 独立语义审：核心事实与授权范围通过；发现1个新仪器空check假绿风险（已收紧并做三项内存变形验证）、3条建议（已明确freshness拓扑、统一5类数量、补逐项判断表）。此处没有生产切片可revert；原探针漏洞未修，历史归档未改写，不以研究交付声称协作已修好。
- 未执行：本轮崩溃恢复真实认证、多根同provider并发写全矩阵、claim-race多种交错、浏览器UX与人侧体验、安装/发布验证。已有真实probe因等待条件停止，不报告正常结束绿。


## 7. BUG-007 已批准修复与复验

授权原文：「先按 BUG-007 修复判据与驱动退出条件，再用可信证据决定协作协议或机制要补到哪一层」。本节是后续实施收据，前文的调查失败是修前证据，不继承为当前判据状态。实现取舍见 [判据 Note](../../../notes/implemented/2026-10-09-collaboration-probe-evidence.md)；未改生产代码、preset、vendor、协作协议或锁服务。

- 当前 [纯事件判据](../../../tools/lib/collaboration-evidence.mjs)与[恢复/跨根判据](../../../tools/lib/recovery-scope-evidence.mjs)位于既有keyless seam；真实驱动与回归共用。旧五类坏样本被拒，现oracle完整11项均拒绝（exit0）；缺反例清单会报错，不允许0/0假绿。
- [事实回归](../../../tests/harness/collaboration-evidence.spec.ts)、[恢复跨根回归](../../../tests/harness/recovery-scope-evidence.spec.ts)、[实际退出连接](../../../tests/harness/collaboration-probe-verdict.spec.ts)验证正例、路径/任务/成员错归因、无结果/仅read、重复/额外行、旧恢复事件、单轮结束及required行失败退出。
- 原子读承诺明确收窄：验证每轮三次独立成功追加后的完整read采样与精确末态，不证明任意reader全过程永不见半截。一次写入全三行/一次read不能冒充三轮，审阅反例实际先红（expected false收到true），修后绿。
- warning合同校正：钉住的task-view只要求被指的另一任务in_progress，发warning的当前任务可以completed；不是两个任务必须同时active，也不是completed任务保留了过期warning。模型正文不参与此判定。

| 真实入口 | 最终可用结果 | 具体边界 |
|---|---|---|
| concurrency | session-8f2ae34b-5b68-4e81-b658-1390b0284128：4/5、exit1，正常结束 | CAS初次同rev一胜一stale，败者re-list后已有owner仍拒；文件各一行、投递和结束通过；未触发写拒绝，不能报C1b通过 |
| atomicity | session-14e99922-8fa9-4a44-9dba-30d31c1c929c：4/4、exit0 | 三轮工具read完整、六行精确末态、真实warning通过；最后收紧的三次独立写判据另用真实历史日志回放全绿，不冒充新连续读认证 |
| fs-guard | session-c0bb6a9b-5331-4948-9d1f-60c6cd798531及B/C：三项PASS、exit0 | ①成功read+write闭环；②新一轮目标stale拒；③两会话各有目标写call/result且末态完整；不是业务独占 |
| taskboard-scope | 真入口3/3、exit0 | CFO真实create/list相同task，COO实际list不含该task；各root局部taskId同名不等于泄漏 |
| recovery | 真入口4/4、exit0 | prekill seq水位、精确markerId投递一次、postprompt roster tool result及res身份回复queued/delivered、new completed轮；若kill前已投递不能升级为未投递补发认证 |

运行中的失败也保留：最初两Team探针读取成员时exit2，原因是把子Session当root地址读取；修为带parent的subagent地址。atomicity首次3/4中warning判据错误要求两任务同时active，按真实接口修正。recovery初跑exit1原因是错误要求res的send_message工具结果出现在Lead日志；改用Root持久消息的senderId/marker/messageId投递事实。均不是底层机制失效，也没有改弱成正文关键词。

收尾语义审以授权、当前测试合同、证据层与Note为输入：独立审阅发现三轮复用单写、create单参与者、oracle漏清单、最终快照完成标记陈旧，已补反例及修复；warning状态建议经vendor核验撤回。收割：①BUG-007反例扩展；②纯判据/实际退出码回归；③子地址、warning派生和跨Session工具结果归属事实已记录。无生产切片可revert；不追加产品协议方案。

严格未完成项：concurrency本次C1b未触发，因此BUG卡仍活跃，只保留该全项新入口验收缺口。历史真实拒写日志回放所有判据通过，只证明解析正确。未执行跨进程业务owner仲裁、连续reader原子发布压力认证、所有崩溃窗口、浏览器UX、人侧体验与安装/发布验证。

最终收尾检查：`set -o pipefail; pnpm verify && pnpm test` exit0，verify ALL PASS，40 test files / 409 tests passed。中途layering守卫先红：纯helper放在probes被回归import；按既有seam移至tools/lib后绿，未放宽守卫。
