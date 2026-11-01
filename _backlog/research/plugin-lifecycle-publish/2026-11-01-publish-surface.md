---
topic: plugin-lifecycle-publish
intent: "发布面事实核对：npm 包身份、市场 index format 1、官方目录准入、外部插件的更新语义、_dist provenance 与文档骨架的差距。"
---

# 发布面：npm、市场、目录与文档的真事实

> 服务卡：[生命周期与发布卡](../../issues/2026-11-01-plugin-lifecycle-publish.md)。
> 性质：静态事实 + 可复现的本地校验，不是方案。
> 证据：T = 本轮真跑；C = vendor/FAQ/本仓源码与文档。

## 1. npm 包身份：现在是「内部交付」，不是「可发布」

读 `packages/company-pack/package.json`（C）：

| 字段 | 现值 | 对发布意味着什么 |
|---|---|---|
| `name` | `dsh-company-pack` | 未加 scope；npm 上当前**可用**（`npm view dsh-company-pack version` → 404，T） |
| `version` | `0.6.0` | 从未发布；0.6.0 是内部导出物 |
| `private` | `true` | `npm publish` 会被 `libnpmpublish` 以 `EPRIVATE` 拒绝（C：本机 npm 10.9.8 的 publish 入口；`--dry-run` 不经过这层，实测 dry-run 通过） |
| `license` | `UNLICENSED` | 语义 = 未授予再分发权，与「社区市场发布」直接冲突 |
| `repository` | GitHub URL + `directory` | 有；市场 generator 能转成仓库页（C） |
| `author` | 缺失 | 市场卡片没有作者；generator 会省略该字段（C） |
| `homepage` | 缺失 | 市场卡片没有主页；generator 只认 manifest 的绝对 http(s) URL，不拿 repository 顶替（C） |
| `keywords` | 缺失 | Discover 的关键词检索为空；generator 只复制 manifest `keywords`（C） |
| `publishConfig` | 缺失 | 未声明 `access`；unscoped 包默认 public，scoped 包默认 private（C：FAQ 24 §2） |
| `scripts` | 无 | 好事：tarball 没有 install/postinstall，不需要 profile 的 `allowBuilds`（C/T） |
| `engines.dsh` | `>=0.2.1-rc.2 <0.3.0` | 唯一硬门；窗口宽于已认证面（rc.2 + rc.5） |
| `files` | `lib/index.js`、`lib/client.js`、`lib/*.js`、`lib/types/**/*.d.ts`、`presets/**`、`locale/*.json`、`icon.svg`、`cordis.patch.yml`、`content/**` | tarball 126 文件 / 917.4 kB unpacked（T：`npm publish --dry-run`）；**没有 LICENSE 文件** |
| README | 在 tarball 内 | npm 会自动带上；但内容是内部交付口吻（见 §5） |

`npm publish --dry-run`（T）：126 files、`+ dsh-company-pack@0.6.0`、提示需要登录、**没有报
private**——因为 dry-run 在 `libnpmpublish` 之前返回；真实 publish 会被 `EPRIVATE` 挡住。

结论：**`private: true` + `UNLICENSED` 是本仓发布姿态的明示，不是疏忽**；要进入社区市场，
必须把这两项连同作者/主页/关键词/许可证一起改掉，并同步改本仓的 `pack-engines` 门禁
（它现在明确要求 `private === true`，见 `checks/gates/pack-shape.mjs`，C）。

## 2. 市场：一份静态 JSON，DSH 只校验格式

FAQ 24 §6 与 vendor 的
[plugin-market-index](../../../vendor/dsh/packages/util/plugin-market-index/README.md)、
[plugin-market-generator](../../../vendor/dsh/apps/plugin-market-generator/README.md)（C）给出的事实：

- 市场**源**是第三方托管的静态 JSON（`format: 1`），DSH 不托管；`dsh-plugin-market` 是实验服务；
  官方不带任何 index 源。
- Discover 是**实验开关**：shipped profile 默认关闭，需要用户在 Plugins → Experimental plugins →
  **Custom plugin markets** 打开；打开后才有 Discover 页与 `plugin_market` 工具（C：
  [plugin-market-bundle](../../../vendor/dsh/packages/experimental/plugin-market-bundle/README.md)）。
- **官方目录只收第一方 `@deepseek-ai/dsh-*` bundle**，外部作者不可发布（C：FAQ 24 §7）。所以
  「借助 DSH 的社区市场」唯一可行的形态 = npm/Git + 自托管 index。
- index 的版本字段：`version`、`publishTimestamp`（Unix 秒）、`source`（npm 或 git+commit）、可选
  `engines.dsh`；文本是 `LocalizedText`，对象必须含 `en`；图标可内联 `data:`（解码 ≤32 KiB）或 URL，
  跨源必须 https。
- generator 从包 manifest 取的展示字段：`title`/`description`（locale `meta`，回退 name/description）、
  `icon`、`author`（author 字符串的名字部分）、`homepage`（只认绝对 http(s)）、`repository`
  （hosted-git-info 转成网页）、`keywords`。**我们缺 author/homepage/keywords。**

### 2.1 用真校验器验证我们的 index 条目（T）

用 vendor 的 `@deepseek-ai/dsh-plugin-market-index`（`0.2.1-rc.2` 的 built lib）对手写条目做
`parseMarketIndex`：

```json
{
  "format": 1,
  "title": { "en": "Dream Team Company Pack", "zh": "梦之队公司包" },
  "plugins": [{
    "name": "dsh-company-pack",
    "title": { "en": "Dream Team Company Pack", "zh": "梦之队公司包" },
    "description": { "en": "Five-role company plugin pack.", "zh": "五角色公司插件包。" },
    "icon": "icons/dsh-company-pack.svg",
    "author": "ethan-jiang-1",
    "homepage": "https://github.com/ethan-jiang-1/ai_dsh_company",
    "repository": { "url": "https://github.com/ethan-jiang-1/ai_dsh_company", "directory": "packages/company-pack" },
    "versions": [{ "version": "0.6.0", "publishTimestamp": 1790000000, "source": { "type": "npm" }, "engines": { "dsh": ">=0.2.1-rc.2 <0.3.0" } }]
  }]
}
```

结果：

```text
VALID format 1
plugins: dsh-company-pack
install target: {"spec":"dsh-company-pack@0.6.0"}
icon resolved: https://example.invalid/icons/dsh-company-pack.svg
```

即：**名字与条目形状不是问题，缺的是真实发布物与展示字段**。`marketInstallTarget` 对 npm 版本
返回 `name@version`，与 FAQ 24 的安装路径一致。

注意：index 里的 `engines.dsh` 只用于展示/推荐；安装时 DSH 重新读包自身 manifest 的
`engines.dsh`（C：FAQ 24 §6）。两处不一致时以包为准，所以 index 也要随包版本更新。

## 3. 显示元数据：文字能解析，但内容是旧的

用 `pluginManager/listBundles`（Plugins 页的数据源）在 rc.5 上读安装后的 bundle（T）：

```json
{
  "name": "dsh-company-pack",
  "official": false,
  "availability": "profile",
  "version": "0.6.0",
  "description": "Virtual company multi-role plugin pack: 5 role presets (CEO / VP-Eng / VP-Sales / COO / CFO) + host bundle rows + deployment brand skin. Design docs: docs/index.md",
  "meta": {
    "title": { "en": "Dream Team Company Pack", "zh": "梦之队公司包" },
    "description": {
      "en": "Five role presets, a company workspace starter, and the company Web tabs.",
      "zh": "五个角色 preset、出厂公司盘骨架与公司 Web 页签。"
    },
    "icon": "data:image/svg+xml;base64,…"
  },
  "installed": true,
  "enabled": true,
  "removable": true,
  "source": "file:/…/dsh-company-pack-0.6.0.tgz"
}
```

事实：

- **机制全对**：locale `en`/`zh` 都在、title/description 按语言解析、icon 从导出解析成 data URL；
  六条 preset 行与 `company-client` 行也都能解析到各自的 meta（C/T）。
- **内容过期**：`description` 里的 `deployment brand skin`、`Design docs: docs/index.md` 是内部口吻；
  locale description 说 `company workspace starter`——0.6.0 已经不 seed workspace 骨架（内容在
  `content/`）。市场卡片会原样展示这句。

## 4. 更新与卸载：外部插件没有 Update

vendor UI README 原文（C，[ui-plugin-manager](../../../vendor/dsh/packages/client/ui-plugin-manager/README.md)）：

> on-demand Official entries offer explicit Update, while other plugins are upgraded by
> uninstalling and reinstalling.

即：

| 插件类型 | 更新方式 |
|---|---|
| 官方按需目录条目 | 详情页有 **Update**；移除旧包 + 装新包 + 保持选择 |
| 外部 bundle（我们） | **没有 Update**；要卸载再装（CLI：`remove` + `add`；GUI：Remove + Install） |
| 全部 | bundle membership 变化要重启 profile；没有命令级回滚 |

当前 [_dist/安装手册.md](../../../_dist/安装手册.md) 写「GUI（默认）：在 Plugins 页更新/重装新版本」，
把外部插件说成了有 Update——这是**会让人找不到按钮**的文档错误。正确写法是「卸载当前版本 →
装新版本 → 重启」，并给出 CLI 等价命令。

卸载残留面与「删除整个 DSH_HOME」的过度建议见
[安装实验 §5](2026-11-01-install-apply-and-data.md#5-卸载摘插件不等于删公司t)。

## 5. `_dist` 的 provenance：当前产物不对应一个干净 commit

`_dist/release-manifest.json`（C）：

```json
{ "version": "0.6.0", "gitSha": "6243e262…", "dirty": true, "generatedAt": "2026-11-01T12:46:06.102Z" }
```

而当前 HEAD = `ef50554…`（v3 实施提交），manifest 的 `gitSha` 是它的父提交，且 `dirty: true`。
本仓的 `tools/release.mjs` 明确检查（C）：工作树必须干净、manifest `gitSha` == HEAD、`dirty === false`，
否则 `--check` 红；而且它**故意不 publish**（头注：不 commit、不 push、不 npm publish）。

所以：

- 现有 tarball 是「脏树导出」，不能作为发布字节；发布前必须从干净 HEAD 跑
  `pnpm release --all` + `pnpm release --check`，让 manifest 钉到 commit。
- 发布能力不是「再写一个 npm publish 脚本」这么简单：要先决定**谁拥有发布动作**（人跑 `npm publish`
  还是 CI 带 provenance）、**发布前跑哪些门**、**失败怎么回滚**（npm 不能覆盖同版本）。

## 6. 文档骨架：安装手册接近十段，但三处事实要改

FAQ 50/70 的十段：这是什么、前置、选运行时、安装、首次启动、验证、配置、升级、卸载与数据、排障。
当前手册（C）覆盖了这些段，但：

| 位置 | 现在写的 | 问题 |
|---|---|---|
| 安装（GUI 默认） | 「在 Plugins 页安装 `dsh-company-pack`」 | 包不在 registry，外部用户没法按名字装；要么先发布，要么写「粘贴 tarball 绝对路径」（Plugins 的 Add plugin 接受 tarball/绝对路径，C） |
| 适用 DSH | 「本包验证基线 vendor `dsh-v0.2.1-rc.2`；npm 发布版 `0.2.1-rc.3`」 | 内部术语（vendor/pin）进用户手册；rc.5 已是本机日用版，且本轮验过 host 面；应写 `engines.dsh` 范围 + 已验证版本 |
| 升级 | 「Plugins 页更新/重装新版本」 | 外部插件无 Update（§4） |
| 卸载 | 「要彻底删除一个公司…删除整个 `DSH_HOME` 和 workspace」 | 过度删除；正确面见实验 §5 |
| 安全/许可 | `UNLICENSED`（内部交付） | 与社区发布冲突；发布前必须改 |
| 市场 | 未提 | 发布后需要 Discover 开关 + index 源 URL 的一句说明 |

包 README（C）有 Install / What it contributes / Configuration / Data / Backup / Uninstall /
Known limitations，缺 FAQ 24 §7 建议的 **Verify** 与 **Compatibility** 两节；而且开头就说
「本包不在 npm registry」「由 `node tools/export-dist.mjs` 生成」——发布后这两句都会变成假话。

## 7. 把 FAQ 50 的十段投影到我们身上（差距表）

| 阶段 | DSH 机制（C） | 我们现状（T/C） | 差距性质 |
|---|---|---|---|
| 打包 | npm 包 + `dsh.bundle.patch`；`files` 决定 tarball | 形状对；`private`、无 LICENSE、无 author/homepage/keywords | 发布身份缺失（不是 DSH 拒绝） |
| 发布 | registry / tarball / git；准入看 `engines.dsh` | 只有 `_dist` tarball；无 npm、无 market index；`_dist` 脏树 | 渠道缺失 + provenance |
| 安装 | 默认 Plugins 页；CLI 面绑定 | CLI 绿；**in-app 红**（§2 实验）；GUI 句当前不可执行 | 默认路径坏（P1） |
| 初始化 | profile 首建归 DSH；无插件迁移钩子；一次性动作幂等 | 首启只补状态、二次零变更；`bundle.json` 身份 | 基本对；身份版本语义要写清 |
| 特殊初始化 | 存储版本接受集；产品级导入 | v2→v3 manifest 升级；0.5.0 布局不迁移 | 可接受（0.6.0 未发布，无外部 0.5 用户） |
| 配置 | `Config` schema + 五层 patch；config 整份替换 | 无 `Config` schema；只有 `cultivationRoot` 行 config；默认值在 bundle patch | 质量线：可调项少且文档化；设置页无入口 |
| 启动 | named profile；失败分级 | `dsh --profile company`；无 launcher；stderr 分级可读 | 对 |
| 更新 | 卸载再安装；重启；无命令级回滚 | CLI add 新 tgz；GUI 无 Update；`bundle.json.pack.version` 不跟随 | 文档错 + 语义待写清 |
| 卸载 | 只回收包与 patch 层，数据留下 | 实测残留面已列；手册过度删除 | 文档错（可能致数据损失） |
| 文档 | Plugins 页读 manifest/locale；README 固定形 | 元数据机制对、内容旧；README 缺 Verify/Compatibility；手册内部口吻 | 质量线（但影响市场卡片） |

## 8. 事实清单（给卡的输入）

| # | 事实 | 等级 |
|---|---|---|
| P1 | 名字 `dsh-company-pack` 在 npm 可用；unscoped | T |
| P2 | `private: true` 会被真实 publish 以 `EPRIVATE` 拒绝；dry-run 不拦 | C（npm 源码）+ T（dry-run） |
| P3 | 缺 author/homepage/keywords/publishConfig/LICENSE | T（manifest） |
| P4 | format 1 index 条目可通过真校验器；install target = `dsh-company-pack@0.6.0` | T |
| P5 | 市场是实验开关；官方目录不收外部作者 | C |
| P6 | generator 的展示字段来源与我们的缺口 | C |
| P7 | `listBundles` 元数据机制正确；文案过期 | T |
| P8 | 外部插件无 Update；只有官方按需条目有 | C |
| P9 | `_dist` manifest 脏树 + 非 HEAD；`release.mjs` 不 publish | C/T |
| P10 | 手册三处事实错误：GUI 安装句、Update、删整个 home | C/T |
