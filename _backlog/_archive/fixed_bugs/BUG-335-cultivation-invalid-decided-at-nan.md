---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-335：`CultivationBoardSections` 渲染非法 `decidedAt` 时输出 `NaN-NaN-NaN NaN:NaN`

> 严重级别：P2（UI 读模型健壮性：非标准或手改培养记录的 `decidedAt` 在面板直接显示 `NaN-NaN-NaN NaN:NaN`）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（非法 ISO 回退原串、`timeParts` 有 invalid 档）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（顺位 3 时间片段防线；机械修复）。

## 症状

当培养记录 frontmatter 中的 `decidedAt` 为非有效日期字符串（例如 `decidedAt: invalid-date-xyz` 或手写非 ISO 文本）时：
- 「我提交的 · 我已处理」的拒绝时间渲染为 `目标角色语境下的人拒绝 · 拒绝时间：NaN-NaN-NaN NaN:NaN`；
- 「已采纳的方法」的采纳时间渲染为 `采纳时间：NaN-NaN-NaN NaN:NaN`（`en` 下为 `Adopted at: NaN-NaN-NaN NaN:NaN`）。

## 运行面

- **面 = client UI + lib**：[`CultivationBoardSections.tsx`](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L60) 与 [`L155`](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L155)、[`cultivation-record.ts`](../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L354-L366)。

## 复现

```sh
pnpm exec tsx -e "
import { timeParts } from './packages/company-pack/src/lib/cultivation/cultivation-record.ts';
console.log(timeParts(Date.parse('invalid-date-xyz'), Date.now()));
"
```

实际输出：`{ kind: 'date', text: 'NaN-NaN-NaN NaN:NaN' }`。将其喂入 `CultivationAdopted` / `CultivationMine` 时直接在页面渲染 `NaN-NaN-NaN NaN:NaN`。

## 根因与证据

1. 同文件 [`CultivationBoardSections.tsx:31-33`](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L31-L33) 的 `verificationTime` 与 [`cultivation-record.ts:335-338`](../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L335-L338) 的 `decidedAtLabel` 均显式判断 `Number.isNaN(at)` 并回退到原串；
2. 但在 `BUG-302` 迁移 `CultivationBoardSections.tsx:60` 与 `:155` 时，直接写了 `cultivationTimeLabel(timeParts(Date.parse(record.decidedAt), Date.now()))`，漏掉了 `Number.isNaN` 守卫；
3. [`timeParts`](../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L354-L366) 自身也未对 `!Number.isFinite(at) || !Number.isFinite(now)` 做保护，直接对 `new Date(NaN)` 调 `getHours()`/`getDate()` 拼接 `NaN`。

## 失败类与同类排查

- **失败类**：纯逻辑边界防护缺失（`NaN` 污染 UI 输出）。
- **同类排查**：扫描全仓 `timeParts(` 调用点——`use-cultivation-board.tsx:115`（`stampOf`）前置 `recordStampOf` 仅在正则匹配且 `!Number.isNaN(at)` 时才调用；`CultivationBoardSections.tsx:33` 已判 `Number.isNaN(at)`；仅 `:60` 与 `:155` 缺失守卫。

## 修复方案与范围

- **根因修法**：抽出统一的辅助函数 `formatDecidedTime(iso: string, now: number): string`（或扩展 `cultivationTimeLabel` / `timeParts` 安全接口），当 `Date.parse(iso)` 为 `NaN` 时安全回退原串（或标记无效），并在 `timeParts` 入口加有限数防御；同时检查 `parseRecord` 是否应对非法的 `decidedAt`/`revokedAt` 保留原值而不崩溃。
- **判据**：非法 `decidedAt` 下 `CultivationMine` 与 `CultivationAdopted` 不得出现 `NaN`；合法 ISO 时间行为不变。

## 已修判定

- `CultivationMine` 与 `CultivationAdopted` 在 `decidedAt: 'invalid-date-xyz'` 时不渲染 `NaN-NaN-NaN NaN:NaN`；
- `timeParts(NaN, Date.now())` 具备安全退化或显式防线，且有单元测试守卫。

## 修复证据

- 改动面：`packages/company-pack/src/lib/cultivation/cultivation-record.ts`、`packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx`、`packages/company-pack/src/client/cultivation/cultivation-actions.ts`、`tests/lib/cultivation/cultivation-record-time.spec.ts`、`tests/client/cultivation/cultivation-copy.spec.ts`
- 红：`pnpm test tests/lib/cultivation/cultivation-record-time.spec.ts tests/client/cultivation/cultivation-copy.spec.ts` —— 还原守卫前 2 failed / 5 passed（`timeParts(NaN)` 仍产 `date`、`NaN-NaN-NaN` 直出）
- 绿：`pnpm test tests/lib/cultivation/cultivation-record-time.spec.ts tests/client/cultivation/cultivation-copy.spec.ts` —— 7/7 passed（invalid 档 + 原串回退，zh/en 均有语言化兜底）
- 提交：commit 51e38f8b
