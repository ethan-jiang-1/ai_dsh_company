---
topic: maintenance-surface-taxonomy
intent: 本仓维护面整理单（自包含、可执行）；含盲审修订后的规则、P0 声明与可选 P1 搬家
---

# 本仓（ai_dsh_company）维护面整理单

> 怎么用：§1 = 规则；§2 = 现状核对；§3 = 现在就能做的 P0（零搬家）；§4 = 可选搬家（先算成本）；§5 = 验收；§6 = 不要做。
> 盲审修订：三面不变，但加了两条前置轴（生命周期、管道件），并**撤回了"必须改名"**——改名不是清晰度的前提，且成本被低估。见 [盲审记录](2026-11-16-blind-review.md)。

## 1. 规则（v2）

**两层**
- oracle：由 `pnpm test` 的 runner 跑（vitest / node:test）→ `tests/`。不是面。
- entry：要自己起命令/进程/浏览器 → 下面三面。

**三面（只对 live entry）**
- **judge**：红了会拦下变更 / 退回返工。
- **show**：红了只是让人来看现场（证据、报表、诊断）。
- **operate**：红了意味着世界没准备好。两种模式：
  - **run**：起/复用进程，失败 = 没起来，重试即可。
  - **act**：持久改动，失败可能半途，需要 converge / repair。

**两个前置轴**
- **生命周期**：`状态：已耗` → 非面（归档），不进面计数。
- **管道件**：lib / driver / fixture / runner / reporter / 索引生成器 / 纯查询 / support → 非面，跟消费者住。

**判定（按顺序）**
1. 已耗？→ 非面（归档）。
2. 管道件？→ 非面，跟消费者。
3. 主要产出什么？
   - 裁决（会红、有人据此放行/退回）→ **judge**
   - 证据（截图、摘要、报表、导出）→ **show**
   - 持久状态（环境/仓库/发布物/生成物）→ **operate**；起进程的标 run 模式
4. 混合件按终端产物；双模件按主产物；被 judge 调用不改变面（记依赖）。
5. 仍冲突：**产物 > 失败语义 > 名字**。

**目录名**
- P0 **不改名**：先在根布局与目录 README 声明面；现状名与目标名分开写。
- 目标名（可选，P1 以后）：`checks` / `probes` / `tools`；`dev` 只作 `tools/dev` 组，`scripts` 退役。
- 改名是独立项目：要过 redirect ledger、gate 输入、hooksPath、归档豁免，不在 P0。

## 2. 本仓现状映射

| 目录 | 面 | 现状 | 例外（非默认面） |
|---|---|---|---|
| `checks/` | judge | gates 75 + lanes 32 + audit 7 | 2 个 lane runner（非面：`fast-lane`、`keyless-lane`）；1 个已耗（`candidate-scan-eval`，非面/待归档） |
| `probes/` | show | 59 支四域 + 1 fixture | `read-barrier/index.mjs` 是 fixture（非面，且不该计入探针数） |
| `tools/` | operate | dev 6 / repo 11 / release 3 | `observe/` 7 件全是 show；`refactor-drift` 是 judge；`run-check-tests` 是 runner（非面）；`snapshot-path` 是纯查询（非面） |
| `run/` | 非面 | env.sh + overlay | 启动配置，不是第四面 |

**结论**：本仓三面已经具名，真正要治的只有 `tools/` 里的 **7 件 show + 1 件 judge**。不要为了"统一"去动 checks/probes/tools 的名字。

## 3. P0：只做声明（零搬家）

### 3.1 合同
新建 docs/surface-contract.md（§1 的压缩版，20–24 行）；在 `docs/index.md` 书架加一行；在 `checks/gates/doc-budget.mjs` 的 `DOC_LINE_BUDGETS` 加一条（建议 28）。**不要往 `docs/testing.md` 加**（已在 75/75 顶格）。

### 3.2 根布局（`AGENTS.md` 20–22 行）——替换，不加行
`AGENTS.md` 现在 83/84 行，**加行会撞 doc-budget**。把三行改成（行数不变）：

```text
checks/                 judge：会拦人的判断（gates/ lanes/ audit/）
probes/                 show：给人看的证据（team/ fs-taskboard/ browser-visual/ session-context/）
tools/                  operate：改世界的操作（dev/ repo/ release/；observe/ 是 show，待迁）
run/                    非面：启动配置（env.sh + overlay）
```

同时把原文里过时的 `smoke/` 字样换成 `lanes/`（这是顺手修一处实际错误）。

### 3.3 目录 README 首行
`checks/README.md`、`tools/README.md` 各加一行 `> 面：judge` / `> 面：operate`；`probes/` 新建 3 行 README（`> 面：show` + 链接合同 + 指向 `checks/INDEX.generated.md`）。

### 3.4 例外表（放合同文末）

| 路径 | 面 | 理由 |
|---|---|---|
| tools/observe/orient.mjs | show | 读运行态，不拦人 |
| tools/observe/diagnose.mjs | show | 失败摘要给人看 |
| tools/observe/explore-evidence.mjs | show | 证据包给人看 |
| tools/observe/notes-audit.mjs | show | 只读工作表 |
| tools/observe/ask-latency.mjs | show | 报数，不裁决 |
| tools/observe/propose-sampler.mjs | show | 分箱取样 |
| tools/observe/session-log-export.mjs | show | 导出的是证据，不是世界状态 |
| tools/repo/refactor-drift.mjs | judge | 零漂移裁决 |
| checks/audit/candidate-scan-eval.mjs | 非面（已耗） | 状态=已耗，语料已移出；等归档 |
| checks/lanes/fast-lane.mjs、keyless-lane.mjs | 非面（runner） | 只调度，不裁决 |
| tools/repo/run-check-tests.mjs | 非面（runner） | 只调度 gate 测试 |
| tools/repo/snapshot-path.mjs | 非面（查询） | 只解析引用、打印路径 |
| probes/team/read-barrier/index.mjs | 非面（fixture） | 监听器夹具，不是探针 |

### 3.5 P0 验收
`pnpm verify` 绿（doc-taxonomy、doc-budget、md-links、bare-path）；根布局与三个 README 首屏可见面声明；例外表每条都能在盘上找到。

## 4. P1：可选搬家（先算成本，不急着做）

**唯一值得搬的**：`tools/observe` 7 件 → probes/analyze/（改名 `*-probe.mjs`）；`refactor-drift` → `checks/audit/`（改名 `*-audit.mjs`）。

**会撞的墙**：
- `MAX_PROBES = 59`，迁 7 件 → 66，`test-census.spec` 必红。需要用户裁：A 一次性抬顶 + Note，或 B 同批退役 7 支同族探针。
- `tools/lib/checks-index.mjs` 的 `TOOL_GROUPS` / `PUBLIC_DIRS` 还写着 `observe`，搬完要同 diff 改，否则 `script-index` 报散件。
- 引用：`package.json` 3 条脚本、`checks/README.md` 3 处、2 篇 implemented Note、`tests/support/coverage-baseline.json` 1 条 reason、2 处 lib 注释、本题研究材料（自指）。
- `refactor-drift` 改名要满足 `checks/audit/*-(audit|check|eval|ratchet).mjs`。

**不建议做的**：为了"三仓同名"去动 checks/probes/tools——本仓已经是目标名，改名只会制造无收益的引用面。

## 5. 验收（P1 若做）
1. 搬前：`pnpm verify` 绿、`pnpm test:checks` 绿。
2. 只搬不改引用：预期 `script-index`、`bare-path`、`test-census.spec` 红（留证）。
3. 补注册表 + 引用 + 重生成：`pnpm verify` 绿；`pnpm orient` / `pnpm diagnose` / `pnpm notes:audit` 各跑一次。
4. `pnpm coverage:ratchet` 绿（入口脚本不进基线，若报 stale 先读差异再 `--update`）。

## 6. 不要做
- 不要给三个面再开子面（checks/judge/、probes/show/）——面是目录，不是目录里的目录。
- 不要把 runner/reporter/fixture 写进资产清单。
- 不要让"已耗"条目继续占面计数；归档前先标非面。
- 不要把 `tests/` 当成第四面：它是 oracle 层，服务所有面。
