---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-348：`CultivationChatPanel` `open(stored)` 异步失败时若组件已卸载/切换，catch 仍清 `localStorage` 并新建孤儿会话

> 严重级别：P2（状态错乱 + 资源泄漏：切换会话或关闭面板过程中若旧存储的 `open(stored)` 拒绝，异步回调无视 `cancelled` 标志继续删 key、调 `sessions.create` 新建无人认领会话并覆写 `localStorage`）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（卸载后 reject 不删 key、`sessions.create` 0 次）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（顺位 3 效应恢复点守卫；机械修复）。

## 症状

在 [`CultivationChatPanel.tsx`](../../../packages/company-pack/src/client/cultivation/CultivationChatPanel.tsx#L121-L167) 中，当 `localStorage` 里已有历史会话 ID，组件触发 `await open(stored)`；如果用户在 `reference.ready` 返回失败（reject）**之前**切换 `mainSessionId` / `cwd` / `agentPreset` 或卸载面板（cleanup 已将 `cancelled = true`）：

1. `open(stored)` 的失败分支（[第 147-155 行](../../../packages/company-pack/src/client/cultivation/CultivationChatPanel.tsx#L147-L155)）没有检查 `if (cancelled) return`；
2. 协程继续执行 `localStorage.removeItem(key)`，接着调用 `await sessions.create({ cwd, agentPreset })` 创建一个没人持有的新会话，再写入 `localStorage.setItem(key, String(created))`，最后又调用一轮 `open(created)`（此时仅能靠第 134 行 `if (cancelled) { reference.release(); return }` 放行，但刚建出来的 session 已被永久遗弃在服务端的 `sessions` 列表里）。

## 运行面

- **面 = client UI**：[`packages/company-pack/src/client/cultivation/CultivationChatPanel.tsx`](../../../packages/company-pack/src/client/cultivation/CultivationChatPanel.tsx#L141-L156)。

## 复现

通过真实渲染 `CultivationChatPanel`（预置 `localStorage['dsh-company-cultivation-session:main-1'] = 'stale-sess'`，让 `retain('stale-sess').ready` 先挂起；随后 `root.unmount()` 卸载组件，再让该 `ready` promise reject）：

- 卸载之后实测观察到：`sessions.create` 被调用 1 次（创建 `'orphan-sess'`），且 `localStorage.getItem('dsh-company-cultivation-session:main-1')` 被篡改为 `'orphan-sess'`。

## 根因与证据

1. [`CultivationChatPanel.tsx`](../../../packages/company-pack/src/client/cultivation/CultivationChatPanel.tsx#L134-L156) 仅在 `open()` 成功路径与外层 `.catch()`（第 159 行）检查了 `cancelled`，但在 `run()` 内部 `try { await open(stored) } catch { ... }` 结束之后（第 151-155 行）漏掉了 `if (cancelled) return` 守卫（以及 `sessions.create(...)` `await` 返回后也缺少 `if (cancelled) return`）。

## 失败类与同类排查

- **失败类**：React `useEffect` 异步流程仅在部分 `await` 恢复点检查 `cancelled`，异常恢复分支漏防竞态与孤儿创建。
- **同类排查**：同文件 `run()` 的 `open`、`catch`、`sessions.create` 后需逐个恢复点守卫；其它 client `useEffect` 异步会话挂载处应按此模式检查。

## 修复方案与范围

- **根因修法**：在 `CultivationChatPanel.tsx` 的 `try/catch` 之后（删除 `localStorage` 与调用 `sessions.create` 之前）以及 `await sessions.create(...)` 之后都加 `if (cancelled) return`，保证效应已失效时绝不篡改 `localStorage` 或凭空新建会话。

## 已修判定

- `open(stored)` 在组件卸载或依赖变化之后才 reject 时，不清理/不覆写旧 `localStorage` 键，且 `sessions.create` 调用次数为 `0`。

## 修复证据

- 改动面：`packages/company-pack/src/client/cultivation/CultivationChatPanel.tsx`、`tests/client/cultivation/cultivation-chat-panel.spec.ts`
- 红：`pnpm test tests/client/cultivation/cultivation-chat-panel.spec.ts` —— 加守卫前 1 failed / 7 passed（卸载后 `sessions.create` 被调用 1 次）
- 绿：`pnpm test tests/client/cultivation/cultivation-chat-panel.spec.ts` —— 8/8 passed（不删 key、不建会话；在途 create 返回后也不认领）
- 提交：commit b28716fc
