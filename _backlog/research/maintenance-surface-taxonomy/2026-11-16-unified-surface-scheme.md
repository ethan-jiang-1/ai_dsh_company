---
topic: maintenance-surface-taxonomy
intent: 三仓可共用的定稿候选：两层三面的判据、fresh-agent 放置测试、各仓目标树、防退化机制与迁移路线
---

> **状态：盲审前的推理稿。** 盲审撤回了本文 §9 的 P1 改名建议；最终规则与三仓步骤以 reorg-company / reorg-bsimulation / reorg-deep-research 为准，反例与修订见 [blind-review](2026-11-16-blind-review.md)。

# 统一方案（候选定稿）：两层 · 三面 · 一问

> 怎么读：赶时间读 §0–§3；要给新东西选家读 §3 + §5；要迁移读 §6 + §9；要把它写进仓里读 §7 + 附录。
> 这份是三仓可共用的**判据**，不是任何一仓的现状复述；现状与证据见同目录前四份材料。

## 0. 一句话结论

维护面先分**两层**：进程内 oracle（`tests/`）与真入口（其余）。真入口再按**一问**分**三面**：**judge（会拦人）/ show（给人看）/ operate（改世界）**。

**三个仓都是 3/3/3，不是 2/3/3。** `bsimulation` 与 `deep_research` 的 `dev/` 就是 operate 面，只是名字叫 dev；`company` 的 operate 面叫 `tools/`。

**但名字不一致本身就是成本。** 三个仓应当收敛到同一组目录名：**`checks/` = judge，`probes/` = show，`tools/` = operate**（`dev/` 降为 `tools/dev/` 组，`scripts/` 退役）。目录名是接口的一部分；别名省一次迁移，却让每个 fresh agent 每次多查一次表。

## 1. 第一层：oracle 与 entry

| 层 | 判据 | 家 | 证据形态 |
|---|---|---|---|
| oracle | 由 `pnpm test` 的 runner 跑（vitest / node:test） | `tests/` | `.spec.ts`（keyless，模块行为） |
| entry | 要起真进程 / 浏览器 / profile / tarball | `checks|probes|tools`（或 `scripts|dev`） | `.e2e` / `.entry` / `*-probe` / 工具入口 |

先分这层的原因：否则"测试放哪"会和"门禁放哪"打架。三仓事实上都分了（`tests/` 独立、命名契约同源），只是没人把它写成第一问。

**边界句**：由 `pnpm test` 的 runner 跑就是 tests；要自己起命令/进程/浏览器才是 entry。**（判 runner，不判进程数——spec 里偶尔 spawn 一个子进程仍是 oracle。）**

## 2. 第二层：三面与一句话边界

| 面 | 一句话 | 红了谁动 | 典型 | 现状名 | 统一名 |
|---|---|---|---|---|---|
| **judge** | 会拦人的判断 | 拦下变更 / 退回返工 | 门禁、lane、审计 | `checks/`、`scripts/` | **`checks/`** |
| **show** | 给人看的证据 | 人过来看现场 | 探针、日志分析、只读工作表 | `probes/` | **`probes/`** |
| **operate** | 改世界的操作 | 人重做那次操作 | 装/建/收敛/升 pin/打包/发布/生成 | `tools/`、`dev/` | **`tools/`**（`dev/` 只作组名） |

**边界句**：问「红了谁动？」——拦人 = judge，看现场 = show，重做活 = operate。

**`audit` 不是面，是命名习惯**：本仓的 `checks/audit` 默认 exit 1（judge）；`bsimulation` 的 `checks/audit` 默认只出报表、`--strict` 才裁决（show）。同一个目录名，两个面——**按默认行为判，不按名字判**。

`dev/` 之所以让人犹豫，是因为它同时装了 env（sourced 配置）和 boot/build（真入口）。按本规则：配置是**非面**，boot/build 是 operate；所以 `dev/` 整体算 operate 面。统一后它不再占顶层：**`tools/dev/`** 是 operate 面里的 run 组；`company` 已经是这个形状（`run/` 放配置、`tools/dev/` 放脚本）。

**env/配置不单独成面**：它可以住 `run/`（company）或 `tools/dev/`（另两仓），两种都合法；但不要为它开第四个顶层面。面只有三个。

## 3. 判定程序（两问 + 三守卫）

**问 1**：能不能在进程内 import 跑？能 → `tests/`。不能 → 问 2。

**问 2**：它红了，谁动？
- 门禁/验收拦下，人或机器必须返工 → **judge**
- 人来读证据/看现场，不阻塞任何变更 → **show**
- 操作没做成（装不上、起不来、发不出去、生成物没更新）→ **operate**

**守卫**（按顺序套）：
1. **双模件按主产物**：既能 `--write` 又能 `--check` 的生成器（index / census / coverage / market / evidence recorder），主产物是生成物 → operate；`--check` 是给门禁的守卫，不改变身份。
2. **管道件跟着消费者**：runner（`*-lane.mjs`）、reporter（`junit`）、fixture、lib/drivers，不单独占门牌；住哪由它服务的面决定。
3. **混合件按终端产物**：同一次运行既改世界又自检（升 pin、发布、收敛），交付"改好的世界" → operate；交付"零漂移的裁决" → judge。

**非面清单**（永远不占顶层门牌）：`tests/`（层）、`lib/`、`drivers/`、fixtures、runners、reporters、`snapshots/`、`runtime/`、`run/` 配置、台账/文档、**已耗条目（`状态：已耗`，等归档）**。

## 4. 为什么这些不是面

- **实现层**被多个面 import，跟任何一个面都会反向依赖。
- **fixture** 是数据，不是仪器；按目录或文件点名即可。
- **runner / reporter** 是管道，跟着它调度的资产住；单独成面会长出"为跑而跑"的目录。
- **证据层**是冻结输出，不是入口；它没有"红了谁动"。
- **run 配置**是被 source 的环境，不产生裁决；boot 脚本才是入口。
- **tests** 是层不是面：它服务所有面，且不能起真实边界。

## 5. fresh-agent 放置测试（12 题）

| # | 新东西 | 答案 | 陷阱 |
|---|---|---|---|
| 1 | 读仓库结构、能红的门禁 | checks/gates | 与 tests 的区别是"真入口" |
| 2 | 真模型行为探针，手动看 | probes/team | 有断言也是 show，只要不拦人 |
| 3 | 读 zstd 会话日志、打印失败摘要 | probes/analyze | 与 #2 同面，不同域（数据源域） |
| 4 | 升 pin、改簿记的脚本 | tools/repo | 自检是守卫，不是身份 |
| 5 | 真入口冒烟，CI 拦 merge | checks/lanes | 被 lane 调度 = judge |
| 6 | 模块单测 | tests | 进程内，不是 entry |
| 7 | 截图/量渲染的手动脚本 | probes/browser-visual | 截图不是裁决 |
| 8 | 打 tarball / 生成市场索引 | tools/release | `--check` 模式不改变身份 |
| 9 | 生成库存的脚本 + 消费它的门禁 | 生成器 operate；门禁 judge | 不要做成一个双身份条目 |
| 10 | 按 lane 调度的 runner | 非面，跟被调度的面住 | 不要给它单独目录 |
| 11 | 读 notes 的只读工作表 | probes/analyze | 输出"待看"不是"待修" |
| 12 | 起 dev 会话 / 起 GUI | operate（dev 组） | "起不来"是操作失败，不是 judge |

**四个真实难例的裁决**：
- `bsimulation` 的 `checks/audit`：默认只出报表、`--strict` 才 exit 1 → **show**；不要因为目录叫 audit 就归 judge。
- 本仓 `checks/audit/candidate-scan-eval.mjs`：`状态：已耗`、语料已移出 → **非面（已耗）**，不计入活条目。
- `cdp-probe`：有断言、会 exit 1，但没人守、红了只是人来看 → **show**。它被 `ui-scene` 这个 lane 调用，**不改变它的面**（lane 本身是 judge）；只有它自己**直接**被 hook/CI/验收消费时，才升为 judge。
- `deliverables-check`：手动跑，但结论用于验收放行/退回 → **judge**。
- `diagnose --strict`：默认只出摘要 → **show**；`--strict` 只是可选裁决，不改变身份。

## 6. 三仓体检与目标树

目标树（三仓同一组名字）：

```
tests/             oracle（层）
checks/            judge    gates/ lanes/ audit/（dr 的 scripts/verify|smoke|test|run-gates 并入）
probes/            show     team/ fs-taskboard/ browser-visual/ session-context/ analyze/
tools/             operate  dev(env/boot) / repo / release / build / bookkeeping
非面：lib drivers fixtures runners reporters snapshots runtime run-config
```

| 仓 | 现状 | 目标 | 错位（估） | 代价 |
|---|---|---|---|---|
| company | checks / probes / tools | 名字已对；tools/observe 解散 | 7 条（6 show + 1 judge） | 8 次 mv，~10 引用，2 生成物 |
| bsimulation | checks / probes / dev | `dev/` → `tools/dev/`；checks 只留 judge | ~30/70 件（audit 是 show；release 混装；backlog/openspec/build/evidence 是 operate） | 1 次顶层改名 + 6 组搬家 + 命令字面量 |
| deep_research | probes / scripts / dev | `scripts/` → `checks/`；`dev/` → `tools/dev/`；run-ops 拆 show/judge、dist 迁 tools | ~18/60 件 | 152 件改名 + 203 行 README + 命令字面量，**三仓最重** |

**关于"两个还是三个"**：把 `dev/` 读成"环境"就会数成 2；按本规则它是 operate 面，所以是 3。**真正的差别不是数量，是 operate 面有没有被命名。** 三仓都该有 3 个：judge / show / operate。

**名字统一值得做，但不必一次做完**：`checks`/`probes` 两仓已同；`tools` 是本仓已有、另两仓缺的最后一个词。`scripts` 必须先退役（它是形态词，且里面装着三种动词）；`dev` 可先降为 `tools/dev/` 组，顶层改名与搬家分两步。

## 7. 怎么保证以后不烂（结构基石）

1. **face = 目录默认 + 例外表**：目录动词就是默认面（checks=judge / probes=show / tools|dev=operate），**只登记不在默认面的例外**（如 tools/observe 的 6 件、`refactor-drift`）。新增条目默认随目录，破例要写一行理由；不搞 126 条逐条声明，也不给第二本账。
2. **面纯度观察行**：CENSUS 增"该面里动词一致的条目数 / 总数"；先**只观察**，不设硬门（避免再造一条为指标服务的棘轮）。低于 80% 列"待收敛"。
3. **预算与目录解耦**：P2 的 `MAX_PROBES` 数"登记能力"，迁移/改名不占预算，新增才占。否则任何分类法收敛都会撞顶。
4. **一页合同，一处事实**：每个仓 `docs/` 放同一份 20 行规则（附录），README 只链接，不复制清单；跨仓不互链，靠同一文本与版本行。
5. **新增检查清单**（提交前 5 问）：能 import 吗？红了谁动？是管道件吗？失败类登记了吗？搬家会撞预算吗？
6. **迁移顺序**：先加 face 字段与纯度（只观察）→ 再搬纯组 → 最后拆混装组；每步一个 commit + `verify` 绿。

## 8. 残留歧义与裁决顺序

歧义永远会有，关键是**裁决顺序固定**：

**失败语义 > 产物形态 > 名字。**

- `session-log-export`：产物是证据（show），失败是"重做导出"（operate）→ **operate**。
- `refactor-drift`：产物是"零漂移裁决"→ **judge**。
- `notes-audit`：默认产物是"待看清单"→ **show**。
- `run-ops` 的 `run-accept`：产物是验收回执 → **judge**；同组的 `session-events` 等 → **show**。
- 双模生成器：主产物是生成物 → **operate**。

仍然判不动的，只有一种：**产物与失败语义指向不同面**。这时按失败语义（谁被叫醒）定，并在头注写明另一面；不要为它开第四个面。

## 9. 迁移路线（三仓共用，按仓裁剪）

**Phase 0（三仓都先做，零搬家）**：加 face 归属（目录默认 + 例外表）、纯度观察行、一页合同；根布局块写三行面声明；`verify` 绿即完成。可逆、无引用改动。
**Phase 1（顶层改名）**：dr 的 `scripts/` → `checks/`；bsim 与 dr 的 `dev/` → `tools/dev/`。纯机械 + 引用替换，不改行为；dr 最重，单独一轮。
**Phase 2（纯组搬家）**：company 的 6 件 show 与 1 件 judge；bsim 的 backlog/openspec/build/evidence 迁 `tools/`；dr 的 dist 迁 `tools/`、run-ops 的纯 show 件迁 probes/analyze（拟建）。
**Phase 3（混装组拆分）**：bsim 的 release、dr 的 run-ops、company 的 tools/repo。

每步验收：`pnpm verify` 绿 + `pnpm test:checks` 绿 + 面纯度 ≥80% + 一条红→绿证据（搬前旧路径红、搬后新路径绿）。

## 10. 证据边界

- 本仓 126 条逐条分类（CSV）与 7 个冲突是实测；另两仓是组级估读，未逐文件读头注。
- **更正（本轮）**：`checks/audit/candidate-scan-eval.mjs` 状态 = 已耗，应列非面。活条目 126→125；可判定 123→122；匹配仍 115/122 = 94.3%。`bsimulation` 的 `checks/audit` 复核为 show（默认报表），其 checks 混装比上一轮估计的更重。
- 方案未实施；P2 的 A/B、`analyze` 域、`session-log-export` 落点需用户裁。
- 这套规则只回答"入口放哪"；不回答"要不要做这个检查"（那是 policy §P2 的准入）。

## 附录：一页合同（可直接放进各仓 `docs/`）

```text
维护面 = 两层 × 三面。

层
- oracle：能在 pnpm test 里 import、进程内跑 → tests/。
- entry：要起真进程/浏览器/profile/tarball → checks|probes|tools（或 scripts|dev）。

面（只对 entry）
- judge：红了会拦下变更/退回返工 → checks/（或 scripts/ 的 verify|smoke|test|run-gates）。
- show：红了只是让人来看 → probes/。
- operate：红了意味着活没干成（装不上/起不来/发不出/生成物没更新）→ tools/ 或 dev/。

判定（按顺序）
1. 能 import？→ tests。
2. 红了谁动？拦人=judge；看现场=show；重做活=operate。
3. 守卫：双模件按主产物；runner/reporter/fixture/lib 跟消费者；混合件按终端产物。
4. 仍冲突：失败语义 > 产物形态 > 名字。

目录名：checks/ = judge，probes/ = show，tools/ = operate（dev 只作 tools/dev 组，scripts 退役）。
非面：lib/ drivers/ fixtures runners reporters snapshots/ runtime/ run-config 台账/文档。
新增：默认随目录的面；破例登记一行理由 + 失败类；搬家不占预算，新增才占；纯度 <80% 记待收敛。
```
