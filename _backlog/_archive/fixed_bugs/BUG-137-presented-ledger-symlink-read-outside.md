---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-137：`kb/deliverables-presented.json` 是 symlink 时 `readPresentedLedger` 跟随读外部账本，伪造 presented 直接生效

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（账本读）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / presented 账本读路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/kb/deliverables-presented.json` 指向 workspace 外 JSON：

```ts
symlinkSync(outsideLedger, presentedLedgerPath(ws))
readPresentedLedger(ws)
→ { status:'ok',
    ledger:{ paths:{'.dsh-company/deliverables/fake/final.md':true}, slugs:{fake:true} } }
```

`readPresentedLedger` 只 `existsSync` + `readFileSync`；symlink 被跟随。外部账本里的 `presented:true` 会被 `regenerateCatalog`（未显式传 ledger 时）使用，成品页显示「已 present」，无需 present 事件或 `/deliverables audit`。

`presented` 是审计背书；这条比 BUG-135（catalog 索引伪造）更敏感。写路径 `writePresentedLedger` 的 rename 会替换 symlink（写安全），读路径先信外部。

## 根因（假设）

- `readPresentedLedger` 不使用 `plainFileProblem(companyHome, path)`；`presentedLedgerPath` 只拼路径。
- `presented` 的 file fallback（domain 不可用的部署/旧迁移）仍走这条读；domain 正常时 `regenerateCatalog` 也可能在 `presented` 缺席时读文件。
- S2/BUG-108 只覆盖 deliverable 叶子，不覆盖 ledger。

## 暴露的失败类

**权威账本读路径不校验文件形状**：workspace 内 symlink 可替换「已 present」的权威来源；读面 safe-file 必须覆盖账本/审计文件，不只是成品。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-presented-symlink-read.mts
```

2026-11-13 输出：

```
{"status":"ok","path":"…/deliverables-presented.json","ledger":{"paths":{"…fake/final.md":true},"slugs":{"fake":true}}}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `readPresentedLedger` 用 `plainFileProblem(companyHome,path)`：symlink/outside → 返回 `corrupt`（或 `untrusted`），不读；boot 告警「账本不可信，按空账本重建/等 audit」。
- `writePresentedLedger` 仍 rename（替换 symlink）；`ensurePresentedLedger` 不因 fake ledger 跳过。
- `regenerateCatalog` 默认读 ledger 走同一 safe reader；`/deliverables audit` domain 优先。
- 加 spec：ledger symlink→外部/内部、普通文件、目录；presented 不来自外部；audit 仍可写。

## 修复关联

- 发现于 BUG-135（catalog 索引 symlink）后的账本读面检查；与 [BUG-135](BUG-135-catalog-index-symlink-read-outside.md) 同族，但本卡是**审计账本**。
- 相关：`src/host/ledger/presented-ledger.ts` 的 `readPresentedLedger`；`catalog.ts` 的默认 ledger。

## 已修判定

修成：`readPresentedLedger` 用 `companyFileProblem`，ledger symlink/目录/越界 → `corrupt`，不读外部 presented；写仍 temp+rename。
- keyless：ledger symlink→外部 fake true → status=corrupt；红证：旧 readFileSync 跟随（修复前实测）。
