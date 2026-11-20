---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-229：diffActivity 对缺 members/tasks 的部分 TeamView 直接抛异常

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 指纹闭包 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C14 低置信卡](../settled_issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-7 / G3）。
> **留痕**：批次 Note [2026-11-18-shipped-shape-closure-and-low-confidence-runtime](../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)（本批共用）。

## 症状

[presence.ts](../../../packages/company-pack/src/lib/presence/presence.ts) 的 `diffActivity`：

```ts
const prevMembers = new Map(prev.members.map(...))
const prevTasks = new Map(prev.tasks.map(...))
```

同文件的 `rowsFromTeamView`/`teamWithEventTasks` 都对部分视图用 `?? []` 兜底（BUG-145 的教训），但 `diffActivity` 没有。对 `{}` 或缺 `tasks` 的 `TeamView` 实测抛：

```text
prev empty object THREW Cannot read properties of undefined (reading 'map')
next empty object THREW next.members is not iterable
```

## 复现

```sh
cat > runtime/tmp/c14-diff.test.mjs <<'EOF'
import { diffActivity } from '../../packages/company-pack/src/lib/presence/presence.ts'
for (const [label, prev, next] of [
  ['prev empty object', {}, { members: [], tasks: [] }],
  ['next empty object', { members: [], tasks: [] }, {}],
]) {
  try { console.log(label, diffActivity(prev, next, 0)) } catch (e) { console.log(label, 'THREW', e.message) }
}
EOF
pnpm exec tsx runtime/tmp/c14-diff.test.mjs
```

实测两条 `THREW`。同场景 `rowsFromTeamView({})` 返回 `[]`、`teamWithEventTasks({}, [])` 返回最小视图。

## 根因与证据

- 根因：`diffActivity` 直接 `prev.members.map` / `next.tasks`，没有 `?? []`；`TeamViewLike` 的类型把 members/tasks 写成必填，但 BUG-145 已证明真实 wire 可以给部分视图（`rowsFromTeamView`/`teamWithEventTasks` 都兜底），类型必填不等于运行时必填。
- 证据：上脚本；`presence.ts` 行 ~240；`rowsFromTeamView` 行 ~219 的 `?? []` 对照。
- 影响：live 快照缺字段/旧投影时，在场动态整块抛错；client 可能只剩错误环/空板，而不是降级。

## 失败类与同类排查

**失败类 = 服务装配 / 读模型**（部分视图假设）。

同类：BUG-230（teamWithEventTasks 缺 revision）；C5 的 BUG-098/145 同族。

## 已修判定

修成什么算修好：

1. `diffActivity` 对 `prev/next` 的 members/tasks 统一 `?? []`；`{}`/缺 tasks 的最小输入不抛。
2. 最小负例：`diffActivity({}, {members:[],tasks:[]},0)` 返回 `[]`；缺 tasks 也返回合理动态。
3. 正例：现有完整视图差分用例不变。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/presence.ts`、`tests/lib/presence/presence-board.spec.ts`
- 红：`pnpm test tests/lib/presence/presence-board.spec.ts`（diffActivity({}, {members:[],tasks:[]}) 抛 reading map）
- 绿：`pnpm test tests/lib/presence/presence-board.spec.ts`（{} / 缺 tasks 返回 []；完整视图用例不变）
- 提交：commit 87d8b15d
