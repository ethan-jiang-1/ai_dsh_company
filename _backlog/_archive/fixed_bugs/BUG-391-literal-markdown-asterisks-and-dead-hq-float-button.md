---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-391：React 文案裸印 Markdown `**` 星号，且 HQ 内嵌子面板保留无响应的「浮出」死按钮

> 严重级别：P2（成品页脚与培养 journal 说明直接在界面上印出原始 `**派生显示**` / `**这里不用你操作**` / `**No action needed here.**` 星号字面量；同时 HQ「台账与成品」与「启动策略」复用 `PanelFrame` 并绑定 `noopFloat`，留下点击毫无反应的「浮出」死按钮）｜发现：2026-11-27｜状态：已修｜审查：agent（`7ad5c423` 独立只读盲审通过，0 阻断）
>
> **留痕**：Note [2026-11-27-ux-ui-audit-batch-fixes](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md)（批次 384..391：清除纯文本 `**` 星号与隐藏 HQ 死浮出按钮）

## 症状

1. **裸星号字面量**：
   - 在右栏 `档案 → 培养` 与 HQ `培养工坊` 的 journal 说明底部（`12-zh-archive-cultivation.png`、`15-zh-hq-cultivation.png`、`25-en-archive-1440.png`），用户直接看到原始 Markdown 星号：`**这里不用你操作**`（中文）与 `**No action needed here.**`（英文）；
   - 在右栏 `档案 → 成品` 与 HQ `台账与成品` 页脚（`18-zh-hq-ledger-deliverables.png`），用户看到 `本索引是 host 生成的**派生显示**，不作为审计权威`。
2. **HQ 内死「浮出」按钮**：
   - 在 HQ「台账与成品」的「台账」「成品」卡片右上角以及「启动策略」卡片右上角（`18-zh-hq-ledger-deliverables.png`），均渲染了 `浮出`（`Float`）按钮，但点击没有任何效果也无提示。

## 运行面

- **面 = client**：
  - 裸星号：[cultivation-copy.ts](../../../packages/company-pack/src/client/cultivation/cultivation-copy.ts#L168) 与 [第 433 行](../../../packages/company-pack/src/client/cultivation/cultivation-copy.ts#L433)、[locales.ts](../../../packages/company-pack/src/client/locales.ts#L279)（纯 JSX 文本移除未解析 `**...**`），同步刷新视觉金样 [ui.expected.json](../../../snapshots/visual/company-shell/ui.expected.json#L12)；
  - 死按钮：[company-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-tabs.tsx#L48-L96)（`PanelFrameProps.floatTab` 收窄为可选、`floatTab === undefined` 时不渲染浮出按钮），[LedgerTab.tsx](../../../packages/company-pack/src/client/tabs/LedgerTab.tsx#L24-L26)、[DeliverablesTab.tsx](../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx#L38-L40)、[StrategyPanel.tsx](../../../packages/company-pack/src/client/startup/StrategyPanel.tsx#L25-L33) 同步可选 `floatTab`，[company-hq.tsx](../../../packages/company-pack/src/client/ux/company-hq.tsx#L168) 删除 `noopFloat` 并撤去 HQ 嵌入式卡片的 `floatTab`/`unfloatTab`。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs
```

实测截图：`12-zh-archive-cultivation.png`、`15-zh-hq-cultivation.png`、`18-zh-hq-ledger-deliverables.png`、`25-en-archive-1440.png`。

## 根因与证据

1. 这几条字典字符串原本按 Markdown 语法撰写了加粗符号 `**...**`，但在 React UI 中直接作为 JSX `{text}` 文本节点渲染，未用 `<strong>` 组件或去星号纯文本表达；
2. HQ 复用右栏三大面板（`LedgerTab`、`DeliverablesTab`、`StrategyPanel`）时，为满足 `PanelFrameProps` 类型要求传入了空操作 `noopFloat` 与伪造 `hqTabInfo`，而 `PanelFrame` 未区分可浮出态与嵌入式只读框，违反「不留死按钮」UI 纪律。

## 失败类与同类排查

- **失败类**：纯文本字典混入未解释的 Markdown 语法；复用右栏 `PanelFrame` 容器的嵌入场景传入 no-op 回调制造死按钮。
- **同类排查**：全面检索 `packages/company-pack/src/client/locales.ts` 与 `cultivation-copy.ts`，其余文案均无用户可见 `**`（`LedgerSummary` 会解析成对 `**` 为 `<strong>`）；右栏可浮出页签 `OpsHubTab`/`TeamHubTab`/`ArchiveHubTab`/`AttentionTab`/`BoardTab` 仍正常注入真实 `sidebarRight.float`。

## 已修判定

- `cultivation-copy.ts` 中英文 `journalNote` 与 `locales.ts` `deliverables.footer` 均清除 `**` 字面量，视觉金样 `ui.expected.json` 同步刷新且 diff 仅去除该处 `**`；
- `PanelFrameProps.floatTab` 改为可选，`floatTab === undefined` 时不渲染浮出按钮；HQ 中 `LedgerTab`、`DeliverablesTab` 与 `StrategyPanel` 删去 `noopFloat` 后零死按钮。

## 修复证据

- 改动面：`packages/company-pack/src/client/cultivation/cultivation-copy.ts`、`packages/company-pack/src/client/locales.ts`、`packages/company-pack/src/client/tabs/company-tabs.tsx`、`packages/company-pack/src/client/tabs/LedgerTab.tsx`、`packages/company-pack/src/client/tabs/DeliverablesTab.tsx`、`packages/company-pack/src/client/startup/StrategyPanel.tsx`、`packages/company-pack/src/client/ux/company-hq.tsx`、`snapshots/visual/company-shell/ui.expected.json`、`tests/client/cultivation/cultivation-copy.spec.ts`、`tests/client/i18n/locales.spec.ts`、`tests/client/tabs/panel-frame.spec.ts`、`tests/client/ux/company-hq.spec.ts`
- 红：`pnpm test tests/client/cultivation/cultivation-copy.spec.ts tests/client/i18n/locales.spec.ts tests/client/tabs/panel-frame.spec.ts tests/client/ux/company-hq.spec.ts` —— 修复前 4 failed（`journalNote` / `deliverables.footer` 含 `**`；`PanelFrame` 缺 `floatTab` 仍渲染「浮出」；HQ 台账与策略页出现 2 颗死「浮出」按钮）
- 绿：`pnpm test tests/client/cultivation/cultivation-copy.spec.ts tests/client/i18n/locales.spec.ts tests/client/tabs/panel-frame.spec.ts tests/client/ux/company-hq.spec.ts` —— 4 文件及联动 `deliverables-catalog.spec.ts` 共 5 文件 41/41 passed（`ui-scene.entry.mjs --isolated --expected` 与 `--lang en` 均 PASS）
- 提交：commit cc3878ed
