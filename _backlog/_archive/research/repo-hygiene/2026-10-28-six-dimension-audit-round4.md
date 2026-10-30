---
topic: 仓库卫生
intent: "第四轮 fresh-agent 六维打扫（2026-10-28）：复核上一轮 A- 自评与 0.3.15 收口声明，用实跑与独立子代理找出剩余结构债；产出分级发现、六维复评与可分批改善清单，供用户 REVIEW 选批。"
---

# 第四轮六维度打扫卫生审计（2026-10-28）

> 服务卡：[第四轮六维打扫推敲卡](../../settled_issues/2026-10-28-repo-hygiene-round4.md)｜上一轮：[第三轮审计](2026-10-27-six-dimension-audit-round3.md)（已归档）
>
> 口径：fresh agent 只读评审；主 agent 亲跑全部 keyless 车道与三次真页面金样；五个独立子代理分别深挖 D1+D3 / D2 / D4 / D5 / D6；D4 另做上一轮 R3-01…26 的逐项复核。
> vendor/dsh 只读；真模型档未跑（无成本授权）。
> **数字基线**：`pnpm verify` 50 门 ALL PASS + 2 门 SKIP（无对象）· `pnpm test` 106 spec / 954 例全绿（Tests 21.27s，全程 23.97s）· `pnpm typecheck` exit 0 · keyless 覆盖率 85.73% stmts / 79.02% branch / 85.08% funcs / 89.65% lines · `release --check` READY 0.3.15 @ `bda2f16` · 真页面 `ui-scene-smoke --isolated --golden` **三次全红、两种不同差异**。

## 0. 一句话结论

**系统骨架健康，真实页面车道真的能起、能看、能留证；但“上一轮六维全部 A-”不成立，本轮复评六维为 D1 B / D2 B / D3 B / D4 B / D5 B / D6 C。** 两个必须先处理的硬问题：

1. **UI 金样回归网是假绿/假红混合体**——金样把“读取中… / 读取团队状态…”这类未完成态钉成期望；隔离场景又继承了 `DSH_COMPANY_BOOTSTRAP=off`，公司盘骨架缺失；`verify` 只查金样形状，所以 50 门全绿而真页面车道 exit 1。
2. **`diagnose` 仍会把失败读成 `FAILURES none`**——`tool/result` 的 `[exit code: 1]` 不是 `isError`，实测 `session-01b060a7` 有 8 条非零退出、`toolErrors=0`、`FAILURES none`、exit 0。加上“等用户回答/等审批”被误诊为“进程被杀”，agent 在真实症状前仍会抓瞎。

结构面真正的大债不是目录平铺，而是**入口即最胖模块**：host `apply` 326 行、client `apply` 201 行、`CultivationBoard` 483 行、`cultivationCommandHandler` 338 行。目录层级本身是干净的：0 反向边、0 环、0 无测试模块；`src/client` 32 个文件仍在可扫范围，拆目录的收益低于拆函数。

## 1. 这轮怎么测的

### 1.1 主 agent 亲跑（全部 keyless）

```text
pnpm verify                                      # 50 门 ALL PASS；2 门 SKIP（无对象）
pnpm test                                        # 106 files / 954 tests passed
pnpm typecheck                                   # exit 0
pnpm test:coverage                               # 85.73 / 79.02 / 85.08 / 89.65
node tools/release.mjs --check                   # READY 0.3.15 @ bda2f16（D4 子代理复跑）
pnpm orient                                      # 5 slug / 凭据✓ / 公司盘 6 交付物 / 3 场景
pnpm diagnose --strict                           # 最新 ping 会话：turns=1，FAILURES none（正常）
node checks/smoke/ui-scene-smoke.mjs --isolated --golden
                                                 # 3 次均 exit 1；见 §2/§3
node probes/browser-visual/cdp-probe.mjs <url> --evidence
                                                 # 9/9 页签、console 0、clientErrors 0、page.png 落盘
```

### 1.2 独立子代理（各自带 file:line，未改文件）

- D1+D3：入口链三场景实走、层表与注册一致性、授权/收尾链、预算完整性。
- D2：160 条相对 import 的模块图、环/反向边、巨人函数、收家、测试分区。
- D4：R3-01…26 逐项复核、版本/计数/死引用、决策台账、CHANGELOG。
- D5：106 spec 分型、覆盖抽验、用户可见面缺口、夹具/oracle。
- D6：会话日志/错误环/diagnose/evidence/prune 的端到端信息链。

### 1.3 上一轮复核口径

上一轮卡（[R3 归档卡](../../settled_issues/2026-10-27-repo-hygiene-round3.md)）把 R3-21/22/25 的巨函数、重复小工具、平铺目录列为“明确不作”。本轮用户明确要求“代码和测试都要避免平铺、要有层次”，因此这些**被上一轮延后的项，本轮重新列入候选**，不再当作已结。

## 2. 六维复评

| 维 | 本轮 | 上一轮自评 | 判据 |
|---|---|---|---|
| D1 文档结构与渐进披露 | **B** | A- | 入口链物理形状真改好了（AGENTS 82 / src README 32 / tests README 92），但入口首屏仍有 3 条陈旧指针；第二跳 owner 三份都没有“什么时候读”；Plan Mode 授权闸不在“开工最小路径”上；18/35 份文档无“什么时候读”；预算头寸 11/32 <5%，两篇新指南无预算。 |
| D2 代码/测试层次 | **B** | A- | 分层 A（0 反向边 / 0 环 / 0 无测试模块，`src-layering` + `typecheck` 双回路）；模块粒度 B-：四个入口级巨函数、重复 `isRecord`×3 / `clip`×3 / `parseCatalog` 埋在 .tsx、根入口 `export *` 21 名字只 1 个外部消费者；测试分区 6 个 `tools/lib` spec 住在 `tests/company`，一个同名 spec。 |
| D3 文档—执行—验收结构 | **B** | A- | 收尾次序与回执已单家（close-out skill），授权边界已只指 `_backlog` 章程；但自动注入的 `_backlog/AGENTS.md` 把排除项截断（丢“常设指令”），bugs README 又缩成“P0/严重/变向”；preset 完成定义有 4 份不等价版本；dev-loop §1 的“实施→选证据”与 §3④/宪法 §3.8 的“测试先行”相反；没有一张入口→授权→证据→收尾的总图。 |
| D4 上下文腐化/偏移 | **B** | A- | 版本/产物/pin 三处真修（release READY、sha 一致、pin 一致）；但 1 个 P1 指令矛盾（tests/README 仍写“语料回放 = 升 pin 第一道”，release.md 明说不要当第一道）+ 6 个 P2 漂移；0.3.15 CHANGELOG 的“失效引用已清理”与现场不符；决策台账/外部研究材料的路由仍指 index。 |
| D5 测试资产组织/覆盖/类型 | **B** | A- | 954 例、覆盖 85.7/79.0、负例文化真实；本轮增量（attention-tab / company-data-lifecycle / propose-guards / host-composition）是行为级不是数量级。但用户可见面仍有三处“渲染成空白也全绿”：`createCompanyView` 整页 0 处 import、`useWorkspaceText` 0 用例、client 观察者生产接线未证；`CompanyView` 16.1% stmts / 20.8% lines、`company-tabs` 24.1%、`CultivationTab` 0%、`client/index.ts` 分支 13.3%；UI 金样自身不稳。 |
| D6 日志/端到端/症状还原 | **C** | A- | 开发期自检腿真起来了（真页面 9/9、失败截图、verdict、错误环、`ui-scene` 成功也落证）；但用户症状腿仍断：client 错误不进会话日志、错误环随刷新消失、探针只看自己新开的页、`diagnose` 漏 bash 非零退出/等审批/child 会话、启动崩溃丢 stderr、无交互步骤录制。 |

## 3. P0 / P1 发现

### R4-01（P0，D5+D6）UI 金样：同一棵干净树三次全红，且红法不同

**证据（主 agent 实跑）**：

```text
# 第 1 次：培养 / 台账 差异
GOLDEN FAIL 页签「培养」… 金样「事件流不可达——赞/踩块降级」/ 现在「还没有赞/踩…」
GOLDEN FAIL 页签「台账」… 金样「读取中…」/ 现在「台账不可读（kb/motion-ledger.md 缺失？）」
# 第 2 次：培养 / 成品 差异
GOLDEN FAIL 页签「成品」… 金样「读取团队状态…」/ 现在「成品索引不可读（kb/deliverables-index.json 缺失？…）」
# 第 3 次（显式 DSH_COMPANY_BOOTSTRAP=if-missing）：成品仍红
```

**根因（三条叠加）**：

1. `run/env.sh:70` 导出 `DSH_COMPANY_BOOTSTRAP=off`；`ui-scene-smoke` 的隔离环境只覆盖 `DSH_HOME`/`DSH_COMPANY_HOME`（`checks/smoke/ui-scene-smoke.mjs:61`），把 `off` 继承进去，`standalone --provision-only` 又不落骨架（`tools/standalone.mjs:183`），于是隔离公司盘没有 `kb/motion-ledger.md`，面板显示“不可读”。
2. `cdp-probe` 在页签 body 非空后立刻抓文本（`probes/browser-visual/cdp-probe.mjs:192-204`），不等待异步读取稳定；金样因此把“读取中… / 读取团队状态…”钉成期望（`snapshots/visual/company-shell/ui.golden.json:22-24`）。
3. `ui-golden-freshness` 只做静态形状/目录校验（`checks/gates/ui-golden-freshness.mjs:14-40`），所以 `pnpm verify` 50 门全绿，而真页面车道 exit 1；`ui-scene-smoke` 的 `scene.json` 在 golden 比对之前写（`:128-139`），失败时仍记 `probeExit: 0`、无 golden 结果，下一 agent 会把 pass 目录当绿。
4. 隔离 home 没有凭据，页面实际停在 “Get started / Add API Key / Sign in” 模态；`cdp-probe` 的 not-onboarded 只在 composer 缺失时触发（`probes/browser-visual/cdp-probe.mjs:128` 附近），这里 composer 已在，所以 `reason: pass`、9/9 页签，截图（`runtime/harness-home/diagnosis/cdp-probe-2026-10-27T17-02-50-972Z/page.png`）却带着 onboarding 模态和「成品索引不可读」。它不是“已就绪的公司壳”，只是“能挂载的壳”。

**影响**：这是本轮唯一“回归网自己骗人”的 P0。它同时解释了为什么上一轮敢给 D5 A-：金样从未在干净树上连续三次通过。

### R4-02（P1，D3）授权门牌截断排除项——照门牌做可能自授权

`_backlog/README.md:86` 的完整边界是：P0，或触碰**章程/常设指令、docs 合同、company-pack 公开行为、已记录决定** → 不自授权。
但本会话实际注入的 `_backlog/AGENTS.md:22` 只剩“P0 或触碰章程/合同/company-pack 公开行为/已记录决定”——**丢了“常设指令”**；`_backlog/bugs/README.md:59` 又缩成“P0/严重/变向”。门牌自称“不复述事实”，却在复述并截断。按门牌执行，改常设指令的 P1/P2 修复可能被误判为“修复就绪自授权”。

### R4-03（P1，D4）回放证据链仍有两套相反说法

- `tests/README.md:33`：“**语料回放全绿 = 升 pin 回归网第一道**”。
- `docs/release.md:123-125`：本仓现行回放只有一个**不加载 company-pack** 的 headless 合成场景，只证明“回放管线可跑”，**不要把它当第一道**；公司行为真实录制已移私有仓。
- `tests/README.md:27` 仍要求“受影响 replay 场景同 diff 重录”，并引用已不存在的 r3 full 档。
- `checks/smoke/replay-smoke.mjs` 头注第 7、16-22 行仍把 `--ui` / r3-delegation 写成可用模式；代码第 91-95 行直接 exit 2。
- `docs/testing.md:19` 仍把 `candidate-scan 语料` 列为行为质量档；`:62` 又说本仓无该资产、eval exit 2。`tests/README.md:66`、`docs/project-map.md:90` 同族。

**影响**：升 pin 的人会按旧句找不存在的语料，或把合成管线当公司行为回归网。上一轮 R3-26 只修了 release/dev-loop/testing §1，漏了操作入口 tests/README。

### R4-04（P1，D1+D3）Plan Mode 授权闸不在“开工最小路径”上

`docs/policy.md:15` 规定 feature 类任务默认先 Plan Mode / `exit_plan_mode` 呈批；但 `AGENTS.md:4` 的“读完这三样就够开工”没提 Plan Mode，`docs/guides/dev-loop.md:141` 又说“唯一见 §0.5”，而 §0.5:38 只写“四类常设规则 = policy P1”。一个 fresh agent 按最小路径可以直接开工，绕开授权闸。

### R4-05（P1，D5）三处用户可见面“渲染成空白也全绿”

- `createCompanyView` / `COMPANY_PANELS` 在全仓 tests 中 0 处 import（`packages/company-pack/src/client/CompanyView.tsx:94-183`）；只有 `CompanyIdentity` 单测与源码文本守卫。整页空白、子页签不切、浮出按钮死，954 例全绿。
- `useWorkspaceText` 0 用例（`workspace-text.ts:35-61`）；`LedgerTab`/`DeliverablesTab` 只测刷新文案，不测 loading→ready / null→unreadable / abort。
- client 观察者生产接线未证（`client/index.ts:163-171`）：whole-client 只断 tab id/心跳；`attention-observers.spec` 用假 remote，没碰 index 的真实注册。观察者没注册或注册到另一个 registry ⇒ 待办永远空，仍全绿。

### R4-06（P1，D6）`diagnose` 仍有三类假绿/误诊

1. **bash 非零退出不计失败**：`tools/lib/session-diagnose.mjs:95-103` 只看 `message.isError`；实测 `session-01b060a7` 有 8 个非零退出事件（按 callId 去重后 4 条命令），`toolErrors=0`、`FAILURES none`、exit 0。
2. **等用户回答/等审批被误诊为崩溃**：未闭合 turn 一律输出“进程被杀/崩溃”；`user-questions/request` 并不总在日志里，`approval/asked` 没有 `decided` 时也不计，`pendingQuestions=0`。
3. **child 会话不可见**：`tools/diagnose.mjs:66` 与第 84-86 行只收 `session-` 前缀，而 child 目录是 `<childId>`；`team/member.phase=failed` 无分支。队友 provision/运行失败在 lead 摘要里零信号。

### R4-07（P1，D6）启动崩溃丢 stderr，且没有交互级复现

`tools/lib/probe-web.mjs:36-60` 只在内存留 16k 输出；`startWeb` 失败只抛“web 提前退出 N”/“boot 超时”，`ui-scene-smoke` catch 后直接 exit 2 并提示“先构建”（`:77-80`）。非 `StartupError` 时盘上无日志，agent 被引向重建而不是读错。
更强的缺口：`ui-scene-smoke` 只开页签、扫文本，不会点按钮/填表/复现用户步骤；`cdp-probe --ask` 只发一条 prompt。用户说“点这个按钮白了”，当前只能看一个**新开的、无关的**页面。

### R4-08（P1，D2）四个“入口即最胖模块”，层次在函数内部塌陷

- `packages/company-pack/src/index.ts:69` `apply` 326 行（文件 395）；两个 `defineTool` 内联、命令注册、门投影都在里面。
- `packages/company-pack/src/client/index.ts:116` `apply` 201 行；`:230` 与 `:276` 两次建同一套 data plane / `readWorkspaceText` / `makeContextWiring`。
- `client/CultivationBoard.tsx:101` 单函数 483 行 / 文件 584 行；13 个 `useState` + 2 个 `useRef`，状态机与四段 JSX 同函数。
- `host/cultivation.ts:117` `cultivationCommandHandler` 338 行；8 个子命令共用一个闭包，缝已标注（:135/:189/:235/:253/:274/:304/:324/:361）但没提取。

这些是“深模块的好接口 + 太胖的实现”，不是目录平铺；拆函数/子组件的收益远高于拆目录。

## 4. P2 / P3 发现

| ID | 级 | 维 | 文件:行 | 证据 / 影响 |
|---|---|---|---|---|
| R4-09 | P2 | D1/D4 | `AGENTS.md:31`、`docs/AGENTS.md:4`（另见第 14 行）、`docs/project-map.md:20`、`docs/design/architecture.md:4`（另见第 106 行） | 仍把“决策台账”路由到 `index.md`；实际家 = `docs/decisions.md`（`index.md:53` 自己说已迁）。同时 5 处“外部研究材料登记”仍指 index，实际家 = `docs/external-research.md`。 |
| R4-10 | P2 | D1/D4 | `docs/design/architecture.md:44-79` | “下面是完整配方”的 YAML 是顶层 `- id: persona`；真实 preset 是 `- insert: - id: preset-ceo` + `plugins:`（`presets/ceo/agent.cordis.yml:9-16`）。照抄出不了可挂载 preset；设计层还明文排除实现细节。 |
| R4-11 | P2 | D3 | `AGENTS.md:48`、`docs/presets.md:179-180`、`.agents/skills/preset-change-definition/SKILL.md:13-16`、`.agents/skills/close-out-definition/SKILL.md:35` | 四份“preset 完成定义”：仅 preset-smoke／+verify+test+probe --full／+场景+收割／verify+test。最低成本读法也能自称完成。 |
| R4-12 | P2 | D3 | `docs/guides/dev-loop.md:45-46` vs `:72`、`docs/testing.md:55` | §1 顺序 = 实施→选证据；§3④ / 宪法 §3.8 = 测试/场景先行。照 §1 字面执行即违反测试先行。 |
| R4-13 | P2 | D1/D5 | `tests/README.md:24-35` | 映射表只有 src/lib、src/client、“pack 导出/注册面”；`src/host/` 的 bootstrap/catalog/cultivation/lease 等 8 模块 3226 行没有行。场景②只能猜检查层。 |
| R4-14 | P2 | D1 | `docs/AGENTS.md:30`、`checks/gates/doc-budget.mjs:15` | 文档称“留 ≥5% 头寸”，门禁只拒 >20% 空置；实测 11/32 篇 <5%（release-runbook 0%、presets 1.5%、decisions 1.7%、AGENTS 2.4%…）。`docs/guides/budget-and-ops.md`（68 行）与 `docs/guides/cdp-probe.md`（64 行）无预算，门禁无完整性断言。 |
| R4-15 | P2 | D4 | `checks/README.md:56`；`checks/smoke/ui-scene-smoke.mjs:8`；`checks/gates/ui-golden-freshness.mjs:8`；`packages/company-pack/README.md:23`；`CHANGELOG.md:23` | 索引写 48 门（实际 50）；两处金样路径写 `snapshots/ui/...`（实际 `snapshots/visual/...`）；包 README 枚举“关注”（实际标签是“待办”）；0.3.15 CHANGELOG 称失效引用已清，现场不符。 |
| R4-16 | P2 | D2/D5 | `client/DeliverablesTab.tsx:98`；`host/bundle-manifest.ts:225`、`host/catalog.ts:43`、`client/cultivation-context-data.ts:89`；`lib/presence.ts:147`、`lib/cultivation-inbox.ts:59`、`lib/cultivation-context.ts:338`；`tests/{client,company}/deliverables-catalog.spec.ts` | `parseCatalog` 埋在 .tsx 却被数据模块与 company spec 反向依赖；`isRecord` 3 份逐字相同；`clip` 3 份语义不同；同名 spec + 同名对象（src/lib 与 tools/lib）并存。 |
| R4-17 | P2 | D2 | `checks/gates/src-layering.mjs:25`；`tools/lib/src-layering.mjs` | 只守字面相对 import 的方向：模板串/计算式 dynamic import、`require()`、`import x = require()` 全不可见；注释里的 `from '../host/x.ts'` 会被扫成违规（假阳）；无环/导出面检查。 |
| R4-18 | P2 | D6 | `checks/smoke/ui-scene-smoke.mjs` 第 128-139、162-177 行；另见第 81-82 行 | golden 失败时 `scene.json` 仍 `probeExit:0`、无 golden 结果；`--keep` 只打 base，不打带 token 的 URL；证据无 URL/home。 |
| R4-19 | P3 | D4 | `docs/decisions.md:51-53`；`docs/data-model.md:15`（另见第 67 行）；`AGENTS.md:40`；`docs/project-map.md:90` | D46 排在 D45 前；D44 指两个 Note 家；data-model 同一规则写 2 次；AGENTS 说“environments §6”而该文件只有 1 个标题；project-map 仍说“行为质量语料有独立标注”。 |
| R4-20 | P3 | D1 | `docs/orient.md:42`；`checks/README.md:5`（另见第 16 行） | `orient` 说“不复制门名”后立刻复制四条，第四条写“批得下”（owner = “已获批”）；checks/README 把分层指向 dev-loop §9.1，而 §9.1 是三行转指 tests/README 的桩。 |
| R4-21 | P3 | D4 | `docs/profile.md:12`；`docs/design/ui-demo.md:132`；`packages/company-pack/README.md:23` | profile 把 `headless` 写成“源码直跑 ✅ R0 已验收”，而 README/AGENTS 都说 headless 不是公司运行；ui-demo v3 仍写四面板“用量”（现第四 = 培养）；包 README 的“关注”同上。 |
| R4-22 | P3 | D1 | `docs/index.md:34`（另见第 39-43 行）、`docs/AGENTS.md:12`（另见第 12-19 行） | 索引出现“规范”“导航”两个层表未定义的标签；“导航/常驻入口”两套叫法，层词汇不封闭。 |

## 5. 健康面（别动）

- **分层是真的**：64 个 src 文件 / 160 条相对边，client→host、host→client、lib→{host,client} 反向边 0，环 0，无测试可达模块 0；`src-layering` 第 48 门 + `pnpm typecheck` 双回路。
- **门禁体系是真的**：50 门，2 个无对象门输出 SKIP 而不是 PASS；`gate-wiring`/`script-index`/`nav-count-claims`/`doc-budget`/`backlog-liveness` 都有红证文化。
- **测试资产是真的**：106 spec / 954 例，覆盖 85.7/79.0，负例文化（BUG-nnn 守卫、prove-it-red、真文件集成）不是装饰；本轮新增的 attention-tab / company-data-lifecycle / propose-guards / host-composition 是行为级。
- **发布/版本/pin 是真的**：release `--check` READY，tgz/manual sha 与 manifest 一致，AGENTS/pin.mjs/vendor HEAD 三处 `687f282e…` 一致。
- **真页面车道的设计是对的**：`ui-scene-smoke` 自起实例 + cdp-probe + `--evidence` 成功/失败都留证；错误环、未登录 exit 2、9/9 页签都是真改进。问题在夹具与稳定性，不在方向。
- **`diagnose` 的中断轮检测已修**：`interruptedTurns` 有测试；默认摘要/`--strict` 的语义清楚。

## 6. 建议批次（待 REVIEW 选批）

### 批 A · 真实性与安全边界（0.5–1 天，建议立刻）

1. `_backlog/AGENTS.md:22`、`_backlog/bugs/README.md:59` 改成**只留指针**（“限 P1/P2；排除项见章程「缺陷的通道」，此处不列”），不再枚举。
2. `AGENTS.md` 首屏加一行 Plan Mode 闸（feature 任务先 Plan Mode，规则 = policy P1）；`dev-loop.md:141` 改指 policy §P1。
3. 回放真值：`tests/README.md:33`（另见第 27、66 行）、`checks/smoke/replay-smoke.mjs`（第 7、16-22 行）、`docs/testing.md:19`、`docs/project-map.md:90`、`CHANGELOG.md:23` 统一到 release.md 的口径。
4. 导航/计数：ledger 指针 → `decisions.md`；外部研究 → `external-research.md`；architecture 的伪配方改成“以 `presets/ceo/agent.cordis.yml` 为准”；`checks/README.md` 48→50；两处 `snapshots/ui` → `snapshots/visual`；包 README “关注”→“待办”。
5. 验收：`pnpm verify` + `pnpm test`；`rg` 断言“第一道 / snapshots/ui / 48 个模块 / 关注、培养”零命中；`doc-budget` 仍绿。

### 批 B · UI 反馈车道（1 天，建议与 A 同批）

1. `ui-scene-smoke` 的隔离 env 显式设 `DSH_COMPANY_BOOTSTRAP: 'if-missing'`；并用 `standalone` 或 host 首启补齐 `kb/motion-ledger.md` + `kb/deliverables-index.json`（或把空态文案改成“还没有”，不再说“不可读”）。
2. `cdp-probe --texts` 在抓文本前等稳定（连续两次采样一致，且不含“读取中…/读取团队状态…”）；仍占位则失败。
3. `startWeb` 失败时把最后 2k 输出附进 Error；`ui-scene-smoke` 把 web stdout/stderr 写进证据目录；`scene.json` 在 golden 比对后写，含 `golden: pass|fail` 与 expected/actual。
4. `--keep` 打印带 token 的 URL 并写进 receipt。
5. 验收：连续 3 次 `--isolated --golden` exit 0；人为改一个页签文本 → 红；还原 → 绿；模拟 boot 失败 → 证据目录有 web.log。

### 批 C · diagnose 真话（1 天，建议紧随）

1. `tool/result` 文本含 `[exit code: N≠0]` 且工具是 bash → 计入 `toolNonZeroExits`；`--strict` 下与 `toolErrors` 同权，默认摘要单列一行。
2. 未闭合 turn 回看最后 `tool/call` / `approval/asked`：`ask_user_question` → “等人回答”，审批无 `decided` → “等审批”，否则才说“进程被杀/崩溃”。
3. 允许 child 目录（`<childId>` 无 `session-` 前缀）；折 `team/member.phase=failed`。
4. `badLines>0` 进 `--strict`；默认 exit 0 保持不变（只读摘要语义）。
5. 验收：新增/更新 `tests/harness/session-diagnose.spec.ts`；用真实 `session-01b060a7` 复跑，摘要出现 8 条非零退出；用等问/等审批夹具复跑，不再说“崩溃”。

### 批 D · 测试补强（1–2 天）

1. 拟建 tests/client/company-view.spec.ts（happy-dom + createRoot）：四子页签切换、`data.error`/`team=null`、浮出调 `floatPanel(kind)`、CompanyIdentity 三态。
2. 拟建 tests/client/workspace-text.spec.ts：loading→ready、null→unreadable、abort 后不 setState、refreshMs 到点重读；同 diff 补 Ledger/Deliverables 容器 error 行。
3. 拟建 tests/client/company-client-wiring.spec.ts：派发 `approval/request` 与 `user-questions/request`，断同一 registry 进 `getPending`；openContext 四分支。
4. 拟建 tests/company/apply-lifecycle.spec.ts：同 ctx 二次 apply、dispose 后发 `session/event` 不写账本、apply 后 provide `workspaceRegistry` 触发迟到 inject。
5. 测试分区：6 个 `tools/lib` spec 迁 `tests/harness`；重名 `deliverables-catalog.spec.ts` 改名；5 份 env/mkdtemp 样板收进拟建的 tests/support 共享夹具；最大单 it 拆成 describe/it。

### 批 E · 结构（2–4 天，可选/分期）

1. `CultivationBoard` → `use-cultivation-board.ts` + 4 段 JSX 子组件；`cultivationCommandHandler` → 8 分支 dispatch 表；host `apply` 的两个内联 tool/门投影 → `host/tools/*` + `host/doors-projection.ts`；client `apply` 的数据面只建一次。
2. `parseCatalog` → `lib/deliverables-catalog.ts`；`isRecord` → `lib/guards.ts`；`clip/clipExcerpt` → `lib/text.ts`。
3. 可选：`client/cultivation/` + `client/wiring/` 目录化（只开这两个内聚域，不做全量重排）。
4. 验收：行为不变、106+ spec 全绿、`verify`/`typecheck` 全绿；失败定位从“整页一个 it”变成可点名的子行为。

## 7. 请 REVIEW 的决策

1. **是否接受本轮评分**（D1–D5 B、D6 C；上一轮 A- 不成立）——尤其 D6 的 C，是否同意“用户症状腿仍断”的判断。
2. **批 A+B 是否现在做**（真实性/安全 + UI 车道；我建议做，A 是安全面，B 是回归网）。
3. **批 C 是否紧随**（diagnose 真话；成本低，收益直接）。
4. **批 D/E 的取舍**：D 先补用户可见面；E 先拆哪两个巨人（建议 Board + command handler，收益/风险比最好）。
5. **UI 症状捕获的下一步**：只修金样稳定性（低成本），还是加 `cdp-probe --attach <devtools-port>` 接用户正在跑的页面（中成本，但能真正回答“用户那一页白在哪”），还是再加 `--steps` 交互脚本（高成本）？

## 8. 本轮没覆盖的

- 真模型认证档（entry-probe / delegation-smoke / probe --full）：成本与授权，未跑。
- `notes/implemented` 91 篇全量两两比对：只查 D 路由、最近 R3/D4/D5 Note 与 CHANGELOG 关键声明。
- vendor/dsh 内部机制与升 pin 面：只核对 pin 簿记，未重校。
- 交互级 UI 复现、`--attach` 可行性原型：未做。
- 覆盖率是 keyless 单次运行读数；UI 数据面/真模型行为不在其中。

## 9. 落地后复评（2026-10-28 收口）

> 口径：只认实际落地与实跑读数；P3 四项已由 [follow-up Note](../../../../notes/archived/receipts/2026-10-28-r4-p3-followup.md) 清零。

| 维 | 初评 | 复评 | 关键证据 |
|---|---|---|---|
| D1 文档结构与渐进披露 | B | **A-** | 开工最小路径进 AGENTS 首屏 + Plan Mode；ledger/外部研究/计数/预算/架构伪配方去漂；第二跳 src/tests/checks README 加“什么时候读”；预算覆盖 30/30 docs。残余：11/32 文档头寸 <5%（反向棘轮只守 >20%，已如实写）。 |
| D2 代码/测试层次 | B | **A-** | 0 反向边 / 0 环；host apply 326→214、CultivationBoard 483→141、cultivationCommandHandler 338→56、client apply 201→45；`parseCatalog`/`isRecord`/`clip` 收家；`src-layering` 补 require/注释；P3 后 Board 四块出 `CultivationBoardSections.tsx`、六支各成函数。 |
| D3 文档—执行—验收结构 | B | **A-** | 授权门牌只留章程指针（含“常设指令”）；Plan Mode 进首屏；收尾单家 close-out skill；preset 完成定义单家 preset-change-definition skill；dev-loop §1 已改证据先行。 |
| D4 上下文腐化 | B | **A-** | 回放口径统一到“合成管线场景，不是升 pin 第一道”；ledger/外部研究/计数/`snapshots/ui`/包 README/CHANGELOG 改到现行；D45/D46 排序、data-model 去重；`release --check` READY 0.3.15。 |
| D5 测试资产 | B | **A-** | 111 spec / 980 例；新增 CompanyView/workspace-text/apply-lifecycle/probe-steps；observer 生产接线 spec；6 个 tools/lib spec 迁 harness、重名消除；UI 金样 3 连绿 + 红证；P3 后 5 处 mkdtemp/env 收 `tests/support/temp-env.ts`。 |
| D6 日志/端到端反馈 | C | **A-** | UI 金样真隔离/稳定/红证；`--steps` 交互复现；启动失败带 tail + web.log + scene.json goldenResult；diagnose 非零 bash/等审批/child/team failed；客户端错误经 `/company-diagnostics` 落 `cultivation/client-errors.log`（agent 可 read）；P3 后 `cdp-probe --attach` 可只读附着用户正在跑的页面。边界：错误仍不写 session 事件（文件通道已声明）。 |

**总评：D1–D6 均 A-。** P3 四项（Board 余块、六支 command 内联、测试样板 helper、`--attach`）已由 follow-up 清零；`--attach` 仍需用户显式开 DevTools 端口，这是使用边界不是残余债。
