---
topic: 仓库卫生
intent: "第三轮 fresh-agent 六维度打扫（2026-10-27）：接续 2026-10-20/21 两轮，复验已修项是否守住、挖这七天新增面的腐化与长期结构债；产出带证据的分级发现与可分批实施的改善清单。"
---

# 第三轮六维度打扫卫生审计（2026-10-27）

> 服务：[卡](../../settled_issues/2026-10-27-repo-hygiene-round3.md)｜上一轮：[第二轮审计](../repo-hygiene/2026-10-20-followup-six-dimension-audit.md)（已随母卡归档）
> 口径：fresh agent 只读评审 + 主 agent 亲跑全部 keyless 车道 + 四个独立子代理深挖（D2 代码结构 / D1+D3 文档层次 / D5 测试资产 / D6 反馈通路）；D4 腐化面由主 agent 自查 + 子代理交叉。
> vendor/dsh 只读；真模型认证档未跑（无 key 成本授权）；浏览器档跑了 client-load-smoke 与活体 cdp-probe。
> **数字基线**：`pnpm verify` 47 门 ALL PASS · `pnpm test` 97 spec / 907 用例全绿 · 代码 11,642 行 · 测试 12,869 行 · 门禁+冒烟 9,791 行 · 工具 7,342 行 · 探针 9,340 行 · 文档 3,069 行 · notes 141 件 / 11,058 行 · 773 commits（近 14 天 209 个）。

## 0. 一句话结论

**系统整体健康且在改善**：上轮 P0–P4 的修复绝大多数守住（回放注入面门禁、diagnose 审批判读、角色名册单一化、act() 清零、composition 提速、九个页签探针），`verify` 与 `test` 全绿、活体页面 9/9 页签零 console 问题。本轮的问题不在"文档说谎"这一层，而在三处：

1. **声明与资产脱钩**——一批"现行证据入口"指向已经不存在的对象（回放场景舰队、UI 金样、判据语料），门禁在"零对象"上照样 PASS，形成**语义真空绿**；
2. **反馈通路的结构性缺口**——agent 能读会话日志、能看固定页签扫页，但**没有一条通路能把一次真实 UI 症状（点某个按钮、某面板空白）捕获下来复现或断言**，客户端错误也根本不进模型可见记录；`diagnose` 还会对"没有收口的 turn"报 `FAILURES none`；
3. **流程自身的双重权威**——收尾有两份互相指认对方为 owner、且顺序相反的清单；缺陷卡自授权边界在指南里被复写并**截断了排除项**（这是本轮唯一"按文档做会做错事"的问题）。

结构层面（D1/D2/D3）不是"平铺噪声"病：代码分层真实、模块深、目录扁平是教义而非事故；病在**入口链的物理形状**（351 行的政策大全在第二跳）与**层表缺一个"政策"档**。

## 1. 本轮怎么测的

**亲跑（全部 keyless，读数见 §6）**：

`pnpm verify` · `pnpm test` · `node checks/smoke/client-load-smoke.mjs` · `pnpm dsh web -- --port 0 --no-open` + `probes/browser-visual/cdp-probe.mjs`（活体 9/9）· `node checks/smoke/replay-smoke.mjs`（默认场景）· `pnpm orient` · `pnpm diagnose` · `node checks/audit/candidate-scan-eval.mjs`（崩，见 R3-17）· `replay-smoke --scenario r2-motion --ui`（崩，见 R3-15）· `tsc -b packages/company-pack`（0.29s，增量）· `node tools/prune-runtime.mjs`（子代理 dry-run）。

**只读深挖（四个子代理，各自带文件:行证据）**：模块图与目录扇出（58 模块 / 143 内部边）· 入口链逐跳计量 · 907 用例分型与覆盖率 · 反馈通道逐件盘点。子代理未查面已在报告内如实标注。

**上轮修复复核**：角色名册单一化守住（`presence-status.ts:51-55` 是唯一事实家）· `gate-wiring` 零孤儿守住 · `act()` 警告已清零 · composition spec 套件 3.6s（上轮 5.9s 单例）· cdp-probe 九页签（含成品/培养/台账）守住 · `use-company-data` 生命周期 spec 存在。

## 2. 六维度分评

### D1 文档与代码清晰度、渐进披露／按需加载 —— 判定：结构真、披露假

**成立的部分**：`docs/AGENTS.md` 的五层表（导航/设计/指南/合同/常驻入口）加"不属于这层"列，是有机械门禁的分层制度；20/27 份文档带"什么时候读"；脚本触发条件住在脚本头注（`script-triggers` 强制），这是全仓最好的文档机制——它**删掉**了一份文档而不是增加。

**不成立的部分**（详见 [子代理 D1 报告] 的 §A/§C，主 agent 已抽验）：

- **入口链 836 行 ≈ 21k tokens，而真正开工只需 35 行**（`docs/guides/dev-loop.md` §0.5+§1）加 `tests/README.md` 的一行映射。比例 ≈ 6.5:1。根因不是内容错，而是**物理颗粒度**：dev-loop 十个章节共 285 行同住一个文件，而 `AGENTS.md:4`、`AGENTS.md:29`、`docs/project-map.md:12` 指向它的三处**都没带 `#anchor`**（`md-links` 已经校验锚点，技能里也已在用锚点写法）。
- **层表缺"政策"档**：授权（§0.5）、门禁升格判据（§9）、自动化上限（§10）、越界写入（§11）、自主协议（§13）都是常设"不许做什么"，却住在指南层；而 `docs/AGENTS.md:16` 又明确"完成定义不属于指南层"——§12 正好违反。
- **行预算棘轮名实不符**：20 份受管文档里 **10 份头寸 <5%**（`release-runbook` 75/75 零头寸、`decisions` 59/60、`presets` 195/198、`testing` 72/75、`demo` 229/237、`dev-loop` 351/367…），同时有文件空置 20–45%（`web-rpc` 26/47、`workspace/AGENTS.md` 156/190）；链上 334 行（`project-map` 94 + `tests/README.md` 47 + `checks/README.md` 193）**根本没有预算**。门禁只能向上红，看不见空置——"顶格 = 饱和信号"因此永久常亮。
- **`checks/README.md` 193 行是索引 + 成本表 + 政策页三合一**，而 `script-index` 门禁强制它随每个脚本增长；其头注说"成本以脚本头注为唯一家"，正文却逐条复述 `~30s/~1min`。
- **四个路由器**（`AGENTS.md:4` / `docs/project-map.md:7-20` / `docs/index.md:51-60` / `README.md:8-19`）都在回答"从哪开始"；而管文档分层的那条规则（`docs/AGENTS.md`）**不在入口线上**，要走 3 跳。

### D2 代码与测试的层次 —— 判定：罕见地干净；真正的缺口是"没人守"

**真分层**（子代理全量模块图）：`client→lib` 38 条、`host→lib` 4 条、`index→{lib,host}` 11 条，**跨层反向边为 0**；`lib` 是纯叶依赖、被双编译面共享（vendor 教义）。58 个模块、143 条内部边、0 个无测试可达模块。目录扇出判读：`checks/gates` 48 个平铺是**机器强制的约定**（`gate-wiring` 零孤儿，平均 31 行/门）；`tests/*` 32/28/36 平铺是 D28 教义且有 `nav-enumeration` 门禁；`tools/lib` 40、`probes/*` 11–17 的分簇只有 2–3 个文件，分组是纯 churn。**不建议重组这些目录。**

**但**：

- **分层没有任何默认回路在守**：`package.json` 没有 `build`/`typecheck` 脚本，`verify` 47 门无 `tsc`，`test` 是裸 vitest。今天图的干净只由 `tsconfig` 的 include 保证——往 client 面板里 `import` 一个 `host/` 模块，`pnpm verify && pnpm test` 全绿，到构建才炸（TS6307）。这是本轮 D2 的头号项。
- **三个巨型函数**（不是巨型文件）：`CultivationBoard` 482 行且**零段注释**；`index.ts` 的 `apply` 425 行（五段注释，但盘守卫一段就 209 行）；`cultivationCommandHandler` 340 行零段注释。其余 >300 行文件都已按导出/纯数据分解，不是问题。
- **一个三元环**：`lib/cultivation.ts` 既是 barrel（`export *` ×3）又定义 `CULTIVATION_ROLES`；`lib/cultivation-context.ts` 反向 import 它。今天只靠函数体内延迟解引用不炸（潜伏，不是活故障）。
- **重复小工具无家**：`canonicalPath` 逐字 4 份、`isRecord` 3 份、`lstatOrNull` 2 份、`clip` 3 份且签名各异（改一个以为全改了 = 真陷阱）。纯逻辑可进 `lib/`，带 `node:fs` 的只能进 `host/`（否则 client 叶 TS2591——已实证过的坑）。
- 测试侧的层次问题不在目录，在**四个单 `it` 巨测**（263/120/108/84 行，失败只报一个不透明名字）、**同名 spec**（`deliverables-catalog.spec.ts` 在两区各一）与**一个放错区的纯 lib 测**（`tests/client/cultivation-context.spec.ts`）。

### D3 文档／执行／验收的整体结构 —— 判定：过度结构，不是不足

**四条链（挂得上/行为对/装得上/已获批）+ 六行回执 + 五个完成定义 skill** 的结构是清晰的，且比上轮更一致。问题集中在两处**双重权威**：

- **两份收尾清单，顺序相反，互指对方为 owner**：`docs/guides/dev-loop.md:296-306` 的顺序是「收割→对照授权→语义审→revert→关闭→回执」，`.agents/skills/close-out-definition/SKILL.md:20-35` 的顺序是「对照授权→四链→语义审→收割→指针→revert→回执→verify/test」。§12 称自己是"收尾动作清单"（:296），skill 称"规则唯一家 = §12/§13，本 skill 只管次序"（:8-9）；而 **dev-loop 从不链接这个 skill**（全仓 grep 只在它自己的 description 里出现）。skill 还把 `verify`/`test` 放在回执**之后**。
- **授权边界被复述且截断**（本轮唯一"照做会做错"项）：`AGENTS.md:29` 同时点名两个 owner（dev-loop §0.5 与 `_backlog` 章程）；`docs/guides/dev-loop.md:35` 说"规则唯一家 = _backlog 章程"，然后自己把规则缩写成"限 P1/P2 修复型"，**丢掉了 `_backlog/README.md:86` 的排除项**——P0、或触碰章程/常设指令/docs 合同/company-pack 公开行为/已记录决定时**不自授权**。一个按 `AGENTS.md:29` 路由到指南的 agent，会以为改 docs 合同也能自助。
- 验收链实际有 9 步（§0.5→§1→tests/README→§9.1→§12→close-out skill→§13→三个领域 skill→testing §3），没有任何一张图把它们串起来；四不等式在 `docs/orient.md` 里的措辞已经漂成"批得下"（原文"已获批"）。

### D4 上下文腐化与偏移 —— 判定：点状复发，主形态从「文档说谎」变成「声明与资产脱钩」

上轮的判断是"腐化主形态转为检索层退化 + 常驻层饱和"；本轮观察到新形态：**入口还在，对象没了**。

- **回放舰队撤空，但活跃面仍把它当现行**：`snapshots/replay` 只剩一个 headless 合成场景（`foundation-workspace`，其 `snapshot.yml` 自述"产品仓唯一合成场景"）。而 r2-motion / r3-delegation 在活跃树被引用 **43 处**，其中至少 10 处是**指令性**的：`checks/smoke/replay-smoke.mjs` 头注（"何时跑…r3 ~15s / r2 五会话 ~80–100s"、`--ui` 说明）、`checks/smoke/client-load-smoke.mjs:14`、`docs/guides/dev-loop.md:227`、`docs/testing.md:15`、`docs/guides/cdp-probe.md:59`、`tools/snapshot-motion.mjs`（默认输出 `r2-motion`，:10/:28）、`tests/harness/repository-layout.spec.ts` 的示例名。**最刺眼的是 `docs/design/ui-demo.md:132-133`**：同一张表里 v1 行已写"UI 端到端断言已随真实 snapshots 移出产品仓而退役"，v3/v4 行却仍把 `replay-smoke --ui`（r3 金样 / r2 端到端）列为验收证据。
- **语义真空绿**：`replay-fixture-freshness` 输出 `×0 场景`（唯一 runnable 是 headless，按设计跳过注入面比对）；`replay-ui-freshness` 在**盘上 0 个 `ui.expected.md`** 的情况下 PASS。门禁把"没有对象"和"检查通过"渲染成同一个词。
- **声明资产不存在**：`docs/testing.md:62` 与 `checks/audit/candidate-scan-eval.mjs:20` 都指向 `snapshots/corpora/candidate-scan-corpus/`；盘上 `snapshots/` 下只有 `replay/`。实测该脚本 **ENOENT 崩栈、exit 1**（不是优雅报"语料缺失"），因此"行为质量档"只剩真模型 `probe --full` 一条腿。
- **升 pin 的“第一道回归网”已名存实亡（最重的一条）**：`docs/release.md:123-125` 仍写“语料回放全绿 = vendor 换 tag 后先跑 `checks/smoke/replay-smoke.mjs`（r2/r3 会话判据 + foundation workspace oracle）…replay = 升 pin 回归网第一道”，并列出“已知漂移红（r3 ×2 / foundation ×3）”。现实是：r2/r3 已不在盘上，foundation 是 authored 合成场景且我实跑全绿；`docs/guides/dev-loop.md:133` 与 `docs/testing.md:62` 的同一句也指向已不存在的语料。**升 pin 程序会拿一个不加载本包的合成回放当“全绿”证据。**
- **计数与事实漂移**：`packages/company-pack/README.md:23` 写"公司视图与**五个页签**"——注册面实际 9 个（`company-tab-registration.ts` 九个 `id:`，cdp-probe 活体也验到 9 个）。`nav-count-claims` 门禁的扫描面是 `docs/** + AGENTS.md + README.md`，**不含包 README**，所以这条活到了收货人文档里。同类：`tests/harness/entry-probe.spec.ts:13` 的 Q4 旧标准答案仍是 `dsh-v0.1.7-rc.2`（现行 pin 是 `dsh-v0.2.1-rc.2`），而判据 `tools/lib/entry-probe.mjs:6` 只匹配 `/dsh-v\d+\.\d+/`——这个"入口链新鲜度"探针抓不到版本腐化；`checks/gates/doc-budget.mjs` 第 13-15 行刚写"注释里不要复述当前行数"，随后三处"内容 N"已过期（64/59/351 写成 60/55/348）。
- **同文件内重复**：`docs/data-model.md` 把"面板摘要全扫 + open/最近 120 全文"写了三次（:15 表格、:67、:70——后两条几乎逐字重复）。
- **归档指针失效**：`docs/demo.md` 在 :68/:152/:171/:228 引 `snapshots/archive/...` 四个路径，盘上都不存在；:68 还把合成的 `foundation-workspace` 称作一场真实动议的"归档"。
- **设计层标签过期**：`docs/design/architecture.md:273` "（0.1.7 模型）"、`docs/design/roles-isolation.md:130` "（0.1.7 现状）"、`docs/design/ui-demo.md` 多处——机制在 rc.2 下仍成立（子代理回查 vendor 确认），但"现状"写在旧版本号上，读者无法判断。
- **探针默认值失效**：六个面板探针（attention/presence/tasks/budget/deliverables/…）默认会话标题 `动议观察 · 23684`，dev home 里不存在（grep 零命中），按头注跑会得到栈而不是截图。

### D5 测试资产的组织、测点、覆盖与类型 —— 判定：诚实、覆盖偏上，但重心偏在仓库自身

**好的一面必须说清楚**：零 `toMatchSnapshot`、仅两处白名单 mock、86 处 `BUG-nnn` 守卫引用、"负例留证"红绿配方真实存在；temp-dir 真文件集成 22 个 spec（含回滚/碰撞/symlink 不跟随）；静态渲染 14 个文件 83 例；happy-dom 交互 6 个文件 55 例；whole-client 真 fiber 3 例。总体行覆盖 84.17%（v8，仅 keyless lane）。所有产品模块都从 spec 可达（0 个孤儿模块）。

**问题**：

- **重心偏斜**：448/907（49.4%）是仓库/工具不变量（harness 297 + company 区里 151 个工具库测），真正断言已发布行为的约 410；最弱形态是 `tests/harness/collaboration-probe-verdict.spec.ts` —— 切探针源码字符串再 `runInNewContext` 求值，**改格式就红、没有行为变化**。
- **用户实际接触的那层最薄**：`client/index.ts` 行覆盖 53.8% / **分支 10.5%**（待办观察者 `user-questions/request`、`approval/request` 从未在测试里执行）；`company-tabs.tsx` 18.2%/7.3%；`AttentionTab.tsx` 4.9%/**0%**；`CompanyView.tsx` 20.8%/21.1%；`CultivationTab` 无渲染测试（仅注册面触达）；`PresencePanel`/`BudgetPanel` **没有任何渲染测试**（`grep` tests 零命中）。也就是说：一个永远空的「待办」收件箱、一个渲染即空白的面板，907 例全绿。
- **host 没有真组合测试**：`apply()` 只用 stub ctx 调（`catalog-wiring.spec.ts:52-64`），`host/index.ts` 行 70% 但**函数 37.5%**——`ctx.inject(['sessionQuery'])` 回扫、`ctx.effect` 清理、dispose 后事件不再写、double-apply 都不在覆盖里。client 有 whole-client 档，host 没有对应物。
- **治理守卫未测**：`host/cultivation.ts:657-685` 的五条 propose 守卫（目标角色不在名册 / 跨角色 correct / 对自己 suggest / 非法 kind / dataBlocked）零用例，分支覆盖 68.6%——而"一个角色不能往另一个角色记录里塞纠错"正是产品卖点里的不变量。
- **空转/条件跳**：`tests/company/ledger.spec.ts:43` 的 `describe.skipIf(!hasLive)` 在 fresh clone 上跳过 3 例（907→904），与 `docs/testing.md` §3.6 "现状零 skip，引入须配预期 N 守卫"直接矛盾。
- **源码文本断言承重**：`client-face.spec.ts` 11 个 `toMatch` 打在 `.tsx` 源码上、`panel-freshness.spec.ts:56-68` 断言字面量 `refreshLabel = '投影更新'`——格式/改名重构即红，最容易诱发"改测试凑绿"。
- **夹具无出处机制**：`tests/fixtures/` 四个夹具全是 10-25 之后的合成物（session.jsonl 2 行、`cwd: /synthetic/...`、占位 digest），没有 provenance 字段或新鲜度门禁；`deliverables-audit.spec.ts:91` 仍叫它"R1 归档 oracle"。

### D6 反馈通路（日志、端到端真页面、症状还原） —— 判定：设计成体系，闭环缺两格

**通的（本轮亲测）**：

- 会话日志链路：`pnpm orient`（home/凭据/5 个 slug/公司盘/待核候选/run trace 四件套）秒级可读；`pnpm diagnose` 能定位到具体 session 并读 `session.v4.jsonl.zstd`。
- 真页面链路：`client-load-smoke` ALL PASS（真浏览器零挂载失败）；活体 `cdp-probe` 对真起实例 **9/9 页签全开、面板体可见非空、console 零错误零异常**（我今晚实跑，非引用）。
- 回放链路：默认 `replay-smoke` ALL PASS（2s，合成场景，工作区树 + 归一化日志 + sidecar 三条判据都真跑）。
- 失败现场：cdp-probe / client-load / replay 都会把 verdict/console/body/截图落 `runtime/harness-home/diagnosis/`。

**不通的**：

- **唯一能断言"页面里该出现什么"的 lane 不可达**：`replay-smoke --ui` 只对 r3/r2 白名单开放，而这两个场景已不在盘上。实测 `--scenario r2-motion --ui` → `Error: Snapshot scene r2-motion: not found`，**裸栈、exit 1、无现场**。四份文档仍在推荐它（见 R3-15）。这意味着：**UI 症状无法"录一次、反复复现"**——没有 DOM 快照、没有步骤脚本、没有逐步截图、没有 `--record-ui`。
- **客户端错误不进模型可见记录**：console/pageerror 的捕获只存在于探针进程内，且**只在失败时写盘**；host 侧没有事件类型承载浏览器错误（grep 无）。所以用户说"我点这个面板白了"，agent 在会话日志里零信息——这违反 `dev-loop:82` 自己写的 "model-visible ⟺ logged"。
- **`diagnose` 假绿**：它只数 `turn/end`；一个被杀/中断的 turn（有 `turn/start` 无 `turn/end`）会渲染成 `EVENTS total=15 turns=0 ... FAILURES none` 且 **退出码永远 0**（我实跑到的正是这行）。它也不列成功的工具调用、没有 `--tool/--since/--grep`、不汇总 team/child。
- **成功不留证**：cdp-probe / client-load / replay-ui 都只在失败时截图。"跑给我看看它长什么样"目前只能给 JSON verdict。
- **症状→动作表没有 UI 行**：`docs/guides/budget-and-ops.md §3` 13 行全是手册注入、工作区过滤、EADDRINUSE、token 轮换、team 控制；没有"面板空白 / console 报错 / 页签打不开"一行，也不指向 `diagnose` 或诊断目录。skill 却把它当作现场 runbook。
- **cdp-probe 把"未登录"判成"坏页面"**：盘上 2026-10-26 的证据 `composerReady:false`、`0/9` 页签，body 实际是 "Add API Key / Sign in"；stdout verdict 无 `reason`，原因只在 `body.txt`。任何没配凭据的 home 都会看起来像 client 挂了。
- **证据发现性与寿命**：失败现场只能从失败 stdout 看到路径，7 天被 `prune-runtime` 删；`runtime/web-logs/` 只有 164 字节的手抄 banner；`pnpm dsh web` 的 stderr 从不落盘——启动/挂载失败随终端一起消失。

## 3. 分级发现清单

> P0 = 反馈/证据会骗人；P1 = 照文档做会做错事或没有回归网；P2 = 显著噪声/成本；P3 = 卫生。编号 R3-nn 供批次与后续 Note 引用。

| # | 维 | 级 | 发现（证据） |
|---|---|---|---|
| R3-01 | D2 | P0 | 分层无默认守卫：无 `typecheck`/`build` 脚本，verify 无 `tsc`，test 裸 vitest；client→host 非法边在两命令下全绿（`package.json:scripts`、`checks/run-gates.mjs`、模块图 0 反向边） |
| R3-02 | D6 | P0 | `diagnose` 对无 `turn/end` 的中断 turn 报 `FAILURES none` 且恒 exit 0（实跑 `EVENTS total=15 turns=0`；判据见 `tools/lib/session-diagnose.mjs:76-86`） |
| R3-03 | D6 | P0 | 客户端错误从不进模型可见记录；console/pageerror 只在探针进程且仅失败落盘（`tools/drivers/cdp-driver.mjs:107-114`；无 host 事件类型） |
| R3-04 | D6 | P0 | UI 症状不可复现：`replay-smoke --ui` 仅 r3/r2 白名单，两场景已不在盘上（实测裸栈 exit 1；`checks/smoke/replay-smoke.mjs:782`） |
| R3-05 | D4/D5 | P0 | 声明资产不存在：`snapshots/corpora/candidate-scan-corpus/` 缺失，而 `docs/testing.md:62` 与 `checks/audit/candidate-scan-eval.mjs:20` 指向它（实跑 ENOENT 崩栈 exit 1） |
| R3-06 | D4 | P1 | 语义真空绿：`replay-fixture-freshness ×0 场景`、`replay-ui-freshness` 在 0 个金样上 PASS（verify 输出；`checks/gates/replay-ui-freshness.mjs:19-24`） |
| R3-07 | D3 | P1 | 授权边界被复述且截断：`docs/guides/dev-loop.md:35` 丢 `_backlog/README.md:86` 的排除项；`AGENTS.md:29` 点名两个 owner |
| R3-08 | D3 | P1 | 两份收尾清单顺序相反、互指 owner，且指南不链 skill（`dev-loop.md:296-306` vs `SKILL.md:8,20-35`） |
| R3-09 | D4 | P1 | r2/r3 指令性残留 10+ 处；`docs/design/ui-demo.md:132-133` 同表内自相矛盾（v1 说已退役、v3v4 当验收） |
| R3-10 | D5 | P1 | 客户端连接层最薄：`client/index.ts` 分支 10.5%、`AttentionTab` 0%、两面板零渲染测试；空待办/白面板可全绿 |
| R3-11 | D5 | P1 | host 无真组合测试：`apply()` 只 stub ctx；`host/index.ts` 函数覆盖 37.5%，dispose/double-apply/inject 未测 |
| R3-12 | D5 | P1 | 治理守卫未测：propose 五条守卫零用例（`host/cultivation.ts:657-685`，分支 68.6%） |
| R3-13 | D5 | P2 | 测试重心偏斜 49.4% 仓库不变量；最弱形态 = 切探针源码 vm 求值（`collaboration-probe-verdict.spec.ts:16-24`） |
| R3-14 | D5 | P2 | `describe.skipIf(!hasLive)` 与"零 skip"政策矛盾（`tests/company/ledger.spec.ts:43`；907 vs fresh clone 904） |
| R3-15 | D4 | P2 | 计数/事实漂移：包 README "五个页签"（实际 9，门禁不扫包 README）；entry-probe Q4 仍答 0.1.7 且判据抓不到；doc-budget 注释三处"内容 N"过期 |
| R3-16 | D4 | P2 | `docs/data-model.md` 同一规则写 3 次（:15/:67/:70）；`docs/demo.md` 引 4 个不存在的 `snapshots/archive/...`（:68/:152/:171/:228），并把合成场景称作真实归档 |
| R3-17 | D1 | P2 | 行预算棘轮失真：10/20 文件头寸 <5%、反向空置 20–45%、链上 334 行无预算（`checks/gates/doc-budget.mjs` 表 vs 实跑） |
| R3-18 | D1 | P2 | 入口链 836 行 ≈21k tokens，开工只需 35 行；三处热链无 `#anchor`（`AGENTS.md:4,29`、`docs/project-map.md:12`） |
| R3-19 | D1 | P2 | 无"政策"层，授权/门禁升格/自动化上限/越界/自主协议都住在指南（`docs/guides/dev-loop.md` 285 行）；`docs/AGENTS.md:16` 自身禁止"完成定义进指南" |
| R3-20 | D1 | P2 | `checks/README.md` 193 行三合一，且 `script-index` 强制随脚本增长；正文复述头注成本 |
| R3-21 | D2 | P2 | 三个巨型函数：`CultivationBoard` 482 行零段注释、`apply` 425 行、`cultivationCommandHandler` 340 行 |
| R3-22 | D2 | P3 | lib 三元环（barrel 兼定义点）；重复小工具 4/3/2/3 份；四个单 it 巨测；同名 spec；一个放错区的 spec |
| R3-23 | D6 | P2 | cdp-probe 把未登录判成渲染失败（盘上 2026-10-26 证据）；成功不落图；`cdp-probe.md:14` 选择器名过期 |
| R3-24 | D6 | P2 | 症状→动作表无 UI 行；证据 7 天被 prune、web stderr 不落盘、`web-logs` 仅手抄 banner |
| R3-25 | D1/D2 | P3 | 设计层"0.1.7 现状"标签过期、`architecture.md:284-287` 保留已撤回开放点；`src/client` 30 文件平铺（建议 >40 再拆）；六个面板探针默认会话标题失效 |
| R3-26 | D4/D5/D6 | P1 | 升 pin 回归网名存实亡：`docs/release.md:123-125` 仍以 r2/r3 + foundation 作“replay = 第一道”，并记“已知漂移红 r3 ×2 / foundation ×3”；r2/r3 已撤、foundation 实跑全绿且不加载本包；`dev-loop.md:133`/`testing.md:62` 同指失效语料 |

## 4. 建议批次（待 REVIEW 选批）

- **A · 真实性止血（keyless，1 天内）**：R3-05/06/09/15/16/26 → 清掉不存在的声明与指令性残留；让"零对象"的门禁输出改成可辨识的 `NO-SUBJECTS`（而不是 PASS）；`candidate-scan-eval` 语料缺失时优雅退出 2；修包 README 页签数、entry-probe Q4 从 pin 派生、doc-budget 注释去数字、data-model 去重、demo 归档指针。R3-23/24 的文档面同批。
- **B · 语义边界与收尾单一化（P1，半天）**：R3-07 授权规则一处家（删指南里的缩写）；R3-08 收尾只留一份有序清单（skill 顾次序、§12 只留指南独有的三件并链接 skill），verify/test 提到回执之前。
- **C · 回归网补强（P0/P1，2–3 天）**：R3-01 加 `src-layering` 门禁 + `pnpm typecheck`；R3-02 diagnose 中断检测 + `--strict`；R3-04 二选一（合成 web 场景 + `--ui` 放开，或彻底撤掉 `--ui` 并从文档删除）；R3-10 客户端页签/待办渲染 spec；R3-11 host 真组合 spec；R3-12 propose 守卫表驱动 spec；R3-03 客户端错误落一条可选通路（先做"探针成功也落 verdict"这一最小格）。
- **D · 渐进披露与结构收拢（P2/P3，2 天，可后置）**：R3-17/18/19/20/21/22/25 —— 立政策层并给 dev-loop 减到 ≤150 行、预算双向棘轮 + 链上补预算、checks/README 压到 ≤100 行、三个巨型函数按已存在的注释/导出缝拆、lib 环与重复工具收家。

**不建议做的**：重组 `tests/*`、`checks/gates`、`tools/lib`、`probes/*` 的平铺结构（子代理给了反证：教义 + 门禁 + 一屏可扫，重组只增跳数）；给 `src/client` 立刻拆子目录（等 >40 文件）。

## 5. 健康面（别动）

- `docs/AGENTS.md`（55 行，管形状不管事实，"不属于这层"列有门禁）是全仓分层最好的文件。
- 脚本头注承载"何时跑/成本/状态"（`script-triggers`/`script-status` 强制）：删掉了一份文档而不是增加一份。
- 反枚举门禁族（`nav-enumeration` / `nav-count-claims` / `doc-taxonomy` / `script-index`）真的在拦"清单/计数漂移"；每门都带真实的红→绿记录（含 `ledger-routing` 的恒假分支、`doc-budget` 抛异常打断整个 run-gates 这类机制级负例）。
- 测试的红证文化：86 个 `BUG-nnn` 守卫、`guard-red-record` 门禁强制对到事故卡 + 红配方。
- 四件套自动化（orient/diagnose/prune-runtime/converge）都真实可跑，`orient` 的"待核工作候选"与 run trace 视图是本仓最有价值的反馈面之一。

## 6. 本轮实跑读数（原样摘录）

```text
pnpm verify                                       # ALL PASS 47 门（gate-wiring ×47）
pnpm test                                         # 97 files / 907 tests passed / 7.39s（Tests 6.40s）
node checks/smoke/client-load-smoke.mjs           # ALL PASS（真浏览器：零挂载失败 / 零 loader 错误 / 品牌在场）
pnpm dsh web -- --port 0 --no-open                # banner: http://127.0.0.1:65383/?token=…
node probes/browser-visual/cdp-probe.mjs <url>    # 9/9 页签、panel 非空、consoleProblems=[] exceptions=[] exit 0
node checks/smoke/replay-smoke.mjs                # ALL PASS（foundation-workspace，2s，工作区树+日志+sidecar）
pnpm orient                                       # 5 slug / 凭据✓ / 公司盘 6 交付物 / snapshots 1 场景
pnpm diagnose                                     # EVENTS total=15 turns=0 FAILURES none（= R3-02 的现场）
node checks/audit/candidate-scan-eval.mjs         # ENOENT 崩栈 exit 1（= R3-05 的现场）
replay-smoke --scenario r2-motion --ui            # Error: Snapshot scene r2-motion: not found（= R3-04 的现场）
node ./node_modules/typescript/bin/tsc -b packages/company-pack   # 0.29s，增量 0 错
du -sh runtime                                    # 1.3G（harness-home 708M / pw-browsers 298M / backups 276M）
git status --porcelain                            # 评审零足迹（审计产物除外）
```

## 7. 本轮没覆盖的

- 真模型认证档（entry-probe / delegation-smoke / probe --full）：成本与授权，未跑。
- vendor/dsh 内部机制与升 pin 面：只读引用，未重校。
- 公司业务产物质量（deliverables 内容）与 preset persona 文案质量：不在卫生范围。
- D4 的 notes 全量两两比对：只做主题抽样（决策台账 48 个 D 号抽样 6 个、近 7 天新 Note 4 篇通读、CHANGELOG 0.3.14 三条声明回代码抽验——均成立）。
- 第五个子代理（腐化面全量）运行超时被中止；D4 由主 agent 自查 + 文档/测试两个子代理交叉覆盖，未做 notes 全树逐篇比对。
