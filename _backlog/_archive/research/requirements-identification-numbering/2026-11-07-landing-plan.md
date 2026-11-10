---
topic: 需求识别与编号的落地拆法——合同、模板、角色、校验器与旧盘范围
intent: 把已定性的编号共识转成可评审的落地面清单、卡边界与验证门；不授予实施、不改产品代码
---

# 编号共识怎么落地：面清单与卡边界

> **这份材料是什么**：[共识](2026-11-07-consensus.md)回答“规则是什么”；本材料回答“按什么面落地、按什么卡拆、每张卡拿什么证据收”。它不改变共识，也不授予实施。
> **消费者**：[落地拆法卡](../../settled_issues/2026-11-07-requirements-teaming-landing.md)（拆法与评审）；后续 A1–A8 执行卡。
> **边界**：只写落地面与顺序；参数级选择（状态位、层序、跨动议键等）仍按共识 §6 待拍。

## 1. 先看四个“落地才暴露”的冲突

| # | 冲突 | 事实（可复核） | 不处理的后果 | 建议处置 |
|---|---|---|---|---|
| 1 | **定义点重复** | [PRD 模板](../../../../packages/company-pack/content/templates/prd.md)同时有 JSON 账本和 `### REQ-001` 小节；两者都能被读成“定义” | 违反 R4“一个号只能有一个定义点”；Agent 会把正文小节当定义、把 JSON 当索引，或反过来 | PRD 头声明 `definition: json-ledger`，正文小节标题改成“需求说明：REQ-001”这类**引用**；或反过来只留标题。二选一，写进模板和 checker |
| 2 | **第二套词表还活着** | [workspace 的 process-docs](../../../../company-workspace/.dsh-company/kb/process-docs.md)仍写 `STR/SYR/IFR`；pack 的 HEAD 里没有 `process-docs.md`；dev profile 的 `content/templates/{strs,syrs,irs}.md` 还是上一轮实现的残留 | 换一个 workspace 就换一套语法（研究失败 #2 原样复发）；新装与旧盘两套规则 | 新 `content/state/process-docs.md` + 版本标记；bootstrap 只补缺、不覆盖；旧盘迁移/豁免另卡（C4） |
| 3 | **旧盘与旧实现** | 现有 deliverables 里 `V-` 659 处、`VP-` 71 处、`VR-` 75 处；reflog 的 `65b6917` / `f2bf55b` / `a1fb07b` 是上一轮“层前缀”实现，已 reset | 全量回扫旧动议 = 永久红；cherry-pick 旧实现 = 把 `STR/SYR/IFR` 又带回来 | 旧动议只读豁免；旧实现只当模板/checker 草稿，不 cherry-pick；C4 负责 marker/迁移 |
| 4 | **强制点/索引/范围未定** | 共识 R10 要求 host 命令/操作员/钩子；§6-1 状态位、§6-2 层序、§6-4 跨动议键、§6-6 并发、§6-8 范围都未拍 | 角色自查会漂；两个会话同时写会撞号；老动议被误判；跨动议引用没有落点 | `/req check` 走操作员命令（host 命令载体）；号由 owner 登记时取 max+1，Lead 串行分配；范围用 marker；跨动议 v1 不实现、显式标未支持 |

## 2. 落地面清单（逐面核，别等补）

| 面 | 要动的东西 | 判据/证据 |
|---|---|---|
| **content 合同** | `content/state/process-docs.md`（新模型、R1–R10、退役词表、范围/豁免、并发口径）；`templates/{mrd,prd,strs,syrs,irs,allocation}.md`；`content/AGENTS.md` 的五层表与文件指针 | `pnpm verify`（base-clean/company-skeleton）；内容 tests；模板可被 `/prd check` 的样例通过 |
| **presets 角色** | CMO（MRD+StRS）、VP-Eng（PRD only）、SA（SyRS+IRS+架构+验证点）、SQA（TC+V&V）、CEO（组队/收口口径）；共享 `product-definition` | `pnpm test tests/presets`；`preset-smoke`；五层行为场景 |
| **host** | `STATE_FILES` 加 process-docs；`/req check` 命令（`src/host/commands/req-command.ts` + `src/index.ts` 注册）；`host-composition.spec` 的命令集合 | 命令 tests；`bootstrap` tests；`release-smoke` |
| **tools/lib** | `requirements-check` 纯逻辑（层/定义形态/唯一性/悬空/退役词/孤儿/覆盖/计数）；索引派生 | keyless 单测（含红证）；V2/V4/V11 夹具 |
| **gates/tests** | `base-clean` 的 `TEXT_FILES`；`company-skeleton` 的 `required`；`handbook-budget`；`prd-check.spec` 的“模板同源”约束；`presets.spec`；`host-composition.spec` | `pnpm verify`；`pnpm test` |
| **docs** | `guides/product-definition.md`、`presets.md`、`delegation.md`、`index.md`、`decisions.md`；注意前两份已顶格，**先搬后写** | `pnpm verify`（md-links/doc-budget） |
| **workspace** | 旧 `process-docs.md` 迁移；旧动议豁免；`meta.md` 的 `编号体系/需求层` 标记 | `bootstrap`/`release-smoke`；旧盘不红 |
| **release** | 版本 bump（若发版）、`release-smoke`、`_dist` 手册若涉及 | `pnpm release --check` |

## 3. 设计建议（把共识翻成可执行形状）

1. **ID 只承载身份**：`MR / REQ / IF / TC` 四种，各自一条 append-only 序列；`AC-<REQ>-<n>` 从属。层、状态、专业域、验证方都不进号。
2. **一份文档一层，头声明两件事**：`layer`（MRD/StRS/PRD/SyRS/IRS）与 `definition`（`json-ledger` / `headings` / `table-rows`）。文件名叫 `mrd.md`/`strs.md`/`prd.md`/`syrs.md`/`irs.md` 只是约定，**机器只认头**；`final.md`/review 文档不声明 layer，只当引用面。
3. **PRD 用 JSON 账本当唯一定义点**：正文 `### REQ-001` 改成引用标题；StRS/SyRS/IRS 用 `### <ID>` + 字段；SQA 的 V&V 用表行 `TC-###`。这样既保住 `/prd check` 的 JSON 语义，又满足 R4。
4. **索引派生、号由 owner 登记时取 max+1**：矩阵由 checker 从 `traces` 派生，不手写 `trace.md`。并发 v1 不加锁，靠 Lead 串行分配 + 撞号红兜底；把“两个会话同时写会撞号”写进 process-docs 的已知限制。
5. **强制点 = `/req check <slug>` 操作员命令**：纯逻辑住 `src/lib`，命令住 `src/host`；角色不能自己宣布通过。`/prd check` 保留——它管 MRD/PRD 结构（no-go/defer、AC、changeLog），`/req check` 管编号/追溯/层；两者分工写进手册。
6. **范围 = `meta.md` 的 `编号体系:` 标记 + 可选 `需求层:` 声明**：没有标记的旧动议只读豁免，不回溯判红。这样 `V/VP/VR` 不会把历史全打红；新动议的“缺层”才有判红依据。
7. **状态与 PRD 生命周期的关系**：编号状态用 `草案/生效/作废`；PRD 现有 `draft/ready/in-dev/accepted` 是产品生命周期。v1 用映射（`draft`→草案，`ready/in-dev/accepted`→生效，`withdrawn`→作废），不新造第二个状态字段；映射写进模板与 checker。若用户要严格一一对应，再议。
8. **跨动议键 v1 不实现**：`<动议键>:<ID>` 的键格式是 §6-4 未定；checker 遇到 `:` 引用标“未支持”，不解析、不判红。宁可显式留空，不造第二套规则。

## 4. 卡边界（结果级 C1–C4；执行级 A1–A8）与出口证据

> 执行级卡号以[拆法卡](../../settled_issues/2026-11-07-requirements-teaming-landing.md)为准：A1=合同/范围，A2=模板，A3=CMO/VP-Eng，A4a=SA / A4b=SQA（已拆），A5=checker，A6=命令，A7=迁移，A8=E2E，B1=组队能力，B2=组队 E2E/收口。下面保留结果级 C1–C4 的写法，避免材料跟着卡号漂。

### C1 编号合同与五层模板

- **结果**：新 `process-docs` 与五层模板在场，`pnpm verify` 绿，模板样例可过 `/prd check`；角色还没改。
- **范围**：`content/state/process-docs.md`、六个模板、`content/AGENTS.md` 的指针、`base-clean`/`company-skeleton`、`bootstrap` seed。
- **出口**：V1 词表盲测（若用户要）；`pnpm verify`；模板/内容 tests；`node tools/checks-index.mjs --write` 若新增脚本。
- **不做**：角色文案（A3/A4a/A4b）、checker（A5/A6）、旧盘迁移（A7）。

### C2 角色产出与交接

- **结果**：CMO/VP-Eng/SA/SQA/CEO 的产出面与五层链一致；`pnpm test tests/presets` + `preset-smoke` 绿；行为场景有证据。
- **范围**：四份 skill/persona、CEO 组队/收口口径、共享 `product-definition`、`tests/presets`。
- **前置**：**BUG-034/035 相关改动先落地**（另一个 Agent 在飞；工作树里已涉及 SA/SQA preset/skills/tests/probes/bug 卡/Note）；否则同一批文件会冲突。
- **出口**：`pnpm test tests/presets`；`preset-smoke`；五层行为场景（与 B2 共用一次真跑）。
- **不做**：checker/命令（A5/A6）。

### C3 编号校验器与命令

- **结果**：`/req check` 能对一份动议判红/绿，索引可派生；V2/V4/V11 有结果。
- **范围**（本节列的是**待建**文件，A5/A6 执行时才有；未建的只写文件名不写路径，避免被当作现存的活指针）：`src/lib/requirements-check.ts`、`src/host/commands/req-command.ts`、`src/index.ts`、现存 `host-composition.spec`；待建 spec = requirements-check.spec.ts / req-command.spec.ts（均落 tests/host/）。
- **出口**：keyless 单测（红证：重复定义/悬空/退役词/孤儿各一）；命令测试；lab 夹具（V2 重键、V4 负例、V11 试跑）结果。
- **不做**：旧盘迁移（A7）、跨动议键。

### C4 范围、豁免与存量迁移

- **结果**：旧动议不红；新动议带 marker 才查；dev 盘 `process-docs` 迁移有备份；发布版有升级说明。
- **范围**：`meta.md` 模板与 parser/gate、checker 的 scope 读取、`company-workspace/.dsh-company/kb/process-docs.md`（手动迁移）、`bootstrap`/`release-smoke`。
- **出口**：旧盘 scanned=skipped；新盘首启 seed；`pnpm test tests/company`；`release-smoke`。
- **不做**：重写旧动议的历史文件。

## 5. 验证门（共识 §7 的落地版）

| 门 | 内容 | 何时跑 | 成本 |
|---|---|---|---|
| **V1 词表盲测** | 只给裸 token（`MR/REQ/IF/TC` vs `STR/SYR/IFR/VP`），问第一先验；不改代码 | A1/A2 开工前 | 1 次模型调用 |
| **V2 重键** | 用 lab 的 16 STR / 33 SYR / 22 IFR 试“同一物不会两个号”；只做映射表，不改历史 | A5 | keyless |
| **V4 负例** | 同一号既有定义又有提案/重复定义/悬空/退役词，checker 必须红 | A5 | keyless |
| **V11 试跑** | lab 的 22 条 IFR 过 R1–R9 检查点 | A5 | keyless |

## 6. 陷阱与排除

- **旧实现不是资产清单**：`65b6917` 的模板/checker 可参考，但它的 `STR/SYR/IFR` 层前缀与“6 个空间”已被共识推翻；直接 cherry-pick 会把方向带回去。
- **PRD 模板同源测试**：[prd-check.spec](../../../../tests/lib/prd-check.spec.ts) 要求 `content/templates/{mrd,prd}.md` 的示例直接过 `validateProductDocs`；改模板必须同步跑它。
- **文档预算**：`docs/contracts/presets.md`、`docs/contracts/delegation.md` 已顶格；改文档先搬后写，别先提额。
- **在飞冲突**：BUG-034/035 相关改动正由另一个 Agent 处理中（工作树里已涉及 SA/SQA preset/skills/tests/probes/bug 卡/Note）；A4a/A4b/B1 必须等它落地，不能混 diff。
- **不做**：第六/第七条汇报线、SA/SQA 独立汇报线、vendor 改动、UI 角色徽标/委派卡 key、发布版本号（按需）。

## 7. 与共识的边界

本材料不改变共识；共识 §6 的参数级未定项仍在 A1/A5/A7 落地时逐项拍板。共识 §7 的“实施需另起 issue 或 RFC”由[落地拆法卡](../../settled_issues/2026-11-07-requirements-teaming-landing.md)的 10 张执行卡（推荐 11）承接；**本材料与拆法卡都不是实施授权。**
