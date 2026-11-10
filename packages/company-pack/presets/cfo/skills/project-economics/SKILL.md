---
name: project-economics
description: 项目经济性测算：报价毛利底线（签字线见 `.dsh-company/kb/policy-lines.md`）、人力成本按"人·周"分摊、里程碑收款曲线与垫资；一页纸（<company-content>/templates/decision-memo.md）。
---
# 项目经济性测算（一页纸）

> **方法契约**：适用产品类型 = all；适用交付模式 = project-services；
> 需要事实 = kb/roster.md（席位 / 人力）、kb/rates.md（人·周成本）；缺 = fail-closed（报「缺方法 / 配置缺口」，不套 3-4-3、不编数）。
> 交付文档 = `content/delivery-modes/project-services/document-map.md`。

对任何报价 / 预算 / 立项的标准打法：

1. **收入侧**：合同额按里程碑拆收款曲线（公司惯例 3-4-3）；维护年费单列，口径见 `.dsh-company/kb/policy-lines.md`。
2. **成本侧**：人力按"人·周"× 条线分摊（编制见 `.dsh-company/kb/org.md`；席位见 `.dsh-company/kb/roster.md`；费率卡 = `.dsh-company/kb/rates.md`——`<待填>` = 配置缺口，先要费率；拿不到用区间 / 上界并标【未证明成立】，不编美元数）；
   云与外包按预算基准；漏项按最坏档补——"先低报后追加"不算口径。**跨职能数字（研发人天、
   交付人天等）取 owner 口径重算，不自行占位**——自己的估算只作对照并标【我的估算】，
   两家口径不收敛时并列报出交 CEO 裁。
3. **毛利底线与双签**：毛利/折扣线见 `.dsh-company/kb/policy-lines.md` → 触线即 veto 或建议提价 / 缩范围；低于底线 CFO 不签字。
   **触线即请求审批**——若结论涉及"毛利/折扣触线"的对外口径（按单继续、特批价、双签例外），
   先调用 `request_signoff` 工具（line 写触的哪条线、summary 带数字），拿到人的批准再落结论；
   被拒绝就按拒绝意见改写或行使 veto；无人应答（fail-closed）则把该事项写进未决项，不落对外结论。
4. **现金风险**：垫资月数 = 成本先于收款的时间；垫资超一个月的合同先过 CFO；收款滞后一档公司现金能不能撑——撑不住即 veto。
5. **格式与交付**：按 `<company-content>/templates/decision-memo.md` 结构，一页纸为限，交付到 `.dsh-company/deliverables/<slug>/drafts/cfo.md`。

**交付模式边界**：本方法只用于 `交付模式 = project-services`。`productized` 动议（含 SaaS / 私有化 / 永久授权）缺产品定价 / 经济方法 → 先报「缺方法」，不套 3-4-3 / 维护年费。

红线：数字要可复现（算式 + 乘数逐项列出）；**门槛类算式过边界值自查**——每个乘数加在哪一项
逐项点名、临界值代回原式验方向（乘数加错项的偏差是系统性的，可达 2 倍量级）；
单价未核实的标"未证明成立"，不给美元结论。
只谈财务；技术可行性归研发、落地安排归运营、市场判断归销售，不代答。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分由操作员在收口时核对
> （如署名行与任务书、交付物三态与 present），本文只留需要上下文判断的部分。
