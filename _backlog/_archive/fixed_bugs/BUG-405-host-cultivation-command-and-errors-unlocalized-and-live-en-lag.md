---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-405：`/cultivation` 漏接 `registerLocalizedCommand` 致 `en` 命令菜单仍显中文，且 Host 上下文读取与公司盘底层报错硬编码中文

> 严重级别：P1（`en` 双语体验断层：其余 6 条宿主命令已接动态重注册，唯有 `/cultivation` 漏网导致界面切到 English 后 `/` 命令栏仍弹出整行中文说明；`readContext`、`company-root`、`write-gate`、`runtime-guard` 与 `cultivation-context` 校验报错硬编码中文直透给 `en` 用户）｜发现：2026-11-27｜状态：已修（`1db6d6e7`）｜审查：待盲审确认

## 症状

1. **`/cultivation` 在界面真实切至 English 后仍显示中文命令描述**（Chromium `phase2c-settings.mjs` 实测 + 截图 `r3-10-settings-real-en-lag.png` + `host-commands-en.spec.ts`）：
   - 在真实 Settings 弹窗将语言从 `zh` 切为 `en`（不刷新页面），主界面的 `StrategyButton`（`Strategy: auto`）、`CommandScopeHint`（`Slash commands answer only after the session starts`）、`MotionCommandDock` 与 `SidebarFooterCompanyAction` 均随 slot 重注即时转为英文；
   - 但用户在输入框键入 `/cultivation` 弹出的官方 `/` 命令菜单仍显示中文 **`培养回路：给自己的角色提交纠正、给别的角色提建议、采纳/拒绝/验证/撤回方法（采纳仅目标角色本人）`**；
2. **Host 培养背景读与公司盘底层写闸/路径校验报错硬编码中文**（Phase 2 `host-commands-en.spec.ts` 实测复现）：
   - [cultivation-context-read.ts](../../../packages/company-pack/src/host/cultivation/cultivation-context-read.ts#L68-L77,L116-L163) 在 `readSessionContext`、`readDeliverableContext` 与 `readContext` 中所有报错文本硬编码中文；
   - [company-root.ts](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L56-L113)（`UnsafeCompanyPathError`）、[write-gate.ts](../../../packages/company-pack/src/host/run-bundle/write-gate.ts#L41)（`assertCompanyWritesAllowed` 传 `'公司数据已停写：...'`）、[cultivation-context.ts](../../../packages/company-pack/src/lib/cultivation/cultivation-context.ts#L113-L180)（`'成品 ref 必须是安全的工作区相对路径'` 等）与 [runtime-guard.ts](../../../packages/company-pack/src/host/run-bundle/runtime-guard.ts#L62-L110) 全部硬编码中文。

## 运行面

- **面 = host / lib**：
  - [cultivation.ts](../../../packages/company-pack/src/host/cultivation/cultivation.ts#L849-L862) vs [localized-command.ts](../../../packages/company-pack/src/host/commands/localized-command.ts#L19-L29)；
  - [cultivation-context-read.ts](../../../packages/company-pack/src/host/cultivation/cultivation-context-read.ts#L68-L163)、[company-root.ts](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L56-L113)、[write-gate.ts](../../../packages/company-pack/src/host/run-bundle/write-gate.ts#L41)、[runtime-guard.ts](../../../packages/company-pack/src/host/run-bundle/runtime-guard.ts#L62-L110)；
  - [cultivation-context.ts](../../../packages/company-pack/src/lib/cultivation/cultivation-context.ts#L113-L180)。

## 复现

```sh
npx vitest run --config runtime/tmp/ux-audit-r3/vitest.tmp.config.ts runtime/tmp/ux-audit-r3/host-commands-en.spec.ts
source run/env.sh && node runtime/tmp/ux-audit-r3/phase2c-settings.mjs
```

- `host-commands-en.spec.ts`：切 `lang='en'` 后 `/cultivation` `description` 仍命中中文、`readContext` 返回中文、越界路径与写闸抛出中文异常；
- `phase2c-settings.mjs`（`r3-10-settings-real-en-lag.png`）：Settings 切换 English 后关闭弹窗，键入 `/cultivation` 时 `slashCultHasChinese=true`。

## 根因与证据

1. `BUG-338` 为其余 6 条命令与工具接入了 [localized-command.ts](../../../packages/company-pack/src/host/commands/localized-command.ts) 动态重注册与 `CompanyLanguageState`，遗漏了住在 `host/cultivation/` 下的 `/cultivation` 命令注册；
2. 背景读取（`readContext`）、共享编码校验（`cultivation-context.ts`）与底层路径/写闸未像 `CompanyWriteBlockedError.messageEn` / `commands/*.ts` 一样提供 `{ zh, en }` 双语分流或错误码映射。

## 失败类与同类排查

- **失败类**：非 `host/commands/` 目录的命令注册点及共享 `host/lib` 校验异常逃逸出双语化改造面；同时实证排伪了客户端 `CommandScopeHint` 与 `StrategyButton`（上游 slot 在 `locale` 切换时会重注刷新，实测可即时翻为英文）。

## 修复证据

- 改动面：`packages/company-pack/src/host/cultivation/cultivation.ts`、`packages/company-pack/src/host/cultivation/cultivation-context-read.ts`、`packages/company-pack/src/lib/cultivation/cultivation-context.ts`、`packages/company-pack/src/host/run-bundle/company-root.ts`、`packages/company-pack/src/host/run-bundle/write-gate.ts`、`packages/company-pack/src/host/run-bundle/runtime-guard.ts`、`packages/company-pack/src/host/run-bundle/lease.ts`、`packages/company-pack/src/host/commands/blocked-text.ts`、`packages/company-pack/src/index.ts`、`packages/company-pack/src/client/cultivation/cultivation-copy.ts`、`packages/company-pack/src/client/cultivation/cultivation-actions.ts`、`packages/company-pack/src/client/cultivation/CultivationCompose.tsx`。
- 红：`pnpm test tests/host/cultivation/cultivation-command.spec.ts` 中 `language.set('en')` 后 `/cultivation` 仍滞留中文 `description`/`hint`（`registerCultivation` 用一次性 `ctx.commands.register`）；同时 `tests/host/cultivation/cultivation-context.spec.ts`、`tests/client/cultivation/cultivation-context.spec.ts`、`tests/host/run-bundle/write-gate.spec.ts`、`tests/host/run-bundle/runtime-guard.spec.ts` 在 `en` 下断言零中文报错均为红。
- 绿：`pnpm test tests/host/cultivation/cultivation-command.spec.ts`（28/28 绿），关联 10 份 host/client/contract spec 全跑 259/259 绿，`pnpm typecheck`、`pnpm lint`、`pnpm dup` 零错误零违例。
- 提交：commit 1db6d6e7
