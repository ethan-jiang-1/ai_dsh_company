---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-237：REQUIRED_SHIPPED 只查 entry 存在，空 charter/空 manifest 仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1/B2 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C15 卡](../settled_issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-5 / H1·H4）。
> **留痕**：批次 Note [2026-11-18-shipped-key-closure-and-unreadable-inputs](../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)（本批共用）。

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
- 证据：上命令；[shipped-shape.mjs](../../../tools/lib/release/shipped-shape.mjs) 的 `REQUIRED_SHIPPED` 循环。
- 影响：空 charter/空 manifest 在发布前全绿；运行时角色缺手册，只有真挂载/真会话才暴露。

## 失败类与同类排查

**失败类 = 发布面 / 关键件闭包**（存在 ≠ 可用）。

同类：BUG-233（缺关键件）；BUG-234（preset 集合）；`content/manifest.json` 空也可同形。

## 已修判定

修成什么算修好：

1. `REQUIRED_SHIPPED` 的每个 entry 必须 `read(entry).trim() !== ''`；`.json` 还要 `JSON.parse` 成功。
2. 最小负例：空 `content/charters/ceo.md` → 红；非法/空 `content/manifest.json` → 红。
3. 正例：真实 137-entry tarball 仍 PASS。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`、`tests/repo/release/shipped-shape.spec.ts`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（空 charter / 空或非法 manifest 仍 []（只查 entry））
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（trim 非空 + JSON.parse；空/非法 JSON 红）
- 提交：commit 56e4f986
