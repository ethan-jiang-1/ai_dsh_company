---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-224：shipped-shape 的文本面不含 content/**，content 里的 dev 路径不判

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复就绪｜修复：2026-11-18（进行中）｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-2 / G1）。
> **留痕**：批次 Note `notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md`（本批共用）。

## 症状

`checkShippedPackage` 的文本面：

```js
const TEXT_FACE = /^package\/(?:README\.md|cordis\.patch\.yml|presets\/.*|lib\/.*\.(?:js|mjs|d\.ts))$/
```

`content/**` 不在内。`content` 是**运行时手册/模板/方法/合同**（角色会读），其中的 dev 路径不会触发「不随包」限定检查。合成 `content/AGENTS.md` 写 tests/x.spec.ts 仍 `[]`。

## 复现

```sh
node --input-type=module - <<'EOF'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
const pkg = { name:'x',version:'0',main:'lib/index.js',exports:{'.':{types:'./lib/types/index.d.ts',default:'./lib/index.js'}},files:['lib/index.js','lib/types/index.d.ts','content/**','LICENSE','icon.svg','README.md'],peerDependencies:{},dsh:{client:{inject:[]}} }
const entries = ['package/package.json','package/lib/index.js','package/lib/types/index.d.ts','package/README.md','package/LICENSE','package/icon.svg','package/content/AGENTS.md']
const texts = { 'package/lib/index.js':'export const x=1\n','package/lib/types/index.d.ts':'export declare const x:number\n','package/README.md':'# x\n','package/LICENSE':'MIT\n','package/icon.svg':'<svg/>','package/content/AGENTS.md':'see tests/x.spec.ts\n' }
console.log(checkShippedPackage({ pkg, entries, read: e => texts[e] ?? '', platformModules: [] }))
EOF
```

实测 `[]`；同一文本放进 `cordis.patch.yml` 会红（`TEXT_FACE` 覆盖）。

## 根因与证据

- 根因：`TEXT_FACE` 是手写面清单，写时只列了 C13 当时出事的 README/cordis/presets/lib，漏了 `content/**`；`content` 是运行时角色直接读的指令面，dev 路径同样误导。
- 证据：上脚本；[shipped-shape.mjs](../../tools/lib/release/shipped-shape.mjs) 的 `TEXT_FACE`；`content` 85 个 entry（tarball 主体之一）。
- 影响：content 里的 dev 路径/命令可以进入发布包且不触发 checker；当前 content 只有一处 tests/simulation/samples（通用方法词，不是仓库路径），但这是面缺口不是当前违规。

## 失败类与同类排查

**失败类 = 发布面 / 文本载体面不全**（与 BUG-216 同族，面从 source 扩到 content）。

同类：BUG-223（glob 未验证）；BUG-225（目录级 dev 路径）；`presets/**` 已被覆盖，`locale/*.json` 未覆盖。

## 已修判定

修成什么算修好：

1. `TEXT_FACE` 纳入 `content/**` 的 `.md/.yml/.yaml/.json`；content 里的 dev 路径按同一 `DEV_PATH/DEV_DIR` +「不随包」判。
2. 最小负例：`content/AGENTS.md` 写未限定的 tests/x.spec.ts → 红；加「不随包」→ 绿。
3. 正例：content 的 tests/simulation/samples 通用方法词不误红。
