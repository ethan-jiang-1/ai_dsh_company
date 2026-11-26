---
status: 调查中
severity: P1
opened: 2026-11-27
---

# BUG-386：内嵌操作条与在场「旁路查看」按钮缺少不换行约束，在分栏/中窄屏被压成单字竖条

> 严重级别：P1（多处高频控制面视觉与可用性受损：`ComposerStatusPill`、`AssistantCultivateAction`、`DeliverableFinalDocActions` 与 `PresenceTab`「旁路查看」按钮在分栏或 1024px 视口被挤压折成单字竖排甚至裁切，同时 `Presence` 表头与分身行列表列不对齐）｜发现：2026-11-27｜状态：调查中

## 症状

1. **输入底脚 `ComposerStatusPill`**：在活跃会话与右侧分栏（如 `32-phase3-live-req-command.png`、`33-phase3-real-subagent-aside.png`、`presence-panel/desktop.png`）被压折为 `"角色：\nCEO"`，在旁路 `subagentchat` 窄窗格甚至裁切成 `"角\n色：\nCEO"`；
2. **消息工具条 `AssistantCultivateAction`**：在 `1024×768`（`21-zh-1024x768.png`）与多控件同列时（`deliverables-catalog/desktop.png`）产生孤立单字换行 `"纠正 / 沉淀方\n法"`；
3. **文档预览头部 `DeliverableFinalDocActions`**：打开 `final.md` 并排分栏时（`10-zh-final-doc-actions.png`），两颗按钮（字典 [locales.ts](../../packages/company-pack/src/client/locales.ts#L413-L415) 原文为「核对草稿」与「发起复盘培养」）被窄栏压折为单字竖列并在左缘裁掉首字，仅露出 `"对\n草\n稿"`、`"复\n盘\n培\n养"`；
4. **在场板「旁路查看」与表头对齐**：右栏处于双窗分栏时（`09-zh-team-presence-aside.png`），`[data-presence-aside]` 宽度被挤到 `32.5px` 竖排 `"旁\n路\n查\n看"`，表头 `"当前任务"` 被挤成 `"当\n前\n任\n务"` 且与下方带旁路按钮的 teammate 行列边界错位。

## 运行面

- **面 = client**：[styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L804-L808)（五处内嵌 slot 包装类共同缺少 `white-space: nowrap; flex-shrink: 0;`）、[styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L473-L486)（`.wk-row-wrap` 内 `.wk-row-button` 设 `flex: 1; width: 100%;` 且无 `min-width: 0`，把旁路按钮挤碎）及 [company-tabs.tsx](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L183-L216)（`.wk-row-head` 在 `.wk-row-wrap` 外导致表头与 teammate 行宽不一）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs
```

实测证据：
- `09-zh-team-presence-aside.png`：`splitBtn.width = 32.5px`（单栏时为 `68px`），文字竖排四行；
- `10-zh-final-doc-actions.png`、`21-zh-1024x768.png`、`32-phase3-live-req-command.png`、`33-phase3-real-subagent-aside.png` 均实拍确认折行与竖条。

## 根因与证据

1. [styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L804-L808) 仅声明 `display: inline-flex; align-items: center; gap: 6px;`，未固定 `flex-shrink: 0` 与 `white-space: nowrap`；当父容器（DSH composer bottom bar、chat action row、document preview header）宽度收窄时，浏览器优先压缩该 span 内部 `<Button>` / `<Pill>` 文本。
2. [styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L475-L486) 中 `.wk-row-wrap` 是 `flex`，子项 `.wk-row-button` 写了 `width: 100%` 且缺 `min-width: 0`，同级的 `[data-presence-aside]` 按钮未加 `flex: 0 0 auto; white-space: nowrap;`，导致分栏压缩时旁路按钮被压至单汉字宽度。

## 期望判据

- 5 个内嵌 slot 包装类与 `[data-presence-aside]` 保持单行不折断或按整颗动作控件整体换行，绝不出现单字竖排/孤立换行；
- `在场` 面板表头与所有行（Lead 与带旁路按钮的 Teammate）列线对齐。
