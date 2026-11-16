---
topic: maintenance-surface-taxonomy
intent: 把第一轮的四动词收敛成可执行的判定程序，用三仓真实条目做压力测试，并给出各仓最小迁移面
---

# 判定程序与压力测试：三面（judge / show / operate）

> 上一轮（[2026-11-16-three-repo-taxonomies.md](2026-11-16-three-repo-taxonomies.md)）留下四个动词 run/assert/observe/act 与一个悬问：面数该由规模决定还是固定。这一轮用真实条目回答，并把规则压到「一问 + 三守卫」。

## 1. 先杀掉一个动词：run 不配单独成面

第一轮把 run 当第四个动词，是因为三仓都有 `dev/` 或 `run/`。但按"值得单列"的三条硬指标数一遍：

| 指标 | run 在三仓的实际值 |
|---|---|
| 条目数 | 本仓 `tools/dev` 6 件里真正"把东西跑起来"的只有 `company.mjs`（其余是 install/init/build，属 act）；`bsimulation` 的 dev 里 gui/headless 2 件；`deep_research` 的 dev 里 boot-run/run-driver/run-kickoff 3–4 件 |
| 独立失败语义 | "起不来"与"操作没做成"在维护者眼里是同一句话：环境没弄好 |
| 独立消费者 | 同一批人（维护者/开发者），没有第二个消费者 |

三条都不过。**run 是 operate 的一个组，不是一面。** 真正通过三条的是三个动词：judge（会红的判断）、show（给人看的证据）、operate（改世界的操作）。面数 = 3，不是 2 也不是 4。

## 2. 判定程序（一问 + 三守卫）

**一问：红了谁动？**

| 回答 | 面 | 判据的落点 |
|---|---|---|
| 拦下变更 / 退回返工 | **judge** → `checks/` | 门禁、lane、审计（含手动审计——只要结论用于放行/拒绝） |
| 人过来看现场 | **show** → `probes/` | 视觉探针、日志分析器、诊断、只读工作表 |
| 人重做那次操作 | **operate** → `tools/` | 装环境、建盘、收敛、升 pin、打包、发布、生成库存 |

三条守卫，专治规则边角：

1. **双模件按主产物**：既能生成又能校验的（`checks-index`、`test-census`、`bug-coverage`、`market-index`、`evidence` recorder、`snapshot-motion`），主产物是"生成物"→ operate；`--check` 只是让维护者别忘了重生成，真正的 judge 是消费它的门禁。**不要把双模件劈成两半。**
2. **管道件不是面**：runner（`*-lane.mjs`）、reporter（`junit.mjs`）、fixture（`read-barrier/index.mjs`）、实现（`lib/`、`drivers/`）跟着消费它的面住，不单独占门牌，也不进库存计数。
3. **混合件按终端产物**：同一次运行里既改世界又自检的（`sync-dsh`、`release.mjs`、`refactor-drift`），看它最终交付什么——交付"改好的世界"→ operate；交付"零漂移的裁决"→ judge。

**非面清单**（永远不占顶层门牌）：实现层（`lib/`、`drivers/`）、夹具、runner、reporter、证据（`snapshots/`、`runtime/`）、keyless 回归（`tests/`）、启动配置（`run/`）。这张清单比三个面本身更能止住"再开一个目录"的冲动。

## 3. 压力测试：三仓真实条目

判定只看"红了谁动"，不看它现在住哪。✅ = 现址与判定一致，❌ = 现址与判定冲突。

| # | 条目（仓） | 红了谁动 | 判定 | 现址 | |
|---|---|---|---|---|---|
| 1 | `checks/gates/pin-currency.mjs`（本仓） | 拦 push | judge | checks | ✅ |
| 2 | `checks/lanes/ui-scene.entry.mjs`（本仓） | 拦 surface / 演示前返工 | judge | checks | ✅ |
| 3 | `checks/audit/deliverables-check.mjs`（本仓） | 退回交付物 | judge | checks | ✅ |
| 4 | `checks/audit/coverage-ratchet.mjs`（本仓） | 拦 push | judge | checks | ✅ |
| 5 | `tools/repo/refactor-drift.mjs`（本仓） | 退回重构（零漂移裁决） | judge | tools | ❌ |
| 6 | `probes/browser-visual/cdp-probe.mjs`（本仓） | 人来看页面 | show | probes | ✅ |
| 7 | `probes/session-context/dual-ceo-probe.mjs`（本仓） | 人来看行为 | show | probes | ✅ |
| 8 | `tools/observe/orient.mjs`（本仓） | 人来看运行态 | show | tools | ❌ |
| 9 | `tools/observe/diagnose.mjs`（本仓） | 人来看失败摘要 | show | tools | ❌ |
| 10 | `tools/observe/notes-audit.mjs`（本仓） | 人来看记忆漂移 | show | tools | ❌ |
| 11 | `tools/observe/session-log-export.mjs`（本仓） | 重做导出 | operate | tools | ✅（组错） |
| 12 | `tools/repo/checks-index.mjs`（本仓） | 重生成库存 | operate | tools | ✅ |
| 13 | `tools/repo/sync-dsh.mjs`（本仓） | 重做升级 | operate | tools | ✅ |
| 14 | `tools/release/release.mjs`（本仓） | 重做发布 | operate | tools | ✅ |
| 15 | `tools/dev/company.mjs`（本仓） | 重起会话 | operate | tools | ✅ |
| 16 | checks/verify/verify（bsim） | 拦 commit/push | judge | checks | ✅ |
| 17 | checks/release/pack-install（bsim） | 拦 verify | judge | checks/release | ✅（组混） |
| 18 | checks/release/export-dist（bsim） | 重做打包 | operate | checks/release | ❌ |
| 19 | checks/backlog/*（bsim） | 重做卡/改状态 | operate | checks | ❌ |
| 20 | checks/openspec/*（bsim） | 重做 change | operate | checks | ❌ |
| 21 | checks/evidence 的 recorder（bsim） | 重录面 | operate | checks | ❌ |
| 22 | checks/report/junit（bsim） | ——（管道件） | 非面 | checks | ✅ |
| 23 | checks/test/run（bsim） | ——（runner） | 非面 | checks | ✅ |
| 24 | `scripts/verify/verify`（dr） | 拦 commit/push | judge | scripts | ✅ |
| 25 | `scripts/smoke/*`（dr） | 拦 CI/发布 | judge | scripts | ✅ |
| 26 | `scripts/run-ops/*`（dr） | 重做运维动作 | operate | scripts | ❌ |
| 27 | `scripts/dist/*`（dr） | 重做交付件 | operate | scripts | ❌ |
| 28 | `dev/run-driver`（dr） | 重起 run | operate | dev | ✅ |
| 29 | `probes/behavior/*`（dr） | 人来看行为 | show | probes | ✅ |

**19/29 = 66% 现址与判定一致**。10 个 ❌ 只有三类，且方向一致：① **show 被关进 operate**（本仓 `tools/observe` 3 件）；② **judge 被关进 operate**（本仓 `refactor-drift`）；③ **operate 被关进 judge**（bsim 的 release 的 act 半 / backlog / openspec / evidence，dr 的 run-ops / dist）。没有一条是规则判不出来——都是现址与规则冲突。这正是"哪个更有道理"的操作化答案：不是比谁的名字顺眼，而是数它有多少格与判定冲突；冲突又集中在两个方向，说明统一规则要治的就是这两种串味。

## 4. 三仓体检

| 仓 | 现状 | 与三面的差 | 结论 |
|---|---|---|---|
| 本仓 | `checks` / `probes` / `tools` | `tools/observe` 里 6 件 show、1 件 operate；`refactor-drift` 是 judge | **方向最对**：三面已具名，差两类小搬迁（6 件 show 出 operate，1 件 judge 进 checks） |
| `bsimulation` | `checks` / `probes` / `dev` | `checks` 里混了 operate（release 的 act 半、backlog、openspec、evidence）；`dev` 是 operate 的 run 组 | **两面半**：judge 与 operate 没分家，`checks` 的 12 子目录是后果 |
| `deep_research` | `probes` / `scripts` / `dev` | `scripts` 里混了 operate（run-ops、dist）；`dev` 是 operate 的 run 组 | **两面半**：同病，且顶层 `scripts` 是形态词 |

**"2 个还是 3 个"的谜底**：`bsimulation` 其实有第三面（`dev`），只是它没把 `dev` 算成"维护面"；`deep_research` 有第三面（`dev`），但把 operate 的一半塞进了 `scripts`。三仓都缺同一件事：**把 operate 当独立面摆出来**。本仓摆了一半（`tools/repo`、`tools/release`），又把 `dev` 关在 `tools` 里、把 `observe` 关在同一层。

## 5. 目标树与迁移面（只列，不动手）

```
checks/     judge    gates / lanes / audit
probes/     show     四域（team / fs-taskboard / browser-visual / session-context）
tools/      operate  dev（run 组）/ repo / release
非面：lib drivers fixtures runners reporters snapshots runtime tests run-config
```

- **本仓最小迁移**：`tools/observe` 里 6 件 show 迁 `probes/`（新增 `ops` 或 `analyze` 域？见 §6）；`session-log-export` 留 `tools/` 但离开 observe 组（它是 operate）；`refactor-drift` 迁 `checks/audit/`（或登记为例外并写理由）。代价：命令字面量与文档引用 ~40 处（`checks/README.md`、`docs/guides`、`tools/README.md`），无门禁路径改动（`tools/observe` 不在 lane 注册表里）。
- **`bsimulation`**：`checks` 里的 operate 半（release 的 `export-dist`/`dist-refresh`/`market-index`、backlog、openspec、evidence）迁到 `dev/` 或新 `ops/`；`checks` 只留 verify/gates/quality/release 的判据半/audit/test/report。代价：12 子目录里的 5 个搬家 + 所有 checks 下命令字面量 + `doc-maps` 的 MAPS 清单。
- **`deep_research`**：`scripts` 拆 judge（verify/smoke/test/run-gates）与 operate（run-ops/dist），共用 `scripts/lib`；`dev` 仍是 operate 的 run 组。代价：152 件里的分组与 203 行 `scripts/README` 重写。

## 6. 规则判不动的残余（诚实清单）

1. **`session-log-export`**：产物是证据（show），失败语义是"重做导出"（operate）。规则按"红了谁动"判 operate，但它的消费者是来看证据的人。**这是唯一一个"产物与失败语义指向不同面"的条目**；建议按失败语义归 operate，在头注写明"产物是给 show 用的"。
2. **`refactor-drift`**：纯搬移的零漂移裁决，像 judge；但它读写 `runtime/` 清单、是维护者的一次性工作流，像 operate。按终端产物判 judge（裁决），代价是它要离开 `tools/repo`。
3. **probes 的 stream 域**（dr）：明说"不判 PASS/FAIL"，是纯 show；但它没有断言语义，连"红了"都不存在。规则仍归 show，但要承认有一类 show 永远不红。
4. **双模件**：规则说按主产物，但"主"是作者声明的，不是机器可判的。可接受——门禁只需判"它有没有登记为哪个面"，不需判"作者诚不诚实"。

## 7. 对第一轮五问的回答（暂定）

1. **面数**：固定 3（judge/show/operate）。run 条目太少、失败语义与 operate 重合，做组不做面。
2. **命名**：`checks` / `probes` / `tools` 三个词都能活；`probes` 不如 `observe` 准确，但改名成本 > 收益。规则里用动词，目录名可以留。
3. **实现层**：跟面走还是独立？答案是**独立**（三仓其实都独立：`tools/lib`、`scripts/lib`、`dev/lib`），因为它被多个面 import，跟任何一个面都会反向依赖。
4. **生成库存**：按**面 + 条目类型**双列，不按"文件数"；fixture/runner/reporter 不计入资产数。本仓 60 vs 59 的根因就是 index 把 fixture 当条目、census 按注册表数。
5. **"面"这个词**：本仓 = 顶层目录；`deep_research` = 评估等级 L0–L4。建议在规则里改用"**入口面**"，把评估等级留给 testing 文档。

## 8. 下一轮

1. 把本仓 126 个公开入口**全量**过一遍判定程序，算真实覆盖率与例外清单（本轮只抽了 15 个本仓条目）。
2. 用全量结果反推：`probes/` 该不该按"是否需要起世界"再分一层（boot vs analyze），以及 6 件 show 迁入后放哪个域。
3. 给本仓写一份**最小迁移草案**（只改文档与目录，不动脚本行为），让"统一"从判断变成可验收的 diff；仍不动手，等定性。
