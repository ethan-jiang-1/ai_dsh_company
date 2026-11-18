---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-234：dsh.bundle.patch 只逐个校验目标，六角色 + 五 support 的集合完整性没断言

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-2 / H2）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

C14 修复让 checker 逐个检查 `pkg.dsh.bundle.patch` 的目标在 tarball；但没有断言 patch 数组本身包含**六公司角色 + 五 support preset**。真实 tarball 把 patch 裁到 6 条、并只保留对应 6 个 preset 文件，`checkShippedPackage()` 仍 `[]`；`presets/**` 的 `files` glob 只要 ≥1 命中即可。

## 复现

```sh
node --input-type=module - <<'EOF'
import { readTarball } from './tools/release/shipped-shape.mjs'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
const t = readTarball('_dist/dsh-company-pack-0.11.9.tgz')
const patch = t.pkg.dsh?.bundle?.patch ?? []
const pkg = { ...t.pkg, dsh: { ...t.pkg.dsh, bundle: { ...t.pkg.dsh.bundle, patch: patch.slice(0, 6) } } }
const entries = t.entries.filter(e => !e.startsWith('package/presets/') || patch.slice(0,6).some(p => e === 'package/' + p.replace(/^\.\//,'')))
console.log('problems', checkShippedPackage({ pkg, entries, read: t.read }))
EOF
```

实测 `problems []`。

## 根因与证据

- 根因：checker 只做「每个列出的 target 存在」，没有「target 集合 == 预期 12 个 preset」或「至少 6 角色 + 5 support」的集合判据；`REQUIRED_SHIPPED` 也没有 preset 条目。
- 证据：上命令；[package.json](../../packages/company-pack/package.json) 的 `dsh.bundle.patch` 12 条；`presets/` 39 entries。
- 影响：发布包少一个角色/support preset 时 release:shape PASS；`preset.entry` 真挂载才红（在 release `--prepare` 之外）。

## 失败类与同类排查

**失败类 = 配置组合 / 发布面**（集合完整性）。

同类：BUG-233（content 关键件）；BUG-223（glob 非空）；BUG-226（patch 目标存在，上一轮）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 断言 patch 集合 = 12 个预期 preset（或至少 6 角色 id + 5 support id）；每个目标在 tarball。
2. 最小负例：patch 裁到 6 条 → 红；缺一个 support preset → 红。
3. 正例：12 条真实 patch 仍 PASS。
