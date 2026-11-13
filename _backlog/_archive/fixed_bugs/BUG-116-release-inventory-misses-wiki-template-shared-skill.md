---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-116：`export-dist` / `release-smoke` 的发布清单不覆盖 wiki 模板与共享 skill；缺包时发布门仍绿

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 清单补齐；release-smoke 待跑
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C7 / 发布安装）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

发布形状检查分两处：

- `tools/export-dist.mjs` 的 `must` 只列 `cordis.patch.yml`、`lib/index.js`、`content/AGENTS.md`、`templates/meta.md`、`charters/ceo.md`、`state/org.md`、`locale`、`icon`；**没有** `content/wiki-template/**`，也没有 `presets/_shared/wiki/skills/**`。
- `release-smoke` 的 content 检查只走 `content/manifest.json` 里声明的 tiers + `templates/meta.md` / `charters/ceo.md`；`wiki-template` 不在 manifest，共享 skill 也不在。
- `preset-smoke --profile release-check` 是**手动**验证共享 skill；`release-smoke` 不跑。

因此：有人 `files` 配错、npm pack 排除、或模板/共享 skill 被删，`export-dist` 仍 ALL PASS；`release-smoke` 也绿；只有手动 `preset-smoke` 或用户装完发现知识地图 skill 缺失才会暴露。当前 tarball 确实含两者（本轮 `tar -tzf` 实查），所以这是**发布门禁资产缺口**，不是当前包缺。

## 根因（假设）

- 发布清单是手写 `must` + content manifest 驱动；新增的 wiki 模板/共享 skill 没有进任一清单。
- `release-smoke` 只证明「preset 挂载 + content manifest」，不证明「共享 skill 可被六角色 skills/list 看见」；preset-smoke 的 release profile 真跑没进发布 smoke。
- 没有「安装副本 → skills/list 六角色」的 release 内断言。

## 暴露的失败类

**发布清单只覆盖被 manifest 登记的文件**：新增「非 manifest 的随包内容」时，清单驱动不会自动跟随。发布门要有一个「关键内容/技能存在性」的显式清单，或在 release-smoke 内跑 skills/list。

## 复现

静态可判：

```ts
must = [... 'package/content/AGENTS.md', ...] // 无 wiki-template
contentManifest.tiers ... // wiki-template 不在 manifest
```

可构造 temp pack 删除 `content/wiki-template` / `presets/_shared/wiki/skills`，`npm pack` 后 `export-dist` 仍 PASS；`release-smoke` content check 也 PASS。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `must` 增加 `package/content/wiki-template/index.md`、`package/content/wiki-template/AGENTS.md`、`package/presets/_shared/wiki/skills/consulting-the-knowledge-map/SKILL.md`（按当前资产名）。
- 或把 wiki-template 纳入 `content/manifest.json`（如果 manifest 是内容清单唯一家），让 release-smoke 自动跟随；共享 skill 走 `preset-smoke` 的 release profile 断言。
- `release-smoke` 安装后对六角色跑 `skills/list`，断言共享 `consulting-the-knowledge-map` 可见；或把 `preset-smoke --profile release-check` 接入发布流程。
- 加负例：删任一关键文件 → export-dist/release-smoke 红。

## 修复关联

- 发现于 C7；与 [BUG-088](BUG-088-shipped-links-excludes-wiki-template.md) 同属「发布形状/安装副本」，但本卡是清单覆盖缺口。
- 相关：`tools/export-dist.mjs` 的 `must`、`checks/lanes/release.entry.mjs` 的 content 检查、`preset-smoke` 的 release profile 用法。

## 已修判定

修成：`tools/export-dist.mjs` 的 `must` 增加 `content/wiki-template/index.md`、`content/wiki-template/AGENTS.md`、`presets/_shared/wiki/skills/consulting-the-knowledge-map/SKILL.md`；`release-smoke` 安装副本增加这两类存在性检查。
- 未跑：本轮未重打 tarball，release-smoke 新断言待下次发布实跑；清单缺口已从「只靠手动 preset-smoke」变为发布门静态覆盖。
