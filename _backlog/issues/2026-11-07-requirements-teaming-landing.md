---
status: 待落地
opened: 2026-11-07
---

# 落地：需求识别/编号与 VP-Eng 组队的程序伞卡

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：note — 程序 Note `2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/）。

**问题与期望结果：** 用户 2026-11-07 要求把[需求识别与编号研究](../research/requirements-identification-numbering/2026-11-07-consensus.md)的结论落地，并让 VP-Eng 能组队解决研发问题——简单的事自己做，复杂的事依赖 CMO/SA/SQA，产出 MRD/PRD 与细节；同时不能破坏 CEO 已有的组队能力。期望本轮推敲完成 = **一张可评审的拆卡表**（几张、每张的结果/依赖/出口证据）+ 需要用户拍板的决策。**本轮不动 `_backlog/` 之外的任何文件。**

**当前情况：** 已确认；详细证据 = 两份研究材料 + [卡集审计](../research/requirements-identification-numbering/2026-11-07-issue-set-audit.md)（21 项问题/修正/剩余风险）+ [V1/V2/V4/V11 验证](../research/requirements-identification-numbering/2026-11-07-validation-trial.md)（已跑原型）。

- **编号**：共识的结构成立，但落地有四个冲突：① PRD 模板同时用 JSON 账本和 `### REQ-001` 当定义点（违反 R4）；② 旧 workspace 的 `kb/process-docs.md` 仍写 `STR/SYR/IFR`，pack 里没有新合同；③ 旧盘有 `V-` 659 / `VP-` 71 / `VR-` 75 处、reflog 里还躺着上一轮实现；④ R10 的强制点、§6 的状态位/层序/并发/范围未拍。详见[落地拆法材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。
- **VP-Eng 组队**：keyless 实测证明 `vp-eng` 根会话的 `agentTeam` 投影就是 `{name:"lead", role:"lead"}`；teammate 继承 Lead 的 preset（既有 CEO teammate 日志首帧 `agentPreset:"ceo"`）；命名 child 才由 `agentPreset` 给人格；`spawn_teammate` 只有 Lead 能调。⇒ **VP-Eng 根门可以带“同组合的研发小队”，不能把 CMO/SA/SQA 拉成 teammate**；跨角色依赖走命名委托。详见[三门材料](../research/vp-eng-teaming/2026-11-07-three-doors.md)。
- **已解决依赖**：BUG-034/035 已修（commit 7da331a，卡归档到 `fixed_bugs/`）；A3/A4a/A4b/B1 解锁。`tests/presets` 仍是同文件，按 A3→A4a→A4b→B1 串行改。

**执行卡（11 张；已建，按 D1 推荐拆）：**

| # | 卡 | 结果 | 依赖 |
|---|---|---|---|
| **A1** | [编号合同与范围标记](2026-11-07-requirements-contract.md) | process-docs / meta marker / 门禁 | — |
| **A2** | [五层模板](2026-11-07-requirements-templates.md) | 六个模板 + `layer/definition` 头 + PRD 唯一定义点 | A1 |
| **A3** | [CMO / VP-Eng 产出](2026-11-07-requirements-cmo-vpeng.md) | CMO MRD+StRS；VP-Eng PRD only | A1/A2；BUG-034/035（tests/presets） |
| **A4a** | [SA 产出](2026-11-07-requirements-sa.md) | SyRS+IRS+架构+验证点；去 `VP-###` | A1/A2；BUG-034/035 |
| **A4b** | [SQA 产出](2026-11-07-requirements-sqa.md) | TC+V&V+独立结论 | A1/A2；BUG-034/035 |
| **A5** | [校验器纯逻辑](2026-11-07-requirements-checker.md) | R1–R9 / 索引 / V2/V4/V11 | A1/A2 |
| **A6** | [`/req check` 命令](2026-11-07-requirements-command.md) | host 命令 + 命令集 | A5 |
| **A7** | [旧盘迁移/豁免](2026-11-07-requirements-migration.md) | seed/skip、旧动议豁免、升级面 | A1/A5/A6 |
| **A8** | [五层真跑 E2E](2026-11-07-requirements-e2e.md) | MRD→…→TC 一轮；checker 绿 | A3/A4a/A4b/A5/A6 |
| **B1** | [VP-Eng 组队能力](2026-11-07-vpeng-teaming.md) | `vp_cmo` + `eng-teaming` + 合同修正 | A1/A3/A4a/A4b；BUG-034/035 |
| **B2** | [VP-Eng E2E + 收口](2026-11-07-vpeng-evidence-closeout.md) | 整包 E2E + CEO 回归 + Note/归档 | B1/A8 |

**粒度说明：** 6 张是“结果级”视图（合同/模板、角色、校验器、迁移、E2E、组队+收口）；11 张是“执行级”视图。A4 拆 A4a/A4b 是因为 SA/SQA 是 E/V 独立性的两半、验收不同；B1 不拆是因为文档/手册必须与行为同 diff。每张卡都带 `## 验收标准` + `## 测试资产`（方法 = `validation-design` / `validation-evidence`），A1/A2/A3/A4a/A4b/A5/A6/A7 都能独立验收、独立回滚。

**为什么不是 6：** 6 张结果卡会把 A1–A7 压成 3 张，单卡横跨 content/presets/host/tools/gates 五层，验收和回滚都说不清——CMO 那次就是“一张大卡 + 后面五轮补面”。11 张不是把任务切碎：每张有独立结果、独立可跑的出口证据；实现仍是每卡 1–3 个 commit。

**顺序：** A1 → A2 → A5 → A6 →（A3/A4a/A4b 等 BUG-034/035）→ A7 → A8 → B1 → B2。A1/A2/A5 可先动；A3/A4a/A4b/B1 已解锁，**串行改同一 `tests/presets`**（A3→A4a→A4b→B1），避免同文件冲突。

**范围：** 本卡是程序伞卡；11 张执行卡已建（见上表）。本卡不实施、不改 `_backlog/` 外文件。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| 11 张执行卡全部收口 | 编排 | 11 张卡的验收表 | 每张卡 `## 验收标准` 全绿 + `## 测试资产` 在场 | 任一卡红 → 程序不关闭 | 11 张卡 + 本卡 | 用户 review 程序 Note |
| A8 五层真跑 + B2 VP-Eng E2E | 模型行为 | 排练场真模型 | 两份 probe 绿；checker 绿 | 缺 SQA/TC → 红 | `requirements-chain-probe.mjs`（待建，落 probes/team/） / `vp-eng-teaming-probe.mjs`（待建，落 probes/team/） | 用户 review 产物 |
| CEO 组队不动 | 模型行为/编排 | CEO 两件套 | `product-team-e2e-smoke` 绿 | 红 = 破坏 | 现有 smoke | 无（自动） |
| 程序 Note / D57 / D58 | 文档形状 | `2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/） + decisions | `pnpm verify` + `pnpm notes:audit` | 缺路由/D 号 → 红 | 本卡 + `pnpm verify` | 用户 review Note |

> 每张执行卡的测试资产见该卡 `## 测试资产`；本卡不另造测试。

**排除：** 第六/第七条汇报线；给 SA/SQA 加独立汇报线；vendor 改动（`spawn_teammate` 加 preset 是上游的事）；UI 角色徽标/委派卡 key（现有回退够用，另卡再说）；发布版本号（A8/B2 收口时按需）。

**已批准口径（2026-11-07，按推荐）：**

| # | 决策 | 我的推荐 | 理由 | 反选代价 |
|---|---|---|---|---|
| D1 | 粒度 | **11 张**：10 基线 + A4 拆 A4a SA / A4b SQA；B1 不拆 | SA/SQA 是 E/V 独立性的两半，验收不同；B1 文档必须与行为同 diff | 10 张：A4 两个角色混验收；12 张：A3 按角色拆，MRD→PRD 交接被切碎 |
| D2 | V1 词表 | **跑**，1 次盲测；先定规则：只有“第一先验撞车”（如 `VP` 撞 `VP-Eng`）才换词，否则保留 `MR/REQ/IF/TC` | 唯一能推翻词表的未定项；成本 1 次调用 | 不跑：词表靠判断，后面改词要动 A2/A3/A4 |
| D3 | 组队边界 | **MRD/StRS 归 CMO**；VP-Eng 根门牵头整包，`vp_cmo`/SA/SQA 命名委托；SQA 原样 | owner 唯一性是手册硬条款；根门是唯一“带 team + 拉专家”的门 | VP-Eng 亲自写 MRD：动组织级 owner 规则，另开卡；本期不做 |
| D4 | 范围/豁免 | **marker + 旧动议豁免**；dev `process-docs` 手动迁移 + 备份；新动议 kickoff ≥ 落地日 | 旧盘 659 V / 71 VP / 75 VR，全量回扫必红；不重写历史 | 全量回扫：历史永久红；不迁移：dev 盘两套词表继续漂 |
| D5 | PRD 定义形态 | **JSON 账本唯一定义点**；正文 `### REQ-001` 改成引用标题 | `/prd check` 已依赖 JSON；改写标题的 checker 是更大改动 | 只留标题：要重写 prd-check + 模板 + 测试；JSON 的 slice/AC/changeLog 要另找家 |
| D6 | 状态 | **保留 PRD 生命周期，加映射**：draft→草案，ready/in-dev/accepted→生效，withdrawn→作废，deferred→草案（不生效） | 不破坏 `/prd check` 状态机；编号状态只回答“定义/生效/作废” | 新增第二个状态字段：模板/角色/checker 都要记两个状态，易漂 |
| D7 | `vp_cmo` | **只加在 vp-eng，maxDepth 2**；CEO 的 `vp_cmo` 保持 1 | 根门/命名 child 够得到 depth 2；CEO team 里的 VP-Eng teammate 是已知限制 | 改 CEO 的 maxDepth：CEO 团队边界变动，收益小 |
| D8 | BUG-034/035 | **已修（7da331a，卡归档）**；A3/A4a/A4b/B1 解锁；A1/A2/A5 可先动；`tests/presets` 串行改 | 修复已落；同文件仍需串行 | 不需要再等；只需串行 |

**以上已按推荐批准（2026-11-07）；执行卡见上表。**

**附：CEO 组队不动的三条硬证据**：B2 必跑 `product-team-e2e-smoke`；CEO 的 `vp_cmo` maxDepth 保持 1；两件套 MRD+PRD 仍走 CEO team，不走 `vp_*` 快捷。

**下一步：** 从 A1/A2/A5 开始；V1 已在盲测中跑过（词表 A 胜出）；A3/A4a/A4b/B1 已解锁；**不动产品代码。**

## 程序 Note 结构（单 owner = 本卡）

1. **决定**：ID 只承载身份；层归文档 + `definition` 形态；范围 marker + 旧盘豁免；VP-Eng 根门组队 + 命名委托。
2. **输掉的方案**：D1–D8 的反选代价；旧层前缀（STR/SYR/IFR）；把 CMO/SA/SQA 做成 teammate。
3. **落地**：A1–A8/B1/B2 的提交/路径。
4. **验证**：V1 盲测、V2/V4/V11 trial、A8/B2 真跑（待）、`pnpm verify`/`pnpm test`。
5. **剩余风险/未验**。
6. **上游卡**：本卡 + 研究题。

B2 只追加证据，不另写 Note；某卡若偏离伞卡，在 Note 加节或另开 Note，不静默改。

## 关闭条件

- 11 张执行卡全部收口；程序 Note 落 `2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/）；D57/D58、docs 与归档完成；伞卡翻 `已结`。
