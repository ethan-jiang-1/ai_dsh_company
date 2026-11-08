# 2026-11-08 · 委派面合同修复轮：BUG-036..041 的处置、资产与上游批

状态：implemented（2026-11-08；6 张全部归档；040 按产品规避收口，引擎缺陷留档）
上游 = [探索性测试问题卡](../../_backlog/issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)
（第一轮发现 = [探索 Note](2026-11-08-workflow-subagent-exploration-fixes.md)；修复交接 =
[bugs/README §2026-11-08 修复交接](../../_backlog/bugs/README.md)）

## 决定

用户授权原话（2026-11-08）：“那这样我们可以先停一下，让另外一个Agent去修复发现的所有的bug。”
本轮按**质量优先**执行：能改行为/配置就真修；根因在 vendor 的不造平行实现；不把缓解写成已修。

**三条工程准则**（本轮所有取舍的判据）：

1. **能改行为/配置就真修**——不教模型绕开缺陷，让缺陷不再发生（039 配置、037 控制面）。
2. **根因在 vendor 的不造平行实现**——那是更贵的补丁；把补丁写给拥有者，并让缺陷可检测。
3. **产品用不到的引擎组合明确禁止**——这是设计决定，不是绕过（038 分支当叶子）。

**六卡终局**（卡内各有完整证据与审查记录）：

| 卡 | 终局 | 修法 | 资产 / 上游 |
|---|---|---|---|
| [BUG-036](../../_backlog/_archive/fixed_bugs/BUG-036-workflow-schema-enum-type.md) | 已修 | skill 四条子集约束（R6/R15 绿） | 钉子 `tests/harness/contract/json-schema-subset.spec.ts`；上游补 description |
| [BUG-037](../../_backlog/_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md) | 已修 | 新增 `list_subagents` / `send_to_subagent`（官方 `ctx.subagents` + 父会话 durable catalog，名字不被团队版 shadow） | `tests/company/delegation-control.spec.ts` + 真挂载 79 tools；上游修好后**退役**这两工具 |
| [BUG-038](../../_backlog/_archive/fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md) | 已修 | 分支当叶子规则 + 真跑观察（首轮嵌套→模型自纠为父层扇出）；修正 skill 的“必 null”过度断言 | `checks/smoke/workflow-contract-smoke.mjs` 第 6 条；上游分支结果语义 |
| [BUG-039](../../_backlog/_archive/fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md) | 已修 | **配置真修**：vp-eng preset 的 `tool-workflow.maxResultChars` 50k→200k，spill 设计生效（头尾预览 + 全文落盘 + 可读路径）；删掉“spill 是截断副本”旧句 | 钉子 `tests/harness/contract/workflow-result-budget.spec.ts`；探针见下；上游默认值语义 |
| [BUG-040](../../_backlog/_archive/fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md) | 修复已落地（**留活**） | 技能/验收规则 + 机制钉子（completed 纯文本 + schema → null 且 agentEnd failed） | `workflow-contract-smoke` 第 5 条；判定第一条要引擎诊断，本仓做不到（卡内已写上游真 diff） |
| [BUG-041](../../_backlog/_archive/fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) | 修复已落地（**留活**） | 查询面（`list_subagents` 读 durable catalog）+ 部署前置（budget-and-ops 行） | `delegation-control.spec.ts`；**缺口**：只报 running/inactive，不报 `turn/end interrupted` |

**引擎语义缺口台账（三类；锚点即“上游变了会红”的地方）**：

| 类 | 引擎事实（本 pin） | 模型面规则 | 锚点 | owner / 退役条件 |
|---|---|---|---|---|
| `[CT-IN]` 输入合同 | schema 只吃子集：enum/const 需单值 type、无 type 数组、oneOf 不与 type 并列、根 object；违反 = 整轮 fatal 零 agent | `eng-teaming`「schema 只吃子集」 | `json-schema-subset.spec.ts` | 上游：tool-workflow description 补一句 |
| `[CT-OUT]` 输出通道 | 默认 50k 截断且先截断再落 spill；schema 分支缺 structured → null 无诊断；非 schema 分支返回 child 最终文本原样拼接 | 「返回聚合/异常」「分支默认是叶子」 | `workflow-result-budget.spec.ts` + smoke 5/6 条 | 上游：截断前交全文给 spill、分支保留 final text/diagnostic |
| `[CT-LIFE]` 控制与生命周期 | 根 = Lead，团队版控制名 shadow 全局版；重启后 child 记 interrupted，父无终态通知（durable 可查） | 「控制面」「长跑」 | `delegation-control.spec.ts`（含 `lastTurnEnd`）+ budget-and-ops 行 | 上游修 shadow/对账后：**删两个控制工具**、删控制面段 |

**上游批（真 diff/真描述，不是“建议补一句”）**：

1. `tool-workflow` model-facing description 补子集四条（`[CT-IN]`）。
2. `tool-workflow` 截断前把完整渲染值交给 spill store（默认 50k 的其它消费者受益）。
3. `workflow-ptc/runtime.ts` schema 分支保留 `shape-mismatch` + child final text（diff 见 BUG-040 卡）。
4. `workflow-ptc` 非 schema 分支只取最后一轮结论，或把 activation 回执与结论分开（BUG-038）。
5. `agent-team` 让根会话直接用全局控制名；`subagent` resume 时对无终态 child 补 `subagent/end`（interrupted）。
   其中第 5 条落地后，本仓的 `list_subagents` / `send_to_subagent` 按 `[CT-LIFE]` 退役条件删除。

**取代**：研究材料 §16.4 的“keyless retry 脚本暂不进 `pnpm test`”**已失效**——本轮把它升格为
`checks/smoke/workflow-contract-smoke.mjs`（keyless ~2s；机制档，仍不进 `pnpm test`）。理由：脚本已存在、
成本可忽略，且它在本轮补出了 038/040 两条机制钉子。

## 输掉的方案

- **给 workflow 套一层包装工具**（把 child 文本/诊断补回来）：等于在本仓实现平行引擎，随上游漂、维护成本最高；
  040 判定第一条仍照实留缺口。
- **继续只加 skill 句**（037）：F7 已证规则加了仍会踩；只有替代控制名是能力级修复。
- **为这批发现新增 verify 门禁**：P2 准入要求“本仓复发过 + 可机械判定 + 负例已证”，且门禁是要维护的代码；
  资产落在 `pnpm test`（钉子/判据）与 smoke（机制档）已足够。
- **把“六张全归档”当目标**：会把 040/041 写成假结；按用户“质量优先、不短期补上去”的要求改为留活 + 缺口记账。
- **在 docs/delegation.md 加台账表**：doc-budget 已顶格（120/120），且会造第二份清单；台账住本 Note，
  合同只写现在时行为。

## 后果与边界

- **归档 6 / 留活 0**：040 按“产品规避”收口——分支不再用 schema，症状不可达；引擎缺陷仍留档
  （上游提案与真 diff 在卡内，恢复 schema 前必须先有诊断）。041 的终态读取在复盘中确认可行：
  `openAt: never` 只禁搜索，`readSession` 仍读 durable 日志，判定第一条由 `lastTurnEnd` 满足。
- **040 的取舍**：放弃“分支带 schema”的类型校验，换“答案不丢、null 不歧义”；这是产品级禁止，
  不是引擎修复。若将来 schema 分支被证明必需，必须先补引擎诊断或父侧诊断插件。
- **双控制面并存**：根门用 `list_subagents` / `send_to_subagent`，child 用全局 `send_message`；
  上游修 shadow 后必须按退役条件删，避免长期两套名字。
- **200k 是产品选择**：>200k 仍硬截断且 spill 是副本；端到端“spill 完整”目前靠一次性探针，**未进 CI**
  （钉子只覆盖“工具不截断”）。若将来要常驻，需把 tool+spill 全链做成机制档。
- **`tests/harness/contract/**` 不进 tsc**：直引 vendor 源，与 `tests/client` / `tests/company` 对
  直引 vendor 源 spec 的处置同形；运行面走 vitest paths，不受影响。
- **layering 守卫修正**：驱动脚本正则只认“从本文件向仓库根走的相对路径”，修掉
  `vendor/dsh/packages/core/tools` 同名目录的假红；红配方（临时 import `tools/drivers`）已现场验证。

## 验证（实跑）

- `pnpm verify` → ALL PASS（2 门无对象）。
- `pnpm test` → **1236 passed / 153 files**（新增 10 条：schema 钉子 4、渲染钉子 3、控制工具 6，含替换）。
- `pnpm typecheck` → 绿（pack 两面 + 三个 tests 面）。
- `pnpm vitest run tests/presets` → 54 passed；`node checks/smoke/preset-smoke.mjs` → **ALL PASS**
  （6 角色 + 3 子人格可挂载；含改过 config 的 vp-eng）。
- `node --import tsx/esm checks/smoke/workflow-contract-smoke.mjs` → **7/7 PASS**（含 040 规避的 JSON-line 用例）。
- **BUG-040 探针**（`runtime/tmp/explore/fix1/S040/`，会话 `session-6a01fa71-…`）：自然任务下 4 次 workflow /
  8 agents，4 个脚本全部**无 schema / 无 structured_output**，按新规则 `JSON.parse` + 保留原文；
  一次 run error 是模型脚本把 `raw` 写成 `undefined`（引擎拒绝正确，模型自修）。
- **BUG-041 durable 读实测**（standalone，RS1 的真实重启会话）：`sessionQuery.readSession('48eb730a-…')`
  → 23 events，最后 `turn/end {"reason":{"kind":"interrupted"}}`（`openAt: never` 下可用）。
  守卫红配方：关掉 `list_subagents` 的终态增强 → 该用例 1 failed / 8 passed；还原 → 9 passed。
- **BUG-039 真模型探针**（`runtime/tmp/explore/fix1/S039/`，会话 `session-88afce0d-…`）：4 分支 × 500 行；
  工具结果 49,931 字符 + `(Omitted 21993 bytes … stored at: …)`、**无 `[truncated:`**；spill 文件
  **71,677 字符**，含 `m01-line-1` 与 `m04-line-500`、无截断标记；模型 read/grep 核对。对照原症状
  （49,929 + `[truncated: 35806]`、spill 50,102 含同一标记）。
- **BUG-038 真模型探针**（`runtime/tmp/explore/fix1/S038/`，会话 `session-03fe693d-…`）：3 次 workflow /
  8 agents；首轮嵌套后模型自读混合回执并重构为父层扇出；同轮修正 skill 的“必 null”说法（3 次复现无 null）。
- **红配方（负例留证）**：删 preset 的 `maxResultChars` → 渲染钉子第三条红；临时 import
  `tools/drivers/playwright.mjs` → layering 守卫 2 条红；还原即绿。
- 探针原始证据在 `runtime/tmp/explore/`（gitignored）；本 Note 只留脱敏摘要与会话 id。

## 042–044 修复轮（2026-11-09）：我们自己的工具也要守层契约

> 上一节修的是“引擎没告诉模型的东西”；这一轮修的是**我们自己新增的委派工具**把模型可见视图
> 接在了错误的层上。三条实例：isolate 的 sessionQuery（042）、单一 catalog 来源（043）、
> 进程内 job 注册表（044）。

**层契约（新工具/改工具时的判据）**：

| 层 | 能回答什么 | 工具可用性 | 用途 |
|---|---|---|---|
| 父会话 durable `session.ownEvents()` | child 目录、workflow run/agent 起止、工具回执 | **永远可达** | 目录、run 视图（首选） |
| `sessionPersistence.open(id,'read')` | 子会话终态/日志 | root 可达 | 子会话终态（042） |
| `agentTeams.tryMembership/listMembers` | 名册/role/姓名 | root 可达 | teammate vs subagent 身份（043） |
| live `agents` / `jobs` | 现在是否在跑 | 可达 | **只作装饰**，不得作为持久事实唯一来源 |
| isolate 组内 `sessionQuery` | 会话查询 | **host 工具拿不到** | 只在组内用 |

两条铁律：**承诺字段不许静默省略**（读不到给 `unavailable` + `lastTurnEndDetail`）；**durable 读
用真实服务测**（fake service 会藏住“服务在真实装配里缺席”这一类 bug——042 就是这么漏的）。

**三卡结果**：

- **BUG-043（已修归档）**：`list_subagents` 行加 `role/address`（teammate→队名、subagent→session id；
  `agentTeams` 缺席/非成员全按 subagent，不丢行）；description + `eng-teaming` 写死两套寻址。
  keyless 14 条；未跑 C3 真模型观察（按卡里 description/skill 分支收口）。
- **BUG-044（已修归档）**：新增 `workflow_runs`（父会话自己的 `tool-workflow/*` + 工具回执 →
  completed/cancelled/running/lost + children；lost = 无 run-end 且 job 注册表不认识）。
  keyless 6 条；**真实 C7b 会话日志离线验证**输出 `lost` + jobId + 4 children；C7b 探针里模型
  未实际调用该工具（行为观察，能力已验）。原 job 结果明确不恢复。
- **BUG-042（修复已落地，未归档）**：终态改读 root `sessionPersistence`（不再用 isolate 的
  `sessionQuery`）+ `unavailable`/`lastTurnEndDetail` 可见降级 + 有界重试；keyless 3 条真实
  JSONL 持久化测试（create/append/close + 红配方）。**真实装配仍有缺口**：C2d 干净 home 下
  重启后第一次查询仍 `unavailable`，`send_to_subagent` 冷恢复后第二次才 `interrupted`；
  原因未定位（需看 `lastTurnEndDetail` 的下一次探针）。041 的“真实装配 interrupted”证据
  因此仍未成立。
