---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-343：`/req check` 校验 `deliveryMode` 仅用 `existsSync` 而未走 `isSafeContentId`，`..` 等路径穿越值可绕过未知交付模式拒绝

> 严重级别：P2（边界契约绕过：与 `/delivery check` 和同文件的 `resolveProductType` 口径不一致，`meta.md` 写 `deliveryMode: ..` 或 `../product-types/business-software` 会被 `/req check` 当成有效交付模式放行）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（与 `/delivery check` 同口径，构造值全部回 error）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（顺位 2 host 校验口径；机械修复）。

## 症状

在动议 `meta.md` 中写入路径穿越形式的 `deliveryMode`（如 `deliveryMode: ../product-types/business-software` 或 `deliveryMode: ..`）并运行 `/req check <slug>` 时，命令没有返回「未知交付模式」错误，而是校验通过并在回执里原样输出 `交付模式 = ../product-types/business-software`。

## 运行面

- **面 = host**：[`packages/company-pack/src/host/commands/req-command.ts`](../../../packages/company-pack/src/host/commands/req-command.ts#L239-L246)。

## 复现

```sh
pnpm vitest run tests/host/commands/req-command.spec.ts
```

（用任意含 `numbering: identity`、`layers: MRD` 与合法 `mrd.md` 的动议把 `meta.md` 设为 `deliveryMode: ../product-types/business-software`，调 `/req check <slug>` 返回 `{ kind: 'success', text: '... 交付模式 = ../product-types/business-software ...' }`；当前无用例测此输入，构造用例可见其通过。）

## 根因与证据

1. 同文件 `resolveProductType`（[`req-command.ts:165`](../../../packages/company-pack/src/host/commands/req-command.ts#L165)）与 [`delivery-command.ts:122`](../../../packages/company-pack/src/host/commands/delivery-command.ts#L122) 均显式用 `!isSafeContentId(id) || !available.includes(id)` 校验证书成员；
2. 但 `req-command.ts:240-241` 对 `deliveryMode` 却手写了 `!existsSync(join(options.contentDir, 'delivery-modes', deliveryMode))`——因 `content/delivery-modes/..` 与 `content/delivery-modes/../product-types/...` 在盘上真实存在，`existsSync` 返回 `true`，直接放行通过（虽然下方的 `deliveryReminderFiles` 第 107 行仍会用 `isSafeContentId` 拦截成 `[]`，导致连 `sow.md`/`sla.md` 提醒也一起静默丢失）。

## 失败类与同类排查

- **失败类**：同一包内相邻校验入口未复用单段成员判据（[`content-id.ts`](../../../packages/company-pack/src/host/commands/content-id.ts)）。
- **同类排查**：`resolveProductType`（`req-command.ts:165`）、`deliveryReminderFiles`（`req-command.ts:107`）与 `delivery-command.ts:122` 均已使用 `isSafeContentId` + 目录枚举；仅 `req-command.ts:240-241` 漏接。

## 修复方案与范围

- **根因修法**：将 `req-command.ts:240-241` 改为与 `delivery-command.ts:121-125` 一致：先校验 `isSafeContentId(deliveryMode) && availableDeliveryModes(options.contentDir).includes(deliveryMode)`，不满足即返回「未知交付模式」。

## 已修判定

- `meta.md` 含 `deliveryMode: ..`、`.`、`../product-types/business-software` 或含斜杠值时，`/req check` 返回 `kind: 'error'` 且提示可用交付模式，与 `/delivery check` 完全一致。

## 修复证据

- 改动面：`packages/company-pack/src/host/commands/req-command.ts`、`tests/host/commands/req-command.spec.ts`
- 红：`pnpm test tests/host/commands/req-command.spec.ts` —— 还原修复前 1 failed / 25 passed（`..`、`.`、`../product-types/business-software`、含斜杠值全被放行）
- 绿：`pnpm test tests/host/commands/req-command.spec.ts` —— 26/26 passed（四类构造值均返回「未知交付模式」）
- 提交：commit 751c82d0
