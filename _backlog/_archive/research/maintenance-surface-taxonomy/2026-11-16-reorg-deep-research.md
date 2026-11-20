---
topic: maintenance-surface-taxonomy
intent: ai_dsh_deep_research 维护面整理单（自包含 handoff，含完整决策上下文）；实施 agent 只读本文即可动手
---

# ai_dsh_deep_research 维护面整理单

> **给实施 agent**：本文自包含——规则、为什么是这套规则、本仓现状的逐条证据、P0 的精确插入文本、P1 的成本与撞墙点、验收命令，全在这里。你不需要读姊妹仓的研究材料。
> **授权边界**：P0（§3）是声明层改动；P1（§4）涉及搬家与探针规格变更，**动手前必须拿到用户明确批准**。本文不是 P1 的授权。
> **来源**：2026-11-16 三仓维护面分类法研究（宿主 = `ai_dsh_company` 的 `_backlog/research/maintenance-surface-taxonomy/`）。本仓的组级分类经独立盲审复核，数字已按盘上重新核实。
> **术语警告**：本仓 docs/evaluation.md 的「面」= 评估等级 L0–L4（五个评估面），**与本文的「维护面」不是一回事**。本文第一句就要写清，否则 fresh agent 会把两套「面」混起来。evaluation.md 自己也说「探针不是第六个评估面」——那句话里的「面」是评估面，不是维护面。
> **方向更新（2026-11-16，D64）**：三仓根目录统一为 checks/probes/tools 已由「可选远期」升为**承诺方向**（用户裁决：人仍驾驭 AI，根名不一致 → 理解差异 → 驱动出错；先满足人 + 极度满足 fresh agent 可并存）。**硬顺序：先纯化（每目录一个动词）后统一**，或同批；先改名后拆组 = 给 mixed 目录假保证。本仓 scripts/ → checks/、operate 家 dev/ → tools/。仍是独立迁移项目（161 文件 + gate 输入 + hooksPath 重装 + 引用 + 冻结归档 redirect + AGENTS.md 注入面一起做），需用户批准；P0/P1 范围不变。决策家 = [surface-root-unification-direction](../../../../notes/implemented/2026-11-16-surface-root-unification-direction.md)。**落地纪律（用户追加）**：调整时每个根目录的定位（面 = judge/show/operate + 装什么/不装什么 + 例外）必须写进该仓自己的 surface-contract 与 README 首屏，一眼可判、不含糊；共识随本自包含 handoff 携带，实施 agent 不回看宿主仓对话——含糊定位 = 共识跨仓蒸发。
> **落地状态（2026-11-17）：已完成（维护者在目标仓实施，本仓不代管）。** 目标仓已完成根名统一（scripts → checks、dev → tools；show 新域统一取名 analyze，中间态 run 退役），并留下迁移 Note、redirect 账本与 hooksPath 幂等恢复。本文保留**实施前**时点文本——实施 agent **勿按本文重做迁移**；现行事实以目标仓的维护面合同与其根 README 首屏为准。

## 目标根布局（统一后，实施对照）

> D64 承诺方向的**推荐终态**，显式画出以免实施时乱发挥。**P1 纯化 + 改名迁移后**才到此形状；P0 不改名。决策家 = [surface-root-unification-direction](../../../../notes/implemented/2026-11-16-surface-root-unification-direction.md)。

三仓同一 skeleton（**只统一维护面**）：

```text
<repo 根>/
  checks/   judge    裁决：会红，有人（hook/CI/验收）据此放行/退回
  probes/   show     证据：红了只给人看，不阻塞（analyze/ 收只读分析器）
  tools/    operate  持久状态：run（起/复用进程）/ act（持久改动，需 converge/repair）
  tests/    oracle   非面：pnpm test runner 跑，服务三面，不是第四面
  启动配置   非面     env.sh / overlay 等 sourced 环境，不是入口
```

**统一范围** = 维护面三目录 + tests oracle + 配置非面；产品/源码/文档/记忆等其余根目录本仓自有，不在统一范围。根名三仓固定；每面目录只装一个动词；**内部子组各仓自由**；例外进本仓例外登记一次。

**本仓现状 → 目标**（动作细节见 §4）：

| 面 | 现状 | 目标 | 动作 |
|---|---|---|---|
| judge | scripts/（mixed） | checks/ | scripts/ 名退役 → checks/（161 文件 + redirect ledger + AGENTS.md 注入面）；留 verify/smoke/run-gates/run-accept/acceptance-check/release-check |
| show | probes/ | probes/ | 留 behavior/browser/stream；run-ops 11 件 show → probes/analyze/（或 run/，域定义待扩，§4.1） |
| operate | dev/ | tools/ | dev/ 名退役 → tools/（hooksPath 重装）；吸收 dist 3 件 operate + runtime-clean |
| oracle | tests/ | tests/ | 不变 |
| 配置 | dev/env.sh、overlay | 非面 | 随 tools/ 或独立配置位（本仓自便，非面） |

**待裁/口径不许乱发挥**：show 新域 analyze/ vs run/（§4.1）与 stream tee 口径统一（§4.3，行为改动需批准）须先定；维护面 ≠ evaluation.md 的 L0–L4 评估面（术语警告）。内部子组名本仓自定，但每面目录的动词纯度不许破。

## 0. 背景：这套规则怎么来的（30 秒版）

三个姊妹仓都有 3 个维护面目录，但名字不同、内部混装不同。研究收敛出的规则是**两层 × 三面 × 两个前置轴**（§1），核心判据一句话：**「主要产出什么？」**——裁决→judge，证据→show，持久状态→operate。

**本仓的特殊问题**：`scripts/` 名义是职责分组，实际装了三种动词——161 个 tracked 文件里，verify/smoke/run-gates 是 judge，run-ops 的 14 件里 9 件是 show、2 件是 judge、2 件是 operate、1 件是 show（unconsumed-evidence），dist 的 4 件里 3 件是 operate、1 件是 judge。**最刺眼的是 `run-ops`：名字是 operate，内容以 show 为主——名字与动词相反。** 早期方案曾建议把 `scripts/` 改名 `checks/` 以统一三仓名字，被盲审推翻：630 个外部 tracked 文件、3460 处 `scripts/` 引用（其中 342 个在冻结归档区）、`scripts/AGENTS.md` 是目录注入面、`test-path-redirects.json` 需新增 161 条——改名是一个独立项目，不是清晰度的前提。**结论：不改名，用面声明 + 组表消除歧义。**

**为什么值得做**：fresh agent 看到 `scripts/run-ops/watch-run.mjs` 会以为它是运维操作（会动盘），实际它只读会话日志出状态投影。面声明让「这个目录里的东西会不会动我的世界」一眼可判。

## 1. 规则（v2，三仓同文）

**两层**
- **oracle**：由 `pnpm test` 的 runner 跑（node:test）→ `tests/`。不是面。判 runner，不判进程数。
- **entry**：要自己起命令/进程/浏览器 → 下面三面。

**三面（只对 live entry）**
- **judge**：主要产出是**裁决**——会红，且有人（hook/CI/验收）据此放行或退回。
- **show**：主要产出是**证据**——截图、摘要、报表、导出；红了只是让人来看，不阻塞变更。
- **operate**：主要产出是**持久状态**——环境/仓库/发布物/生成物。两种模式：
  - **run**：起/复用进程，失败 = 没起来，重试即可（如 `dev/run-driver.mjs up`）。
  - **act**：持久改动，失败可能半途，需要 converge/repair（如 `runtime-clean --yes`、`export-dist`）。

**两个前置轴（先于三面判定）**
- **生命周期**：头注 `状态：已耗` → 非面（归档候选），不进面计数。本仓 probe-registry 门禁已强制探针六字段含「状态」。
- **管道件**：lib / driver / fixture / runner / reporter / 索引生成器 / 纯查询 / support → 非面，跟消费者住。

**判定（按顺序）**
1. 已耗？→ 非面。
2. 管道件？→ 非面，跟消费者。
3. 主要产出什么？裁决 → judge；证据 → show；持久状态 → operate（起进程的标 run）。
4. 混合件按终端产物；双模件（`--write`/`--check`）按主产物；**被 judge 调用不改变面**（在消费方头注记依赖）。
5. 仍冲突：**产物 > 失败语义 > 名字**。

**为什么「产物」优先**：「失败要重跑」对所有条目都成立，判别力为零；「产出是裁决/证据/世界状态」三者互斥，可判。

**目录名**：P0 **不改名**。`scripts/` 保留但声明为 mixed；`dev/` 保留（它是 operate 面）。目标名（checks/probes/tools）是**承诺方向**（2026-11-16 用户裁决，D64；先纯化后统一、独立迁移项目），不是 P0/P1 义务。

## 2. 本仓现状（逐组核实过，2026-11-16）

| 目录 | 面 | 盘上事实 | 说明 |
|---|---|---|---|
| `probes/` | show | behavior 6 + browser 1 + stream 1 = 8 支（INDEX.generated.md 计数） | `_index.mjs` 是索引生成器（非面）；stream/llm-stream-tee.cjs 是预载驱动（非面，但**当前被 probe-registry 当探针扫**，见 §2.1） |
| `scripts/` | **mixed（待拆）** | 161 tracked 文件 | 见下方分组 |
| `dev/` | **operate**（run+act） | env.sh / boot-run.sh / run-driver.mjs / run-kickoff.mjs / hitl-answer.mjs / hooks / render-overlay.mjs / vendor-build.sh / bootstrap.sh / record-*.mjs / render-test-index.mjs / llm-socket-isolation.cjs | env.sh 是配置（非面）；record-* 与 render-* 是 act（生成 fixture/索引）；llm-socket-isolation.cjs 是预载驱动（非面） |

**scripts/ 分组明细**：

| 组 | 件数 | 面 | 证据 |
|---|---|---|---|
| verify/ | 8（含 gates/ 6 域） | judge | L0 结构门禁聚合 |
| smoke/ | 28 .mjs（11 e2e + 13 entry + 4 support）+ registry.json | judge（24）+ 非面（4 support + 1 json） | 命名即车道；support 是夹具/支援件 |
| run-gates/ | 7 | judge | run bundle 机械门与审计（node-gate/schema-scan/evidence-audit/path-hygiene/verdict-audit/protocol-audit/secret-scan） |
| test/ | 1 | 非面（runner） | run-lane.mjs 车道调度 |
| lib/ | 90 | 非面（实现） | 支撑库 |
| run-ops/ | 14 | **mixed** | 见下方逐件 |
| dist/ | 4 .mjs + product-manual.md | **mixed** | export-dist/market/export-handoff = operate；release-check = judge；product-manual.md = 数据（非面） |
| 根 | doc-budgets.json / archived-note-pointers.json / test-path-redirects.json / README.md / AGENTS.md | 非面（数据/文档） | 门禁消费的配置与登记簿 |

**run-ops/ 逐件判定**（14 件，全部读过退出码语义）：

| 文件 | 面 | 理由 |
|---|---|---|
| watch-run.mjs | show | 谓词化状态投影；exit 1 = 超时（不是裁决，是「没等到」） |
| session-events.mjs | show | 会话事件尾部；exit 1 = 标题歧义（用法错，不是裁决） |
| run-dashboard.mjs | show | 只读 HTML 投影 |
| stream-diagnostics.mjs | show | 流失败归因诊断 |
| provider-error-stats.mjs | show | 上游错误分布投影 |
| plan-card-stats.mjs | show | 计划卡字数分布投影 |
| session-replay.mjs | show | 历史会话回放抓场景包 |
| scene-capture.mjs | show | 场景包捕获/读取 |
| run-inventory.mjs | show | 只读保留期视图 |
| unconsumed-evidence.mjs | show | 差集投影；exit 0 = 正常（有无未消费证据是结论不是工具错误） |
| run-accept.mjs | **judge** | 交付验收原子动作；预检红不写，绿才落盘 |
| acceptance-check.mjs | **judge** | 收活判据三态求值；exit 1 = FAIL/UNVERIFIED/零判据（不放行） |
| runtime-clean.mjs | **operate** | 运行区清理；默认 dry-run，--yes 才删 |
| bundle-sessions.mjs | show | bundle→见证会话清单（诊断入口第一步）；exit 1 = 零绑定（不是裁决） |

**关键更正**：`scripts/` 不是「judge + 两个例外」。按入口件计（排除 lib 90 + 根数据/文档），约 61 件里 judge 约 43、show 约 11、operate 约 5、非面约 6。**run-ops 名字是 operate，内容 10/14 是 show**——名字与动词相反，P0 必须如实写。

### 2.1 probes/ 的一个真实口径问题
`probe-registry` 门禁（`scripts/verify/gates/f-repo.mjs:100-118`）扫 `probes/**/*.{mjs,cjs}`（跳过 `_index.mjs`），要求六字段齐全。`stream/llm-stream-tee.cjs` **当前被当探针扫**，且它的头注确实写了六字段（判据栏 = 「不适用」）。INDEX.generated.md 也把它列为 stream 域 1 支。

按本文规则它是**非面（驱动）**——预载仪器，永不判 PASS/FAIL。但**现行门禁把它当探针**，这是规则与门禁的口径差。P0 的处理：在例外表登记它为「非面（驱动），但现行 probe-registry 仍按探针扫；口径统一是 P1 的事」。**不要在 P0 改门禁或改它的头注**——那会让 probe-registry 红。

## 3. P0：只做声明（零搬家、零行为改动）

### 3.1 合同文件
新建 docs/guides/67-surface-contract.md，链接进 docs/00-index.md 的 guides 行。**第一句必须写**：「本文的『面』只指维护入口（checks/probes/tools 三分），不指 `evaluation.md` 的 L0–L4 评估面。」

本仓 `doc-budgets` 门禁只查登记的 AGENTS.md（`scripts/doc-budgets.json`），新建 guides 文档不需要预算条目。但 `doc-paths` 门禁会查反引号里的仓内路径——合同里引用本仓路径时确保它们存在。

### 3.2 根布局（`AGENTS.md` 第 58、59、63 行）——替换，不加行
`AGENTS.md` 预算 140 行（`scripts/doc-budgets.json`），当前接近上限，**替换不加行**：

```text
probes/     show：behavior / browser / stream；_index（生成器）与 stream tee（驱动）是非面（tee 现行仍被 probe-registry 按探针扫）
scripts/    mixed（待拆）：judge（verify/smoke/run-gates、run-accept、acceptance-check、release-check）+ show（run-ops 10/14）+ operate（dist 3、runtime-clean）
dev/        operate（run+act）：env.sh / boot-run / run-driver / run-kickoff / hitl-answer / hooks / overlay / record-* / render-*
```

### 3.3 目录 README 首行
- probes/README.md 标题后加：`> 维护面：show（_index 与 stream tee 是非面；tee 现行仍被 probe-registry 按探针扫）。规则 = [surface-contract](../../../research/docs/guides/67-surface-contract.md)。`
- `scripts/README.md` 顶部加：`> 维护面：mixed（judge + show + operate，待拆）。分组面表见下；规则 = [surface-contract](../../../research/docs/guides/67-surface-contract.md)。` 并在既有分组表前插一张**组级面表**（§2 的 scripts 分组明细压缩版）。
- `dev/README.md` 标题后加：`> 维护面：operate（run + act）。env.sh 是配置（非面）；llm-socket-isolation.cjs 是驱动（非面）。规则 = [surface-contract](../../../research/docs/guides/67-surface-contract.md)。`

注意：`probe-registry` 要求 probes/README.md 链接 INDEX.generated.md——加面声明行不影响，但**不要删既有的索引链接**。

### 3.4 例外表（放合同文末）

| 路径/组 | 面 | 理由（核实过） |
|---|---|---|
| scripts/run-ops/watch-run、session-events、run-dashboard、stream-diagnostics、provider-error-stats、plan-card-stats、session-replay、scene-capture、run-inventory、unconsumed-evidence、bundle-sessions | show | 只读投影/诊断/回放；exit 1 是超时/歧义/零绑定，不是裁决 |
| scripts/run-ops/run-accept、acceptance-check | judge | 交付验收/收活判据；红 = 不放行 |
| scripts/run-ops/runtime-clean | operate | 清理运行区；--yes 才删 |
| scripts/dist/export-dist、market、export-handoff | operate | 产出 _dist 工件 |
| scripts/dist/release-check | judge | 发布前版本/tag 一致性裁决 |
| scripts/dist/product-manual.md | 非面（数据） | 手册源，被 b-pack gate 消费 |
| scripts/test/run-lane.mjs | 非面（runner） | 车道调度 |
| scripts/lib/* | 非面（实现） | 90 件支撑库 |
| scripts/smoke/*.support.mjs（4 件） | 非面（support） | 夹具/支援件 |
| scripts/smoke/registry.json | 非面（数据） | 车道登记表 |
| scripts/根 *.json | 非面（数据） | doc-budgets / archived-note-pointers / test-path-redirects |
| probes/_index.mjs | 非面（生成器） | 索引生成/校验；--check 是 probe-registry 的守卫 |
| probes/stream/llm-stream-tee.cjs | 非面（驱动） | 预载仪器，判据不适用；**现行 probe-registry 仍按探针扫，口径统一归 P1** |
| dev/env.sh、dev/research.overlay.yml | 非面（配置） | sourced 环境 / 生成物 overlay |
| dev/llm-socket-isolation.cjs | 非面（驱动） | NODE_OPTIONS 预载，socket 隔离 |
| dev/record-asset-ledger、record-ci-oracle、record-role-fixture、render-overlay、render-test-index | operate（act） | 生成 fixture/索引/overlay（--check 是守卫） |

### 3.5 P0 验收
```sh
pnpm verify    # 预期绿（probe-registry / doc-paths / doc-budgets / md-links）
pnpm test      # 预期绿（无行为改动）
```
人工核对：三处 README 首屏可见面声明；例外表逐条在盘上找得到；probes/README.md 仍链接 INDEX；`scripts/README.md` 的组级面表与 §2 一致。

## 4. P1：可选拆分（高风险，需用户批准）

### 4.1 先拆 scripts，再谈改名
1. **show 出 scripts**：run-ops 的 11 件 show 迁 probes/analyze/（或 probes/run/）。**撞墙点**：
   - `probe-registry` 要求每支探针六字段（状态/一句话/何时跑/档位/判据/不证明）+ INDEX 字节一致。这 11 件当前头注格式不统一（有的有退出码语义，有的没有六字段），**迁入前必须逐件补字段**。
   - `probes/_index.mjs --write` 重生成索引；`scanProbeEntries` 递归扫 `*.mjs`/`*.cjs`，新域自动收录。
   - probes/README 的域表需加 analyze/run 域定义。
   - docs/guides/66-probe-playbook.md 的「什么时候来」需扩口径（从「真实边界单点机制实验」扩到「也包括只读日志投影」）。
2. **operate 出 scripts**：dist 的 3 件 operate + run-ops 的 runtime-clean 迁到 `dev/` 的组（本仓 operate 面就是 dev），或新建 `tools/`。**撞墙点**：
   - `scripts/verify/gates/b-pack.mjs` 多处硬编码 `scripts/dist/product-manual.md`、`scripts/dist/export-dist.mjs` 路径（:114、:410、:466、:499、:524、:535）——**搬走 dist 必须同 diff 改这些 gate 输入**。
   - `package.json` 的 export-dist / market 等命令路径。
   - 新建 `tools/` 会从 3 个面变 4 个门牌——先问值不值；迁 dev/ 更省。
3. **judge 留 scripts**：verify / smoke / run-gates / run-accept / acceptance-check / release-check；test 与 lib 作非面附属。
4. 每步更新：`scripts/README.md`、docs/guides/60 命令、`package.json`、`doc-paths`、`test:checks`。

### 4.2 改名（不建议现在做）
`scripts/` → `checks/` 是一个**161 文件、630 个外部 tracked 文件引用、3460 处字面量**的项目（其中 342 个引用文件在冻结归档区 _backlog/_archived + `notes/archived`）：
- `scripts/test-path-redirects.json` 是现有重定向账本（md-links 对缺失目标先查本簿）；改名需新增 161 条，且冻结层不改写——旧链接靠账本解析。
- `scripts/AGENTS.md` 是**目录注入**：harness 按子树注入指令，改名会改变注入哪份 AGENTS.md，不只是路径。
- `dist/`、`run-ops/`、`smoke/`、`test/` 仍在里面；只改名不改组，得到的 `checks/` 仍有约 1/3 不是 judge。
- `dev/env.sh:57` 设置 `core.hooksPath dev/hooks`（相对路径）；若同时改 dev/ 名，老 clone 静默不跑 hooks。

**结论**：保留 `scripts/`，用面声明 + 组表消除歧义；真要做 161 文件改名，另立迁移项目，别塞进 P0/P1。（2026-11-16 更新：统一已是承诺方向 D64；161 文件改名仍另立迁移项目、先纯化后统一，别塞进 P0/P1。）

### 4.3 stream tee 口径统一（P1 子项）
若要把 `llm-stream-tee.cjs` 从探针计数摘出：
- `scripts/lib/shared/probe-index.mjs:21` 的 `NON_PROBE_FILES` 当前只有 `_index.mjs`；需加 `stream/llm-stream-tee.cjs`（或按「判据：不适用」自动豁免）。
- `probe-registry` 与 `_index.mjs` 共用这个纯函数，改一处两边生效。
- INDEX 重生成后 stream 域变 0 支；`probe-registry` 的「扫到 0 支探针即红」是对整个 probes/ 的，不是对单域的，所以不会红。
- **这是行为改动（门禁扫描面变了），需用户批准 + 红→绿留证。**

### 4.4 同 diff 义务
- 新 Note（`notes/implemented/`）：记录决定、输掉的方案、红→绿证据。
- docs/guides/66-probe-playbook.md 若扩口径，同 diff 改。
- `scripts/README.md` 组级面表随搬移更新。
- docs/evaluation.md 不需要改（它讲的是评估面，不是维护面）。

## 5. 验收（P1 若做）
```sh
# 1. 基线
pnpm verify && pnpm test
# 2. 只搬不改引用 → 预期红（doc-paths / probe-registry / b-pack gate / 命令字面量），留证
# 3. 补引用 + gate 输入 + 六字段 + 重生成
node probes/_index.mjs --write
pnpm verify && pnpm test
# 4. 改名（若做）：redirect ledger / AGENTS.md 注入 / 归档豁免 / hooksPath 全过
```

## 6. 不要做
- 不要把 `scripts/` 写成「judge，两个例外」——它是三动词混装，例外是多数。
- 不要把 `run-ops` 当 operate：它 10/14 是 show；名字必须让位于行为。
- 不要把 `_index.mjs` 算进探针数；它是生成器。
- **不要在 P0 改 stream tee 的头注或 probe-registry 的扫描面**——现行门禁把它当探针，P0 只登记口径差，不动门禁。
- 不要先改名再拆组；先让每组只含一种动词，改名才有意义。
- 不要把本仓的「维护面」和 `evaluation.md` 的 L0–L4「评估面」混用。
- 不要在 P0 阶段搬任何文件或改任何 exit code。
