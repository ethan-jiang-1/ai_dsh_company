---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-123：`startup.json` 损坏时静默回退「全自动」：`/company-settings show` 显示 productType=auto，不报 corruption

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（corrupt 诊断）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / startup 持久化）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/startup.json` 是**人改的项目策略**（产品类型 / 交付模式 / wiki 指针）。它被截断/写坏后：

```ts
readStartupSettings(workspace)
→ { v:1, productType:null, deliveryMode:null, wiki:null, updatedAt:null }
```

`readStartupSettings` 的 `catch` 直接返回 `EMPTY_STARTUP_SETTINGS`；没有 `problem:'corrupt'`，也没有 warning。于是：

- `/company-settings show` 显示 `productType=auto, deliveryMode=auto, wiki=auto`，用户以为「从没设过」；
- 注入的 startup section 也按「全自动」渲染；
- 写新设置时直接覆盖坏文件，原约束/指针没有任何恢复入口。

同族的 `readStartupOptions` 损坏也静默回退 `EMPTY_STARTUP_OPTIONS`，面板可能显示「无可选项」，而不是「派生文件坏了」。

这不是「坏设置应忽略」的问题——忽略可以，但**要像 BUG-111 的 saved workspace 一样可诊断**，不能让用户把 corruption 当成 auto。

## 根因（假设）

- `readStartupSettings` / `readStartupOptions` 只有 `try/catch → empty`，没有独立 `problem` 返回面。
- `settings-command show` 只描述结果，不区分「解析失败」与「确实是 auto」。
- `writeAtomic` 保证不半写目标，但外部损坏/旧版本/手工编辑仍可能产生坏文件；读侧没有诊断。

## 暴露的失败类

**「坏设置 = 空设置」**：方便的回退把 corruption 伪装成用户选择；需要区分「缺失」（合法 = auto）、「损坏」（错误 = 显示并给恢复/覆盖提示）、「不支持 schema」。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-startup-corrupt.mts
```

2026-11-13 输出：

```
read -> {"v":1,"productType":null,"deliveryMode":null,"wiki":null,"updatedAt":null}
```

（输入文件是 `{"v":1,"productType":`。）

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `readStartupSettings` 返回 `{ settings, problem?: 'corrupt' | 'unsupported' }`，或额外 `readStartupSettingsState`；调用方保留旧 API 的可空形状。
- `settings-command show` 在 problem 时显示「startup.json 损坏，当前按 auto；重新 set 会覆盖」；日志/注入 section 也 warn。
- `readStartupOptions` 同款：派生文件坏 → 重新 `refreshStartupOptions`，并给面板错误/重试，不静默空。
- 加 spec：截断 JSON、空文件、未知 schema、合法 auto、正常设置；show 回执区分。

## 修复关联

- 发现于 C3 startup 持久化回归；与 [BUG-111](BUG-111-saved-workspace-non-atomic-write.md)（saved workspace corrupt 已修）同族，但本卡是 startup settings。
- 相关：`src/host/startup/startup-store.ts` 的 `readStartupSettings` / `readStartupOptions`；`settings-command.ts` 的 show。

## 已修判定

修成：`parseStartupSettingsState` 区分 illegal JSON/坏形状（corrupt）与未来 schema（unsupported）；`/company-settings show` 显示「损坏，当前按 auto，重新 set 覆盖」；注入 section 也提示不可用，不再静默 auto。
- keyless：截断 JSON → problem=corrupt；红证：HEAD startup-store → 2 failed。
