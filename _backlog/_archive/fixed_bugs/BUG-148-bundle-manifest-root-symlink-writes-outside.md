---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-148：bundle-manifest 仍直写 `.dsh-company/bundle.json`；根 symlink 时把身份写到 workspace 外

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（bundle 读写）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / run-bundle 身份）
> **留痕**：Note [2026-11-13-last-direct-writers](../../../notes/implemented/2026-11-13-last-direct-writers.md)

## 症状

`.dsh-company` 指向 workspace 外时：

```js
planBundleManifest({ dshHome, workspace, pack })
→ action create, path ws/.dsh-company/bundle.json
writeBundleManifest(plan)
→ { created:true }
→ outside/bundle.json exists true
readBundleManifestState(ws)
→ status ok, manifest 来自外部
```

`bundle-manifest.ts` 仍：

```ts
const path = join(workspace, BUNDLE_MANIFEST_REL) // .dsh-company/bundle.json
mkdirSync(dirname(plan.path), { recursive: true })
writeFileSync(temporary,...); linkSync(temporary, plan.path) / fallback writeFileSync(plan.path,...)
```

`mkdirSync`/`linkSync` 跟随 `.dsh-company` symlink；`writeBundleManifest` 有 write-gate 但没有 company-root residency。A 的 BUG-129 修复覆盖了 catalog/startup/presented/bootstrap，**漏了 bundle-manifest**；BUG-144 只挡 blocked，不挡路径。

同根仍直拼 `.dsh-company` 的写入口：
- `cultivation-storage` 的 records/method 写（A 已加 write-gate，但没有 `ensureCompanyRoot`）；
- `revoke-journal`；
- `appendUpgradeLog`（workspace/.dsh-company/logs）；
- `readBundleManifestState` 读外部身份。

## 根因（假设）

- `bundleManifestPath` 直接 `join(workspace, '.dsh-company/bundle.json')`；没有 `company-root` 的逐级 lstat/realpath。
- `writeBundleManifest` 的 atomic/hardlink 逻辑假设父目录是普通目录；root symlink 时全部落到外部。
- 身份备份写 home，路径安全，但主 manifest 不在 workspace 内。

## 暴露的失败类

**写 gate 与 residency 分离**：blocked 时能停写，但合法 host 上根 symlink 仍把身份/导出/培养写出去。所有 `.dsh-company` 写入口必须同时过 write-gate 和 company-root residency；A 的迁移只覆盖了部分模块。

## 当前修复中的测试红灯（2026-11-13）

A 的 BUG-148 修复已把 `writeBundleManifest` 改为 `ensureCompanyRoot + writeCompanyAtomic`，并移除了 hard-link `wx` fallback / `_deps.link` 注入。但旧 spec `tests/host/run-bundle/bundle-manifest.spec.ts` 仍期望：

```
writeBundleManifest(plan, { link: throw EPERM })
→ { created:true, fallback:'wx' }
```

当前 `pnpm test` 1 failed：`created` true 但没有 `fallback`。这是 **BUG-148 修复 API 变更与旧 spec 漂移**，要么恢复 fallback 语义，要么删 fallback 参数/spec；不能留红。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-bundle-root-symlink.mts
```

2026-11-13 输出：

```
plan create undefined …/ws/.dsh-company/bundle.json
write {"created":true,"skipped":false,"upgraded":false} outside bundle true
state {"status":"ok", …}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `bundleManifestPath`/`writeBundleManifest` 用 `ensureCompanyRoot(workspace,{create:true})` + `writeCompanyAtomic(workspace, RUN_BUNDLE_PATHS.manifest, data)`；或至少 lstat 根/父目录、拒绝 symlink。
- `readBundleManifestState` 用 `companyFileProblem/readCompanyText`；外部/ symlink → corrupt/unsafe，不采用。
- `cultivation-storage`/`revoke-journal`/`appendUpgradeLog` 同样迁移；最后扫一遍 `grep 'join(.*\\.dsh-company'`。
- 加 spec：根 symlink→外部/内部、bundle 写/读、cultivation write、log append、export（147）；外部字节不变。

## 修复关联

- 发现于 BUG-147（export 根 symlink）后的 C3 身份检查；与 [BUG-147](BUG-147-export-governance-symlink-root-writes-outside.md) / [BUG-129](BUG-129-dsh-company-symlink-root-writes-outside.md) / [BUG-144](BUG-144-write-gate-bypassed-by-direct-company-writes.md) 同族。
- 相关：`src/host/run-bundle/bundle-manifest.ts`、`cultivation-storage.ts`、`revoke-journal.ts`。

## 已修判定

修成：`readBundleManifestState` 用 `companyFileProblem/readCompanyText`，根/文件 symlink → corrupt、不采用外部身份；`writeBundleManifest` 先 `ensureCompanyRoot`，再用 `writeCompanyAtomic` 写 manifest（create 不覆盖、upgrade 先备份）。
- keyless：根 symlink→外部 → 强制 plan 写抛 `symlink`、外部无 `bundle.json`、状态 corrupt；红证：去掉 ensure 改直写 → 1 failed。
