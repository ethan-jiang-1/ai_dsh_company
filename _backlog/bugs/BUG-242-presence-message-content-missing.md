---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-242：presenceFromEvents 对缺 content 的 message 事件抛 `content is not iterable`

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-10 / H6）。
> **留痕**：批次 Note [2026-11-18-shipped-key-closure-and-unreadable-inputs](../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)（本批共用）。

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

修成什么算修好：

1. `firstText` 接受 `undefined | null | 非数组`，不抛；缺 content → `''`，调用点落「（空）」，其它事件继续折。
2. 最小负例：缺 content / 字符串 content 不抛，动态落「（空）」。
3. 正例：正常 text 块预览不变。

## 修复证据

- 改动面：`packages/company-pack/src/lib/shared/text.ts`、`tests/lib/presence/presence-board.spec.ts`
- 红：`pnpm test tests/lib/presence/presence-board.spec.ts`（缺 content → content is not iterable）
- 绿：`pnpm test tests/lib/presence/presence-board.spec.ts`（firstText 非数组 → ""；动态落（空），其它事件继续）
- 提交：commit ce472f48
