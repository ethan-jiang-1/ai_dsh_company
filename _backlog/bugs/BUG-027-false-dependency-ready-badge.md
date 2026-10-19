---
status: 调查中
severity: P1
opened: 2026-10-19
---

# BUG-027：「依赖已就绪」是假信号——徽章口径被放宽成"依赖都完成了"，与实际假信号正相反

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：调查中

## 症状

看板上**已经完成**的任务卡带着「依赖已就绪」徽章，而真正"可开工"的待办任务**一个都没有**这个徽章。
真投影实测（84 个非空板、379 个任务）：

```
依赖全部完成、且带 blockedBy 的任务卡：137 张
  ├─ 已完成（白带徽章，无意义）      131 张   ← 假信号
  └─ 待办（真正的"可以开工了"）        6 张   ← 该轮到的没轮到
```

"依赖已就绪"这句话对一张 `status = completed` 的卡的意思只能是"这活可以开始做了"——
而它已经做完了。**读它的人会以为板上还有 131 项活儿等着开工。**

## 根因（已确认，读码级 + 真数据级）

官方语义：`task-view.ts:56` — `ready: task.status === 'pending' && taskReady(state, task)`。
**`ready === true` 只可能在 pending 态**；非 pending 时官方恒给 `false`（真数据 100% 符合：ready-on-non-pending = 0）。

我们的读模型把这个语义**放宽**了：

1. `packages/company-pack/src/lib/board.ts:193` — `ready: task.ready ?? readyOf(blockedBy, statusById)`
2. `packages/company-pack/src/lib/board.ts:162-164` — `readyOf()` 只算 `blockedBy.every(completed)`，
   **不看自己的 status**

于是：
- 投影 field `ready` 在**已完成**任务上恒为 `false`，**触发了 `??` 的回落**，取到我们的 `readyOf` = `true`。
- 投影 field `ready` 在**待办且依赖已全完成**任务上应为 `true`，但本轮实测 `pendingReady = 0`
  ——说明这批样本里没有 pending+db 全完成的任务，`readyOf` 回落**在真板上报出来的 6 张合法标签
  也是 `readyOf` 算的**（同一函数两种结果，见下"为什么会这样"）。
3. `company-panels.tsx:117-121` — 只要 `card.blockedBy.length > 0` 就渲染徽章，文案 `card.ready ? '依赖已就绪' : '等 …'`。

**为什么会这样（更深一层）**：`??` 只在左值为 `null`/`undefined` 时回落，`false` 是**有效值**
却被当成"缺失"。这是一个 **`??` 与 `||` 混用**的经典错误——`task.ready ?? readyOf(...)` 在语义上
写成了 `task.ready || readyOf(...)`。**这个错误把一个本来就正确的官方字段作废了。**
同时它解释了本 BUG 与 BUG-026 是**同一个数据形状**造成的（投影没带 owner 名让你以为"字段经常缺"，
于是写代码的人给所有字段都加了回落——有的字段 `??` 是安全网，`ready` 这个 `??` 是陷阱）。

## 暴露的失败类

**"官方给了真值，我们却用自己算的覆盖它"**。回落逻辑本身不是错（投影字段可能缺），错的是
**回落值必须与官方语义等价**。`readyOf` 的注释写着「官方 `taskReady` 的同义实现」——它同义的是
`taskReady`（依赖检查），**不是 `ready`**（依赖检查 ∧ 自己是 pending）。一句话：
**注释说的和 `ready` 字段的范围不一样，读者以为同义。**

横切排查：`board.ts` / `dag.ts` / `presence.ts` 里凡 `??` 承接 wire 字段的地方（`revision ?? 0`、
`task.status`、`task.blockedBy ?? []`）逐条对官方语义——本轮 `dag.ts` 的 `waitingOn` 注释已写明
「悬空 blocker 按未完成计（与 `board.ts` 同口径）」，暂未发现第二处**语义级**宽松。

## 复现

```sh
cd /Users/bowhead/ai_dsh_company
node -e "
const {readdirSync,readFileSync}=require('fs');
const dir='runtime/harness-home/storages/session_projcache/sessions';
let falseReady=0, legit=0;
for(const f of readdirSync(dir).filter(x=>x.endsWith('.json'))){
  const ts=JSON.parse(readFileSync(dir+'/'+f,'utf8'))?.record?.rows?.agentTeam?.val?.tasks;
  if(!Array.isArray(ts)||!ts.length) continue;
  const st=new Map(ts.map(t=>[t.id,t.status]));
  for(const t of ts){
    if(t.status==='deleted') continue;
    const bb=t.blockedBy??[]; if(!bb.length) continue;
    if(!bb.every(id=>st.get(id)==='completed')) continue;
    if(t.status==='pending') legit++; else falseReady++;
  }
}
console.log({cardsShowing_dependencyReadyTag_on_nonPending:falseReady, legit_pending_tags:legit});"
# 实测：{ cardsShowing_dependencyReadyTag_on_nonPending: 131, legit_pending_tags: 6 }
```

## 修复关联

**修法已选定**（因此可走 `修复就绪`，但本轮按用户指令只推敲不实施，卡停在 `调查中`）：

1. `readyOf` → 改名/改义或**只在 pending 态使用**：`ready: task.status === 'pending' && (task.ready ?? readyOf(...))`
   —— 与官方 `projectTaskView` 逐字同义。
2. `board.ts:156-164` 的注释订正：说清 `readyOf` = `taskReady`（只查依赖），**不等于** `ready`。
3. 徽章的渲染门槛也顺带改：只有 `pending` 卡才需要「依赖已就绪 / 等 …」——已完成/进行中的卡
   不该出现这枚徽章（131 张白带换成 0 张，6 张真值留下）。
4. 判据（防复发）：`tests/company/board.spec.ts` 加一条**以真投影的字段组合**为输入断言
   `ready === false` 当 `status !== 'pending'`——现有 spec 的夹具（`view()` 手造对象）**没有一条
   钉住"非 pending 不许报 ready"**，这是它从未红过的原因。

## 已修判定

- 与官方 `projectTaskView` 同义：`ready === true` ⟺ `status === 'pending'` ∧ 依赖全完成。
- 看板上「依赖已就绪」徽章只出现在 pending 卡上；真投影复跑该脚本时
  `cardsShowing_dependencyReadyTag_on_nonPending` **必须为 0**、`legit_pending_tags` 不变。
- `tests/company/board.spec.ts` 有真形状夹具断言；`readyOf` 注释不再自称与 `ready` 同义。
- 依赖图同源（`dag.ts` 的 `waitingOn`）复核一遍：`会显示「可开工」的节点必须真的可开工`
  （现 `statusBadge` 对 pending 与 in_progress 都吐 `wk-dag-ready` 样式——见调研 §四，
  这是**同一族**的文案问题，是否搭车修由实施者判）。
