---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-107：`/deliverables audit` 用单空格重新 join path token，连续空格目录无法审计（会审计到另一个路径）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C6 / 命令解析）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

交付物目录可以带空格；`/deliverables audit <path> true|false` 的 parser 先 `rawInput.trim().split(/\s+/)`，再把 path token `join(' ')`：

```ts
parseDeliverablesAudit('audit .dsh-company/deliverables/a  b/final.md true')
→ { ok: true, path: '.dsh-company/deliverables/a b/final.md', value: true }
```

目录 `a  b`（两个空格）被改成 `a b`：
- 若 `a b` 恰好存在 → 审计错的对象；
- 若不存在 → `auditTargetProblem` 报「不存在」，用户看着路径明明存在却无法审计。

同族：`/company-settings set wiki` 已修成原始剩余串；`/deliverables audit` 仍走 token join。

## 根因（假设）

- `parseDeliverablesAudit` 用 `split(/\s+/)` 再从 tokens 拼回 path，丢失原始空白；`tokens.slice(1,-1).join(' ')` 无法恢复连续空格。
- 没有引号/转义语法，也没有「最后一个 token 是 true|false，前面原样取 raw」的实现。

## 暴露的失败类

**自由文本路径被 token 化再重组**：只要路径含连续空白/引号，parser 的归一化就改变语义。修法应取原始剩余串（去掉命令前缀和末尾 true/false），而不是 split/join。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-2.mts
```

2026-11-13 输出：

```
audit double spaces -> {"ok":true,"path":".dsh-company/deliverables/a b/final.md","value":true}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- `parseDeliverablesAudit` 从 `rawInput` 去掉 `audit` 前缀、末尾 `true|false`，中间原样保留（trim 两端即可），支持引号可选。
- 加 parser spec：连续空格、制表符、带空格目录、路径末尾 `true`、引号路径。
- 若产品决定不支持连续空格路径，应在 parser 明确拒绝并给「用引号/重命名」提示，不能静默改路径。

## 修复关联

- 发现于 C6；与 BUG-084（`set wiki` 多空格已修）同族，`/deliverables` 未覆盖。
- 相关：`src/host/commands/deliverables-command.ts`、`src/host/ledger/presented-ledger.ts`。

## 已修判定

修成：`parseDeliverablesAudit` 取原始剩余串（`audit` 与末尾 true/false 之间原样保留），只裁两端空白；连续空格/制表符路径不再被折叠。

- keyless：`audit .../a  b/final.md true` → path 保留两个空格；非法结论仍给可读错误。
- 红证：HEAD 版 parser → 2 failed；复原 6 passed。
