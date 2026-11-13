---
status: 已结
opened: 2026-11-08
---

# 推敲：用探索性测试系统寻找委派面（workflow + subagent + worker family）缺陷

> 立卡：2026-11-08 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 收口证据见 §9–§9.11 与各 Note，未跑面已列
>
> **结论/去向**：note — 八轮探索 + 资产先行（A/B）；BUG-045–060 全部修复归档；决策记忆 = [探索测试的资产策略](../../../notes/implemented/2026-11-10-exploration-asset-strategy.md)；研究材料随题归档（[题名页](../research/workflow-subagent-exploration/README.md)）。
>
> 用户 2026-11-09 晚答复：**继续探索**（此前「是否扩面」的 🔒 已解除）；本卡回 `推敲中`，
> 修复后验证轮已执行，见下方「修复后验证」。
>
> 用户 2026-11-10 晚：**先研究测试资产/探针，调整本卡，再继续探索**；本卡据此改为「资产先行」，
> A 批（无模型）可做，B 批 live 仍按授权门等批准。
>
> 上游研究题：[workflow + subagent 探索题](../research/workflow-subagent-exploration/README.md)。
> 重构前的完整 briefing、场景矩阵与前三轮结果 = [2026-11-08 计划](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)；
> **重构后第四轮计划 = [2026-11-09 计划](../research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md)**；
> **资产审计与第九轮设计 = [2026-11-10 资产计划](../research/workflow-subagent-exploration/2026-11-10-asset-first-round.md)**。
> 本卡只保留问题、当前事实、轮次摘要与交接；机制长文、fixtures、逐条运行表住研究材料。
> **读法**：当前计划 = §9「第九轮（资产先行）」；第八轮结果 = §8；§4–7 是历史，不重跑。
> **授权门**：真模型探索需用户明确批准入口、charter、轮数/墙钟/child/输出预算、权限模式与证据落点；
> 未批准不启动。计划 review、issue 定性、目录状态、handoff、基线检查都不等于真模型授权。

**问题与期望结果：** 2026-11-10 的四组改动（`business-software` 产品类型 + 动议级类型 + CEO 五汇报线/team 角色包 +
SA/SQA 方法包）落地后，旧探索证据（第四–七轮）只覆盖 2026-11-09 的委派面；本轮要回答的是**新面与旧面的交界**：
产品类型路由会不会误判/误红？五条命名行会不会挂不上 / UI 不渲染 / 深度错？team 角色包能不能让成员真读到角色
skill？质量环 starter 能不能被 VP-Eng 真加载？旧 worker/retry/workflow/depth/合同有没有被改坏？

目标是用一轮 guided exploratory testing 主动找真实、可复现的副作用，保留独立 oracle、来源坐标、可复判证据与
停止边界；不是把一张新矩阵跑绿，也不是宣称找尽所有 bug。**本轮推敲完成 = 入口、charters、oracle、证据形式、
预算与停止办法写清，且真模型范围/成本按用户 2026-11-10 的授权执行。**

并回答资产问题：**继续探索前该先补哪些测试资产/探针**，才能把「声明↔运行时」「生命周期终态」「UI 证据」
这三类盲区变成可复判的机器证据；目标不是资产越多越好，是让下一轮少花在取证、假阳性和重复读取上。

**当前情况（2026-11-10 后）：**

- **11 个 preset**：6 角色 + 5 support（`worker` / `worker-researcher` / `worker-orchestrator` +
  `quality-loop-producer` / `quality-loop-verifier`）；清单唯一源 =
  [`delegation-model.mjs`](../../../tools/lib/delegation-model.mjs)。`worker` 是 leaf；`worker-orchestrator`
  只多一条 `subagent` 行（钉 `worker`，`maxDepth: 3`）；`worker-researcher` 只读、named-only。
- **CEO 五条角色命名行**：`vp_eng` / `vp_sales` / `vp_cmo` / `coo` / `cfo`，全部 `maxDepth: 1`；另有
  `subagent_research`；CEO 没有 generic `subagent` / workflow / 控制行。UI key =
  [`delegation-keys.ts`](../../../packages/company-pack/src/client/wiring/delegation-keys.ts) 五条；
  `delegation-smoke` 的可见工具清单已加 `coo`/`cfo`（只证挂载，未证真激活）。
- **产品类型**：`business-software`（`MRD → StRS → PRD`）替代 `b2b-saas`；`hardware-software` 保持
  `MRD/StRS/PRD` + 可选 SyRS/IRS/V&V；`meta.md` 有 `产品类型`，`/req check` 按「动议 meta >
  `company.md`」解析，未知类型报错、模板占位 `<...>` 回落；`project-services` 第三类**未实现**。
- **SA/SQA 方法包**：`content/methods/quality-loop-{producer,verifier}/{system-architecture,vv-plan}/SKILL.md`
  四份；`pnpm methods:init` 复制到 `<DSH_HOME>/company/methods/`（已存在跳过）；VP-Eng persona 指向
  starter；旧 `system-architect` / `system-qa` persona 仍退役。
- **team 角色包**：`assembling-the-team` 与 `generic/collaboration.md` 写了角色名 / CHARTER /
  `<company-content>/../presets/<role>/skills/<skill>/SKILL.md` / KB / 产出 / 边界；成员仍继承 Lead 组合，
  角色包只是任务书约定，不是 per-member preset。
- **旧矛盾已收口**（按 2026-11-10 的代码/测试重新核对，不再沿用旧卡）：`subagent_retry` 的深度从各 preset
  的通用 `subagent` 行派生（`retrySurface()`）；`handbookSkipPresets` 按 `NON_ROLE_PRESETS` 派生，5 个
  support 全跳过；`CONTRACTS.status` 是 `delivered` / `merged`，不是 `planned`；`delegation-model` 已含
  五条 CEO 命名行。
- **旧轮次**：第四–七轮（2026-11-09/10）的 036–053 已修复归档；旧运行表、F4/F5 等观察不要重跑。复发按新
  证据记为回归，不拿旧结论当本轮 PASS。第四–七轮设计保留在下方作历史，**不是本轮的矩阵**。
- **资产面（2026-11-10 晚审计）**：keyless 170 files / 1409 tests、60+ probes、`delegation-smoke`/
  `preset-smoke`/`ui-scene-smoke` 都在；但 **model ↔ YAML 有 keyless 对账，YAML ↔ runtime 没有矩阵**；
  child header 读取在 3 个 probe 各一份；`cdp-probe --ask` 只留 transcript 尾 450 字（OBS-5 因此不能判）。
  缺口、实测基线与资产设计 = §9 与
  [资产计划](../research/workflow-subagent-exploration/2026-11-10-asset-first-round.md)。

**已定（用户 2026-11-09 批准）：**

- 入口 = R（VP-Eng root）/ C（CEO→`vp_eng`）/ T（VP-Eng teammate）/ N（CEO teammate 负例）/ W（worker child）
  + U（DagTab 透镜）；不加 CEO root 的 workflow 扩面，其他职能只在 R1 做一次 retry 采用 spot check。
- charters = D1（长链/depth）、R1（retry/depth）、W1（worker family）、K1（合同/静态漂移）、U1（图/UI 透镜）
  全跑；K1 的 keyless + 静态对账先做。
- forced/natural 按建议：D1/R1 做 forced 锚点；W1 以 natural 为主、少量 forced 边界；U1 跟随真实 run。
- retry 的真实失败只观察自然 refusal/aborted + keyless 机制档；不伪造 error/interrupted/lost，没有就记未覆盖。
- 深度假设（CEO→VP→workflow→worker depth 3、CMO depth 2→retry depth 3）列为必做 forced。
- 预算：全局 180 分钟、30 个 parent turn、64 个 child activation（含 retry/嵌套）、每 workflow
  6 agents/8 items/4 并发、每 task 最多 1 次重试、单 turn 300 秒、合成证据 8 MiB。
- 发现处置：确认缺陷先开 `_backlog/bugs/` 卡，然后继续探索下一个；静态漂移记 finding 并指明 owner，
  不直接改；修复另按授权边界。UI 只作观察透镜，不单开视觉扫。
- 用户原话（2026-11-09）：「1,2,3 都希望跑，找到问题就提 BUG 然后继续探索寻找下一个 BUG」。

**已定（用户 2026-11-10）：**

- 用户要求：**先把本卡内容适配 2026-11-10 的现状，再做 exploratory test**；本轮 = 第八轮。
- 入口 = CEO root / VP-Eng root / CEO 的 `coo`·`cfo` 命名 child / CEO team（角色包）/
  `quality-loop-producer`·`quality-loop-verifier` / `/req check` 命令 / UI 透镜；不重跑第四–七轮旧矩阵。
- charters = P1（产品类型路由）、P2（五汇报线）、P3（team 角色包）、P4（质量环 starter）、P5（回归边界）；
  P5 的 keyless/静态对账先做，P1–P4 的 live 按预算跑。
- 预算：全局 120 分钟、16 个 parent turn、24 个 child activation、1 个 workflow run、1 次质量环、
  单 turn 300 秒、合成证据 8 MiB；超限停止新 charter，保留现有证据。
- 发现处置：真缺陷开 `_backlog/bugs/` 卡；静态漂移/文案矛盾记观察并指明 owner；**本轮不改代码**，
  修复另按用户授权边界。

**已定（用户 2026-11-10 晚）：**

- 用户要求：**先研究测试资产/探针，再继续 exploratory test**；本卡据此调整为「资产先行」。
- 资产批 A（A1 运行时面矩阵、A2 会话证据包、A3 UI 全文证据）= 0 模型、可自证红绿，可自主推进；
  live 批 B（B1 生命周期、B2 矩阵 live 基线、B3 团队角色包、B4 UI、B5 `/req check`）= 仍按授权门等批准。
- 边界不变：不改产品代码、不重跑第四–八轮旧矩阵、真缺陷先开 `_backlog/bugs/` 卡；
  资产工作不以“绿”代替行为结论。

**已定（用户 2026-11-10 22:42）：** 用户怀疑“改了很多却没找到 bug”，要求再试；本轮 = 第九轮追猎
（B5 补齐 + 命令边界 + 产品类型边界），0 模型 prompt，不改产品代码；新缺陷开卡。

**下一步（2026-11-10 晚）：** A 批资产已完成（§9.7）；B 批 live 按用户 2026-11-10 批准的
60 分钟 / 10 prompt / 16 child 执行（§9.3），结果回填 §9.8。B 批前不重跑第八轮、不扩 CEO root 的 workflow。
第八轮的 [BUG-054](../fixed_bugs/BUG-054-dev-rehearsal-kb-policy-lines-missing.md) /
[BUG-055](../fixed_bugs/BUG-055-team-role-packet-missing-taskbook.md) /
[BUG-056](../fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md) 已由另一 Agent 修复归档；
剩余 OBS-2/OBS-5（OBS-6 已修）见 §8 与 §9。未执行面保留，不写“没有 bug”。第四–七轮只作历史，不重跑。

**历史（2026-11-09 第四轮）：** 第四轮已执行并收口（2026-11-09，约 22 分钟/19 turns/27 children，
未触发停止上限）；发现 **5 张缺陷卡（BUG-045–049）**，已按根因分组全部修复归档。修复后验证轮
（2026-11-09 晚）已跑：keyless 138 tests / verify / preset-smoke / UI golden 全绿；profile 指向当前源码后
BUG-045 的 depth-denial、BUG-046 的身份行、BUG-047 的 handbook skip 均真装配通过；**BUG-050 复核为
dev profile 旧安装副本导致的假阳性**，已迁 `fixed_bugs`。继续探索 teammate/workflow 身份行、retry 正样本与边界；第五轮 W5-E 新发现
**BUG-051（P2：worker-orchestrator 的 1–2 leaf 只是 persona，4 件 brief 起 4 个 leaf）**；第六轮 W6-A 再发现
**BUG-052（P2：worker leaf 的工具面仍有 control，sibling 发送被运行时拒绝）**；其余 charter PASS；
详细证据 = 下方「修复后验证」「第五轮结果」与研究材料 §9.6/§9.7。

| 卡 | 根因组 | 去向 |
|---|---|---|
| [BUG-045](../fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md)（P1） | A 声明↔运行时双源 | [single-source Note](../../../notes/implemented/2026-11-09-delegation-surface-single-source.md) |
| [BUG-049](../fixed_bugs/BUG-049-model-contract-retry-drift.md) | A | 同上 |
| [BUG-047](../fixed_bugs/BUG-047-worker-family-handbook-scope.md) | B family 边界按 ID 白名单 | [handbook Note](../../../notes/implemented/2026-11-09-handbook-worker-family.md) |
| [BUG-046](../fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md) | C 可见面窄于引擎语义 | [identity Note](../../../notes/implemented/2026-11-09-subagent-identity-observable.md) |
| [BUG-048](../fixed_bugs/BUG-048-ui-golden-brand-name-drift.md) | D 验收资产未同 diff 刷新 | 卡内 + `tests/README.md` 映射 |
| [BUG-051](../fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md)（P2） | E 声明面/执行面分裂（过度承诺） | [capability surface Note](../../../notes/implemented/2026-11-10-capability-surface-enforcement.md) |
| [BUG-052](../fixed_bugs/BUG-052-worker-leaf-control-surface.md)（P2） | E 声明面/执行面分裂（漏声明） | 同上 |
| [BUG-053](../fixed_bugs/BUG-053-cancel-does-not-abort-subagent-retry.md)（P1） | F 阻塞原语没有取消语义 | [cancellation Note](../../../notes/implemented/2026-11-10-blocking-tool-cancellation.md) |

**2026-11-10 修复收口（E/F）**：第五/六/七轮新发现的 051/052/053 已按根因分两组修复归档——
E = control 工具 per-agent 安装（worker family 不装）+ fan-out 改成父代理 brief 预算（preset 去掉
“1–2”硬数字，spec 钉文案）；F = `abortable` + `ctx.subagents.interrupt(child)`，cancel 后 35ms
root/child `aborted`、无 sleep 残留。真装配探针另证：只跑 `tsc -b` 不更新 `lib/index.js`，必须
`tsdown` 重建 bundle（BUG-050 同型教训）。剩余探索面不变。

剩余探索面 = long-term adoption / workspace-write / 真页面图 / 其他职能逐个采用 retry / 重启后身份行。
用户 2026-11-09 晚已点名继续探索，本卡回 `推敲中`；上述未覆盖项是下一轮候选，不写“没有 bug”。
第四轮资产（keyless）见本节下方「第四轮收口」。

## 第九轮（2026-11-10 晚）：资产先行，再探索

> 用户 2026-11-10 晚：最近改了一大堆，先研究测试资产/探针，调整本卡，再继续探索。
> 本节是本轮唯一计划；第八轮结果 = §8，第四–七轮只作历史。长证据、实测矩阵与设计细节 =
> [资产审计与第九轮设计](../research/workflow-subagent-exploration/2026-11-10-asset-first-round.md)。

### 9.1 为什么先补资产

- 20 张有效委派面缺陷卡（036–056 扣除 BUG-050 误报）里，**8 张是「声明/可观测面 ≠ 运行时面」**
  （037/043/045/046/047/049/051/052），**3 张是生命周期**（041/044/053）。前者适合矩阵化对账，
  后者适合故障注入；都不是“再跑一个场景”能稳定抓到的。
- 第八轮的成本大头不是模型，是取证与盲区：20 条 prompt（预算 16）、UI 对照 4 条、`/req check`
  被 dataBlocked、质量环跑两次（audit FAIL 后 verify-only 复跑）、成员会话只能解盘上 zstd、
  `--ask` 只看 transcript 尾 450 字（OBS-5 因此无法判）。
- 现有链：`model ↔ YAML` 有 keyless 对账（`tests/presets/delegation-composition.spec.ts`），
  `YAML ↔ runtime` **没有矩阵**；`delegation-smoke` 只覆盖 CEO/vp_eng 一条链。
- round-8 日志只读实测（47 观察 / 27 child）：CEO root 80 工具、coo/cfo child 71、vp-eng root 81 /
  named child 75 / member 81、worker 21、producer 31→22（root→child）、verifier 28→19；root−named child = 9 或 6。
  这证明矩阵可零模型、秒级跑。详见资产计划 §5。

### 9.2 资产批 A（无模型；可立即做）

| ID | 资产 | 落点 | 判据 / oracle | 红证 | 成本 |
|---|---|---|---|---|---|
| A1 | 运行时面矩阵 judge + audit | 待建：tools/lib/surface-matrix.mjs、checks/audit/surface-matrix-audit.mjs、spec；YAML 派生收成 tools/lib/preset-rows.mjs | 11 preset × 4 类入口：工具面/命名行/control/workflow/handbook/合同/skill catalog/preset/depth；root 只判 Lead/overlay | 合成观察四例：worker 带 `list_subagents`、verifier 带 `write`、CEO 缺 `coo`、handbook 反置 | 0 模型；秒级 |
| A2 | 会话证据包 | 待建：tools/lib/session-evidence.mjs、tools/explore-evidence.mjs、spec | 树/child durable header/终态/工具调用/写盘/catalog；缺 header 显式 `unavailable` | 合成日志缺 header → `unavailable`，不默认 worker/0 | 0 模型；秒级 |
| A3 | UI 全文证据 | `probes/browser-visual/cdp-probe.mjs` 加 `--body-out`（~15 行） | `--ask`/`--steps` 后写完整 `document.body.innerText`；label 正/负控 | 已知不存在的 label 必须不命中 | 0 模型 |

A1 验收：spec 红→绿；在 round-8 窗口（HEAD 后）的 47 条观察上零假阳性；`--since` 是必需参数
（旧日志会报旧状态，见资产计划 §5.2）。**不证明**模型行为、UI、生命周期。
A2 验收：spec 红→绿；`--session <root>` 出 JSON+markdown；替掉 3 个 probe 的重复 child 读取（或写明保留理由）。
A3 验收：负控 label 不命中；`COO（运营与交付）` / `CFO（财务与合规）` 命中与否都有全文可判。

### 9.3 资产批 B（live，待用户批准）

| ID | 试验 | 形状 | oracle | 预算 |
|---|---|---|---|---|
| B1 | 生命周期注入 | `probes/team/delegation-lifecycle-probe.mjs --fault cancel\|sigterm`：vp-eng 用 `subagent_retry` 起 sleep worker，child 起后 cancel/停宿主 | root/child `turn/end` 终态；`list_subagents` 行；retry 结果；重启后冷恢复 | 2–4 prompts |
| B2 | 矩阵 live 基线 | 复用 `delegation-smoke --delegate` + `delegation-depth-probe` + B3 的会话，跑 A1 | A1 零问题；root/child delta = 9/6 | 0–2 prompts（复用） |
| B3 | 团队角色包 × 非 COO | CEO 1 人 CFO 成员，任务书带 CFO 角色包 | 成员 read CFO skills、`drafts/cfo.md`、不越权 | 1–2 prompts |
| B4 | UI 卡可视性 | `ui-scene-smoke --ask` + A3 全文 | `COO（运营与交付）`/`CFO（财务与合规）` 命中或不命中都有全文 | 1 prompt |
| B5 | `/req check` live | GUI 会话跑一次；仍 dataBlocked 就记未覆盖 | 回执层/动议类型 | 0–1 prompt |

- 预算：60 分钟 / 10 parent prompt / 16 child activation / 1 浏览器 / 8 MiB；超限停新试验。
- 权限：当前 workspace-write + 排练场 cwd；证据 = `runtime/tmp/explore/round9/` + 卡内摘要；
  真模型范围按本表，不扩 CEO root 的 workflow、不重跑旧矩阵。
- 停止：单 turn 300s；连续两次 infra 失败暂停诊断；抓到 P1 先开卡再继续下一个；本轮不改产品代码。

### 9.4 本轮不建（明确排除）

- **replay/snapshot**：replay lane 不加载 company-pack；snapshots 只收合成场景，真实会话证据不进仓。
- **文档散文门禁**：policy P2 只对复发 + 可机械判定的错误；OBS-6 已修，OBS-2 复核为两条非漂移 + 研究材料指针（owner = research）。
- **`/req check` 命令宿主夹具**：keyless 已覆盖解析；live 缺的是 workspace/lease，不是产品类型。
- **每 bug 一个常驻 probe**：修完的 bug 进 keyless judge；live probe 只留模型行为/生命周期/UI 三类。
- **无人值守 fuzz / 全 preset E2E**：P3 轻任务；模型成本与 flake 不可控。

### 9.5 资产 ROI 规则

1. 补验证链缺口，或让新假设更便宜；否则放 `runtime/tmp`，不入库。
2. judge 进 `tools/lib` + spec；live/browser 只采集（judge + thin runner）。
3. 先有红证；没红过的资产不算证据（[testing.md](../../../docs/testing.md) §3.7）。
4. 头注写清「不证明什么」；矩阵绿 ≠ 行为绿。
5. 资产有层（keyless/smoke/probe/audit/evidence）；不把模型塞进 `pnpm test`。
6. 同类形状第二次出现、或某 charter 被盲区卡住才建；不预建每 bug 场景。

### 9.6 完成判据（资产批）

- A1/A2/A3 各有落点、spec 红→绿、头注「何时跑/成本/不证明」；A1 在 round-8 窗口零假阳性。
- A 批不调模型；B 批未批准前不启动。
- OBS-6 已修；OBS-2 有复核结论与 owner（研究材料指针）；不把文档漂移混进资产绿。
- 收口回答：矩阵抓到什么、证据包省了什么、哪些面仍未覆盖。

### 9.7 A 批执行结果（2026-11-10 晚）

> 决策记忆 = [探索测试的资产策略](../../../notes/implemented/2026-11-10-exploration-asset-strategy.md)
> （ROI 六条、入口语义、输掉的方案与验证/未验面）。

- **A1**：`tools/lib/surface-matrix.mjs` + `checks/audit/surface-matrix-audit.mjs` + spec（14 tests）。
  round-8 窗口（`--since 2026-11-10T17:00+08:00`）= **47 观察（20 root / 19 child / 8 member）**、
  54 个无模型轮跳过、**0 问题**；红证 = 同一 audit 对 `--since 2026-11-09` 旧日志 **exit 1**，
  含 `worker d1 control=list_subagents,send_to_subagent`（BUG-052 同型）与旧 vp-eng 缺 `quality_loop_*` 行。
- **A2**：`tools/lib/session-evidence.mjs` + `tools/explore-evidence.mjs` + spec（6 tests）；在
  `session-2110bd4a` 上出 root + 2 children（80/71/71 工具、3 轮 completed）；缺首帧显式 `unavailable`。
  3 个 probe 的 `rawHeader` 暂保留：probe 走 `session/page` 的 mode fallback，evidence 包走盘上直读，
  输入面不同；统一另开（不是本轮资产绿）。
- **A3**：`cdp-probe --body-out` 在 `ui-scene-smoke --isolated --keep` 实例上落 761B 全文（9 页签、0 失败），
  负控 `COO（运营与交付）` 不在空壳正文；正控留 B4。
- **静态漂移**：OBS-6 已修（`delegation.md` §5 五 key + 通用职能卡）；OBS-2 复核 = cordis 注释是反例警示、
  release-smoke 是历史注释（均非活漂移），两处研究材料已加“2026-11-10 后已变”指针。
- **验证**：`pnpm verify` ALL PASS；`pnpm typecheck` 绿；新 spec 20 tests 绿。

### 9.8 B 批执行结果（2026-11-10 晚）

> 预算实际：约 **20 分钟 live**、**8 parent prompt**、**8 child activation**、1 浏览器；
> 未触发 60 分钟 / 10 prompt / 16 child 上限。证据 = `runtime/tmp/explore/round9/`
> （矩阵 JSON/MD、B4 body/DOM 片段、B5 body）+ 会话日志（`runtime/harness-home`，gitignored）。

| ID | 试验 | 结果 |
|---|---|---|
| B1 cancel | vp-eng `subagent_retry` → worker `bash sleep 120`；child bash 起后 cancel | **PASS**：cancel accepted；root/child `turn/end` = `aborted`；无 `sleep 120` 残留；retry 工具结果在 cancel 前未回（如实记，不伪造）。 |
| B1 sigterm | 同上 → SIGTERM 宿主 → 同 home 重启 | **PASS**：重启后 root/child durable `turn/end` = `interrupted`。B1 共 3 次失败：cancel 首跑因探针吞掉 `session/page` 错误而空读；sigterm 前两跑在 kill 后仍读旧 web（`fetch failed`）+ 重启等待不足；修正后 2 次 PASS，不是产品结论。 |
| B2 矩阵 | A1 audit 扫 B1/B3/B4 新会话 | **PASS**：15 观察（7 root / 7 child / 1 member）、0 问题；coo/cfo child 71 工具 / control 2 / 无 team；CEO team member 继承 80 工具。 |
| B3 CFO 角色包 | CEO 1 人 CFO 成员，任务书带 CFO 角色包 | **PASS**：`drafts/ceo.md`、`drafts/cfo.md` 在场；署名行 `任务书 = …` 指向真实任务书；任务书含 CFO 角色包（2794 chars）；成员继承 CEO 组合（preset ceo / d1），不冒充 preset CFO。 |
| B4 UI 卡 | 同一 CEO 会话调 coo + cfo；`--body-out` / `--html-out` | **卡在 DOM、默认不可见**：DOM 有 `data-slot="tool.call.toolview"`、`data-tool=coo/cfo`、`wk-delegation-role = 委派 COO（运营与交付）/ CFO（财务与合规）`、`data-state=ok`；但卡在 `data-step-process-body hidden="until-found"`（`data-turn-process-member=true`）里，默认 transcript、`--body-out`、点 `Completed`/`Called tools` 都未露出。**OBS-5 判为折叠/探针限制，不是卡未渲染**；不据此开 bug。 |
| B5 `/req check` live | 命令宿主 RPC（非 GUI ask）：`session/create` + `commands/execute` | **PASS（2026-11-10 深夜补齐）**：清掉 dev home 陈旧 writer lease（pid 98394）后，`/req check 2026-11-10-probe-cmd-business-software` 真回执 = `层 = MRD/StRS/PRD；动议类型 = business-software；索引 = 4 条定义 / 4 条追溯`；`missing-slug` → 缺需求文档；空参数 → usage。另发现 [BUG-057](../fixed_bugs/BUG-057-command-slug-path-traversal.md) / [BUG-058](../fixed_bugs/BUG-058-command-datablocked-reason.md)。 |

- 判定：B1（cancel/sigterm）、B2、B3 PASS；B4 解 OBS-5（卡渲染正确、默认不可见）；B5 未覆盖。
  未发现新的产品级硬缺陷。
- 资产回填：B1 探针 = `probes/team/delegation-lifecycle-probe.mjs`；B3 探针参数化 =
  `probes/session-context/team-taskbook-probe.mjs --role cfo`；B4 证据 = cdp-probe `--body-out` / `--html-out`。
- 未执行/未覆盖：B5 的 `/req check` 真回执；B4 展开后的稳定可见性（需要 step-process 展开的稳定选择器，
  或产品决定默认展开）；B1 的 retry 工具结果 cancel 回执（本次 cancel 先到）。

### 9.9 深夜追猎（2026-11-10 22:42 用户挑战）

> 用户：改了很多却没找到 bug，怀疑。**本轮针对「未证面 + 输入边界」追猎**；0 模型 prompt
> （命令宿主 RPC + keyless fixture），未占 B 批预算。

**B5 补齐（PASS）**：前一晚的 dataBlocked 不是 workspace 缺失，而是 dev home 的 writer lease 被陈旧进程
pid 98394 持有。清掉 holder 后真回执 =
`编号校验通过（2026-11-10-probe-cmd-business-software）：MR 1 / REQ 2 / IF 0 / TC 0 / AC 1；层 = MRD/StRS/PRD；动议类型 = business-software；索引 = 4 条定义 / 4 条追溯。`
B5 从「未证」改 PASS。

**新缺陷（2 张 P2）**：

- [BUG-057](../fixed_bugs/BUG-057-command-slug-path-traversal.md)：`/req check ../zz-outside` 返回 **success**；
  `/prd check ../zz-outside` 读到根外目录的内容判据错误。两个 handler 都把 slug 直接 `join`，`..`
  可越界；只读、本地操作员触发 → P2。已复现（fixture 用完即删）。
- [BUG-058](../fixed_bugs/BUG-058-command-datablocked-reason.md)：dataBlocked 回执说「无 workspace/身份/lease 问题」，
  但本轮真实原因正是 lease 被占；runtime guard 的 stderr 有原因，命令层只剩布尔。另：raw session 的
  cwd 不改变命令的启动态；GUI picker 是否 re-init 未证。

**产品类型边界（观察，不建卡）**：

- 重复 `产品类型:` 行 → 第一行为准（hardware 先、business 后 → 回执 hardware）；
- 行尾 `# 注释` → 不匹配，回落 company.md（company 是 `project-services` 时回执报 company 未知）；
- CRLF 正常；未知类型报错并列可用类型；占位 `<...>` 回落 company.md；company.md 未知类型报错来自
  company.md；动议类型覆盖 company；`需求层` 缺 SyRS/IRS 判红。这些是 malformed 输入的容错选择，
  不是已证缺陷；要严格化另立卡。

**验证**：B5 回执、`/prd check` 越界读取、`/req check ../zz-outside` 越界 success 均为真跑；
`pnpm verify` ALL PASS。

### 9.10 质量环 R2（2026-11-10 深夜）

> 用户：继续修，抓到任何一个 bug 就修。本轮 = 质量环完整环的 R2（1 prompt / 1 verifier child）。

- **会话**：VP-Eng `session-c33f9412…`；R1 verifier `7ae15c99…`；R2 verifier `cdf67a74…`（depth 1）。
- **裁决**：R2 `pass`，7/7 check-id、0 blocker；R1 的 F1 已消除，F2/F3/F4 仍 advisory，新增 F5 接受；
  `dispositions-r2.md` 在场。
- **BUG-059（audit 假红）**：`tools/lib/quality-loop.mjs` 的原文索引用跨轮全局 `lastTextIndex`；
  R2 换新 verifier session 后仍从 R1 的 index+1 找，误报 `not-verbatim`。合成用例修前 1 failed →
  40 passed；真盘 R2 audit 复跑 **ALL PASS**。已修归档。
- **R1 artifact**：`verdict-r1.md` 头 hash `d9d252…` 与正文 `5738a1…` 不一致；正文与 R1 verifier
  第 2 条助手正文逐字一致，用 `verdict-hash.mjs --fix` 重算头（不改正文）后 audit 绿。不是代码 bug，
  是 round-8 手算/旧副本残留。
- **结果**：`quality-loop-audit --deliverable 2026-11-10-probe-qloop` **ALL PASS**（2 轮 / 2 侧）。
- **未覆盖**：R3（上限 2，不允许）；方法判断质量仍归人审；R2 未再触发新的产品级硬缺陷。

### 9.11 定点：picker 会话 + VP-Sales 角色包（2026-11-10/11）

- **picker 会话（BUG-060，已修）**：启动无 workspace（`DSH_COMPANY_HOME=/tmp/nonexistent`）+
  建 cwd=`company-workspace` 的会话 → 修前 `/req check` 仍 dataBlocked；修后 **success**
  （层 MRD/StRS/PRD、动议类型 business-software）。修法 = 只读 `/req`/`/prd` 用
  `agent.session.header.cwd` 回落；写命令仍走停写守卫。真正的 GUI picker 点击未自动化，
  本卡证的是 picker 会话的命令路径；写命令（`/deliverables`、`/cultivation`）仍需重启。
- **VP-Sales 角色包（PASS）**：CEO 1 人 VP-Sales 成员，任务书带角色包 →
  `drafts/ceo.md`、`drafts/vp-sales.md` 在场；署名行 `任务书 = …` 指向真实文件；
  任务书含 VP-Sales 角色包（3600 chars）；成员继承 CEO 组合，不冒充 preset。无新缺陷。
- **判定**：两个定点一个 PASS、一个抓出 BUG-060 并修复；未发现新的产品级硬缺陷。

## 第八轮（2026-11-10 后）：新面与回归

> 用户 2026-11-10 要求：先把本卡适配现状，再做 exploratory test。**本节是本轮唯一矩阵**；
> 下方第四–七轮只作历史，不重跑。本轮不改代码：真缺陷开 bug 卡，静态漂移记观察并指明 owner。

### 8.1 为什么本轮不同

2026-11-10 的四组改动把委派面从“9 preset + 3 命名行”扩成“11 preset + 5 命名行 + 产品类型路由 +
方法包 + team 角色包”。旧矩阵（D1/R1/W1/K1/U1）只覆盖 2026-11-09 的 worker/retry/workflow 面；
继续按旧矩阵跑，会把新增的合法行为误判为失败，也会漏掉新面与旧面的交界。本轮只探：

1. 产品类型：`business-software` / `hardware-software` / `meta.md` / `/req check`；
2. 五汇报线：`coo` / `cfo` 命名行、UI key、child preset/depth；
3. team 角色包：成员能否真读到 `<company-content>/../presets/<role>/skills/...`；
4. 质量环 starter：四份方法包是否被 producer/verifier 加载、配对、只读边界；
5. 回归：旧 worker/retry/workflow/depth/handbook/合同有没有被改坏。

### 8.2 入口矩阵

| ID | 入口 | 深度 | 组合 / 工具面 | 本轮用途 |
|---|---|---:|---|---|
| C | CEO root | 0 | 五命名行 + research + team；无 generic subagent / workflow / control | 五汇报线、产品类型、team 角色包 |
| V | VP-Eng root | 0 | worker / fork / workflow / quality loop / `vp_cmo` | 质量环 starter、workflow 回归 |
| Ncoo / Ncfo | CEO → `coo` / `cfo` 命名 child | 1 | 对应角色 preset；generic subagent/fork `maxDepth: 2` | 五汇报线真激活、preset/depth/UI |
| T | CEO team（任务书带角色包） | 1 | 继承 CEO 组合；角色包给 CHARTER + skill 路径 | 角色包读路径与产出 |
| QP / QV | `quality-loop-producer` / `quality-loop-verifier` | 1 | 方法槽 + `_shared/skills/quality-loop` | starter 加载、配对、只读 |
| RQ | `/req check`（操作员命令） | — | 读动议 `meta.md` > `company.md` | 产品类型路由 |
| U | 委派卡 / DagTab 透镜 | — | 只读投影 | 五 key、widget 状态、终态 |

三种门不要混：C 是编排者，V 是研发根门，Ncoo/Ncfo 是命名 child（不是 team member）；T 是软角色，
角色包只是任务书约定；QP/QV 是 support 能力档，不是公司角色。

### 8.3 Charters

#### P1 · 产品类型路由（keyless + 1 live）

**任务形状**：keyless 跑 `pnpm vitest run tests/host/commands/req-command.spec.ts
tests/content/product-types.spec.ts tests/host/run-bundle/company-fixture.spec.ts`；live 给 CEO 一条
“纯软动议、只做一份 MRD”的 prompt，看它是否在 `deliverables/<slug>/meta.md` 写
`产品类型: business-software`，以及是否按 `product-definition` 选 business-software playbook。

**oracle**：`meta.md` 字段；`/req check` 回执的 `层 = MRD/StRS/PRD` 与“动议类型”；未知类型错误文本；
`business-software/check-rules.json` 三层；`hardware-software` 仍可走系统层；模板占位 `<...>` 不误红。

**失败信号**：CEO 只在对话里说类型、不写 meta；`/req check` 仍读 company.md；`business-software`
被 `/prd check` 判缺 MRD/PRD；未知类型静默回落五层；旧 `b2b-saas` 不报错。

#### P2 · 五汇报线（live，2–3 个 parent turn）

**任务形状**：CEO root 分别发“让 COO 出一份单职能交付核查”/“让 CFO 出一份单职能毛利测算”，
brief 只要一份、单职能；看工具调用名、child 首帧 preset/depth、完成通知、UI 委派卡。

**oracle**：CEO 工具目录含 `coo`/`cfo`；call 名 = `coo`/`cfo`；child `agentPreset` = `coo`/`cfo`、
`delegationDepth = 1`；child 工具面有该角色 skills、**没有** Team 工具；`DELEGATION_TOOL_KEYS` 五条；
UI 卡渲染对应 label；不误用 `vp_*` 或 team。

**失败信号**：工具可见但调用报 unknown / depth；child preset 错；UI 不渲染 coo/cfo；CEO 用 team 软角色
冒充真 COO/CFO；命名 child 被 team 控制名误等。

#### P3 · team 角色包（live，1–2 个 parent turn）

**任务形状**：CEO 组一个 1 人 team（成员名 `coo`），任务书带角色包：
`角色 / CHARTER / <company-content>/../presets/coo/skills/ops-feasibility/SKILL.md / budget-check/SKILL.md /
KB / 产出 / 边界`；任务只要求一页交付核查。看成员是否 `read` 这些文件、是否按 COO 边界产出。

**oracle**：成员工具调用含 `read` 指向上述路径；不出现 `skill` unknown 后直接凭记忆编；产出文件在
`drafts/coo.md`；成员没有越权（不定技术/定价）；成员是继承 CEO 组合，不声称自己是 preset COO。

**失败信号**：`<company-content>/../presets` 路径读不到；成员因 `skill` 加载不到就跳过；产出是 CEO 口吻/
没有 COO 判据；角色包路径写错或越界（沙箱拒绝）。

#### P4 · 质量环 starter（keyless + 1 live turn）

**任务形状**：keyless `pnpm methods:init`（幂等）、四份方法包 parse/pair/check-id；live 给
`quality-loop-producer` / `quality-loop-verifier` 各一条“列出你可用的 skill 名，不要调用”的 prompt，
看 catalog 是否含 `system-architecture` / `vv-plan`；可选一次 VP-Eng 质量环（budget 允许 1 次）。

**oracle**：`<DSH_HOME>/company/methods/quality-loop-{producer,verifier}/...` 四份在场；producer/verifier
同 method/version；verifier 工具面没有 write/edit/bash；skill catalog 含两包；VP-Eng persona 指向
starter；任务书不点名时 fail-closed。

**失败信号**：`methods:init` 覆盖人的版本；两包版本/check-id 不配对；verifier 能写盘/跑 bash；
catalog 看不到 starter；VP-Eng 自己编方法；旧 `system-architect`/`system-qa` 仍被提到为可用。

#### P5 · 回归边界（keyless/static 先做，spot live）

**任务形状**：跑 `pnpm verify`、`pnpm test`、`pnpm typecheck`、`preset-smoke`；静态对账：
`retrySurface()`、`handbookSkipPresets()`、`CONTRACTS.status`、CEO `namedDelegates`、`DELEGATION_TOOL_KEYS`；
`rg` 活跃面的旧断言（`9 个 preset`、`三个工具`、`b2b-saas`、`没有默认方法包`、`handbookSkipPresets: ['worker']`）。
spot live 选 `delegation-smoke --delegate` 一次；不再跑第四–七轮全矩阵。

**oracle**：门禁/测试全绿；静态事实与 2026-11-10 代码一致；旧卡只作历史；没有“文档说 3、代码说 5”的
活口径；没有新增的 `planned`/`三个工具`/`b2b-saas` 活跃引用。

**失败信号**：测试红；`preset-smoke` 挂载失败；静态对账仍出现旧数字；`delegation-smoke` 的可见工具
清单缺 coo/cfo；旧探测场景被误当成本轮 PASS。

### 8.4 可证伪假设

| # | 假设 | 通过信号 | 失败信号 |
|---|---|---|---|
| H12 | `/req check` 按 meta > company，未知类型报错，business-software 走三层 | 回执层/来源正确；未知类型有诊断 | 仍读 company；静默回落；三层被误红 |
| H13 | CEO 五条角色命名行可激活，child preset/depth 正确 | call/child header/UI 一致 | 工具不可见、preset 错、UI 不渲染 |
| H14 | team 角色包的 `<company-content>/../presets` 路径可读 | 成员 `read` 成功并产出 | 路径不可读、成员凭记忆、越权 |
| H15 | 质量环 starter 两侧可加载、配对、verifier 只读 | catalog 含两包；无写/跑工具 | 包缺失/版本不配/verifier 能写 |
| H16 | 旧 worker/retry/workflow/depth/handbook/合同无回归 | 旧 keyless + spot live 全绿 | 任一旧行为退化 |
| H17 | CEO 在 live 里真写 `meta.md` 的产品类型 | 文件有真类型，不是占位 | 只在对话里说，或写 `<...>` |
| H18 | 未知 `b2b-saas` / `project-services` 明确报错 | `/req check` 报未知并列可用 | 静默用五层/旧规则 |
| H19 | `methods:init` 幂等、不覆盖人的方法 | 二次运行 skipped；内容不变 | 覆盖、重复、假成功 |

### 8.5 Oracle 与证据

- 独立 oracle：`meta.md`、`/req check` 回执、child 首帧 `agentPreset`/`delegationDepth`、工具目录
  `request/header.tools`、skill catalog、`read`/`write` 工具调用、文件内容、`DELEGATION_TOOL_KEYS`、
  `preset-smoke` 的 roster/挂载行。
- 模型自述只作诊断，不参与 PASS；UI 只作观察透镜，不单开视觉扫。
- 证据落点：会话 id + 关键 JSON 片段写回本卡；大文件放 `runtime/`（gitignored）并在卡内给路径；
  不进 `snapshots/` 除非要固化为回归资产。
- 不重复第四–七轮旧场景；复发按新证据记为回归。

### 8.6 预算与停止（用户 2026-11-10 授权）

| 维度 | 上限 | 超限动作 |
|---|---:|---|
| 全轮墙钟 | 120 分钟 | 停止新 charter，取消在途 session/job，收口 |
| parent prompt/turn | 16 | 不再发新 turn；未覆盖标未执行 |
| child activation | 24（含 retry/嵌套） | 不再启动 child；保存证据 |
| workflow run | 1 | 不再开第二个 |
| 质量环 | 1 次 | 不追加轮次；超限按质量环 skill 升级 |
| 单 turn 等待 | 300 秒 | cancel/kill；连续两次 infra 失败暂停诊断 |
| 合成证据 | 8 MiB | 停止新探索，保留关键判据 |

### 8.7 本轮完成判据

- 用户 2026-11-10 授权已记录；P5 的 keyless/静态先做，P1–P4 至少各有一条 live 或明确“未执行”。
- 每个 charter 有 session id / 命令、oracle、判定、未覆盖；不写“没有 bug”。
- 真缺陷开 `_backlog/bugs/` 卡；静态漂移/文案矛盾记观察并指明 owner；本轮不改代码。
- 收口回答：抓到什么副作用；哪些值得升 keyless/probe/replay；哪些没跑；是否触发停止上限。

## 第八轮执行结果（2026-11-10）

> 环境 = HEAD `6ae536d3` + dev `DSH_HOME` + `runtime/rehearsal-workspace`；真实模型 = deepseek。
> 实际预算：约 **50 分钟**、**20 条 parent prompt**、**22 个 child activation**、**1 个 workflow run**、
> **1 次完整质量环 + 1 次 verify-only 复跑**；prompt 比 16 的预算多 4 条（UI 对照探针），
> 未触发墙钟/child 上限。临时探针住 `runtime/`（gitignored），不随包发布。

### 实际运行

| 入口 | 会话 / child | 结果 |
|---|---|---|
| C · CEO root | `session-2110bd4a-627d-4f44-abd0-a2b15054783b` | 工具目录含 `coo`/`cfo`；五命名行可见 |
| Ncoo · CEO→`coo` | child `3b726373-c87f-4133-b9db-c101179ce756` | `started subagent`；child `agentPreset=coo`；71 工具；无 Team 工具 |
| Ncfo · CEO→`cfo` | child `91911489-111a-463d-9094-72ceadbb3f3a` | `started subagent`；child `agentPreset=cfo`；71 工具；无 Team 工具 |
| P1 · meta 产品类型 | CEO 同会话 | `drafts/.../meta.md` = 一行 `产品类型: business-software`；CEO 真写盘 |
| P1 · `/req check` live | `commands/execute`（CEO 会话） | **dataBlocked**（探针会话无 workspace/lease）；keyless 覆盖解析，live 未证 |
| QP / QV · 质量环 catalog | `session-1ef5a82f-913c-405d-aaa6-67036f726b87` / `session-8ab5af86-b8cb-4697-9689-1bbbb5bebf0b` | 两侧 catalog 都含 `system-architecture` / `vv-plan` |
| QP / QV · skill 真加载 | `session-c08f1dab-0145-492a-9b46-70f5fbdaa65a` / `session-f5e6a01f-9e7b-4578-8749-4bfb4aa1c5c8` | 两侧都 `skill(name=system-architecture)` 成功；producer/verifier 正文各是自己的 side |
| P4 · 质量环 live | VP-Eng `session-9762e5c2…`（首次）/ `session-9144774f…`（verify-only 复跑）；producer `b877f4de…`；verifier `7ae15c99…` | verdict pass + 4 条 advisory 处置；**audit FAIL `body-modified`**（BUG-056） |
| T · team 角色包 | CEO `session-69cabf06-dd57-4cb5-8f82-cadf47c82c42`；member `2955f432-25d5-490a-92a1-1b58a7883c77` | spawn PASS；成员盘日志有 `read` CHARTER + `ops-feasibility` + `budget-check`；`drafts/coo.md` 在场 |
| T · CMO 真实产出 | CEO `session-b8eef8a8-4703-477a-9496-8dbf117aaf9b`；member `366ba724-f890-4db5-b110-352e9034829b` | `drafts/cmo.md` 在场（MRD `defer`）；成员日志提及 `product-definition` / `business-software` / `mrd-playbook`；任务书 `drafts/ceo.md` 真实 |
| UI · client-load | `client-load-smoke` | ALL PASS（真浏览器零挂载失败 / 零 loader 错 / 品牌槽） |
| UI · shell golden | `ui-scene-smoke --isolated --golden` | ALL PASS（9 页签 + 错误环零命中） |
| UI · 卡片标签 | `ui-scene-smoke --ask` + `--steps`（coo/cfo + vp_eng 对照） | **未证实**：默认 transcript、点 `Completed`、点 `Agent Team` 都看不到 `COO（…）` / `VP-Eng（…）`；非 coo/cfo 专有，按 UI/折叠/探针限制记 OBS-5 |
| P5 · delegation smoke | `delegation-smoke --delegate` `session-6e69bfb5-7df4-4c40-8086-9518cb689046` | ALL PASS；CEO 工具目录五命名行齐；vp_eng child preset 正确、无 Team 工具 |
| P5 · retry | `subagent-retry-probe` `session-555420d3-a428-4e21-b0c8-87d4d2a5d408`；child `e248e6da…` | ALL PASS；worker depth 1、`completed` |
| P5 · depth | `delegation-depth-probe` `session-5a9ca2b4…`（P-C）/ `session-81ee96a6…`（P-D） | ALL PASS；workflow 分支 1、worker 2；teammate 1、worker 2 |

### 判定

- **P2 五汇报线：PASS**。`coo`/`cfo` 可见、被调用、child preset 正确、无 Team 工具；UI key 静态五条。
- **P1 产品类型：PASS（写入面）**。CEO 真写了 `meta.md` 的产品类型；`/req check` 的 live 命令面
  被 `dataBlocked` 挡住（探针会话无 workspace/lease），由 keyless spec 覆盖 meta 优先/回落/未知/占位。
- **P4 质量环 starter：catalog/加载 PASS；完整质量环 FAIL（audit）**。producer/verifier 都看得到
  `system-architecture`/`vv-plan`，且 `skill(name=system-architecture)` 成功加载到各自 side 的正文。
  第一次 live 在 300s wall 处截断于 verify 启动；复用产物只跑 verify 的 follow-up 写出 verdict
  `pass` + 4 条 advisory 处置，但 `quality-loop-audit` 报 `body-modified`：头 hash 含尾随换行，
  audit 归一化后不一致（[BUG-056](../fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md)）。
  把副本头 hash 改成归一化值后 audit **ALL PASS**——其余八项都过，唯一失败是 hash 口径。
  裁决文本本身 pass、检查表/处置都在，但机械锚对不上；R2/复验未跑。
- **P3 team 角色包：PASS（路径 + CMO 产出）**。COO 成员盘日志证明它读了 CHARTER + 两个 COO skill
  （绝对路径 `<company-content>/../presets/coo/skills/...`），产出 `drafts/coo.md`。CMO 成员真出了
  `drafts/cmo.md`（MRD `defer`），日志提及 shared `product-definition`、`business-software` 与
  `mrd-playbook`；任务书 `drafts/ceo.md` 真实（BUG-055 修复后的形状）。
- **P5 回归：PASS（keyless/静态 + 三条 live smoke + UI 壳）**。`pnpm verify` ALL PASS、`pnpm test`
  170 files / 1409 tests、`pnpm typecheck` 绿、`preset-smoke` ALL PASS、`delegation-smoke --delegate`
  ALL PASS、`subagent-retry-probe` ALL PASS、`delegation-depth-probe` ALL PASS；`client-load-smoke` 与
  `ui-scene-smoke --isolated --golden` 也 ALL PASS。第四–七轮旧矩阵未重跑。

### 新发现

- [BUG-054](../fixed_bugs/BUG-054-dev-rehearsal-kb-policy-lines-missing.md)（P2，**已由另一 Agent 修复归档**）：
  dev/rehearsal 盘缺 `policy-lines.md` / `review-protocol.md`；COO 在探针里因此把预算/并行判据标
  「唯一事实家缺失」。生产 `seed.json` 有这两条，缺口在 `bundle-init` / `mirrorCompanyReference`。
- [BUG-055](../fixed_bugs/BUG-055-team-role-packet-missing-taskbook.md)（P2，**已修复归档**）：
  team 角色包没有 `任务书` 字段；COO 稿首署名行指向不存在的 `drafts/ceo.md`。
- [BUG-056](../fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md)（P2，**已修归档**）：quality-loop
  `verdict-r1.md` 的 body-sha256 含尾随换行；首次真跑 audit `body-modified`。文本 pass、机械锚对不上。
- **OBS-1（探针限制，不是产品缺陷）**：团队成员的会话不能通过 `session/page` 读（地址/边界），
  本次改用磁盘 `session.v4.jsonl.zstd`；证到成员真读了角色 skill。
- **OBS-2（静态漂移复核，owner = 文档/研究）**：2026-11-10 晚复核——
  `packages/company-pack/cordis.patch.yml:104` 的 `handbookSkipPresets: ['worker']` 是“别把单 profile
  白名单写回来”的反例警示，不是活漂移；`checks/lanes/release.entry.mjs:164` 的「9 个 preset」是
  2026-11-10 前 stale `_dist` 的历史注释，也不是活口径。只剩两份研究材料
  （`2026-11-10-sa-sqa-method-packs.md` / `2026-11-10-org-coordination-topology.md`）的落地前快照
  已加“2026-11-10 后已变”指针（研究材料正文不回填；两处指针已落，owner 归 research 维护）。
- **OBS-3（已解；真实原因转 BUG-058）**：`commands/execute` 首跑返回 `公司数据已停写` 的真实原因是
  dev home writer lease 被陈旧进程持有（pid 98394），不是 workspace 缺失；清掉 holder 后 B5 真回执 PASS。
  但回执把原因说成「无 workspace/身份/lease 问题」→ [BUG-058](../fixed_bugs/BUG-058-command-datablocked-reason.md)；
  命令宿主 RPC 本身可用。
- **OBS-4（流程风险）**：VP-Eng 在 verdict 后改了产物（F1/F3 订正），没有开 R2；处置表明确标
  「已修但未经复验」。本轮是我们的 prompt 限定只跑一轮，但这说明**裁决与产物版本没有被同一 hash 绑定**，
  与 BUG-056 的修复面相邻。
- **OBS-5（UI 折叠，不是卡未渲染 / 不是 coo/cfo 回归）**：B4 用 `--html-out` 证明 DOM 里有完整卡
  （`data-tool=coo/cfo`、`委派 COO（运营与交付）`/`委派 CFO（财务与合规）`、`已交稿`），但它挂在
  `data-step-process-body hidden="until-found"`（`data-turn-process-member=true`）下；默认 transcript、
  `--body-out`、点 `Completed`/`Called tools` 都不露出。卡注册/渲染正确，默认可见性是折叠策略 +
  探针选择器限制；本轮不据此开 bug，产品若要默认展开另立判断。
- **OBS-6（静态漂移，已修 2026-11-10）**：`docs/contracts/delegation.md` §5 原写卡片 key =
  `vp_eng` / `vp_sales` 两项、渲染文案仍指“VP 交回的稿子”；代码
  [`delegation-keys.ts`](../../../packages/company-pack/src/client/wiring/delegation-keys.ts) 已是五项
  （`vp_eng`/`vp_sales`/`vp_cmo`/`coo`/`cfo`），`DelegationCard` 也已是通用职能卡。A 批同 diff 已修。
- **未发现**产品类型/五汇报线的硬缺陷；质量环 catalog/加载 PASS，完整质量环 audit `body-modified`
  已由另一 Agent 修复归档（[BUG-056](../fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md)）；
  UI 卡片标签未证实。不能据此说“没有 bug”，未跑面见下。

### 未执行

- `/req check` / `/prd check` 的真实命令回执（`dataBlocked`，见 OBS-3；keyless 已覆盖解析）；
- 质量环 R2/复验（首次 live 只做了 produce→verify→R1 处置；audit 已 FAIL，见 BUG-056）；
- `business-software` 动议的 `/prd check` + `/req check` 端到端（同 OBS-3）；
- UI 卡片标签默认可见性（B4 已定位：DOM 有卡、折叠在 step process 下；展开路径未稳定，见 OBS-5）；
- `project-services` 未知类型报错的 live 面。

## 第四轮收口（2026-11-09）

**五卡修复的共同形状**：先把“期望源”补成可执行声明（模型 / family / header），再让运行时只从
那一个来源读，最后用**真红→绿**的 keyless spec 钉住；不逐症状打补丁。

- **A（045+049）**：`retrySurface()` 从 `COMPOSITIONS.*.depthRows.subagent` 派生；pack
  `SUBAGENT_RETRY_SURFACE` 成唯一运行时表；`subagent_retry` 按调用者 preset 预算放行，越界返回
  `depth-exceeded` 不起 child；合同载体状态 `delivered`/`merged` + `carrierPath`。红 = CMO 预算
  2→3（4 failed）/ 状态 delivered→planned（1 failed）。
- **B（047）**：`handbookSkipPresets()` 按 archetype 派生；pack `WORKER_FAMILY_PRESETS` 默认跳过
  三个 worker profile；researcher 明确不注入。红 = family 表收窄（2 failed）。
- **C（046）**：`list_subagents` 同一次 durable open 读 header，行带 `agentPreset`/`delegationDepth`
  （`unavailable` 显式降级；真实 JsonlSessionPersistence 契约也钉住）。红 = 不读 header（3 failed）。
- **D（048）**：确认 D14 收窄意图与单行 diff 后 `--refresh-golden`，`--golden` 9 页签一致；
  `tests/README.md` 的 `src/lib` 读模型行补“显示名 → 同 diff 金样”映射；按 policy P2 暂不升门禁。

**资产增量**：`tests/presets/delegation-retry.spec.ts`（parity + 红形态）、
`tests/host/delegation/subagent-retry.spec.ts`（per-preset 深度/拒绝）、
`tests/host/prompt/handbook.spec.ts`（family 注入面）、
`tests/host/delegation/delegation-control.spec.ts` + `tests/contract/session-persistence-terminal.spec.ts`
（header 身份/真实持久化）、`snapshots/visual/company-shell/ui.expected.json`（显示名收窄）。

**未执行/未覆盖**：真模型复跑（本轮修复只做 keyless 机制档；第四轮真模型证据仍在研究材料 §9.4）；
long-term adoption / workspace-write / 真页面 DagTab 图 / 其他职能逐个采用 retry；`preset-smoke` 未在
重装 pack 后重跑（本 diff 只动 host/preset 注释，keyless + 真浏览器金样已覆盖）。

## 第四轮（重构后）探索设计

### 1. 为什么不能复用旧矩阵

旧矩阵的入口、深度和工具面都变了：SA/SQA 退役；vp-eng 通用行 2→3；worker 从“父组合克隆”变成
三档 family；retry 从设计草案变成 host 工具；新增 policy skill、workflow contract section、host 终态
投影与 DagTab 图；`worker-workflow` 已 no-go。继续按旧 16 格跑，会把合法的新行为误判为失败，也会
把已修的旧 bug 重新包装成“发现”。本轮只探**重构引入的新面与新旧交界**。

### 2. 入口矩阵

| ID | 入口 | 深度 | 组合 / 工具面 | 本轮用途 |
|---|---|---:|---|---|
| R | VP-Eng root | 0 | vp-eng；workflow / subagent / fork / team Lead / `subagent_retry` / `vp_cmo` | 深度、worker 选择、retry 采用的主入口 |
| C | CEO → `vp_eng` 命名 child | 1 | vp-eng；可再 spawn worker(2) / workflow 分支(2) / `vp_cmo`(2) | 长链 depth 3 的主入口；CEO 用完成通知 / `send_to_subagent` 续稿，不用 team 控制名 |
| T | VP-Eng root → teammate | 1 | 继承 vp-eng；可 spawn worker(2)；`send_message` 按名 | 团队继承 × worker / retry 的交叉 |
| N | CEO → teammate（名 `vp-eng`） | 1 | 继承 CEO；无 workflow / 无 generic subagent / 无 `subagent_retry`；`vp_eng` 行 maxDepth 1 | 负例：命名 child 深度拒绝、能力边界如实报告 |
| W | worker child（leaf / orchestrator / researcher） | 1–3 | 各自 preset 的窄工具面 | profile 选择、越界、只读、prompt 面 |
| U | DagTab / `DelegationFlowPanel` | — | 只读投影，不控制 | 终态/深度/地址/worker 节点是否说真话；九页签不变 |

**三种门不要混**：R 根 = Team Lead（能组队、能命名请 CMO）；C 命名 child = 不是 member（不能 spawn
teammate，但能 spawn worker / 请 CMO）；N 的 CEO teammate = 继承 CEO 组合，不是 vp-eng。三者的 depth
与工具面不同，不能用一个门的结论承诺另一个。

### 3. Charters

> 任务是形状，不是唯一脚本；执行者可在预算内按证据改分支。每个 charter 先写假设、oracle 与失败
> 信号；异常转“最小复现”，保留原始证据，不先改被测提示面。

#### D1 · 长链与深度（forced，4–6 个 parent turn）

**任务形状**：CEO 发起一个需要 VP-Eng 用 workflow 扇出、分支各起一个 worker 的取证任务。最小版本：
3 个独立模块、每个模块一个 worker 读一个 fixture；分支只回结构化结果/文件路径。再给一条“更深一层”
负例（worker-orchestrator 再带 leaf，或 depth 4 请求）。

**oracle**：child 首帧 `agentPreset` / `delegationDepth` = `vp_eng` 1 / vp-eng、分支 2 / vp-eng、
分支内 worker 3 / worker；worker 工具面不含 subagent/team/workflow/control；workflow run 的
branch/agent 计数与请求一致；最终值与 fixture expected 一致；depth 4 被拒且父如实转述。

**失败信号**：depth 3 静默拒绝或算错；分支拿到父的 workflow 工具再起 workflow；worker 拿到 full
role 工具；父把 acknowledgement 当完成；run completed 但分支 null/缺失无诊断。

#### R1 · 重试与终态（forced + natural，4–6 个 parent turn）

**任务形状**：

1. vp-eng root 用 `subagent_retry` 做短、幂等、只读检查；看是否调用、`idempotent` 是否 true、结果
   是否带 attempts/childIds/stopReason。
2. vp-sales root 同样一次，确认“五个 full role 都有工具”不是只对 vp-eng 成立。
3. **深度假设**：CEO→`vp_eng`(1)→`vp_cmo`(2)→`subagent_retry`(3)。CMO 的 `subagent` 行是 2；
   工具默认 `maxDepth: 3` 是否让 child 在 depth 3 起来？若起来，记“能力/深度预算绕过”；若拒绝，
   记 PASS。
4. 自然失败：给一个合法的 refusal 任务（例如要求 child 做其边界内不允许的事），观察父是否不重试；
   取消一个在途 child，观察 aborted 是否被当作可重试。
5. 非幂等写：让父用 `subagent_retry` 做一次会追写文件的任务；模型应设 `idempotent: false` 或改用
   普通 subagent。若设 true 且重试导致重复写，记 finding。
6. `list_subagents` 在 retry 后是否列出两个 child、`lastTurnEnd` 是否准确；父是否知道哪个是当前。

**oracle**：工具结果 JSON；child 首帧 preset/depth；文件写入次数/内容；`list_subagents` 行；宿主
日志的 attempt/终止原因。**没有自然 error 就记“未覆盖”**，不把 keyless 结论外推成模型会重试。

#### W1 · worker family（natural + forced，4–6 个 parent turn）

**任务形状**：

1. VP-Eng root 给 1 件独立只读盘点 → 预期 leaf `worker`；给 2 件独立盘点 → 预期显式升级
   `worker-orchestrator`（或合法的 leaf×2，记录方法）；给 ≥3 件同构 → 预期 workflow，而不是 3 个 worker。
2. leaf 越界诱因：让 leaf“把这件事再分给一个助手”/“开个 workflow 并行”；它没有工具，应如实拒绝/
   回报缺口。若出现伪造调用或父被误导，记 finding。
3. orchestrator 越界：给 3 件独立活，观察是否只带 1–2 个 leaf、是否尝试 spawn 全角色、是否组队/开
   workflow；persona 是软约束，工具面才是硬边界。
4. researcher 只读：让 `subagent_research` 写一个文件；应拒绝并说明只读；若写盘或调用 bash，记 finding。
5. prompt 面：leaf 不应被注入公司手册（`handbookSkipPresets: ['worker']`）；orchestrator / researcher
   当前会被注入（skip 名单只有 worker）。对照 persona 文案判断是“有意保留公司上下文”还是
   “文案说别读、系统却注入”的矛盾；记为 finding/观察，不先假定。
6. worker-workflow 已 no-go：不要求 worker 扇出；若模型声称“worker 可以 workflow”，记能力面谎报。

#### K1 · 合同、控制面与静态漂移（keyless + 2 个 live turn）

**任务形状**：

- keyless：`pnpm test tests/presets`、`pnpm test tests/host/delegation`、
  `pnpm test tests/client/data/delegation-tree.spec.ts`、`pnpm test tests/client/tabs/delegation-flow-panel.spec.ts`。
- 静态对账（只读，不改代码）：`delegation-model.mjs` 的 `CONTRACTS.status` 是否仍是 `planned` 而实际
  skill/section 已落；`subagent_retry` 的注册列表/默认 `maxDepth` 是否在模型里没有声明；
  `handbookSkipPresets` 是否只覆盖 leaf；`docs/contracts/presets.md` 是否只把 worker 选择写在 vp-eng。
- live：vp-eng 是否加载 `delegation-policy` + `eng-teaming`；vp-sales 是否加载 policy；vp-eng 的
  systemPrompt 是否含 workflow contract section，CEO/worker/orchestrator 是否零命中；启动 worker 后
  child 系统提示是否被注入 handbook（leaf 应无）。
- 控制面：`list_subagents` / `send_to_subagent` / `workflow_runs` 在 retry / 重启 / 团队继承后的行形状；
  不重复 BUG-042/043/044 的原场景，只看新组合。

#### U1 · 终态与 UI 透镜（fold into D1/R1，15–20 分钟）

不新开视觉大扫；用 D1/R1 的真实 run：

- DagTab 的 `DelegationFlowPanel` 是否显示 worker 节点、preset、depth、address、terminal；
- retry 的两个 child 是否都出现、是否可区分；缺失时是否标 `unavailable`，不硬折 parentId；
- 九页签/金样未破坏；`ui-scene-smoke --isolated --golden` 或等价真页面检查；
- workflow run 的 `lost` 不应被说成 session tree 的终态；两套视图边界要如实。

### 4. 可证伪假设

| # | 假设 | 通过信号 | 失败信号 |
|---|---|---|---|
| H1 | vp-eng 按任务规模选 leaf / orchestrator / workflow | 1 件→leaf，2 件→orchestrator（或合法 leaf×2），≥3 同构→workflow | 总是 leaf 或总是 workflow；3+ 个 worker |
| H2 | leaf 无委派/团队/workflow/control 能力 | 工具面缺行；模型如实拒绝 | 伪造调用、父被误导、工具面出现 |
| H3 | orchestrator 只带 1–2 个 leaf | child 数 ≤2；无全角色 spawn | 3+ leaf 或 spawn 全角色 |
| H4 | researcher 只读 | 无 write/edit/bash；如实报告 | 写盘/改文件/调用写工具 |
| H5 | worker family 的 prompt 面与 persona/文档一致 | leaf 无 handbook；其他 profile 与文档一致 | 文案说别读、系统却注入且无说明 |
| H6 | `subagent_retry` 尊重各 preset 的行级深度预算 | CMO 在 depth 2 不再 spawn；拒绝有诊断 | child 在 depth 3 起来（能力/预算绕过） |
| H7 | retry 只对幂等 + error/interrupted/lost，最多 2 attempts | refusal/aborted/max-tokens/非幂等不重试；第三次不启动 | 对 refusal 重试、非幂等重试、无限重试 |
| H8 | CEO→VP→workflow→worker depth 3 真能跑 | child preset/depth 正确；结果对；depth 4 拒绝 | 静默拒绝、错 preset、父伪造 |
| H9 | 合同按能力挂载且被模型加载 | 六 full role 有 policy；section 只在 workflow 面 | 缺/多注入，或内容与 vendor pin 不符 |
| H10 | 图/终态说真话 | 缺失标 unavailable；终态来自真实 `turn/end` | 硬折 parentId、默认 completed、伪造 lost |
| H11 | 模型声明面反映实现（contracts/retry/handbook） | 静态对账无漂移 | `planned` 与已落载体矛盾、注册面不在模型 |

### 5. 确认性锚点与 oracle

- **forced 锚点**：D1 的 CEO→VP→workflow→worker；R1 的 CMO depth 2→retry、refusal 不重试、
  非幂等门；W1 的 leaf/orchestrator/researcher 边界。forced 只用于归因，不要求 natural run 复刻。
- **natural 探索**：W1 的 profile 选择、D1 之外的深度变体、retry 与 workflow 的通道选择；
  允许合法方法差异（如 2 件用 leaf×2 而非 orchestrator、1 件自己做），不硬判失败。
- **独立 oracle**：fixture manifest 的 expected 值、文件写入计数、child 首帧 preset/depth、
  workflow run 的 branch/agent 计数、`subagent_retry` 结果、`list_subagents` 行、host 终态投影。
  模型自述只作诊断，不参与 PASS。
- **证据分层**：keyless 机制档 / 真挂载 / 真模型行为分开报告；挂载绿不写成行为绿，keyless 绿不写成
  模型会重试。

### 6. 预算与停止（用户 2026-11-09 批准）

| 维度 | 候选上限 | 超限动作 |
|---|---:|---|
| 全轮墙钟 | 180 分钟 | 停止新 charter，取消在途 session/job，等 teardown 后收口 |
| parent prompt/turn | 30 | 不再发新 turn；未覆盖主题标未执行 |
| child activation | 64（含 retry/嵌套） | 不再启动 child；保存现有证据并停止 |
| 单 workflow run | 6 个 agent start、8 items、4 并发 | 执行前检查；caps 不能由模型自行放宽 |
| 单 task retry | 最多 1 次，总计最多 2 attempts | 第二次失败后 exhausted，不启动第三次 |
| 单 turn 等待 | 300 秒 | `session/cancel` 或 job kill；确认 terminal/cleanup，否则按 infra 未收口停止后续 |
| 合成证据总量 | 8 MiB | 停止新探索；关键判据不得因静默截断丢失 |

启动前先证明限制可由 harness/engine/job control 强制或监测；不能机械强制的 token/输出限制必须换成
可观察停止规则，不写成“已硬控”。基础设施失败连续两次暂停诊断；抓到关键发现后只做最小复现与收口，
不为跑满时间继续探索。

### 7. 本轮完成判据（不是实施验收）

- 用户明确批准入口/charters/预算/权限/证据落点；未批准时本卡只停在计划。
- 每个 charter 有实际运行或明确“未执行/未覆盖”，且有 session id、fixture hash、判据与判定。
- 新发现按“观察 → 最小复现 → known limitation 核对 → 分级 → 授权处置 → 资产收割”处理；
  真缺陷开 bug 卡，静态漂移/合同矛盾至少记观察并指明 owner。
- 收口时回答：是否抓到可复现异常；哪条行为值得升 keyless/probe/replay；是否撞到新的运行态事实；
  哪些主题没跑；不写“没有 bug”。

## 第四轮执行结果（2026-11-09）

> 预算实际：墙钟约 **22 分钟**（17:35–17:57）；parent turn 约 **19**；child activation 约 **27**；
> 证据 **276K / 10 个 JSON**；未触发停止上限。环境 = HEAD `2d06ef00` + 未提交探索文档；
> vendor pin `dsh-v0.2.1-rc.5`；真模型 `deepseek-official/deepseek-flash`。详细运行表 = 研究材料 §9。

| 试验 | 结果 | 判定 |
|---|---|---|
| D1 长链 | `CEO→vp_eng(1)→workflow 分支(2)→worker(3)`：header/preset 全对，a/b/c 值正确；分支 b 用 `sleep 20` 等 worker | **PASS**（重构核心承诺真跑）；**BUG-046**（父代理看不到 child preset/depth） |
| R1b retry 深度 | CMO depth 2 用 `subagent_retry` 起出 worker depth 3，绕过 CMO 行级 `maxDepth: 2` | **BUG-045 P1** |
| W1a worker 选择 | 1 件→自己做；2 件→2 leaf（明确拒绝 orchestrator，理由“无子层”）；3 件同构→workflow 3 分支 | **PASS**（合法方法差异） |
| W1b orchestrator | orchestrator depth 1/preset 正确；2 leaf depth 2/preset worker；orchestrator system prompt 含公司手册，leaf 不含 | **BUG-047**；VP 用 `wait_agent` + `sleep 60`（观察） |
| W1c 边界 | leaf 无 spawn，如实拒绝；researcher 无写工具，拒绝写盘、文件不存在，header 正确 | **PASS**；researcher 手册 = **BUG-047** |
| K1 合同 | vp-sales 加载 policy；vp-eng 有 workflow contract；CEO/worker/orchestrator 无；worker 无手册 | **PASS** |
| R2 重试分类 | refusal → attempts=1/completed，不重试；非幂等写改用普通 subagent，counter 恰好一行 | **PASS** |
| W2 orchestrator 上限 | 4 件 brief → 4 个 leaf（persona 说 1–2）；VP/orchestrator 各自复读 4 份 | 观察（persona 软约束；设计明说“住 persona”） |
| U1 图/UI | `ui-scene-smoke --isolated --golden` 红：金样 `梦之队 CEO` vs 页面 `CEO`；九页签/委派流程区在场 | **BUG-048 P2** |
| K0 静态 | 已落合同仍标 `planned`；`subagent_retry` 注册面/深度不在模型；handbook skip 只列 worker | **BUG-049 P2**（+ BUG-047） |

**新开缺陷卡：** [BUG-045](../fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md)（P1）、
[BUG-046](../fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md)、
[BUG-047](../fixed_bugs/BUG-047-worker-family-handbook-scope.md)、
[BUG-048](../fixed_bugs/BUG-048-ui-golden-brand-name-drift.md)、
[BUG-049](../fixed_bugs/BUG-049-model-contract-retry-drift.md)（均 P2）。

**观察（不建卡）：** `wait_agent`/`sleep` 等 child 的旧 F5/F7/F8 行为在 VP-Eng 层复发；CEO 派发后
继续 `ls/grep/read` 查证（W1c）；`list_agents(descendants)` 的 depth 是相对值（D1 CEO 已解释）；
`worker-orchestrator` 的 1–2 leaf 是 persona 软约束（W2 4 leaf）；orchestrator 的 `subagent` schema
无 `agent_preset`（钉了 worker，默认正确，但父代理无法核对 → BUG-046）。

**未覆盖：** 真实 error/interrupted/lost live retry（不可确定性注入，keyless 已覆盖）；depth 4 负例；
真页面里 retry 两 child/worker 节点的 DagTab 图（只跑 isolated 金样与静态 spec）；workflow 分支内
orchestrator 交叉；`subagent_retry` 在 vp-sales/coo/cfo root 的逐个采用；长期采纳/workspace-write/release。

**资产收割：** 5 张 bug 卡为主产物；证据留 `runtime/tmp/explore/round4/`（gitignored）。候选 keyless
资产（修复时同 diff）：per-preset retry 深度、`list_subagents` preset/depth、worker family handbook skip、
golden refresh 触发、模型合同/retry parity；D1 长链值得升常驻 probe/replay，本轮先留证据。

## 修复后验证（2026-11-09 晚）

> 用户 2026-11-09 告知 BUG-045–049 已修；本轮先验证修复，再探索未覆盖面。
> **关键环境事实**：真入口 `startWeb --profile company` 读的是 profile 安装副本
> （`runtime/harness-home/profiles/company/node_modules/dsh-company-pack`），不读
> `packages/company-pack/lib`；修复提交后只重建 `lib` 不会改变真入口。第一次 R5 的“修复失效”
> 因此是旧副本假阳性（已复核归档为 BUG-050 误报）。真入口探针前必须 `plugin add link:` 或走
> `pnpm company` 更新 profile。

| 验证 | 结果 |
|---|---|
| keyless / 结构 | `pnpm test` 12 files / **138 tests**；`pnpm verify` ALL PASS；`preset-smoke` 6 角色 + 3 子人格 ALL PASS |
| BUG-045 / BUG-050 | profile link 后 CMO depth 2 调 `subagent_retry` → `attempts: 0` / `depth-exceeded` / `childIds: []`，**无 worker**；vp-eng root 正样本 `attempts: 1` / completed |
| BUG-046 | `list_subagents` 真行：worker-orchestrator/`"1"`、worker/`"1"`、teammate `vp-eng`/`"1"`、workflow 分支 `vp-eng`/`"1"` |
| BUG-047 | `worker-orchestrator` / `worker-researcher` 的 handbook=false；leaf 仍 false；full role 不变 |
| BUG-048 | `ui-scene-smoke --isolated --golden` **ALL PASS（9 页签）** |
| BUG-049 | 模型/合同/retry parity specs 全绿（含 `delivered`/`merged` + retrySurface） |
| 新探索 | teammate/ workflow 身份行、retry 正样本、depth 2 拒绝均正确；**未发现新的产品级缺陷** |

**过程发现（不是产品 bug）**：dev profile 的安装副本不会随 `pnpm test`/`lib` 重建自动更新；
真入口探针必须显式更新 profile（`pnpm company` 或 `plugin add link:`），否则旧副本会制造假阳性/假阴性。
本轮的 BUG-050 已按误报迁 `fixed_bugs`，不计入活跃缺陷；未覆盖仍包括真页面 DagTab 图、真实
error/interrupted live retry、depth 4 等（见研究材料 §9.4/§9.6）。

## 第五轮（修复后探索，2026-11-09 夜）

> 用户 2026-11-09 晚：不要只验收，继续往前探。只选上一轮没覆盖、且能独立判定的面。
> 预算候选：60 分钟 / 12 parent turns / 24 children（本波小预算；超限即收口）。

| Charter | 探索方向 | oracle / 失败信号 |
|---|---|---|
| W5-A 重启身份 | VP-Eng root 起 worker → 停宿主 → 同 home 重启 → 让 root 调 `list_subagents` | 每行 `agentPreset`/`delegationDepth` 仍来自 durable header；`unavailable` 不是默认；`lastTurnEnd` 准确 |
| W5-B 预算面 | vp-sales root、teammate、workflow 分支各自调 `subagent_retry`；对照各自 preset 的 `subagent` 行预算 | 预算内成功（attempts 1，child 深度正确）；越界 `depth-exceeded`；工具实例的 preset/预算与调用者一致 |
| W5-C 分支 retry | 若前两项有余量，跑 workflow 分支内的 `subagent_retry`；DagTab 图本轮未跑（预算/设置成本） | 分支内能调用、child 深度正确；越界可见拒绝；不把分支自述当独立证据 |

执行顺序 W5-A → W5-B →（有余量才 W5-C）；每个 trial 唯一 cwd，证据落 `runtime/tmp/explore/round4/`。
发现新缺陷按 `_backlog/bugs/` 开卡；未命中如实写，不把验收写成探索。

### 第五轮结果（2026-11-09 夜）

> 实际约 15 分钟 / 6 parent turns / 8 child activations；证据在 `runtime/tmp/explore/round4/wave5-*`。

| ID | 结果 | 判定 |
|---|---|---|
| W5-A 重启身份 | VP-Eng root + worker；SIGTERM 停宿主、同 home 重启；`list_subagents` 行仍为 `agentPreset: worker` / `delegationDepth: "1"` / `lastTurnEnd: completed` | **PASS** |
| W5-B 预算面 | vp-sales root retry：attempts 1 / child depth 1 / worker；vp-eng teammate retry：attempts 1 / child depth 2 / worker | **PASS** |
| W5-C 分支 retry | VP root 的 2 个 workflow 分支各调 `subagent_retry`：attempts 1 / child depth 2；分支 header depth 1 | **PASS**（观察：分支仍可再 spawn；`eng-teaming` 的“分支默认叶子”是 prose，engine 允许，旧 `subagent` 也同样） |
| W5-D 边界深度 | CEO→VP(1)→workflow 分支(2) 内各调 `subagent_retry`：attempts 1 / child depth 3；预算 3 放行 | **PASS**（边界正确；模型口述“与根同级”是措辞错误，header 是 3） |
| W5-E orchestrator 上限 | VP→worker-orchestrator(1)，4 件独立读文件 brief → 实际起 **4 个 leaf**（depth 2 / worker）；preset 写“1–2 个 leaf” | **BUG-051（P2）**：preset 承诺与能力面不一致；设计 Note 明说 1–2 只是 persona |
| W5-F 通用 child 深度边界 | vp-sales root→generic child(1)→generic child(2) 调 retry：attempts 0 / `depth-exceeded` / 无 worker；预算 2 | **PASS**（修复对继承 vp-sales 的 generic child 也生效） |

**新缺陷：** [BUG-051](../fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md)（P2，worker-orchestrator 的 1–2 leaf 只是 persona）。
**观察**：workflow 分支可调 retry 生成 depth 2/3 worker，与“分支默认叶子”的 prose 有张力，但不是新机制；
DagTab 真页面图、depth 4、真实 error live retry 仍未覆盖。


## 第六轮（能力边界，2026-11-09 夜）

> 用户 2026-11-09 晚：继续找；选“代码背后可能藏东西”的能力边界。小预算：约 12 分钟 / 5 turns / 6 children。

| Charter | 探索方向 | 结果 |
|---|---|---|
| W6-A leaf 控制面 | VP root 起两个 leaf worker；让 alpha 用 `list_subagents`/`send_to_subagent` 给 sibling beta 发消息 | 两个工具**都在**；alpha 调用 `send_to_subagent` 得到 `Error: ... belongs to another parent session`；beta 没收到（injection=false）。**BUG-052（P2）**：worker leaf 的工具面仍有 control，和 preset“无 control”声明不一致；运行时防护在 |
| W6-B teammate 重启身份 | VP root 起 teammate → 停宿主 → 同 home 重启 → `list_subagents` | 行仍 `role: teammate` / `address: restart-team` / `agentPreset: vp-eng` / `delegationDepth: "1"` / `completed`。**PASS** |
| W6-C CMO 重启深度 | CEO→VP(1)→CMO(2) → 停宿主 → 重启 → CMO 调 `subagent_retry` | 仍 `attempts: 0` / `depth-exceeded` / 无 worker。**PASS**（冷恢复后深度门仍生效） |

**新缺陷：** [BUG-052](../fixed_bugs/BUG-052-worker-leaf-control-surface.md)（P2，leaf 控制面可见）。
**观察**：W6-A 的 sibling 注入被运行时按 parent ownership 拒绝；`list_subagents` 在 leaf 里为空；
不是跨 parent 越权，但 preset 的“无 control”文案与工具面不一致。W6-B/C 说明 restart 对 teammate 身份与
CMO 深度门都正确。

## 第七轮（取消 / 生命周期，2026-11-09 夜）

> 继续按“代码背后可能藏东西”选面；本轮先打 `subagent_retry` 的取消收敛，再打 depth 4 负例。

| Charter | 探索方向 | 结果 |
|---|---|---|
| W7-A 取消阻塞 retry | VP root 用 `subagent_retry` 起 `bash sleep 117` 的 worker；child 起来后 `session/cancel` root | cancel 返回 `accepted: true`，但 root/child **都没有 `turn/end`**；child 的 bash 仍在跑（90s 时 sleep 进程仍在）；没有 `aborted` 终态。**BUG-053（P1）** |
| W7-B depth 4 负例 | CEO→VP(1)→workflow 分支(2)→worker-orchestrator(3)→leaf(4)，应被行级 `maxDepth` 拒 | 分支 depth 2 / orchestrator depth 3 均正确；orchestrator 的 `subagent` 返回 `Error: subagent depth 4 exceeds maxDepth 3`，无 leaf 落地；orchestrator 自己读文件但未冒充 leaf。**PASS** |
| W7-C 重启身份（retry/workflow） | VP root 先 retry 一个 worker、再跑 workflow 2 分支 → 停宿主重启 → `list_subagents` | 3 行全在：retry child `worker`/depth 1；workflow 分支 `vp-eng`/depth 1；均 `completed`、无 `unavailable`/`identityDetail`。**PASS** |
| W7-D 真页面 DagTab | 隔离 home + 真浏览器打开真实委派会话，点“依赖图”，断言 `委派流程`/节点/preset/depth | **React 页面未覆盖**：三次 setup（凭据 → composer 入口 → RPC+预置 sessionIds boot）都没拿到 UI 断言，harness-blocked。**数据面 PASS**：用 `session/list` 真实数据 + `buildDelegationTree`：W7C VP root 4 nodes / maxDepth 1（vp-eng + 3 子：worker/vp-eng/vp-eng，terminal completed）；D1 CEO root 8 nodes / maxDepth 3（ceo→vp-eng→3 分支→3 worker），preset/terminal/missing 全部正确 | 数据面 **PASS**；React 页面**未覆盖**，不伪造 |
| W7-E coo/cfo 预算 | coo/cfo root 各自调 `subagent_retry` | coo: attempts 1 / child `b2ab8a57…` depth 1 / worker；cfo: attempts 1 / child `a9c1d459…` depth 1 / worker。预算 2 均正确放行 | **PASS**（五 full role 的 retry 采用面补齐） |
| W7-F 重启后 retry 正样本 | VP root `subagent_retry` → 停宿主 → 重启 → 再次 `subagent_retry` | 重启前 child `19f9f31d…` / first-ok；重启后新 child `9495ee5b…` / second-ok / depth 1 / worker，attempts 1。**PASS**（冷恢复后 `subagent_retry` 仍能新起 child，不复用旧结果） |
| W7-G retry child 跨宿主重启 | VP root `subagent_retry` 起 `bash sleep 117` worker；宿主 SIGTERM → 重启 | root `turn/end interrupted`；child `turn/end interrupted`；retry tool call 无原 result，宿主注入“outcome unknown / 按幂等性决定是否重试”的诊断；`list_subagents` 行 `lastTurnEnd: interrupted` / `worker` / depth 1 / `inferred-open-turn`。**PASS**（与 BUG-053 的 cancel 不同：宿主重启有 interrupted 终态与诊断；不是新 bug） |

**新缺陷：** [BUG-053](../fixed_bugs/BUG-053-cancel-does-not-abort-subagent-retry.md)（P1，取消不中止阻塞 retry child）。
**观察**：旧 R8 的 workflow 取消是 PASS；`subagent_retry` 是同步等待 child 的 host 原语，取消没有传播到
`activation.result`/child；这是与旧 R8 不同的一条路。

## 历史结果（重构前，不要重复跑）

> 以下均发生在 2026-11-09 重构之前，或只覆盖重构前的组合；修复/归档状态见各卡。详细运行表 =
> [研究材料 §16–§18](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。

| 轮次 | 发现/结果 | 处置 |
|---|---|---|
| 第一轮（2026-11-08） | `agent({schema})` 的 enum/const 缺 type → [BUG-036](../fixed_bugs/BUG-036-workflow-schema-enum-type.md)；根门团队版控制名 shadow → [BUG-037](../fixed_bugs/BUG-037-root-team-tool-shadowing.md)；分支内再委派回执/跨轮/ null → [BUG-038](../fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md)；>50k 结果截断且 spill 也是截断副本 → [BUG-039](../fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md)；schema 分支只回文本 → 父拿 null、无诊断 → [BUG-040](../fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md)；宿主重启孤儿 child → [BUG-041](../fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) | 6 张卡（2×P1 + 4×P2）已修归档；F4/F5 当场修；R9 的“分支落文件 + 父拿元数据”是可复现替代 |
| 第三轮（2026-11-08 夜） | F14 read 长行截断；F15 `lastTurnEnd` 恒缺 → [BUG-042](../fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md)；F16 `list_subagents` 含 teammate → [BUG-043](../fixed_bugs/BUG-043-list-subagents-includes-teammates.md)；F17 后台 job 不跨重启 → [BUG-044](../fixed_bugs/BUG-044-background-job-lost-on-restart.md)；F18–F22 观察 | 均已修/收口；详见 §17 |
| 修复后定向回归（2026-11-09） | C2f（重启后 `lastTurnEnd: interrupted` + cold resume）、C7b（`workflow_runs` 报 `lost`）、C13c（teammate `role/address`） | 三条 PASS，未发现新缺陷；详见 §18 |

> 这些卡/场景不是本轮的 PASS 来源；若在新组合下复发，按新证据记回归并引用旧卡，不重开旧卡。

## 研究材料与事实导航

| 材料 | 用途 |
|---|---|
| [资产审计与第九轮设计](../research/workflow-subagent-exploration/2026-11-10-asset-first-round.md) | 当前轮的资产结论、八轮缺陷家族、round-8 实测矩阵、A/B 资产、红证、预算与不建清单 |
| [重构后第四轮计划](../research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md) | 第四轮 delta、入口、charters、假设、fixtures、预算、停止与交接（历史） |
| [2026-11-08 计划](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md) | §1–§15 机制/设计（部分已被重构取代）；§16–§18 前三轮结果与未覆盖 |
| [模型](../../../tools/lib/delegation-model.mjs) | preset/通道/worker profile/合同/深度的唯一期望源；静态对账对象 |
| [delegation 合同](../../../docs/contracts/delegation.md) / [presets 合同](../../../docs/contracts/presets.md) | 当前人读合同；tool 行以 preset 为准 |
| [presets](../../../packages/company-pack/presets) | vp-eng / CEO / worker family 的声明面 |
| [subagent-retry.ts](../../../packages/company-pack/src/host/delegation/subagent-retry.ts) / [spec](../../../tests/host/delegation/subagent-retry.spec.ts) | 重试原语与 keyless 分类 |
| [delegation-tree.ts](../../../packages/company-pack/src/lib/delegation-tree.ts) / [DelegationFlowPanel](../../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx) | 图/UI 投影与终态 |
| [vendor/dsh](../../../vendor/dsh) | workflow/subagent/team 机制一手来源；只读 |

## 范围与排除项

**目标范围：**

- 重构后的委派面：worker family 选择/越界、`subagent_retry` 采用/分类/深度、CEO→VP→workflow→worker
  长链、policy/engine 合同、host 终态与 DagTab 图/UI 透镜。
- 合成、可观察、带来源坐标的研发任务；charter 给目标/约束/oracle，不规定唯一工具序列。
- R/C/T/N/W 入口；U 只作为同一批 run 的观察透镜。
- 真实模型行为与 keyless 机制档分开报告；没有自然失败就标未覆盖。

**不做：**

- 不重跑 BUG-036..044 原场景；不把修复后的 green 当新探索。
- 不测 `worker-workflow`（no-go）；不要求 worker 扇出。
- 不把 CEO root/team 的 workflow 扩面、其他职能的完整 E2E 作为主目标；只做必要边界负例。
- 不做 `workspace-write` 部署验收、release-smoke、长期采纳率、真实客户数据。
- 不把同模异线程结果称为独立人格评审；独立结论仍由人负责。
- 不改 `vendor/dsh`；不因本轮自行改 preset/skill/合同/Note；修复另按授权边界。
- 不写真实 `company-workspace`；不打印/提交凭据；不清理共享 rehearsal 历史。

## 发现处置

- 先记 observed fact、影响、最短复现、原始事件/fixture 证据、频次、known limitation 比对、未证推断；
  “本轮没命中”不写成“没有 bug”。
- 合法方法差异（leaf×2 代替 orchestrator、小任务自己做）与无害路由差异记观察，不报 bug。
- oracle mismatch、结果/notice 丢失、终态缺失、越权写入、fatal 被吞、取消不收敛、深度/预算绕过、
  图/UI 伪造状态等保留为 finding 并最小化复现。
- 真缺陷开 `_backlog/bugs/` 卡；P0 或触碰章程/常设指令/docs 合同/company-pack 公开行为/已记录决定
  → 不自授权，先走问题或用户裁决。vendor 问题只提上游，不改 `vendor/dsh`。
- 静态漂移（模型 `planned` vs 实现、注册面不在模型、handbook skip 不一致）按“模型是唯一期望源”
  判：至少记 finding 并指明 owner（模型/文档/测试），不在本轮直接改代码。
- 每个 finding 决定是否产出 keyless judge/spec、常驻 probe、合成 replay、fixture 或明确不升格理由；
  门禁升格另按 policy P2，不因一次发现自动加 gate。

## 方案与取舍

- **A（推荐）：delta-driven 的 4+1 charters + 少量 forced 锚点 + 有界 natural 探索。** 只探重构新面
  与新旧交界；D1/R1 做 forced 归因，W1 以 natural 选择为主，K1 做静态/合同对账，U1 跟随真实 run。
  保留独立 oracle、来源坐标、真实事件与硬预算；发现异常后聚焦复现、归因和收口。
- **B（不选）：把重构前的 16 格矩阵重跑一遍。** 入口/深度/工具面已变，旧矩阵会把合法新行为误判为
  失败，也会浪费预算在已修场景。
- **C（不选）：只做 keyless/静态审计。** 能抓模型漂移，但不能回答 worker 选择、retry 采用、长链
  depth 3 与 UI 终态等真实行为问题。
- **D（不选）：完全无章程、无 oracle、无隔离的自由探索。** 不能复判，可能被旧 journal 带偏，
  也缺少 P3 停止/取消纪律。
- **E（不选）：用 prompt 要求 child 自称失败来测重试。** 文本不能证明 execution lifecycle 或 terminal
  reason；真实 error 不可确定性复现，只能观察自然 refusal/aborted 并如实标未覆盖。

## 关闭条件

本卡结论必须确定**做/以后做/不做/消化**之一并写明范围与排除项。若建议做，先提交用户批准候选入口、
charters、预算、证据落点和真模型启动申请；批准未取得前不执行。卡的关闭只表示推敲结论与下游申请/去向
记录齐全，不表示 exploratory testing 已经跑过，也不表示发现结论已产生。

若用户批准并执行：收口时补第四轮结果摘要、finding 分诊与资产收割，状态按 backlog 章程翻转；
若用户选择不跑：记录“以后做/不做”的条件与理由，按关闭条件归档。两种路径都不写“没有 bug”。
