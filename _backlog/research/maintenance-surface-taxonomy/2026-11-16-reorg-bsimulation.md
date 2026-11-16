---
topic: maintenance-surface-taxonomy
intent: ai_dsh_bsimulation 维护面整理单（自包含，可复制到该仓）；含盲审修订、P0 声明与高风险改名清单
---

# ai_dsh_bsimulation 维护面整理单

> 怎么用：§1 规则；§2 现状（本仓 `checks/` 是**混装**，不是纯 judge）；§3 P0 只做声明；§4 可选拆分/改名（高风险，先算成本）；§5 验收；§6 不要做。

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
- 改名是独立项目：要过 redirect ledger、gate 输入、hooksPath、归档豁免。

## 2. 本仓现状：checks 是混装

| 目录 | 面 | 现状 |
|---|---|---|
| `dev/` | **operate**（run+act） | env.sh / gui.sh / headless.sh / vendor-build.sh / hooks / overlays；env.sh 本身是配置（非面） |
| `checks/` | **mixed（待拆）** | judge：verify / gates / quality / mutants；show：audit（默认只出报表，`--strict` 才 exit 1）；operate：backlog / openspec / build / evidence / release 的 act 半；非面：test（runner）、report（reporter）、terms.mjs（数据） |
| `probes/` | show | cdp / e2e / session；e2e 的 acceptance-setup / preflight / report 是 helper（非面） |

**关键更正**：`checks/` 不是"judge + 5 个例外"，而是**三种动词混装**。按文件粗算，约 47/79 不是 judge。P0 必须如实写"混装，待拆"，不许写成"judge，待迁"。

## 3. P0：只做声明（零搬家）

### 3.1 合同
新建 docs/surface-contract.md（§1 压缩版），链接进 docs/00-index.md。本仓没有文档行数门禁，但不要往 `AGENTS.md` 加行——用替换。

### 3.2 根布局（`AGENTS.md` 36/39/40 行）——替换，不加行

```text
dev/        operate（run+act）：env.sh / gui.sh / headless.sh / vendor-build.sh / hooks / overlays
checks/     mixed（待拆）：judge（verify/gates/quality/mutants）+ show（audit）+ operate（backlog/openspec/build/evidence/release act 半）
probes/     show：cdp / e2e / session；e2e 的 setup/preflight/report 是 helper（非面）
```

### 3.3 目录 README 首行
`checks/README.md` 加 `> 面：mixed（judge + show + operate，待拆）`；probes/README.md 加 `> 面：show（helper 是非面）`；`dev/README.md` 加 `> 面：operate（run + act）`。

### 3.4 例外表（放合同文末）

| 组 | 面 | 说明 |
|---|---|---|
| checks/audit | show | 三个只读报表；`--strict` 才裁决 |
| checks/backlog | operate | 建卡/移卡/改状态，持久改动 |
| checks/openspec | operate | change 脚手架与归档 |
| checks/build | operate | 生成 client bundle |
| checks/evidence | operate | 录/比 model-visible surface |
| checks/release | mixed | artifact/install/profile-smoke 是 judge；export-dist/dist-refresh/dist-cleanup/market-index/tag-* 是 operate |
| checks/test | 非面（runner） | 只调度 |
| checks/report | 非面（reporter） | JUnit 输出 |
| checks/terms.mjs | 非面（数据） | 术语登记表 |
| probes/e2e/acceptance-setup、preflight、report | 非面（helper/fixture） | 为人/探针准备状态，不是面 |

### 3.5 P0 验收
`pnpm verify` 绿（doc-maps 要求 `checks/README.md` 点名每个子目录；docs-links 可解析）；三处 README 首屏可见面声明；例外表逐条在盘上找得到。

## 4. P1：可选拆分（高风险）

### 4.1 先拆 `checks`，再谈改名
1. `checks/audit` → show：迁 probes/analyze/（需要把 probes 的"只观测活组合"口径扩到"也观测仓库产物"），或把三个报表改成默认 exit 1 变成 judge（行为改动，需用户裁）。**二选一，不要两头都占。**
2. checks/backlog、`openspec`、`build`、`evidence` → operate：迁到 `dev/` 下的组，或新建 `tools/`。迁移前先更新 `doc-maps` 的 MAPS、`checks/README.md`、`package.json` 命令、所有 checks/... 字面量。
3. checks/release → 按件拆：judge 半留 checks/release，operate 半去 operate 面。

### 4.2 改名（不建议现在做）
`dev/` → `tools/dev/` 看起来只是改名，实际会打断：
- checks/gates/root.mjs 明确列了 `dev/env.sh`；checks/gates/dev-isolation.mjs 读 `dev/env.sh` 与 `dev/README.md`，并扫 `['dev','probes','checks']`——改名后两处红 + 扫描面漏。
- `env.sh` 设置 `core.hooksPath dev/hooks`（相对路径，写进本地 git config）；老 clone 改名后会**静默不跑 hooks**。
- tests/checks/fresh-start.test.mjs 复制 `dev/env.sh`。
- 文档/命令里约 260 处 `dev/env.sh` 引用；归档区不能改写，要 redirect ledger。

**结论**：除非把它当独立迁移项目（gate 输入、hooksPath、redirect ledger、归档豁免一起做），否则**保留 `dev/`，用面声明消除歧义**。名字不统一不会让 fresh agent 糊涂——没有面声明才会。

## 5. 验收（P1 若做）
1. 搬前：`pnpm verify` 绿、`pnpm test` 绿。
2. 只搬不改引用：预期 doc-maps / docs-links / 命令字面量红，留证。
3. 补引用 + 重生成：`pnpm verify` 绿；`pnpm test` 绿；`pnpm openspec:check` 绿。
4. 改名（若做）：checks/gates/root.mjs、`dev-isolation.mjs`、tests/checks/fresh-start.test.mjs、hooksPath、文档引用全部过一遍；老 clone 的 hooks 重新安装。

## 6. 不要做
- 不要把 `checks` 写成"judge，5 个例外"——它是混装，例外是多数。
- 不要把 helper（acceptance-setup / preflight / report）当探针；它们是管道件。
- 不要先改名再拆组；先让每组只含一种动词，改名才有意义。
- 不要为了三仓同名去动 `probes`：它已经是三仓里最一致的名字。
