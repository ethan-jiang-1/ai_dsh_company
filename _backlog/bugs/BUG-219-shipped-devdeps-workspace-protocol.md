---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-219：发布包 `devDependencies` 保留 21 条 `workspace:*`，解包 `npm install` 直接 EUNSUPPORTEDPROTOCOL

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-2 / B）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

tarball 的 `package/package.json` 保留：

- `devDependencies` **24** 条，其中 **21** 条是 `workspace:*`（`@deepseek-ai/*` workspace 协议）；
- `dependencies` **缺失**（全部运行时包走 `peerDependencies`）。

在解包目录跑 `npm install --dry-run`：

```text
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

发布包因此不是自洽的 npm 项目：不能 `npm install`、不能 `npm pack`（prepack 先红，见 BUG-214）、不能做依赖审计。`workspace:*` 是 pnpm workspace 的 dev 协议，不属于运行时 manifest。

## 复现

```sh
rm -rf runtime/tmp/c13-dist && mkdir -p runtime/tmp/c13-dist
tar -xzf _dist/dsh-company-pack-0.11.9.tgz -C runtime/tmp/c13-dist
node -e "const p=require('./runtime/tmp/c13-dist/package/package.json'); const d=p.devDependencies||{}; console.log('dev',Object.keys(d).length,'workspace',Object.values(d).filter(v=>String(v).startsWith('workspace:')).length)"
cd runtime/tmp/c13-dist/package && npm install --dry-run --ignore-scripts --no-audit --no-fund --package-lock=false
```

实测 `dev 24 workspace 21`；第二条 `exit=1` / `EUNSUPPORTEDPROTOCOL`。

## 根因与证据

- 根因：发布前没有把 `devDependencies` 从 tarball manifest 里剥离/重写；`files` 只控制文件，不控 manifest 字段。`devDependencies` 对消费者本应被 npm 忽略，但**解包作为项目**或 `npm pack` 时会读；workspace 协议不是合法 URL。
- 证据：上命令；[package.json](../../packages/company-pack/package.json) 的 devDeps；npm 输出。
- 影响：安装包不能自检/重打包；审计者无法在包内跑依赖检查；也把 24 个 dev-only 名字带进运行时 manifest。

## 失败类与同类排查

**失败类 = 导出形态 / 发布面**（dev metadata 泄漏）。

同类：`prepack` 死引用（[BUG-214](BUG-214-shipped-prepack-missing-scripts.md)）；`README` dev 链接（[BUG-215](BUG-215-shipped-readme-dev-links.md)）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 发布 manifest 去掉 `devDependencies`（或重写成可解析版本）；`files` 只留运行时字节；根 `package.json` 继续保留 workspace devDeps。
2. 最小判据：tarball 内 `npm install --dry-run` 成功；`devDependencies` 为空或全部可解析。
3. 正例：`pnpm install` 在仓库根仍按 workspace 工作。
