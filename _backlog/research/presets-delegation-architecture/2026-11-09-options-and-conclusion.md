---
topic: presets-delegation-architecture
intent: 把前五份材料的证据收敛成“是否需要调整、调整什么、按什么顺序、哪些交用户裁决”的可执行结论
---

# 结论：presets 的委派面需要结构性调整（分三阶段）

> 证据基线：inventory（9 preset/1,524 行/131 工具行/9,303 字符 persona/819 行角色 skill）、
> structural-analysis（S1–S6）、dsh-affordances（preset/subagent/workflow/team 约束）、
> external-practices（Anthropic/Claude Code/OpenAI 一手）、contract-duplication（词频）、
> composition-experiments（dump-config 声明面 + 底座/delta 矩阵）。
> 本文的“事实”均可追到上述材料；“建议/顺序”是推论，实施需要另行授权。

## 1. 一句话答案

**需要调整，而且不是“再写几句 skill”**。现状是九份手写、自包含、结构同构但参数各异的装配；
缺的是**能力模型、合同单家、工作组合、面级验证**四件东西。推荐先做“**合同单家 + worker profile +
能力清单 + keyless 声明面矩阵**”，生成器作为第二阶段，team 成员组合/通道统一属上游或长期。

## 2. 四个结构缺口（合并 S1–S6）

| 缺口 | 事实（摘要） | 为什么是结构性的 |
|---|---|---|
| **G1 组合重复、无能力清单** | 9 preset/186 子行/28 种插件名；精确共有仅 3 种、按名共有 4 种；6 个 full role ~20–29 行、3 个 leaf 2–6 行；深度/通道靠行级 maxDepth 与 docs 副本 | 改一个底座要改 9 处；能力（通道/深度/worker 形态）没有一套可检查的声明，只能读 YAML + bundle + docs + skills |
| **G2 工作组合 = 角色克隆** | 通用 `subagent`/`subagent_fork` 不带 `agentPreset` → 继承父的完整组合（vp-eng worker 有 workflow、5 条 subagent 行、control；depth 2 内可继续生） | 不是参数问题：worker 本应是受限执行组合；BUG-038 的嵌套返回、控制面混淆都从这里长出来 |
| **G3 合同散文角色局部** | 引擎合同词（structured_output/UNSUPPORTED_SCHEMA/spill/200k/interrupted）**只在 eng-teaming**；控制面词散在 4–9 个文件；docs/delegation 是词频最高但模型不读 | 其他角色与 worker 拿不到合同；维护面与模型面是两套载体，靠人搬运；修 bug = 加句 |
| **G4 三通道缺统一模型 + 面级验证** | team（bundle/名册）、subagent（preset activation）、workflow（vp-eng 行）各有身份/寻址/终态；根被 team shadow（037）；042/043/044 的修复把工具加进 host；测试只有挂载/文案/fake service | 委派面一半在 YAML、一半在 bundle、一半在 host；没有“声明 vs 实际”的矩阵，事故只能靠探索发现 |

## 3. 目标结构（优雅形状）

```
角色定义（archetype + delta）
  ├─ full role：底座 ~20 行 + 角色 delta（persona/skills/命名委派/control/workflow/model）
  └─ leaf worker：5–6 行、无委派面（researcher/SA/SQA 已是这个形状）
        ↓ 构建期生成（运行期仍自包含）
委派政策（共享、模型面一份）
  ├─ 何时委派 / 哪条通道（自己 / subagent / workflow / team）
  ├─ effort 预算（Anthropic 的 1/3–10、2–4/10–15、>10 数字档）
  ├─ brief 四要素（objective/output format/tools & sources/boundaries）
  └─ 控制权与寻址（team 名 / subagent id / run id）
worker profiles（窄组合）
  ├─ 通用 worker：工具栏、depth 0/1、无 team/control、fresh
  ├─ 命名专家：专用 preset（已有）
  └─ teammate：DSH 继承 Lead → 记为平台约束（不假装可按成员钉组合）
观测与评估
  ├─ keyless 声明面矩阵（--dump-config 已原型）
  ├─ 偶发真模型探针（会话实际工具面/行为）
  └─ 小样本 end-state eval（外部的“从 20 条开始”）
```

与外部三家同构：Claude Code 的声明式 agent 定义 + 工具/深度/模型约束；OpenAI 的
agents-as-tools vs handoffs 控制权模型；Anthropic 的 orchestrator brief/effort/eval 经验。

## 4. 三个方案

### A. 最小结构调整（推荐先做）

范围：

1. **合同单家**：把引擎合同与委派政策从 `eng-teaming` 抽到一份共享模型面载体（共享 skill 或
   常驻 prompt section；见待裁决 Q2）；角色 skill 只留领域方法与五档判据。
2. **worker profile**：给通用 `subagent`/`subagent_fork` 行钉一个 `worker` preset（thin 工具栏、
   depth 0/1、无 team/control）；`tool-subagent` 的 `agentPreset` 是原生的（affordance 已核）。
3. **能力清单**：每角色一份声明（archetype/channels/depth/worker profile/control/workflow/model），
   由生成或手工维护，但**测试消费**它。
4. **keyless 声明面矩阵**：用 `--dump-config` 解析 9 个 preset 的子行，与能力清单/期望矩阵比对；
   新增 preset/行漂移时红。

成本：中低（1 个 worker preset + 1 份合同载体 + 1 个清单 + 1 个矩阵 spec；无生成器）。
解决：G2、G3、G4 的测试面；G1 的“能力隐晦”部分。
风险：worker profile 是公开行为变化（需授权）；共享合同的加载时机（skill vs section）需实测；
清单可能变成第四份副本（必须由测试消费）。

### B. 结构化（A 成功后）

范围：**构建期 archetype 生成器**（full/leaf 两模板 + 角色 delta → 9 份自包含 YAML）+ 生成后
解析回读/与 dump 比对 + 能力清单由 delta 派生。
成本：高（生成器、模板变量、注释/`!!js` 保真、diff 可读性、迁移一次性 diff）。
解决：G1 全量 + G2/G3 的载体一致性。
风险：生成物可读性/评审噪音；DSH Loader 默认值；生成器本身成为新的维护面。
条件：A 落地并稳定后，用 `/tmp` 原型 + 一轮 diff 再决定。

### C. 彻底（不建议本轮）

范围：统一三通道控制面（list/status/continue/cancel 跨 team/subagent/workflow）、team 成员按
preset 组合、workflow 子代 preset/depth。**这些要动 vendor 或自建引擎等价面**；DSH 当前不支持
team 成员 preset、workflow 子代无 preset、workflow 无 depth gate（affordance 已核）。
处置：写上游提案；本仓只做“合同/寻址/终态”的模型面统一，不自建控制器。

## 5. 推荐顺序

1. **P0（A 的前两项）**：合同单家 + worker profile 试点（**只做一个角色**，建议 vp-eng；
   观察是否减少嵌套/控制面误用）。
2. **P1（A 的后两项）**：能力清单 + `--dump-config` 矩阵 spec（keyless，进 `pnpm test`）。
3. **P2（B）**：生成器 `/tmp` 原型 → 与现有 YAML 的解析等价性 + diff → 决定是否迁移。
4. **P3（C）**：上游提案（team 成员 preset、workflow 子代 preset/depth、通道统一）；
   在 pin 升级检查表里加“合同/能力清单复核”。

## 6. 不做什么

- 不在本仓复制一个“委派控制器”来统一 team/subagent/workflow（平行引擎，vendor 一变就烂）。
- 不把 team 成员的组合伪装成可按 preset 钉（DSH 是继承 Lead；写死这个约束）。
- 不把“多智能体 15× token / 90.2% 提升”当本仓收益承诺；只作分层动机。
- 不把模型塞回 CI；面级矩阵 keyless，行为用偶发探针/小样本 eval。
- 不在目标结构未定前写完整生成器（过早优化）。

## 7. 未决 / 需要用户裁决

| # | 问题 | 推荐 | 影响 |
|---|---|---|---|
| Q1 | 是否接受 **worker profile**（通用 subagent 钉 worker preset，行为变化）？ | 接受，先 vp-eng 试点 | 公开行为；可能改变 worker 能力（无 workflow/team） |
| Q2 | 合同单家用**共享 skill** 还是**常驻 prompt section**？ | 共享 skill 先行；关键句进 tool description；若探针显示未加载，再评估 section | token 税 vs 加载可靠性 |
| Q3 | 先 A（清单/矩阵）还是直接 B（生成器）？ | 先 A；B 以 `/tmp` 原型验证后再决定 | 成本/风险 |
| Q4 | team 成员继承 Lead 视为**接受约束**还是**推上游**？ | 记录为已知约束 + 上游提案；本仓不假装可配 | 委派面完整性 |
| Q5 | 是否把本结论转成 issue/RFC（研究产出的卡）？ | 建议转一张 issue（范围 A） + 一张上游提案 note | 研究 → 实施的门票 |

## 8. 证据与复算

- 结构模式与读数：[2026-11-09-structural-analysis.md](2026-11-09-structural-analysis.md) /
  [inventory.json](inventory.json)。
- DSH 约束：[2026-11-09-dsh-affordances.md](2026-11-09-dsh-affordances.md)。
- 外部实践：[2026-11-09-external-practices.md](2026-11-09-external-practices.md)。
- 合同分布：[2026-11-09-contract-duplication.md](2026-11-09-contract-duplication.md) + `contract-terms.mjs`。
- 组合实验：[2026-11-09-composition-experiments.md](2026-11-09-composition-experiments.md) +
  `dump-presets.mjs` / `composition-matrix.mjs` / `composition-names.mjs`。

## 9. 边界（未证）

- 未跑真模型探针：team 工具在根的实际 shadow、每会话实际工具面、模型是否会按新合同行动，
  都只有静态/声明面证据；实现后需一次定向探针。
- 未验证生成器的 YAML 保真（注释/`!!js`/顺序）；B 阶段先做 `/tmp` 原型。
- 外部数字（90.2%、15×、40%）是各自场景结果，不是本仓承诺。
