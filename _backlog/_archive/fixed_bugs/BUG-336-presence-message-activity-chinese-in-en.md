---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-336：`PresencePanel` / `PresenceTab` 在英文模式下对 `team/message/queued` 动态漏出中文冒号与「（空）」

> 严重级别：P2（表达层：`team/message/queued` 事件未生成结构化 `token`，导致 `en` 在场面板直接出现 `：` 与 `（空）`）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（全类事件 en 零 CJK；`currentTasks` 分隔符随语言）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（顺位 4 表达层；材料性：读模型字段改 `currentTasks` 列表）

## 症状

在英文界面打开「在场」（Presence）页签时，团队成员间发消息（`team/message/queued`）产生的协作动态行会直接显示中文全角冒号 `：`；若消息正文为空（例如仅工具调用或无文本块），则会渲染出：

```text
CEO → VP-Eng：（空）
```

## 运行面

- **面 = lib + client**：[`presence.ts`](../../../packages/company-pack/src/lib/presence/presence.ts#L376-L385)、[`company-panels.tsx`](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L415-L417)、[`locales.ts`](../../../packages/company-pack/src/client/locales.ts)。

## 复现

```sh
pnpm exec tsx -e "
import { activityFromEvents } from './packages/company-pack/src/lib/presence/presence.ts';
console.log(activityFromEvents([
  { type: 'team/message/queued', time: 1000, data: { teamId: 't1', message: { id: 'm1', senderId: 't1', senderName: 'ceo', targetId: 'm2', content: [] } } },
], new Map([['m2', 'vp-eng']])));
"
```

实际输出：`[ { time: 1000, kind: 'message', text: 'CEO → VP-Eng：（空）' } ]`。送入 `PresencePanel`（`t = en`）后命中汉字与中文标点检查。

## 根因与证据

1. [`presence.ts`](../../../packages/company-pack/src/lib/presence/presence.ts#L331-L375) 中的 `team/member` 与 `team/task` 全部构造了 `token: { key, params }` 交由 `client` 字典翻译，唯有第 376-385 行的 `isMessageEvent` 分支没有构造 `token`，只写了中文字符串 `text: \`${...} → ${...}：${preview === '' ? '（空）' : preview}\``。
2. [`company-panels.tsx:415-417`](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L415-L417) `activityText(entry, t)` 在 `entry.token === undefined` 时直接返回 `entry.text`，导致中文冒号与`（空）`原样进英文 UI。
3. 静态审计 R2 给 `presence.ts` 设了 `30` 的 CJK 棘轮；[`presence-budget.spec.ts`](../../../tests/client/i18n/presence-budget.spec.ts#L28-L33) 手写了一个 `task` token 夹具，从未通过 `activityFromEvents` 喂入真实 `team/*` 事件。

## 失败类与同类排查

- **失败类**：`client UI` / `lib` 动态片段未令牌化（[`BUG-302`](../_archive/fixed_bugs/BUG-302-english-ui-chinese-time-and-reason.md) 同族）。
- **同类排查**：`presenceFromEvents` 内所有分支：
  - `team/member`：均有 `token`；
  - `team/task`：均有 `token`；
  - `team/message/queued`：缺失 `token`。
  另外 `presence.ts:249` / `:416` 的 `currentTask` 使用 `.join('；')` 拼接多条进行中任务，虽目前 `PresencePanel` / `PresenceTab` 仍直接渲染 `row.currentTask`，也应一并排查结构化表达。

## 修复方案与范围

- **根因修法**：在 `locales.ts` 补齐消息动态的 `zh`/`en` 键（如 `presence.activity.message` 与 `presence.activity.messageEmpty`），在 `presence.ts:380-384` 为 `kind: 'message'` 附上结构化 `token`；`PresencePanel` 的 `t` 渲染经 `activityText` 自动翻译。同时排查 `row.currentTask` 多任务拼接分隔符是否会透出中文 `；`。
- **判据**：`activityFromEvents` 产出的全类事件（`member`、`task`、`message` 含空消息）经 `PresencePanel` 在 `en` 下渲染，零汉字与中文标点。

## 已修判定

- `activityFromEvents` 含 `team/message/queued`（有正文与空正文）在 `PresencePanel` `en` 渲染零 CJK 与全角标点；
- `tests/client/i18n/presence-budget.spec.ts` 覆盖由 `activityFromEvents` 直接生成的全类事件，不再只测手写 `token`。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/presence.ts`、`packages/company-pack/src/client/locales.ts`、`packages/company-pack/src/client/tabs/company-tabs.tsx`、`packages/company-pack/src/client/tabs/company-panels.tsx`、`tests/client/i18n/presence-budget.spec.ts`、`tests/lib/presence/presence-board.spec.ts`、`tests/client/tabs/company-panels.spec.ts`
- 红：`pnpm test tests/client/i18n/presence-budget.spec.ts` —— 还原前 2 failed / 3 passed（消息动态 token 为 `undefined`、多任务拼接取不到列表）
- 绿：`pnpm test tests/client/i18n/presence-budget.spec.ts` —— 5/5 passed；联动 `pnpm test tests/client/i18n tests/lib/presence tests/client/tabs tests/client/ui` 282/282、`pnpm typecheck`、`pnpm lint` 全绿
- 提交：commit d3386c23
