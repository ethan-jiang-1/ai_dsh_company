---
status: 已结
opened: 2026-11-01
---

# 推敲：插件生命周期与发布——把 0.6.0 做成能经社区市场交付的插件

> 立卡：2026-11-01 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：2026-11-02 用户要求收口。交付物 = 0.7.0 发布就绪（`release --check` READY）+ 应用内/CLI 安装、升级/卸载、市场 index 真校验、按名安装本地 registry 演练 + [publish-handoff](../../../docs/guides/publish-handoff.md)；**公有 npm publish 与 index https 托管按 D6 由发布人执行**，该回执不在卡内。

> **原始意图（用户原话）**：
> 「读读这里 …50-lifecycle …我看了 _dist/ 下的内容后，感觉到还是有不少距离 …需要你再次系统性地思考一下这件事儿怎么做对，退后一步，想清楚 …弄明白或者试探，或者是今后的方案，记着要显性化放到 _backlog/ …确保我们正儿八经很好地遵循了DSH插件的生命周期，尽量不要乱发明，我们要借助D.SH的社区(市场)发布内容，不要发布个稀奇古怪的东西 …最后给我一个计划」
> 「你一定要挖掘透做实验等等等等好吗？别轻而易举的就定调往前冲 _backlog/ 哎，你可以做实验，在research里头，方案还是在issues里头」
> 「可以写的只有本地repo里头的内容」
> 「静默自主执行，遇到障碍自行克服，直到所有issues 可以落地后验证，需要证据支持我们的落地，开始推进吧」（2026-11-01 执行授权）
>
> **一句话**：0.6.0 的 bundle 形状是对的；距离不在形状，在**交付面**——默认安装路径在真运行时上红、发布身份与渠道缺失、升级/卸载/文档的语义与 DSH 不一致。发布不是最后一步，是验收面。

## 问题与期望结果

**问题**：`_dist` 现在是一个「仓库内 tarball + 内部手册」；用户拿到它，无法按手册的默认句安装
（包不在 registry）、GUI 装完会看到激活失败、想升级却找不到 Update、想彻底删除会被建议删掉整个
`DSH_HOME`。这些不是文档小疵，是生命周期没走完。

**期望结果**：让 `dsh-company-pack` 以「可发布、可安装、可验证、可升级、可卸载、可被发现」的
形态交付：

1. FAQ 50 的十段里，**默认路径（应用内 Plugins 页）真绿**，不是只绿 CLI 侧门；
2. npm 身份完整（名称/版本/许可/作者/主页/关键词/`engines.dsh`），`_dist` 字节对应一个干净 commit；
3. 有一份可被 DSH 市场 Discover 读取的 index（format 1），并写清「市场是实验开关」；
4. 升级/卸载/数据位置的文档与真语义一致，不再出现「Update 按钮」与「删整个 home」这两类错；
5. 每一条都以真运行时实验收（rc.2 + rc.5），不以 dump/exit 0 代替激活。

## 当前情况（证据都在研究稿）

研究题：[插件生命周期与发布](../research/plugin-lifecycle-publish/README.md)。

| 面 | 已确认的事实 | 出处 |
|---|---|---|
| CLI 安装 | rc.2 / rc.5 都绿；六角色零 broken、`session/create` ceo、client 模块表在场 | [安装实验 §1](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md#1-cli-安装路径干净-profile-真装t) |
| in-app 安装 | **rc.2 / rc.5 都 `application: failed`**：`session-controller … file-upload: Agent resolver is already registered`；依赖保留、重启后恢复 | [安装实验 §2](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md#2-in-app-安装路径plugins-页同款调用失败tp1-缺陷) |
| 触发器 | 替换 `session-query-sqlite` 且**改值**；同值 override、其它 override、纯 insert 都不触发；静态 path 也失败 | [安装实验 §2.1](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md#21-分层-bisect触发器是-session-query-sqlite-的改值替换t) |
| 修法证据 | 最小 bundle 与官方 `session-search` 同款 isolated provider 组都能 live 应用 | [安装实验 §2.2](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md#22-两个对照最小-bundle-与官方隔离组t) |
| 版本门 | rc.5 CLI 对不兼容 `engines.dsh` 拒绝并回滚 package/lock/node_modules | [安装实验 §3](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md#3-版本门不兼容包会被拒绝并回滚t) |
| 升级 | 只换依赖与包副本；`bundle.json.pack.version` 停在创建版本；升级日志不追加 | [安装实验 §4](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md#4-升级依赖会换身份不换t) |
| 卸载 | 摘插件后 workspace `.dsh-company/`、home `company/`、`storages/company_run_bundle_ledger.json` 全留 | [安装实验 §5](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md#5-卸载摘插件不等于删公司t) |
| 发布身份 | `private: true`（真 publish 会被 `EPRIVATE` 拒）、`UNLICENSED`、缺 author/homepage/keywords/publishConfig/LICENSE；名字 npm 可用 | [发布面 §1](../research/plugin-lifecycle-publish/2026-11-01-publish-surface.md#1-npm-包身份现在是内部交付不是可发布) |
| 市场 | format 1 条目可通过真校验器；install target = `dsh-company-pack@0.6.0`；市场是实验开关；官方目录不收外部作者 | [发布面 §2](../research/plugin-lifecycle-publish/2026-11-01-publish-surface.md#2-市场一份静态-jsondsh-只校验格式) |
| 更新语义 | 外部插件**没有 Update**；只有官方按需条目有；其余卸载再装 | [发布面 §4](../research/plugin-lifecycle-publish/2026-11-01-publish-surface.md#4-更新与卸载外部插件没有-update) |
| 产物 provenance | `_dist/release-manifest.json` 的 `gitSha` 是 HEAD 的父提交、`dirty: true`；`release.mjs` 故意不 publish | [发布面 §5](../research/plugin-lifecycle-publish/2026-11-01-publish-surface.md#5-_dist-的-provenance当前产物不对应一个干净-commit) |
| 文档 | 手册三处事实错：GUI 安装句不可执行、Update 不存在、卸载建议删整个 home；README 缺 Verify/Compatibility 且说「不在 registry」 | [发布面 §6](../research/plugin-lifecycle-publish/2026-11-01-publish-surface.md#6-文档骨架安装手册接近十段但三处事实要改) |

## 差距清单（G1–G9）

| # | 严重度 | 差距 | 为什么现在不能发 | 修法方向 |
|---|---|---|---|---|
| G1 | **P0** | 默认 in-app 安装红 | 用户按手册第一句装，看到失败；FAQ 37 的「装成功」不成立 | 把 `session-query-sqlite` 的改值替换从 bundle patch 里拿掉，改成官方同款 **insert + isolate** 的独立 provider 组；工具行收敛到组内；两条安装路径都验 |
| G2 | **P0** | npm 身份是内部交付 | `private` 真发布被拒；`UNLICENSED` 与社区使用冲突；市场卡片无作者/主页/关键词 | 去 `private`、加 `license`/`LICENSE`/`author`/`homepage`/`keywords`/`publishConfig`；同步改 `pack-engines` 门禁与 README 的「不在 registry」句 |
| G3 | **P0** | 没有市场渠道 | 「在 Plugins 页装 X」对包名不成立；没有任何 index 可被 Discover 读 | npm 发布后跑 vendor 的 market generator（或手写 + 真校验器验），把 index 托管到 https 静态位置；文档写清实验开关与源 URL |
| G4 | **P1** | 升级叙事错 | 手册说有 Update；实际没有；用户会找不到按钮 | 文档改成「卸载 → 装新版本 → 重启」；给出 CLI 等价命令；`bundle.json.pack.version` 语义写清（或改为跟随当前包） |
| G5 | **P1** | 卸载数据面错 | 「删除整个 `DSH_HOME`」会连用户的会话/凭据一起删 | 手册列精确删除面：workspace `.dsh-company/` + home `company/` + `storages/company_run_bundle_ledger.json`；加残留快照测试 |
| G6 | **P1** | 产物不对应 commit | 脏树 tarball 不可复现，不能作为发布字节 | 从干净 HEAD 跑 `pnpm release --all` + `--check`；发布前 manifest `dirty=false`、`gitSha=HEAD`、sha 与发布字节一致 |
| G7 | **P2** | 展示文案过期 | 市场卡片会展示 internal 口吻与「workspace starter」 | 改 `package.json.description` 与 `locale/{en,zh}.json` 的 `meta`；不改机制 |
| G8 | **P2** | README/手册不是发布形 | 收件人读到的是仓库内部流程（`tools/export-dist.mjs`、vendor 术语） | README 补 Verify/Compatibility，删内部引用；手册按 FAQ 70 十段重写，写 `engines.dsh` 范围与已验证版本 |
| G9 | **P3** | 安装噪音与配置面 | pnpm 报 peer 警告；无 `Config` schema、无设置页入口 | 决定 peer 警告是否用 `peerDependenciesMeta` 收敛；`Config`/设置页作为后续质量线，不在本轮阻塞发布 |

## 方案与取舍（需要人拍板）

| # | 决策 | 推荐 | 另一条的影响 |
|---|---|---|---|
| D1 | 会话全文检索怎么修 | **A：insert + isolate 的独立 provider 组（官方 `session-search` 同款），工具行从五个 preset 收敛到组内** | B：首启写 profile patch（启动生效，不 live 重载）——产品重新成为 profile 写者，违背 v3 的 D4，且要重启；C：接受 in-app 红、文档让人重启——默认路径仍红，不接受；D：砍掉 durable 索引——角色 `session_search` 工具退化 |
| D2 | 包名 | **保留 `dsh-company-pack`**（npm 可用、市场校验通过、零改名） | 改成 `@scope/dsh-company-pack` 更符合社区惯例、避免 `dsh-` 前缀被误认官方；但要在首次发布前改，且 scope 要先在 npm 拿到 |
| D3 | 许可 | **MIT**（社区插件的默认预期） | Apache-2.0（专利条款更明确）；保持 `UNLICENSED` + `private`（那就不要发布到市场） |
| D4 | 发布渠道 | **npm + 自托管 market index**（FAQ 24 §11 的正式发布建议） | 仅 Git 源 index（不发 npm）：用户装 commit，构建/审批成本高；仅 tarball：没有发现层 |
| D5 | 首个发布版本与引擎窗口 | **0.7.0**（0.6.0 从未发布，本轮含行为修复）；`engines.dsh` 保持 `>=0.2.1-rc.2 <0.3.0`，文档写已验证 rc.2/rc.5 | 收窄到 `<0.2.2` 会把 rc.5 用户挡在外面；0.6.1 也行，但本轮修了默认安装路径，minor 更诚实 |
| D6 | 发布动作归谁 | **v1 人工：`pnpm release --check` 绿后，有 npm 权限的人执行 `npm publish` + 跑 generator + 更新 index**；CI/provenance 后续 | CI 带 provenance 更可信，但要先把发布仓库/权限/密钥准备好；不阻塞 v1 |

## 决策记录（agent 代行 review，2026-11-01）

用户 2026-11-01 授权「静默自主执行…直到所有 issues 可以落地后验证」；据此对 D1–D6 做如下选择，
可逆项记录代价，真实 npm publish 仍留人工（不可逆 + 需凭据）：

| # | 选择 | 理由 |
|---|---|---|
| D1 | **A：insert + isolate 独立 provider 组**（官方 `session-search` 同款）；六个 preset 的工具行收敛到组内 | rc.2/rc.5 实测唯一能让默认 in-app 安装 `application: applied` 的修法；代价 = 侧栏 `session/search` 保持出厂 `openAt: never` |
| D2 | **保留 `dsh-company-pack`** | npm 可用、市场 format 1 通过；改名破坏行 name/用户配置，首次发布前无收益 |
| D3 | **MIT** + `LICENSE` | 社区插件的默认预期；`UNLICENSED` 与市场发布冲突 |
| D4 | **npm + 自托管 market index**（index 用 vendor generator/真校验器） | FAQ 24 §11 的正式发布建议；官方目录不收外部作者 |
| D5 | **0.7.0**；`engines.dsh` 保持 `>=0.2.1-rc.2 <0.3.0`，文档写已验证 rc.2/rc.5 | 0.6.0 从未发布；本轮含默认安装路径行为修复 |
| D6 | 真实 `npm publish` = **人工 handoff**（`pnpm release --check` 绿后由有凭据的人执行） | 不可逆且需要 npm 认证；agent 不代持凭据 |

## 落地阶段（P0–P5）

> 顺序只此一份；阶段内有并行，阶段间有出场门。每阶段可停、可回退。卡本身不授予实施权限。

### P0 · 修默认安装路径（G1）

- **交付**：bundle patch 去掉 `session-query-sqlite` 改值替换；新增 isolated provider 组；五个 preset 的
  `tool-session-query` 行收敛到组内；`cordis.patch.yml` 注释与 `docs/contracts/presets.md` 同步；新增/更新
  smoke：in-app 安装（`pluginManager/installBundle`）与 CLI 安装两条都跑。
- **出场门**：rc.2 与 rc.5 干净 web profile 上，in-app 安装 `application: applied`；六 preset 零 broken；
  `session/create` ceo 成功；client 模块表在场；stderr 无 `did not activate`；CLI 路径不回归；重启不再是
  让功能出现的前提。
- **失败就停**：组内工具与 preset 工具重复注册 / 隔离 provider 找不到 / 仍红 → 回 D1 改方案。
- **回退**：保留旧 patch；单独 revert 这一阶段。

### P1 · 发布身份（G2）

- **交付**：D2/D3 落地（名称保持或改 scoped、许可与 `LICENSE`）；`author`/`homepage`/`keywords`/
  `publishConfig`；删 `private`；`pack-engines` 门禁改为「发布态」判据（不再强制 private，改为要求
  license/author/homepage/publishConfig 与 engines）；README 首屏去掉「不在 registry」与内部工具引用；
  CHANGELOG + 版本 bump（D5）。
- **出场门**：`npm publish --dry-run` 不再有身份缺口（不会真的发）；tarball 含 `README`/`LICENSE`/
  `content/`/`presets/`/`locale/`/`icon`；无 `bin/`、无 lifecycle scripts；`pnpm verify` 绿。
- **失败就停**：门禁与发布姿态打架 / license 决策未定 → 停，不 bump。

### P2 · 产物 provenance（G6）

- **交付**：干净树上 `pnpm release --all` → `pnpm release --check`；`release-manifest.json`
  `dirty=false`、`gitSha=HEAD`；记录 tarball sha；发布清单写进 runbook（不新增第二套发布工具）。
- **出场门**：`_dist` 字节 = 当前 HEAD 构建；`--check` 绿；手册/README/CHANGELOG 与包版本一致。
- **失败就停**：manifest 非 HEAD / 脏树 → 重跑，不带病发布。

### P3 · npm 发布 + 市场 index（G3）

- **交付**：发布 D5 版本到 npm（人工，D6）；跑 vendor 的
  [`plugin-market-generator`](../../../vendor/dsh/apps/plugin-market-generator/README.md) 生成 index + icons
  （或手写条目 + 真校验器）；托管到 https 静态位置；文档写「Plugins → Experimental plugins →
  Custom plugin markets → 加 index URL → Discover」。
- **出场门**：`parseMarketIndex` 通过；`marketInstallTarget` 指向 `name@version`；干净 profile 能按
  npm 名字 `dsh plugin add` 成功；Discover 步骤有可执行文案。
- **失败就停**：包名/版本在 registry 不可解析 / index 校验失败 → 回 P2，不发布。

### P4 · 升级/卸载/数据文档与测试（G4/G5）

- **交付**：手册升级段改「卸载 → 装新版 → 重启」；卸载段列精确删除面；`bundle.json.pack.version`
  语义写清（若选跟随，则加更新逻辑与测试）；新增卸载残留快照 smoke（复用
  [`interrupted-install-smoke.mjs`](../../../checks/smoke/interrupted-install-smoke.mjs) 的形状）。
- **出场门**：升级实验（0.6.x → 0.7.x）依赖/包副本/run bundle 断言通过；卸载后残留面与文档逐项一致；
  不再出现「删整个 `DSH_HOME`」。
- **失败就停**：残留面与文档不一致 → 改文档或改实现，不带错发布。

### P5 · 文档/展示面收口与最终验收（G7/G8/G9）

- **交付**：README 补 Verify/Compatibility、删内部引用；locale/package description 改公共口吻；手册按
  FAQ 70 十段重写（含 `engines.dsh` 范围、已验证版本、市场开关、许可）；peer 警告处置记录；全量
  `pnpm verify`/`test`/`typecheck` + 认证档 smoke；`_dist` 重导；实现 Note/RFC。
- **出场门**：十条验收全绿；每道新判据有红→绿记录；手册与 tarball 同版本；`_dist` sha 一致。
- **失败就停**：任一认证档红 → 回对应阶段。

## 验收标准

1. **默认安装在两条运行时上都绿**：rc.2 与 rc.5 的干净 web profile，`pluginManager/installBundle`
   对 tarball 返回 `application: applied`；六角色 `agentPresets/list` 零 broken；`session/create` 以
   `ceo` 成功；页面模块表含本包 client；stderr 无 `did not activate`。
2. **CLI 路径不回归**：`dsh plugin --profile <p> add <tgz>` → roster 含包 → 真启动无 stderr；不兼容
   `engines.dsh` 被拒绝且 package/lock/node_modules 回滚。
3. **npm 身份完整**：`npm publish --dry-run` 无 EPRIVATE；`license` + `LICENSE` 文件、`author`、
   `homepage`、`keywords`、`publishConfig`、`engines.dsh` 在场；tarball 含 README/LICENSE/content/
   presets/locale/icon，无 `bin/`、无 install/postinstall。
4. **市场可发现**：`format: 1` 的 index 通过 `@deepseek-ai/dsh-plugin-market-index` 校验；条目含
   name/version/publishTimestamp/source/engines 与 en(+zh) 文本、图标；`marketInstallTarget` 给出
   `name@version`；文档写清实验开关与源 URL。
5. **产物可追溯**：`_dist/release-manifest.json` 的 `gitSha` == 发布 commit、`dirty === false`；
   `pnpm release --check` 绿；发布 tarball 的 sha256 与 manifest/手册一致。
6. **升级语义**：文档写「外部插件无 Update；卸载再装 + 重启」；0.6.x → 0.7.x 的 reinstall 实验通过；
   没有「一条命令回滚」的错误承诺。
7. **卸载与数据**：手册列出 workspace `.dsh-company/`、home `company/`、
   `storages/company_run_bundle_ledger.json`；残留快照测试与文档逐项一致；不出现「删整个 `DSH_HOME`」。
8. **README/手册形状**：README 含 FAQ 24 §7 的 Install / What it contributes / Configuration / Data /
   Compatibility / Uninstall（Verify 可合并进 Install 后的验收段）；手册覆盖 FAQ 70 十段；无 vendor/pin
   内部术语；无 `--profile desktop`；安装句与 registry 现状一致。
9. **静态门禁**：`pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿；`pack-engines` 与 `dist-manual`
   按新发布姿态更新；每道新判据有红→绿原话。
10. **发布后回执**：npm 版本、market index URL、tarball sha、四段验收（装/起/配/首启 + 升/卸）写进
    实现 Note 或卡顶去向。

## 范围与排除项

**范围**

- bundle patch 的 in-app 安装修复（D1）与两条安装路径的验收。
- npm 身份/许可/元数据、LICENSE、CHANGELOG、版本 bump。
- `_dist` provenance 与发布清单；npm 发布与 market index（D4/D6）。
- 升级/卸载/数据面文档与残留测试。
- README、`_dist/安装手册.md`、`packages/company-pack/README.md`、locale 文案、`pack-engines`/`dist-manual`
  门禁、相关 tests/checks。

**排除**

- 新 launcher / package bin / 发布 profile 目录 / 第二个更新器（v3 已定）。
- 官方目录（只收第一方）、Desktop 真机、Windows/Linux、容器/镜像。
- CI provenance、签名/公证、私有 registry（D6 后置）。
- 多公司/多 home 数据模型重做、0.5.0 迁移（0.6.0 未发布，无外部用户）。
- 改 vendor、升 pin、改五角色 persona 语义（除工具行收敛所需的配置移动）。

## 未决 / 需要用户确认

| # | 需要决定 | 推荐 | 不决定的后果 |
|---|---|---|---|
| D1 | 会话检索修法 A/B/C/D | A（isolated 组） | G1 不修，默认安装继续红，P0 无法出门 |
| D2 | 包名保留 / 改 scoped | 保留 | 首次发布后改名是破坏性变更（行 id/文档/用户配置） |
| D3 | 许可 | MIT | 保持 UNLICENSED 就不能面向社区发布 |
| D4 | 渠道 | npm + 自托管 index | 没有发现层，只能发 tarball |
| D5 | 首版版本/引擎窗口 | 0.7.0 + 保持窗口 | 版本语义与修复不对应 |
| D6 | 发布动作 | v1 人工 + 清单 | 没人拥有 publish，P3 无法执行 |

## 实施回执（2026-11-02，0.7.0）

**P0 完成**：`cordis.patch.yml` 去掉 `session-query-sqlite` 改值替换，改为 `company-session-search`
（insert + isolate：provider + tool）；六个 preset 的 `tool-session-query` 行收敛；`preset-smoke`
改用 `pluginInventory/list` 断言组行 active；`release-smoke` 新增 ④c 应用内安装断言。
rc.2 与 rc.5 的 in-app 安装均为 `application: applied`；真模型 `session_search` 命中前一会话（证据见 Note）。

**P1 完成**：`license: MIT` + `LICENSE`、`author`/`homepage`/`bugs`/`keywords`/`publishConfig`；
`private` 移除；`pack-engines`/`pack-files` 改为发布姿态；README/手册模板/`docs/contracts/release.md` 同步。
`npm publish --dry-run`：127 files、LICENSE 在场、无 `bin/`、public access。

**P2 完成**：`pnpm release --prepare`（0.7.0）→ `--verify` 六项认证档全绿；tarball
`sha256=abef80f4…dc55ff`；manifest 记录版本/HEAD/检查项（`--stamp` 后 `dirty=false`）。

**P3 完成（到 handoff）**：本地 registry 按名安装演练通过（`dsh plugin add dsh-company-pack --registry ...` → `^0.7.0` + 六角色 boot）；`tools/market-index.mjs`（manifest→format 1 + DSH 校验器真验）、
`tests/host/market-index.spec.ts`、`docs/guides/publish-handoff.md`；仓库根 `market-index.json`
（tracked，图标内联）以 `dsh-company-pack@0.7.0` 通过校验。**真实 npm publish 与 https 托管 = 人工 handoff（D6）**，
本机无 npm 凭据，未执行。

**P4 完成**：手册/README 改「外部插件无 Update / 卸载再装」与精确卸载面；
`interrupted-install-smoke` ALL PASS（remove 后 run bundle / home 身份 / presented ledger 残留）；
`upgrade-while-running-smoke` ALL PASS（运行中 remove+add 0.7.1；重启后身份保留 0.7.0、依赖到 0.7.1、
旧 session 仍在）；`bundle.json.pack` 语义写清。

**P5 完成**：README 补 Verify/Compatibility；locale/description 改公共口吻；decisions D53/D54；
docs 预算内；`pnpm verify` / `pnpm test`（1027 passed / 3 skipped）/ `pnpm typecheck` 全绿。

验收对照：①装/②起/⑤产物/⑥升级/⑦卸载/⑧文档/⑨门禁 = 本轮已验证；③ npm 身份 dry-run 通过，
真实 publish 留 handoff；④ index 通过校验、托管留 handoff；⑩ 发布后回执待人工 publish 后补。

## 与 v3 卡的关系（无冲突，2026-11-02 复核）

| 面 | v3 卡 | 本卡 | 是否冲突 |
|---|---|---|---|
| 产品单位/入口 | bundle + named profile；无 launcher | 不改 | 否 |
| workspace/内容/run bundle | env/cwd/saved/picker；内容在 pack；`.dsh-company/` | 不改 | 否 |
| startup 行/账本 | bundle patch；账本按 workspace 留 home | `company-session-search` 也是 bundle insert；账本未动 | 否 |
| 会话检索 | v3 未规定实现（文档只说角色工具） | D53：改 insert+isolate 组 | 否（只换实现） |
| 许可/发布 | v3 未规定 | D54：MIT + npm 身份 + market handoff | 否（新面） |
| 0.5 迁移 | v3 明确不自动迁移 | 本卡排除项同样不做 | 否（同一口径） |

v3 卡 0.7.0 复核见其「0.7.0 复核」节；两卡边界一致，没有互相否定。

## 剩余 handoff（代码面已收口，不是 gap）

1. **真实 npm publish**：本机无 npm 凭据；按名安装已在本地 registry 演练通过，公有 registry 账号/占用仍未验；发布字节已 READY（`_dist/dsh-company-pack-0.7.0.tgz`，
   sha `abef80f4…dc55ff`），按 [publish-handoff](../../../docs/guides/publish-handoff.md) 由有权限的人执行。
2. **market index https 托管**：仓库根 `market-index.json` 已用 DSH 校验器验过；托管到 https，
   Discover 加源验证（发布后可用 vendor generator 校准真实发布时间）。
3. **用户验收**：0.7.0 的发布字节与两卡复核；关闭由用户判定。

## 下一步

1. 用户验收 0.7.0 的发布字节与 [实现 Note](../../../notes/implemented/2026-11-01-plugin-lifecycle-publish.md)。
2. 要真发时按 [publish-handoff](../../../docs/guides/publish-handoff.md)：`npm publish` → vendor generator
   生成 index → https 托管 → Discover 验证；回来后补版本页/index URL 回执。
3. 本卡保持 `推敲中`；真实 publish 与用户验收是关闭前置，不由 agent 代判。

## 关联

- 研究题：[插件生命周期与发布](../research/plugin-lifecycle-publish/README.md)
  - [安装/升级/卸载实验](../research/plugin-lifecycle-publish/2026-11-01-install-apply-and-data.md)
  - [发布面事实](../research/plugin-lifecycle-publish/2026-11-01-publish-surface.md)
- 前序：[v3 卡](2026-11-01-plugin-as-product-v3.md)、[v3 研究题](../research/plugin-as-product-v3/README.md)、
  [v3 实现 Note](../../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md)
- 现行合同：[README](../../../README.md)、[release](../../../docs/contracts/release.md)、
  [安装手册](../../../_dist/安装手册.md)、[包 README](../../../packages/company-pack/README.md)、
  [release-smoke](../../../checks/smoke/release-smoke.mjs)
- 外部规范（只读）：`_faq_on_digested/26_plugin-as-product/50-lifecycle/`、
  `_faq_on_digested/24_plugin-publish-and-agent-data-planes/`
