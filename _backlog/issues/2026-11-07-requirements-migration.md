---
status: 待落地
opened: 2026-11-07
---

# 落地：旧盘迁移、豁免与升级面

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；决定理由见程序 Note（伞卡）`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/）；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[编号共识](../research/requirements-identification-numbering/2026-11-07-consensus.md) / [落地材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。

**问题与期望结果：** fresh workspace seed 新 process-docs；旧文件不被覆盖；旧动议无 marker 则 skip；新动议带 marker 才查；dev 盘迁移有备份；发布版有升级说明。

**范围：** `src/host/bootstrap.ts` 的 `STATE_FILES`、`tests/company/bootstrap.spec.ts`、`company-workspace/.dsh-company/kb/process-docs.md`（手动迁移 + 备份）、`checks/smoke/release-smoke.mjs`、升级说明。`meta.md` 的 `编号体系` 字段由 A1 落，本卡只读取/验证。

**依赖：** A1/A5/A6。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
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
| 迁移 | workspace 备份 + Note | `cp <file> <file>.bak-2026-11-07` + `diff -u`（路径写 Note） | 不丢内容 | 其他部署 | 覆盖 → 备份回滚 |
| 安装形状 | 既有 `checks/smoke/release-smoke.mjs` | `node checks/smoke/release-smoke.mjs` | fresh install | 升级语义 | 坏包 → 红 |

**资产边界：** 只证 seed/skip、scope 与安装形状；不证旧动议内容正确、不证其他部署的迁移（文档化）。

## 迁移 runbook

1. `cp .dsh-company/kb/process-docs.md .dsh-company/kb/process-docs.md.bak-2026-11-07`
2. 用 A1 的新合同整份替换（process-docs 是流程合同、不含公司事实；备份保留用户旧版）。
3. `diff -u .bak-2026-11-07 process-docs.md`；备份/差异路径写程序 Note。
4. 新动议 `meta.md` 加 `编号体系: identity`；旧动议不加 → checker `skipped`，不是红。
5. 跑 A6 的 `/req check` 对旧盘抽 1–2 个动议：期望 `skipped`；对新动议：期望 check。
6. 用户确认备份/迁移后卡翻 `已结`。

## 排除

重写旧动议历史文件；旧实现的层前缀。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `1eb21e2`（A4b 提交后）
- 红（seed 未接）：`pnpm vitest run tests/company/bootstrap.spec.ts` → `2 failed | 6 passed`（plan 不含 `.dsh-company/kb/process-docs.md`）
- 绿：`pnpm vitest run tests/company/bootstrap.spec.ts` → `8 passed`（fresh seed + 既有盘 skip 且不覆盖用户改版）；`pnpm verify` → `ALL PASS`；`node checks/smoke/release-smoke.mjs` → `ALL PASS`（含「首启 40 件」「第二次零变更」「既有盘升级补种」）
- dev 盘迁移：`cp kb/process-docs.md kb/process-docs.md.bak-2026-11-07`（3571B，保留）→ 用 pack 新合同整份替换（6256B）→ `diff -u` 130 行差异（= 旧 STR/SYR/IFR 合同 → 新 R1–R10 合同）；备份与差异路径即本卡证据
- 旧动议范围：对 `company-workspace/.dsh-company/deliverables/2026-10-29-human-agent-capability-2026` 跑 checker（真 lib）→ `skipped: true / ok: true / reason = meta 无 编号体系: 标记——旧动议只读豁免`，不判红
- 资产：`src/host/bootstrap.ts` 的 `STATE_FILES` 加 process-docs（只补缺）；`tests/company/bootstrap.spec.ts` 加 seed/skip/不覆盖三条；`checks/smoke/release-smoke.mjs` 的 content 在场清单加 process-docs；`docs/release.md` 版本纪律加「升级既有 workspace」一条（种子只补缺 + 旧动议 skipped）
- `meta.md` 的 `编号体系` 字段由 A1 落，本卡只读取/验证（bootstrap 不改动议文件）
- 用户确认：迁移备份就位（若需回滚 = 用 `.bak-2026-11-07` 覆盖回）；待 W5 汇总确认
- 审查：`审查：agent — 2026-11-07`
