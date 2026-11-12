---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-147：`exportGovernance` 仍直接拼 `.dsh-company/exports`；`.dsh-company` 是 symlink 时导出写 workspace 外

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（导出根）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 治理导出）
> **留痕**：Note [2026-11-13-last-direct-writers](../../../notes/implemented/2026-11-13-last-direct-writers.md)

## 症状

A 的 BUG-129 修复把 catalog/startup/presented/bootstrap 等迁到 `company-root` 逐级 residency，但 `exportGovernance` 仍是：

```ts
const exportRoot = join(options.workspace, '.dsh-company/exports')
const staging = `${exportRoot}.tmp-…`
mkdirSync(dirname(exportRoot), { recursive: true })
mkdirSync(staging, { recursive: true })   // 跟随 .dsh-company symlink
```

把 `.dsh-company` 指向 workspace 外：

```
exportGovernance({ workspace: ws, dshHome: home })
→ result {"methods":false,"ledger":false,"warnings":[]}
→ outside/exports/README.md exists true
```

即：host 的治理导出把 README（以及 methods/ledger，若有）写进外部目录。`readLedgerExport` 也直接读 `<workspace>/.dsh-company/exports/ledger.json`，同样跟随。

BUG-129 的根 symlink 修复没有覆盖 governance-export；写 gate 只挡 `blockCompanyWrites`，不校验路径 residency。

## 根因（假设）

- `exportGovernance` 没有使用 `company-root` 的 `ensureCompanyDir/ensureCompanyRoot`，仍 `join(options.workspace, '.dsh-company/exports')`。
- staging 目录也建在 symlink 根下；`swapDirWithBackup` 只替换 `exports`，无法修正根。
- `readLedgerExport` 直接 readFileSync；无 safe-file。

## 暴露的失败类

**写 gate 覆盖了「是否允许写」，没覆盖「写到哪里」**：A 的 gate 让 export 在 blocked 时停，但合法 host 上 `.dsh-company` symlink 仍把导出带出 workspace。residency 和 gate 是两个正交判据，必须都过。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-export-root-symlink.mts
```

2026-11-13 输出：

```
result {"methods":false,"ledger":false,"warnings":[]}
outside exports README true ledger false
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `exportGovernance` 先 `ensureCompanyRoot/ensureCompanyDir(workspace,'exports',{create:true})`；根 symlink/文件 → warning + 不写；staging 建在安全 `exports` 父目录下（同 `.dsh-company` 普通目录）。
- `readLedgerExport` 用 `readCompanyText`/`companyFileProblem`；symlink/outside → undefined。
- 加 spec：`.dsh-company` symlink→外部/内部、`exports` symlink、普通目录；断言外部字节不变；`exportNow` 的 warning 可见。
- 与 BUG-129/131/144 一起收口所有 `.dsh-company` 写入口（bundle/export 是最后两处直写）。

## 修复关联

- 发现于 BUG-129（根 residency）与 BUG-144（write gate 覆盖面）后的 C4 导出回归；本卡是**导出写入根**。
- 相关：`src/host/ledger/governance-export.ts` 的 `exportGovernance` / `readLedgerExport`。

## 已修判定

修成：`exportGovernance` 先 `ensureCompanyRoot(workspace,{create:true})`，staging/`exports` 都建在安全根下；根 symlink → warning「导出根不安全」且不写。`readLedgerExport` 改用 `readCompanyText`，symlink/越界返回 undefined。
- keyless：`.dsh-company` symlink→外部 → warnings 含「不安全」、外部无 `exports/`；红证：把 root 换回 `join(workspace,'.dsh-company')` → 1 failed。
