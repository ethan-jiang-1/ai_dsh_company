---
topic: wiki-knowledge-map
intent: wiki 六功能（ingest/query/lint/browse/grow/configure）可挂载的剩余 DSH 原生载体盘点（schedule/workflow+subagent/hooks/client UI/inspect/deliverables+goal/preset delta）+ 三档组合接入形状与证据
---

# Wiki 落入 DSH：原生载体盘点与组合形状

> 研究日期 = 2026-11-12；执行 = 父会话亲自取证（子代理中断后接手完成 §1–§8）。
> 证据三档：**【事实】**（代码路径+行号+原句 / docs 原句）/ **【推论】** / **【建议】**。负证据集中住 §9。
> 权威源码 = `vendor/dsh` 钉 `b830ec95`（tag `dsh-v0.2.1-rc.5`），只读未改；公司 pack 事实以 `packages/company-pack/` 工作树为准。
> 分工边界：handbook section 注入 / kb 播种 / skill catalog / 培养回路 / HostConfigLike / settings.json 先例已由主材料与 handoff 覆盖，本件不复述；检索能力 internals（fs-search/MCP/web 工具/session-query）见姊妹材料 [家底](2026-11-12-dsh-retrieval-inventory.md)。
> 前置阅读 = [主材料](2026-11-12-wiki-knowledge-map.md) §4.2/§4.3/§5、[parent-handoff](2026-11-12-parent-handoff.md)。

## 0. 一句话结论

**【事实】** DSH 现成载体足够覆盖 wiki 全生命周期：schedule（宿主级定时任务，**6 个公司角色 preset 已挂 `tool-schedule`**）承载周期 lint；workflow + subagent（**vp-eng 已挂 `tool-workflow`** + ceo 的命名 child 派发面）承载并行 ingest 编译；client slot（公司**已注册 6 处**）承载浏览面板；`systemPrompt.section` thunk 承载活读指针；skill catalog→body 承载查询协议；fs 工具承载浏览；MCP client 承载外部知识源。**【建议】** 推荐三档组装：**最小挂载**（内容层 + 指针 + 协议 skill）→ **标准挂载**（+ kb seed + schedule lint + 页签浏览）→ **全量挂载**（+ workflow ingest + FTS CLI），每档零新增 npm 依赖，增量全是「用现有行/现有槽」。**【推论】** 「充分利用 DSH」的正确读法 = DSH 提供乐高块，wiki 是拼法。

## 1. schedule：宿主级定时任务 → 周期性 wiki lint

**【事实】** 组 README（`vendor/dsh/packages/schedule/README.md` Summary 逐字）：

> "Create one-shot, fixed-rate, daily, weekly, or cron reminders for a conversation and keep them across Host restarts. ... Due reminders arrive as ordinary follow-up messages in the original conversation, not email, SMS, or push notifications."

两个包：`schedule/`（"Host-owned reminder persistence, scheduling, inspection, and explicit deletion"）+ `tool-schedule/`（"Preset-scoped `schedule_create`, `schedule_list`, `schedule_update`, and `schedule_delete` tools over the Host `ctx.schedule` service"）。

**【事实】公司 preset 已挂号**：grep `tool-schedule` 命中 **6 个角色 preset**（ceo / cfo / cmo / coo / vp-eng / vp-sales 的 `agent.cordis.yml`）；ceo 形状 = `preset-clock` 组内 `time-context`（钉 Asia/Shanghai）+ `tool-schedule` 两行（`presets/ceo/agent.cordis.yml` L20-30）。

**【事实】所有权已下放 preset**：`packages/company-pack/cordis.patch.yml` L73 注释原句："`tool-schedule` 变成 **preset 行所有权**（上游升档指南 schedule-bundle-retired）"；L75 并说明宿主 schedule 服务由 web-app 组合挂。

**【推论】** 周期 lint 天然适配：`schedule_create` 建一条 weekly/daily 任务（prompt = 「按 schema 的 lint 清单检查 wiki：矛盾/过期声明/孤儿页/缺交叉引用，发现写进 log.md」），到期以普通跟进消息送回原会话 → 角色按协议执行。**零新代码**，只需一条任务 + 一份 lint SKILL.md。局限（事实）：任务是**会话级**的（到期回创建它的会话），非主机守护进程；会话不在了就不执行——真正的持续 lint 需要外部 cron（可选，不属 DSH 载体）。

## 2. workflow + subagent：编排 → 并行 ingest 编译 / lint 巡检

**【事实】** 组 README（`vendor/dsh/packages/workflow/README.md` Summary 逐字）：

> "The workflow group lets an agent run orchestration scripts that delegate work to subagents and return a final value. The `workflow` tool supports scripted fan-out. Scripts use the shared PTC Node process runtime under the calling Session's file policy."

三包：`workflow`（`ctx.workflowEngine`）、`workflow-ptc`（沙箱 PTC Node 进程运行时）、`tool-workflow`（模型面 `workflow` 工具）。

**【事实】公司挂载面**：`tool-workflow` **只在 vp-eng** 挂（`presets/vp-eng/agent.cordis.yml` L212-219，注释原句：「两行必须同组：tool-workflow 消费组内 isolate 的 workflowEngine；子代继承本 preset」）；ceo 工具面**无** tool-workflow，但**有** `tool-subagent` 家族（同文件 L195-239：`tool-subagent` + `tool-vp-eng` / `tool-vp-sales` / `tool-vp-cmo` / `tool-coo` / `tool-cfo` 五个命名 child 工具），且 ceo 手册明定「要 workflow/subagent 的研发取证/并行核查也走 `vp_eng` 命名 child」（`presets/ceo/agent.cordis.yml` L40 派活纪律原句）。

**【事实】** subagent 语义（同文件 L178-181 注释原句）："0.2.1 起 `dsh-tool-subagent` 删掉了 `backgroundMode` / `enableRunInBackground` / `persona` / `toolFilter` 四个配置位……**每次委托都是 activation**——工具立即返回 `{kind:'activation', subagentId}`，child 的终稿由**完成通知**送回父会话"。

**【推论】** 并行 ingest 的现成形状：vp-eng 用 `workflow` 脚本 fan-out 多个子代理，每个负责一个来源/一个主题域（读 raw → 写/改 wiki 页 → 更新 index/log），pipeline 阶段 = ingest → 交叉引用 → lint 自检。**零新代码**（写 workflow 脚本即可）。约束：① 只有 vp-eng 挂 workflow，其他角色经它或经 ceo 的命名 child；② 每次 child 是 activation + 完成通知，不是同步等待；③ 并行写同一 `index.md` 会冲突 → schema 必须规定「child 只写自己的页，index 由收口者统一更新」——这是纪律不是代码。

## 3. hooks：事件钩子 → 事件驱动 wiki 维护

**【事实】** 2026-11-13 clean clone 复核：pin `rc.5` 的 vendor 源码树**没有 hooks 组**（`git ls-tree` 零命中）；此前在 warm 树看到的 hooks 三子包（`hook-protocol` / `hooks-claude-code` / `hooks-codex`）只剩被忽略的构建残壳，属旧构建/旧 checkout 残留，不能当源码事实。

**【推论】** pin rc.5 的源码里没有 hooks 兼容层可押；要事件驱动，正路是 **Cordis 事件**（`ctx.on('agent/created', ...)`，handbook 注入即此用法，主材料 §4.2 一手）。**【建议】** wiki 维护不押在 hooks 上；起步也不需要事件驱动（ingest/lint 由人或 schedule 触发）。

## 4. client UI：wiki 浏览面板要动什么

**【事实】** 公司 pack 现有 client 注册 **6 处**（`packages/company-pack/src/client/index.ts`，全部 `slots.inject + register`）：`conversation.view`（L180，培养主视图）、`tool.call.toolview`（L226/230，两张工具卡）、`sidebar.brand.name`（L238）、`sidebar.session.row.leading`（L245）、`conversation.session.header.actions`（L275，任务板按钮）。

**【事实】** 平台原语与槽都在（[startup-settings](../startup-settings/2026-11-12-startup-settings.md) §1.3-1.5、§3.3 一手）：`ui-primitives.Modal`（"Centered dialog over a page mask"，README L59）、`ui-slots` 四型（single/list/keyed/chain）、`ui-renderer.registry.ts` 的 `slots.inject(name, callback)`（"The controller belongs to the caller's fiber, so plugin unload cancels a pending wait and removes any active contribution"）。公司已依赖 `ui-primitives` / `ui-slots`，`dsh.client.inject` 已含 `ui-conversation`。

**【推论】** 三种浏览形状，成本递增：① **右栏页签**（`sidebarRightTabs` + `sidebarRight.float`，公司已有页签先例）——成本最低，适合 index 树 + 页内容；② **`conversation.view` 主视图**（培养主视图同款）——整页，适合图谱/搜索；③ **`Modal`**（startup-settings 推荐形状）——适合快速查一条。**【建议】** 浏览面板不是第一优先：wiki 是 markdown，agent 用 fs 工具即可，人浏览可用 Quartz/Obsidian（零代码，且 Quartz 本地静态站用 node 起服务就够）；client 面板等「人要在 GUI 里查 wiki」成真实需求再做，起步可先右栏页签（成本最低）。

## 5. inspect provider：把 wiki index 暴露给 Web GUI？

**【事实】** vendor 的 inspect 机制 = `packages/experimental/inspector`（README Summary 逐字："Experimental Chrome DevTools inspection for Host and browser Client Cordis runtimes, including Console evaluation, Sources, Network capture, Elements trees, and a CDP-independent query API"）；**【事实】** 公司 pack `src/` 全文 grep `inspect` **零命中**——未注册任何 inspect provider。

**【推论】** inspect provider 面向**运行时调试**（给开发者看 Cordis 运行时状态），不是知识展示面；把 wiki index 塞进去是语义错位。**【建议】** 不做；wiki 可视化走 §4 client 面板或静态导出（OKF visualize 单文件 HTML 先例，[OKF 材料](2026-11-12-okf-and-llm-knowledge-standards.md) §1.5；Quartz 见[搜索生态](2026-11-12-oss-search-landscape.md) §5）。

## 6. deliverables / goal：适配判断

**【事实】** `deliverables` = 交付物登记与呈现（公司有 `/deliverables` `/prd` `/req` `/delivery` 命令面，`src/host/commands/` 与 client 面板）；`goal` = 会话级持久目标（`tool-goal` + `command-goal`，ceo 已挂 `presets/ceo/agent.cordis.yml` L80-82）。

**【推论】** 两者都**不适配** wiki 本体：deliverables 管「公司对外的产物」（PRD/原型/报告），wiki 是「对内的知识」；goal 管「一件事做到什么算完」，wiki 是长期资产。**【建议】** 不硬套；但 deliverables 的**登记/索引形状**可借鉴（已有 `deliverables-index.json` + 呈现状态机），wiki index 可照同款 JSON 旁挂（可选，非必需）。

## 7. preset 组合 delta：wiki 可见性按四形态区分

**【事实】** `docs/contracts/presets.md` 四形态矩阵（teammate 继承 Lead 组合、命名 child 按工具行钉 preset）；公司 6 角色 preset + 5 support preset；`cordis.patch.yml` L73-75 记录「行必须随 preset 声明」的升档纪律。

**【推论】可见性三档**（对接开放问题 4「多角色可见性」）：

- **全员只读**：wiki 指针走 handbook section（所有角色 preset 都注入，`NON_ROLE_PRESETS` 跳过）+ fs 工具人人有 → **零 delta**，最省。
- **按角色分域读**：各角色 wiki 子目录 + `customSkillDirs` 式前缀（ceo 三条 customSkillDirs 先例，主材料 §4.2）→ 每 preset 改一行。
- **写入限维护者**：只有特定角色挂「写 wiki」的 skill/命令，其他只读 → **提示级**约束（workspace-write 沙箱下人人可写，非强制）。

**【建议】** 起步 = **全员只读 + 单一维护者写入（提示级）**；分域读写等真实冲突出现再做。

## 8. 载体清单表与组合接入形状

### 8.1 载体表

| 载体 | 承载 wiki 哪个功能 | 机制证据 | 新代码成本 | 仓内先例 |
|---|---|---|---|---|
| handbook `systemPrompt.section` | 指针注入（wiki 根 + index 先行纪律） | `handbook.ts` L81-88；text thunk 活读 | ~20 行（或 0：写进现有手册正文） | 手册本身 |
| skill catalog→body | 查询/维护协议（ingest/query/lint） | `skills.md` L229/233 | 1 份 SKILL.md | 5 个公司 skill |
| kb seed（only-fill） | 播种 wiki 指南/骨架 | `bootstrap.ts` L141-144、`seed.json` | 1 条 seed 条目 | `kb/AGENTS.md` |
| fs 工具（grep/glob/read） | 浏览 + 全文搜（L0） | [家底](2026-11-12-dsh-retrieval-inventory.md) §1（rg 随包分发） | 0 | 全 preset 已挂 |
| 自建 FTS CLI | 关键词召回（L1） | [探针](2026-11-12-selfbuilt-fts-probe.md)（node:sqlite 内置） | ~100 行脚本 | 无（新，但零依赖） |
| `tool-schedule` | 周期 lint | schedule README + 6 preset 已挂 | 0（建一条任务） | vp-sales 等 |
| `tool-workflow` + subagent | 并行 ingest | workflow README + vp-eng 已挂 | 0（写 workflow 脚本） | vp-eng |
| client slot（页签/视图/Modal） | 人浏览面板 | 公司 6 处注册 + ui-primitives | 中（组件+双语字典） | 培养主视图 |
| MCP client | 外部知识源（qmd/DeepWiki） | [家底](2026-11-12-dsh-retrieval-inventory.md) §2.2 | 0（一行配置） | 官方 mcp-memory overlay |
| `tool-web` | 外部取知识（llms.txt 站点等） | 家底 §3 | 0 | 全 preset 已挂 |
| inspect provider | —（语义错位） | §5 | — | 无 |
| deliverables / goal | —（不适配） | §6 | — | — |

### 8.2 三档组合形状

**【建议】A. 最小挂载（L0，推荐起步）**
内容层（`wiki/`：`raw/` + `wiki/` + schema AGENTS.md，AK 三层 + OKF frontmatter 最小集）+ 指针注入（写进现有手册正文或新增 section）+ 协议 skill（ingest/query/lint 三节，含 agentic search 五技术）+ 复用 fs 工具浏览。
**新代码**：≈0（指针写进 `content/AGENTS.md`；skill 是一份 SKILL.md）。**适用**：页数 < ~200，先验证「wiki 到底有没有用」。

**【建议】B. 标准挂载（+ 自动化与播种）**
A + kb seed 播种 wiki 骨架（only-fill 不覆盖）+ schedule 周期 lint（一条 weekly 任务）+ client 右栏页签浏览（可选）。
**新代码**：seed 一条 + 页签组件（若做，须走 company-ui-change-definition：zh+en typed 字典）。**适用**：wiki 开始有人用、需要保鲜。

**【建议】C. 全量挂载（+ 并行编译与检索升级）**
B + workflow 并行 ingest 脚本（vp-eng）+ 自建 FTS CLI（L1，页变更时重建，agent 经 bash 调 + `--json` 输出）+ 可选 Quartz 静态导出供人浏览。
**新代码**：FTS 脚本 ~100 行 + workflow 脚本模板。**适用**：页数数百+ 或来源批量涌入。

**【推论】三档共同点**：全部零新增 npm 依赖；每档只是「多用几个已有载体」，不必一次设计完——可以按 A → B → C 逐档长。

## 9. 负证据台账

- 公司 pack `src/` grep `inspect` 零命中（§5）。
- `hook-protocol` 是构建残壳（仅 `lib/` + `node_modules/`，无 README/package.json/src）；`hooks-claude-code/README.md` 空文件（§3）。
- `tool-workflow` 仅 vp-eng 挂；ceo 无（§2）。
- schedule 任务是会话级（到期回原会话），非主机守护（§1）。
**【事实】** `content/kb-setup/seed.json` 形状确认：顶层键 = `version` / `note` / `seeds`，**`seeds` 数组 17 条**（`node -e` 读取实测）。→ 加一条 wiki seed 是纯数据改动，不改代码（§8.2 形状 B）。
- **【事实】`conversation.view` 是 `list` 槽**（`ui-conversation/src/client/contract/slots.ts` L260：`'conversation.view': { kind: 'list'; scope: 'session'; owner: ConvViewOwnerProps }`），非 single——wiki 面板可与培养主视图（公司 order 20 占据者）并存，不抢槽。→ §4 形状② 可行性成立。

## 10. 来源清单

- vendor 源码/docs：`packages/schedule/README.md`、`packages/workflow/README.md`、`packages/hooks/*`（ls 实测）、`packages/experimental/inspector/README.md`、`docs/subsystems/skills.md`
- 公司 pack：`presets/ceo/agent.cordis.yml`（工具面 L9-250、派活纪律 L40、subagent 注释 L176-204）、`presets/vp-eng/agent.cordis.yml` L212-219、`presets/{cfo,cmo,coo,vp-sales}/agent.cordis.yml`（tool-schedule 行）、`cordis.patch.yml` L73-75、`src/client/index.ts`（6 处注册 L180-284）、`src/host/prompt/handbook.ts`、`content/kb-setup/seed.json`
- 姊妹材料：startup-settings §1.3-1.5（槽与注册 API）、§3.3（Modal 原语）、§4.3（写通道）
