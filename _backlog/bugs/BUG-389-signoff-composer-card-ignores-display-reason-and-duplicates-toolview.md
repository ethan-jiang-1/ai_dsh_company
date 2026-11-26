---
status: 调查中
severity: P2
opened: 2026-11-27
---

# BUG-389：SignoffComposerCard 未消费结构化 displayReason 且与流内 SignoffToolView 视觉重复

> 严重级别：P2（Wave S1 双签决策卡 `register-s1-ux.ts` 与 `SignoffComposerCard` 只解析 `matched.reason`，未注入/消费多语 `matched.displayReason` 契约，在跨语言或动态切语下与上游 `ApprovalPanel` 行为分叉；且流尾 `SignoffToolView` 与底部 `SignoffComposerCard` 同屏双份完整平铺造成高度与信息冗余；同时 `args.line` 本身在模型复读 `signoff-tool` 提示示例时会出现 `"discount sign line / 折扣线双签"` 混排）｜发现：2026-11-27｜状态：调查中

## 症状

1. 真实模型（CFO）调用 `request_signoff` 挂起审批时（`30-phase3-signoff-card-zh.png`），由于 `signoff-tool.ts` 描述示例与模型输出，模型传入了中英混排 `args.line`（`discount sign line / 折扣线双签`）及长段自由文本，界面直接按启发式括号分段切出「决策事项」与「备选对比/补充」；同时 `SignoffComposerCard` 自身只读 `matched.reason`，完全丢弃了 `matched.displayReason`（`{ en, zh }`）跨语选择入口；
2. 同时对话流最末端的 `SignoffToolView` 已经渲染了一模一样的「高管红线双签请求 / 待拍板 / 签字红线 / 决策事项 / 备选对比」卡片，紧贴在底部 `SignoffComposerCard` 上方几像素处，两张几乎同构的大卡片同屏叠放占满半个聊天区高度。

## 运行面

- **面 = client + host**：[register-s1-ux.ts](../../packages/company-pack/src/client/ux/register-s1-ux.ts#L90-L99)（未注入 `resolveReason` / `ctx.locale.resolveText`）、[signoff-card.tsx](../../packages/company-pack/src/client/ux/signoff-card.tsx#L133)（只读 `parseSignoffReason(matched.reason)`）、对照 [signoff-tool.ts](../../packages/company-pack/src/host/commands/signoff-tool.ts#L25)（工具参数示例含中英双语）与 [第 57-61 行](../../packages/company-pack/src/host/commands/signoff-tool.ts#L57-L61)（已构造 `{ reason, displayReason: { en, zh } }`）及上游 [ApprovalPanel.tsx](../../vendor/dsh/packages/client/ui-approval/src/client/ApprovalPanel.tsx#L17)（消费 `props.resolveReason(displayReason)`）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase3-live-ux.mjs
```

实测截图：`runtime/tmp/ux-audit/out/shots/30-phase3-signoff-card-zh.png`（可见流尾工具卡与底部双签卡同屏双份展示完整文本，且 `签字红线` 带中英斜杠混排）。

## 根因与证据

1. [signoff-card.tsx](../../packages/company-pack/src/client/ux/signoff-card.tsx#L133) 只读了 `matched.reason`，未在 `register-s1-ux.ts` 注入 `ctx.locale.resolveText` 或消费 `matched.displayReason`；因此 Host 侧通过 `signoff-tool.ts` 发来的 `{ en, zh }` 本地化摘要在 S1 接管路径中被丢弃。
2. 对照 `SignoffToolView`（流内已展示全量上下文），底部 `SignoffComposerCard` 仍展开全字段段落（而非聚焦决策摘要与操作动作）。

## 期望判据

- `SignoffComposerCard` 优先解析并展示当前语言对应的 `matched.displayReason`（若缺失再回退 `matched.reason`），绝不丢弃 Host 已本地化的结构化双签信息；
- 在流尾已有 `SignoffToolView` 展示长依据时，决策输入卡保持精炼紧凑（决策摘要 + 审批后果 + 操作键）以免同屏双份大段文字挤占视口。
