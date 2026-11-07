---
status: 待落地
opened: 2026-11-07
---

# 落地：编号校验器纯逻辑（R1–R9 + 索引 + 夹具）

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；Note 计划 `2026-11-07-requirements-checker.md`（待建）。

**问题与期望结果：** 纯逻辑 checker 解析 `layer/definition`，建定义/引用索引，判重复/悬空/退役/孤儿/覆盖/计数；V2/V4/V11 有结果；不碰 host/命令。

**范围：** `src/lib/requirements-check.ts`；`requirements-check.spec.ts`（待建，落 tests/company/）（内联 fixture 字符串）；lab docs 只读。

**依赖：** A1/A2。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `preset-change-definition` / `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `_backlog/methods/requirements-probes.md`：V2/V4/V11 的少量结论回本卡，长证据进编号研究材料。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| 解析 `layer/definition`（json-ledger/headings/table-rows）；定义 vs 引用 | 确定性 | 内联 fixture 字符串 | spec 通过 | 重复定义/悬空 → 红 | 新 `requirements-check.spec.ts`（待建，落 tests/company/） | 无 |
| 退役词/范围 marker；旧动议 skip | 确定性 | 内联 fixture | spec | 旧动议被扫 → 红 | 同上 | 无 |
| 孤儿/覆盖/计数；索引输出 | 确定性 | 内联 fixture | spec | 缺覆盖 → 红 | 同上 | 无 |
| V2 重键 / V4 负例 / V11 试跑 | 人工 trial + 内联映射 | lab 只读 + 内联 fixture | 结果记录 | 夹具过期 → 记 blocked，不编造 | 人工 trial + 研究材料 | 无（记录） |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 解析/判红 | 新 `requirements-check.spec.ts`（待建，落 tests/company/） + 内联 fixture（不建新 fixture 目录） | `pnpm test tests/company/requirements-check.spec.ts` | 纯逻辑 | 命令/模型 | 先写红（重复定义 fixture）再实现 |
| lab trial | 人工读 `runtime/lifecycle-lab/real-ws/...`（只读；不进 `pnpm test`） | 人工读 docs + 记录映射 | 真实形状 | 回归/自动判红 | 路径缺 → 记 blocked，不编造 |
| 索引派生 | spec 断言输出 | 同上 | 计数/矩阵 | 语义 | 缺 ID → 红 |

**资产边界：** 只证纯逻辑与内联夹具；不证命令接线（A6）、不证真实模型产出（A8）。V2/V4/V11 是人工 trial，记录在编号研究材料；lab 不是回归资产，不进 `pnpm test`。

## 排除

命令（A6）、迁移（A7）、跨动议键。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；Note 落 `2026-11-07-requirements-checker.md`（待建）；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。
