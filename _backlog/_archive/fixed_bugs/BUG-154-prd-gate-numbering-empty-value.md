---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-154：present 闸门把 `numbering:` 空值当旧动议放行

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 86](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C8-H3）；与 `/req check` 的 numbering 词表分叉。
> **留痕**：Note [2026-11-14-eight-bug-second-sources.md](../../../notes/implemented/2026-11-14-eight-bug-second-sources.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8-round1.mts`。

## 症状

`meta.md` 写 `numbering:`（空值）并配一份坏 PRD 时：

- `gateToolCall` 返回 **allow**（`gate numbering-empty allow`）；
- 同一对 MRD/PRD 的 `validateProductDocs` 返回 `false`（`validate: false`）；
- 把 meta 改成 `numbering: identity`，同场景 **deny**（`gate numbering-identity deny`）。

但 `/req check` 的 `metaLayers()` 对任何 `numbering:` 行都当「已声明」，空值会报「不在词表（只认 identity）」。也就是说：`/req check` 说坏，present 闸门当旧动议放行。

## 根因（假设）

- 闸门 `numberingDeclared()` 用 `/^numbering:\s*\S/m`，要求冒号后至少一个非空白字符；空值不匹配 → 视为旧动议。
- `/req check` 用 `/^numbering:\s*(.*)$/m` + 词表；空值匹配、值不在词表 → 红。
- 两套 parser 对「声明了但值坏」与「没有声明」给出不同语义，闸门把前者折成后者。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8-round1.mts
```

看 `gate numbering-empty allow validate: false` 与 `gate numbering-identity deny`。meta 文件与坏 PRD 在脚本内临时创建（`numbering:` 空值 / `numbering: identity` 对照）。

## 影响 / 失败类

**失败类 2/6（服务边界 + 持久化派生）**：present 闸门是交付前的硬门；动议只要把 `numbering` 写成空值（或模板占位被删成空）就不进闸门，坏 PRD 可被 present。`/req check` 虽然会红，但它是操作员命令，不挡 `present`。

## 修复方向（不在本卡实施）

- 闸门复用 `requirements-check` 的 marker 解析与词表：任何 `numbering:` 行都算「已声明」；值不是 `identity` 时 deny 或 fail loud。
- 保留唯一豁免：**整行缺失**（旧动议），不是空值/非法值。
- spec 覆盖 missing / empty / invalid / identity 四形状，断言 gate 与 `/req check` 同判。

## 已修判定

```text
meta 整行缺失 numbering           → allow（旧动议只读豁免；保持）
meta 写 numbering:（空值）        → deny，reason 点名 meta.md 的 numbering 值并指向 /req check
meta 写 numbering: numbering-v2   → deny（同上）
meta 写 numbering: identity + 坏 PRD → deny（现有行为不回归）
```

同源判据：闸门与 `/req check` 共用 `numberingMarker()`（`tests/host/commands/prd-gate.spec.ts` 断言四形状，`tests/lib` 断言同一函数对同一 marker 的判定）。红证 = 闸门还原 `/^numbering:\s*\S/m` → 空值形状变 allow，用例红。

## 证据

- `runtime/tmp/c8-round1.mts`：`gate numbering-empty allow validate: false`；`gate numbering-identity deny`。
- 代码：[prd-gate.ts](../../../packages/company-pack/src/host/commands/prd-gate.ts#L65)；对照 [requirements-check.ts](../../../packages/company-pack/src/lib/requirements-check.ts#L364)。
