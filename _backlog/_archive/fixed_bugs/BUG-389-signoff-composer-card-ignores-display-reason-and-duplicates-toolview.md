---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-389：SignoffComposerCard 未消费结构化 displayReason 且与流内 SignoffToolView 视觉重复

> 严重级别：P2（Wave S1 双签决策卡 `register-s1-ux.ts` 与 `SignoffComposerCard` 只解析 `matched.reason`，未注入/消费多语 `matched.displayReason` 契约，在跨语言或动态切语下与上游 `ApprovalPanel` 行为分叉；且流尾 `SignoffToolView` 与底部 `SignoffComposerCard` 同屏双份完整平铺造成高度与信息冗余；同时 `args.line` 本身在模型复读 `signoff-tool` 提示示例时会出现 `"discount sign line / 折扣线双签"` 混排）｜发现：2026-11-27｜状态：已修｜审查：agent — 待批次独立只读盲审收口
>
> **留痕**：Note [2026-11-27-ux-ui-audit-batch-fixes](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md)（批次 384..391：双签 `displayReason` 接入、上下文折叠与工具 schema 去混排）

## 症状

1. 真实模型（CFO）调用 `request_signoff` 挂起审批时（`30-phase3-signoff-card-zh.png`），由于 `signoff-tool.ts` 描述示例与模型输出，模型传入了中英混排 `args.line`（`discount sign line / 折扣线双签`）及长段自由文本，界面直接按启发式括号分段切出「决策事项」与「备选对比/补充」；同时 `SignoffComposerCard` 自身只读 `matched.reason`，完全丢弃了 `matched.displayReason`（`{ en, zh }`）跨语选择入口；
2. 同时对话流最末端的 `SignoffToolView` 已经渲染了一模一样的「高管红线双签请求 / 待拍板 / 签字红线 / 决策事项 / 备选对比」卡片，紧贴在底部 `SignoffComposerCard` 上方几像素处，两张几乎同构的大卡片同屏叠放占满半个聊天区高度。

## 运行面

- **面 = client + host**：[register-s1-ux.ts](../../../packages/company-pack/src/client/ux/register-s1-ux.ts#L90-L106)（注入 `resolveReason` 委托 `ctx.locale.resolveText`）、[signoff-card.tsx](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L130-L235)（`resolveSignoffReason` 优先取 `displayReason` 并将 `parsed.detail` 折叠至 `<details data-signoff-detail-toggle>`）、[styles.ts](../../../packages/company-pack/src/client/ui/styles.ts#L894-L905) 与 [signoff-tool.ts](../../../packages/company-pack/src/host/commands/signoff-tool.ts#L22-L26)（参数 `line` schema 去双语斜杠混排示例）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase3-live-ux.mjs
```

实测截图：`runtime/tmp/ux-audit/out/shots/30-phase3-signoff-card-zh.png`（可见流尾工具卡与底部双签卡同屏双份展示完整文本，且 `签字红线` 带中英斜杠混排）。

## 根因与证据

1. [signoff-card.tsx](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L133) 只读了 `matched.reason`，未在 `register-s1-ux.ts` 注入 `ctx.locale.resolveText` 或消费 `matched.displayReason`；因此 Host 侧通过 `signoff-tool.ts` 发来的 `{ en, zh }` 本地化摘要在 S1 接管路径中被丢弃。
2. 对照 `SignoffToolView`（流内已展示全量上下文），底部 `SignoffComposerCard` 仍展开全字段段落（而非聚焦决策摘要与操作动作）。

## 失败类与同类排查

- **失败类**：Chain 接管组件未同步上游槽注入契约（`resolveReason` / `displayReason`）；底部输入替换卡完整展开与流内工具卡同构的补充段落；工具参数 description 含双语斜杠示例诱发模型复读混排。
- **同类排查**：同文件 `SignoffToolView`（流内 L0 工具卡）是全量存档视图，保留展开；非双签审批（如 `bash`）透传给上游 `ApprovalPanel`（已接 `resolveReason`）。

## 已修判定

- `register-s1-ux.ts` 通过 `inject` 传入 `ctx.locale.resolveText` 封装的 `resolveReason`，`SignoffComposerCard` 优先解析 `matched.displayReason`（无 `resolveReason` 时按 `t('meta.language')` 取 `{ zh, en }`）并仅在缺失时回退 `matched.reason`；
- `SignoffComposerCard` 将 `parsed.detail` 收纳入默认折叠的 `<details data-signoff-detail-toggle>`；`registerSignoffTool` 参数 `line` 描述改为纯英文并指明按对话语言书写，无中英 `/` 混排示例。

## 修复证据

- 改动面：`packages/company-pack/src/client/locales.ts`、`packages/company-pack/src/client/ux/register-s1-ux.ts`、`packages/company-pack/src/client/ux/signoff-card.tsx`、`packages/company-pack/src/client/ui/styles.ts`、`packages/company-pack/src/host/commands/signoff-tool.ts`、`tests/client/ux/signoff-card.spec.ts`、`tests/host/commands/signoff-language.spec.ts`
- 红：`pnpm test tests/client/ux/signoff-card.spec.ts tests/host/commands/signoff-language.spec.ts` —— 修复前 2 failed（`SignoffComposerCard` 丢弃 `displayReason` 回落 `stale-raw-reason`；`line.description` 含 `毛利线双签` 与 `' / '`）
- 绿：`pnpm test tests/client/ux/signoff-card.spec.ts tests/host/commands/signoff-language.spec.ts` —— 2 files 10/10 passed（联动 `contextual-actions.spec.ts` 与 `tests/client/i18n/` 共 12 files 52/52 passed）
- 提交：commit fd4efc02
