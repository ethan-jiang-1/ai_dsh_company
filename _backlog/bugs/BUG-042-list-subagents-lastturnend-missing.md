---
status: 调查中
severity: P2
opened: 2026-11-08
---

# BUG-042：`list_subagents` 的 `lastTurnEnd` 在真实装配里恒缺——sessionQuery 在 isolate 组内

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：调查中

## 症状

C2 cold-resume 实测（宿主重启后、`send_to_subagent` 唤醒前）：

```json
{"subagents":[{"id":"b4806475-…","label":"Sleep then read version","mode":"continuable","status":"inactive"}]}
```

**没有 `lastTurnEnd` 字段**。工具描述明确承诺：“`lastTurnEnd` is the reason its durable log recorded for
the last turn (e.g. `interrupted` after a host restart, `completed`); it is absent when the log cannot be
read.” 而 child 的 durable 日志里确实记着 `turn/end {"reason":{"kind":"interrupted"}}`。

后果：父会话看到 `inactive`，**分不清“空闲/已完成”和“被宿主重启打断”**；BUG-041 的验收
“至少能读到 interrupted” 在真实装配里没有满足。`send_to_subagent` 仍然可用（C2 里成功唤醒 child），
所以是**诊断缺口**、不是阻断。

## 根因（假设）

`registerDelegationControl(ctx)` 在 pack host 插件上下文里执行，而 `company-session-query-sqlite` 挂在
`cordis.patch.yml` 的 `company-session-search` **`isolate: { sessionQuery: true }`** 组内——host 的
`ctx.get('sessionQuery')` 是 `undefined`，`list_subagents` 的终态增强整段被 `fail-soft` 跳过。
修复轮的 `tests/company/delegation-control.spec.ts` 给 `list_subagents` 注入的是 **fake `sessionQuery`**，
所以门禁全绿；真装配里没有这个服务。修复 Note 的 standalone durable 读（`sessionQuery.readSession`）
用的是另一条上下文，不能证明 host 工具能拿到它。

## 暴露的失败类

- “模型可见面 ≠ 引擎语义”：引擎 durable 日志里有 `interrupted`，模型面只有 `inactive`。
- 测试替身盲区：spec 用 fake service 钉形状，钉不出“真实装配里服务缺席”。
- 与 BUG-041 叠加：041 的修复把“至少 interrupted”押在 `lastTurnEnd` 上，但该字段在真实 profile 恒缺。

## 复现

1. `node runtime/tmp/explore/resume2.mjs`（起 child → SIGTERM 宿主 → 同 home 重启）。
2. 重启后 prompt 父会话“查一下 worker 状态”；读 `list_subagents` 的 tool result：无 `lastTurnEnd`。
3. 读 child JSONL：`turn/end {"reason":{"kind":"interrupted"}}` 确实存在。
4. 证据：`runtime/tmp/explore/ex4/C2/transcript.json`；父 `session-6aa105d6-…`；
   child `b4806475-027e-4727-91cb-6696823f6f8d`；`packages/company-pack/cordis.patch.yml` 的 isolate 组。
5. 干净复跑（C2b，带 fixture）：`send_to_subagent` 唤醒成功、读到 `1.4.2`，但 `list_subagents` 仍无
   `lastTurnEnd`；父 `session-116e7eee-…`、child `c4ca0b8d-…`。
6. 后台 job 复现（C7）：重启后 4 个 workflow child 都是 `continuable/inactive`、无 `lastTurnEnd`；
   父只能手动 `send_to_subagent`。父 `session-dcb4ff32-…`。

## 发现路径（探索方向）

“cold resume / 新控制面”charter（C2）：不是只看 `send_to_subagent` 能不能唤醒，而是看**唤醒前父会话
能区分什么**。**探索方向提示**：新工具描述里的每个字段都要在真实装配里验一遍，尤其是“可选增强”
（`ctx.get` 拿不到就静默省略）——fake service 的 spec 会把它藏起来。

## 修复关联

- 候选修法：① 把 `registerDelegationControl`（或至少 `lastTurnEnd` 的读面）放进能看见 `sessionQuery`
  的组；② 从 host 能拿到的 durable 读面注入一个 reader；③ 如果两者都不做，删掉 `lastTurnEnd` 承诺
  并重写 BUG-041 的验收（“至少 interrupted”改由别的可读面满足）。
- 已在本卡记录，不改代码等用户/修复 Agent 定。

## 已修判定

- 真实装配（非 fake service）下，宿主重启后的 `list_subagents` 行带 `lastTurnEnd: interrupted`；
  或本仓明确删掉该字段承诺、更新 BUG-041 验收且有替代的可读面。
