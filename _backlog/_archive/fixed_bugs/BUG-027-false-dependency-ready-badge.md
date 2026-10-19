---
status: 已修
severity: P1
opened: 2026-10-19
---

# BUG-027：「依赖已就绪」是假信号——徽章口径被放宽成"依赖都完成了"，与实际假信号正相反

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：已修
>
> **2026-10-19 已修**：根因经实证重写（见「结论」节）——卡上原写的 `ready ?? readyOf()` 回落**不可达**，
> 真缺陷是**徽章渲染门槛不看 status**。修法 = 门槛加 `column.status === 'pending'` + 回落补 pending 半句 + 两条判据。

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

## 结论（2026-10-19 结）：症状真实，**根因不成立**，已按真根因修复

### 一、卡上的根因链有一处硬错：`??` 那个回落**不可达**

卡写「投影 field `ready` 在**已完成**任务上恒为 `false`，**触发了 `??` 的回落**」。
**`false` 不会触发 `??`**——`??` 只在左值是 `null`/`undefined` 时回落。官方在非 pending 上给的是
`false`（`task-view.ts:56` 的有效值），所以 `task.ready ?? readyOf(...)` 在真 wire 视图上**永远走左边**。

实测（`tasksFromTeamView` 吃真 wire 视图）：`readyOnNonPending = 0`。构造用例也证实：
官方 `false` 进 ⇒ 我们出 `false`，**没有回落**。所以「`??` 写成了 `||`」这个诊断是错的。

### 二、真根因：**徽章渲染门槛不看 status**

`company-panels.tsx:117` 的条件是 `card.blockedBy.length > 0`——**只要卡有依赖就挂徽章**，
不管它是待办、进行中还是已完成。真 wire 数据实测 147 枚徽章：

| 卡的 status | 徽章数 | 文案 |
|---|---|---|
| 待办 + 依赖已就绪 | **6** | 「依赖已就绪」← 唯一有意义的一档 |
| 待办 + 依赖未完成 | 10 | 「等 …」← 有意义 |
| **已完成** | **129** | 「等 …」← **噪声**（活早干完了） |
| **进行中** | **2** | 「等 …」← 噪声 |

⇒ 卡说的「131 张已完成卡白挂『依赖已就绪』」**也不对**：那 131 张显示的是「等 …」，不是「依赖已就绪」。
噪声是真的，但形态与卡写的不一样。

### 三、修了什么

1. `company-panels.tsx`：门槛加 `column.status === 'pending'` ⇒ 徽章只在待办卡上出现
   （129+2 枚噪声归零，6 枚「依赖已就绪」与 10 枚「等 …」保留）。
2. `board.ts`：回落值补上 pending 半句（`status === 'pending' && readyOf(...)`）——
   当前**不可达**，但一旦投影改版去掉 `ready` 就会生效，不补就是个埋着的同款陷阱。
3. `board.ts`：`readyOf` 注释订正——它同义的是 **`taskReady`**（只查依赖），**不是 `ready`**。
4. `presence.ts`：注释补上"别去 projcache 找 ownerName"（BUG-026 的成因，防下一个人再被带偏）。

### 四、判据（全部红/绿实证过）

- `tests/company/board.spec.ts`：**真 wire 形状**夹具（带 ownerName/ready/writeScopes）断言非 pending
  一律不报 `ready`；另一条断言 `ready` 缺失时回落也不许放宽。
  **反证**：把回落改回 `readyOf(...)` ⇒ 2 failed；还原 ⇒ 17 passed。
- `tests/client/board-panel.spec.ts`：渲染面断言已完成的卡与进行中的卡**都不出现**依赖徽章，
  且待办卡的两种真信号都还在（防门槛把合法标签一起吞掉）。
  **反证**：门槛改回无条件 `blockedBy.length > 0` ⇒ 2 failed；还原 ⇒ 5 passed。

### 五、同族第二处：任务板表格的「（阻塞）」（本轮搭车修了）

`TasksPanel.tsx` 直接吃 wire 的 `ready`，判据是 `task.ready === false ? '（阻塞）' : ''`——
与看板徽章**同一个 bug**（不看 status）。真 wire 实测：298 行里 **280 行**挂「（阻塞）」，
其中 **273 行是非 pending**（活都干完了还标阻塞）。已修（条件加 `task.status === 'pending'`），
判据 = `tests/client/tasks-table.spec.ts`（红/绿实证：门槛退回 ⇒ 2 failed，还原 ⇒ 3 passed）。

### 六、未搭车（如实留缺口）

- `dag.ts` / `statusBadge` 的「可开工」文案问题（in_progress 也吐 `wk-dag-ready`）**本轮未修**——
  它是文案层同族问题，与本卡的假信号不是同一处；卡上原本就写"由实施者判"，本轮判**不搭车**，
  留给依赖图那张深挖卡。
- 真浏览器未开（本轮口径 = 读码 + 真数据 + keyless 渲染）；DOM 面另有 `board-panel.spec.ts` 的
  静态渲染覆盖，视觉走查归 UX 深挖卡。

### 七、暴露的失败类

**回落值必须与官方语义等价，而不是"看起来差不多"。** `readyOf` 的注释自称与官方同义，
但它同义的是 `taskReady`（依赖检查），而字段是 `ready`（依赖检查 ∧ 自己是 pending）——
差一个合取项，读者就以为可以互换。这与 BUG-026/025 是同一族的第三例：
**名实不符的"同义实现"注释，比没有注释更危险。**
