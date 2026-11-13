# 加工环路的入口与事实检查点

> 状态：proposed（已批；P0/P1 已落，P2 余）｜ 批准：用户 2026-11-13「按照我们的流程，把这个落地吧」｜ 上游：[问题卡](../../_backlog/_archive/settled_issues/2026-11-13-workflow-entry-and-fact-checkpoint.md)（已结）

## 问题

fresh-context 走查发现三层缺口，而不是一层：

1. **入口**：活跃 `_backlog` 没有合法可开工任务——唯一卡自述「不改产品代码」，`待落地` 不是任务源（[dev-loop:37](../../docs/guides/dev-loop.md)），但 `_backlog/AGENTS.md` 的五道门把它写得像「下一步」。fresh agent 只能纸面假设「用户点名」才能继续。
2. **一致性**：沿路撞到 6 处文档自相矛盾——`_backlog/README.md` 落地出口「Note 回链」vs `implementation` 不建 Note；`notes/README.md` proposed = 未实施 vs 唯一 RFC 部分已实现；`data-model.md` 声称字段含 readers/writers 但表头没有；`src/README.md` 四个命令 vs 源码五个；`src/README.md` 把 language 合同/`client-copy` 写成将来时；`triggers.md` 不收「用户点名」。
3. **发现**：事实/载体问题不是 `dev-loop §3` 四问要求的，而是 `notes/README.md` 和 `tests/README.md` 顺带提的；`company-root-carriers` 在 `verify` 阶段才红，代码已写完。
4. **验收**：`proposals` 只查 `## 验收` 标题，空节也绿；`notes-liveness` 只查 `## 决定` 标题；`backlog-liveness` 的 `sectionBody` 只查非空，「待定/见 RFC」也绿；普通 feature 的红是自述；语义审连续 24 次「未执行」有记录。

证据 = [fresh agent 走查](../../_backlog/_archive/research/workflow-entry-and-fact-checkpoint/2026-11-13-fresh-agent-walkthrough.md) / [规则 × 门禁对账](../../_backlog/_archive/research/workflow-entry-and-fact-checkpoint/2026-11-13-workflow-gate-audit.md)。

## 事实与载体

- 事实（新增/修改）：加工环路的**入口规则**（`待落地` ≠ 任务源）、**状态事实与载体**节、**验收可执行性**。
- 唯一入口：`_backlog/AGENTS.md`（入口）+ `dev-loop §1/§3`（执行）+ `notes/README.md` / `notes/proposed/README.md`（模板）。
- 读载体：fresh agent、RFC 作者、Note 作者、门禁维护者。
- 写载体：同上 + `checks/gates/`。
- 一致性判据：同一规则只住一个 owner；门牌只指路，不复述；模板与门禁同 diff；允许的偏离（如 `implementation` 不建 Note）必须在入口处写明。

## 环境轴与红证

- 相关轴：fresh agent 误读、文档漂移、自述 prose、行预算、并发编辑。
- 不变量：入口可判定（能一句话说出「现在能不能开工」）、规则单一 owner、验收可执行、每条新门禁有红证。
- 红证（实现前先红）：zz 负例卡/RFC/Note + `pnpm verify` 红；详见 `## 验收`。
- 不适用轴：无（流程本身就是被测对象）。

## 方案

### P0（先做，半天）— 能合法开工、信任地图

**P0-1 入口握手**
- `_backlog/AGENTS.md`「五道门」后加一条铁律：`待落地` = 等授权，不是任务源；用户让你「从卡里挑」= 先列候选 + 请示，不自行开工。
- 根 `AGENTS.md` 的「开工最小路径」在现有句子里追加同一句（**不新增行**，预算 84/84）。
- 判据：一个 fresh agent 读完这两处，能说出「没有点名/已批 RFC 就停」；把「从卡里挑」当授权 = 红（人审）。

**P0-2 六处矛盾**
| # | 落点 | 改法 |
|---|---|---|
| 1 | `_backlog/README.md:24` | 落地出口改成「去向落点 + 真证据（`note` = Note 回链；`implementation` = 提交/合同；`rfc` = RFC 链接）」，与 `:40` 对齐；压缩同节一段以守 140 行预算。 |
| 2 | `notes/proposed/2026-11-12-bilingual-company.md` | 半实施 RFC 迁 `notes/implemented/`（状态 `部分交付`），剩余 A2/A3b/A4 开一张 issue 卡承接；或把 `notes/README.md:16` 的 proposed 定义改为「已批、未完全实施，剩余条目须有归宿」并同步 `proposal-graduated` 判据。**二选一，RFC 实施时定**；默认前者（毕业 = 每条有归宿）。 |
| 3 | `docs/contracts/data-model.md:12` | 表头补 `读者` / `写者` 两列；行内填现有 carriers；不新增行，只加列。若某些行确实无读者，写 `—`。 |
| 4 | `packages/company-pack/src/README.md:13` | 「四个 `/命令`」→「五个」；`:39` 的 A4 将来时改成「A4 未落地，勿引用；当前由 skill + review 守」。 |
| 5 | `_backlog/triggers.md:5` | 不改「不收用户点名」的规矩；把 FTS 的 >100–200 页触发写回其 issue 卡（`新建:_backlog/issues/...` 或现有卡），`triggers.md` 只收可观察事件。 |
| 6 | `notes/README.md:16` | 与 #2 同一处，二选一后只改一次。 |

判据：6 处逐条对账；`pnpm verify` 绿；同一事实不再有两份说法。

### P1（一天）— 一个事实/载体/轴检查点

**P1-1 通用执行链**
- `dev-loop §1` 的「定切片」加：`状态事实 / 唯一入口 / 读载体 / 环境轴`；写不出载体名单 = 切片没定清。
- `dev-loop §3` 四问前加一段前置问题（不新增第五行，避免「四问」改名）：这次改动的事实是什么？唯一入口是谁？谁读它？哪条环境轴会坏？落点指 `tests/README.md` 与 `tools/lib/carrier-registry.mjs`。

**P1-2 模板**
- `_backlog/issues/README.md` 卡模板加 `## 事实与读者`（新事实/写者/读者/环境坏法四行）+ `## 验收标准` 三列骨架（命令 | 断言 | 红形态），仅 `毕业：做` 的卡必填。
- `notes/proposed/README.md` 的 RFC 三件加一件：`## 状态事实与载体` + `## 环境轴与红证`。
- `notes/README.md` 的 Note 必载加一条：`## 状态事实与载体`（as-built）+ `## 未覆盖轴`。
- 预算：`_backlog/README.md` 136/140、`notes/README.md` 125/132；先搬/压再加（搬去哪 = 各 owner README 的重复段，先删指针化）。

**P1-3 门牌**
- `新建:notes/AGENTS.md`（20–30 行）：写 RFC/Note 前四问；规则在 README；门禁 `proposals`/`notes-liveness`。
- `新建:tests/AGENTS.md`（15–25 行）：加 spec 三问；新持久化事实 → shape + carrier registry；门禁 `layering`/`spec-duplicates`/`guard-red-record`/`company-root-carriers`。
- `_backlog/AGENTS.md` 加一行指向「定事实与载体」；不新增第二份手册。

**P1-4 机械面**
- `checks/gates/proposals.mjs`：新 RFC（文件名日期 ≥ 2026-11-14）必须有非空 `## 状态事实与载体`；旧 RFC 祖父豁免。
- `checks/gates/notes-liveness.mjs`：新 Note（日期 ≥ 2026-11-14）必须有非空 `## 状态事实与载体`；旧 Note 祖父豁免。
- 两门各配 `zz` 负例（缺节 → 红；补节 → 绿），红证原话进门禁头注与实施 Note。
- `_backlog/methods/validation-design.md` 在「分行为」后加一步「命名事实与载体」。
- `close-out-definition` 的收割三问后加「第四问：事实/载体/轴」，不改「三问」名称，避免引用漂移。

### P2（半天）— 让验收可执行

- `tools/lib/backlog-liveness.mjs` 的 `sectionBody` 与 `checks/gates/proposals.mjs` 从「非空」升级为「至少一个可执行标记」：反引号命令首词 ∈ `{pnpm,node,git,rg,source,npx}` 且脚本/路径存在，或 `Given/When/Then`，或 `assert`。配 `zz` 负例卡/RFC 写「测试通过」→ 红；写 `` `pnpm test tests/...` `` → 绿。
- `新建:checks/gates/acceptance-carrier.mjs`：每条验收 bullet 至少一个可解析载体（命令/现存路径/文件链接）；`command-refs` 扫描面扩到 `notes/proposed`、`notes/implemented`、`_backlog` 活区。
- 另两条 handoff 检查（`新建:checks/gates/handoff-carrier.mjs`、`新建:checks/gates/env-bound-evidence.mjs`）**按复发再做**，不一次全上。

## 输掉的方案

- **先加更多测试资产**：资产是锤子；不先修入口/一致性，fresh agent 会先卡在「没活/两份说法」。
- **新流水线 / 新索引**：现有 `_backlog`/`notes`/门禁够用；新层只会再造一本账。
- **每目录 AGENTS.md**：门多了是噪音；只加 `notes/`、`tests/` 两扇，`_backlog/AGENTS.md` 改一行。
- **把语义审做成门禁**：机器只能判形状；语义审要人/独立 agent，门只保证载体在场。
- **一步全上 P0/P1/P2**：入口没修就加事实门，fresh agent 仍会先卡在「没活」；按 P0 → P1 → P2 分档。

## 验收

### P0

- [ ] `_backlog/AGENTS.md` 与根 `AGENTS.md` 各有一句「`待落地` = 等授权，不是任务源；挑活先列候选」；根文件行数仍 ≤ 84。
- [ ] 6 处矛盾逐条对账：`_backlog/README.md` 落地出口与 `:40` 不冲突；半实施 RFC 有归宿（迁 implemented + 新 issue，或 proposed 定义与门禁同步）；`data-model` 表头有 `读者/写者`；`src/README` 五命令且无未来时；FTS 触发写回卡；`notes/README.md` proposed 定义与 #2 一致。
- [ ] `pnpm verify` ALL PASS；`_backlog/README.md` ≤ 140 行、`notes/README.md` ≤ 132 行、`dev-loop` ≤ 120 行。
- [ ] 红证：把 `_backlog/AGENTS.md` 的「待落地不是任务源」删掉 → 人审走查红（fresh agent 误把 `待落地` 当任务源）；还原 → 绿。

### P1

- [ ] `dev-loop §1/§3` 有事实/载体/轴问题；`_backlog/issues/README.md` 模板有 `## 事实与读者` 与验收三列；`notes/proposed/README.md` 有 `## 状态事实与载体` + `## 环境轴与红证`；`notes/README.md` 有 Note 必载条。
- [ ] `新建:notes/AGENTS.md`、`新建:tests/AGENTS.md` 存在且 ≤ 30 行；`_backlog/AGENTS.md` 有一行指针。
- [ ] `proposals` 对新 RFC 缺节 → 红；`notes-liveness` 对新 Note 缺节 → 红；`zz` 负例补节 → 绿；红证原话进门禁头注。
- [ ] `pnpm verify` ALL PASS；`pnpm test` 全绿；行预算不破。

### P2

- [ ] `zz` 卡/RFC 的验收写「测试通过」→ `backlog-liveness` / `proposals` 红；改成 `` `pnpm test tests/...` `` → 绿。
- [ ] `新建:checks/gates/acceptance-carrier.mjs`：验收 bullet 无载体 → 红；有现存命令/路径 → 绿；`command-refs` 扫到 `notes/proposed` / `notes/implemented` / `_backlog`。
- [ ] `pnpm verify` / `pnpm test` 绿；新门禁有 `// 负例留证 <日期>：… → 红`。

## 预算与顺序

- P0 → P1 → P2；每档独立验收，不一次全上。
- 先搬/压再加：`_backlog/README.md` 136/140、`notes/README.md` 125/132、`dev-loop` 113/120、根 `AGENTS.md` 84/84。
- 新门禁 ≤ 80 行/条；只做 P2 的 `acceptance-carrier`，另两条按复发再做。

## 回滚

- 文档改动：整段 revert 到本 RFC 前的版本；门禁改动：删新门 + 从 `checks/run-gates.mjs` 去接线；负例夹具同删。
- 不做半 revert；被证伪的切片（如某条门禁误报）整片退，另起新条目。
