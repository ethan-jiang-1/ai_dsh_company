---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-223：shipped-shape 不验证 files 的 glob（content/**、presets/**），缺 content/presets 的包仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-1 / G1）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

[sanitizePackage](../../tools/lib/release/shipped-shape.mjs) 的 `files` 含 `content/**`、`presets/**`；
[checkShippedPackage](../../tools/lib/release/shipped-shape.mjs) 对 `files` 的检查是：

```js
for (const value of files) {
  if (value.includes('*')) continue   // ← glob 全跳过
  if (!entrySet.has(...)) problems.push(...)
}
```

它没有验证 glob 至少命中一个 entry，也没有验证 `content`/`presets` 是否存在。因此一个**没有 content、没有 presets** 的 sanitized tarball 仍 `problems=[]`；`release:shape` 会 PASS，而运行时手册/模板/preset/skills 全缺。

## 复现

```sh
node --input-type=module - <<'EOF'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
const pkg = {
  name: 'x', version: '0', main: 'lib/index.js',
  exports: { '.': { types: './lib/types/index.d.ts', default: './lib/index.js' } },
  files: ['lib/index.js','lib/types/index.d.ts','presets/**','content/**','locale/*.json','cordis.patch.yml','LICENSE','icon.svg'],
  peerDependencies: {}, dsh: { client: { inject: [] } },
}
const entries = ['package/package.json','package/lib/index.js','package/lib/types/index.d.ts','package/README.md','package/cordis.patch.yml','package/LICENSE','package/icon.svg']
const texts = { 'package/lib/index.js':'export const x=1\n', 'package/lib/types/index.d.ts':'export declare const x:number\n', 'package/README.md':'# x\n', 'package/cordis.patch.yml':'# x\n', 'package/LICENSE':'MIT\n', 'package/icon.svg':'<svg/>' }
console.log(checkShippedPackage({ pkg, entries, read: e => texts[e] ?? '', platformModules: [] }))
EOF
```

实测 `[]`（没有 content/presets 条目、`presets/**`/`content/**` 也未命中）。

## 根因与证据

- 根因：checker 的 `files` 判据只检查**无 glob 的字面条目**；`content/**`、`presets/**`、`locale/*.json` 三种 glob 都被 `continue` 跳过，没有「glob 至少命中 N 个」或「运行时必需目录存在」的判据。
- 证据：上脚本；[shipped-shape.spec.ts](../../tests/repo/release/shipped-shape.spec.ts) 的正例 fixture 也没有 presets/dsh.bundle.patch（见 BUG-226），所以测试不会暴露。
- 影响：发布包可以「sanitize 成功、checker PASS、company-entry 起得来」但缺模板/preset——如果 boots 不读某个 content 文件，缺口要等具体命令才炸。

## 失败类与同类排查

**失败类 = 导出形态 / 发布面**（glob 声明未被闭包验证）。

同类：BUG-226（`dsh.bundle.patch` 未验证）；BUG-224（`TEXT_FACE` 不含 content）；`files` 的 `locale/*.json` 同族但当前有文件。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 对每个非空 glob（`content/**`、`presets/**`、`locale/*.json`）至少要求命中 1 个 entry；`content`/`presets` 还应要求关键文件（`content/AGENTS.md`、每个 `dsh.bundle.patch` 目标）存在。
2. 最小负例：从 entries 删掉 `content/**`/`presets/**` 的全部条目 → checker 红；接回 → 绿。
3. 正例：干净 tarball 仍 PASS；`release:shape` 对 137-entry 包 PASS。
