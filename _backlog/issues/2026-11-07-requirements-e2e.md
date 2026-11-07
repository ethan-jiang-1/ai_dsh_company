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

## 交付证据

- 基线：`git rev-parse HEAD` = `33b3273`（A7 提交后）
- **第 1 次真跑（2026-11-07 18:02–18:22，20min 墙）**：`session-0197f368-6fc3-492a-9028-19c39bbe983c`，slug `2026-11-07-recon-bank-autorecon` → C1 5/6（缺 `vv-plan.md`）；SA 的 syrs/irs 已落、SQA 子会话 18:18 才创建（被墙钟切断）。判据真红，不是环境错。
- **第 2 次真跑（重跑 1 次；2026-11-07 18:24–18:44，30min 墙，SQA 并行）**：`session-7e9ddc07-8722-405b-b22d-9fcf279129ef`，slug `2026-11-07-recon-bank-autorecon-v2` → **ALL PASS**：
  - C1 五层 + V&V：`mrd/strs/prd/syrs/irs/vv-plan` 6/6 落盘（+ `sqa-review.md`、`ceo.md`）
  - C2 头：六份 `layer/definition` 全部匹配（MRD/PRD=json-ledger；StRS/SyRS/IRS=headings；V&V=table-rows）
  - C3 meta `编号体系: identity` + `需求层: MRD..V&V`；**checker 绿**：`MR 4 / REQ 44 / IF 8 / TC 49`，索引派生、无退役/重复/悬空/孤儿/覆盖缺口
  - C4 无 `final.md`；C5 接线：2 个 teammate（继承 ceo 组合）+ `system-architect` / `system-qa` 两个命名 child
  - C6 `/req check` 命令回执：**环境阻断**（dev home writer lease 被另一个常驻进程 pid 98394 持有 → 宿主的 `dataBlocked` 守卫报「公司数据已停写」；停写守卫本身是期望语义，不是产品红）。命令解析/读盘/回执的 green 路径由 A6 `req-command.spec` 8 条 keyless 断言覆盖；真会话 green 回执待下一次非阻断运行补
- 两次差异：第 1 次墙钟 20min 且 SQA 串行（新建子会话太晚）→ 缺 V&V；第 2 次墙钟 30min + 任务书要求 SA/SQA 并行 → 全绿。不把单次绿写成「稳定」。
- 资产：新 `probes/team/requirements-chain-probe.mjs`（C1–C6 判据、逐次结果写 `runtime/requirements-chain-probe/last-run.json`）；`checks/INDEX.generated.md` 重新生成（team 探针 17→18）；`tools/lib/rehearsal.mjs` 镜像补 process-docs
- 文档/Note：程序 Note 待 W5 落；`docs/guides/product-definition.md` 的操作面已在 A1/A2 落
- 审查：`审查：agent — 2026-11-07`
