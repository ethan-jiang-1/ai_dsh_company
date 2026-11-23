---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-337：`DelegationFlowPanel` 中文界面硬编码英文 `missing` 标签

> 严重级别：P2（表达层：所有相邻终态标签都走了 `t('delegationFlow.terminal.*')`，唯有 `node.missing` 写死英文 `missing`）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（顺位 4 表达层；机械修复）

## 症状

当委派流程树中存在投影缺失节点（`node.missing === true`）时，[`DelegationFlowPanel`](../../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx#L69) 在中文界面下所有相邻状态标签均显示中文（「完成」「未完成」「丢失」等），唯独缺失标志显示英文裸词 `missing`。

## 运行面

- **面 = client UI**：[`packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx`](../../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx#L62-L70)、[`locales.ts`](../../../packages/company-pack/src/client/locales.ts)。

## 复现

```sh
pnpm exec tsx -e "
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DelegationFlowPanel } from './packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx';
console.log(renderToStaticMarkup(createElement(DelegationFlowPanel, {
  tree: { root: 'lead', maxDepth: 1, nodes: [{ id: 'c1', label: 'vp-eng', preset: 'vp-eng', mode: 'one-shot', status: 'unknown', terminal: null, depth: 1, missing: true }] },
})));
"
```

实际输出包含 `<Tag ...>missing</Tag>`。

## 根因与证据

- [`DelegationFlowPanel.tsx:62-68`](../../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx#L62-L68) 对 7 种 `terminal` 全部调用 `t('delegationFlow.terminal.*')`，第 69 行 `{node.missing && <Tag tone="warning">missing</Tag>}` 遗漏字典化。
- `tests/client/i18n/` 与现有单测只查 `en` 漏中文，不查 `zh` 漏英文非预期标签（`Lead`、role id 等专有名词除外）。

## 失败类与同类排查

- **失败类**：`client UI` 双语字典遗漏。
- **同类排查**：同文件第 32-70 行其余文案全部走 `t('delegationFlow.*')`；`d{node.depth}` 为结构记号。

## 修复方案与范围

- **根因修法**：在 `locales.ts` 补 `delegationFlow.missing`（zh/en 成对，如 `缺失` / `missing`），`DelegationFlowPanel.tsx:69` 改为 `t('delegationFlow.missing')`。
- **判据**：中文渲染出现本地化标签，英文渲染仍为 `missing`；补入双向测试。

## 已修判定

- `DelegationFlowPanel` 在 `zh` 下 `node.missing === true` 渲染本地化中文标签，`en` 下渲染英文，不回归现有 `delegation-flow` 测试。

## 修复证据

- 改动面：`packages/company-pack/src/client/locales.ts`、`packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx`、`tests/client/tabs/delegation-flow-panel.spec.ts`
- 红：`pnpm test tests/client/tabs/delegation-flow-panel.spec.ts` —— 还原前 1 failed（中文界面出现裸 `missing`）
- 绿：`pnpm test tests/client/tabs/delegation-flow-panel.spec.ts` —— 全绿（zh「缺失」/ en `missing`）
- 提交：commit e88459fa
