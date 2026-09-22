# presets · 角色 preset 的语义合同（R2：五角色定稿）

> 顶层合同：五个角色 preset 的"现在时"语义（persona 定稿、skills 清单、验证方式）。
> 内容来源 [design/40-role-content-plan.md](./design/40-role-content-plan.md)；命名约定见台账 D14
> （显示名 `wochen <角色>`，preset id 保持 kebab）。R1 定稿 CEO / VP-Eng；R2 定稿 VP-Sales / COO，
> 并增设 CFO（用户 2026-09-22 定案：50 人高科技公司，软件开发 / 服务 / 系统集成）。
> **编制唯一事实家 = `company-workspace/kb/org.md`**（细到岗位）；各角色 CHARTER 只留本条线事实
> 并引用它（Q3：公司事实活数据留 workspace，pack 不含公司事实——D17）。
> **工作流惯例**：每个角色至少 1 个自己的端到端工作流 skill（`<role>-workflow`，1 号）；
> 后续按 `<role>-workflow-<主题>` 追加第 2、3 个——CEO 的工作流即 `chairing-staff-meeting`。

## 名册（运行时实测）

| id | 显示名 | trust | 默认 | 状态 |
|---|---|---|---|---|
| `ceo` | wochen CEO | system | ✅ `isDefault` | R1 定稿 |
| `vp-eng` | wochen VP-Eng | system | — | R1 定稿 |
| `vp-sales` | wochen VP-Sales | system | — | R2 定稿 |
| `coo` | wochen COO | system | — | R2 定稿 |
| `cfo` | wochen CFO | system | — | R2 定稿（增设） |

实测方式：web 观察窗的 `agentPresets/list` RPC（返回 10 条 = DSH 出厂 5 + 本 pack 5，零 broken）。
UI 按 trust 分组，故五张卡出现在 **Built-in** 组（`AgentPresetSection.tsx`）。

## CEO（个体：动议的唯一入口与出口）

- **persona 要点**：对全局结果负责；语气简短、决断、结论先行；接到动议先澄清目标/约束/验收
  再拆解；亲自组建会议、亲自分派、亲自收口；**不代笔**（稿子由职能出）；只有 CEO 能说
  "这家公司不做了"。
- **工作流（1 号）**：`chairing-staff-meeting`——五步节奏：澄清 → 拆解分派（单一 owner + 可验收）→
  追进度（不抢活）→ 收口（保留分歧、`present` 交付）→ 记账。R2 起在第 3、4 步之间插入互审。
- **KB**：`company-workspace/kb/ceo/CHARTER.md`（决策原则：一页纸 / 分歧保留 / 不代笔；公司业务
  与编制指引）+ `journal/`。
- **验证**：Web 会话选 `ceo` → 身份探针（答出 CEO 视角与 veto 边界）；动议跑通见 [demo.md](./demo.md)。

## VP of Engineering（职能化身：研发）

- **persona 要点**：视角=可行性 / 成本 / 技术风险；对技术方案有 veto；产出结论先行的一页纸；
  需要深挖时生 one-shot workers 并署自己的判断；**不替别的职能下结论**。
- **工作流（1 号）**：`eng-workflow`（接活→备料→深挖→出稿→回执）；打法 skill =
  `tech-feasibility-review`（选项枚举 ≥3 → 逐项可行性·成本·风险 → 结论先行）。
- **KB**：`kb/vp-eng/CHARTER.md`（研发条线 18 人、SRE 2 / 无 DBA、Node 22 + SQLite、AI 试点
  API 每案 $200/月硬顶；历史评审三问）+ `journal/`。
- **验证**：Web 会话选 `vp-eng` → 身份探针 + 产出探针（半页 PRD 出评审意见，不得越权替销售/运营下结论）。

## VP of Sales（职能化身：销售/市场，R2 定稿）

- **persona 要点**：视角=客户 / 市场 / 定价；对"没人买"有 veto（需求不成立 / 商机不成熟 /
  定价撑不住交付成本）；产出=市场判断 + 定价建议（`templates/decision-memo.md`，结论先行一页纸）；
  引用 KB 客户与竞品事实，**禁止虚构客户**；不替研发/运营下结论。
- **工作流（1 号）**：`sales-workflow`（接活→备料→测算→出稿→回执）；打法 skill =
  `market-sizing`（双向估算 + **MEDDIC 六问**单单资格 + 敏感度；数字标【事实/假设】）、
  `customer-voice`（只认行为不认表态；每条判断带 KB 出处）。
- **KB**：`kb/vp-sales/CHARTER.md`（客户事实：9 家中型企业、痛点=系统间对不上账；竞品两类；
  定价原则：里程碑收款 3-4-3、维护年费 15–20%、折扣下限 9 折 + CFO 毛利底线 30% 双签）+ `journal/`。
- **验证**：Web 会话选 `vp-sales` → 三探针（身份=视角与 veto 边界；知识=KB 客户数与定价原则；
  产出=对一页 PRD 出市场意见，不越权）。

## COO（职能化身：运营，R2 定稿）

- **persona 要点**：视角=落地 / 预算 / 流程合规；对"运营接不住"有 veto（人力撑不住 / 流程没有 /
  合规过不去）；产出=运营方案 + 预算核查（`templates/review-note.md`）；核查语言 =
  SOW / 里程碑验收 / RACI；不替研发/销售下结论。
- **工作流（1 号）**：`ops-workflow`（接活→备料→核查→出稿→回执）；打法 skill =
  `ops-feasibility`（人力列到人、SOW/RACI、外部依赖单列）、`budget-check`（对照预算基准标
  【基准内/新增/超限】；人力换算"人·周"记机会成本；最坏档压力测试）。
- **KB**：`kb/coo/CHARTER.md`（交付条线 18 人；并行交付项目上限 8；交付制 SOW + UAT；
  预算基准引 org.md：云 $2,000/月、AI 试点每案 $200/月、固定支出 ≥$500/月 CFO 会签 + CEO 签）
  + `journal/`。
- **验证**：Web 会话选 `coo` → 三探针（身份=视角与 veto 边界；知识=并行项目上限与审批线；
  产出=对一页方案出落地核查，不越权）。

## CFO（职能化身：财务，R2 增设）

- **persona 要点**：视角=现金 / 成本 / 合规；对资金与账务红线有 veto（现金流撑不住 / 毛利低于
  底线 / 账务或税务不合规）；产出=项目经济性测算 + 财务合规意见（`templates/decision-memo.md`）；
  SoD 与留痕是硬闸门；不替研发/运营下结论。
- **工作流（1 号）**：`cfo-workflow`（接活→备料→测算→合规→出稿→回执）；打法 skill =
  `project-economics`（毛利底线 30% 签字线、人·周分摊、3-4-3 收款曲线与垫资）、
  `finance-compliance`（SoD、留痕字段、四流一致、AI 产出不得入账——影子账闸门）。
- **KB**：`kb/cfo/CHARTER.md`（财务条线 4 人；SoD 纪律；毛利底线与双签线；审批线与现金流原则）
  + `journal/`。
- **验证**：Web 会话选 `cfo` → 三探针（身份=视角与 veto 边界；知识=毛利底线与 SoD 纪律；
  产出=对一页报价出经济性意见，不越权）。

## 工具面（preset 自包含声明，R1 实证）

| 角色 | 工具行 | 说明 |
|---|---|---|
| CEO | `tool-fs` / `tool-fs-search` / `tool-skill` / `tool-todo` / `tool-ask-user` / `tool-present` + `delegation` 组（`tool-subagent` spawn） | 读 KB、写交付物、加载 skill、澄清提问、声明交付；`delegation` 是为 teammate 共享 Lead 组合而带（VP 生 worker 用） |
| VP-Eng / VP-Sales / COO / CFO | 同 VP-Eng（R2 起） | 无 `tool-ask-user`（VP 不直接问用户）；`delegation` 供深挖调研 / 盘点 / 测算 |
| 全局（pack bundle） | `agent-presets` roster 替换 + `tool-present` / `agent-team` / `tool-agent-team` insert | 只放全局行；**工具面不靠它**（见 [10 §6](./design/10-architecture.md) 要点 1） |

⚠ **preset 是自包含组合**：DSH 无 patch 继承，工具行必须写在 preset 里——R1 首跑就是漏了这一步，
CEO 会话只拿到 10 个团队工具（读不了文件、写不出交付物）。`pnpm test` 已加门禁检查（R2 起覆盖五角色）。

## 验证方式（分层）

| 层 | 手段 | 现状 |
|---|---|---|
| keyless | `pnpm test`（roster 零 broken、行依赖、内容定稿、命名系列、bundle 语法、roots 语义、必填 config） | ✅ 五角色覆盖 |
| 运行时 roster | web 观察窗 `agentPresets/list` RPC | ✅ 实测 10 条零 broken |
| **挂载（上线前门禁）** | `node scripts/preset-smoke.mjs`：boot 真 web，逐个 preset `session/create` | ✅ 五角色 ALL PASS（反证过：去掉必填 config 即红） |
| 会话级（persona 生效、连通） | `node scripts/probe-smoke.mjs`（默认快速档 ~6s：真会话发一句 ping，断言挂载/轮次/回话/**人格进 prompt**）；`--full` = 五角色三探针内容断言（慢，按需） | ✅ R2 建：快速档 5/5 PASS；内容档曾 14/15（KB 事实与 veto 语义均命中） |
| 回归资产 | 动议会话 + 期望工作区归档 | ✅ [`snapshots/r1-motion/`](../snapshots/r1-motion/snapshot.yml)（R2 补 `r2-motion/`；replay harness R5） |
