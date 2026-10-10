---
status: 推敲中
opened: 2026-10-10
---

# 推敲：收口说人话——高层看卡即懂，报告体在后

> 立卡：2026-10-10 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否

**问题与期望结果：** 用户（高层、懂业务、非技术）原话："能看到大家都在忙，但忙完出来的内容
很生涩，可以说人话吗？一个事情结束后至少结论、下一步要说出来，当然有报告也好。"
现场证据：ai-transformation-2026 `final.md` 首屏 = 5 行机器元数据（slug/权威版号/命名规则…）
才到结论；成员 journal 开口就是"T1 事实包（v1，79 行）｜T4…均已完成并 complete"。
期望 UX：**一个事情结束后，先说人话——结论、下一步、要我拍板的事**；报告体在后，想看再看。

**当前情况（DSH 现成机制调研结论——不需要新工程）：**
1. **present 工具自带 `description` 字段**（"Brief description for the user"，tool-present/src/index.ts:52）
   且 **`PresentedFileCard` 直接渲染它**（ui-deliverables/src/client/PresentedFileCard.tsx `cardDescription`）
   ⇒ 收口 present 带说人话摘要，用户在交付卡上**直接看到**——零新工程的现成通道。
2. 待办面板「完成通知」格 = present 落稿即告知（手册既有四格之一）——同一事件的另一呈现面。
3. session-turn-outline（"大家都在忙"的回看导航）与 session-title-llm（自动人话标题）是 DSH
   既有的"自动人话"先例——本需求**用不上新机制**，结论：**最合理手段 = 现成 description 通道 +
   收口口令 + 模板首屏**。

**拟实施清单（待用户 review）：**
1. **四模板首屏加「## 一分钟摘要（说人话）」**（decision-memo / ops-review-note / prd / review-note）：
   三段式——①发生了什么（一句话）②结论（≤3 条，业务语言）③下一步（谁/何时）＋要用户拍板的事；
   **禁内部黑话**（闸门/T号/锚/等级/slug）；注"这段同款文本写进 present 的 description"。
2. **CEO persona 收口原则加一条**：final 首屏一分钟摘要 + present description 同款 +
   分派时要求成员回报格式 = 结论/下一步/卡点（禁过程黑话）。
3. **chairing-staff-meeting 收口步（step 5）**：加"首屏说人话 + present description"两行。
4. **手册交付物三态加一条 bullet**：成品首屏说人话（一分钟摘要），机器元数据随后。
   验证：preset-smoke（persona copy 改动）+ keyless tests + verify；模板为公司盘文件无单测面。

**未决问题：**
1. decision-memo.md 曾按此顺手试改一处，立卡时已回退——清单获批后统一实施。
2. 黑话禁令要不要成文对照表（闸门→"卡在等什么"、锚→"出处行"、A/B/C 级→"读到原文/只看标题/转述"）？
   建议先不成文（摘要三段式已逼着说人话），出现再补。
3. 成员回报三件套（结论/下一步/卡点）是否够——是否加"要用户拍板的"第四件？

**下一步：** 用户 review 拟实施清单 → 拍板（照单 / 改单）→ 按 preset-change-definition + 模板流程实施。

## 验收标准（2026-10-10 批单"可以"后补，validation-design）

| 件 | 怎么算完成 |
|---|---|
| 四模板首屏「一分钟摘要」 | 每模板有该段（三段式 + 黑话禁令注）；实读一遍顺口 |
| CEO persona 收口原则 | 含三句（final 首屏摘要 / present description 同款 / 成员回报三件套）；preset-smoke 挂载不红 |
| chairing-staff-meeting 收口步 | step 5 增两行（首屏说人话 + present description） |
| 手册交付物三态 | 一条 bullet；行预算 ≤195 |
| 真验收（关闭条件） | 下一个真实动议收口，用户确认"说人话了" |

## 实施 receipt（2026-10-10，批单后即实施）

- 四模板「一分钟摘要」段 ✔（decision-memo / ops-review-note / prd / review-note，统一插在
  fail-closed 行后、首个 ## 节前）
- CEO persona 收口原则 ✔（首屏说人话 + present description 同款 + 成员回报三件套）
- chairing-staff-meeting step 5 ✔（首屏说人话 + present description 两行）
- 手册交付物三态 bullet ✔（191/195）
- 验证：452 tests / 44 files 全绿；preset-smoke ALL PASS；verify ALL PASS。提交 088b273。
- **剩余 = 真验收（关闭条件）**：下一个真实动议收口，用户确认"说人话了"→ 卡迁已结。

## 范围与排除项

不做窗口/vendor 层改造（present 卡与待办面板是现成面）；不动 turn-outline/compaction（导航与
上下文面，不是决策者面）；不改 authorship-audit 的署名行位置（机器契约在前一行，摘要紧随）。

## 关闭条件

清单获批并实施、preset-smoke ALL PASS，且**下一个真实动议的收口**由用户确认"这次说人话了"。
