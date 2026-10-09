# BUG-005：双签线在多门形态退化为单签——request_signoff 按发起会话路由，CEO 人无批准通道

> 严重级别：P1（重要——双签线的双人裁决被机制弱化为单人，签字线强度实质下降）｜发现：2026-10-06（多人 UX bug 猎捕 S4，用户立项）｜状态：活跃 — 已修复 2026-10-06（流程层）：①手册审批三档「必批」行内原行扩写多人双签补签流程（发起人发卡后标注「待 CEO 门补签」→ CEO 门在同一稿件文件层具名同意/不同意 → 两签齐才算完整——单签 = 未过线不得继续；195 行预算内）；②multi-human.md §0 登记日志只读半旁路（session_event_read 跨会话授权：可见性半旁路、处理通道为零——BUG-005 现场实测事实，先前手册未记）；③机制层（审批联签原语/面板跨门可见）留 vendor 上游 seam 不做（vendor 只读铁律）；④dual-signoff-probe 判据校准 v2（B2 从「CEO 侧不可见/不可处理」改为「CEO 知道补签流程并能执行」——修复前 v1 正确判定缺口、修复后 CEO 仍看不到面板[机制不变]但知道流程[防线生效]——防线从「机制可见」移到「流程可知」）+ 真模型复验 PASS：CEO 明确回答「看得到（作为历史记录），处理不了（不同门）……它没有出现在我的任何待办/面板/可操作面上」**同时知道文件层补签流程**（「CEO 半边只能文件层补签」——读了新手册，上一次跑的遗留稿件还在盘上作为佐证）。收据 = 修复 commit。

## 症状

排练实测（`scripts/probes/session-context/dual-signoff-probe.mjs` run1，CFO/CEO 两根会话，28.125% 毛利触线）：

- **B1 正例稳定**：CFO 根会话自己发 `request_signoff`（args 完整：line/summary/数字精确到 28.1250%、差额 $1,800）——multi-human.md §0 的正例复验通过。
- **B2 缺口确认**：CEO 根会话被问及该请求时的实测回答（原文）：
  - 它**能**从会话日志读到请求存在与等待状态（`session_event_read` 只读通道跨会话授权——可见性有半条旁路，手册未记载此通道）；
  - 它**不能**看到自己门上面板有任何卡（"whether the human-facing panel could show CEO's door anything — Not accessible to me"）；
  - 它**不能**代替处理（"I can't reach it via approved/userQuestions.answer — I can't call services"）。
- ⇒ 双签（CFO+CEO 两人裁决）的机制兑现 = 卡只落 CFO 门、只有 CFO 门的人能点批准——**CEO 的人没有任何批准通道**，双签退化为单签。

## 根因（假设）

DSH 单操作者设计：审批/问询的路由键 = 发起 agent 的会话（multi-human.md §0 机制事实），批准动作绑定该会话作用域；「双签」是公司层概念（两个人都要裁决），机制层没有多收件人/联签原语——单操作者模式下同一人开两扇门补齐两次，多人模式下第二个人被绕过。

## 暴露的失败类

公司概念 × 机制原语错配类：「双」住在手册里，「签」住在会话作用域里。同族横切面：任何「多人裁决」类规矩（升级、会签）在多门形态下都要核路由键；可机检维度 = 审批事件的会话作用域 vs 规矩要求的裁决人集合。

## 复现

```sh
DSH_HOME=dev/harness-home node scripts/probes/session-context/dual-signoff-probe.mjs
# 退出码 1 = 缺口在场（B1 发卡 + B2 CEO 侧不可见不可处理）
```

资产：`snapshots/probes/dual-signoff-probe/2026-10-06/`（stdout 含 CEO 回答原文转录、CFO 发卡 args、证据摘要）。

## 修复关联

候选落点（待裁决）：①**流程层最窄**——手册「问人两条路」多人版补一条：双签线 = 发起人（CFO 门）把 request_signoff 发出后，**CEO 门的人在自己的会话里说一声同意/不同意**（文件层补签：CEO 在预算件/报价件上具名「同意/否」+ CFO 门的人据实点卡）——纯文案、当轮可用；②机制层 = 上游 seam（审批多收件人/联签原语，vendor 提案）；③CEO agent 的日志可见性半通道（session_event_read 能读到别门请求存在）值得在 multi-human.md §0 登记——现手册没记这条旁路。修复后复跑探针转绿（B2 判据 = CEO 侧有可操作的兑现途径）。
