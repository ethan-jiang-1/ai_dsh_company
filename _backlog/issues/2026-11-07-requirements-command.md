---
status: 待落地
opened: 2026-11-07
---

# 落地：`/req check` 命令与强制点

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；Note 计划 `2026-11-07-requirements-command.md`（待建）。

**问题与期望结果：** host 命令 `/req check <slug>` 调纯逻辑，返回通过/失败与计数；命令集/数据停写守卫；操作员跑，角色不自证。

**范围：** `src/host/req-command.ts`、`src/index.ts`、`req-command.spec.ts`（待建，落 tests/company/）、`tests/company/host-composition.spec.ts`。

**依赖：** A5。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `preset-change-definition` / `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- 命令注册改动走 `gate-change-definition`（命令集断言是门禁的一部分）。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| `/req check <slug>` 解析/usage/成功/失败/数据停写 | 确定性/编排 | 命令 handler 单测 | 命令测试绿 | 错 slug → 错误；dataBlocked → 错误 | 新 `req-command.spec.ts`（待建，落 tests/company/） | 无 |
| 命令集合固定 | 确定性 | `host-composition.spec` | 集合含 `req` | 漏注册 → 红 | `tests/company/host-composition.spec.ts` | 无 |
| 角色不自证；操作员跑 | 文档形状 | docs/handbook | 文案断言/Review | 角色自称通过 → 设计红 | `presets.spec`/`handbook.spec` | 用户 review |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 命令行为 | 新 `req-command.spec.ts`（待建，落 tests/company/） | `pnpm test tests/company/req-command.spec.ts` | 解析/错误 | lib 逻辑 | 先红（无命令）再实现 |
| 注册面 | 既有 `tests/company/host-composition.spec.ts` | `pnpm test tests/company` | 集合 | 行为 | 删注册 → 红 |
| 强制点 | 现有 `/prd check` 载体 + docs | `pnpm verify` | 命令可见 | 角色自律 | 文案缺 → review 红 |

**资产边界：** 只证命令解析/注册/错误路径；不证 checker 判据（A5）、不证模型遵守（A8）。

## 排除

checker 逻辑（A5）、迁移（A7）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；Note 落 `2026-11-07-requirements-command.md`（待建）；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。
