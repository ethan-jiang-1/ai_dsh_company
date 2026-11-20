---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-225：DEV_PATH 只认带扩展名的文件路径，目录级 dev 引用（tests/host/cultivation/）不判

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 指纹闭包 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C14 低置信卡](../settled_issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-3 / G1）。
> **留痕**：批次 Note [2026-11-18-shipped-shape-closure-and-low-confidence-runtime](../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)（本批共用）。

## 症状

`checkShippedPackage` 的 dev 路径正则要求最后一段带扩展名：

```js
const DEV_PATH = /... (?:tests|probes|tools|checks|_backlog|notes|docs)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g
```

所以 `tests/host/cultivation/`（目录级引用）、tools/observe（旧目录）这类**不带扩展名**的 dev 指针不会被判；它们同样是安装后不可解析的路径。合成 `cordis.patch.yml: "# see tests/host/cultivation/ for evidence"` 仍 `[]`。

## 复现

```sh
node --input-type=module - <<'EOF'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
const pkg = { name:'x',version:'0',main:'lib/index.js',exports:{'.':{types:'./lib/types/index.d.ts',default:'./lib/index.js'}},files:['lib/index.js','lib/types/index.d.ts','cordis.patch.yml','LICENSE','icon.svg'],peerDependencies:{},dsh:{client:{inject:[]}} }
const entries = ['package/package.json','package/lib/index.js','package/lib/types/index.d.ts','package/README.md','package/cordis.patch.yml','package/LICENSE','package/icon.svg']
const texts = { 'package/lib/index.js':'export const x=1\n','package/lib/types/index.d.ts':'export declare const x:number\n','package/README.md':'# x\n','package/cordis.patch.yml':'# see tests/host/cultivation/ for evidence\n','package/LICENSE':'MIT\n','package/icon.svg':'<svg/>' }
console.log(checkShippedPackage({ pkg, entries, read: e => texts[e] ?? '', platformModules: [] }))
EOF
```

实测 `[]`；把同一行改成 tests/host/cultivation/x.ts 会红。

## 根因与证据

- 根因：正则以「文件扩展名」收尾，目录引用与无扩展名工具名（tools/observe）被排除；C13 当时的 dev 引用多数带扩展名，所以缺口未暴露。
- 证据：上脚本；[shipped-shape.mjs](../../../tools/lib/release/shipped-shape.mjs) 的 `DEV_PATH`/`REL_DEV_PATH`；`content`/`presets` 里存在 tools/skills 这类**通用词**，扩展这种判据时要防止误杀（需要「仓库根前缀 + 路径形状」/白名单）。
- 影响：目录级 dev 指针可以进入发布包；agent 按注释找 `tests/host/cultivation/` 会扑空。

## 失败类与同类排查

**失败类 = 发布面 / 文本载体面不全**（与 BUG-224 同一类，漏的是路径形状）。

同类：BUG-224（content 面）；tools/pre-execute 被显式放过（DSH hook 名，不是路径）。

## 已修判定

修成什么算修好：

1. `DEV_DIR` 识别无扩展名/目录级 dev 引用（`tests/host/cultivation/`、tools/observe）；tools/pre-execute/tools/skills/tools/source/tests/simulation 是显式白名单。
2. 最小负例：cordis 写 `tests/host/cultivation/` → 红；写 tools/pre-execute/tests/simulation/samples → 绿。
3. 正例：带扩展名的 tests/x.spec.ts 仍由 `DEV_PATH` 判。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`、`tests/repo/release/shipped-shape.spec.ts`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（tests/host/cultivation/ 目录引用不判）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（DEV_DIR 命中即红；tools/pre-execute|skills|source、tests/simulation 白名单绿）
- 提交：commit 87d8b15d
