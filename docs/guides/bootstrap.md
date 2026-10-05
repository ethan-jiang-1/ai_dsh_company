# 冷启动引导（clean checkout → 可跑通）

> 性质：指南层 runbook——[开发环](./dev-loop.md)管「一笔任务怎么走」，本篇管「环境怎么立起来」。
> 何时读：新 clone、重建 dev home、vendor 换 tag、任何「跑不起来」的第一站。
> 出生：2026-09-27 自 dev-loop §7 整段迁入（常驻层瘦身轮；dev-loop §7 留指针、编号不动防既有引用断链）。
> 配方与坑均在钉住 vendor 基线实证（R0/R1，2026-09-22）；机制结论以 vendor/dsh 工作树为权威。

```sh
git submodule update --init             # vendor/dsh 钉 tag
corepack enable pnpm                    # 一次性：pnpm 读根 packageManager（钉 11.7.0）
pnpm install                            # 全 workspace（vendor/dsh 全树含 vendored cordis 与 native/system）
# host 面构建（typert 类型图产物，源码直跑需要；tsc 局部 + tsdown host 面）：
node ./node_modules/typescript/bin/tsc -b \
  vendor/dsh/packages/typert/generator \
  vendor/dsh/packages/llm/llm \
  vendor/dsh/packages/interaction/commands \
  vendor/dsh/packages/feedback/command-feedback \
  vendor/dsh/packages/goal/goal \
  vendor/dsh/packages/subagent/subagent
(cd vendor/dsh && ../../node_modules/.bin/tsdown --env.DSH_BUILD_FACE host)
# 原生插件（flock，会话持久化刚需；macOS 用 CommandLineTools 的 cc）：
(cd vendor/dsh/native/system && ../../node_modules/.bin/tsx scripts/build.ts)
# web 观察窗（可选；三件事缺一不可）：
node ./node_modules/typescript/bin/tsc -b vendor/dsh/tsconfig.client.json   # client 面（测试面报错可忽略）
(cd vendor/dsh && DSH_CLIENT_TITLE="DSH Wochen Team" ../../node_modules/.bin/tsdown --env.DSH_BUILD_FACE client)
DSH_CLIENT_TITLE="DSH Wochen Team" pnpm --filter @deepseek-ai/dsh-web-frontend run build   # 前端 dist
source dev/env.sh && pnpm dsh plugin --profile web add link:./packages/company-pack          # dev 用 link:（内容改动即刻生效）；真实形状归 release-smoke
pnpm dsh web -- --port 0 --no-open                                         # 端口是环境状态：系统分配，从横幅读端口/token

# pack 代码面构建（改 src/** 任一面都需要——host〔src/index.ts+lib〕与 client〔src/client〕双编译面，
# 2026-09-25 起 solution root；⚠ 旧命令 `tsc -p tsconfig.json` 在 solution root 上静默不构建，即此坑的由来）：
node ./node_modules/typescript/bin/tsc -b packages/company-pack
(cd packages/company-pack && ../../node_modules/.bin/tsdown)
# ⚠ 两步必须连跑：tsdown 的入口是 lib/types/**（tsc 的产物）——改 src 后只跑 tsdown = 打包上一次的旧产物（2026-09-27 实测：改 styles.ts 只跑 tsdown，页面仍旧色）；也别删 lib/ 再只跑 tsdown（入口没了直接红）
# ③ client 面生效第三跳 = **用户浏览器刷新**（无 HMR：模块表 rev 会变，不刷新看的是旧 bundle）
# ⚠ preset 内容与代码面不同步：link: 安装下改 presets/**（persona/skills）**即刻生效无需重建**，
#   但 host/client 代码（src/**）走 lib/ 构建产物——**不重建 = 改动永远不生效**（2026-09-25 实证：
#   verify 的 client-halves 门禁只查形状不构建，preset-smoke/client-load 全绿也可能验的是旧包）。
# ⚠ 重装纪律（2026-09-22 更新；2026-09-30 补节律 bundle）：dev profile 的 pack 已改 **`link:` 符号链接**
#   ——改 presets/** persona / skills 即刻生效，**无需重装**；只有改 pack 依赖或 bundle 行才需要
#   `plugin --profile web remove` + `add`。profile 的 `.npmrc` 把 store/cache 钉在 repo 内
#   （`~/Library` 不被碰）。**真实安装形状的验证归 R5a release-smoke**（干净 profile + file:/registry）。
#   **节律 bundle（harvest 批3）在 dev web profile 的 bundles 列表手动启用**（profile package.json 是
#   dev 工件）：link: 形态不落 pack 传递依赖，OPTIONAL_BUNDLE 从安装闭包解析、无需安装——启用 =
#   bundles 数组加 `@deepseek-ai/dsh-experimental-schedule-bundle`（时间通道/schedule/ui-schedule 三行归它）。
#   历史：file: 拷贝时代，presets/*.yml 用编辑工具改会换 inode、安装副本是真拷贝（link count 1），
#   不重装则改动不可见——该坑随 link: 消失。
node scripts/client-load-smoke.mjs     # client 面完成定义：真浏览器加载（postmortem 0003；playwright 从 .pnpm store 自动定位）
node scripts/handbook-smoke.mjs        # agent-instructions 注入完成定义：指令基线 = 公司手册（默认只跑 ceo 一次小调用）
node scripts/delegation-smoke.mjs      # 汇报线边界守卫：控制名归团队版（1 条 prompt，~30s）
```

实证过的坑与解法（细节见 notes/implemented/2026-09-22-r0-loop-acceptance.md）：

- **pnpm 入口**：`/usr/local` 老 corepack shim 执行新 pnpm 会 VM 崩
  （ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING）——`corepack enable pnpm` 换 nvm 自带
  corepack 的 shim；根 `packageManager: pnpm@11.7.0` 与 vendor 逐字一致。
- **编译器**：macOS 走 CommandLineTools（本机 xcode-select 已切换）。无垫片直连 CLT cc
  报 `errno.h not found` 时，`export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk`
  兜底；不需要完整 Xcode。
- **workspace 形状**：glob 必须 `packages/*/*` 两层 + `vendor/*`（vendored cordis 全家）+
  `native/system*`（node-addon-system）；见 pnpm-workspace.yaml 注释。
- **根 devDeps**（tsx/tsdown/typescript/@types/node/@types/js-yaml/lightningcss/vitest）
  版本逐字镜像 vendor 根声明；vendor 换 tag 时随升级环 diff 对齐。
- **凭据**：`cp ~/.dsh/.credentials.yaml dev/harness-home/ && chmod 600`（gitignored）。
- **web 观察窗三件事**（R1 实证）：① client bundles（`tsdown --env.DSH_BUILD_FACE client`）——
  缺了报 `client bundles not found; run pnpm run build before launch`；② 前端 dist
  （`pnpm --filter @deepseek-ai/dsh-web-frontend run build`）——缺了首页 404 空页；
  ③ pack 装进 **web profile**（`plugin add link:./packages/company-pack`，dev 用符号链接——
  内容改动即刻生效；profile `.npmrc` 把 store/cache 钉在 repo 内，`~/Library` 不被碰。
  历史：file: 拷贝时代首次装会拦 koffi 构建审批 → profile 的 `pnpm-workspace.yaml` 改
  `koffi: true` 再装；link: 下 profile 不再装 koffi，koffi 由源码域解析）。观察窗默认端口 3080，**与本 GUI 冲突**，用
  `-- --port 0`（端口是环境状态，系统分配后从启动横幅读）。preset roster 出现在 UI 的 Built-in 组（五角色；trust 分组见上文 R1 坑注）。
- **bundle 叠加的重复行 id**（R1 实证）：web-app 已 insert `agent-presets`，pack 再 insert 同 id
  → `duplicate loader entry id` 硬拒。修法：对已存在的行用**替换**语法（`- id:`），只有真正
  新增的行才 insert。
- **根 devDeps 的 workspace 链接**（R1 实证）：insert 的四个行其包名必须同时是根
  `devDependencies`（`workspace:*`）——源码 CLI 下 TS 导入走 tsconfig paths 进 src，但插件清单的
  `require.resolve` 走 **Node 原生解析**，root 无链接就报
  `REQUEST_EXTENSION: DeepSeek request extension preparation failed`。
- **`!!js` 里的 `baseUrl` = profile 目录，不是你的包目录**（R1 实证，`app-boot/src/index.ts:799`
  设 `ctx.baseUrl = pathToFileURL(dirname(configPath)) + '/'`）。所以 bundle 里给 agent-presets 的
  roots 必须写 profile 相对路径（`node_modules/<你的包>/presets/`）；写成 `presets/` 会指向
  `<profile>/presets/`——不存在 → `scanRoot` 遇 ENOENT **静默返回空** → UI 里一个角色都不出现
  （无报错、无警告，最难查的一类）。另：**preset 在 UI 按 trust 分组**——`system` → **Built-in**、
  `user` → **Custom**（`AgentPresetSection.tsx`）。
- **preset 行的插件必须在 pack dependencies 里**（R1 实证，`pnpm verify` 已加门禁）：
  preset 的 `agent.cordis.yml` 里 `name:` 写的裸插件（如 `@deepseek-ai/dsh-persona`、
  `dsh-skill-filesystem`）会**按安装域解析**——不在 pack dependencies（profile 安装）或根
  devDeps workspace 链接（源码域）里，行就解析不到 → **preset 被标记 broken → UI 给不出可用角色**
  （扫描得到、名字也对，就是不能用；`discoverPresets` 的 `broken` 字段是唯一线索）。
  对应 DSH 的 `verify-cordis-config` 门禁；我们同构到 `scripts/run-gates.mjs` 检查 7。
- **patchReload**：headless 用途的自定义 profile 必须 `"startup"`（见 [开发环 §2](./dev-loop.md) 第 3.5 层）；web 形态
  才用 `"live"`。
- **品牌（皮肤第一笔，零代码）**：`DSH_CLIENT_TITLE` 是构建期环境变量，同时决定**浏览器标签页标题**
  （`apps/web/vite.config.ts`）与**应用内主标题**（`ui-layout/src/client/AppFrame.tsx:192`）——所以
  **上面两条构建命令都要带它**（web dist 与 client 面各注入一次）。侧栏品牌名是插槽
  `sidebar.brand.name`（官方品牌包占着），改它需要 pack 自己的 client 面（R5 皮肤 v1）。
- **上线前必跑 preset 冒烟**（R1 起，两道防线）：
  1. **防线一（快，`pnpm test`）**：已知必填 config 字段必须随工具行给出（如
     `tool-fs-search.sampleOverCapGlobResults`、`tool-todo.allowParallelInProgress`）。
  2. **防线二（真，`node scripts/preset-smoke.mjs`）**：boot 真 web profile → `agentPresets/list`
     断言五角色零 broken → **逐个 `session/create` 真挂一次**。
  **只有防线二能抓"preset 挂载失败"**：行 config 校验发生在挂载时，roster 扫描与 `--dump-config`
  都看不到，UI 还会吞掉错误（症状就是"新建会话点了没反应"）。已反证：去掉一个必填 config 即变红
  （精确指向 preset 与缺失字段），恢复后 ALL PASS。
