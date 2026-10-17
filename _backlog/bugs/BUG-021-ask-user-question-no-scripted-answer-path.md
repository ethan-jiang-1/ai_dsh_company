---
status: 调查中
severity: P2
opened: 2026-10-17
---

# BUG-021：`ask_user_question` 的脚本化回答通道缺失——RPC 驱动会永久挂在问询上

> 严重级别：P2（次要——不损坏数据、不误导判据，但**让「RPC 驱动的真会话」在遇到问询时无法自行收口**，只能靠人在 UI 里点）｜发现：2026-10-17｜状态：调查中

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

**「人机回路的前景等待，只有一条通道能解，而那条通道不是为自动化设计的」**——与 [BUG-005](../_archive/fixed_bugs/BUG-005-dual-signoff-single-door-routing.md)（双签的另一签不会自动路由到 CEO 门）同族：**都是「机制停点存在、但停点的应答路径没跟上多门/自动化形态」**。

**是否需要横切排查**：是，范围限「所有前景等待类停点的应答通道」——`ask_user_question`（本条）、`request_signoff`（BUG-005 已修文件层补签，但 `request_signoff` 本身在无人值守时按 `approval/policy=never` 直接 `rejected`，见第三场实测）。建议口径：**每个停点都要能回答「脚本化驱动怎么解它」**；答不出就该在手册里写明「此停点必须人参与，自动化跑到这里就停」。

## 追加证据：会话最终**掉线**（不是自行恢复）

问询挂起约 40 分钟后复查：`session/list` 的 `running` 由 `true` 变 **`false`**，会话日志停在
**161 行 / 26 次 `tool/call`**（最后一次写入 07:59:50，此后不再增长），且**始终没有 `turn/end`**
⇒ 该 turn **从未收口，会话被丢弃**。交付物 `deliverables/2026-10-17-hefeng-recon/` 停在
`meta.结果` 留空（`deliverables-check` 报 `meta-result-pending` 观察档、**违规 0 条**——判据如实）。

**这条比「挂住」更硬**：挂起是不可脚本化，**掉线是这活直接丢了**（那场动议的诊断结论没落地）。
所以本卡的严重级虽为 P2（不损坏数据、不误导判据），**但它会静默吃掉一场已经跑了 26 步的动议**。

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

## 修复关联

**待定（本卡只记发现与判据，未修）**。候选（实施前须先补可复现判据）：

- **A（推荐）**：给 RPC 面一条**显式应答通道**（例如 `session/answer` 或让 `session/prompt` 带 `answersTo:<questionId>` 语义），使脚本化驱动能解前景等待。**守卫**：应答必须绑定到具体 question id（防串答）；未绑定时行为与今天一致（不静默解掉）。
- **B**：给 Web 应用加**深链路由**（`?session=<id>`），至少让「打开指定会话」可脚本化——它单独不足以解问询（还得点选项），但能大幅降低 UI 驱动的成本。
- **C**：把这条限制**写进手册/runbook 的显著位置**（现在只在 web-rpc.md 一句带过），并在动议设计阶段提示「会触发问询的动议不适合无人值守驱动」。最低成本，但不解决自动化。
- **D**：`--answer-default` 之类「无人值守时按推荐项自动作答」——**不建议**：那等于让驱动替用户拍板，P2 下不值得开这个口子。

建议 **A + B**（A 解通道、B 降 UI 驱动成本），C 作为同 diff 的文档补充。

## 本场动议的当下状态（未收口，如实）

`deliverables/2026-10-17-hefeng-recon/` 停在：五份稿中的三份（`ceo` / `vp-eng` / `coo`）已出、两份互审已出、`meta.结果` 留空。**没有伪造收口**：`present` 未调、结果未标终态，`deliverables-check` 对其报 `meta-result-pending`（观察档）——**判据如实反映了「这活没干完」**。
