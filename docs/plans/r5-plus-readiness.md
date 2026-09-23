# R5+ 就绪度梳理（notes/ 台账 → 可排期 / 待决策 / 待研究 / 搁置）

> 性质：**计划层的一次性审计快照**（2026-09-22）。被轮次吞掉即过期，不做长期维护；
> 与 [roadmap](./roadmap.md) 的分工是：roadmap 说"哪轮做什么"，本文件说"**凭什么认为它做得成**"。
> 范围：**R4 及以后**。R4（成品流程）另有代理在执行中，本文件**不改 R4 的任何决定**，
> 只登记它的状态与它对 R5+ 的输入。
> 目的：让下一轮新会话只读盘上的指针就能判断"什么已经就绪"（roadmap §轮次交接），
> 不必重读两份长研究笔记、也不必相信聊天记录。

## 0. 分级判据（为什么这样分）

照 DSH 的"完成定义 = 该面最小**真检查**通过"（D15）摊成五问，任一不过即降级：

1. **机制已核实**：有 vendor 出处或已实证，不是【推断】；
2. **验收判据是代理能自己跑的检查**：优先 keyless；真模型/真浏览器只能进认证档（[guides/60](../guides/60-dev-loop.md) §9.1）；
3. **不新增机制**：只用现成载体（D13/D9）；需要上游 seam 的一律不算就绪；
4. **无阻塞前置**：不依赖未落地的接线修复、未跑实证或其他轮；
5. **一轮装得下**：一个垂直轮能交付一份可观察的外部行为，不是多面拼盘（D11）。

五档：**READY**（可立刻排期）/ **READY-DECISIONS**（先一个设计 pass 就能开工）/
**RESEARCH**（机制或形状未核实，先做窄研究）/ **SUSPENDED**（明确搁置，记缺口不排期）/
**CLOSED**（已闭合，不要再研究）。

## 1. 一页结论

| notes/ 条目 | 目标轮 | 判定 | 关键理由 / 待办 |
|---|---|---|---|
| [implemented/workspace-hygiene](../../notes/implemented/2026-09-22-workspace-hygiene.md) | R4 | **✅ 已消化（不归本文件）** | R4 交付 `scripts/lib/deliverables.mjs` + `deliverables-check.mjs` + `tests/deliverables.spec.ts`（13 条）；1 条（练习场 ≠ 运行场）转轮间待办、1 条按决定不做——逐条去向见该文件的「条目去向」表 |
| [proposed/org-presence-board](../../notes/proposed/2026-09-22-org-presence-board.md) | R5b | **READY-DECISIONS** | 四个数据源全部 vendor 核实；三个 join 语义未钉 + 一个新增 UI 入口（见 §2.1） |
| [proposed/twin-cultivation-and-self-learning](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md) | R7 | **READY（培养/学习）＋ SUSPENDED（自主节律）** | 两条前置修复已落地、U1 已答；**阻塞项文字已过期**（见 §5） |
| [research/digital-twin-cultivation-and-self-learning](../../notes/research/2026-09-22-digital-twin-cultivation-and-self-learning.md) | R7 依据（原 R6） | **RESEARCH（部分已作废）** | §C 前置已做、§D 结论被隔离改动推翻、U2/U3 作废（该笔记已加修订节） |
| [research/agent-workflow-community-practice](../../notes/research/2026-09-22-agent-workflow-community-practice.md) | — | **CLOSED** | 全部建议已落地：D15 + 三篇复盘 + `scripts/verify.mjs` §8 client 两半门禁 |
| `notes/postmortem/0001–0003` | — | **CLOSED** | 护栏已进 `scripts/`（`preset-smoke` / `client-load-smoke`）；0002 根因已在文内更正 |
| `notes/implemented/` ×18 | — | **归档候选（低优先，不急）** | 本仓无 `notes/archived/` 层；`verify` 不查 notes 链接，搬家成本低但收益也低 |
| `notes/intents.md` | — | **✅ 已闭合（2026-09-22）** | `scenario-b` + "三条现场教训"的行已补（§7.1）；R4 / D19 拆轮 / ①按问题组队 / ②练习场各行也已登记 |

一句话版：**R5b 的皮肤面就绪度没问题，卡的是 R5a 的 replay harness 形状（§2.3）；
R7（原 R6）的"培养/学习"已经就绪、只是它墙上写的阻塞项过期了（§5）；该进 suspended 的是
"自主节律 / 并行快捷派活 / M2 / 界面外推送"四条等上游 seam 或明确需求的（§4、roadmap 搁置池）。**

## 2. 可进 R5+ 的项

### 2.1 组织在场板 —— READY-DECISIONS

已核实、不必再研究的（原提案 §依据 已逐条钉到 vendor 行号）：身份走 `agent-preset/selected`、
忙闲走 `TeamMemberView.status`、任务走 `TeamTaskView`、存活走 `ctx.sessionQuery`，
且 session-query 已在 base / web-app bundle 行内——**不需要加行**。

开工前必须钉死的四个决定（都是设计问题，不是机制问题）：

1. **主键与合并语义**：以"会话 × preset"为主键、team 状态作增强列（提案的缓解方案），
   还是以 team roster 为主键？前者不漏 CEO 直起的 subagent，后者状态更准。
2. **冷启动补历史**：`session/event` 只在进程活着时订阅得到，历史态靠 `sessionQuery` 补；
   两条路径合并的时序语义要写清（否则刷新一次面板就空）。
3. **status 文案**：`running`/`idle` 是 **team 内**状态，UI 必须标明，否则物理人误读成
   "这个人此刻在工作"。
4. **成员空间入口**（新增，来自场景 B 现场反馈）：teammate 会话不作为顶层会话出现，
   官方入口在会话头部的 Team 名册（`sessions.openSubagent`）。要选一个槽
   （侧栏分组 / 头部动作 / 名册行可点）并写进 R5b 验收——这是"谁在哪个空间"能否不靠讲解的判据。

### 2.2 R5a 的两个"门禁/发布"脚本 —— ✅ READY → **已交付（R5a，2026-09-23）**

> 两个脚本均已落地并绿：`release-smoke`（构建 → npm pack → 干净 profile → plugin add →
> boot 冒烟，全绿；开发中三次真实红 = 敏感度实证）与 `sync-dsh`（默认检查四处簿记一致 +
> `--pin` 完整程序）。peers/矩阵欠账同步闭账（manifest 已改 peers + `dsh.compatibility`，
> `pnpm verify` 新增 `pack-compat` 门禁）。合同 = [release.md](../release.md)。

### 2.3 无 key replay harness —— **RESEARCH（R5a 唯一真正的未知）**

**已经查清的（2026-09-22 现场查 vendor，证据都在盘上）：**

- **我们的录制已经是 v3 格式**，与 vendor 的重放输入同格式（`snapshots/r3-delegation/sessions/lead.jsonl`
  首行 `{"type":"session","version":3,…,"agentPreset":"ceo"}`）——**不用转格式**，只缺归一化。
- **第一方已经把工具做好，而且我们能直接 import**：`vendor/dsh/packages/test-support/session-snapshot`
  （`@deepseek-ai/dsh-session-snapshot`：`normalizeSessionSnapshots` / `scrubSessionSnapshot` /
  `scrubSystemPrompts` / `scrubToolSchemas` / `tokenizeSessionFixtureCwd` / `redactSessionSnapshotIds` /
  `materializeProfilePatch` / `captureExpectedWorkspaceSnapshot` / `runScenario`）与
  `test-support/llm-replay`（`@deepseek-ai/dsh-llm-replay`：从 v3 内嵌 assistant 流**推导模型调用脚本**，
  replay 默认 keyless）。两者都在我们的 workspace glob `vendor/dsh/packages/*/*` 内 ⇒ 可作 devDependency
  直接用，**不必自己发明归一化**。
- **lane 的形状**（`vendor/dsh/snapshots/AGENTS.md` + `vitest.snapshot.config.ts`）：一场景一目录，
  `snapshot.yml`（`version/scenario/profile/composition/recording/header.class`）+ `session.vN.jsonl`
  + 可选 `system-prompt.expected.md` / `tool-schemas.expected.json` / **`ui.expected.md`** +
  `workspace.expected/`；`pnpm test:snapshot` = `vitest run --config vitest.snapshot.config.ts`，
  **replay 是默认档（无 key）**，只有 `record` 读 key。
- **★ 真浏览器那一层 lane 里有**：`ui.expected.md` 是**真浏览器的 accessibility-tree 转录**
  （例：`button "Skill editing-cordis-compositions" [expanded]`）⇒ R5a 的"委派卡端到端"**能**在这条
  lane 里无 key 断言。但判据口径要改（DOM 属性不进 a11y 树），细节见 §9 P1.3。

**仍然要靠窄研究回答的：**

1. **挂载点**：vendor 要求被测进程从 `dsh` CLI + shipped profile 起。我们是**外部 pack**，且**不能**
   把场景放进 `vendor/`（铁律：新增未跟踪文件 = `vendor-clean` 红）⇒ 必须在**本仓**建自己的 lane，
   import 一方库、spawn `pnpm dsh`（`apps/cli/src/bin.ts`）+ 我们的 profile patch。第一件要验证的事：
   一条最小场景能不能让**外部 pack 的 bundle 行**进组合（`materializeProfilePatch` 是唯一线索）。
2. **归一化字段集**：哪些必须 token 化（`cwd`、session id、rpc id、时间戳、message id），
   以及两个本仓特有的题（绝对路径 `cwd`；`ui.expected.md` 里的 `{{date}} {{clock}}`）。
3. **归一化产物进不进 git**：vendor 把归一化后的 JSONL 提交进仓库。建议**原始 + 归一化两份都留**
   （原始 = 人读/考古，归一化 = 重放输入），按场景目录并存。

**建议**：R5a 开工先做 §9 P1 的窄研究，产出一篇 `notes/research/`；结论回来后再把 R5a 的判据
从"待研究"改成可执行断言。

## 3. 还要研究 / 实证（按优先级）

1. **U1 的活体探针**（便宜，半小时）：改一次某角色 `SKILL.md` 正文 → 同一会话下一轮再
   `skill({name})` 看正文是否变。源码层已答（见 §5），但"两条 vendor 陈述冲突"这件事值得
   一次实证钉死；这是 R7"学习回路"的生效边界。
2. **成员空间入口的槽位**（小）：确认 `sessions.openSubagent` 对**非 team 的 subagent child**
   （R3 命名委托、CEO 直起的 subagent）是否同样可达；不可达就要在 UI 里显式标"非团队成员"。
3. **U5**（沙箱拒 pack 目录）仍只是【推断】：结论不变、风险低，只在 R7 真要谈"自学习写权"
   时再跑。
4. **U6/U7**（goal/schedule 不可用；webhook→goal 断点）：**只服务于自主节律**。既然自主节律
   已搁置（§4），这两条**不跑**，只保留 U7 当"上游 seam"的证据引用即可。

## 4. 阻塞 / 搁置（SUSPENDED）

> 家的唯一地址是 [roadmap](./roadmap.md) §搁置池（一处事实一个家）；本表只是就绪度侧写，判据与复活条件以那边为准。

| 项 | 出处 | 为什么搁置 | 复活条件 |
|---|---|---|---|
| **自主节律**（分身定期复盘） | [proposed/twin §四](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md) | 机制不闭合：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在会话 live 时投递且默认没装；webhook 起的会话进不了 goal 循环；全树无 cron | 上游补"外部触发 ↔ 会话内自主续跑"的 seam（提 seam，不自建） |
| **并行快捷派活**（同时开几个 VP） | [delegation.md](../delegation.md) §4.4；R3 Note | 本组合无干净解法（per-child composition / 不撞名的控制面缺失） | 上游 seam；本仓不自建（D13） |
| **M2 自定义 provider** | 台账 Q1（已闭合） | 只在需要**组合隔离**时才有价值；需求已由 team 持久成员满足 | 出现"必须隔离组合"的具体需求 |
| **界面外推送 / 收件箱** | [proposed/org-presence-board](../../notes/proposed/2026-09-22-org-presence-board.md) §背景 | egress 只有 session-telemetry 与 hooks；收件人是谁、粒度多细属部署选择，不是本仓能定的 | 出现明确的物理人通知需求 + 选定部署面 |

## 5. 已闭合 / 已过期（状态该改，别再当阻塞）

**R7（原 R6）的墙上文字过期了。** roadmap 该行与维护规则都写"阻塞：轮间待办两条接线修复 + U1 实证"，
但：

- **两条接线修复已落地**：五个 preset 都是 `includeDefaultRoots: false`
  （`packages/company-pack/presets/*/agent.cordis.yml`），且每个都补回了
  `agent-instructions` 行；`handbook-smoke` 已把"指令基线 = `company-workspace/AGENTS.md`"
  做成真入口断言。出处：[implemented/skill-root-isolation](../../notes/implemented/2026-09-22-skill-root-isolation.md)。
- **U1 已在源码层回答**（同一篇，末节）：skill 条目的增删改名**下一轮**就刷新（`write`/`edit`
  直接失效 provider），不必等新会话。⇒ R7"学习回路"的生效边界不必再靠"新会话"假设；
  只差 §3.1 的活体探针把两条 vendor 陈述的冲突钉死。

**也随之作废的两条研究结论**（该笔记已加修订节）：

- U3（`<repo>/.dsh/skills` rank 100 盖角色 skill）：隔离后角色 provider **不再扫**该根，
  冲突面消失，探针作废。
- §D 的"自学习唯一可写落点是共享 skill root"：隔离后**该落点对角色不可见**，
  "分身自写 skill"从此不是"别扭"而是**不通**——这反而把提案里"否决运行时自改 skill"
  从"三条理由"变成"机制不允许"，结论更强、不用翻案。

**另一篇研究已全部吸收**（[community-practice](../../notes/research/2026-09-22-agent-workflow-community-practice.md)）：
建议 1（preset-smoke 进完成定义）、2（client 两半同构门禁，见 `scripts/verify.mjs` §8）、
4（写复盘）都已落地；建议 3（不要加的东西）已进 D15。**不需要后续研究。**

## 6. R5 容量风险 → 已拆轮（D19）

roadmap 原来的 R5 一行装着：驾驶舱 v1（含协作动态流）+ 组织在场板 + 无 key replay harness
（含委派卡端到端）+ `verify`/`release-smoke`/`sync-dsh` + `release.md` + `dsh.compatibility`
矩阵——**4–5 个互不依赖的面**塞进一个垂直轮，而其中最不确定的那块（replay 归一化）会卡住皮肤交付。
**已按性质拆开（2026-09-22，D19）**：

- **R5a 门禁与发布**：replay harness（先窄研究再落）+ `release-smoke` + `sync-dsh` +
  peers/compat 矩阵 + `release.md` 出生。
- **R5b 驾驶舱**：v1 页签 + 协作动态流 + 组织在场板 + 成员空间入口。

依据：D11"交付按完整垂直切片"；R3 已经证明一轮塞多面时，验收口径会被当轮实证改写两次
（[implemented/r3-reporting-line](../../notes/implemented/2026-09-22-r3-reporting-line.md)）。
**顺序上 R5a 先做**：它不依赖皮肤，且 replay 是 R5b 与 R7 都要用的旁证载体。

## 7. 台账卫生（小修，谁做都行）

1. **`notes/intents.md`**：R5 拆轮 + 搁置池已于 2026-09-22 登记（D19）。~~仍缺：`scenario-b`
   归档（commit `0a8a287`）与"三条现场教训"（commit `45d034d`）没有行~~
   **已补（2026-09-22，backfill 一行指向两个 commit 与落盘文件）**，保持"一次决策一行"。
2. ~~roadmap R6 行/维护规则的阻塞项按 §5 改写。~~ **已改（2026-09-22）。**
3. ~~**`packages/company-pack/package.json`**：`description` 四角色过期（已五角色）；
   peers/compat 欠账见 §2.2 + §9 P4。~~ **已闭（R5a，2026-09-23，见 §9 P4）。**
4. **`notes/implemented/` 无归档层**：低优先。真要收，候选是 `repo-scaffolding`、
   `docs-layering`、`dev-loop-guide`、`wochen-naming`、`r0-loop-acceptance`、`r1-docs-sync`；
   仍带活判据的（`r3-reporting-line`、`skill-root-isolation`、`client-remote-single-mount`、
   `r2-roles-alive`、`r2-motion-run`、`r1-deploy-findings`）**不要动**。

## 8. 不在本文件范围

- **R4（成品流程）**：由另一代理执行中，验收与迁移决定归它；本文件只登记 §1 第一行。
- **R0–R3 的已成事实**：进 docs/ 合同与 `notes/implemented/`，此处不重述。

## 9. 打磨清单（怎么做才算过质量线）

> "过质量线"在本仓的定义（D15）：**该面最小真检查通过，且该检查能因对应的回归变红**。
> 每项写成"做什么 → 判据（绿 / 怎么红）→ 产出物"。P1–P5 按 R5a → R5b 的顺序。

### P1 · R5a：无 key replay harness（唯一需要先研究的）

**P1.1 窄研究（约半天，不写实现）✅ 已完成（2026-09-23）**

> 三问全答 + 判据命令实测跑通（`agent-instructions` 场景 1.8s 无 key 重放通过）。结论、
> 机制出处（钉到 vendor 文件）与 P1.2 落地路径见
> [research/2026-09-23-replay-harness-feasibility](../../notes/research/2026-09-23-replay-harness-feasibility.md)；
> 遗留一条：r3 场景的 profile 选择（web + patch 优先，P1.2 第一件事验证）。
- 读：`vendor/dsh/snapshots/AGENTS.md`、`vendor/dsh/vitest.snapshot.config.ts`、
  `vendor/dsh/snapshots/session/headless.snapshot.ts`、`vendor/dsh/snapshots/web/present/`（web lane 样例）、
  `vendor/dsh/packages/test-support/session-snapshot/src/{harness,manifest,launcher,normalize}.ts`。
- 回答三个问题并写进 `notes/research/`：① 外部 pack 的 bundle 行怎么进场景组合（profile patch 怎么写）；
  ② 最小归一化字段集；③ web lane 的 `ui.expected.md` 由谁采集（浏览器怎么起、断言怎么落）。
- **判据**：研究笔记里给出"一条最小场景的可执行命令"，且该命令**今天就跑得动**（哪怕先是一个空场景）。

**P1.2 落一条最小场景（复用 `snapshots/r3-delegation/`）✅ 已完成（2026-09-23）**

> `scripts/replay-smoke.mjs --record / replay` 双判据通过：绿 = 无 key 归一化零 diff（11s，
> lead+child 两会话）；红 = 禁 `vp_eng` 行 → `Error: unknown tool "vp_eng"`；还原复绿。
> 落地钉死的三个机制（title-llm 条目黑洞 / 重试抖动 / llm-replay 能力声明）见
> [research 笔记 §7](../../notes/research/2026-09-23-replay-harness-feasibility.md)。
> 与原计划的差异：fixture 落在 `snapshots/r3-delegation/replay/`（raw + 归一化 + 组合 patch
> 三层，R3 历史归档不动）；sidecar（system-prompt/tool-schemas expected）**未做**——归
> P1.3 web lane 升级时补（suite.ts 有 vitest 依赖，纯 Node 驱动暂不可 import）。
- 把已归档的 `snapshots/r3-delegation/sessions/lead.jsonl` 归一化成重放输入（`session.jsonl` +
  vendor 字段的 `snapshot.yml` + 逐 header class 的 sidecar），加 `scripts/replay-smoke.mjs` 作运行场入口
  （spawn `pnpm dsh`，**不进 `pnpm test`**）。
- **判据（绿）**：`node scripts/replay-smoke.mjs --scenario r3-delegation` 零 diff 通过，且**全程无 key**。
- **判据（能红，必须实测一次）**：临时删掉 `presets/ceo/agent.cordis.yml` 的 `vp_eng` 行 →
  重放**必须红**且报错点名 `vp_eng`；还原即绿。
- 产出物：`snapshots/r3-delegation/` 的归一化副本（原始录制保留）+ `scripts/replay-smoke.mjs` + 研究笔记。

**P1.3 委派卡端到端（web lane + `ui.expected.md`）✅ 已完成（2026-09-23）**

> `replay-smoke --ui` 双判据闭环：绿 = 无 key 12s 全绿（卡 ×1 可访问名断言 + centerCol aria
> 金样零 diff + 4 份 sidecar 零 diff）；红 = 摘场景组合 `company-client` 行 → 三连红（卡基数 0 /
> aria 无节点 / 金样 diff）→ 还原复绿。落地钉死的六个机制（裸包名解析 / 全 run session-ids ctx /
> Internal Testing Notice / browse 对钉定 / data-tool 通用行陷阱 / 轮次组展开）见
> [research 笔记 §8](../../notes/research/2026-09-23-replay-harness-feasibility.md)。
> 判据口径实证注脚：`[data-tool]` locator **通用工具行也渲染**（红证时误绿），基数断言一律走
> 可访问名；红证用摘 `company-client` 行（= 注册的装载通道，效果等价于摘 toolview 注册）。
- ⚠ ~~判据口径必须改~~（已按可访问名落地）：断言落在可访问名/文本——aria 树里没有 `data-*`。
- ~~判据（绿/红）~~ 已双证；产出物 = `snapshots/r3-delegation/replay/ui.expected.md` +
  sidecar ×4 + 脚本断言 + roadmap R5a 验收行（口径已在表内）。

**P1.4 归轮与分层守卫（防它偷偷变慢）✅ 已完成（2026-09-23）**

> `tests/layering.spec.ts` 已扩（39 条之一）：① tests/ 不得 import scripts/ 驱动脚本
> （`scripts/lib/` 纯逻辑库除外——deliverables.mjs 是 keyless 单测对象）；② 任何
> vitest 配置不得引用 scripts/；③ replay-smoke 头注必须声明"不进 pnpm test"。红证双过
> （违规 spec + 第二个 config 各红一次），全量 `pnpm test` 39/39 绿。

### P2 · R5b：开工前必须钉的四个决定（钉完提案才算 decision-complete）

| # | 决定 | 选项 | 用什么定 | 落点 |
|---|---|---|---|---|
| D-a | 在场板主键 | 会话×preset（不漏 CEO 直起的 subagent）/ team roster（状态更准） | 手算 `snapshots/r2-motion` 的 lead + 4 child 在两种主键下的输出 | 提案 §提案 改一行 |
| D-b | 冷启动补历史 | 仅 `session/event`（进程活着才有）/ 事件 + `sessionQuery` 合并 | 离线拿 `snapshots/r2-motion` 喂读模型，看刷新后是否空 | 同上 |
| D-c | `status` 文案 | 直显 `running`/`idle` / 加"团队内"限定语 | 场景 B 的误读点（提案 §风险 已记） | UI 文案 + 验收行 |
| D-d | 成员空间入口 | 侧栏分组 / 头部动作 / 名册行可点 | 确认 `sessions.openSubagent` 对**非 team child** 是否可达（§3.2） | 写进 R5b 验收 |

- **判据**：四条都变成提案里的现在时陈述，且"风险与未决"里对应条目删掉；
  然后按 roadmap §新会话开工动作 进 Plan Mode。

### P3 · 轮间待办：U1 活体探针（R5a → R6，今 R7）✅ 已完成（2026-09-22，随轮间待办①）

> 结论 = 三档之②**"只有新会话变"**（同会话下一轮 `skill()` 仍旧文、新会话见新文）；
> 落档：[research/digital-twin §5.5](../../notes/research/2026-09-22-digital-twin-cultivation-and-self-learning.md)
> （同时纠正了 §5.2 的源码层判断）与
> [implemented/2026-09-22-team-assembly-and-rehearsal-split.md](../../notes/implemented/2026-09-22-team-assembly-and-rehearsal-split.md)。

1. `source dev/env.sh`；`pnpm dsh web -- --port 3086 --no-open`。
2. ceo preset 建会话 A，让它 `skill({ name: 'chairing-staff-meeting' })`，记下正文首行。
3. 直接改 `packages/company-pack/presets/ceo/skills/chairing-staff-meeting/SKILL.md` 正文一行。
4. **同一会话**下一轮再 `skill(...)` → 变了吗？再新建会话 B → 变了吗？
- 三档结论：同会话即变（源码层说法成立）/ 只有新会话变（`agent-presets` README 说法成立）/
  都不变（要重启）。**哪一档都要记进研究笔记 §5**——它决定 R7"学习回路"能不能当场生效。
- **判据**：结果落进研究笔记 §5 的追问（R7 收尾引用）；探针文件改回原样。

### P4 · R5a：发布欠账（机械，别忘）✅ 已完成（2026-09-23）

> 全部闭账：manifest 已改 **peerDependencies**（17 个：cordis `^4.0.2` + dsh-* `^0.1.5-rc.2`，
> dependencies 清空）+ `dsh.compatibility.dshReleases` 矩阵 + description 五角色；
> `pnpm verify` 的 preset-row-deps 改读 deps ∪ peers（仍绿 ×12）且新增 `pack-compat` 门禁
> （钉住 tag ∉ 矩阵即红，已反证）；`release-smoke.mjs` 干净 profile 全绿（真实安装形状，
> 安装副本 peers/矩阵/presets/lib 全数断言）；`sync-dsh.mjs` 出生（检查模式绿 + 脏树拒绝
> 实证）；`release.md` 出生。合同与程序 = [release.md](../release.md)。

### P5 · 台账缺口（小修）

- ~~补 `scenario-b` + "三条现场教训"的 `notes/intents.md` 行（见 §7.1）。~~ **已补（2026-09-22）。**
- `notes/implemented/` 归档层**本轮不做**（见 §7.4）。
