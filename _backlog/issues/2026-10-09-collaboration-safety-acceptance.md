---
status: 推敲中
opened: 2026-10-09
---

# 推敲：多人协作的安全承诺是否由真实证据支撑

> 立卡：2026-10-09 ｜ 状态：推敲中 ｜ 类型：未定 ｜ 可关闭：否

**问题与期望结果：** 用户要求先研究、实验多人协作，尤其锁、teamagent 使用与测试资产，按 methods 推敲验收；指出历史研究的落地不可信。目标是划清实际保证、发现具体缺陷，提出可接受的最小改进，而非预先决定引入 Redis 或新调度器。

**当前情况：** [本轮研究](../research/collaboration/2026-10-09-teamagent-locks-and-acceptance-audit.md)已复跑跨进程文件竞争、上游任务板测试及跨根会话真模型观察；5 类探针判据假绿已执行反例复现，归 [BUG-007](../_archive/fixed_bugs/BUG-007-collaboration-probe-false-positives.md)。旧“全绿／已毕业”不能直接继承为本轮安全验收。

**未决问题：** 四问已裁决（2026-10-10，均选 A，见「澄清」节）：①协议层仲裁（预指定+占位/让位兜底）；②分产物类型覆盖权（owner-bound 归 owner/显式改派，共享产物归被授权成员）；③跨根共享写维持现行边界（单写进程+freshness+占位；跨进程不承诺）；④立「认领失败让位」规矩。裁4 落实层别已有行为事实：受控单次运行中任务书层让位规矩被真实遵循、且与共享语义同场区分（[研究](../research/collaboration/2026-10-10-claim-loser-yield-acceptance.md)）——落在「人工 owner 政策文档化即可，无需生产机制」一侧，执行层强制未被本轮证据触发。剩余未决 = methods ③验收矩阵与④综合结论/关闭条件，以及四项裁决落实文档（手册/多人合同）是否补句——属下游申请。

**下一步：** 判据与驱动修复已收口（证据链见 [BUG-007](../_archive/fixed_bugs/BUG-007-collaboration-probe-false-positives.md)与[双成员验收研究](../research/collaboration/2026-10-09-team-read-barrier-acceptance.md)）；四问已裁决（2026-10-10，见「澄清」节）；claim-loser 有界探针已完成：keyless 判据红→绿（含两处变异反证）+ 真实入口 8/8 exit0（[研究](../research/collaboration/2026-10-10-claim-loser-yield-acceptance.md)），裁4 层别结论已回未决问题节。下一步按 methods：③设计验收矩阵（四项裁决对应的可核对验收）→ ④综合结论与关闭条件 → ⑤下游申请（手册/合同补句或 Note，仅当需要）。生产行为、preset或上游seam变更另需授权。

## 澄清：词汇与四问裁决稿（2026-10-10）

按 [澄清需求](../methods/requirements-elicitation.md) 上卡：词汇对钉住源码与现行合同核过（本节不复述实验，证据链见 BUG-007 与协作审计）；四个产品问题已成裁决稿，**全部待用户裁决**——事实归 agent，可接受风险与产品语义必须显式人类判断，不从文件 freshness 证据推断。

### 词汇（机制义与房间义分开）

| 词汇 | 定义 | 主源 |
|---|---|---|
| 任务 owner（机制义） | 任务快照 `ownerId`：claim 成功或 Lead reassign 写入，revision 随事务 +1。授权面**仅任务生命周期操作**（release/edit/complete/reopen/delete 需 owner 或 Lead；reassign 仅 Lead）；不绑定文件写权限、不自动释放（release/reassign/reopen 是仅有的显式去除途径）、不是锁 | [task-board](../../vendor/dsh/packages/experimental/agent-team/src/task-board.ts#L105-L209)、[上游限制](../../vendor/dsh/packages/experimental/agent-team/README.md#known-limitations-and-deferred-work) |
| 负责人（房间义 owner） | 一份产物/逻辑任务的唯一负责人：署名行 + 对终态负责。跨根无共同任务板 ⇒ 负责人 = 派活预指定 + 占位/让位协议（持认 = 占位 ∧ ¬让位） | [multi-human §3/§4](../../docs/multi-human.md)、[BUG-004](../_archive/fixed_bugs/BUG-004-claim-yield-not-machine-readable.md)、[公司手册](../../company-workspace/AGENTS.md) :87-88 |
| 认领失败（claim failure） | 同 Team claim 事务被拒，两码：revision CAS 落败 = `TEAM_TASK_STALE_REVISION`（他人先以同 revision 认领成功）；owner 已占 = `TEAM_TASK_ALREADY_CLAIMED`（拿新 revision 重试仍拒）。败者侧无自动状态、无通知；重试夺不回被持有任务 | [task-board](../../vendor/dsh/packages/experimental/agent-team/src/task-board.ts#L115-L136)；真实双成员事件见[双成员验收研究](../research/collaboration/2026-10-09-team-read-barrier-acceptance.md) |
| owner-bound 产物 | 只应由该任务 owner（或显式改派的新负责人）写的目标文件；房间形状 = `drafts/<角色>.md`、个人 journal、`final.md` 归 CEO。机制不拦（守卫不管授权），约束住任务书/手册层 | [multi-human §4](../../docs/multi-human.md)、[公司手册](../../company-workspace/AGENTS.md) :87-88 |
| 共享产物（shared artifact） | **显式授权**多名成员共写的目标文件；协调靠 freshness guard（一胜一 stale、败者重读合并）+ 合并纪律，不靠 owner；≠「谁都能写」 | [fs-local](../../vendor/dsh/packages/fs/fs-local/src/index.ts#L101-L131)、[双成员验收研究](../research/collaboration/2026-10-09-team-read-barrier-acceptance.md) |
| 返工（rework） | 房间概念：已出稿/已合稿产物需再修改；现行合同 = 显式通知合稿人 + 新版本号（署名行 `版本 v<N>`）。机制层无返工概念，只有读/写/守卫 | [multi-human §4](../../docs/multi-human.md) |
| 覆盖（overwrite） | 对已存在文件的写，三条路径：`replaceIfVersion` 版本不符 → `FS_STALE_VERSION`；`createIfAbsent` 撞已有 → `FS_NOT_OBSERVED`；**不带期望 → 无条件原子覆盖**（edit 同构：无 expected 版本即无守卫）。守卫管新鲜度不管授权——重读后覆盖别人工作机制合法（「后写者静默胜出」）；跨进程检查与发布无原子性（E2/T3：20/20 互踩），`createIfAbsent` 跨进程仍原子（T4：一胜一拒） | [fs-local writeText/editText](../../vendor/dsh/packages/fs/fs-local/src/index.ts#L202-L291)、[multi-human §4](../../docs/multi-human.md) |

### 四问裁决稿（已裁决 2026-10-10）

> **用户裁决（2026-10-10）：裁1=A 协议层仲裁；裁2=A 分产物类型；裁3=A 维持现行边界；裁4=A 立规矩——落实层别待探针事实。**

**裁1 · 多根会话竞争同一逻辑任务的仲裁**
- 事实：跨根任务板互不可见（每根会话一个 Team，无共同 CAS 点）；跨进程覆盖写无互斥、`createIfAbsent` 占位是唯一跨进程原子抢注；现行房间合同 = 派活预指定 + 占位/让位兜底（机器可查、行为验证过）；上游明确「concurrent harness processes over one Team are unsupported」；真原子仲裁需跨根共享状态（Redis/协调器）= 本卡排除项。
- 选项：**A** 接受协议层仲裁（预指定为主、占位/让位兜底并发窗口）；**B** 要求原子系统仲裁（跨根任务板共享或协调服务 → 上游 seam + 基础设施）。
- 影响：A 零机制成本，残余风险 = 并发窗口靠「占位后必读对手」纪律（BUG-004 已升为规矩）；B 超本轮授权与排除项。
- 建议：**A**——与审计「多 root 明示退化：优先预先指定唯一负责人」一致；若产品日后要求自动抢占/无人值守接管，再申请上游共享协作 seam。

**裁2 · 返工期间谁可覆盖已有产物**
- 事实：机制只管新鲜度不管授权——任何成员重读后可整文件覆盖他人工作；现行房间合同 = 单稿负责人（署名行）+ 返工显式通知 + 新版本号 + `final.md` 归 CEO；同 Team 内 Lead reassign 是显式改派的现成机制。
- 选项：**A** owner-bound 产物仅原 owner（或显式改派的新 owner）可覆盖，共享产物允许被授权成员（新鲜读 + 合并纪律）；**B** 任何持新鲜读者可覆盖（= 机制现状，无产品约束）。
- 影响：A = 把五纪律的「单稿负责人」升为明确产品规则，机制不拦、审计可查（署名行/版本号）；B = 返工冲突完全靠自觉。
- 建议：**A**——与现行合同同构，只是把隐含语义显式化。

**裁3 · 跨根会话共享写是否为受支持形态**
- 事实：拓扑分两层——跨根同服务（多门协作）：实例内 freshness 真实生效（E1），多门协作已按 [multi-human](../../docs/multi-human.md) 合同真盘验收（2026-10-04）；跨进程同盘：守卫窗 20/20 互踩（E2/T3），手册已要求「写共享盘的 DSH 进程保持一个」，跨 home 无消息寻址。
- 选项：**A** 继续支持·维持现行边界（跨根共享写受支持，约束 = 单写进程 + freshness + 占位协议；跨进程不承诺）；**B** 收窄为不支持（多门协作退化为单门 + 文件交接）；**C** 升级为跨进程机制支持（协调服务 = 排除项）。
- 建议：**A**——现行合同已按此验收；B 推翻已批准的多人形态且无新证据；C 超授权。

**裁4 · 认领失败后败者的写义务**
- 事实：task owner 不绑定文件写权限（writeScopes advisory；手册原话「任务所有权不是锁」）；同 Team CAS 一胜一 stale 真实有效；**败者遇明确让位指令是否真的不写——无行为证据**（旧竞写任务书要求败者继续写，不能反推角色违规）→ 待 claim-loser 探针补事实。
- 选项：**A** 立规矩「认领失败让位：不写该任务 owner-bound 产物，回报后转干别的」，落实层别（任务书/手册 = prompt 层，还是执行层强制）由探针结果定；**B** 不立规矩（owner 弱化为记名，败者可继续写）。
- 建议：**A**——与手册「先认领后动笔」同构；执行层强制仅在探针证明遵循性不可靠时再申请。

### 已授权（2026-10-10）：claim-loser 有界探针（独立于 C1b）

设计（按 2026-10-10 handoff 上卡）：一个任务带 owner-bound 目标产物 → 两成员同初始 revision 同时 claim → 胜者写 owner-bound 产物 → 败者收真实 CAS 拒绝后应**回报且不发目标 write/edit**；判据只认配对工具 call/result 事件与目标路径归因，不看模型正文；另设**正对照**（双成员显式授权写共享产物）防 owner-bound 与共享语义混淆。任务书必须明确「认领失败就让位」。结局四选一：仅 prompt/工作流行为／产品规则缺口／需执行层强制／人工 owner 政策只需文档化。裁决前不引入 Redis、跨进程协调或生产协议变更。授权（2026-10-10）：按本设计实施，先 keyless 判据回归（tdd 红→绿），再真模型实跑 owner-bound 主景与共享正对照；负证如实保留，不为绿重跑。

结果（2026-10-10，[研究](../research/collaboration/2026-10-10-claim-loser-yield-acceptance.md)）：真实入口 8/8 exit0。两场竞争胜负互换：owner-bound 败者 w2 全程零目标 write/edit 调用；shared 败者 w1 仍正常发布共享行——同场只翻授权变量、两语义零混淆，排除「败者胆小」与「反正都写」两个混淆解释。受控单次运行（钉住 provider、1 Lead + 2 teammate、显式措辞），不外推任意遵循性与跨根拓扑。

## 范围与排除项

- 本轮：源码、现行合同、历史研究→资产→判据链；同 team／不同根会话／多进程的机制实验；精确核验原始任务与工具事件。
- 排除：改 vendor、引入 Redis、造账号/跨机协调器、重做协作 UX、把重复采样当可靠性证明。
- 未修改生产代码、角色文案或历史归档；研究结果不伪装成已落地 Note。

## 已知与未决

- 同 Team 的 task revision CAS／owner 校验有实际覆盖；文件 write 不使用 task owner。
- 不同根会话不共享 Team 任务板；一个 DSH 进程也不能改变这个事实。
- 同一 fs-local 实例能拒旧版本写；不能阻止“重读后合法覆盖别人工作”的语义冲突。
- 旧多进程替换探针观察到20/20双成功覆盖；其GO按各worker到场放行、没有核对双方version，不能称严格同版本认证。新文件createIfAbsent观察到20/20一胜一拒，钉住实现用hard-link no-replace，两条路径不可混说；仪器局限见确定性交错研究。
- writeScopes 是提示，不是锁或写权限；占位在不同角色文件中，没有共同原子认领点。
- [历史研究](../_archive/research/2026-10-04-multi-user-ux-walk.md)的单次追加收敛有参考价值，但“多次采样=全排列证明”不成立；[旧毕业卡](../_archive/settled_issues/2026-10-04-cross-process-shared-disk.md)“丢更新机制上无法静默发生”超出 freshness guard 的保证。

## 方案与取舍

建议顺序：①先修复判据可信度（BUG-007）并区分观察/通过/未触发；②团队内用原生任务板、独立稿与依赖串联，不把 owner 当锁；③多根会话先明确唯一任务负责人和冲突裁决规则，再决定是否真的需要上游共享协作 seam；④多进程同文件写不作为受支持形态。

暂不选择 Redis：现有证据首先指出错误归因与验收漏洞，尚未证明需要额外协调服务。官方 atomic-write 是合作写者、同 host/PID namespace 的脚本库，不能直接包住角色写工具，也不是多机锁。

## 验收标准

本轮研究逐项判定与下游候选标准见研究正文；不是批准实施的标准替身。研究必须：

1. 区分三个拓扑及 task ownership／freshness／atomic publish／语义单 owner，逐项给主源。
2. 实跑能推翻错误承诺的反例，保留命令、基线、输入和信号；原始事件优先于模型转述。
3. 对旧落地逐条给 pass/fail/证据不足，不按旧状态继承。
4. 给出 negative／recovery 验收建议，并显式留下需要人定的风险与仲裁选择。

## 关闭条件

研究结论与证据已交付；未决产品选择已明确裁决或决定延后；需要的下游申请已提交并记录去向。修复和验收属于下游，不因本卡有建议就已获批。
