---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-346：`recordLedger` / `auditLedger` 异步写账本缺少串行化，并发写会丢更；`fileStore` 临时文件缺唯一后缀

> 严重级别：P2（数据静默丢失：同批快速多次 `deliverables/presented` 或与 `auditLedger` 并发写入时，后完成的 read-modify-write 直接覆盖前一次的 `paths`/`slugs` 增量）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

1. [`recordLedger`](../../packages/company-pack/src/host/ledger/presented-domain.ts#L232-L245) 与 [`auditLedger`](../../packages/company-pack/src/host/ledger/presented-domain.ts#L248-L273) 都是「先同步 `store.read()`，再用 `await ensureLedger(...)` / `await store.write(...)` 落盘」，中间没有任何串行队列或互斥锁。
2. 在生产默认路径（`domainStore` 的 `ctx.domain.put` 为异步）中，同一微任务/事件循环内先后触发两次 `recordLedger`（例如 [`src/index.ts`](../../packages/company-pack/src/index.ts#L229-L237) 对快速连续到来的 `deliverables/presented` 事件逐次触发无锁的 `void recordLedger(...)`），或者 `recordLedger` 与 `auditLedger` 并发执行时，两路都会读到旧快照（或都在 `missing` 时各自进入 `ensureLedger`），后提交的 `store.write(next)` 会把先提交的那次 `paths` / `slugs` 增量整份覆盖抹除。
3. 此外，文件回退实现 [`fileStore`](../../packages/company-pack/src/host/ledger/presented-domain.ts#L105-L135) 的临时文件路径仅为 `` `${path}.${String(process.pid)}.${String(Date.now())}.tmp` ``（第 121 行）配合 `{ flag: 'wx' }`；同进程同一毫秒内并发写会直接碰撞 `EEXIST` 并返回写入失败。

## 运行面

- **面 = host**：[`packages/company-pack/src/host/ledger/presented-domain.ts`](../../packages/company-pack/src/host/ledger/presented-domain.ts#L118-L273)、[`packages/company-pack/src/index.ts`](../../packages/company-pack/src/index.ts#L229-L237)。

## 复现

已用真实 `createPresentedLedgerStore` + 异步 `domain.put`（模拟生产持久化微任务延迟）+ 并发 `Promise.all([recordLedger(...'a/final.md'), recordLedger(...'b/final.md')])` 实测复现：

- `recordLedger` 两路并发执行后，读取最终账本：`paths['.dsh-company/deliverables/a/final.md']` 为 `undefined`（被第二次写覆盖丢失），仅剩 `b/final.md`。

## 根因与证据

1. [`presented-domain.ts`](../../packages/company-pack/src/host/ledger/presented-domain.ts#L237-L244)（`recordLedger`）与 [第 260-272 行](../../packages/company-pack/src/host/ledger/presented-domain.ts#L260-L272)（`auditLedger`）直接把同步 `store.read()` 与异步 `await ensureLedger` / `await store.write(next)` 拼成非原子 read-modify-write，且 [`src/index.ts`](../../packages/company-pack/src/index.ts#L229-L237) 在事件回调里直接 fire-and-forget `recordLedger`。
2. `fileStore.write`（第 121 行）只用 `pid + Date.now()` 拼临时文件名，缺少 `randomUUID()` 或递增序号。

## 失败类与同类排查

- **失败类**：非原子的异步 read-modify-write 缺少按 store/workspace 维度的写队列串行化；同毫秒临时文件命名碰撞。
- **同类排查**：本仓其余 `safe-file.ts` 等原子写路径待对比是否也存在无序号同毫秒 `.tmp`；`presented-domain.ts` 内 `ensureLedger`、`recordLedger`、`auditLedger` 三个写入口均未加队列锁。

## 修复方案与范围

- **根因修法**：在 `presented-domain.ts` 中为每个 store 实例（或 workspace）挂一条 Promise 串行队列，使 `ensureLedger` / `recordLedger` / `auditLedger` 的 read-modify-write 严格串行；同时给 `fileStore.write` 的临时文件名补充 `randomUUID()`（或单调计数器）。

## 已修判定

- 异步 `domainStore` 与 `fileStore` 下并发调用 `Promise.all([recordLedger(a), recordLedger(b), auditLedger(c)])` 后，账本同时保留 `a`、`b`、`c` 三项，且同毫秒并发 `fileStore.write` 不触发 `EEXIST`。
