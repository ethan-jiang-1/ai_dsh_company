---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-378：`recordStampOf` 把越界日期「进位」成合法时间戳——`/cultivation purge` 会删掉文件名时间戳损坏的归档记录

> 严重级别：P2（数据销毁：`recordStampOf` 只做形状正则，随后 `new Date(y, mo-1, d, h, mi, s)` 会把 `20260000-…`（月 00 日 00）、`20261361-…`（月 13 日 61）这类**不存在的日期**自动进位成合法时间。`purgeArchiveFiles` 与 `commandArchive` 用它决定「是否早于 cutoff」：进位到过去的坏文件名会被**直接删除**（purge）或被归档（archive），而两条命令的回执都写着「时间戳不识别的记录保持原样」）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决）

## 症状

[`recordStampOf`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L245-L253)：

```ts
const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-/.exec(id)
if (match === null) return null
const at = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).getTime()
return Number.isNaN(at) ? null : at
```

`new Date(2026, -1, 0, 0, 0, 0)` 不是 NaN，而是 2025-11-29；`new Date(2026, 12, 61, 99, …)` 是 2027-03-05。于是「形状对、日期不存在」的 id 被当成**有效时间戳**。

## 运行面

- **面 = lib + host**：[`cultivation-record.ts`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L245-L253) 的 `recordStampOf`；消费方 [`cultivation-storage.ts purgeArchiveFiles`](../../packages/company-pack/src/host/cultivation/cultivation-storage.ts#L390-L408) 与 [`cultivation.ts commandArchive`](../../packages/company-pack/src/host/cultivation/cultivation.ts#L655-L680)。

## 复现

```sh
pnpm exec tsx -e "
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { recordStampOf } from './packages/company-pack/src/lib/cultivation/cultivation-record.ts';
import { nodeCultivationStorage } from './packages/company-pack/src/host/cultivation/cultivation-storage.ts';
console.log('stamp(20260000-000000-x) =', recordStampOf('20260000-000000-x'));
const root = mkdtempSync(join(tmpdir(), 'purge-')); const dir = join(root, 'records-archive'); mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, '20260000-000000-x.md'), '---\nschema: 1\n---\n');
console.log('purge =', nodeCultivationStorage.purgeArchive(dir, Date.now() - 86_400_000));
console.log('corrupt-stamp file survived =', existsSync(join(dir, '20260000-000000-x.md')));
rmSync(root, { recursive: true, force: true });
"
```

实测 `stamp(...) = 1764432000000`（2025-11-29），`purge = {"removed":1,"failed":0}`，`survived = false`——一个日期根本不存在的文件名被当作「一年前的旧记录」删掉。

## 根因与证据

1. `Number.isNaN(at)` 只能挡住「Date 无法解析」，挡不住「Date 把它进位了」；本仓其它日期判据早已用往返比较（[`isCalendarDate`](../../packages/company-pack/src/lib/docs/prd-check.ts#L319-L326)：「`2026-13-99` 往返串不相等即判非法」，成因 = BUG-166）。
2. `commandPurge` 的回执文案写「时间戳不识别的记录保持原样」——实现与回执相反。

## 失败类与同类排查

- **失败类**：日期合法性只看形状、不看往返（`BUG-166` 的同族，落点是文件名时间戳）。
- **同类排查**：`timeParts`/`cultivationTimeLabel` 有 `Number.isFinite`+`isNaN` 守卫（BUG-335 已修）；`bundle-manifest.createdAt` 用 ISO 往返（已核，正确）；`prd-check.isCalendarDate` 正确。

## 修复方案与范围

- **根因修法**：`recordStampOf` 加往返校验——用 `Date` 的本地分量回读（`getFullYear()===y && getMonth()===mo-1 && getDate()===d && getHours()===h …`）不相等即返回 `null`（与 `isCalendarDate` 同一判据思路）；`purge`/`archive` 随之把这类文件当「时间戳不识别的记录」跳过并计入 `failed`/保持原样。

## 已修判定

- `recordStampOf('20260000-000000-x')`、`recordStampOf('20261361-990000-x')` 均返回 `null`；`recordStampOf('20261120-153000-abcd')` 仍返回原值；
- 上述复现里 `removed = 0`、文件仍在，且回执把它算进「未动」；
- 新增表驱动用例（合法/月越界/日越界/时越界/非数字）。
