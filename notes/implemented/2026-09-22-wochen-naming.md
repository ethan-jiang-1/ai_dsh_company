# 2026-09-22 · 公司命名与角色显示名系列化（D14）

## 决定

1. **公司名 = `wochen`**（此前项目只有"虚拟公司"这个泛称，pack 名 `dsh-company-pack` 不含公司身份）。
2. **角色显示名系列化**：`preset.yml` 的 `name:` 一律写成 `<公司名> <角色>`——
   `wochen CEO` / `wochen VP-Eng` / `wochen VP-Sales` / `wochen COO`（占位角色也带前缀，保持系列一致）。
3. **preset id 不变**（`ceo`/`vp-eng`/`vp-sales`/`coo`，kebab）：id 受
   `PRESET_ID = /^[a-z0-9][a-z0-9-]*$/`（`preset.ts:18`）限制，**下划线与大写都不合法**——
   所以 `wochen_CEO` 只能是显示名，不能是 id。
4. **角色层级不动**：CEO 是个体、VP 是职能（[40 §0.1](../../docs/design/40-role-content-plan.md)），
   本次只加系列前缀，不改 persona 框架。

## 输掉的方案

- **前缀进 id**（`wochen-ceo`）：多公司共存时最干净，但要改四个目录名 + bundle 的
  `default: ceo` + 测试的 id 列表 + 文档，且**旧会话存的 preset id 会失配**（无法再挂回原角色）。
  收益（视觉分组）用显示名即可拿到，故不取。
- **全 C 级系列**（`wochen CEO / CTO / CRO / COO`）：与 40 §0.1 已定的"CEO 是个体，VP 是职能"
  冲突（会把职能化身改成高管个体），属内容/设计层改动，需另立决策——本轮不做。

## 验证（实际跑过）

- `pnpm test` → 6 条全绿，其中新增一条**系列前缀一致性检查**（四个 `preset.yml` 的 `name` 都必须
  以 `wochen ` 开头）——R2 补 VP-Sales/COO 正式文案时忘了前缀会立刻变红。
- `pnpm verify` → ALL PASS（preset 结构与行依赖不受显示名影响）。
- UI 侧：preset 按 `trust` 分组（`system` → Built-in、`user` → Custom，`AgentPresetSection.tsx`），
  故四张卡出现在 **Built-in** 组；显示名变更需刷新 profile 的 `file:` 副本（bump 版本 + `plugin add`）
  并重启 web 观察窗后才可见。
