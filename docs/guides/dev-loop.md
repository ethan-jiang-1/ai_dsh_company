# 开发环：一个变更从意图到调整的操作手册

> 什么时候读：开工前定任务与授权（§0.5）、实施中选检查（§1）、收尾交证据（§12）——其余章节按改动面查。
> 性质：指南层——"怎么操作"的展开与查表处；纪律压缩版在根 AGENTS.md。来源 = FAQ 13 `dev-loop.md` +
> `dual-home-isolation.md`（外部材料，登记见 [external-research.md](../reference/external-research.md)）；机制结论以
> `vendor/dsh/` 工作树为权威，旗标与行为已在**钉住的 vendor 基线**核对——基线版本与 SHA 的唯一事实家 =
> 根 `AGENTS.md` §vendor 簿记（升 pin 重校记录 = [pin-upgrade Note](../../notes/archived/2026-09-30-pin-upgrade-0.2.0-rc.2.md)）。
> 行注记 `R1`–`R5b` = 退役轮次制的历史出处标记（D11），只作 git 考古索引；与 snapshots 场景号
> （`replay/foundation-workspace`…）是两套序号，别互推。

## 0. 开发环导航

| 需要做什么 | 唯一详细位置 |
|---|---|
| 选择任务、判断授权与 Plan Mode | §0.5 |
| 实施、验证、交接 | §1；验证触发条件 = [tests/README §验证分层与预算](../../tests/README.md) |
| 排查运行问题 | [debugging.md](./debugging.md)（组合层→会话层阶梯） |
| 写新代码前的四问 | §3 |
| 插拔与装法速查 | [bootstrap §插拔速查](./bootstrap.md) |
| 升级环与发布 | [release.md](../contracts/release.md)（程序唯一家） |
| 双 home 与双 DSH | [environments.md](./environments.md) |
| 环境引导 | [bootstrap.md](./bootstrap.md) |
| 驱动 Web 面会话（RPC） | [web-rpc 指南](./web-rpc.md) |
| 门禁分层与测试预算 | §9 + [tests/README §验证分层与预算](../../tests/README.md) |
| 自动化轻任务纪律 | [policy.md](../policy.md)（P3） |
| 工具态与越界写入 | [policy.md](../policy.md)（P4） |
| 更新 Notes 与收尾队列项 | §12 |
| 自主优先协议与语义审 | [policy.md](../policy.md)（P5） |

> 旧 §2/§4–§8/§9.1/§10–§11/§13 的空壳节已删；上表直接给现行家（全仓无锚点入站；正文旧引用已改指目标）。

## 0.5 任务入口与交接

**本仓交接（D23；任务源已由 D32 重接）**：条目默认由新对话上下文接手，这是本仓适配。按入口分支行动：

1. **明确任务**：按用户目标与授权进入对应 owner，不从任务源另取任务。
2. **继续下一条**：此时才读任务源——`notes/proposed/` 中带「批准：」标记的 RFC，以及用户在本轮明确点名的工作。问题卡（含 `待落地`）与已归档材料不是任务源；没有已批 RFC 或用户点名时，报告后停止，不从卡片或历史记录推断任务。唯一例外 = 缺陷卡 `修复就绪` 自授权通道——**边界、严重级与排除项唯一家 = [_backlog 章程](../../_backlog/README.md)「缺陷的通道」**；本节不复述（缩写即漏边界）。
3. **恢复未完成项**：读原工作记录，核对相关合同、未提交 diff 与必要现场，从已证实缺口继续。若恢复的是问题推敲，先读 [_backlog/](../../_backlog/README.md) 章程、相关 [问题卡](../../_backlog/issues/README.md) 和按需 [方法](../../_backlog/methods/README.md)；卡片状态或结论不扩大用户授权。

**四类常设规则**（只读 Notes 的边界、先澄清再 RFC、Plan Mode、长程 goal 写法）= [policy.md §P1](../policy.md)。
**10 分钟样例（改一行 → 有证据）**：改 `presets/ceo/agent.cordis.yml` 的 persona 一句 → `pnpm test tests/presets` → `source run/env.sh && node checks/smoke/preset-smoke.mjs` → `node checks/smoke/ui-scene-smoke.mjs --isolated --golden` → `pnpm verify`；末行应看到 `Tests … passed` / `preset-smoke: ALL PASS（6 个角色 + 5 个非角色 preset）` / `金样一致（全部公司页签）` / `verify: ALL PASS`。纯文案改动也要跑 preset-smoke（挂载失败只有它抓得住）。

## 1. 执行链：从授权到有证据交接

§0.5 负责选任务、授权和解决事实冲突；这里从目标、owner 与验收明确后开始：

1. **定切片**：点明本次改动、非目标与验收。多步任务用 `todo_write` 跟踪并随用户反馈调整；机械单步可省。
2. **最窄实施（证据先行）**：机制面先写会红的测试、行为面先立场景（Given/When/Then + 判据点名），再改拥有该事实的合同/实现；不顺手扩范围。`vendor/dsh/` 只读（见根 `AGENTS.md`）。
3. **选证据**：运行能因本次回归失败的最窄检查，再按受影响面补真实入口；触发条件见 [tests/README](../../tests/README.md)。静态结构检查不证明运行行为。
4. **同步事实**：docs 只写当前合同；仅在出现新决定、约束或关键验证时新增/更新 Note。既有事实变化时更新其 owner，不复制全文到多处。
5. **交接**：逐项报告已完成、未验证、未完成及其证据/下一步。任务只有完成验收后才算收口；`_backlog` 卡的关闭与离场按其**自身条件**（结论 + 交接去向已记录即可，不等实施验收），规则唯一家 = [_backlog/README](../../_backlog/README.md)。只报告实际执行过的命令。

完成定义是该面的最小真实检查通过（D15）；未跑的关键验收明确标缺口。按改动面选择检查与入口验证，细则唯一见 [tests/README](../../tests/README.md)；结构检查不能替代运行验收。
**证据不许假绿**：命令链一律 `set -o pipefail` + `&&`——`pnpm verify | tail` 的退出码是 `tail` 的，不带 pipefail 必假绿。
**呈现即验证（2026-09-30 立，用户裁定）**：凡「启动给我看 / 呈现给我」类请求——起观察窗、交付 URL、演示一个面——**先自己跑通，红了当场修，全绿才呈现**；用户不当第一次验收员。观察窗的最小真检查与操作程序 = [web-window-ops skill](../../.agents/skills/web-window-ops/SKILL.md)（规则源 = [演示 runbook](./demo-scenes.md#前置本机)）；真模型面另加一轮真实会话。修不动时如实报告卡点与已排除项，不硬呈现半红的东西。

**交付记录**：feature 或非平凡变更同 diff 更新实现、当前合同、必要验证与 Note；机械单步只改事实 owner 并运行相关检查，不新建意图或 RFC。

**完成判断链（四不等式；2026-10-07 立以收口"门禁全绿即完成"错觉）**：**挂得上 ≠ 行为对 ≠ 装得上 ≠ 已获批**——
四条各需独立观察，前一条绿不豁免后一条：挂载 = `preset-smoke`；行为 = 该面场景/判据（[tests/README](../../tests/README.md) 选层）；
安装 = `release-smoke`（发布/导出面变更时）；批准 = 语义审（[policy.md §P5](../policy.md) 最小清单）+ 用户验收（§12 对照授权原文）。
机器全绿只证断言通过，不证「做的是不是这件事」——每层的证明边界唯一家 = [testing.md §1](../testing.md)。

## 3. 设计四问（R3+ 写第一行 JS 前必答）

| 问 | 判据 | 本 repo 落点 |
|---|---|---|
| ① 占哪个 ctx 键 / 发哪些事件 | 每个新能力一个自己的键，`inject` 声明依赖，不劫持别人的 | company-pack `src/` 的设计节 |
| ② 模型会看见什么新状态 | **日志税**：每个新的模型可见输入配 `SessionEventMap` 成员（并定 `ignorable`），否则 JSONL 回放不出来 | [architecture Note](../../notes/implemented/2026-11-10-architecture-rationale.md) §8 已预警；漏了在第 5 阶段以"日志读不全"还债 |
| ③ UI 走哪层 | presenter 纯函数 → `tool.call.toolview` 槽 → `dsh.client.inject`，不一步到顶 | [ui-demo.md](../../notes/implemented/2026-11-10-ui-demo-rationale.md) 分层（D6） |
| ④ 证据是什么 | **红/场景先行**（2026-10-04 升格）：机制面 = 实现前那个测试已写且红；行为/UX 面 = 场景先立（Given/When/Then + 判据点名）；口头担忧第二次提起 → 立卡或明确否决，不留复发性话题 | 该变更的 Note"需验证什么"；场景规格写在该变更自己的 Note 或探针头注 |

## 9. 门禁分层：连通档（默认，秒级）vs 内容档（按需，分钟级）

**教训（R2）**：会话级门禁最初写成"五角色 × 三探针按 KB 事实断言内容"——串行 30 分钟没跑完，慢轮次
150s+ 会把超时判定拖垮。用户裁定：**"先要它通，对不对没那么重要。"**

**做法**：同一个门禁脚本分两档，默认快档（`checks/smoke/probe-smoke.mjs` 是范例）。

| 档 | 判据 | 成本 |
|---|---|---|
| **连通档（默认）** | 每角色一句 ping（"只回复两个字：在岗，不要调用工具"），断言四件事：① `session/create` 成功（preset 行 config 全过）② 日志出现新 `turn/end` ③ assistant 正文非空 ④ **人格进 prompt**（`system/message` 含角色标记） | 全角色并发 **≈6s** |
| 内容档（`--full`） | 身份 / 知识 / 产出三探针，按 KB 事实与 veto 语义断言 | 5–10min，按需 |

**要点（可迁移到别的面）**：五条设计要点（"通"不考内容／从权威日志读事实／问句要短／完成信号用持久事件／慢是常态）写在范例脚本头注 = [`checks/smoke/probe-smoke.mjs`](../../checks/smoke/probe-smoke.mjs)（2026-09-26 从本节搬出，一处事实一个家）。

**门禁升格判据 = [policy.md §P2](../policy.md)**。

## 12. 记录与收尾

**收尾的次序与判据唯一家 = [close-out-definition skill](../../.agents/skills/close-out-definition/SKILL.md)**
（九步：对照授权 → 四链点名 → 语义审 → 收割三问 → 指针收口 → 改口检查 → 整片 revert → verify/test → 六行回执；六行回执的形状也在那里）。
本节只留**指南独有的去向规则**，不复述次序：

- **对照授权原文**（2026-09-28 借 FAQ 15；语义审四输入 = [policy.md §P5](../policy.md)）——机器绿灯只证机制面，不证"做的是不是这件事"；结论一句话记进收尾 Note。
- **被证伪的已落地切片整片 revert**（实现+测试+docs+Note 同退），修正另起新条目；不做半 revert 的外科修补——半退留"文档说 A、代码是 B"漂移态，结构门禁查 HEAD 不查语义一致，抓不住（2026-09-28 借 FAQ 11）。
- 完成条目：验收通过后任务收口；`_backlog` 卡按其自身关闭条件离场（不等实施验收，规则唯一家 = [_backlog/README](../../_backlog/README.md)），证据留 Note；未完成项写清阻塞与下一步留在原处。不要把完成标记或过期环境状态堆回任务源。
- **Note 分类、生命周期与证据规则** = [notes/README.md](../../notes/README.md)（D35；本节不复述）。



**流程规则**：

- 任务入口见 §0.5；Plan Mode 适用条件见 [policy §P1](../policy.md)；多步任务的 todo 规则见 §1。
- 默认遵循钉住的 DSH 纪律；vendor 原文是权威，本仓适配按 D 号记录约束与证据。根 `AGENTS.md` 只提供纪律落点索引，不是逐源清单。升 pin 时按 [release.md](../contracts/release.md) 重校流程合同。
- 按改动面选择验证（[tests/README](../../tests/README.md)）；结构门禁不替代运行验收。入口探针机器通过不等于语义审阅通过。
- 新门禁反证的操作口径 = **只回滚实现、保留新测试**——连测试一起回滚会得全绿假象；红→还原→绿三步留证。
- 收到人审/用户反馈：成立就修复并补证据；不成立用技术事实反驳，**不作表演式同意**。
- 条目收尾后可派**中立体清扫**（独立子代理；输入 = diff + 收尾 Note + 关联卡；扫与修分家），清单不另写 Note。
- 文档卫生按指导价值：移除失效/重复指令与无行动价值的历史噪声；保留仍指导当前决策、解释约束或支持复验的证据。不以净减行数为目标（D26）。
- **授权链与时间轴（intents.md 已退役，D34 2026-10-04）**：授权线索（用户点名/裁定原话）记在**对应 Note 的状态行**；时间轴 = `notes/implemented/` 文件名日期 + git log。月度冻结表已在 2026-10-09 清扫中删除（那是账本身）。退役理由 = 第三本账与 Note 双写、膨胀病史三次、违反上游 no-index 教义（vendor notes README）。
- **push 落点**：`origin` 已指向 `ssh://git@ssh.github.com:443/ethan-jiang-1/ai_dsh_company.git`（22 端口被拦），`git push origin master` 直接用；命令链纪律 = §1（证据不许假绿）。push 由 **pre-push hook 强制跑全量 `pnpm verify` + `pnpm typecheck` + `pnpm test`**（verify 2026-09-27 立；test 09-28 加；typecheck 2026-11-03 加，覆盖 pack 两面 + tests/client + tests/host + tests/lib + tests/content + tests/harness 全量 spec（唯一例外 = 混合面 `pack-exports`，两向皆无法单面检查）；不进 CI 的定界见 [n7-ci-narrowing](../../notes/archived/2026-10-09-n7-ci-narrowing.md)；接线 = `source run/env.sh` 幂等设 `core.hooksPath`；bypass = `--no-verify`，用后须在收尾 Note 说明原因）。
- **工作区收敛（2026-10-12 入轮末；2026-10-30 证据家改到归档件）**：收尾跑 `node tools/converge.mjs`（无参 = 计划模式）——有 ✓ 可收敛 slug 就逐个 `--slug` 收敛（journal 副本随交付物进归档家、台账自动），再 `--charter-backfill` 补历史纪要；证据家 = `deliverables-archive/<目录>/journal/`，不再写 `snapshots/archive`（依据 = [converge-evidence-home](../../notes/implemented/2026-10-30-converge-evidence-home.md)）。
- **复盘一问：本轮有没有 agent 遵守的"未成文规则"**（从代码模式推断出的伪规则，跨会话会扩散）？三选一收口：升格 verify 门禁 / 写进 owner Note / 显式作废——规则不留空气（2026-09-28 借 FAQ 11）。
