---
status: 已结
opened: 2026-11-07
---

# 落地：编号合同与范围标记（process-docs / meta / 门禁）

> 立卡：2026-11-07 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 2026-11-07
>
> **结论/去向**：implementation — 提交即载体；决定理由见程序 Note（伞卡）[2026-11-07-requirements-teaming-program.md](../../../notes/implemented/2026-11-07-requirements-teaming-program.md)；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[编号共识](../research/requirements-identification-numbering/2026-11-07-consensus.md) / [落地材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。

**问题与期望结果：** 新 `process-docs.md` 把 R1–R10、退役词、范围/豁免、并发口径写成唯一合同；`meta.md` 有 `编号体系/需求层` 标记。seed 与旧盘迁移归 A7，本卡只落合同与门禁。

**范围：** `content/state/process-docs.md`、`content/AGENTS.md`（只改「产品定义的文件名固定」/五层链/编号段）、`templates/meta.md`、`docs/guides/product-definition.md`（编号操作面）、`checks/gates/{base-clean,company-skeleton}.mjs`、`requirements-contract.spec.ts`（待建，落 tests/host/）。

**依赖：** —（无上游）。

**V1（已跑）：** 2026-11-07 盲测 A 组胜出（`MR/REQ/IF/TC/AC`）；记录 = [trial](../research/requirements-identification-numbering/2026-11-07-validation-trial.md)。

**下游：** A2/A3/A4a/A4b/A5/A6/A7 依赖本卡的合同/门禁；顺序见伞卡。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `_backlog/methods/requirements-probes.md`：V1 盲测记录（1 次调用）回本卡/研究材料；不写代码。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| process-docs 含 R1–R10、退役词表、范围/豁免、并发口径；活动文本不出现退役词 | 确定性 | 读 `content/state/process-docs.md` | 新 spec：章节齐全、退役词只在退役节 | 活动规则里加 `STR-001` → 红；还原 → 绿 | 新 `requirements-contract.spec.ts`（待建，落 tests/host/） | 无（结构） |
| `meta.md` 有 `编号体系:` 字段；`parseMeta` 接受额外字段 | 确定性 | meta 样例 + `validateMeta` | validateMeta 绿；字段可读 | 删 `slug` → 既有测试红；加字段不红 | `tests/harness/tools/deliverables.spec.ts`（validateMeta） + `tests/host/run-bundle/bootstrap.spec.ts`（模板在场） | 无 |
| `base-clean`/`company-skeleton` 收新内容；`pnpm verify` 绿 | 门禁形状 | repo | verify ALL PASS | 删必需文件 → 门禁红 | `checks/gates/{base-clean,company-skeleton}.mjs` | 无 |
| V1 词表盲测：裸 token 的第一先验不撞车 | 模型行为 | 裸 `MR/REQ/IF/TC` vs `STR/SYR/IFR/VP` | 记录结果；只有撞车才换词 | 撞车 → 换词/记录；不撞车 → 保留 | 人工 model call（1 次）+ 研究材料 | 用户 review |
| `docs/guides/product-definition.md` 与新合同一致；无退役词；链接/预算绿 | 文档形状 | 指南原文 | `pnpm verify` 绿 | 改坏链接/超预算 → 红 | 既有 `md-links`/`doc-budget` + 用户 review | 用户 review 文案 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 合同章节/退役词 | 新 `requirements-contract.spec.ts`（待建，落 tests/host/） | `pnpm test tests/content/requirements-contract.spec.ts` | 合同文本与退役词边界 | 模型是否遵守 | 先写 spec 跑红（缺文件/缺章节）再补文件 |
| meta 字段 | 既有 `tests/harness/tools/deliverables.spec.ts`（validateMeta） + `tests/host/run-bundle/bootstrap.spec.ts` | `pnpm test tests/harness/tools/deliverables.spec.ts` + `pnpm test tests/host/run-bundle/bootstrap.spec.ts` | 额外字段不破、模板在场 | 字段语义 | 删 `slug` → 既有红 |
| 门禁在场 | 既有 `checks/gates/{base-clean,company-skeleton}.mjs` | `pnpm verify` | 只读内容完整 | 语义正确性 | 临时删 `content/state/process-docs.md` → 门禁红 |
| 链接/文档预算 | 既有 `md-links`/`doc-budget`（含 `docs/guides/product-definition.md`） | `pnpm verify` | 指针不悬空 | 规则好不好 | 改坏链接 → 红 |
| V1 | 已跑（2026-11-07，1 次 model call；记录 prompt/输出/日期） | 人工 | 第一先验 | 结构正确性 | A 组胜出；记录见 trial；不跑 = 未验证 |

**资产边界：** 只证合同文本与门禁在场；V1 是人工验证、不是回归；不证 seed/迁移（A7）、不证角色是否照做（A3/A4/A8）、不证模型输出。

## 文档预算（先搬后写）

`docs/guides/product-definition.md` 当前 62/62 行：把「产品类型 playbook」表移到 `_shared/skills/product-definition/references/`（那里已有同源 playbook），正文留一行指针；腾出约 10 行再写编号操作面。

## 排除

角色文案（A3/A4a/A4b）、checker（A5）、命令（A6）、seed/迁移（A7）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `a62c87f`（W0 绿后；verify/test 1166/typecheck 全绿）
- 红（合同缺失）：`pnpm vitest run tests/content/requirements-contract.spec.ts` → `6 failed | 1 passed`（缺 process-docs / R1 / 退役节 / 层表 / 门禁两项）
- 红（唯一词表破了）：正文 R2 行注入 `STR-001` → `1 failed | 6 passed`，断言原话 = 「正文规则出现了退役号形——唯一词表破了」
- 红（门禁在场）：`mv content/state/process-docs.md` 后 `pnpm verify` → `FAIL company-skeleton: … 缺失`、`FAIL base-clean: … 缺失`，`2 FAILURE(S)`；还原后绿
- 绿：`pnpm vitest run tests/content/requirements-contract.spec.ts` → `7 passed`；`pnpm vitest run tests/company` → `42 files / 254 tests passed`；`pnpm verify` → `ALL PASS；2 门无对象`
- 资产：`tests/content/requirements-contract.spec.ts`（新增 7 条判据）；`checks/gates/{base-clean,company-skeleton}.mjs` 各加 process-docs 在场/扫描 + 负例留证注释
- 真跑：未跑（A1 不涉及模型行为；A8 统一跑）
- 文档/Note：`content/state/process-docs.md`（新合同，R1–R10）、`templates/meta.md`（编号体系/需求层）、`content/AGENTS.md`（事实的家 + 产品定义行）、`docs/guides/product-definition.md`（59/62 行，先搬后写）；程序 Note 待 W5 落
- 审查：`审查：agent — 2026-11-07`（W1 波次抬头留独立子代理盲审）
