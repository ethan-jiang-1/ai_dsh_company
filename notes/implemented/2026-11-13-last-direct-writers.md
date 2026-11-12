# 2026-11-13 · 最后三处直写面：export / bundle / cultivation（BUG-147..149）

状态：implemented（2026-11-13 落地；验证见下）

上游 = 用户 2026-11-13：「_backlog/bugs 这里又找到一堆bug……直到所有bug解决了」。三张 P1 是上一轮
[状态根/写 gate Note](./2026-11-13-state-root-write-gate-sweep.md) 的残余：`company-root` 已覆盖
catalog/ledger/startup/bootstrap/命令，但 `exportGovernance`、`bundle-manifest`、`cultivation-storage`/
`revoke-journal`/`appendUpgradeLog` 仍直接 `join(workspace,'.dsh-company',…)` 后写；`write-gate` 只挡
「是否允许写」，不挡「写到哪里」。

## 问题

- **147**：`exportGovernance` 的 `exports`/staging 直接建在 `.dsh-company` 下；根 symlink 时 README/methods/ledger
  写 workspace 外。`readLedgerExport` 同样跟随 symlink 读外部 JSON。
- **148**：bundle-manifest 直接 `mkdir + writeFileSync/linkSync` 写 `.dsh-company/bundle.json`；根 symlink 时身份写外，
  `readBundleManifestState` 也把外部身份当 ok。
- **149**：cultivation-storage 的 `ensureRecordsDirectory` 在 residency 检查前先 `mkdirSync`，根 symlink 时先创建
  外部 `cultivation/`；write/update/archive/installMethod、revoke journal、upgrade log 同样直写。

## 决定

1. **147**：`exportGovernance` 先 `ensureCompanyRoot(workspace,{create:true})`；失败 → warning「导出根不安全」并返回，
   不写。staging 建在安全根下。`readLedgerExport` 用 `readCompanyText(workspace,'exports/ledger.json')`。
2. **148**：`readBundleManifestState` 用 `companyFileProblem/readCompanyText`：missing / unsafe(corrupt) / ok 分开；
   `writeBundleManifest` 从 `plan.path` 反推 workspace，`ensureCompanyRoot` 后 `writeCompanyAtomic` 写 manifest
   （create 不覆盖、upgrade 先备份 legacy），不再 hardlink 直写。
3. **149**：cultivation-storage 新增 `assertCompanyResidency(path)`：路径含 `/.dsh-company/` 时，
   从根到父目录逐级 `ensureCompanyDir`；在 `ensureRecordsDirectory` **最早 mkdir 前**调用，write/update/archive/
   purge/installMethod 全接。`revoke-journal` 用 `writeCompanyAtomic/readCompanyText`；`appendRotatingLine`
   对公司盘路径先 `ensureCompanyDir`，非公司盘路径保持原 mkdir。
4. 三处都保留 `assertCompanyWritesAllowed()`：gate 与 residency 是两个正交判据，必须同时过。

## 输掉的方案

- **只加 read safety、不修 write**：bundle 读 corrupt 后 plan 变 skip，看似不写；但强制 create/upgrade plan 仍会写外。
- **在 `writeNewFile` 才 assert residency**：`ensureRecordsDirectory` 已先 `mkdirSync`，外部目录已创建（实测）。
- **只修 export/bundle，不扫 cultivation/log**：同一根因还有三处；本轮按 `grep '.dsh-company'` 扫完。
- **允许 symlink→workspace 内目录**：统一拒绝策略，避免 canonical 后语义分叉；若产品要允许需另开卡。

## 验证

| 卡 | 红证（实跑） | 绿证 |
|---|---|---|
| 147 | root 换回 `join(workspace,'.dsh-company')` → 1 failed | governance-export 5 passed |
| 148 | 去掉 `ensureCompanyRoot` + 直写 → 1 failed | bundle-manifest 8 passed |
| 149 | 删 `ensureRecordsDirectory` 的 residency → 1 failed（外部 `cultivation/` 出现） | write-gate 5 passed |

全量：`pnpm typecheck` 绿；`pnpm test` **240 files / 1896 tests passed**；`pnpm lint` 0 warning；`pnpm dup` 0 clones；
`pnpm verify` ALL PASS（checks index 已重生成；探针文件 `zz-probe-writer.ts` 已删除）。

## 剩余风险 / 未做

- `appendRotatingLine` 只对含 `/.dsh-company/` 的路径做 residency；其它调用方（home 日志）沿用原逻辑。
- `bundle-manifest` 的 `deps.link` 参数保留但不再使用（旧 hardlink 回退测试已改为 create 不覆盖语义）。
- 真多进程/真浏览器未跑；三卡均为 keyless 真文件 root symlink 覆盖。
