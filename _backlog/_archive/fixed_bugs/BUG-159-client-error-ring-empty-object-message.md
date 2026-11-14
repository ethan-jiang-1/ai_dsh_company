---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-159：错误环把非 Error 的 error 对象记成 `{}`，丢掉 event.message

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 86](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C10-H1）；与 2026-11-13 `error === null` 修复同族。
> **留痕**：Note [2026-11-14-eight-bug-second-sources.md](../../../notes/implemented/2026-11-14-eight-bug-second-sources.md)（同轮八卡）；复现脚本 = `runtime/tmp/c10-error-ring.mts`。

## 症状

页面派发 `error` 事件 `{ error: {}, message: 'real cross-realm message' }` 时，错误环记录：

```json
{ "kind": "error", "message": "{}" }
```

`event.message` 没有进环。`error: null` 已被 2026-11-13 的修复正确回退到 `event.message`（`"null-error message"`），但空对象仍被 `JSON.stringify` 的真值结果短路。

## 根因（假设）

[error-ring.ts](../../../packages/company-pack/src/client/wiring/error-ring.ts#L72) 的 `textOf({})` 返回 `'{}'`（truthy）；[onError](../../../packages/company-pack/src/client/wiring/error-ring.ts#L143) 用：

```ts
const message = textOf(value.error) || textOf(value.message) || '（未知页面错误）'
```

`'{}'` 非空，`||` 不再回退到 `event.message`。跨 realm 的 `Error`（`instanceof Error` 为 false）经 `JSON.stringify` 也是 `{}`，走同一路径。

## 复现

```sh
node --import tsx/esm runtime/tmp/c10-error-ring.mts
```

ring 第一条 `"message": "{}"`；第二条 `error: null` 是 `"null-error message"`；第三条 string 正常。

## 影响 / 失败类

**失败类 9（client UI/浏览器）**：错误环是用户页给 agent 的唯一「你撞了什么」证据；`{}` 让真实错误文本丢失，cdp-probe/诊断日志只看到无信息条目。跨域脚本错误、iframe/worker 抛出的 Error 最容易命中。

## 修复方向（不在本卡实施）

- `textOf` 对普通对象先取 `message` / `reason` / `name` 字段；或 `onError` 在 `error` 非 `Error` 且 `event.message` 非空时优先 message。
- 仅当 `event.error` 与 `event.message` 都为空时才落 JSON/未知。
- spec 覆盖 `{}`、跨 realm Error、null、string、Error 五形状。

## 已修判定

```text
{ error: {}, message: 'real cross-realm message' }      → ring message = 'real cross-realm message'
{ error: { name: 'TypeError', message: 'cross' } }（跨 realm 形） → 'TypeError: cross'
{ error: null, message: 'null-error message' }         → 'null-error message'（不回归）
{ error: 'string error' } / new Error('boom')          → 原文 / 'Error: boom'（不回归）
error 与 message 都为空                                → '（未知页面错误）'
```

判据由 `tests/client/wiring/error-ring.spec.ts` 的五形状用例搭载；红证 = 还原 `textOf` 的 `JSON.stringify({}) → '{}'` 短路 → 第一条回到 `"message": "{}"`。

## 证据

- `runtime/tmp/c10-error-ring.mts`：第一条 `"message": "{}"`；`error: null` 正确回退。
- 代码：[error-ring.ts](../../../packages/company-pack/src/client/wiring/error-ring.ts#L72)、[error-ring.ts](../../../packages/company-pack/src/client/wiring/error-ring.ts#L143)。
