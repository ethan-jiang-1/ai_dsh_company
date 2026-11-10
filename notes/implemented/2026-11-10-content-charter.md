# 内容宪章：四槽归位 + 四条入口链

状态：implemented — 宪章正本 + 归位 skill + 入口门 + 卡/Note 字段，2026-11-10 同 diff 落地
上游 = [内容宪章卡](../../_backlog/_archive/settled_issues/2026-11-10-content-charter.md)；材料 = [研究题](../../_backlog/research/capability-placement-and-quality-loop/README.md)（推演 + 宪章草案）

## 决定

把「这段内容该住哪层」从**人当场判断**变成**默认动作**的四件套：宪章说为什么与秩序，归位 skill 说步骤，
入口门说必须，卡与 Note 字段记这一层为什么。

1. **四槽**：人 / 流程 / 方法 / 政策。架构不是第五槽——架构是这四样的摆放方式。
2. **三层 + 两条正交轴**：通用 / 产品类型 / 公司；机制是引擎，方法是正交轴，不塞进三层里。
3. **判断次序固定**：答四问（换公司 / 换产品类型 / 换做法 / 只有机制变）→ 跑两测（删公司词、删方法词，
   看骨架垮不垮）→ 点名第二消费者 → 按搬家成本定抽象度。
4. **宪法只写判据**：目录清单住 `packages/company-pack/content/README.md` 与 `manifest.json`，门禁清单住
   `checks/gates/` 目录，步骤住 skill——宪章不复述这三者（D28：枚举型事实的家 = 实现自己）。
5. **入口四条**：`AGENTS.md` 开工最小路径、`docs/index.md` 书架、`docs/AGENTS.md` 层表、
   `capability-addition-definition` skill 链回；`charter-entry` 门禁钉这四条在场。

## 输掉的方案

- **只写一份长指南**：会漂，且没有「必须」的形状——没有门禁，宪章只是散文。
- **只加 `docs/policy.md` 一段**：政策层管授权与边界，不管内容归位；两件事混家，政策层会被内容判据撑爆。
- **宽泛术语黑名单**（禁词表）：词表会漂，假阳/假阴都多；主判据应是形状（层级归属、方法槽）与语义审。
- **新建「架构审」角色**：为一个判断加一个身份，过重；P5 语义审一句问就够。
- **只写 skill 不写宪章**：skill 会被跳过，且不承载「为什么」的记忆；下一个人仍会问「为什么不能贴进去」。
- **入口门查「agent 是否读懂四问」**：不可机械判定；门禁只证指针在场，读懂靠真模型冷读证据（见下「冷读」）。
- **为新指针新开行 + 抬 `doc-budget`**：`AGENTS.md` 84/84 顶格、`docs/AGENTS.md` 已贴 5% 底线；改既有表格行与
  入口句做到零增长，优于提额——「先提额再写」是反序。
- **在宪章里列目录清单与门禁清单**：两个第二清单必漂（D28/D34）；宪章只留判据 + 指针。
- **skill 里复述成本表与红牌表**：技能只带步骤与完成判据，判据表指回宪章 §8/§9。

## 归位

- **为什么这层**：宪章是规则与秩序，跟**机制**一起变；换公司、换产品类型、换方法都不动它 ⇒ 通用层/契约层
  （docs 顶层宪法，与 testing / repo-hygiene 同层）。
- **什么会逼它搬家**：只有「四层秩序变了」或「改动成本的判据变了」两种情形；其余修改走 skill（步骤）与
  门禁（判据），宪章 §11 自改协议。
- **排除了哪个更低的层**：只放公司层不够（所有公司共用同一套归位规则）；放方法层错位（宪章不含任何方法）；
  只写 skill 不够（skill 会被跳过，且不承载「为什么」）。

## 后果

- 入口链多一条「新增/搬内容」分支；skill catalog 多一项 `capability-addition-definition`；卡模板多一节
  `## 抽象度`；Note 多一条「归位」义务。
- 多一道门禁 `charter-entry`（每次 `pnpm verify` 跑一次，纯读盘，零成本）。
- 未做：`## 抽象度` 的机械强制仍是 v1「模板 + 语义审」——两个真实案例都没填才升格为门；产品类型层的
  第二消费者目前只有两家 fixture。决策台账未加 D 号（同类前一轮 DSH 对齐轮同款；[台账](../../docs/reference/decisions.md)
  已在 65/65 顶格，加行须先搬/压——路由已由 `docs/index.md` 书架给出）。

## 验证

2026-11-10 实跑原话：

- `pnpm verify` → `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）`；
  新门 PASS 行 = `charter-entry（宪章在场 + 四处入口：文档链 3 + 归位 skill 1）`。首跑红在 `script-index`
  （生成库存未随新门更新），`node tools/checks-index.mjs --write` 后绿。
- `pnpm test` → `Test Files 167 passed (167)` / `Tests 1347 passed (1347)`。
- **造红（逐条破坏真东西 → 红 → 还原 → 绿）**：
  - 删 `AGENTS.md` 的宪章链接 → `FAIL charter-entry: AGENTS.md 未以 Markdown 链接指向 content-charter.md（开工最小路径；纯文本提及不算入口）`
  - 删归位 skill 的链回 → `FAIL charter-entry: .agents/skills/capability-addition-definition/SKILL.md 未以 Markdown 链接指向 content-charter.md（归位 skill；纯文本提及不算入口）`
  - `mv` 走宪章本体 → `FAIL charter-entry: docs/content-charter.md 不在盘上——内容宪章是归位规则的唯一家（文件不许消失：内容该搬就搬，壳留着）`
  - 删 `docs/index.md` 书架链接 → `FAIL charter-entry: docs/index.md 未以 Markdown 链接指向 content-charter.md（书架；纯文本提及不算入口）`
  - `mv` 走 `docs/AGENTS.md` → `FAIL charter-entry: docs/AGENTS.md 缺失（层表：入口面不许消失）`

  五条逐条还原后重跑 = PASS（同一行输出见上）。

## 验证·冷读（真模型，不进回归）

- **样本**：fresh subagent（会话 `c94b6027-8e2e-47a9-9bc6-58cb79f05ac2`，独立上下文，无本变更背景）。
  题 = 「给公司加一个新能力：CFO 在每轮动议收工时自动产出现金流预警简报，阈值和升级线由公司政策决定」。
- **撞到入口链（自报阅读顺序，原文节选）**：`AGENTS.md` → `docs/index.md` → `docs/policy.md` →
  `docs/contracts/presets.md` → **`docs/content-charter.md`** → `packages/company-pack/content/README.md` … →
  **`.agents/skills/capability-addition-definition/SKILL.md`**。
  后一条同时证明 skill catalog 在新会话里已收录该 skill（catalog 于会话首个 pre-step 装载）。
- **答出四问（原文节选）**：
  - 四槽：把四块内容分进政策、流程、方法、模板——「阈值、升级线、谁签字 → `content/company/policy-lines.md`」，
    依据 = 「内容宪章 §2 把『什么条件下强制、阈值、升级线、谁签字』明确归**政策槽**」。
  - 换方法：方法落 `<DSH_HOME>/company/methods/cfo/<slug>/SKILL.md`，「宪章 §4 要求『方法不进 persona、必须是外部可替换的输入』」。
  - 第二消费者：「声称『通用方法』时，目前只有这一家公司……说不出来就该放公司层/方法层，而不是通用 pack 层」。
  - 红牌：「模板/技能里能写数字吗？不能。宪章 §9 红牌」。机制层：「『自动』的机制 = `session/event` + host 代码，
    **v1 不建议**」——即只有机制变才进通用层。
- **样本的边界**：它读了宪章**之后**仍按宪章提问，故这是「撞得到 + 用得上」的证据，不是「宪章改变了行为」的对照实验；
  单样本，第二个案例待 producer/verifier 卡落地时补。
