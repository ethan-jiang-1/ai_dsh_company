---
status: 已结
opened: 2026-10-10
---

# 下游：checks/smoke 十个 web 启动块同款收成

> 立卡：2026-10-10 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是
> **结论与去向（2026-10-10 实施完毕）**：10/10 迁入 `tools/lib/probe-web.mjs`（第一批 3 个 = commit
> ba38ca2；第二批 7 个 + 模块扩展 = 本轮提交）。模块扩 `patch: string[]` / `onEmptyCookie` /
> `dumpBodyOnError` + 三处 boot 健壮性；两处铁律钉值（entry-probe read-only、replay workspace-write
> 死代码）逐字节未动；entry-probe 的 token 交换留 3 行本地块（报文不在批准统一清单）。
> 判据与红绿证据 = [2026-10-10-smoke-boot-extraction](../../../notes/implemented/2026-10-10-smoke-boot-extraction.md)。
> **授权**：用户单选「下游卡：checks/smoke 启动块同款收成」（2026-10-10）。上游卡 =
> [2026-10-10-extract-without-behavior-change](2026-10-10-extract-without-behavior-change.md)
> （已结，交付 0a7977f），其关闭条件明说「下游申请另记日期和去向」——本卡即该下游申请。

**问题与期望结果**：`checks/smoke/` 下 10 个起 `bin.ts web` 的脚本各抄一份启动块（等 banner +
token 交换 + client-request 发送），与探针面迁移前的 25 份重复同病。期望同款收进
`tools/lib/probe-web.mjs`，调用方观察到的行为不变。

## 范围

迁入（10 个，均已实测「各 boot 一次」）：

attention-e2e、client-load、delegation、entry-probe、handbook、human-loop-e2e、presence-e2e、
preset、probe、replay。

**probe-smoke 说明**：上游卡把它列在「不做」是**范围纪律**（上游只做两件事），不是技术禁令；
本卡授权覆盖它，其启动块形态与 delegation 同款（boot 函数 + authenticate 变体）。

## 已知差异（实测调查，2026-10-10）——全部当参数收下，不统一判据

| 差异 | 涉及文件 | 处置 |
|---|---|---|
| 固定 `--port String(PORT)`（非 0） | client-load、delegation、entry-probe、handbook、preset、probe | `startWeb` 的 `port` 参数（已支持） |
| `--patch run/entry-probe.patch.yml` + env 钉 `DSH_PERMISSION_MODE: 'read-only'` | entry-probe | `patch` 参数（已支持）+ `env` 基础环境传入。⚠ **read-only 是有意的 fail-closed 档，一个字节不许动**（见 [sandbox-backend-probe Note](../../../notes/implemented/2026-10-10-sandbox-backend-probe.md) 的核查记录） |
| 多重 `--patch`（patch + PRESET_PATCHES 展开） | replay | **本卡给 `startWeb` 扩**：`patch` 接受 `string \| string[]` |
| token 交换**无** AbortSignal | delegation、handbook、preset、probe、presence-e2e、replay | **统一到 15s**（本卡接受的唯一行为统一；失败路径的挂起时机，非请求形状）——与上游卡统一 boot 错误文案同类 |
| 空 cookie 时 **throw**（`token 交换没有拿到 cookie`） | delegation、handbook、preset、probe | **本卡给 `companyCookie` 扩**：`onEmptyCookie: 'throw'`（默认 `'join'` = 探针面现状，25 个已迁探针零扰动） |
| 空 cookie 时 `?? ''` 静默 | presence-e2e、replay | 默认 `'join'` 即是 |
| rpc 错误回退 | **7 个用动态转储** `message ?? JSON.stringify(body).slice(0, 200)`（preset/probe/handbook/delegation/presence-e2e/entry-probe/replay——立卡时误记 replay 为 `?? ''`，实读更正）；attention/human-loop 是模块同款 `'unknown'` | 模块新参数 `dumpBodyOnError: true`（默认 false = 25 个探针零扰动）——转储带诊断信息，**不是**可统一的措辞，当参数收 |
| rpc 错误措辞 | preset/probe/handbook/delegation 是 `` `${endpoint} 失败: …` `` | **统一为模块的 `${endpoint}: …`**（本卡接受的第三处文本统一：只进 FAIL 行的诊断后缀，判据标签与退出码不变） |
| 4 个 smoke 的调用形状 `rpc(base, cookie, endpoint, args)` | preset/probe/handbook/delegation | 一行包装适配器（同 member-stale-write 先例），调用点一字不动 |
| entry-probe 的 boot 附加防护（`error` 事件 / 16000 输出上限 / clearTimeout） | entry-probe | **收进模块**（三处都是失败/清理路径的严格改进，25 个探针同沾其益，成功路径零影响） |
| rpcId 前缀 | `deleg-` / `entryprobe-` / `handbook-` / `smoke-` / `probe-` / `replay-` / `e2e-` / `pe2e-`（client-load 无 rpc？迁前逐文件读） | `prefix` 参数，不推导 |
| boot 错误文案带 `output.slice(-800/-600)` 转储 | 全部（探针面同款） | 统一为模块文案（上游卡先例：退出码与清理路径不变） |

## 不做

- **replay-smoke 的 spawnSync CLI lanes**（`--profile headless` 逐场景直跑）——不是 web boot，不迁。
- **replay-smoke.mjs:238 的 `DSH_PERMISSION_MODE: 'workspace-write'` 死代码钉值**——上游核查已证
  场景 cordis.snapshot.yml 覆盖之，改它无行为效果；**本卡明令不碰**，避免「顺手清理」污染迁移 diff。
- 不改任何 smoke 的判据/提示词/证据函数/退出码；不把 `checks/smoke/` 拆文件。
- 不重跑全部真模型 smoke 当回归（同上游卡立场：形状 spec + 真 banner + diff 审计）。

## 验收标准（沿用上游卡形状）

| 行为 | 通过/失败 | 证据 |
|---|---|---|
| 模块扩展形状（patch 数组 / onEmptyCookie） | 新 spec 用例先红（模块还没有这两个能力）后绿，断言 argv 与 cookie 行为 | `tests/harness/probe-web.spec.ts` |
| 25 个已迁探针零扰动 | `git diff probes/` 为空；`pnpm test` 全绿 | diff + suite |
| smoke 判据不变 | 每个 smoke 的 diff 只含启动块删除与模块调用 | `git diff checks/smoke/` 逐文件审计 |
| 真 banner 仍解析 | 一次真启动 PASS | 验收脚本 |
| 门禁全绿 | `pnpm verify` ALL PASS / `pnpm test` 全绿（pipefail） | 实跑 |

实施顺序：先扩模块 + spec 红→绿，再逐个 smoke 迁移（先易后难：preset → probe → handbook →
delegation → client-load → attention/human-loop → presence-e2e → entry-probe → replay）。

**进度（2026-10-10）**：client-load / attention-e2e / human-loop-e2e 已迁（第一轮）；模块已扩
`patch: string[]`、`onEmptyCookie`、`dumpBodyOnError` + 三处 boot 健壮性；剩余 7 个按上表决定执行。
另更正：attention/human-loop 的 token 交换本就带 15s 信号（立卡时误记为缺失）——「统一 15s」实际只
涉及 6 个文件，且其中 4 个走 `onEmptyCookie: 'throw'`。

## 关闭条件

按上表交付 + Note（含与本卡「已知差异」表逐项对应的处置记录）同 diff 提交后可关闭。
