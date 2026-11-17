---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-218：shipped README 把 pnpm 写成运行时前置，安装路径依赖 dev 包管理器且无 fallback

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-8 / D·E）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

tarball 的 `package/README.md` 前置节写：

```text
> 前置按运行时来源：Desktop 自带 Node/pnpm；
> npm 全局 CLI / `dsh web` 的 Plugins 页用 DSH 的 Node，pnpm 需在 PATH（或 `corepack enable pnpm`）。
> …
> - CLI 报包管理器缺失：npm CLI 路径需要 pnpm 在 PATH（或 corepack enable pnpm）；Desktop 用内置 pnpm。
```

也就是说：**安装这个运行时插件需要 pnpm**。pnpm 是开发/构建期的包管理器，不是运行时库；没有 pnpm 的 npm CLI / 精简 DSH 环境在安装插件前就失败，且包内没有任何 runtime 检查/fallback 把它变成可诊断的错误（只靠 README 散文）。

## 复现

```sh
tar -xOf _dist/dsh-company-pack-0.11.9.tgz package/README.md | sed -n '7,12p;60,64p'
node -e "const p=require('./runtime/tmp/c13-dist/package/package.json'); console.log({dependencies:p.dependencies, engines:p.engines})"
```

实测 README 三处 pnpm；`package.json` 的 `dependencies` 为 undefined，`engines` 只有 node/dsh，没有包管理器约束或检查。

## 根因与证据

- 根因：DSH 的 profile 安装路径使用 pnpm（或 corepack），本包把该上游前提直接写成运行时前置；没有区分「Desktop 内置」与「npm CLI 需手装」两条路径的失败语义。
- 证据：上命令；README 行 9/10/62；[安装手册](../../_dist/安装手册.md) 的 pnpm 前置（dev/release 文档）。
- 影响：runtime 安装依赖 dev 包管理器；用户按 npm 习惯安装时，先遇到「包管理器缺失」而不是「插件不可用」；这条依赖不在 `package.json` 声明，不能机械检查。

## 失败类与同类排查

**失败类 = 配置组合 / 安装形状**（runtime 前置依赖 dev 工具）。

同类：`prepack` 死引用（[BUG-214](BUG-214-shipped-prepack-missing-scripts.md)）；`devDependencies` workspace 协议（[BUG-219](BUG-219-shipped-devdeps-workspace-protocol.md)）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 要么把安装路径做成不依赖 pnpm（npm/DSH 自带安装器），要么在 DSH 插件安装入口给出**可诊断的**「需要 pnpm/corepack」错误，并把 pnpm 写进 `engines`/安装检查（而不是只写 README）。
2. 最小判据：无 pnpm 的环境跑安装命令，失败信息点名缺失的包管理器与补救命令；有 pnpm 的环境仍绿。
3. 正例：Desktop 内置 pnpm 路径不回归。
