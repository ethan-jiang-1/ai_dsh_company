---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-215：shipped README 的 5/5 相对链接指向包外，且含 dev 测试/probes/backlog 引用

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— B1 类型闭包 + S1–S4 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C13 运行时/发布面分离卡](../../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-4 / D）。
> **留痕**：批次 Note [2026-11-17-shipped-package-boundary](../../../notes/implemented/2026-11-17-shipped-package-boundary.md)（本批共用）。

## 症状

tarball 里的 `package/README.md` 是 npm 页面/安装包首屏。它的 **5 条相对链接全部**指向包外：

```text
../../docs/contracts/data-model.md
../../docs/contracts/release.md
../../probes/browser-visual/sidebar-role-mark-probe.mjs
../../_backlog/_archive/legacy/suspended.md
../../_backlog/_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md
```

在仓库树里它们都存在（所以 `md-links` 绿）；在安装包里 `node_modules/dsh-company-pack/` 之外没有 `docs/`、`probes/`、`_backlog/`，全部断链。README 还含：

- `tests/repo/release/uninstall-parity.spec.ts`（dev 测试路径，纯文本）；
- 「pnpm 需在 PATH」的安装前置（见 [BUG-218](BUG-218-readme-pnpm-runtime-prereq.md)）；
- 指向 GitHub `_dist/安装手册.md` 的外链。

## 复现

```sh
rm -rf runtime/tmp/c13-dist && mkdir -p runtime/tmp/c13-dist
tar -xzf _dist/dsh-company-pack-0.11.9.tgz -C runtime/tmp/c13-dist
node --input-type=module - <<'EOF'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
const root = resolve('runtime/tmp/c13-dist/package')
const text = readFileSync(resolve(root, 'README.md'), 'utf8')
let total = 0, broken = 0
for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
  const t = m[1]
  if (/^(https?:|#|mailto:)/.test(t)) continue
  total++
  const target = resolve(dirname(resolve(root, 'README.md')), t.split('#')[0])
  const inside = relative(root, target)
  if (!existsSync(target) || inside.startsWith('..')) { broken++; console.log('BROKEN', t) }
}
console.log('relative_links=', total, 'broken=', broken)
EOF
```

实测 `relative_links=5 broken=5`。

## 根因与证据

- 根因：[pack README](../../../packages/company-pack/README.md) 是**仓库读者**文档（链接到 `docs/`/`probes/`/`_backlog/`），被 npm 原样带进 tarball；没有「包内链接必须落在包内」的判据。
- 证据：上脚本；README 行 94/135/140/145/147/150；`md-links` 只解析仓库树。
- 影响：安装用户/agent 按 README 找数据模型、发布合同、探针、看板卡，全部 404；同时把内部 backlog 路径暴露到 npm 页面。

## 失败类与同类排查

**失败类 = 文档指针 / shipped 面**（与 BUG-205 的 live-pointer 不同：目标在包外，不是不存在）。

同类：`cordis.patch.yml`/源码注释的 dev 引用（[BUG-216](BUG-216-shipped-comments-dev-paths.md)）；README 的 pnpm 前置（[BUG-218](BUG-218-readme-pnpm-runtime-prereq.md)）。

## 已修判定

修成什么算修好：

1. tarball 的 `README.md` 来自 shipped 专用 `README.shipped.md`；相对链接全部落在包内或为稳定外链，`broken == 0`。
2. `pnpm release:shape` 解析 README 链接，任何 `..` 出包或不存在目标即红；旧 tarball 5/5 断链红。
3. 正例：npm 页面仍能解释安装/升级/卸载；仓库内 dev README 不受影响。

## 修复证据

- 改动面：`packages/company-pack/README.shipped.md`、`tools/lib/release/shipped-shape.mjs`、`tools/release/export-dist.mjs`
- 红：`pnpm release:shape`（旧 tarball：README: 5 条相对链接全部出包（docs/probes/_backlog））
- 绿：`pnpm release:shape`（新 tarball：README.md 来自 README.shipped.md；相对链接 0 条、外链稳定）
- 提交：commit f1629047
