---
topic: 从 GAP 到 issue：把现有委派逻辑转成 DSH 原生形状的实验计划
intent: 在出 issue 之前，把“没信心”的部分逐条变成可执行的实验与判决规则；只做研究/实验设计，不产出生产代码
---

# 从 GAP 到 issue：实验计划

> **执行后记（2026-11-11）**：实际跑了 8 场行为（E5 4 + B1/B2/B3/B5；B5 partial），超出 §3.2 的 6 场上限；B4 不再单跑，转为 Issue 2 的实现验收 pilot。结果见 [2026-11-11-experiment-results.md](2026-11-11-experiment-results.md)。

> 目标：不是再写一份“GAP 清单”，而是把 **现有逻辑 → 原生做法** 的转换方案做到 **出卡即有把握**。
> 出卡时卡里不应再有“可能 / 也许 / 待实验”；实验的结果要么支持方案，要么让方案改形。
> 基线 = [2026-11-11-native-baseline.md](2026-11-11-native-baseline.md)；GAP 编号 = [2026-11-11-repo-fit-gap-register.md](2026-11-11-repo-fit-gap-register.md)。

## 0. 一句话

**先做“结构实验”证明该改哪里，再做“行为实验”证明改了不会坏；两者都过，才出 issue。**
结构实验 keyless、可并行；行为实验用真模型、有预算、只打会改变卡措辞的假设。

## 1. 我现在的信心分布

| 结论 | 信心 | 缺什么 |
|---|---|---|
| G2 `maxDepth` 注释/测试文案是错的；政策 §6/`eng-teaming` 的链是对的 | **高**（vendor 源码 + 真值表 + 政策自证） | 只缺一条组合层测试把“CEO 行 1 / vp-eng 行 3”钉住 |
| G3 team 上下文默认 fresh，模型字段 `true` 不成立 | **高**（vendor 默认值 + 全仓无 `context: 'fork'`） | 缺“团队实际怎么拿到上下文”的行为观察；缺 docs 口径统一 |
| G4 A/B/C/D 与原生四通道是两套模型 | **高**（文档/术语/模型三处对读） | 缺“到底保留哪套、怎么映射”的决定；不是事实问题 |
| G1 共享政策描述了角色没有的通道 | **高（静态）** | **缺行为证据**：模型是否真的会去调不存在的 workflow/fork/retry；缺“按工具面注入”还是“按权限注入”的设计验证 |
| G5 引擎事实混进政策、重试/工作流事实多载体 | **中高** | 缺“拆成哪些载体、每段多长、有没有丢规则”的原型；缺角色实际 token 成本 |
| G6 `workflow_runs` 全局注册、无 workflow 的角色也看得见 | **中高（代码）** | 缺真挂载的工具面证据；缺“per-agent 安装”会不会漏掉继承组合的子代 |
| G7 workflow/质量环只在一个角色 | **低**（需求未证） | 缺“其他角色是否真有 ≥3 同构任务”的行为/业务证据；缺“角色能力 vs 公司能力”的拍板 |
| G8 `goal` 装了但没政策、与 P3 有张力 | **低**（治理未证） | 缺“模型会不会自开 goal”的行为观察；缺产品选择 |

**出卡原则**：高信心的先出“事实/合同”卡；G1/G5/G6 出“能力域化”卡；G7/G8 不混进前两张，等行为证据 + 用户拍板后再单独出决策卡。

## 2. 目标形状：三个候选

### A. 能力域 section + 核心 skill（推荐）

- `content/contracts/delegation/{spawn,fork,workflow,team,retry}.md` 五段短合同；host 用 `agent/created` + 能力/权限探测，只注入该 Agent 真有的段落（复用 `registerWorkflowContract` 的形状）。
- 共享 `delegation-policy` skill 缩成 **core**：默认自己做、brief 四要素、effort、链设计、结果可读性；不再列角色没有的通道。
- 角色方法 skill（`eng-teaming` / `assembling-the-team`）只留领域打法，通道选择链到 section。
- 优点：原生“按能力存在性注入”；一处事实一个家；无 per-preset 复制。
- 风险：常驻 section 的 token 成本；team 段需要 **权限**（Lead）而不是“工具在场”判断。

### B. 按 preset 生成 policy skill

- 每个 preset 生成一份只含自己通道的 `delegation-policy/SKILL.md`。
- 优点：按需加载，零常驻；每角色文本精确。
- 风险：生成器/生成物维护；skill 可能不被加载；仍是“角色泛化文本”而不是“策略随工具走”。

### C. 共享 skill + 一行能力头

- 保留共享 skill，只在 system prompt 加一行“你的通道：…”，由 host 按 preset 生成。
- 优点：改动最小，直接解决“模型不知道自己的通道”。
- 风险：skill 里仍有无用通道细节；G5 的分层问题不解决；最像补丁。

**当前倾向 A**；B/C 作为 A 过不了“token/行为”门时的退路。实验 E3/E5/B4 就是为了在 A/B/C 之间拍板。

## 3. 实验矩阵

### 3.1 结构实验（keyless；可并行；先做）

| # | 问题 | 方法 | 证据 | 判决 |
|---|---|---|---|---|
| **E1** | 每个角色实际有哪些通道？政策里哪些行对它不成立？ | 解析六个 `agent.cordis.yml` 的工具行 + `delegation-model` 的 `COMPOSITIONS` + `delegation-composition.spec` 的静态矩阵；输出“角色 × 通道 × 政策行”表 | 一张 capability 表；每个“政策行 → 角色”是否有工具/权限 | 任何“政策说有、工具面没有”的格子 = G1 铁证；决定 section 注入集合 |
| **E2** | team 段到底按什么信号注入？工具在场 ≠ 有权 | 真挂载/真会话里对比三种座位：root vp-eng（Lead）、named child vp-eng、teammate；记录 `header.parentSession`、`agentTeams.membership()`、`tools.get('spawn_teammate')`、`composedPreset` | 三种座位的四元组真值表 | 选“权限信号优先、工具面兜底”；禁止只用 `tools.get` 判 team |
| **E3** | 政策怎么拆、拆完会不会丢规则/更贵？ | 把当前 `delegation-policy` + `workflow.md` + `eng-teaming` + `assembling-the-team` 逐条映射到 core/spawn/fork/workflow/team/retry；在 `runtime/tmp` 写原型段落并计 code points；模拟每角色注入集合 | 逐条映射表 + 每角色 code points + 丢失清单（应为空） | 无规则丢失、每角色总成本 ≤ 现 skill + 可接受常驻；否则改 B/C |
| **E4** | `delegation-model` 还有没有别的 vendor 误读？ | 写一次性 spec/脚本，直接 import vendor 的 provider capability、`SpawnTeammateRequest` 字段、workflow `SUPPORTED_AGENT_OPTIONS`，与模型字段逐项比 | vendor-parity 差异表 | 除 team context 外若还有差异，并入 Issue 1；零差异则 Issue 1 只改已确认项 |
| **E5** | 真挂载的工具面里，`workflow_runs`/channel 工具到底在不在？ | 起 company profile，CEO/COO/vp-eng/worker 各建会话，读首帧 `request/header.tools`（或 `preset-smoke` 的等价读数） | 四份工具面清单 | `workflow_runs` 出现在无 workflow 角色 = G6 铁证；决定 per-agent 安装 |
| **E6** | `maxDepth` 链到底怎么放行？ | 复用 `delegation-depth-truth-table.spec` + 一段 `resolveChildDepth` 模拟 CEO→vp-eng→worker；对读 CEO 注释、`presets.spec` 文案、政策 §6 | 一条可复现的链 + 三处文本对照 | CEO 注释/测试文案红；政策 §6 绿；Issue 1 事实修正清单确定 |

**成本**：E1/E4/E6 纯静态（<1h）；E2/E5 要 boot 真 profile（各 10–20min）；E3 人工映射（2–3h）。全部 keyless，不进 `pnpm test`。

### 3.2 行为实验（真模型；有预算；只打会改变卡措辞的假设）

| # | 假设 | 方法 | 证据 | 判决 |
|---|---|---|---|---|
| **B1** | 共享政策会让无 workflow 的角色尝试 workflow/retry | COO 或 CMO 会话，给 ≥3 同构任务（如 4 份供应商条款核对 / 4 个细分市场），**不点名通道**；记录 `tool/call` 序列与 tool-not-found | 调用序列 + 失败/恢复行为 | 出现 workflow/retry 失败 = G1 行为确认；没有 = G1 仍是静态合同 GAP，但卡里不写“模型会误调” |
| **B2** | CEO 团队实际用 fresh，任务书承载上下文 | CEO 一场 2 成员动议；记录 `spawn_teammate` 的 `context` 参数、成员首轮读了什么、是否知道任务书路径 | 参数 + 成员首轮工具调用 | 默认 fresh 且任务书够用 = G3 只改文档/模型；成员缺上下文 = 需要 fork/更强任务书指引 |
| **B3** | 模型会在长任务里自开 goal | 一个多步长任务（不出现“goal”字样），观察 `create_goal` 与后续轮次 | 工具调用 + 是否自动续轮 | 自开 = G8 治理风险实测；不开 = 风险是潜在的，卡里不夸大 |
| **B4** | A 方案的注入不会改变/恶化通道选择 | 同一 VP-Eng ≥3 同构任务，分别跑“现共享 skill”与“A 原型 section”（临时 profile/patch，不落生产）；比较 `tool/call` | 两场的通道选择与规则遵守 | A 不差于现状 → 选 A；A 明显更差 → 回 C/B |
| **B5** | 其他角色是否真有 workflow 需求 | 与 B1 同一场；看模型是尝试 workflow、退回 subagent，还是把活路由给 `vp_eng` | 调用序列 + 理由 | 有需求 = G7 需要产品拍板；无 = 政策改成“路由给 vp-eng”即可 |

**预算/停止条件**：

- 最多 **6 场**真模型会话（B1 1–2、B2 1、B3 1、B4 2）；每场 ≤15min、≤30 次工具调用；总墙钟 ≤2h。
- 用 `runtime/rehearsal-workspace/`，不写真公司盘；会话 ID 与 tool/call 摘要留 `runtime/tmp/`。
- 任一场出现凭证/装配失败 → 停，不把 keyless 结论外推成行为结论；卡里标“行为未证”。
- 单场通过只记“单次观察”，不写“模型总会/不会”；要稳定性另开多次预算。

## 4. 出卡信心门

### Issue 1 · `delegation-contract-truth`（事实/合同纠偏）

**必须有的证据**：E4 vendor-parity 差异表 + E6 深度链 + E2 的座位真值表（team 上下文部分）+ 现有 docs/tests 对照。
**卡里写死**：改哪些字段/文案、为什么、验收（vendor-parity spec 红→绿、`pnpm test`/`verify`、无行为变更）。
**不写**：任何“也许模型会…”；事实错误不需要行为证据。

### Issue 2 · `delegation-policy-capability-scoped`（能力域化）

**必须有的证据**：E1 capability 表 + E2 权限信号 + E3 拆分原型/无丢失 + E5 真挂载工具面；B1/B4 至少一条行为证据（有则更好，无则卡里标“行为层未证，验收含真模型探针”）。
**卡里写死**：A 方案（或实验后的 B/C）、注入信号、每段载体、`workflow_runs` 作用域、验收（静态 parity + 真挂载 + 一条行为探针 + 无规则丢失）。
**不写**：G7/G8 的产品决定；它们另出决策卡。

### Issue 3（可选）· 产品决策卡

只在 B1/B3/B5 有结果后出；形态 = `等人拍板` 或 `推敲中` 的决策卡，不冒充“做”的执行卡。要写清推荐项与代价，不替用户拍。

## 5. 产出与顺序

1. **本计划**（本文件）→ 用户确认预算/范围。
2. **E1–E6 结构实验** → `2026-11-11-experiment-results.md`（表 + 结论 + 反证）。
3. **B1–B5 行为实验**（按需/按预算）→ 同一结果文件的行为节。
4. **目标形状决定** → 结果文件 §target；A/B/C 的取舍与输掉的方案。
5. **两张 issue 卡**（Issue 1 先、Issue 2 后；Issue 2 可引用 Issue 1 的修正）：
   - `_backlog/issues/<date>-delegation-contract-truth.md`
   - `_backlog/issues/<date>-delegation-policy-capability-scoped.md`
6. 更新研究题名页的「产出的卡」与 `_backlog/issues/README.md` 活跃清单；研究题在两张卡有结论后翻 `已定性`。

## 6. 需要用户拍板 / 确认

1. **行为实验预算**：6 场、≤2h、 rehearsals 不写公司盘——可以吗？还是只做结构实验、行为层留到 issue 验收？
2. **G7/G8 是否本轮处理**：我把它们当“产品决策”，不在 Issue 1/2 里夹带；你要现在就拍“workflow/质量环是角色能力还是公司能力”“公司角色是否允许 goal 自动续跑”，还是等行为结果？
3. **出卡后的授权**：卡是 `推敲中`（结论=做，等授权）还是你希望直接 `待落地`（你点名实施）？按仓规，卡本身不是实施授权。
