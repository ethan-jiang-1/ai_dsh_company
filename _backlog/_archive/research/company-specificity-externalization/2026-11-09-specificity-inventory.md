---
topic: company-specificity-externalization
intent: 盘点通用能力、领域知识与公司细节在仓库里的实际分布，量化重复与换行业/换公司的改动面，供定性卡使用
---

# 特殊性盘点：三类内容的家、重复与改动面

> 证据边界：内容面（`content/` 980 行、9 个 preset、19 个 SKILL）于 2026-11-09 逐文件读过，引用行号可复检；
> 代码面为抽样核验——列出的一手读过，未列出的不计入结论。**未做**：换产品类型的 prototype、真实会话
> token 测量、`/req check` 对纯软件文档链的误报实验。这三项都写在 §11。

## 1. 判据

| 类 | 测试 | 更换节奏 | 用户已定的边界（2026-11-09） |
|---|---|---|---|
| **通用** | 换行业、换公司，原句照用 | 跟产品版本 | 职位体系（CEO/CFO/COO/CMO/VP-Eng/VP-Sales、汇报线、职能边界）、协作纪律、通用 skill |
| **领域** | 换行业要重写（流程、术语、交付物形态、验收） | 随行业 | 硬软一体 vs 纯软件；系统工程 vs 敏捷 |
| **公司** | 换公司要重写（名字、编制人数、部门数、岗位设置、政策线、人员归属） | 随部署 | 还含时区、业务构成、客户盘、技术栈 |

一条容易漏的：**术语**（`slice` / 检验 / UAT / 试产）随领域变，属领域包；同一个词在两行业不同义，
所以通用面不能出现行业词（见 §4 的 `slice` 反例）。

## 2. 载体地图（七类，谁可替换）

| 载体 | 位置 | 何时进上下文 | 现在装了什么 | 换公司能否只换它 |
|---|---|---|---|---|
| 注入手册 | `content/AGENTS.md`（19,641B） | 会话创建时整篇注入 system prompt（`host/handbook.ts`）；override = 整篇替换 `.dsh-company/overrides/AGENTS.md` | 通用纪律 + 公司数字 + 领域流程 | **否**：只读产品内容，没有按公司的替换单位 |
| preset persona | `presets/<role>/agent.cordis.yml` | 每请求常驻 | 角色骨架 + 公司品牌名 + 政策数字 + 文档链 | 否：内联 |
| 角色 skill | `presets/<role>/skills/`（19 个） | catalog 常驻 name+description，正文按需 | 方法 + 领域 playbook + 政策数字 | 部分 |
| 状态种子 | `content/state/`（company/org/owners/ledger/process-docs） | 首启只补缺到 `.dsh-company/kb/` | 公司身份、编制、政策、编号合同 | 是（但被手册/章程复述） |
| 章程种子 | `content/charters/`（6 份） | 首启只补缺 | 角色职责 + 编制子集 + 政策 | 是（但复述 `org.md`） |
| 模板 | `content/templates/`（11 个） | 按需读 | 文档格式 + 行业示例（firmware/electronics、客户现场） | 部分：领域示例内嵌 |
| 代码常量 | `src/`、`tools/`、`checks/` | 运行时 | 品牌名、政策阈值、时区、六角色清单、五层链校验 | 否：要改代码 |

## 3. 手册逐节判定（9 个二级节）

| 节:行 | 判定 | 该节最特殊的证据 |
|---|---|---|
| `## 事实的家` :10 | 通用骨架 + 两处混入 | `:12`「50 人」写进指针句；`:15` 五层需求/编号合同（领域） |
| `## 交付物三态` :18 | 通用机制 + 领域尾巴 | `:20` A1 命名（产品约定）；`:31` 系统/接口/验证文档、MR/REQ/IF/TC（领域） |
| `## 职责边界` :36 | 通用骨架 + 公司政策 | `:41` 毛利 <30% / 9 折 / $500；`:45` 并行超 8 个；`:57` 商务/法务岗（公司岗位设置） |
| `## 这事问谁` :47 | 通用骨架 | 仅 `:57` 指向具体岗位；其余是职位边界 |
| `## 冲突与升级` :63 | 通用 | 无 |
| `## 承诺权` :69 | 通用骨架 | 仅 `:72`「CFO 签毛利线」挂政策 |
| `## 协作规矩` :75 | 混合，特殊最密 | `:86` 占位/让位逐字协议；`:100` 派活行格式；`:97` 先对账再裁决（思路）；`:83-85` 多人模式流程 |
| `## 人机接口` :109 | 通用机制 + 公司线 | `:133` 两条报价线；`:137` 成本四格 assembler=CFO |
| `## 工作纪律` :156 | 通用 | `:159` 是 DSH 工具环境事实（`web_fetch` DNS 拦截、bash 出网） |

结论：**9 节里没有一节是纯公司的**，特殊性以句子/数字/协议串的形式嵌在通用节里——这正是"换公司要逐句判断"的根源。

## 4. 领域假设（比"硬件"更宽：系统工程 + 项目制）

先修正一个直觉：硬件制造语言（试产/量产/EVT/DVT/PVT/打样）**只出现在** `references/hardware-software.md`
与 `charters/cmo.md:9`；手册、`process-docs`、COO/CFO 章程里没有。真正被当通用合同的是**系统工程 V 模型 +
项目制/集成交付**：

| 文件:行 | 原文（截断） | 假设的行业事实 | 纯软件公司是否失效 |
|---|---|---|---|
| `state/process-docs.md:9-17` | 五层：MRD/StRS/PRD/SyRS/IRS + V&V | 需求按系统工程 V 模型分层 | 会：典型纯软件无 SyRS/IRS/V&V 三层 |
| `state/process-docs.md:22-35` | R1–R10、退役词 `STR-`/`SYR-`/`IFR-` | 编号合同服务上述五层 | 部分：层与退役词绑定该体系 |
| `content/AGENTS.md:15`、`:31` | 五层需求与编号合同；系统/接口/验证文档 | 把系统工程文档当默认 | 会 |
| `templates/allocation.md:5` | 需求落到子系统 / 采购件 | 存在外购件与子系统分解 | 会 |
| `templates/irs.md:20` | `owners: [firmware, electronics]` | 硬件固件 + 电子分包 | 会 |
| `templates/syrs.md:21`、`:24` | 第三方实验室 / 客户现场；方法=测试/分析/演示/**检验** | 送检与现场验收 | 会（软件只说测试/分析/演示） |
| `templates/mrd.md:17` | `"productType": "project-services"` | 默认业务 = 项目制/集成 | 会（SaaS 无 SOW/实施） |
| `charters/coo.md:7` | SOW + 里程碑（UAT 通过才算数） | 交付物形态 = 项目制 | 会 |
| `presets/coo/skills/ops-feasibility/SKILL.md:10` | SOW + 里程碑 + RACI | 同上 | 会 |
| `references/project-services.md:19`、`:21` | 联调 → UAT → 上线；驻场/切换窗口 | 客户现场实施 | 会（纯 SaaS 无联调/驻场） |
| `references/hardware-software.md:11,13,18,23` | BOM 区间、CE/FCC/3C、DFM 试产、试产良率 | 硬件生命周期 | 会（**已外置，是正例**） |
| `state/org.md:60` | 系统集成工程师 8 人…ERP/财务集成 | 客户系统集成 + 对账/票据 | 会 |
| `presets/vp-eng/skills/prd-playbook/SKILL.md:14` | 品类 playbook（项目制/系统集成 或 硬软一体） | 二选一 = 行业封闭集 | 会：第三种类型无 playbook |

反证（说明"领域"确实没被外置）：`content/` + `presets/` 里纯软件领域词（Sprint / CI/CD / SLO / 发布列车 / 迭代）
**零命中**；而五层/编号链在 `content`+`presets` 命中 **15 个文件**、在 `src`+`tools` 命中 **6 个文件**并被执行。

### 4.1 需求链内部还要再分三档（用户 2026-11-09 补）

"五层链"不是一块铁板：

| 环节 | 判定 | 理由 |
|---|---|---|
| **MRD**（市场需求：该不该做、为谁做） | 半通用 | 概念跨行业存在，名字与形态会变；本组织用它做第一层 |
| **PRD**（产品需求：我们卖的到底是什么） | 半通用 | 概念跨行业存在；但敏捷 + AI 团队常写成 **User Story / OpenSpec** 一类，而不是"PRD 文档" |
| **StRS / SyRS / IRS / V&V + 编号合同** | 特殊 | 系统工程 V 模型的中间层与追溯合同；本组织/行业的流程选择，不是产品通用需求 |

由此得到一条更精确的目标：**通用层只保留"问题级脊柱"**（先回答该不该做 → 再回答做什么 → 再回答怎么验），
**不给文档名**；领域包负责把这三个问题映射成具体产物与顺序——
- 硬软一体/系统工程域：`MRD → StRS → PRD → SyRS → IRS → V&V`（现状，可作为第一个领域包的内容）；
- 纯软件域：`User Story → OpenSpec`（或团队自选），checker 按该域的 `check-rules.json` 判。

这条修正同时解释了为什么"把 MRD/PRD 从通用层删掉"不对：它们是半通用的**问题锚点**；该移走的是
`StRS/SyRS/IRS` 这些中间层与编号合同，以及"所有团队都必须走五层"的默认。

### 4.2 "领域"的粒度不是行业，是产品类型（用户 2026-11-09 再补）

纯软件也不是一条路：2B 项目制、2B SaaS、2C 产品、游戏、开发工具、服务——买家、交付形态、生命周期、
验收语言都不同。所以领域包的单位是**产品类型（productType）**，不是"行业"；一个 `software` 包会把
这几种又揉成新的"大而全"。

| 产品类型 | 需求/交付主干（示例） | 关键差异 |
|---|---|---|
| 硬软一体 / 系统集成 | MRD → StRS → PRD → SyRS → IRS → V&V | 认证、试产、BOM、现场验收 |
| 2B 项目制软件 | SOW → 方案 → UAT → 上线 | 合同驱动、里程碑付款 |
| 2B SaaS | 路线图 → PRD/User Story → 发布 | 订阅、SLA、多租户 |
| 2C 产品 | 机会假设 → 实验 → 增长 | 留存、漏斗、AB |
| 游戏 | Greenlight → 里程碑 → 试玩 | 玩法验证、内容产能 |
| 开发工具 | RFC → 版本 → 兼容性 | 开发者体验、生态 |
| 服务 | 服务目录 → SOP → SLA | 人力排班、质量抽检 |

结论：`productType` 是 company profile 的必填字段；每个类型一份**自包含**包（先不做继承/组合，
避免隐式耦合），把通用层的"问题脊柱"映射成该类型的产物、顺序、术语与验收判据。

## 5. 公司细节与重复陈述

同一事实的多个家（这是"藏"的可量化形态）：

| 事实 | 家数 | 位置 |
|---|---|---|
| 毛利 30% + 9 折双签 | 8 个源文件 / 10+ 处 | `AGENTS.md:41`、`:133`、`org.md:70`、`charters/cfo.md:7`、`charters/coo.md:11`、`charters/vp-sales.md:12-13`、`cfo/skills/project-economics/SKILL.md:3,14,15`、`host/signoff-tool.ts:17,23`、`lib/signoff.ts:12` |
| 固定支出 ≥ $500/月 | 5 | `AGENTS.md:41`、`:133`、`org.md:74`、`cfo.md:8`、`coo.md:11` |
| 50 人编制 | 4 | `AGENTS.md:12`、`org.md:3`、`org.md:8`、`ceo.md:5` |
| 并行项目上限 8 个 | 4 | `AGENTS.md:45`、`org.md:69`、`coo.md:7`、`ops-feasibility:11` |
| 云 $2,000/月 + API $200/月 | 5 | `org.md:52`、`org.md:72`（同文件复述）、`coo.md:10`、`vp-eng.md:8`、`budget-check:8` |
| 三类业务（软件/服务/集成） | 4 | `org.md:5`、`ceo.md:4`、`cmo.md:4`、`vp-sales.md:4` |
| 客户 9 家（制造 4 / 零售 3 / 专服 2） | 3 | `cmo.md:7`、`vp-sales.md:6`、`org.md:75` |
| 3-4-3 收款曲线 | 3 | `cfo.md:18`、`vp-sales.md:12`、`project-economics:9` |
| 公司名「梦之队」 | 16（随包） | 9 个 preset 的 `name` 行、`presence-status.ts:73-78`、`Brand.tsx:8`、`locale/{zh,en}.json`、`company.md:3`、`org.md:1`、`owners.md:1` |
| 「journal 最近 3 篇」开工动作 | 12 | 6 份 charter + 6 个角色 persona |
| `Asia/Shanghai` | 6 | 6 个角色 preset 的 `time-context` |
| 派活行格式 | 2 | `AGENTS.md:100`（自称唯一家）、`chairing-staff-meeting:24-26` |
| 先对账再裁决 | 2 | `AGENTS.md:97`、`chairing-staff-meeting:44-45` |
| 待补料枚举 | 4 | `AGENTS.md:88`、`:100`、`assembling-the-team:35`、`fact-finding-playbook:25-27` |

还有一处句内自重复：`charters/coo.md:6`「（以 kb/org.md 为准）」连写两遍。

## 6. 错位：特殊内容长在"通用"文件里

| 位置 | 错位内容 | 性质 |
|---|---|---|
| 9 个 `agent.cordis.yml` 的 `name` 行 | 「梦之队」写进通用组合；三个 worker 明说「不是公司角色」却带公司名 | 品牌应来自部署配置 |
| 6 个角色 preset 的 `timeZone` | 部署时区硬编码 | 时区是部署事实 |
| persona 内联：`vp-eng:36` 编号合同、`cmo:37` 文档链、`coo:39` SOW/UAT、`cfo:39` 毛利线、`ceo:39` owner 名单 | 政策与流程写进人格 | 应外置并由 profile 注入 |
| `_shared/skills/product-definition/` | 目录叫「共享」，references 里是两条行业 playbook | 「共享」名不副实 |
| `templates/irs.md`、`syrs.md`、`mrd.md`、`allocation.md` | pack 通用模板内嵌硬件/集成示例与默认品类 | 模板应中性 |
| `state/process-docs.md` | 编号合同住在"状态默认值"目录 | 合同与状态混放 |
| `charters/ceo.md:6` | 旧稿「四条线 / 6·7·18·19 已作废」 | 历史残留在当前章程 |
| `delegation-policy/SKILL.md` | 全文只有 DSH 机制与成本，无公司事实 | **对照组：唯一干净的共享层** |

## 7. 代码面

### 7.1 公司身份与政策

| 文件:行 | 硬编码 | 判 |
|---|---|---|
| `src/lib/presence-status.ts:73-78` | `ceo: '梦之队 CEO'` 等 6 条显示名（`:83` 把 lead 恒映射 CEO 是骨架，另判） | 公司品牌进显示层 |
| `src/client/ui/Brand.tsx:8` | `DSH 梦之队` | 产品词标，但字面即本部署名 |
| `locale/zh.json:3`、`package.json:5` | 「梦之队公司包」/ 包描述 | 市场显示名 |
| `src/host/commands/signoff-tool.ts:17`、`:23` | 工具描述与参数示例写「margin below 30% / discount below 9折」 | 公司政策进模型可见的机制面 |
| `src/lib/signoff.ts:12` | 注释同款阈值（第 3 份副本） | 同上 |
| `tools/lib/install-manual.mjs:22`、`:83`、`tools/lib/market-index.mjs:110-111` | 生成手册标题、市场索引元数据带公司名 | 公司名进产物 |

### 7.2 领域模型被执行

| 文件:行 | 硬编码 | 后果 |
|---|---|---|
| `src/lib/requirements-check.ts:23` | `LAYERS = ['MRD','StRS','PRD','SyRS','IRS','V&V']` | 纯软件公司不用 SyRS/IRS，仍被词表约束 |
| `src/lib/requirements-check.ts:105-112`、`src/host/commands/req-command.ts:18` | 层 → 文件名硬映射（7 个文件名，两份清单） | 换流程必改代码 |
| `src/lib/requirements-check.ts:405-407` | 声明 `编号体系:` 后缺层即红 | 精简团队跳过 StRS 就红 |
| `src/lib/requirements-check.ts:103` | 退役词正则含 `VR`/`VP` 前缀 | 别家用 `VR-001` 记验证需求 → 误判为退役词 |
| `src/lib/prd-check.ts:207` | `verification ∈ test｜demo｜review` | 与自家 `templates/syrs.md:24`（测试/分析/演示/**检验**）冲突——硬体验证写法被自家命令判红 |
| `src/lib/requirements-check.ts:334`、`:34` | 无 `编号体系:` 即 skipped；`DEFAULT_LAYERS` 只到 PRD | 已有缓解，不是分离 |

### 7.3 三处"声称可替换、实际只到口头或只到半边"

| 声称 | 出处 | 实际保证 |
|---|---|---|
| 「角色会话与公司视图都读 `kb/company.md`」 | `content/state/company.md:7` | 会话侧：只是被指向，模型自愿读；**UI 侧不读**——`Brand.tsx:8` 与 `presence-status.ts:73-78` 写死显示名，`src/` 无该文件的读者 |
| 「改模板复制到 `.dsh-company/overrides/templates/`」 | `content/README.md:6-7` | 只在注入文本里提醒模型优先（`handbook.ts:44`），**无代码强制、无读取路径**；`handbook.ts:36` 只真读 `overrides/AGENTS.md` |
| 「品类可扩展，新增 `references/<type>.md`」 | `product-definition/SKILL.md:34` | 只对 product-definition 生效；新文件必须打进包（preset 的 `customSkillDirs` 固定），无 workspace 覆盖点 |

这三条比"没做外置"更值得记：它们让用户以为换公司只需要改文件，而实际保证只有"模型被提醒"或"半边接线"。

### 7.4 门禁与测试把公司/领域事实当不变量

| 位置 | 断言 | 换公司/行业后果 |
|---|---|---|
| `checks/gates/company-skeleton.mjs:20`、`checks/gates/base-clean.mjs:16` | 六件领域模板（syrs/irs/allocation…）必须在场 | 删硬件模板 → `pnpm verify` 红 |
| `tests/presets/presets.spec.ts:180` | 所有 preset 名以「梦之队 」开头 | 换公司名 → 测试红 |
| `tests/lib/board.spec.ts:98`、`tests/client/ui/brand.spec.ts:13` | 看板/品牌期望值含公司名 | 同上 |
| `tests/lib/signoff.spec.ts:15`、`signoff-tool.spec.ts:70` | 断言 `'毛利<30% 双签'` | 换策略线 → 测试红 |
| `tests/content/requirements-templates.spec.ts:38`（另 `:105-129`）、`tests/content/requirements-contract.spec.ts:49` | 五层链逐层自洽 | 删层 → 测试红 |
| `checks/smoke/client-load-smoke.mjs:37` | `BRAND = 'DSH 梦之队'` | 改品牌 → 冒烟红 |

### 7.5 清单漂移（同骨架的两份陈旧副本）

`tools/lib/rehearsal.mjs:10` 与 `checks/gates/company-skeleton.mjs:13` 仍是五角色（无 cmo），CMO 加入后未同步——
说明"清单化"本身在无单一事实家时会漂。

## 8. 已有的 seam（正例，目标形状不需要发明）

| seam | 位置 | 证明什么 |
|---|---|---|
| 整篇 override | `host/handbook.ts` → `.dsh-company/overrides/AGENTS.md` | 已有"公司可替换"入口，只是粒度太粗 |
| 只补缺种子 | `host/bootstrap.ts` `flag: 'wx'` | 已有"换公司不动既有数据"的原则 |
| 跳过注入 | `handbookSkipPresets: ['worker']` | 加载器已承认"能力档 ≠ 公司角色" |
| 按类型分 playbook | `product-definition/references/<type>.md` + 「新类型 → 新增」 | 领域知识外置的现成范式 |
| persona / skills / KB 三载体 | `docs/design/role-content-plan.md §0.2` | 内容分工原则已存在，手册是没被纳入的第四载体 |
| 干净共享层 | `delegation-policy/SKILL.md` | 通用层可以做到零公司事实 |

## 9. 改动面估计

**换公司（同行业、同职位）**：`content/state/` 4 件 + `charters/` 6 份 + 9 个 preset 的 name 行 + `presence-status.ts` +
`Brand.tsx` + `locale/` + 手册两节数字 + `cfo/vp-sales` 两个 skill——约 25 个文件；另 8 处测试/冒烟断言会把旧公司名
或旧签字线当期望值，不改就红。

**换行业（纯软件，职位不变）**：上列 + `process-docs.md` 重写 + `templates/{syrs,irs,allocation,mrd}.md` 换掉 +
`prd-playbook`/`ops-feasibility`/`project-economics` 三个 skill + `requirements-check.ts`/`req-command.ts` 的校验规则 +
`checks/gates/{company-skeleton,base-clean}.mjs` + 两组 requirements 测试——**其中 8 处是代码/门禁，不是内容**。

**量化底数**：硬软/集成词全仓命中 30 个文件；五层/编号词 `content`+`presets` 15 个、`src`+`tools` 6 个；
五层文档名清单 13 个文件；`梦之队` 随包 16 个文件（另 tools 2、checks 1、tests 6）；毛利线 8 个源文件 10 处；
`$500` 3 处；`50 人` 3 处。

## 10. 与既有合同的关系（立卡理由）

- **D17**（`docs/reference/decisions.md:25`）："pack 不含公司事实（出厂样例除外——`content/state` 与 `charters` 是首启只补缺的默认值）"。
  手册是只读产品内容、**不在例外内**，却装了公司事实与政策数字——合同自相矛盾。
- **`docs/contracts/presets.md:113`**：把"职责边界与路由"的唯一事实家指定为这份手册——等于把公司模型焊进产品内容。
- **`role-content-plan §0.2`**：persona 管"是谁"、skills 管"怎么做"、KB 管"知道什么"；手册是这套三分法之外的第四载体，
  没被任何设计覆盖。
- **三处"声称可替换、保证只到口头或半边"**（§7.3）：`company.md` 声称会话/视图都读它，UI 侧却写死在 `presence-status.ts`；
  `content/README.md` 声称 `overrides/templates/` 可覆盖，实际只有注入文本里的提醒；`references/<type>.md` 只对
  product-definition 生效且必须打进包。**已经有外置的形状，没有外置的通路**——这是比"没做"更强的立卡理由。

## 11. 未覆盖 / 待补（2026-11-09 二轮后更新）

- 未测真实会话 token：只有注入字节数（公司角色 21–25KB、worker 0.5–1.0KB，见 §12.4），没有实际开销对比。
- checks 的 smoke / gates / audit 三个子目录只到 grep 命中行，未逐条读断言；重点待读 `preset-smoke`、`release-smoke`、
  `presets.mjs`、`dev-product-parity`。`tools/lib` 其余、`tests/**` 与 `docs/**` 通读同理。
- 真模型行为：换 `productType` 后 agent 是否真按新链走（keyless 只能证结构）。
- vendor 语义：多段 `systemPrompt.section` 的排序/覆盖规则、`skills.registerProvider` 的生命周期（只核签名）。
- 换公司后 `overrides/AGENTS.md` 是否够用：整篇替换可行，但替换的是通用 + 特殊混合体。
- 产品类型包分发已拍板 v1 随包；workspace 覆盖点仍属设计预留，未实现。

## 12. 可行性验证：DSH 载体能不能支撑三层

### 12.1 载体能力（读 `vendor/dsh` 源码）

| 需要 | 现成机制 | 结论 |
|---|---|---|
| 分层注入（多段） | `systemPrompt.section({ name, order, text })`——同一 scope 内按 name 唯一，可注册多段，支持 `agent.ctx` 作用域 | 可做 `company:generic` / `company:profile` / `company:product-type` 三段，不必拼成一个大字符串 |
| 按角色差异 | `handbook.ts` 已在 `agent.ctx.inject` 里按 preset 跳过 | 同一机制可按角色给不同摘要（CEO 看编制摘要，worker 只看 generic） |
| 领域 skill 挂载 | `ctx.skills.registerProvider(create)`（目录型 provider）与 `ctx.skills.register(skill)`（单条运行时 skill） | 可按 profile 只挂一个域目录；不需要改 preset 的静态 `customSkillDirs` |
| 领域模板 | 纯指针：手册/模板里写绝对路径 | 无机制需求，只改指向 |
| 领域校验规则 | `checkRequirements(snapshot, { layers })` 已接受 `options.layers` | 域层表可先从 profile / 产品类型包读入传入；层词表与 `RETIRED` 正则仍是常量，需要参数化（小改） |
| 公司 profile 读取时机 | host `apply()` 时 workspace 已由 `prepareCompanyRuntime` 解析，`registerHandbook` 就在 apply 内 | 可在 apply 读 `.dsh-company/company.md` 的 frontmatter，决定注入哪三段 |
| preset 侧限制 | `customSkillDirs` 是 load-time 常量（`!!js` 表达式） | 不能按 workspace 变；领域 skill 必须走 host 注册，或作为产品类型指针由 agent 手动读 |

### 12.2 原型：`checkRequirements` 的纯软件样本（实跑）

命令：`node --import tsx/esm /tmp/req-proto.ts`（直接 import `src/lib/requirements-check.ts`；脚本不进仓）。

| 样本 | 输入 | 实跑输出 |
|---|---|---|
| A 纯软件：只声明 `编号体系: identity`，不写 `需求层` | mrd + prd 两个合法 json-ledger | `layers = MRD,StRS,PRD`；红：`缺层 StRS` |
| B 纯软件：显式 `需求层: MRD, PRD` | 同上 | `layers = MRD,PRD`；`ok = true`，零错误 |
| C 别家编号：prd 里出现 `VR-001` | 同 B + 一行「验证：VR-001」 | 红：`drafts/prd.md:10 退役词 VR-001` |
| D 旧动议：无 `编号体系` 标记 | 同上 | `skipped = true`，零错误 |

结论：**默认值押系统工程**（不写 `需求层` 就要求 StRS 到场），显式声明可豁免；但 `VR-` 这类别家编号
**没有任何豁免**，判红即硬阻断。前者是默认偏好，后者是词表锁死。

### 12.3 结论

三层可以用现有载体实现，不需要新 DSL 或生成器：
- generic 与 profile / 产品类型摘要走 `systemPrompt.section` 三段；
- 领域知识/术语/模板走"摘要注入 + 指针 + 按需读"；
- 领域 skill 走 `skills.registerProvider` 按 profile 注册；
- 唯一必须改代码的是 checker 的层词表与退役词参数化（从产品类型包的 `requirements.json` 读）。

## 13. 目标目录、命名与渐进式披露

### 13.1 命名规则（名字就是定位）

- 文件名 = **层 + 一个问题**；读名字就知道"什么时候该打开它"。
- 禁止：`AGENTS.md`（平台专用名，且是多个问题的合集）、`misc.md` / `notes.md` / `utils.md` / `company.md`（含糊，看不出用场）。
- 正例：`policy-lines.md`（政策线）、`organization.md`（编制）、`requirements-model.md`（需求链模型）、
  `glossary.md`（术语）、`non-negotiables.md`（不可谈判的硬规矩）。
- **一个文件只回答一个问题**；超预算就拆成两个名字更具体的文件，不允许合并成"大而全"。

### 13.2 加载分层（T0–T3，预算是硬约束）

| 层 | 何时进上下文 | 载体 | 预算 | 装什么 |
|---|---|---|---|---|
| **T0 常驻** | 会话创建即注入 | `systemPrompt.section` | 合计 ≤ 6KB；单文件 ≤ 2KB | 身份、硬规矩、角色边界 |
| **T1 摘要** | 会话创建注入摘要 + 指针 | `systemPrompt.section`（host 组装摘要） | 合计 ≤ 4KB | 编制摘要、政策线摘要、领域概览 |
| **T2 按需** | 触发时读全文 | 文件指针（T0/T1 里写清"何时读它"） | 单文件 ≤ 6KB | 协作细则、路由、需求链、术语、模板说明 |
| **T3 技能** | catalog 常驻 description，正文按需 | skill | 单 SKILL 正文 ≤ 8KB | 角色方法、领域方法 |

对比现状：手册 19.6KB 全文常驻；目标 T0+T1 ≤ 10KB，且每个文件可被单独定位、单独替换。
渐进式披露的判据不是"文件多"，而是**任何一份文件都能回答"我为什么现在在这个上下文里"**——答不上就是放错了层。

### 13.3 目录（带 tier 标注）

```
content/
  generic/
    non-negotiables.md        # T0 写盘守卫/日期口径/present 归属/升级路径（≤2KB）
    role-boundary/
      ceo.md cfo.md coo.md cmo.md vp-eng.md vp-sales.md   # T0 每角色一页，只写边界与例外
    collaboration.md          # T2 星型汇报/打回三件套/问询节流（T0 只留一句触发）
    deliverable-states.md     # T2 三态/命名/署名行/meta
    product-definition-spine.md # T2 三个问题（该不该做/做什么/怎么验），不给文档名
    routing.md                # T2 这事问谁
    human-interface.md        # T2 待办四格/审批三档/节流
  product-types/
    hardware-software/
      overview.md             # T1 何时用、比软件多哪几个阶段（≤2KB）
      requirements-model.md   # T2 五层/编号规则（人读；机器读 check-rules.json）
      glossary.md             # T2 术语（BOM/认证/DVT/OTA…）
      check-rules.json        # checker 读：层表、文件名、退役词
      templates/<doc>.md      # T3 按需
      skills/<name>/SKILL.md  # T3 领域方法
    b2b-saas/                 # 第二个 fixture：纯软件内部也不是一条路
  company/                    # 出厂样例，首启 seed 到 workspace
    identity.md               # T0 公司名/产品名/productType 声明
    organization.md           # T1 编制/人数/部门数/业务构成
    policy-lines.md           # T1 毛利线/折扣线/预算线/并行上限
    people.md                 # T2 人侧归属与授权面
presets/<role>/
  agent.cordis.yml            # 只留角色骨架；去掉公司名/时区/政策
  skills/<name>/SKILL.md      # 通用方法（T3）
```

workspace（`.dsh-company/`）：`identity.md`（含 `productType:`）、`organization.md`、`policy-lines.md`、`people.md`、
`kb/<role>/CHARTER.md`、`journal/`、`deliverables/`、`bundle.json`。

### 13.4 归位表（现内容 → 目标家 + tier）

| 现内容 | 现位置 | 去哪层 | 目标家 | tier |
|---|---|---|---|---|
| 写盘守卫、日期口径、present 归属、升级路径 | `AGENTS.md` 协作规矩/工作纪律 | 通用 | `generic/non-negotiables.md` | T0 |
| 职位边界、veto、不碰什么 | `AGENTS.md` 职责边界 | 通用 | `generic/role-boundary/<role>.md` | T0 |
| 星型汇报、打回三件套、问询节流、任务板 | `AGENTS.md` 协作规矩/人机接口 | 通用 | `generic/collaboration.md` | T2 |
| 三态、命名、署名行、meta | `AGENTS.md` 交付物三态 | 通用 | `generic/deliverable-states.md` | T2 |
| 路由表 | `AGENTS.md` 这事问谁 | 通用 | `generic/routing.md` | T2 |
| 毛利 30% / 9 折 / $500 / 并行 8 个 | 手册、org、3 份 charter、1 个 skill | 公司 | `company/policy-lines.md`（唯一家） | T1 |
| 50 人、六条线、岗位、三类业务、客户 9 家 | `org.md`、4 份 charter | 公司 | `company/organization.md`（唯一家） | T1 |
| 人员归属与授权面 | `owners.md` | 公司 | `company/people.md` | T2 |
| 公司名、产品名、productType 声明 | `company.md` | 公司 | `company/identity.md` | T0 |
| 五层需求链的中段（StRS/SyRS/IRS/V&V）+ 编号合同 | `process-docs.md`、手册 2 处、`/req check` | 领域 | `product-types/<id>/requirements-model.md` + `check-rules.json` | T2 + checker |
| MRD/PRD 的**问题锚点**（该不该做/做什么/怎么验） | 手册交付物三态、process-docs 首两行 | 通用 | `generic/product-definition-spine.md`（不给文档名） | T2 |
| IRS/SyRS/allocation 模板与字段 | `templates/` | 领域 | `product-types/<id>/templates/` | T3 |
| 硬软一体 playbook | `product-definition/references/hardware-software.md` | 领域 | `product-types/hardware-software/`（迁入） | T2/T3 |
| 术语（slice/检验/UAT/试产） | 模板与 skill 正文 | 领域 | `product-types/<id>/glossary.md` | T2 |
| 角色方法 skill | `presets/<role>/skills/` | 通用 | 原地保留 | T3 |
| 政策阈值段（project-economics 等） | `presets/<role>/skills/` | 公司 | 阈值移 `policy-lines.md`，skill 只留方法 | T1 + T3 |
| 编制/客户/技术栈等活数据 | workspace `kb/` | 经验 | 原地保留 | 按需 |
| 品牌名、时区 | `presence-status.ts`、`Brand.tsx`、6 preset | 公司 | workspace `identity.md` | T0（host 读） |

### 13.5 每层"不许进什么"（lane 约束）

| 层 | 允许 | 禁止 |
|---|---|---|
| 通用 | 角色、协作、文档纪律、方法 | 公司名、编制数字、政策阈值、行业术语（BOM/UAT/SyRS） |
| 领域 | 行业流程、术语、模板、验收判据 | 公司名、编制、客户名、政策阈值 |
| 公司 | 身份、编制、部门数、政策线、人、时区 | 行业流程细节（只写 `productType: <id>` 引用） |
| 经验 | 当轮事实、纪要、客户数据 | 任何要跨会话复用的规则（规则回流到上面三层） |

### 13.6 机械约束（门禁候选）

- **预算**：`generic/*.md` 的 T0 合计 ≤ 6KB、单文件 ≤ 2KB；`company/*.md` 的 T1 合计 ≤ 4KB；T2 单文件 ≤ 6KB。
- **清单**：`content/generic/` 与 `product-types/<id>/` 每份文件必须在 `content/manifest.md` 登记 tier + 一句话用场；
  未登记 = 红（防止"大而全文件"悄悄回来）。
- **零污染**：通用面（T0/T1/T2 + 角色边界）grep 公司词/领域词 = 0。
- **命名**：禁止 `AGENTS.md`（除平台约定文件）、`misc.md`、`notes.md`、`utils.md` 这类名字出现在 content 层。
