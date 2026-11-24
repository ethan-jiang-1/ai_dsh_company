---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-352：`session-diagnose` 按想象扁平形状读 `team/member`，真实队友失败被完全漏报

> 严重级别：P2（诊断盲区：DSH 真实的 `team/member` v2 事件把 `phase` 与 `error` 嵌在 `data.member` 下，`pnpm diagnose` 读顶层 `data.phase`，导致真实队友启动/运行失败在诊断摘要里永远为空）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（真实 v2 事件产出 teamFailures，扁平旧形状兼容）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（批次 351..359：诊断按上游真实 schema）

## 症状

1. 在 [`vendor/dsh/packages/experimental/agent-team/src/types.ts`](../../../vendor/dsh/packages/experimental/agent-team/src/types.ts#L48-L56)（第 230 行）与 [`roster.ts`](../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts#L260) 中，持久化进会话 JSONL 的 `team/member` 事件真实载荷为：
   ```json
   { "version": 2, "teamId": "...", "member": { "id": "...", "name": "vp-eng", "phase": "failed", "error": "..." } }
   ```
2. 但 [`summarizeSessionEvents`](../../../tools/lib/session/session-diagnose.mjs#L168-L175) 却从 `data` 顶层读取 `const phase = data.phase ?? data.status ?? ''` 与 `data.error`，且把整个 `data.member` 塞给 `member` 字段（而非 `data.member.name ?? data.member.id`）；
3. 回归单测 [`tests/session/session-diagnose.spec.ts`](../../../tests/session/session-diagnose.spec.ts#L145-L150) 构造了与真实日志不符的扁平假夹具 `{ type: 'team/member', data: { member: 'vp-eng', phase: 'failed', error: 'provision timeout' } }`（重演了同文件头部记录的 `BUG-030` 想象键反模式），导致单测全绿而真实失败完全漏报。

## 运行面

- **面 = tools**：[`tools/lib/session/session-diagnose.mjs`](../../../tools/lib/session/session-diagnose.mjs#L168-L175)、[`tests/session/session-diagnose.spec.ts`](../../../tests/session/session-diagnose.spec.ts#L145-L150)。

## 复现

向 `summarizeSessionEvents` 喂入一条按 `vendor/dsh` `TeamMemberSnapshot` v2 形状构造的真实 `team/member` 失败事件（`data: { version: 2, teamId: 'lead-1', member: { id: 'member-vp-eng', name: 'vp-eng', description: 'VP Engineering', provider: 'deepseek', context: 'fresh', phase: 'failed', error: 'provision timeout' } }`）：

- 实测返回 `summary.teamFailures` 为 `[]`（完全漏掉该失败事件）。

## 根因与证据

1. [`session-diagnose.mjs`](../../../tools/lib/session/session-diagnose.mjs#L168-L175) 只兼容平铺假形状 `data.phase`/`data.error`，未解包 `vendor/dsh` 的 `data.member.{phase, error, name, id}`；
2. [`session-diagnose.spec.ts`](../../../tests/session/session-diagnose.spec.ts#L145-L150) 未对照 `vendor/dsh` 真实事件 schema 取夹具。

## 失败类与同类排查

- **失败类**：诊断工具消费了脱离上游真实 schema 的想象载荷，且单测夹具同样按想象形状编造（`BUG-030` 同款失败类）。
- **同类排查**：同函数第 152–157 行的 `user-questions/request`（仅存在于运行时远端 waterfall，[`known-event-types.ts`](../../../vendor/dsh/packages/core/session/src/known-event-types.ts) 中落盘的是 `tool/call(ask_user_question)` 与 `tool/result`）同样缺少对真日志 `tool/result` 配对消除的挂起问询追踪，建议修复时一并按真事件日志核实。

## 修复方案与范围

- **根因修法**：优先从 `data.member` 解包 `phase`、`name`/`id`、`error`（如需兼容历史实验事件，平铺分支只能作为退化备选），并把 `tests/session/session-diagnose.spec.ts` 第 145 行的主用例换成 `vendor/dsh` 真实 v2 `team/member` 事件形状。

## 已修判定

- `summarizeSessionEvents` 收到真实 `vendor/dsh` `{ version: 2, teamId, member: { id, name: 'vp-eng', phase: 'failed', error: 'provision timeout' } }` 事件时，稳定输出 `teamFailures: [{ member: 'vp-eng', detail: 'provision timeout' }]`。

## 修复证据

- 改动面：`tools/lib/session/session-diagnose.mjs`、`tests/session/session-diagnose.spec.ts`
- 红：`pnpm test tests/session/session-diagnose.spec.ts` —— 还原扁平读法前 1 failed（真实 v2 `team/member` 的 `teamFailures` 为空）
- 绿：`pnpm test tests/session/session-diagnose.spec.ts` —— 13/13 passed（v2 解包 `data.member.{name,phase,error}`；扁平旧形状仍兼容）
- 提交：commit 8b5a92c8
