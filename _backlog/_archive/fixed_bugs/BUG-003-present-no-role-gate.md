# BUG-003：present 工具无角色门禁——任意角色根会话可 present 过程稿直呈用户，绕过成品专属性

> 严重级别：P1（重要——多人形态下每个门都能把文件直呈其人，公司层「成品声明权归 CEO」只剩文案自觉）｜发现：2026-10-06（多人 UX bug 猎捕 S2，用户立项）｜状态：活跃 — 已修复 2026-10-06：判据层补 DRAFT_PRESENTED_BY_NON_LEAD 观察档（scripts/lib/deliverables.mjs + tests/company/deliverables.spec 3 例红→绿：非 Lead present 过程稿→观察项、Lead present→无、非 Lead present 成品→既有违规不互吞）。**检测缺口精确定位修正**：成品侧越权本有 FINAL_PRESENTED_BY_NON_LEAD 违规检测（卡内「零检测」表述过宽）；过程稿侧系单操作者语境的**有意容忍**（库内设计注释原文），多人形态将其作废。live 复验 = 违规 0 保持 + 历史成员会话 present 浮为观察项（成员继承 ceo 组合 ⇒ agentPreset=ceo、depth≥1 的历史形态实证）；观察项噪声若需压缩再议名册制。收据 = 修复 commit（同 diff 含 spec 与门禁绿）。

## 症状

排练实测（`scripts/probes/fs-taskboard/task-discovery-probe.mjs` run1，CFO 根会话执行 T1 经济性测算）：CFO 完成高质量过程稿后，自行推理「present the draft as the main deliverable for visibility」并调用 `present` 把 **drafts/cfo.md（自己的过程稿）**直呈用户。推理原文（会话日志 session-0515fb44 step 32）：

> "I should present the draft as the main deliverable for visibility … so I'll finalize with the file presented."

手册的成品三态/承诺权（final 归 CEO、对外文本须 CEO present、过程稿不是对外承诺）被绕过；vendor 工具描述本身就叫 "Declare existing files as **final deliverables** for the user"——模型跟随工具语义而非公司规矩，机制层无任何拦截。

## 根因（假设）

vendor `tool-present` 无角色/文件形状门禁（本 pack 只是把它 insert 进 bundle 行）；公司承诺权纯靠手册文案自觉，而 present 的 vendor 语义与公司「成品」语义冲突；**审计盲区**：`deliverables-check` 只查「每个 final.md 能否回溯到 CEO 的 present」+「CEO present 过的还在不在」——**非 CEO 会话发起的 present、以及 presented 的非 final 文件，零检测**（本例 presented 的是 drafts/ 过程稿，判据面完全不覆盖）。

## 暴露的失败类

机制无门禁 × 语义冲突类：单操作者模式下危害被「通常只有 CEO 在场」掩盖；**多人形态每个门都是根会话** ⇒ 承诺权在机制层面形同虚设。同族横切面：present 的对象形状（final vs draft）、发起者身份（agentPreset）都是可机检维度，当前均无检查。

## 复现

```sh
DSH_HOME=dev/harness-home node scripts/probes/fs-taskboard/task-discovery-probe.mjs
# 判据 B3 捕捉（run1 = present 在场 ⇒ FAIL；探针判据已按 run1 校准 v2）
```

资产：`snapshots/probes/task-discovery-probe/2026-10-06/`（stdout、盘面快照、证据摘要含 present 调用原文与推理链）。

## 修复关联

建议最窄落点 = **审计层**：deliverables-check（或伴生检查）从会话日志提取全部 `present` 事件，断言「发起会话 agentPreset = ceo 且 presented 路径 = final.md」，违者报违规（P1 语义、keyless、可反证：塞一条 cfo present 事件进 fixture 必须红）。次选 = 手册层补一句「present 只在 CEO 收口步使用」——但 run1 实证模型跟工具语义走，纯文案防线弱（journal 缺席 8→8 红证同款先例）。机制层（工具行按角色裁剪）= 上游 seam。
