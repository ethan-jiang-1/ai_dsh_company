---
topic: capability-placement-and-quality-loop
intent: 记录 2026-11-10 从 SA/SQA 历史需求到四槽/三层方案与宪章内化的全过程证据
---

# 2026-11-10 · 从 SA/SQA 到"能力归位"：一次完整的抽象推演

## 0. 这份材料是什么

用户 2026-11-10 要求先找回历史 SA/SQA 需求，再想清楚"同一上下文做设计稿和验证稿一定会互相干扰"这件事在 DSH 里怎么落；中途把结论收敛到"能力归位"与"内容宪章"。这份材料是那一整轮的过程记录：事实、方案、输掉的方案、开放决定和产出卡。它不是结论本身——结论在两张卡里。

## 1. 起点：历史 SA/SQA 的需求与退役

- 原始需求卡：[2026-11-06-system-architect-sqa.md](../../settled_issues/2026-11-06-system-architect-sqa.md)（立卡于 2026-11-06，commit `5e21f8b3`）。原话的问题：真实项目落地时，VP-Eng 一个人既做硬软一体架构、又做需求验证，E（工程）与 V（验证）在同一上下文里，质量不独立。
- 当时的方案：两个委派子人格 `system-architect`（SA）与 `system-qa`（SQA·V&V），按 V 模型分工——SA 管左侧（系统需求→架构→子系统/接口），SQA 管右侧（单元/集成/系统/验收、独立评审 E 侧产物、质量否决）。子人格档不占编制；CEO 与 vp-eng 各加命名委托行 `maxDepth: 2`；SQA 否决直达 CEO，E 与 V 不许互相代笔。落地 Note = [2026-11-06-sa-sqa-subpersonas.md](../../../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)。
- 后续补强：2026-11-07 需求链（SA 产 SyRS/IRS，SQA 产 `TC-###` + V&V 的 L1–L4，D57/D58）见 [2026-11-07-requirements-teaming-program.md](../../../../notes/archived/2026-11-07-requirements-teaming-program.md)；2026-11-08 学科域路由（五学科先判域、任务书声明、SQA 逐行域审计，D59）见 [2026-11-08-sa-sqa-capability-routing.md](../../../../notes/archived/2026-11-08-sa-sqa-capability-routing.md)。
- 2026-11-09 先升 `specialist`，随即退役：两个 preset 目录、委托行、`specialist` 模型字段、support/patch、文档/测试/探针同步删除，见 [2026-11-09-retire-sa-sqa.md](../../../../notes/implemented/2026-11-09-retire-sa-sqa.md)。退役理由：它们是"旧思路的专职 V 模型子人格"——方法（V 模型层级、TC 编号、五学科清单）写进了 persona 与 skill，换一家公司就要改包；保留 specialist 会让模型和文档继续维护一套不再需要的身份与 veto 语义。
- **教训**：E/V 分家这个**结构**是对的；错的是把**方法**放在了身份层。结构复用，方法外置。

## 2. 新要求（2026-11-10）

- VP-Eng 拿到一个复杂东西：一个负责实现/设计，一个负责测试/验证，都是架构思路，二者对抗，把东西做对。
- 同一个上下文里做 SA 产出和 SQA 产出会出质量问题（锚定、共享盲区、自我评分、注意力稀释）。
- **SA 用什么方法生产、SQA 用什么方法验证，是外部约定，不能写死**。
- 梦之队是虚拟公司，可以定制成各种公司；换公司应该只调"某些人的技能"，不是改代码。
- 宪章落地后，**Agent 也必须读到**——不能只靠人读；doc chain 或 execution chain 都要能撞到它。

## 3. DSH 机制事实（逐条核过）

### 3.1 人格与工具面只能由 preset 给

- 0.2.1 删除了 per-instance `persona` / `toolFilter`（Config 硬拒）；child 的人格与组合由工具行的 `agentPreset` 决定。见 `docs/contracts/delegation.md` §1。
- 命名行可钉 `agentPreset` + `maxDepth`；通用 `subagent` 可配 `allowedAgentPresets`，让模型用 `agent_preset` 从白名单选，但**只有 in-process spawn 支持**，fork/外部后端会拒。见 `vendor/dsh/packages/subagent/tool-subagent/README.md`。
- 结论：要两个独立身份，最稳的是两条命名行，不是让模型自选。

### 3.2 独立上下文的三条通道，只有一条能用

- **team 成员**：继承 Lead 组合（`spawn_teammate` 无 preset 参数），工具/skill 面是 Lead 的，角色差异靠软隔离；不能当独立验证方。见 `docs/contracts/delegation.md` §3。
- **workflow 分支**：`startActivation(parent)` 的子代，没有 `agentPreset`，同人格、fresh 上下文；不能出独立裁决。见 `packages/company-pack/content/contracts/workflow.md`。
- **命名 child（activation）**：工具行钉 `agentPreset`，child 拿到该 preset 的 skills 与工具面；这才是独立上下文 + 独立人格的载体。见 `docs/contracts/delegation.md` §1/§4。

### 3.3 方法层是现成的"外部约定"槽

- 路径 = `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`；公司级、按角色隔离、pack 升级不擦、**人**采纳才生效（`/cultivation adopt`），分身只能提案。见 `docs/contracts/cultivation.md`。
- 生效时点：skill 正文同会话下一轮；条目增删改名下一轮刷新目录（watcher 连运行中会话都刷）。换方法不用重启、不用发版。
- 写隔离：workspace-write 部署下，分身 fs 写方法层被沙箱拒（`[sandbox: file access denied]` 活体留证）；danger-full-access 无围栏——这是机器条件，不是机制缺口。
- 限制：`/cultivation` 的名册 = `CULTIVATION_ROLES` = 六个角色（`PRESET_KEYS`），support profile 不在其中。新能力档若要走采纳流水线，需要扩名册（另一张卡）；v1 人工放目录即可。见 `packages/company-pack/src/host/cultivation/cultivation.ts`。

### 3.4 能力边界是"缺行"，不是 persona 文案

- `tool-fs` 的 `write` / `edit` 开关可关闭工具与其指引；只读 worker 就是这么做的。见 `packages/company-pack/presets/worker-researcher/agent.cordis.yml`。
- `tool-fs` 没有路径级写范围；`read-only` 沙箱模式存在，但它是**会话级**的（`SandboxMode`），不是 per-child 配置；subagent spawn 不暴露这个开关。见 `vendor/dsh/packages/fs/tool-fs/README.md` 与 `vendor/dsh/docs/subsystems/sandbox.md`。
- bash 在 workspace-write 下能写。所以"只读验证者 + 能跑测试"在 v1 不能同时成立：要么没有 bash（真只读），要么有 bash（写只能靠检测）。这是要拍的取舍。

### 3.5 身份可审计

- `list_subagents` 每行带 `agentPreset` / `delegationDepth`（读 child durable header，读不到显式 `unavailable`）；`send_to_subagent` 可续同一个 child。见 `docs/contracts/delegation.md` §4。
- 审计探针可以据此核"两个独立会话、深度、preset"；裁决原文可以拿 child 最终消息的哈希与落盘文件比对。

### 3.6 公司 = home

- 一个安装 = 一个公司；不同公司 = 不同 `DSH_HOME`；同一 home 可顺序服务多个 workspace，但方法层/账本/workspace 登记共享。见 `docs/contracts/profile.md`。
- 方法层住 home，不在模型可写区；换公司 = 新 home + 它的方法层 + 公司层内容。

### 3.7 独立性口径已经写好

- `packages/company-pack/content/company/review-protocol.md` 把复核分三层：机械全量重算（独立性成立）/ 上下文独立复核（同模异上下文，**独立性有限，不得报成"异人"**）/ 判断类复核；对外件必须有具名人类复核人，否则 fail-closed。
- 本方案的质量环落在"上下文独立复核"，只解决锚定/自评，不解决同模同源盲区；对外签字仍归人。

## 4. 抽象：三层 + 四槽

### 4.1 内容三层（已有）

2026-11-09 的通用/产品类型/公司三层 + 机制层，加载 T0/T1/T2，唯一清单 = `packages/company-pack/content/manifest.json`。见 [2026-11-09-generic-specific-separation.md](../../../../notes/implemented/2026-11-09-generic-specific-separation.md)。

- 换公司：只改公司层（`company.md` / `policy-lines.md` / 章程）。
- 换产品类型：换 `content/product-types/<id>/` 包。
- 通用层：跨公司复用，不写公司名/行业词/阈值。

### 4.2 四槽（本轮新增的切法）

| 槽 | 长什么样 | 换公司会变吗 | 住哪 |
|---|---|---|---|
| 人 | 身份、能力边界、工具面 | 不变 | 通用层 preset |
| 流程 | 谁先谁后、交接、轮次、裁决 | 不变 | 通用层 skill / content |
| 方法 | 怎么做、检查表、判据、术语 | 会变 | 角色方法层 |
| 政策 | 什么条件下强制、阈值、升级线、谁签字 | 会变 | 公司层 |

架构不是第五槽；架构是这四样的摆放方式。

### 4.3 抽象度跟改动成本走

- 高成本缝（身份/工具面/流程契约，改 preset/代码/测试）→ 第一天就抽象。
- 低成本内容（方法/模板/检查表，改一个 skill 文件）→ 可以先具体，放方法层。
- 低成本数据（政策/阈值/公司事实）→ 公司层。
- 这条同时防"把具体塞进骨架"与"为单一消费者造通用层"。

### 4.4 两个测试 + 两个消费者

- 换公司测试：删掉公司名/行业词/人名/阈值，骨架还成立吗？
- 换方法测试：删掉方法名/层级名/编号族/检查表，骨架还成立吗？
- 两个消费者：声称通用必须点名第二个真实消费者；最好落成第二套 fixture（`tests/fixtures/companies/` 已有两套），同一套 spec 跑两遍；说不出就放低一层，或登记单例例外（复审日期 + 搬家成本 + 触发条件）。

## 5. 具体设计：producer / verifier

### 5.1 两个能力档（support preset，不是角色）

- `producer`：读/写/edit/fs-search/bash/web/todo/skill/compaction；不装 subagent/team/workflow/ask-user/present/agent-instructions；短 persona，只写边界与方法槽。
- `verifier`：read/fs-search/web/todo/skill/compaction；`write:false` / `edit:false`，v1 **没有 bash**；不装 subagent/team；短 persona。
- 两者都声明"方法不在你身上：任务书必须给 `method: <id>@<version>`，先加载同名 skill；没给就停下回报"。preset 里不出现任何方法名。

### 5.2 VP-Eng 两条命名行

`produce` → producer，`verify` → verifier，各 `maxDepth: 2`。不用通用 `subagent` 的 `agent_preset` 白名单——命名行确定性更高，身份可审计。

### 5.3 流程 skill（`quality-loop`）

- 任务书字段：目标/约束/基线/产物路径/`method@version`/轮次上限。
- 交接包：验证者只拿「基线 + 产物 + 约束 + 方法」，**不拿产出者的推理和自评**（防锚定）。
- 轮次：产 → 验 → 处置 → 复验，上限 2；超限升级。
- 处置：每条发现必须落「已修 / 有证据的反驳 / 接受风险（写谁接受）」；不许静默忽略。
- 裁决：每轮一块，append-only，原文不可改；收口必须原文带上。
- 覆盖：方法检查表里的每个 check-id，裁决必须有一行 pass/fail/skip+理由；缺行 = 不通过。

### 5.4 方法包

- 两侧各一份同名同版本 skill：`<DSH_HOME>/company/methods/producer/<pack>/SKILL.md` 与 `.../verifier/<pack>/SKILL.md`。
- frontmatter 的 `metadata` 带 `method` / `version` / `side`；正文带输入契约、程序、**检查表（check-id / 判据 / 证据要求）**、输出契约、裁决词表。
- 任务书点名 `method: <pack>@<version>`；产物头写回去；审计核两侧同 id 同版本。
- 没有默认方法：任务书不给，角色 fail-closed 停下。这从结构上防止偷偷写死。

### 5.5 裁决与审计

- 验证者只读，裁决放最终消息；VP-Eng 原样落 `verdict-r<N>.md`，带头（session + sha256）。
- 审计探针（keyless）核：两个独立会话/preset/depth；裁决文件与 child 最终消息同哈希；裁决未被改；处置覆盖全部发现；方法两侧同版本；验证者没有 write/edit 调用。
- 运行时 veto 不做：DSH 没有 per-child 只读闸，审计只能"检测 + 标注"，不假装是运行时强制。

### 5.6 独立性怎么说

- 标"上下文独立复核（同模异上下文，独立性有限）"，不报"异人"；关键结论旁标边际宽度。
- 对外交付件仍要具名人类复核人；这个环是内部质量闸，产出是给那个人的证据包。

## 6. 内化：宪章 + skill + 门禁 + 卡/Note

- 宪章 = 为什么/秩序；skill = 怎么做；门禁 = 必须；卡/Note = 记录。四者互相指针，不互相复述。
- 三个时刻：动笔前（skill 四问 + 两测 + 两消费者）、合并前（结构门 + 卡 `## 抽象度` + P5 语义审一句问）、收尾时（Note "归位"一节 + 首个适用案例）。
- 入口链：`AGENTS.md` 开工最小路径 + `docs/index.md` + `docs/AGENTS.md` + 归位 skill 的 description；再用一个入口门断言宪章被这三处链接——agent 从 doc chain 或 execution chain 都会撞到。
- 宪章草案全文见 [2026-11-10-charter-draft.md](2026-11-10-charter-draft.md)。

## 7. 输掉的方案

- **恢复旧 `system-architect` / `system-qa`**：方法仍在 persona/skill 里，换公司要改包；退役理由没消失。
- **同上下文换帽子**：锚定/自评/共享前提全在，等于没隔离。
- **team 成员**：继承 Lead 组合，没有独立工具面/skill，只有软隔离。
- **workflow 分支**：同人格、无 `agentPreset`，不能出独立裁决。
- **通用 `subagent` + `agent_preset` 白名单**：身份靠模型自选，流程不可靠；命名行才钉得住。
- **新造调度器/状态机**：违反"不发明"；现成的 activation + `send_to_subagent` 够用。
- **工作区另立 method 目录**：方法层已经有了，再造一套 = 第二个事实源。
- **宽泛术语黑名单做主判据**：会漂；只做窄 tripwire，主判据是形状（persona 预算、方法槽）与语义审。

## 8. 开放决定

1. 名字：`producer` / `verifier`（推荐，功能名，不绑 V 模型）还是沿用 `sa` / `sqa`。
2. 验证者的手：v1 只读、无 bash（推荐）；v2 才论"能跑测试但只能检测"。
3. 方法层安装：v1 人工放目录（推荐）；扩 `/cultivation adopt` 到 support profile 是另一张卡。
4. 强制范围：公司政策按风险等级（推荐）；产品类型只给默认建议，不硬绑。
5. 裁决落点：`verdict-r<N>.md`（推荐）还是并进 final。
6. 卡数：**一张卡**。两个能力档是一个不变量（独立上下文 + 外部方法 + 裁决原样）；拆两张会允许"preset 在、流程/审计不在"的半成品，正是旧 SA/SQA 的失败形态。若实施超一个切片，第一片 keyless 绿后再在卡内记分片。

## 9. 产出的卡

- [2026-11-10-content-charter.md](../../settled_issues/2026-11-10-content-charter.md)：宪章正本 + 入口链 + 卡/Note 字段 + 入口门。
- [2026-11-10-producer-verifier-quality-loop.md](../../settled_issues/2026-11-10-producer-verifier-quality-loop.md)：两个能力档 + VP-Eng 两行 + 流程 skill + 方法槽 + 审计探针（一张卡）。

## 10. 证据边界

- 本材料是**设计推演**，不是实现证据；两张卡都还是 `待落地`，代码/文档未动。
- 机制事实来自钉住的 `vendor/dsh` 源码与 `docs/` 合同；行为证据（agent 是否真会读宪章、验证者是否真独立）要等落地后的真模型 E2E，keyless 只能证结构。
- 同模相关性不会因上下文隔离消失；"独立"是流程独立，不是统计独立。
- 没有运行时 veto；审计是事后的、可检测的，不是强制的。
