---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-219：发布包 `devDependencies` 保留 21 条 `workspace:*`，解包 `npm install` 直接 EUNSUPPORTEDPROTOCOL

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：修复就绪｜修复：2026-11-17（进行中）｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-2 / B）。
> **留痕**：批次 Note `notes/implemented/2026-11-17-shipped-package-boundary.md`（本批共用）。

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

修成什么算修好：

1. tarball `package.json` 无 `devDependencies`，全包无 `workspace:` 协议；source package.json 的 workspace devDeps 保留。
2. `pnpm release:shape` 对旧 tarball 报 24 devDeps / 21 workspace，新 tarball 0。
3. 安装形状：解包后 `npm install --dry-run --omit=peer --ignore-scripts` 不再 EUNSUPPORTEDPROTOCOL（网络依赖另记）。
