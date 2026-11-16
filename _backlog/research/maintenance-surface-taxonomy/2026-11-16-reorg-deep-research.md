---
topic: maintenance-surface-taxonomy
intent: ai_dsh_deep_research 维护面整理单（自包含，可复制到该仓）；含术语冲突、P0 声明与高风险改名清单
---

# ai_dsh_deep_research 维护面整理单

> 怎么用：§1 规则；§2 现状（本仓 `scripts/` 是三动词混装）；§3 P0 只做声明；§4 可选拆分/改名（高风险）；§5 验收；§6 不要做。
> **术语警告**：本仓 docs/evaluation.md 的"面"= 评估等级 L0–L4，**与本文的"维护面"不是一回事**。本文第一句就要写清，否则 fresh agent 会把两套"面"混起来。

## 1. 规则（v2）

**两层**
- oracle：由 `pnpm test` 的 runner 跑 → `tests/`。不是面。
- entry：要自己起命令/进程/浏览器 → 下面三面。

**三面（只对 live entry）**
- **judge**：红了会拦下变更 / 退回返工。
- **show**：红了只是让人来看现场（证据、报表、诊断）。
- **operate**：红了意味着世界没准备好。两种模式：**run**（起/复用进程，失败重试）与 **act**（持久改动，失败可能半途，需要 converge/repair）。

**两个前置轴**
- **生命周期**：`状态：已耗` → 非面（归档），不进面计数。
- **管道件**：lib / driver / fixture / runner / reporter / 索引生成器 / 纯查询 / support → 非面，跟消费者住。

**判定（按顺序）**
1. 已耗？→ 非面。
2. 管道件？→ 非面，跟消费者。
3. 主要产出什么？裁决 → judge；证据 → show；持久状态 → operate（起进程的标 run）。
4. 混合件按终端产物；双模件按主产物；被 judge 调用不改变面（记依赖）。
5. 仍冲突：产物 > 失败语义 > 名字。

**目录名**
- P0 **不改名**；先在根布局与目录 README 声明面。
- 目标名（可选）：checks / probes / tools；dev 只作 tools/dev 组，scripts 退役。
- 改名是独立项目：要过 redirect ledger、gate 输入、归档豁免。

## 2. 本仓现状：scripts 是混装

| 目录 | 面 | 现状 |
|---|---|---|
| `probes/` | show | behavior / browser / stream；`_index.mjs` 是索引生成器（非面），`stream/llm-stream-tee.cjs` 是预载驱动（非面，永不判红） |
| `scripts/` | **mixed（待拆）** | judge：verify / smoke / run-gates，以及 run-ops 的 run-accept、acceptance-check、dist 的 release-check；show：run-ops 的 watch-run / session-events / run-dashboard / stream-diagnostics / provider-error-stats / plan-card-stats / session-replay / scene-capture / run-inventory；operate：run-ops 的 runtime-clean / bundle-sessions、dist 的 export-dist / market / export-handoff；非面：test（runner）、lib（90 件实现）、smoke 的 `*.support.mjs` 与 `registry.json` |
| `dev/` | **operate**（run+act） | env.sh / boot-run / run-driver / run-kickoff / hitl-answer / hooks / render-overlay / vendor-build；env.sh 本身是配置（非面） |

**关键更正**：`scripts/` 不是"judge + 两个例外"，而是**三种动词混装**，且 `run-ops` 名字是 operate、内容以 show 为主——**名字与动词相反**。P0 必须如实写"混装，待拆"。

## 3. P0：只做声明（零搬家）

### 3.1 合同
新建 docs/guides/67-surface-contract.md，链接进 docs/00-index.md。第一句写"本文的'面'只指维护入口，不指 `evaluation.md` 的 L0–L4 评估面"。

### 3.2 根布局（`AGENTS.md` 58/59/63 行）——替换，不加行

```text
probes/     show：behavior / browser / stream；_index（生成器）与 stream tee（驱动）是非面
scripts/    mixed（待拆）：judge（verify/smoke/run-gates、run-accept、release-check）+ show（run-ops 多数）+ operate（dist、runtime-clean/bundle-sessions）
dev/        operate（run+act）：env.sh / boot-run / run-driver / run-kickoff / hitl-answer / hooks / overlay
```

### 3.3 目录 README 首行
probes/README.md 加 `> 面：show（_index 与 stream tee 是非面）`；`scripts/README.md` 顶部加 `> 面：mixed（judge + show + operate，待拆；分组见下）` 与一张组级面表；`dev/README.md` 加 `> 面：operate（run + act）`。

### 3.4 例外表（放合同文末）

| 组 | 面 | 说明 |
|---|---|---|
| scripts/run-ops | mixed | show：watch-run / session-events / run-dashboard / stream-diagnostics / provider-error-stats / plan-card-stats / session-replay / scene-capture / run-inventory；judge：run-accept、acceptance-check；operate：runtime-clean、bundle-sessions（--archive） |
| scripts/dist | mixed | operate：export-dist、market、export-handoff；judge：release-check |
| scripts/test | 非面（runner） | 车道调度 |
| scripts/lib | 非面（实现） | 90 件支撑库 |
| scripts/smoke/*.support.mjs | 非面（support） | 夹具/支援件 |
| scripts/smoke/registry.json | 非面（数据） | 车道登记表 |
| probes/_index.mjs | 非面（生成器） | 索引生成/校验；`--check` 是门禁的守卫 |
| probes/stream/llm-stream-tee.cjs | 非面（驱动） | 预载仪器，判据不适用 |

### 3.5 P0 验收
`pnpm verify` 绿（probe-registry 要求探针六字段 + 索引字节一致；doc-paths 要求反引号路径可解析；doc-budgets 只查登记的 AGENTS.md）；三处 README 首屏可见面声明；例外表逐条在盘上找得到。

## 4. P1：可选拆分（高风险）

### 4.1 先拆 `scripts/`，再谈改名
1. **show 出 scripts**：`run-ops` 的 9 件 show 迁 probes/analyze/（或 probes/run/），按本仓探针规格补六字段、改名、重生成 probes/INDEX.generated.md；`probe-registry` 会逐条查。
2. **operate 出 scripts**：`dist/` 3 件 operate 与 `run-ops` 的 runtime-clean / bundle-sessions 迁到 `dev/` 的组（本仓 operate 面就是 dev），或新建 `tools/`——但那会从 3 个面变 4 个门牌，先问值不值。
3. **judge 留 scripts**：verify / smoke / run-gates / run-accept / acceptance-check / release-check；`test` 与 `lib` 作非面附属。
4. 每步更新：`scripts/README.md`、docs/guides/60 命令、`package.json`、`doc-paths`、`test:checks`。

### 4.2 改名（不建议现在做）
`scripts/` → `checks/` 看起来只是改名，实际是**161 个文件、631 个 tracked 文件引用、3093 处 `scripts/` 字面量**的项目：
- `scripts/test-path-redirects.json` 是现有重定向账本；改名要新增 161 条，并处理 _backlog/_archived 与 `openspec/changes/archive` 里**不能改写的历史**。
- `scripts/AGENTS.md` 是**目录注入**：改名会改变 harness 注入哪份子树指令，不只是路径。
- `dist/`、`run-ops/`、`smoke/`、`test/` 仍在里面；只改名不改组，得到的 `checks/` 仍有约 1/3 不是 judge。

**结论**：保留 `scripts/`，用面声明 + 组表消除歧义；真要做 161 文件改名，另立迁移项目，别塞进 P0/P1。

## 5. 验收（P1 若做）
1. 搬前：`pnpm verify` 绿、`pnpm test` 绿。
2. 只搬不改引用：预期 `doc-paths`、`probe-registry`（索引/字段）、命令字面量红，留证。
3. 补引用 + 重生成：`node probes/_index.mjs --write`、`pnpm verify` 绿、`pnpm test` 绿。
4. 改名（若做）：redirect ledger、`scripts/AGENTS.md` 注入、归档豁免、全部命令与文档一起过；老 clone 的 hooks 重新安装。

## 6. 不要做
- 不要把 `scripts/` 写成"judge，两个例外"——它是三动词混装，例外是多数。
- 不要把 `run-ops` 当 operate：它多数是 show；名字必须让位于行为。
- 不要把 `_index.mjs` / `llm-stream-tee.cjs` 算进探针数；它们是生成器/驱动。
- 不要先改名再拆组；先让每组只含一种动词，改名才有意义。
- 不要把本仓的"面"和 `evaluation.md` 的 L0–L4"评估面"混用。
