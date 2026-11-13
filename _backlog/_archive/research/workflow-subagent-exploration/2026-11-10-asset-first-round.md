---
topic: 探索测试的测试资产审计与第九轮「资产先行」设计
intent: 回答「继续探索前要不要先补资产」——用八轮缺陷家族、第八轮摩擦账、现有资产盘点与 round-8 日志实测矩阵，给出资产清单、红证、成本、不建清单与 live 预算；消费者 = bug-hunt 问题卡 §9
---

# 2026-11-10 · 资产先行：探索测试资产审计与第九轮设计

> 性质：**资产审计 + 计划**，不是执行结果。真模型 live 面未跑；实测数据全部来自
> round-8（2026-11-10 17:10–18:00）已落盘的会话日志，只读、零模型。
> 消费者：[bug-hunt 问题卡](../../settled_issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md) §9；
> 落地决定 = [探索测试的资产策略 Note](../../../../notes/implemented/2026-11-10-exploration-asset-strategy.md)。
> 上游材料：[2026-11-08 plan](2026-11-08-exploration-plan.md)、[2026-11-09 plan](2026-11-09-post-refactor-round.md)。
> 当前基线：HEAD `02bf9607`（2026-11-10）；vendor pin `dsh-v0.2.1-rc.5`。

## 0. 一句话

八轮下来，**找 bug 的瓶颈已经不是"再跑一个场景"，而是"把声明面与运行时面对上"和"把一次真跑变成可复判的证据"**；
所以第九轮先补三个无模型资产（运行时面矩阵 judge、会话证据包、UI 全文证据），再用它们跑一个缩小的 live 轮。

## 1. 结论

1. **先补资产，不是先跑一轮。** A 批（无模型、可自证红绿）先做；B 批 live 等用户批准预算。
2. **最该补的是运行时面矩阵**：20 张有效委派面缺陷卡里 8 张是「声明/可观测面 ≠ 运行时面」，而当前
   `model ↔ YAML` 有 keyless 对账、`YAML ↔ runtime` 没有矩阵。矩阵补的就是这一环。
3. **第二是证据包**：第八轮取证靠手解 zstd、按 probe 各写一份 child header 读取；这不该每轮重付。
4. **第三是生命周期注入**：cancel/restart 类（041/044/053）只能靠真进程信号，不能靠 keyless；
   现有 `subagent_retry` 探针只证正样本，不证取消收敛。
5. **不建 replay / 文档散文门禁 / 命令宿主夹具 / 每 bug 常驻 probe**：理由见 §8。
6. **资产标准是"红过、省时、不假阳"**，不是数量。原型在未校正指标映射时报了 12 条假阳性；
   校正后在 round-8 的 47 条观察上 0 硬问题——这正说明 judge 的入口/指标映射必须先钉死。

## 2. 证据一：八轮缺陷家族

委派面相关缺陷卡 = BUG-036–056（21 张，扣除 BUG-050 误报后 20 张）。按根因归类：

| 家族 | 卡 | 数量 | 适合的资产 |
|---|---|---:|---|
| 声明面 ↔ 运行时面 | 037 root team shadow、043 list_subagents 含 teammate、045 retry 深度绕过、046 父看不到 preset/depth、047 handbook 范围、049 合同 `planned` 漂移、051 orchestrator 件数、052 worker leaf control | 8 | **运行时面矩阵** + 静态 model/YAML 对账 |
| 生命周期 / 终态 | 041 重启孤儿、044 后台 job 丢、053 cancel 不 abort | 3 | **故障注入 lane** |
| 结果 / 截断 / 渲染 | 036 schema enum、038 分支嵌套回执、039 截断丢失、040 schema 文本丢、042 lastTurnEnd 缺 | 5 | 已有 keyless/引擎档；矩阵不覆盖 |
| 资产 / 环境 parity | 048 UI 金样漂移、050 dev 副本误报、054 dev kb 缺行 | 3 | 证据包 + 安装面 smoke（已有） |
| 内容 / 机械锚 | 055 任务书缺字段、056 裁决 hash 尾换行 | 2 | 内容 spec（已有） |

**读法**：8/20 集中在「声明/可观测 vs 运行时」——这正是矩阵的射程；3/20 生命周期——只能真进程；
其余是引擎/内容/环境，已有各自 owner。第九轮不该把预算再花在 happy path 或已修场景上。

## 3. 证据二：第八轮的摩擦账（2026-11-10）

| 事实 | 数字/症状 | 资产含义 |
|---|---|---|
| 预算 | 20 条 parent prompt（批 16）、22 child、50 分钟、1 workflow、1 质量环 + 1 次 verify-only 复跑 | prompt 超支主要来自 UI 对照与复跑；不是 charter 本身 |
| UI 卡 | 4 条 prompt 对照 coo/cfo/vp_eng，仍看不到角色卡标签（OBS-5） | `cdp-probe --ask` 只留 transcript 尾 450 字；需要**全文/DOM 证据** |
| 命令 | `/req check` live 被 `dataBlocked`（无 workspace/lease） | 不是产品类型问题；keyless 已覆盖解析，live 宿主夹具 ROI 低 |
| 成员会话 | `session/page` 读不到 team member，只能解盘上 `session.v4.jsonl.zstd`（OBS-1） | 证据包应直接读盘、显式 `unavailable` |
| 质量环 | 首次 300s 截断在 verify；复用产物只跑 verify 才写出 verdict；audit 因 hash 尾换行 FAIL | 生命周期/验收锚需要独立证据；不是矩阵射程 |
| 取证 | 3 个 probe 各有一份 `rawHeader`/`readChild`；卡内证据靠手抄 session id 与 JSON 片段 | 证据包 + 一条命令出 markdown |
| 真页面 | `client-load-smoke`/shell golden 全绿；DagTab 真页面未定位入口（W7-D harness-blocked） | UI 证据要分层，不把 shell 绿写成卡片绿 |

## 4. 证据三：现有资产盘点

| 层 | 现有 | 证明什么 | 缺口 |
|---|---|---|---|
| keyless | 170 files / 1409 tests；`tests/presets/delegation-composition.spec.ts` 把 model ↔ YAML 钉住；`req-command.spec` 覆盖产品类型解析 | 声明面自洽、纯逻辑、静态渲染 | **YAML ↔ runtime 没有矩阵** |
| 装配 smoke | `preset-smoke`（11 preset 挂载）、`client-load-smoke`、`ui-scene-smoke`（9 页签/金样） | 真挂载、零失败、壳文本 | 不证运行时工具面/身份/生命周期 |
| 机制 smoke | `delegation-smoke`（CEO 工具目录 + 1 次委托 + child 面）、`workflow-contract-smoke` | 模型可见边界 | 只覆盖 CEO/vp-eng 一条链 |
| probe | 60+ 个（team/fs-taskboard/browser-visual/session-context） | 单点机制/边界 | 场景各写一份；child 读取重复 3 份；无统一证据包 |
| 审计 | `quality-loop-audit`（含 `--self-test`）、`deliverables-check`、`journal-audit` | 真盘判据、离线复判 | 没有「运行时面」审计 |
| replay | `replay-smoke`（仅 foundation 合成场景，不加载 company-pack） | 会话级重放管线 | **不能**回放 company 会话；别为此新建资产 |
| 金样 | `snapshots/visual/company-shell/ui.expected.json` | 隔离空壳 9 页签 | 不含会话/卡片数据面 |

## 5. 证据四：round-8 日志实测矩阵（只读原型）

> 方法：解 `runtime/harness-home/sessions/**/session.v4.jsonl.zstd` 首帧（preset/depth）+
> `request/header`（tools）+ `system/message`（handbook/workflow 合同）+ `user/message` 的
> `source.kind='skill-catalog'`（catalog）。窗口 = 2026-11-10 17:00 后；47 条有 header 的观察，27 个 child。
> 原型是 `/tmp` 只读脚本，未入库；下列数字用于可行性判断，不是回归资产。

| 入口 | preset | 工具数 | catalog | handbook | workflow 合同 |
|---|---|---:|---:|---|---|
| CEO root / CEO member | `ceo` | 80 / 80 | 4 | 有 | 无 |
| CEO→`coo` / `cfo` named child | `coo` / `cfo` | 71 | 4 / 4 | 有 | 无 |
| vp-eng root | `vp-eng` | 81 | 7 | 有 | 有 |
| vp-eng named child / workflow 分支 | `vp-eng` | 75 | 7 | 有 | 有 |
| vp-eng team member | `vp-eng` | 81 | 7 | 有 | 有 |
| worker leaf | `worker` | 21 | 0 | 无 | 无 |
| producer root / child | `quality-loop-producer` | 31 / 22 | 6 | 无 | 无 |
| verifier root / child | `quality-loop-verifier` | 28 / 19 | 6 | 无 | 无 |

**可由日志直接判定的不变量（原型已跑）**：

- `genericSpawn` ⇔ `subagent`；`fork` ⇔ `subagent_fork`；`workflow` ⇔ `workflow`；
  `control` ⇔ `send_to_subagent`（仅对 **one-shot named child / 分支**；root/member 有宿主面，另判）。
- `subagent_retry` ⇔ 有 generic `subagent`；CEO/worker/support 均无。
- `namedDelegates` ⊆ tools；CEO 的 `coo`/`cfo` 在 2026-11-10 后在场。
- handbook 在场 ⇔ preset ∉ `handbookSkipPresets()`（当前 5 个：3 worker + producer/verifier）；
  标记 = `Company content (read-only):`。
- workflow 合同在场 ⇔ `workflow` 工具在场；标记 = `Workflow engine contract`。
- skill catalog = preset `skills/` + 声明引用的 `_shared` 根 + `<DSH_HOME>/company/methods/<preset>/`；
  4–7 项，零模型可读。
- **root − named child** = 9（support：6 个团队协作 + 3 个控制）或 6（vp-eng：控制已在 preset，
  只差 6 个团队协作）；**team member = root**（继承 Lead 组合）；**workflow 分支 = root − 6**。
- 原型在**校正入口/指标映射后 0 硬问题**；未校正时报 12 条假阳性（见 §5.2）。

### 5.1 为什么这些规则值得进资产

它们覆盖 037/043/046/047/049/052 的工具面/身份/合同/catalog 部分；045 的 retry 深度预算与 051 的
fan-out 件数仍要真深度行为才能判（矩阵只判已存在 child 的 preset/depth，不证拒绝）。每条能落地的
都能从日志离线判、零模型、秒级。第八轮没有这个矩阵，所以 P2 的「child preset 正确、无 Team 工具」
只证了一条链；矩阵把 11 个 preset × 4 类入口的面一次摊开。

### 5.2 已踩的坑（资产必须先钉死）

1. **历史日志不能拿当前模型判**：2026-11-10 之前的 2251 条日志会报 `coo`/`cfo` 缺行、worker control 等
   ——那是旧状态，不是缺陷。审计必须 `--since`（HEAD 时间或 pack 构建时间）。
2. **`control` 不是全局 `send_to_subagent`**：CEO root / team member 也有宿主控制面；只对
   one-shot named child / 分支判 `control`。
3. **root = Lead 是引擎事实**：任何无 parent 的根会话都有 9 个团队工具；不能拿 `teamLead: false`
   的 support preset 去判 root 越权（contract §2.1 明说 root=Lead）。
4. **`handbookSkipPresets()` 是 5 个**（3 worker + producer/verifier），不是旧的 3 个；用函数，不抄表。
5. **methods 根是 `<DSH_HOME>/company/methods/<preset>/`**，不是 repo 的 `content/methods/`；传错根会把
   方法包判成「catalog 多」。
6. **skill catalog 是 durable `user/message`**（`source.kind='skill-catalog'`），不是模型回答；不要为此花 prompt。
7. **UI transcript 尾 450 字不是证据**：`--ask` 的 `askTranscriptTail` 只够看最后一段；OBS-5 必须 dump 全文。

## 6. 验证链缺口

```
model (delegation-model.mjs)  ──keyless spec──▶  preset YAML  ──❌ 没有──▶  运行时面 (tools/prompt/catalog)
        │                                              │
        └──keyless spec──▶ content/manifest ──smoke──▶  <DSH_HOME> 镜像 (methods/kb)  ──部分──▶ 真会话
```

- **model ↔ YAML**：`tests/presets/delegation-composition.spec.ts` 已覆盖（11 preset）。
- **YAML ↔ runtime**：`delegation-smoke` 只覆盖 CEO/vp_eng；没有全 preset/全入口矩阵。**← 主缺口**
- **runtime ↔ behavior**：depth/retry/team/quality-loop 各有 probe；生命周期只有零散场景。
- **content ↔ home**：`methods:init`/`kb-seeds` 有 spec；dev/rehearsal 盘仍可能缺行（054/050 同型）。

## 7. 资产设计（A 批）

### A1 · 运行时面矩阵（judge + audit）

- **落点（待建）**：tools/lib/surface-matrix.mjs（纯判据）+ checks/audit/surface-matrix-audit.mjs（读盘/出矩阵/exit code）
  + tests/evidence/surface-matrix.spec.ts；YAML 派生从 `tests/presets/preset-yaml.ts` 收成
  tools/lib/preset-rows.mjs（spec 与 audit 共用，避免第二份 derivation）。
- **输入**：一个 DSH home + `--since`（默认最近一次 HEAD/构建时间）；读 `sessions/**` 首帧、`request/header`、
  `system/message`、`skill-catalog`。
- **判据**：§5 的不变量 + 入口分类（root / named child / team member / workflow branch）；root 只判
  Lead/overlay 规则；child 判 preset 面；缺 header 显式 `unavailable`。
- **红证**：合成 observation 四例——worker 带 `list_subagents`、verifier 带 `write`、CEO 缺 `coo`、
  handbook 反置；各一红，还原即绿。
- **成本**：0 模型；47 条观察秒级。**不证明**：模型行为、UI、生命周期、深度拒绝。

### A2 · 会话证据包（reader + CLI）

- **落点（待建）**：tools/lib/session-evidence.mjs + tools/explore-evidence.mjs + tests/session/session-evidence.spec.ts。
- **输出**：root/children 树（catalog/team/workflow 事件）、durable header（preset/depth/mode）、每轮终态、
  工具调用（name/args 摘要/error）、写盘文件、turn 时间；JSON + markdown 两种。
- **复用**：替掉 `delegation-depth-probe` / `worker-orchestrator-probe` / `subagent-retry-probe` 的三份
  `rawHeader`/`readChild`（或写明保留理由）。
- **红证**：合成日志缺 header → 行标 `unavailable`，不默认 worker/0。
- **成本**：0 模型；秒级。**不证明**：语义正确、模型判断。

### A3 · UI 全文证据（小改）

- **落点**：`probes/browser-visual/cdp-probe.mjs` 加 `--body-out <path>`（`--ask`/`--steps` 后写完整
  `document.body.innerText`，必要时附 1 张截图已有）。
- **判据**：对 `COO（运营与交付）` / `CFO（财务与合规）` 做 expectText；用已知不存在的 label 做负控。
- **红证**：负控 label 必须不命中；命中即假绿。
- **成本**：0 模型（走已有 `--ask` 的 1 次 prompt 时另算）。**不证明**：卡片布局/人类可读性。

## 8. 本轮不建（与理由）

| 不建 | 理由 |
|---|---|
| replay / snapshot 场景 | replay lane 不加载 company-pack；snapshots 只收合成场景，真实会话证据不入仓（[snapshots/README](../../../../snapshots/README.md)） |
| 文档散文门禁 | policy P2：只对「复发 + 可机械判定」加门；OBS-2/OBS-6 一次修 + owner |
| `/req check` 命令宿主夹具 | keyless 已覆盖解析；live 缺的是 workspace/lease，不是产品类型；ROI 低 |
| 每个已知 bug 一个常驻 probe | 修完的 bug 进 keyless judge；live probe 只留模型行为/生命周期/UI 三类 |
| 无人值守 fuzz / 全 preset E2E | P3 轻任务；模型成本与 flake 不可控 |
| 新的“bug hunter”框架 | 现有 probe-kit/probe-web/session-log/quality-loop 足够组装；不发明新载体 |

## 9. 资产 ROI 规则（本轮的方法产出）

1. **补验证链缺口**，或让一个**新假设更便宜**；否则放 `runtime/tmp`，不入库。
2. **judge 进 `tools/lib` + spec**；live/browser 只做采集（judge + thin runner）。
3. **先有红证**：合成反例或历史 bug；没红过的资产不算证据（[testing.md](../../../../docs/testing.md) §3.7）。
4. **头注写清「不证明什么」**；矩阵绿 ≠ 行为绿。
5. **资产有层**：keyless / smoke / probe / audit / evidence；不把模型塞进 `pnpm test`。
6. **同类形状第二次出现**、或某 charter 被盲区卡住才建；不预建每 bug 场景。

## 10. 第九轮 live（B 批，待批准）

| ID | 试验 | 形状 | oracle | 预算 |
|---|---|---|---|---|
| B1 | 生命周期注入 | `probes/team/delegation-lifecycle-probe.mjs --fault cancel\|sigterm`；vp-eng 用 `subagent_retry` 起 sleep worker，child 起后 cancel/停宿主 | root/child `turn/end` 终态；`list_subagents` 行；retry 结果；宿主重启后冷恢复 | 2–4 prompts |
| B2 | 面矩阵 live 基线 | 复用 `delegation-smoke --delegate` + `delegation-depth-probe` + B3 的会话，跑 A1 | A1 零问题；root/child delta = 9/6 | 0–2 prompts（复用） |
| B3 | 团队角色包 × 非 COO | CEO 1 人 CFO 成员，任务书带 CFO 角色包 | 成员 read CFO skills、`drafts/cfo.md`、不越权 | 1–2 prompts |
| B4 | UI 卡可视性 | `ui-scene-smoke --ask` + A3 全文 | `COO（运营与交付）`/`CFO（财务与合规）` 命中或不命中都有全文 | 1 prompt |
| B5 | `/req check` live | GUI 会话跑一次；仍 dataBlocked 就记未覆盖 | 回执层/动议类型 | 0–1 prompt |

- **预算**：60 分钟墙钟 / 10 parent prompt / 16 child activation / 1 浏览器 / 8 MiB 证据；
  超限停止新试验，保留已有证据。
- **授权**：入口 = B1–B5；权限 = 当前 workspace-write + 排练场 cwd；证据 = `runtime/tmp/explore/round9/`
  + 卡内摘要；真模型范围按本表，不扩 CEO root 的 workflow、不重跑第四–八轮旧矩阵。
- **停止**：单 turn 300s；连续两次 infra 失败暂停诊断；抓到 P1 先开卡再继续下一个；本轮不改产品代码。

## 11. 开放问题（给用户）

1. A 批（无模型）是否现在做？推荐做——它把第八轮的取证成本一次性摊掉。
2. B 批预算按 60 分钟 / 10 prompt / 16 child 是否可接受？若只批一半，优先 B1（生命周期）+ B4（UI）。
3. OBS-2/OBS-6 的静态漂移（含 `delegation.md` §5 的五 key）是随 A 批修，还是只记 owner？
   推荐随 A 批修——它们是矩阵/文档的输入，修一次省后面每轮的误读。

## 12. 来源坐标

- 缺陷家族：_backlog/_archive/fixed_bugs/BUG-036–056；分诊见卡内表。
- 第八轮执行：本卡 §8；会话 id 与证据摘要见卡内「第八轮执行结果」。
- 实测矩阵：`runtime/harness-home/sessions/**`（gitignored；窗口 2026-11-10 17:00 后，47 观察/27 child）；
  原型 `/tmp/matrix-proto2.mjs`（未入库，只读）。
- 代码：`tools/lib/delegation-model.mjs`（期望源）、`tests/presets/delegation-composition.spec.ts`（model↔YAML）、
  `checks/lanes/delegation.entry.mjs`（CEO/vp_eng 面）、`packages/company-pack/src/host/prompt/handbook.ts` /
  `contracts.ts`（注入标记）、`packages/company-pack/src/client/wiring/delegation-keys.ts`（UI key）。
- 静态漂移：`docs/contracts/delegation.md` §5（key 仍写两项）；`cordis.patch.yml` 注释；
  `checks/lanes/release.entry.mjs:164` 的历史注释。
