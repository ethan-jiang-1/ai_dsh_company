# 发布 handoff：npm publish 与 DSH 市场 index

> 什么时候读：`pnpm release --check` 打出 `READY` 之后，把当前版本真正发出去的人。合同 = [release.md](../release.md)；
> 五步发布字节流程 = [release-runbook.md](./release-runbook.md)；本页只补“字节离开仓库”的那一段。
> 为什么单独成页：npm publish 不可逆（同版本不能覆盖）、market index 是外部托管，两者都不该混进本地
> `pnpm release`（它故意不 publish）。

## 0 先决

- 工作树干净；`pnpm release --check` 已 `READY`（manifest `gitSha=HEAD`、`dirty=false`、tgz/手册 sha 一致）。
- 发布人持有 npm 账号/令牌，且对包名 `dsh-company-pack` 有发布权（unscoped 名首次 publish 即占名；
  若已被他人占用，先改 scope/名再走首次发布，改名会破坏行 name）。
- vendor 已按 [bootstrap](./bootstrap.md) 构建：市场 generator 与校验器住在 vendor 内。

## 1 确认发布字节

```sh
shasum -a 256 _dist/dsh-company-pack-<version>.tgz
cat _dist/release-manifest.json            # artifact.sha256 / sourceFingerprint / gitSha / dirty
node tools/market-index.mjs --check
```

发布字节 = `release --check` 验过的 **_dist tarball**；**不要**为了发布另打一次包，也不要 `cd` 进包目录发布。

## 2 npm publish（不可逆）

```sh
npm publish _dist/dsh-company-pack-<version>.tgz --access public
npm view dsh-company-pack@<version> version
```

- 发布前先 `npm publish --dry-run _dist/dsh-company-pack-<version>.tgz`，确认 contents 与 `tar -tzf` 一致。
- 同版本不能重发；内容变了先 `pnpm release --bump` 再走五步。
- 发布失败/中断时先 `npm view` 查是否已落地；已落地就不要重发同版本。
- provenance/CI 是后续增强，不在本页 v1。

## 3 刷新 market index（仓库根 tracked 文件）

`release --prepare` 已经按 package 版本重生成仓库根 `market-index.json`（format 1、图标内联、
分类/标签/排序键齐全），它就是要托管的单文件。未发布期由 `market-index.staged.json` 标记
（`requiresPublish: true`）；发布成功后：刷新一次 → 删除 staged → 提交。

```sh
node tools/market-index.mjs --prepare
node tools/market-index.mjs --check
rm market-index.staged.json
git add market-index.json market-index.staged.json && git commit -m "chore(market): <version>"
```

可选：用 vendor generator 从 registry 读真实 `publishTimestamp`/registry：

```sh
printf 'dsh-company-pack\n' > _dist/market/plugins.txt
pnpm --filter @deepseek-ai/dsh-plugin-market-generator start -- \
  --input _dist/market/plugins.txt \
  --output _dist/market/site/index.json --title "Dream Team plugins"
# 对比后把确认的字段并回仓库根 market-index.json；不要同时托管两份
```

## 4 托管与校验

- 把仓库根 `market-index.json` 放到 **https** 静态主机（GitHub raw / jsDelivr / Pages / 对象存储）；
  它是单文件、图标内联，不需要额外 `icons/` 目录。
- 例：`https://cdn.jsdelivr.net/gh/ethan-jiang-1/ai_dsh_company@<ref>/market-index.json`
  （`<ref>` 用发布 commit/tag；raw.githubusercontent 同理）。
- 校验：`node tools/market-index.mjs --check --hosted`（默认读仓库根；名称/版本/图标与包 manifest 一致，
  DSH 校验器通过，且 served index 不含 `market-index.staged.json` 标记的未发布版本）。自定义位置用 `--out <file-or-dir>`。
  **托管前必须先跑 `--hosted`**：没有它，`--check` 只证形状，不证版本在 registry 里真的存在。
- 跨源图标必须是 https；本索引用内联 `data:`，不受此限。

## 5 用户侧发现（实验开关）

1. Plugins → Experimental plugins → **Custom plugin markets** 打开。
2. Plugins → **Discover** → Manage index sources → 加 `<index-url>`。
3. 选版本安装；安装完成后确认 `application: applied` 或 `restart-required`（按提示重启后再验）、六条 preset 不 broken、`session/create` 能挂上。

默认安装路径仍是应用内 Plugins 页；市场只是**发现层**，不改变安装/版本门的判定（DSH 安装时读包自身
manifest 的 `engines.dsh`）。

## 6 回滚

- npm 同版本不可覆盖；72 小时内可 `npm unpublish`（会破坏已装用户的解析，慎用），更常用的是
  `npm deprecate` + 发修复版。
- 已安装用户没有命令级回滚：卸载当前版本 → 装旧 tarball/旧版本 → 重启 profile。
- market index 回退 = revert 仓库根 `market-index.json` 到上一版；旧版本条目可保留。

## 7 回执

发布完成后把以下事实写进当轮发布 Note（`notes/implemented/<date>-release-<version>.md`）
与 `_dist/release-manifest.json`：版本、tgz sha256、manifest gitSha、npm 版本页、index URL、
一次干净 profile 的安装验证结果。归档卡只读，不再当收件箱。
