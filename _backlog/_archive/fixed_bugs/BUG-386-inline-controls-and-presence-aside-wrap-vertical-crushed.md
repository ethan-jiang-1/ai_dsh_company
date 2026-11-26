---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-386：内嵌操作条与在场「旁路查看」按钮缺少不换行约束，在分栏/中窄屏被压成单字竖条

> 严重级别：P1（多处高频控制面视觉与可用性受损：`ComposerStatusPill`、`AssistantCultivateAction`、`DeliverableFinalDocActions` 与 `PresenceTab`「旁路查看」按钮在分栏或 1024px 视口被挤压折成单字竖排甚至裁切，同时 `Presence` 表头与分身行列表列不对齐）｜发现：2026-11-27｜状态：已修｜审查：agent（`7ad5c423` 独立只读盲审通过，0 阻断）
>
> **留痕**：Note [2026-11-27-ux-ui-audit-batch-fixes](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md)（批次 384..391：内嵌不换行护栏与在场列对齐）

## 症状

1. **输入底脚 `ComposerStatusPill`**：在活跃会话与右侧分栏（如 `32-phase3-live-req-command.png`、`33-phase3-real-subagent-aside.png`、`presence-panel/desktop.png`）被压折为 `"角色：\nCEO"`，在旁路 `subagentchat` 窄窗格甚至裁切成 `"角\n色：\nCEO"`；
2. **消息工具条 `AssistantCultivateAction`**：在 `1024×768`（`21-zh-1024x768.png`）与多控件同列时（`deliverables-catalog/desktop.png`）产生孤立单字换行 `"纠正 / 沉淀方\n法"`；
3. **文档预览头部 `DeliverableFinalDocActions`**：打开 `final.md` 并排分栏时（`10-zh-final-doc-actions.png`），两颗按钮（字典 [locales.ts](../../../packages/company-pack/src/client/locales.ts#L413-L415) 原文为「核对草稿」与「发起复盘培养」）被窄栏压折为单字竖列并在左缘裁掉首字，仅露出 `"对\n草\n稿"`、`"复\n盘\n培\n养"`；
4. **在场板「旁路查看」与表头对齐**：右栏处于双窗分栏时（`09-zh-team-presence-aside.png`），`[data-presence-aside]` 宽度被挤到 `32.5px` 竖排 `"旁\n路\n查\n看"`，表头 `"当前任务"` 被挤成 `"当\n前\n任\n务"` 且与下方带旁路按钮的 teammate 行列边界错位。

## 运行面

- **面 = client**：[styles.ts](../../../packages/company-pack/src/client/ui/styles.ts)（五处内嵌 slot 包装类与子按钮补齐 `flex-shrink: 0; white-space: nowrap;`，`.wk-row-wrap` 内 `.wk-row-button` 去掉 `width: 100%` 并补 `min-width: 0`，新增 `.wk-row-aside-cell` 固定列宽与 `[data-presence-aside]` 不换行）及 [company-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-tabs.tsx)（`PresenceTab` 在表头与每行补齐 `.wk-row-aside-cell`）。

## 复现

```sh
pnpm test tests/client/ui/client-css.spec.ts tests/client/tabs/company-tabs-body.spec.ts
```

真浏览器原发现命令：`source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs`（实测 `09-zh-team-presence-aside.png` `splitBtn.width = 32.5px` 竖排四行）。

## 根因与证据

1. [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts) 原仅声明 `display: inline-flex; align-items: center; gap: 6px;`，未固定 `flex-shrink: 0` 与 `white-space: nowrap`；当父容器宽度收窄时，浏览器优先压缩该 span 内部 `<Button>` / `<Pill>` 文本。
2. [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts) 中 `.wk-row-wrap` 是 `flex`，子项 `.wk-row-button` 写了 `width: 100%` 且缺 `min-width: 0`，同级的 `[data-presence-aside]` 按钮未加 `flex: 0 0 auto; white-space: nowrap;`，且表头与 Lead 行缺少末尾占位列，导致列线错位、旁路按钮被压至单汉字宽度。

## 失败类与同类排查

- **失败类**：弹性容器内嵌动作按钮缺 `flex-shrink: 0; white-space: nowrap;` 与可压缩主体缺 `min-width: 0`。
- **同类排查**：同步检查 `.wk-pane-head > button`（已有 `flex: none; white-space: nowrap;`）、`.wk-turn-tail-actions`、`.wk-doc-actions`（加 `flex-wrap: wrap` 整颗按钮换行），均无同类单字竖折。

## 已修判定

- 5 个内嵌 slot 包装类及其子按钮与 `[data-presence-aside]` 均声明 `white-space: nowrap` 与 `flex-shrink: 0`（`.wk-row-button` 具备 `min-width: 0` 且无 `width: 100%`）；
- `PresenceTab` 开启 `openMemberAside` 时，表头、Lead 行与 Teammate 行全部包含 `.wk-row-aside-cell` 对齐列。

## 修复证据

- 改动面：`packages/company-pack/src/client/ui/styles.ts`、`packages/company-pack/src/client/tabs/company-tabs.tsx`、`tests/client/ui/client-css.spec.ts`、`tests/client/tabs/company-tabs-body.spec.ts`
- 红：`pnpm test tests/client/ui/client-css.spec.ts tests/client/tabs/company-tabs-body.spec.ts` —— 修复前 2 failed（CSS 缺 nowrap/min-width；PresenceTab 表头缺 `.wk-row-aside-cell`）
- 绿：`pnpm test tests/client/ui/client-css.spec.ts tests/client/tabs/company-tabs-body.spec.ts` —— 13/13 passed（CSS 护栏与在场列对齐用例全绿）
- 提交：commit abec0ad5
