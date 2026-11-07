---
status: 待落地
opened: 2026-11-07
---

# 落地：五层真跑 E2E（MRD→StRS→PRD→SyRS→IRS→TC）

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；真跑证据并入程序 Note 验证节 `2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/）（伞卡）；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[编号共识](../research/requirements-identification-numbering/2026-11-07-consensus.md) / [落地材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)；[探针规格](../research/requirements-identification-numbering/2026-11-07-probe-specs.md)。

**问题与期望结果：** 一轮真模型产出五层 docs + TC；checker 绿；`traces` 可解析；SQA TC 覆盖；证据落盘。

**范围：** 新 `requirements-chain-probe.mjs`（待建，落 probes/team/）；`checks/INDEX.generated.md`；可复用 `probes/team/sa-sqa-delegation-probe.mjs`/`sa-sqa-quality-audit.mjs`。

**依赖：** A3/A4a/A4b/A5/A6。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `_backlog/methods/requirements-probes.md`：真模型证据；长证据进编号研究材料，短结论回本卡。
- 真模型/真浏览器不进 `pnpm test`（测试宪法）。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| 真模型产出 MRD/StRS/PRD/SyRS/IRS/TC；ID 唯一；checker 绿 | 模型行为 | 排练场真模型 | probe 绿 + checker 绿 | 缺 TC → checker 红 | 新 `requirements-chain-probe.mjs`（待建，落 probes/team/） + A5 | 用户 review 产物 |
| `traces` 全解析；SQA TC `covers` | 确定性 | 产物 docs | checker | 悬空 → 红 | A5 | 无 |
| SQA 结论原样 | 模型行为 | probe 断言 | probe 绿 | 删结论 → 红 | probe + `sa-sqa-quality-audit` | 用户 review |
| 不破坏 `pnpm verify`/`pnpm test` | 门禁形状 | repo | verify/test 绿 | 红 | `pnpm verify`/`pnpm test` | 无 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 整链 | 新 probe（`probes/team` 现有形状；头注触发/成本） | `node probes/team/requirements-chain-probe.mjs` | 真模型产物 | 一般可靠性 | 缺文档 → 红 |
| checker | A5 spec + A6 命令 | A6 命令 | 判红 | 语义 | 坏 fixture → 红 |
| 质量审计 | 既有 `probes/team/sa-sqa-quality-audit.mjs` | 对应 probe 命令 | SQA 质量 | 本链 | 质量问题 → 红 |
| 索引 | `checks/INDEX.generated.md` | `node tools/checks-index.mjs --write` + `pnpm verify` | 库存新鲜 | 内容 | 忘写 → 红 |

**资产边界：** 只证这一轮的真实产物与 checker 判据；不证一般可靠性、不证业务价值（用户 review）。真模型成本约 5–10 分钟，不进 `pnpm test`。

## 排除

VP-Eng 组队（B1/B2）；跨动议键。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。
