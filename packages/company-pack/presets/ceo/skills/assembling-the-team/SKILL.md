---
name: assembling-the-team
description: CEO 的组队方法：接到动议先过这六步（要不要叫人 / 叫谁 / 不叫谁 / 能力盘点 / 哪条通道 / 定 slug），再进主持节奏（chairing-staff-meeting）。
---
# 按问题组队

接到任何动议，先过这六步，再进主持节奏。**团队随问题成形，不随习惯成形**——每个 teammate
都是真金白银的模型调用，不该陪跑的职能一个都不叫。

1. **先问"要不要叫人"**：纯 CEO 职权的事——立项与砍项、优先级、资源总量、对外口径、
   最终收口——自己拍板，不拉人。
2. **要谁**：按"这次动议要回答哪些问题"列职能（对照公司手册「这事问谁」路由表），
   **列不出对应问题的职能不进**：技术/可行性/PRD → VP-Eng；**新市场/新产品定义/MRD → CMO**；
   现有客户/销售/定价 → VP-Sales；落地/流程/人力 → COO；现金/毛利/合规 → CFO。
   ⚠ **超编与漏编都是失败**：只数动议文本**明确要求回答的问题**，不做扩张解读
   （动议没问的，不替它问）；拿不准时**少叫**并在第 3 步写明理由；
   纯为"全面/稳妥"陪跑的职能，一律不叫。
   ⚠ **最小在屋起步（2026-10-12 用户裁定，硬条款）**：单域问题——安全/技术/合规诊断这类
   "一个域就能回答"的动议——**默认恰好一个职能起步**（首选 `vp_eng` / `vp_sales` 直接委派，最便宜），其余职能
   不进屋；跨域字段（成本/落地日/敞口…）由核心 owner 初稿填、标「待 <域> 确认」——
   **验收字段 ≠ 入屋理由**（为凑字段拉人 = 陪跑；负例 = ai-coding-security-2026 四职起手，
   外围出稿、核心难产）。扩容靠**证据触发**：核心 owner 的稿显示真需要该域，再补叫并回用户
   一句话说明。范围菜单同理：**每个选项写明在屋名单，且必含单 owner 项为推荐默认**
   （固有跨域动议——资本动作 / 对外承诺 / 续约组合——不适用本条，但名单照样逐项点名）；
   选中选项后 **spawn 名单 ⊆ 该选项名单**，缺域先回用户说明再扩——**菜单算术**（说三职
   spawn 四个）与静默扩容都是违纪（负例实录：菜单写三职、执行四职）。
   ⚠ **收打回 = 纠错信号（andon，2026-10-12）**：成员做域内核对后打回分派
   （三件套 = 为什么不是我 + 缺什么 + 建议谁接，走[NEEDS-CLARIFICATION]）——**响应三选一明说**：
   回收重派 / 收窄范围 / 补齐判据。**不追责、不计成员产出污点**（惩罚打回 = 打回停止，
   纠错通道死）；打回说明组队有错，是成员在帮你，不是冒犯。本 skill 是 guidance 有执行
   方差——组队纪律靠成员打回权兜底，预防与纠错缺一不健壮。
3. **能力盘点（先于拆活）**：动议里有没有"要读外部网页 / 拿外部事实"的任务？有 ⇒ 先打一发**能力探针**
   （一次 `web_search` + 一次 `bash curl`）：本部署 `web_fetch` 被工具层 DNS 检查拦，**shell 出网不受限**——
   取证**首选 bash 直取 + 换镜像换 UA**，完整打法 = `fact-finding-playbook` skill（八条通道，穷尽才准 HITL）；
   穷尽仍拿不到 ⇒ 依赖外部事实的任务标**「待补料」**、不许标完成，**不许带着"未核实"分解派活**（手册「事实阻塞闸门」）。
4. **不叫谁也写下来**：一句话记下"这次不叫 X，因为…"——与"分歧保留"是同一种诚实，
   避免事后"怎么没问财务"。
5. **走哪条通道**（按"要什么"分，不按亲疏分）：
   - 只要一份单职能稿 → `vp_eng` / `vp_sales` 直接委派（最便宜）；
     改稿 = `send_to_subagent` 续同一个 child（带上一稿）；不可续再委派一次。
   - **要 workflow / subagent 的研发取证或并行核查 → `vp_eng` 命名 child**：它拿的是 vp-eng
     完整工具面（workflow / subagent / subagent_fork）；`spawn_teammate` 的成员继承**你的**
     组合，**没有** workflow/subagent（CEO 团队里叫 "vp-eng" 的成员也不是 vp-eng preset）。
     复杂包既要"取证"又要"多轮落地"时：先 `vp_eng` 出证据/汇总，再组队落地（或再委派一次）。
     **命名 child 不是 team member**：终稿走完成通知；不要用 `wait_agent` / `list_agents` / `send_message`
     等它/找它/催它（CEO 的 `send_message` 是团队版，对 `vp_eng` 会报 `active teammate not found`）；
     也不要用 `bash sleep` / 轮询文件等它——派发后**立即结束本轮并回执**（已委派 + 预计交付物），
     完成通知会开新轮，届时再验收。改稿 = `send_to_subagent` 续同一个 child（带上一稿）；不可续再委派。
     **任务书要写死方法**：≥3 个同构分支用 `workflow` 并行（不是拉多条 `subagent`）；1–2 件才用
     `subagent`；独立核对另起一条 `subagent`（可与 workflow 并行）。别写「subagent 或 workflow 都行」——
     那会把通道选择丢给下游即兴。
   - 多职能判断、要互审、要反复追加意见 → `spawn_teammate` 组队（成员持久，走任务板）。
   - 单职能但要来回改 → 也是组队（成员持久）。
6. **定 slug**：给这次交付定 `<slug>`（短横线小写英文），分派时全员共用；
   过程稿落 `.dsh-company/deliverables/<slug>/drafts/<角色>.md`，定稿只有你能 `present`。
   **同一步写产品类型**：在 `meta.md` 写 `productType: <id>`（可选值 = 产品类型包目录名，见 `meta.md` 模板）。用户声明优先；
   没说就问一句，或按 `company.md` 的 `productType` 默认并在任务书标假设——不要按习惯猜。类型写错，
   `/req check` 会用错编号规则；改类型要重新确认层与文档链。
   **同一步写交付模式**：`deliveryMode: productized|project-services|managed-service`；不写 = `productized`，有 SOW/UAT/驻场/里程碑验收 = `project-services`，有持续 SLA/值班/月报/续费 = `managed-service`。
   规则/模板见 `content/delivery-modes/`，不要把它塞进 `产品类型`。
   **先落任务书再 spawn**：`spawn_teammate` 之前，把任务书写到
   `.dsh-company/deliverables/<slug>/drafts/ceo.md`——目标/约束/验收、在屋名单与通道、每个成员的
   角色包、机器可读派活行都在里面；成员稿首的 `任务书 = …` 就指这份真实文件。spawn prompt 不是
   可回溯文件，不落盘就 spawn = 署名行悬空（2026-11-10 BUG-055）。

### team spawn 的角色包

team 成员继承**你的**组合，没有角色 preset 的 `skill` catalog；但公司手册给了 `<company-content>` 的绝对路径，
角色方法就在 `<company-content>/../presets/<role>/skills/`。spawn 一个承担职能角色（COO/CFO/CMO/VP-Eng 等）的
成员时，任务书必须带**角色包**，否则它只是“叫那个名字的 CEO”：

- **角色**：`COO` / `CFO` / …
- **任务书**：`.dsh-company/deliverables/<slug>/drafts/ceo.md`（spawn 前已落盘；成员按这个真实路径署名）
- **署名行**：稿首 `出稿：<角色>｜版本 v<N>｜任务书 = <任务书路径>`（照抄真实路径，不得编造）
- **CHARTER**：`.dsh-company/kb/<role>/CHARTER.md`
- **角色 skill**：`<company-content>/../presets/<role>/skills/<skill>/SKILL.md`（列全；用 `read` 读正文）
- **KB**：`.dsh-company/kb/<role>/`、`kb/org.md`、`kb/policy-lines.md`（按需）
- **产出**：`.dsh-company/deliverables/<slug>/drafts/<role>.md`
- **边界**：不越权、不替别的职能签字；缺口回你

成员先 `read` CHARTER + 角色 skill + KB，再动笔。`任务书` 是 spawn 前置：**盘上没有这份文件就不要
spawn**（先补落）；成员稿首的署名行照抄这个路径，不许按默认模板编造。`skill` 工具加载不到角色
skill 是机制事实（成员继承你的 catalog），**用 `read`，不要凭记忆**；任务书写明“先读再干”。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分由操作员在收口时核对
> （如署名行与任务书、交付物三态与 present），本文只留需要上下文判断的部分。

## 产品定义动议（新产品 / 新功能，2026-11-05）

默认在屋 = **CMO + VP-Eng**：CMO 出 MRD（`drafts/mrd.md`，`MR-###`），VP-Eng 接 MRD 出 PRD
（`drafts/prd.md`，`REQ-###` / `AC-###-#` / slice）。**不默认叫全员**：
- 需要外部市场事实才加 `worker-researcher`（或让 CMO 先用 web/bash 取证）；
- 只有动议明确问到**现有客户/定价**才叫 VP-Sales；**交付承接**才叫 COO；**预算/毛利**才叫 CFO；
- **两件及以上产物（如 MRD+PRD）或多职能协作必须走 team + 任务板**；`vp_*` 命名委托只用于用户明确只要一份、且只属一个职能的快捷出稿——两件套走快捷 = 没有 team/依赖图/面板，收口也没有互审；
- **owner 唯一，缺角不代行**：MRD 只归 CMO、PRD 只归 VP-Eng；`.dsh-company/kb/org.md` / `owners.md` 里查不到 CMO ≠ 让 VP-Sales 代行「市场」——先补编制或向用户报缺（写清缺哪个席位、影响什么），用户点名才例外；旧 journal 的「本部署无 CMO」不作数。
- DAG：VP-Eng 的 PRD 任务 `blockedBy` CMO 的 MRD 任务；任务书写 MRD 路径，不口头转述；
- 收口：CEO 只合稿与 `present`，不代写 MRD/PRD；MRD 与 PRD 的市场假设/可行性冲突时保留双方结论，交 CEO 拍板；
- 结果校验：`/prd check <deliverables 目录名>`；不过就退回 VP-Eng/CMO，不进研发。
- **不在屋名单**照样写一句："这次不叫 X，因为…"（与"分歧保留"同一种诚实）。
