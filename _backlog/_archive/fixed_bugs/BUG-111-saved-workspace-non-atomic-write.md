---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-111：`writeSavedWorkspace` 直接 `writeFileSync`，崩溃/半写会把「最近 workspace」截断成坏 JSON（无原子写、无备份）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / workspace 持久化）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`<DSH_HOME>/company/settings.json` 是 host 每次 boot 记录的「最近 workspace」便利设置。写入：

```ts
mkdirSync(join(dshHome,'company'), { recursive: true })
writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`)
```

没有同目录 temp + rename；进程在写一半时崩溃/磁盘满，会留下截断 JSON。`readSavedWorkspace` 读坏 JSON 时返回 `{path}`（无 workspace），于是：
- 下次从别的 cwd 启动不会回到最近项目；
- 用户看不到任何「设置损坏」提示（read 把 corrupt 与 missing 折成同一种）。
`writePresentedLedger`、`writeStartupSettings`、bundle manifest 等同目录持久化都已用 temp+rename；这条没有。

## 根因（假设）

- `writeSavedWorkspace` 是唯一还直接 `writeFileSync` 的 settings 写入点；没有复用 `writeJsonAtomic`/`atomicWriteFile` 先例。
- `readSavedWorkspace` 对坏 JSON 静默返回 undefined，和「文件不存在」不可区分。

## 暴露的失败类

**便利设置与权威状态用不同持久化标准**：启动前提/身份/账本都有原子写，只有「最近 workspace」图省事直写；崩溃后表现为「启动回不到项目」，而不是一条可诊断的坏设置。

## 复现

静态可判；运行时可在写 settings 时 kill -9 或把磁盘写满，留下半截 JSON；`readSavedWorkspace` 返回 `{path}`，`resolveWorkspace` 落到 none。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- 用同目录 temp + rename（与 `writeJsonAtomic` 同款）；保留 1 份 `.bak` 可选。
- `readSavedWorkspace` 对坏 JSON 返回可诊断状态（`problem: 'corrupt'`），boot 日志 warn；不要把 corrupt 当 missing。
- spec：半截 JSON / 空文件 / 只读目录 → 不覆盖、可诊断；正常写读往返。

## 修复关联

- 发现于 C3；与 [BUG-110](BUG-110-governance-export-rm-before-rename.md) 同属「持久化原子性」。
- 相关：`src/host/workspace/workspace-resolution.ts`。

## 已修判定

修成：`writeSavedWorkspace` 同目录 temp+rename（无 `.tmp` 残留）；`readSavedWorkspace` 坏 JSON 返回 `problem:'corrupt'`；`resolveWorkspace` 带 `savedProblem`，runtime-guard 启动 warn，不再与 missing 混同。

- keyless：半截 JSON → problem=corrupt + resolution.savedProblem；写读往返且无 `.tmp`。
- 红证：HEAD 版 → 2 failed；复原 19 passed。
