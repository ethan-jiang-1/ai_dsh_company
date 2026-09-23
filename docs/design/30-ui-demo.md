# UI 演示层 · 怎么在 Web 上示范组织的协调工作

> 承接 [10-architecture.md](./10-architecture.md) 与
> [20-roles-isolation.md](./20-roles-isolation.md)；总入口 [00-index.md](../00-index.md)。
> 本篇回答：demo 要"看见他们协调"，DSH Web UI 给到哪一层、我们自己要写哪一层。
> 依据：`docs/subsystems/{client-modules,slots,sidebar-right,web-client}.md`、
> `packages/experimental/client-ui-agent-team/`（官方范本，逐行读过）、
> `packages/client/ui-deliverables/`、FAQ 13 决策 4、FAQ 12（Web 缓存坑）。

---

## 0. 两个先决结论

1. **UI 不改变"一个包"**。pack 长出一个 **client 面**：`package.json` 加 `dsh.client`
   （`platform: 'web'` + `inject` 依赖边）+ `exports["./client"]` 指向打包产物，Host 行和
   client 模块住在同一个 npm 包里。先例：dsh-market（tsdown 打包）、dsh-im（esbuild 打包）。
   装法不变：`dsh plugin --profile web add file:./packages/company-pack` 一条命令，
   host 插件行和 Web UI 一起进组合。
2. **demo 第 0 天不需要写任何 UI 代码**。官方 experimental 的 `client-ui-agent-team`
   已经把"组织协作"最贵的几块画好了（§1）；我们自定义的只是"公司皮肤"层（§2）。

---

## 1. 第 0 层 · 现成的可视面（零自定义代码）

装 `agent-team-profile`（Host 侧，**先装**）+ `@deepseek-ai/dsh-experimental-agent-team-web-profile`
（Web 侧，后装）后，Web GUI 免费获得（本包**已按 10 §3 冲突注直插两行**，R1 起，UI 不受影响）：

| 可视面 | 机制（已核实） |
|---|---|
| **Team 动作入口** | 会话头部的 Team 按钮（注册进 `conversation.session.header.actions` 槽，order 20） |
| **名册（roster）** | Lead + 每个 teammate 的角色名与实时状态（running/idle/inactive/provisioning/failed） |
| **共享任务板** | 浏览器经生成的 Remote stub `ctx.remote.agentTeams.view/createTask/updateTask` 直读直改权威状态——任务 DAG、owner、修订号都是活的 |
| **点开 VP 的会话** | `sessions.openSubagent({parentSessionId, childSessionId, mode: 'continuable'})`——每个 teammate 是一个完整会话，可导航进去**看它自己的对话过程**（它怎么干活、怎么生 worker、怎么收发消息） |
| 多会话并览 | 侧栏会话列表：CEO 会话 + 各 VP 会话同屏开多个 |
| 委派过程流式可见 | `spawn_teammate` / `send_message` / `team_task_*` / `subagent` 工具调用都在对话流里实时展开 |
| **交付物卡片** | `present` 工具：CEO 收口时声明的 deliverables 在轮末渲染成卡片网格，点击在右栏预览文件（`ui-deliverables` 的 explicit deliveries） |

demo 叙事与这套 UI 的对应：**事情从 CEO 出来** = 在 CEO 会话里看着它 spawn_teammate、
建任务、派活；**中间协作** = 任务板实时变化 + VP 会话里的工作过程 + VP 间的
`send_message` 记录；**CEO 收集后出去** = CEO `wait_agent`、读板、合稿、`present`
出交付卡片。全程每一步都是持久会话日志，可回放复述。

## 2. 第 1 层 · 自定义"公司皮肤"（同一个 pack 的 client 面）

Web Client 的扩展系统是**类型化 React 槽位**（`docs/subsystems/slots.md`）：
feature 插件经 `ctx.slots.register()` 贡献 UI，绝不 import 别的 feature 包的运行时。
shipped 槽位树里我们值得占的位置：

| 槽位 | 我们放什么 | demo 价值 |
|---|---|---|
| `sidebar.right.pane.tab` / `ctx.sidebarRightTabs.register` | **Company 页签**：组织在场板（lead + 分身行，行可点进成员空间）+ 协作动态流（成员/任务差分；**消息级聚合在搁置池**，见 roadmap §搁置池） | 一屏看全局，这是 demo 的"驾驶舱"（v1 已交付，D22） |
| `tool.call.toolview`（keyed，按工具名） | **委派工具卡**：`vp_eng(...)` 调用渲染成"给 VP-Eng 的 brief 卡"（任务进、结果出、状态流转）；team 工具同法 | 让"派活/交稿"在对话流里有公司语义的皮 |
| `conversation.session.header.actions` | Company 动作入口（打开驾驶舱、展开当前任务的 lineage） | 快捷入口 |
| `conversation.session.header.lineage` | （可选）会话头显示组织汇报线 | 视觉强化"这是 VP-Eng 的会话" |

两个关键工程事实：

- **右栏 tab 类型的 band 天然高于 builtin**：`ctx.sidebarRightTabs.register` 的
  `priority: 'extension'`（`extension(3) > builtin(2) > fallback(1)`）是最高带——第三方类型
  outrank 一切 shipped viewer，不需要 hack。⚠ 这**不是 slot 概念**（2026-09-23 订正）：slot 侧
  只有 `priority`，**升序小者渲染**，同 cell 同 priority 二次注册抛错；别把两者混为一谈
  （依据 = `ui-sidebar-right/src/client/tab-registry.ts:48-58` + `ui-slots/src/index.ts:526-527,834-837`）。
- **数据面走 Remote API，不走文件**：官方团队 UI 的 `mount.ts` 就是范本——
  `ctx.remote.$mount(contribution)` 挂载生成的 Remote stub，组件里
  `await ctx.remote.agentTeams.view(leadSessionId)` 拉权威状态。我们的 host 插件同样可以
  用 `@Remote('companyDash')` 暴露自己的读模型（比如把团队事件折叠成"协作动态流"），
  浏览器端零轮询逻辑、纯声明式拉取。UI 域之间只传 JSON + 回调（slots 纪律）。

client 模块的声明（pack 的 package.json，对照 dsh-market/团队 UI 两个先例）：

```jsonc
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [                       // 依赖边：这些包的工厂先到，我们的行再物化
        "@deepseek-ai/dsh-api-remotes", // Remote stub 基座
        "@deepseek-ai/dsh-api-session-controller",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-conversation",
        "@deepseek-ai/dsh-client-ui-primitives"
      ]
    }
  }
}
```

## 3. 演示分镜（一场 demo 怎么走）

1. 开 `dsh web`（company profile），侧栏开 CEO 会话（ceo preset）。
2. 输入一个公司级动议（"评估把 X 产品线扩展到欧洲"）。
3. 观众看到 CEO：拆解（todo/plan）→ `spawn_teammate` 建出三位 VP（名册出现四行）→
   任务板落任务（blockedBy 依赖可视化）→ 给各 VP 发初始 brief。
4. 点开 VP-Eng 会话：看它消化 brief、读自己 KB、`subagent` 生 workers 深挖、
   给 VP-Sales 发消息对齐；VP-Sales 会话里看它回消息。
5. 回 CEO 会话：`wait_agent` 等各方完成、读板收口、合稿。
6. `present` → 交付卡片出现，点击右栏预览成品文档。
7. 右栏 Company 页签全程开着：在场板 + 差分动态流一屏流动（v1 已交付，R5b；消息级聚合在搁置池）。

## 4. 开发环与坑

- **client 构建链**：tsdown（或 esbuild）把 `src/client/` 打成 `dist/client.js`，
  `exports["./client"]` 指向它。dev 时 `dsh-client-hmr` stat-poll bundle → SSE 推送，
  改了重建即可热更，不用重启（机制见 `docs/subsystems/client-modules.md` §The service）。
- **双 home 纪律不变**：Web 开发也跑在 `DSH_HOME=<repo>/dev/harness-home` 的
  web profile 上，别碰日用 home。
- **FAQ 12 的坑要背**：dsh web 多开窗口第 4 个卡住 = rev 轮换 + 陈旧缓存 index（动态模块
  404）。demo 前升级过 vendor/dsh 的话，按 FAQ 12 的 runbook 重打补丁/重启/验证。
- **槽位探索工具**：运行中的动态包可用 `cordis_inspect what:"client"` 查询活槽位树；
  源码侧 `pnpm run gen-client-catalog` 生成全量槽位合同（cardinality/scope/occupants）。
  写 UI 前先对目录，别凭记忆猜槽位名。
- **锁版本**：experimental 团队包（含它的 UI）无稳定性承诺——vendor 钉 tag +
  `sync-dsh.mjs` 升级环 + compatibility 矩阵，UI 层的断点（槽位名/Remote 方法名）升级时
  一并过 typecheck。

## 5. 分层归轮

| 层 | 做什么 | 验收 |
|---|---|---|
| v0（＝R1 观察窗起，R2 进验收） | 装 team 两个 profile bundle；跑通 §3 分镜 | 一场完整 demo 全程在 UI 里可见，零自定义 UI 代码 |
| v1（＝**R5b 驾驶舱**，✅ 2026-09-23 交付） | Company 右栏页签（`ctx.sidebarRightTabs` page 型 + keyed 槽体）：在场板（lead + 分身行，**行可点进成员空间**）+ 差分动态流；数据 = `remote.agentTeams.view(lead)` 拉式（挂载即拉 + 5s 轮询），纯读模型 `src/lib/presence.ts`（rows / activity / 事件折算三入口）。成员身份 = team roster（Q5）；消息级动态流留升级路径（host 投影通道已核实，客户端 stub codegen 归 vendor 管线） | 页签/行/列头/点行切会话由 `replay-smoke --ui --scenario r2-motion` 无 key 端到端断言；读模型 14 条 keyless 单测在 `pnpm test` |
| v2（委派卡**已提前至 R3** 交付；`npm pack` 真实安装冒烟归 **R5a**） | `tool.call.toolview` 委派工具卡 + header 动作 | 对话流里的公司语义皮；`npm pack` → 干净 profile → 真实安装冒烟 |

v1 是 pack 里第一段 client 代码（React + slots），与"自定义 host 工具/provider"同包
不同目录（`src/client/` vs `src/`）——包数仍然是 **1**。
