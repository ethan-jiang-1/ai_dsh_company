---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-067：`process-docs` 搬家后仍有 4 处死指针

> 严重级别：P1（重要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note — [声明↔载体门禁](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E8

## 症状

编号合同已在 2026-11-09 从 `content/state/process-docs.md` 迁到
`content/product-types/<id>/requirements-model.md`，但仍有 4 处把旧路径当作“唯一合同”：

- [meta.md](../../../packages/company-pack/content/templates/meta.md)（第 7 行）：
  “`编号体系` / `需求层` 是编号范围标记（合同 = pack `content/state/process-docs.md`）”
- [business-software/document-map.md](../../../packages/company-pack/content/product-types/business-software/document-map.md)（第 9 行）：
  “编号规则、退役词、追溯与范围豁免的唯一合同 = pack `content/state/process-docs.md`”
- [hardware-software/document-map.md](../../../packages/company-pack/content/product-types/hardware-software/document-map.md)（第 5 行）：
  同一句“唯一合同 = pack `content/state/process-docs.md`”
- [packages/company-pack/README.md](../../../packages/company-pack/README.md)（第 68 行）：
  “编号合同（R1–R10、退役词、范围豁免、并发）住 `content/state/process-docs.md`”

而 content/state/process-docs.md **不存在**（`test -e` = MISSING）。
`product-definition` skill 里的同一指针已被修复方改掉，但这 4 处仍会在角色读模板/文档映射时指到死路。

## 根因（假设）

2026-11-09 的搬迁只改了一部分引用；这些是反引号路径，不是 Markdown 链接，`md-links` 不查；
`bare-path` 也不把 `content/state/...` 当作仓库根可解析路径（它实际是 pack-relative），
所以 `pnpm verify` 在当时仍 ALL PASS。没有“pack 内反引号路径必须存在”的守卫。

## 暴露的失败类

**权威指针搬家未单源**：同一事实（编号合同住哪）散落在模板、两个文档映射、README 与 skill；
搬家时没有一处生成/校验，死指针就能穿过门禁。同型检查：所有 `content/...` 反引号路径是否可解析到
pack 内真实文件。

## 复现

```sh
test -e packages/company-pack/content/state/process-docs.md; echo $?
grep -rn "content/state/process-docs.md" packages/company-pack docs --include='*.md'
```

- `test -e` → 非零（MISSING）。
- `grep` → 上列 4 处（`product-definition` skill 已被修复方改掉，不在列表里）。
- 基线证据：修复方改动前的 `pnpm verify` 为 ALL PASS（见
  [raw/e0-verify-after-cards.txt](../research/two-product-structure-audit/experiments/raw/e0-verify-after-cards.txt)），
  证明这些死指针此前未被门禁覆盖。

## 修复方向（未授权）

- 4 处统一改为 `content/product-types/<id>/requirements-model.md`（`<id>` = `productType`），
  或统一改为指向 `content/AGENTS.md` 的“编号合同”条，再由它指向类型包；不要留第二套路径。
- 加一条守卫：pack 内反引号 `content/...` 路径必须解析到真实文件（可先做窄版：只查已搬迁的
  process-docs 旧路径，再扩到全部 `content/`）。
- 如果保留 workspace 的 `kb/process-docs.md` 播种副本，要在指针里写清“pack 权威 = 类型包；
  workspace 副本 = 播种”，避免读者把副本当权威。

## 修复关联

未修。修复面 = `content/templates/meta.md`、两个 `document-map.md`、`packages/company-pack/README.md`；
守卫可加在 `checks/gates/`（如 `bare-path` 或新的 pack-content-paths）。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. 4 处指针全部指向存在的文件：meta.md / 两个 document-map / pack README 都改成
   `content/product-types/<id>/requirements-model.md`（或具体类型路径）；不出现第二套权威路径。
2. `grep -rn "content/state/process-docs.md" packages/company-pack docs --include='*.md'` 为空。
3. 新门禁 `pack-content-paths` 对 pack 内反引号 `content/...` 路径解析；反证：改回旧路径 → 红；
   还原 → 绿。
4. `pnpm verify` 绿。

## 修复与验证

- 4 处指针改成类型包路径：`content/templates/meta.md`、business / hardware 的 `document-map.md`、
  `packages/company-pack/README.md`；`content/AGENTS.md` 保留“workspace 副本 = 播种”的说明。
- 新门禁 `checks/gates/pack-content-paths.mjs`：pack 内反引号 `content/...` 路径必须解析
  （跳过 `<...>` / `{...}` / `*` / `...`）。
- 红→绿：把 `meta.md` 的合同指针改回 `content/state/process-docs.md` → 红
  （`死指针 ...（.../content/state/process-docs.md 不存在）`）；还原 → `PASS pack-content-paths ×9`。
- `grep -rn "content/state/process-docs.md" packages/company-pack docs --include='*.md'` → 空。
- `pnpm verify` ALL PASS。
- 证据 = [Note](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)「验证」节。
