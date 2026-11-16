---
topic: maintenance-surface-taxonomy
intent: ai_dsh_bsimulation 维护面整理单（自包含 handoff，含完整决策上下文）；实施 agent 只读本文即可动手
---

# ai_dsh_bsimulation 维护面整理单

> **给实施 agent**：本文自包含——规则、为什么是这套规则、本仓现状的逐条证据、P0 的精确插入文本、P1 的成本与撞墙点、验收命令，全在这里。你不需要读姊妹仓的研究材料。
> **授权边界**：P0（§3）是声明层改动；P1（§4）涉及搬家与行为改动，**动手前必须拿到用户明确批准**。本文不是 P1 的授权。
> **来源**：2026-11-16 三仓维护面分类法研究（宿主 = `ai_dsh_company` 的 `_backlog/research/maintenance-surface-taxonomy/`）。本仓的组级分类经独立盲审复核，数字已按盘上重新核实。
> **方向更新（2026-11-16，D64）**：三仓根目录统一为 checks/probes/tools 已由「可选远期」升为**承诺方向**（用户裁决：人仍驾驭 AI，根名不一致 → 理解差异 → 驱动出错；先满足人 + 极度满足 fresh agent 可并存）。**硬顺序：先纯化（每目录一个动词）后统一**，或同批；先改名后拆组 = 给 mixed 目录假保证。本仓 operate 家 dev/ 最终迁 tools/。仍是独立迁移项目（gate 输入 + hooksPath 重装 + 引用 + 冻结归档 redirect 一起做），需用户批准；P0/P1 范围不变。决策家 = [surface-root-unification-direction](../../../notes/implemented/2026-11-16-surface-root-unification-direction.md)。**落地纪律（用户追加）**：调整时每个根目录的定位（面 = judge/show/operate + 装什么/不装什么 + 例外）必须写进该仓自己的 surface-contract 与 README 首屏，一眼可判、不含糊；共识随本自包含 handoff 携带，实施 agent 不回看宿主仓对话——含糊定位 = 共识跨仓蒸发。

## 目标根布局（统一后，实施对照）

> D64 承诺方向的**推荐终态**，显式画出以免实施时乱发挥。**P1 纯化 + 改名迁移后**才到此形状；P0 不改名。决策家 = [surface-root-unification-direction](../../../notes/implemented/2026-11-16-surface-root-unification-direction.md)。

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
| judge | checks/（mixed） | checks/ | 留 verify/gates/quality/mutants + release judge 半；show/operate 半迁出 |
| show | probes/ | probes/ | 留 cdp/e2e/session；audit 报表去向 **A/B 待用户裁**（A → probes/analyze/；B → 改 exit 1 变 judge 留 checks/） |
| operate | dev/ | tools/ | dev/ 名退役 → tools/（hooksPath 重装）；吸收 checks 的 backlog/openspec/build/evidence + release act 半 |
| oracle | tests/ | tests/ | 不变 |
| 配置 | dev/env.sh、overlays | 非面 | 随 tools/ 或独立配置位（本仓自便，非面） |

**待裁选项不许乱发挥**：audit 的 A/B（§4.1）须用户明示，未裁前不预设 probes/analyze/。内部子组名本仓自定，但每面目录的动词纯度不许破；dom-replay 的 CI judge 例外仍登记（§3.4）。

## 0. 背景：这套规则怎么来的（30 秒版）

三个姊妹仓都有 3 个维护面目录，但名字不同、内部混装不同。研究收敛出的规则是**两层 × 三面 × 两个前置轴**（§1），核心判据一句话：**「主要产出什么？」**——裁决→judge，证据→show，持久状态→operate。

**本仓的特殊问题**：`checks/` 名义是 "development gates"，实际装了三种动词——79 个文件里只有约 38 个是 judge，其余是 show（audit 报表）、operate（backlog/openspec/build/evidence/release 的 act 半）和非面（runner/reporter/数据）。**这不是「judge + 几个例外」，是混装**。早期方案曾建议把 `dev/` 改名 `tools/dev/` 以统一三仓名字，被盲审推翻：`dev/env.sh` 是两道门禁的输入、`core.hooksPath` 是相对路径、24 个外部文件引用它——改名会静默打断 hooks。**结论：不改名，用面声明消除歧义。**

**为什么值得做**：fresh agent 看到 checks/backlog/new.mjs 会以为它是门禁（不会动盘），实际它会创建/改写卡片文件。面声明 + 例外表让「这个目录里的东西会不会动我的世界」一眼可判。

## 1. 规则（v2，三仓同文）

**两层**
- **oracle**：由 `pnpm test` 的 runner 跑 → `tests/`。不是面。判 runner，不判进程数。
- **entry**：要自己起命令/进程/浏览器 → 下面三面。

**三面（只对 live entry）**
- **judge**：主要产出是**裁决**——会红，且有人（hook/CI/验收）据此放行或退回。
- **show**：主要产出是**证据**——截图、摘要、报表、导出；红了只是让人来看，不阻塞变更。
- **operate**：主要产出是**持久状态**——环境/仓库/发布物/生成物。两种模式：
  - **run**：起/复用进程，失败 = 没起来，重试即可（如 `dev/gui.sh` reuse-first）。
  - **act**：持久改动，失败可能半途，需要 converge/repair（如 `backlog/move`、`dist-refresh`）。

**两个前置轴（先于三面判定）**
- **生命周期**：标记为已耗/retired → 非面（归档候选），不进面计数。
- **管道件**：lib / driver / fixture / runner / reporter / 索引生成器 / 纯查询 / support → 非面，跟消费者住。

**判定（按顺序）**
1. 已耗？→ 非面。
2. 管道件？→ 非面，跟消费者。
3. 主要产出什么？裁决 → judge；证据 → show；持久状态 → operate（起进程的标 run）。
4. 混合件按终端产物；双模件（`--write`/`--check`）按主产物；**被 judge 调用不改变面**（在消费方头注记依赖）。
5. 仍冲突：**产物 > 失败语义 > 名字**。

**为什么「产物」优先**：「失败要重跑」对所有条目都成立，判别力为零；「产出是裁决/证据/世界状态」三者互斥，可判。

**目录名**：P0 **不改名**。`dev/` 保留（它是 operate 面，名字本地化不影响判定）；`checks/` 保留但声明为 mixed。目标名（checks/probes/tools）是**承诺方向**（2026-11-16 用户裁决，D64；先纯化后统一、独立迁移项目），不是 P0/P1 义务。

## 2. 本仓现状（逐组核实过，2026-11-16）

| 目录 | 面 | 盘上事实 | 说明 |
|---|---|---|---|
| `dev/` | **operate**（run+act） | env.sh / gui.sh / headless.sh / vendor-build.sh / hooks / overlays / lib | env.sh 本身是配置（非面）；gui/headless 是 run；vendor-build/hooks-install 是 act |
| `checks/` | **mixed（待拆）** | 79 文件（70 .mjs + 9 json/md/sh） | 见下方分组 |
| `probes/` | show | cdp 1 + e2e 9 + session 5 = 15 .mjs | e2e 的 acceptance-setup/preflight/report 是 helper（非面）；session/session-log.mjs 是 re-export（非面） |

**checks/ 分组明细**（文件数 = .mjs，括号内为含 json/md 的总文件数）：

| 组 | 件数 | 面 | 证据 |
|---|---|---|---|
| verify/ | 4 | judge | L0 聚合入口 + typecheck + coverage + openspec bridge |
| gates/ | 22 | judge | 20 道注册门禁 + helpers |
| quality/ | 1 (3) | judge | coverage-gate.mjs；2 个 json 是数据（非面） |
| mutants/ | 1 | judge | 十四缺陷 kill-rate 基线 |
| audit/ | 3 (4) | **show** | runs/backlog/archive 三个只读报表；runs 与 archive 有 `--strict` 才 exit 1，backlog **永远 exit 0**（只出报表） |
| backlog/ | 5 (8) | **operate** | new/move 创建改写卡片；prove-red 是 act |
| openspec/ | 5 | **operate** | change 脚手架/归档/索引 |
| build/ | 1 | **operate** | 生成 client bundle |
| evidence/ | 1 | **operate** | 录/比 model-visible surface（`--record` 写盘） |
| release/ | 20 (21) | **mixed** | judge：artifact/install/profile-smoke/preflight/single-writer/home-canary/tag-smoke/upgrade-smoke/windows-canary/smoke-run（runner，非面）；operate：export-dist/dist-refresh/dist-cleanup/market-index/tag-archive/tag-artifact/tag-manifest/manual-facts/artifact-manifest/dirty-guard（守卫，非面） |
| test/ | 5 (6) | **非面** | run.mjs = runner；census/lanes/preload/home = 支援；suite-census.json = 数据 |
| report/ | 1 | **非面** | junit reporter |
| terms.mjs | 1 | **非面** | 术语登记表（数据，被 terms gate 消费） |

**probes/ 的一个真实例外**：`e2e/dom-replay.mjs` 被 CI 的 `dom-smoke` job 直接消费（`.github/workflows/release-canary.yml:50`，PR 与 workflow_dispatch 触发），且 docs/evaluation.md 明说它是 ui seam  claim `deterministic test` 的唯一合法证据。**按规则它是 judge-by-CI，虽然住在 probes/**。P0 例外表必须登记这一条，否则 fresh agent 会以为 probes 全是手动 show。

**关键更正**：`checks/` 不是「judge + 5 个例外」。按 .mjs 计，69 件里 judge 约 28、show 3、operate 约 27、非面约 11。**例外是多数**。P0 必须如实写 mixed。

## 3. P0：只做声明（零搬家、零行为改动）

### 3.1 合同文件
新建 docs/surface-contract.md（§1 压缩版 + §3.4 例外表），链接进 docs/00-index.md。本仓没有文档行数门禁（无 doc-budgets gate），但 `AGENTS.md` 仍建议替换不加行。

### 3.2 根布局（`AGENTS.md` 第 36、39、40 行）——替换，不加行

```text
dev/        operate（run+act）：env.sh / gui.sh / headless.sh / vendor-build.sh / hooks / overlays
checks/     mixed（待拆）：judge（verify/gates/quality/mutants）+ show（audit）+ operate（backlog/openspec/build/evidence/release act 半）
probes/     show：cdp / e2e / session；dom-replay 是 CI judge 例外；setup/preflight/report/session-log 是非面
```

### 3.3 目录 README 首行
- `checks/README.md` 标题后加：`> 面：mixed（judge + show + operate，待拆）。分组与例外 = [surface-contract](../docs/surface-contract.md)。`
- probes/README.md 标题后加：`> 面：show（dom-replay 是 CI judge 例外；helper 是非面）。规则 = [surface-contract](../docs/surface-contract.md)。`
- `dev/README.md` 标题后加：`> 面：operate（run + act）。env.sh 是配置（非面）。规则 = [surface-contract](../docs/surface-contract.md)。`

注意：`doc-maps` 门禁要求 `checks/README.md` 点名每个子目录、probes/README.md 点名每个子目录、`dev/README.md` 点名每个子目录与文件。加面声明行不影响这些检查，但**不要删改既有的目录点名**。

### 3.4 例外表（放合同文末）

| 路径/组 | 面 | 理由（核实过） |
|---|---|---|
| checks/audit/runs.mjs | show | 只读 run-bundle 报表；`--strict` 才 exit 1 |
| checks/audit/backlog.mjs | show | 只读 backlog intake 报表；**永远 exit 0** |
| checks/audit/archive.mjs | show | 只读 archived-change 报表；`--strict` 才 exit 1 |
| checks/backlog/* | operate | 建卡/移卡/prove-red，持久改动 |
| checks/openspec/* | operate | change 脚手架与归档 |
| checks/build/* | operate | 生成 client bundle |
| checks/evidence/* | operate | 录/比 surface（--record 写盘） |
| checks/release/export-dist、dist-refresh、dist-cleanup、market-index、tag-archive、tag-artifact、tag-manifest、manual-facts、artifact-manifest | operate | 产出/刷新 _dist 与 tag 工件 |
| checks/release/dirty-guard、smoke-run | 非面 | 守卫 / 子进程 runner |
| checks/test/* | 非面（runner+支援） | 车道调度与 census |
| checks/report/junit.mjs | 非面（reporter） | JUnit 输出 |
| checks/terms.mjs | 非面（数据） | 术语登记表 |
| checks/quality/*.json | 非面（数据） | 预算/基线 |
| probes/e2e/dom-replay.mjs | **judge**（CI 例外） | release-canary.yml dom-smoke job 直接消费；evaluation.md 指定为 ui seam 唯一 deterministic test 证据 |
| probes/e2e/acceptance-setup、preflight、report | 非面（helper/fixture） | 为探针准备状态/报告，不是独立面 |
| probes/session/session-log.mjs | 非面（re-export） | 转发到 pack src/lib，实现不在 probes |
| dev/env.sh、dev/overlays/* | 非面（配置） | sourced 环境 / profile patch，不是入口 |

### 3.5 P0 验收
```sh
pnpm verify    # 预期绿（doc-maps / docs-links / process gate）
pnpm test      # 预期绿（无行为改动）
```
人工核对：三处 README 首屏可见面声明；例外表逐条在盘上找得到；`checks/README.md` 仍点名全部 12 个子目录。

## 4. P1：可选拆分（高风险，需用户批准）

### 4.1 先拆 checks，再谈改名
1. **audit → show**：二选一（需用户裁）——
   - A：迁 probes/analyze/（需把 probes 口径从「只观测活组合」扩到「也观测仓库产物」；probes/README 与 evaluation.md 同 diff 改）。
   - B：把三个报表改成默认 exit 1（行为改动，变成 judge；backlog.mjs 当前永远 exit 0，改它等于新增门禁语义）。
   **不要两头都占。**
2. **backlog / openspec / build / evidence → operate**：迁到 `dev/` 下的组（本仓 operate 面就是 dev），或新建 `tools/`。迁移前必须同 diff 更新：
   - checks/gates/doc-maps.mjs 的 MAPS（checks/README 不再需要点名搬走的组；dev/README 需要点名新组）。
   - checks/gates/openspec.mjs:297-306 的 `isCoreImpactFile` / `isAllowedCoreDirPrefix` 硬编码了 checks/openspec/、checks/backlog/ 前缀——**搬走后这两道判据会漏掉新位置**，必须同 diff 改。
   - `package.json` 的 backlog:new / backlog:move / openspec:new / openspec:archive / openspec:index 等命令路径。
   - 82 个 tracked 文件引用这四个组的路径（含归档；归档区按冻结层政策处理）。
3. **release → 按件拆**：judge 半留 checks/release，operate 半去 operate 面。注意 `b-pack` 类门禁若读 release 路径需同步。

### 4.2 改名（不建议现在做）
`dev/` → `tools/dev/` 会打断（全部核实过）：
- checks/gates/root.mjs:14 明确列了 `'dev/env.sh'` 作为必需文件。
- checks/gates/dev-isolation.mjs:29 扫 `['dev','probes','checks']` 三个目录找 `~/.dsh` / `--port 3080` 字面量——改名后扫描面漏掉 dev。
- `dev/env.sh:37` 设置 `core.hooksPath dev/hooks`（相对路径，写进本地 git config）；**老 clone 改名后静默不跑 hooks**。
- tests/checks/fresh-start.test.mjs:46 复制 `dev/env.sh` 到临时目录。
- 24 个外部 tracked 文件、45 处 `dev/env.sh` 引用（不含 dev/ 自身）；其中 3 个在冻结归档区。

**结论**：除非当独立迁移项目（gate 输入 + hooksPath + redirect ledger + 归档豁免一起做），否则**保留 dev/，用面声明消除歧义**。名字不统一不会让 fresh agent 糊涂——没有面声明才会。（2026-11-16 更新：统一已是承诺方向 D64，但仍走独立迁移项目、先纯化后统一；「不建议现在做」= 不在 P0/P1 里廉价做，非永久否决。）

### 4.3 同 diff 义务
- 新 Note / openspec change：记录决定、输掉的方案、红→绿证据。
- docs/evaluation.md 若 audit 迁 probes，evidence classes 节需同步。
- `checks/README.md` 与 `dev/README.md` 的目录点名随搬移更新（doc-maps 强制）。

## 5. 验收（P1 若做）
```sh
# 1. 基线
pnpm verify && pnpm test
# 2. 只搬不改引用 → 预期红（doc-maps / docs-links / openspec gate / 命令字面量），留证
# 3. 补引用 + gate 输入 + 重生成
pnpm verify && pnpm test && pnpm openspec:check
# 4. 改名（若做）：root.mjs / dev-isolation.mjs / fresh-start.test.mjs / hooksPath 全过；老 clone 重装 hooks
```

## 6. 不要做
- 不要把 `checks` 写成「judge，5 个例外」——它是混装，例外是多数。
- 不要把 helper（acceptance-setup / preflight / report / session-log）当探针；它们是管道件。
- 不要忽略 `dom-replay` 的 CI judge 身份——它是 probes 里唯一的真实例外。
- 不要先改名再拆组；先让每组只含一种动词，改名才有意义。
- 不要为了三仓同名去动 `probes`：它已经是三仓里最一致的名字。
- 不要在 P0 阶段搬任何文件或改任何 exit code。
