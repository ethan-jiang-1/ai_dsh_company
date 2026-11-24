---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-376：事件回放（durable）路径的 CEO 行恒为「未上线 + 无当前任务」，与 live 路径对同一数据给出不同在场结论

> 严重级别：P2（同一实体两副脸：`rowsFromTeamView`（live）里 CEO 的 `status` 是 `idle`、`currentTasks` 是 `["CEO work"]`；`presenceFromEvents`（从 `team/*` 事件回放/重建）里同一个 CEO 恒为 `status: 'inactive'`、`currentTasks: null`。判定「CEO 现在在做什么」的在场页，在页面刷新/回放场景下会显示 CEO **没有任何进行中任务**，而 live 视图说他在做 task-1）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决）

## 症状

[`presenceFromEvents`](../../packages/company-pack/src/lib/presence/presence.ts#L400-L415) 构造 lead 行时把两个字段写死：

```ts
rows.push({ id: teamId, name: 'lead', displayName: PRESET_DISPLAY_NAMES.ceo, role: 'lead',
  status: 'inactive', statusLabel: STATUS_LABEL.inactive, currentTasks: null })
```

而 teammate 行会从 `tasks` 里按 `ownerId` 现算 `currentTasks`。durable 的 `team/task` 事件里 lead 拥有的任务 `ownerId === teamId`，数据是齐的——只是没有算。

对照 live 路径 [`rowsFromTeamView`](../../packages/company-pack/src/lib/presence/presence.ts#L233-L252)：`status` 来自 `member.phase`（lead 的 phase 在投影里恒为 `'active'` → `idle`），`currentTasks` 按 `task.ownerName === member.name`（= `'lead'`）算出非空。

## 运行面

- **面 = lib**：[`presence.ts`](../../packages/company-pack/src/lib/presence/presence.ts#L400-L432)；两个消费方分别是 live 投影与事件回放（`presence.e2e` / 独立重建）。

## 复现

```sh
pnpm exec tsx -e "
import { presenceFromEvents, rowsFromTeamView } from './packages/company-pack/src/lib/presence/presence.ts';
const events = [
  { type: 'team/member', time: 1, data: { teamId: 'team-1', member: { id: 'm-vp', name: 'vp-eng', phase: 'active' } } },
  { type: 'team/task', time: 2, data: { teamId: 'team-1', task: { id: 'task-1', revision: 1, subject: 'CEO work', status: 'in_progress', ownerId: 'team-1' } } },
];
const pick = (rows) => rows.filter(r => r.role === 'lead').map(r => ({ status: r.status, currentTasks: r.currentTasks }));
console.log('replay', pick(presenceFromEvents(events, new Map()).rows));
console.log('live  ', pick(rowsFromTeamView({ members: [{ id: 'team-1', name: 'lead', role: 'lead', phase: 'active' }], tasks: [{ id: 'task-1', revision: 1, subject: 'CEO work', status: 'in_progress', ownerName: 'lead' }] })));
"
```

实测 `replay [{"status":"inactive","currentTasks":null}]` vs `live [{"status":"idle","currentTasks":["CEO work"]}]`。

## 根因与证据

1. lead 行是回放路径里唯一「手工拼」的行（teammate 行走同一段 `tasks` 现算逻辑），两处口径因此漂移。
2. `status` 的 `inactive` 可以解释为「durable 板里 active 记为未在跑」（该注释只写了成员行），但 `currentTasks: null` 没有任何依据——数据就在 `tasks` map 里。

## 失败类与同类排查

- **失败类**：live 与 replay 两条读路径各写一份行构造（本仓已有 `attention-parity` 先例，说明这类漂移被正式当作缺陷类）。
- **同类排查**：teammate 行两端一致（都已核）；lead 的 `displayName` 两端都是 CEO（已核）；`rowsFromTeamView` 的 `statusLabel` 与回放的 `STATUS_LABEL[...]` 都是中文标量，但 client 渲染走字典（已核，不构成泄漏）。

## 修复方案与范围

- **根因修法**：把「任务行 → 某 owner 的 currentTasks」抽成一个 helper，lead 行与成员行共用；lead 的 `status` 要么与 live 同口径（`idle`），要么在面板上明确区分「回放态」（两者选一，写进注释/用例）；并补一条 live↔replay 的对比 spec。

## 已修判定

- 上述复现里 `replay` 与 `live` 的 `currentTasks` 相等（`["CEO work"]`），`status` 按选定口径一致；
- 新增 `tests/lib/presence/` 对比用例（旧实现红、新实现绿）。
