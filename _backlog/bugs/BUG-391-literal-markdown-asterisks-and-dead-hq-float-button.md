---
status: 调查中
severity: P2
opened: 2026-11-27
---

# BUG-391：React 文案裸印 Markdown `**` 星号，且 HQ 内嵌子面板保留无响应的「浮出」死按钮

> 严重级别：P2（成品页脚与培养 journal 说明直接在界面上印出原始 `**派生显示**` / `**这里不用你操作**` / `**No action needed here.**` 星号字面量；同时 HQ「台账与成品」与「启动策略」复用 `PanelFrame` 并绑定 `noopFloat`，留下点击毫无反应的「浮出」死按钮）｜发现：2026-11-27｜状态：调查中

## 症状

1. **裸星号字面量**：
   - 在右栏 `档案 → 培养` 与 HQ `培养工坊` 的 journal 说明底部（`12-zh-archive-cultivation.png`、`15-zh-hq-cultivation.png`、`25-en-archive-1440.png`），用户直接看到原始 Markdown 星号：`**这里不用你操作**`（中文）与 `**No action needed here.**`（英文）；
   - 在右栏 `档案 → 成品` 与 HQ `台账与成品` 页脚（`18-zh-hq-ledger-deliverables.png`），用户看到 `本索引是 host 生成的**派生显示**，不作为审计权威`。
2. **HQ 内死「浮出」按钮**：
   - 在 HQ「台账与成品」的「台账」「成品」卡片右上角以及「启动策略」卡片右上角（`18-zh-hq-ledger-deliverables.png`），均渲染了 `浮出`（`Float`）按钮，但点击没有任何效果也无提示。

## 运行面

- **面 = client**：
  - 裸星号：[cultivation-copy.ts](../../packages/company-pack/src/client/cultivation/cultivation-copy.ts#L168) 与 [第 433 行](../../packages/company-pack/src/client/cultivation/cultivation-copy.ts#L433)、[locales.ts](../../packages/company-pack/src/client/locales.ts#L276)（纯 JSX 文本渲染了未解析的 `**...**`）；
  - 死按钮：[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx#L166)（`noopFloat = (): void => {}`）及 [第 457、470、496 行](../../packages/company-pack/src/client/ux/company-hq.tsx#L457-L497)，加上 [company-tabs.tsx](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L80-L91) `PanelFrame` 无条件渲染「浮出」按钮而不判断是否处于 HQ 容器（无浮出能力）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs
```

实测截图：`12-zh-archive-cultivation.png`、`15-zh-hq-cultivation.png`、`18-zh-hq-ledger-deliverables.png`、`25-en-archive-1440.png`。

## 根因与证据

1. 这几条字典字符串原本按 Markdown 语法撰写了加粗符号 `**...**`，但在 React UI 中直接作为 JSX `{text}` 文本节点渲染，未用 `<strong>` 组件或去星号纯文本表达；
2. HQ 复用右栏三大面板（`LedgerTab`、`DeliverablesTab`、`StrategyPanel`）时，为满足 `PanelFrameProps` 类型要求传入了空操作 `noopFloat` 与伪造 `hqTabInfo`，而 `PanelFrame` 未区分可浮出态与嵌入式只读框，违反「不留死按钮」UI 纪律。

## 期望判据

- 界面纯文本文案不再出现未渲染的 Markdown `**` 符号（或显式拆出 JSX `<strong>`）；
- `PanelFrame` 在非右栏停靠语境（如 HQ 嵌入式卡片，`floatTab` 缺席或显式关闭）下隐藏「浮出」按钮。
