---
topic: maintenance-surface-taxonomy
intent: 本仓维护面整理单（自包含 handoff，含完整决策上下文）；实施 agent 只读本文即可动手
---

# 本仓（ai_dsh_company）维护面整理单

> **给实施 agent**：本文自包含——规则、为什么是这套规则、本仓现状的逐条证据、P0 的精确插入文本、P1 的成本与撞墙点、验收命令，全在这里。你不需要读研究过程的其他材料；需要反例来源时再看 [盲审记录](2026-11-16-blind-review.md)。
> **授权边界**：P0（§3）是声明层改动，用户已点名要做；P1（§4）涉及搬家与预算裁决，**动手前必须拿到用户对 A/B 选项的明确答复**。本文不是 P1 的授权。

## 0. 背景：这套规则怎么来的（30 秒版）

三个姊妹仓（本仓、`ai_dsh_bsimulation`、`ai_dsh_deep_research`）都有 3 个维护面目录，但名字不同（checks/probes/tools vs checks/probes/dev vs probes/scripts/dev），内部混装程度不同。2026-11-16 的研究做了四件事：

1. **全量分类**：本仓 126 个公开入口逐条按「产出什么」判定，115/122 与现址一致（94.3%）；7 个冲突全部集中在 `tools/`。
2. **独立盲审**：无历史上下文的只读子代理找出 19 条反例，推翻了两处早期结论——①「三仓应统一改名」被撤回（改名会打断 gate 输入、hooksPath、数千处引用，且不是清晰度的前提）；②「operate 是一个动词」被细化为 run/act 两种模式。
3. **收敛出的规则**：两层 × 三面 × 两个前置轴（§1）。核心判据一句话：**「主要产出什么？」**——裁决→judge，证据→show，持久状态→operate。
4. **落地策略**：P0 只做面声明（零搬家、零行为改动），先让 fresh agent 不按目录名猜错；P1 搬家是可选的后续，成本已算到文件级。

**为什么值得做**：本仓的 `tools/observe/` 7 件全是「给人看的证据工具」，却住在「改世界的操作」目录下；fresh agent 按目录名选工具时会把只读分析器当成会动盘的操作。这不是审美问题，是选错工具的风险。

## 1. 规则（v2，三仓同文）

**两层**
- **oracle**：由 `pnpm test` 的 runner 跑（vitest / node:test）→ `tests/`。不是面。判 runner，不判进程数——spec 里偶尔 spawn 子进程仍是 oracle。
- **entry**：要自己起命令/进程/浏览器 → 下面三面。

**三面（只对 live entry）**
- **judge**：主要产出是**裁决**——会红，且有人（hook/CI/验收）据此放行或退回。
- **show**：主要产出是**证据**——截图、摘要、报表、导出；红了只是让人来看，不阻塞变更。
- **operate**：主要产出是**持久状态**——环境/仓库/发布物/生成物。两种模式：
  - **run**：起/复用进程，失败 = 没起来，重试即可（如 `pnpm company`）。
  - **act**：持久改动，失败可能半途，需要 converge/repair（如 `sync-dsh`、`converge`）。

**两个前置轴（先于三面判定）**
- **生命周期**：头注 `状态：已耗` → 非面（归档候选），不进面计数。本仓已有机械门 `script-status` 强制这个字段。
- **管道件**：lib / driver / fixture / runner / reporter / 索引生成器 / 纯查询 / support → 非面，跟消费者住，不单独占门牌。

**判定（按顺序）**
1. 已耗？→ 非面（归档）。
2. 管道件？→ 非面，跟消费者。
3. 主要产出什么？裁决 → judge；证据 → show；持久状态 → operate（起进程的标 run）。
4. 混合件按终端产物；双模件（`--write`/`--check`）按主产物；**被 judge 调用不改变面**（在消费方头注记依赖）。
5. 仍冲突：**产物 > 失败语义 > 名字**。

**为什么「产物」优先于「失败语义」**：盲审发现「失败要重跑」对所有条目都成立（任何脚本崩了都要重跑），判别力为零；而「产出是裁决还是证据还是世界状态」三者互斥，可判。

**目录名**
- P0 **不改名**。本仓已经是目标名（checks/probes/tools），无需动。
- 另两仓的 `dev/`、`scripts/` 改名是独立项目（gate 输入、hooksPath、redirect ledger、归档豁免），不在本次范围。

## 2. 本仓现状（逐条核实过，2026-11-16）

| 目录 | 面 | 盘上事实 | 例外 |
|---|---|---|---|
| `checks/` | judge | gates 75 + lanes 32 + audit 7 = 114 件 | 2 个 lane runner（`fast-lane.mjs`、`keyless-lane.mjs`，非面）；1 个已耗（`candidate-scan-eval.mjs`，非面/待归档） |
| `probes/` | show | 59 支 `*-probe.mjs`，四域（team 20 / fs-taskboard 10 / browser-visual 14 / session-context 15） | `team/read-barrier/index.mjs` 是 fixture（非面） |
| `tools/` | operate | dev 6 + observe 7 + repo 11 + release 3 = 27 件 | **observe 7 件全是 show**；`repo/refactor-drift.mjs` 是 judge；`repo/run-check-tests.mjs` 是 runner（非面）；`repo/snapshot-path.mjs` 是纯查询（非面） |
| `run/` | 非面 | env.sh + 2 overlay + README | 启动配置，不是第四面 |

**三个必须知道的既有事实**：
1. **库存口径分裂**：`checks/INDEX.generated.md` 说探针 60（把 fixture 算进去了），`tests/CENSUS.generated.md` 说 59（按注册表）。根因 = `tools/lib/checks-index.mjs` 的 walk 没有排除 `probes/**/index.mjs`，而 census 的 `probeFiles()` 只匹配 `*-probe.mjs`。两个门禁各查各的源，所以都绿。
2. **AGENTS.md 布局块有一处过时**：第 20 行写 `smoke/（真实入口冒烟）`，盘上是 `lanes/`。`layout-block` 门禁只查首列路径存在性，不查说明文字，所以漏过。P0 顺手修。
3. **`tools/README.md` 第 5 行有一处错误**：说「本仓的『脚本』= `checks/` 的 smoke / lane / audit / probe」——probes 不在 checks 下。P0 顺手修。

**结论**：本仓三面已具名，真正要治的只有 `tools/` 里的 **7 件 show + 1 件 judge**。不要为了「三仓统一」去动 checks/probes/tools 的名字。

## 3. P0：只做声明（零搬家、零行为改动）

### 3.1 合同文件
新建 docs/surface-contract.md，内容 = §1 的压缩版（建议 24 行以内）。然后：
- `docs/index.md` 书架加一行链接（当前 44/48 行，有余量）。
- `checks/gates/doc-budget.mjs` 的 `DOC_LINE_BUDGETS` 加一条 `['docs/surface-contract.md', 28]`。
- **不要往 `docs/testing.md` 加**——它已在 75/75 顶格，加一句就红。

### 3.2 根布局（`AGENTS.md` 第 20、22、23 行）——替换，不加行
`AGENTS.md` 现在 **83/84 行**，加行会撞 doc-budget 棘轮。把这三行**原位替换**为：

```text
checks/                 judge：会拦人的判断（gates/ lanes/ audit/）
probes/                 show：给人看的证据（team/ fs-taskboard/ browser-visual/ session-context/）
tools/                  operate：改世界的操作（dev/ repo/ release/；observe/ 是 show，见合同例外表）
```

注意：原第 20 行的 `smoke/` 字样在此一并修正为 `lanes/`。`run/` 行（第 25 行）不动——它已经写明「tracked 启动配置」，与非面定位一致。

### 3.3 目录 README
- `checks/README.md` 首行后加：`> 面：judge（会拦人的判断）。规则与例外 = [surface-contract](../docs/surface-contract.md)。`
- `tools/README.md` 首行后加：`> 面：operate（改世界的操作）。observe/ 组是 show 例外，见 [surface-contract](../docs/surface-contract.md)。` 同时把第 5 行的「checks/ 的 smoke / lane / audit / probe」改为「checks/ 的 lane / audit 与 probes/ 的 probe」。
- `probes/` **新建** `README.md`（3–5 行）：`> 面：show（给人看的证据）。` + 链接合同 + 指向 `checks/INDEX.generated.md` 的探针节 + 一句「四域 = 共享 harness/证据源/失败模式的机制分组；fixture 入口（`<域>/<fixture>/index.mjs`）不是探针」。

### 3.4 例外表（放合同文末，13 条）

| 路径 | 面 | 理由（核实过） |
|---|---|---|
| tools/observe/orient.mjs | show | 只读运行态全景；exit 0，不拦人 |
| tools/observe/diagnose.mjs | show | 失败摘要给人看；`--strict` 是可选裁决，不改身份 |
| tools/observe/explore-evidence.mjs | show | 会话证据包导出，产物是证据 |
| tools/observe/notes-audit.mjs | show | 只读工作表；`--strict` 同上 |
| tools/observe/ask-latency.mjs | show | 延迟分布报数，不裁决 |
| tools/observe/propose-sampler.mjs | show | 自发提案分箱取样 |
| tools/observe/session-log-export.mjs | show | 导出明文日志 = 证据（盲审 #9：按产物判，不按「失败要重跑」判） |
| tools/repo/refactor-drift.mjs | judge | 零漂移裁决，exit 1 = 退回重构 |
| checks/audit/candidate-scan-eval.mjs | 非面（已耗） | 头注 `状态：已耗（2026-11-13 语料已移出本仓）`；缺语料 exit 2 |
| checks/lanes/fast-lane.mjs | 非面（runner） | 只调度 FAST 4 条，自身不证明行为 |
| checks/lanes/keyless-lane.mjs | 非面（runner） | 只调度 weekly 全量 |
| tools/repo/run-check-tests.mjs | 非面（runner） | 只调度 tests/checks |
| tools/repo/snapshot-path.mjs | 非面（查询） | 解析引用、打印路径，不读不写证据 |
| probes/team/read-barrier/index.mjs | 非面（fixture） | 实验监听器，被 concurrency probe overlay 加载 |

### 3.5 P0 验收
```sh
pnpm verify          # 预期 ALL PASS（doc-taxonomy / doc-budget / md-links / bare-path / script-index）
```
人工核对：根布局三行与三个 README 首屏可见面声明；例外表 13 条逐条在盘上找得到；`AGENTS.md` 行数 ≤84。

## 4. P1：可选搬家（先拿用户裁决，再动手）

### 4.1 搬什么
- `tools/observe/` 7 件 → probes/analyze/（新域），改名 `*-probe.mjs`。
- `tools/repo/refactor-drift.mjs` → checks/audit/refactor-drift-audit.mjs。
- `tools/observe/` 目录删除；`tools/README.md` 四组改三组。

**为什么 analyze 是新域而不是塞进现有四域**：这 7 件共享同一套 harness（zstd + 会话日志/notes 读取）、同一数据源（既有日志，不 boot 世界）、同一失败模式（解析/折叠错误），符合「域 = 共享 harness + 证据源 + 失败模式」的定义；它们不启动浏览器也不起会话，塞进 browser-visual 或 session-context 都会让域定义失真。census 的 domain 列是自由文本，加 `analyze` 不会撞任何门禁。

### 4.2 会撞的墙（全部核实过）

| 墙 | 事实 | 处置 |
|---|---|---|
| **P2 探针棘轮** | `tests/repo/budget/test-census.spec.ts:16` `MAX_PROBES = 59`，当前正好 59；迁 7 件 → 66 必红 | **需用户裁**：A 一次性抬顶 59→66 + 同 diff Note（移动不是新增，建议把 P2 口径改成「登记能力」）；B 同批退役 7 支同族探针（风险大，不建议捆绑） |
| **script-triggers 头注** | 改名后 7 件全部新匹配 `-(probe)\.mjs$` 触发正则；`orient.mjs` 的「何时跑」在第 10 行（门禁只查前 8 行）→ **orient-probe 必红** | 同 diff 把 orient 的「何时跑」提到前 8 行；其余 6 件已合规 |
| **script-index 扫描面** | `tools/lib/checks-index.mjs:14` `TOOL_GROUPS = ['dev','observe','repo','release']`；observe 删掉后顶层散件检查会红 | 同 diff 改 TOOL_GROUPS 为三组 + 重生成 INDEX |
| **注册表** | `tools/lib/asset-lanes.mjs` PROBES 需 +7 条（domain: 'analyze'）+ FAILURE_CLASS_BY_NAME +7 条 | 候选失败类：orient/ask-latency/diagnose/explore-evidence/session-log-export = 会话持久化；notes-audit = 文档指针；propose-sampler = 模型可见文本 |
| **refactor-drift 命名** | `checks/audit/` 只许 `-(audit\|check\|eval\|ratchet).mjs` | 改名 `refactor-drift-audit.mjs`；头注已有 状态+何时跑，合规 |
| **冻结层链接** | `notes/archived/2026-10-16-deliverables-audit-seam.md:35` 有一条 `.md` 链接指向 refactor-drift；`notes-archived-links` 门禁会红 | 按 `notes/archived/AGENTS.md` 的唯一例外：**只修链接路径那一行，正文不动** |
| **覆盖率基线** | `tests/support/coverage-baseline.json:801` 豁免 reason 提到 diagnose 路径（键 `tools/lib/diagnosis.mjs` 不动）；入口脚本本身不在 coverage include（只含 `tools/lib/**`） | 只改 reason 文字；`pnpm coverage:ratchet` 应不受影响 |

### 4.3 引用替换清单（live 面，8 个文件 18 处；已排除归档与本题材料）

| 文件 | 处数 | 改什么 |
|---|---|---|
| `package.json` | 3 | orient / notes:audit / diagnose 三条脚本路径 |
| `checks/README.md` | 4 | 第 13、14、56、58 行的链接与命令 |
| `notes/implemented/2026-10-30-notes-consistency-governance.md` | 1 | 第 21 行 notes-audit 链接 |
| `notes/implemented/2026-11-10-exploration-asset-strategy.md` | 3 | 第 31、59、72 行 explore-evidence 路径 |
| `tests/support/coverage-baseline.json` | 1 | 第 801 行 reason 文字 |
| `tools/lib/orient.mjs` | 1 | 第 3 行注释 |
| `tools/lib/session-evidence.mjs` | 1 | 第 5 行注释 |
| `checks/INDEX.generated.md` | 重生成 | `node tools/repo/checks-index.mjs --write` |

**不需要改的**：`pnpm orient` / `pnpm diagnose` 等命令别名在 40 个文件里出现，但它们走 package.json 间接引用，路径改了命令不变；归档区（`_backlog/_archive`、`notes/archived`）对 tools/observe 零 `.md` 链接、零裸路径提及（已 grep 核实）；本题研究材料是自指成本，实施同 diff 更新或接受 bare-path 观察档提醒。

**相对 import 不用改**：`tools/observe/` 与 probes/analyze/ 同为两层深，`../lib/`、`../drivers/` 解析不变；`tools/repo/` 与 `checks/audit/` 同理。refactor-drift 只 import node:crypto/fs，无仓内依赖。

### 4.4 同 diff 义务
- 新 Note（`notes/implemented/`）：记录决定、输掉的方案（B 退役路线）、红→绿证据；若取代 `2026-11-15-tools-purpose-groups.md` 的四组决定，按 `notes-supersession` 门禁在旧 Note 加回链。
- `tools/README.md` 四组→三组 + 四问改三问。
- docs/surface-contract.md 例外表删掉已搬走的 8 条（它们不再是例外）。
- 重生成两份库存：`checks-index --write`、`test-census --write`。

### 4.5 不建议做的
- 不要动 checks/probes/tools 三个顶层名——本仓已是目标名。
- 不要把 `checks/audit` 拆成 wired/manual 两层——那是第二级分类，不是本次的面。
- 不要动 `tests/` 归属、`run/` 配置。

## 5. 验收（P1 若做）

```sh
# 1. 基线
pnpm verify && pnpm test:checks
# 2. 只搬不改引用 → 预期红（留证：script-index / bare-path / test-census.spec / notes-archived-links）
# 3. 补注册表 + 引用 + 头注 + 重生成
pnpm verify && pnpm test:checks
# 4. 行为面（只读，各跑一次）
source run/env.sh && pnpm orient && pnpm diagnose && pnpm notes:audit
# 5. 覆盖率
pnpm coverage:ratchet
```
红→绿三步留证写进 Note；`MAX_PROBES` 改动必须有用户裁决记录。

## 6. 不要做
- 不要给三面再开子面（checks/judge/、probes/show/）——面是顶层目录，不是目录里的目录。
- 不要把 runner/reporter/fixture 写进资产清单或探针计数。
- 不要让「已耗」条目继续占面计数；归档前先标非面。
- 不要把 `tests/` 当第四面：它是 oracle 层，服务所有面。
- 不要在 P0 阶段搬任何文件——P0 的全部价值就是零风险地消除名字歧义。
