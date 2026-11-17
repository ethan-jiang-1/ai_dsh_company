---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-213：tarball 的 lib 面 98% 是类型声明——135 个 `.d.ts` vs 2 个运行时 JS

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：修复就绪｜修复：2026-11-17（进行中）｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-1 / C13-7 / A·E）。
> **留痕**：批次 Note `notes/implemented/2026-11-17-shipped-package-boundary.md`（本批共用）。

## 症状

`_dist/dsh-company-pack-0.11.9.tgz` 的 `lib/` 共 **137** 个 entry，其中：

- 运行时入口只有 **2** 个 JS：`package/lib/index.js`、`package/lib/client.js`；
- 其余 **135** 个是 `.d.ts`，位于 `package/lib/types/**`（解包后 660 KB）；
- `package.json` 的 `files` 显式写了 `lib/types/**/*.d.ts`，`exports` 的 `types` 指向 `lib/types/index.d.ts` / `lib/types/client/index.d.ts`。

DSH 加载插件用 `main`/`exports.default` 与 `dsh.client`，不会读 `.d.ts`；类型只在 TS 编译期有用。tarball 的「字节多数」是类型面，不是运行时面。

## 复现

```sh
T=_dist/dsh-company-pack-0.11.9.tgz
tar -tzf "$T" | grep -c '\.d\.ts$'        # 135
tar -tzf "$T" | grep -cE '^package/lib/.*\.js$'  # 2
rm -rf runtime/tmp/c13-dist && mkdir -p runtime/tmp/c13-dist
tar -xzf "$T" -C runtime/tmp/c13-dist
du -sh runtime/tmp/c13-dist/package/lib/types runtime/tmp/c13-dist/package/lib/index.js runtime/tmp/c13-dist/package/lib/client.js
tar -xOf "$T" package/package.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s);console.log(p.files);console.log(p.exports)})"
pnpm release:shape
```

## 根因与证据

- 根因：`files` 把 `lib/types/**/*.d.ts` 当发布面；`tsc -b` 产出全部内部声明（host/client/lib），没有区分「对外两个 exports 的 `.d.ts`」与「内部模块声明」。`tsdown` 只产 `index.js`/`client.js`，所以 135 个类型声明成为 tarball 主体。
- 证据：上命令；[package.json](../../packages/company-pack/package.json) 的 `files`/`exports`；[tsdown.config.ts](../../packages/company-pack/tsdown.config.ts) 的 `dts: false` 与两个入口。
- 影响：安装字节与攻击面/审计面被类型面放大；用户/agent 在安装包里看到大量 dev/type 文件，误把它们当运行时；发布包 506 KB 中类型面 660 KB（未压缩）。

## 失败类与同类排查

**失败类 = 导出形态 / 发布面**（type 与 runtime 混在一个 `lib/`）。

同类：`README.md` 随 npm 自动带上但不在 `files`；`lib/*.js` 的 source map 引用（BUG-220）。`content`/`presets` 是运行时面，不在本卡。

## 已修判定

修成什么算修好：

1. tarball 的 `lib/types/` 只保留 `exports.types` 可达闭包（实测 2 个：`lib/types/index.d.ts` / `lib/types/client/index.d.ts`），不再整树 135 个 `.d.ts`。
2. `pnpm release:shape` 断言类型面 = 闭包、无 exports 不可达 `.d.ts`；旧 tarball 红，新 tarball 绿。
3. 正例：`company-entry`/`client-load` 仍绿；`exports.types` 仍能解析。
