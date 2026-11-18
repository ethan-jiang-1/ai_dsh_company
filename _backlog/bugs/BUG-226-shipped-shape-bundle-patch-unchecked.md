---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-226：shipped-shape 不验证 dsh.bundle.patch 的目标，缺 preset 的包仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复就绪｜修复：2026-11-18（进行中）｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-4 / G1）。
> **留痕**：批次 Note `notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md`（本批共用）。

## 症状

`package.json` 的 `dsh.bundle.patch` 列了 12 个 preset 文件；这是 DSH 加载公司角色的**组合入口**。`checkShippedPackage` 只检查 `main`/`exports`/`files`，**从不读 `dsh.bundle.patch`**。合成包把 patch 指向一个不存在的 preset，仍 `[]`；`release:shape` PASS，安装后 6 个角色 preset 可能缺一个。

## 复现

```sh
node --input-type=module - <<'EOF'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
const pkg = { name:'x',version:'0',main:'lib/index.js',exports:{'.':{types:'./lib/types/index.d.ts',default:'./lib/index.js'}},files:['lib/index.js','lib/types/index.d.ts','presets/**','LICENSE','icon.svg','cordis.patch.yml'],peerDependencies:{},dsh:{bundle:{patch:['./presets/ceo/agent.cordis.yml']},client:{inject:[]}} }
const entries = ['package/package.json','package/lib/index.js','package/lib/types/index.d.ts','package/README.md','package/cordis.patch.yml','package/LICENSE','package/icon.svg']
console.log(checkShippedPackage({ pkg, entries, read: e => e === 'package/lib/index.js' ? 'export const x=1\n' : e === 'package/lib/types/index.d.ts' ? 'export declare const x:number\n' : '# x\n', platformModules: [] }))
EOF
```

实测 `[]`（`presets/ceo/agent.cordis.yml` 不在 entries 里）。

## 根因与证据

- 根因：checker 的 manifest 段只处理 `scripts`/`devDependencies`/`workspace`/`files`/`main`/`exports`；`dsh.bundle.patch` 没进判据。sanitizer 逐字保留 `dsh`，所以缺一个 preset 不会被清洗或拒绝。
- 证据：上脚本；[shipped-shape.mjs](../../tools/lib/release/shipped-shape.mjs)；真实 tarball 当前 12 个 patch 目标都在（所以是**面缺口**，不是当前已坏）。
- 影响：组合入口是运行时「六个角色 + 五个 support preset」的唯一来源；缺一个 preset，`preset.entry` 真挂载才会红，`release:shape`/`npm pack` 都绿。

## 失败类与同类排查

**失败类 = 配置组合 / 发布面**（组合行目标未闭包）。

同类：BUG-223（files glob 未验证）；BUG-224（content 面）；真实的 `preset.entry`/`company-entry` 仍可兜底，但它们在 release `--prepare` 之外。

## 已修判定

修成什么算修好：

1. `checkShippedPackage` 逐个断言 `pkg.dsh.bundle.patch` 的目标在 tarball；缺一个即红。
2. 最小负例：patch 指向不存在的 preset → 红；12 个真实目标全在 → 绿。
3. 正例：不要求 `preset.entry` 在 checker 里跑。
