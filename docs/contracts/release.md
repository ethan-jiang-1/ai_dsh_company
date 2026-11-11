# release · 发行版与发布物（company-pack）

> 什么时候读：发布、打包、装进真实 profile、升 vendor pin 时。
> 本仓交付一份 **Harness 发行版**：bundle + `company` profile + workspace 公司状态 + Harness home 策略 +
> 生命周期。**发布物（release artifact）** 只是可下载的 tarball/安装手册；发行版包含六轴。
> 每次发布的操作步骤 = [guides/release-runbook.md](../guides/release-runbook.md)；一条命令入口 = `pnpm release`。
> 外部规范 = `_faq_on_digested/26_harness-release`（研究材料，不是 DSH 合同）；DSH 合同仍以
> `vendor/dsh` 钉住 tag 为准。执行器 = `release-smoke` / `tools/sync-dsh.mjs`。

## 六轴 owner

| 轴 | 本仓答案 | 读回 |
|---|---|---|
| 运行时 | 用户已装 DSH（npm/Desktop）；本包不捆绑运行时；`engines.dsh >=0.2.1-rc.2 <0.3.0` | `dsh --version` / `pack-engines` |
| profile | 自定义具名 `company`；首次 `--from-default-profile web`；用户/DSH 拥有；本包不写 profile patch | `$DSH_HOME/profiles/company/package.json` 的 `dsh.profile.bundles` |
| patch 层 | `dsh.bundle.patch` 数组；默认值在 bundle patch；profile/home 可覆盖；`config` 整份替换 | `dsh --profile company --dump-config` |
| app surface | Web（`dsh --profile company`）；client 面随包；Desktop 仅 Plugins 页安装、未真机验证 | 启动横幅 / `client-load-smoke` |
| Harness home 与数据 | `<workspace>/.dsh-company/` 公司状态；`$DSH_HOME/company/` 治理；sessions/凭据归 DSH | [data-model.md](./data-model.md) |
| 生命周期 | 应用内 Plugins 页默认；CLI 仅 `dsh web` 自动化；装完重启；无命令级回滚；卸载不删数据 | 安装三态 + 真启动 |

**发布物 ≠ 发行版**：tgz（及安装手册）是发布物；发行版还要有 profile 归属、patch 层默认值、app surface、
home/数据策略和生命周期承诺。六轴任一格写“默认应该有”，这份发行版就不完整。

## 依赖姿态

- **runtime 依赖 = `peerDependencies`，不精确钉死**（`dependencies` 面为空）：`@deepseek-ai/cordis` +
  组合行用到的 `@deepseek-ai/dsh-*`；版本以 `packages/company-pack/package.json` 为准，此处不复述。
  理由：DSH API 仍 pre-stable；精确钉会逼每次上游同步发版。
- **peers 是声明语义**：profile 模板自带 `autoInstallPeers: false` + `nodeLinker: hoisted`，out-of-tree
  插件的 peers 由安装锚解析，共享 dsh 安装侧的 cordis/工具包，不产生第二份单例。
- **兼容窗口 = `engines.dsh`**：DSH 安装/启动只读这一行（存在即忽略 peers）。窗口是“可安装”，不是
  “已认证”；已认证 tag 台账住 repo，不随包分发。当前窗口与实测见 `package.json` 与
  `checks/gates/lib/compat-tags.json`；`pack-engines` + `pack-compat` 各查一边。
- **browser 两包条件启用**：npm 的 `@deepseek-ai/dsh` 不含 `dsh-browser-use` 与
  `dsh-experimental-browser-use-playwright-mcp`；六角色 preset 的 browser 组在可解析时启用、
  `DSH_COMPANY_BROWSER=on/off` 强制；两包不进 `dependencies`，保持离线/零 runtime 依赖姿态。
- **许可与发布**：MIT + `LICENSE`、`author`/`homepage`/`keywords`/`publishConfig.access: public`；
  `private` 已移除。发布面 = npm + 自托管 market index；真实 `npm publish` 是人工 handoff。
- **client 面自打包**：`lib/client.js` 由 tsdown 产出，react 与 `dsh-client-*`/`dsh-api-*` 留作浏览器
  模块表 require；其余内联，tarball 的浏览器半零 runtime 依赖。
- **exports 不说谎**：`./src/*` 已摘；`files` 只发 runtime 两半与 `lib/types/**/*.d.ts`；tsc 中间物不进包。

## 兼容台账（`checks/gates/lib/compat-tags.json`）

```json
{ "dshReleases": ["<历史 tag>", "<当前钉住 tag>"] }
```

形状 = 数组，含历史验证 + 当前钉住 tag；实况以文件为准，此处不复述具体值。

FAQ 24 §9.2：`dsh.compatibility` 不是 DSH 字段，安装器/启动器不读；它已从 package manifest 移除，
台账只住 repo、不随包分发。运行时硬门只有 `engines.dsh`。语义 = 每个列名都是真实验证过的 vendor pin
tag（升 pin 走 sync-dsh，冒烟过了才加列）；`sync-dsh` 检查模式核对 submodule HEAD / `pin.mjs` 常量 /
`AGENTS.md` 簿记行 / 台账四处一致。

## vendor 政策（钉住的上游）

- **只读铁律**：`vendor/` 下受版本控制的内容一个字节都不许改——`pnpm verify` 双门禁强制
  （vendor-pin：submodule HEAD == 簿记 SHA；vendor-clean：`git status --porcelain` 为空），均带反证。
- **允许面**：① 只读（探索源码、`extends` tsconfig、import 包、跑构建脚本）；② 树内构建产物
  （vendor 自己 `.gitignore` 覆盖的 `lib/`、`apps/web/dist/`、`node_modules/`）。⚠ 禁 `git clean -x`。
- **想改 vendor 行为，三条正路**：

| 想要 | 正路 |
|---|---|
| 组合/配置差异 | 本 pack 的 bundle `cordis.patch.yml`（`- id:` 替换 / `- insert:` 新增）或 profile patch |
| 需要上游修 | 改 **DSH upstream** → 升 pin（`tools/sync-dsh.mjs`）；期间记入 `notes/` |
| 上游功能在本形态不可用 | **先证伪“不可用”再自建**（postmortem 0003；`dsh.client.inject` 不排 Cordis 激活，但排浏览器模块 factory arrival——准确语义见 [pack README](../../packages/company-pack/README.md)）。确属不可用才在本 pack 实现等价面 |

- **为什么用 SHA 而不用 tag**：tag 可被移动/别名，SHA 才是钉住的合同。
- **submodule 首次克隆技巧**：本地路径 + `-c protocol.file.allow=always`（单命令放行，未改全局配置）；
  `.gitmodules` 的 URL 已指上游。

## 发布冒烟（`release-smoke`，认证档）

认证档装的是 `_dist` 的**同一份发布 tarball**（`--tarball <path> --expect-sha <manifest.artifact.sha256>`），
不另 `npm pack`；干净 profile 用官方 `--from-default-profile web` 初始化，再做 CLI/应用内安装、boot/RPC、
首启、二次 boot、卸载与重装。程序、成本、超时和锁 = 脚本头注；判据 = 安装副本的 presets/client/`content/`、roster
零 broken、`session/create`、`application: applied`（或 `restart-required` 后重启）、stderr 无
`did not activate`/`skipping profile bundle`、`_dist` sha 与 manifest 一致、`plugin remove` 后
bundles 摘净且 `.dsh-company/` 字节不变（重装可恢复）。`release --verify` 同时跑
`company-entry-smoke`（真 tarball + 第二 workspace）与 `sourceFingerprint` 核对；`release --check`
拒绝“源已变但 `_dist` 未重打”。

全绿证明发布字节可装、可启动；不证明 vendor 新鲜构建，也不覆盖完整浏览器交互。`--link` 快速通道不替代
这条验证。

**启动入口冒烟**（`company-entry-smoke`）：真 tarball 装进干净 profile → `dsh --profile company`
（cwd=临时 workspace）→ 无 launcher/profile patch/根 seed；它不证明浏览器首屏（client-load 另测）。

**通道矩阵冒烟**（`channel-matrix-smoke --channel all`）：vendor built CLI + 真实全局 `dsh`，验证六角色
roster 与 `session/create`；`--with-browser` 另验 browser 两包后自动启用。它证明真实启动器通道，不证明
浏览器 UI；需要 PATH 有 global `dsh` 与网络，默认不进 `release --verify`，发布前手动跑。

**隔离矩阵冒烟**（`isolation-matrix-smoke`）：无 workspace 零写、外部 workspace、同 home 顺序 A/B、
落点不安全、相对/`~` 归一、旧布局告警不迁移。它不证明搬家后 DSH 的 `storages/workspace.json`/session
cwd 会自动迁移。

## 升 pin 程序（`node tools/sync-dsh.mjs`，认证档）

**触发政策**：升 pin = **用户策动制**——agent 不主动盯上游 tag、不评估、不建议、不记录候选；只有用户
明确指示升 pin 才进本节程序。渠道只认 RC 与正式版；alpha/beta 及其他预发布 tag 通通不管（改政策须新 Note，见 D42）。

默认只读核对四处簿记，不做流程语义审计。升级使用 `source run/env.sh && node tools/sync-dsh.mjs --pin <tag>
--process-review <repo-relative.json>`；证据文件先经人审提交，两个工作树须干净。

**证据文件** = `notes/archived/<YYYY-MM-DD>-pin-review-<目标 tag>.json`；人审 JSON 必含 `fromSha`、
`toSha`、`reviewedBy`、`reviewedAt`、`processContractReview`。脚本核对文件受版本控制、字段非空及 SHA
对应；这是人审声明，不是自动语义审计，也不认证签名者身份。

人审结论必须额外覆盖三项：

1. **experimental 行重校**：本 pack 直插的 experimental 行逐字段对照 vendor 同 tag 的官方 optional
   bundle patch；差异须是有意识偏离并写明理由。
2. **货架过账**：对照外部研究树当轮 `_digested/plugin-inventory`；新增/退役能力按判收四档记入收割台账 Note。
3. **合成回放全绿**：vendor 换 tag 后先跑 `replay-smoke` 再谈语义结论；本仓现行回放网只证管线可跑，
   公司行为真实录制的语义回归网在部署仓。

程序：验证旧簿记及 `verify` → fetch tag 并核对证据 SHA → 暂存新簿记/台账 → checkout 候选 →
`pnpm install` → vendor 面 staging 构建后拷回（`git archive` 候选 → 独立 install + `pnpm run build` →
产物逐目录 `git check-ignore` 守门拷回）→ `test` + built `release-smoke` → 验证通过才写簿记/台账 →
再 `verify`。失败/TERM/INT 时恢复原 vendor HEAD、AGENTS/verify/compat-tags 和 lockfile；不使用
reset/clean，不覆盖并发修改。安装限 180 秒、vendor build 与 release-smoke 各 600 秒，其余 120 秒。

## 版本纪律

- 版本与每版变化唯一家 = `packages/company-pack/package.json` + [CHANGELOG](../../CHANGELOG.md)；此处不写变更史。
- 发布字节 = `_dist` 的 tarball；`npm publish` 用它，不从包目录重打。改内容必 bump。
- tarball/git 安装的版本门在安装后判定，失败会回滚；已允许的 build-script 副作用可能保留（FAQ 18）。
- 发布前必跑：`pnpm verify` + `pnpm test`（迭代环）+ `pnpm release --check`（dist 与源码指纹；
  **`verify` 绿 ≠ 可发布**）+ `release-smoke`（认证档）+ `channel-matrix-smoke --channel all`
  （真实 npm 通道）；preset/内容改动另跑 `preset-smoke`。
- `release --check` 的 READY 是**点态**：只对 `--stamp` 钉住的 commit 成立；之后再有提交，`gitSha` 落后、
  `--check` 变红是设计。把 READY 行（带 commit SHA）贴进当版 Note；没有输出的“已发布/READY”不算证据。
- **READY ≠ 索引可托管**：根 `market-index.json` 是发布前预览；`market-index.staged.json` 在场时
  默认 `release --check` 直接拒绝 READY。发布前要拿 READY，必须显式
  `--allow-pre-publish-index` 确认“不会托管”；发布后 `npm publish`、删 staged，再跑
  `pnpm market:hosted` 通过后才托管。
- **READY 的适用面 = 当前工作树**（暖 `lib/` + `_dist/`）。fresh-clone CI 只跑
  `install + bundle:init + verify`，不跑 test/release；干净 clone 上重放 release 是已知缺口，
  不冒充 READY 的承诺。
- **升级既有 workspace**：新增的状态默认值（如 `.dsh-company/kb/process-docs.md`）只在缺失时补种，用户改过的版本一个字节不覆盖；旧动议无 `编号体系:` 标记 = `/req check` 只读豁免（`skipped`），不回溯改历史。

## 手动分发（`node tools/export-dist.mjs`）

一条命令产出仓库外可装的两件套到 `_dist/`：`dsh-company-pack-<version>.tgz` + 生成式《安装手册》。
`_dist/` 是导出目的地不是源：tgz 全 gitignore；手册是唯一 tracked 例外，由脚本生成、永不手改；
`dist-manual` 门禁核对手册表头版本 == package、关键安装形状与 sha256。版本 bump 必须同 diff 重导。
**导出先 build**：`tsc -b` + `tsdown`（`lib/` 是 gitignored；直接 `npm pack` 会打旧产物）；打包步 = 与
`release-smoke` 相同的 `npm pack`（npm cache 钉 scratch）。**产物身份**：`export-dist` 算 tgz sha256，
写 sidecar 并注入手册；`dist-manual` 在本体在场时逐字节核对，未导出时只查形状。**导出 ≠ 发布**：不 bump、
不跑认证档、不进 registry；真实发布按上文。
