---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-087：wiki 模板的 `cp -R` 路径是仓库路径，安装用户无法照做；面板提示也不给安装包路径

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A5 / H12）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

模板 README 的第一步（`content/wiki-template/README.md:9`）：

```sh
cp -R packages/company-pack/content/wiki-template /path/to/your-wiki
```

这条路径只在**本仓库 checkout** 成立。tarball 安装后，模板在：

```
<profile>/node_modules/dsh-company-pack/content/wiki-template
```

（实跑 `npm pack` 当前源码：`package/content/wiki-template/*` 在包里；`release-smoke` 安装副本根 = `node_modules/dsh-company-pack`。）

安装用户按 README 执行 `cp -R packages/company-pack/content/wiki-template` 会得到 `No such file or directory`。面板的失效提示也只写 `模板见 content/wiki-template`（`src/client/locales.ts:309` / en `:623`），没有说「相对哪个根」；用户既不知道模板在哪，也不知道该从安装包拷。

此外 `content/README.md:15` 只写「`cp -R`」，没有给安装路径；安装手册本轮前生成，未含 wiki 模板。

## 根因（假设）

模板内容从仓库视角写（`packages/company-pack/content/wiki-template`），没有区分「仓库开发视图」与「安装视图」。面板文案复用同一个 pack-relative 字符串，没有做成可点击/可复制的安装路径。

## 暴露的失败类

**随包内容的文档只对开发者成立**：模板是「装好就能用」的产品面，但使用说明里的路径只在源码树存在。同类：任何 `content/` / `presets/` 里的「从这里拷/读」指令，都要按安装根写，或同时给两个视图。

## 复现

1. `cd packages/company-pack && npm_config_cache=... npm pack --pack-destination runtime/tmp`。
2. `tar -tzf runtime/tmp/dsh-company-pack-0.11.5.tgz | grep wiki-template` → `package/content/wiki-template/*`。
3. 在任意非仓库目录执行 README 的 `cp -R packages/company-pack/content/wiki-template /tmp/x` → 失败。
4. 面板：设一个没有 `index.md` 的 wiki 指针，失效原因显示「模板见 content/wiki-template」，不指向安装包。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- README 改成从安装根可执行的形式，例如 `cp -R node_modules/dsh-company-pack/content/wiki-template /path/to/your-wiki`（按 profile 实际根），并保留仓库开发视图的一行。
- 面板提示改成「模板在安装包的 `content/wiki-template/`」或直接给当前部署的可复制路径；不要只写相对 pack 的名字。
- 安装手册/发布清单同步：模板是 `content/**` 的一部分，但不在 `manifest.json`，要知道去哪里找。
- 验收：干净 tarball 安装后，按 README 的命令能拷出并立即设指针成功。

## 修复关联

- 发现于 A5；与 H12 一致。
- 相关：[`content/wiki-template/README.md`](../../../packages/company-pack/content/wiki-template/README.md) · [`content/README.md`](../../../packages/company-pack/content/README.md) · [`src/client/locales.ts`](../../../packages/company-pack/src/client/locales.ts#L309)。
- 本卡不修；模板是随包内容（材料性），按章程请示。
- 2026-11-12 实跑：README 改回仓库路径 → 1 failed；复原 → 7 passed；面板 noIndex 提示带当前部署绝对路径（panel spec）。

## 已修判定

修成：模板 README 的拷贝命令改成安装视图（`node_modules/dsh-company-pack/content/wiki-template`），不再给仓库相对路径；面板「缺 index.md」提示带当前部署的模板绝对路径（`startup-options.json` 的 `wikiTemplate`）；`content/README.md` 与 `docs/contracts/profile.md` 同步安装路径。

- keyless：模板 README 含安装路径、不含仓库相对路径；`enumerateStartupOptions` 的 `wikiTemplate` 指向随包目录；面板 noIndex 用例断言绝对路径。
- 真安装：`release-smoke` ALL PASS（干净 profile 真安装 + content 随包）；tarball 清单含 `content/wiki-template/*`。
