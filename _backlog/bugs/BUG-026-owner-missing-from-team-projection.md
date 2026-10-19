---
status: 调查中
severity: P1
opened: 2026-10-19
---

# BUG-026：owner 全线缺失——`agentTeam` 投影不带 `ownerName`，看板/依赖图/任务板全显示「未分配」

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：调查中

## 症状

看板每张卡、依赖图每个节点的 owner 徽章**全部**是「未分配」；任务板表格的 owner 列**全部**是
「未分配」。在**真投影**（1738 个会话的 `session_projcache`）上样本 100%：

```
379 个任务（84 个非空板），其中 344 个任务在存储里**有** owner（ownerId），
但 ownerName 字段 379/379 全部缺失 ⇒ 我们渲染 379/379 全部「未分配」
```

**已排除**：不是"任务本来就没人分"。盘上同一份数据里 `ownerId` 覆盖 344/379，成员名册也在
（`members[].name = 'vp-sales'` 等）；只要把 ownerId 过名册就能解出 344 个 owner。

## 根因（已确认，vendor 读码级）

**投影里本来就没有 `ownerName`，是被上游投影 schema 剥掉的**：

1. `vendor/dsh/packages/experimental/agent-team/src/task-view.ts:38-40` — `projectTaskView` **算得出来**
   `ownerName`（`ownerId` → 名册名，lead 特判成 `'lead'`），供**工具/host**的运行时视图用。
2. `vendor/dsh/packages/experimental/agent-team/src/projection.ts:321-332` — `teamTaskViewSchema` 是
   `.strict()` 的 z.object，**显式没有 `ownerName`** 这个 key ⇒ 发布给浏览器的 `agentTeam` 投影
   **不含** owner 名。`ownerId` 也不在 schema 里。
3. 我们的读模型 `packages/company-pack/src/lib/board.ts:181-190`（`tasksFromTeamView`）读的是
   `task.ownerName ?? null`，于是恒为 null。
4. 落盘实证：真样本 `{"id":"task-1", …, "status":"completed", "ownerId":"ed50c1ec-…", "blockedBy":[]}`
   —— 存储里**有** `ownerId`（name 同文件 `members[]` 里可解出 `vp-sales`），但**没有** `ownerName`。

结论：**这不是我们 client 的 bug，是 0.1.7 升 pin 时数据源改判留下的口径缺口**
（`use-company-data.ts:5-13` 记了改判，但没记 owner 名丢了自己算）。`presence.ts:161-163` 的注释
还写着「`TeamTaskView` 不带 ownerId，只有 ownerName」——**这句现在是反的**，是过时口径造成误判。

## 暴露的失败类

**升 pin 时只核了"数据在哪"，没核"字段还在不在"**。`TeamTaskView`（工具视图，带 ownerName）与
`teamProjectionSchema`（投影视图，不带）是**两个形状**，0.1.7 把读法从 RPC 改到投影时形状变了，
我们的读模型沿用旧形状读，缺字段静默降级成「未分配」——**fail-open**，没有任何报错。
横切排查：本轮已把看板/依赖图/任务板三处 owner 读法都过了一遍（都走 `tasksFromTeamView` 一个口），
所以修复面是一处；但同族风险在 `presence.ts:164-177`（在场板 `currentTask` 也按 `ownerName === member.name`
关联，同样恒 null）——见下方「修复关联」第 4 条。

## 复现

```sh
cd /Users/bowhead/ai_dsh_company
node -e "
const {readdirSync,readFileSync}=require('fs');
const dir='runtime/harness-home/storages/session_projcache/sessions';
let total=0, ids=0, names=0;
for(const f of readdirSync(dir).filter(x=>x.endsWith('.json'))){
  const t=JSON.parse(readFileSync(dir+'/'+f,'utf8'))?.record?.rows?.agentTeam?.val?.tasks;
  if(!Array.isArray(t)) continue;
  for(const k of t){ total++; if(k.ownerId!==undefined) ids++; if(k.ownerName!==undefined) names++; }
}
console.log({total, tasksWithOwnerId:ids, tasksWithOwnerName:names});"
# 实测：{ total: 379, tasksWithOwnerId: 344, tasksWithOwnerName: 0 }
```

vendor 对证：

```sh
sed -n '321,332p' vendor/dsh/packages/experimental/agent-team/src/projection.ts   # schema 无 ownerName
sed -n '36,42p' vendor/dsh/packages/experimental/agent-team/src/task-view.ts      # 工具视图有 ownerName
```

## 修复关联

**能不能修，取决于 DSH 能不能给我们 ownerId**——**vendor 铁律不许改 `vendor/`**，所以三条正路
（[release.md §vendor 政策](../../docs/release.md)）：

1. **正路一（首选，最可能是真解）**：`teamTaskViewSchema` 把 `ownerName` 加回去/`ownerId` 露出来——
   **提上游升 pin**。这是上游的一个真缺口：官方 `client-ui-agent-team` 的 TeamAction 若要显示 owner，
   它同样拿不到。需先核官方客户端是否已在别处（Session 状态座位）自救——若已自救，则说明有
   正路可照抄（`useSessionStatus` 座位或同类投影）。
2. **正路二**：若上游短期不给，用**同一投影里的 `members[]`** 反查——但投影 schema 同样**没有
   任务→成员的链接字段**（`ownerId` 被剥了），**这条路走不通**。这就是为什么本 BUG 卡在 `调查中`
   而不是 `修复就绪`：**修法未选定**。
3. **正路三（须先证伪"不可用"再自建）**：读 `session/follow` 历史帧里的 `team/task` 事件——
   `presence.ts:113` 的形状**有** `ownerId`，可以事件流重建 owner 表。代价 = 每块面板多开一条流，
   且只有"当前会话"的流（跨会话看别人板时拿不到）。是否可接受 = 设计选择。
4. **同族**：`presence.ts` 在场板的「当前任务」列与协作动态的 owner 文案走同一根因，修一处应一起修
   （本卡先修 `tasksFromTeamView`，在场板另开或搭车，由实施者判）。

**状态卡点**：修法未选定 ⇒ 停 `调查中`。选定后按章程翻 `修复就绪`（P1 修复型，可自授权）——
但第 1 条要动 vendor pin，**属"已记录决定"级**，翻转前须用户确认走哪条路。

## 已修判定

- **看板每张卡、依赖图每个节点、任务板每行**的 owner 都显示成员名（或明确的「未分配」——
  且仅当该任务在投影里**真**没有 owner）。
- 等价于：在**真投影**上跑一条断言「板面 owner ≠ 未分配」的比例 = 投影里 `ownerId` 覆盖率
  （本轮实测 344/379 = 90.8%），容差 ≤ 0（不许因读法而丢 owner）。
- **fail-open 改成 fail-loud 或明示**：若某个 owner 真解不出，渲染「未分配」的同时不静默——
  （二选一：计数并显示「N 项 owner 无法解析」，或在 keyless 判据里钉住"投影缺 owner 名字段时
  不许静默把所有卡标未分配"）。
- `presence.ts:161-163` 那句反了的注释**订正**（它曾经把后两轮读码带偏）。
- 机器判据：`tests/company/board.spec.ts` 加一条以**真投影形状**（含 `ownerId`、无 `ownerName`）
  为输入的断言——现在 spec 的 `view()` 夹具手造了 `ownerName`，这就是为什么 379/379 缺字段
  在测试里从未红过。
