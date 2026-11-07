---
status: 待落地
opened: 2026-11-07
---

# 落地：五层模板与定义形态（MRD/PRD/StRS/SyRS/IRS + allocation）

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；决定理由见程序 Note（伞卡）`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/）；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[编号共识](../research/requirements-identification-numbering/2026-11-07-consensus.md) / [落地材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。

**问题与期望结果：** 五个需求模板声明 `layer/definition`；allocation 以附录形态在场（`definition: none`，无 layer、不立号）；PRD 的 JSON 是唯一定义点，正文标题是引用；模板样例可过 `validateProductDocs`。

**范围：** `content/templates/{mrd,prd,strs,syrs,irs,allocation}.md`；`requirements-templates.spec.ts`（待建，落 tests/company/）；`tests/company/prd-check.spec.ts`。

**依赖：** A1。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| MRD/PRD 样例过 `validateProductDocs`（1 机会 / 1 REQ / 1 AC） | 确定性 | 模板原文 | `prd-check.spec` 绿 | 改坏 JSON → 红 | `tests/company/prd-check.spec.ts` | 无 |
| 五个需求模板有 `layer/definition` 头；PRD=json-ledger；StRS/SyRS/IRS=headings；allocation=`definition: none`（无 layer） | 确定性 | 模板原文 | 新 spec 解析头字段 | 删 `layer` / 改非法 `definition` → 红 | 新 `requirements-templates.spec.ts`（待建，落 tests/company/） | 用户 review 可读性 |
| PRD 只有一个定义点：JSON；正文 `### REQ-001` 是引用 | 确定性 | PRD 模板 + 样例 | 重复定义检查通过 | JSON 与 `### REQ-001` 同时出现 → 红 | 同上 | 无 |
| PRD JSON 保留 `source`（MR 来源）+ `traces`（跨层上游）；`/prd check` 仍认 `source` | 确定性 | PRD 模板 + `prd-check` | `prd-check.spec` 与新 spec 同绿 | 把 `source` 改名/删掉 → `/prd check` 红 | `tests/company/prd-check.spec.ts` + 新 spec | 无 |
| allocation 附录只引用 REQ/IF，不另立号 | 确定性 | allocation 模板 | spec 检查无新 ID 定义 | 在附录里 `### IF-999` → 红 | 同上 | 无 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 模板同源 | 既有 `tests/company/prd-check.spec.ts` | `pnpm test tests/company/prd-check.spec.ts` | 样例结构 | 语义质量 | 改坏样例 → 红 |
| 定义形态/重复 | 新 `requirements-templates.spec.ts`（待建，落 tests/company/） | `pnpm test tests/company/requirements-templates.spec.ts` | 头字段/唯一定义点 | 模型输出 | 先跑红（缺模板/重复定义）再补 |
| source/traces | 既有 `prd-check.spec` + 新 spec | `pnpm test tests/company/prd-check.spec.ts` + 新 spec | `source` 仍校验、`traces` 可解析 | 语义 | 删 `source` → 既有红 |
| allocation 附录 | 同上 spec | 同上 | 附录不立号 | 派工质量 | 加一个自造 ID → 红 |
| 包内内容在场 | 既有 `base-clean`/`company-skeleton` | `pnpm verify` | 模板随包 | 模板好不好 | 删模板 → 红 |

**资产边界：** 只证模板形状与样例结构；不证模型按模板产出（A8）、不证模板在真实项目里的可读性（用户 review）。

## 排除

角色文案（A3/A4a/A4b）、checker（A5）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `40fa060`（A1 提交后）
- 红（模板未建）：`pnpm vitest run tests/company/requirements-templates.spec.ts` → `7 failed | 1 passed`（strs/syrs/irs/allocation 缺失）
- 红（PRD 双定义点）：正文标题改回 `### REQ-002` → `1 failed | 8 passed`，断言原话 = 「PRD 正文出现了定义形状的标题：REQ-002」
- 红（门禁在场）：`mv templates/syrs.md` 后 `pnpm verify` → `FAIL company-skeleton: … templates/syrs.md 缺失`、`FAIL base-clean: … 缺失`，`2 FAILURE(S)`；还原后绿
- 绿：`pnpm vitest run tests/company/requirements-templates.spec.ts tests/company/prd-check.spec.ts` → `17 passed`；`pnpm vitest run tests/company` → `43 files / 263 tests passed`；`pnpm verify` → `ALL PASS`
- 资产：`tests/company/requirements-templates.spec.ts`（9 条判据，含门禁在场）；六个模板（mrd/strs/prd/syrs/irs/allocation）；`base-clean`/`company-skeleton` 纳入模板在场 + 负例留证
- 样例链自洽：MR-001 → StRS REQ-001 → PRD REQ-002（`source`+`traces`）→ SyRS REQ-003 → IRS IF-001；allocation 只引用不立号
- 真跑：未跑（模板形状不证模型产出；A8 统一跑）
- 文档/Note：`docs/guides/product-definition.md` 的产物结构节已指向 `definition` 形态；程序 Note 待 W5 落
- 审查：`审查：agent — 2026-11-07`
