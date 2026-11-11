---
status: 已结
opened: 2026-11-11
---

# 推敲：委派政策能力域化——按工具面/权限注入，收掉共享泛化 skill

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：note — [2026-11-11 委派政策能力域化 Note](../../../notes/implemented/2026-11-11-delegation-policy-capability-scoped.md)。
>
> **审查**：agent — 对照授权与验收逐条；team/workflow_runs 红→绿、真挂载 6 座位、CMO/COO/VP-Eng pilot、verify/test/typecheck/lint/dup/preset-smoke 全绿。
>
> **结论（研究）**：做 — 以 A 方案（capability header + 五段 section + core skill）把委派政策按能力面收口。

**问题与期望结果：** 六个公司角色共享同一份 `delegation-policy`，但它列的四条通道/retry 并不都在每个角色的工具面里：CEO 没有 fork/workflow/retry，VP-Sales/COO/CFO/CMO 没有 workflow，命名 child VP 不是 Lead、不能 team；反过来，任何 root（包括 worker/support）都是 Lead、工具面有 `spawn_teammate`，却没有 team 政策。政策还夹带 workflow/retry 引擎事实（`workflow.md` 是声明的引擎事实载体），`workflow_runs` 又是 host 全局注册，CEO/COO/worker 都能看见。期望结果：**政策跟着能力面走**——每个 Agent 只看见自己真有的通道；引擎事实回引擎载体；`workflow_runs` 只在有 workflow 的会话可见；角色方法 skill 只留领域打法。

**当前情况：**

- E1 能力审计：政策行与工具面的不适用面 = CEO fork/workflow/retry；VP-Sales/COO/CFO/CMO workflow；命名 child VP team。见 [实验第一轮 §1](../research/dsh-native-orchestration-fit/2026-11-11-experiment-results.md)。
- E5 真挂载：CEO/COO/worker root 都看得见 `workflow_runs`；worker root 还看得见 `spawn_teammate`/`list_agents`/`send_message`，但它不加载 policy、persona 写“不组队”。见实验 §2.2 / §6。
- E3 拆分原型：A 方案可做到无规则丢失；常驻 section 估算 1.9–2.35k code points（vp-eng ~2k，其他 full ~1.8k，CEO ~1k）。见实验 §3。
- B1：COO 加载 policy 后**没有**误调 workflow，选择自己做；所以本卡不写“模型已坏”，写“合同让模型面对不存在的选项”。B2：CEO 团队实际用 fresh + 任务书。B3：CEO 多轮任务**没有**自开 goal。B5（partial）：CMO 的 4 个细分市场用 4 个 `subagent` 替代缺失的 workflow，并出现 `bash` 轮询等待。见实验 §5。
- Issue 1（事实/合同纠偏）是本卡的前置：team context/`teamLead`/control 标签/`maxDepth` 文案先修正，本卡消费修正后的模型。

**未决问题：** ① support preset 作为 root 是 Lead，且工具面有 team——本卡按“任何 Lead 都注入 team 段”处理（政策跟工具走），但“support preset 是否该出现在 root 选择器”是产品/UX 决定，**不夹带进本卡**；若不隐藏，support root 会拿到 team 政策，与其 persona“不组队”冲突，需另卡/另议。② A 方案常驻成本；验收里设 code points 预算与 pilot，不在立卡时替实现选更小的 A'。③ G7（workflow/质量环是否扩到其他角色）与 G8（goal 治理）不在本卡范围。

**下一步：** 先写 `tests/host/prompt/<delegation-contracts.spec.ts>`（红：当前没有按通道注入；CEO 拿到不存在的通道）→ 实现 `registerDelegationContracts`（复用 `contracts.ts` 的 `agent/created` + 能力探测）→ 拆 `delegation-policy` → `workflow_runs` per-agent → 真挂载 + pilot。

## 范围与排除项

**范围**：

- host：新增/扩展 `packages/company-pack/src/host/prompt/contracts.ts`（或同目录 `delegation-contracts.ts`），在 `src/index.ts` 注册；`workflow-runs.ts` 改 per-agent 安装。
- content：`packages/company-pack/content/contracts/delegation/{spawn,fork,workflow,team,retry}.md`（新）；`presets/_shared/delegation/skills/delegation-policy/SKILL.md` 缩成 core；`content/contracts/workflow.md` 仍是 workflow 引擎事实唯一家。
- preset：仅 persona 里的 skill 指针/`customSkillDirs` 如需调整；不改工具行。
- docs：`docs/contracts/delegation.md`、`docs/contracts/presets.md`、`docs/architecture.md`、`docs/reference/terminology.md` 与政策落点同步；`delegation.md` 的 doc-budget 另算。
- tests：`tests/host/prompt/contracts.spec.ts`（扩展）、`tests/presets/delegation-contract.spec.ts`、`tests/host/delegation/workflow-runs.spec.ts`、真挂载 probe（可扩 `checks/smoke/preset-smoke.mjs` 或新 keyless smoke）。

**排除**：Issue 1 的模型事实修正（前置卡）；G7/G8；给其他角色加 workflow/quality loop；team 成员 preset（上游能力，本仓不改）；support root 是否隐藏（产品/UX，另卡）。

## 已知与未决

- **已知**：team 权限 = `agentTeams.membership(agent)?.role === 'lead'`（fallback `header.parentSession === undefined`），**不能**只用 `tools.get('spawn_teammate')`；任何 root 都是 Lead（E5 worker root）；`workflow_runs` 当前 host 全局（E5）；A 方案的 section 估算与无丢失映射（E3）。
- **未决**：support root 的产品处理；`workflow_runs` per-agent 对 vp-eng 命名 child/teammate 的覆盖（验收要测三种座位）；CMO 的“无 workflow 时怎么批量 subagent 且不轮询”要写进 spawn/fork 段。A 的常驻成本/行为退化由本卡验收 pilot 证，不是研究未决（B4 需要 A 原型才能 A/B，不再单跑）。
- **不证**：模型在 A 方案下一定选对通道；pilot 只证单次不退化，不证稳定性。

## 方案与取舍

- **A（选）**：capability header（一行“本会话可用通道”）+ 五段 section（spawn/fork/workflow/team/retry），按工具/权限注入；core skill 按需保留 brief/effort/链/结果/硬规则；`workflow_runs` 随 workflow 能力安装。理由：原生“策略随工具走/按能力存在性注入”；复用 `workflow.md` 已验证的 host 形状；无 per-preset 复制。
- **A'（退路，不选）**：只给 workflow/team/retry 做 section，spawn/fork 留共享 skill。常驻成本更低，但 G1 的 spawn/fork 半边仍在；只有 A 的 pilot 明显退化时才退。
- **B（输）**：按 preset 生成 policy skill。生成物多、仍可能不被加载，且不解决引擎事实分层。
- **C（输）**：共享 skill + 一行能力头。改动最小，但 G5（引擎事实混政策）与“skill 里仍有无用通道”不解决。

## 验收标准

1. **注入 parity**：每个 section 的出现 ⇔ 对应工具在场（team 还要 Lead 权限）；`capability header` 列出的通道 = 本会话实际可用集合；CEO 不出现 workflow/fork/retry 段，COO 不出现 workflow 段，命名 child VP 不出现 team 段，worker root 出现 team 段（若按 Lead 注入）且 header 明示。
2. **无规则丢失**：逐条对照当前 `delegation-policy` + `eng-teaming` + `assembling-the-team` + `workflow.md`，每条规则有唯一目标载体；共享 skill 缩后不再含 workflow/retry 引擎细节；code points 记录（section 总预算 ≤ 2.5k/角色，超出要说明）。
3. **`workflow_runs` 作用域**：CEO/COO/worker root 工具面不再有 `workflow_runs`；vp-eng root、vp-eng 命名 child、vp-eng teammate、workflow 分支有；无 workflow 的 child 没有。
4. **真挂载证据**：CEO/COO/vp-eng/worker root + vp-eng 命名 child/teammate 的 `request/header.tools` 与 `system/message` section 标记逐座位对照；不是只看 YAML/dump。
5. **行为 pilot**：VP-Eng ≥3 同构任务 + COO ≥3 同构任务 + CMO ≥3 同构任务各一场（rehearsal，≤15min/场）；通道选择不差于现状（B1 基线 = COO 自己做；B5 基线 = CMO 4 个 subagent + 轮询），不出现“调不存在的通道”；CMO 场要验证“批量 subagent + 完成通知，不轮询”的新段；单次观察，不写稳定性。
6. **门禁**：`pnpm test`（targeted + 全量）、`pnpm typecheck`、`pnpm verify` 绿；新增 red 配方：删一个“有工具却没 section”的注入 → spec 红；给无 workflow 的角色强塞 workflow 段 → spec 红；`workflow_runs` 改回全局 → 作用域 spec 红。
7. **依赖**：Issue 1 的 vendor-parity/team context/`teamLead` 修正先落地；本卡不重复改模型事实。

## 关闭条件

- 上述验收全过；pilot 结果与 session id 留卡；审查记录写 `审查：agent｜用户｜跳过 — 理由`；卡顶补 `> **结论/去向**：implementation — <落点>`，同次归档。
- 若 pilot 显示 A 明显退化 → 不硬推；按 A' 改形并在卡里记录输掉的 A，重新走验收。

## 抽象度

- 换公司要改吗？→ 不会。能力域/注入逻辑与公司无关；公司特定内容仍在角色 skill/KB。
- 换产品类型要改吗？→ 不会。
- 换做法要改吗？→ 会。若上游给原生“按工具注入 policy/团队 preset”，应退役本仓注入；触发条件写进卡与 Note。
- 只有机制本身变才改吗？→ 是；这是 DSH 组合/合同机制，不是某个角色文案。
- 第二消费者（或单例例外）：六个公司角色 + support root + 命名 child/team 继承子代；docs/测试同源消费。
- 搬家成本：中；新增 content 段 + host 注入 + 测试，但一处事实一个家，后续升 pin 只改引擎段。
