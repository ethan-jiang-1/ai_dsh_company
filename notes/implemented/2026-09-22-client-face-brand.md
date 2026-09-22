# 2026-09-22 · pack 长出 client 面（公司皮肤第一块砖）

## 决定

1. **company-pack 现在有 client 面**（design/30 §0 的形态落地）：`package.json` 加
   `exports["./client"]` + `dsh.client`（`platform: web`，inject renderer/sidebar），
   `src/index.ts` 是空 host 半（`apply(){}`），`src/client/index.tsx` 注册侧栏槽
   **`sidebar.brand.name`** 渲染 `DSH Wochen Team`。
2. **构建**：`tsc -p packages/company-pack/tsconfig.json`（产出 `lib/types/**`，含 client 半）→
   `cd packages/company-pack && tsdown`（产出 `lib/index.js` + `lib/client.js`）。
3. **bundle 行**：insert `company-client`（`name: dsh-company-pack`）——本包自己的 host 半挂上，
   浏览器半由 `dsh.client` 被发现并伺服。
4. **不用 vendor 的 `clientBundle` 助手**：它按 `packages/*/*/package.json` 找包（vendor monorepo
   布局），本包在 `packages/company-pack/` 一层会报
   `no packages/*/*/package.json declares the name dsh-company-pack`。改为照抄它的**产物契约**：
   `fixedExtension: false`、client 半包 `window.__ModuleLoader__.load({id, factory})` 外壳、
   外置 `react/jsx-runtime` 与共享 client 包（模块表回答）、其余内联。
5. **tsconfig 清 `paths`**：继承 vendor client base 会带上 `paths`（把 vendor `src` 拉进本程序，
   触发 vendored 包内部类型错误）；清空后改用 node_modules 里已构建的 `lib/types` 声明。
6. **标题品牌化（零代码）**：`DSH_CLIENT_TITLE` 是构建期变量，同时决定标签页标题与 AppFrame
   主标题——**web dist 与 client 面两条构建命令都要带**（guides/60 §7）。

## 输掉的方案

- **只用 `DSH_CLIENT_TITLE`**：改得了标签页与主标题，改不了侧栏（侧栏读 locale
  `brand.localBuild`，而槽 `sidebar.brand.name` 被官方品牌包占着且只在
  `DSH_CLIENT_BUILD_PROFILE === 'official'` 时注册）。
- **改 vendor 的 `index.html` / 官方品牌包**：违反 vendor 只读基线。
- **另起一个 workspace 包放皮肤**：违背 D1"一个发布载体"；皮肤属于本 pack 的 client 面。

## 验证（实际跑过）

- `tsc -p packages/company-pack/tsconfig.json` → exit 0；`lib/types/client/{index,Brand}.js` 产出。
- `tsdown`（本包目录）→ `lib/index.js`（353B，ESM）+ `lib/client.js`（1115B，CJS，带 ModuleLoader
  外壳与品牌文案）。
- 装进 web profile 后：前端加载列表含 **`dsh-company-pack/client.js`**；服务的合并 bundle 含
  `DSH Wochen Team`（2 处）与 `sidebar.brand.name`（9 处）；页面 `<title>DSH Wochen Team</title>`。
- `pnpm verify` ALL PASS；`pnpm test` 8 条；`node scripts/preset-smoke.mjs` → **ALL PASS**
  （新增的 client 行没有破坏 preset 挂载）。

## 未验证 / 已知风险

- 侧栏**视觉**需人工确认（浏览器渲染；我验证的是"代码已送达并被注册"这一层）。
- pack 的 client 面目前只有品牌一处；R5 的 Company 驾驶舱页签（`sidebar.right.pane.tab`）与
  委派工具卡（`tool.call.toolview`）复用同一套基础设施。
- `files` 字段已含 `lib/**`，但 npm 发布形状（`npm pack` → 干净 profile）仍归 R5 release-smoke。

## 追加：自带任务板（官方 Team UI 在本构建形态下挂不上）

**症状**：host 侧一切正常（RPC `agentTeams/view` 返回成员与任务），但 UI 里没有任何团队入口。

**根因（客户端模块表的依赖闭环）**：官方 `@deepseek-ai/dsh-experimental-client-ui-agent-team` 的
`dsh.client.inject` 含 **`@deepseek-ai/dsh-client-ui-primitives`**——那是纯组件库，**没有 `dsh.client`
字段、不在浏览器模块表里**。启动清单里该依赖缺失 → 模块静默挂不上 → 它的 `remote.agentTeams`
也无人注册 → 团队 UI 整体不存在。查法：从页面 HTML 解析 `window.__DSH_BOOT__`，比对
`entries[].inject` 与 `entries[].id` 的差集（官方模块缺失依赖正是 `ui-primitives`）。

**解法**：本 pack 的 client 面**自己实现只读任务板**，并自己挂同一份生成描述符：
- `src/client/TasksPanel.tsx`：会话头部动作（`conversation.session.header.actions`，id `company-tasks`，
  order 21），点开显示成员状态 + 共享任务（id@revision / 主题 / 状态 / owner / 依赖），带刷新。
  纯 DOM + 内联样式，**不依赖 `ui-primitives`**。
- `src/client/index.ts`：`await ctx.remote.$mount(agentTeamsRemote)` 后注册品牌槽与任务板；
  子代理会话经 `sessions.binding(...).subagent.address.parentSessionId` 归到 Lead。
- `dsh.client.inject` 只列**模块表里确实存在**的包（api-remotes / api-session-controller /
  ui-conversation / ui-renderer / ui-sidebar）。
- tsdown：`noExternal` 强制内联 `@deepseek-ai/dsh-experimental-agent-team/remote`（tsdown 默认把
  package.json 的 dependencies 当 external，描述符留成 require 会在浏览器抛错）。

**验证（实际跑过）**：boot 清单里我们的条目 `inject` 与 `entries[].id` **差集为空**；服务的合并
bundle 含"任务板"文案（8 处）与 `agentTeams`（57 处）；`verify`/`test`/`preset-smoke` 全绿。

**未验证**：面板的**视觉**需人工确认（我验证的是"模块能挂上 + 数据接口可用"这两层）。
**已知取舍**：client bundle 约 197KB（内联了 zod）；官方 Team UI 仍不可用（上游缺口，未改 vendor）。
