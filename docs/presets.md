# presets · 角色 preset 的语义合同（R2：五角色定稿）

> 什么时候读：改 persona、skills 或角色语义时。路线 = 五角色表 → 验证方式节。
> 顶层合同：五个角色 preset 的"现在时"语义（persona 定稿、skills 清单、验证方式）。
> 内容来源 [design/role-content-plan.md](./design/role-content-plan.md)；命名约定见台账 D14
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

## 四形态矩阵：身份、工具与 skills 从哪来（RFC preset-skill-matrix 2026-10-05 立）

「角色名 = preset = skills = child 身份」是常见误读——四种会话形态来源各不相同，一格一事实：

| 形态 | persona 来源 | 工具 / skills 来源 | cwd 与 CHARTER·KB | 日志 | 问人权限 |
|---|---|---|---|---|---|
| 独立角色 preset 根会话（人选 preset 开门） | `presets/<role>/agent.cordis.yml` persona row | **preset 自声明**（自包含、无继承——见下「工具面」） | 人连接的 workspace；手册经 `agent-instructions` 注入、KB = cwd 的 `kb/<role>/` | `$DSH_HOME/sessions/<slug>/<id>/`（世代选择唯一口径 = session-log-generation） | `tool-ask-user` 直问人 |
| CEO Lead 动议会话 | `presets/ceo/`（同上） | 同上（ceo 自声明，含 delegation 组） | `company-workspace`；spawn 队友 | 同上（Lead 目录） | Lead 直问人；成员升级 CEO |
| teammate（Agent Teams 成员） | **继承 Lead 组合**（composeFrom ⇒ `agentPreset=ceo`）——身份来自成员名、任务书与手册注入，**不是成员角色的 preset** | 继承 Lead 组合（delegation 行无 `toolFilter` 不裁剪） | 同 Lead 工作区；读自己的 CHARTER | 各自 sessionId 目录（authorship 按 `team/member` 事件建 sessionId→成员名映射） | 动议内升级 CEO（不直问） |
| 命名 child / one-shot subagent | 继承 Lead（`agentPreset=ceo`）；**名册角色名 ≠ 加载 preset**（反例 = 2026-09-26 sea-reconcile：CFO 稿实为 ceo preset 会话代笔，[authorship-audit](../scripts/audit/authorship-audit.mjs) 头注） | 继承；⚠ 目录看得见 Team 工具但调不通（上游已登记限制，[pack README](../packages/company-pack/README.md) 已知限制节） | 同 Lead | child 自带 sessionId 日志 | 经 Lead |

改哪一列 → 哪个文件：persona/工具/skills → `presets/<role>/`（owner 表 = [pack README](../packages/company-pack/README.md)）；手册/CHARTER/KB → `company-workspace/`；生效时点 = 下文「生效边界按面」表。

- **skill/工具实际生效的证据 = 会话日志**（`request/header.tools` 列实际工具名）——多帧 zstd 用 `zstd -d -c` 读（手段唯一家 = [dev-loop §3.7](./guides/dev-loop.md)，不复述）；`--dump-config` 只证组合层，不证会话实际全貌。
- **agent loop 是 vendor 运行机制**：本仓负责四个面——preset 声明（`presets/`）、bundle 装配（`cordis.patch.yml`）、host+client 注册（`src/`）、workspace 约束（手册与模板）；**公司手册是给 DSH 会话里的公司角色的，不是 Coding Agent 指令**（两类主体的分界 = 根 [AGENTS.md](../AGENTS.md) 入口）。

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

## 职责边界与路由（唯一事实家 = `company-workspace/AGENTS.md`）

五角色的"管什么 / 签字线或 veto / 不碰什么"、**问题 → owner 路由表**、冲突升级规则与承诺权，
写在**公司手册**里——它经 `agent-instructions` 行随每个成员会话注入，**模型开场可见**
（不需要谁去"读文档"）。本节不复制正文，避免两处漂移；`pnpm test` 有一条守卫断言手册覆盖
五角色与「职责边界 / 这事问谁 / 冲突与升级 / 承诺权」四节。

## 工具面（preset 自包含声明，R1 实证）

| 角色 | 工具行 | 说明 |
|---|---|---|
| CEO | `tool-fs` / `tool-fs-search` / `tool-skill` / `tool-todo` / `tool-ask-user` / `tool-present` / **`tool-web`** + `delegation` 组（`tool-subagent` spawn + **`vp_eng` / `vp_sales` 命名委托**） | 读 KB、写交付物、加载 skill、澄清提问、声明交付、**上网（搜/取）**；**汇报线两条路**（R3）：命名委托 = one-shot 前台快捷出稿，协作走 team；语义见 [delegation.md](./delegation.md) |
| VP-Eng / VP-Sales / COO / CFO | 同 VP-Eng（R2 起）+ **`tool-ask-user`（2026-09-25 驾驶舱③乙）** + **`tool-web`（2026-09-29）** | 独立会话可直接问人；动议内仍升级 CEO——手册「问人两条路」两模式约束（承诺权与单一对外口径不动，R3/D18 维持）；`delegation` 供深挖调研 / 盘点 / 测算；VPS 引客户事实时可用 web 核价/竞品 |
| 全体（0.2.0 harvest 批1，2026-09-30） | **`tool-jobs`**（后台任务）/ **`tool-goal` + `/goal`**（跨轮目标）/ **`compaction` 组**（compaction-basic + `/compact` + tool-result-pruner：长会话历史压缩）/ delegation 组内 **`subagent_fork`**（可续跑自身分叉） | 行形状逐字照抄 `vendor/dsh/packages/bundle/web-app/presets/standard.patch.yml`（0.1.7→0.2.0 间 standard 长出的面，本仓 preset 原为 0.1.7 形状）；fork 的编排位 = [delegation.md](./delegation.md) §4.4 |
| CEO（0.2.0 harvest 批4，2026-09-30） | delegation 组内 **`workflow-ptc` + `tool-workflow`**（`workflow` 工具：JS 编排脚本 fan-out 子代理；行形状照抄 standard） | **编排位归 CEO**（组织语义：同题多路并行调研 / 多稿同时出稿后聚合）；persona 派活从两条路扩为三条——workflow 是**编排面不是分工面**，谁做什么仍由 team / 命名委托定（[delegation.md](./delegation.md) §4.4）。VP/COO/CFO 不给：深挖调研走各自 `subagent`，跨职能编排升级 CEO |
| 全体（0.2.0 harvest 批2，2026-09-30） | **`tool-session-query`**（session_search 等 ×5：会话全文检索）；host 侧 = bundle 替换行翻开 `session-query-sqlite`（`openAt: first-search` 懒开 + 索引库锚 profile 目录） | 「上次动议定了什么」先查会话全文再问人——journal 是摘要、会话库是全文；授权域 = 本工作区（五角色共用共享盘 ⇒ 跨角色可查，合稿引用校对受益）；persona 开工动作句已同步 |
| 全体（0.2.0 harvest 批3，2026-09-30） | **schedule 工具 ×4**（schedule_create/list/delete/update，宿主级 cron/定频定时）+ **ui-schedule** 任务页 + **time-context** 日期通道——三行归 `dsh-experimental-schedule-bundle` 所有，部署启用 = bundle 进 profile bundles 列表（真安装 `plugin add` 该包即自动启用；导出手册已写明）；pack 侧只留**替换行钉 `timeZone: Asia/Shanghai`**（回落不依赖进程时区） | 「自主节律」（原搁置池复活项，批 3 落地）：到点投递回原会话、宿主恢复冷会话——seam 实证（schedule README）；工具按 agent 作用域落位（角色根会话有、瞬态委派 child 无——实测 r3 夹具，正合"立节奏的是角色本体"）；persona 节律句已同步 |
| 全局（pack bundle） | `agent-presets` roster 替换 + `tool-present` / `agent-team` / `tool-agent-team` insert | 只放全局行；**工具面不靠它**（见 [architecture §6](./design/architecture.md) 要点 1） |

⚠ **preset 是自包含组合**：DSH 无 patch 继承，工具行必须写在 preset 里——R1 首跑就是漏了这一步，
CEO 会话只拿到 10 个团队工具（读不了文件、写不出交付物）。`pnpm test` 已加门禁检查（R2 起覆盖五角色）。

⚠ **联网（`tool-web`）天生不继承，必须逐 preset 声明**（2026-09-29 补）：`web-app` bundle 把 host 上的
`tool-web` 行 `disabled: true`，**改为按 agent preset 组合**（vendor base 注释原文）——所以漏写这一行时
角色**静默无联网**（不报错，只是目录里少两个工具）。**子会话不用另配**：`subagent` 与 team teammate
走 `composeFrom` **继承 Lead 的组合**（[roles-isolation §2/§4](./design/roles-isolation.md)；本组 delegation 行无 `toolFilter`，故不裁剪）——
实测 Lead 27 工具含 `web_search`/`web_fetch`，摘掉该行即回 25 且两个工具消失，委派子会话（depth=1）同含。

## 验证方式（分层）

| 层 | 手段 | 现状 |
|---|---|---|
| keyless | `pnpm test`（roster 零 broken、行依赖、内容定稿、命名系列、bundle 语法、roots 语义、必填 config） | ✅ 五角色覆盖 |
| 运行时 roster | web 观察窗 `agentPresets/list` RPC | ✅ 实测 10 条零 broken |
| **挂载（上线前门禁）** | `node scripts/smoke/preset-smoke.mjs`：boot 真 web，逐个 preset `session/create` | ✅ 五角色 ALL PASS（反证过：去掉必填 config 即红） |
| 会话级（persona 生效、连通） | `node scripts/smoke/probe-smoke.mjs`（默认快速档 ~6s：真会话发一句 ping，断言挂载/轮次/回话/**人格进 prompt**）；`--full` = 五角色三探针内容断言（慢，按需） | ✅ R2 建：快速档 5/5 PASS；内容档曾 14/15（KB 事实与 veto 语义均命中） |
| 回归资产 | 动议会话 + 期望工作区归档 | ✅ `snapshots/`（r1–r4 motion + scenario-b + r3 replay 场景；replay harness R5a） |

## 培养回路与学习载体（分身成长条目出生，2026-09-24）

**培养动作 = 改 `packages/company-pack/presets/<role>/`**：人格 = `agent.cordis.yml` 的 persona row，
能力 = `skills/*/SKILL.md`。培养权就是 repo 写权限——DSH 没有原生"培养授权"动作，这是权限事实。
dev `web` profile 用 `link:` 符号链接装 pack（[guides/bootstrap](./guides/bootstrap.md)）——改仓库
preset 即对 profile 可见、无需重装；真实安装形状（`file:`）归 release-smoke。

**生效边界按面**（D25；依据 = vendor 源码 + [2026-09-24 活体探针](../notes/implemented/2026-09-24-twin-cultivation.md)）：

| 改动面 | 生效时点 | 依据 |
|---|---|---|
| persona / 组合文件（工具行、skill 根） | **新会话**（运行中的会话保持自己的 generation）；⚠ **新增依赖模块 / 新行解析时还须重启观察窗**——2026-09-29 实测：旧进程上新开会话仍是 25 工具（无 `web_search`），重启后 27 工具含之（该轮两个变量同时变，故取稳妥口径） | vendor `agent-presets` README stamp 机制；**活体已跑**（2026-09-29 联网整治，见 [role-web-access](../notes/implemented/2026-09-29-role-web-access.md)） |
| skill 正文（`SKILL.md` body） | **同会话下一轮**（`get()` 每次读盘） | 活体实证（日志工具结果层）+ vendor 源码一致；**修正** 2026-09-22 U1"只有新会话变"（U1 量的是模型转述） |
| skill 条目（增删改名） | 下一轮（pre-step digest 重算 → 替换目录注入） | vendor 源码层（[研究笔记 §5.2/§6](../notes/implemented/2026-09-22-digital-twin-cultivation-and-self-learning.md)） |

**培养验收（把"培养"从感觉变成检查）**：改任何 preset 内容后，`pnpm test` + `pnpm verify` +
`node scripts/smoke/preset-smoke.mjs`（真挂载）+ `node scripts/smoke/probe-smoke.mjs --full`（入戏探针）全绿，
才算培养成功（首例 = 2026-09-24，CEO `chairing-staff-meeting` +4 行）。

**学习载体 = workspace journal 唯一**（D8：`kb/<role>/journal/`，经工具调用进日志）。
提升回路 = **人读 journal → 提炼 → 写进 pack skills**：只采纳有证据的教训、不自动提升、
单人维护者的 bus factor 写进风险（照 DSH `human-review-skill-maintenance` 提案取舍）；
提升文本只写方法论、不含公司事实与出处（D17——出处留收尾 Note，pack 换公司可复用）。
**分身运行时自改 skill 已否决且为机制事实**（角色 skill 根隔离后，分身可写的共享根不进任何
角色的技能面 + 角色私有目录被沙箱拒 + preset 子树 loader `write()` 是 no-op）；
**自主节律**已由 0.2.0 收割批 3 落地（schedule 工具 ×4 + time-context 日期通道，见上文工具面「批 3」行；
原搁置池复活项随 D32 队列层退役而消化）。
