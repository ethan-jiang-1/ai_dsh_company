---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-377：账本源报 `missing` 时 `exportGovernance` 会静默删掉上一份可用的 `exports/ledger.json`（零告警）

> 严重级别：P2（快照静默丢失：导出目录整体替换，只有在 `status === 'ok'` 或 `corrupt/unsupported` 时才写/复制 `ledger.json`；`missing` 分支什么都不做 ⇒ 新 staging 里没有这个文件 ⇒ 替换后**上一份可用快照被删**，且 `warnings` 为空、调用方无从得知）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决）

## 症状

[`exportGovernance`](../../packages/company-pack/src/host/ledger/governance-export.ts#L115-L143)：

```ts
if (options.ledger === undefined) { try { cpSync(旧 exports/ledger.json) } catch {} }
else {
  const state = options.ledger.read()
  if (state.status === 'ok') { … 写或复制 … }
  else if (state.status === 'corrupt' || state.status === 'unsupported') { warnings.push(…); 复制旧快照 }
  // status === 'missing' → 两个分支都不进
}
```

`missing` 是 store 的**正常态之一**（账本文件/记录尚未创建，或 home 重置后 domain store 为空）。此时 `exports/ledger.json` 不会进 staging，`swapDirWithBackup` 整目录替换后就没了。

## 运行面

- **面 = host**：[`packages/company-pack/src/host/ledger/governance-export.ts`](../../packages/company-pack/src/host/ledger/governance-export.ts#L88-L152)。

## 复现

```sh
pnpm exec tsx -e "
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { exportGovernance } from './packages/company-pack/src/host/ledger/governance-export.ts';
const root = mkdtempSync(join(tmpdir(), 'gexp-')); const home = join(root, 'home'); const ws = join(root, 'ws');
mkdirSync(join(home, 'company', 'methods', 'ceo'), { recursive: true });
writeFileSync(join(home, 'company', 'methods', 'ceo', 'SKILL.md'), 'x');
mkdirSync(join(ws, '.dsh-company', 'exports'), { recursive: true });
writeFileSync(join(ws, '.dsh-company', 'exports', 'ledger.json'), '{\"schema\":1,\"ledger\":{\"paths\":{\"a\":true}}}');
const r = exportGovernance({ dshHome: home, workspace: ws, ledger: { kind: 'domain', read: () => ({ status: 'missing', path: 'x' }) } });
console.log(JSON.stringify({ result: r, ledgerJsonSurvived: existsSync(join(ws, '.dsh-company', 'exports', 'ledger.json')) }));
rmSync(root, { recursive: true, force: true });
"
```

实测 `{"result":{"methods":true,"ledger":false,"warnings":[]},"ledgerJsonSurvived":false}`：旧快照消失、零告警。

## 根因与证据

1. `missing` 与 `corrupt` 被区别对待：坏账本会「沿用上次快照 + 告警」，**没有**账本反而什么都不留。
2. 同一函数对 methods 源明确写了相反的口径（BUG-114）：「本次没有权威 methods：整目录替换不能因此删掉上一份可用快照」——ledger 没跟上同一条规则。

## 失败类与同类排查

- **失败类**：整目录替换时「源缺失」被当成「目标应为空」（`BUG-114` 的同族第二次）。
- **同类排查**：`exports/methods/` 已有源缺失沿用分支（已核）；`catalog.regenerateCatalog` 在旧索引不可读时先备份 `.bak`（已核，不同机制）；`presented-domain` 的写路径与导出无关。

## 修复方案与范围

- **根因修法**：`missing` 分支与 `corrupt/unsupported` 同处理——有旧快照就复制进 staging，并在 `warnings` 里说明「账本尚未建立，沿用上次快照（可能是旧 workspace 的）」；没有旧快照则不写也不告警。

## 已修判定

- 上述复现里 `ledgerJsonSurvived === true` 且 `warnings` 含一句可读说明；
- 真正「从未导出过」的场景（无旧文件）仍不产生文件、不告警；
- 新增 host 用例覆盖 `ok / corrupt / unsupported / missing / 无旧快照` 五种组合。
