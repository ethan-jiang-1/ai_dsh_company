# 2026-09-24 · DSH 上游增量盘点：rc.2 → 0.1.7-rc.1（基座轮前置研究）

状态：仍在用——升 pin 已毕业（[implemented/pin-upgrade-0.1.7-rc.2](../implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md)，
方案与取舍在那查）；本稿活价值 = §④ 15 条收割项（[收割轮 RFC](../implemented/2026-09-25-harvest-round.md) 的判定输入）
+ §⑤⑥⑦ 风险/增量明细，另被 [harness-alignment-ledger](./2026-09-25-harness-alignment-ledger.md) 交叉引用（收割项⑤⑬）。
毕业动作 = 收割轮收口后，结论落该轮收尾 Note / harvest-ledger，本稿删除（全文归 git）。

来源：后台子代理 2026-09-24 晚执行；**git 历史级证据（log/show/grep），未构建、未运行 0.1.7 代码**；
全程只读——vendor 工作树 HEAD 保持 `dsh-v0.1.5-rc.2`、零改动，SHA 可直接复核。submodule origin
指向本地镜像 `/Users/bowhead/deepseek-harness`，6 个 tag SHA 已逐一 `rev-parse` 核实与远端一致。

---

# DSH 上游 6-tag 增量报告（rc.2 → 0.1.7-rc.1）

**拓扑事实（影响分段口径）**：rc.3（a4c74a9）**不是**主线上的一环——它与 0.1.6-alpha.1 从 rc.2 分叉
（merge-base 恰为 fb2c4b9），是 2 个 commit 的 release 工程侧支（`943af81a18` vendor 依赖钉版），
且**已并入** 0.1.7-rc.1。主线嵌套链：rc.2 → 0.1.6-a1 → 0.1.6-a2 → 0.1.7-a1 → 0.1.7-a2 →
0.1.7-rc.1（`merge-base --is-ancestor` 逐一验证）。

## ① 总量与节奏

| 区间 | 日期 | 非merge commit | 文件 | 增/删行 | 主题画像 |
|---|---|---|---|---|---|
| rc.2→rc.3 | 09-22 | 2 | 277 | +1.5k/-1.4k | 纯 release 工程：vendor 依赖钉版 |
| rc.2→0.1.6-a1 | 09-15 | 550 | 3,942 | +784k/-47k | **能力大扩张**：ssh 全家（`4fb0fdac68`）、computer-use（`af4ad05845`）、browser-use 后端（`e1612c2fdc`）、PTC 沙箱执行（`7c9bb5914c`）、MCP 官方 SDK+resources（`489c3ac715`/`3ba5b6eb04`）、remote-mock（`3d6fa12a6d`）、headless `--session-id`（`ea84ad31b6`）、experimental 包全量发布（`42c5b65643`）、plugin manifest 元数据（`220678e57d`） |
| 0.1.6-a1→a2 | 09-17 | 548 | 2,622 | +101k/-24k | **平台治理**：plugin-manager 三件套（boot `98b92b683c` + web `1570eeeaee`）+ optional bundles 默认关（`bc0ecae21f`）、dsh-hmr 协调队列（`d06e6b5519`）、workspace-changes（`f800ea46e5`）、office-to-pdf 解耦（`9d2a3bf2b7`）、subagent 委托上限后端化（`a69bcf3636`）+ 每根 16 并发上限（`16620a3a70`）、settings 页拆 companion 包（`93e67201dd`） |
| 0.1.6-a2→0.1.7-a1 | 09-22 | 910 | 4,754 | +352k/-109k | **最大一段，机制重写**：preset 声明机制（`d1e22a7e24` #4569）、session V4（`669b724a78`）、bundle patch 有序列表（`654caa4bbd` #4722）、volatile config（`3f7016a422` #4579）、JSON Schema 导出（`4eb26f0e71` #4705）、tool-cordis 检查（`8c146d978f` #4834）、creator skills（`b13bbc027c` #4836）、DeepSeek 平台账户（`048297321a`）、语音输入全家（`47ae64ee68`）、turn triggers（`e17e1ac801`）、agentTeam 投影化（`1dc518f217`）、Remote uplink 双工（`021bd03b70`）、OTLP 遥测（`910d52f717`）、Team 单 bundle（`9f21d7842a`） |
| 0.1.7-a1→a2 | 09-22 | 101 | 869 | +21k/-11k | **稳定化**：vendor cordis 4.0.4（`d0dca04e22`）、workspace 依赖钉版/tilde（`37372101b5`/`4e6028a604`）、chat 滚动/输入修复、job 完成默认唤醒（`b6775f6d4f`） |
| 0.1.7-a2→rc.1 | 09-23 | 102 | 933 | +14k/-3k | **门禁与打磨**：peer 兼容执法（`2c67633990`/`747c98b0db`/`51d70c5f5c`）、四种 work detail 模式（`015a9b202c`）、内容准备进度（`b660f72d4e`）、Team 面板打磨 |

全量 fb2c4b9..46a7f68：2211 non-merge commit / 7872 文件 / +1,206,215 / -127,437（含 website 测试
与快照，量级参考）。主线在 rc.1 前刚经历机制重写，rc.1 本身是门禁+打磨段。

## ② 主题清单（SHA + 路径）

**新包/新 app**（intro commit + 首含 tag 均已核实；npm 名从 package.json 读出）：
- API 控制器：`packages/api/terminal-controller`（`e15a9b1bec`，"Interactive user terminals…typed
  Remote control"）、`packages/api/job-controller`（`7ec142a325`，浏览器观察/kill job）、
  `packages/api/account-controller`（`048297321a`，平台账户状态流）
- boot：`packages/boot/plugin-manager`（`98b92b683c`）、`packages/boot/hmr`（`d06e6b5519`）、
  `packages/boot/config-editor`（`601d6761e4`）
- 能力族：`packages/ssh/{ssh,fs-ssh,subprocess-ssh,sandbox-ssh}`（`4fb0fdac68`）、
  `packages/computer-use`（`af4ad05845`）、`packages/browser-use`（`e1612c2fdc`）、
  `packages/ptc-runtime`（`7c9bb5914c`，模型写程序沙箱执行 seam `ctx.ptcRuntime`）、
  `packages/workflow/workflow-ptc`（`35af8698c2`）、
  `packages/credentials/deepseek-account{,-platform}`（`048297321a`）、
  `packages/host/product-telemetry-otel`（`910d52f717`）、`packages/document/office-to-pdf`
  （`d3ed04defa`）、`packages/compaction/compaction-image-offload`（`4779f054b6`）、
  `packages/mcp/mcp-resources`（`3ba5b6eb04`）、`packages/skill/skill-office`（`fa518ecd89`）、
  `packages/skill/tool-workspace-dependencies`（`6e49ccad18`）、
  `packages/deliverables/workspace-changes`（`f800ea46e5`）、
  `packages/session/session-format-v3-to-v4`（`669b724a78`）、
  `packages/test-support/remote-mock`（`3d6fa12a6d`）、`packages/util/lazy-require`（`eb8cc594b3`）
- experimental：auto-review（`55e53907ab`，optional bundle `8059d76ea3`）、语音输入族（`47ae64ee68`：
  api-speech-to-text/speech-to-text{,-sensevoice}/client-ui-voice-input/voice-input-bundle）、
  browser-use/computer-use 驱动族（同 `e1612c2fdc`/`af4ad05845`）
- client 插件：ui-plugin-manager（`08974835d7`）、ui-sidebar-terminal（`e15a9b1bec`）、
  ui-sidebar-browser（`9fed351d3d`）、ui-settings-{account,agent-loop,shell,subagent,web-search}
  （`93e67201dd` 拆包 + `048297321a`）
- **改名/搬家**：`packages/preset/agent-presets` → `agent-preset` + `agent-preset-registry`
  （`d1e22a7e24`）；`packages/fs/tool-present` → `packages/deliverables/tool-present`（包名不变，
  平移无 API 变化）；`experimental/code-runtime-python` → `ptc-runtime-python`（`7c9bb5914c`）；
  `experimental/agent-team-web-profile` **删除**，web 行并入 `agent-team-profile` 单 bundle
  （`9f21d7842a`）
- 无新 app（apps/{cli,web,desktop,desktop-host} 两端一致；desktop 新增 installer/资源目录）

**新 API/新旗标**：
- session 创建带 `presetId` + `assertPresetUnchanged`（`46a7f68:packages/api/session-controller/src/agent.ts:236-270`）
- `@Remote('projections')`——"Read all registered projections without activating an Agent"（同上
  `index.ts:472`）+ host 级 `control()` 实时投影流（`SessionControlFrame`，types.ts:557-570）
- `RemoteStream<Out, In>` 双工 uplink（`021bd03b70`，docs/subsystems/typert.md）
- `dsh.bundle.patch` 接受有序文件列表（`654caa4bbd`；types.ts `patch: string | string[]`）
- peer 兼容门禁 + profile `compatibility.json` 豁免（`2c67633990`/`747c98b0db`；
  `packages/boot/app-boot/src/{compatibility-preflight,plugin-compatibility}.ts`）
- `--dump-config-schema` JSON Schema 导出（`4eb26f0e71`）；volatile config + watcher（`3f7016a422`）；
  `--patch` 仍可重复叠加（`46a7f68:apps/cli/src/args.ts:169`）
- session 批量迁移命令 `pnpm run migrate:sessions-to-v4`（`e105557046` 并行化）

**preset/composition 机制（本区间最大变化，`d1e22a7e24` #4569）**：preset 从"包内目录 + roots 扫描 +
运行时 YAML 编辑器 + agent_preset 工具"改为"**只能 bundle patch 声明**"：每个 preset = 一条
`@deepseek-ai/dsh-agent-preset` 行（config: `id`/`plugins`(必填内联子行)/`name`/`description`/`order`）；
registry 包 README 原话 "The registry **neither scans directories nor accepts preset paths**"、"A new
preset or an override of a shipped one is a bundle patch: an `insert` of a `@deepseek-ai/dsh-agent-preset`
row"；出厂 preset 迁到 `packages/bundle/web-app/presets/{standard,cordis,ptc}.patch.yml`；Web preset
页改 view-and-select only。

**client 插件 API**：`ctx.remote.$mount` 仍在（`46a7f68:packages/api/remotes/src/client/index.ts:182`），
但 remotes client 是**固定装配**（README："The capability set is fixed by explicit build-time value
imports…Additional capabilities require an explicit `/remote` value import and mount in this
assembly"）；agentTeams remote **整体移除**（rc.2 的 `agent-team/package.json` 有 `./typert`+`./remote`
导出，rc.1 两者皆删）；Team 面板改读共享 Session store 的 `agentTeam` 投影（`1dc518f217`："this
registration performs no Team RPC"，`client-ui-agent-team/src/client/mount.ts`）；client 读投影走
`useProjection`（`session-controller/src/client/contract/session.ts:51-67`）；list 响应携带 projection
blocks（`c4d40864fd`/`1b51a1ad2d`/`9ff8f26450`/`86ca9de07e`）。

**teams/sessions 机制**：agentTeam wire 投影（durable-only：roster/task/failure，mailbox 事件刻意
不发布）；Team 容量参数进 `agent-team-profile` patch（maxMembers 8/maxTasks 256/
maxPendingMessagesPerMember 64/maxMessageBytes 65536）；归档前停止运行中工作（`cbae324bfa`）；
subagent catalog 迁投影 + 历史目录 V4 迁移（`e55093b47d`/`1d1ae1a5af`）；subagent 侧栏会话
（`e62587c163`）；委托深度默认 3→读 Host 设置默认 1（`04a3c30a04`）；每根 16 个 live continuable
上限（`16620a3a70`）；session 格式 V4（`669b724a78`）。

**文档**：根 AGENTS.md Conventions 的目录地图整幅重写（新增 ssh/ptc-runtime/computer-use/
browser-use/deliverables/jobs/schedule/session-query/spill/storage/feedback 等条目）；新增
persistence-type 变更确认流程（docs/cookbook/reviewing-persistence-type-changes.md）；
docs/persistence-changes/ 目录族（finalized/historical-formats/releases）；docs/testing.md 仅 4 行
变化；新增 `docs/agents/skills/dsh-client-ui-ux` 客户端 UI/UX 技能（`5b600047d2`）。

**破坏性变更汇总**（对下游可见）：① `dsh-agent-presets` 包名消失（拆分重命名）；② agentTeams
client remote 移除；③ preset roots 目录扫描废除；④ session V4（新会话回滚 rc.2 会 fail-loud）；
⑤ `DshProfileManifest.patchReload` 字段删除；⑥ subagent maxDepth 默认值 3→1；
⑦ `agent-team-web-profile` bundle 删除。

## ③ 搁置池五问判定

**a. per-child composition / 组合隔离控制面 → 复活（会话级组合隔离；spawn 层无参数）**
- 证据 1：`d1e22a7e24` + registry README front-matter："One process can run several compositions.
  Failed definitions remain visible, while existing Agents retain the composition they already use."
- 证据 2：同 README 实现节："Each declaration eagerly creates a registry-owned scope and an
  in-memory Loader tree… Plugin registrations inherit the preset scope, and the Agent scope's parent
  link controls visibility."——每个声明独立 scope + Loader 树，这就是组合隔离控制面。
- 证据 3：`46a7f68:packages/api/session-controller/src/agent.ts:236-270`——会话创建/恢复带
  `presetId`，且 `assertPresetUnchanged` 保证会话组合稳定。
- 证据 4（撞名）：`packages/preset/agent-preset/README.md` Known Limitations："Duplicate preset IDs
  fail declaration loading."——同名 fail-loud，不静默。
- **没看到**：`spawn_teammate` 参数两端一致（name/description/prompt/context fresh|fork），无
  per-child preset/composition 参数（`fb2c4b9` 与 `46a7f68` 的 `tool-agent-team/src/index.ts:176-215`
  对比）。即"并行角色会话各挂各的 preset"成立（多组合共存、互不干扰、名冲突 fail-loud），但
  teammate 级别的组合选择仍不可参数化（角色差异要靠 prompt 注入，或 VP 各自开独立会话选自己的
  preset）。

**b. pack 侧 client remote stub 生成 / host-only 投影客户端读 → 部分复活（投影读路径成熟且有官方
样板；stub 生成无新机制；消息级动态仍需自建）**
- 投影路径（复活主体）：`1dc518f217` "Publish a durable-only `agentTeam` wire view… The Web panel
  derives every row from the shared Session… this registration performs no Team RPC"——agentTeam
  投影从 host-only 变为带 `wire` 视图，面板零 RPC。配套客户端读面：`@Remote('projections')`（"Read
  all registered projections without activating an Agent"，`session-controller/src/index.ts:472`）、
  host 级 `control()` 实时投影流、follow snapshot 内嵌 projections baseline（`types.ts:550-570`）、
  list projection blocks（`c4d40864fd` 等）、client `useProjection` hook。
- **机制边界**：session-projection 注册表与 `wire` 块 **rc.2 就存在**
  （`fb2c4b9:packages/session/session-projection/README.md:32,36` 已有 wire 文档）；区间新增的是官方
  参考实现（agentTeam）+ 投影递送面（list blocks/控制流/gateway）。pack 定义自己的投影单元（如折
  team 事件成"消息级协作动态"）走 `ProjectionDefinition{key,stateSchema,apply,wire{viewSchema,view}}`
  即可让 client 零 RPC 读取。
- stub 生成：typert generator（`packages/typert/generator`，`./typert`/`./client/typert`/`./remote`
  exports + tsdown `typertPlugin()`）两端都在，**无区间新机制**；client 侧挂载走 `ctx.remote.$mount`
  （仍在）但 remotes client 固定装配不自动发现第三方 remote。
- 消息级注意：agentTeam wire 刻意 durable-only——`1dc518f217` 原话 "mailbox-only events reuse the
  previous view reference and publish nothing"。即**上游没有现成的消息级动态流**；要复活它需 pack
  自建投影单元 fold mailbox/turn 事件（机制开放、有样板）。
- 加分项：`021bd03b70` Remote uplink 双工流——client 可向 host 流推 item，适合交互式动态面。

**c. 调度器/cron/外部触发 → 会话内自主续跑 seam → 未复活（两个既有 seam 区间内无实质变化）**
- 既有事实（**rc.2 已存在，非本区间新增**）：`packages/webhook`——"Webhook rule runtime…that
  create Workspace Sessions"；`WebhookSessionRequest` 带 `agentPreset`/`permissionPreset`/可选 model
  路由，外部事件→建会话→mount preset→`Agent.followup()` 提交。`packages/schedule`——"Session-local
  durable reminders…live-owner delivery"，固定间隔 repeating。区间内 webhook 仅 2 个非 release
  commit（`71d50b4a84` 重命名 origin label、`d1e22a7e24` preset 机制适配），schedule 仅 build/docs。
- 区间新增（只是续跑增强，不是外部触发 seam）：`b6775f6d4f` 后台 job 完成默认唤醒 idle 会话；
  `127d2c8eb5`（0.1.6-a1）headless `--session-id` resume 的端到端加固（CLI 面早已存在）。
- **没看到**：任何 cron/定时器/外部 webhook 触发**既有会话** followup 的新 API；webhook 只建新会话，
  schedule 只在活会话内提醒。

**d. sessionTelemetry/hooks 之外的新 egress/推送通道 → 未复活（无用户向推送/收件箱；仅产品遥测 egress）**
- 新 egress 仅一类：`910d52f717` → `packages/host/product-telemetry-otel`（OTLP/HTTP 到 collector，
  批量/关停限制；README 明言 "The shipped profiles do not mount it"）——产品使用事件遥测，不是给
  用户的消息推送。
- desktop 新增 OS Notification 仅用于强制更新提示（`63dd8fb80d`；`apps/desktop/src/update-attention.ts:43`
  是全树唯一 `new Notification`；rc.2 无）。
- **没看到**：email/SMS/浏览器推送/桌面会话完成通知/收件箱类通道（notification/inbox/push 关键词
  全量筛查，命中皆为 agent-loop 内部 next-step inbox、web UI 内 toast、CI 通知）。

**e. 多 provider / provider 组合隔离 → 未复活（既有自定义 provider 面仅 UI 整合）**
- `8a320a276b`——Models 页两按钮合一（catalog 三方 provider vs OpenAI/Anthropic 兼容自定义 API），
  **纯 UI 整合**；自定义 provider 能力 rc.2 已有（`CustomProviderCard.tsx` 两端都在）。
- per-team provider 路由（freshProvider/forkProvider）两端一字未变；tool-subagent 的 `agentOptions`
  （per-child provider/model/effort/maxTokens）两端都在。
- 新增仅 DeepSeek 专属：`048297321a` 平台账户登录凭据（Host-only token）。
- **没看到**：provider 的组合隔离、多 provider 并存冲突消解、第三方 provider 注册 API 的任何新机制。

## ④ 可收割新能力（虚拟公司 pack 视角）

1. **agentTeam 投影 + `session.projections` Remote + `control()` 实时投影流 + `useProjection`**——
   companyDash 想给浏览器的数据可做成**投影单元**而非自建 remote：host fold 团队/动议事件 → wire
   视图 → client 零 RPC 订阅，断线重连由框架管。**这也是升级后唯一可行路**（remote.agentTeams 没了）。
2. **RemoteStream uplink 双工流**（`021bd03b70`）——client→host 流内推 item，可做交互式面板
   （如"插话/追加油"入口）。
3. **session 创建 `presetId` 参数**——按角色开会的 API 面：创建/恢复会话时点名 preset，断言不可变。
4. **plugin-manager 全家 + optional bundles + manifest 元数据**（`98b92b683c`/`bc0ecae21f`/
   `220678e57d`/`8f0dd55c2c` icons）——pack 分发安装故事升级：Web 侧栏即可装/卸/开关 bundle，pack
   可在 package.json 声明 title/description/icon/tags 品牌化。
5. **`cordis_inspect_list`/`cordis_inspect_query` 检查工具**（`8c146d978f`）——角色会话可只读检查
   "我挂了哪些行、每行 Config schema 是什么"；培养/学习回路与组合调试的现成载体。
6. **subagent 委托上限后端化 + Web 设置页**（`a69bcf3636`/`845115d0f8`/`ea1e73ddf5`）——汇报线
   深度/并发不用改 patch 就能调。
7. **job-controller + terminal-controller**（配 `ui-jobs`/`ui-sidebar-terminal`）——浏览器观察/杀
   后台 job、开终端：demo 现场运维观察窗。
8. **workspace-changes**（`f800ea46e5`）——turn 级文件变更审阅卡（单 tab 汇总、卡片逐文件 diff、
   git 仓记录、Host 终生存储），直接强化交付物流。
9. **office-to-pdf + spreadsheet 预览**（`d3ed04defa`/`087dc65e89`/`e70fa89400`）——交付物
   （xlsx/csv/tsv/pdf）浏览器直接预览。
10. **job 完成默认唤醒 idle owner**（`b6775f6d4f`）——后台任务不再因唤醒预算耗尽让会话僵住。
11. **Team 容量参数**（`agent-team-profile/cordis.patch.yml`）——公司规模与信箱背压可调。
12. **remote-mock 测试支撑**（`3d6fa12a6d`）——pack 的 keyless client 测试链可升级。
13. **volatile config + watcher + `--dump-config-schema`**——运行时可调 knobs + 自描述 schema。
14. 新工具族（可选挂载）：ssh 远端盘、browser-use/computer-use、voice-input、PTC（模型写程序
    沙箱）、auto-review、skill-office——多为 demo 卖点储备。
15. **OTLP 产品遥测**（`910d52f717`）——demo 运营侧使用数据出口（默认不挂载，需显式 compose）。

## ⑤ 升 pin 风险清单（对照本仓依赖面）

1. **peerDependencies——会破**：`@deepseek-ai/dsh-agent-presets` 在 0.1.7 不存在（拆为
   `dsh-agent-preset` + `dsh-agent-preset-registry`）；peer 列表其余 16 个包名全部存活（两端核对），
   `dsh-tool-present` 搬家但包名不变。所有 dsh-* 版本随 release 锁步 bump 到 `0.1.7-rc.1`。
2. **新 peer 兼容门禁——会拦（能过）**：`2c67633990` 起 profile 导入前校验 peer range
   （`semver.satisfies(v, r, {includePrerelease:true})`）——pack 的 `^0.1.5-rc.2` 在此语义下**能匹配**
   `0.1.7-rc.1`（建议随升级显式提 range）。本仓自定义的 `dsh.compatibility.dshReleases` 字段**上游
   不读**（它是 verify 门禁 + sync-dsh 维护的本仓合同），照旧走 sync-dsh 加列。豁免走 profile 的
   `compatibility.json`。
3. **client 插件 API——会破（两处）**：① pack client import 的
   `@deepseek-ai/dsh-experimental-agent-team/remote` **导出已删除**——TS/build 断；② 运行时
   `ctx.inject(['remote.agentTeams'])` + `remote.agentTeams.view` 轮询**服务已消失**——必须重写为
   `agentTeam` 投影读取（`useProjection`/sessions store，样板 `client-ui-agent-team/src/client/
   {mount,TeamAction}.ts`）。存活的：`remote.session.follow`、`slots`/`sidebarRight`/
   `sidebarRightTabs`/`LocaleNamespaceMap`；`ctx.remote.$mount` 仍在。
4. **preset composition 行 schema——会破（最大工程量）**：roots 目录扫描声明法废除。五个
   `presets/<role>/{preset.yml,agent.cordis.yml}` 必须改写为 cordis.patch.yml 里五条 `agent-preset`
   insert 行（config: id + 内联 plugins 子行 + name/description/order——字段与现 preset.yml 一一
   对应）。**有利因素**：子行 config schema 基本未动——`tool-subagent` Config 两端逐字段一致；
   `skill-filesystem` 的 `customSkillDirs`/`includeDefaultRoots` 两端一致（角色技能硬隔离可保留）；
   persona 行、tool-present 行无变化。替换行 `- id: agent-presets` 的目标行改名
   `- id: agent-preset-registry`。`baseUrl` 语义（= profile 目录）**需实测复核**（区间内
   profile-resolution/拦截层重构 `15e07d2721`/`45417197c6` 可能影响 `!!js` 表达式解析环境）。
5. **cordis.patch.yml 格式——不破反增**：`patch: string | string[]`（向后兼容单文件）；`- id:`
   替换 / `- insert:` 语法不变；`--patch` overlay 仍可重复叠加。`DshProfileManifest.patchReload`
   字段删除（pack 未用）。注意行 id 归属重构（`5d742503ea`）。
6. **snapshot/录制格式——条件性风险**：V3（及 v0-v2）全系**可读可重放**（read-open 惰性迁移、原件
   byte-identical；`RETAINED_BASELINE_VERSION=3`）；replay 明确接受 V3 基线。两个坑：(a) 0.1.7 起新写
   会话为 **V4**（`SESSION_FORMAT_VERSION=4`），**回滚 rc.2 会 fail-loud**（future format 拒读）——
   升级是不可轻易回退的单向门；(b) 若快照断言比较**原始事件布局**，V3 输入经迁移链重放会 diff
   （tool-result 拍平、source 改名 `plugin:*`、seq 重排）；归一化比较则稳定。本仓 snapshots/ 既有
   资产不必重录，回归需加布局差异预期。
7. **行为变化——需跟进**：subagent maxDepth 默认 3 → 读 Host 设置默认 1（`04a3c30a04`）——CEO
   preset 的通用 `subagent` 行须显式 `maxDepth`，否则 VP 生 workers 受限；每根 16 个 live
   continuable 上限；job 唤醒默认无上限；归档前自动停止运行中工作（`cbae324bfa`）。
8. **构建/发布面**：vendor 依赖钉版 + cordis 4.0.4（pack peer `^4.0.2` 兼容）+ workspace
   tilde/exact ranges；experimental 包全部公开发布（`42c5b65643`）。release-smoke 将首次穿过新
   兼容门禁与 plugin-manager 安装路径，需重点跑。

## ⑥ 建议

**pin 目标：`dsh-v0.1.7-rc.2`（477b4f42；2026-09-25 靶校正，原为 rc.1）**。理由：七个 tag 全量含入
（rc.3 已并入）；0.1.6 两段是中间态（preset 机制未定型、无 V4、无兼容门禁），单独钉无意义；rc.2 在
rc.1 之上还有 346 commit（见 ⑦，非纯发布 bump），且机制重写（preset/V4/投影）正是本仓搁置项的复活
载体。代价：接受 ⑤-4 的 preset 声明迁移工程量与 ⑤-6 的单向 V4 门，外加 ⑦ 的新增量面。

**升级程序七步（按序）**：① sync-dsh 既定流程（submodule 前移 + 簿记 + 兼容矩阵加列 + verify 双门禁
重校）；② peerDependencies 重写（`dsh-agent-presets` → `dsh-agent-preset` + `dsh-agent-preset-registry`，
全部 range 提 `^0.1.7-rc.1`，补显式 `@deepseek-ai/dsh` peer）；③ preset 声明迁移（工程量主体，
完成定义 = preset-smoke 真挂载）；④ client 数据层重写（remote.agentTeams → 投影，完成定义 =
client-load + presence-e2e + snapshot 回归）；⑤ 快照回归策略（V3 照跑 + 布局差异预期 + 新录 V4 +
单向门写进 Note）；⑥ 发布链全量（release-smoke 穿新门禁、deliverables-check、delegation-smoke）；
⑦ 时机与拆分：升级本身单独立项（③+④ 两天级工程）；收割项在升级后独立进 ROADMAP，不捆绑。

## ⑦ rc.1 → rc.2 增量（2026-09-25 本地核实；靶校正）

阶段 0 靶校正时把 rc.2 抓进 `vendor/dsh`（https，7.7s；**不动 origin、不动 vendor HEAD**）后实测：

- **不是"纯发布 bump"**：`rc.1..rc.2` = **346 commit**（含 merge）/ 3429 文件 / +136,313 −24,518。
  GitHub API 上那个 merge commit 自身的 317/317（全是 `package.json` 的 `version`）只代表**它这一步**，
  不代表区间——先前"rc.2 只是发布工程"的印象据此纠正。
- 落在本仓依赖面上的改动（按提交主题筛）：`user-questions` 5（含
  `feat(user-questions): support timed waits and late replies`——**人机合一"人不在 / 迟到回复"的现成机制**）、
  `approval` 5（说明本地化、auto-review 否认后转问人）、`preset` 19（含 legacy preset 的 Schedule 工具
  期望修正）、`schedule` 20（含 `feat(web): disable shipped schedule and time context plugins`——与搁置池
  「自主节律」相关）、`projection` 5（live projection 失败归类、动态工具更新投影）、`workspace-files`
  （目录链接按解析目标列举——影响走 `workspaceFiles` 的台账 / 培养面板）。
- 结论：**升级幅面比原判大**，但方向对我们有利（三条恰好喂队列 ⑤ / 搁置池 / 升 pin 后的 client 重写）。
  影响面仍以换基座后跑现有门禁的《实测影响面清单》为准（RFC 阶段 1）。

## 局限声明

以上全部为 git 历史级证据（log/show/grep），未实际构建或运行 0.1.7 代码；`baseUrl` 解析环境、
web-app 启动面兼容性两项标"需实测"。总量 2211 commit，本报告覆盖全部结构性变化与五问证据链。
