---
status: 已结
opened: 2026-11-02
---

# 推敲：dev 通道与产品安装路径对齐——`link:` 安装 vs tarball/registry，差异有界且显性

> 立卡：2026-11-02 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：做——日常 dev 通道默认产品同形安装（tarball + `--link` 显式快速通道），
> parity 指南/门禁与市场 staged 标记落地；实施 = [parity Note](../../../notes/implemented/2026-11-02-dev-product-path-parity.md)；
> 用户 2026-11-02 验收，已按关闭法归档。
>
> **原始意图（用户原话）**：
> 「外部仓 deep-research 的 `_backlog/issues/2026-11-02-dev-product-path-parity.md`（路径见用户消息；不写本机绝对路径）
> 我们是不是这边有类似的问题要借鉴借鉴没有，如果有我们这边开一个类似的issue。」
>
> **借鉴对象**：deep-research 的 dev/product parity 卡（外部仓，只读）。它的问题形状 = dev 通道与产品安装
> 路径不同形且未登记，"dev 绿"推不出"用户装上绿"。本仓同病，只是断点不同。

## 问题与期望结果

**问题**：本仓的**日常开发通道**（`pnpm company` / 3080 观察窗 / dev home）拿 `link:` 装的包跑，
产品通道拿 `file:<tgz>` 或 registry 装的包跑。`link:` 绕过 `npm pack` 与 `files` 过滤、peer 解析来自
workspace、安装副本就是仓库源码——所以"dev 里看着对"与"用户装上对"之间没有机制上的等式。

更具体地说，我们有三条**同时存在**的通道，只有一条是产品形：

| 通道 | home | profile | 包来源 | 谁在用 |
|---|---|---|---|---|
| 日用 GUI（3080） | `~/.dsh` | `web` | 全局安装/历史 link | 用户看页面默认看它 |
| dev 观察窗 | `runtime/harness-home` | `company`（也有 `web`） | **`link:`** | `pnpm company`、`web-window-ops` |
| 产品 | 用户 `~/.dsh` 或专用 home | `company` | **tarball / registry** | 用户按 README/手册安装 |

认证档（`release-smoke` / `company-entry-smoke`）确实走 tarball，但它们是**冒烟**，不是日常回路；
维护者每天看到的那条路仍是 `link:`。这正是 deep-research 卡说的「dev 绿必须能推出用户路径这个断点是通的」。

**期望结果**：

1. **日常 dev 通道默认走产品同形安装**：`npm pack` → `dsh plugin add file:<tgz>`，profile 名 = 产品名
   （`company`）；`link:` 保留为显式快速通道（`--link`），不再是无意识的默认。
2. **差异有界且显性**：必然差异（runtime 源码 vs 全局、workspace、凭据、浏览器包、probe）登记成 parity 表；
   表外新差异 = 门禁红。
3. **不牺牲调试力**：源码 runtime、日志、probe、快速重建都保留；link 只是从"默认"降为"显式"。
4. **分发产物不自称**：`market-index.json` 未发布前不得让读者以为 registry 已有该版本；发布后由 registry
   校准 `publishTimestamp`。

## 当前情况（已核对）

- **dev 默认包来源 = `link:`**（T）：
  `runtime/harness-home/profiles/company/package.json` → `"dsh-company-pack": "link:/…/packages/company-pack"`；
  `profiles/web` 同。`docs/policy.md` 把「dev profile 的 pack：`link:` 符号链接」写成常设规则；
  `docs/guides/bootstrap.md` 明说 link 下改 `presets/**` 即刻生效、不用重装。
- **产品来源 = tarball/registry**（C）：README/手册/`release-smoke`/`company-entry-smoke` 都是
  `add file:<tgz>`；发布 handoff 是 npm 包名。
- **link 绕过打包面**（C）：`docs/guides/bootstrap.md` 现文：「**真实安装形状的验证归 R5a release-smoke**
  （干净 profile + file:/registry）」——即作者自己承认日常 dev 不验打包面。`files` 漏项（LICENSE、
  `content/**`、`locale/*.json`、`icon.svg`）在 link 下**不可见**，只有 `npm pack` + 安装副本能看到。
- **peer 解析不同**（C）：`docs/contracts/release.md` 写明「dev profile 的 `link:` 安装不替代这条验证」；
  link 下依赖/peer 从 workspace 解析，安装副本从 profile 解析。
- **profile 身份已对齐**（T/C）：dev 与产品都用 `company`；**但** `docs/guides/bootstrap.md` 观察窗一节
  仍写「pack 装进 **web profile**」——与 `docs/contracts/profile.md` 的 `company` 矛盾，是活文档漂移。
- **观察窗 home 不一致**（C/T）：`docs/contracts/demo.md` 明确提醒「得 0 说明你起的是日用 `~/.dsh`（那里另有同名
  `web` profile）」；3080 是全局 home 的 `web`，不是 dev home 的 `company`。同一页面、两套挂载。
- **market index 自称 registry**（T/C）：仓库根 `market-index.json` 的版本条目 `source: { type: 'npm' }`、
  `publishTimestamp` = 生成时刻；包**尚未发布**。index 是 format 1 的展示/推荐层，安装仍读包 manifest，
  所以不会造成错误安装，但会让 Discover 展示一个 registry 里不存在的版本——与 Deckline 的
  「index 指向真实已发布版本」不同形。
- **已有补偿面**（C/T）：`release-smoke`（tarball + 干净 profile + 应用内安装）、`company-entry-smoke`
  （tarball + `company` profile + 两 workspace）、`export-dist`（`npm pack` 清单断言）。它们证明产品形
  可走，但不在日常回路里，且依赖手动/发布时执行。

## 决策（2026-11-02，用户点名「推进落地」后 agent 代行）

| # | 选择 | 理由 |
|---|---|---|
| D1 | **默认 tarball；`--link` 显式快速通道** | 日常回路必须走产品同形安装；link 保留给"改即刻生效"的调试场景 |
| D2 | **profile 名保持 `company`** | 与产品同形；改 `company-dev` 会偏离产品名并牵动所有 smoke |
| D3 | **观察窗用 dev home 的 `company`；3080 只作日用** | 不动用户日常 home；验收走 dev home |
| D4 | **`market-index.staged.json` 标记未发布期**；发布后删除 | 索引可入库/可校验，但不引导用户加一个 registry 里不存在的版本 |
| D5 | **parity 指南住 `docs/guides/dev-product-parity.md`** | 常驻参考（表），不塞进已接近预算的 dev-loop |

## 未决问题

| # | 待定 | 推荐 | 若选另一条 |
|---|---|---|---|
| D1 | dev 默认安装源 | **默认 tarball；`--link` 显式快速通道** | 保持 link 默认 = 本卡不做，dev 绿继续不等于用户绿 |
| D2 | dev profile 名 | **保持 `company`**（已对齐） | 改 `company-dev` 更隔离，但偏离产品名，需同步所有 smoke/文档 |
| D3 | 观察窗用哪个 profile | **`company`（dev home）**；3080 继续只作日用 GUI，不承担验收 | 把 3080 也换成 `company` 会动用户日常 home，不做 |
| D4 | market index 未发布期怎么办 | **index 只在发布后对外宣传**；发布前保留文件但门禁标"staged"，文档不引导用户加源 | 删掉 index 直到发布 = 市场发现层缺位，回到 handoff 手工步骤 |
| D5 | parity 表的家 | **新 parity 指南住 `docs/guides/`**（指南层；表 + 允许差异；文件名 P1 定） | 塞进 dev-loop = 该文件已接近预算，且表是常驻参考不是流程 |

## 方案与取舍

### P0 · 日常通道换到产品同形安装

- `pnpm company` 启动前：`npm pack` 到 repo 内状态目录 → `dsh plugin add file:<tgz>`（幂等：同版本已装则跳过）
  → exec `dsh --profile company`。`--link` 显式切回符号链接快速通道。
- `docs/policy.md` 的「dev profile 的 pack：`link:`」改成「默认 tarball；`--link` 为显式快速通道」。
- 迁移：现有 dev home 的 `link:` 依赖首次启动时按显式提示重装为 `file:`（不静默改；`--keep-link` 保留）。
- 出场门：干净 dev home 上 `pnpm company --no-open` 后，`profiles/company/package.json` 的依赖是
  `file:…dsh-company-pack-<ver>.tgz`；roster 含包；六 preset 零 broken。

### P1 · parity 表 + 修活文档漂移

- 新 parity 指南（`docs/guides/`，文件名 P1 定）：机制点 / dev 是否同形 / 允许差异 / 证据（文件可指回）。
  必须覆盖：安装源、profile 名、profile 用户层写入者、版本门、重建语义、runtime、workspace、凭据、
  浏览器包、观察窗 home、market index。
- 修 `docs/guides/bootstrap.md` 观察窗一节：`web profile` → `company` profile；并补「日常通道默认 tarball」。
- 出场门：表非空且每条能指到文件；`docs/contracts/profile.md`/`docs/contracts/demo.md`/`policy.md` 与表一致。

### P2 · market index 真实性

- 发布前：`market-index.json` 保留（format 1 校验仍过），但文档/README 不把它写成"现在可加源安装"；
  门禁把它标 `staged`（例如旁路 `market-index.staged` 标记文件，或由 `release --check` 在未发布时报告）。
- 发布后：用 registry 的 `publishTimestamp`/`source` 校准并删除 staged 标记。
- 出场门：未发布时 Discover 引导句不出现；发布后 index 的版本/时间与 registry 一致。

### P3 · 门禁 `dev-product-parity`

- 判据（可机械判定）：
  1. dev home 的 `company` profile 默认依赖不是 `link:`（除非显式 `--link` 标记在场）；
  2. `pnpm company` 的默认路径包含 `npm pack` + `plugin add file:`；
  3. parity 指南（`docs/guides/`）存在且表非空；`bootstrap.md` 不再出现「装进 web profile」；
  4. `market-index.json` 的版本 = package 版本（已有测试），未发布时 staged 标记在场。
- 每道判据配红→还原→绿证据。

**取舍**：不追求"一模一样"。runtime、workspace、凭据、浏览器两包、probe、日志是调试必需，登记为允许差异；
**同机制的部分（安装源、profile 名、roster 写入者、版本门、打包面）不接受 dev 特例**。
不引入第二套 launcher：仍是 `exec dsh --profile company`，包装只多做 pack+add。

## 验收标准

1. 干净 dev home：`pnpm company --no-open` 后 `profiles/company/package.json` 依赖为
   `file:…/dsh-company-pack-<version>.tgz`，bundles = base + web-app + pack；真启动无 `did not activate`。
2. `pnpm company --link --no-open` 仍可快速开发（link 依赖 + 改 presets 即刻生效），且启动横幅正常。
3. `docs/policy.md` / `bootstrap.md` / `demo.md` / `profile.md` 不再要求 dev 默认 link、不再写「装进 web profile」。
4. parity 指南的机制点逐条可指回文件；允许差异表覆盖 runtime/workspace/凭据/浏览器/probe。
5. `dev-product-parity` 门禁绿；注入「把默认依赖改回 link」或「bootstrap 写 web profile」时点名红；还原绿。
6. `market-index.json` 未发布时 staged 标记在场且文档不引导加源；发布后版本/时间与 registry 一致。
7. `pnpm verify` / `pnpm test` / `pnpm typecheck` 绿；parity 表与代码同 diff。

## 范围与排除项

**范围**

- dev 默认安装源（pack → tarball → `plugin add`）、`--link` 快速通道、迁移提示。
- parity 指南 + 相关活文档漂移（bootstrap/demo/profile/policy）。
- market index 的 staged/发布后校准与对应门禁。
- 新增 `dev-product-parity` 门禁与红绿证据。

**排除**

- 新 launcher / 第二层启动器 / 发布 profile 目录。
- 改 DSH 上游、升 pin、改五角色 persona 语义。
- 把 3080 日用 GUI 换成 dev home（用户日常环境不动）。
- 真实 npm publish（仍按 [publish-handoff](../../../docs/guides/publish-handoff.md) 人工执行）。
- 把 link 通道删掉（它是调试必需，只是降为显式）。

## 实施回执（2026-11-02）

**P0 完成**：`tools/company.mjs` 默认 `tsc + tsdown → npm pack → dsh plugin --profile company add file:<tgz>
→ exec`；`--link` 显式快速通道；link→tarball 迁移有显式提示（不静默）；tarball 内容寻址命名
（`<name>-<ver>-<sha8>.tgz`，内容一变 spec 就变）；同 spec 跳过 add（二启 `安装副本已是最新`）。
安装规划抽成纯函数 `tools/lib/dev-install.mjs`（`resolveDevMode`/`devTarballName`/`planDevStart`）。

**P1 完成**：新增 [parity 指南](../../../docs/guides/dev-product-parity.md)（同形机制 + 允许差异 + 怎么验）；
修 `docs/guides/bootstrap.md` 的「装进 **web profile**」→ company；`policy`/`demo`/`profile`/`release`/`AGENTS`
同步到"默认 tarball、`--link` 快速通道"。

**P2 完成**：`market-index.staged.json`（`requiresPublish: true`，版本随 bump）；未发布期面向用户文档
（根 README/包 README/手册）不出现 `market-index.json`；发布后删标记即可解除。

**P3 完成**：新门禁 [dev-product-parity](../../../checks/gates/dev-product-parity.mjs) 接线进 `pnpm verify`；
判据 4 组（启动器默认、parity 指南机制点、bootstrap 漂移、市场 staged 规则）。

**收口补（2026-11-02）**：AC3 复扫补到活文档漂移——bootstrap 插拔速查仍把 `link:` 写成日常开发
（`dev = link:`）、升级行仍「重指 link」、历史句「该坑随 link: 消失」；ui-demo 仍写 web profile；
README/checks 索引仍写「只 exec / 不装包」；run/README 把 `pnpm company` 称产品入口；v3 Note 仍写
「repo-only exec wrapper」。以上均改到现行家；门禁 ③ 扩到 `dev = link:` 与 `重指 link` 两条。

**冒烟档补（2026-11-02）**：干净 dev home 复跑发现 `preset-smoke` / `client-load-smoke` 仍 boot
`web`（那里没有 pack）——preset 19 FAIL、client 品牌槽 FAIL；`startWeb` 新增可选 `profile`，
两档固定 `company` 后全绿（6 角色 + researcher 真挂载；真页面零挂载失败）。其余 dev 冒烟/探针
仍 boot `web`，已在 parity 指南登记为调试面差异（见 Note「未做」）。

### 验证（真跑）

| 验收 | 证据 |
|---|---|
| AC1 干净 dev home 默认 tarball | 干净 home 首启：`dep=file:…/tmp/dev-pack/dsh-company-pack-0.7.0-abef80f4.tgz`；banner 出；六角色零 broken；`session/create` ceo；无 `did not activate` |
| AC1b 真挂载/真页面（干净 home） | `preset-smoke` → ALL PASS（6 角色 + researcher）；`client-load-smoke` → ALL PASS（零挂载失败 / 零 loader 错误）；改前 boot web 分别 19 FAIL / 品牌槽 FAIL |
| AC2 `--link` 快速通道 | 干净 home `--link`：`dep=link:/…/packages/company-pack`；banner 出 |
| AC3 迁移提示 | 已 link 的 home 再跑默认：先打印「当前是 link: … 需要保留请加 --link」，随后切到 `file:` |
| AC4 幂等 | 同内容二启：`安装副本已是最新（file:…abef80f4.tgz）`，不重复 add |
| AC5 门禁 | `PASS dev-product-parity`；六组真树植入各自点名红（默认改回 link / bootstrap 装进 web profile / `dev = link:` / 重指 link / 删「允许差异」/ 包 README 写 market-index.json）；逐条还原 → 绿 |
| AC6 全量 | `pnpm verify` ALL PASS；`pnpm test` 123 files / 1037 passed / 3 skipped；`pnpm typecheck` 绿；`release --check` READY 0.7.0 @ `ad439b6` |
| AC7 index 字节稳定 | 同版本重复 `--prepare`：`market-index.json` 无 diff（`stablePublishTimestamp`；版本变化/`--refresh` 才换时间） |

## 关联

- 借鉴（外部、只读）：deep-research 仓的 dev/product parity 卡（用户 2026-11-02 点名；路径不落本机绝对路径）。
- 前序卡（已结归档）：[生命周期与发布卡](2026-11-01-plugin-lifecycle-publish.md)
  （发布/安装形已收口；本卡补的是**日常 dev 回路**与产品回路的同形）。
- 证据：[生命周期 Note](../../../notes/implemented/2026-11-01-plugin-lifecycle-publish.md) 的
  「发布字节与验收」；[v3 Note](../../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md)。
- 现行合同：[profile](../../../docs/contracts/profile.md)、[policy](../../../docs/policy.md)、[demo](../../../docs/contracts/demo.md)、
  [bootstrap](../../../docs/guides/bootstrap.md)、[release](../../../docs/contracts/release.md)。
- 补偿面：`release-smoke` / `company-entry-smoke` / `export-dist`。
