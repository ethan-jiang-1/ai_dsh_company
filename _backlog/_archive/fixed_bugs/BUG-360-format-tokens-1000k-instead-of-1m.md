---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-360：`formatTokens` 在 999 950–999 999 区间输出 `1000k`，永远升不到 `1M`

> 严重级别：P2·低影响（显示口径：用量面板把接近一百万的令牌数写成 `1000k`，与同函数「`1.2k`/`3.4M`」的量纲约定冲突，读者会以为还在千级）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（舍入后判档）
>
> **留痕**：Note [2026-11-24-boundary-window-and-bad-shape-batch](../../../notes/implemented/2026-11-24-boundary-window-and-bad-shape-batch.md)（批次 360..369：格式档位进位）

## 症状

[`formatTokens`](../../../packages/company-pack/src/lib/accounting/budget.ts#L49-L53) 先判 `>= 1_000_000` 走 M 档，否则按 k 档除以 1000 并四舍五入到一位小数。`999_950 <= v < 1_000_000` 时 `v/1000` 落在 `[999.95, 1000)`，`Math.round(x*10)/10` 得到 `1000`，`Number.isInteger(1000)` 为真 ⇒ 输出字符串 `"1000k"`。

## 运行面

- **面 = lib**：[`packages/company-pack/src/lib/accounting/budget.ts`](../../../packages/company-pack/src/lib/accounting/budget.ts#L49-L62)；消费方 [`BudgetPanel`](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L392-L401)。

## 复现

```sh
pnpm exec tsx -e "
import { formatTokens } from './packages/company-pack/src/lib/accounting/budget.ts';
console.log([999_949, 999_950, 999_999, 1_000_000].map(v => v + ' -> ' + formatTokens(v)).join('\n'));
"
```

实测输出 `999949 -> 999.9k` / `999950 -> 1000k` / `999999 -> 1000k` / `1000000 -> 1M`。`"1000k"` 不是任何一档的合法写法。

## 根因与证据

1. 档位判定用**原始值**（`value >= 1_000_000`），而输出用**四舍五入后的值**；两者在 999.95k 附近不一致。
2. `trim()` 只处理小数尾巴，不处理「进位到下一个整档」的情况（`1000`、`1_000_000` 同理）。

## 失败类与同类排查

- **失败类**：格式化函数的档位阈值与舍入顺序不一致（先舍入再判档，或判档时预留进位）。
- **同类排查**：同文件 `budgetSummary` 的 `share` 用原值计算，不受影响；`client/cultivation` 的时间/百分比格式化未见同形。

## 修复方案与范围

- **根因修法**：先做档位进位（例如 `if (value >= 999_950) return ...` 前先归一化，或对舍入结果再判一次档：`rounded >= 1000` 时进 M 档并重新舍入）。

## 已修判定

- `formatTokens(999_950)`、`formatTokens(999_999)` 输出 `1M`（或至少不再是 `1000k`）；`999_949` 仍为 `999.9k`；`formatTokens(1_000_000)` 仍为 `1M`。

## 修复证据

- 改动面：`packages/company-pack/src/lib/accounting/budget.ts`、`tests/lib/accounting/budget.spec.ts`
- 红：`pnpm test tests/lib/accounting/budget.spec.ts` —— 还原前 1 failed（999 950 输出 `1000k`）
- 绿：`pnpm test tests/lib/accounting/budget.spec.ts` —— 全绿（999 949 `999.9k`；999 950+ `1M`）
- 提交：commit c585eb9a
