---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-334：`CultivationRecord` 损坏诊断 `verificationHistoryProblem` 在 `en` 漏出中文，且 `contextProblem` 从未在 UI 渲染

> 严重级别：P2（表达层与读模型一致性：损坏的验证历史在英文面板输出中文告警；损坏的 `contexts` 字段则被静默丢弃、界面零提示）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；涉及 `lib` 读模型与 `client` 呈现层）

## 症状

1. 当一条已采纳培养记录的 `verificationHistory` frontmatter 损坏时（如 `%E0%A4%A` 或非法 JSON），英文模式下 `CultivationTab` / `CultivationView` 直接渲染出中文报错：
   `验证历史格式损坏；当前状态与原始提案仍可查看。`
2. 当一条培养记录的 `contexts` frontmatter 损坏时，`parseRecord` 虽已产出 `record.contextProblem`（且同样硬编码中文），但全仓没有任何 UI 组件渲染 `contextProblem`——参考背景凭空消失且界面零告警。

## 运行面

- **面 = lib + client**：[`cultivation-record.ts`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L207-L227)、[`cultivation-context.ts`](../../packages/company-pack/src/lib/cultivation/cultivation-context.ts#L291-L307)、[`CultivationBoardSections.tsx`](../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L166)、[`CultivationInbox.tsx`](../../packages/company-pack/src/client/cultivation/CultivationInbox.tsx#L103-L142)。

## 复现

```sh
pnpm exec vitest run tests/client/i18n/cultivation-and-strategy.spec.ts
```

（用以下最小场景可当场触发：把 `status: adopted` + `verificationHistory: %E0%A4%A` + `contexts: %ZZ` 的记录经 `parseRecord` 解析后喂给英文模式 `CultivationAdopted` / `CultivationInbox`——`CultivationAdopted` 输出 `<span class="wk-meta wk-cultivation-problem">验证历史格式损坏；当前状态与原始提案仍可查看。</span>`，命中 `CJK_IDEOGRAPH_RE`；而 `record.contextProblem` 在整个渲染 HTML 中完全不存在。）

## 根因与证据

1. [`cultivation-record.ts:208`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L208) 在 `lib/` 层直接硬编码中文 `const verificationHistoryProblem = verificationHistory === null ? '验证历史格式损坏；当前状态与原始提案仍可查看。' : null`，而 [`CultivationBoardSections.tsx:166`](../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L166) 直接渲染 `{record.verificationHistoryProblem}`（同文件第 167 行另一条 `adoptedHistoryNotRecorded` 却走了 `CULTIVATION_COPY`）。
2. [`cultivation-context.ts:291-307`](../../packages/company-pack/src/lib/cultivation/cultivation-context.ts#L291-L307) 同样在 `lib/` 层返回硬编码中文 `problem: '背景格式坏：…'`，而 `CultivationInbox.tsx` / `CultivationMine` / `CultivationAdopted` 均未读取 `record.contextProblem`。
3. 静态审计 R2 给 `cultivation-record.ts`（棘轮 `6`）与 `cultivation-context.ts`（棘轮 `62`）留了字面量配额，掩盖了这两条会流向用户 UI 的中文字符串；[`cultivation-and-strategy.spec.ts`](../../tests/client/i18n/cultivation-and-strategy.spec.ts#L68-L115) 仅测了 `status: open` 正常记录，未覆盖损坏 `verificationHistory` 与损坏 `contexts`。

## 失败类与同类排查

- **失败类**：`client UI` / `lib` 表达层泄露与边界诊断未消费（[`BUG-302`](../_archive/fixed_bugs/BUG-302-english-ui-chinese-time-and-reason.md)、[`BUG-310`](../_archive/fixed_bugs/BUG-310-deliverables-index-silent-entry-drop.md) 同族）。
- **同类排查**：`CultivationRecord` 上的其余诊断状态：`bodyTruncated` 已在 `CultivationInbox.tsx:143` 和 `CultivationBoardSections.tsx:165` 接入 `CULTIVATION_COPY`；`brokenRecords` 与 `recordsProblem` 已在 `CultivationInbox.tsx:56-69` 接入 `CULTIVATION_COPY`。唯独 `verificationHistoryProblem` 与 `contextProblem` 遗漏。

## 修复方案与范围

- **根因修法**：在 `lib/` 侧将 `verificationHistoryProblem` 与 `contextProblem` 改为结构化代号/token（或保留兼容字段的同时新增 typed `problemCode`），在 `cultivation-actions.ts` 的 `CULTIVATION_COPY_ZH` / `CULTIVATION_COPY_EN` 统一翻译；并在 `CultivationInbox` / `CultivationMine` / `CultivationAdopted` 显式渲染 `contextProblem` 告警。
- **判据**：`en` 模式下含损坏 `verificationHistory` 与损坏 `contexts` 的记录均显示可读英文告警、零汉字与全角标点；`zh` 保持中文提示且不静默吞错。

## 已修判定

- `verificationHistory` 损坏的 `adopted` 记录在 `en` 渲染零中文，显示对应英文诊断；
- `contexts` 损坏的记录在 UI 中显式提示背景损坏（`zh`/`en` 各自干净），不再静默消失；
- `tests/client/i18n/cultivation-and-strategy.spec.ts` 补入损坏 `verificationHistory` + `contexts` 场景并通过 `assertEnglishUiClean`。
