# 冷启动引导（clean checkout → 可跑通）

> 性质：指南层 runbook——[开发环](./dev-loop.md)管「一笔任务怎么走」，本篇管「环境怎么立起来」。
> 何时读：新 clone、重建 dev home、vendor 换 tag、任何「跑不起来」的第一站。
> 机制结论以 `vendor/dsh` 钉住基线为权威；本篇面向源码维护者，收件人安装 = [_dist/安装手册.md](../../_dist/安装手册.md)。

## 先选形状（真插件安装 vs 维护者 dev）

| | **真插件安装** | **维护者 dev** |
|---|---|---|
| 适用 | 给别人用、跨机器/跨部署 | 在本机隔离环境里跑本仓库的当前代码 |
| 前置 | 有 `dsh` 运行时 + tarball；不需要本仓库 | 本仓库 + pinned vendor + Node/pnpm；按本节构建 |
| 数据落点 | 新 `DSH_HOME` + 用户 workspace 的 `.dsh-company/`（身份/产物；home 只运行时+治理） | dev 用 `runtime/harness-home` + 仓内 `company-workspace/.dsh-company/` |
| 首启 | Plugins/CLI 装 bundle → `dsh --profile company` → workspace 解析/登记/状态只补缺 | dev 用 `pnpm company --no-open`（构建 + pack + 安装 + exec） |
| 升级 | 换 profile 包后重启（workspace v3 身份；状态只补缺） | 拉代码 + 重跑 `pnpm company`（构建 + 重装 tarball） |
| 删除 | `plugin remove` + 删 home | 手工删 dev home/workspace（本仓无独立启动器） |
| 验收 | `release-smoke` + `company-entry-smoke` | `pnpm verify` + `pnpm test` + `company-entry-smoke` |
| 不承诺 | 浏览器全交互、离线 | 跨 OS 构建、离线预构建、容器 |

维护者 dev **不是**“复制构建产物分发包”：构建仍按 checkout 产生；换机器按本节重建。启动入口始终是 named profile，不是本仓脚本。

## 一、fresh clone 一条龙（可直接执行）

```sh
git submodule update --init             # 拉下钉住 tag 的 vendor/dsh
corepack enable pnpm                    # 一次性：启用根 packageManager 声明的 pnpm
pnpm install                            # 安装根 workspace 并经 prepare 接好 .githooks/pre-push
pnpm bundle:init                        # 建 dev 的 company-workspace/.dsh-company/（gitignored，已有盘不动）
pnpm setup                              # 全量构建：vendor host/client/native/web + company-pack
node tools/dev/setup.mjs --check        # 核对全部构建产物在场
pnpm verify && pnpm test && pnpm typecheck
```

启动隔离观察窗并做最小真挂载验收：

```sh
source run/env.sh
pnpm company --no-open                  # dev-only：构建 + npm pack + plugin add file: + exec dsh --profile company
node checks/lanes/preset.entry.mjs      # preset 真挂载（零 broken + 逐个 session/create）
node checks/lanes/client-load.entry.mjs # client 真页面加载（需先 pnpm dlx playwright install chromium）
```

> 改 `presets/**` 后需重启 `pnpm company`（默认 tarball 安装副本）；快速迭代可用 `pnpm company --link`（显式快速通道，不验打包面）。
> 改 `src/**` 必须重跑 `tsc -b` + `tsdown`（或重跑 `pnpm company`）并刷新浏览器（无 HMR）；仅查 `verify` 不会替你重建 `lib/`。

## 二、内部步骤与单步排障（`pnpm setup` 失败时才手跑）

以下命令均为 `pnpm setup` 的内部展开，正常首跑成功后无需重复执行：

```sh
# 1. vendor 独立 lock 安装（固定上游依赖版本，防与根 lock 漂移）
(cd vendor/dsh && pnpm install --frozen-lockfile --ignore-scripts)

# 2. vendor host 最小 dev type graph（CI 单独调用可用 node tools/dev/setup.mjs --types）
node ./node_modules/typescript/bin/tsc -b \
  vendor/dsh/packages/typert/generator \
  vendor/dsh/packages/llm/llm \
  vendor/dsh/packages/interaction/commands \
  vendor/dsh/packages/feedback/command-feedback \
  vendor/dsh/packages/goal/goal \
  vendor/dsh/packages/subagent/subagent

# 3. 原生插件（flock，会话持久化刚需；macOS 用 CLT cc，Linux 需 musl-gcc）
(cd vendor/dsh/native/system && ../../node_modules/.bin/tsx scripts/build.ts)

# 4. Web 观察窗产物（client 类型 → client bundles → 前端 dist；DSH_CLIENT_TITLE 决定标签页与主标题）
node ./node_modules/typescript/bin/tsc -b vendor/dsh/tsconfig.client.json
(cd vendor/dsh && DSH_CLIENT_TITLE="DSH 梦之队" ../../node_modules/.bin/tsdown --env.DSH_BUILD_FACE client)
DSH_CLIENT_TITLE="DSH 梦之队" pnpm --filter @deepseek-ai/dsh-web-frontend run build

# 5. company-pack 双面构建（必须先 tsc -b 生成 lib/types，再 tsdown 打包；不可只跑 tsdown）
node ./node_modules/typescript/bin/tsc -b packages/company-pack
(cd packages/company-pack && ../../node_modules/.bin/tsdown)

# 6. 常用定向校验
pnpm test tests/host/prompt/handbook.spec.ts
node checks/lanes/delegation.entry.mjs
```

- **凭据与隔离**：profile 的 `.npmrc` 将 store/cache 钉在仓库内，不碰系统目录；日期通道（`time-context` + `tool-schedule`）已由公司角色 preset 各自声明，无需额外 schedule bundle。
- **真实安装形状验证**：归 `release-smoke`（干净 profile 执行 `plugin --profile company add file:<tgz>` → `dsh --profile company`）。

> **fresh clone 的可执行证明（范围诚实）**：CI `fresh-clone` 的 job 分工（`install-verify` /
> `setup-macos` / `install-channel`）与「证明了什么」唯一家 =
> [release.md §版本纪律](../contracts/release.md#版本纪律)，本页不复述；**干净 clone 上重放 `_dist`
> 发布不在 CI 内**。全量构建只有 macOS runner 的 CI 证据，Linux 缺口（vendor 双 lock、全 host 构建
> OOM、client aggregate 测试类型、musl-gcc）仍登记在
> [repo-hygiene Note](../../notes/archived/2026-10-25-repo-hygiene-contract.md)。

实证过的坑与解法：

- **pnpm 入口**：`/usr/local` 老 corepack shim 执行新 pnpm 会 VM 崩
  （ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING）——`corepack enable pnpm` 换 nvm 自带
  corepack 的 shim；根 `packageManager: pnpm@11.28.5` 与 vendor 逐字一致（`package-manager-parity` 门禁）。
- **编译器**：macOS 走 CommandLineTools（本机 xcode-select 已切换）。无垫片直连 CLT cc
  报 `errno.h not found` 时，`export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk`
  兜底；不需要完整 Xcode。
- **workspace 形状**：glob 必须 `packages/*/*` 两层 + `vendor/*`（vendored cordis 全家）+
  `native/system*`（node-addon-system）；见 pnpm-workspace.yaml 注释。**不要把 vendor 根
  收成 workspace 项目**来补根 devDeps——它的 postinstall（lefthook）会改写 submodule 的
  git 内部状态。根 devDeps 用镜像声明，不纳 vendor 根。
- **根 devDeps**（tsx/tsdown/typescript/@types/node/@types/js-yaml/lightningcss/vitest）
  版本逐字镜像 vendor 根声明；vendor 换 tag 时随升级环 diff 对齐。
- **凭据**：`cp ~/.dsh/.credentials.yaml runtime/harness-home/ && chmod 600`（gitignored）。
- **web 观察窗三件事**：① client bundles（`tsdown --env.DSH_BUILD_FACE client`）——
  缺了报 `client bundles not found; run pnpm run build before launch`；② 前端 dist
  （`pnpm --filter @deepseek-ai/dsh-web-frontend run build`）——缺了首页 404 空页；
  ③ pack 装进 **company profile**（`pnpm company` 默认 pack + `plugin add file:`；`--link` 走符号
  链接快速通道。profile `.npmrc` 把 store/cache 钉在 repo 内，`~/Library` 不被碰）。观察窗默认端口由 wrapper 交系统分配（`--port 0`）；日用 GUI **永不动**（其端口是环境状态，判据见 [multi-human-runbook](./multi-human-runbook.md)），要固定端口用
  `-- --port <n>`（端口是环境状态，从启动横幅读）。preset roster 出现在 UI 的 Built-in 组（公司角色 + support preset；清单 = `presets/`；trust 分组见下文说明）。
- **bundle 叠加的重复行 id**：web-app 已 insert `agent-presets`，pack 再 insert 同 id
  → `duplicate loader entry id` 硬拒。修法：对已存在的行用**替换**语法（`- id:`），只有真正
  新增的行才 insert。
- **根 devDeps 的 workspace 链接**：insert 的行其包名必须同时是根
  `devDependencies`（`workspace:*`）——源码 CLI 下 TS 导入走 tsconfig paths 进 src，但插件清单的
  `require.resolve` 走 **Node 原生解析**，root 无链接就报
  `REQUEST_EXTENSION: DeepSeek request extension preparation failed`。
- **`!!js` 里的 `baseUrl` = profile 目录，不是包目录**（`app-boot/src/index.ts:799`
  设 `ctx.baseUrl = pathToFileURL(dirname(configPath)) + '/'`）。所以 bundle 里给 agent-presets 的
  roots 必须写 profile 相对路径（`node_modules/<你的包>/presets/`）；写成 `presets/` 会指向
  `<profile>/presets/`——不存在 → `scanRoot` 遇 ENOENT **静默返回空** → UI 里一个角色都不出现。另：**preset 在 UI 按 trust 分组**——`system` → **Built-in**、
  `user` → **Custom**（`AgentPresetSection.tsx`）。
- **preset 行的插件必须在 pack dependencies 里**（由 `checks/gates/preset-row-deps.mjs` 强守）：
  preset 的 `agent.cordis.yml` 里 `name:` 写的裸插件（如 `@deepseek-ai/dsh-persona`、
  `dsh-skill-filesystem`）会**按安装域解析**——不在 pack dependencies（profile 安装）或根
  devDeps workspace 链接（源码域）里，行就解析不到 → **preset 被标记 broken → UI 给不出可用角色**
  （`discoverPresets` 的 `broken` 字段是唯一线索）。
- **一次性 profile 退出**：headless 用途优先用 shipped `headless`；自定义 profile 在 profile patch 把
  `hmr` row 设为 `disabled: true`（见 [run-ops.md §2](./run-ops.md#2-调试阶梯组合层--会话层不跳层)）。
- **品牌（皮肤入口）**：`DSH_CLIENT_TITLE` 是构建期环境变量，同时决定**浏览器标签页标题**
  （`apps/web/vite.config.ts`）与**应用内主标题**（`ui-layout/src/client/AppFrame.tsx:192`）——所以
  **上面两条构建命令都要带它**（web dist 与 client 面各注入一次）。侧栏品牌名走插槽
  `sidebar.brand.name`，由 pack 自己的 client 面接管。
- **上线前必跑 preset 冒烟**（两道防线）：
  1. **防线一（快，`pnpm test`）**：已知必填 config 字段必须随工具行给出（如
     `tool-fs-search.sampleOverCapGlobResults`、`tool-todo.allowParallelInProgress`）。
  2. **防线二（真，`node checks/lanes/preset.entry.mjs`）**：boot 真 company profile（`pnpm company` 默认安装目标）→ `agentPresets/list`
     断言全部 preset（公司角色 + support）零 broken → **逐个 `session/create` 真挂一次**。
  **只有防线二能抓"preset 挂载失败"**：行 config 校验发生在挂载时，roster 扫描与 `--dump-config`
  都看不到，UI 还会吞掉错误（症状就是"新建会话点了没反应"）。

## 插拔速查

装法（按离源码远近）：

| 装法 | 命令 | 用途 |
|---|---|---|
| workspace 直跑 | `source run/env.sh && pnpm dsh --profile headless "…"` | 源码组合调试，改配置即刻生效（不验打包面） |
| patch overlay | `pnpm dsh --profile <p> --patch ./run/try-x.patch.yml` | 一次性实验某插件行，不落盘 |
| **公司 overlay（headless 动议）** | `pnpm dsh --profile headless --patch ./run/company.overlay.yml "…"` | 无 web-app 行的组合里补公司行（insert 语法） |
| profile 内持久（dev 默认，tarball） | `pnpm company`（包装器：构建 + `npm pack` + `plugin add file:<tgz>`） | **日常开发**：与用户侧同形；store/cache 由 profile `.npmrc` 钉在 repo 内 |
| profile 内持久（link 快速通道） | `pnpm company --link`（或 `pnpm dsh plugin --profile company add link:./packages/company-pack`） | 改 `presets/**` 即刻生效；**不验打包面**，只做快速迭代 |
| profile 内持久（真实形状） | `pnpm dsh plugin --profile <p> add file:./packages/company-pack` | 仅验证真实安装形状——归 `release-smoke`（干净 profile；`plugin` 子命令把参数转发给 profile 目录里的 pnpm） |
| 正式分发 | `pnpm dsh plugin --profile <p> add <npm-name>` | 用户视角；CI 测兼容矩阵 |

⚠ overlay 语法：`- id:` **只替换已有行**（not found 会警告丢弃）；**新增行必须
`- insert:` 子列表**（教义源自 shipped dsh-headless/dsh-web-app 的 cordis.patch.yml）。

拔法（从轻到重）：会话不挂 preset → patch 行 `disabled: true`（行还在，Loader 每次 mount
求值）→ 卸载（registrations are effects，无残留）。异常时先 `--dump-config` 对照实际组合
再下结论。
