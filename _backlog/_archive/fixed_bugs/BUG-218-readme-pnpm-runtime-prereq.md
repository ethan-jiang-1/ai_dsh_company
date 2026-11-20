---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-218：shipped README 把 pnpm 写成运行时前置，安装路径依赖 dev 包管理器且无 fallback

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— B1 类型闭包 + S1–S4 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C13 运行时/发布面分离卡](../settled_issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-8 / D·E）。
> **留痕**：批次 Note [2026-11-17-shipped-package-boundary](../../../notes/implemented/2026-11-17-shipped-package-boundary.md)（本批共用）。

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
- 证据：上命令；README 行 9/10/62；[安装手册](../../../_dist/安装手册.md) 的 pnpm 前置（dev/release 文档）。
- 影响：runtime 安装依赖 dev 包管理器；用户按 npm 习惯安装时，先遇到「包管理器缺失」而不是「插件不可用」；这条依赖不在 `package.json` 声明，不能机械检查。

## 失败类与同类排查

**失败类 = 配置组合 / 安装形状**（runtime 前置依赖 dev 工具）。

同类：`prepack` 死引用（[BUG-214](BUG-214-shipped-prepack-missing-scripts.md)）；`devDependencies` workspace 协议（[BUG-219](BUG-219-shipped-devdeps-workspace-protocol.md)）。

## 已修判定

修成什么算修好：

1. shipped README 不再把 pnpm 写成**包运行时前置**；改成「DSH 插件安装器使用 pnpm；Desktop 内置，CLI 缺失时 DSH 打印 `dsh: pnpm was not found…`」。
2. `pnpm release:shape` 检查：README 提 pnpm 时必须同时给出安装器路径与 DSH 诊断（或删掉 pnpm 提法）。
3. 证据：vendor `apps/cli/src/plugin.ts` 的 exit 127 诊断行；真 Desktop 路径不回归（不跑）。

## 修复证据

- 改动面：`packages/company-pack/README.shipped.md`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm release:shape`（旧 tarball：README: 提 pnpm 但没给 DSH 的缺包管理器诊断）
- 绿：`pnpm release:shape`（新 tarball：README 写明「DSH 插件安装器使用 pnpm」+ `dsh: pnpm was not found…`）
- 提交：commit f1629047
