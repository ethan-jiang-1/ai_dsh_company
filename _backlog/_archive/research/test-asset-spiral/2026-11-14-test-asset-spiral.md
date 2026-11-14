---
topic: 测试资产螺旋：从例子到生成器/模型/元测试
intent: 解释“资产很多但 exploratory 每轮还能抓 8 个 bug”的机制，给出退役、增补与机械棘轮的可落地方案
---

# 测试资产螺旋

## 0. 一句话

最近三轮的 bug，不是“测试写少了”，而是**上一轮新建层的边界**；更刺眼的是——**上一轮 Note 的「未覆盖轴」已经写明了下一轮 bug**。资产侧却仍按“一 bug 一 spec”增长。例子型资产关实例，关不了类。

## 1. 现状数字（2026-11-14）

- 247 个 keyless spec / **29,090 行** / 5,042 个 `expect` / 1,770 个 `it`；74 道门禁；29 个冒烟；67 个探针（全部手动、67 个“未分类”）。
- 断言形状：`it.each` 仅 17 处（约 1% 用例），用例内 `for…of` 332 处；`toMatchSnapshot` 0；59 个 spec 带「负例留证」。**资产体量已经很大，问题不是“少”。**
- 已修缺陷 **181** 张；活跃 **0**（v5 的 BUG-176..183 已全部修复归档；Next=184）。
- 已有资产系统：四层 lane（spec/e2e/entry/checks）、`asset-lanes` 注册表、`test-census` 盘子、覆盖率棘轮、`failure-classes` 决策表、`naming-contract`、`fix-evidence`、`notes-tree`、`carrier` 门禁、`world-shapes` 矩阵。
- 缺口（`tests/failure-classes.md`）：类 5 模型可见文本无回放资产；类 11 性能无层；类 2 host registry dispose 部分；类 4 工具 schema 部分。
- 未做（`test-asset-fence`）：A4 门禁负例扩面、A5 探针消费者图、B6 模型可见回放。

### 1.1 数量趋势（同一口径）

| 时点 | 用例数 | 活跃缺陷 |
|---|---|---|
| 2026-11-13 19:26（v2） | 2034 | 8（BUG-152..159） |
| 2026-11-14 08:45（v3） | 2046 | 8（BUG-160..167） |
| 2026-11-14 10:17（v4） | 2066 | 8（BUG-168..175） |
| 2026-11-14 11:01（v5 发现） | 2072 | 8（BUG-176..183） |
| 2026-11-14 12:58（v5 修复后） | **2074** | **0** |

四轮 +32 个缺陷，用例只 +40；**每轮新增的用例数与下一轮新缺陷数基本同量级**。资产在长，缺陷也在长——这就是“例子型资产”的稳态。

## 2. 三轮螺旋证据

| 轮 | 卡 | 上一轮新建的层 | 资产响应 |
|---|---|---|---|
| v3 | BUG-160..167 | 文档形状层（normalize/scan/table）、pre-push range、notes-tree | 手写 fixture 扩到 `prd-check` / `requirements-check` / `pre-push-surfaces` / `notes-tree` |
| v4 | BUG-168..175 | v3 形状状态机的边界（行内代码/未闭合注释/转义/JSON 注释） | 同一批 spec 再加 8 条手写用例 |
| v5 | BUG-176..183 | v4 修复的边界（围栏容器/跨行 code span/路径分隔符/门禁读卡/notes 根） | 同批 spec 再加用例 |

**关键证据：未覆盖轴 → 下一轮 bug。**

- v3 Note 的 `## 未覆盖轴` 写了「注释与围栏嵌套」「GFM 行内代码 span 里未转义的 `|`」；v4 的 168/169/172/173 正是行内代码、未闭合注释、表格转义、注释里的 JSON。
- v4 Note 的 `## 未覆盖轴` 写了「行内代码 span 的跨行/嵌套」；v5 的 181 正是跨行 code span。
- v5 Note 的 `## 未覆盖轴` 写了 5 条：Windows 实机/CI、跨行 code span 闭合行之后、围栏块嵌套、命令只证形态不证执行、notes 根 symlink 一律红——**这就是 v6 的种子**。
- 这不是巧合，是循环：**修完一层 → 记下未覆盖轴 → 下一轮 exploratory 按轴找 → 又落回例子型 spec。**

## 2.2 具体第二事实源（这是“类”的物理位置）

| 事实 | 现有实现 | 症状 |
|---|---|---|
| “哪些行算 Markdown 结构” | `packages/company-pack/src/lib/markdown-shape.ts`、`checks/gates/fix-evidence.mjs:79-123`、`checks/gates/notes-tree.mjs`、`tools/lib/backlog-liveness.mjs` | **4 份实现**；两天 32 个缺陷（BUG-152..183）全在这一族；门禁是 `.mjs` 不引 TS，所以各自又写了一遍形状状态机 |
| 路径段 / 分隔符 | `company-root.ts:23-27`（分隔符）、`:40-62`（`..` 栈式消解）、`relToCompany` / `walkCompanyDirs` / POSIX `dirname` | 三处语义未交叉验证；`file-shape-agreement.spec.ts:174-190` 只枚举 5 条 rel，无属性矩阵 |
| lane / 资产选择 | `tests/repo/asset-lanes.spec.ts`、`tests/tools/lane-match.spec.ts`、`tests/checks/pre-push-surfaces.test.mjs`、`tests/CENSUS.generated.md` | 4 处判据；散文已漂：`fast-lane.mjs:5` 说 6 条、`asset-lanes.mjs:153-154` 实为 4；`asset-lanes.mjs:274` 说 69 探针、实为 67 |
| 覆盖率豁免 | `tests/support/coverage-baseline.json`（796 行） | 有 `removeWhen` 字段，但没有测试盯“到期/续命”；豁免可以永久 0% |

**结论**：这些不是“测试没覆盖”，是**新层自己复制了第二份事实源**。先收成一份（或只在 TS/JS 边界保留两份并做差分），再谈生成器；否则生成器只会把四份实现的分叉一起生成出来。

## 3. 为什么例子型资产关不掉类

1. **夹具空间是手挑的**：每个 bug 加一条手写输入，覆盖的是“这个实例”，不是“这类输入的分布”。
2. **oracle 是同一个实现**：parser/gate 的测试读同一份代码假设；边界外的组合没人枚举。
3. **门禁自身没有元测试**：新门禁（fix-evidence/notes-tree/naming/carrier）靠一次性红证；门禁逻辑的边界（假命令、删除、symlink、代码块里的节标题）由 exploratory 发现。
4. **资产只增不减**：census 只数“有什么”，不记 lastRed/consumer/replaceBy；一次性 spec 与无消费者探针没有退役压力。
5. **未覆盖轴只写不消费**：Note 的 `## 未覆盖轴` 是 prose，没有 `→ 资产/卡` 的强制去向。

## 4. 下一层四类资产

### A. 文档语法生成器（先做，bug 质量最大）

- 新 `新建:tests/support/doc-grammar.ts`：种子化生成文档，轴 =
  行尾（LF/CRLF/CR）、BOM、围栏（```/~~~，嵌套/未闭合）、行内代码 span（run 长度/跨行）、
  HTML 注释（行内/未闭合）、表格转义（`\|`/`\\`/行尾）、标题（ATX/重复）、编号（missing/empty/invalid/duplicate）、
  日期（非法/闰年）、JSON 块（围栏/行内/注释里/legacy）、路径分隔符（`/`/`\`/`..`/绝对）。
- 新 `新建:tests/lib/markdown-shape.property.spec.ts`、`新建:tests/host/commands/prd-gate.property.spec.ts`、`新建:tests/checks/notes-tree.property.spec.ts`：每个面 200–500 个生成用例；oracle = `tests/failure-classes.md` 的期望类 + 独立参考模型（不是实现内部函数）。
- 红证：拆 `normalizeDocument` / `scanDocument` / `splitTableRow`，生成器必须红；不是只红一条手写用例。
- 成本：无新依赖；keyless；预计 +1–2s。

### B. 门禁元测试/变异

- 新 `新建:tests/checks/gate-mutation.test.mjs`（或 `新建:checks/lanes/gate-mutation.e2e.mjs`）：对高风险 gate 的**源码规则**做变异（删分支/翻比较/改正则），断言 gate 红；配 valid/invalid fixture 各一份。
- 首批：`fix-evidence`、`notes-tree`、`naming-contract`、`company-root-carriers`、`proposals`、`notes-liveness`、`backlog-liveness`。
- 红证：删 gate 里的一条检查 → 元测试红；还原绿。
- 退役：`gates-negative` / `two-axis-gates` 的手写负例逐步由 mutation 覆盖，保留端到端 smoke 一条。

### C. 差分/契约（第二事实源）

- 新 `新建:tests/contract/gate-command-parity.spec.ts`：同一份生成文档，`/prd check`、present 闸门、`/req check` 的判定必须一致；不一致 = 第二事实源。
- 新 `新建:tests/contract/pre-push-range.spec.ts`：临时 git 仓库生成 merge/new-branch/delete-ref 形状，断言 changed files 与 git 真值一致。
- 新 `新建:tests/contract/notes-tree-model.spec.ts`：生成 lifecycle 状态/日期/symlink，断言“非法日期不可见”“symlink 必红”“状态词闭集”。
- 红证：改一个载体的判据 → 差分红；还原绿。

### D. 状态模型（第二优先）

- 新 `新建:tests/contract/lease-model.spec.ts` / 进程 lane：生成 acquire/release/heartbeat/takeover 序列，断言单 writer、fencing、恢复；进程级进 weekly lane。
- 新 `新建:tests/contract/task-board-model.spec.ts`：生成 team/task 事件序列，断言合并、缺席、partial 投影的闭集。
- 红证：去掉 fencing/merge 规则 → 模型红。

## 5. 退役清单（与新增同轮做）

**判据：一个资产如果没有“独有失败类 + 消费者 + 最近红”，就是候选退役/合并。**

- **探针**：67 个，67 个未分类；先做 A5 消费者图（`tools/lib/asset-lanes.mjs` / census 加 `consumer`）。无消费者的调试探针 → 删除或写 `manualReason`；有消费者的保留。
- **一次性 shape spec**：v3/v4/v5 里为单个 CRLF/BOM/fence/comment/escape 加的手写用例，生成器覆盖后删重复；保留每类一条“命名回归”（带 BUG 号）证明生成器确实抓得到。
- **重复门禁负例**：`gates-negative` / `two-axis-gates` 中被 mutation 覆盖的手写负例，保留端到端一条。
- **重复冒烟**：census 里 fast+surface+weekly 三重登记的资产生检查；同一行为只留最便宜层，其余降 `manualReason`。
- **陈旧 fixture/snapshot**：`tests/fixtures` provenance + `snapshots` 新鲜度门；过期即归档/删除，不“以后可能有用”。
- **只查形状的旧门禁**：`proposals` 的“## 验收 在场”已被 marker/fact 检查加强；保留规则，合并实现，不重复扫。

**退役前必须证明**：生成器/模型能红（拆实现 → 红），否则不删命名回归。

## 4.2 候选资产（适合/不适合与成本）

| 候选 | 是否适合 | 判据 / 成本 | 落点 |
|---|---|---|---|
| **最小复现语料库**（每 bug 一个命名 fixture + 期望） | **最适合，先做** | oracle = 期望结论 + 失败类；可被 property/differential 复用；0.5 人日 | `tests/fixtures/` + 表驱动 spec |
| **Property-based**（手写 seeded 生成器，不引 fast-check） | **最适合**：R1/R2/R4 输入都是小语法 | 独立不变量（幂等、围栏内永不 structural、`a/../b` 同读、列数=表头）；失败能缩成具名样例；1–2 人日，无新依赖 | `tests/lib/*.property.spec.ts`（新建） |
| **Differential**（同一输入跑 4 个消费者） | **最适合**：32 张里 11 张是“两个消费者各有一套解释” | oracle = 结构分类一致；不一致打印两方视图；0.5–1 人日 | `新建:tests/host/contract/structure-agreement.spec.ts`（新建） |
| **Model-based**（扫描器状态机） | **适合但只限共享扫描层** | 状态模型 + 参考实现；随机 token 流上断言分类一致/不吞行/幂等；2–3 人日 | `新建:tests/lib/markdown-shape.model.spec.ts`（新建） |
| **Fault-injection**（chmod/rename 目标/symlink/SIGKILL） | **中等**：写面有恢复语义；不进 push | 外部快照零变化 + typed refusal + 重启可读；1–2 人日 | `checks/lanes/*.e2e.mjs`（新建，weekly） |
| **Contract-conformance**（证据四行/命令语法/注册表闭集） | **适合**：门禁自身要契约 | oracle = 公开契约；合成卡/命令表驱动；0.5 人日 | `tests/checks/*.test.mjs` 表驱动化 |
| **Mutation**（定向删状态转移/分支） | **定向适合，全面不适合** | 每个新状态至少一测红；只对 shape/fix-evidence/path；<30s | `checks/audit/` 只读报告 |
| **Soak**（万份文档/长跑） | **低适合**：插件+文档门禁，易 flaky | 只发现内存/句柄/性能；3–5 人日 + 维护 | 不进 gate；nightly/手动 |
| **全量 mutation / 真模型 fuzz / Windows-only gate** | **不适合** | 慢、噪声、贵或本机无 runner | — |

## 5.1 首批退役候选（具体到文件）

| # | 候选 | 现状 | 为什么退/并 | 保留什么 |
|---|---|---|---|---|
| R1 | `tests/content/*-english.spec.ts` 共 12 个：其中 11 个是 `content-english.spec.ts` 的子集重复，保留超集 | 只证“目录无中文” | `content-english.spec.ts:23-27` 已对 `content/**` 做同断言（超集）；存在性另有 `content-manifest.mjs:9-12` | 文件清单相等这一条并成一件；其余 11 件删 |
| R2 | `tests/evidence/collaboration-probe-verdict.spec.ts` | 74 行，`indexOf` 切探针源码 + `runInNewContext` | 探针 0 自动；改探针文案即抛 “Verdict block moved” | 判据抽 `tools/lib`（先例 `team-concurrency-verdict.mjs`） |
| R3 | gitignore-guards spec（已退役 2026-11-14） | 40 行，只断 `.gitignore` 文本形状 | 门 `checks/gates/gitignore-shape.mjs` 同时做文本 + `git check-ignore` 真匹配，每次 verify 都跑；`company-workspace` / `_dist` 规则已并入门 | 无；已删 |
| R4 | candidate-scan-labels.spec（321 行） | 已退役 2026-11-14 | 先被 bug-coverage 棘轮挡住（BUG-011 唯一具名守卫）；把 BUG-011 的假设段 + CMO/ASSIGN 活用例迁到 `tests/tools/candidate-scan-assignments.spec.ts` 后，标签语料测试随仪器退役 | 新 spec 保留 BUG-011 具名守卫 + 红配方 |
| R5 | `tests/repo/snapshot-index.spec.ts` | 21 行，只测 helper 渲染 | 真判据在 `snapshot-index.mjs:3-5`；`snapshots-budget.spec.ts` 同型 | 合并成一件 snapshots 纯逻辑 |
| R6 | `probes/session-context/human-exits-{expression,nonblocking}-probe.mjs`、`probes/team/{claim-race,team-claim-loser,team-concurrency}-probe.mjs` | 同一边界三份实现；0 自动、全未分类 | 合并每族 1 个（保留覆盖面最宽者），其余删 | 合并件的 `consumer`/`manualReason` |
| R7 | `tests/checks/gates-negative.test.mjs:5`、`two-axis-gates.test.mjs:5`、`tests/content/state-english.spec.ts:2`、`tests/presets/persona-english.spec.ts:8-9` | 陈旧头注 | 写的是已删除的 checks/smoke/、已翻完的 PENDING | 头注改现行事实，不删文件 |
| R8 | `tests/harness/` | 空壳目录（`git ls-files` 为空） | 拆分残留 | 无；删目录 |
| R0 | `tests/lib/prd-check.spec.ts` / `requirements-check.spec.ts` 的手写 shape 段 | 412 / 350 行 | 同一形状层被两个 spec 分别枚举；生成器/共享实现后可覆盖组合 | 每类一条带 BUG 号的命名回归；其余由生成器接管 |

**退役前必须证明**：生成器/模型/共享实现能红（拆实现 → 红），否则不删命名回归。

**优先级**：先做 R1/R2/R3（直接对应本轮 32 张的高频根因），R4/R5/R6 随对应门禁下一轮改动同 diff 做；R7 头注随见随改，R8 目录直接删。

## 4.1 具体缺口（按“探索最容易再命中”排序）

1. **Markdown 形状跨消费者差分/收口**：4 份实现是最大 bug 工厂。优先把纯逻辑抽成 `tools/lib` 的 JS 核心（门禁可 import，TS 侧薄包装），只保留 TS/JS 边界；差分测试只证边界。生成器排在收口之后。
2. **路径规范化矩阵**：`/`、`\`、`.`、内部 `..`、尾部 `..`、`a/../../b` 的等价类；读/写/删入口同判据；不要只枚举 5 条 rel。
3. **门禁历史证据分支**：`fix-evidence.mjs:287-291` 的 shallow-clone 跳过分支零测试；squash-merge/amend/detached HEAD 同。唯一会静默跳过的分支必须显式钉。
4. **lane 注册表 ↔ 散文 ↔ 盘面三向**：现在只钉注册表↔census；散文数字/路径漂移无人管（`fast-lane.mjs:5`、`asset-lanes.mjs:274`、`tools/checks-index.mjs:3`）。
5. **`pnpm test:e2e|test:entry` 分派**：四条命令 + skip 打印无测试；`--suffix` 选 0 件也会绿（全跳 = 假绿）。
6. **探针存活**：67 个探针 0 自动 0 分类；至少补“引用的入口/场景/会话仍存在”的存在性检查，再做消费者图。
7. **覆盖率豁免到期**：`coverage-baseline.json` 的 `removeWhen` 没有测试盯到期/续命。
8. **门禁自测补齐**：`naming-contract` 与 `company-root-carriers` 没有 `tests/checks` 件——本轮新门里唯独它们没被自己证过。

## 6. 螺旋棘轮（把“上升”变成机械面）

1. **未覆盖轴必须有去向**：Note 的 `## 未覆盖轴` 每行必须带 `→` 资产路径或 issue 链接（或 `不适用 + 理由`）。`notes-liveness` 新增检查（生效日 + 祖父豁免）。下一轮 exploratory 先按这些轴跑，不再靠灵感。
2. **类复发 ≥2 轮 → 必须升级资产形状**：`tests/failure-classes.md` 加 `lastRound` / `assetShape`（example/generator/model/meta）/ `recurrence`。同一类在连续两轮出现且只有 example → 下一轮必须生成器/模型/元测试；example 不算。
3. **census v2**：每个资产加 `lastRed` / `lastRun` / `consumer` / `replaceBy` / `retireWhen` / `shape`；`test-census.spec` 校验字段；`replaceBy` 非空且无独有类 → 到期红。
4. **weekly 生成 lane**：`新建:checks/lanes/generative.e2e.mjs` 跑生成器 + gate mutation，keyless，不进 pre-push；失败即新类候选，按 §5 分诊。
5. **指标换轴**：从“spec 数/行覆盖”换成“失败类 × 资产形状覆盖、生成用例数、gate mutation score、退役资产数、新类在合入前被抓的比例”。

## 7. 路线图（按杠杆）

- **P0（1 天）**：census v2 字段 + A5 探针消费者图 + 退役清单（先删无消费者/重复）；`failure-classes` 加 recurrence/assetShape；不写新 spec。
- **P1（2–3 天）**：doc grammar + 3 个 property spec；gate mutation 覆盖 5 个高风险门禁；2 个差分 spec（gate-command、pre-push-range）。
- **P2（1–2 天）**：notes-tree/lease 状态模型；weekly generative lane；`## 未覆盖轴 → 去向` 门禁。
- **P3（按需）**：类 11 性能层（只有真实预算才建）；类 5 模型可见回放（另题）；不要为覆盖率数字补测。

## 8. 不做什么

- 不引入 fast-check/新依赖，除非手写生成器证明不够；种子化生成器 + 参考模型足够。
- 不为覆盖率百分比写测试；不给“资产数量”发奖。
- 不新增门禁而不配 gate mutation/负例；不保留无消费者的探针。
- 不删命名回归而不先证明生成器能红。
- 不把“未覆盖轴”继续写成 prose；它必须是资产或卡。

## 9. 验证这个方案是否真的上升

- 下一轮 exploratory：若 bug 落在生成器已覆盖的轴 → 是**生成器缺口**，修生成器，不加手写 spec；若落在新类 → 按 §6.2 判定是否升级为生成器/模型。
- 指标：连续两轮同类 bug 数下降；gate mutation score 上升；退役资产数 > 新增一次性 spec 数；`## 未覆盖轴` 有去向的比例 = 100%。
- 反证：如果两轮后资产数量仍只增不减、同类 bug 仍 8 个/轮，说明方案失败，回滚生成器层，改为“减少面/减少层”而不是继续加资产。
