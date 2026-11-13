---
topic: presets-delegation-architecture
intent: 核对 DSH 0.2.1 对 preset 组合、subagent/workflow/team 委派、skills 与 prompt 的真实 affordance，把结构分析里的 V 项落成事实
---

# DSH 委派 affordance 核对（pin `dsh-v0.2.1-rc.5`）

> 目的：回答“哪些结构选项在 DSH 里是原生可行的、哪些要自建/不可行”。只读 vendor 源码与 README；
> 每条给文件依据。本文不评价好坏，只记能力与约束。

## 1. preset 组合模型

| 事实 | 依据 | 对结构设计的意义 |
|---|---|---|
| preset = `@deepseek-ai/dsh-agent-preset` 一行 + `config.plugins` 子插件列表；定义 **eager 加载**，编辑只影响**之后创建**的 Agent（live Agent 组合稳定/KV cache） | `vendor/dsh/packages/preset/agent-preset/README.md`（Summary / Use / Model Experience） | 组合是**静态 YAML**；可以在构建期由生成器产出，运行期仍是自包含文件 |
| 没有运行期 preset 继承：预设是 children 列表，不是 base+override | 同上；本仓 `presets/vp-eng/agent.cordis.yml`（2–3 行） 的实测注释 | S1 的重复只能在**构建期**消除（H1）；不要期待运行期 fragment |
| 子条目 id 可省略、由 Loader 分配；`!!js` 表达式保留到子插件加载 | agent-preset README（Implementation internals） | 生成器可输出普通 YAML；`!!js` 路径需要保留（skills 目录、spill 路径） |

## 2. subagent（activation）的委派面

| 事实 | 依据 | 意义 |
|---|---|---|
| `tool-subagent` 的 Config 有 `agentPreset?`：**默认独立 preset；省略则继承父**；`allowedAgentPresets?` 可把 `agent_preset` 暴露给模型选择 | `vendor/dsh/packages/subagent/tool-subagent/src/preset-selection.ts`（7–12 行） | **H4（worker 组合）是原生的**：给通用 `subagent` 行加 `agentPreset: <worker>` 即可；不需要新机制 |
| 每个 tool-subagent 实例必须用不同 `toolName` | `tool-subagent/src/index.ts` Config 注（toolName 注释） | 命名委派行可以多实例；worker 行与命名行可共存 |
| `subagent` 行可配 `provider` / `maxDepth`（数字或 `provider-managed`）；数字深度需要 provider 的 `depthLimit` 能力 | `tool-subagent/src/index.ts`（50–78 行） Config | 深度是**每行**手写，不是角色级声明；S2 的一致性只能靠生成器/测试 |
| 委派是 activation：工具立即返回 `{kind:'activation', subagentId}`，终稿由完成通知回父；`backgroundMode`/`run_in_background` 已删 | `checks/lanes/delegation.entry.mjs` 头注；`tool-subagent/src/index.ts` start 路径 | 控制/终态/续驶是 subagent 服务的语义，不是 preset 能改的；preset 只能决定“给不给控制行、深度多少、用哪个 preset” |

## 3. workflow 的委派面

| 事实 | 依据 | 意义 |
|---|---|---|
| `workflow-ptc` 的 `agent()` **没有 `agentPreset`**；子代由父组合克隆（同人格/工具面，fresh 上下文） | `vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts` 的 `SUPPORTED_AGENT_OPTIONS`（label/phase/schema/provider/model）；本仓 `eng-teaming` 说明 | **S3 的放大在 workflow 里不可用 preset 收敛**；若父组合包含 subagent/workflow 行，分支也会拿到（只能靠 skill 约束“分支是叶子”） |
| workflow 本身没有 maxDepth 闸 | 同上；本仓卡与研究材料已记为已知限制 | 深度只能由父行的 maxDepth 间接约束 |
| 结果通道：工具在 `maxResultChars` 处截断；spill-policy 在其后落盘；schema 分支缺 structured → null | `tool-workflow/src/index.ts`、`workflow-ptc/src/runtime.ts`；BUG-039/040 卡 | preset 能改的只有 `tool-workflow` 的 config（如 vp-eng 的 200k）；其余是引擎语义 |

## 4. team（Agent Teams）的委派面

| 事实 | 依据 | 意义 |
|---|---|---|
| 团队成员**继承 Lead 组合**（`composeFrom`），`SpawnTeammateRequest` **没有 agentPreset** | `agent-team/src/types.ts`（165–172 行）；`docs/contracts/presets.md` 四形态矩阵 | **H4 对 teammate 不可用**：worker 组合只能约束 subagent 子代，不能约束队友；队友的能力面 = Lead 的能力面 |
| `tool-agent-team` 按 membership 安装；根会话是 Lead（`tryMembership`）→ 团队版控制名 shadow 全局版 | `experimental/tool-agent-team/src/index.ts`（183、418–423 行）；`agent-team/src/roster.ts` | S5 的 shadow 是机制事实；preset 声明全局控制行在根是**死行**（BUG-037） |
| team 工具不在 preset 行里，是 bundle 级安装 | 本仓 `cordis.patch.yml` / preset 行；inventory | 委派面被拆成 preset（subagent 行）+ bundle（team）+ host（补丁工具）三处 |

## 5. skills / prompt 的承载面

| 事实 | 依据 | 意义 |
|---|---|---|
| 每 preset 可用 `skill-filesystem` 的 `customSkillDirs` 挂角色/共享 skills；本仓 4 个角色已共享 `_shared/skills` | 本仓 preset 行；`_shared` 使用 grep | **H3 可行**：共享合同可以放 `_shared/skills/<contract>/`，由需要的 preset 挂同一目录 |
| skill 结果有 8192 字符的工具结果裁剪阈值（标准 preset 的 pruner）；skill 正文超过会被裁 | `agent-preset/README.md`（Model Experience 段） | 共享合同 skill 必须短，或拆 references；不要塞长文 |
| 工具插件可向 `systemPrompt` 注入 section（workflow 就这么做）；这是**常驻模型面** | `tool-workflow/src/index.ts` 的 `ctx.systemPrompt.section` | 若要“合同常驻、不依赖模型加载 skill”，需要一个 host/tool 插件注入 section；这不是 preset 能力 |
| `agent-preset` 的 skills 目录（agent-experience 等）是 vendor 自家示例；本仓的角色 skills 走自定义目录 | vendor README；本仓 preset | 可借鉴其“短 skill + references 按需读”的形状 |

## 6. 证据读取面（面级测试的候选）

| 事实 | 依据 | 意义 |
|---|---|---|
| 会话实际工具面 = `request/header.tools`；`--dump-config` 只证组合层 | `docs/contracts/presets.md`（生效证据节）；本仓研究材料 | H6 的“声明 vs 实际”测试要么读会话 header（需要一次模型请求），要么找 Loader 级 dump（keyless） |
| `agentPresets/list` 可列名册/预设（web RPC） | `docs/contracts/presets.md` 名册；preset-smoke | keyless 可验“预设在场/可挂载”，但不能证明 per-session 工具面 |
| preset-smoke 通过 `session/create` 真挂载，零模型 | `checks/lanes/preset.entry.mjs` 头注 | 面级测试可以复用这条真入口；要读工具面需再找 RPC/日志点 |

## 7. 对结构选项的裁决（本轮）

| 选项 | DSH 可行性 | 备注 |
|---|---|---|
| H1 构建期基座 + delta | **可行**（preset 是静态 YAML；生成物自包含） | 运行期不变；生成器需保留 `!!js` |
| H2 能力清单 | **可行**（本仓自定义声明 + 生成/测试消费） | 必须生成而非手写，否则第四份副本 |
| H3 合同单家（共享 skill / prompt section） | **部分可行**：共享 skill 目录可行；常驻 section 需 host 插件 | skill 有 8192 裁剪阈值；常驻段落是 host 面 |
| H4 worker 组合 | **subagent 可行**（行级 `agentPreset`）；**teammate 不可行**（继承 Lead） | workflow 子代也不可选 preset |
| H5 通道统一契约 | **本仓可做合同层**；引擎层要 vendor | 不要自造引擎；先统一“寻址/状态/终态”的模型面 |
| H6 面级矩阵测试 | **部分可行**：keyless 挂载 + 名册；工具面需 RPC/日志 | 需要一次实验找 keyless 读取点 |

## 8. 待验

- `--dump-config` 是否包含 preset 的 `plugins` 行（若包含，可做 keyless 声明/实际矩阵）。
- 是否有 RPC 能在不发起模型 turn 的情况下读会话工具目录（`session/create` 响应/`session/page` header）。
- `tool-subagent` 的 `allowedAgentPresets` 若启用，模型选择是否会影响 worker 组合的可预测性（设计取舍，不必本仓采用）。
- workflow 子代克隆父组合时，是否包含父的 `tool-subagent` 行与 workflow 行（源码看是 agentOptions 继承，需实测确认；影响 S3 的严重度）。
