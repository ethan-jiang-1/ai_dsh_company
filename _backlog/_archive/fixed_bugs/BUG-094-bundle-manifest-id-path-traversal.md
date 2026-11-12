---
status: 已修
severity: P1
opened: 2026-11-12
---

# BUG-094：v2 `bundle.json` 的 `id` 未校验，升级 v3 时 `identityBackupPath` 路径穿越，宿主在 home 外写文件

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / run-bundle 身份）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`<workspace>/.dsh-company/bundle.json` 是**模型可写**的 host-owned 约定（模块头注明不是防篡改边界）。把它写成 v2 legacy、`id` 带 `../`：

```json
{ "v": 2, "id": "../../../pwn", "createdAt": "2026-01-01T00:00:00.000Z",
  "pack": { "name": "x", "version": "1" } }
```

下次 boot 的 v2→v3 升级：

```
plan  action=upgrade
      backupPath=/var/folders/.../T/c3-manifest-y05E52/pwn.json   ← 已穿出 home/company/identity
write {"created":false,"skipped":false,"upgraded":true}
pwn.json 存在（内容 = manifest JSON，id 仍是 ../../../pwn）
bundle.json 已升 v3，但 id 保留穿越值
```

即：**工作区里一个模型可写的文件，能让宿主在 home 之外创建/覆盖一个 JSON 文件**；`id` 越界越深时目标可指向用户可写的任意位置（本机 `/tmp` 实测可写，更深路径只是权限问题）。`identityBackupPath` 的 `join(dshHome,'company/identity',`${id}.json`)` 没有把 id 当路径组件处理。

## 根因（假设）

- `validateBundleManifest` 只检查 `id` 是**非空 string**，不检查它是否是安全文件名；v2 legacy 分支更完全不复用 v3 的字段校验。
- `identityBackupPath` 直接 `join(..., `${id}.json`)`；`..` 段会穿出 `company/identity`。
- `writeBundleManifest` 的 upgrade 路径在 link 成功后调用 `writeIdentityBackup(plan.backupPath, …)`；`backupPath` 来自未校验 id。
- 同一 id 也会被写回 v3 manifest，后续诊断/恢复都把它当身份。

## 暴露的失败类

**「模型可写的运行态文件」里取出的字段被当成路径组件**：bundle manifest 被声明为模型可写，但没有把 id 当不可信输入；v2 legacy 分支又绕过了 v3 校验。同类：任何从 workspace 文件读出的 id/slug 在 `join` 前必须过安全字符集 + `..`/分隔符检查。

## 复现

```sh
node --import tsx/esm runtime/tmp/c3-manifest-traversal2.mts
```

2026-11-13 原始输出（节选）：

```
plan upgrade /var/folders/…/T/c3-manifest-y05E52/pwn.json …/bundle.json.v2.bak
write {"created":false,"skipped":false,"upgraded":true}
pwn? true
manifest id: ../../../pwn
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `validateBundleManifest` 对 v2/v3 的 `id` 统一校验：非空、长度上限、`^[A-Za-z0-9][A-Za-z0-9._-]*$`、拒绝 `.`/`..`/分隔符/盘符/NUL；不好看的 legacy id 走「生成新 id + 备份旧 manifest」而不是原样使用。
- `identityBackupPath` 自己再做一次 `resolve` 后的前缀检查：结果必须仍在 `join(dshHome,'company/identity')` 下；否则返回错误/跳过备份，绝不在 home 外写。
- 加 keyless spec：v2 id = `../x`、`/abs`、`a/b`、`.`、空串 → 不穿越、不写 home 外；合法 v2 id 仍保留。
- 顺带检查 `bundle.json` 的 `pack.name/version` 是否被当路径（目前没有）；所有 workspace→home 的 id 都过同一函数。

## 修复关联

- 发现于 C3；与 [BUG-095](BUG-095-workspace-resolution-accepts-tmp-root.md) 同属 workspace/bundle 输入边界。
- 合同：[`docs/contracts/release.md`](../../../docs/contracts/release.md) 的 home 治理 / 身份备份；`bundle-manifest` 头注「model-writable」。

## 已修判定

修成：bundle id 统一过 `isSafeBundleId`（非空、≤128、单段字符集、拒绝 `/`/`\`/`..`/`.`）；`identityBackupPath` 再做 `relative` 前缀检查；v3 不安全 id 判 corrupt 不写，v2 不安全 id 升级时换新 id、旧 manifest 留 `.v2.bak`。

- keyless：v3 `../../../pwn` → corrupt/不写；v2 `../pwn` → 升级后 id 为 `bundle-*`、身份备份在 `company/identity/`；`/abs`、`a/b`、`.`、`..`、空串、空白、反斜杠全部拒绝；home 外无 `pwn.json`。
- 红证：HEAD 版实现 → 2 failed；复原 7 passed。
