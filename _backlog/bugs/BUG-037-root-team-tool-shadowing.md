---
status: 修复就绪
severity: P2
opened: 2026-11-08
---

# BUG-037：根会话的团队版控制名 shadow 全局版——契约说“根不是成员”，实际根就是 Lead

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：修复就绪

## 症状

VP-Eng 根会话（无 parentSession）里，模型起了一个 `subagent` child 后想等/催它：

- `list_agents` 返回 `[{"target":"lead","role":"lead","status":"running",...}]`——只列 Lead 自己；
- `send_message` 以 child id 为 target → `Error: active teammate "<id>" not found`
  （`TeamError` / `TEAM_MEMBER_NOT_FOUND`）；
- `wait_agent` → `noProgress.reason = "no-active-peer"`。

即：根会话拿到的是**团队版**控制名，preset 里声明的 `tool-subagent-control` / `.../list-agents`
（全局版）被 shadow；根无法 steer 自己起的 generic child。模型在 R3 为此浪费了 3 次工具调用，
最后只能结束本轮等完成通知。

同一机制在 `docs/delegation.md` §4.4 与五个职能 preset 的注释里被写成“职能根会话不是团队成员”，
与 §2.1“任何没有 parentSession 的根会话都是 Lead”自相矛盾。R3 的 child（W1，有 subagent
descriptor）反而拿到全局版：`list_agents {scope:'children'}` 能看到自己的 W2，`send_message
{agent_id}` 能回父——证明“根 = Lead、命名/普通 child = 非成员”的分野。

## 根因（假设）

vendor `agent-team` 的 `tryMembership`：有 parentSession 且无 subagent descriptor 的 agent 被解析为
**自己的 Lead**；`tool-agent-team` 的 maybeInstall 只对 membership !== undefined 的 agent 装团队版
控制名 → 根会话必装并 shadow 全局版。preset 的全局控制行只对**非成员 child**（命名 child /
generic subagent child）有效。本仓注释与 §4.4 把“根”误写成“非成员”，契约文档随之漂移。

## 暴露的失败类

- 模型面向的 `send_message` 名字被团队版占用：根门无法完成“steer 自己的 worker”这一文档承诺；
  错误文本只在团队语义里解释，模型需要自己推断“这名字不是我以为的那个”。
- 契约文档与机制矛盾：读者按 §4.4 会以为根门有全局控制行，按 §2.1 又会以为根是 Lead；
  维护者据此写出的 preset 注释也重复了错误前提。

## 复现

1. vp-eng 根会话（`agentPreset: vp-eng`），按 R3 prompt 让根起 W1、W1 起 W2。
2. 读父会话 `request/header.tools`：`send_message` / `list_agents` / `wait_agent` 均为团队版描述。
3. 观察 `list_agents` 只回 `lead`、`send_message` 对 child id 报 `active teammate not found`。
4. 证据：`runtime/tmp/explore/ex1/R3/summary.json`；会话 `session-a37d2e61-4c2b-4f72-92aa-29540e0eef01`；
   child `9be2a2e4-...` 的 `list_agents` / `send_message` 为全局版（反证）。
5. 机制源码：`vendor/dsh/packages/experimental/agent-team/src/roster.ts` `tryMembership`；
   `vendor/dsh/packages/experimental/tool-agent-team/src/index.ts` `maybeInstall`。

## 发现路径（探索方向）

“委派深度链”charter（R3）：为了让每一层都真实委派，prompt 要求 W1 再用 `subagent` 起 W2；模型
自然尝试 `list_agents` / `wait_agent` / `send_message` 去等孙代，撞出根门控制面 shadow。
**探索方向提示**：凡“子代要等/催自己的子代”的嵌套委派场景，都先看控制名是哪一版；把“工具名字”
当作要验证的机制，而不是自然语言里的“等它完成”。

## 修复关联

- 同轮修正：`docs/delegation.md` §4.4 改成“根 = Lead（团队版 shadow 全局版）；命名/普通 child 非成员，
  全局行只对它们生效”；五个职能 preset 的续驶控制面注释同步；`eng-teaming` 加控制面规则
  （根门够不到 child；child 终稿走完成通知；不要 sleep 轮询）。
- M2 natural 复跑仍见 `wait_agent` 被用于 child（团队版，`no-active-peer`）；首版 `eng-teaming` 只列了
  `send_message` / `list_agents`，已补 `wait_agent` / `interrupt_agent`（2026-11-08 同日）。
- 机制本身（vendor shadow）未改；可选后续：在本仓加一个不与团队名冲突的全局控制工具名、或接受并
  在合同里写死“根门不提供 child steer”。

## 已修判定

- 文档与 preset 注释不再声称“职能根会话不是团队成员”；且
- 模型在根门不再尝试用团队版 `send_message` / `wait_agent` 等 subagent child（真实会话可观察），
  或本仓提供了可用的替代控制名并有绿证据。
