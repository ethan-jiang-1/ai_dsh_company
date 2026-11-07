---
status: 待落地
opened: 2026-11-07
---

# 落地：编号合同与范围标记（process-docs / meta / 门禁）

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；Note 计划 `2026-11-07-requirements-contract.md`（待建）。

**问题与期望结果：** 新 `process-docs.md` 把 R1–R10、退役词、范围/豁免、并发口径写成唯一合同；`meta.md` 有 `编号体系/需求层` 标记。seed 与旧盘迁移归 A7，本卡只落合同与门禁。

**范围：** `content/state/process-docs.md`、`content/AGENTS.md` 指针、`templates/meta.md`、`checks/gates/{base-clean,company-skeleton}.mjs`、`requirements-contract.spec.ts`（待建，落 tests/company/）。

**依赖：** —（A2/A3/A4/A5/A6/A7 的上游）。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `preset-change-definition` / `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| process-docs 含 R1–R10、退役词表、范围/豁免、并发口径；活动文本不出现退役词 | 确定性 | 读 `content/state/process-docs.md` | 新 spec：章节齐全、退役词只在退役节 | 活动规则里加 `STR-001` → 红；还原 → 绿 | 新 `requirements-contract.spec.ts`（待建，落 tests/company/） | 无（结构） |
| `meta.md` 有 `编号体系:` 字段；`parseMeta` 接受额外字段 | 确定性 | meta 样例 + `validateMeta` | bootstrap/validateMeta 绿；字段可读 | 删 `slug` → 既有测试红；加字段不红 | `tests/company/bootstrap.spec.ts` + `tools/lib/deliverables.mjs` | 无 |
| `base-clean`/`company-skeleton` 收新内容；`pnpm verify` 绿 | 门禁形状 | repo | verify ALL PASS | 删必需文件 → 门禁红 | `checks/gates/{base-clean,company-skeleton}.mjs` | 无 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 合同章节/退役词 | 新 `requirements-contract.spec.ts`（待建，落 tests/company/） | `pnpm test tests/company/requirements-contract.spec.ts` | 合同文本与退役词边界 | 模型是否遵守 | 先写 spec 跑红（缺文件/缺章节）再补文件 |
| 门禁在场 | 既有 `checks/gates/{base-clean,company-skeleton}.mjs` | `pnpm verify` | 只读内容完整 | 语义正确性 | 临时删 `content/state/process-docs.md` → 门禁红 |
| 链接/文档预算 | 既有 `md-links`/`doc-budget` | `pnpm verify` | 指针不悬空 | 规则好不好 | 改坏链接 → 红 |

**资产边界：** 只证合同文本与门禁在场；不证 seed/迁移（A7）、不证角色是否照做（A3/A4/A8）、不证模型输出。

## 排除

角色文案（A3/A4）、checker（A5）、命令（A6）、seed/迁移（A7）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；Note 落 `2026-11-07-requirements-contract.md`（待建）；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。
