---
topic: 产品形态
intent: "把插件即产品的分发、版本兼容、构建产物、手册/README 真相、CI 与验证矩阵写透，给发布与文档落地卡提供技术支撑。"
---

# 插件即产品的发布、文档与验证工程

> 服务卡：[插件即产品（伞卡）](../../settled_issues/2026-11-01-plugin-as-product.md)、
> [发布与文档落地卡](../../settled_issues/2026-11-01-release-and-docs.md)。
> 性质：研究证据与发布面清单，不是决定；拍板项住卡。基线 = `vendor/dsh` `dsh-v0.2.1-rc.2`。
> 证据标签 **T** 实跑、**C** 源码/合同读、**P** 设计、**U** 未验证。
> 与主稿分工：主稿回答“产品形状/数据归属”；本稿回答“怎么发出去、怎么证明发的是对的、
> 文档/手册怎么不撒谎”。

## 0. 结论（先看八条）

1. **发布不是 `npm pack` 一次**：构建产物、tarball 清单、sha256、手册、`_dist/release-manifest.json`
   必须同源；`dist-manual`/`dist-freshness` 已把一部分钉住，但产品化会新增 bin/第二个 host
   entry/新路径，清单和门禁要一起改（C/P）。
2. **手册是产品合同的一部分，不是附件**：它是收件人唯一的安装/升级/备份/卸载说明；必须由脚本
   生成、版本/日期/条目数/sha 注入、永不手改；当前 `_dist/安装手册.md` 是 tracked 生成物。
3. **README 有两层**：根 README（产品/仓库入口）与 pack README（安装者视角）；两者不能互相
   复述所有细节，但都必须写清“`company` profile / `--workspace` / run bundle 在 workspace /
   home 治理 / 备份/卸载”。用户点名要改。
4. **兼容性有四种，不是一种**：`engines.dsh` 窗口（可安装）、peerDependencies（声明 API 面）、
   已认证 tag 台账（实测过）、DSH 版本升级/降级（pin 政策）。只有 `engines.dsh` 是运行时硬门；
   台账不随包分发（C：`docs/release.md`）。
5. **验证分层不能混**：keyless spec、真实入口 smoke（release/lifecycle/company-entry/
   client-load）、真模型/浏览器、跨机器/跨 OS，各证不同东西；不能用 `pnpm verify` 绿冒充安装
   可用，也不能用 release-smoke 冒充浏览器 UX（C：`docs/testing.md`）。
6. **CI 有已知缺口**：fresh-clone 只跑 install + bundle:init + verify；vendor 全量构建/打包在
   7GB runner 上会 OOM；Windows 未验证；npm 发布未启用。产品化不能把“CI 绿”说成“跨平台可用”
   （C：`docs/guides/bootstrap.md`、docs/release）。
7. **文档预算会挡路**：`doc-budget` 对 active docs 是棘轮；data-model 75/76、profile 63/66
   几乎没有余量。产品形状改写必须先“搬旧内容/压缩”，再决定是否按规则提额；否则实现会被文档
   门禁卡住（C）。
8. **发布面要能回滚**：旧 tarball、旧手册、旧 sha、旧 profile 依赖、旧 manifest/schema 都要能
   对照；没有回滚路径的发布只是“希望别坏”（P）。

## 1. 分发形状

| 形状 | 产物 | 适用 | 现状 |
|---|---|---|---|
| 仓库源码 | `packages/company-pack/` + 计划新增 tools/company | 维护者/开发 | 现行主路径（T） |
| 本地 tarball | `_dist/dsh-company-pack-<v>.tgz` + `.sha256` + `安装手册.md` + `release-manifest.json` | 内部交付/第二台机器 | 现行（T：0.4.6） |
| registry | npm 包 | 第二消费者出现再定 | 未发布；`private:true`/`UNLICENSED` |
| 预构建目录 | 复制构建产物 | 未承诺 | 不做（vendor 政策/新鲜度） |
| 容器/镜像 | — | 未承诺 | 不做（目标环境明确再做） |

- `_dist` 是导出目的地，不是源；tgz 全 gitignore，手册是唯一 tracked 例外（C：`docs/release.md`）。
- `export-dist` 先 build（tsc -b + tsdown），再 `npm pack`（cache 钉 scratch），再对产物本体断言
  清单边界，再算 sha256、注入手册；导出 ≠ 发布（不 bump、不跑认证档、不进 registry）。
- 新增产品面后，tarball 必须含：`bin/dsh-company.mjs`（计划）、`lib/register-workspace.js`
  （计划）、`workspace/AGENTS.md`、`cordis.patch.yml`、`lib/index.js`、`lib/client.js`、
  presets/locale/icon；不得含 workspace 数据/会话/凭据/构建中间物。

## 2. 版本与兼容

- `engines.dsh`：运行时硬门；`pack-engines` 门禁强制覆盖当前 pin；窗口是“可安装”，不是
  “已认证”。
- peerDependencies：声明验证过的宿主 API 面；profile 的 `autoInstallPeers:false` + hoisted
  让 peers 由安装锚解析；peers 不是安装要求。
- 已认证 tag 台账：`checks/gates/lib/compat-tags.json`；只住维护者仓、不随包分发；
  `pack-compat` 强制当前 pin 在列；升 pin 走 `sync-dsh`（用户策动制）。
- 版本纪律：改内容必 bump；发布字节 = 冒烟字节；`0.5.0` 是破坏性（profile 入口、bundle v2、
  路径、手册）；`CHANGELOG` 写迁移；降级/回滚要有旧 tarball。
- DSH 升级：pin 升级后要重跑 release-smoke/lifecycle/client-load；产品 shape 改动与 pin 升级
  不要混在同一 diff（否则无法归因）。

## 3. 构建与包形状

- 构建：`tsc -b packages/company-pack` + `tsdown`；`lib/` 是 generated、gitignored；
  `tsc -p` 在 solution root 是 no-op（C：现有 release-smoke 注释）。
- 新增第二 host entry（计划 register-workspace）：
  - `tsdown.config.ts` host entry 增加 `'register-workspace': 'lib/types/host/register-workspace.js'`；
  - `package.json` `exports["./register-workspace"]` + `files` 加 `lib/register-workspace.js`；
  - `cordis.patch.yml` insert 该 row；
  - `pack-files`/`release-smoke`/`export-dist` 清单断言该文件在场。
- 新增 bin（计划）：`package.json` `bin` + `files`；`dsh plugin add` 会链到
  `profiles/company/node_modules/.bin/`（T 小包）；`pack-files`/tarball inventory 断言。
- `exports` 不说谎：`./src/*` 不导出；`files` 只发 runtime 两半 + 新 entry + `.d.ts`；
  构建中间 `.js/.map/.tsbuildinfo` 不进包（C：现有 pack-files 门禁）。
- 客户端半：`lib/client.js` 由 tsdown 产出，react/`dsh-client-*`/`dsh-api-*` 外置；新增 host
  entry 不影响 client 半。

## 4. 手册 / README / docs 真相

- `_dist/安装手册.md`：脚本生成；表头版本/日期/sha/条目数注入；`dist-manual` 检查版本、sha、
  关键句、pin；版本 bump 同 diff 重跑 export-dist（C）。
- 新手册必须写：
  - `company` profile + 独立 home；`--from-default-profile web` 只在空 profile；
  - `--workspace` / 无 workspace 的行为；seed consent；
  - `.dsh-company/bundle.json` v2；workspace 业务备份 + home 治理导出；
  - 升级/降级/卸载/回退/搬 home/搬 workspace；
  - `DSH_COMPANY_BROWSER`、pnpm 11/12、Node ≥22.19、DSH 窗口、sha 校验；
  - 不把旧 `DSH_COMPANY_REBIND`/“一个 home 一个 bundle”当产品主路径（迁移段可提旧词）。
- 根 `README.md`：产品一句话、安装/启动最短路径、数据三层（pack/home/workspace）、备份/卸载、
  文档入口；不复制手册所有步骤。
- pack README：安装者视角；Install/Config/Data/Backup/Uninstall；`COMPANY.md` 碰撞；
  `exports` 路径；已知限制。
- docs：profile/runtime-map/data-model/release/project-map/guides/decisions/external-research/
  orient/demo；doc-budget 棘轮；旧形状搬 notes/archived + 链接；新决定 D 号 + Note。
- CHANGELOG：0.5.0 破坏性 + 迁移；不写流水账。
- 全仓 stale sweep：`rg 'company-workspace|bundle\.json|DSH_COMPANY_REBIND|--profile web|
  一个 home 一个 bundle|侧栏.*工作区'`；现行合同改、历史 Note 加取代 banner、归档不动。

## 5. 验证矩阵（谁证什么）

| 层 | 资产 | 证明 | 不证明 | 成本/前置 |
|---|---|---|---|---|
| 结构 | `pnpm verify`（52+ 门禁） | 形状/链接/预算/门禁接线 | 运行可用/行为正确 | 秒级；需 vendor 解析器 |
| keyless | `pnpm test`（119 files/1046 tests） | 模块逻辑/纯渲染/静态形状 | 真挂载/浏览器/模型 | ~15s |
| 安装 | `release-smoke` | 真 tarball 装进干净 profile、roster、boot、首启/二启 | 浏览器 UX、跨 OS | 分钟级；需 vendor 产物 |
| 生命周期 | `lifecycle-smoke` | 升级/降级/卸载/搬 home/business 恢复 | registry/并发/跨 OS | 分钟级；需 tarball |
| 入口 | `company-entry-smoke`（计划） | 启动器建 profile/装 pack/workspace/无参错误/seed | 浏览器 UX | 分钟级 |
| 浏览器 | `client-load-smoke` + cdp-probe | 真页面零挂载失败/品牌/页签 | 全交互/模型质量 | ~25s；需 playwright/chromium |
| 隔离 | `multi-install-smoke`/`isolation-matrix`/`external-workspace` | 多 home/profile/外部盘/搬 home | 多机/共享盘 | 分钟级 |
| 并发 | `concurrent-home-smoke` | 同 home 两进程可解析/不写坏 | 多 Host 支持 | 分钟级 |
| 真模型 | `preset-smoke`/`handbook-smoke`/`delegation-smoke` | 真挂载/注入/汇报线 | 质量/成本 | 需 key；不进 test |
| 跨平台 | CI（Ubuntu/macOS） | fresh clone verify；不跑全构建 | Windows/容器 | CI 预算 |

**纪律**：只报告实际跑过的；smoke 的 `ALL PASS` 不是“全产品通过”；真模型/浏览器不进
`pnpm test`；每条新判据要红→还原→绿原话（C：`docs/testing.md`）。

## 6. CI / 发布通道

- `.github/workflows/ci.yml` / `fresh-clone.yml`：install + bundle:init + verify；fresh-clone
  每周一；不跑 vendor 全量构建/打包（OOM）、不跑真模型/浏览器。
- 发布前手动：`pnpm verify` + `pnpm test` + `release-smoke` + `channel-matrix-smoke --channel all`
  + `preset-smoke`（内容改动）；生命周期/隔离/客户端按改动面。
- registry 发布：未启用；第二消费者出现再定；三态幂等（无→publish / sha 同→skip / 异→fail）
  已登记为要件，不预建脚本（C：docs/release）。
- Windows/容器：未验证；不承诺；文档写清。

## 7. 失败注入 / 发布回归

- tarball 缺 bin/register/workspace：`export-dist` 清单红；`release-smoke` 装后断言。
- 手册版本/sha 漂：`dist-manual` 红；重跑 export-dist。
- 文档旧主路径：`bare-path`/`md-links`/`dist-manual` 红；stale sweep。
- 旧 profile/旧 manifest：`lifecycle-smoke`；v1→v2 迁移；降级不静默写。
- 启动器安装半途失败：`interrupted-install-smoke` 扩展；重跑幂等。
- 浏览器挂载失败：`client-load-smoke`；失败现场落诊断目录。
- 发布字节 ≠ 冒烟字节：`dist-freshness`/sha 对照；不要手改 `_dist`。

## 8. 未决 / 风险

- registry 发布是否在 0.5.0 开？建议仍不开（第二消费者再定）。
- `company-entry-smoke` 的浏览器段是否进 CI？建议本地认证档，CI 只跑 keyless+verify。
- Windows 是否进验收？建议明确“不承诺”，避免半支持。
- 文档预算：先搬后压，还是按规则提额？需要 S4 决定。
- 手册是否内嵌启动器/脚本？建议手册给命令与 bin 路径，不内嵌可执行文件（sha/信任复杂）。

## 9. 服务卡与下一步

- 伞卡：[插件即产品](../../settled_issues/2026-11-01-plugin-as-product.md) S4/S5。
- 落地卡：[发布与文档](../../settled_issues/2026-11-01-release-and-docs.md)。
- 需要用户拍板：registry 是否开、Windows 声明、手册形态、doc-budget 处置。
