---
status: 推敲中
opened: 2026-11-07
---

# 推敲：需求识别/编号与 VP-Eng 组队的落地拆法

> 立卡：2026-11-07 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 毕业：未定 ｜ 可关闭：否
>
> **结论/去向**：待用户拍板拆法；本卡只做落地拆法与风险评审，不授予实施。

**问题与期望结果：** 用户 2026-11-07 要求把[需求识别与编号研究](../research/requirements-identification-numbering/2026-11-07-consensus.md)的结论落地，并让 VP-Eng 能组队解决研发问题——简单的事自己做，复杂的事依赖 CMO/SA/SQA，产出 MRD/PRD 与细节；同时不能破坏 CEO 已有的组队能力。期望本轮推敲完成 = **一张可评审的拆卡表**（几张、每张的结果/依赖/出口证据）+ 需要用户拍板的决策。**本轮不动 `_backlog/` 之外的任何文件。**

**当前情况：** 已确认；详细证据 = 两份研究材料。

- **编号**：共识的结构成立，但落地有四个冲突：① PRD 模板同时用 JSON 账本和 `### REQ-001` 当定义点（违反 R4）；② 旧 workspace 的 `kb/process-docs.md` 仍写 `STR/SYR/IFR`，pack 里没有新合同；③ 旧盘有 `V-` 659 / `VP-` 71 / `VR-` 75 处、reflog 里还躺着上一轮实现；④ R10 的强制点、§6 的状态位/层序/并发/范围未拍。详见[落地拆法材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。
- **VP-Eng 组队**：keyless 实测证明 `vp-eng` 根会话的 `agentTeam` 投影就是 `{name:"lead", role:"lead"}`；teammate 继承 Lead 的 preset（既有 CEO teammate 日志首帧 `agentPreset:"ceo"`）；命名 child 才由 `agentPreset` 给人格；`spawn_teammate` 只有 Lead 能调。⇒ **VP-Eng 根门可以带“同组合的研发小队”，不能把 CMO/SA/SQA 拉成 teammate**；跨角色依赖走命名委托。详见[三门材料](../research/vp-eng-teaming/2026-11-07-three-doors.md)。
- **在飞冲突**：BUG-034/035 正由另一个 Agent 处理中；工作树里已涉及 SA/SQA 的 preset、skills、`tests/presets`、probes、bug 卡与 Note（不止三个文件）。A4（SA/SQA 角色产出）会碰同一批文件，**必须等它落地后再动，不能混 diff**。

**建议拆法（执行级 10 张；本卡批准后才建）：**

| # | 卡（结果） | 主要范围 | 依赖 | 出口证据 |
|---|---|---|---|---|
| **A1** | 编号合同 + 范围标记 | `content/state/process-docs.md`（R1–R10、退役词、范围/豁免、并发）、`meta.md` 的 `编号体系/需求层`、手册指针、`base-clean`/`company-skeleton` | — | V1 词表盲测；`pnpm verify`；内容 tests |
| **A2** | 五层模板 | `templates/{mrd,prd,strs,syrs,irs,allocation}.md`；`layer/definition` 头；PRD 唯一定义点；模板同源 | A1 | `pnpm verify`；`prd-check.spec`；模板 tests |
| **A3** | CMO/VP-Eng 角色产出 | CMO（MRD+StRS）、VP-Eng（PRD only）、共享 `product-definition` | A1/A2；BUG-034/035 | `pnpm test tests/presets`；`preset-smoke` |
| **A4** | SA/SQA 角色产出 | SA（SyRS+IRS+架构+验证点，去 `VP-###`）、SQA（TC+V&V+独立结论） | A1/A2；BUG-034/035 | `pnpm test tests/presets`；`preset-smoke` |
| **A5** | 校验器纯逻辑 + 夹具 | R1–R9、定义形态、悬空/重复/退役/孤儿/覆盖/计数；V2/V4/V11 | A1/A2 | keyless 单测（含红证）；lab 夹具结果 |
| **A6** | `/req` 命令 + 强制点 | host 命令、`src/index.ts` 注册、`host-composition.spec`、操作员流程 | A5 | 命令 tests；真跑 |
| **A7** | 旧盘迁移/升级 | workspace `process-docs` 迁移、旧动议只读豁免、bootstrap seed、`release-smoke` | A1/A5/A6 | 旧盘 skipped；新盘 seed；`release-smoke` |
| **A8** | 五层真跑 E2E | MRD→StRS→PRD→SyRS→IRS→TC 一轮；checker 绿；SQA 结论原样 | A3/A4/A5/A6 | 真跑证据；`pnpm verify`/`pnpm test` |
| **B1** | VP-Eng 组队能力 + 合同修正 | `vp_cmo` 行、`eng-teaming` skill、persona、`delegation/presets/handbook/CultivationBoard` | A1/A3/A4；BUG-034/035 | presets tests；`preset-smoke`；根=Lead 探针 |
| **B2** | VP-Eng E2E + CEO 回归 + 收口 | 真模型整包 E2E；`product-team-e2e-smoke`；Note/D57/D58/docs/归档 | B1/A8 | E2E 绿；CEO smoke 绿；Note/归档 |

**粒度说明：** 6 张是“结果级”视图（合同/模板、角色、校验器、迁移、E2E、组队+收口）；上面 10 张是“执行级”视图——A1/A2/A3/A4/A5/A6/A7 都能独立验收、独立回滚。**我的推荐是 A4 再拆成 A4a SA / A4b SQA（→ 11 张）；B1 不拆**——B1 的文档/手册必须与行为同 diff，拆开会违反合同层同 diff 规则。SA/SQA 的 E/V 独立性、BUG-034/035 在飞，是 A4 必须拆的理由。

**为什么不是 6：** 6 张结果卡会把 A1–A7 压成 3 张，单卡横跨 content/presets/host/tools/gates 五层，验收和回滚都说不清——CMO 那次就是“一张大卡 + 后面五轮补面”。10 张不是把任务切碎：每张有独立结果、独立可跑的出口证据；实现仍是每卡 1–3 个 commit。

**顺序：** A1 → A2 →（A3 ∥ A4）→ A5 → A6 → A7 → A8 → B1 → B2。A4 等 BUG-034/035；A3 可以先动。B1 可在 A8 前后插，但 B2 必须等 A8 + B1。

**范围：** 本卡只产出拆法与两份研究材料；不实施、不建执行卡、不改 `_backlog/` 外文件。

**排除：** 第六/第七条汇报线；给 SA/SQA 加独立汇报线；vendor 改动（`spawn_teammate` 加 preset 是上游的事）；UI 角色徽标/委派卡 key（现有回退够用，另卡再说）；发布版本号（A8/B2 收口时按需）。

**未决问题（我的推荐，逐条可否决）：**

| # | 决策 | 我的推荐 | 理由 | 反选代价 |
|---|---|---|---|---|
| D1 | 粒度 | **11 张**：10 基线 + A4 拆 A4a SA / A4b SQA；B1 不拆 | SA/SQA 是 E/V 独立性的两半，验收不同；B1 文档必须与行为同 diff | 10 张：A4 两个角色混验收；12 张：A3 按角色拆，MRD→PRD 交接被切碎 |
| D2 | V1 词表 | **跑**，1 次盲测；先定规则：只有“第一先验撞车”（如 `VP` 撞 `VP-Eng`）才换词，否则保留 `MR/REQ/IF/TC` | 唯一能推翻词表的未定项；成本 1 次调用 | 不跑：词表靠判断，后面改词要动 A2/A3/A4 |
| D3 | 组队边界 | **MRD/StRS 归 CMO**；VP-Eng 根门牵头整包，`vp_cmo`/SA/SQA 命名委托；SQA 原样 | owner 唯一性是手册硬条款；根门是唯一“带 team + 拉专家”的门 | VP-Eng 亲自写 MRD：动组织级 owner 规则，另开卡；本期不做 |
| D4 | 范围/豁免 | **marker + 旧动议豁免**；dev `process-docs` 手动迁移 + 备份；新动议 kickoff ≥ 落地日 | 旧盘 659 V / 71 VP / 75 VR，全量回扫必红；不重写历史 | 全量回扫：历史永久红；不迁移：dev 盘两套词表继续漂 |
| D5 | PRD 定义形态 | **JSON 账本唯一定义点**；正文 `### REQ-001` 改成引用标题 | `/prd check` 已依赖 JSON；改写标题的 checker 是更大改动 | 只留标题：要重写 prd-check + 模板 + 测试；JSON 的 slice/AC/changeLog 要另找家 |
| D6 | 状态 | **保留 PRD 生命周期，加映射**：draft→草案，ready/in-dev/accepted→生效，withdrawn→作废，deferred→草案（不生效） | 不破坏 `/prd check` 状态机；编号状态只回答“定义/生效/作废” | 新增第二个状态字段：模板/角色/checker 都要记两个状态，易漂 |
| D7 | `vp_cmo` | **只加在 vp-eng，maxDepth 2**；CEO 的 `vp_cmo` 保持 1 | 根门/命名 child 够得到 depth 2；CEO team 里的 VP-Eng teammate 是已知限制 | 改 CEO 的 maxDepth：CEO 团队边界变动，收益小 |
| D8 | BUG-034/035 | **A4/B1 硬前置；A1/A2/A3/A5 可先动**；不碰那批文件 | 另一个 Agent 在飞；同文件混 diff 必冲突 | 不等：SA/SQA skill 与 tests 冲突，返工 |

**以上是我的推荐；你只需否决你不认同的条，其余我按推荐定稿。**

**附：CEO 组队不动的三条硬证据**：B2 必跑 `product-team-e2e-smoke`；CEO 的 `vp_cmo` maxDepth 保持 1；两件套 MRD+PRD 仍走 CEO team，不走 `vp_*` 快捷。

**下一步：** 你确认 D1–D8 后，我按 11 张（或你选的粒度）建卡；先建 A1/A2/A5 探路，跑 V1；**不动产品代码。**
