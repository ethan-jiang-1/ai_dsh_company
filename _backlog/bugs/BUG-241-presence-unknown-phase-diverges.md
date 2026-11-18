---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-241：未知 member phase 在事件板落 inactive、live 读模型落 unknown

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-9 / H6）。
> **留痕**：批次 Note [2026-11-18-shipped-key-closure-and-unreadable-inputs](../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)（本批共用）。

## 症状

`presenceFromEvents` 的成员状态映射：

```ts
const status = member.phase === 'provisioning' ? 'provisioning'
  : member.phase === 'failed' ? 'failed'
    : 'inactive'
```

未知/未来 phase（如 `warping`）落 `inactive`（未上线）；而 live `rowsFromTeamView` 走 `presenceStatusFromPhase`，未知值落 `unknown`（未知）。同一输入两个读模型给出两个语义。实测：

```text
event_row_status= inactive
live_row_status= unknown
```

## 复现

```sh
cat > runtime/tmp/c15-presence.test.mjs <<'EOF'
import { presenceFromEvents, rowsFromTeamView } from '../../packages/company-pack/src/lib/presence/presence.ts'
const ev = [{ type: 'team/member', time: 1, data: { teamId: 'lead', member: { id: 'm1', name: 'vp-eng', phase: 'warping' } } }]
console.log('event', presenceFromEvents(ev).rows.find(r => r.id === 'm1')?.status)
console.log('live', rowsFromTeamView({ members: [{ id: 'm1', name: 'vp-eng', role: 'teammate', phase: 'warping' }], tasks: [] })[0]?.status)
EOF
pnpm exec tsx runtime/tmp/c15-presence.test.mjs
```

## 根因与证据

- 根因：`presenceFromEvents` 用三元把「非 provisioning/failed」一律落 inactive（D-b 的 durable 重建假设），而词汇层 `presenceStatusFromPhase` 有 unknown 分支；两处没有共用同一映射。
- 证据：上脚本；[presence.ts](../../packages/company-pack/src/lib/presence/presence.ts) 的事件板行构造；`presence-status.ts` 的 `presenceStatusFromPhase`。
- 影响：上游新增 phase 时，事件/回放板说「未上线」、live 板说「未知」；agent/用户看到不一致的状态。

## 失败类与同类排查

**失败类 = 读模型 / 状态映射不一致**。

同类：BUG-229/230/240（presence 部分输入）；C5 的 BUG-098。

## 已修判定

修成什么算修好：

1. 事件板与 live 共用 `presenceStatusFromPhase`；`active` 显式保留 durable inactive，未知/未来 phase 的行状态与成员动态都落 `unknown`（`memberUnknown` token）。
2. 最小负例：phase `warping` → 两边都 unknown；phase `active` 的事件板仍 inactive（有注释/测试）。
3. 正例：现有 provisioning/failed/active 测试不变。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/presence.ts`、`tests/lib/presence/presence-board.spec.ts`
- 红：`pnpm test tests/lib/presence/presence-board.spec.ts`（未知 phase 行 inactive vs live unknown；动态显示故障）
- 绿：`pnpm test tests/lib/presence/presence-board.spec.ts`（行/动态同落 unknown；active durable inactive 有注释/测试）
- 提交：commit ce472f48
