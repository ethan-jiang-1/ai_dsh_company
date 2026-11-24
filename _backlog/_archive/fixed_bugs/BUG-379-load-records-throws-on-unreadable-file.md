---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-379：`loadRecords` 遇到不可读的记录文件直接抛 `EACCES`，`/cultivation check` 与 `archive` 整条命令崩掉（`broken` 计数形同虚设）

> 严重级别：P2（容错边界：`loadRecords` 的返回值里专门有 `broken` 计数，注释与命令回执都说「另有 N 条坏记录未计入」；但每个文件只有 `parseRecord` 失败才算 broken，`readFileSync` 抛错（权限/IO）会**穿透**整个函数。命令 handler 只捕获 `UnsafeCultivationPathError`/`CompanyWriteBlockedError`，其余原样重抛 ⇒ 一个 chmod 000 的记录文件就让 `/cultivation check`、`/cultivation archive` 直接失败，而不是报「1 条坏记录」）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（单文件降级）
>
> **留痕**：Note [2026-11-24-degrade-and-structure-batch](../../../notes/implemented/2026-11-24-degrade-and-structure-batch.md)（批次 377..383：单文件读取降级）

## 症状

[`loadRecords`](../../../packages/company-pack/src/host/cultivation/cultivation-storage.ts#L270-L290)：

```ts
const record = parseRecord(id, readFileSync(path, 'utf8'))
if (record === null) broken++
else records.push(record)
```

`readFileSync` 没有 try。同仓对「不可读」的既有口径是降级成 warning + 计数（见 [`catalog.ts`](../../../packages/company-pack/src/host/ledger/catalog.ts#L75-L96) 的 BUG-238/239：「不可读的 final/meta 必须降级成 warning，不能整盘抛」）。

## 运行面

- **面 = host**：[`cultivation-storage.ts`](../../../packages/company-pack/src/host/cultivation/cultivation-storage.ts#L270-L290)；消费方 [`cultivation.ts`](../../../packages/company-pack/src/host/cultivation/cultivation.ts) 的 `commandCheck` / `commandArchive`（handler 见 [cultivationCommandHandler](../../../packages/company-pack/src/host/cultivation/cultivation.ts#L800-L820)）。

## 复现

```sh
pnpm exec tsx -e "
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { nodeCultivationStorage } from './packages/company-pack/src/host/cultivation/cultivation-storage.ts';
const root = mkdtempSync(join(tmpdir(), 'rec-')); const dir = join(root, 'records'); mkdirSync(dir, { recursive: true });
const good = ['---','schema: 1','kind: correction','targetRole: ceo','proposerRole: human','proposerKind: human','source: t:1','expectation: E','status: open','---','','body',''].join('\n');
writeFileSync(join(dir, '20261120-153000-aaaa.md'), good);
writeFileSync(join(dir, '20261120-160000-bbbb.md'), good);
chmodSync(join(dir, '20261120-160000-bbbb.md'), 0o000);
try { console.log('loadRecords', nodeCultivationStorage.loadRecords(dir)); }
catch (error) { console.log('THREW', error.code); }
chmodSync(join(dir, '20261120-160000-bbbb.md'), 0o644); rmSync(root, { recursive: true, force: true });
"
```

实测 `THREW EACCES`（期望 `{ records: [good], broken: 1, reachable: true }`）。

## 根因与证据

1. `broken` 只覆盖「形状坏」，未覆盖「读不到」——两类在调用方（`commandCheck` 的 `loaded.broken` 文案）是同一个语义位。
2. handler 的白名单只放行两种 typed error；`EACCES`（Node 原生）不在其中 ⇒ 重抛给平台。

## 失败类与同类排查

- **失败类**：单文件 IO 失败被当成整盘失败（`BUG-238/239` 的同族，落点是培养记录目录）。
- **同类排查**：`loadRecords` 之外的 `listMethods`/`readMethod` 用 `lstatOrNull` + typed error（已核，有信号）；`catalog.scanCatalogEntries` 对 `readFileSync` 全部 try（已核）；`revoke-journal` 的读用 `readCompanyText`（已核）。

## 修复方案与范围

- **根因修法**：`loadRecords` 把 `readFileSync` 包进 try，失败时 `broken++` 并继续（必要时把原因收进一个新的 `unreadable` 计数，让回执能说「N 条读不到」）；顺带在 handler 里给 `EACCES/EISDIR` 一类文件系统错误一个可读回执（而不是重抛）。

## 已修判定

- 上述复现返回 `records.length === 1`、`broken === 1`（或 `unreadable === 1`），不抛；
- 一个记录文件都读不到时 `/cultivation check` 返回结构化回执（不崩）；
- 新增 host 用例覆盖不可读文件（旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/host/cultivation/cultivation-storage.ts`、`tests/host/cultivation/cultivation-maintenance.spec.ts`
- 红：`pnpm test tests/host/cultivation/cultivation-maintenance.spec.ts` —— 还原前 1 failed（EACCES 穿透）
- 绿：`pnpm test tests/host/cultivation/cultivation-maintenance.spec.ts` —— 全绿（不可读计 broken、check 成功）
- 提交：commit db1fbb11
