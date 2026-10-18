# BUG-021 已修：问询能自行收口（`tool-ask-user` 钉 timed 形态）

状态：已交付（2026-10-18；授权 = 用户令「只剩 BUG-021…按我们的流程落地吧」——本修复触碰 company-pack 公开行为，按章程需用户明确指示）

> 详细现场、两轮深挖与归因证据 = [BUG-021 卡（已归档）](../../_backlog/_archive/fixed_bugs/BUG-021-ask-user-question-no-scripted-answer-path.md)；
> 本 Note = 决定 + 实跑证据 + 未验残留 + 驱动配方。

## 决定

**修法 = 改配置，不改 vendor。** 根因是**一行形态选择**：`tool-ask-user` 默认 `mode: 'legacy'`（前台窗口无界），
而 `userQuestions/answer` 只匹配 `'continued'` 态 ⇒ 没有 UI 认领的环境里问询永停 `'open'`，脚本化驱动只能干等
（现场：一场跑到 26 步的动议挂 40 分钟后掉线丢活）。vendor 同一包提供 **`mode: 'timed'`**：前台窗口有界，
超时后工具返回 `pending`、问询由投影转 `'continued'`，RPC 与 UI 两条路都能答；前台卡片不消失
（文案「已继续工作，仍可回答」），迟到的答案以新 turn 进入会话。

- 五角色 preset 的 `tool-ask-user` 行加 `config: { mode: timed, timeout: 120 }`——`timeout` **显式钉住**
  （与 vendor 默认同值，但上游改默认不再静默漂进本仓；本仓 `agent-team` 行同款纪律）。模型仍可在单次调用里传
  `timeout` 覆盖（timed 形态的 schema 带该参数）。
- 文档口径改正：`docs/guides/web-rpc.md` 原句「`ask_user_question` 的回答不走 RPC」不准确，改为按形态说清。
- **不做**：改 `vendor/`（铁律）；`--answer-default` 之类替用户拍板；Web 深链路由（独立成本，另议）。

## 驱动配方（原住指南，为守文档行预算搬来此处）

```
POST <URL>/api/session/<method>   （信封见 docs/guides/web-rpc.md）
method: userQuestions/answer
args:   { "agentId": "<SessionId>", "callId": "<toolCallId>",
          "answer": { "answers": [ { "id": "<question.id>", "selected": ["<选项 label>"] } ] } }
```

- `agentId` 就是 **SessionId 字符串**（写成 `sessionId` 网关报 `missing "agentId"`）；`callId` 从会话日志的
  `tool/call`（`name = ask_user_question`）取；`answers` 必须对每个 `question.id` **各答一次**（`BAD_ANSWER` 守卫）。
- **前提 = 问询处于 `'continued'`**（timed 窗口过后，或会话恢复修复补了 `TOOL_OUTCOME_UNKNOWN`）。
  `legacy` 形态下该调用返回 `{ok:true, value:false}`——通道在、语义未命中，别把它当成功。

## 实跑证据（红 → 绿）

| 检查 | 结果 |
|---|---|
| **红**：`pnpm exec vitest run tests/presets`（断言先落：五角色该行须 `mode: timed` + 显式 `timeout`） | 1 failed / 18 passed（五个角色全缺该配置） |
| 绿：同上 | **19/19 PASS** |
| 组合自检：`source run/env.sh && pnpm dsh --profile web --dump-config` | 五角色该行 config 在场（`mode: timed` / `timeout: 120`） |
| 真挂载：`node checks/smoke/preset-smoke.mjs` | **ALL PASS**（5 个 preset 全部可挂载；timed schema 与工具行组合无误） |
| 回放 lane：`node checks/smoke/replay-smoke.mjs`（默认档） | **ALL PASS**——两份 tool-schemas sidecar 按**有意变更**同步（diff 恰为 `ask_user_question` 块：工具描述 + questions 描述 + 新增 `timeout` 参数，别无二致） |
| 回放 lane：同脚本 `--ui` 档 | **ALL PASS**（委派卡端到端 + ui 金样零 diff） |
| 全量 keyless：`pnpm test` | **617 tests PASS** |
| 结构：`pnpm verify` | ALL PASS |

**归因纪律（本次两条红分开归因，不混为"漂移"）**：① 我这次的有意变更 = tool schema；② **既有漂移**（非本轮引入）=
公司手册 2026-10-16 新增两节早于夹具，两处注入体的**正文 + `source.digest`** 同步到当前值——硬证 = 现场解压日志里的
注入体与当前 `company-workspace/AGENTS.md` **逐字节一致**（digest 取现场同值）。台账记于
`snapshots/replay/r3-delegation/snapshot.yml`（2026-10-18 条）。

## 真模型验收（2026-10-18 补跑；探针 = `probes/session-context/ask-user-timed-probe.mjs`）

**ALL PASS**（ceo 会话 · 排练盘）：窗口到点 → `tool/result` 含 `pending` → `turn/end` → `userQuestions/answer` 返回 **true**
→ 答案以新消息回会话。同轮另有两次实跑佐证：模型不传 timeout（用配置默认）→ **+120.0s** 收口；模型自取 **180** → **+180.0s** 收口。

> ⚠ **key 在哪**（本 Note 的教训，已固化）：密钥住 **DSH 凭据库 `<home>/.credentials.yaml`（嵌在顶层 `refs:` 块里）**，
> **不是环境变量**——`env | grep DEEPSEEK` 为空**不代表**没配。自检 = `pnpm orient` 的「凭据」行（2026-10-18 新增）；
> 事实唯一家 = 根 [AGENTS.md §密钥](../../AGENTS.md) + [dev-loop §6](../../docs/guides/dev-loop.md)。

## 未验残留（显式）

- **模型可单次把窗口要回无界**（顶层 `timeout: -1`，vendor schema 允许：*"Use -1 only when an answer is required
  before proceeding"*）——真跑实测：该路径下无 `pending`、无 `turn/end`、`userQuestions/answer` 返回 false
  ⇒ 无人值守驱动仍会静默停住。**残留已由 [BUG-022 的驱动侧停点判定](../../notes/implemented/2026-10-18-bug022-question-stop-guard.md) 收掉**
  （`tools/lib/question-stop.mjs`：看到无界停点就停并报，不再干等；卡 = [BUG-022（已归档）](../../_backlog/_archive/fixed_bugs/BUG-022-ask-user-unbounded-timeout-override.md)）。
- 窗口秒数（120）未按体验实测调过：`timeout` 是可调项（行 config 一处或单次调用参数），本期取 vendor 默认并显式钉住。

## 指针

- 卡（现场/两轮深挖/修法候选与输掉的方案）=[BUG-021（已归档）](../../_backlog/_archive/fixed_bugs/BUG-021-ask-user-question-no-scripted-answer-path.md)
- 文档面：[web-rpc.md](../../docs/guides/web-rpc.md)（口径改正 + 本 Note 指针）
- 组合面：[preset 合同](../../docs/presets.md)；回放金样台账 [snapshot.yml](../../snapshots/replay/r3-delegation/snapshot.yml)
