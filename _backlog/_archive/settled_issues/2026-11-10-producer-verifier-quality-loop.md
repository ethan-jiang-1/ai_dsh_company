---
status: 已结
opened: 2026-11-10
---

# 落地：producer/verifier 质量环——独立上下文 + 外部方法层

> 立卡：2026-11-10 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 语义审（对照验收 9 条）+ keyless/typecheck/verify/preset-smoke/审计探针/真模型 E2E 实跑，证据见 Note「验证」
>
> **结论/去向**：note — [2026-11-10-producer-verifier-quality-loop.md](../../../notes/implemented/2026-11-10-producer-verifier-quality-loop.md)（落地同变更；决定号 [D60](../../../docs/reference/decisions.md)）
>
> **落地时的命名裁定**：两个能力档改用一个共用前缀——`quality-loop-producer` / `quality-loop-verifier`（工具名 `quality_loop_produce` / `quality_loop_verify`）；裸名 `producer` / `verifier` 太泛，且要体现「先生产、再验证」的次序（用户 2026-11-10 两次裁定）。卡内下文保留立卡时的原用词。
>
> **基座同步（2026-11-10）**：`docs-dsh-alignment` 五步已落地（`69706354`…`abb02d1e` + 收尾）：
> 原 docs 的 design 层（已移除）已并回 `notes/`；`docs/index.md` 改为 tier 书架；新增 [docs/architecture.md](../../../docs/architecture.md)；
> 方法层/培养回路事实改由 [docs/contracts/cultivation.md](../../../docs/contracts/cultivation.md) 承载；`doc-budget`
> 加 **≥5% headroom**。本卡 docs 落点按新层表更新：**流程/操作进 `guides/`**，**理由/备选进落地 Note**
> （docs 只写 now），方法层事实引 `cultivation.md`。实施前先 `git log --oneline -8` 确认基座未再变。

**问题与期望结果：** VP-Eng 接到复杂产出时，一个人既做设计又做验证，E（工程）与 V（验证）在同一上下文里互相干扰（锚定、共享盲区、自我评分、注意力稀释）。期望：两个**独立 activation** 的能力档——一个产出、一个验证——按外部方法包工作，流程与裁决可审计。历史 SA/SQA 的 E/V 分家结构是对的，但方法写进了 persona/skill，2026-11-09 退役；本卡复用结构，不复用旧 preset。

## 背景：SA/SQA 的完整弧，以及这次为什么不一样

**原来的问题（2026-11-06）。** 真实项目落地（不是 demo）时，VP-Eng 一个人既做硬软一体架构、又做需求验证；E（工程）与 V（验证）在同一上下文里，质量不独立。用户当时的拍板：两个**委派子人格**——`system-architect`（SA，V 模型左侧：系统需求→架构→子系统/接口）与 `system-qa`（SQA·V&V，右侧：单元/集成/系统/验收、独立评审 E 侧产物、质量否决）；子人格档不占编制；CEO 与 vp-eng 各加命名行 `maxDepth: 2`；SQA 否决直达 CEO；E 与 V 不许互相代笔。落地 Note 见 [2026-11-06-sa-sqa-subpersonas.md](../../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)。

**后来怎么长（2026-11-07/08）。** 需求链落地：SA 产 SyRS（`REQ-###`）+ IRS（`IF-###`）+ 架构稿；SQA 产 `TC-###`（`covers` 回 REQ/IF）+ V&V 的 L1–L4 分层；再往后加学科域路由（五学科先判域、VP-Eng 任务书声明、SQA 逐行域审计）。方法越来越具体，也越来越绑"系统工程 V 模型 + 硬软一体"这个产品类型。见 [2026-11-07-requirements-teaming-program.md](../../../notes/archived/2026-11-07-requirements-teaming-program.md) 与 [2026-11-08-sa-sqa-capability-routing.md](../../../notes/archived/2026-11-08-sa-sqa-capability-routing.md)。

**为什么退役（2026-11-09）。** 用户要求清理这两个旧 preset：它们是"旧思路的专职 V 模型子人格"，方法写在 persona 与 skill 里——换一家公司（比如纯 SaaS）就要改包；保留 `specialist` 会让模型/文档继续维护一套不再需要的身份与 veto 语义。退役拆掉了 preset、委托行、`specialist` 字段、support/patch、文档/测试/探针，见 [2026-11-09-retire-sa-sqa.md](../../../notes/implemented/2026-11-09-retire-sa-sqa.md)。

**教训不是"E/V 分家错了"，是"放错层"。** 结构（独立上下文 + 一个做 + 一个验 + 裁决独立）是对的；错的是把"怎么做"（V 模型、TC 编号、五学科）放进了"我是谁"（persona/skill）。所以这次把四样拆开：身份/工具面进 preset（极短，不含方法）；流程进共享 skill（交接、轮次、裁决）；方法进角色方法层（公司/项目自己装，换方法不换 preset）；政策进公司层（是否强制、升级线、对外签字）。

**这次和旧 SA/SQA 的具体不同：**

| 维度 | 旧 SA/SQA | 这次 producer/verifier |
|---|---|---|
| 名字/语义 | 绑 V 模型/系统工程 | 功能名，方法由外部包定义 |
| 方法 | 写在 persona/skill 里 | 外部方法层，任务书点名 `<pack>@<version>` |
| 换公司 | 改包 | 换方法包 + 公司政策 |
| 独立性 | 制度约定 + 文本 | 独立 activation + 只读工具面 + 裁决哈希 + 审计 |
| 裁决 | SQA veto 直达 CEO | 验证者只读出裁决；owner 原样落盘；对外签字仍归人 |

**术语。** E/V = 工程（设计/实现）与验证（测试/评审）；V 模型 = 一种方法（左需求/架构/接口，右单元/集成/系统/验收），不是本能力的定义；方法层 = `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`；四槽 = 人/流程/方法/政策；独立性层级 = 机械全量重算 / 上下文独立复核（同模异上下文，有限）/ 判断类复核，本卡落第二种。更细的过程与证据见研究题 [README](../research/capability-placement-and-quality-loop/README.md) 与 [推演材料](../research/capability-placement-and-quality-loop/2026-11-10-deliberation.md)。

## 当前情况（事实与依据）

- DSH 机制事实（核过）：人格/工具面只能由 `agentPreset` 给；命名 child 才是独立上下文 + 独立人格，team 成员继承 Lead、workflow 分支同人格且无 `agentPreset`；方法层 = `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`，公司级、角色隔离、pack 升级不擦、人采纳、热生效；能力边界是"缺行"（`tool-fs` 的 `write`/`edit` 开关），`read-only` 沙箱是会话级、不是 per-child；`list_subagents` 带 `agentPreset`/`delegationDepth`。依据见 `docs/contracts/delegation.md`、`docs/contracts/presets.md`、`docs/contracts/cultivation.md`（方法层）与 [推演材料](../research/capability-placement-and-quality-loop/2026-11-10-deliberation.md)。
- 设计：四槽（人/流程/方法/政策）——两个能力档进 preset、质量环流程进通用层、方法进角色方法层、强制范围进公司层。研究题见 [README](../research/capability-placement-and-quality-loop/README.md)。
- 用户 2026-11-10 约束：本轮只改 `_backlog/`，落地时才动仓库其他部分。

**未决问题（默认按推荐执行；用户改任一项先回卡）：**

1. **名字**：`producer` / `verifier`（推荐：功能名，不绑 V 模型）还是沿用 `sa` / `sqa`。
2. **验证者的手**：v1 只读、无 bash（推荐：真只读）；v2 才论"能跑测试但只能检测"。
3. **方法层安装**：v1 人工放目录（推荐）；扩 `/cultivation adopt` 到 support profile 是另一张卡（要改 `PRESET_KEYS`/名册）。
4. **强制范围**：公司政策按风险等级（推荐）；产品类型只给默认建议，不硬绑。
5. **裁决落点**：`verdict-r<N>.md`（推荐）还是并进 final。
6. **卡数：一张。** 两个能力档是一个不变量（独立上下文 + 外部方法 + 裁决原样）；拆两张会允许"preset 在、流程/审计不在"的半成品，正是旧 SA/SQA 的失败形态。若实施超一个切片，第一片 keyless 绿后在卡内记分片，不在立卡时拆。

**下一步：** 用户点头本卡后先落 keyless 面（presets/rows/skill/fixture/audit 夹具），再跑一次真模型 E2E；E2E 的证据进落地 Note，不进回归。

## 范围与排除项

- 范围：两个 support preset（`producer` / `verifier`，落 `presets/`）；VP-Eng 两条命名行 `produce` / `verify`；共享 `quality-loop` skill（落 `presets/_shared/skills/`）；方法包契约 + fixture（`tests/fixtures/`）；审计探针（`quality-loop-audit.mjs`，落 `probes/team/`）；`docs/contracts/presets.md` / `docs/contracts/delegation.md` / `docs/contracts/cultivation.md`（方法槽）/ `review-protocol.md` 同步；guides tier 下的 quality-loop 文档（流程/操作，若落文档）；keyless spec 与 `preset-smoke` 计数。
- 排除：宪章正本与入口链（第一张卡）；扩 `CULTIVATION_ROLES`；把方法包做成产品默认（只放 fixture）；UI 委派卡；host 代码；运行时 veto；不同模型路由；验证者 bash（v1）；第三方 runner。

## 已知与未决

- **只读是能力面，不是运行时闸**：验证者没有 `write`/`edit`/`bash`，所以不能写盘；但它也不能跑测试。动态验证的证据由 owner 跑、把原始输出交给验证者评——这保不住"执行者独立性"，是 v1 的已知边界。
- **同模相关性**：上下文隔离解决锚定/自评，不解决同源盲区；独立性按 `review-protocol.md` 标"上下文独立复核（同模异上下文，独立性有限）"，不报"异人"。
- **裁决由父代理落盘**：验证者只读，裁决在最终消息；VP-Eng 原样落盘并带 session + sha256；审计核哈希，防事后改。父代理理论上能改，审计只能事后检测。
- **方法层对 support profile 没有采纳流水线**：`/cultivation` 名册是六角色；v1 人工把方法目录放进 home。`preset` 的 `customSkillDirs` 缺目录容忍。
- **`agent-instructions` 不注入**：两个能力档不读公司手册；公司事实/复核协议由任务书给路径，保持"通用能力档"不绑公司。
- **`maxDepth: 2`**：VP-Eng 作为团队成员 depth 1，child 落 2；CEO 命名 `vp_eng` child 时同样成立。
- **不碰 `PRESET_KEYS`**：两个能力档是 support，不进六角色名册/在场板/培养面。

## 方案与取舍

- **两个 support preset + 两条命名行**：命名行确定性高于通用 `subagent` 的 `agent_preset` 白名单；身份可由 `list_subagents` 审计。
- **流程住共享 skill**：交接包、轮次、处置、裁决不可改是通用机制；公司政策只在 `review-protocol.md` 加一节，不写进角色。
- **方法住角色方法层**：任务书点名 `<pack>@<version>`，两侧同名同版本；没有默认方法，缺了就 fail-closed。换公司/换产品类型只换方法包。
- **验证者只读**：v1 用"缺行"表达边界（无 `write`/`edit`/`bash`），比 persona 写"请只读"硬；代价是不能跑测试，已记边界。
- **审计探针**：核独立会话/preset/depth、裁决哈希、处置覆盖、方法配对、验证者无写调用；不做运行时 veto。
- **输掉的方案**：恢复旧 `system-architect`/`system-qa`（方法仍写死）；同上下文换帽子（没隔离）；team 成员（继承 Lead 组合）；workflow 分支（同人格、无 `agentPreset`）；通用 `subagent` 白名单（模型自选不可靠）；新造调度器/状态机（违反"不发明"）；工作区另立 method 目录（第二事实源）。
- **为什么一张卡**：见未决 6；本轮决策 = 一张，理由是不变量不可拆。

## 关闭条件

验收标准全绿 + 一次真模型 E2E 证据进 Note + 用户验收；卡顶补 `结论/去向` 与 `审查：` 后归档。

## 验收标准

1. **两个能力档**：`producer` / `verifier`（或批准的名字）落 `presets/`；persona 短（≤2KB）、无方法名/公司事实；producer 工具 = `read/write/edit/bash/fs-search/web/todo/skill/compaction`；verifier = `read`（`write:false`/`edit:false`）、`fs-search`、`web`、`todo`、`skill`、`compaction`，**无 bash**；两者都不装 subagent/team/workflow/ask-user/present/agent-instructions；`customSkillDirs` 带 `company/methods/<id>/` 方法槽；`preset-smoke` 真挂载通过（6 角色 + 3 worker + 2 新档）。
2. **VP-Eng 两行**：`produce` / `verify` 各带 `agentPreset`、`maxDepth: 2`；keyless `delegation-composition` 钉工具名/preset/深度；`list_subagents` 读到的 `agentPreset` / `delegationDepth` 正确。
3. **流程 skill**：`quality-loop` 落 `presets/_shared/skills/`，含任务书字段、交接包（不给产出者推理/自评）、轮次上限 2、处置三选一、裁决 append-only/原文、check-id 全覆盖、独立性标注（按 `review-protocol.md`）、升级路径。
4. **方法包契约 + fixture**：`tests/fixtures/` 里一对 producer/verifier 方法包，`SKILL.md` 的 `metadata` 带 `method` / `version` / `side`，正文带 check-id 表；文档写清安装到 `<DSH_HOME>/company/methods/<role>/<pack>/`；任务书不给方法时 fail-closed；**不发布默认方法包**。
5. **审计探针**：`quality-loop-audit.mjs`（落 `probes/team/`）核两个独立会话/preset/depth、裁决文件与 child 最终消息同哈希、裁决未被改、处置覆盖全部发现、两侧方法同版本、验证者无 `write`/`edit` 调用；红证 = 改裁决文件/删一条处置/换方法版本 → 红，还原 → 绿。
6. **文档**：`docs/contracts/presets.md` 加两个 support 档一行；`docs/contracts/delegation.md` 加两行与深度说明；`docs/contracts/cultivation.md` 加 support profile 方法槽（若采纳）；quality-loop 文档落 guides tier（流程/操作；或只留 skill 指针）说明流程与方法槽；`docs/architecture.md` 若流程成为常驻面加一行路由；`review-protocol.md` 加"质量环的独立性口径与对外签字仍归人"一节；理由/备选进落地 Note（docs 只写 now）。
7. **测试**：keyless（`pnpm test tests/presets` + 审计 fixture）绿；一次真模型 E2E 证两独立会话、验证者只读、裁决原文、处置覆盖；E2E 证据进 Note，不进 CI。
8. **抽象度**：卡的 `## 抽象度` 四问已答；第二消费者 = 第二套方法包 fixture + 第二家公司 fixture（`tests/fixtures/companies/`）；高成本缝（preset/工具面/流程）第一天抽象，方法（低成本）放方法层。
9. **不做**：host 代码、UI 委派卡、运行时 veto、`PRESET_KEYS` 改动、默认方法包、验证者 bash（v1）。

## 抽象度

- 换公司要改吗？方法要（方法层）；身份/工具面/流程不要。
- 换产品类型要改吗？方法包/产物链要；流程/preset 不要。
- 换方法要改吗？只换方法层 skill；preset 不动。
- 只有机制变才改吗？preset + 流程是；方法是数据。
- 第二消费者：第二套方法包 fixture（同一套 spec 跑两遍）+ 第二家公司 fixture（`tests/fixtures/companies/` 已有两套），证 skeleton 与公司/方法无关。
- 搬家成本：preset/工具面/流程 = 高 ⇒ 第一天抽象；方法 = 低 ⇒ 放方法层，可以先具体。
- 排除了更低的层：公司层（只一家公司的 V 模型）不够；产品类型层（只一个产品类型）不够；方法层才是方法的家。
