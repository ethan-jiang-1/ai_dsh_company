---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-242：presenceFromEvents 对缺 content 的 message 事件抛 `content is not iterable`

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-10 / H6）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`presenceFromEvents` 的消息分支：

```ts
const preview = clip(firstText(message.content), 60)
```

`firstText` 直接 `for (const block of content)`；`content` 缺失/非数组时抛 `content is not iterable`，整个事件流折算中断。`team/message/queued` 的 `content` 在类型上必填，但部分/旧事件可以缺字段（presence 的 `diffActivity` 已按 BUG-229 接受部分视图）。

## 复现

```sh
cat > runtime/tmp/c15-msg.test.mjs <<'EOF'
import { presenceFromEvents } from '../../packages/company-pack/src/lib/presence/presence.ts'
const ev = [{ type: 'team/message/queued', time: 1, data: { teamId: 'lead', message: { id: 'm', senderId: 'a', senderName: 'A', targetId: 'b' } } }]
try { console.log(presenceFromEvents(ev).activity[0]?.text) } catch (e) { console.log('THREW', e.message) }
EOF
pnpm exec tsx runtime/tmp/c15-msg.test.mjs
```

实测 `THREW content is not iterable`；`content: 'text'`（字符串）不抛，但 `firstText` 遍历字符块，产出「（空）」。

## 根因与证据

- 根因：`firstText` 和调用点都假设 `content` 是数组；没有 `Array.isArray(content) ? content : []` 的归一。与 C14 的 `diffActivity` 部分视图同族。
- 证据：上脚本；[text.ts](../../packages/company-pack/src/lib/shared/text.ts) 的 `firstText`；`presence.ts` 的消息分支。
- 影响：一条坏 message 事件打断整场事件折算，动态/板丢失；应降级为「（空）」+ 其它事件继续。

## 失败类与同类排查

**失败类 = 读模型 / 部分事件**（缺字段抛）。

同类：BUG-229（TeamView 部分视图）；BUG-241（phase 未知）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. `firstText` 接受 `readonly TextBlock[] | undefined`（或调用点 `Array.isArray` 归一）；缺 content → `''`。
2. 最小负例：缺 `content`/字符串 `content` 不抛，动态落「（空）」；其它事件仍折。
3. 正例：正常 text 块预览不变。
