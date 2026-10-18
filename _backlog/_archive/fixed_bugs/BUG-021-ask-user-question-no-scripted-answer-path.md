---
status: 已修
severity: P2
opened: 2026-10-17
---

# BUG-021：`ask_user_question` 的脚本化回答通道缺失——RPC 驱动会永久挂在问询上

> **二轮深挖结论（2026-10-17）**：应答的 RPC 通道**是存在的**（`userQuestions/answer`），但它**只匹配 `continued` 态**的问询，而 `open` 态只能由前台 UI 认领/应答 ⇒ **在没有可脚本化 UI 的环境里，问询永远停在 `open`**。详见「深挖」节。
> 严重级别：P2（次要——不损坏数据、不误导判据，但**让「RPC 驱动的真会话」在遇到问询时无法自行收口**，只能靠人在 UI 里点）｜发现：2026-10-17｜状态：已修
>
> **授权（2026-10-18）**：本修复触碰 **company-pack 公开行为**（改 preset 行 ⇒ 改角色行为），按章程不自授权、需用户明确指示——
> 用户令：「只剩 BUG-021…按我们的流程落地吧」= 该指示。
>
> **结论（2026-10-18 已修）**：根因收敛到一行配置——`tool-ask-user` 的 `legacy` 形态前台窗口无界，而 RPC 只吃 `continued`；
> 五角色 preset 改钉 vendor 既有的 `mode: timed`（`timeout: 120`），**不改 vendor**。证据、未验残留与去向（真模型档缺口）
> = [毕业 Note](../../../notes/implemented/2026-10-18-bug021-timed-user-question.md)。

## 症状（真现场）

第四场真动议（`session-55b7d662`「和风便利店对账接入可行性评估」，`deliverables/2026-10-17-hefeng-recon/`）跑到第 26 次 `tool/call` 时调用 `ask_user_question`（问「对客要料清单怎么出」，三选项）。此后：

- `session/list` 显示该会话 **`running: true`、`asOfSeq: 159`**，`agentAvailable: true` ——**会话活着，硬等**；
- 会话日志**停止增长**（159 行、26 次工具调用，此后 20+ 分钟零变化）；
- 驱动侧三次 RPC `session/prompt`（含「回答你的问询：选第 1 项…」的明确作答）**全部 `accepted: true` 但零效果**；
- `turn/end` 从未出现（第 1 turn 未收口）；`meta.md` 的「结果」**留空** ⇒ 动议停在未收口态。

## 根因

`ask_user_question` 是**前景阻塞**工具：会话进入等答状态后不再推进，而**回答通道只有 UI 一条**。三处证据：

1. **运行手册自己写着**（`docs/guides/web-rpc.md`）：「**`ask_user_question` 的回答不走 RPC**（走 wire）——脚本化跑到提问就会停下等真人；此时去 UI 里答。」
2. **实测 RPC 无效**：三次 `session/prompt` 都进日志（可搜到「选 1：允许…」原文），但会话不恢复 ⇒ RPC prompt 不是该问询的应答通道。
3. **UI 侧同样不可脚本化**（本轮试过，代价过高）：Web 应用**无深链路由**（`?session=<id>` 之类未被支持，`apps/web/src` 无 `URLSearchParams`/hash 路由消费面），会话列表**懒加载**（«Show N more sessions» 逐段展开），而本机有 **620 个会话** ⇒ 靠 CDP 点开目标会话再点选项不可行（本轮在 UI 里试了 3 轮，标题始终不在可见列表内）。

## 暴露的失败类

**「人机回路的前景等待，只有一条通道能解，而那条通道不是为自动化设计的」**——与 [BUG-005](BUG-005-dual-signoff-single-door-routing.md)（双签的另一签不会自动路由到 CEO 门）同族：**都是「机制停点存在、但停点的应答路径没跟上多门/自动化形态」**。

**是否需要横切排查**：是，范围限「所有前景等待类停点的应答通道」——`ask_user_question`（本条）、`request_signoff`（BUG-005 已修文件层补签，但 `request_signoff` 本身在无人值守时按 `approval/policy=never` 直接 `rejected`，见第三场实测）。建议口径：**每个停点都要能回答「脚本化驱动怎么解它」**；答不出就该在手册里写明「此停点必须人参与，自动化跑到这里就停」。

## 追加证据：会话最终**掉线**（不是自行恢复）

问询挂起约 40 分钟后复查：`session/list` 的 `running` 由 `true` 变 **`false`**，会话日志停在
**161 行 / 26 次 `tool/call`**（最后一次写入 07:59:50，此后不再增长），且**始终没有 `turn/end`**
⇒ 该 turn **从未收口，会话被丢弃**。交付物 `deliverables/2026-10-17-hefeng-recon/` 停在
`meta.结果` 留空（`deliverables-check` 报 `meta-result-pending` 观察档、**违规 0 条**——判据如实）。

**这条比「挂住」更硬**：挂起是不可脚本化，**掉线是这活直接丢了**（那场动议的诊断结论没落地）。
所以本卡的严重级虽为 P2（不损坏数据、不误导判据），**但它会静默吃掉一场已经跑了 26 步的动议**。

## 深挖（2026-10-17 二轮，走通了第一段、卡在第二段）

**已确认的正面事实**（原诊断需要修正：**应答的 RPC 通道是存在的**，不是「没有通道」）：

1. `userQuestions` 服务由 web profile 挂载（`pnpm dsh --profile web --dump-config` 可见
   `@deepseek-ai/dsh-user-questions` + `dsh-client-ui-user-questions` + `dsh-tool-ask-user`）；
2. host 侧 `@Remote answer(agent, callId, answer)` 生成 endpoint **`userQuestions/answer`**，
   远程客户端的类型声明（`user-questions/lib/typert.remote-client.d.ts:13`）写明签名是
   **`(agentId: SessionId, callId: ToolCallId, answer: AskUserQuestionAnswer)`** ——**`agentId` 就是 SessionId 字符串**；
3. 实测：带 `sessionId` 调用 ⇒ 网关报 `missing "agentId"; unexpected "sessionId"`（**参数名确证**）；
   改成 `agentId: "session-…"` ⇒ **网关接受、返回 `{ok:true, value:false}`**（**通道可用，语义未命中**）。

**卡住的第二段：`answer()` 只匹配 `'continued'` 态的问询**。源码写明
（`interaction/user-questions/src/types.ts:71`）：

> `UserQuestionState`: **`'open'`** while the tool call may still return the answer;
> **`'continued'`** once the answer can only arrive as a new turn.

而 `answer()` 的实现是 `this.continued(agent).find(item => item.callId === callId)` ——
**只查 `continued`**。`'open'` 态的问询由**前台 composer 的 waterfall** 应答（客户端
`slots.ts` 的 `answer()`：`if (waterfall !== undefined) … ; if (this.#state === 'continued' && rpc !== undefined) … ;
return Promise.reject('no channel accepts an answer yet')`）⇒ **RPC 通道的前提是问询已由 UI 认领并转 `continued`**。

**实测复现**（本轮第二次实验，`session-8dec9aeb`）：构造一条会触发问询的提示 ⇒ 问询发出
（`callId=call_00_2mW23…`、`question.id=scope_tech_vs_biz`）⇒ 用 `agentId=<SessionId>` 调
`userQuestions/answer` ⇒ **`value:false`**（会话仍挂、`turn/end` 不出现、日志停在 23 行）。
**为什么转不了 `continued`**：本机 Web UI 的会话列表**不渲染目标会话行**
（`document.querySelectorAll('[data-session-id]').length === 0`，列表虚拟化 + 懒加载）⇒
**脚本化点不开那条会话** ⇒ 认领不发生 ⇒ 问询永停 `'open'` ⇒ RPC 应答永远 `false`。

⇒ **缺陷的准确表述**：不是「没有应答通道」，而是**「应答通道被 UI 认领前置卡住」**——
`'open'` 态只能前台答、`'continued'` 态才能 RPC 答，而**在没有可脚本化 UI 的环境里，
问询永远停在 `'open'`**。

## 推荐修法（据此更新）

- **A（首选）**：让 `userQuestions/answer` 也能解 `'open'` 态——即 host 侧允许「无 UI 认领时
  直接以 RPC 应答收口」。守卫：必须精确绑定 `callId` + 每个 `question.id` 各答一次（现有
  `BAD_ANSWER` 校验已在）；且**不改变有人值守时的前台优先**（waterfall 在场仍走 waterfall）。
- **B**：给 Web 加**深链路由**（`?session=<id>`）+ 让会话列表可寻址（虚拟化列表也要能按 id 定位），
  使「UI 认领」这一步可脚本化——它是 A 的替代路径，成本更高但不动 host 语义。
- **C**：文档面——把「RPC 通道存在但被 `'open'` 态前置」写进 `docs/guides/web-rpc.md`
  （现在只有一句「回答不走 RPC」，既不准确也不足以指导）。
- **D（不建议）**：`--answer-default` 自动按推荐项作答——等于让驱动替用户拍板。

**严重级上调考虑**：原 P2 基于「不损坏数据」。二轮实测看到**两场动议因此丢失**
（`55b7d662` 跑到 26 步掉线、`8dec9aeb` 停在 23 行）⇒ 建议维持 P2 但**注明「会静默吃掉动议」**（已在「追加证据」节）。

## 复现

```sh
# ① 起观察窗 + 建 CEO 会话 + 下一条必然触发问询的动议（缺客户侧专有事实即可）
#    本场用的题：客户接口文档「走内部审批后再给」（现在没给）⇒ 必然要问人
# ② 等它调 ask_user_question（本场第 26 次 tool/call）
# ③ 试 RPC 作答（三次，全部 accepted 但无效）：
#    curl -s -X POST "$URL/api/session/prompt" -H "Cookie: $COOKIE" \
#      -d '{"type":"client-request","rpcId":"p4","method":"session/prompt","payload":{"args":{"request":{"requestId":"r-4","sessionId":"<sid>","mode":"queue","content":[{"type":"text","text":"回答你的问询：选第 1 项"}]}}}}'
# ④ 观察：会话日志不再增长；session/list 仍 running:true；turn/end 不出现
```

## 修复就绪（2026-10-18）：用 timed 形态解掉「永久 open」，不动 vendor

**根因收敛到一行配置**：`tool-ask-user` 默认 `mode: 'legacy'`（无限期前台阻塞），而 vendor 同包提供
**`mode: 'timed'`** 形态——前台窗口有界，超时后工具返回 `pending` 结果、问询由 projection 转
**`continued`**（`user-question` 投影注释原文：*"answerable as `continued` in exactly two cases: the tool
returned the pending payload, or …"*），而 **`userQuestions/answer` 恰好只吃 `continued`**
⇒ **RPC 应答通道在该形态下是通的**，本卡「深挖」节卡住的那一段正是被 `legacy` 形态挡住的。
前台 UI 不受损：客户端对 `continued` 有现成卡片（`wait.continued`＝「已继续工作，仍可回答」），迟到的答案以新 turn 进入。

**修法（选定 A′，等价于原推荐 A 但不需要改 vendor 语义）**：

1. 五角色 preset 的 `tool-ask-user` 行加 `config: { mode: timed, timeout: 120 }`——
   与 vendor 默认值一致但**显式钉住**（上游改默认不再静默漂进本仓；本仓 agent-team 行同款纪律）；
   模型仍可在单次调用里传 `timeout` 覆盖。
2. `docs/guides/web-rpc.md` 改成准确口径：不是「回答不走 RPC」，而是「legacy 形态下前台窗口无界 ⇒ RPC 答不了；
   本包钉 timed ⇒ 窗口过后 `continued`，`userQuestions/answer`（`agentId`=SessionId、`callId`、按 `question.id` 各答一次）可用」，
   并给驱动配方。
3. 回放/金样的工具 schema 快照按**有意变更**刷新（legacy→timed 是模型可见面），同 diff 说明。

**不做**：改 vendor（铁律）；`--answer-default` 之类替用户拍板（本卡 D 项，仍不建议）；深链路由（B 项，独立成本，另议）。

## 已修判定

- [x] 五角色 preset 的 `tool-ask-user` 行带 `mode: timed` + 显式 `timeout`；`pnpm test tests/presets` 断言**先红**
      （1 failed / 18 passed）→ 补配置后绿（19/19）。
- [x] 组合自检：`pnpm dsh --profile web --dump-config` 里五角色的该行 config 在场（`mode: timed` / `timeout: 120`）。
- [x] 真挂载：`node checks/smoke/preset-smoke.mjs` ALL PASS（5 个 preset 全部可挂载）。
- [x] 回放 lane：两份 tool-schemas sidecar 按**有意变更**同步（diff 恰为 `ask_user_question` 块：描述 + questions 描述 +
      新增 `timeout` 参数）；同时归因并同步了既有的手册漂移（正文 + `source.digest`）⇒ 默认 lane 与 `--ui` 档
      **均 ALL PASS**。台账记在 `snapshots/replay/r3-delegation/snapshot.yml`。
- [x] `docs/guides/web-rpc.md` 口径改正（「回答不走 RPC」→ 依形态：legacy 挂住 / timed 转 `continued` 可 RPC 答），
      详细配方住毕业 Note（文档行预算门禁强制：指南只留结论与指针）。
- [x] **真模型行为（2026-10-18 补跑，走 DSH 凭据库的 key）**：`probes/session-context/ask-user-timed-probe.mjs`
      **ALL PASS**——窗口到点 → `tool/result` 含 `pending` → `turn/end` → `userQuestions/answer` 返回 true →
      答案以新消息回会话（同轮另有两次实跑：默认 120s / 模型自取 180s，均按窗口收口）。
      ⚠ **但判据只覆盖"窗口有界"这条路**：模型单次传 `timeout: -1` 时窗口回到无界、驱动仍会停住
      ——残留另立 [BUG-022](BUG-022-ask-user-unbounded-timeout-override.md)（已修卡不重开，新卡引用旧卡）；**该卡当日已修**（驱动侧停点判定，见其毕业 Note）。

## 修复关联

**待定（本卡只记发现与判据，未修）**。候选（实施前须先补可复现判据）：

- **A（推荐）**：给 RPC 面一条**显式应答通道**（例如 `session/answer` 或让 `session/prompt` 带 `answersTo:<questionId>` 语义），使脚本化驱动能解前景等待。**守卫**：应答必须绑定到具体 question id（防串答）；未绑定时行为与今天一致（不静默解掉）。
- **B**：给 Web 应用加**深链路由**（`?session=<id>`），至少让「打开指定会话」可脚本化——它单独不足以解问询（还得点选项），但能大幅降低 UI 驱动的成本。
- **C**：把这条限制**写进手册/runbook 的显著位置**（现在只在 web-rpc.md 一句带过），并在动议设计阶段提示「会触发问询的动议不适合无人值守驱动」。最低成本，但不解决自动化。
- **D**：`--answer-default` 之类「无人值守时按推荐项自动作答」——**不建议**：那等于让驱动替用户拍板，P2 下不值得开这个口子。

建议 **A + B**（A 解通道、B 降 UI 驱动成本），C 作为同 diff 的文档补充。

## 本场动议的当下状态（未收口，如实）

`deliverables/2026-10-17-hefeng-recon/` 停在：五份稿中的三份（`ceo` / `vp-eng` / `coo`）已出、两份互审已出、`meta.结果` 留空。**没有伪造收口**：`present` 未调、结果未标终态，`deliverables-check` 对其报 `meta-result-pending`（观察档）——**判据如实反映了「这活没干完」**。
