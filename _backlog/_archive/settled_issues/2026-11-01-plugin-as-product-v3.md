---
status: 已结
opened: 2026-11-01
---

# 推敲：插件即产品 v3——拆掉 launcher，把 workspace 与 run bundle 放回产品位置

> 立卡：2026-11-01 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：2026-11-02 用户验收「两卡不冲突，推动落地」；结论 = v3 产品形状落地并经 0.7.0 复核；去向 = [v3 Note](../../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md) + [生命周期卡](../../issues/2026-11-01-plugin-lifecycle-publish.md)。两处按 v3 Note 收窄：首屏 = DSH 原生 Workspace picker（不自建 onboarding）、0.5 根目录不自动迁移。
>
> **2026-11-01 用户授权原文**：
> 「需要我review的, 授权给你 记得 做对最重要, 不需要兼容考虑, 安装需要尊重dsh」
>
> **据此拍板（D1–D6，agent 代行 review）**：
> - D1 = run bundle 全部收进 `<workspace>/.dsh-company/`；根目录零产品文件；不做 0.5.0 布局兼容。
> - D2 = 一个安装 = 一个公司；同一 home 顺序服务多个 workspace；不同公司 = 不同 home；并发多 workspace 后置。
> - D3 = 公司手册/模板/默认章程只读住 pack `content/`；手册 `systemPrompt.section` 注入；模板/章程 pack 默认 + `.dsh-company/overrides/`；不 seed 只读内容。
> - D4 = startup/registrar 行进 bundle patch；优先主 host apply `ctx.inject`，不行则 host-only sibling package；不写 profile patch。
> - D5 = 0.6.0 破坏性；不写 0.5.0 迁移/兼容 shim；旧数据原样保留并告警，要求新 workspace。
> - D6 = 产品包无 bin；`pnpm company` 仅 repo dev wrapper（exec `dsh --profile company`，不建 profile/不装包/不问 workspace），不进 tarball。

## 原始意图（用户原话，按时间顺序）

> 这一节是目的源头，不是转述结论。第二个 review agent 请逐句对照：下面的问题、范围、方案与验收，是否忠实于这些原话。

1. **插件即产品，独立启动 profile，在用户项目/指定 workspace 做事**：
   > 「我们这个项目其实是要，Develop plug in as a product，其实就是这个插件有一个独立的启动的 profile，但是启动后，它可以在用户的项目里头，就是要么是用户指定的 workspace 里头去做事情」
2. **启动就知道 workspace，或启动过程中问**：
   > 「所以确实是启动的当客知道 workspace 在哪里，或者是启动过程中询问 workspace 在哪里」
3. **插件内容在插件内，生产状态/最终 artifacts（run bundle）在用户 workspace**：
   > 「这个插件的所有的内容都放在这插件内部，但生产的状态，或者最后的输出物 artifacts，也就是历史上我们说的 run bundle，其实是在用户的 workspace 里」
4. **能力施加到用户指定的 workspace，才有好 UX**：
   > 「这样才能做到很好的用户体验，也就是这个插件的所有的能力可以施加到用户手上的指定的 workspace 里头」
5. **不是小改；repo、`_dist`、整个 README 都要调整；先给 plan**：
   > 「这个调整可能还挺多的内容，你要好好挖掘，挖掘清楚之后，给出一个 plan。记得不仅仅调整整个 repo，记得 _dist 的说明，以及整个项目的 Read me。都要调整啊…… 你得想清楚之后，先给出 plan」
6. **上一轮可能歪了，回头说清歪在哪；研究/方案进 backlog**：
   > 「你已经做了一轮，但可能坐歪了，歪在哪里你回头告诉我，研究/方案最后都要显性化到 _backlog 里」
7. **FAQ 26 又更新，继续同步**：
   > 「`_faq_on_digested/26_plugin-as-product` 又有更新，再同步一下」

## 修正结论（先看）

**产品单位是 bundle，不是 launcher；workspace 是每次启动的输入，不是 home 的绑定；插件内容住包，run bundle 住 workspace。**

上一轮 0.5.0 做对了三件小事：`bundle.json` 搬到 workspace、方法层/账本留 home、boot 登记 workspace 的机制验证。但它把**实现约束**当成了**产品边界**，于是坐歪在四处：

1. **入口歪**：bin/dsh-company.mjs（历史，已删除） + `pnpm company` 是 package bin / 第二层 launcher / profile 写者；它建/修 profile、装 pack、写 profile patch、TTY 问 workspace、拒绝第二盘。DSH 受支持入口只有 named profile；应用内 Plugins 页才是默认跨面安装路径。更严重的是，Plugins 页装包不会跑这个 launcher，registrar/seed 在默认安装路径上根本不发生。
2. **workspace 歪**：为了绕开 presented 账本单表冲突，产品强制「一 home 一 workspace」；换项目 = 新 home + 重装。用户要的是装一次、指向用户 workspace；正确做法是 workspace 解析跟启动上下文走 + 账本按 workspace 分区。
3. **内容歪**：把 pack 的 `workspace/` 骨架（手册、模板、org、章程）复制进用户 workspace，把只读产品内容变成 run bundle 副本；用户要的是插件内容全部在插件内部，workspace 只放生产状态/最终 artifacts。
4. **文档歪**：README、`_dist/安装手册.md`、docs、tests/README 都把 launcher/`--workspace`/一 home 一 workspace/骨架 copy 写成现行合同；`dist-manual` 门禁还把这些词钉成必含。代码改了文档不改，产品仍然是错的。

## 复盘：为什么上次会歪（详细）

> 完整复盘 = [0.5.0 失败复盘](../research/plugin-as-product-v3/2026-11-01-why-0.5.0-went-crooked.md)。这里只留结论，供 review 时先看。

**不是某个文件写错了，是决策顺序反了：先用实现约束定产品形状，再用测试证明这个形状能跑，最后用文档把它写成合同。**

| 层 | 上次怎么歪 | 这次怎么防 |
|---|---|---|
| 决策顺序 | 先看现有代码能怎么改，再定产品形状；launcher/一 workspace/copy 都是实现约束的产物 | P0 先写一页产品合同 + D1–D6；用户确认后才写代码 |
| 产品单位 | 把 repo/dev harness 当产品：`pnpm company` → bin；dev workspace 符号链接 → 安装骨架 copy | dev wrapper 只叫 dev、不进 tarball；产品单位 = bundle |
| 平台约定 | 自建 launcher、自写 profile patch、TTY 问 workspace、限制一 home 一 workspace | 按 FAQ 37 装/起/配/首启验收；startup 行在 bundle；workspace 在 client 问 |
| 证据 | 只测 launcher 路径；release-smoke 预置 profile patch/consent；绿是侧门的绿 | 第一验收走默认路径（Plugins 页/CLI 装 + 直接 `dsh --profile`），侧门只作补充 |
| 治理 | 把「按推荐」当产品语义确认；一安装一 workspace、copy、launcher 都没让用户 review | P0 显式列选项/推荐/代价；硬选择等用户点头；不把 agent 偏好写成用户决定 |
| 复杂度 | copy 之后用 consent/rebind/manifest v2/一 workspace 兜底；补丁越长越像深度 | workaround 登记（为什么/何时删/谁负责）；边界错了先改边界，不加补丁 |

**一句话教训**：先定产品合同，再定实现；先跑默认路径，再谈体验；先证边界，再写补丁；先让用户 review 硬选择，再自主执行。

## 最新 FAQ 同步进来的硬事实

- **安装默认应用内 Plugins 页**（web/Desktop 同一句）；CLI `dsh plugin --profile <p>` 是面绑定自动化，不能 `desktop`；面向 GUI 只写 CLI 就是教错人。
- **「装成功」有三态**：pnpm exit 0 → dependency 写入 → 进 `dsh.profile.bundles`；只有第三个让功能存在。dump 有 row ≠ 真启动挂载；必须真启动并读 `did not activate` / `skipping profile bundle`。
- **home 层能覆盖、不能供货**：往 home patch 插没装的包，dump 有行、真启动 `ERR_MODULE_NOT_FOUND`、服务照常起。所以 startup 行必须在 bundle patch 里，不能靠 profile/home patch 补。
- **首启不是安装**：`dsh web` 只有 token 门（无 token 401；带 token 303 + 30 天 HttpOnly cookie → SPA），没有欢迎页/向导；`settings.onboarding` 只是设置 step，`welcome-notice` 在 Desktop 不注册。第一次看到什么必须由本包 client 回答。
- **启动体验在 bundle 的 host/client 层**：首屏注入、预置会话、工作区、working directory 都在 host 服务；客户端选择是另一个 client 插件；不要另造 launcher。
- **Host boot 不等用户**：产品目录选择应由 Client 可交互后提供；没有 workspace 时 host 不写，client 询问；取消保持可恢复。
- **自定义 web flag 不值得**：web args 整条归 `web-startup`；加 flag 要 disable + insert 并重实现全部 web flags，漏实现会静默降级。本产品不需要 `--workspace`。

## 生命周期判据（FAQ 37，验收骨架）

不按「代码写到哪」验收，按 DSH 的装/起/配/首启四段验收：

| 阶段 | 本产品必须成立 | 本产品明确不做 |
|---|---|---|
| **① 装** | bundle 声明 `dsh.bundle.patch`；默认 Plugins 页（web/Desktop 同一句）；CLI 仅 web 自动化；三成功核到 `dsh.profile.bundles`；tarball 含 startup/content，无 bin | package bin、发布 profile 目录、手写 roster、`--profile desktop` |
| **② 起** | `dsh --profile company` 真启动；bundle 顺序 base → web-app → 产品；startup 行 `insert:`；读 stderr 无 `did not activate`/`skipping profile bundle`；文档写重启/刷新/HMR | 把 dump 有 row 当挂载；把 exit 0 当生效；全有或全无救生逻辑 |
| **③ 配** | 默认值在 bundle patch；workspace 选择是产品设置（env/cwd/saved），不是 profile patch 真值；产品不静默写 home patch | home 层供货；把 localStorage 当配置；两套设置真值 |
| **④ 首启** | 本包 client 回答首屏：无 workspace → 选目录；有 workspace → 选中目标会话；Host boot 不等待；取消可恢复；Desktop 有替代路径 | 依赖 `welcome-notice`；阻塞式向导；装完就当首启完成 |

**web/Desktop 三处静默失效**（FAQ 37）：Desktop 装进 `profiles/web`；home 层供货；首屏依赖 `welcome-notice`。本卡对应的防线 = 文档默认 Plugins 页 + 全文无 `--profile desktop`；startup 行在 bundle；本包 client onboarding。

**发布前 8 条**见 [研究稿 §1.5](../research/plugin-as-product-v3/2026-11-01-entry-and-run-bundle-boundary.md#15-生命周期四阶段faq-37本产品的判据骨架)；其中「真启动无 did not activate」「GUI 安装一句 Plugins 页」「首启不依赖 welcome-notice」进 P1/P5/P6 出场门。

## 问题与期望结果

**问题**：0.5.0 的产品形状是「安装器/launcher + 一 home 一 workspace + pack 骨架 copy + profile patch registrar」。它与用户要的「装一次、在用户指定 workspace 做事、插件内容在包内、run bundle 在 workspace」正相反；且默认安装路径（Plugins 页）不会触发它。

**期望结果**：给出并落地 0.6.0 的产品形状：

1. 产品单位 = `dsh-company-pack` bundle；无 package bin；默认 Plugins 页安装，CLI 仅 web 自动化。
2. 启动 = `dsh --profile company`（或用户自己的 profile）；workspace 优先级 = `DSH_COMPANY_HOME` → 启动 cwd（合理项目目录）→ 产品保存的最近选择 → DSH Workspace picker（本包不自建 onboarding）；无 `--workspace`、无 TTY 询问、Host 不阻塞。
3. 一个安装 = 一个公司；同一 home 可顺序服务多个 workspace；换项目不新建 home/重装；不同公司 = 不同 home。
4. 插件内容全部在 pack（`presets/`、`src/`、`content/` 手册/模板）；run bundle 全在 `<workspace>/.dsh-company/`（`kb/`、`deliverables/`、`cultivation/`、`bundle.json`）；不再 seed 手册/模板。
5. 公司手册从 pack 注入（`systemPrompt.section`）；模板从 pack 读、可选 `.dsh-company/overrides/`；章程/org/company 是状态，只补缺。
6. startup/registrar 行在 bundle patch；host-only 行/包解决 client tier；删掉 profile patch registrar 依赖。
7. 身份 `bundle.json` v3；presented 账本按 workspace 分区（新 domain `company_run_bundle_ledger` v1）；0.5.0 旧账本不读不迁、旧文件保留、不静默覆盖。
8. README、`_dist` 手册、pack/workspace README、docs 合同/指南、AGENTS 布局/命令、CHANGELOG、测试/门禁全部同 diff 改。
9. 验证按真实入口：真 tarball → 真安装 → 真启动 → workspace/run bundle/无 seed/无 launcher；红→绿证据齐全。

## 当前情况（0.5.0，2026-11-01）

- **入口**：packages/company-pack/bin/dsh-company.mjs（0.6.0 已删除）；`package.json` `bin.dsh-company`；`tools/company.mjs` 转发；`_dist/安装手册.md` 教 .../node_modules/.bin/dsh-company --workspace（历史，已删除）。
- **profile 写者**：`ensureProfile` 建/验 profile；`ensureRegistrarPatch` 写 `profiles/company/cordis.patch.yml` 的 `company-workspace-register` 行；`docs/profile.md` 明说 registrar 放 profile patch。
- **workspace 绑定**：`resolveWorkspace` 用 `--workspace` / `DSH_COMPANY_HOME` / `settings.json` 最近；`run()` 拒绝同 home 第二盘；无 TTY 直接 fail。
- **内容 copy**：`bootstrap.ts` 的 `planBootstrap`/`applyBootstrap` 复制 pack `workspace/` 到用户 workspace；`bundle-manifest.ts` 把 `AGENTS.md`/`templates` 哈希写进 v2；`workspace/README.md` 说「启动器指定/seed 骨架」。
- **账本**：`presented-domain.ts` 是单一 `company_deliverables` domain，`paths`/`slugs` 单表；多 workspace 同相对路径会撞。
- **验证**：`company-entry-smoke` 测 launcher；`release-smoke` 预置 profile patch + seed-consent；`tests/README.md` 产品入口行写 bin/dsh-company.mjs（历史，已删除）。这些只证启动器路径，不证默认安装路径。
- **证据**：前轮研究 [主稿](../../_archive/research/plugin-as-product/2026-11-01-plugin-as-product.md)、[伞卡](../../_archive/settled_issues/2026-11-01-plugin-as-product.md)、[落地卡](../../_archive/settled_issues/2026-11-01-landing-plan.md)；本轮同步 = [研究稿](../research/plugin-as-product-v3/2026-11-01-entry-and-run-bundle-boundary.md)。

## 目标形状（0.6.0 落地版；原推荐 A 的 workspace 根布局已废弃）

```text
安装：Plugins 页装 dsh-company-pack（web/Desktop 同一句）
      CLI 仅 web 自动化：dsh plugin --profile company add <tgz>
启动：cd /path/to/workspace && dsh --profile company
      或 DSH_COMPANY_HOME=/path/to/workspace dsh --profile company
      或无 workspace：DSH Workspace picker 选择目录（本包不自建 onboarding）
内容：packages/company-pack/{presets,src,content}/**  ← 只读产品内容
run： <workspace>/.dsh-company/{kb,deliverables,deliverables-archive,cultivation,logs,exports,overrides,bundle.json}
治理：<DSH_HOME>/{sessions,credentials,storages,company/methods,company/ledger}/ ← home 公司治理
```

### 关键机制取舍

| 问题 | 选择 | 为什么 |
|---|---|---|
| 入口 | named `company` profile；无 bin | FAQ 37/40 + DSH architecture；Plugins 页默认安装 |
| workspace 解析 | env → cwd → saved → DSH Workspace picker | 启动时知道/询问；Host 不阻塞；不加 web flag；不自建 onboarding |
| 一安装多 workspace | 一个公司/安装，顺序多 workspace | 用户要装一次；账本按 workspace 分区；并发后置 |
| 手册 | pack `content/AGENTS.md` → `systemPrompt.section` | 不 copy 只读内容；不依赖 workspace 文件名 |
| 模板 | pack `content/templates/`；可选 `.dsh-company/overrides/` | 默认内容在包；用户改才落 workspace |
| 章程/org/company | `.dsh-company/kb/` 状态，首启只补缺 | 这是公司实例数据，不是只读产品内容 |
| startup 行 | bundle patch 的 host-only 行/包 | home 不能供货；默认安装要自带行为 |
| 身份 | `bundle.json` v3（seed 只记状态） | 去掉 handbookTarget/内容哈希；迁移清楚 |
| 账本 | 新 domain `company_run_bundle_ledger` v1，按 workspace key（或 per-workspace file） | 多 workspace 不串；host-only 权威不降级；旧 `company_deliverables` 不读不迁 |
| 方法层 | home 公司级 | 一安装一公司；不同公司不同 home |
| run bundle 布局 | **全收进 `.dsh-company/`**（本轮已落地） | 任意项目根零产品文件；路径/迁移统一；原「根 + `.dsh-company`」方案未采用 |

## 落地阶段（P0–P6）

> 顺序只此一份；阶段内可并行，阶段间有出场门。每阶段结束可停、可回退。

### P0 · 确认与 spike（无产品代码）

- **可开始**：本卡。
- **交付**：用户确认 D1–D3；四个 spike（startup 行进 bundle、handbook section、workspace resolution/onboarding、账本 per workspace）跑通/失败有结论；更新本卡。
- **出场门**：D1–D3 有明确答案；startup 行在 client tier 不误读或选定 sibling package；handbook 注入/预算可行；账本分区方案选定。
- **失败就停**：startup 行无法进 bundle 或 client tier 无法隔离 → 回 P0 改方案，不写实现。
- **回退**：无代码；spike 留在 `probes/` 或临时区。

### P1 · 入口 reset（拆 launcher，startup 进 bundle）

- **交付**：删除 package bin / `tools/company.mjs` 产品入口；startup/registrar/handbook 行进 bundle patch；workspace 解析（env/cwd/saved/none）；无 profile patch 写入；dev wrapper 仅 exec；`company-entry-smoke`。
- **出场门**：干净 home + 真 tarball + `dsh plugin --profile company add` + `dsh --profile company`（cwd=temp project）→ `dsh.profile.bundles` 含包、workspace 登记、无 `did not activate`；Plugins 页安装路径至少文档/手工验证；无 bin。
- **失败就停**：startup 行 client tier 红 / 真启动登记晚于 readiness → 回 P0/P1。
- **回退**：保留 0.5.0 tarball；旧 profile patch 行做兼容 shim；文档标旧入口。

### P2 · 内容/run bundle 分家

- **交付**：pack `workspace/` → `content/`；`applyBootstrap` 只补状态，不 seed 手册/模板；handbook `systemPrompt.section`；模板 pack/override；manifest v3；`bootstrap.spec`/`handbook.spec`/`bundle-manifest.spec`；`handbook.spec`/`handbook-budget`/`company-skeleton`/`pack-shape` 更新。
- **出场门**：新 workspace 无 `AGENTS.md`/`COMPANY.md`/`templates/` 副本；已有用户 `AGENTS.md` 不动；真模型注入 pack 手册；tarball 含 `content/**` 无 `bin/**`。
- **失败就停**：手册没注入/预算爆/旧 workspace 被覆盖 → 回 P2。
- **回退**：保留 `content/` 源；旧 workspace 副本不删；manifest v2 读取兼容。

### P3 · 多 workspace 与账本

- **交付**：去掉一 home 一 workspace 限制；同一 home 顺序两个 workspace；presented 账本 v2 per workspace；`settings.json` 仅便利提示；`company-entry-smoke`/`ledger-scope` specs；client onboarding/选中 session（至少 Web 主路径）。
- **出场门**：同 home 顺序 workspace A/B → 两套 run bundle；账本不串；换项目不新建 home；无 workspace 时零写 + onboarding 出现。
- **失败就停**：账本串/旧账本迁移丢 true/false/workspace 写错 → 回 P3。
- **回退**：保留旧账本 `.v1`；可按旧 home 继续用；不删除用户数据。

### P4 · 迁移与兼容（0.5.0 → 0.6.0）

- **交付**：manifest v2→v3；账本 v1→v2；旧 launcher 遗留 `.company-home`/`settings.json`/profile patch 行的忽略/告警/兼容 shim；旧 `AGENTS.md`/`templates/` 只移「哈希匹配、未改过」的 pack 副本到 `.dsh-company/legacy/`，改过的保留并告警；`release-smoke`/`company-entry-smoke` 迁移段。
- **出场门**：真实 0.5.0 home/workspace 升级不丢 id/createdAt/账本/交付物；二启稳定；旧 profile 仍可启动（不承诺旧 launcher 继续可用）。
- **失败就停**：迁移覆盖/丢数据/旧 profile 起不来 → 回 P4。
- **回退**：旧 tarball + 备份；不删旧文件。

### P5 · 文档 / `_dist` / README / 门禁

- **交付**：本卡「文档」表全部同 diff；`export-dist` 重写手册模板；`dist-manual` 新关键句；`pack-shape`/`pack-files` 去 bin、加 content；`run-bundle-clean`/`layout-block`/`bare-path`/`md-links`/`doc-budget`；`decisions.md` 记新 D 号；CHANGELOG 0.6.0；旧 Note 加取代 banner。
- **出场门**：README/手册无 launcher/`--workspace`/一 home 一 workspace/seed-consent 主路径；手册版本=pack 版本；sha256 一致；tarball 无 bin；doc-budget 绿。
- **失败就停**：手册教旧路径/预算爆/tarball 缺条目 → 回 P5，不发布。
- **回退**：保留上一版 `_dist`；手册可重生成；不手改。

### P6 · 全量验证与 0.6.0

- **交付**：`pnpm verify`/`pnpm test`/`pnpm typecheck`；`release-smoke`/`company-entry-smoke`/`release-smoke`/`company-entry-smoke`/`company-entry-smoke`/`client-load-smoke`/`handbook.spec`/`preset-smoke`；每道新判据红→绿；`_dist` 0.6.0；实现 Note/RFC。
- **出场门**：认证档全绿；tarball = 冒烟字节；无 P0 未决；文档/合同/手册一致。
- **失败就停**：任一认证档红，不发布；回对应阶段。
- **回退**：上一版 tarball/manual；workspace/home 不动。

### 任务明细（review 用）

> 这不是执行队列，是给 review 的粒度：每个任务能独立验收；阶段顺序仍以 P0–P6 为准。任务未获用户确认前不执行。

| # | 阶段 | 交付 | 主要落点 | 验收 | 依赖 |
|---|---|---|---|---|---|
| P0.1 | 确认 | 一页产品合同：单位/安装/启动/workspace/内容/数据；D1–D6 选项、推荐、代价 | 本卡 + 研究稿 | 用户确认 D1–D3；D4–D6 有明确处置 | — |
| P0.2 | 确认 | startup 行进 bundle 的 spike：主 apply `ctx.inject` vs host-only sibling package | `probes/` 或临时分支；`tests/client/company-client-composition.spec.ts` | client roster 不含 host-only 行；真启动登记/注入早于 readiness | — |
| P0.3 | 确认 | handbook `systemPrompt.section` spike：pack 文本、预算、per company agent | 临时 host row + `handbook.spec` | 真模型会话含 pack 手册；workspace 无副本；预算内 | — |
| P0.4 | 确认 | workspace resolution/onboarding spike：env/cwd/saved/none；native/browse picker | 临时 host/client row；`client-load-smoke` | cwd 启动自动选中；无 workspace 零写 + onboarding 出现 | — |
| P0.5 | 确认 | ledger per workspace spike：domain v2 per-record vs 文件 | 临时 domain/spec | 两个 workspace 同相对路径不串；旧账本可迁移 | — |
| P0.6 | 确认 | 红队 review：按用户原话 + FAQ 37 逐条问「哪条会证伪」；冻结合同 | 研究稿附录/本卡 | 每个硬选择有反对意见与处置；无「先这样以后再说」 | P0.1–P0.5 |
| P1.1 | 入口 | 删除 package bin / launcher；`tools/company.mjs` 降为 dev-only 或删除；scripts 更新 | `packages/company-pack/package.json`、bin/dsh-company.mjs（历史，已删除）、`tools/company.mjs`、`package.json` | tarball 无 `bin/**`；`dsh-company` 不存在；dev wrapper 不写 profile/不问 workspace | P0.6 |
| P1.2 | 入口 | startup/registrar 行进 bundle patch；host-only 隔离方案落地 | `cordis.patch.yml`、host entry、`package.json` files/exports | 装包即带 startup；client tier 绿；无 profile patch 也能登记 | P0.2 |
| P1.3 | 入口 | workspace resolver：env → cwd（合理目录）→ saved → none；落点校验 | `src/host/startup*`/`runtime-guard.ts`、`paths.ts` | env/cwd/saved 三路都登记；OS home/DSH home/包含 DSH home 拒绝；无值零写 | P0.4 |
| P1.4 | 入口 | 去 profile patch 依赖；旧 `company-workspace-register` 行兼容 shim/告警 | src/host/register-workspace.ts（0.6.0 已删除）、docs/doctor | 旧 profile 仍能起；新 profile patch 零写入；告警可操作 | P1.2 |
| P1.5 | 入口 | `company-entry-smoke` + `pack-no-bin` 门禁 | `checks/smoke/`、`checks/gates/pack-shape.mjs`、`tests/README.md` | 干净 home + tarball + 直接 `dsh --profile company` 绿；无 bin 红证 | P1.1–P1.4 |
| P1.6 | 入口 | README/manual 安装/启动草稿（先于实现定稿） | `README.md`、`tools/export-dist.mjs` 模板 | 默认句 = Plugins 页；CLI 仅 web；无 `--workspace`/新 home | P0.6 |
| P2.1 | 内容 | pack `workspace/` → `content/`；files/build/gates 更新 | `packages/company-pack/content/**`、`package.json`、`tsdown.config.ts` | tarball 含 `content/**` 无 `workspace/**`；角色仍能读模板/手册 | P1.6 |
| P2.2 | 内容 | run bundle 状态初始化：只建 `kb/`/`deliverables/`/`cultivation/`/`.dsh-company/` 与最小状态；不 seed 手册/模板 | `src/host/bootstrap.ts`、`bundle-manifest.ts` | 新 workspace 无 `AGENTS.md`/`COMPANY.md`/`templates/`；已有用户 `AGENTS.md` 不动；二启稳定 | P2.1 |
| P2.3 | 内容 | handbook 注入：pack `content/AGENTS.md` → `systemPrompt.section`；预算门禁 | host row、presets、`checks/gates/handbook-budget.mjs` | 真模型注入；workspace 无副本；超预算红 | P0.3 |
| P2.4 | 内容 | 模板/章程解析：pack 默认 + `.dsh-company/overrides/`；角色引用改变量/路径 | presets/skills、host resolver | 无 override 读 pack；有 override 优先；不复制默认内容 | P2.1 |
| P2.5 | 首启 | client onboarding：无 workspace 选目录、有 workspace 选中目标会话；Desktop 同面板 | `src/client/**`、host remote、`client-load-smoke` | 无 `Choose workspace`；无 welcome-notice 依赖；取消可恢复 | P0.4/P2.2 |
| P2.6 | 内容 | content-boundary / handbook-injection / manifest-v3 specs + handbook/company-skeleton smokes | `tests/company/`、`checks/smoke/` | 每道新判据红→绿；旧 workspace 不覆盖 | P2.2–P2.5 |
| P3.1 | 多盘 | 去掉一 home 一 workspace 限制；`settings.json` 仅最近选择 | `bin` 删除后的 host/startup、`runtime-guard.ts` | 同 home 顺序 A/B 不拒绝；旧 settings 只是 hint | P1.3 |
| P3.2 | 多盘 | presented 账本 v2 per workspace + v1 迁移 | `presented-domain.ts`、`catalog.ts`、specs | A/B 同相对路径不串；true/false 保留；旧文件 `.v1` | P0.5 |
| P3.3 | 多盘 | host 运行态/命令按 active workspace；不跨盘写 | `src/index.ts`、commands、client data plane | 当前 workspace 命令正确；跨盘拒绝；方法层留 home | P3.1–P3.2 |
| P3.4 | 多盘 | external/isolation/ledger smokes；无 workspace 零写 | `checks/smoke/` | A/B 两套 run bundle；无 workspace 零写；旧 profile patch 告警 | P3.1–P3.3 |
| P4.1 | 迁移 | manifest v2 → v3（id/createdAt 保留；seed 只记状态） | `bundle-manifest.ts`、fixtures、specs | v2 盘升级不丢 id；旧字段 legacy；二启字节稳定 | P2.2 |
| P4.2 | 迁移 | 账本 v1 → v2（归当前/唯一 workspace；保留 true/false） | `presented-domain.ts`、fixtures | 旧账本迁移正确；旧文件备份；坏/更高版本不覆盖 | P3.2 |
| P4.3 | 迁移 | 旧 launcher 遗留：`.company-home`/settings/profile patch/旧手册/模板 | host startup、migration、docs/doctor | 未改 pack 副本移 `.dsh-company/legacy/`；改过的保留告警；旧 profile 可起 | P4.1–P4.2 |
| P4.4 | 迁移 | `release-smoke`/`company-entry-smoke` 0.5.0→0.6.0 全段 | checks/smoke/release-smoke.mjs + company-entry-smoke（旧 release-smoke/company-entry-smoke 已删除） | 真旧 home/workspace 升级不丢数据；回退可用 | P4.1–P4.3 |
| P5.1 | 文档 | README + `_dist` 手册定稿；安装/启动/首启/数据/升级/卸载/排障 | `README.md`、`tools/export-dist.mjs`、`_dist/安装手册.md` | 无 launcher/`--workspace`/新 home/seed-consent 主路径；Plugins 页一句；sha 一致 | P1.6/P2–P4 |
| P5.2 | 文档 | docs 合同/指南/决策/CHANGELOG；旧 Note 取代 banner | `docs/{profile,runtime-map,data-model,release,project-map,demo,index,decisions,orient}.md`、guides、`CHANGELOG.md` | 现行合同无旧形状；D 号登记；doc-budget 绿 | P5.1 |
| P5.3 | 文档 | AGENTS 布局/命令、tests/checks 索引、web-window-ops | `AGENTS.md`、`tests/README.md`、`checks/README.md`、`.agents/skills/web-window-ops/SKILL.md` | 命令表可执行；产品入口行不再指 bin；索引同步 | P5.1–P5.2 |
| P5.4 | 文档 | 门禁：dist-manual 新关键句/禁句；pack-shape/pack-files 无 bin+content；company-skeleton 无 seed；handbook-budget；run-bundle-clean；doc-budget | `checks/gates/` | 每道门禁红→还原→绿；手册/README 断言 | P5.1–P5.3 |
| P5.5 | 文档 | doc-budget 处置：旧形状搬 notes/archived 或链接；确需提额写 Note | `docs/AGENTS.md`、`checks/gates/doc-budget.mjs` | 不「先提额再写」；所有超限有处置记录 | P5.2 |
| P6.1 | 验证 | `pnpm verify`/`pnpm test`/`pnpm typecheck`；新 specs | 全仓 | 全绿；无跳过的新判据 | P5.4 |
| P6.2 | 验证 | 真实入口：release/native-entry/lifecycle/external/isolation/client-load/handbook/preset | `checks/smoke/` | 认证档全绿；每档写清证明/不证明 | P5.4 |
| P6.3 | 验证 | 红→绿证据：每道新门禁/判据一条原话 | Note/卡 | 不能只报「已验证」 | P6.2 |
| P6.4 | 发布 | `_dist` 0.6.0；CHANGELOG；实现 Note/RFC；旧 Note 取代 | `_dist/`、`CHANGELOG.md`、`notes/` | tarball = 冒烟字节；sha 一致；`release --verify` 绿 | P6.1–P6.3 |

## 验收标准

1. **安装**：干净 home；`dsh plugin --profile company add <tarball>` → `dsh.profile.bundles` 含 `dsh-company-pack`；真启动无 `did not activate`/`skipping profile bundle`；tarball 不含 `bin/**`；`dsh-company` 命令不存在。Plugins 页安装句在 README/手册，CLI 句标「仅 `dsh web`」。
2. **启动/workspace**：`cd <temp-project> && dsh --profile company` → 无需 `--workspace`/TTY；workspace 登记；`DSH_COMPANY_HOME` 同样可用；无 workspace 启动 → Host 零写、**DSH 原生 Workspace picker** 回答首屏（本包不自建 onboarding；0.7.0 口径见复核节）；Host boot 不阻塞。
3. **内容边界**：新 workspace 无 `AGENTS.md`/`COMPANY.md`/`templates/` 副本；已有用户 `AGENTS.md` 不动；真模型会话注入 pack `content/AGENTS.md`（0.7.0 复核有真模型原话）；模板从 pack 读；`.dsh-company/overrides/` 可选覆盖。
4. **run bundle**：`<workspace>/.dsh-company/kb/`、`deliverables/`、`cultivation/`、`bundle.json`（v3）在场；home 根无 `bundle.json`；方法层/presented 账本权威仍在 home；workspace `.dsh-company/exports/` 只是派生。
5. **多 workspace**：同一 home 顺序 workspace A/B 都能启动；两套 run bundle；账本按 workspace 分区不串；无「第二盘」拒绝；换项目不新建 home/重装。
6. **身份/迁移**：0.5.0 的 v2 manifest → v3（id/createdAt 保留）；旧 `company_deliverables` 账本不读不迁，新 domain 按 workspace 分区；旧 `AGENTS.md`/`templates/` **不自动迁移**（0.7.0 口径见复核节：0.5/0.6 未发布，旧文件保留 + 手册手工搬）；旧 profile patch 行只告警/兼容；二启字节稳定。
7. **文档**：根 README、`_dist/安装手册.md`、pack/workspace README、`docs/{profile,runtime-map,data-model,release,project-map,demo,index,decisions,orient}.md`、guides、`AGENTS.md`、`tests/README.md`、`checks/README.md`、CHANGELOG、web-window-ops 同 diff；无旧主路径。
8. **门禁**：`dist-manual` 新关键句 + sha256 + pin；`pack-shape`/`pack-files` 无 bin + content；`company-skeleton` 无手册/模板 seed；`handbook-budget` 量 content/注入；`run-bundle-clean`/`layout-block`/`bare-path`/`md-links`/`doc-budget` 绿；每道新判据有红→还原→绿原话。
9. **认证档**：`release-smoke`、`company-entry-smoke`、`external-workspace-smoke`、`isolation-matrix-smoke`、`client-load-smoke`、`handbook.spec`、`preset-smoke` 全绿（0.7.0 复核表见下；真模型按改动面）。
10. **分发**：`_dist` 0.7.0 重导；tarball = 冒烟字节；sha256 手册一致；`release --verify` 绿。
11. **生命周期四段**：①装 = Plugins 页默认句 + CLI 仅 web + 三成功进 roster；②起 = 真启动无 `did not activate`/`skipping profile bundle`；③配 = 默认值在 bundle、home 不供货、产品不静默写 home patch；④首启 = DSH Workspace picker 回答首屏（本包不自建 onboarding）、不依赖 `welcome-notice`、Host 不阻塞、Desktop 有替代路径。文档全文无 `--profile desktop`。

## 范围与排除项

**范围**

- 产品入口（去 launcher、bundle startup 行、Plugins 页/CLI 两条安装路径）。
- workspace 解析（env/cwd/saved/Client ask）、多 workspace 顺序、账本分区。
- 插件内容/run bundle 分家（`content/`、注入、模板、seed 只补状态、manifest v3）。
- 0.5.0 → 0.6.0 迁移（manifest/账本/旧 launcher 遗留/旧手册副本）。
- README、`_dist`、pack/workspace README、docs 合同/指南、AGENTS、CHANGELOG、测试/门禁/红绿证据。
- 0.6.0 本地 tarball 交付。

**排除**

- 新 bin、第二层 launcher/桌面壳、发布 profile 目录。
- 替换 `web-startup` 或新增 `--workspace` 等 web flag。
- 并发多 workspace / 多租户 / 跨机器同步；Windows/容器/registry 签名。
- 把方法层 / presented 账本权威搬进 workspace（D25/M2 保护不降级）。
- 全嵌套 `.dsh-company/` run bundle（D 方案，后置）。
- 改 vendor / 升 pin / 改五角色 persona 语义（除模板/路径/注入所需文案）。
- 替角色写公司内容、改已有 0.5.0 用户数据（只迁移/保留/告警）。

## 未决 / 需要用户确认

| # | 决策 | 推荐 | 若选另一条的影响 |
|---|---|---|---|
| D1 | run bundle 布局：workspace 根 vs 全收进 `.dsh-company/` | **全收进 `.dsh-company/`**（已落地；0.6.0 起） | 根布局会让任意项目根出现产品文件，且路径/迁移分裂；全嵌套路径统一 |
| D2 | 安装范围：一个公司/安装、顺序多 workspace vs 一 workspace/安装 | **一个公司/安装 + 顺序多 workspace** | 继续一 workspace/安装 = 用户已否的安装器 UX |
| D3 | 公司手册：pack 注入 vs workspace 副本 | **pack 注入**（可选 overrides） | 继续 copy = 用户已否的内容边界 |
| D4 | 旧 0.5.0 手册/模板副本迁移 | 只移未改 pack 副本到 `.dsh-company/legacy/`，改过保留告警 | 全删有风险；全留会重复注入 |
| D5 | `pnpm company` dev wrapper | 保留 repo-only exec wrapper，不进 tarball | 删除也行；dev 便利少一点 |

## Review 清单（请逐条给 yes/no/改）

1. **产品单位**：接受「bundle 是产品，launcher 不是产品」吗？tarball 里没有任何可执行入口，只有 bundle patch/presets/content。
2. **默认安装**：接受「默认 Plugins 页；CLI 只是 web 自动化，必须标仅 web」吗？Desktop 用户不看 CLI。
3. **启动**：接受「`cd <workspace> && dsh --profile company`；workspace 从 cwd/env/saved/Client 询问来；没有 `--workspace` flag」吗？
4. **一安装多 workspace**：接受「一个安装 = 一个公司，顺序服务多个 workspace；不同公司 = 不同 home；并发多 workspace 后置」吗？
5. **内容边界**：接受「手册/模板只读住 pack；手册注入；模板 pack/override；workspace 不 seed 手册/模板」吗？
6. **run bundle 布局**：已落地为全收进 `.dsh-company/`（`kb/`/`deliverables/`/`cultivation/`/`bundle.json` 同根）；不再保留 workspace 根布局。
7. **账本**：接受「presented 账本按 workspace 分区，权威留 home；方法层公司级留 home」吗？
8. **首启**：接受「本包 client 负责首屏；无 workspace 选目录；有 workspace 选中会话；不依赖 welcome-notice；Host 不阻塞」吗？
9. **迁移**：接受「0.6.0 破坏性；v2→v3 manifest、v1→v2 账本；旧手册/模板只移未改副本，改过的保留告警」吗？
10. **文档/发布**：接受「README + `_dist` 手册是第一交付物；P5 独立阶段；门禁加 Plugins 页/禁 `--profile desktop`/无 bin」吗？

## 实施回执（2026-11-01）

用户授权 review 项由 agent 决定、做对优先、不考虑 0.5.0 兼容、安装尊重 DSH。已按 D1–D6 落地 0.6.0：

- 删除 package bin/launcher、`register-workspace` 子路径、standalone；默认 Plugins/CLI 仅 web；
- workspace 解析 env→cwd→saved→picker；`company-client` 在 bundle 行内 await 登记；
- 内容迁 `content/`；run bundle 全在 `<workspace>/.dsh-company/`；手册 systemPrompt section；
- manifest v3；presented 账本按 workspace 分区；旧布局不迁移（保留原文件）；
- README/`_dist`/docs/profile/runtime-map/data-model/release/tests/checks 同 diff。

验证：`pnpm verify` ALL PASS；`pnpm test` 1022 pass/3 skipped；`company-entry-smoke`、`release-smoke`、
`client-load-smoke`、`preset-smoke`、`present-catalog-smoke`、`release --verify` 全绿。细节 = 
[v3 Note](../../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md)。

## 0.7.0 复核（2026-11-02）

**结论**：v3 的产品形状与边界**已落地且未被 0.7.0 破坏**；0.7.0 生命周期轮改的是会话检索实现（D53）与
发布姿态（D54），不改入口/workspace/内容边界。两卡不冲突。复核同时收口了两处“验收文字超前于实现”的口径。

### 逐条证据（真跑）

| # | 验收 | 证据 |
|---|---|---|
| 1 | 安装 | `company-entry-smoke` ALL PASS（tarball 安装、roster、无 bin、无 registrar）；`release-smoke` CLI + 应用内安装 `applied` |
| 2 | 启动/workspace | `company-entry-smoke`（cwd 启动、登记、A/B 两盘）；`isolation-matrix-smoke` no-workspace 零写 + 可操作告警；首屏 = DSH 原生 Workspace picker（C：ui-workspace first-use）+ 本包零 onboarding UI（v3 Note） |
| 3 | 内容边界 | `company-entry-smoke` 根目录无 AGENTS/templates/kb；真模型会话原话：`本文件是公司级共识，由 host 在每个成员 agent 创建时注入 system prompt。` + `HANDBOOK-OK`（session-686d4c44，2026-11-02）；`handbook.spec` 绿 |
| 4 | run bundle | 上述 smoke 的 `.dsh-company/{kb,bundle.json}`；`release-smoke` home 根无 bundle；方法层/账本 home；`exports/` 派生 |
| 5 | 多 workspace | `company-entry-smoke` 同 home A/B 两次 boot、各自 v3 身份、无「第二盘」拒绝；`presented-domain.spec` 按 workspace 分区 |
| 6 | 身份/迁移 | `bundle-manifest.spec` v2→v3（id/createdAt）；`presented-domain.spec` 账本分区；0.5 根目录**不自动迁移**（口径见下） |
| 7 | 文档 | `pnpm verify` 的 `doc-taxonomy` / `md-links` / `bare-path` / `doc-budget` 全绿；README/手册/合同同步 |
| 8 | 门禁 | `pnpm verify` ALL PASS；`company-skeleton` / `handbook-budget` / `run-bundle-clean` / `dist-manual` 绿 |
| 9 | 认证档 | `release --verify` 六项全绿；`company-entry` / `external-workspace` / `isolation-matrix` ALL PASS；`client-load` / `handbook.spec` / `preset-smoke` 绿 |
| 10 | 分发 | `pnpm release --check` READY 0.7.0（manifest `gitSha=HEAD`、`dirty=false`）；tarball sha `a37ba24b…a8a44`；手册同版本 |
| 11 | 生命周期四段 | 装/起/配/首启证据同上；文档无 `--profile desktop`；首启依赖 DSH picker（不依赖 `welcome-notice`） |

### 两处口径收口（不是实现回退，是把已决定的范围写实）

1. **首启 onboarding**：v3 Note 已明确「无 workspace 首屏依赖 DSH Workspace picker；没有本包自建
   onboarding UI」。本轮把 README/手册/profile/runtime-map 里「产品 onboarding / 本包 client 回答」
   的表述改成「DSH Workspace picker（本包不自建 onboarding）」——不造第二个 picker。
2. **0.5 根目录迁移**：v3 Note 已明确「0.5.0 → 0.6.0 不迁移，旧文件原样保留/手册手工搬」。理由 =
   0.5/0.6 从未发布、无外部用户；生命周期卡也把 0.5 迁移列为排除项。D4 的「移未改副本」在本轮
   **收窄为不自动迁移**，避免为不存在的外部数据写迁移代码。

### 与生命周期卡的冲突检查

| v3 边界 | 0.7.0 是否改动 | 结论 |
|---|---|---|
| 产品单位 = bundle，无 launcher/bin | 未改 | 一致 |
| 入口 = named profile；无 `--workspace` | 未改 | 一致 |
| 内容在 pack；run bundle 在 `.dsh-company/` | 未改 | 一致 |
| startup/登记行在 bundle patch；不写 profile patch | `company-session-search` 也是 bundle insert | 一致 |
| 方法层/账本权威在 home | 未改 | 一致 |
| 一安装一公司、顺序多 workspace | 未改 | 一致 |
| 会话检索实现 | 0.7.0 从替换 host 行改为 insert+isolate 组（D53） | **不冲突**：只换实现，不改 v3 边界 |
| 发布姿态/许可 | 0.7.0 改为 MIT + npm 身份（D54） | **不冲突**：v3 未规定许可；发布 handoff 在生命周期卡 |

## 下一步

1. v3 复核完成：产品形状/边界已落地；两处口径按 v3 Note 收窄（原生 picker、不自动迁移）。
2. 等用户验收后按关闭法归档；真实 npm publish 不在本卡，归[生命周期与发布卡](../../issues/2026-11-01-plugin-lifecycle-publish.md)
   的 [publish handoff](../../../docs/guides/publish-handoff.md)。

## 关联

- 本轮研究：[插件即产品 v3 研究稿](../research/plugin-as-product-v3/2026-11-01-entry-and-run-bundle-boundary.md)。
- 上一轮：[伞卡](../../_archive/settled_issues/2026-11-01-plugin-as-product.md)、[落地卡](../../_archive/settled_issues/2026-11-01-landing-plan.md)、[主研究稿](../../_archive/research/plugin-as-product/2026-11-01-plugin-as-product.md)、[v2 manifest Note](../../../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md)。
- 当前合同：[README](../../../README.md)、[profile](../../../docs/profile.md)、[runtime map](../../../docs/runtime-map.md)、[data model](../../../docs/data-model.md)、[release](../../../docs/release.md)、[`_dist` 手册](../../../_dist/安装手册.md)。
- 外部 FAQ 26（只读）：`_faq_on_digested/26_plugin-as-product`（2026-11-01 更新：37 生命周期、40 启动/安装、18 安装三成功、17 home 不能供货、16 首启令牌门）。
