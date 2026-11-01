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
cat _dist/release-manifest.json            # artifact.sha256 / gitSha / dirty
node tools/market-index.mjs --prepare      # staged index（预演用；真实发布时间以第 3 步为准）
node tools/market-index.mjs --check
```

发布字节 = `release --check` 验过的 tarball；**不要**为了发布另打一次包。

## 2 npm publish（不可逆）

```sh
cd packages/company-pack
npm publish --access public
npm view dsh-company-pack@<version> version
```

- 同版本不能重发；内容变了先 `pnpm release --bump` 再走五步。
- 发布失败/中断时先 `npm view` 查是否已落地；已落地就不要重发同版本。
- provenance/CI 是后续增强，不在本页 v1。

## 3 生成真实 market index（推荐用 vendor generator）

```sh
printf 'dsh-company-pack\n' > /tmp/dsh-plugins.txt
pnpm --filter @deepseek-ai/dsh-plugin-market-generator start -- \
  --input /tmp/dsh-plugins.txt \
  --output <site>/index.json \
  --title "Dream Team Plugins"
```

generator 从 registry 读版本/发布时间/展示字段，写 `index.json` 与 `icons/`，并用同一份
`@deepseek-ai/dsh-plugin-market-index` 校验。**这一步会覆盖第 1 步的 staged index**——真实
`publishTimestamp` 以 registry 为准。

## 4 托管与校验

- 把 `<site>/index.json` 与 `<site>/icons/` 放到 **https** 静态主机（GitHub Pages / 对象存储 / 任意
  不跟随重定向的静态服务）；index 上限 128 MiB，图标可内联 `data:`（≤32 KiB）或相对路径。
- 校验：`node tools/market-index.mjs --check --out <site>`（名称/版本/图标与包 manifest 一致，且 DSH
  校验器通过）。
- 跨源图标必须是 https；`http:` 只允许同源。

## 5 用户侧发现（实验开关）

1. Plugins → Experimental plugins → **Custom plugin markets** 打开。
2. Plugins → **Discover** → Manage index sources → 加 `<index-url>`。
3. 选版本安装；安装完成后确认 `application: applied`、六条 preset 不 broken、`session/create` 能挂上。

默认安装路径仍是应用内 Plugins 页；市场只是**发现层**，不改变安装/版本门的判定（DSH 安装时读包自身
manifest 的 `engines.dsh`）。

## 6 回滚

- npm 同版本不可覆盖；72 小时内可 `npm unpublish`（会破坏已装用户的解析，慎用），更常用的是
  `npm deprecate` + 发修复版。
- 已安装用户没有命令级回滚：卸载当前版本 → 装旧 tarball/旧版本 → 重启 profile。
- market index 回退 = 换回上一版 `index.json` 与 icons；旧版本条目可保留。

## 7 回执

发布完成后把以下事实写进[生命周期与发布卡](../../_backlog/issues/2026-11-01-plugin-lifecycle-publish.md)
与实施 Note：版本、tgz sha256、manifest gitSha、npm 版本页、index URL、一次干净 profile 的安装验证结果。
