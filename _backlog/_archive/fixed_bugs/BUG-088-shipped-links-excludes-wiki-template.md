---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-088：`shipped-links` 整目录排除 `wiki-template/`，模板内除 `index.md` 外的坏链接 verify 与 spec 都抓不到

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A5 / H13）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

`checks/gates/shipped-links.mjs:74-81` 把整个 `content/wiki-template/` 从扫描面排除；`tests/content/wiki-template.spec.ts` 只断言 `index.md` 指向的示例页在盘上。结果：

- 往 `content/wiki-template/AGENTS.md` 追加 `[broken probe](./definitely-missing-page.md)`；
- `pnpm verify` → `PASS shipped-links（content 73 份…）`、`PASS md-links ×4064`，**仍 ALL PASS**；
- `pnpm test tests/content/wiki-template.spec.ts` → **6 passed**；
- 还原后绿。

也就是说：模板会随包发布，但模板内 `AGENTS.md` / `README.md` / `sources/README.md` 的相对链接没有任何门禁；用户拷走后遇到坏链接才暴露。

## 根因（假设）

排除的理由是「模板的相对链接解析目标是**拷贝后的那份 wiki**，按安装读者视角判必然假红」（gate 头注）。这个理由只对「从仓库根解析」的扫描器成立；模板内部的链接在**模板自己的根**下解析是正确的（`./AGENTS.md`、`../index.md` 等在拷贝后仍成立）。整目录排除把「按安装读者视角」与「按模板自身根」混成了一个判据。

## 暴露的失败类

**为了消假红而整块排除，连真红也排除了**：一个检查器把「解析基准不同」当成「不可检查」，于是模板内的链接完整性从门禁面消失。正确做法是换基准（按模板根解析）而不是关掉扫描。

## 复现

```sh
cp packages/company-pack/content/wiki-template/AGENTS.md /tmp/AGENTS.md.bak
printf '\n[broken probe](./definitely-missing-page.md)\n' >> packages/company-pack/content/wiki-template/AGENTS.md
pnpm verify            # ALL PASS；shipped-links / md-links 都不报
pnpm test tests/content/wiki-template.spec.ts   # 6 passed
cp /tmp/AGENTS.md.bak packages/company-pack/content/wiki-template/AGENTS.md
```

2026-11-12 实跑原话：`PASS shipped-links（content 73 份 + skill 27 份 + persona 11 份；零仓库路径/穿出 content）`；`PASS md-links ...`；6 passed。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- 给模板单独一条「按模板根解析**模板内**相对链接」的检查：允许指向模板外（`../` 可能是拷贝后的 wiki 根）的链接只做「存在性不判」，但模板内部链接必须解析到模板内真实文件。
- 或把 `wiki-template.spec` 扩成「遍历模板内所有 Markdown 链接，内部目标必须在模板根内存在」；`shipped-links` 的排除只用于「指向模板外」的链接。
- 加红证：模板内坏链接必须让该检查红；还原绿。

## 修复关联

- 发现于 A5；与 H13 一致。
- 本卡不修；改检查器属测试资产，按章程可先记录/请示。

## 已修判定

修成：`shipped-links` 不再整目录排除 `content/wiki-template/`，改按模板自身根解析：模板**内部**链接必须在模板根内存在；指向模板外的链接不判存在，但仍不许指仓库。行内代码里的示例链接不计。

- 红证：往 `wiki-template/AGENTS.md` 追加 `[broken probe](./definitely-missing-page.md)` → `FAIL shipped-links ... 模板内部链接目标不在盘上`；还原 → ALL PASS。
- 既有 6 条模板 spec 保持绿；`index.md` 的示例页链接仍由 spec 与门禁双重覆盖。
