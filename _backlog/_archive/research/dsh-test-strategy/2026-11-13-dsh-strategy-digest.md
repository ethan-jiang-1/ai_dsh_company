---
topic: DSH 测试策略全貌（思想 / 分层 / 分布 / 防漏 / 决策 / 所有权 / CI / 可靠性 / 机制）
intent: 把 `_digested/test-strategy` 16 篇的承载性结论压成一张可对账的地图，供本仓差距分析与借鉴取舍引用；一手核对见同题 vendor 核对材料。
---

# DSH 测试策略全貌：一份 55 行宪法 + 一套让绿有意义的机器

> 口径：DSH 侧事实锚定 vendor 钉住版（tag `dsh-v0.2.1-rc.5`）；数字来自 `_digested/test-strategy` 消化树（外部研究树，不链接），
> 本节标注「口径」处说明哪些是精确值、哪些是可复现的近似值。消化树本身未写基线 commit——跨篇比较时以 vendor 钉住版为准。
> 分类：**【硬】** = 有源码/配置文件可核对；**【解】** = 消化树对本仓的解释（不是 DSH 成文）。

> **口径偏差（引用前必读）**：本页的数字已与 vendor 钉住版逐条对过，详见[一手核对](2026-11-13-vendor-source-verification.md)。
> 三处会改变措辞的地方：① 覆盖率豁免理由是**分组**给的（91 条 exclude / 约 23 个注释块），不是逐条各写一条；
> ② `snapshots/AGENTS.md` 是 8 个自然段、**没有编号规则**，"七条"是消化者的切分；
> ③ `skipped` 判红只属于 `ci.yml` 的必需 job；`e2e.yml` 的 job 级跳过在 GitHub 上报告为成功——"preflight 硬失败"成立，但不能外推成"e2e 也 skipped 判红"。

## 0. 一句话

DSH 有 **2,150 个 spec 文件 / 约 2.78 万条单测用例**，测试政策却只有 **55 行**；整份政策的定语是
"the rules that keep a green suite meaningful"（让绿有意义）——**规则的目的不是让测试变多，是让"绿"不撒谎**。

它不讲测试金字塔，讲三件事：资产怎么分布、怎么保证不漏、一次变更该配什么证据才算够。

## 1. 层：不是 unit/integration/e2e，是「证据形态 × 入口真实性」

【硬】`vendor/dsh/docs/testing.md` 的 Tiers 节定义 7 个宪法层；层与层的区分不是"大小"，而是
**证据形态**（组装转录？外部世界？built 产物？浏览器？预算数字？）与**入口真实性**（src 就近？真 Loader？shipped profile？built lib？）。

| 层 | 证据是什么 | 谁选中它 |
|---|---|---|
| Unit | 就近行为 spec（进程内真 Cordis 组合 + 只 mock 最外层） | `vitest.config.ts` |
| Coverage gate | per-file 100%，死代码探测器 | `test:coverage` |
| Real-API e2e | 真 provider + 真进程，无 key 自跳过 | `vitest.e2e.config.ts` |
| Owner-local expected | 无录制往返的组装后进程期望 | `vitest.expected.config.ts` |
| Benchmarks | 用户路径预算 + 预算常量自身的校准测试 | `vitest.bench.config.ts` |
| Snapshot | 录制会话回放：**组装转录**这一证据形态的唯一来源 | `vitest.snapshot.config.ts` |
| Web browser snapshot | 真 Chromium/WebKit 的 UI/ARIA 证据 | `vitest.web.config.ts` |

【硬】**后缀即层**：一个测试属于哪条 lane，由「文件名后缀 + 目录」唯一决定，8 份根配置各自认领、include/exclude 互斥
（`*.spec.ts` / `*.e2e.ts` / `*.expected.e2e.ts` / `*.snapshot.ts` / `*.perf.ts` / `*.stress.ts` / `*.bench.ts`）。
所以"有一份测试没人跑"很难发生：新造后缀必须同时改配置，否则不会被任何 lane 选中。

【硬】"integration test" 这个词在 DSH 文档里几乎不存在；它被拆成三种入口真实性递增的证据：
REAL-composition（真 Loader 读 test-only `cordis.yml`）、profile 集成（shipped profile）、built smokes（built `lib/` + plain node）。
三者共同的前提：**手搭 `ctx.plugin(...)` 不算组装证据**。

## 2. 分布：宽底窄塔尖，昂贵层按「失败类」计数

【硬，口径】unit 占 **95.67%** 用例；昂贵层合计约 4.32%：e2e 车道 303 条、web e2e 613 条、snapshot 250 场景、expected 90 条。
文件数：2,150 spec / 110 e2e / 250 场景 / 10 benchmark；`snapshots/` 1,682 文件（1,675 常 + 7 symlink）。【解】这个分布由三条成文规则**推出来**，不是估出来的：

1. **per-file 100% 覆盖率**（底宽）——未覆盖行往往是死代码，门禁逼你删，不是逼你补测试；
2. **模型/协议/人可见变更必须同 PR 加强制快照**（塔尖的形状）；
3. **product-visible 插件必须有 REAL composition**（每种产品面至少一条真入口）。

【解】昂贵层数量按**失败类**计，不按功能数计：343 个包、上百工具只配 303 条 e2e，差额是"进程内就能看见的失败类"。
e2e 文件平均 2.8 条用例 / unit 平均 13 条——用文件数估成本会低估一个数量级。

**代价（诚实）**：这不是免费的形状。2.7 万条用例 + 250 场景 + 9 个必需 CI job 是一个模型厂自研仓库的规模；
【硬】with-key 政策那一节的第一句就是 "We are DeepSeek — do not ration real-API tests."——推理成本内部化是它的前提。

## 3. 防漏：把"漏"降解成可见的红灯、显式豁免、可见跳过

【解，框架】六面 + 一回路，每个面有机械载体；少一面就有一种漏法能穿过其余五面：

| # | 机制 | 把哪种漏变成什么 | 载体 |
|---|---|---|---|
| M1 | 空间完备 | "有测试没人跑" → 后缀穷尽，新后缀必须改配置 | 8 份根 vitest 配置 |
| M2 | 执行下限 | "这行没测" → per-file 100% 红；不可达 → 豁免账本带理由与移除条件（实测 91 条豁免 / 约 23 个理由块，**分组**给理由） | `vitest.config.ts` |
| M3 | 变更类触发 | "忘了测这类" → 规则不允许（快照/REAL composition/HMR-safety/负控） | `docs/testing.md` + 各层 `AGENTS.md` |
| M4 | 真实入口 | "测了个假货" → hand-mount 明确不算；发布物走 built lib + plain node | 同上 |
| M5 | 反自报 | "agent 说成功" → 不算；重跑命令、重读文件、未改动文件逐字节相同 | 同上 |
| M6 | 跳过可见 | "静默 skip" → 红：必需 job 的 skipped 判失败；缺 secret preflight 硬失败 | `ci.yml` / `e2e.yml` |
| M7 | 复盘回路 | "同类复发" → 每次真漏换来一条新守卫，政策随事故成长 | 4 篇 postmortem + 18 篇 testing Note（每篇 en/zh/i18n 三文件，目录共 54 个文件） |

其中最关键的一条实证（postmortem 0001）：**178 个绿单测 + 100% 行覆盖率，产品在真实编辑器连接瞬间崩溃**。
两个 bug 都藏在"测试不会触及的插件真实加载路径"上。结论不是"多写测试"，而是"覆盖率只证明行被执行，
不证明产品被组装成那个样子"。

## 4. 决策：变更 → 最便宜但看得见的那层 → 证明会红 → 验世界 → 判七问

【解，程序】五步：**分类 → 选层 → prove-it-red → 验证世界 → 判够 + 记账**。
分类表按「失败类」列 12 行（纯逻辑 / 服务注册表 / 导出形态 / 工具定义 / 模型可见文本 / 会话持久化 /
provider adapter / 子进程沙箱 / client UI / 配置组合 / 性能 / 文档），每行给"最低层证据 + 组装层证据 + 反例"。

选层顺序（第一个"是"就是最低层）：静态门 → 进程内 unit → REAL composition → snapshot（优先，keyless）→ with-key e2e → 浏览器 → 真 OS 资源 → benchmark。
关键区分：**"最便宜" ≠ "选最低层"**——失败类只能在高一层出现时，低一层再便宜也叫没测到。

「够了」七问：会在目标回归上变红吗 / 来自真实入口吗 / 验的是世界吗 / 可见输出被钉住了吗 /
在该类变更的最低层吗 / 跳过是可见空缺吗 / 并发与 teardown 下可重复吗。

账本五列：**证据 | 层 | 覆盖的失败类 | 负控（见过红）| CI**，并有专门一行 **「显式未覆盖」**——
"把漏变成登记过、可追踪的缺口，而不是藏在作者脑子里的空白"。

【硬】选层的第一步不是"读 diff 猜范围"，而是一份**变更范围报告**：`scripts/change-scope.ts`（`pnpm run change-scope`）
输出 versioned JSON，分别列 committed（相对解析出的 merge base）/ staged / unstaged / untracked 四组路径。
合同三条：**绝不猜 base、绝不 fetch**（base ref 由人给并核对）；base 合并后要**重跑报告、重判受影响行为、只重跑被这次合并作废的检查**。
这是"按面选证据"里"面"的可复现来源——没有它，"最小证据"就退化成每人自己 `git diff` 一遍。

## 5. 规矩住哪：三个载体，按"谁什么时候需要看到"分

【硬】DSH 的测试规矩不在一个文件里：

| 载体 | 内容 | 为什么在这 |
|---|---|---|
| root `AGENTS.md` 常备条令 | 每 session 都要在上下文的 1–3 行条款 | 上下文经济：常驻只放必须记得的，其余按需加载 |
| `snapshots/AGENTS.md` 所有权契约 | 入口唯一、世代、input 禁令、规范化、workspace 证据 | 只对碰快照的人相关 |
| `.agents/skills/dsh-pre-push-checks/` 流程技能 | 推送前选哪些检查 | 局部决策，按需加载 |
| `.agents/skills/dsh-ci-test-reliability/` | 并发/资源/flake | 同上 |

常备条令里最硬的三条：**"Never default to the full suite"**（本地按面选最小证据，穷尽归 CI）、
**"`test:coverage`, not `test`, is the CI coverage gate"**、**"Tests describe behavior, not correctness"**。
另有一条罕见的诚实条款："Both SDKs project the loop … **`pnpm run test` covers neither**"——把"测不到哪"写进规矩，而不是默默接受。

**pre-push 边界**："There is no universal local baseline beyond the hooks."——hooks 故意窄（pre-commit 只修 staged lint/空白，
pre-push 只跑增量 typecheck）；"the hooks intentionally do not run tests, snapshots, documentation checks, builds, or hygiene" 这句在 `docs/development.md`（技能里是复述）。
**不重复已过的检查**也是明文条款。

## 6. 可靠性：单向归因 + 八类 flake 词表 + 五级复现阶梯

【硬】宪法条款："Only the process is isolated: ports, predictable paths, external namespaces, and inherited children are not."
每个被获取资源五要素：**owner / 原子分配 / 可观察就绪信号 / 注册的清理 / 静默完成信号**。
"Never scan for a free port and bind it later"（TOCTOU）；"A fixed sleep is not evidence that setup completed"。

【硬】**归因单向**：只单跑才绿的 spec = **spec 自身缺陷，不赖 runner**。这一句把 flake 从"时好时坏的灰色地带"变成可判的责任。
八类 flake 词表按**证据**分（host-resource collision / incomplete lifecycle / process-global contamination /
load-sensitive synchronization / platform or entry-path mismatch / product concurrency defect / external-provider transience / runner infrastructure）；
五级复现阶梯（单测试进程 → 并发 tests → 多 Vitest 进程 → owning gate 的 worker 配置 → 共享宿主独立 job），只升到能复现签名的那一级。

【硬】拒绝的掩盖修法：加超时不指认等待状态、加重试、整文件串行、吞错误、弱化断言、改归一化、清理前 sleep。
唯一显式 retry 在 e2e 车道（`retry: 2`，只对文档化的外部瞬态）；"Restoring a budget is not masking" 把"恢复被误压的预算"与"掩盖"分开。

## 7. CI：必需 job 是"门"的定义，防假绿有五种机制

【硬】单测 + 覆盖率在同一个必需 job；snapshot/expected/built smoke 另一个；web browser、bench、consumers 各一个；
9 个必需 job 由 **`all-checks-passed` 单一 required check** 聚合，任何 failure/cancelled/**skipped** 判红。
with-key e2e 独立 workflow（trusted PR / 主干 / 夜间），缺 secret **preflight 硬失败**，不降级为全 skip 的绿。
【口径】该硬失败只在该 job 真跑时生效；fork/Dependabot 的 job 级跳过在 GitHub 上报告为成功，所以"skipped 判红"不能从 `ci.yml` 外推到 `e2e.yml`。

防假绿五机制：① 缺 key 硬失败；② 自跳过即失败（先数"应该过的文件数"，grep 实际通过数）；
③ skipped 判红；④ 观察性门显式化（allowFailure / 不进 needs，但结果可见）；⑤ runner 可信性演练（换池子会炸吗）。

【解】这套编排的隐含判断：**"如果一条证据不在任何 required job 里，它就不是门，只是文档。"**

## 8. 机制深潜：快照、probe、插件契约

### 8.1 快照：组装转录的唯一来源

【硬】四面（session / sdk / acp / web），每面拥有一种行为证据；每个角色的**最高录制父代**提供输入与模型回放。
文件名文法 `session[.vN].jsonl` / `session.<ordinal>[.vN].jsonl`，`v0` 省略；世代**不可变**（只加后继、绝不动已提交世代）。
`snapshot.yml` 显式声明 profile/header class/录制策略/workspace facts——"没有隐式约定"。

【硬】两种写模式语义不同：**record** = 模型转录变了（prompt/格式/模型行为）；**refresh** = 输入仍有效、只重生成期望。
**replay 并行，record/refresh 严格串行**（refresh 并发写会写坏期望）；只有 record 读 `.env`。
**`workspace.expected/` 永不被 record/refresh 改写**——mutating 场景的世界由独立树比对：证据的生产者不能是证据的修改者。

【硬】反作弊：postmortem 0002 里 refresh 把 `UNKNOWN_TOOL` 的坏转录接受成了期望——"A snapshot refresh is fixture production,
not correctness review"；所以每个 diff 人工 review，归一化器不许为凑绿而改（"fix fixtures, not normalizers"）。

### 8.2 probe：是取证动作，不是测试资产

【硬】DSH 里没有 `Probe` 类型、没有 `ctx.probe` 服务。probe 是**证据选择器**，产物三分：
**分叉**（探前提 → 归产品代码）、**判断**（决定用例跑不跑/豁免不豁免 → 归测试，且判据必须与用例**同源**）、
**事实**（探来路 → 用 trace/OTLP，不新造）。

两条纪律：**探不通不是错误，默认动作是"跳过"而不是"通过"**（跳过是可见空缺，通过是伪造证据）；
**豁免探针不能比它守护的判据更宽**（否则出现"用例其实要跑、却被豁免掉"的假绿）。

### 8.3 插件契约：五级台阶 / 三种采用等级 / 十条契约

【解，提炼】写插件的人不必复刻 DSH 规模，但有形状：
台阶 1 导出形态守卫 → 2 行为 spec → 3 注册生命周期（dispose）→ 4 REAL composition → 5 组装转录。
按类型必选（tool 1+2+3+4+5；service 1+2+3；guard 1+2+3+4；provider 1+2+4；client UI 1+2+3；bundle 1+4）。
采用等级 L0 内部 / L1 产品可见 / L2 发布型，等级决定 required job 数量，**但不是永久身份**。
十条契约里最有迁移价值的三条：**一个插件一个包、测试不进 `src/`**；**三条互斥车道**；**不可达行逐条登记豁免 + 理由 + `TODO(owner)` 移除条件**。

### 8.4 五类插件的组合形状：组合跟着"插件承诺"走

【解，提炼】14 篇解剖了五个真实插件，共同规律只有一句：**插件承诺什么，测试组合就长什么样**。
不是按文件数抄，而是按承诺挑组合。

| 插件类型（样板） | 承诺什么 | 组合骨架 | 本仓对照 |
|---|---|---|---|
| 工具 `tool-todo` | 行为 + Config 可配置 | 四件套：直调注册入口 / 穿 loop（唯一 mock = 脚本化模型）/ Loader composition 断言"两脸"（模型可见描述与行为同时变）/ 投影 + HMR | 工具类有行为 spec（`signoff-tool` 等）；"两脸 Config"与录制场景缺 |
| provider `subagent-codex` | 可选性与实例拓扑 | 单文件高密度：`PATH: ''` 证明可选依赖缺席不探测、实例 × capabilities 逐项断言、patch 路径从 `package.json` 现读、built `lib/` 再跑一遍 | 本仓无 provider 插件；同类承诺落在 preset/profile 装配（`preset-smoke` / `client-load-smoke`） |
| client toolview `ui-tool` | 组装面 + 文案归属 | jsdom + locale-owned 词典 + **真实 host 组装**（不是浅渲染）+ 文件头列验收清单 | `tests/client` 62 spec + `company-client-composition` + i18n 门，形状对得上 |
| guard `timeout-policy` | **什么时候不做** | 分支矩阵先列"不触发"（透传 / 恢复 / 保留），再列触发；竞态两序各一条 | `write-gate` / `runtime-guard` / `instance-guard` 有拒绝与恢复；"两序"未系统化 |
| LLM-backed `session-title-llm` | 对真模型工作 | `RecordingAdapter` 断言**请求本身**（消息形状、signal）+ `CooperativeAdapter` 精确演练取消 reason + keyless spec 与 with-key e2e 成对 | 真模型冒烟是"在线证明"；缺"离线记录请求"的可回放件——这正是 B6 要补的形状 |

【解】两条最可迁移的手法：① **RecordingAdapter**（子类化真 adapter，记录 `GenerateOptions` 再按脚本吐 chunk）——
让"模型请求长什么样"变成可断言的离线证据；② **可选依赖的 `PATH: ''` 测试**——
可选性不是"文档说可选"，是"缺席时不探测、不启动"的可执行证明。

## 9. 命名与文体：命名即所有权

- **后缀 = 层 = 所有权**（`*.e2e.ts` / `*.expected.e2e.ts` / `snapshots/**`）；DSH 的 tests/harness.ts 刻意不被任何 include 选中——
  import 它不会重复注册别人的 `describe`、不会重复真实 API 调用。
- **用例名 = 行为命题、现在时、无 "should"**："Tests describe behavior, not correctness" 的文体化。
- **命名被单独的门守护**（`expected-filenames` 禁 `golden`，要求 `expected`）——术语准确性值得一条 CI。
- **fast 是层，不是形容词**：diagnostic lane 命名即"不进 required"。

## 10. 这套策略的代价与不可照搬处

【解】四条边界，别抄成负债：

1. **with-key 不设限**是模型厂的立场（推理成本内部化）；外部仓抄它 = 抄一个花不起的预算。
2. **per-file 100%** 的前提是"未覆盖 ≈ 死代码"这个判断在它仓库里成立（库 + 全插件架构、每个注册表都必须可撤销）；
   一个以内容/文案/装配为主的产品仓照抄，会把覆盖率变成补测试的 KPI。
3. **250 场景 + 9 个必需 job** 需要专门的 CI 预算与 runner 池；小仓该抄的是"录制一次、回放永久"的形状，不是数量。
4. **不默认全量**的前提是 CI 真的穷尽；如果 CI 只跑静态门，"本地不跑全量"就退化成"没人跑"。

## 11. 可迁移词汇表（本仓可直接借用的说法）

| 词 | 一句话 | 我们能不能用 |
|---|---|---|
| 让绿有意义 | 政策的定语；绿要能被解释 | 能，且应成为 testing.md 的判据 |
| 证据形态 × 入口真实性 | 分层的两个轴 | 能；替换"单元/集成/端到端"三分 |
| 后缀即层 | 命名即选中机制 | 能；我们已有词表，缺机械选中 |
| 组装转录 | snapshot 独有的证据形态 | 能；但本仓缺产品面场景（见差距材料） |
| prove-it-red | 守卫必须见过红 | 已有；覆盖面可扩 |
| 显式未覆盖 | 缺口要登记，不要藏在脑子里 | 能；本仓目前是散文 |
| 单向归因 | 单跑才绿 = spec 缺陷 | 已有（§3.4），缺词表与阶梯 |
| 跳过不是成本信号 | skip 是空缺不是通过 | 能；我们已有 skip-budget，方向一致 |
| 命名即所有权 | 文件名说明谁维护 | 部分 |
| 观察性门 | 不过是门，但结果要可见 | 能；我们的"待触发复查"表是同一思想 |

## 12. 与本仓最相关的三句原话

> "**Coverage proves lines *ran*; it says nothing about whether the feature works *the way it ships*.**"

> "**A guard only guards if the regression fails it.**"

> 推论（不是 DSH 原话，是本专题对编排逻辑的归纳）：**一条证据如果不在任何 required job 里，它就不是门，只是文档。**
