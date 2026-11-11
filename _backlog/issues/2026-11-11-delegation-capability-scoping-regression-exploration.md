---
status: 待落地
opened: 2026-11-11
---

# 推敲：委派能力域化后的回归 + 探索性验证（最近两次改动）

> 立卡：2026-11-11 ｜ 状态：待落地 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 本卡执行（测试/探索）；发现缺陷另开 `_backlog/bugs/` 卡，本卡不改产品代码。

**问题与期望结果：** 最近两次改动（`9b8b30f4` 委派合同能力域化 + `6a1bc54f` 研究题归档）之后，旧的探索证据只覆盖改前的委派面。本轮要回答两个问题：① **regression 有吗**——`workflow_runs` 收成 per-agent、policy header/section 注入、`teamLeadWhenRoot`/`CHANNELS.control` 改名、core skill/`eng-teaming` 缩编、host 全局工具面 4→3，是否把旧行为改坏？② **新东西靠谱吗**——模型是否真的按 capability header 选通道、是否不再误调不存在的 workflow/retry、CMO/COO 的 no-poll 是否稳定、support root 拿到 team section 会不会越权组队、workflow 分支/teammate/冷恢复是否都拿到正确的 section/tool？目标不是“跑绿一张矩阵”，而是保留独立 oracle、来源坐标、可复判证据与停止边界；找真缺陷就开 `_backlog/bugs/` 卡，不把“没找到”写成“没有 bug”。

**当前情况（2026-11-11 落地后）：**

- 两张卡已落地归档：[委派合同事实纠偏](../_archive/settled_issues/2026-11-11-delegation-contract-truth.md) → [Note](../../notes/implemented/2026-11-11-delegation-contract-truth.md)；[委派政策能力域化](../_archive/settled_issues/2026-11-11-delegation-policy-capability-scoped.md) → [Note](../../notes/implemented/2026-11-11-delegation-policy-capability-scoped.md)。
- 已跑过的绿：`pnpm test` 196 files/1571 tests、`typecheck`/`lint`/`dup`/`verify`、`preset-smoke` 6+5、`product-team-e2e-smoke` ALL PASS（295s）、`vp-eng-workflow-probe` ALL PASS；CMO/COO 各 1 场 pilot（CMO 4×subagent、无 workflow、结束本轮；COO 自己做）。
- 真挂载只覆盖 6 个座位：CEO/COO/vp-eng/worker root、CEO→vp-eng 命名 child、CEO teammate。**没覆盖**：VP-Sales/CFO/CMO/quality-loop/worker-orchestrator root、vp-eng teammate、workflow 分支、冷恢复/重启、quality-loop 命名 child、worker-orchestrator 子代。
- 研究题已归档：[dsh-native-orchestration-fit](../_archive/research/dsh-native-orchestration-fit/README.md)；GAP 登记与实验证据在题内。
- 旧探索轮（第四–九轮）的 036–060 已修/归档；本卡不重跑旧矩阵，只把“改后是否复发”当回归。

**未决问题：**

- **行为稳定性**：CMO no-poll 只 1 场；不知道是 policy 生效还是单次偶然。COO 只 1 场。
- **生命周期**：`workflow_runs` per-agent 安装依赖 `agent/created` + `agent.ctx.inject(['tools'])`；tools 服务 re-provide / 冷恢复后会不会掉？`registerDelegationContracts` 的 WeakSet 同理。
- **座位覆盖**：workflow 分支、vp-eng teammate、quality-loop root/child、worker-orchestrator 子代、VP-Sales/CFO/CMO root 的 header/section/tool 面未真挂载。
- **support root**：worker/quality-loop root 是 Lead，会拿到 team section；persona 说“不组队”。模型会按哪个走？这是产品/UX 决定，不是本卡能拍。
- **token/上下文**：header + 五段 section 是常驻；vp-eng 多 ~2k code points。是否挤压 compaction/上下文、是否值得，未测。
- **release 形状**：dev link 跑通 ≠ tarball 安装跑通；新 content 段/host 模块是否真进包、clean profile 是否挂上。
- **规则丢失**：core skill/`eng-teaming` 缩编后，角色 skill 里是否还有旧通道细节/与新 section 冲突；需要静态逐条对。
- **G7/G8**：workflow/质量环是否扩到其他角色、goal 治理仍是产品决策，不在本卡。

**下一步：** 先做 A 批（0 模型，可自主）→ 结果回填本卡 §A；B 批 live 需用户明确批准入口/预算/权限/证据落点后再跑；发现真缺陷先开 `_backlog/bugs/` 卡，再继续下一 charter；不改产品代码。

## A 批 · 回归（0 模型 / 真挂载，可自主）

### A1 门禁与既有资产

| 检查 | oracle | 现状 |
|---|---|---|
| `pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm dup` | 全绿；失败即 regression | 落地时已绿；本卡复核 |
| `preset-smoke` | 6 角色 + 5 support 真挂载 | 落地时 ALL PASS |
| `product-team-e2e-smoke` | CEO 两件套 team + 任务板/DAG | 落地时 ALL PASS（295s） |
| `vp-eng-workflow-probe` | N≥3 同构取证用 workflow | 落地时 ALL PASS |
| `delegation-smoke` | CEO/vp_eng 工具行与 child 组合 | 未跑（本卡补） |
| `release-smoke` / tarball 安装 | clean profile 装包后 presets/内容/host 模块可用 | 未跑（本卡补） |

### A2 11 preset × 4 入口真挂载矩阵

**入口**：root（11 个 preset）；命名 child（CEO→vp_eng、CEO→subagent_research、vp-eng→vp_cmo、vp-eng→quality_loop_produce/verify、vp-eng→generic worker、worker-orchestrator→worker）；teammate（CEO team、vp-eng team）；workflow 分支（vp-eng）。

**每格记录**：`request/header.tools`、`system/message` 的 header 文本 / `company:delegation-<channel>` section 标记 / `company:workflow-contract`、`workflow_runs`、`spawn_teammate`、`wait_agent`、`subagent_retry`、`workflow`、`subagent`、`subagent_fork`、control。**oracle** = `delegation-capabilities` 表 + Lead 权限（`agentTeams.membership`/`parentSession`）+ 有 workflow 工具才装 `workflow_runs`；期望表在卡内先写死，再跑。

**重点格子**（未覆盖）：

- VP-Sales / CFO / CMO root：header = spawn/fork/team/retry；无 workflow section；无 `workflow_runs`。
- quality-loop-producer / verifier root：header = team only（Lead）；team section 有；无 spawn/fork/workflow/retry；无 `workflow_runs`。
- worker-orchestrator root：header = spawn/team；无 fork/workflow/retry；`workflow_runs` false。
- vp-eng teammate：header = spawn/fork/workflow/retry；team section false；`workflow_runs` true；工具面仍有 `spawn_teammate`（Lead-only 执行）。
- workflow 分支：与 vp-eng child 同面；`workflow_runs` true；分支内是否能看到/调用 `workflow_runs`。
- quality-loop 命名 child：preset 正确、无 team、无 `workflow_runs`。
- worker-orchestrator 子代：leaf 无委派面、无 `workflow_runs`。

### A3 生命周期 / 冷恢复

- 宿主重启后 resume 一个 vp-eng root / CEO team member / 命名 child：header + sections 是否重新注入、是否重复、`workflow_runs` 是否重新安装/仍可调用；section 顺序是否稳定。
- 工具服务 re-provide（若 keyless 可注入）：`workflow_runs` 的 per-agent 安装是否重装；`registerDelegationContracts` 是否重注入。**红判据**：一次 re-provide 后工具消失/重复。
- 内容段缺失 fail-safe：临时移走一段 → 整组不注入 + warn，不注入半套（已有 spec，真挂载复核）。
- `workflow_runs` 输出：vp-eng root 跑一次前台/后台 workflow 后，`workflow_runs` 的 completed/cancelled/lost + children 与实际 run 对得上；分支内嵌套 run 的记录归属。

### A4 静态债 / 规则丢失

- 逐条对：`delegation-policy` core + 五段 section + `eng-teaming` + `workflow.md`，确认没有规则只存在于被删的旧句里；`eng-teaming` 的引擎事实只剩指向 `company:workflow-contract`。
- 全仓 `rg`：`teamLead`（应只剩测试标题/注释）、`CHANNELS.*.control`（应无）、`workflow_runs` 的非 vp-eng 角色引用、`subagent_retry` 在无 retry 角色的散文、CEO/COO/CFO/CMO/VP-Sales 的 workflow 散文。
- docs/role skills 与 header 的通道集合一致；`docs/contracts/delegation.md`/`presets.md`/`architecture.md`/`terminology.md` 不再说“fork 默认下发会议上下文”。
- 新 content 段是否进 pack files（`content/**`）、release tarball 是否包含；`content-single-home`/`content-manifest` 无新漏。

### A5 token / prompt 预算

- 每个座位记录 `system/message` 字节数、header/section 段数、`request/header.tools` 数量；对比改前旧会话（B2/E5/E5B 日志）或至少给出现值。
- 判据：vp-eng 增量 ≤ 约 2.5k code points；无重复 section；无 pruner/compaction 触发异常；CEO/COO 不因 header 过长挤掉关键合同。

## B 批 · 探索（live，待用户授权）

> **授权门**：入口、charter、轮数/墙钟/child/输出预算、权限模式与证据落点需用户明确批准；未批准不启动。A 批结果和本卡定性不等于 live 授权。

| ID | charter | 形状 | oracle | 样本 |
|---|---|---|---|---|
| B1 | CMO ≥3 同构 | 4 个细分市场；不点名通道 | 不调 `workflow`/不报 tool-not-found；派发后不 `bash sleep`/不 `wait_agent`；结束本轮；完成通知续轮；产物可聚合 | 2 场 |
| B2 | COO ≥3 同构 | 4 份合同；不点名通道 | 不调 `workflow`；自己做或 subagent；无空转；结论可复判 | 1–2 场 |
| B3 | VP-Eng workflow | 4 分支 + 1 次失败/null + 1 次后台 | `workflow` 调用；分支叶子；`workflow_runs` 对账；null/missing 不吞；不轮询 | 1–2 场 |
| B4 | team/authority | CEO 两件套（已有 smoke）；teammate 调 `spawn_teammate` 负例；support root 组队观察 | Lead-only 拒绝；support root 是否越权；fresh/fork 上下文 | 1–2 场 |
| B5 | 冷恢复 | 重启后 resume vp-eng/CMO/team member | sections/tools 不丢不重；`workflow_runs` 仍可用；模型继续 | 1 场 |
| B6 | 规则遵守 | 与 B1–B3 同场观察 | 模型是否读 header、是否避开未列通道、是否加载 core skill、是否把 `wait_agent` 用在 team 以外 | 随场 |

**预算（建议，待批）**：全局 90–120 分钟；parent prompt ≤12；child activation ≤24；workflow run ≤2（每 run ≤6 agents/8 items/4 并发）；单 turn ≤300s；合成证据 ≤8MiB；超限停新 charter，保留现有证据。

**停止/处置**：真缺陷 → `_backlog/bugs/` 卡（含红绿/复现），继续下一 charter；静态漂移/文案矛盾 → 观察并指明 owner；不改代码；不把单场结论写成“稳定”。

## Round 1（2026-11-11）结果

**已跑绿**

- A1：`pnpm verify` / `pnpm test`（196 files/1571 tests）/ `typecheck` / `lint` / `dup` / `preset-smoke` 6+5 / `delegation-smoke --delegate`（child 75 tools，Team 工具不在场）/ `release-smoke`（tarball 真安装 + 11 preset 挂载）/ `product-team-e2e-smoke` / `vp-eng-workflow-probe` 全绿。
- A2：CEO/COO/vp-eng/worker root；VP-Sales/CFO/CMO/quality-loop-producer/quality-loop-verifier/worker-orchestrator root；vp-eng teammate；workflow 分支；CEO→vp-eng 命名 child；cold resume（vp-eng/CEO/COO）——header/section/`workflow_runs` 与期望表一致，**除 BUG-071/072 的文案/权限面**。
- A5：model-visible `systemText` bytes（旧→新）：CEO 15.7k→18.6k、COO 13.7k→18.0k、vp-eng 18.1k→23.4k、worker 6.8k→8.7k；vp-eng +5.2KB（含中文，不等于 code points）。成本观察，未见 pruner/compaction 异常。
- B1：CMO 两场（after no-poll）均 4×`subagent`、0 `workflow`、派发后结束本轮、无 `wait_agent`；bash 8/11 次主要在派发前/落盘，未见派发后轮询。
- B2：COO 四合同，自己做，0 `workflow`、0 `subagent`。
- B3：VP-Eng workflow probe ALL PASS；workflow 分支 header/workflow section/`workflow_runs` 在场；Lead 实调 `workflow_runs`。
- B4：teammate 调 `spawn_teammate` → `TEAM_LEAD_REQUIRED`（Lead-only 生效）；support root 可实际组队 = [BUG-072](../bugs/BUG-072-support-root-can-spawn-team.md)。
- B5/B6：cold resume vp-eng/CEO/COO 后 header/section/`workflow_runs` 仍在；CMO/COO 未误调缺失 workflow。

**Round 1 缺陷卡**

| BUG | 一句话 | 证据 |
|---|---|---|
| [BUG-071](../bugs/BUG-071-capability-header-not-installed-wording.md) | header 对 teammate 说“未列通道未安装”，但 `spawn_teammate` 在工具面（Lead-only） | E5C teammate `session ba1f1e99-...`；header “Available channels: spawn” + tools 含 `spawn_teammate` |
| [BUG-072](../bugs/BUG-072-support-root-can-spawn-team.md) | support preset root 仍有 `spawn_teammate` 且能实际组队；“不组队”只是文案 | worker root `session-19bae5e2-...` calls `["spawn_teammate"]`；quality-loop roots 同工具面 |
| [BUG-073](../bugs/BUG-073-readme-one-shot-child-team-tools-stale.md) | README 仍写 one-shot child 可见 Team 工具；0.2.1 守卫/实测已不在场 | `delegation-smoke --delegate` [3] child 75 tools、Team 不在场；README:158 vs delegation.md:92 |
| [BUG-074](../bugs/BUG-074-per-agent-inject-not-reinstalled-on-service-change.md) | per-agent 注入 WeakSet 短路；Cordis `inject` service change re-run 后 section/tool 可能不重装 | `registry.ts:168`-`180` 合同 + `delegation-contracts.ts`/`workflow-runs.ts` 代码；真 re-provide 复现待补 |
| [BUG-075](../bugs/BUG-075-eng-teaming-schema-rule-duplicated.md) | `eng-teaming` 声明 schema 事实不在本 skill，五档表仍复述“分支不传 schema” | `eng-teaming:16` vs `:38` |

**未跑/未证（保留）**

- BUG-074 的真实 service re-provide 复现（需要 live recomposition；fake 形状不能单独当 red）。
- A2 的 `quality_loop_produce` / `quality_loop_verify` / generic worker named child 座位；cold resume 的 named child/teammate。
- release tarball 的 **seat section**（release-smoke 只证安装/挂载，未读 `system/message`）。
- B1 的更多 CMO 样本（当前 2 场）；B4 support root 的修复方向（产品决定）。
- A5 的 code points 精确折算与 compaction 挤压；当前只记 bytes。

## 范围与排除项

**范围**：上述 A1–A5、B1–B6；最近两次改动涉及的 host/policy/section/workflow_runs/role skill/docs；测试资产可复用（优先用 `tools/lib/surface-matrix.mjs`、`session-evidence`、现有 probes），不足再补小探针。

**排除**：重跑第四–九轮旧矩阵；修产品代码（本卡只取证）；G7/G8 产品决策；把 support root 是否隐藏直接改掉；发布声明；旧 pin 的机制争议。

## 已知与未决

- **已知**：落地时 `test/typecheck/lint/dup/verify/preset-smoke/product-team-e2e-smoke/vp-eng-workflow-probe` 全绿；6 座位真挂载符合预期；CMO/COO 各 1 场 pilot 符合（CMO 4 subagent、无 workflow、结束本轮；COO 自己做）。
- **未决**：A2/A3/A5 的未覆盖座位/生命周期/token；B1–B6 的行为稳定性；support root 的产品处理；release 形状。
- **不证**：A 批不证模型行为；B 批单场不证稳定性；`workflow_runs` 的 per-agent 安装不证所有服务重载路径。

## 方案与取舍

- **先 A 后 B**：A 便宜、可复判，先把“声明/运行时/生命周期”回归扫掉；B 只打 A 不能回答的行为假设。
- **矩阵优先于随机探索**：11×4 座位是真挂载可判的；行为只挑 B1–B6 会改变结论的假设，不做无限采样。
- **不做“再跑一轮旧矩阵”**：旧轮证据只当历史；复发按新证据记回归。
- **不改代码**：本卡只取证；真缺陷另开 bug 卡，修复另按授权。

## 验收标准

1. **A1–A5** 全跑，或逐项写明「未跑 + 原因」；11 preset × 4 入口矩阵每格有期望 vs 实测；冷恢复/re-provide 有 session/证据。
2. **B1–B6** 在用户授权预算内跑完，或逐项写明未跑原因；每场有 session id、tool/call、turn 边界与 oracle 对照。
3. 所有 finding 已分诊：真缺陷 → `_backlog/bugs/` 卡（含复现/红绿/影响面）；静态漂移/文案 → 观察并指明 owner；不写「没有 bug」。
4. 证据落点（`runtime/`/卡/研究材料）可复读；`pnpm verify` + `pnpm test` 绿；本卡不改产品代码。
5. 收口时更新本卡（结果/未覆盖面）与 `_backlog/issues/README.md`；审查记录写 `审查：agent｜用户｜跳过 — 理由` 后归档。

## 关闭条件

- A1–A5 全跑或逐项写明“未跑 + 原因”；矩阵每个格子有期望 vs 实测；生命周期/冷恢复有证据。
- B1–B6 在授权预算内跑完，或逐项写明未跑原因；所有 finding 已分诊（bug 卡/观察/owner）。
- 不写“没有 bug”；未覆盖面保留并标 owner。
- 证据落点、session id、命令与红/绿形态留卡或研究/Note；审查记录写 `审查：agent｜用户｜跳过 — 理由` 后归档。
