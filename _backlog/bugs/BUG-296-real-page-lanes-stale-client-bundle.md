---
status: 调查中
severity: P1
opened: 2026-11-21
---

# BUG-296：真页面车道只查 `lib/client.js` 存在、不查新鲜——源码改了未重建也能「绿」

> 严重级别：P1（重要：真页面判据是 client 回归的最后一道门；它会对着旧字节报绿，等于这道门可以整体失效）｜发现：2026-11-21（E2E 设计轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-21 指令「发现问题直接报 bug，别急着修」）。

## 症状

`ui-scene-smoke` / `client-load-smoke` 的「真页面」断言不校验 `packages/company-pack/lib/client.js` 是否由**当前源码**构建。源码改了、没有重新 `tsc -b + tsdown` 时，车道仍然启动、仍然用旧 bundle 断言、仍然可以报绿。

本轮的直接现场：

- `28b19a52`（2026-11-21 22:44）把 `CommandScopeHint` 的注册搬进 `registerCommandScopeHint`，inject 从 `list: scoped.sessions.list` 变成 `list: undefined as never`（见 [BUG-293](BUG-293-command-scope-hint-slot-crash.md)）。
- 同一次提交的说明写「client-load / ui-scene 真绿」。
- 但盘上 `packages/company-pack/lib/client.js` 的 mtime 是 **22:05**（早于提交），内容仍是旧注册 `list: scoped.sessions.list`；也就是说那两条「真绿」跑的是旧字节。
- 按 HEAD 重建后，同一条 `node checks/lanes/ui-scene.entry.mjs --isolated` 立刻红（`slot entry crashed in 'conversation.input.left'`）。

这不是「某次忘了构建」的单点；是**判据没有新鲜度面**，所以任何人都可能再踩。

## 运行面

- **面 = tooling/check**（lane 与门禁），不是产品运行面。
- 相关入口：`checks/lanes/ui-scene.entry.mjs:92-94`（只 `existsSync`）、`checks/lanes/client-load.entry.mjs`（只 `existsSync`/boot）、`checks/gates/pack-shape.mjs`（`files` 声明存在性，不看产物 mtime）、`checks/gates/client-halves.mjs`（只查 `./client` 指向的文件存在）。
- 对照：`_dist` 发布面已有 source fingerprint / `release:shape`；client 产物没有对应的构建指纹。

## 复现

在任意时刻：

```sh
stat -f '%Sm %N' -t '%Y-%m-%d %H:%M:%S' packages/company-pack/lib/client.js
git log -1 --format='%ci %h %s' -- packages/company-pack/src/client
node checks/lanes/ui-scene.entry.mjs --isolated
```

当第二行的源码时间晚于第一行的产物时间，第三行仍会运行并通过「真页面」断言——除非手动重建。要看到假绿，可在一个已有旧 bundle 的工作树里改一行 client 源码（不改产物），直接跑 `node checks/lanes/ui-scene.entry.mjs --isolated`；它不会拒绝，也不会提示产物过期。

## 根因与证据

1. `ui-scene.entry.mjs` 的隔离路径只检查：

   ```js
   if (!existsSync(join(ROOT, 'packages/company-pack/lib/client.js'))) {
     failSetup('... pack client 未构建 ...')
   }
   ```

   存在 ≠ 新鲜；随后 `plugin add <pack 目录>`（link）直接伺服这个 `lib/client.js`。

2. `client-load.entry.mjs` 同样只 `existsSync`/boot，不看源码时间或指纹。
3. `pack-shape` / `client-halves` 是「发布形状/两半声明」门禁，不是构建新鲜度门禁；`pack-shape` 明确写「静态检查 files/exports，不依赖 lib 是否已构建」。
4. 本轮的因果链：旧 bundle 里 `list` 是好的 ⇒ 车道真绿；HEAD 源码里 `list` 是 `undefined` ⇒ 重建后同一条车道红。旧 bundle 把 BUG-293 藏了一整个提交。

## 失败类与同类排查

**失败类 = 假绿（stale artifact / 判据跑在旧字节上）**。同类：

- `_dist` 发布面曾有同类问题，已由 `release:shape` / sourceFingerprint / `dist-freshness` 收口（可复用其指纹思路）；
- `client-load` / `ui-scene` / `client-error-chain` 三条真页面入口都直接或间接读 `lib/client.js`，目前都没有新鲜度断言；
- `pnpm verify` 的 `client-halves` 只在 `lib/` 存在时检查「导出指向的文件存在」，不查内容对应哪版源码；
- dev 的 `pnpm company` 默认会构建，但 `ui-scene` 的 `--isolated` 路径**不构建**（头注写「前置 = client/前端已构建」），所以「谁负责构建」在车道边界上是空的。

## 修复方案与范围

- **根因修法（二选一，倾向 A）**：
  - **A. 构建指纹门禁**：`tsc -b + tsdown` 时写一个 `lib/.build-fingerprint`（源文件 + tsconfig/tsdown 配置的内容哈希，复用 `tools/lib/core/pack-source.mjs` / `devBuildFingerprint` 的口径）；`ui-scene` / `client-load` / `client-error-chain` 在启动前比对该指纹，不一致就 fail-loud（exit 2，提示「先构建」），或在 `--isolated` 下自动构建（成本 ~2s，可接受）。
  - **B. 车道内自动构建**：真页面车道启动前无条件跑 `tsc -b packages/company-pack && tsdown`；简单但把构建成本塞进每条车道，且仍然无法防止「构建失败但旧产物在」的假绿（构建失败必须 fail-loud）。
- **判据补强**：一条反证——改 client 源码不重建 → 车道红（或自动重建后绿）；改回 → 绿。指纹文件本身进 gitignore，不进包。
- **不改**：`lib/client.js` 的打包形状、`release:shape` 的 sourceFingerprint 语义（只复用，不改变）、`pnpm company` 的打包路径。
- **材料性**：tooling/check 面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 改任一 `packages/company-pack/src/client/**` 或构建配置、不重建时，三条真页面车道至少一条 fail-loud 并点名「产物过期 / 先构建」；
- 重建后同一条车道按原判据运行；
- 反证在卡/提交里留一条：源码改动 → 车道红；重建 → 绿；不依赖人工记得构建。
