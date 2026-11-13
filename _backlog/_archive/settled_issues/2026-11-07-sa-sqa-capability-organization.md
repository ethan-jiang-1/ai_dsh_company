---
status: 已结
opened: 2026-11-07
---

# 落地：SA/SQA 的全方位能力怎么组织——按场景取用学科域，别让检查表退化成硬件清单

> 立卡：2026-11-07 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 2026-11-08
>
> **结论/去向**：note — 决定与证据落 [2026-11-08-sa-sqa-capability-routing.md](../../../notes/archived/2026-11-08-sa-sqa-capability-routing.md)（已落）。

**问题与期望结果：** SA（`system-architect`）与 SQA（`system-qa`）应当具备硬软一体、EE/ME 的全方位判断力，
但**能力要按场景取用**：纯软件问题只用纯粹软件的思考（状态机、并发、契约、可观测性、迁移回滚），
不许硬凑采样、供电、耐受包络；含物理执行器/市电/承力件的项目则不许以"不是我的专业"漏掉 EE/ME 条目。
期望结果 = 一套**可复核的域判定 + 按域取用的检查/验证清单**，并能回答"这轮到底该用哪几门学科、凭什么"。

**当前情况：**
- 两个 skill 现有清单是通用词（采样/通信/供电/环境/数据/告警/可维护；不确定度/对偶/失败态/验收/超额声明），
  没有显式的学科域判定步骤：模型默认沿用任务书与上下文，遇到跨域项目时靠临场发挥。
- 2026-11-06 两轮真实运行（`2026-11-06-portable-overload-detection` v4/v5）都是电气通流装置，SA/SQA 双双
  漏掉时间源与短路电流耐受（BUG-034/035）。修那两张卡时只在通用清单里补了两条**条件触发**的窄判据
  （`记录与时间可信`、`故障路径的耐受`），没有动能力组织本身——见
  [BUG-034](../fixed_bugs/BUG-034-no-absolute-time-source-for-signed-records.md)、
  [BUG-035](../fixed_bugs/BUG-035-short-circuit-withstand-undefined.md)。
- **VP-Eng 的任务书是上游变量**：SA/SQA 的输入是 PRD/系统需求；任务书若只写"做个检测器"而不声明
  学科域、现场边界与交付物用途（记录是否要举证），下游两侧只能猜。是否把"域判定"上移到 VP-Eng
  的任务书模板，是本卡的核心分支之一。
- 现状 skill：`packages/company-pack/presets/system-architect/skills/systems-architecture/SKILL.md`、
  `packages/company-pack/presets/system-qa/skills/vv-playbook/SKILL.md`。

**未决问题：**
1. 域判定的形状：单 skill 内加"先判域"步骤（五学科逐域写"在/不在 + 依据"），还是拆成
   `software-architecture` / `hardware-electrical` / `mechanical` 多个 skill 由 SA 自选？拆分的加载与
   组合成本、以及 SQA 如何核对"选对了没有"。
2. 谁声明域：VP-Eng 任务书写（上游约束）还是 SA 自判（下游责任）？两者都要时，冲突以谁为准。
3. "纯软件"的判定门槛：什么算纯软件（无物理执行器/无市电/无承力件）？远程设备、云边协同、
   数据采集类怎么归类？
4. SQA 的"域审计"判据：SA 排除某学科时，SQA 用什么机械/半机械判据判"排除不成立"（例如出现市电字样
   却排除电气域）。
5. 与现有机械判据的关系：`probes/team/sa-sqa-quality-audit.mjs` 的 Q8–Q11 是窄判据（时间源、故障耐受），
   是否要升级为"域 → 必备判据"的可配置表；还是保持窄判据、把域路由留在 skill 文案。

**已批准（2026-11-08，用户）：**

- 分支（1）域判定的形状 = **A 单 skill 域路由**：不拆 skill；SA 的 `systems-architecture` 顶部加「先判域」，
  五学科（软件 / 固件 / 电气 / 机械 / 系统测试）逐域写「在 / 不在 + 依据」。
  （2026-11-08 复审澄清：**五行固定、不得替换**；任务书可追加产品细分行，但五行原样保留；
  任务书边界与 SA 判定冲突时以任务书边界为准、SA 写明偏差、SQA 点名。此前一轮曾把「任务书划分优先」
  写进 skill，复审判定那是未获批准的合同变更，已回退。）
- 分支（2）谁声明域 = **A + C 组合**：VP-Eng 任务书声明现场边界与产物用途（上游输入），SA 必写五学科判定
  （下游责任）；冲突以任务书边界为准，SA 判定偏差由 SQA 在评审里点名。任务书面住 `eng-teaming`（不改
  `content/AGENTS.md` 注入面，避免 replay 新鲜度义务）。
- 其余口径：B（拆域 skill）不做；D（现状 + 窄判据）不做；`sa-sqa-quality-audit.mjs` 的 Q8–Q11 保持窄判据，
  不升级为可配置表；SQA 增加「域审计」步骤（机械可判的部分 = SA 排除某学科却出现该域特征词 → 不通过）。
- 验收：keyless 断言（文案/结构）先红后绿 + `preset-smoke`/`probe-smoke` + **一轮真实运行**（软件类产品，
  证「纯软件不硬凑电气/机械」）的行为证据；真跑 probe = 新 `sa-sqa-domain-routing-probe.mjs`。

**下一步：** 按上表实施；卡随改动归档。

## 范围与排除项

- **在范围内**：两个子人格的 skill 能力组织（学科域判定、按域清单、域审计判据）、与 VP-Eng 任务书
  交付面的接口。
- **排除**：新增角色/编制（SA/SQA 仍是委派子人格）；具体项目的架构/判据正确性；BUG-034/035 的修复
  （已按窄判据落地，不并入本卡）；`probes/team/sa-sqa-quality-audit.mjs` 的既有 Q1–Q7 口径。

## 已知与未决

- 已知：SA/SQA 的 persona 与委托接线见 [SA/SQA Note](../../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)；
  结构审计与质量审计是两件不同的事（前者证流程跑通，后者证产物结构够格）。
- 已知：真实运行里"同一动议做出两个不同产品"的事故（机械力 vs 电气电流）说明**域不锁定**会直接改产品
  定义——这是本卡最硬的需求侧证据（见 `probes/team/sa-sqa-domain-audit.mjs` 头注）。
- **已决（2026-11-08）**：域判定不进 `handbook`（避免改 `content/` 注入面与 replay 新鲜度义务）；进任务书（`eng-teaming`）与两份 skill。

## 方案与取舍

| 方案 | 做法 | 优点 | 代价/风险 |
|---|---|---|---|
| A 单 skill 域路由 | 每个 skill 顶部加"先判域"表 + 按域分节清单 | 改动小、一个入口、模型必读 | skill 变长；域判定没有外部约束，可能自说自话 |
| B 拆域 skill | `software-*` / `hardware-electrical-*` / `mechanical-*` 分目录，SA/SQA 自选 | 按需加载、每域清单更深 | 选择本身需要判断力；漏选/错选没有守卫；组合与挂载面变复杂 |
| C 任务书声明域 | VP-Eng 在任务书写明学科域与边界，SA/SQA 据此取清单 | 域在上游锁定，SQA 可机械核 | 改 VP-Eng 交付面与手册；VP-Eng 判错会放大到两侧 |
| D 现状 + 窄判据 | 只保留 BUG-034/035 两条条件判据 | 零新机制 | 纯软件场景仍无"只用软件思考"的明确指令；跨域漏项靠运气 |

**已批准（2026-11-08，用户）**：**A + C 的组合**——SA 必须写五学科"在/不在 + 依据"（能力可见、可被 SQA 反驳），
VP-Eng 任务书提供现场边界与交付物用途作为输入；不拆 skill（避免选择成本与漏选），Q8–Q11 保持窄判据。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| SA「先判域」五学科固定表（软件/固件/电气/机械/系统测试）+ 在/不在 + 依据；纯软件不硬凑、含物理件不漏域 | 确定性 | `systems-architecture` 文本 | `tests/presets` 断言 | 删一行/删「依据」/删「不是我的专业」→ 红 | `tests/presets/presets.spec.ts` | 用户 review 文案 |
| SQA「域审计」：排除要举证、特征词与判定矛盾 → 不通过、在域要有验证项 | 确定性 | `vv-playbook` 文本 | 同上 | 删「域审计」/删矛盾判据 → 红 | 同上 | 无 |
| VP-Eng 任务书声明域（现场边界 + 执行器/市电/承力 + 产物用途） | 确定性 | `eng-teaming` 文本 | 同上 | 删任一声明 → 红 | 同上 | 无 |
| 纯软件真跑：SA 五域表、电气/机械判不在、SQA 域审计、任务书三声明 | 模型行为 | 排练场真模型一轮 | `sa-sqa-domain-routing-probe --audit <dir>` R0–R6 全绿 | 任一 R 红 | `probes/team/sa-sqa-domain-routing-probe.mjs` | 用户 review 产物 |
| 真挂载 | 编排 | `preset-smoke` | ALL PASS | 行 config 坏 → 红 | `checks/lanes/preset.entry.mjs` | 无 |

## 测试资产

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| 文案/结构 | `tests/presets/presets.spec.ts`（新 4 条） | `pnpm vitest run tests/presets` | skill/任务书文案与边界 | 模型行为 | 先红后绿（4 failed → 54 passed） |
| 真挂载 | `checks/lanes/preset.entry.mjs` + `probe.entry.mjs` | `node checks/lanes/{preset,probe}-smoke.mjs` | 组合能挂/回话 | 内容语义 | 坏 config → 红 |
| 纯软件方向 | 新 `probes/team/sa-sqa-domain-routing-probe.mjs` | `node probes/team/sa-sqa-domain-routing-probe.mjs [--audit <dir>]` | SA 五域表 / 电气机械不在 / SQA 域审计 / 任务书声明 | 一般可靠性、含物理件方向 | 任一 R 红 |

## 关闭条件

用户对分支（1）（2）作出选择，且（若做）落成 skill/任务书改动 + keyless 断言 + 至少一轮真实运行的行为
证据；或明确不做并记录理由。关闭时补 `结论/去向` 块与 `审查：`。

## 交付证据

- 基线：`git rev-parse HEAD` = `0976520`（程序收口后）
- 红：`pnpm vitest run tests/presets` → `4 failed | 50 passed`（SA 缺先判域/五学科、SQA 缺域审计、任务书缺域声明）；
  删 SA 表「固件」行 → 断言点名缺行；探针喂「删一行」的目录副本 → R2 红（`rows=4`）
- 绿：`pnpm vitest run tests/presets` → `54 passed`；`preset-smoke` ALL PASS；`probe-smoke` ALL PASS（6/6）
- **真跑（`--live`，2026-11-08 12:22–12:46）**：`session-ed9f8519-4656-49d9-a8bd-d6c3be456632`，
  slug `2026-11-08-domain-routing-v1` → **R0–R7 ALL PASS**：五份产物齐；架构稿五行原样 + 每行判词/三列依据/承接；
  软件=在、固件/电气/机械=不在；SQA 逐行域审计（五行原样/改名合并/追加行/承接面）并原样保留结论；任务书三声明 + 五行；
  无 final.md；root turn 已结束（按会话日志 `turn/end`，不靠 mtime）
- 历史三跑（不作为最终证据）：08:48 v4 停表过早；08:57 API transport 失败；09:21 模型续写 v4、改用 `--audit` 才读到
  （v4 是任务书五域拆分，与批准的固定五行不一致）
- 资产：`probes/team/sa-sqa-domain-routing-probe.mjs`（live + `--audit`，R0–R7；停表 = 五份产物 + turn 结束 + 30s 稳定；
  收尾 SIGTERM→等待→SIGKILL 防孤儿占 lease）；三份 skill；`tests/presets/presets.spec.ts` 4 条结构化断言
- 复审：Standards + Spec 两个独立子代理盲审（2026-11-08），修复——① 未获批准的「任务书划分优先」回退为固定五行
  （额外域只能追加行）；② 探针 R2 钉架构稿五行（不再数散文名字）、R4 要域审计裁决、R7 要 turn 结束；③ 归档卡去向改活链、
  清掉「待建/未决」旧句；④ decisions 预算 64→65 在本 Note「预算」节论证；⑤ 探针孤儿进程与旧链接修复
- 全量门禁：`pnpm test` **150 files / 1222 tests**；`typecheck` / `lint`（0/0）/ `dup`（0 clones）/
  `verify` ALL PASS；`notes:audit` 状态行不符 0
- 文档/Note：[2026-11-08-sa-sqa-capability-routing.md](../../../notes/archived/2026-11-08-sa-sqa-capability-routing.md)；
  卡与 Note 互链
- 审查：`审查：agent — 2026-11-08`（含双轴复审）；用户已定分支（A+C），对照原文验收待办
