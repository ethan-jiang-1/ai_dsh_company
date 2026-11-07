---
status: 已结
opened: 2026-11-07
---

# 落地：`/req check` 命令与强制点

> 立卡：2026-11-07 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 2026-11-07
>
> **结论/去向**：implementation — 提交即载体；决定理由见程序 Note（伞卡）[2026-11-07-requirements-teaming-program.md](../../../notes/implemented/2026-11-07-requirements-teaming-program.md)；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[编号共识](../research/requirements-identification-numbering/2026-11-07-consensus.md) / [落地材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。

**问题与期望结果：** host 命令 `/req check <slug>` 调纯逻辑，返回通过/失败与计数；命令集/数据停写守卫；操作员跑，角色不自证。

**范围：** `src/host/req-command.ts`、`src/index.ts`、`req-command.spec.ts`（待建，落 tests/company/）、`tests/company/host-composition.spec.ts`、`packages/company-pack/README.md`（命令/已知限制）。

**依赖：** A5。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- 命令注册门禁：`pnpm test tests/company/host-composition.spec.ts`（命令集断言）。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| `/req check <slug>` 解析/usage/成功/失败/数据停写 | 确定性/编排 | 命令 handler 单测 | 命令测试绿 | 错 slug → 错误；dataBlocked → 错误 | 新 `req-command.spec.ts`（待建，落 tests/company/） | 无 |
| 命令集合固定 | 确定性 | `host-composition.spec` | 集合含 `req` | 漏注册 → 红 | `tests/company/host-composition.spec.ts` | 无 |
| 角色不自证；操作员跑 | 文档形状 | docs/handbook | 文案断言/Review | 角色自称通过 → 设计红 | handbook 文案 + 用户 review（如加断言落 `handbook.spec`） | 用户 review |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 命令行为 | 新 `req-command.spec.ts`（待建，落 tests/company/） | `pnpm test tests/company/req-command.spec.ts` | 解析/错误 | lib 逻辑 | 先红（无命令）再实现 |
| 注册面 | 既有 `tests/company/host-composition.spec.ts` | `pnpm test tests/company` | 集合 | 行为 | 删注册 → 红 |
| 强制点 | docs/handbook（计划断言） + 用户 review | `pnpm verify` + 用户 review | 角色不自证 | 操作员行为 | 文案缺 → review 红 |
| 包 README | 既有 `packages/company-pack/README.md` | `pnpm verify` + 用户 review | 命令/限制被记录 | 语义 | 漏写 → review 红 |

**资产边界：** 只证命令解析/注册/错误路径；不证 checker 判据（A5）、不证模型遵守（A8）。

## 排除

checker 逻辑（A5）、迁移（A7）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `0174e58`（A5 提交后）
- 红（命令未建）：`pnpm vitest run tests/company/req-command.spec.ts` → `Cannot find module '../../packages/company-pack/src/host/req-command.ts'`（0 test）
- 红（skipped 分支）：临时关掉 skipped 回执 → `1 failed | 7 passed`（× 旧动议（无编号体系标记）→ skipped 回执，不判红）；还原 → 8 passed
- 绿：`pnpm vitest run tests/company/req-command.spec.ts tests/company/host-composition.spec.ts` → `16 passed`；`pnpm vitest run tests/company` → `43 files / 287 tests passed`；`pnpm typecheck` 绿；`pnpm lint` 0/0；`pnpm verify` → `ALL PASS`（README 压回 160/160 行）
- 资产：`src/host/req-command.ts`（`/req check <slug>`：dataBlocked / usage / 读 drafts 五层+allocation+meta / skipped / 判红 / 计数回执）；`src/index.ts` 注册；`tests/company/req-command.spec.ts`（8 条判据）；`host-composition.spec` 命令集加 `req`（集合 → 五个命令）
- 真跑：命令行为由 keyless handler 测试覆盖；真会话里跑命令归 A8（probe 断言 6）
- 文档/Note：`packages/company-pack/README.md`（contributes 段 + 已知限制 v1 边界）；`content/AGENTS.md` / `docs/guides/product-definition.md` 已在 A1 写明 /req check 与「角色不自证」；程序 Note 待 W5 落
- 审查：`审查：agent — 2026-11-07`
