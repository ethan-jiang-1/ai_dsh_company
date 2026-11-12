---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-117：`/cultivation adopt <id> as`（`as` 后缺 slug）不报用法错误，静默用默认 `method-<id>` 部署方法

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（严格 adopt）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / 培养命令）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`adopt` 的解析：

```ts
let slug = tokens[2] === 'as' ? tokens[3] : undefined
if (slug === undefined) slug = `method-${id}`
```

`adopt <id> as`（用户写了 `as` 但漏了 slug）时 `tokens[2]==='as'`、`tokens[3]` 为 undefined，于是走默认 slug 并 **success**：

```
adopt as no slug -> {"kind":"success","text":"已采纳 20261113-…：方法 method-20261113-… 部署到 CEO 方法层…"}
```

这是**写状态**的命令：用户以为要指定自定义 slug，实际部署了一个默认名；后续 `revoke`/`verify` 需要按这个意外名字操作。同类拼写 `adopt <id> asx slug` 也会静默回默认、忽略多余 token。

## 根因（假设）

- 解析把「tokens[2] 不是 as」与「as 后缺 slug」折成同一个 `undefined`，再回默认。
- 没有「tokens 形状必须 exact」的校验：`as` 后必须恰好一个 slug；多余 token 应报用法。

## 暴露的失败类

**状态变更命令的「可选短语」解析**：`[as <slug>]` 的 `as` 与 slug 被分开处理，缺值被当成「未提供」而不是「提供了一半」。同族：任何 `[as x]`/`[--flag value]` 的 command parser 都要区分「没有这个短语」和「短语缺参」。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-adopt-malformed.mts
```

2026-11-13 原始输出：

```
adopt as no slug -> {"kind":"success","text":"已采纳 20261113-025528-2byi：方法 method-20261113-025528-2byi 部署到 CEO 方法层。…"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 解析：`tokens.length` 只允许 2 或 4；若 `tokens[2]` 存在则必须是 `as` 且 `tokens[3]` 非空；否则报用法。
- `as` 后缺 slug、`as` 后多 token、未知第二 token 都 error，不写方法。
- 加 spec：`adopt id as`、`adopt id asx slug`、`adopt id as slug extra`、正常 `adopt id as slug`、`adopt id`（默认）五档。

## 修复关联

- 发现于 C1 培养命令回归；与 BUG-092（propose 空字段仍 recorded）同属「状态变更入口的形状校验」。
- 相关：`src/host/cultivation/cultivation.ts` 的 `commandAdopt`。

## 已修判定

修成：`adopt` 只认 `adopt <id>` 或 `adopt <id> as <slug>`；`as` 缺 slug、多 token、未知第二 token 一律用法错误，不写方法。
- keyless：`adopt id as` → error，方法层无新目录；红证：HEAD cultivation → 3 failed（含本卡）。
