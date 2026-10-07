# 2026-09-30 · 上游增量分析：dsh-v0.1.7-rc.2 → dsh-v0.2.0-rc.2（只读核对）

> 只读分析：全程仅用 `git -C vendor/dsh log/diff/show/ls-tree`，未 checkout、未动 vendor HEAD（仍钉 `477b4f42`）。
> 区间：`477b4f420553e8a52c2fbccc464d7561b239c443`（dsh-v0.1.7-rc.2）→ `639ed015397290b3745d163aafe02ffee4aa3f84`（dsh-v0.2.0-rc.2）。
> 对照基线：上次升 pin 记录 [2026-09-25-pin-upgrade-0.1.7-rc.2](../implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md)。
> 本仓版本台账：`packages/company-pack/package.json` peerDependencies 钉 `^0.1.7-rc.2` × 24 + cordis `^4.0.2`。

## §0 结论摘要

**这次升 pin 是「纯适配」，无 install 级阻塞。** 24 个 `@deepseek-ai/dsh-*` peer 包在 0.2.0-rc.2 上全部存在、全部已是 `0.2.0-rc.2`、无改名；cordis 升 `4.0.4`（仍在本仓 peer 范围 `^4.0.2` 内）。六个消费面里五个**稳**（多数包 src 零改动，只 bump 版本），**一个破面**：

- **红（最高severity）：日期通道断**——web-app 出厂补丁删掉了 `time-context` 行（连带 `schedule`/`ui-schedule`，搬进新的可选 bundle `@deepseek-ai/dsh-experimental-schedule-bundle`，commit `64a361ee44`）。本仓 [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 的 `- id: time-context` **替换行将找不到替换目标**（替换语义实测：not found 警告丢弃，见本文件头注引 R5 探针）⇒ 角色会话收不到时间注入。

红面按严重度排序：

| # | 面 | 结论 | 一句话 |
|---|---|---|---|
| 红1 | §2-② bundle 补丁行 | **破** | `time-context` 出厂行被移除（搬进 schedule-bundle），替换行落空 |
| 黄1 | §2-⑥ host 面 | 稳（有行为微变） | `tool-ask-user` 新增 Config（mode/timeout），默认 legacy 不改行为；`tool-cordis` inspect 有超时语义修正 |
| 黄2 | §2-② bundle 补丁行 | 稳（需留意） | web-app insert 列表新增 3 行（product-analytics ×2、ui-settings-session-log），与本仓 insert 无 id 冲突 |
| 绿 | 其余四面 | 稳 | 见 §2 逐面 |

区间内**新增** 4 个包（对本仓无消费义务，登记备查）：`dsh-client-product-analytics`、`dsh-client-ui-settings-session-log`、`dsh-experimental-schedule-bundle`、`dsh-otel`（`git diff --diff-filter=A --name-only` 唯四）。无删除/改名。

无 CHANGELOG.md（root 无此文件）；release 事实从 bump commit `c1b47e41fc`（`release(dsh): 0.2.0-rc.2`）与其 `.agents/notes/` 取证。

## §1 区间总览

```
git -C vendor/dsh log --oneline 477b4f42..639ed015 | wc -l   → 448 commits
git -C vendor/dsh diff --stat 477b4f42..639ed015 | tail -1
  → 1638 files changed, 52060 insertions(+), 82531 deletions(-)
```

删除显著大于新增（−82.5k / +52.1k）：区间含桌面 analytics/otel 大 refactor 与多份 docs/notes 修订，与消费面无关（消费面包层面文件变更清单见 §2/§6 取证命令输出，共 107 个文件、其中 src 仅 4 个包）。

## §2 消费面逐面核对

### 面① peerDependencies 包名 —— **稳**

逐包核对结果见 §3 表。命令：对每个包名在 `git ls-tree -r 639ed015` 全树 `package.json` 里按 `"name"` 精确匹配。24/24 存在、版本全为 `0.2.0-rc.2`；`@deepseek-ai/cordis` = `4.0.4`（vendor/cordis 子树）。无删除/改名；新增 4 包见 §0。

### 面② bundle 补丁行 —— **破（time-context）；其余稳**

本仓 [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 逐行核对（替换行须能在 web-app 出厂补丁找到同 id 行；insert 行须无 id 冲突）：

| 本仓行 | 语法 | 639ed015 上的对位 | 结论 |
|---|---|---|---|
| `- id: agent-preset-registry`（default: ceo） | 替换 | web-app 出厂行仍在：`packages/bundle/web-app/cordis.patch.yml` L561-565（insert，`default: standard`）| **稳**，config 形状同 |
| `- id: time-context`（disabled: false + timeZone） | 替换 | **出厂行已删除**（连同 `schedule`/`ui-schedule`）；三者搬进 `packages/experimental/schedule-bundle/cordis.patch.yml`（新可选 bundle，无 disabled/config） | **破** |
| `- insert: tool-present` | insert | base 无此行、web-app 无同 id 行 → 无冲突 | **稳** |
| `- insert: agent-team` / `tool-agent-team` / `ui-agent-team` | insert | web-app 无同 id 行；官方插入点仍是 `packages/experimental/agent-team-profile/cordis.patch.yml:33`（本仓不装该 profile，无冲突） | **稳** |
| `- insert: company-client` | insert | 本包自引用 | **稳** |

**破面证据**（`git diff 477b4f42..639ed015 -- packages/bundle/web-app/cordis.patch.yml` 摘录）：

```diff
-    - id: time-context
-      name: '@deepseek-ai/dsh-time-context'
-      disabled: true
-    - id: schedule
-      name: '@deepseek-ai/dsh-schedule'
-      disabled: true
...
-    - id: ui-schedule
-      name: '@deepseek-ai/dsh-client-ui-schedule'
-      disabled: true
```

commit = `64a361ee44`（`feat(schedule-bundle): insert the Schedule rows from the bundle and list them on its page`，commit message 原文："The Web composition no longer carries `time-context`, `schedule`, and `ui-schedule`"）；`packages/experimental/schedule-bundle/cordis.patch.yml`（新）以 **insert、无 disabled** 提供同一组行。

同 diff 里 web-app insert 新增（不冲突但要过目）：`desktop-product-telemetry`、`product-analytics`（两者 `disabled: !!js "ctx.get('profileContext')?.name !== 'desktop'"`）、`ui-settings-session-log`（`7ded036fdb`）。

### 面③ preset 声明形状 —— **稳**

- `packages/preset/agent-preset/src`、`packages/preset/agent-preset-registry/src`、`packages/preset/persona/src`：**区间内零改动**（`git diff --name-only` 仅 package.json 版本位 + README + skills 文档：agent-preset 新增 `skills/agent-experience/SKILL.md`、package.json 加一条 devDep `dsh-skill-filesystem`）。insert 形状（`- id: preset-<role>` / `name: dsh-agent-preset` / `config.{id,name,description,order,plugins[]}`）与五个 `presets/<role>/agent.cordis.yml` 完全同形——新版官方样板 `packages/bundle/web-app/presets/cordis.patch.yml`（`preset-cordis` 行）同构可证。
- `customSkillDirs` baseUrl 语义：`packages/skill/skill-filesystem/src` 零改动 ⇒ 本仓 `!!js "fileURLToPath(new URL('…', baseUrl))"` 写法语义不变。
- `packages/experimental/agent-team/src`、`tool-agent-team/src`、`client-ui-agent-team/src`：零改动。

### 面④ client 数据层 —— **稳**

本仓用点（[use-company-data.ts](../../packages/company-pack/src/client/use-company-data.ts)、[index.ts](../../packages/company-pack/src/client/index.ts)）逐个对：

| 本仓用点 | 新版核对 | 结论 |
|---|---|---|
| `state.projectionsBySession[lead]?.values.agentTeam` 投影 | `packages/experimental/agent-team/src/types.ts` 零改动；`TeamProjectionState`/`TeamMemberView` 形状同 | **稳** |
| presence 从 phase 推导（`'provisioning'\|'active'\|'failed'`） | `git show 639ed015:…/agent-team/src/types.ts:44` = `export type TeamMemberPhase = 'provisioning' \| 'active' \| 'failed'`，同旧版 | **稳** |
| `scoped.uiWorkspace.openSession(lead)` / `openSession({parentSessionId, childSessionId, mode:'continuable'})` | `packages/client/ui-workspace/src/client/navigation.ts:34` `openSession(target: SessionTarget): void`；`SessionTarget` 仍来自 api-session-controller/client（含 SubagentAddress 形状）；navigation.ts 语义零 diff | **稳** |
| `useProjection('tokenUsage'\|'sessionStats')`（`UseProjection` 类型） | `packages/api/session-controller/src/client/index.ts:42` 仍导出 `UseProjection`；contract/sessions.ts 的 projections 读面零 diff | **稳** |
| session/projections RPC 面 | 区间内 contract/sessions.ts 唯一变更是 `fork` 增可选 `onCreated` 回调（additive，见下） | **稳** |

session-controller 唯一 src diff（`10a4a17ccc` 之前的 fork 观察点需求，additive）：

```diff
-  fork(opts: { sessionId: SessionId; atSeq?: number; increaseTitle?: boolean }): Promise<SessionId>
+  fork(opts: { sessionId: SessionId; atSeq?: number; increaseTitle?: boolean;
+               onCreated?: (childId: SessionId) => void }): Promise<SessionId>
```

ui-workspace 的 src 变更全在本仓不用到的面：`forkSession(sessionId, onCreated?)` 签名扩展 + 返回值从 `void` 改 `Promise<SessionId>`（`ad008e2ea5` 等）、未命名会话 `displayTitle` 语义（空 title 返回 `''` 由渲染层落 `t('session.untitled')`，`tree.ts`/`Rows.tsx`）、rename 快捷键改 `KeyG`。均不触本仓 import 面。

### 面⑤ replay/快照基建 —— **稳**

- `materializeProfilePatch` 签名：`git show 639ed015:packages/test-support/session-snapshot/src/launcher.ts` L417-419 = `materializeProfilePatch(source: string, cwd: string, profile: string, targetDir: string, index: number)` —— 与 [replay-smoke.mjs](../../checks/smoke/replay-smoke.mjs) 依赖的五参签名**逐字一致**；该包区间内仅 package.json 变更。
- client 模块表注入（`dsh.client` roster → `window.__DSH_BOOT__`）：`packages/client/modules` 仅 package.json 变更；web-app 补丁的 `dsh.client` 段落 diff 只增 3 行（见面②）、删 3 行（time-context 组），扫描机制行未动。
- web-app 默认 bundle 行（`dsh-web-app` / base 组合）：base bundle diff 仅 telemetry otel 行重构（`dsh-otel` 改名进场、collector URL 变更）+ optional bundle 清单加 `experimental-schedule-bundle`，与本仓行无交集。

### 面⑥ host 面 import 符号 —— **稳（2 个被挂载包有行为微变）**

本仓 `packages/company-pack/src/` grep 出的完整 import 清单，逐个在 639ed015 核对：

| import | 新版证据 | 结论 |
|---|---|---|
| `Button` / `StateDot` / `Tag` / `Tooltip`（client-ui-primitives） | `src/index.ts` L6/12/17/61 均在 | 稳 |
| `IconChecklistOutlineMedium` | `src/icons/index.tsx:1142` | 稳 |
| `defineTool`（dsh-tools） | `packages/core/tools/src/index.ts:67` | 稳 |
| `Context`（cordis，type） | cordis `4.0.4` | 稳 |
| `PaneId` / `TabId`（client-ui-dockkit） | `src/index.ts` L23-24 再导出；`src/contract/types.ts:18` 定义 | 稳 |
| `PropsRuntime`（client-ui-slots） | `src/index.ts:251` | 稳 |
| `SessionId`（dsh-session `/types`） | `packages/core/session/src/types.ts:20`；package.json `"./types"` 导出在 | 稳 |
| `ToolCallViewProps`（client-ui-tool `/client`） | `src/client/index.ts:4` | 稳（contract 另 additive 新增 `UserQuestionRecord`/`UserQuestionPanels`，`3a296b16b4`） |
| `UseProjection`（api-session-controller `/client`） | `src/client/index.ts:42` | 稳 |
| 12 个 `import type {}` 副路径（augmentation 侧效应：api-remotes、api-workspace-files `/remote`、ui-conversation/renderer/sidebar/sidebar-right/tool/workspace `/client`、experimental-agent-team、session-stats、token-meter `/client`、user-approval） | 各包 `/client`、`/remote` 入口全在；augmentation 相关 contract diff 均 additive（无槽删除/改名）；本仓注册的槽名 `sidebar.brand.name`（ui-sidebar `contract/slots.ts:30`）、`tool.call.toolview`、`sidebar.session.row.leading`、`conversation.session.header.actions`、`sidebar.right.pane.tab` 全部仍在 | 稳 |

被挂载包的两处**行为**微变（不改声明形状、不改 config 必填性）：

- `tool-ask-user`（`3a296b16b4` `feat(user-questions): support timed waits and late replies` 等）：新增 `Config { mode?: 'legacy'|'timed'; timeout?: number }`，默认 `legacy`/`120s` ⇒ 本仓 preset 行（无 config）行为不变。
- `tool-cordis`（`f0e97fb7bc`、`10a4a17ccc`）：Client inspect 查询加超时上限与离线跳过——host 面行为修正，本仓只挂载行、无 config，无形状影响。

## §3 peerDependencies 核对表（25/25）

| 包 | 0.2.0-rc.2 存在 | 版本 | 路径（vendor 树内） |
|---|---|---|---|
| @deepseek-ai/cordis | ✅ | 4.0.4 | vendor/cordis/package.json |
| dsh-agent-instructions | ✅ | 0.2.0-rc.2 | packages/context/agent-instructions |
| dsh-agent-preset | ✅ | 0.2.0-rc.2 | packages/preset/agent-preset |
| dsh-agent-preset-registry | ✅ | 0.2.0-rc.2 | packages/preset/agent-preset-registry |
| dsh-client-ui-workspace | ✅ | 0.2.0-rc.2 | packages/client/ui-workspace |
| dsh-experimental-agent-team | ✅ | 0.2.0-rc.2 | packages/experimental/agent-team |
| dsh-experimental-client-ui-agent-team | ✅ | 0.2.0-rc.2 | packages/experimental/client-ui-agent-team |
| dsh-experimental-tool-agent-team | ✅ | 0.2.0-rc.2 | packages/experimental/tool-agent-team |
| dsh-persona | ✅ | 0.2.0-rc.2 | packages/preset/persona |
| dsh-session-persistence-jsonl | ✅ | 0.2.0-rc.2 | packages/session/session-persistence-jsonl |
| dsh-skill-filesystem | ✅ | 0.2.0-rc.2 | packages/skill/skill-filesystem |
| dsh-time-context | ✅ | 0.2.0-rc.2 | packages/context/time-context |
| dsh-tool-ask-user | ✅ | 0.2.0-rc.2 | packages/interaction/tool-ask-user |
| dsh-tool-cordis | ✅ | 0.2.0-rc.2 | packages/extensions/tool-cordis |
| dsh-tool-fs | ✅ | 0.2.0-rc.2 | packages/fs/tool-fs |
| dsh-tool-fs-search | ✅ | 0.2.0-rc.2 | packages/fs/tool-fs-search |
| dsh-tool-present | ✅ | 0.2.0-rc.2 | packages/deliverables/tool-present |
| dsh-tool-skill | ✅ | 0.2.0-rc.2 | packages/skill/tool-skill |
| dsh-tool-subagent | ✅ | 0.2.0-rc.2 | packages/subagent/tool-subagent |
| dsh-tool-subagent-control | ✅ | 0.2.0-rc.2 | packages/subagent/tool-subagent-control |
| dsh-tool-todo | ✅ | 0.2.0-rc.2 | packages/todo/tool-todo |
| dsh-tool-web | ✅ | 0.2.0-rc.2 | packages/web/tool-web |
| dsh-tools | ✅ | 0.2.0-rc.2 | packages/core/tools |
| dsh-user-approval | ✅ | 0.2.0-rc.2 | packages/interaction/user-approval |

（24 个 dsh-* 全部零 src 改动或 additive；`dsh-time-context` src 零改动、仅 +locale 文案——包本身没变，变的是**它的出厂挂载位置**，即面②的破点。）

## §4 预计适配动作清单（对照 0.1.7 七类）

| 上次（0.1.7）七类 | 这次是否需要 | 动作 |
|---|---|---|
| ① peerDependencies 重写（包消失/改名） | **不需要** | 仅把 24 个 range `^0.1.7-rc.2` → `^0.2.0-rc.2`；cordis `^4.0.2` 可原样（4.0.4 在范围内） |
| ② bundle 补丁行 | **需要（唯一硬适配）** | `cordis.patch.yml` 的 `- id: time-context` 替换行改 **insert**（显式 `disabled: false` + `config.timeZone` 随 insert 带上——insert 语义下新行没有出厂 disabled 可沿用，正好绕开 R5 探针发现的「按键覆盖」坑）；或改为依赖 `@deepseek-ai/dsh-experimental-schedule-bundle`（但这会连带挂进 schedule/ui-schedule，本仓不需要 ⇒ 建议 insert）。`dev/company.overlay.yml` 同步（headless 轨本就是 insert，大概率零改）。package.json `dsh.compatibility.dshReleases` 加 `dsh-v0.2.0-rc.2`（pack-compat 门禁） |
| ③ preset 声明迁移 | **不需要** | 声明形状零变化；完成定义照旧 `preset-smoke` 真挂载 |
| ④ client 数据层重写 | **不需要** | 投影/openSession/useProjection/phase 面全稳；完成定义照旧 client-load + presence-e2e + 快照回归 |
| ⑤ 快照回归策略 | **照上次预案执行** | V 系列照跑 + 注意 web-app 新增 product-analytics/ui-settings-session-log 行是否影响 workspace 快照 diff（见 §5） |
| ⑥ 发布链全量 | **照常规** | `release-smoke` + `deliverables-check` + `delegation-smoke`；`release.md` 升 pin 流程合同对 vendor 重校（vendor README 要求） |
| ⑦ 收割项登记 | **升级后独立做** | 区间内与自治 seam 相关的新货：`experimental/schedule-bundle`（schedule 通道转可选 bundle）、timed ask-user（`3a296b16b4`）、session-log export/otel（`779d268199`）——登记进队列，不在升级范围 |

**量级判断**：这次适配 ≈ 一个 commit（② 的 patch 行改写 + 版本位三处），远小于 0.1.7 那次（peer 重写 + preset 模型迁移 + client 数据层重写）。

## §5 未覆盖/需实测项

1. **替换语义对"行已消失"的实测**：本报告断言 `- id: time-context` 替换行会 not found 丢弃，依据是 0.1.7 时的 R5 探针结论（cordis.patch.yml 头注），未在 0.2.0-rc.2 上复跑探针——落适配 commit 前应在候选窗口实测一次（红→改 insert→绿）。
2. **workspace 快照对 web-app 新增行的敏感度**：product-analytics（desktop-gated，web 应为 disabled）与 ui-settings-session-log 两行进的是 web-app insert 列表，`workspace.expected` 是否因 roster/Plugins 页清单变化而漂，需快照回归实跑判定。
3. **insert 的 time-context 在纯 headless 双轨的一致性**：改为 insert 后 web 与 headless 两轨同形，`company.overlay.yml` 是否可收敛为不再需要补行——实测时顺手核对。
4. **timed ask-user 的 steering 面不进本仓**（`24226a7164` "Deliver late question answers through steering"）：未核对它与本仓 preset 的 `tool-ask-user` 行在真会话里的交互；若未来想启用 `mode: timed` 需另行立项，本报告按默认 legacy 判稳。
5. **cordis 4.0.2→4.0.4 的上游差异**未逐 commit 看（vendor/cordis 子树在区间内是否被整体替换/合并未追踪）；peer range `^4.0.2` 形式上覆盖，但 install/构建行为以 `sync-dsh` 事务窗口实跑为准。
6. **区间含 448 commits 的全部非消费面变更**（desktop/otel/analytics 等）未逐一审——本报告只对六个消费面负责。
