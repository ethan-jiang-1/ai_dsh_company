---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-237：REQUIRED_SHIPPED 只查 entry 存在，空 charter/空 manifest 仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-5 / H1·H4）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`checkShippedPackage` 对 `REQUIRED_SHIPPED` 只做：

```ts
if (!entrySet.has(`package/${rel}`)) problems.push(...)
```

不读文件、不判非空。把 `content/charters/ceo.md` 的内容置空（或只留空白），只要 entry 还在，checker 仍 `[]`；运行时角色拿到的 CEO charter 是空文档。

## 复现

```sh
node --input-type=module - <<'EOF'
import { readTarball } from './tools/release/shipped-shape.mjs'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
const t = readTarball('_dist/dsh-company-pack-0.11.9.tgz')
const read = e => e === 'package/content/charters/ceo.md' ? '' : t.read(e)
console.log(checkShippedPackage({ pkg: t.pkg, entries: t.entries, read }))
EOF
```

实测 `[]`。

## 根因与证据

- 根因：REQUIRED 判据停在「在不在 tarball」，没有「可读/非空/可解析」；`content`/`presets` 的 `TEXT_FACE` 只查 dev 路径，不查空文件。
- 证据：上命令；[shipped-shape.mjs](../../tools/lib/release/shipped-shape.mjs) 的 `REQUIRED_SHIPPED` 循环。
- 影响：空 charter/空 manifest 在发布前全绿；运行时角色缺手册，只有真挂载/真会话才暴露。

## 失败类与同类排查

**失败类 = 发布面 / 关键件闭包**（存在 ≠ 可用）。

同类：BUG-233（缺关键件）；BUG-234（preset 集合）；`content/manifest.json` 空也可同形。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 对 REQUIRED 的文本件至少 `read(entry).trim() !== ''`；`content/manifest.json` 还要 JSON.parse 成功；charters 至少非空标题/正文。
2. 最小负例：空 `content/charters/ceo.md` → 红；空 `content/manifest.json` → 红。
3. 正例：真实 137-entry tarball 仍 PASS。
