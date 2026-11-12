---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-100：`export-dist` 在 `npm pack` 之前就删掉旧 `_dist` 产物；pack 失败后旧包/旧手册都没了

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C7 / 发布安装）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`tools/export-dist.mjs` 的次序是：

1. `tsc -b` / `tsdown`（失败会 `throw`，**保留旧 `_dist`**——注释明说）；
2. **删除 `_dist` 里的旧 `dsh-company-pack-*.tgz`、`.sha256` 和 `安装手册.md`**；
3. 才跑 `npm pack`。

若第 3 步失败（npm 不可用、磁盘/权限、prepack 意外失败、cache 问题等），脚本 catch 后 exit 1，但第 2 步已经删掉了上一份可用导出：`_dist` 里既没有新 tarball，也没有旧 tarball/旧手册。`安装手册.md` 是 tracked 文件，还会在工作树里留下删除态。

这违反脚本自己写的「产物必须由当前源码构建；失败保留旧的 `_dist` 不替换」——保护只覆盖了 build，没覆盖 pack/清单/手册生成。

## 根因（假设）

- 清理旧产物紧跟 build/bundle 之后、`npm pack` 之前；没有「先打包到临时目录 → 校验/生成手册 → 全部成功后再替换 `_dist`」的两阶段。
- `npm pack` 的输出/exit code 是后续所有步骤的输入；失败路径直接 throw，旧产物已不可恢复。
- 同一问题覆盖 `.sha256` 与 tracked 手册：pack 失败后手册被删，`git status` 出现删除，收件人拿不到任何可复读的导出。

## 暴露的失败类

**「先删后建」的发布导出**：发布工具把「替换」实现成「清空 + 重建」，任何中间失败都丢掉上一份可用产物。发布/分发路径必须是「新产物 staging 完整成功 → 原子替换/保留旧版」。

## 复现

静态复现（不需要破坏真实 `_dist`）：把 `export-dist.mjs` 第 2 步的清理块与第 3 步 `npm pack` 的次序对读；或在临时 checkout 中把 `npm` 从 `PATH` 移除后运行 `node tools/export-dist.mjs`：

```
build/bundle 成功 → _dist 旧 tgz/sha/安装手册被删 → npm pack ENOENT
→ exit 1；_dist 空；tracked 安装手册.md 显示 deleted
```

当前源码的 tarball 本身是好的（本轮 `npm pack` 实跑含 `content/wiki-template/**` 与 `presets/_shared/wiki/skills/**`）；本卡只指失败路径。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `npm pack` 到临时目录（或 `_dist/.staging-*`），校验清单 + sha + 生成手册都在 staging 完成；全部成功后再删旧产物并 rename 替换。
- 任何一步失败：删除 staging，保留旧 tgz/sha/manual，回执点名失败步骤（与 build 失败同口径）。
- `report('npm pack')` 失败后不要继续生成手册/pack 输出；当前 `packedName`/`entries` 可能来自坏产物。
- 加 smoke/单测：模拟 pack 失败，断言旧 `_dist` 字节不变、手册未被删。

## 修复关联

- 发现于 C7；与 [BUG-094](BUG-094-bundle-manifest-id-path-traversal.md) 同属发布/安装输入边界。
- 相关合同：[`docs/contracts/release.md`](../../../docs/contracts/release.md)（导出/发布形状）。

## 已修判定

修成：`export-dist` 在 `_dist/.staging-*` 完成 build 后的 `npm pack`、清单、sha、手册，全部成功后才清旧产物并 rename 替换；任何一步失败删 staging、旧 tgz/sha/手册一字不动；tracked 手册不再因 pack 失败出现删除态。

- 真失败注入：`PATH` 去掉 npm → 新脚本 exit 1、旧 tgz/sha/手册 sha 不变、无 staging 残留；HEAD 版同场景 `_dist` 被清到只剩 `release-manifest.json`（已还原）。
- 成功路径：`node tools/export-dist.mjs` ALL PASS（staging → 替换），随后 `release-smoke` ALL PASS。
