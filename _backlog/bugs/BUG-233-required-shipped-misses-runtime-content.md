---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-233：REQUIRED_SHIPPED 只列 12 个关键件，缺 templates/contracts/methods 仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-1 / H1）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

C14 修复给 checker 加了 `REQUIRED_SHIPPED`（12 个 content/company/charters/locale 路径），但它不是运行时内容的全集。`content/templates/prd.md`、`content/contracts/**`、`content/methods/**` 等 `/prd`、`/req`、质量环实际读取的文件不在列表里。真实 tarball 过滤掉 `package/content/templates/prd.md` 后，`checkShippedPackage()` 仍返回 `[]`。

## 复现

```sh
node --input-type=module - <<'EOF'
import { readTarball } from './tools/release/shipped-shape.mjs'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
const t = readTarball('_dist/dsh-company-pack-0.11.9.tgz')
const entries = t.entries.filter(e => e !== 'package/content/templates/prd.md')
const p = checkShippedPackage({ pkg: t.pkg, entries, read: t.read })
console.log('problems', p)
EOF
```

实测 `problems []`。

## 根因与证据

- 根因：`REQUIRED_SHIPPED` 是手写 12 条，按 C14 当时想到的关键件写；`files` 的 `content/**` 只要求「至少 1 个 entry 命中」，没有「运行时读取的模板/合同/方法」闭包。
- 证据：上命令；[shipped-shape.mjs](../../tools/lib/release/shipped-shape.mjs) 的 `REQUIRED_SHIPPED`；`content` 85 entries 中 12 条被点名。
- 影响：缺少 `/prd` 模板或 `/req` 规则时，release:shape PASS；只有真命令才炸。

## 失败类与同类排查

**失败类 = 发布面 / 关键件闭包**（与 BUG-223 同族，从 glob 非空进到「部分关键件」）。

同类：BUG-234（preset 集合）；BUG-237（存在性不查非空）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 从「运行时读取面」派生关键件：host commands `contentDir` 读取的 templates/contracts/methods、company 合同、charters；至少覆盖 `/prd`/`/req`/质量环/培养实际读取的路径。
2. 最小负例：删 `content/templates/prd.md` → checker 红；接回 → 绿。
3. 正例：真实 137-entry tarball 仍 PASS。
