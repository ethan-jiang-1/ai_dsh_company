---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-338：`host` 命令面与培养 `source` 摘要双语缺口（`/company-settings` 阻塞/损坏提示及 `/deliverables` `/req` `/prd` `/delivery` 仍纯中文）

> 严重级别：P2（表达层：`BUG-316/326` 仅收口 `/cultivation` 与部分 `/company-settings`，`en` 实例执行其余命令或阻塞态仍返回整段中文）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)
>
> **进展（2026-11-24，阶段一已落 `25489edf`）**：`/company-settings` 停写/损坏路径改 `blockedCompanyTextPair`；`/deliverables` `/prd` `/req` `/delivery` 接入 `CompanyLanguageState`（描述/提示/停写/成功回执，语言切换重注册）；`contextSummaryPair` 与 `/cultivation` 对账/撤回回执补英文；`tests/host/commands/command-language.spec.ts` 守 en 描述/提示/停写回执。**剩余**：`/req`/`/prd` 校验器内部 `errors` 明细仍中文（`requirements-check.ts` / `prd-check.ts`），需按 `tr` 参数贯通后翻 `修复就绪`/归档。

## 症状

1. 在 `en` 模式下，已接入 `text(zh, en)` 的 [`settings-command.ts`](../../packages/company-pack/src/host/commands/settings-command.ts#L123-L199) 仍有 5 处硬编码中文直出：第 123/129 行 `blockedCompanyText(options.blockedReason, '设置')`（明明已有 `blockedCompanyTextPair`）、第 143 行 `problemNote`（`⚠ startup.json 损坏…`）、第 165 行 `恢复自动失败：…`、第 199 行 `写入 startup.json 失败：…`。
2. [`host/cultivation/cultivation.ts`](../../packages/company-pack/src/host/cultivation/cultivation.ts#L143) 在有背景时调用只输出中文的 [`contextSummary`](../../packages/company-pack/src/lib/cultivation/cultivation-context.ts#L342-L347)（`会话「…」`/`成品「…」`），第 143 行 `companyScopeOf`、第 207/320/324 行报错透传、第 412 行 `/cultivation revoke` 后半句（`确认它是孤儿后再执行 /cultivation revoke … --orphan。`）以及第 661–680 行 `/cultivation check`（`（缺方法 …）`、`（缺 methodSlug）`、`；另有 N 条坏记录未计入`、`；另有 N 条已撤回记录`）均绕过了 `t(...)` 直接拼进英文回执。
3. 同属用户可见斜杠命令的 `/deliverables`（[`deliverables-command.ts`](../../packages/company-pack/src/host/commands/deliverables-command.ts#L54-L76)）、`/prd`（[`prd-command.ts`](../../packages/company-pack/src/host/commands/prd-command.ts)）、`/req`（[`req-command.ts`](../../packages/company-pack/src/host/commands/req-command.ts)）、`/delivery`（[`delivery-command.ts`](../../packages/company-pack/src/host/commands/delivery-command.ts)）整体未接入 `CompanyLanguageState`，描述与回执全为中文。

## 运行面

- **面 = host + lib**：`packages/company-pack/src/host/commands/*`、`packages/company-pack/src/host/cultivation/cultivation.ts`、`packages/company-pack/src/lib/cultivation/cultivation-context.ts`。

## 复现

```sh
rg -n "blockedCompanyText\(|⚠ startup\.json|恢复自动失败|写入 startup\.json 失败|contextSummary\(" packages/company-pack/src/host/
```

可见 `settings-command.ts:123,129,143,165,199`、`deliverables-command.ts:58`、`prd-command.ts:50`、`req-command.ts:206`、`delivery-command.ts:93` 与 `cultivation.ts:346` 全部直出中文字符串（无英文分支）。

## 根因与证据

1. `BUG-316`/`BUG-326` 只逐点修了 `/cultivation` 命令与 `settings-command.ts` 的常规成功路径；异常/阻塞路径遗漏，其余 4 个斜杠命令未纳入同次迁移。
2. `company-static-audit.mjs` 的 R2 规则只扫 `src/client/**` 与 `src/lib/**`，**完全跳过 `src/host/**`**（见同轮 `BUG-340`），导致 `host` 命令回归/漏译无静态红灯。

## 失败类与同类排查

- **失败类**：`host` 表达层双语缺失（[`BUG-316`](../_archive/fixed_bugs/BUG-316-cultivation-host-command-texts-not-localized.md) / [`BUG-326`](../_archive/fixed_bugs/BUG-326-cultivation-command-description-inner-errors-chinese.md) 同族）。
- **同类排查**：`blocked-text.ts` 已存在 `blockedCompanyTextPair` 辅助函数，除 `cultivation.ts:203` 外，其余所有命令调用方均未切换。

## 修复方案与范围

- **根因修法**：
  1. `settings-command.ts` 全量切换至 `text(zh, en)` 与 `blockedCompanyTextPair`；
  2. `cultivation.ts:143,346` 与 `contextSummary` 补齐双语或结构化口径；
  3. 为 `/deliverables`、`/prd`、`/req`、`/delivery` 接入 `CompanyLanguageState`（含 `description`/`hint`/`blockedCompanyTextPair` 与回执），并核对 `en` 命令输出零汉字。
- **不改**：machine-readable 工具输出给模型的协议字段（按语言政策保持 canonical）。

## 已修判定

- `en` 模式下执行 `/company-settings`（含 `dataBlocked`、`corrupt startup.json`、读写异常）、`/deliverables`、`/prd`、`/req`、`/delivery` 与带 `context` 的 `/cultivation`，命令描述与回执全为干净英文；
- `zh` 保持现有中文语义与文案；对应 host 命令 spec 在 `en` 下断言零 CJK。
