# _done/ · 归档（位置即状态；fresh agent 默认忽略，点名才读）

> 两种诚实的离场卡住这里——**做完的**（已毕业推敲卡、已修复缺陷卡）与**暂停的**（搁置卡：
> 非-done 也非-删）——外加随卡归档的研究材料与 2026-09-28 整池退役的历史池。`git mv` 迁入、
> 文件名不变、内容不重写：毕业只在卡的状态行补去向指针，搁置什么都不加。**本文件是归档索引**
> （各子目录 README 持契约不持清单）；**Next BUG ID 权威 = [_fixed_bugs/README.md](_fixed_bugs/README.md)**。
> 章程 = [`../README.md`](../README.md)。

## 目录

- [_closed_plans/](_closed_plans/README.md) — 已毕业推敲卡（文件名带立卡日期 `YYYY-MM-DD-slug`，按日期流/slug 查）
- [_suspended_plans/](_suspended_plans/README.md) — 搁置推敲卡（无判断、用户暂停；重启条件随卡）
- [_fixed_bugs/](_fixed_bugs/README.md) — 已修复缺陷卡（**Next BUG ID 权威源**）
- [_suspended_bugs/](_suspended_bugs/README.md) — 查实但修复未确认的缺陷卡（id 保留）
- [_reference/](_reference/README.md) — 随毕业卡归档的研究材料（slug 查）
- [_misc/](_misc/README.md) — 2026-09-28 整池退役的搁置池 [suspended.md](_misc/suspended.md) 与磨清单 [polish.md](_misc/polish.md)（用户裁决；复活/触发条件仍在表内，点名才读，不再收新件）

## 已毕业推敲卡

| 卡 | 毕业门 | 去向 | 日期 |
|---|---|---|---|
| [2026-09-28-dag-edge-routing.md](_closed_plans/2026-09-28-dag-edge-routing.md) | 该做（用户点名「都要修改掉」，车道分离） | [implemented/2026-09-28-dag-edge-routing](../../notes/implemented/2026-09-28-dag-edge-routing.md) | 2026-09-28 |
| [2026-09-28-float-geometry-memory.md](_closed_plans/2026-09-28-float-geometry-memory.md) | 该做（B 案前置已核实，用户批准转 RFC） | [implemented/2026-09-28-float-geometry-memory](../../notes/implemented/2026-09-28-float-geometry-memory.md) | 2026-09-28 |
| [2026-09-28-sidebar-split-budget.md](_closed_plans/2026-09-28-sidebar-split-budget.md) | 不做（维持 2 停靠 + N 浮出现状，不推 upstream） | 关闭迁本目录 `_closed_plans/` | 2026-09-28 |
| [2026-09-29-collab-mechanism-evidence.md](_closed_plans/2026-09-29-collab-mechanism-evidence.md) | 消化（六项全答：Q0/Q1/E2/E3 早已答；E1 三判据全绿 + Q2 跨根不可用定案） | 消费卡 [writing-collab-locks-redis](_closed_plans/2026-09-29-writing-collab-locks-redis.md) 已知节 + 认证档 [fs-guard-probe.mjs](../../probes/fs-taskboard/fs-guard-probe.mjs) | 2026-10-03 |
| [2026-09-29-date-channel-mechanism.md](_closed_plans/2026-09-29-date-channel-mechanism.md) | 该做（D2' 已兑现并获用户追认——「未批先行」消除） | [implemented/2026-10-03-d2-time-context-ratification](../../notes/implemented/2026-10-03-d2-time-context-ratification.md)（实现事实家 = 升 pin Note + 收割轮批3） | 2026-10-03 |
| [2026-10-02-feedback-channel-cultivation.md](_closed_plans/2026-10-02-feedback-channel-cultivation.md) | 该做（D1 选型拍定：两者都要——读模型 + 手册引导） | 实施随培养回路下一轮立项，届时新 RFC 引本卡 | 2026-10-03 |
| [2026-09-29-writing-collab-locks-redis.md](_closed_plans/2026-09-29-writing-collab-locks-redis.md) | 该做（R0 四条已落地；R2 留带触发条件的实验位随 Note） | [implemented/2026-10-03-redis-r0-native-collab](../../notes/implemented/2026-10-03-redis-r0-native-collab.md) | 2026-10-03 |
| [2026-09-29-deliverables-lifecycle-metadata.md](_closed_plans/2026-09-29-deliverables-lifecycle-metadata.md) | 该做（五决策点拍定并同 diff 落地：C1/A1/B1/分型/归档家/并步） | [implemented/2026-10-03-deliverables-lifecycle-landing](../../notes/implemented/2026-10-03-deliverables-lifecycle-landing.md) | 2026-10-03 |
| [2026-10-04-multi-user-concurrency-bdd.md](_closed_plans/2026-10-04-multi-user-concurrency-bdd.md) | 该做（用户令「评估之后开始加工」；C1 走查观察已在手） | [implemented/2026-10-04-multi-user-bdd-batch1](../../notes/implemented/2026-10-04-multi-user-bdd-batch1.md)（C1/C2 固化 = team-concurrency-probe 4/4） | 2026-10-04 |
| [2026-10-04-human-agent-unity-ux-bdd.md](_closed_plans/2026-10-04-human-agent-unity-ux-bdd.md) | 该做（同上；H3 主回路零资产） | [implemented/2026-10-04-multi-user-bdd-batch1](../../notes/implemented/2026-10-04-multi-user-bdd-batch1.md)（H3 固化 = member-rescue-probe 6/6） | 2026-10-04 |
| [2026-10-04-doc-snr-cleanup-audit.md](_closed_plans/2026-10-04-doc-snr-cleanup-audit.md) | 该做（同日：四线审计 17 项发现 → 批次①机械修复 ×12 + 批次②三裁断（用户拍板：轻瘦身 / 并表 testing.md / 头注状态字段）全落地） | [implemented/2026-10-04-doc-snr-cleanup-round](../../notes/implemented/2026-10-04-doc-snr-cleanup-round.md)（残余观察项见其「未做」节） | 2026-10-04 |
| [2026-10-04-cross-process-shared-disk.md](_closed_plans/2026-10-04-cross-process-shared-disk.md) | 该做（轻）——用户拍板 Agent Teams 协调面 + 单写进程部署约定，零新代码；小修不设 RFC（章程明文） | [implemented/2026-10-04-shared-disk-taskboard-coordination](../../notes/implemented/2026-10-04-shared-disk-taskboard-coordination.md)（手册「动议任务板」行 + 输掉的方案留尸 + 待验证项） | 2026-10-04 |
| [2026-10-04-work-status-visibility.md](_closed_plans/2026-10-04-work-status-visibility.md) | 该做（轻）——形状 (a) 现状钉死（用户令如法炮制；既定「最正确不短视」原则），零新代码；小修不设 RFC | [implemented/2026-10-04-presence-board-progress-surface](../../notes/implemented/2026-10-04-presence-board-progress-surface.md)（multi-human.md §2 合同行 + (b)/(c) 留尸带复活触发 + presence-board.spec 16/16） | 2026-10-04 |
| [2026-10-02-deferred-verifications.md](_closed_plans/2026-10-02-deferred-verifications.md) | 该做（触发+点名双兑现）——用户令维护者侧系统性复跑浏览器行为链；两笔验证债全判收 | [implemented/2026-10-05-browser-behavior-probe](../../notes/implemented/2026-10-05-browser-behavior-probe.md)（probe 首跑 5/5 + 沙箱两层墙定位 + seam 选型证据） | 2026-10-05 |
| [2026-10-05-repository-steerability.md](_closed_plans/2026-10-05-repository-steerability.md) | 该做（用户六项拍板毕业拆分；毕业核验全过并新发现第四处日志世代读取点 authorship-audit） | 六条 RFC 全部实施毕业（steerability 系列，均 2026-10-05：test-navigation / log-generation / pack-boundaries / preset-skill-matrix / runtime-runbundle / [entry-runtime-map](../../notes/implemented/2026-10-05-steerability-entry-runtime-map.md)——末条含终局五问走查验收；去向逐条见归档卡状态行）；#7 物理迁移延后——触发住 pack-boundaries | 2026-10-05 |
| [2026-10-06-driver-surface-package.md](_closed_plans/2026-10-06-driver-surface-package.md) | 该做（RFC 已批 + 用户定次序 A→B→C→D→E + 确认 ongoing goal 推进，开工令兑现） | [毕业 Note driver-surface-package](../../notes/implemented/2026-10-06-driver-surface-package.md)（五条目 A 拆 dev/ → B pnpm orient → C 驾驭者单页 → D AGENTS 减密 → E docs 可读层全部毕业；红绿收据与走查在其验证记录节） | 2026-10-06 |

## 搁置推敲卡（暂停——不是做完）

| 卡 | 搁置原因 | 重启条件 |
|---|---|---|
| （空——首张搁置卡落地时建行） | | |

## 已修复缺陷卡

| Bug | 标题 | 修复 commit | 日期 |
|---|---|---|---|
| [BUG-001-manual-truncation.md](_fixed_bugs/BUG-001-manual-truncation.md) | 公司手册超出 agent-instructions maxBytes——尾部在所有角色会话被截断（maxBytes 16384→32768 + verify `handbook-budget` 门禁；红→还原→绿） | 未单独 commit（随 2026-10-02 消化对账轮工作树） | 2026-10-02 |
| [BUG-002-dual-ceo-silent-supersession.md](_fixed_bugs/BUG-002-dual-ceo-silent-supersession.md) | 双 CEO 门无检测——doors 纯函数投影 + host workspace_doors 工具（事件监听 api-session/*）+ CEO 自然使用（dual-ceo-probe PASS：B 主动调用检测工具）；两轮修复（第一轮假绿补修） | 修复 commit（client-load-smoke + dual-ceo-probe 双绿） | 2026-10-06 |
| [BUG-003-present-no-role-gate.md](_fixed_bugs/BUG-003-present-no-role-gate.md) | present 无角色门禁——判据层补 DRAFT_PRESENTED_BY_NON_LEAD 观察档（非 Lead present 过程稿每次提醒、成品侧越权照旧违规；多人形态修正单操作者语境的历史容忍） | 修复轮 commit（spec 3 例红→绿 + live 复验违规 0 保持） | 2026-10-06 |
| [BUG-004-claim-yield-not-machine-readable.md](_fixed_bugs/BUG-004-claim-yield-not-machine-readable.md) | 占位让位不可机判——手册补让位行格式与重读规矩 + PLACEHOLDER_YIELD_LINE/isPlaceholderYield 机查面 + claim-race 3 轮行为验证（run3 PASS：恰一人持认，标准让位行格式完美） | 修复轮 commit | 2026-10-06 |
| [BUG-005-dual-signoff-single-door-routing.md](_fixed_bugs/BUG-005-dual-signoff-single-door-routing.md) | 双签多门退化单签——手册补多人双签补签流程（两签齐才完整）+ multi-human §0 登记日志半旁路 + dual-signoff probe 复验 PASS（CEO 知道流程并能执行） | 修复轮 commit | 2026-10-06 |
| [BUG-006-ceo-meta-vocab-drift.md](_fixed_bugs/BUG-006-ceo-meta-vocab-drift.md) | CEO 产出 meta.md 词表外值——初判"生成侧无词表"被证伪（templates/meta.md 早钉了词表），真根因 = 录制临时工作区只镜像 AGENTS.md ⇒ mirrorCompanyReference 统一录制/排练镜像语义 + replay-smoke 接线（spec 红→绿 + vitest 355） | 修复 commit dcdd78e（判定见卡状态行） | 2026-10-07 |

## 搁置缺陷卡（查实——修复未确认）

| ID | 标题 | 搁置原因 |
|---|---|---|
| （空——首张搁置卡落地时建行） | | |

## 随卡归档的研究材料

| 文件 | 喂过哪张卡 | 日期 |
|---|---|---|
| [2026-10-04-multi-user-ux-walk.md](_reference/2026-10-04-multi-user-ux-walk.md) | 上两张（multi-user BDD C 系 + H 系——两轮走查实录 + Agent Team 能力面清单） | 2026-10-04 |

## 退役历史池（2026-09-28 整池退役，点名才读）

| 件 | 处置 | 日期 |
|---|---|---|
| [suspended.md](_misc/suspended.md) | 整池退役（用户裁决；复活条件仍在表内，点名才读） | 2026-09-28 |
| [polish.md](_misc/polish.md) | 整池退役（用户裁决；余项触发条件仍在表内，点名才读） | 2026-09-28 |
