---
status: 待落地
opened: 2026-11-07
---

# 落地：旧盘迁移、豁免与升级面

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；Note 计划 `2026-11-07-requirements-migration.md`（待建）。

**问题与期望结果：** fresh workspace seed 新 process-docs；旧文件不被覆盖；旧动议无 marker 则 skip；新动议带 marker 才查；dev 盘迁移有备份；发布版有升级说明。

**范围：** `src/host/bootstrap.ts` 的 `STATE_FILES`、`tests/company/bootstrap.spec.ts`、`company-workspace/.dsh-company/kb/process-docs.md`（手动迁移 + 备份）、`checks/smoke/release-smoke.mjs`、升级说明。`meta.md` 的 `编号体系` 字段由 A1 落，本卡只读取/验证。

**依赖：** A1/A5/A6。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `preset-change-definition` / `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `_backlog/methods/requirements-probes.md`：旧盘迁移的证据（diff/备份）短结论回本卡。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| fresh seed；旧文件不覆盖 | 编排 | bootstrap spec | create/skip 正确 | 覆盖旧文件 → 红 | `tests/company/bootstrap.spec.ts` | 无 |
| 旧动议无 marker → skip；新动议 marker → check | 确定性 | checker scope + 内联 fixture | spec | 旧动议被红 → 红 | `requirements-check.spec`（A5 扩） | 无 |
| dev `process-docs` 迁移 + 备份；内容不丢 | 编排/人的判断 | 手动迁移 + 备份文件 | diff/备份在场；用户确认 | 覆盖用户改过 → 回滚 | workspace 文件 + Note | 用户确认 |
| release/upgrade 说明 | 文档形状 | release-smoke/升级 note | release-smoke 绿 | 旧盘升级坏 → 红 | `checks/smoke/release-smoke.mjs` | 用户 review |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| seed/skip | 既有 `tests/company/bootstrap.spec.ts`（加 process-docs） | `pnpm test tests/company/bootstrap.spec.ts` | 只补缺 | 真实安装 | 预置旧文件 → skip |
| scope skip | A5 spec + 内联旧动议 | `pnpm test tests/company/requirements-check.spec.ts` | marker 边界 | 语义 | 无 marker 新动议 → 观察/警告 |
| 迁移 | workspace 备份 + Note | 手动命令 + diff | 不丢内容 | 其他部署 | 覆盖 → 备份回滚 |
| 安装形状 | 既有 `checks/smoke/release-smoke.mjs` | `node checks/smoke/release-smoke.mjs` | fresh install | 升级语义 | 坏包 → 红 |

**资产边界：** 只证 seed/skip、scope 与安装形状；不证旧动议内容正确、不证其他部署的迁移（文档化）。

## 排除

重写旧动议历史文件；旧实现的层前缀。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；Note 落 `2026-11-07-requirements-migration.md`（待建）；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。
