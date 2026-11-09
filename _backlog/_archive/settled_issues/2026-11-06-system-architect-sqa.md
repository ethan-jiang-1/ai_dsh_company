---
status: 已结
opened: 2026-11-06
---

# 推敲：给 VP-Eng 加两个专职子人格——系统架构师（SA）与系统质量保证（SQA·V&V）

> 立卡：2026-11-06 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 2026-11-06（用户同日拍定档位/名字/SQA 否决线，本卡一次性交付）
>
> **结论/去向**：note — [SA/SQA 子人格 Note](../../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)

**问题与期望结果：** 真实项目落地（不是 demo）时，VP-Eng 一个人既做硬软一体架构、又做需求验证，
E（工程）与 V（验证）在同一上下文里，质量不独立。期望：VP-Eng 在落地项目里能启动两个**独立上下文**
的帮手——系统架构师（System Architect，SA）与系统质量保证（System Quality Assurance，SQA·V&V）——
按 **V 模型**分工：SA 负责左侧（系统需求→架构→子系统/接口），SQA 负责右侧（单元/集成/系统/验收、
独立评审 E 侧产物、质量否决）。本轮推敲完成 = 名字、档位（角色 vs 子人格）、独立性规则、完整面清单
四项定下来，并写出可执行的验收标准。

**当前情况（已确认，证据在 [面清单材料](../research/role-addition/2026-11-06-cmo-surface-map.md)）：**

- CMO 是**角色级**新增：9 个提交、97 个文件（pack 32 / tools 6 / tests 15 / checks 11 / docs 16 /
  市场索引 2 / notes 2 / probes 5），五轮矩阵扫描才收干净。**面清单已按 16 个面写死**，逐条标了
  「B 档（子人格）需要吗」。
- `researcher` 是现成的**子人格档**先例：有 preset、进 `COMPANY_SUPPORT_PRESET_IDS`，
  但**不进** `COMPANY_ROLE_IDS`、不进编制/在场板/署名；presets 门禁与 preset-smoke 会自动覆盖。
- 机制边界（已实证）：`spawn_teammate` **只有 Lead 能调**且无 preset 参数（成员继承 Lead 人格；
  今日实测成员 `agentPreset: "ceo"`、`delegationDepth: 1`）；命名 subagent 行可带 `agentPreset`，
  深度由行上 `maxDepth` 控制。⇒ **VP-Eng 要自己起 SA/SQA，只能走命名 subagent 通道 + `maxDepth: 2`**。

**未决问题（需要用户拍的）：**

1. **名字**：`system-architect`（显示「梦之队 系统架构师（SA）」）/ `system-qa`（显示「梦之队
   系统质量保证（SQA · V&V）」）是否照定？工具名 `system_architect` / `system_qa`。
2. **档位**：子人格档（`researcher` 同款，推荐）还是角色档（第七/第八条汇报线，CMO 同款面）？
3. **SQA 的独立性**：挂 VP-Eng 条线但 **veto 直达 CEO**（推荐），还是独立汇报线？
4. **署名**：SA/SQA 的稿署自己（要改 `authorship`）还是署 VP-Eng 并注明分工（一期推荐）？
5. **触发判据**：谁判定「这是落地项目」——用户点名 / VP-Eng 自判 / CEO 写进任务书？

**下一步：** 用户答 1–5 后，本卡翻 `待落地`（毕业：做）并写 `## 验收标准`；实施按面清单 1–16 逐条勾，
先出一期（两个 preset + 委托行 + 深度 2 + 断言 + 一次真模型 E2E），二期再补 V 模型模板与质量闸门。

## 范围与排除项

- 范围：`packages/company-pack/presets/{system-architect,system-qa}/`、CEO/vp-eng preset 的委托行、
  `tools/lib/company-roles.mjs` 的 support list、presets 门禁/preset-smoke/delegation-smoke、
  `docs/presets.md`/`docs/delegation.md`、内容模板与手册、Note。
- 排除：新增第七/第八条汇报线（除非用户选角色档）；`vendor/dsh` 改动（`spawn_teammate` 加 preset
  是上游的事，不在此卡）；demo 路径（`vp_*` 快捷委托不动）；SA/SQA 的 kb charter 与独立 journal（二期）。

## 已知与未决

- 已知：深度 2 需要 `maxDepth` 在**行上**显式写；成员会话的工具面继承 Lead 的 preset，所以委托行
  要同时放 CEO preset（成员才拿得到）与 vp-eng preset（根会话/命名委派场景）。
- 已知：子人格会话若在 UI 里被打开，`RoleBadge` 需要颜色/标签，否则显示「未知角色」（面清单第 8 面）。
- 未决：SA/SQA 是否出现在任务板 owner 列（若走子人格，任务仍归 VP-Eng，SA/SQA 只在 VP-Eng 的
  子任务里出现）——需要 1 条规则写清，否则「谁负责」会漂。
- 未决：成本——一次落地项目多两个子代理，token 与时长上升；是否只在「落地」触发（见未决 5）。

## 验收标准（已达成）

1. `presets/system-architect` 与 `presets/system-qa` 声明文件 + 各 ≥1 skill 在场；
   `pnpm verify` 的 `presets ×6 + 子人格 ×N` 计数与目录一致。
2. `COMPANY_SUPPORT_PRESET_IDS` 含两者；`preset-smoke` 真挂载 **ALL PASS**。
3. CEO 与 vp-eng preset 各有 `system_architect` / `system_qa` 委托行且 `maxDepth: 2`；
   keyless 断言钉住（深度/agentPreset/工具名）。
4. 真模型 E2E：VP-Eng（团队成员，depth 1）在落地项目里起 SA + SQA；日志证明**两个独立会话**
   （不同 sessionId、各自 preset），SA 出架构稿、SQA 出 V&V 计划且对 E 侧产物给出独立结论；
   面板/交付物可见。
5. `pnpm typecheck` / `pnpm test` / `pnpm verify` / `delegation-smoke` / `release-smoke` 全绿；
   面清单 1–16 逐条勾完（未做的写排除项），同 diff 落 Note 并归档本卡。

## 交付证据

- 提交：SA/SQA 两 preset + 委托行 + `preset-bundle` 门禁 + presets/typecheck/test/verify 全绿；
  Note = [2026-11-06-sa-sqa-subpersonas.md](../../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)。
- 真模型 E2E = `probes/team/sa-sqa-delegation-probe.mjs`（305s，两子会话 preset 正确、depth=2、同一 parent）。
- 面清单（16 面）与 CMO 实证 = [研究题](../research/role-addition/README.md)。
