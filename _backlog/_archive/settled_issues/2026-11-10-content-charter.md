---
status: 已结
opened: 2026-11-10
---

# 落地：内容宪章——按寿命分层，按成本抽象

> 立卡：2026-11-10 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：用户 — 2026-11-10 授权「commit 后若无问题即归档」；偏离项（skill 以指回宪章 §8/§9 代替复述成本表/红牌表）已报备，未获异议
>
> **结论/去向**：note — 已落 [content-charter Note](../../../notes/implemented/2026-11-10-content-charter.md)（2026-11-10 同变更）
>
> **基座同步（2026-11-10）**：`docs-dsh-alignment` 五步已落地（`69706354`…`abb02d1e` + 收尾）：
> 原 docs 的 design 层（已移除）已并回 `notes/`；`docs/index.md` 改为 **tier 书架**（树即 inventory，顶层门/宪法才逐项列出）；
> 新增 [docs/architecture.md](../../../docs/architecture.md)；培养回路/方法层改由
> [docs/contracts/cultivation.md](../../../docs/contracts/cultivation.md) 承载；`doc-budget` 加 **≥5% headroom**
> （内容 ≤ 95% 上限）。本卡下面的入口/路径/预算已按此更新；实施前先 `git log --oneline -8` 确认基座未再变，
> 变了就先把差异折回本卡，不带着旧基座动工。

**问题与期望结果：** 三层内容结构（通用/产品类型/公司 + 方法层）已经想清楚，但下一个 agent 未必读到；只写一份宪章仍是散文，挡不住"匆匆忙忙把具体东西贴进骨架"。本轮要落的是**宪章 + 让 agent 撞得到的入口**：doc chain（`AGENTS.md` / `docs/index.md` / `docs/AGENTS.md`）与 execution chain（归位 skill / 入口门 / 卡与 Note 字段）至少各有一条硬路径；新 agent 被要求"加一个新能力"时，先答四问，再动文件。

## 背景：不在本上下文也能读

**这家公司是什么。** 梦之队是跑在 DSH 里的虚拟公司：六个角色 preset（CEO / VP-Eng / VP-Sales / COO / CFO / CMO）+ 一组只读内容（手册、章程、模板、默认状态）。它要能被定制成不同公司、不同产品类型，所以"这家公司是什么"和"这类活怎么做"不能写进代码。

**历史上为"别写死"做过什么（按时间线）：**

| 时间 | 做了什么 | 结果 / 教训 |
|---|---|---|
| 2026-09/10 | 公司事实留 workspace（D17：pack 不含公司事实）；2026-10-13 加角色方法层 + 培养回路——`<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`，人采纳、热生效、pack 升级不擦 | 方法可以外置，但当时只服务六个角色，且没有"什么该放哪层"的统一规则 |
| 2026-11-05 | 新增 CMO：9 个提交、97 个文件、五轮矩阵扫描才收干净 | "加一个角色"很贵；催生 role-addition 的 16 面清单 |
| 2026-11-06 | SA/SQA 两个委派子人格：E/V 分家、独立上下文、SQA veto 直达 CEO | 结构对；但方法（V 模型、TC 编号、五学科）被写进了 persona/skill |
| 2026-11-07/08 | 需求链（SyRS/IRS、`TC-###`、V&V 的 L1–L4）与学科域路由（先判五学科、任务书声明、SQA 逐行域审计） | 方法越写越具体，也越绑"系统工程/硬软一体"这个产品类型；换公司要改包 |
| 2026-11-09 | 先升 `specialist`，当天退役 SA/SQA；同一天做通用/产品类型/公司三层分离（T0/T1/T2、`manifest.json`、双公司 fixture） | 退役理由 = 方法写死在身份层；三层解决了**内容**归位，但没解决**能力/方法/政策**归位 |
| 2026-11-10 | 本次推演：四槽（人/流程/方法/政策）+ 宪章 | 把"能力"和"方法"分开；宪章负责让下一次不再犯 |

**"抽象"在这里到底指什么。** 不是"写得更通用、更漂亮"，而是**让内容跟它真正会一起变的东西住一层**：换公司会变的（政策、阈值、公司事实）→ 公司层；换产品类型会变的（需求链、模板、领域词）→ 产品类型层；换做法会变的（方法、检查表、判据）→ 方法层；换公司/产品类型/方法都不变的（身份、工具面、流程契约）→ 通用层。判断标准是**寿命 / 改动成本**，不是审美。历史上几次踩坑的共性：把"方法"或"公司事实"放进了高成本层（preset/代码），于是换公司 = 改包。

**为什么这次要宪章，而不是再来一次"这次注意点"。** 前几次调整都是人当场判断，没有留下"以后怎么判断"的规则；下一次 agent 仍会从手上的文件开始改。宪章 + 归位 skill + 入口门 + 卡/Note 字段，是把这次判断变成默认动作。更细的过程与证据见研究题 [README](../research/capability-placement-and-quality-loop/README.md) 与 [推演材料](../research/capability-placement-and-quality-loop/2026-11-10-deliberation.md)。

**术语。** 三层 = 通用 / 产品类型 / 公司（+ 机制引擎、方法正交轴）；四槽 = 人 / 流程 / 方法 / 政策；方法层 = `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`；归位 = 先答"换什么会改它"，再决定住哪层；宪章 = 归位与抽象层次的规则家，skill = 步骤，门禁 = 必须，卡/Note = 记录。

## 当前情况（事实与依据）

- 三层内容模型、方法层、独立性口径都已现行：内容分层见 [2026-11-09-generic-specific-separation.md](../../../notes/implemented/2026-11-09-generic-specific-separation.md)；方法层见 [cultivation.md](../../../docs/contracts/cultivation.md)；复核独立性见 [review-protocol.md](../../../packages/company-pack/content/company/review-protocol.md)。
- 旧 SA/SQA 的教训：E/V 分家的结构对，但方法写进 persona/skill，换公司要改包，2026-11-09 退役。历史见 [原问题卡](./2026-11-06-system-architect-sqa.md) 与 [退役 Note](../../../notes/implemented/2026-11-09-retire-sa-sqa.md)。
- 本轮全过程与宪章草案见研究题：[README](../research/capability-placement-and-quality-loop/README.md)、[推演材料](../research/capability-placement-and-quality-loop/2026-11-10-deliberation.md)、[宪章草案](../research/capability-placement-and-quality-loop/2026-11-10-charter-draft.md)。
- 用户 2026-11-10 约束：本轮只改 `_backlog/`，落地时才动仓库其他部分。

**未决问题：**

1. 入口链放几处？推荐三处文档硬链（`AGENTS.md` 开工最小路径、`docs/index.md` 的 **tier 书架**登记、`docs/AGENTS.md` 层规范）+ 归位 skill 的 description；入口门断言四处指针都在。
2. 卡里的 `## 抽象度` 要不要机械强制？v1 推荐模板 + 语义审；等它真被跳过再加门（不先造宽泛术语黑名单）。
3. 入口门查什么？推荐只查"宪章被四处链接（AGENTS / index 书架 / docs/AGENTS 层表 / skill）+ skill 在场并链回宪章"；不查 agent 是否读懂（那是真模型冷读的证据，不是门禁的活）。
4. 冷读怎么算证据？给 fresh agent 一句"给公司加一个新能力"，看它是否从入口链撞到宪章并答出四问；会话 id + 原文摘录进落地 Note，不进 CI。
5. 宪章落地本身要不要 Note？要——它是非平凡决定，按 `agent-note-definition` 落，且与宪章同 diff。

**下一步：** 无——2026-11-10 已结归档（用户授权「commit 后若无问题即归档」）。第二张卡（producer/verifier）是宪章 `## 抽象度` 的首个适用案例。

## 交付证据（2026-11-10）

- 落点与理由、造红原文、冷读会话 id 与摘录 = [落地 Note](../../../notes/implemented/2026-11-10-content-charter.md)（本卡不复制证据）。
- 机械面：`pnpm verify` ALL PASS（含新门 `charter-entry` PASS 行）、`pnpm test` 167 files / 1347 tests 绿。
- 遗留：`## 抽象度` 的机械强制仍为 v1「模板 + 语义审」；第二消费者证据待第二张卡。

## 范围与排除项

- 范围：宪章正本（`content-charter.md`，落 `docs/` **顶层门/宪法层**，与 testing/repo-hygiene 同层；`docs/AGENTS.md` 层表加行）；`docs/index.md` 书架 / `AGENTS.md` / `docs/AGENTS.md` / 归位 skill 四处指针；归位 skill（`capability-addition-definition/SKILL.md`，落 `.agents/skills/`）；入口门（`charter-entry.mjs`，落 `checks/gates/`）；`_backlog/issues/README.md` 的写卡模板加 `## 抽象度`；`notes/README.md` 或 `agent-note-definition` 加"归位"节；`docs/policy.md` P5 加一句语义审问；`DOC_LINE_BUDGETS` 为宪章加预算（内容 ≤ 95% 上限）。
- 排除：SA/SQA 的具体实现（第二张卡）；三层模型本身；`presets/` 内容；`vendor/`；新建角色/调度器/第二套文档体系；宽泛术语黑名单。

## 已知与未决

- **预算压力**：`AGENTS.md`、`docs/index.md`、`docs/AGENTS.md`、`docs/policy.md` 都有行预算，且 `doc-budget` 已加 **≥5% headroom**（内容 ≤ 95% 上限，docs/ 适用；`reference/` 豁免）；加入口行前先看 `doc-budget`，超限/不足 5% 先搬再压，不直接抬上限（抬上限要 Note 论证）。
- **入口门是代理**：它证明"链接在场"，不证明"agent 读了/懂了"；后者靠冷读证据，别把门禁当行为证明。
- **`## 抽象度` 的强制力**：v1 是模板 + 语义审，不是机械门；若两个真实案例都没填，再升级为门。
- **单例例外**：宪章允许"只有一个消费者但高成本缝"登记例外；本卡不把例外做成阻断。
- **宪章自己的修改**：只在"四层秩序变了"或"成本判据变了"时改；改宪章要卡 + 语义审 + 同 diff 指针。

## 方案与取舍

- **宪章 + skill + 门禁 + 卡/Note 四件套**：宪章说"为什么/秩序"，skill 说"怎么做"，门禁说"必须"，卡/Note 记"为什么这层"。四者互相指针，不互相复述。
- **doc chain + execution chain 双入口**：只放 docs 会被跳读；只放 skill 会被"没触发"漏掉；两条都放，再用入口门钉住链接。
- **输掉的方案**：
  - 只写一份长指南：会漂，且没有"必须"的形状。
  - 只加 `docs/policy.md` 一段：政策层管授权与边界，不管内容归位；会把两件事混家。
  - 宽泛术语黑名单：词表会漂，假阳/假阴都多；主判据应是形状（persona 预算、方法槽）与语义审。
  - 新建"架构审"角色：为一个判断加一个身份，过重；语义审一句问就够。
  - 只写 skill 不写宪章：skill 会被跳过，且没有"为什么"的记忆；下一个人仍会问"为什么不能贴进去"。

## 关闭条件

验收标准全绿 + 落地 Note 落盘 + 用户验收；卡顶补 `结论/去向` 与 `审查：` 后归档。

## 验收标准

1. **宪章正本**：新增 `content-charter.md`（落 `docs/` **顶层门/宪法层**，与 testing/repo-hygiene 同层），含四槽、三层、三条铁律、四问、两测、两消费者、成本表、红牌、变更协议、宪章自改、指针；`docs/index.md`（书架）/ `AGENTS.md` / `docs/AGENTS.md`（层表）/ 归位 skill 四处同 diff 指针；`DOC_LINE_BUDGETS` 给预算（内容 ≤ 95%，留 ≥5% headroom；超限/不足先搬后加）。
2. **归位 skill**：新增 `capability-addition-definition/SKILL.md`（落 `.agents/skills/`），含四问、两测、两消费者、成本表、红牌、SA/SQA 归位样例，并链回宪章；description 在"新增角色/能力/方法/模板"时触发；skill catalog 可见。
3. **入口门**：新增 `charter-entry.mjs`（落 `checks/gates/`），断言宪章被 `AGENTS.md`、`docs/index.md`（书架）、`docs/AGENTS.md`（层表）、归位 skill 四处链接；红证 = 删 `AGENTS.md` 链接 → 红，还原 → 绿；按 `gate-change-definition` 记红证据。
4. **卡/Note 字段**：`_backlog/issues/README.md` 的写卡模板加 `## 抽象度`（四问 + 第二消费者/例外 + 搬家成本）；`notes/README.md` 或 `agent-note-definition` 加"归位"节（为什么这层 / 什么会逼它搬家 / 哪个更低的层被排除）；`docs/policy.md` P5 加"换公司/产品类型/方法要改吗"一句。
5. **新 agent 冷读**：fresh agent 接到"给公司加一个新能力"的题，能从入口链撞到宪章并答出四问；证据 = 会话 id + 原文摘录写进落地 Note（真模型，不进回归）。
6. **机械**：`pnpm verify` ALL PASS；相关 `pnpm test` spec 绿（若加 spec）；本次不因 doc-budget 超限；无 `vendor/` 改动。
7. **不改**：三层模型本身、`presets/` 内容、SA/SQA 实现（归第二张卡）。

## 抽象度

- 换公司要改吗？不——宪章、skill、入口门是通用层。
- 换产品类型要改吗？不。
- 换方法要改吗？不——宪章只引用方法槽，不含方法。
- 只有机制变才改吗？是——宪章是通用层/契约层。
- 第二消费者：第二家公司与第二个产品类型共用同一宪章；本轮以 SA/SQA 作首个适用案例，下一次内容新增作第二案例。
- 搬家成本：高（入口链、门禁、卡模板都是高成本缝）⇒ 第一天就抽象。
- 排除了更低的层：只放公司层不够（所有公司共用的归位规则）；只写 skill 不够（skill 会被跳过，宪章是"为什么"）。
