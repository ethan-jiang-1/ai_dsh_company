---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-095：workspace 解析把系统临时根 `/tmp`（及其真身 `/private/tmp`）当可用项目目录，公司数据会写进共享 tmp

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / workspace 解析）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`cwdIsUsable` 注释写「系统临时根也不应被当作项目；其子目录可以」，但实现只排除 `/` 和 `homedir()`：

```ts
if (cwd === '/') return false
if (cwd === homedir()) return false
```

实测（2026-11-13，临时 home）：

```
resolveWorkspace({ cwd: '/tmp', envWorkspace: '' })
→ { workspace: '/private/tmp', source: 'cwd' }

resolveWorkspace({ cwd: '/private/tmp', envWorkspace: '' })
→ { workspace: '/private/tmp', source: 'cwd' }
```

于是 `cd /tmp && dsh --profile company` 会被当成合法 workspace：host 会在 `/tmp/.dsh-company/` 建 run bundle/身份/状态，并把「最近 workspace」记成 `/private/tmp`。这与注释、profile 合同（workspace = 项目目录；系统 tmp 是平台临时区）不一致；共享 tmp 里的公司状态还可能被其他进程/清理器碰到。

## 根因（假设）

- `cwdIsUsable` 只硬编码 `'/'` 与 `homedir()`，没有比较 `os.tmpdir()` / `realpath(tmpdir())`，也没有比较 `/tmp` 的 macOS 真身。
- `validateCompanyHome` 只拦「workspace 包含 DSH_HOME / OS home」；当 DSH_HOME 不在 `/tmp` 下时，`/tmp` 不触发任何阻断。
- `resolveWorkspace` 先 `resolve(cwd)` 再 `validate`；macOS `/tmp` 是 symlink，canonical 成 `/private/tmp` 后仍未被识别为临时根。

## 暴露的失败类

**「危险落点」清单是手写枚举，测试/平台各一份**：`/`、homedir 有代码，tmpdir 只在注释；换平台（Linux `/tmp`、macOS `/private/tmp`）或换 home 位置就漏。危险落点应由平台事实（`tmpdir()` 的 realpath）派生，而不是字符串常量。

## 复现

```sh
node --import tsx/esm runtime/tmp/c3-workspace-tmp.mts
```

2026-11-13 原始输出（节选）：

```
/tmp -> {"workspace":"/private/tmp","source":"cwd"}
/private/tmp -> {"workspace":"/private/tmp","source":"cwd"}
/ -> {"source":"none",...}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `cwdIsUsable` 增加 `canonical(cwd) === canonical(os.tmpdir())`（以及 `/tmp`/`/private/tmp` 别名）→ false；子目录仍允许。
- 把「危险落点」收成一个 `dangerousRoots()` 函数：`/`、`homedir()`、`tmpdir()`（realpath）三处共用；`validateCompanyHome` 也消费同一份（避免两处各写）。
- 加 keyless spec：`/tmp`、`/private/tmp`、`tmpdir()` 本身 → none；`tmpdir()/project-a` → cwd；`/`、homedir → none`。
- 文档：profile「workspace 解析」节点名 tmp 根被排除（当前只写「OS home / 根等危险落点」）。

## 修复关联

- 发现于 C3；与 [BUG-094](BUG-094-bundle-manifest-id-path-traversal.md) 同属 workspace 输入边界。
- 合同：[`docs/contracts/profile.md`](../../../docs/contracts/profile.md)「workspace 解析」；[`docs/runtime-map.md`](../../../docs/runtime-map.md) §二·五。

## 已修判定

修成：危险落点由 `dangerousRoots()` 从平台事实派生（`/`、`homedir()`、`tmpdir()` realpath、`/tmp` 与 `/private/tmp` 别名）；`cwdIsUsable` 与 `validateCompanyHome` 共用 `isDangerousRoot`；`tmpdir()/project-a` 等子目录仍合法。

- keyless：`/tmp`、`/private/tmp`、`os.tmpdir()` 作 cwd → none；env=`/tmp` → fail loud；tmpdir 子目录 → cwd。
- 红证：HEAD 版解析 → 3 failed；复原 17 passed。
