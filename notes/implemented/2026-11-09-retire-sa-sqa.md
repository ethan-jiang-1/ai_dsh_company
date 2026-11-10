# 2026-11-09 · 退役 system-architect / system-qa presets

状态：implemented（2026-11-09 交付；SA/SQA preset、父级委托行、模型 specialist、support/patch、文档/测试/探针同步删除；worker family 保留）

上游 = [归档问题卡](../../_backlog/_archive/settled_issues/2026-11-09-retire-sa-sqa.md)；
被取代 = [worker-family/specialist 边界 Note](../archived/2026-11-09-specialist-worker-taxonomy.md)（SA/SQA specialist 部分）。

## 问题

前一轮把 `system-architect` / `system-qa` 升成 `specialist`，但用户明确要求**清理这两个旧 preset**：它们是旧思路的专职 V 模型子人格，不应继续与 worker family 并存。保留 specialist 会让模型/文档继续维护一套不再需要的身份与 veto 语义。

## 决定

1. 删除两份 system-architect / system-qa preset 目录（含 skills）。
2. 删除 CEO / vp-eng 的 `system_architect` / `system_qa` 命名委托行；`namedDelegates` / `namedProfiles` / `depthRows` 同步。
3. 删除 package patch、`COMPANY_SUPPORT_PRESET_IDS`、`PRESET_IDS` / `SUPPORT_PRESET_IDS`、`COMPOSITIONS` 中的两项。
4. 删除 `specialist` archetype、`skills` / `authority` 字段与校验；模型回到 `lead / full / worker`。
5. 保留 worker family：`worker` / `worker-researcher` / `worker-orchestrator`；`worker-researcher` 继续只读、named-only。
6. SyRS / IRS / V&V 文档不再有专职 preset；保留为**可选文档**，若 CEO 指派 owner，owner 写在文档头；默认产品定义链 = MRD → StRS → PRD。
7. 同步从 `docs/contracts/presets.md` / `docs/contracts/delegation.md` / `docs/contracts/profile.md` / `docs/project-map.md` / `README` / `content/AGENTS` / process-docs / templates / tests / checks / probes 清理 SA/SQA 引用；SA/SQA 专用 probes 删除，`vp-eng-workflow-probe` 只保留 workflow A 题。

## 输掉的方案

- **B：保留 specialist（sa/sqa）**。用户已明确要清理旧 preset；specialist 仍会维护 V 模型/ veto 身份，和“worker family”并存。
- **C：把 SA/SQA 折成 worker profile**。会保留“V 模型/独立 veto”职责但用 worker 包装，仍是旧语义；用户要的是清掉。
- **D：保留目录但删父行**。死 preset 留在包里，picker/文档/测试继续困惑；本次明确要删目录。

## 后果

- 公司不再有 SA/SQA 两个命名 child，也没有 SQA veto 直达 CEO 的运行时路径。
- 默认产品定义链缩为 MRD → StRS → PRD；SyRS/IRS/V&V 是可选文档，没有专职 owner。
- worker family 仍是三类；`worker-researcher` 保持只读、named-only。
- 历史 Note/issue 保留在 archived，当前文档不再声称 SA/SQA 存在。

## 验证

实跑（2026-11-09）：

- `pnpm test tests/presets`：**73 passed**（content 39 / model 9 / composition 15 / retry 6 / contract 4）。
- 红配方：把旧 `system_architect` 行临时加回 CEO → `delegation-composition` 的 `namedProfiles` **1 failed**；还原 → **73 passed**。
- `preset-smoke`：**6 角色 + 3 support ALL PASS**。
- `pnpm test`：**1297 / 163 files**；`pnpm typecheck` 绿；`pnpm lint` 0/0；`pnpm dup` 0 clones；`pnpm verify` **ALL PASS**。
- 无 SA/SQA preset 目录/patch/support/model 残留；`rg` 活跃面只剩历史/退役说明与可选 SyRS/IRS/V&V 文档。
- UI 代码未改；`ui-scene --isolated --golden` 重跑 **ALL PASS（9 页签）**；preset picker 少两项，页面不枚举 support。

## 未验 / 边界

- 没有对“删除 SA/SQA 后长链项目行为”做真模型 E2E；这是预期能力移除，不是回归。P-L（worker-researcher）仍有效。
- SyRS/IRS/V&V 的模板/checker 保留为可选工具，但没有 preset owner；若未来需要，另开 worker/specialist 设计。
- `docs/reference/decisions.md` D59 已标退役；旧 SA/SQA Notes 已归档，历史证据保留。

## 相关

- 退役归档卡：[2026-11-09-retire-sa-sqa](../../_backlog/_archive/settled_issues/2026-11-09-retire-sa-sqa.md)。
- 前序（被取代）：[worker/specialist 边界](../archived/2026-11-09-specialist-worker-taxonomy.md)。
- 旧 SA/SQA Notes：[subpersonas](../archived/2026-11-06-sa-sqa-subpersonas.md)、[evidence-chain](../archived/2026-11-07-sa-sqa-evidence-chain.md)、[capability-routing](../archived/2026-11-08-sa-sqa-capability-routing.md)。
