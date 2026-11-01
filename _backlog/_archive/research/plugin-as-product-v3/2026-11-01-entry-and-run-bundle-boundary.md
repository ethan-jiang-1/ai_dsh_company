---
topic: plugin-as-product-v3
intent: "消化 FAQ 26 最新更新并复核 0.5.0 产品化：入口、workspace 解析、插件内容/run bundle 边界、迁移与验证。"
---

# 插件即产品 v3：入口、workspace 与 run bundle 的再划线

> 服务卡：[插件即产品 v3](../../settled_issues/2026-11-01-plugin-as-product-v3.md)。
> 读法：先读卡「修正结论」，再读本稿 §1–§3；§4 以后是技术底稿与验证计划，不是实施授权。
> 证据分级：**T** = 前轮真跑过的探针/冒烟（引用既往记录）；**C** = 当前源码、docs、FAQ 26 最新文本；**P** = 提议，未实现；**U** = 未验证。
> 基线：`vendor/dsh` 仍钉 `dsh-v0.2.1-rc.2`；FAQ 26 最新文本的历史外部基线是 `dsh-v0.2.1-rc.3`（历史外部语料，不覆盖本仓现在时）。两者差异按 `engines.dsh` 窗口处理，本轮不升 pin。
> 研究树：`_faq_on_digested/26_plugin-as-product`（外部只读；2026-11-01 16:28 仍有未提交更新）。

## 0. 修正结论（先看九条）

1. **最新 FAQ 把安装入口说死了：默认应用内 Plugins 页。** 应用内安装是唯一跨面路径（web 与 Desktop 同一句），CLI `dsh plugin --profile <p>` 是面绑定自动化，不能管 `desktop`；面向 GUI 的安装说明只写 CLI 就是教错人。（C：FAQ 26 `10-foundations/18-install-upgrade.md` §安装通道、`30-external/37-lifecycle-stages.md` §①、`50-launch/40-profile-integration.md` §安装方式）
2. **受支持的 Node 启动只有 named `dsh` profile。** package bin、`node dist/server.js`、自建第二层 launcher/桌面壳都在反模式表里；外层最多是「设 env → 确保 profile 存在 → exec dsh」的薄 bootstrap，且只有自托管/shell 才需要。（C：`vendor/dsh/docs/architecture.md` §Application launch；FAQ 26 `50-launch/40-profile-integration.md` §启动入口/反模式）
3. **启动体验必须在 bundle 里，不在 launcher 里。** 首屏注入、预置会话、工作区登记、working directory 都在 host 服务层；客户端选择是另一个 client 插件。FAQ 明说「启动体验不必另造 launcher」。（C：FAQ 26 `30-external/37-lifecycle-stages.md` §④、`50-launch/40-profile-integration.md` §用 bundle 里的 startup 插件）
4. **首启不是安装。** `dsh web` 只有 token 门（无 token 401；带 token 303 + 30 天 HttpOnly cookie → SPA），没有欢迎页/向导；`settings.onboarding` 只是设置面板的 step，`welcome-notice` 在 Desktop 不注册。第一次看到什么必须由产品 bundle/client 回答。（C：FAQ 26 `10-foundations/16-startup-resolution.md` §首启不是安装）
5. **「装成功」有三个状态。** pnpm exit 0 → dependency 写入 → 进 `dsh.profile.bundles`；只有第三个让功能存在。没有 `dsh.bundle.patch` 的包 exit 0、roster 不变，只给一句 warning。dump 有 row 也不等于真启动能挂上；必须真启动并读 `did not activate` / `skipping profile bundle`。（C：FAQ 26 `10-foundations/18-install-upgrade.md` §安装三成功、`10-foundations/17-config-layers.md` §dump 与真启动）
6. **home 层能覆盖、不能供货。** 往 home patch 插一个该 profile 没装的包，dump 有行，真启动 `ERR_MODULE_NOT_FOUND`，服务照常起。所以产品行为不能靠 profile/home patch「补」进一个已安装的 bundle；bundle 自己的 patch 必须带齐行。（C：FAQ 26 `10-foundations/17-config-layers.md` §home 层；T：前轮隔离实验 #33）
7. **0.5.0 的入口走反了。** 当前产品入口是 bin/dsh-company.mjs（历史，已删除） + `pnpm company`：它建/修 profile、装 pack、写 profile patch、TTY 询问 workspace、拒绝同 home 第二盘。这是 FAQ 明确列出的 package bin/第二层 launcher + profile 写者；而且应用内 Plugins 页装包时不会跑这个启动器，registrar/seed 都不会发生。（C：packages/company-pack/bin/dsh-company.mjs（0.6.0 已删除）、`packages/company-pack/package.json` 的 `bin`、`docs/profile.md`、`_dist/安装手册.md`；T：前轮 company-entry/release smoke 只证启动器路径）
8. **0.5.0 把「插件内容」和「run bundle」混了。** `packages/company-pack/content/` 里的手册、模板、org、章程被 `applyBootstrap` 复制到用户 workspace；用户要的是「插件内容全部在插件内部，生产状态/最终 artifacts（run bundle）在 workspace」。手册/模板是只读产品内容，不应成为每个 workspace 的副本；`kb/`、`deliverables/`、`cultivation/`、`.dsh-company/` 才是 run bundle 状态/产物。（C：`src/host/bootstrap.ts`、`src/host/bundle-manifest.ts`、`packages/company-pack/content/README.md`）
9. **0.5.0 用「一 home 一 workspace」回避了多 workspace 的治理冲突，但这不是产品答案。** 用户要的是装一次、指向用户指定的 workspace；换项目不该新建 home/重装。正确做法是让 workspace 解析跟启动上下文走，并把 presented 账本按 workspace 分区；不是把产品缩成「一个公司盘」。版本建议 `0.6.0`（破坏性）。（P）

一句话：**产品单位是 bundle，不是 launcher；workspace 是每次启动的输入，不是 home 的绑定；插件内容住包，run bundle 住 workspace。**

## 1. 最新 FAQ 的硬事实（本轮同步）

### 1.1 安装

| 通道 | 谁执行 | profile 从哪来 | 跨面 | 对本产品 |
|---|---|---|---|---|
| 应用内 Plugins 页 / `plugin_manager` | 正在运行的宿主 | 当前 profile，无参数 | 是（web/Desktop） | **默认路径** |
| `dsh plugin --profile <p>` | CLI，转发 pnpm | 显式指定；首次自动初始化 | 否（不能 `desktop`） | 仅 web/headless/sdk 自动化 |
| Electron carrier | Desktop | 只能它碰 `desktop` | 否 | 第三方拿不到 |

- 默认安装句：`在 DSH 的 Plugins 页安装 dsh-company-pack（dsh web 与 Desktop 通用）`。
- CLI 句必须紧跟「仅 `dsh web`」；headless/SDK/ACP 没有 Plugins 页，才用 CLI 显式 profile。
- 自定义 Web profile 的 CLI 自动化配方：先 `dsh --profile company --from-default-profile web --dump-default-config`，再 `dsh plugin --profile company add <spec>`；GUI 用户不需要这一步。
- 三个成功必须分开核；`dsh.profile.bundles` 含包才算装上。

### 1.2 启动

- 受支持启动 = named profile；`web/headless/sdk/sdk-minimal/acp` 是 shipped，`company` 是自定义命名组合。
- 外层最多薄 bootstrap：设 `DSH_HOME`/PATH/代理/凭据，确保 profile 存在（不存在才建），检查版本，`exec dsh --profile <name> "$@"`。**不要包第二层 launcher/桌面壳。**
- 自定义 app flag 不能直接加：web args 整条归 `web-startup`；要加 flag 就得 disable + insert 产品 provider，并重实现全部 web flags（host/port/tls/public-url/trusted-host/no-open），漏实现会静默降级。**本产品不需要自定义 flag**；workspace 用 cwd/env/client 选择。

### 1.3 首启

- 原生只有 token 门；没有欢迎页/向导；`welcome-notice` 在 Desktop 不注册。
- `settings.onboarding` 一次只挂一个 step，不保证抢首屏。
- 判据：首启可推迟；不依赖单个 onboarding step；Desktop 有替代路径；不要用「装完就能用」替代「第一次打开看到什么」。
- 产品目录选择应由 Client 在可交互后提供；Host boot 不应等待用户。优先级：部署者固定目录 → 产品保存的用户选择 → 产品明确承诺的默认位置 → 等 Client；取消保持可恢复，不阻塞 boot。（C：FAQ 26 `10-foundations/16-startup-resolution.md` §产品自建项目目录）

### 1.4 生效与失败

- CLI 装完宿主不知道，必须重启 profile；应用内装可能返回 `restart-required`，只有 `applied` 才是 HMR 生效。
- 启动不是全有或全无：bundle skip / row pending / row import warning / 整体失败是不同级；「应用能开、功能没有」是合法终态。
- 产品 bundle 不能检查自身是否成功加载；如果核心功能缺失必须 fail loud，得由能在 bundle 被跳过时仍运行的机制负责（例如外部 doctor，不是本包自己）。

### 1.5 生命周期四阶段（FAQ 37）——本产品的判据骨架

FAQ 37 把「拿到 → 第一次成功」拆成装/起/配/首启四段。本产品的验收不再只按代码阶段走，而要把这四段作为横切判据：

| 阶段 | DSH 给什么 | 本产品必须做什么 | 不能做什么 |
|---|---|---|---|
| **① 装** | 应用内 Plugins 页（当前 profile，无参数，web/Desktop 同句）；CLI `--profile` 面绑定（不能 desktop）；engines/peer 安装前门 | 包声明 `dsh.bundle.patch`；默认文档只写 Plugins 页；CLI 句标「仅 web 自动化」；核三成功（exit 0 / dependency / `dsh.profile.bundles`） | package bin、发布 profile 目录、手写 `dsh.profile.bundles`、`--profile desktop` |
| **② 起** | profile 四件套 + 有序 patch；CLI 装完宿主不知道；应用内可能 `restart-required`；失败三级 | bundle 顺序 base → web-app → 产品；startup 行用 `insert:`；真启动一次并读 stderr；文档写重启/刷新/HMR | 把 dump 有 row 当挂载；把 exit 0 当生效；假设全有或全无 |
| **③ 配** | bundle → profile → home → `--patch`；settings/localStorage；home 能覆盖不能供货 | 默认值放 bundle；用户设置放 profile 或产品自有稳定文件；workspace 选择是产品设置，不是 profile patch 真值 | 产品静默写 home patch；用 home 层「补」未装包；把 localStorage 当配置 |
| **④ 首启** | token 门（401 / 303 + HttpOnly cookie → SPA）；无欢迎页/向导；`settings.onboarding` 只是 step；`welcome-notice` 在 Desktop 不注册 | 本包 client 提供首屏（无 workspace 时选目录；有 workspace 时选中目标会话）；Host boot 不等待；取消可恢复 | 依赖 welcome-notice；阻塞式向导无出口；装完就当「第一次打开有人在」 |

**web/Desktop 三处静默失效**（FAQ 37 §web 与 Desktop）：

1. Desktop 上用 `dsh plugin --profile web add` → 装进 `profiles/web`，App 用 `profiles/desktop`，报告成功但界面没有。→ 文档默认 Plugins 页；全文无 `--profile desktop`。
2. home 层供货 → dump 有行、真启动 `ERR_MODULE_NOT_FOUND`、服务照常起。→ startup 必须在 bundle patch。
3. 首屏依赖 `welcome-notice` → Desktop 不注册。→ 本包 client onboarding 自己回答首屏。

**发布前 8 条**（FAQ 37 §发布前判据）逐条落到本产品：

1. 包声明 `dsh.bundle.patch`；装完进 roster；`--dump-config` 有自己 row。→ release-smoke。
2. GUI 安装说明只有一句 Plugins 页；CLI 标「仅 `dsh web`」；全文无 `--profile desktop`。→ dist-manual gate + 人工审。
3. 真启动一次，stderr 无 `did not activate`；文档写重启/刷新/HMR。→ release-smoke + 文档。
4. 默认值在 bundle patch；跨 profile 才用 home/自有文件；home 不供货。→ 设计 + spec。
5. 首启可推迟；不依赖 welcome-notice；Desktop 有替代路径。→ client onboarding + client-load-smoke。
6. `npm pack --dry-run` 清单包含 README 提到的所有脚本/资源。→ export-dist + pack-files。
7. 版本门两处都写：`engines.dsh` + `dsh.compatibility.dshReleases`。→ pack-shape（当前仓只做 engines/台账，按现状说明）。
8. 升级先升版本号再打包；同名同版本重装不会刷新。→ release process/CHANGELOG。

**「机制对不等于产品成立」**：FAQ 37 给了六类首启载体（首屏注入、自有路由、另起会话、工作区、working directory、命令入口），但本产品不需要六件全上。最小集 = 工作区登记 + 会话创建/选中 + 一个 client onboarding 面板；不为了「生命周期完整」加第二层壳、托盘、自动更新或自建向导。

## 2. 0.5.0 的偏差（「歪在哪」）

### 2.1 入口歪：把 launcher 当产品

bin/dsh-company.mjs（历史，已删除） 做了五件产品不该在启动路径上做的事：

1. `ensureProfile`：缺失时跑 `--from-default-profile web`，已存在只验证；这仍是第二个 profile 写者。
2. `ensureRegistrarPatch`：往 `profiles/company/cordis.patch.yml` 写 `company-workspace-register` 行；产品行为不在 bundle 里，而在用户 profile 里。
3. `run`：TTY 询问 workspace，`--workspace` 优先，拒绝同 home 第二盘；启动被阻塞在人机对话上。
4. `writeConsent`：写 seed consent，让 host 复制骨架。
5. `spawn dsh --profile company`：成为实际产品入口。

这五点合起来是一个安装器 + launcher + profile 写者 + workspace 选择器。FAQ 40 的反模式表和 architecture 的 application launch 节都禁止这类路径；更重要的是，**应用内 Plugins 页安装不会跑这个 launcher**，所以产品的 registrar/seed/workspace 行为在默认安装路径上根本不存在。前轮 `company-entry-smoke`/`release-smoke` 只验证了 launcher 路径，没验证「装完包、直接 `dsh --profile company`」这条真正的产品路径。

### 2.2 workspace 歪：把「一次安装」缩成「一个 home 一个 workspace」

`run()` 里：

```js
if (previousWorkspace !== requestedWorkspace && existsSync(join(previousWorkspace, '.dsh-company/bundle.json'))) {
  fail(`同一 home 已绑定 workspace：${previousWorkspace} ... 换项目请用新的 --home`)
}
```

这不是 DSH 的限制，是产品为规避 presented 账本的单表冲突而加的限制。用户要的是装一次、在用户指定的 workspace 做事；换项目 = 新 home + 重装是安装器 UX，不是产品 UX。正确做法是：workspace 解析跟启动上下文走（cwd/env/client 选择），账本按 workspace 分区；不是禁止第二个 workspace。

### 2.3 内容歪：把插件内容 copy 成 run bundle

`applyBootstrap` 把 pack 的 `workspace/`（`AGENTS.md`、`kb/**`、`templates/**`、`deliverables/`、`cultivation/`）复制到用户 workspace；`bundle-manifest` 把 `AGENTS.md` 的哈希写进身份。于是：

- 手册/模板这类**只读产品内容**成了每个 workspace 的副本；pack 升级时还要按哈希判定「改过保留/没改替换」，把内容版本问题变成用户数据迁移问题。
- 用户项目根被塞进 `AGENTS.md`/`COMPANY.md`/`templates/`；已有项目要么被碰名（`COMPANY.md`），要么被跳过（手册不注入）。
- 默认安装（Plugins 页）不跑 launcher，不写 consent，host 不 seed；「装完为什么没有手册/kb」在默认路径上无解。

### 2.4 文档歪：把 workaround 写成产品合同

`README.md`、`_dist/安装手册.md`、`docs/profile.md`、`docs/runtime-map.md`、`docs/data-model.md`、`docs/release.md`、`tests/README.md` 都把启动器、`--workspace`、一 home 一 workspace、骨架 copy 写成现行产品形状。`dist-manual` 门禁还把这些词钉成必含。代码改对但文档不改，产品仍然是错的；用户点名 README 和 `_dist`，方向正确。

### 2.5 为什么会歪

不是机制没查清，而是**让三个实现约束反向决定了产品形状**：

| 约束 | 0.5.0 的应对 | 正确应对 |
|---|---|---|
| 应用内安装不跑启动器，profile patch 没人写 | 把 registrar 放进 profile patch，靠启动器写 | 把 startup 行放进 bundle patch；host-only 行/包解决 client tier |
| presented 账本是 home 单表，多个 workspace 的 `paths` 会撞 | 一 home 一 workspace | 账本按 workspace 分区（domain v2 / per-workspace file） |
| `agent-instructions` 只认同目录文件名，不能指 pack 路径 | 把手册 copy 到 workspace | 从 pack 注入 system prompt section；或只读覆盖层 |

这三条都是可解的工程问题；上一轮把它们当成了产品边界。

## 3. 目标形状（推荐 A）

### 3.1 产品单位与安装

- **产品单位 = `dsh-company-pack` bundle**；profile 是用户/部署者的组合，不是产品发布的目录。
- **默认安装**：应用内 Plugins 页（web/Desktop 同一句）。**CLI 仅 web 自动化**：`dsh plugin --profile company add <tgz>`；装完重启 profile。
- **不再有 package bin**；packages/company-pack/bin/dsh-company.mjs（0.6.0 已删除） 删除。`pnpm company` 若保留，只作 repo 内 dev 便利（设 cwd/env 后 exec `dsh --profile company`），不进 tarball、不写 profile、不问 workspace。
- 推荐 `company` profile 作为独立 Web 产品的组合名；Desktop 使用当前 `desktop` profile，安装句相同。产品 bundle 不绑定 profile 名。

### 3.2 启动与 workspace 解析

启动 = 用户已经在一个 workspace 上下文里，或产品在 Client 里问。

优先级建议：

1. **显式固定值**：`DSH_COMPANY_HOME`（自动化/部署；绝对路径，`~` 展开）。
2. **启动 cwd**：`process.cwd()`，但仅当它是合理项目目录（不是 OS home、不是 `DSH_HOME`、不是 `/` 或系统临时根；不包含 `DSH_HOME`）；`dsh --profile company` 在项目目录启动时，cwd 就是 workspace。
3. **产品保存的最近选择**：`<DSH_HOME>/company/settings.json` 的 `workspace`（便利提示，不是权威）；路径缺失/不是目录时进入重新选择，不在旧路径建空目录。
4. **Client 询问**：没有可用路径时，Host 不写盘、不 seed、不登记；Client onboarding/picker 选目录，选中后再创建 workspace + session。
5. **取消/无 Client**：保持可恢复状态；headless/SDK 没有 picker，必须从 env/config/CLI 取得，不得等待不存在的 Client。

**不再有 `--workspace` flag**：自定义 web flag 需要替换 `web-startup` 并重实现全部 web flags，收益不抵成本；用 cwd/env。
**不再有 TTY 询问**：Host boot 不等用户；询问发生在 Client。
**不再有「一 home 一 workspace」**：同一 home 可顺序服务多个 workspace；一个进程一个 active workspace。并发多 workspace 不在 v1（需要 per-workspace 治理/lease，后置）。

### 3.3 插件内容 vs run bundle

```text
插件包（只读、随版本）                  run bundle（用户 workspace、可变）
packages/company-pack/                 <workspace>/
  presets/**（persona/skills）           kb/                    ← 公司身份/org/owners/charters/journals
  src/host/**、src/client/**             deliverables/          ← 过程稿/final
  content/AGENTS.md（公司手册）           deliverables-archive/
  content/templates/**                   cultivation/records/
  content/charters/**（默认章程）         .dsh-company/
  locale/、icon/                           bundle.json          ← 身份（v3）
                                           logs/、exports/
                                           overrides/           ← 用户对模板/手册的可选覆盖
```

- **不 seed**：`AGENTS.md`、`COMPANY.md`、`templates/` 不再复制到 workspace；`workspace/` 目录改名为 `content/`，避免再被当成 run bundle。
- **手册注入**：host 行按 company agent 注册 `systemPrompt.section`，文本来自 pack 的 `content/AGENTS.md`；不再依赖 workspace `AGENTS.md`。workspace 里用户自己的 `AGENTS.md` 仍由 `agent-instructions` 加载（项目规则），但公司手册不写进去。
- **模板**：角色默认从 pack 的 `content/templates/` 读；若用户要改，复制到 `.dsh-company/overrides/templates/`，产品优先读覆盖层。默认不复制。
- **章程/org/company**：`kb/` 是状态，可由 host 首启写最小实例（只补缺、不覆盖）；默认内容来自 `content/charters/`，但实例是用户可改的 run bundle 状态。它们是「状态」不是「只读产品内容」；manifest 记录 seed 版本与哈希，升级只补缺。
- **company handbook 的预算**：`handbook-budget` 门禁改为量 `content/AGENTS.md` + 注入 section 的字节；不再量 workspace 手册。

### 3.4 startup 行与 client tier

产品行为必须在 bundle patch 里，不能靠 profile patch：

```yaml
# cordis.patch.yml（bundle 层）
- insert:
    - id: company-startup
      name: '...'   # host-only startup/registrar/handbook
      inject: ['workspaceRegistry', 'agents', 'systemPrompt']
```

难点：`tests/client/company-client-composition.spec.ts` 用 `bundleRoster` 解析所有 bundle patch，再按 `dsh.client.platform === 'web'` 过滤。如果 host-only 行是同一个包的子路径，root manifest 的 `dsh.client` 会让它被当成浏览器行，client tier 会等不存在的 host 服务。三条可能路：

1. **主 `company-client` host apply 内 `ctx.inject`**：不新增行；在 apply 里等 `workspaceRegistry`/`systemPrompt`。需证明登记/注入早于 Web readiness，且 client tier 不执行 host apply。
2. **host-only sibling package**：新包（如 `dsh-company-startup`）无 `dsh.client`，由主包 `dsh.bundle.patch` insert 行；client roster 因无 `dsh.client` 跳过。代价是打包/依赖要一起交付（peer/file/bundledDependencies）。
3. **host-only bundle**：单独 bundle 包，profile 装两个 bundle；安装说明变两句，跨面 install 也要两次，UX 差。

推荐先做 1 的 spike；若 readiness 不成立或 client tier 仍误读，走 2。**不要**为通过 client 测试而把 host 行塞 profile patch——那会把默认安装路径再次弄坏。

### 3.5 身份与账本

- **`bundle.json` v3**：`{ v:3, id, createdAt, pack, seed: { version, files } }`；去掉 `handbookTarget` 和「手册/模板哈希」；`seed` 只记 run bundle 状态文件。v2 → v3 迁移保留 id/createdAt，旧字段留作 legacy 引用。
- **presented 账本 v2**：当前 `paths`/`slugs` 是单表，多个 workspace 的相对路径会撞。改为按 workspace 分区：
  - 方案 A：domain `company_deliverables` v2，`per-record` 表，key = workspace 的 `bundle.id`（或 canonical path），record 内是 `paths/slugs`；
  - 方案 B：`<DSH_HOME>/company/ledger/<bundle-id>.json`，host-only 文件 + schema/原子写。
  - 推荐 A（复用 storageDomain 的 schema/单写链）；若 domain 的 per-record key 限制/迁移不顺，退 B。
  - 迁移：0.5.0 一 home 只有一份 workspace，旧账本归该 workspace 的 bundle id；旧文件保留 `.v1`。
- **方法层**：保持 home 公司级；一个安装 = 一个公司，多个 workspace 是同一公司的项目，共享方法层。不同公司用不同 `DSH_HOME`。这条写进 README/manual，避免「一个 home 多个公司」的误解。
- **lease**：保持 home 级单 writer；一个进程一个 active workspace；并发多进程同 home 不是 v1。

### 3.6 首启 / Client onboarding

- 有 workspace（cwd/env/saved）且 fresh client：host 登记 workspace + 建/复用 blank CEO 会话；client 用 `uiWorkspace.openSession` 确定性选中（前轮 T 证 fresh context 会自动选最新 blank；返回用户不会）。
- 无 workspace：host 不写；client 显示产品 onboarding「选择你的项目目录 / 最近目录」；用 DSH picker 的 native 或 browse capability（不要假设 native `pick()` 在 remote/SSH 可用）；选中后 `workspace.create` + `session.create({workspaceId, agentPreset:'ceo'})`；取消保持可恢复。
- 保存最近选择到 `<DSH_HOME>/company/settings.json`（产品设置，便利非权威）；路径失效重新询问。
- Desktop 不依赖 `welcome-notice`；onboarding 必须由本包 client 面提供。
- 不阻塞 Host boot；headless/SDK 没有 Client，只能 env/config。

## 4. 方案比较

| 方案 | 形状 | 评价 |
|---|---|---|
| **A 原生 bundle + startup 行 + cwd/env/client + 多 workspace 顺序 + 内容/run bundle 分家**（推荐） | 无 bin；`dsh --profile company`；cwd 即 workspace；无 workspace 时 client 问；插件内容在 `content/`，run bundle 在 workspace | 符合 FAQ 37/40 与用户原话；改动大但边界正 |
| B 保留薄 launcher（只设 env + exec） | 仍有 package bin/外层 bootstrap | 只解决「少做一点」，不解决默认安装路径、profile 写者、workspace 询问位置；FAQ 不推荐；可做 dev 便利，不作产品 |
| C 一 home 一 workspace（0.5.0） | 每次换项目新 home | 安装器 UX；用户已指出要装一次指向 workspace；否 |
| D run bundle 全部收进 `<workspace>/.dsh-company/` | 根目录零侵入 | 对任意已有项目最干净；但要改 160+ 处 `kb/`/`deliverables/` 路径与客户端读取，迁移大；可作为后续「existing project mode」，不在本轮 |
| E 只写文档、不做 startup/client | 用户手敲 env/命令 | 不满足「启动时知道/询问 workspace」与首启 UX；否 |

本轮选 A；D 作为后续选项记录，不偷渡。A 的 run bundle 仍在 workspace 根（`kb/`、`deliverables/`、`cultivation/`、`.dsh-company/`），与现行角色路径一致，迁移面比 D 小。

## 5. 影响面（实现时要动的家）

### 5.1 代码

- 删除 packages/company-pack/bin/dsh-company.mjs（0.6.0 已删除）、`package.json` 的 `bin`、`files` 的 `bin/**`。
- `tools/company.mjs`：删除或降为 dev-only exec wrapper；不建 profile/不装包/不问 workspace。
- 新增/改造 host startup：workspace 解析（env/cwd/saved/无）、bundle registrar、handbook `systemPrompt.section`、client onboarding 的 host 端。
- `src/host/bootstrap.ts`：拆 `content/` vs seed；不再复制手册/模板；只补缺状态实例；`hasCompanyMarker` 改为 `.dsh-company/bundle.json` 或 `kb/company.md`，不再靠 `AGENTS.md`。
- `src/host/bundle-manifest.ts`：v3；seed 只记状态文件；迁移 v2→v3。
- `src/host/runtime-guard.ts`：不再要求 `DSH_COMPANY_HOME`；不再单 workspace `expectedWorkspace`；按 session/启动 workspace 解析；dataBlocked 条件改为「已知 workspace 但落点不安全/身份坏/lease 败」。
- `src/host/catalog.ts` / `presented-domain.ts`：账本按 workspace 分区；catalog 仍 per workspace。
- `src/index.ts`：工具/命令从「当前公司盘」改为「当前 session 的 workspace」或「当前 process active workspace」；多 workspace 时命令要能拒绝跨盘操作。
- `src/client/**`：onboarding/最近 workspace/选中 session；公司页签读当前 session cwd 的 run bundle。
- `packages/company-pack/cordis.patch.yml`：startup 行；不再要求 profile patch。
- `presets/**`：去掉 workspace 手册 seed 依赖；保留 `agent-instructions` 读用户项目 `AGENTS.md`；路径 `kb/`/`deliverables/` 不变（选 A）；模板引用改为 pack `content/templates` 或 override。
- `package.json`：无 `bin`；`files` 加 `content/**`，去 `workspace/**`；版本 `0.6.0`。

### 5.2 测试 / 冒烟 / 门禁

- 新/改 keyless：
  - `workspace-resolution.spec`：env > cwd > saved > none；拒绝 OS home/DSH home/包含 DSH home；相对/`~` 归一；in-app 选择。
  - `content-boundary.spec`：seed 不产生 `AGENTS.md`/`COMPANY.md`/`templates/`；`content/` 只在 pack；manifest v3。
  - `handbook-injection.spec`：section 文本来自 pack；用户项目 `AGENTS.md` 不混淆；预算。
  - `ledger-scope.spec`：两个 workspace 的 paths 不撞；v1→v2 迁移。
  - `manifest-v3.spec`：v2→v3 保留 id/createdAt；旧字段 legacy；损坏/更高版本 fail loud。
  - `startup-row.spec`：bundle patch 有 startup 行；client roster 不含 host-only 行。
- 改 smoke：
  - `release-smoke`：真 tarball 装进干净 profile → `dsh.profile.bundles` 含包 → 真启动 `dsh --profile company`（cwd=temp project）→ workspace 登记、`.dsh-company/bundle.json` v3、无 `AGENTS.md`/`templates/` seed、无 profile patch、无 `did not activate`；二次启动字节稳定。
  - `company-entry-smoke` → `company-entry-smoke`（或重写）：应用内安装路径不可自动测时，至少测 CLI 装 + 真启动；不再测 launcher。
  - `external-workspace-smoke`：同 home 顺序两个 workspace；第二个不要求新 home；账本不串。
  - `release-smoke`/`company-entry-smoke`：0.5.0 → 0.6.0 迁移；v2→v3；账本 v1→v2；旧 launcher 文件/profile patch 被忽略/兼容；卸载保留 workspace。
  - `isolation-matrix-smoke`：无 workspace 零写、cwd/env/saved、落点不安全、lease、旧 profile patch 只告警。
  - `client-load-smoke`：从临时项目 cwd 启动 → 无 `Choose workspace`、CEO 会话 cwd=target、零 console error；无 workspace 时 onboarding 出现（可后置）。
  - `handbook.spec`：真模型注入 pack 手册；workspace 无手册副本；`--cwd` 隔离。
  - `preset-smoke`：五角色仍挂载；persona/skills 路径改动只限模板引用。
- 门禁：
  - `dist-manual` 新关键句：`Plugins`、`dsh --profile company`、`cwd`、`.dsh-company/bundle.json`、`run bundle`、`content`、`kb/`、`deliverables/`、`home 治理`、`sha256`、`Node`、`DSH`、`pnpm 11/12`、`DSH_COMPANY_BROWSER`、`dsh-web-app`、卸载/回退；去掉 `--workspace`、`一次安装 = 一个 home`、`AGENTS.md` seed、`COMPANY.md` seed、`seed-consent`、`dsh-company` bin。
  - `pack-shape`/`pack-files`：无 `bin`；`content/**` 在场；`dsh.bundle.patch` 含 startup 行。
  - `company-skeleton`：源 `content/`；seed 只允许状态文件；不产生手册/模板。
  - `handbook-budget`：量 `content/AGENTS.md` + 注入预算。
  - `run-bundle-clean`：run bundle 状态不进 git；dev workspace 不再有 `AGENTS.md`/`templates/` 符号链接。
  - `layout-block`/`bare-path`/`md-links`/`doc-budget`：文档改写后逐个过；预算先搬后压，确需提额按 docs/AGENTS 写 Note。
  - 新 `pack-no-bin`（可并入 pack-shape）：`package.json.bin` 不存在；tarball 不含 `bin/`。

### 5.3 文档 / 分发

| 文件 | 要改什么 |
|---|---|
| `README.md` | 产品故事：装一次、在项目里启动、插件内容在包、run bundle 在 workspace；安装=Plugins 页（CLI 仅 web）；启动=cwd/onboarding；数据三平面；dev 命令；无 launcher |
| `_dist/安装手册.md` | 由 `export-dist` 重写：安装通道（默认 Plugins/CLI 仅 web/Desktop 同句）、profile 三成功、首启 token + onboarding、workspace 选择、run bundle 路径、内容边界、升级/卸载/备份、迁移、排障；删 launcher/`--workspace`/一 home 一 workspace/seed-consent |
| `packages/company-pack/README.md` | Install/Config/Data/Backup/Uninstall 换新形状；无 bin；`content/` 与 run bundle 分家；多 workspace 顺序；方法层 home 公司级；账本 per workspace |
| `packages/company-pack/content/README.md` | 改为 run bundle 说明（或移到 `content/README`）；不再说「启动器指定/seed 骨架」 |
| `AGENTS.md` | 布局（`content/`、无 `bin/`、dev workspace）、命令表（`pnpm dsh --profile company` / dev wrapper）、产品入口指针；`_dist`/README 同 diff |
| `docs/profile.md` | 形状表：产品安装（Plugins 页）/ CLI web 自动化 / dev；无 launcher；startup 行在 bundle；workspace cwd/env/client；多 workspace 顺序 |
| `docs/runtime-map.md` | 时序：install → boot → startup row → workspace 解析/登记 → client onboarding → session；run bundle 在 workspace；home=DSH 运行时 + 公司治理；无 profile patch registrar |
| `docs/data-model.md` | 数据卡逐行换：插件内容 vs run bundle vs home 治理；manifest v3；账本 v2 per workspace；无手册 seed；overrides |
| `docs/release.md` | 发布形状、tarball 清单（无 bin、含 content）、smoke 矩阵、0.6.0、安装三成功、首启/onboarding 验证 |
| `docs/project-map.md` / `docs/demo.md` / `docs/index.md` / `docs/decisions.md` / `docs/orient.md` / `docs/guides/{bootstrap,environments,budget-and-ops,release-runbook}.md` / `docs/multi-human.md` / `docs/presets.md` | 删旧主路径，留新入口；decisions 记 D 号；demo 的启动口令换 cwd；bootstrap 先选形状 |
| `tests/README.md` / `checks/README.md` | 新 smoke/spec 的改动面映射与索引；产品入口行从 bin 改为 startup + client |
| `run/README.md` / `runtime/README.md` / `.agents/skills/web-window-ops/SKILL.md` | dev 启动、home/workspace、web 观察窗口令 |
| `CHANGELOG.md` | 0.6.0 破坏性：入口/workspace/内容边界/账本/manifest；0.5.0 迁移 |

## 6. 验证计划

### 6.1 先做四个 spike（P，未跑）

1. **startup 行进 bundle**：在 `cordis.patch.yml` 加 host-only 行，跑 `tests/client/company-client-composition.spec.ts`；若 client tier 误读，改 sibling package 或主 apply `ctx.inject`。判据：client roster 不含 host-only 行；真启动登记/注入早于 Web readiness。
2. **handbook `systemPrompt.section`**：从 pack 读 `content/AGENTS.md`，per company agent 注册 section；真模型 `handbook.spec --cwd` 断言内容在场、workspace 无副本、预算内。
3. **workspace resolution / client onboarding**：`dsh --profile company` 在临时项目 cwd 启动 → 登记 + CEO session；无 workspace 启动 → 零写 + client onboarding 出现；远程/browse picker 不假设 native。
4. **账本 per workspace**：domain v2 per-record 或 per-workspace file；两个 workspace 同 relative path 不撞；v1→v2 迁移。

### 6.2 分层证据

- 结构：`pnpm verify`。
- keyless：`pnpm test`（新 specs）。
- 真安装：`release-smoke`。
- 入口：`company-entry-smoke`（重写 company-entry）。
- 生命周期：`release-smoke`/`company-entry-smoke`（迁移）。
- 多 workspace：`external-workspace-smoke` / `isolation-matrix-smoke`。
- 浏览器：`client-load-smoke`（onboarding/session 选中）。
- 真模型：`handbook.spec`、`preset-smoke`。
- 分发：`export-dist` + `dist-manual` + sha256。

### 6.3 红/绿

每个新门禁/判据按仓规造红→还原→绿，记录原话；不把 `verify` 绿当安装可用，不把 dump 有 row 当真挂载，不把 CLI exit 0 当进 roster。

## 7. 未决 / 需要用户确认

| # | 决策 | 推荐 | 输掉的方案 |
|---|---|---|---|
| D1 | run bundle 布局：根（`kb/`/`deliverables/` 在 workspace 根） vs 全部收进 `.dsh-company/` | **根**（本轮；与现行角色路径一致、迁移小）；`.dsh-company/` 作为后续 existing-project mode | 全嵌套：对任意项目最干净，但 160+ 路径/客户端/迁移大 |
| D2 | 安装范围：一个安装 = 一个公司、顺序多个 workspace vs 一个 workspace/安装 | **一个公司/安装，顺序多 workspace**；不同公司 = 不同 home；并发多 workspace 后置 | 继续一 home 一 workspace：用户已否 |
| D3 | 公司手册：pack 注入 vs workspace 副本 | **pack 注入**；如需可改，`.dsh-company/overrides/AGENTS.md` 覆盖层，默认不 seed | 继续 copy：用户已否 |
| D4 | 旧 0.5.0 手册/模板副本迁移 | 只移「哈希匹配、未改过」的 pack 副本到 `.dsh-company/legacy/`；改过的保留并告警；新装不产生 | 全部删除/全部保留：删有风险，留会重复注入 |
| D5 | `pnpm company` dev wrapper | 保留为 repo-only exec wrapper（无 profile/安装/询问）；不进 tarball | 删除也行；但 dev 便利可留 |

## 8. 参考

- 外部 FAQ 26（本轮同步）：`10-foundations/16-startup-resolution.md`、`17-config-layers.md`、`18-install-upgrade.md`、`30-external/37-lifecycle-stages.md`、`50-launch/40-profile-integration.md`、`50-launch/90-evidence.md`。
- 本仓前轮：[插件即产品卡](../../settled_issues/2026-11-01-plugin-as-product.md)、[落地顺序卡](../../settled_issues/2026-11-01-landing-plan.md)、[主研究稿](../plugin-as-product/2026-11-01-plugin-as-product.md)。
- 当前代码：0.5.0 launcher（已删除）、[bootstrap](../../../../packages/company-pack/src/host/bootstrap.ts)、[manifest](../../../../packages/company-pack/src/host/bundle-manifest.ts)、[runtime guard](../../../../packages/company-pack/src/host/runtime-guard.ts)、[presented domain](../../../../packages/company-pack/src/host/presented-domain.ts)、[client composition spec](../../../../tests/client/company-client-composition.spec.ts)。
- 当前合同：[README](../../../../README.md)、[profile](../../../../docs/profile.md)、[runtime map](../../../../docs/runtime-map.md)、[data model](../../../../docs/data-model.md)、[release](../../../../docs/release.md)、[`_dist` 手册](../../../../_dist/安装手册.md)。
