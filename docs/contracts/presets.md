# presets · 角色 preset 的语义合同（R2 五角色定稿 + 2026-11-05 CMO 增设）

> 什么时候读：改 persona、skills 或角色语义时。路线 = 六角色表 → 验证方式节；培养回路/方法层 = [cultivation.md](./cultivation.md)。
> 合同：六个角色 preset 的"现在时"语义（persona 定稿、skills 清单、验证方式）。
> 内容来源 [role-content Note](../../notes/implemented/2026-11-10-role-content-rationale.md)；命名约定见台账 D14
> （显示名 = 角色名；公司名只在品牌/身份面；preset id 保持 kebab）。R1 定稿 CEO / VP-Eng；R2 定稿 VP-Sales / COO，
> 并增设 CFO（用户 2026-09-22 定案：50 人高科技公司，软件开发 / 服务 / 系统集成）。
> **编制唯一事实家 = `company-workspace/.dsh-company/kb/org.md`**（细到岗位）；各角色 CHARTER 只留本条线事实
> 并引用它（Q3：公司事实活数据留 workspace，pack 不含公司事实——D17）。
> **工作流惯例**：每个角色至少 1 个自己的端到端工作流 skill（`<role>-workflow`，1 号）；
> 后续按 `<role>-workflow-<主题>` 追加第 2、3 个——CEO 的工作流即 `chairing-staff-meeting`。

## 名册（运行时实测）

| id | 显示名 | trust | 默认 | 状态 |
|---|---|---|---|---|
| `ceo` | CEO | system | ✅ `isDefault` | R1 定稿 |
| `vp-eng` | VP-Eng | system | — | R1 定稿 |
| `vp-sales` | VP-Sales | system | — | R2 定稿 |
| `coo` | COO | system | — | R2 定稿 |
| `cfo` | CFO | system | — | R2 定稿（增设） |
| `cmo` | CMO | system | — | 2026-11-05 增设（市场机会/产品定义） |
| `worker` / `worker-researcher` / `worker-orchestrator` | 梦之队 Worker（执行手 / 只读调研 / 小工头） | system | — | 2026-11-09 增设（leaf / 只读 / 可带 leaf；不占编制、不组队/不 workflow、**不注入公司手册**——按 worker family 派生，三个 profile 一致；**不装 control 工具**，fan-out 件数由父代理 brief 决定、不承诺硬上限——BUG-051/052） |

实测方式：web 观察窗的 `agentPresets/list` RPC（DSH 出厂 4〔cordis/minimal/ptc/standard，vendor `web-app/presets/`〕+ 本 pack 9，零 broken）。

**worker-researcher 为什么存在**：它是 worker family 的只读调研档（CEO 的 `subagent_research`），不是角色、不是 specialist；SA/SQA 已退役，SyRS/IRS/V&V 如由 CEO 指派 owner 仍可按需使用模板。它和 orchestrator 都不注入公司手册：公司事实按 brief 读 `.dsh-company/kb/company.md`，角色/汇报线/编制手册不进来（BUG-047；取舍见 [Note](../../notes/implemented/2026-11-09-handbook-worker-family.md)）；worker family 也不装 `list_subagents`/`send_to_subagent`（BUG-052）。

## 四形态矩阵：身份、工具与 skills 从哪来（RFC preset-skill-matrix 2026-10-05 立）

「角色名 = preset = skills = child 身份」是常见误读——四种会话形态来源各不相同，一格一事实：

| 形态 | persona 来源 | 工具 / skills 来源 | cwd 与 CHARTER·KB | 日志 | 问人权限 |
|---|---|---|---|---|---|
| 独立角色 preset 根会话（人选 preset 开门） | `presets/<role>/agent.cordis.yml` persona row | **preset 自声明**（自包含、无继承——见下「工具面」） | 人连接的 workspace；手册经 `agent-instructions` 注入、KB = cwd 的 `kb/<role>/` | `$DSH_HOME/sessions/<slug>/<id>/`（世代选择唯一口径 = session-log-generation） | `tool-ask-user` 直问人 |
| CEO Lead 动议会话 | `presets/ceo/`（同上） | 同上（ceo 自声明，含 delegation 组） | `company-workspace`；spawn 队友 | 同上（Lead 目录） | Lead 直问人；成员升级 CEO |
| teammate（Agent Teams 成员） | **继承 Lead 组合**（composeFrom ⇒ `agentPreset=ceo`）——身份来自成员名、任务书与手册注入，**不是成员角色的 preset** | 继承 Lead 组合（delegation 行无 `toolFilter` 不裁剪） | 同 Lead 工作区；读自己的 CHARTER | 各自 sessionId 目录（authorship 按 `team/member` 事件建 sessionId→成员名映射） | 动议内升级 CEO（不直问） |
| 命名 child（activation） | **工具行钉的 `agentPreset`**（`vp_eng`→vp-eng / `vp_sales`→vp-sales / `subagent_research`→worker-researcher；0.2.1 起人格与组合都由 preset 给，不再继承 Lead）——child 日志首帧 `agentPreset` 是唯一取证件，**名册角色名 ≠ 加载 preset** 这条旧坑以此字段核对（旧反例 = 2026-09-26 sea-reconcile，[authorship-audit](../../checks/audit/authorship-audit.mjs) 头注） | 该 preset 自声明的那一套（role skills 随 preset 一起到） | 同 Lead | child 自带 sessionId 日志 | 经 Lead |

改哪一列 → 哪个文件：persona/工具/skills → `presets/<role>/`（owner 表 = [pack README](../../packages/company-pack/README.md)）；手册/模板/默认章程 → `packages/company-pack/content/`（只读；默认章程与状态首启只补缺到 `.dsh-company/`，实例才在 workspace）；生效时点 = 下文「生效边界按面」表。

- **skill/工具实际生效的证据 = 会话日志**（`request/header.tools` 列实际工具名）——多帧 zstd 用 `zstd -d -c` 读（手段唯一家 = [debugging §3.7](../guides/debugging.md)，不复述）；`--dump-config` 只证组合层，不证会话实际全貌。
- **agent loop 是 vendor 运行机制**：本仓负责四个面——preset 声明（`presets/`）、bundle 装配（`cordis.patch.yml`）、host+client 注册（`src/`）、workspace 约束（手册与模板）；**公司手册是给 DSH 会话里的公司角色的，不是 Coding Agent 指令**（两类主体的分界 = 根 [AGENTS.md](../../AGENTS.md) 入口）。

## CEO（个体：动议的唯一入口与出口）

- **persona 要点**：对全局结果负责；语气简短、决断、结论先行；接到动议先澄清目标/约束/验收
  再拆解；亲自组建会议、亲自分派、亲自收口；**不代笔**（稿子由职能出）；只有 CEO 能说
  "这家公司不做了"。
- **工作流（1 号）**：`chairing-staff-meeting`——五步节奏：澄清 → 拆解分派（单一 owner + 可验收）→
  追进度（不抢活）→ 收口（保留分歧、`present` 交付）→ 记账。R2 起在第 3、4 步之间插入互审。
- **KB**：`company-workspace/.dsh-company/kb/ceo/CHARTER.md`（决策原则：一页纸 / 分歧保留 / 不代笔；公司业务
  与编制指引）+ `journal/`。
- **验证**：Web 会话选 `ceo` → 身份探针（答出 CEO 视角与 veto 边界）；动议跑通见 [demo.md](./demo.md)。

## VP of Engineering（职能化身：研发）

- **persona 要点**：视角=可行性 / 成本 / 技术风险；对技术方案有 veto；产出结论先行的一页纸；
  需要深挖时生 workers 并署自己的判断；**不替别的职能下结论**。
- **工作流（1 号）**：`eng-workflow`（接活→备料→深挖→出稿→回执）；打法 skill =
  `tech-feasibility-review`（选项枚举 ≥3 → 逐项可行性·成本·风险 → 结论先行）。
- **PRD 主笔**：接 CMO 的 MRD+StRS 写产品层 PRD（`drafts/prd.md`：REQ/AC/slice，`source`→MR、`traces`→StRS），用 `prd-playbook` + 共享 `product-definition`；`/prd check`（结构）+ `/req check`（编号/追溯）校验。
- **组队（2 号工作流）**：`eng-teaming` 五档（自己做 / 一次性 worker / 并行扇出（workflow）/ 命名专家 / 持久小队）；vp-eng 根门 = Team Lead，可带研发小队；CMO 走命名委托（`vp_cmo`，depth 2）。
- **KB**：`kb/vp-eng/CHARTER.md`（研发条线 16 人、SRE 2 / 无 DBA、Node 22 + SQLite、AI 试点
  API 每案 $200/月硬顶；历史评审三问）+ `journal/`。
- **验证**：Web 会话选 `vp-eng` → 身份探针 + 产出探针（PRD 出稿：REQ/AC/slice；评审意见；不得越权替销售/运营下结论）。

## VP of Sales（职能化身：现有客户/销售，R2 定稿；新市场/新产品归 CMO）

- **persona 要点**：视角=现有客户 / 销售 / 定价；新市场与新产品机会归 CMO；对"没人买"有 veto（需求不成立 / 商机不成熟 /
  定价撑不住交付成本）；产出=市场判断 + 定价建议（`templates/decision-memo.md`，结论先行一页纸）；
  引用 KB 客户与竞品事实，**禁止虚构客户**；不替研发/运营下结论。
- **工作流（1 号）**：`sales-workflow`（接活→备料→测算→出稿→回执）；打法 skill =
  `market-sizing`（双向估算 + **MEDDIC 六问**单单资格 + 敏感度；数字标【事实/假设】）、
  `customer-voice`（只认行为不认表态；每条判断带 KB 出处）。
- **KB**：`kb/vp-sales/CHARTER.md`（客户事实：9 家中型企业、痛点=系统间对不上账；竞品两类；
  定价原则：里程碑收款 3-4-3、维护年费 15–20%、折扣下限 9 折 + CFO 毛利底线 30% 双签）+ `journal/`。
- **验证**：Web 会话选 `vp-sales` → 三探针（身份=视角与 veto 边界；知识=KB 客户数与定价原则；
  产出=对 PRD 出定价/现有客户影响意见（新市场归 CMO），不越权）。

## CMO（职能化身：市场与产品定义，2026-11-05 增设）
- **persona**：视角=市场机会/产品定义/买点；"市场不成立"即 veto；产出 MRD（`MR-###`）+ StRS（`REQ-###`，`traces`→MR，标【事实/假设】）；不替 VP-Sales 定价、不替 VP-Eng 定技术。
- **打法**：`mrd-playbook` + 共享 `product-definition`（脊柱 + 项目制/系统集成、硬软一体 playbook）。
- **KB/验证**：`kb/cmo/CHARTER.md` + `journal/`；选 `cmo` 跑身份/知识/产出三探针；MRD→PRD 交接见 demo.md。

## COO（职能化身：运营，R2 定稿）

- **persona 要点**：视角=落地 / 预算 / 流程合规；对"运营接不住"有 veto（人力撑不住 / 流程没有 /
  合规过不去）；产出=运营方案 + 预算核查（`templates/ops-review-note.md`）；核查语言 =
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

## 职责边界与路由（唯一事实家 = 公司手册 `AGENTS.md`/碰名 `COMPANY.md`）

六角色的"管什么 / 签字线或 veto / 不碰什么"、**问题 → owner 路由表**、冲突升级规则与承诺权，
写在**公司手册**里——它经 `agent-instructions` 行随每个成员会话注入，**模型开场可见**
（不需要谁去"读文档"）。本节不复制正文，避免两处漂移；`pnpm test` 有一条守卫断言手册覆盖
六角色与「职责边界 / 这事问谁 / 冲突与升级 / 承诺权」四节。

## 工具面（owner = 实现）

工具行逐 preset 声明（自包含；DSH 无 patch 继承）；行清单唯一源 = `presets/<role>/agent.cordis.yml`
与 [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml)；本文件不复刻枚举（D28）。
三条不变式：① 工具行必须写在 preset 里（会话检索是唯一例外，必须与 isolated provider 同组）；
② `tool-web` 天生不继承，漏写 = 静默无联网；③ `maxDepth` / `agentPreset` / `subagent_fork` 的行级语义 =
[delegation.md](./delegation.md) §1/§4。

## 验证方式

完成定义唯一家 = [preset-change-definition skill](../../.agents/skills/preset-change-definition/SKILL.md)；
改动面 → 最窄检查 = [tests/README](../../tests/README.md)。本文件不复述层级/命令/证据（旧分层表 2026-11-03 删除：
它与 skill 口径已漂，且带日期证据）。
