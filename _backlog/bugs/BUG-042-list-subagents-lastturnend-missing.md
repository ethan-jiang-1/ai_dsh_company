---
status: 修复已落地
severity: P2
opened: 2026-11-08
---

# BUG-042：`list_subagents` 的 `lastTurnEnd` 在真实装配里恒缺——sessionQuery 在 isolate 组内

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：修复已落地｜审查：agent — 修法 = 换层：终态读 root 的 `sessionPersistence`，读不到输出 `unavailable`；keyless 真服务测试 + C2 复验中

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

- **修法（2026-11-08 已落树）**：换层，不搬组——`readChildTerminal` 改用 root 可用的
  `sessionPersistence.open(id, 'read')` → `read(0)` → 最后一个 `turn/end` → `close`；**不再依赖**
  `sessionQuery`（isolate 组内，host 拿不到）。服务缺席或单条日志读失败 → `lastTurnEnd: 'unavailable'`
  （可见降级，禁止静默省略；输出 schema 改为 required）。
- **keyless 测试资产**：
  - `tests/company/delegation-control.spec.ts`：fake persistence 三态（present / absent → unavailable /
    read 抛错 → unavailable）+ 有界重试（前两次失败、第三次成功 → 仍报终态）+ 三次全失败 →
    `unavailable` 且留一条 warn + `readChildTerminal` 的 open(read)/read(0)/close 调用序。
  - `tests/harness/contract/session-persistence-terminal.spec.ts`：**真实** `JsonlSessionPersistence`
    临时 root + `create/append/close` 写日志，读回 `interrupted` / `completed` / 无 turn-end / 不存在；
    红配方 = 丢掉日志最后一条 → 2 条红，还原绿。
- **真实装配复验**：重建 pack 后跑 `runtime/tmp/explore/resume2.mjs`（C2）。通过则 041 的
  “至少 interrupted”恢复成立；本卡归档。
- **真实装配复验（2026-11-09，两次 C2）**：第一次 `list_subagents` 仍返回
  `lastTurnEnd: "unavailable"`；`send_to_subagent` 冷恢复后第二次/第三次返回
  `lastTurnEnd: "interrupted"`。关键环境线索：C2c 的 web 日志两次 boot 都有
  `另一个 writer 正在使用这个 home（pid 98394）`——探针与另一个实例共用 dev home，
  **首次读失败可能是重叠 writer 的环境混淆，不是持久化路径本身**。
  待办：用**独立 DSH_HOME** 的干净重启复验；在那之前本卡保持 `修复已落地`，不归档，
  041 的“真实装配”证据仍不成立。

## 已修判定

- 真实装配（非 fake service）下，宿主重启后的 `list_subagents` 行带 `lastTurnEnd: interrupted`；
  或本仓明确删掉该字段承诺、更新 BUG-041 验收且有替代的可读面。
