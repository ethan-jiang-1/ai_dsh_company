---
topic: 仓库卫生
intent: "第五轮七维打扫（2026-11-03）：接续 2026-10-27/28 两轮，复核 v3 内容迁移与发行版收口之后七维（文档披露 / 代码与测试层次 / 执行与验收 / 上下文腐化 / 测试资产 / 反馈通路 / DSH 插件约定）是否仍自洽；产出带 file:line 证据的分级发现、与上一轮的关系、可分批改善清单。"
---

# 第五轮七维打扫审计（2026-11-03）

> 服务：[第五轮七维打扫卡](../../issues/2026-11-03-repo-hygiene-round5.md)
> **批次 A–C 已落地（2026-11-03）**：R5-01/02/04/05/06/07/08/10/11/12/17/21/22/23(首刀)/27/30/31/33 已修；R5-03 已按 0.7.2/0.8.0 bump 重打并 `release --verify` 全绿（npm publish 仍人工）；D7 公开面/peers 已收；D5 catalog 审计路径补测（v3 slug 修复）。详见 [第五轮卡](../../issues/2026-11-03-repo-hygiene-round5.md) 与各 Note。下文保留审计时点（before）的发现。
> 上一轮：[第四轮审计（2026-10-28）](../../_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)
> 口径：fresh agent 只读评审 + 主 agent 亲跑全部 keyless 车道 + 六个独立子代理分维深挖；主 agent 对 P0/P1 逐条回查原文件/原命令。
> vendor/dsh 只读；真模型认证档未跑（成本授权未给）。真页面档跑了 dev 模式 `ui-scene-smoke` 与 `client-load-smoke`；isolated 金样档实测启动失败（见 D6）。
> **数字基线**：HEAD `ad07da3` · `pnpm verify` **53 门 ALL PASS + 2 SKIP** · `pnpm test` **124 spec / 1048 例（1045 pass / 3 skip）** · `pnpm typecheck` exit 0 · 覆盖率 **85.14 stmt / 77.33 branch / 86.10 func / 88.87 line** · 代码 81 文件 / 13,996 行 · 测试 15,174 行 · `release-smoke` **39 PASS** · `client-load-smoke` **ALL PASS** · `ui-scene-smoke`（dev）**ALL PASS 9/9 页签** · `release --check` **exit 1**。

## 0. 一句话结论

**骨架仍然健康，问题集中在「最近两次大改的缝」：v3 把 `workspace/` 搬成 `content/`、发行版把 `_dist`/市场索引收口，两处都有消费者没扫干净，于是出现「门禁在零对象上 PASS」和「两个 readiness owner 互相矛盾」。这不是文档说谎，而是删除/迁移没有闭环；它是本轮上下文腐化的主形态。** 七个维度里 D1/D2/D5 仍是 B 档的「结构对、局部失真」，D3/D7 因授权与发布语义被拖到 B-，D4 因两个真空绿门禁 + `release --check` 红而到 C+，D6 因唯一确定性真页面金样档不可启动、`diagnose` 漏报三成非零退出而到 C。

## 1. 七维评分

| 维 | 本轮 | 上一轮 | 一句话判据 |
|---|---|---|---|
| D1 文档与渐进披露 | **B** | B | 入口链真的薄（AGENTS 83 行，嵌套 AGENTS 自动注入），31/31 文档有路由、0 断链；但 10 个空壳节仍在被 12 处引用，行预算在结构性增长面（决策台账 62/62）零头寸，`publish-handoff` 无预算。 |
| D2 代码/测试层次 | **B** | B | 源码 81 文件 / 214 边 / **0 环 0 反向边**，两条独立守卫；病在测试侧：929 行单 spec 覆盖 4 模块、15 个源码文本断言、`runtime-guard` 无直接 spec。 |
| D3 文档—执行—验收 | **B-** | B | 收尾次序已单家；但自动注入的 `_backlog` 门牌把「修复就绪自授权」写成无限定直接修，语义审四输入的 owner 被 7 处指向一个空壳节。 |
| D4 上下文腐化/偏移 | **C+** | B | 主形态 = 半应用改名：`shipped-links`/`nav-count-claims` 仍根在已删除的 `workspace/`；`release --check` 红而 `verify` 绿；D51 排在 D50 前。 |
| D5 测试资产 | **B** | B | 1048 例、覆盖 85/77、负例文化真实；但用户最常点的「培养」页签壳 **0%**、浮窗几何 24%、`presets` 只有文本断言、静默 skip 3 例。 |
| D6 反馈通路 | **C** | C | dev 模式真页面 9/9 + `--steps` 点击复现在；但 `diagnose` 漏报 34% 非零退出、客户端错误到不了盘、isolated 金样档不可启动。 |
| D7 DSH 约定 | **B-** | A- | bundle/patch/preset/client/引导/安装几乎教科书级；但市场索引发布未存在的 0.7.1、`_dist` 过期、卸载从不冒烟、读 `storages/workspace.json` 私有形状。 |

## 2. 最重的十一条（P0/P1）

| # | 维 | 级 | 发现（实证据） |
|---|---|---|---|
| R5-01 | D6/D4 | **P0** | `ui-scene-smoke --isolated` 启动即 exit 2：它 spawn 已删除的 **tools/standalone.mjs**（已删除），并 `cpSync` 已删除的 **packages/company-pack/workspace**（已删除）（`checks/smoke/ui-scene-smoke.mjs`（`:65`/`:74`）；`probes/browser-visual/cultivation-gui-probe.mjs`（`:95`/`:104`））。两份活文档仍把它当金样档（`checks/README.md:20`、`tests/README.md:30`）。删除发生在 `ef50554`（v3 native entry），消费者未同 diff 扫。**实测**：`node checks/smoke/ui-scene-smoke.mjs --isolated --golden` → exit 2，`MODULE_NOT_FOUND`。 |
| R5-02 | D4 | **P0** | 两个门禁根在已删除目录，PASS 是真空的：`shipped-links` 根 **packages/company-pack/workspace**（已删除）（`checks/gates/shipped-links.mjs:12`），只查 14 份 skill md，**17 份随包 `content/*.md` 零链接检查**；`nav-count-claims` 同根（`checks/gates/nav-count-claims.mjs:31`），扫 35 份而非 52 份。手册/模板是随每个角色会话注入的最大常驻面，正是这两门要守的对象。 |
| R5-03 | D4/D7 | **P1** | 两个发布 readiness owner 相反：`node tools/release.mjs --check` **exit 1**（「pack 源码面已变但 `_dist` 没重打」；HEAD `ad07da3` vs manifest `gitSha e59a86c`），而 `pnpm verify` 的 `dist-freshness` / `release-ready` 全 PASS；`_dist/安装手册.md` 与 `market-index.json` 仍写 0.7.1。新 agent 会以为可以发。 |
| R5-04 | D3 | **P1** | 自动注入的授权门牌截断排除项：`_backlog/AGENTS.md:23` 写「门票即授权（限 P1/P2 修复型）：直接修」，`_backlog/README.md:14` 只留「P0 或严重/变向除外」；完整边界在 `:124`（章程/常设指令、docs 合同、company-pack 公开行为、已记录决定都不自授权）。按门牌执行可自授权改合同。 |
| R5-05 | D3 | **P1** | 语义审四输入的 owner 是空壳：`close-out-definition/SKILL.md:10,25,61`、`dev-loop.md:132` 说「住 §13」，而 `dev-loop.md:153-155` 只有一行指向 `policy.md §P5`；实际正文在 `policy.md:79-84`。7 处活引用指到中转节。 |
| R5-06 | D5 | **P1** | 用户最常点的「培养」页签壳 `CultivationTab.tsx` **0.0% statements**（只在 `company-tab-registration.spec.ts:37` 的数组里被点名）；整页空白、`roleSource` 抛错，1048 例全绿。同族：`company-tabs.tsx` 24.1%（浮窗/localStorage 85-158 未覆盖）、`Brand.tsx` 0%。 |
| R5-07 | D2 | **P1** | 决定「公司数据可不可写」的 `host/runtime-guard.ts`（137 行）无直接 spec；`workspace-resolution.ts` 25.5%、`workspace-doors.ts` 31.8%，只有间接组合覆盖。 |
| R5-08 | D2 | **P1** | 分层守卫自称检查 fetch/spawn/exec「from parsed call expressions below」，实际文件里没有这段（`tests/harness/layering.spec.ts:28-29` vs 全体），守卫在说谎；动态 import 的 `spawn` 可穿。 |
| R5-09 | D2/D5 | **P1** | 源码文本当行为断言至少 15 处（`client-face.spec.ts:21-39,63-88` 断 `useState(false)`/`ResizeObserver`；`panel-freshness.spec.ts:51-65` 断字面量）。行为保持的重构变红，行为回归只要拼写不变仍绿。 |
| R5-10 | D7 | **P1** | 卸载承诺从未冒烟：`release-smoke` 有 install / 幂等重装 / 应用内安装 / 首启 / 二启，**没有 remove**；而 README/手册承诺「remove 只摘插件、数据全部留下」。这是用户点名的生命周期轴里唯一没证据的一格。 |
| R5-30 | D6 | **P1** | `diagnose` 少报非零退出：`tools/lib/session-diagnose.mjs:110` 先把工具输出截到 400 字符再匹配 `[exit code: N]`，而 marker 在输出末尾。全 dev home 597 会话实测 **132 条真非零 / 只报 87 条（漏 34%）**；会话 `003d6306…` 有 2 条 exit 1，`diagnose` 打 `nonzero=0`。 |

## 3. 分维发现

### D1 文档与渐进披露（B）

**成立**：根 `AGENTS.md` 83 行是自动注入的（0 跳）；`docs/AGENTS.md`、`_backlog/AGENTS.md` 在触碰时注入；31/31 文档在 `docs/index.md` 有登记；`docs/`、根、`tests/`、`checks/`、`.agents/` 的 2864 条相对链接 **0 断**；三份链上文档都有行预算。

**问题**：

- **空壳节与引用漂移**（R5-19）：`docs/guides/dev-loop.md` 保留 10 个「防断链」空壳节（§2/§4/§5/§6/§7/§8/§9.1/§10/§11/§13），12 处活引用指过去；`docs/guides/debugging.md:8` 甚至说 patch 语法 owner 是 §4，实际在 `bootstrap.md:138`。一跳变两跳，部分是死胡同。
- **行预算错位**（R5-17）：`docs/decisions.md` 62/62 零头寸，而台账规则「编号不重用、不删行」（`:5`）；4 份零头寸、15/35 <5%；`docs/guides/publish-handoff.md`（90 行，最新分发指南）**无预算**；`_backlog/README.md`（132）、`notes/README.md`（124）两个最大 owner 文档完全在棘轮外。反向棘轮因此长期常亮。
- **索引与教义矛盾**（R5-18）：`checks/README.md` 头部说「触发/成本唯一家 = 脚本头注」，正文却手工枚举 26 smoke / 4 audit / 58 逻辑探针 / 53 门 / 18 工具；而 `script-index` 门禁**强制**每个公开脚本必须在 README 出现（`checks/gates/script-index.mjs`）。这与 D28「枚举的家 = 实现自己」相抵；要么生成索引段，要么放宽门禁。
- **9/32 文档无「什么时候读」**（`project-map`、`repo-hygiene`、`release-runbook`、`orient`、`decisions` 等在列）；靠嵌套 AGENTS 注入补偿了一部分。
- **`docs/terminology.md:12`** 把组合链指向 `docs/architecture.md`，文件不存在（实际 `docs/design/architecture.md`）；`bare-path` 不查存在性，故绿。

### D2 代码与测试层次（B）

**成立**：81 文件 / 214 条内部边，**0 环、0 反向边**；7 条合法方向；两条独立守卫（`src-layering` 门禁 + `tsc -b` 的 TS6307）；`gate-wiring` 防哑弹；`tests/company/host-composition.spec.ts` 存在（“host 无组合测试”的旧判断已不成立）。

**问题**：

- **测试粒度反了**（R5-23）：原 cultivation spec（929 行，2026-11-03 已拆） / 44 个 it，覆盖 `host/cultivation` + `host/cultivation-storage` + `lib/cultivation` + `lib/cultivation-context` 四模块；源码是一模块一文件。`tests/client/cultivation-board-actions.spec.ts` 574 行。
- **测试分区无主**（R5-24）：`src/lib`（20 模块）没有自己的区；9 个纯 lib spec 住 `tests/company/`，1 个住 `tests/client/`；`tools/lib` 的 2 个 spec 也住 `tests/company/`（`dev-install`/`market-index`），而 `tests/README.md:16-19` 把 tools/lib 判据划给 harness。
- **共享面漏测**（R5-25）：`lib/tool-card.ts`（75 行，两个卡片共用）无直接 spec，且 `:44` 内联复制了 `lib/guards.ts:5` 的 `isRecord`；`lib/guards.ts` 本身也无 spec。
- **入口导出面**（R5-26）：`src/index.ts:43-44` `export *` 出 17 个符号，仓内无消费者（只有 `apply` 被 7 处 import）；`tests/harness/pack-exports.spec.ts` 钉了 inject/apply，没钉导出集合，公开面可静默变宽。
- **静默盲区**：`checks/gates/src-layering.mjs` 只认字面量 specifier，`await import(v)` / 模板串可穿（未复发，注释已明说）。

### D3 文档—执行—验收（B-）

**成立**：`docs/policy.md` 把授权、门禁升格、自动化上限、越界写入、自主协议收成一处；收尾次序与六行回执单家在 `close-out-definition`；dev-loop §12 与 skill 九步一一对应；Plan Mode 已进 AGENTS 首屏。

**问题**：

- **授权截断**（R5-04）：门牌与章程摘要都丢了排除项；`dev-loop.md:35` 自己写「缩写即漏边界」，但门牌仍在缩写。
- **语义审 owner 空壳**（R5-05）。
- **preset 完成定义仍有三份不等价**（R5-12）：`AGENTS.md:49`（只说 preset-smoke）、`docs/presets.md:180`（另加 `pnpm verify` + `probe-smoke --full`，5–10 分钟）、`preset-change-definition/SKILL.md:10-16`（preset-smoke + verify/test + 场景）。取最低成本读法即可自称完成。
- **收尾不在首屏**：`AGENTS.md:5` 的「按需」只列 dev-loop §0.5/§1，六行回执与收尾 skill 没有第一跳指针（DSH skill catalog 会自动发现，部分补偿）。
- **`checks/README.md` 的「待触发复查」表**（:70-80）与「触发/成本唯一家 = 头注」自相矛盾；它确实在手工维护触发句。

### D4 上下文腐化/偏移（C+）

**主形态 = 半应用改名 + 发布状态漂移。**

- `workspace/` → `content/` 只改了一半（R5-11）：`shipped-links`（`:12`）、`nav-count-claims`（`:31`）、`tools/lib/markdown-links.mjs:39` 的 EXCLUDED_PATHS、`replay-fixture-freshness.mjs:4` 注释、`tests/company/templates.spec.ts:10`、`.gitignore:23`、`packages/company-pack/src/README.md:31-32` 都还写旧路径。
- **tools/standalone.mjs**（已删除）的删除只改了产品面，没改浏览器检验消费者（R5-01）。
- `retired-path` 门禁的退役前缀只有两个 `_backlog` 项，`workspace/`、`standalone.mjs`、`snapshots/ui` 都不在，所以这类残留全绿。
- **发布状态**（R5-03 / R5-13 / R5-14）：`release --check` 红；`_dist` manifest 是 2026-11-02 22:21、tgz 21:11、手册 21:44（同代），但源码 HEAD 已前进 5 个提交；`market-index.json` 声明 0.7.1（npm 404，`market-index.staged.json` 自认未发布）；`compat-tags.json` 只到 rc.2，而 pack README 声称 rc.5 已验证。
- **台账顺序**（R5-21）：`docs/decisions.md:56-57` D51 在 D50 前；`ledger-routing` 只查可解析，不查单调。
- **归档断链**（R5-20）：`_backlog/` 27 条 + `notes/` 19 条 = 46 条冻结层断链；`notes-archived-links` 只查 `.md` 目标，`.mjs`/`.png`/`.yml` 证据指针静默腐烂。
- **Note 事实落点**（R5-22）：`notes/implemented/2026-10-19-deliverables-catalog.md`（`:13`/`:29`） 仍写 `company-workspace/kb/deliverables-index.json`，实际在 `.dsh-company/kb/`；`notes:audit` 报死路径。

### D5 测试资产（B）

**成立**：1048 例、124 spec、15,174 行；零 `toMatchSnapshot`；白名单 mock 只有两处（文档口径）；`BUG-nnn` 守卫 21 条且有红配方；temp-dir 真文件集成 25 个；静态渲染 15；happy-dom 9；真实浏览器档 `client-load` 实跑 ALL PASS；fixtures 小、合成、有 provenance spec；无 >80 行的单 `it`、无同名 spec。

**问题**：

- **用户可见面三处空白可全绿**（R5-06 / R5-27）：`CultivationTab` 0%、`CultivationContextPicker` 56.5% 且 0 分支（会话/成果检索承诺零 spec）、`company-tabs` 浮窗几何 24.1%。
- **preset 只有文本**（R5-15）：`tests/presets/presets.spec.ts` 26 个 YAML 正则断言；真挂载只在 `checks/smoke/preset-smoke.mjs`（不在 `pnpm test`）。schema 非法的 preset 在 keyless 档仍绿。
- **静默 skip**（R5-16）：`tests/company/ledger.spec.ts:43` 的 `describe.skipIf(!hasLive)` 正是本轮 3 个 skip；它是 live 台账的唯一结构断言，fresh clone 上消失，且没有「预期 N 个真跑」守卫（宪法 §3.6 要求）。
- **测试重心**：harness 48 文件 / 504 例 = 48%，一半断言守仓库自身；产品面是少数。
- **mock 白名单漂移**（R5-28）：`docs/testing.md:49` 说只有两处；`tests/harness/probe-web.spec.ts:151-207` 有 11 处 fetch/spawn stub（网络边界），未登记。
- **fixture emitter 混入 tests**（R5-29）：`role-mark-fixture.spec.ts`、`board-drift-fixture.spec.ts`、`dag-visual-fixture.spec.ts` 是产物生成器，不是行为测试，但计入 124。
- **3 个 0 覆盖的壳**：`Brand.tsx` 0%、`CultivationTab` 0%，`client/index.ts` 58.5%。

### D6 反馈通路（C）

**通的（本轮亲跑）**：

- `ui-scene-smoke`（dev 模式）：自起实例 → **9/9 页签全开** → `consoleProblems=[]`、`exceptions=[]`、`clientErrors=[]`、`errorRingInstalled=true` → 场景回执 + 截图落 `runtime/harness-home/diagnosis/`。我亲眼看了 `page.png`：品牌「DSH 梦之队」、CEO preset、右栏九页签都在。
- `client-load-smoke` ALL PASS（真浏览器零挂载失败）。
- `cdp-probe --steps` 的 clickText / waitText / expectText 实测可用：点「成品」→ 等到「共 0 份成品」→ 断言通过；坏步骤 exit 1 并进 `stepFailures`（`probes/browser-visual/cdp-probe.mjs:332-367`）。**具体交互可复现**。
- 错误环本身捕获可靠：注入 `console.error` + 未捕获 throw → `window.__DSH_COMPANY_ERRORS__` 两条都在，token 被 redact（50 条上限、相邻去重）。
- `docs/guides/budget-and-ops.md:36` 已有「面板空白/页签点不开」症状行，指向 `ui-scene-smoke` 与 diagnosis 目录。

**不通的**：

- **`diagnose` 少报非零退出**（R5-30，P1）：`tools/lib/session-diagnose.mjs:110` 先把工具输出截到 400 字符，再去匹配 `[exit code: N]`；bash 把 marker 放在输出末尾。全 dev home 597 个会话实测：**132 条真非零，只报 87 条（漏 34%）**；会话 `003d6306…` 有 2 条 `[exit code: 1]`，`diagnose` 打 `nonzero=0`。这正是「失败被读成 FAILURES none」的同类假绿。
- **客户端错误到不了盘**（R5-31，P1）：错误环只活在页面内存，刷新即清（`error-ring.ts` 无 storage）；唯一的落盘 writer 要求 `dataBlocked===false` 且主视图保留会话（`host/client-diagnostics.ts:38`），实测在 dev home 触发真错误后 `$DSH_HOME/logs/company-client-errors.log` **仍不存在**，写失败还被 `.catch(() => {})` 吞掉。
- **唯一确定性金样档不可启动**（R5-01）：`--isolated --golden` 是回归网里唯一能断言「页面里该出现什么」的 lane；它死了，而 `checks/README.md:22`、`tests/README.md:30`、`runtime/README.md:18` 仍在推荐。
- **失败信息截断**（R5-32，P2）：`ui-scene` 的预置失败只打 stderr `.slice(-400)`，实测从单词中间开始（`esolveForCJSWithHooks…`），把真正缺失的模块路径切掉了。
- **启动失败无盘上日志**（R5-33，P2）：`pnpm company` 用 `stdio:'inherit'`，`probe-web` 只在内存留 16k；只有探针写 `web.log`。`pnpm dsh web` 崩了随终端消失。
- **证据寿命 7 天**（R5-34，P2）：`prune-runtime` 默认删 >7 天 diagnosis/probe 证据；用户一周后回看症状，现场已没了；runbook 没写这条。
- **`--steps` 的 typeText 选择器无文档**（R5-35，P2）：composer 是 `[data-composer-input][contenteditable="true"]`，文档没有可用的选择器示例；`["textarea","hi"]` 实测失败。
- **isolated 证据仍落 dev home**（R5-36，P3）：`diagnosisDir` 固定 dev home，隔离跑的证据与 dev 混在一起。

### D7 DSH 插件约定（B-）

**成立（且是难得的好）**：

- `dsh.bundle.patch` 是 7 文件有序数组，与 vendor `web-app` 同形；`engines.dsh` 是唯一硬门；没有 `dsh.compatibility` 或自造字段。
- 六个 preset 是标准 `@deepseek-ai/dsh-agent-preset` insert；`agent-preset-registry` 只替换 `default` 且重述全配置。
- `dsh.client` = `platform: 'web'` + `exports["./client"]`，bundle 只 require 三个 baseline 模块。
- 引导是 create-only（`flag: 'wx'`）、workspace-gated、只写 `.dsh-company/`、二次 boot 字节不变。
- `company-session-search` 是官方 `experimental/session-search` 的逐字段同形（`cordis:group` + `isolate.sessionQuery`），且拒绝替换 base 行。
- 市场索引能被 vendor `parseMarketIndex` 解析为 VALID；图标内联 data URL；缓存面匹配 `dshCachePath`。
- `release-smoke` 39 PASS：CLI 安装、幂等重装、应用内安装 `applied`、六 preset roster、`session/create`、首启 36 件、二启零变更、包目录零写入。

**问题**：

- **发布面**（R5-03 + R5-10）：索引声明未发布的 0.7.1；`_dist` 过期；卸载无冒烟。
- **web-only 硬依赖**：`src/index.ts:47` 的 `inject` 含 `workspaceRegistry`，非 web profile（base-only/headless）整半不激活；boot 还 `await workspaceRegistry.create()`（`:189-192`），抢在 DSH `initializeDefault` 之前，首屏/sidebar 因此与原生不同。
- **读私有持久层**：`presented-domain.ts:54-55`、`workspace-registry.ts` 读 `storages/workspace.json` 的内部形状；backend 一换就断。
- **品牌只占一半**：`src/client/index.ts:296` 只注册 `sidebar.brand.name`，没占 `sidebar.brand.mark` / `conversation.hero.brand.mark`；官方 brand 若也在，`single` 槽会撞。
- **`$DSH_HOME/company/`** 是自造 home 树（methods/ledger/identity/settings），vendor 的首选是 `storageDomain`；方法层有文档理由，账本已有 domain + 文件回退，算是半合规。
- **`dsh.client.inject` 过度声明**：8 条，实际 bundle 只 require 3 个 baseline；源码注释称 inject「informational only」，与 vendor `client-modules.md:94` 的「factory arrival + composition」不符。
- **49 peers vs 35 个实际引用的 dsh 包**，无 `manifestVersion: 1`，peer 面偏胖。

## 4. 与第四轮的关系

**守住的（复核通过，不要再修）**：Plan Mode 进首屏；决策台账/外部材料路由到 `decisions.md`/`external-research.md`；dev-loop §1 证据先行；tests/README 的 host 行；5%/20% 行预算文字；`shipped-links` 的创门背景（虽然根错了）；`candidate-scan-eval` 语料缺失优雅 exit 2；replay 「不是升 pin 第一道」的措辞；包 README 页签名；D45/D46 顺序；AttentionTab 0%→82.7%、propose 五守卫、host-composition、apply-lifecycle 都真的落地了；真页面 9/9 与错误环。

**新病（v3 / 发行版收口引入）**：R5-01 `standalone` 删除未扫消费者；R5-02 两门禁根未随 `content/` 迁移；R5-03 `_dist` 过期而 verify 绿；R5-11 旧路径散落 7 处；R5-13 市场索引提前声明；D51/D50 顺序；`publish-handoff` 无预算。

**旧病未收**：R5-04 授权截断（R4-02 只修了 `bugs/README`）；R5-05 §13 空壳（R4 之后新写）；R5-09 文本断言（R4 提到，未修）；R5-10 卸载冒烟（R4 未列，新发现）；R5-06 培养壳 0%（R4 的 D5 提到 `CultivationTab` 0%，未修）。

## 5. 建议批次（待 REVIEW 选批）

> 原则：先止血（让绿有意义），再补层次（测试/文档），最后收口发布与体验。每批都要同 diff 证据；不合并成一次大爆炸。

- **A · 真实性止血（keyless，半天）**：R5-01（把 isolated 档改成 `profile init + plugin add <pack dir> + boot`，或彻底删档并改三份索引；优选前者，实测约 +15s）、R5-02（两门禁根改 `content/` + 断言根存在、扫到 ≥1 份）、R5-08（删掉假声明或实现 call 检查）、R5-11（`src/README`、`.gitignore`、`templates.spec` 注释、`markdown-links` 排除项）、R5-21/R5-22 小漂移、`docs/terminology.md` 死路径。完成后 `pnpm verify` + `pnpm test` + `ui-scene-smoke --isolated --golden` 三绿。
- **B · 授权与收尾单家（P1，半天）**：R5-04（门牌/摘要改纯指针，不列边界）、R5-05（7 处引用改指 `policy.md#p5`，删 §13 空壳或改成重定向表）、R5-12（preset 完成定义三份收成 skill 一份）、`AGENTS.md:5` 补收尾指针。需要用户点头改 `_backlog` 制度面。
- **C · 发布单一 readiness（P1，半天）**：R5-03（让 `verify` 的发布面调用 `release --check` 的同一判据，或把 `dist-freshness` 降级为「产物自洽」并在 README 标明；重跑 `--prepare`）、R5-10（`release-smoke` 加 remove → boot → re-add → 数据仍在）、R5-14（compat 台账补 rc.5 或删 README 声明）、R5-13（发布前不把未发布版本写进 served index；staged 语义写进 handoff）。
- **D · 测试层次（P1，2–3 天）**：R5-06（`CultivationTab` happy-dom 渲染 + 抛错路径）、R5-07（`runtime-guard` 表驱动）、R5-09（15 处文本断言改 DOM/props，保留 CSS/token 不变量）、R5-23（拆 929 行 spec 为 adopt/revoke/verify/purge 四族）、R5-15（preset YAML schema keyless 校验）、R5-16（skip 配预期 N 或移出）、R5-27（`CultivationContextPicker` 静态渲染 + 过滤纯函数）、R5-24（lib 测试归区）、R5-26（导出集合钉住）、R5-28/R5-29（mock 白名单登记、fixture emitter 移出 tests）。
- **E · 反馈闭环（P1，1–2 天）**：R5-30（diagnose 匹配未截断文本 + >400 字符失败输出的 spec）、R5-31（客户端错误落盘去掉 `dataBlocked` 门 + 写失败进环；错误环镜像 sessionStorage + `pagehide` flush）、R5-33（`pnpm company` 启动 tee 到 `runtime/web-logs/`）、R5-34（runbook 写明 7 天保留；`--archive-to`）、R5-35（文档给出 composer 选择器或 `@composer` 别名）、R5-36（isolated 证据按 home 落）。
- **F · 渐进披露与库存（P2，1–2 天）**：R5-17（`publish-handoff` + `_backlog/README.md` + `notes/README.md` 补预算；`decisions` 给增长余量）、R5-18（`checks/README.md` 库存段改为生成式或目录指针，改 `script-index` 判据）、R5-19（dev-loop 空壳节收成一张「旧 §N → 新家」重定向表，12 处引用一次改完）、R5-20（`notes-archived-links` 扩到全相对目标；或归档时强制证据副本）、R5-25（`isRecord` 去重、`walk()` 收家）。

**不建议做**：重组 `tests/*`、`checks/gates`、`tools/lib`、`probes/*` 的平铺（D2 子代理给了反证：教义 + 门禁 + 一屏可扫）；拆 `src/client` 目录（39 文件仍在可扫范围）；把 `probe --full` 塞进 `pnpm test`（层次放错）。

## 6. 本轮实跑读数（原样）

```text
pnpm verify                                # ALL PASS 53 门 + 2 SKIP（replay-fixture-freshness / replay-ui-freshness）
pnpm test                                  # 124 files / 1048 tests（1045 pass / 3 skip）/ 31.3s
pnpm typecheck                             # exit 0
npx vitest run --coverage                  # 85.14 stmt / 77.33 branch / 86.10 func / 88.87 line
node checks/smoke/client-load-smoke.mjs    # ALL PASS（零挂载失败 / 零 loader 错误 / 品牌在场）
node checks/smoke/ui-scene-smoke.mjs --keep
                                           # ALL PASS：9/9 页签、console/exceptions/clientErrors 全空、errorRingInstalled=true
node checks/smoke/ui-scene-smoke.mjs --isolated --golden
                                           # exit 2：隔离场景预置失败，MODULE_NOT_FOUND（tools/standalone.mjs 已删）
node checks/smoke/release-smoke.mjs --tarball _dist/... --expect-sha ...
                                           # 39 PASS / 0 FAIL（安装/重装/应用内/首启/二启；无 remove）
node tools/release.mjs --check             # exit 1：pack 源码面已变但 _dist 没重打
npm view dsh-company-pack version          # E404（0.7.1 未发布）
pnpm orient                                # 6 slug / 凭据✓ / 公司盘空 / 3 场景
node tools/diagnose.mjs --strict           # 最新会话 EVENTS total=4 turns=0 FAILURES none
git -C vendor/dsh rev-parse 'dsh-v0.2.1-rc.2^{commit}'
                                           # 687f282e8625c6b8d11ff58211a90524be2e4317（与 pin.mjs/AGENTS 一致）
```

## 7. 本轮没覆盖的

- 真模型认证档（entry-probe / delegation-smoke / probe --full）：成本与授权，未跑。
- 完整 `npm publish` + 远程 market 托管：人工 handoff，未跑。
- Desktop 壳与真实首屏像素级走查（只看了 Web dev 首屏截图）。
- `notes/` 181 篇全量两两比对：只抽样 + `notes-audit`（死路径 2 / 零入链 44 / 取代缺回链 0）。
- 公司业务产物质量与 persona 文案质量：不在卫生范围。
- D6 子代理已回；它没验证到的：待审批/待问询的归因、中断轮的归因、child 会话、team failed（代码路径在 `session-diagnose.mjs:131-175`，dev home 里没有这类会话可证）。

## 8. 打扫后读数（2026-11-03，5 个提交 / 13 篇 Note；checkpoint = 提交 `4512ddf`，之后新增见第五轮卡）

> 口径：同一 dev home、同一 vendor pin；覆盖率 = `npx vitest run --coverage`（v8，仅 keyless 面）。
> 提交链 = `6bd9ef6`（批次 A/E 主体）→ `c78241d`（台账行为断言）→ `eef37a1`（品牌/引用）→ `a0f8668`（发布指路）。

| 面 | 审计时（before） | 现在（after） |
|---|---|---|
| `pnpm test` | 124 spec / 1048 例（1045 pass / 3 skip） | **130 spec / 1067 例（1064 pass / 3 skip）** |
| 总覆盖率 | 85.14 stmt / 77.33 branch | **85.93 stmt / 77.92 branch** |
| `CultivationTab.tsx` | 0.00% stmt（只被注册数组点名） | **93.75% stmt / 50% branch** |
| `CultivationContextPicker.tsx` | 56.45% / 40.81% | **70.96% / 61.22%** |
| `company-tabs.tsx` | 24.07% / 14.54% | **53.70% / 36.36%** |
| `LedgerTab.tsx` | 64.10% / 52.50% | **94.87% / 72.50%** |
| `Brand.tsx` | 0.00% | **100%** |
| `release-smoke` | 39 PASS（无卸载） | **44 PASS**（含 remove → 数据保留 → 重装） |
| `ui-scene-smoke --isolated --golden` | exit 2（独立启动器已删） | **连续两次 ALL PASS（9 页签）** |
| `diagnose` 非零退出 | 597 会话 132 条真非零只报 87 条 | 全文匹配；真会话 `nonzero=2` 与日志一致 |
| `shipped-links` 扫描 | 14 份 skill md（content 17 份零检查） | **content 17 + skill 14 + persona 6** |
| `nav-count-claims` 扫描 | 35 份 | **52 份** |
| 行预算 | 35 行、5 份最大 owner 文档在外 | **40 行**（补 README/backlog/notes/pack README/publish-handoff） |
| `retired-path` 前缀 | 2 条（仅 `_backlog`） | **4 条**（+ `workspace/`、独立启动器） |

**仍未收的**：
- npm publish / HTTPS 市场托管仍人工；`market-index.staged.json` 标记 0.7.2 未发布（发布后删）；
- `docs/decisions.md` 62/62 零头寸（R5-17 剩余面）、`checks/README.md` 手工库存（R5-18）、dev-loop 空壳节（R5-19）、归档链接只查 `.md`（R5-20）；
- 剩余约 13 处源码文本断言（`client-face` 的 toolview 优先级是刻意保留的装配面）。
