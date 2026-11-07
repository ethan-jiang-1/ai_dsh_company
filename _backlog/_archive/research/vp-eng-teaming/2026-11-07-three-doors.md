---
topic: VP-Eng 组队的三种门——根门、命名 child、CEO teammate 的能力差
intent: 用源码事实与一次 keyless 实测，定清 VP-Eng 能在哪里组队、组出来的是谁、跨角色依赖走哪条通道；服务 B1/B2 的卡边界与证据计划
---

# VP-Eng 组队：机制事实与三种门

> **一句话**：VP-Eng 组队不是“把 CMO/SA/SQA 拉进一个 team”，而是“根门带研发小队 + 命名委托请专家”。前者靠 `spawn_teammate`，后者靠 `agentPreset`；两条通道的人格来源不同，不能混。

## 1. 机制事实（先钉死，后面所有设计都从这来）

| # | 事实 | 证据 |
|---|---|---|
| 1 | **每个根会话本来就是 Team Lead** | [roster.ts](../../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts) `tryMembership`：没有 `parentSession` 的 root 直接返回 `{ role: 'lead', name: 'lead' }` |
| 2 | **teammate 继承 Lead 的 preset** | [child-agent.ts](../../../../vendor/dsh/packages/subagent/subagent/src/child-agent.ts) `childSessionMeta`：`selectedPreset ?? parent.composedPreset`；`spawn_teammate` 不传 `selectedPreset` |
| 3 | **命名 child 才由 `agentPreset` 给真人格** | [ceo preset](../../../../packages/company-pack/presets/ceo/agent.cordis.yml) 的 `vp_eng` / `system_architect` / `system_qa` 行；[vp-eng preset](../../../../packages/company-pack/presets/vp-eng/agent.cordis.yml) 的 `system_architect` / `system_qa` 行 |
| 4 | **`spawn_teammate` 只有 Lead 能调** | [tool-agent-team](../../../../vendor/dsh/packages/experimental/tool-agent-team/src/index.ts) 的 schema 明写 “Only the Team Lead”；[roster.ts](../../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts) `spawnAdmitted` 抛 `TEAM_LEAD_REQUIRED` |
| 5 | **team 没有 per-member preset** | `spawn_teammate` 参数只有 `name/description/prompt/context`；`freshProvider` 是全团队一个 provider，provider 本身不带 preset 默认值 |
| 6 | **命名 child 不是 team member** | [roster.ts](../../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts)：有 `subagentDescriptor` 的 child 返回 `undefined`，不装团队工具 |

## 2. 一次 keyless 实测（不是真模型）

新建 `agentPreset: 'vp-eng'` 的根会话，查 `session/projections`：

```
agentTeam = {"members":[{"name":"lead","role":"lead","phase":"active"}],"tasks":[]}
```

⇒ VP-Eng 根会话确实是 Lead；`spawn_teammate` 在它的工具面里是**可执行的**（不是死行）。这次没有跑真模型，所以“能 spawn 成功”仍由 B2 的真跑证据补。

## 3. 三种门，三种能力

| 门 | 是不是 team member | 能 `spawn_teammate`？ | 能请 CMO？ | 能请 SA/SQA？ | 适合 |
|---|---|---|---|---|---|
| **VP-Eng 根会话**（人选 `vp-eng` 开门） | 是，role = lead | ✅ | ✅ 加 `vp_cmo` 行后，child depth 1 | ✅ child depth 1 | 完整研发包：MRD/PRD/SyRS/IRS/TC |
| **CEO 命名 `vp_eng` child**（activation） | 否（descriptor） | ❌ 没有 team 工具 | ✅ 若 vp-eng preset 有 `vp_cmo`（maxDepth 2，child depth 2） | ✅ maxDepth 2 | 单件交付/深挖；可拉专家，但不能带持久 team |
| **CEO teammate `vp-eng`** | 是，role = teammate | ❌ 工具在，执行被 Lead-only 拒绝 | ❌ 继承 CEO 的 `vp_cmo` 是 `maxDepth: 1`，child 落 depth 2 被挡 | ✅ maxDepth 2 | 现有 SA/SQA 路径；不适合完整跨角色包 |

**这张表的用法**：用户要“VP-Eng 组队出整包”，就开 VP-Eng 根门；用户要“CEO 动议里让 VP-Eng 干一件”，用命名 `vp_eng`；用户要“CEO 团队里 VP-Eng 兼着做”，就接受它不能 spawn、也够不到 CMO 的限制。**不要用一个门去承诺另一个门的能力。**

## 4. 为什么 teammate 不能冒充 CMO/SA/SQA

- teammate 的人格/工具面是 VP-Eng 的；它没有 CMO 的 market 判断材料、没有 SA 的架构 skill、没有 SQA 的 V&V 独立性。
- 用 teammate 起一个叫 `cmo` 的成员，只是“VP-Eng 组合的成员在演 CMO”——这正是 `researcher` preset 当初要解决的“迷你 CEO”问题（[presets.md](../../../../docs/presets.md)）。
- SQA 尤其不能：独立结论要求独立 preset/独立上下文；teammate 共享 Lead 组合，SQA 的“不通过”会变成 VP-Eng 自说自话。
- CMO 尤其不能：MRD 的 owner 唯一性会被破坏；`MRD 只归 CMO` 是手册硬条款。

**推论**：VP-Eng 的 team 适合“工程手”（并行拆 PRD/细节、写 slice、做一致性检查、跑研究）；CMO/SA/SQA 的产出走命名委托，各署各的名。

## 5. 旧文案/测试要修（不改就会骗模型）

| 位置 | 现在说的 | 实际 | 处置 |
|---|---|---|---|
| [docs/delegation.md](../../../../docs/delegation.md) §2 | “职能根会话不是团队成员，团队版不会装” | 根会话是 Lead，团队版会装；全局控制行是给**命名 child**（非 team member）用的 | 保留控制行，改理由；补“根门=Lead”的事实 |
| [content/AGENTS.md](../../../../packages/company-pack/content/AGENTS.md) “组合继承” | “teammate / 命名委托 child 都继承 Lead 组合” | teammate 继承；命名 child 由 `agentPreset` 给 | 分通道表述；命名 child 的方法 skill 能加载 |
| [CultivationBoard.tsx](../../../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx) | “CEO 委派出去的分身继承 CEO 组合——职能方法不会进 child” | 对 teammate 成立；对命名 child 不成立 | 改文案 + 对应 client test |
| [presets.spec](../../../../tests/presets/presets.spec.ts) 的控制面注释 | 用“根会话不是团队成员”解释为什么职能 preset 要放全局控制行 | 真实原因是命名 child 不是 team member | 改注释/断言说明，行本身保留 |
| [product-team-e2e-smoke](../../../../checks/smoke/product-team-e2e-smoke.mjs) | CEO 两件套必须走 team，不许 `vp_cmo`/`vp_eng` 捷径 | 这是 CEO 路径的守卫，不能因为 VP-Eng 组队而放宽 | B2 必须复跑，证明没破坏 |

## 6. B1/B2 的设计

### 6.1 preset 行

- `vp-eng` 的 `delegation` 组加一行 `vp_cmo`：`provider: spawn`、`toolName: vp_cmo`、`maxDepth: 2`、`agentPreset: cmo`。
- 为什么 `maxDepth: 2`：VP-Eng 根门 depth 0，child depth 1；VP-Eng 作为命名 `vp_eng` child 时 depth 1，child depth 2；两个场景都要放行。
- CEO preset 的 `vp_cmo` **不动**（仍 `maxDepth: 1`）：CEO team 里的 VP-Eng teammate 够不到 CMO，这是已知边界；要 CMO 就由 CEO 自己叫，或改走 VP-Eng 根门/命名 child。
- SA/SQA 行已在 vp-eng preset，不动。

### 6.2 新 skill `eng-teaming`（VP-Eng 2 号工作流）

四档决策树：

1. **自己做**：单件、单域、不需要独立人格 → 直接做。
2. **一次性 worker**：并行调研/盘点/测算 → `subagent`（fresh）或 `subagent_fork`（带上下文）；不建 team。
3. **命名专家**：要 CMO/SA/SQA 的真人格/真结论 → `vp_cmo` / `system_architect` / `system_qa`；改稿 = 再委托一次、把上一稿一起给它。
4. **持久小队**：多件产物、多轮、要任务板/依赖图 → `spawn_teammate`；成员是“VP-Eng 带的工程师”，不是 VP-Eng 本人，也不是别的角色。

硬规则：

- 成员**不能**冒充 CMO/SA/SQA；SQA 结论只能由 `system_qa` 出，VP-Eng 只能补证据/改稿/要求复核，不能删。
- **成员不能替 Lead 做跨角色请求**：跨角色请求由 Lead 发起，避免重复/越权（机制上成员继承 vp-eng 的 SA/SQA 行，拦不住，只能靠任务书与 skill）。
- **ID 分配由 Lead 串行做**：开工前读现有 docs/索引，给每个 writer 分配号段，写进任务板；撞号由 checker 红。
- **写域不重叠**：每个任务写自己的 draft；共享文件（prd.md/index）由 Lead 或单一 owner 写。
- **成本**：一个 teammate 就是一次真金白银的模型调用；能自己做/一个 `subagent` 解决的不开 team；团队建议 ≤3–4 人。
- **门自检**：先看自己有没有 `parent`：有 parent = 成员，不能 spawn，升级 Lead；没有 parent = 自己的门，可直接 `ask_user_question`，也可组队。
- **收口**：VP-Eng 写 `drafts/vp-eng-package.md`（包索引：每份产物、owner、状态、未决），不写 `final.md`（成品归 CEO，或用户直接要的工程稿由 VP-Eng `present` 自己的 draft）。

### 6.3 手册/文档

- 手册「星型汇报」从“一切经 CEO”泛化为“一切经 Lead”：CEO 动议的 Lead 是 CEO，VP-Eng 包的 Lead 是 VP-Eng；公司级对外收口仍 CEO。
- 手册「多门模式」补一句：VP-Eng 的门可以带研发小队；成员是 VP-Eng 组合的工程师，角色身份来自任务书，不是 preset。
- `docs/delegation.md` 加“三种门”表；`docs/presets.md` 加 `eng-teaming` 与 `vp_cmo` 行；`docs/guides/product-definition.md` 补“VP-Eng 根门整包”的交接。
- 文档预算：`presets.md`/`delegation.md` 已顶格，**先搬后写**。

### 6.4 证据计划

| 证据 | 手段 | 证明什么 |
|---|---|---|
| 根门 = Lead | keyless：建 `vp-eng` 根会话，查 `agentTeam` 投影 | 不是死行；`spawn_teammate` 在工具面 |
| 真组队 | 真模型：VP-Eng 根门 spawn 1–2 个工程师 + `vp_cmo`/`system_architect`/`system_qa`，产出整包 | 根门能带小队、能拉专家、SQA 结论原样 |
| teammate 人格 | 查 child 会话首帧 `agentPreset` | teammate 是 `vp-eng`（不是 CMO/SA/SQA）；SA/SQA/CMO child 是各自 preset |
| CEO 回归 | `product-team-e2e-smoke` | CEO 两件套仍走 team，没被 VP-Eng 组队带偏 |
| 边界负例 | 文档/任务书 + 源码事实 | VP-Eng 作为 CEO teammate 不能 spawn；够不到 CMO（maxDepth 1） |

## 7. 风险与未决

- **成员越权叫专家**：机制上 teammate 继承 vp-eng 的 `vp_cmo`/SA/SQA 行，能自己叫；只能靠 skill/任务书约束。是否要在 vp-eng preset 里把 SA/SQA 行拿掉、只留根门用？不行——根门也要用；没有 per-member toolFilter。接受为已知限制，写进 skill。
- **SQA 独立性**：根门的 SQA 是命名 child，独立 preset；但如果 VP-Eng 让 teammate 去“预审”SQA 稿，仍可能污染。skill 禁止 teammate 代行 SQA 结论。
- **成本**：整包 = 1 个 Lead + 1–2 工程师 + 3 专家，≈5–6 个模型会话；只在复杂包用。
- **UI**：VP-Eng 根门的任务板/在场页签走 `leadOf(sessionId)`，理论上已支持；B1 要用真页面确认，不改代码。
- **CEO 动议内怎么用**：如果 CEO 的动议需要 VP-Eng 带小队，正确姿势是“多门模式”（用户/CEO 开 VP-Eng 的门，任务书交接），不是把 VP-Eng 塞进 CEO 的 team。这个操作口径要用户拍板。

## 8. 不做

- 不给 team 加 per-member preset（vendor 改动，上游的事）。
- 不把 CMO/SA/SQA 做成 teammate 的“角色皮肤”（破坏 owner 唯一性与 SQA 独立性）。
- 不改 CEO 的 `vp_cmo` maxDepth（除非用户明确要“CEO team 里的 VP-Eng 也能拉 CMO”）。
- 不改 UI 角色徽标/委派卡 key（现有回退够用，另卡再说）。
