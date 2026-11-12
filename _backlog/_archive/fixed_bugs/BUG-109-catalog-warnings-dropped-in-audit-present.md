---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-109：`regenerateCatalog` 的坏形状 warnings 只在 boot 日志出现；`/deliverables audit` 与 present 投影路径静默丢弃

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 成品目录）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`regenerateCatalog` 现在会返回 `warnings`（`final.md`/`meta.md` 目录被跳过等）。boot 的 `initializeCatalog` 消费了：

```ts
for (const warning of result.warnings) ctx.logger?.warn?.(…)
```

但另外两个调用点没有：

- `/deliverables audit`：`regenerate(options.workspace, result.ledger)`（`deliverables-command.ts:64`）——返回值被丢掉；回执照样 success，坏形状只写进 catalog 的 warnings，没进命令回执。
- `session/event` 的 present 投影：`regenerateCatalog(workspace, recorded.ledger)`（`src/index.ts:232`）——返回值丢掉。
- presented 回扫后的 `regenerated = regenerateCatalog(...)`（`:374`）——warnings 也不 log。

用户在 audit/present 后完全不知道有成品被跳过；只有 boot 日志会提。与「调用方负责 warn，不静默」的接口注释相反。

## 根因（假设）

- `CatalogResult.warnings` 是新增字段，只有 `initializeCatalog` 一处消费；其它调用点按旧签名忽略返回值。
- 没有统一的 `regenerateAndWarn` helper；每个调用点各自决定是否消费。

## 暴露的失败类

**新增的「坏形状 warnings」只有一条消费路径**：接口说调用方负责 warn，但调用方三处只改了一处；audit/present 的坏形状继续静默。

## 复现

静态可判：`regenerateCatalog` 返回 `{warnings}`；`deliverables-command.ts:64` 与 `src/index.ts:232/374` 直接调用不读。可用一个 `meta.md` 目录 + `/deliverables audit` 复现：目录被跳过、命令回执无坏形状提示。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- 抽 `regenerateCatalogAndWarn(ctx, workspace, ledger)`：调用后统一 `for (warning of result.warnings) ctx.logger?.warn?.(...)`；所有调用点改用它。
- `/deliverables audit` 的回执附「另有 N 条坏形状被跳过」；present 投影同理。
- 加 spec：带坏 `meta.md` 的 workspace 跑 audit/present，断言 warning 被记录（或命令回执含它）。

## 修复关联

- 发现于 C4；与 [BUG-096](BUG-096-deliverables-catalog-directory-eisdir.md) / [BUG-108](BUG-108-catalog-symlink-final-outside.md) 同面（坏形状），但本卡是 warnings 传播。
- 相关：`src/host/ledger/catalog.ts` 的 `CatalogResult.warnings`；`src/index.ts:232/374`。

## 已修判定

修成：`/deliverables audit` 回执附「另有 N 条坏形状被跳过」；present 投影与 presented 回扫把 `regenerated.warnings` 逐条 logger.warn；不再只有 boot 一处消费。

- keyless：注入 `regenerate → warnings:['bad','bad2']` → 回执含「2 条坏形状被跳过」。
- 红证：删掉计数句 → 1 failed；复原 6 passed。
