# 开发环：一个变更从意图到收尾的操作手册

> 什么时候读：开工前定任务与授权（§1）、实施中选检查（§2）、收尾交证据（§5）——其余章节按改动面查。
> 性质：指南层——「怎么操作」的展开与查表处；纪律压缩版在根 [AGENTS.md](../../AGENTS.md)。机制权威以 `vendor/dsh/` 钉住基线为准（基线版本唯一家 = 根 `AGENTS.md` §vendor 簿记）。

## 0. 开发环导航

| 需要做什么 | 唯一详细位置 |
|---|---|
| 选择任务、判断授权与 Plan Mode | §1 |
| 实施、验证、交接 | §2；验证触发条件 = [tests/README §验证分层与预算](../../tests/README.md) |
| 排查运行问题 | [run-ops.md §2](./run-ops.md#2-调试阶梯组合层--会话层不跳层)（组合层→会话层阶梯） |
| 写新代码前的四问 | §3 |
| 插拔与装法速查 | [bootstrap §插拔速查](./bootstrap.md) |
| 升级环与发布 | [release.md](../contracts/release.md)（程序唯一家） |
| 双 home 与双 DSH | [run-ops.md §1](./run-ops.md#1-运行环境双-home-与双-dsh-隔离) |
| 环境引导 | [bootstrap.md](./bootstrap.md) |
| 驱动 Web 面会话（RPC） | [web-rpc 指南](./web-rpc.md) |
| 门禁分层与测试预算 | §4 + [tests/README §验证分层与预算](../../tests/README.md) |
| 自动化轻任务纪律 | [policy.md](../policy.md)（P3） |
| 工具态与越界写入 | [policy.md](../policy.md)（P4） |
| 更新 Notes 与收尾队列项 | §5 |
| 自主优先协议与语义审 | [policy.md](../policy.md)（P5） |

## 1. 任务入口与交接

**本仓交接（D23 / D32）**：条目默认由新对话上下文接手，按入口分支行动：

1. **明确任务**：按用户目标与授权进入对应 owner，不从任务源另取任务。
2. **继续下一条**：读任务源——`notes/proposed/` 中带「批准：」标记的 RFC，以及用户在本轮明确点名的工作。问题卡（含 `待落地`）与已归档材料不是任务源；无已批 RFC 或用户点名时报告后停止。**用户让你从卡里挑 = 先列候选 + 请示；不自行开工。**唯一例外 = 缺陷卡 `修复就绪` 自授权通道（材料性与自授权边界唯一家 = [policy.md §P1-B](../policy.md#p1-b-缺陷材料性与修复自授权边界唯一定义家)）。
3. **恢复未完成项**：读原工作记录，核对相关合同、未提交 diff 与必要现场，从已证实缺口继续。若恢复的是 `_backlog/` 问题推敲，先读该区章程、问题卡和内部作业手册（`_backlog/README.md`、`_backlog/issues/README.md`、`_backlog/methods/README.md`）；卡片状态或结论不扩大用户授权。

- **四类常设规则**（只读 Notes 边界、先澄清再 RFC、Plan Mode、长程 goal 写法）= [policy.md §P1](../policy.md)。
- **10 分钟样例（改一行 → 有证据）**：改 `presets/ceo/agent.cordis.yml` 的 persona 一句 → `pnpm test tests/presets` → `source run/env.sh && node checks/lanes/preset.entry.mjs` → `node checks/lanes/ui-scene.entry.mjs --isolated --expected` → `pnpm verify`。纯文案改动也要跑 preset-smoke（挂载失败只有它抓得住）。

## 2. 执行链：从授权到有证据交接

§1 负责选任务、授权和解决事实冲突；这里从目标、owner 与验收明确后开始：

1. **定切片**：点明本次改动、非目标与验收，以及**状态事实 / 唯一入口 / 读载体 / 环境轴**；写不出载体名单 = 切片没定清。多步任务用 `todo_write` 跟踪并随用户反馈调整；机械单步可省。
2. **最窄实施（证据先行）**：机制面先写会红的测试、行为面先立场景（Given/When/Then + 判据点名），再改拥有该事实的合同/实现；不顺手扩范围。`vendor/dsh/` 只读（见根 `AGENTS.md`）。
3. **选证据**：运行能因本次回归失败的最窄检查，再按受影响面补真实入口；触发条件见 [tests/README](../../tests/README.md)。静态结构检查不证明运行行为。
4. **同步事实**：docs 只写当前合同；仅在出现新决定、约束或关键验证时新增/更新 Note。既有事实变化时更新其 owner，不复制全文到多处。
5. **交接**：逐项报告已完成、未验证、未完成及其证据/下一步。任务只有完成验收后才算收口；`_backlog/` 卡的关闭与离场按其区章程自身条件（结论 + 交接去向已记录即可，不等实施验收）。只报告实际执行过的命令。

- **完成定义**：该面的最小真实检查通过（D15）；未跑的关键验收明确标缺口，细则见 [tests/README](../../tests/README.md)。
- **证据不许假绿**：命令链一律 `set -o pipefail` + `&&`——裸 `pnpm verify | tail` 取的是 `tail` 退出码，必假绿。
- **呈现即验证**：凡「启动给我看 / 呈现给我」类请求，先自己跑通、全绿才呈现（程序 = [web-window-ops skill](../../.agents/skills/web-window-ops/SKILL.md)，规则源 = [演示 runbook](./demo-scenes.md#前置本机)）；真模型面另加一轮真实会话。修不动时如实报告卡点与已排除项。
- **交付记录**：feature 或非平凡变更同 diff 更新实现、当前合同、必要验证与 Note；机械单步只改事实 owner 并跑相关检查。**“落地”= 实施到系统面；只写 RFC/搬卡不算。**
- **完成判断链（四不等式）**：**挂得上 ≠ 行为对 ≠ 装得上 ≠ 已获批**——挂载 = `preset-smoke`；行为 = 该面场景/判据；安装 = `release-smoke`（发布/导出面变更时）；批准 = 语义审（[policy.md §P5](../policy.md) 最小清单）+ 用户验收（§5 对照授权原文）。每层证明边界唯一家 = [testing.md §1](../testing.md)。

## 3. 设计四问（写第一行代码前必答）

**前置问题**：这次改动的事实是什么？唯一入口是谁？谁读它？哪条环境轴会坏？答案落在 RFC/Note 的 `## 状态事实与载体`；载体登记 = [carrier-registry](../../checks/lib/carrier-registry.mjs)。

| 问 | 判据 | 本 repo 落点 |
|---|---|---|
| ① 占哪个 ctx 键 / 发哪些事件 | 每个新能力一个自己的键，`inject` 声明依赖，不劫持别人的 | company-pack `src/` 的设计节 |
| ② 模型会看见什么新状态 | **日志税**：每个新的模型可见输入配 `SessionEventMap` 成员（并定 `ignorable`），否则 JSONL 回放不出来 | [architecture Note](../../notes/implemented/2026-11-10-architecture-rationale.md) §8 |
| ③ UI 走哪层 | presenter 纯函数 → `tool.call.toolview` 槽 → `dsh.client.inject`，不一步到顶 | [ui-demo Note](../../notes/implemented/2026-11-10-ui-demo-rationale.md) 分层（D6） |
| ④ 证据是什么 | **红/场景先行**：机制面先写会红测试；行为/UX 面先立 Given/When/Then 场景；口头担忧第二次提起 → 立卡或明确否决 | 该变更 Note 的验证表或探针头注 |

## 4. 门禁分层：连通档（默认，秒级）vs 内容档（按需，分钟级）

会话级门禁按同一脚本分两档，默认走快档（范例 = [`checks/lanes/probe.entry.mjs`](../../checks/lanes/probe.entry.mjs)，五条设计要点住该脚本头注）：

| 档 | 判据 | 成本 |
|---|---|---|
| **连通档（默认）** | 每角色一句 ping（只回复「在岗」，不调工具），断言四件事：① `session/create` 成功 ② 日志出现新 `turn/end` ③ assistant 正文非空 ④ 人格进 prompt（`system/message` 含角色标记） | 全角色并发 **≈6s** |
| 内容档（`--full`） | 身份 / 知识 / 产出三探针，按 KB 事实与 veto 语义断言 | 5–10min，按需 |

门禁升格与封顶判据 = [policy.md §P2](../policy.md)。

## 5. 记录与收尾

**收尾次序与六行回执形状唯一家 = [close-out-definition skill](../../.agents/skills/close-out-definition/SKILL.md)**（九步：对照授权 → 四链点名 → 语义审 → 收割三问 → 指针收口 → 改口检查 → 整片 revert → verify/test → 六行回执）。本节只留指南独有的去向与推送规则：

- **对照授权原文**：语义审四输入 = [policy.md §P5](../policy.md)；机器绿灯只证机制面，结论一句话记进收尾 Note。
- **被证伪切片整片 revert**：实现 + 测试 + docs + Note 同退，另起新条目；不做半 revert 的外科修补。
- **完成离场**：验收通过后任务收口；`_backlog/` 卡按其区章程关闭条件离场，证据留 Note；未完成项写清阻塞与下一步。Note 分类与证据规则 = [notes/README.md](../../notes/README.md)（D35）。
- **流程纪律**：任务入口见 §1、Plan Mode 见 [policy §P1](../policy.md)、多步 todo 见 §2；默认遵循钉住的 DSH 纪律，升 pin 重校按 [release.md](../contracts/release.md)。
- **新门禁反证口径**：只回滚实现、保留新测试，做红 → 还原 → 绿三步留证。
- **人审反馈与清扫**：反馈成立就修并补证，不成立用技术事实反驳；条目收尾后可派独立只读子代理清扫，扫与修分家。文档卫生按指导价值取舍，不以净减行数为目标（D26）。
- **授权链与时间轴（D34）**：授权线索记在对应 Note 状态行；时间轴 = `notes/implemented/` 文件名日期 + `git log`。
- **push 落点与 pre-push 门禁**：`origin` 走 `ssh.github.com:443`，`git push origin master` 直接用；命令链须 `set -o pipefail`。
- **pre-push 强制校验**（`source run/env.sh` 接线 `.githooks`，口径与 [testing.md §5](../testing.md) 一致）：免浏览器/免 `DSH_HOME` 安全网——无条件 `verify` + 按出站改动面精准分派（docs-only 只跑 `verify`；代码/测试/探针按面跑增量 `typecheck`/`lint`/`dup`/`smoke:fast`/`test:checks` + 最多一次合并去重 `vitest`；未分类 fail-closed）。
  真入口面（`client-load`/`preset`/`replay`）不阻塞 `git push`，改由开发收口 `source run/env.sh && pnpm smoke:surface` 与发版前 `release:verify` 强制兜底（每周 CI 另覆盖 `replay` 与 `coverage:ratchet`，`client-load`/`preset` 在 `--ci` 显式跳过）；规则唯一家 = `tools/lib/core/asset-lanes.mjs`。用 `--no-verify` 绕过后须在收尾 Note 说明原因。
- **工作区收敛**：收尾跑 `node tools/repo/converge.mjs`（无参 = 计划模式），有可收敛 slug 逐个 `--slug` 收敛并 `--charter-backfill`；证据家 = `deliverables-archive/<目录>/journal/`（依据 = [converge-evidence-home](../../notes/implemented/2026-10-30-converge-evidence-home.md)）。
- **复盘未成文规则**：若发现 agent 遵守了未写明的隐性规则，三选一收口：升格 verify 门禁 / 写进 owner Note / 显式作废。
