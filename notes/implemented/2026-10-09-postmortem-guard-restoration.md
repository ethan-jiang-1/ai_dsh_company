# N4 事故护栏复原：事故留下的门禁自己没人看着

状态：已消化（2026-10-09；用户令「能修的就修，能补的就补」——本条 = 第二遍深挖 gap N4。

## 问题：一条**已实地复发**的缺口

第二遍深挖时 N4 报的是「没有门禁要求事故复盘必须产出一条新检查」——那是**制度层面**的观察。
本轮按「证据要真跑」的口径去验证它，结果挖出比制度缺失更硬的东西：**一条护栏已经丢了很久，没人发现。**

### 实测

postmortem 0001（preset 挂载失败——用户浏览器里才发现、UI 静默无报错）在它的护栏清单里写着：

> - `scripts/verify.mjs` check 8 — rows with known schema-required fields must carry them
>   (fast, runs in `pnpm test`'s neighbourhood).

把这条护栏**按它当初要防的形状**复原——删掉事故的元凶字段
（`tool-fs-search.sampleOverCapGlobResults` / `tool-todo.allowParallelInProgress`）：

```
$ node checks/run-gates.mjs
verify: ALL PASS          ← N4 实测
```

**该检查已不存在。** 它在 `scripts/verify.mjs` → `checks/run-gates.mjs` 的改名/重构中丢失，
区域编号 8 现在住的是 `client-half`（另一件事）。事故的第二层教训：

> **事故留下的护栏本身也需要护栏**——「这条护栏还在吗」没有任何机制在查。

唯一还能抓到它的是 `preset-smoke`（真 web 挂载）——实测红，且给出与当年一字不差的宿主报错：

```
FAIL session/create 挂上 ceo: session/create 失败: tool-fs-search (@deepseek-ai/dsh-tool-fs-search):
  invalid config: - $.sampleOverCapGlobResults missing required value
preset-smoke: 3 FAILURE(S)
```

所以这一类的**真挂载防线还在**，丢的是**快而 keyless 的那一层**。而 0001 的核心教训恰恰是
「**discovery 权必须归 agent，且由 agent 自己跑得动的检查闭合**」——`preset-smoke` 要
`source run/env.sh` + 真起 DSH，不在 `pnpm verify` / `pnpm test` 的默认环里。**快环丢了。**

## 决定

新增门禁 `preset-required-config`（`checks/run-gates.mjs` §3-bis），把 0001 承诺的那层**快检查**装回去：

- **判据源** = vendor **committed 生成物** `docs/config-catalog.md`（145 个 catalog 块，56 个包有必填字段）。
  **结构即事实**：`  name: type` = 必填，`  name?: type` = 有默认值。
  用 committed 产物而**不** import vendor TS——免构建、免越界（vendor 只读铁律）、CI 干净环境可跑。
- **检查面** = 5 个 preset 里**声明了 `config:`** 的行，对其插件名查 catalog 必填字段，漏则红并点名。
- **判据是「声明了 config」，不是「config 里还有几个键」**（见下「输掉的方案」——这里踩了一次）。

同 diff 更新 postmortem 0001 的护栏清单，把那条失效的 `verify.mjs check 8` 换成真门禁名 + 复原记录，
并写明它**曾经静默失效**。**没有新增制度**（不要求"每篇复盘必须产出检查"）——那属于另一个层级的
设计，本轮的证据支持的是先把这个具体的洞补上。

## 输掉的方案

- **首版门禁：`if (configKeys.length === 0) continue`** —— **实测假守卫，已修**。
  逻辑是「config 里没键 ⇒ 这行不归我管」，于是**删掉最后一个必填键 = 这行看起来不再有 config ⇒ 跳过**。
  红例不红：删两个元凶字段后门禁只是把计数从 32 悄悄变成 30，仍然 `ALL PASS`。
  改成 `sawConfig` 标记（**这一行声明了 `config:` 就一律受判**，哪怕 config 已空），并加空转下限
  `MIN_EXPECTED_CONFIG_ROWS = 20`（识别到的行数莫名缩水 = 解析退化，要报而不是静默少查几行）。
  这与本轮 `ledger-routing` 首版的**永假分支**是同一类病：**判据可以被无关变化满足/绕过**。
- **直接 import vendor 的 `Config` schema 在校验**（最保真）：否决。vendor 内部 `@deepseek-ai/*`
  解析要走包入口（未构建 lib），干净环境必红——这正是 2026-09-28 test lane 出 CI 的同一根因
  （见 [N7 收窄](2026-10-09-n7-ci-narrowing.md)）。committed catalog 是同一事实的**无依赖投影**。
- **把 `preset-smoke` 加进 `pnpm verify`**：否决。它是真挂载（要 env + 真起 DSH），进 verify 会让
  结构门禁变成分钟级且依赖运行环境；正确分工 = 快 keyless 门禁进 verify、真挂载留在完成定义里。
- **只修文档、不加门禁**（把 0001 里那句删掉了事）：否决。0001 的教训原文就是"不能靠读文档闭合"；
  删掉承诺只是让缺口变得看不见，而不是补上它。
- **建"每篇复盘必须产出检查"的制度**：否决（本轮）。识别不了"该产出什么"，会变成凑数；
  本轮证据支持的是补这一个具体的洞。**显式欠账**记在下面。

## 未做（显式欠账）

- **没有机制在查"事故留下的护栏还在不在"**。本轮是**人工**发现 0001 的护栏丢了；同类丢失
  （其它 postmortem 承诺的检查是否还在）**未系统核查**——0002 的 `client-half` 已确认在（区域 8），
  0003 无门禁承诺，0004 的 `pnpm verify` 泛指。**4 篇里已核完**，但这是**一次性人工核对**，
  不是可重复的机制。若要机制化，方向 = 复盘文里给护栏一个**可解析的记号**（如门禁 id），
  再由门禁反查"记号指向的门禁是否存在"——**本轮不做**（需要先改 4 篇复盘的书写形状，属独立一轮）。

## 验收

- `pnpm verify`：`PASS preset-required-config ×32 行`；全量 ALL PASS。
- **红→还原→绿**（都实跑，见下表）：删元凶字段 → 门禁红并**点名两个字段与所在角色** → 还原 → 绿。
- 边界红 2：config 声明了但**已空** → 红（首版会静默放行，此例专门守它）。
- 边界红 3：**判据源**（vendor catalog）格式被破坏 → 门禁**自报**"解析不出必填字段"，
  而不是"没找到问题所以绿"。
- vendor 树零改动（`git -C vendor/dsh status --porcelain` 空 + `PASS vendor-clean`）。
- 0001 的护栏清单已指向真门禁名，且写明曾失效。

## 验证记录（2026-10-09 实施）

| 步 | 实跑命令 | 判据与结果 |
|---|---|---|
| **缺口实证** | 删 ceo 的 `sampleOverCapGlobResults` → `node checks/run-gates.mjs` | `verify: ALL PASS` ⇒ **0001 承诺的快检查确实不存在** |
| 真挂载仍在 | `source run/env.sh && node checks/smoke/preset-smoke.mjs` | `FAIL session/create 挂上 ceo: … invalid config: $.sampleOverCapGlobResults missing required value`；`preset-smoke: 3 FAILURE(S)` ⇒ 高保真层没丢 |
| 判据源探明 | vendor `docs/config-catalog.md` | 145 catalog 块；56 包有必填字段；`tool-fs-search`→`[sampleOverCapGlobResults]`、`tool-todo`→`[allowParallelInProgress]`（与 0001 元凶字段精确对上） |
| **红（绿基线后）** | 删两个元凶字段 → `run-gates` | `FAIL preset-required-config: …ceo: @deepseek-ai/dsh-tool-fs-search（1 个必填字段缺）sampleOverCapGlobResults；ceo: @deepseek-ai/dsh-tool-todo（1 个必填字段缺）allowParallelInProgress` → 还原 → `PASS ×32` |
| 边界红 2 | 保留 `config:` 行但清空内容 | 红（`…（1 个必填字段缺）sampleOverCapGlobResults`）——**首版此处会静默放行** |
| 边界红 3 | 把 catalog 的 `export interface Config {` 改名 | `FAIL preset-required-config: 解析不出 vendor docs/config-catalog.md 的必填字段（判据源没了…）` ⇒ 判据源破坏时**自报**不空转 |
| 首版假守卫留证 | 删两个元凶字段后首版输出 | `PASS preset-required-config ×30 行` + `verify: ALL PASS` ⇒ **只少查 2 行、不报错**；修 `sawConfig` + 下限后转红 |
| 越界检查 | `git -C vendor/dsh status --porcelain`；`run-gates` | 空（读 vendor、未改）；`PASS vendor-pin` + `PASS vendor-clean` |
| 链接门禁 | `run-gates` after 改 0001 | 首写错相对路径（复盘已在 `notes/` 内）→ `FAIL notes-link` 点名 → 改 `../implemented/…` → 绿 |
| 回归 | `pnpm verify` + `pnpm test` | ALL PASS；36 files / 355 tests 绿 |
