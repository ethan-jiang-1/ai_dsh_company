---
name: mrd-playbook
description: CMO 的打法：MRD 市场机会（细分/买单人/替代/竞品/买点/规模）→ go/no-go，再到 StRS 涉众需求（REQ-### + traces→MR）；先读共享 product-definition 脊柱与品类 playbook。
---
# MRD playbook（CMO）

先加载 `product-definition`（脊柱 + 品类 playbook），再写 MRD。本 skill 只补市场这一侧的打法。

## 输入

- 动议里给的约束（时间/预算/现有客户/战略意图）。
- `.dsh-company/kb/cmo/CHARTER.md` 与公司事实（`kb/company.md`、`kb/org.md`）。
- 外部证据：优先一手（客户行为、招标/合同、竞品公开材料、行业数据）；二手标来源。
  每条判断标 **【事实】**（有出处）或 **【假设】**（推理，待验证）。

## 步骤

1. **机会信号**：客户抱怨/流失、竞品空白、监管变化、技术拐点、相邻市场复用。
   先写"谁在什么场景下过不好"，不要先写功能。
2. **细分与买单人**：使用者 / 买单人 / 决策链分开；写清"不买的代价"。
3. **替代与竞品**：客户现在怎么凑合（Excel、外包、竞品、不做）；我们凭什么赢。
4. **价值与买点**：一句话价值主张；三个最强买点；最可能被拒绝的理由。
5. **规模**：TAM/SAM/SOM 用可复核的方法（自上而下或自下而上），数字标【假设】+ 依据。
6. **成功判据**：上线后看什么事实（签约数、试点转正、复购、交付周期）。
7. **判断**：`go / no-go / defer` + 一句话理由；未决项单列（谁拍板、缺什么证据）。

## MRD 产出

按 `<company-content>/templates/mrd.md` 写，落 `deliverables/<slug>/drafts/mrd.md`（`layer: MRD`、`definition: json-ledger`）。
- 每个机会一个编号 `MR-###`；标题、细分、买单人、痛点、证据、替代、竞品、价值、规模、成功判据、confidence。
- 一页为限；结论先行；不写功能清单（那是 PRD 的事）。

## StRS 产出（涉众需求）

MR 落定后同一轮出 StRS：按 `<company-content>/templates/strs.md` 写，落 `deliverables/<slug>/drafts/strs.md`
（`layer: StRS`、`definition: headings`）。
- 每条 `### REQ-###` 一个涉众诉求；标题下一行写 `traces: [MR-###]`（缺上游 = 孤儿红）。
- 写「谁在乎、在乎什么、验收时谁点头」；**不写口径与阈值**（那是 PRD/SyRS）、不写定价（归 VP-Sales）。
- `REQ` 是**任一层**的号：StRS/PRD/SyRS 共一条 append-only 序列，号由 owner 登记时取 `max+1`。
- 落盘后跑 `/req check <slug>`（操作员命令）；红就改，别绕过。

## 边界

- 不替 VP-Sales 定价（现有客户/报价/折扣）；不替 VP-Eng 定技术方案；不替 COO 承诺交付。
- 不虚构客户与数字；拿不到证据就写"未核实 + 需要什么才能核实"。
- CMO 与 VP-Sales 的分工：CMO 管**新市场/新产品机会**；VP-Sales 管**现有客户/销售/定价**。
  重叠时先写明"这是新机会还是现有客户扩展"。
- 与 VP-Eng 的交接：MRD 是 PRD 的输入；VP-Eng 主笔 PRD，CMO 只回看 PRD 的市场假设与
  MR id 的追溯是否成立。
