# 2026-09-23 · R5a P1.1 窄研究：无 key replay harness 机制三问（已答，含跑通证据）

> 性质：R5a 门禁与发布的先行研究（roadmap R5a 行"先窄研究再落"；readiness §9 P1.1）。
> 判据：给出"一条最小场景的可执行命令，今天就跑得动"——**已达成，见 §4**。
> 机制出处全部钉到 vendor 树（钉住 tag dsh-v0.1.5-rc.2）的具体文件。

## 0. 一页结论

| 问题 | 答案 | 出处 |
|---|---|---|
| ① 外部 pack 的 bundle 行怎么进场景组合 | shipped profile + `--patch` 叠层链；场景自己的 `cordis.yml` 是 patch 数组，**裸包名由 `materializeProfilePatch` 从 patch 文件位置解析并符号链接进临时 cwd 的 `.dsh/profiles/node_modules/`**（"mirrors dsh plugin"） | `session-snapshot/src/launcher.ts:416-441`、`snapshots/session/headless.snapshot.ts`（patchSources 链） |
| ② 最小归一化字段集 | 会话侧 token：`{{cwd}}`（含多种路径拼写）/ `{{system}}` / `{{tools}}`（后两者进 sidecar）；身份侧：`redactSessionSnapshotIds` + `stabilizeFixtureMessageIds`；信封字段（seq/time）由 `omitFixtureEnvelope` 剔除。`{{clock}}`/`{{date}}` **只在 web lane**（scaffold 的日期正则） | `normalize.ts:109-298`、`identity.ts`、`apps/web/tests/scaffold.ts:1422-1425` |
| ③ web lane 的 `ui.expected.md` 谁采集 | `apps/web/tests/*.snapshot.ts` + 共享 `scaffold.ts`：playwright 打真页面 → `ariaSnapshot`（accessibility tree）→ 日期/时钟正则归一 → 提交为 `ui.expected.md`；web lane 在 **lib 模式**（`DSH_EXAMPLE_MODE=lib`）才进 snapshot 配置（要已构建的 client bundles） | `vitest.snapshot.config.ts`（include 条件）、`apps/web/tests/scaffold.ts` |

## 1. 机制 ①：组合怎么拼（对我们最重要）

被测进程**永远**经 `dsh` CLI 起：`bin.ts --profile <shipped> --patch <materialized-1> --patch <materialized-2> … <task>`。

- **patch 链**（headless 驱动实测）：base 组合的 `cordis.yml` → 场景组合的 `cordis.yml`（replay 时换成 `cordis.snapshot.yml`）→ base 的 `model.cordis.yml`。patch 语法 = 我们熟悉的 `- id:` 替换 / `- insert:` 新增数组（`@deepseek-ai/cordis-plugin-include` 的 `entryListSchema`）。
- **`materializeProfilePatch(source, cwd, targetDir, index)`**（launcher.ts:416）：解析 patch → 对每个条目 `name`：
  - **裸包名**（如 `dsh-company-pack`、`@deepseek-ai/dsh-persona`）：`createRequire(patch文件路径).resolve.paths()` 找到真实目录（从 **patch 所在位置**解析——在我们 repo 里就是根 node_modules 的 workspace 链接）→ **符号链接进 `<临时cwd>/.dsh/profiles/node_modules/<包名>`**（win32 用 junction）。这正是"dsh plugin add 的镜像"，但保留裸名与包来源。
  - `./`/`../` 相对名 → 绝对 file URL。
  - 物化后的 patch 写进 `<cwd>/.snapshot-patches/<i>-<name>` 再传给 `--patch`。
- **`cordis.yml` vs `cordis.snapshot.yml` 的分工**（agent-instructions 场景实例）：
  - live（录制）：设真模型（deepseek-official / v4-pro）、persistence `zstd`；
  - snapshot（重放）：**`dsh-llm-deepseek` 置 `disabled: true`** + **insert `@deepseek-ai/dsh-llm-replay`**（把录的 provider/model id 映射成重放服务）+ persistence `compression: none`（明文 JSONL 好比对）。
- **replay 环境变量**（headless 驱动传给子进程）：`DSH_SNAPSHOT=replay`、`DSH_SNAPSHOT_PROVIDER/MODEL`（录的模型 id）、`DSH_SNAPSHOT_FILE`（重放输入 fixture 路径）、`DSH_SNAPSHOT_CHILD_FILES`（子会话 fixture，**多会话/teammate 场景有现成机制**）、可选 `DSH_SNAPSHOT_OVERRIDE`（replay.override.json）。
- **家与 cwd**：launcher 设 `DSH_HOME=<临时cwd>/.dsh`、`DSH_AGENTS_HOME=<临时cwd>/.agents`——会话落 `<cwd>/.dsh/sessions`，驱动从那里收数（headless 驱动 `persistedSessions()`）。

⇒ **我们的 pack 进组合零发明**：场景目录放一个 `cordis.yml`，内容就是把 `dev/company.overlay.yml` 的 insert 行（agent-presets roots、team 两包、persona 等）场景化，裸包名交给 materializeProfilePatch 链接——前提是**从我们 repo 的根 node_modules 能解析到这些包**（workspace 链接在，R1 实证过这条解析路）。

## 2. 机制 ②：归一化（会话侧 + UI 侧分离）

- **会话 fixture 是归一化不动点**（snapshots/AGENTS.md：typed relationship-preserving tokens；不许因"像标识符"乱涂用户/工具文本）。
- 生产线（headless 驱动 `writeSessionFixtures`）：`tokenizeSessionFixtureCwd` → `prepareSessionSnapshotFixtureForComparison`（来自 llm-replay 包）→ `scrubSessionSnapshot` → `redactSessionSnapshotIds` → `stabilizeFixtureMessageIds`。
- 比对线：`normalizeSessionSnapshots(logs, ctx)`，`ctx = { sessionIds, cwd }`（从各日志 header 提取）。
- token 清单（normalize.ts 实测只有三个）：`{{cwd}}`（`cwdSpellings` 处理绝对/相对多种拼写）、`{{system}}`、`{{tools}}`——system prompt 与 tool schemas **离开 fixture 进 sidecar**（`system-prompt.expected.md` / `tool-schemas.expected.json`，按 header class 唯一 owner）。
- `{{clock}}`/`{{date}}`：**web lane 的 scaffold 专属**（scaffold.ts:1422-1425 的四条日期/时钟正则），会话侧无此 token——readiness §2.3 的两问（绝对路径 cwd、ui 占位符）都有着落。
- **我们 r3 归档的兼容性**：`snapshots/r3-delegation/sessions/lead.jsonl` 已是明文 v3 JSONL（vendor 重放同格式）；`agentPreset: ceo` 在 header——P1.2 用上面生产线跑一遍即可得到归一化副本。

## 3. 机制 ③：web lane 与 `ui.expected.md`

- 驱动文件：`apps/web/tests/*.snapshot.ts`（lib 模式 include）+ `apps/web/tests/scaffold.ts` 共享脚手架（含 playwright 起 browser、`ariaSnapshot` 采集、`{{clock}}` 归一、fixture inventory 断言）。
- ⚠ **对 P1.3（委派卡端到端）**：ariaSnapshot = accessibility tree（role/name/text，无 `data-*`）——判据口径必须落在可访问名/文本（readiness §9 P1.3 已预警，本研究证实：采集入口就是 scaffold 的 ariaSnapshot 管线）。
- web lane 起进程同样经 CLI（OS 分配端口——headless 驱动有 `listen(0)` 的机械检查），观察窗/观察方式与我们的 smoke 脚本同构。

## 4. 可执行命令（判据：今天就跑得动 ✅ 已实测）

```sh
cd vendor/dsh && ./node_modules/.bin/vitest run --config vitest.snapshot.config.ts -t "agent-instructions"
```

实测（2026-09-23 09:08，本机、无 key、无浏览器）：

```
✓ replays agent-instructions through dsh --profile headless  1846ms
 Test Files  1 passed | 3 skipped (4)
```

⚠ 操作细节：**别用 `pnpm run test:snapshot`**——pnpm 的 run 包装器会先做 deps-status 检查并触发 `pnpm install`（在 vendor 树里失败）；直接调 `./node_modules/.bin/vitest` 绕开。跑 vendor 的测试脚本属只读允许面（AGENTS §vendor 铁律 1）。

## 5. P1.2 落地路径（下一步，不新增机制）

1. 场景目录 `snapshots/r3-delegation/` 加：`snapshot.yml`（`profile` 必须选 shipped 名——**见 §6 遗留**；`composition: wochen-ceo`；`header.class`；`workspace.final: true` 若动盘）+ 场景 `cordis.yml`（live）与 `cordis.snapshot.yml`（replay：disable 真 LLM + insert llm-replay + compression none）——insert 行从 `dev/company.overlay.yml` 场景化。
2. 归一化副本：用一方库生产线（import `@deepseek-ai/dsh-session-snapshot`，workspace 依赖可用）把 r3 的 lead + vp-eng child 处理成 fixture（`session.v3.jsonl` + `session.1.v3.jsonl` + sidecars）；原始录制保留。
3. 入口 `scripts/replay-smoke.mjs`：spawn `vendor/dsh/apps/cli/src/bin.ts` + patch 链 + `DSH_SNAPSHOT_*` env，比对归一化产物（**不进 `pnpm test`**，第三档——readiness P1.4 已有分层守卫计划）。
4. 判据（绿/红）：零 diff 通过 + 无 key；临时删 `presets/ceo/agent.cordis.yml` 的 `vp_eng` 行 → 重放红且点名 `vp_eng`（readiness P1.2 原文）。

## 7. P1.2 落地实证（2026-09-23 晚，随落地补记）

`scripts/replay-smoke.mjs --record / （默认）replay` 已落地并双判据通过（r3-delegation：
**无 key 零 diff 11s**；禁 `vp_eng` 行 → 红，报 `Error: unknown tool "vp_eng"`；还原复绿）。
落地中钉死的三个机制（P1.1 没覆盖到的）：

1. **title-llm 是脚本条目黑洞**：web 组合默认启用 `session-title-llm`，其 LLM 调用打 llm-replay
   适配器但**不进 deriveReplayScript**（只收 assistant 流）⇒ 每次标题生成吃掉一个脚本条目、
   供条整体错位。解法 = **录/放组合同构地禁用 title-llm**（两侧都走截断回退，事件形态一致）。
   vendor 的 headless 场景天然无此问题（其 fixture 无 title-llm-request 事件）。
2. **重试抖动不可复现**：默认 retry policy `jitterRatio: 0.1` 让 `llm/retry` 的 `delayMs` 每次
   不同（499.6 vs 531.0ms 实测）。解法 = 两侧组合声明同一 `retryPolicy: {backoff: {jitterRatio: 0}}`
   （vendor 的 retry 场景 `empty-response-retry-current` 即用确定性 policy `[1,1,0]` + `recording: authored`）。
3. **llm-replay 的模型能力声明重建 request header**：录制侧真 provider 的适配器会补
   `maxTokens/reasoningEffort/adapterDefaults`，重放侧必须在 `ReplayModelConfig` 声明
   `defaultMaxTokens` / `reasoningEfforts` / `defaultReasoningEffort` / `contextWindow` /
   `systemPromptUpdate`，`request/header` 与 `request/context` 才逐字段一致（接口注释原话：
   "so replay reconstructs the request header a live catalog produced"）。

另两个实操细节：**录制必须在场景组合下跑**（`--record` 用 `cordis.yml`，与
`cordis.snapshot.yml` 仅差 LLM 行——从 delegation-smoke 采收的捷径会因组合漂移 diff）；
根 `devDependencies` 需链接 `dsh-llm-replay`/`dsh-session-snapshot`（R1 同款解析问题，
本例报 `cannot resolve active package`）。

§6 遗留三条的实测答案（P1.2 落地时全部钉死）：profile 选 **web + patch** ✓（ceo preset +
team + 委派全部挂上，最小 patch 即可）；pnpm run 陷阱按建议绕开（直接 node 驱动）；team
shadow 的工具目录经 `{{tools}}` 归一吸收、无假阳性（禁 `vp_eng` 的红测试证明敏感度真实存在）。

## 8. P1.3 落地实证（2026-09-23 深夜，web lane + sidecar + 委派卡端到端）

`node scripts/replay-smoke.mjs --ui` 双判据通过：**绿** = 无 key 12s 全绿（会话零 diff +
4 份 sidecar 零 diff + 委派卡 ×1 + ui 金样零 diff）；**红** = 摘场景组合的 `company-client`
行 → 三连红（卡基数 0 / aria 无节点 / 金样 diff 点名缺 `🗂 任务板`）→ 还原复绿。
P1.1–P1.3 没覆盖到、落地中钉死的机制：

1. **裸包名行要求根 node_modules 能解析**：`dsh-company-pack` 写进场景组合后报
   `Cannot find package … imported from <临时cwd>/.dsh/profiles/web/`——
   `materializeProfilePatch` 的 `linkProfilePackage`（launcher.ts:386-406）从 **patch 文件
   位置**解析裸包名，解析不到就**静默跳过**（"may instead belong to the dsh installation"），
   而行装载器从 profile 目录向上找 `profiles/node_modules`（heal 兜底链接）。解法 = 根
   `package.json` devDependencies 加 `dsh-company-pack: workspace:*`（P1.2 给
   dsh-llm-replay/dsh-session-snapshot 补链接的同款修法，同款坑）。
2. **sidecar 的归一化语境是"全 run 的 session ids"，不是单条日志**：lead 的 system prompt
   嵌 `Team id is session-<自身id>`、child 的嵌 lead 的 id——ctx 只带自己的 header id 时
   两条 sidecar 每次运行必漂移。vendor 对位是 `normalizedSystemPrompts(log, ctx)` +
   场景自有替换（scaffold.ts:1069-1072）：`webUrl → {{webUrl}}`（web 起在 OS 随机端口，
   "…Web GUI at http://127.0.0.1:<port>" 随之漂移）；录制侧从文本**句子锚定**自提取
   （避免误伤公司手册里的正当端口引用），重放侧传本次 boot 的 base。
3. **fresh home 首访必弹 "Internal Testing Notice" 模态框**，挡住整页指针事件——守卫必须
   **等它出现**再关（goto 返回时它往往还没挂载完，条件检查会扑空，实证一次）；另加兜底：
   还剩可见模态框就点名失败。
4. **目录选择器必须钉 browse 对**：web-app 出厂行 `directory-picker-auto` 在有显示环境的
   macOS 选 **native**（OS 原生选择器）——headless 浏览器里永远打不开（症状：textbox 点
   了没反应，无 dialog 无 menu）。bundle 注释原话："pin the interaction = 直接组这对行"
   （`dsh-host-directory-picker-browse` + `dsh-client-ui-directory-picker-browse`，两侧组合
   同构地禁 auto + insert 对）。零会话事件，重放零 diff 不受影响。
5. **`[data-tool="vp_eng"]` 不能当委派卡在场判据**：**通用工具行也渲染同款属性**
   （vendor present.e2e 的 `[data-tool="present"]` 就是通用行）——红证时 locator 版误绿、
   可访问名版正确红。基数断言一律走可访问名（`getByRole('button', { name: /^委派 VP-Eng（研发）/ })`），
   data-tool 只作诊断输出。这正是 readiness P1.3 "断言口径必须落在可访问名/文本"的实证注脚。
6. **工具卡默认折叠在 "N tool call" 轮次组里**，不展开不进 aria 树（aria 树不含
   display:none 的内容）——捕获前 `expandTurnProcesses`（vendor support.ts:41 同款）。

红证的口径说明：readiness 原文是"摘 `cordis.patch.yml` 里的 toolview 注册"，但该注册实际
住在本包 client 入口（`src/client/index.ts` 的 `slots.inject('tool.call.toolview', …)`，
编译进 `lib/client.js`）；场景组合的 `company-client` 行是让这个注册进浏览器的唯一通道，
摘行 = 摘注册的装载，可观察效果等价且不动产物文件。

与原计划的差异：金样捕获区域用 `centerCol`（vendor present.e2e 同款），断言双轨 = 可访问名
（aria 树口径）+ aria 金样全文比对；`data-tool` locator 降级为诊断。浏览器管线
（normalizeAria / captureStableAria / expandTurnProcesses / 连工作区 / 搜索开会话）为
vendor scaffold/support 的逐行转写（scaffold 顶部 `import { expect } from 'vitest'`，
纯 Node 驱动 import 不了——P1.2 Note 的预判成立）。
