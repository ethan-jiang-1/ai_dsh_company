# 代理驱动仓库的「改完 → 人肉跑 → 集成/配置翻车 → 再修」回路：一手资料研究

日期：2026-09-22
类型：外部研究笔记（primary sources only：官方文档、规范/格式、源码仓、第一方工程博客与第一方复盘）
研究范围：只回答"社区与厂商实际推荐什么"，不发明本仓库流程；结论只落在现成载体上。

## 问题

本仓库（DSH 外部插件包）由编码代理写配置组合、preset、client 插件，由人在浏览器 UI 里验收。近期两次失败**都是在代理说"done"之后、由人在 UI 里发现的**：

1. 一个 preset 挂载失败——两行工具行缺了 schema 必填 config 字段；会话创建失败，UI 把错误吞掉，"新建会话"按钮点了没反应。
2. 一个已交付的浏览器侧插件加载不了——它声明的依赖 `@deepseek-ai/dsh-client-ui-primitives` 是没有 client-plugin 字段的纯组件库，因此不在浏览器模块表里；模块静默不挂载，UI 里什么都不出现。

人要问的是：**更仔细地读宿主框架的规则，能不能避免这两次？还是说"迭代—修复"本来就是常态？社区/厂商到底推荐什么？**

## 证据分级约定

- **[规范/源码]**：格式规范、真实指令文件、宿主源码、门禁脚本——最硬。
- **[第一方文档]**：厂商官方 docs / 第一方工程博客。
- **[第一方复盘]**：厂商自己写的 postmortem / incident write-up。
- **[转述]**：协会或媒体转述他人数字，非第一手；本文明确标注。
- **[营销]**：厂商自我比较、无量化支撑的效益主张；本文明确标注。

---

## 一、代理指令文件（AGENTS.md / CLAUDE.md / GEMINI.md）到底该写什么

### 1.1 AGENTS.md 是一个"没有必填字段"的开放格式，不是校验器

- AGENTS.md 的定位是"给代理看的 README"：

  > Think of AGENTS.md as a **README for agents**: a dedicated, predictable place to provide the context and instructions to help AI coding agents work on your project.

- 官方 FAQ 明确：

  > Are there required fields? No. AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide.

- 冲突解决规则是"就近优先"：

  > The closest AGENTS.md to the edited file wins; explicit user chat prompts override everything.

  大仓用嵌套 AGENTS.md，官方提到 `the main OpenAI repo has 88 AGENTS.md files`。

- 官方推荐覆盖的章节：`Project overview`、`Build and test commands`、`Code style guidelines`、`Testing instructions`、`Security considerations`。
- 关键的一条（直接关系到"代理会不会自己跑检查"）：

  > Will the agent run testing commands found in AGENTS.md automatically? Yes—if you list them. The agent will attempt to execute relevant programmatic checks and fix failures before finishing the task.

来源：[AGENTS.md 官方站](https://agents.md/)（该格式的规范与 FAQ 所在地；现由 Linux Foundation 下的 Agentic AI Foundation 托管）。
**注意**：AGENTS.md 无必填字段、无强制校验——这本身说明"写进指令文件"是**建议性**的，不是门禁。

### 1.2 真实指令文件的样例：OpenAI Codex 仓库的 AGENTS.md

这是"活的"指令文件（源码仓里的实际文件），可以看到厂商自己把什么写进去：

- 把**可执行命令**写死并要求自动执行：

  > Run `just fmt` (in the `codex-rs` directory) automatically after you have finished making code changes anywhere in this repository; do not ask for approval to run it.

- 指定**唯一正确入口**、禁止绕过：

  > Do not run `cargo test` directly. Use `just test` so test execution follows the repo defaults.

  并要求"只跑改动的那个包"：`Run the test for the specific project that was changed.`

- 把**定义完成**绑定到测试与快照：`Features that change the agent logic MUST add an integration test`；`For agent changes prefer integration tests over unit tests.`
- **UI 改动强制快照覆盖**（与本案失败 #2 同类）：

  > any change that affects user-visible UI (including adding new UI) must include corresponding `insta` snapshot coverage (add a new snapshot test if one doesn't exist yet, or update the existing snapshot).

- 改了 schema/配置类型必须重生成并提交生成物：

  > If you change `ConfigToml` or nested config types, run `just write-config-schema` to update `codex-rs/core/config.schema.json`.

  以及 `CI verifies lockfile drift.`

来源：[openai/codex 的 AGENTS.md](https://raw.githubusercontent.com/openai/codex/main/AGENTS.md)（真实指令文件，属源码仓内容）。

### 1.3 厂商对"什么样的 agents.md 有效"做过一次 2500+ 仓的分析

GitHub 的第一方工程博客对 2,500+ 个 `agents.md` 做过统计，结论：

- 失败的主因是**含糊**：

  > Most agent files fail because they're too vague. "You are a helpful coding assistant" doesn't work. "You are a test engineer who writes tests for React components, follows these examples, and never modifies source code" does.

- 有效的写法：`Put commands early`（`Include flags and options, not just tool names.`）；`Code examples over explanations`；`Set clear boundaries: Tell AI what it should never touch (e.g., secrets, vendor directories, production configs, or specific folders).`
- 覆盖面清单：

  > Cover six core areas: Commands, testing, project structure, code style, git workflow, and boundaries.

- 边界写成三档：

  > Set clear rules using always do, ask first, never do. Prevents destructive mistakes.

- **对"要不要靠更仔细读文档"最直接的一条**：

  > The best agent files grow through iteration, not upfront planning.

来源：[How to write a great agents.md: Lessons from over 2,500 repositories — The GitHub Blog, 2025-11-19](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)（GitHub 第一方工程博客）。
**证据瑕疵**：该文讲的是 Copilot 的 **custom agents**（`.github/agents/*.md` persona），与仓库级 AGENTS.md 约定被混用；引用时按"指令文件写法"用，不当作 AGENTS.md 规范的组成部分。

### 1.4 CLAUDE.md：厂商明确说它"advisory"，且越写越没用

- `There's no required format for CLAUDE.md files, but keep it short and human-readable.` 该写的是"代理猜不到的东西"：Bash 命令、与默认不同的代码风格、测试指令、仓库礼仪、环境怪癖。
- 反向规则很硬：`Bloated CLAUDE.md files cause Claude to ignore your actual instructions!`；`If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost.`
- **与门禁的对比**（本节最重要的结论）：

  > Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens.

来源：[Best practices for Claude Code — Anthropic 官方文档](https://code.claude.com/docs/en/best-practices)（以 `/docs/en/best-practices.md` 原始 Markdown 取得）。

### 1.5 Google 侧：GEMINI.md 的分层加载（含 JIT）

- 上下文文件是**分层拼接**的：全局 `~/.gemini/GEMINI.md` → 工作区及其父目录 → **JIT**：

  > When a tool accesses a file or directory, the CLI automatically scans for GEMINI.md files in that directory and its ancestors up to a trusted root.

- 文件名可配置，且官方直接给出把 `AGENTS.md` 纳入的写法：

  > `"context": { "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"] }`

来源：[Provide context with GEMINI.md files — google-gemini/gemini-cli 源码仓文档](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md)（Google 第一方源码仓文档）。

**本节小结**：三大厂商的指令文件机制都**没有强制力**；厂商自己把"代理会自动跑你列出的检查"当作主要收益点。也就是说，指令文件的价值主要在**把正确的检查命令送进上下文**，而不是"读得更仔细就不出错"。

---

## 二、验证优先 / 门禁驱动：把"看起来做完了"变成可判定信号

### 2.1 Anthropic：没有代理能跑的检查，你就是验证回路

- 核心论断：

  > Claude stops when the work looks done. Without a check it can run, "looks done" is the only signal available, and you become the verification loop: every mistake waits for you to notice it.

- 解法是给一个**可判定**的信号：

  > The check is anything that returns a signal Claude can read in the conversation: a test suite, a build exit code, a linter, a script that diffs output against a fixture, or a browser screenshot compared against a design.

- 要求**出示证据而非断言**：

  > Have Claude show evidence rather than asserting success: the test output, the command it ran and what it returned, or a screenshot of the result.

- 门禁强度可分档：单 prompt 内跑检查 → `/goal` 条件（`A separate evaluator re-checks it after every turn`）→ **Stop hook**：

  > a Stop hook runs your check as a script and blocks the turn from ending until it passes

- 官方点名的失败模式就叫 **trust-then-verify gap**：

  > Claude produces a plausible-looking implementation that doesn't handle edge cases.

  修法是 `Always provide verification (tests, scripts, screenshots). If you can't verify it, don't ship it.`
- 独立的第二意见：

  > Before treating a task as done, have a subagent review the diff in a fresh context and report gaps.

来源：[Best practices for Claude Code — Anthropic 官方文档](https://code.claude.com/docs/en/best-practices)。

### 2.2 DSH（本仓宿主的钉住版本）把同一件事写成了测试政策

DSH 的 `docs/testing.md` 是本主题里最贴近本案的一手材料，且是**源码树内的当前合同**：

- **走真入口路径**：

  > Product-visible plugins require a non-unit REAL-composition test. Hand-built `ctx.plugin(...)` suites are insufficient: boot test-only `cordis.yml` through Loader and app/process, mock only external services or nondeterministic inputs, and assert model-visible request/log, durable state, or user-visible output.

- **"真入口"指发布产物**：

  > "Real entry path" means the published artifact: a package `bin` runs built `lib/bin.js` under plain `node`, exposing failures tsx masks (settle races, module resolution, swallowed load failures).

- **明确要求断言缺配置要非零退出**：`assert a genuinely-missing config exits non-zero.`
- **最高价值的是"起真 profile 发一句、检查世界"的冒烟**：

  > Highest-value are smoke tests that boot a shipped `dsh` profile, send one prompt, and check the world — they catch the "green unit tests, broken product" class that mocks cannot

- **验证世界而不是自述**：

  > Verify the world, not the self-report: An e2e assertion re-runs the command or re-reads the file externally; a keyword probe on the agent's own output lets a cheating agent pass.

- **门禁必须"能红"**：

  > A guard only guards if the regression fails it. ... prove it: introduce the regression, watch red, revert.

- 覆盖率不是行为：

  > Line coverage is necessary, never sufficient — it proves lines ran, not that the feature works as shipped.

- 可见改动必须带 keyless 录制会话快照：

  > Every non-trivial model-, protocol-, or human-visible change adds or updates a keyless recorded-session scenario in the same PR

来源：`vendor/dsh/docs/testing.md`（钉住 tag `dsh-v0.1.5-rc.2` 的宿主源码树；机制结论的权威在 vendor 树）。

### 2.3 DSH 的仓库纪律：窄切片 + 只报告真跑过的

- Match evidence to the surface: focused behavior tests, model/user-output snapshots, `doc-sync` for docs, built smokes for published paths, and real-API e2e for providers.
- `Never default to the full suite or repeat a passing check for commit or push.`（对应本仓"窄证据切片"）
- 配置错误必须响亮：`Misconfiguration fails loud at load when self-contained, otherwise at the earliest resolvable point; never silently skip a missing referent.`
- 裸插件必须出现在解析清单的 dependencies，且有门禁：Raw/Web `cordis.yml` bare plugins must appear in their resolver manifest's `dependencies`; `verify-cordis-config` enforces it.
- 部署可变的取值必须是**被校验的 Config 字段**，不许硬编码：No hardcoded tunables in plugins: deployment-varying choices are validated `Config` fields changeable from cordis.yml.

来源：`vendor/dsh/AGENTS.md`（宿主根指令文件，属源码仓内容）。

### 2.4 "定义完成"要有决策记录与复盘位置

- DSH 要求非平凡改动同 PR 带 Agent Note：

  > Every non-trivial change MUST add or update at least one Agent Note in the same PR.

  Agent Note 记的是 `the why and what we gave up`。
- DSH 的 postmortem 层定义了什么值得复盘：一个 bug 到达了不该到的地方（真实用户/已合并 PR/已发布），且 `the interesting part is why our process let it through, not just the one-line fix`；写入条件是 `subtle`、`systemic (the reason it escaped is a gap in tests/tooling/conventions, not a one-off typo)`、`costly to rediscover`；每篇必须给 `the concrete guardrails added so the same class of bug fails loudly next time`。

来源：`vendor/dsh/.agents/notes/README.md`、`vendor/dsh/docs/postmortem/README.md`。

### 2.5 Spec Kit 自带的"bug fixing"入口把"记录验证"当产物

GitHub Spec Kit 把流程分成三个独立入口，其中修 bug 的入口产出被描述为 `An assessed cause, scoped fix, and recorded verification`；核心 SDD 流程是 `Specify → Plan → Tasks → Implement → Converge`，并称：

> Each phase produces a Markdown artifact that feeds the next — giving your AI coding agent structured context instead of ad-hoc prompts.

来源：[GitHub Spec Kit 官方文档首页](https://github.github.io/spec-kit/)（GitHub 官方项目文档）。**注**：这是流程编排工具，不是门禁；见第三节的证据评价。

---

## 三、规格驱动 / 合同驱动：Spec Kit、Kiro、OpenSpec

### 3.1 GitHub Spec Kit：规范即"可执行"的主张，但自述为"实验/假设"

- 主张：

  > specifications become executable, directly generating working implementations rather than just guiding them

  以及 `Intent-driven development where specifications define the "what" before the "how"`、`Multi-step refinement rather than one-shot code generation from prompts`。
- 官方同时承认这是研究性质：

  > Our research and experimentation focus on: ... Validate the hypothesis that Spec-Driven Development is a process not tied to specific technologies, programming languages, or frameworks

- 也明确不管"需求变更后 spec 怎么保鲜"：

  > Spec Kit does not prescribe how teams preserve or mutate `spec.md`, `plan.md`, and `tasks.md` after requirements change.

来源：[What is Spec-Driven Development? — Spec Kit 文档](https://github.github.io/spec-kit/concepts/sdd.html) 与 [Spec Kit 首页](https://github.github.io/spec-kit/)。

### 3.2 AWS Kiro：spec 是 requirements/design/tasks 三件套，重流程与轻流程可切换

- Bugfix Spec 的机制值得注意——它**显式捕获"不变的行为"**：

  > Bugfix Specs explicitly capture "unchanged behavior" alongside the fix.

  用 `**WHEN** [condition] **THEN** the system **SHALL CONTINUE TO** [existing behavior]` 表述，并 `Kiro generates property-based tests that validate both the fix and the preservation of existing behavior`。
- 厂商自己承认重流程不是处处值得：`Use standard Feature Specs when: ... You're working in a compliance-sensitive domain where review gates add real value`；`Use Quick Spec when: ... You're rapid prototyping and want speed over review`。两者产物相同，差别只是 `whether you review each one before the next is generated`。
- 工作流一旦选定不可中途切换：`No, you must choose a workflow when creating the spec.`

来源：[Best practices — Kiro Specs 官方文档](https://kiro.dev/docs/specs/best-practices.md)（AWS Kiro 官方文档；站点为 JS 渲染，此处用其 `.md` 端点取得正文）。

### 3.3 OpenSpec：更轻的 spec 层，强调"先对齐再写码"与上下文卫生

- 哲学自述：`fluid not rigid`、`iterative not waterfall`、`easy not complex`、`built for brownfield not just greenfield`。
- 问题陈述：

  > AI coding assistants are powerful but unpredictable when requirements live only in chat history.

- 机制：每个变更一个文件夹（proposal / specs / design / tasks），`Agree before you build — human and AI align on specs before code gets written`；扩展 profile 里有 `/opsx:verify`。
- 明确提示上下文卫生：`OpenSpec benefits from a clean context window. Clear your context before starting implementation`。

来源：[Fission-AI/OpenSpec README](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/README.md)（项目源码仓 README）。

**本节证据评价**：三者都**没有**给出"减少返工"的量化证据。Spec Kit 自述为实验与假设验证；Kiro 是产品文档，无指标；OpenSpec 的 `vs. Spec Kit / vs. Kiro` 段落是**自我营销**（"thorough but heavyweight" / "you're locked into their IDE"），不作为事实采纳。更关键的是：这三者优化的是"**别做错东西**"，而本案两次失败是"**东西做对了但装不上**"——schema 校验与模块解析不在 spec 的检查范围内。见第五节。

---

## 四、失败模式证据：代理改动在集成/配置边界翻车的第一手复盘

DSH 宿主树里有 4 篇第一方 postmortem，其中两篇与本案**同类同型**，且都给了"为什么所有安全网都没拦住"和"事后加了什么机械门禁"。

### 4.1 Postmortem 0001：插件加载路径错了，178 个绿单测 + 100% 覆盖率全没拦住

- 现象：ACP server 在真实编辑器连上瞬间崩溃；`The bridge was completely non-functional in production despite 178 green unit tests and 100% line coverage.`
- 根因是**模块导出形状**问题（`export default apply` 让 Loader 的 `unwrapExports` 丢掉命名空间里的 `inject`/`name`/`Config`），第二个 bug 是跨 fiber 的服务解析。
- 为什么全漏：

  > Both bugs share one root process gap: **no test exercised the plugin through its real load path or its real call topology.**

  具体地，in-memory harness 手工构造插件对象（`ctx.plugin({ name, inject, apply })`），而 `unwrapExports` 只有 **Loader** 会调用、`ctx.plugin` 从不调用，所以它**结构上不可能**复现这个 bug。
- **还有一条环境/产物假设类失败**（与"人在本地跑却过了"同型）：唯一驱动真实路径的测试是 key-gated，CI 无 key 跳过；而本地 it "passed" only because a stale built `lib/` (with the old code) happened to satisfy module resolution.
- 加的机械门禁：无 key 的 `session/new` e2e 走真 stdio 与真 Loader，且 Verified it fails when `export default apply` is restored.；并新增 `TSX_TSCONFIG_PATH` 让解析与 cwd 无关，确保跑的是 source 而非可能过期的 build。
- 教训原话：

  > 100% line coverage was satisfied the whole time. Coverage proves lines *ran*; it says nothing about whether the feature works *the way it ships*.

来源：`vendor/dsh/docs/postmortem/0001-acp-default-export-drops-inject.md`（第一方复盘，含具体机制与门禁）。

### 4.2 Postmortem 0003：代理"说完成了"，人却在另一个页面上验收

这篇与本案形态几乎一模一样（代理改 GUI 源码 → 把验收甩给用户 → 拿 HTTP 200 当成功）：

- 代理自己没跑装配后的验收：the agent's sequence-30939 message told the user to run `pnpm run demo:tui` or open an unspecified Web application. It ran no assembled Web acceptance.
- **传输就绪 ≠ 应用就绪**（对应本案"模块静默不挂载"）：

  > bare Vite returned HTTP 200. `window.__DSH_BOOT__` is injected only by the full host, so transport readiness did not imply application readiness.

- 它甚至**先写了一个假阳性回归测试**：

  > a timeout killed Vite and satisfied a nonzero-exit assertion. Live reproduction exposed that false positive.

- 它还在**另一个端口起了替换服务**并验证那个：

  > A replacement service cannot prove that an existing page changed.

- 教训：`The agent must know hidden runtime prerequisites before it can guide the user; startup mode is application context, not tribal knowledge.`；`Acceptance names the exact origin and externally observes the requested change there.`；`A regression test must be able to fail for the reported mechanism.`
- 加的门禁：把当前 URL / 运行模式做成**模型可见**（logged `app:web-surface` prompt section + `$DSH_WEB_URL`）、standalone Vite 在配置期直接拒绝、分层真路径测试覆盖 CLI 请求/生产刷新/开发 HMR。

来源：`vendor/dsh/docs/postmortem/0003-web-agent-gui-feedback-loop.md`（第一方复盘）。

### 4.3 宿主自己文档化了本案失败 #1 的机制（关键发现）

`agent-presets` 包的 README 在 **Known Limitations** 里明确写了：preset 的健康检查**不会 import**，所以 config 校验错误一定会拖到第一次建会话才爆：

> **Health asks what is installed, not what would import** — discovery proves the composition parses in the loader dialect, holds named rows, and that each row it can prove will start names a package present above the harness base or a file that exists; it never imports one, so a package whose own entry file is missing, a plugin that throws on apply, and one waiting forever for a service all still fail at the first session.

同一 README 的另一条说明设计意图是"失败要可见"：

> a preset whose composition cannot load is listed with the reason rather than hidden, so you can see what to fix or delete.

来源：`vendor/dsh/packages/preset/agent-presets/README.md`（包级合同文档，Known Limitations 节）。

### 4.4 宿主对本案失败 #2 **已经有机械门禁**（关键发现，源码级）

`scripts/verify-cordis-config.ts` 里有一个专门的校验函数 `validateClientHalvesDeclared()`，其文档注释直接描述了本案失败 #2：

> A `packages/client` package that exports `./client` without that block therefore composes, activates, and contributes nothing — its bundle is never served and no error is raised anywhere. The mismatch is invisible in the composition file, so it is checked against the manifests instead.

报错文案就是本案的判定式：

- `exports "./client" but declares no dsh.client, so its browser half is never served`
- `declares dsh.client but exports no "./client" entry to serve`

**但它的扫描范围有明确边界**：`globSync('packages/client/*/package.json', ...)`，注释说 Only this group is checked: a Host package's `./client` export is the typed wire face its browser consumers import, not a plugin the roster serves. 也就是说，若 client 面不在 `packages/client/*` 分组下，这条门禁**覆盖不到**。

来源：`vendor/dsh/scripts/verify-cordis-config.ts`（宿主门禁源码，属源码而非散文）。

### 4.5 本仓库自己已经从失败 #1 里提炼出了门禁

`scripts/preset-smoke.mjs` 的头注释完整记录了本案失败 #1 的机制，并且指出为什么静态检查都抓不住、只能走真入口：

> preset 的失败发生在"**会话创建时挂载**"——Loader 用每行的 config 校验插件 schema，任一必填字段缺失就让整个 preset 挂载失败（`agent-preset/invalid`）。而 roster 扫描（`discoverPresets`）只解析 YAML + 解析包名，`--dump-config` 只打印 profile 树，两者都看不到 config 校验；**UI 还会把错误吞掉**（"新建会话点了没反应"）。所以唯一能上线前抓住它的手段是：走真入口路径（web RPC session/create）挂一次。

来源：`scripts/preset-smoke.mjs`（本仓库源码）。

### 4.6 行业侧：验证成为瓶颈，且失败模式有统计

- AAIF 的博文把结论讲成一句话：

  > Generation now scales faster than verification. The bottleneck did not disappear. It moved.

- 它转述 A Place for Mom 的 Grace 平台：10 个月 `3,478 pull requests across four repositories and merged 2,822 of them—an 81% merge rate`，靠的是 `Persistent context, structured planning, isolated Git worktrees and a 10-stage multi-agent review pipeline`；遗留问题是 `comprehension debt`。
- 它转述 Amazon 的审计：

  > Amazon's audit of more than 6,000 failed agent trajectories shows why: endless loops and timeouts alone account for nearly a third of failures

- 处方：

  > Policy belongs before generation. Deterministic checks should sit beside probabilistic judgment.

  以及 `The age of expensive code encouraged teams to optimize production. The age of abundant code will force them to optimize proof.`

来源：[Code Is Cheap. Proof Is the Bottleneck. — Agentic AI Foundation, 2026-09-08](https://aaif.io/blog/code-is-cheap-proof-is-the-bottleneck)。
**证据瑕疵**：这是基金会编辑转述他人会议演讲与数据，**非第一手复盘**；A Place for Mom / Amazon / HumanLayer / Endor Labs 的原始材料本次未取得。作为"业界共识方向"可用，作为量化证据不可用。

---

## 五、迭代不可消除：社区与厂商自己怎么说

这一节刻意收录"反方向"证据：厂商并不主张靠一次性把文档读透来消灭失败。

- **GitHub 第一方**：`The best agent files grow through iteration, not upfront planning.`（[GitHub Blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)）
- **Anthropic 第一方**：`The best results come from tight feedback loops. Though Claude occasionally solves problems perfectly on the first attempt, correcting it quickly generally produces better solutions faster.` 并且反复纠正本身就是失败信号：`If you've corrected Claude more than twice on the same issue in one session, the context is cluttered with failed approaches. Run /clear and start fresh...`（[Claude Code best practices](https://code.claude.com/docs/en/best-practices)）
- **Anthropic 对"重流程"的自我设限**：plan mode `is useful, but also adds overhead`，`If you could describe the diff in one sentence, skip the plan.`（同上）
- **Kiro 对"轻流程"的承认**：Quick Spec 适用于 `well-understood feature where you trust Kiro's output` / `rapid prototyping and want speed over review`（[Kiro best practices](https://kiro.dev/docs/specs/best-practices.md)）
- **DSH 自己的实践证据**：一个成熟的、已经写了大量门禁的仓库**仍然**产出 postmortem，且其 postmortem 的立意就是"为什么流程让它漏过去了"——即失败被当作常态输入而非异常（`vendor/dsh/docs/postmortem/README.md`）。
- **行业侧**：`There's no "dark factory" for software until agents have much better verifiers`（AAIF 转述 HumanLayer；见 4.6，**[转述]**）。

**综合**：厂商一致认为**迭代是常态**，但一致要求迭代必须由**代理自己能跑的判定信号**闭合（测试、构建退出码、linter、fixture diff、浏览器截图、Stop hook）。没有任何一家主张"零失败"，也没有任何一家主张"靠更仔细阅读文档"。

---

## 证据薄弱 / 无法证实 / 厂商营销 清单

- **未能取得的页面**（不作任何断言）：`docs.github.com` 的 Copilot coding agent "best practices" 页面返回 404；Google Jules 官方文档抓取失败；GitHub Copilot customization cheat sheet 正文被截断（只拿到导航）。因此本文**没有**关于 Jules 或 Copilot coding agent 具体建议的结论。
- **未找到名为 "agent-ready repo" 的官方文档**（Google/GitHub 均未在本次检索中取得以此命名的第一方材料）。不要把它当既有概念引用。
- **GitHub Blog 的 agents.md 分析**混用了 Copilot custom-agent persona 与仓库级 AGENTS.md；其"2,500+ 仓"样本与"六核心领域"结论是 GitHub 自述分析，未见方法与可复现数据。
- **规格驱动减少返工**：Spec Kit 自述为实验/假设（`Validate the hypothesis...`）；Kiro 无指标；OpenSpec 的竞品对比是自我营销。**无第一方量化证据**表明它们减少返工。
- **AAIF 博文**的数字全部是转述（Amazon 6,000 轨迹、A Place for Mom、HumanLayer、Endor Labs），非一手。
- **覆盖率与"能红"**：DSH 明确 `Line coverage is necessary, never sufficient`，且要求门禁必须证明"引入回归会红"。任何只声称"覆盖率 100%"的说法在本主题下不构成证据。
- 本文引用的 DSH 材料来自钉住 tag `dsh-v0.1.5-rc.2`；宿主为 pre-stable，规则可能随 tag 漂移。

---

## 对本案的可用结论

### 直接回答：更仔细读规则能不能避免这两次？

**分案回答，且答案不同。**

**失败 #1（preset 缺必填 config 字段）——读文档只能"指出该跑哪个检查"，抓不住失败本身。**
宿主在 `packages/preset/agent-presets/README.md` 的 Known Limitations 里**明文写了**健康检查 `never imports one`，所以 `a plugin that throws on apply` 之类的错误 `still fail at the first session`。也就是说：**读文档能让代理知道"静态扫描看不见 config 校验"这个事实**，从而把注意力转到真入口路径上。但框架不提供逐行 config schema 的静态校验，所以无论读得多仔细，都不存在"读一遍就不出错"的路径——**唯一能拦住它的是"建一次真会话"这个动作**。DSH 的测试政策恰好把这条写成了规则（`Test the real entry path`、`assert a genuinely-missing config exits non-zero`、起真 profile 的冒烟 `check the world`），而本仓已经把它落成 `scripts/preset-smoke.mjs`。
→ 结论：**预防它的是"真入口路径冒烟 + 把完成定义为该检查通过"，不是"更仔细读文档"。** 这次的真正缺陷是"定义完成"缺了这一步（代理说 done 时没跑 session/create），而不是知识缺失。UI 吞错则是宿主侧 fail-loud 不彻底（与 DSH 自己的 `Misconfiguration fails loud...` 不变量冲突），属宿主缺陷，代理读文档也改不了。

**失败 #2（client 插件缺 client-plugin 字段，不在浏览器模块表）——读机制/读门禁源码本可以避免。**
这条不是"没写清楚的约定"：宿主 `scripts/verify-cordis-config.ts` 有**专门的机械门禁**，报错文案就是本案判定式（`exports "./client" but declares no dsh.client, so its browser half is never served`），且源码注释明说这种不一致 `no error is raised anywhere`、`invisible in the composition file`。同时 DSH 的根指令里有 `Misconfiguration fails loud at load ... never silently skip a missing referent`——静默不挂载本身就是违反宿主不变量。
→ 结论：**这是一条成文且有门禁的契约，读机制（或读该门禁的源码/报错文案）本可以预防。** 但要注意真实缺口：该门禁只扫 `packages/client/*/package.json`，本仓 client 面不在该分组，**现有门禁覆盖不到**——所以"读了门禁源码"还会顺带发现这个范围限制。修法明确：补 client-plugin 声明，或把同构检查扩到本仓 client 面（与本仓 `verify.mjs` 里那条"行依赖必须在 pack dependencies"同构，可直接照抄模式）。

**总回答**：iterate-and-fix 确实是常态，但**"常态"指的是迭代必须由代理可自行运行的检查来闭合**，而不是由人在浏览器里发现。两次失败的共同点不是"文档没读够"，而是**失败的发现权在人类一侧**。厂商的一致处方是把这个发现权交还给代理（可判定信号 + 完成定义绑定该信号），这与"读更多文档"是两条不同的路。

### 哪些实践在本案里是"未被证实 / 营销"

- **规格驱动（Spec Kit / Kiro / OpenSpec）对本案两次失败基本无效**：它们优化"别做错东西"（需求/设计对齐），而本案是"东西做对了但装不上"（schema 校验、模块解析）。规格文档不校验 config schema，也不进浏览器模块表。**没有第一方证据**表明它们能减少这类返工；Spec Kit 自述为假设验证阶段。
- **"把 AGENTS.md/CLAUDE.md 写得更细"是最弱的杠杆**：格式无必填字段、无强制力，Anthropic 自己说这类指令是 `advisory`，而 hooks `are deterministic and guarantee the action happens`。GitHub 的数据结论也是 agent 文件 `grow through iteration, not upfront planning`。把它当"预防手段"是过度期待；把它当"把检查命令送进上下文"才是正确用法。
- **"agent-ready repo"**：本次未找到以此命名的官方材料，不作为可引用概念。
- **AAIF 博文的量化数字**：转述，不可作为证据。
- **唯一被本案实证的强杠杆**：真入口路径的自动化检查（宿主 `docs/testing.md` 的 `Test the real entry path` / 冒烟 / `Verify the world, not the self-report`），以及"门禁必须证明引入回归会红"。

### 建议的最小动作（不新增流程，只用现成载体）

1. **失败 #1 已有门禁**：把 `node scripts/preset-smoke.mjs` 明确写进"完成定义"（AGENTS.md 命令表已有该行，需强化为"改 preset 行/config 后必须跑过"）。它对应 DSH `docs/testing.md` 的 `Test the real entry path` 与"起真 profile 的冒烟"。
2. **失败 #2 需要补覆盖**：本仓 client 面缺一条"导出 `./client` ⟺ 声明 client-plugin 字段"的同构检查（照 `vendor/dsh/scripts/verify-cordis-config.ts` 的 `validateClientHalvesDeclared()` 模式），并补一条"真 web profile 起得来 + 浏览器模块表里能解析到该插件"的断言。对应 DSH 的 `Misconfiguration fails loud` 与 `Verify the world, not the self-report`。
3. **不要加的东西**：不要为这两类失败引入 spec 流程（本仓 AGENTS.md 已声明"不发明"，且无证据支持其对本类失败有效）；不要指望靠加长指令文件解决——按 GitHub 与 Anthropic 的一致说法，那会稀释真正重要的规则。
4. **可选（有证据支持、成本低）**：按 DSH `docs/postmortem/README.md` 的标准为这两次失败各写一篇复盘，重点写 `why our process let it through` 与 `the concrete guardrails added`——这正是宿主树里 0001/0003 的形态，也是本主题里唯一"第一方 + 有机制"的证据来源。

---

## 来源清单（按类型）

**规范 / 源码（最硬）**

1. [AGENTS.md 官方格式站](https://agents.md/)（规范 + FAQ；Linux Foundation / AAIF 托管）
2. [openai/codex 的真实 AGENTS.md](https://raw.githubusercontent.com/openai/codex/main/AGENTS.md)（活的指令文件）
3. [google-gemini/gemini-cli 的 GEMINI.md 文档](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md)（Google 第一方源码仓文档）
4. `vendor/dsh/AGENTS.md`（宿主根指令，钉 tag `dsh-v0.1.5-rc.2`）
5. `vendor/dsh/docs/testing.md`（宿主测试政策）
6. `vendor/dsh/scripts/verify-cordis-config.ts`（宿主门禁源码；`validateClientHalvesDeclared()`）
7. `vendor/dsh/packages/preset/agent-presets/README.md`（包合同 + Known Limitations）
8. `scripts/preset-smoke.mjs`（本仓源码，含失败 #1 的机制记录）

**第一方复盘**

9. `vendor/dsh/docs/postmortem/0001-acp-default-export-drops-inject.md`
10. `vendor/dsh/docs/postmortem/0003-web-agent-gui-feedback-loop.md`
11. `vendor/dsh/docs/postmortem/README.md` 与 `vendor/dsh/.agents/notes/README.md`（复盘/决策记录标准）

**第一方文档 / 工程博客**

12. [Best practices for Claude Code — Anthropic](https://code.claude.com/docs/en/best-practices)
13. [How to write a great agents.md: Lessons from over 2,500 repositories — GitHub Blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
14. [GitHub Spec Kit 官方文档](https://github.github.io/spec-kit/) 与 [What is SDD?](https://github.github.io/spec-kit/concepts/sdd.html)
15. [Best practices — Kiro Specs（AWS）](https://kiro.dev/docs/specs/best-practices.md)

**第三方/协会（已标注为转述或营销）**

16. [Fission-AI/OpenSpec README](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/README.md)（竞品对比段落为自我营销）
17. [Code Is Cheap. Proof Is the Bottleneck. — AAIF](https://aaif.io/blog/code-is-cheap-proof-is-the-bottleneck)（转述他人数据）
