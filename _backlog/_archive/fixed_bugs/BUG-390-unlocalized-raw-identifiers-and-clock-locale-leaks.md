---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-390：多处用户可见面板漏出原始代码标识与错误本地化时制（company-roles / lead / request_signoff / session- / AM·PM）

> 严重级别：P2（四处高频交互界面直接向中文用户暴露内部英文标识符、固定前缀截断残片或系统默认 12 小时 AM/PM 时钟，影响可理解性与身份一致性）｜发现：2026-11-27｜状态：已修｜审查：agent — 待批次独立只读盲审收口
>
> **留痕**：Note [2026-11-27-ux-ui-audit-batch-fixes](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md)（批次 384..391：表达层本地化、角色映射、短会话 ID 与 24h 时钟统一）

## 症状

1. **@ 触发器分组标题**：输入 `@` 弹出的补全菜单第二组标题直接显示字面量 **`company-roles`**（`02-zh-at-mention.png`，上方第一组已正确显示「文件与文件夹」）；
2. **任务板与协作动态角色名**：`作战板 → 任务板` 顶行成员列显示 **`lead(待命)`**（`06-zh-ops-tasks.png`），`团队 → 在场 → 协作动态` 显示 **`lead 上线`**（`09-zh-team-presence-aside.png`），而旁边的「在场」表格已规范显示 `CEO · 首席执行官 | Lead`；
3. **HQ 与待办回退会话标签 `session-`**：HQ「总部总览 → 公司会话」列表里所有会话标签统统只显示 **`session-`**（`17-zh-hq-overview.png`，无任何可区分的字符）；
4. **待办列表工具名与时制**：`团队 → 待办` 待批行直接把原始工具名 **`request_signoff:`** 拼进中文条目（`08-zh-team-attention.png`、`32-phase3-live-req-command.png`），时间戳在中文界面渲染成 **`11:46 PM`**（12 小时英文制）。

## 运行面

- **面 = client + lib**：
  - 共享短会话 ID：[text.ts](../../../packages/company-pack/src/lib/shared/text.ts)（新增 `shortSessionId`，剥离 `session-` 前缀后再截 8 位）；
  - `@` 分组头：[locales.ts](../../../packages/company-pack/src/client/locales.ts)（`trigger.companyRoles`）与 [company-triggers-shortcuts.ts](../../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts)（透传 `section`）；
  - `lead` 标签：[roles.ts](../../../packages/company-pack/src/client/roles.ts)（`memberRoleText`）、[company-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-tabs.tsx)（`TasksTab`）与 [presence.ts](../../../packages/company-pack/src/lib/presence/presence.ts)（`presenceFromEvents` 的 `lead` 上线与 `displayOf`）；
  - `request_signoff`、HQ 总览与时制：[AttentionTab.tsx](../../../packages/company-pack/src/client/tabs/AttentionTab.tsx)（`attention.tool.requestSignoff`、`shortSessionId`、`zh-CN` 24h / `en-US` 时钟）、[company-hq.tsx](../../../packages/company-pack/src/client/ux/company-hq.tsx)（总览会话与待办本地化）与 [StrategyPanel.tsx](../../../packages/company-pack/src/client/startup/StrategyPanel.tsx)（`formatCheckedAt` 时区格式对齐）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs
```

实测输出与截图：`D1_at_mention_localized_header FAIL (rawSectionHeader=true)`、`B5_tasks_lead_label FAIL (hasRawLead=true)`，截图 `02-zh-at-mention.png`、`06-zh-ops-tasks.png`、`08-zh-team-attention.png`、`09-zh-team-presence-aside.png`、`17-zh-hq-overview.png`。

## 根因与证据

四处共同违反「表达层/内部标识符隔离」纪律：直接把代码键名（`'company-roles'`、`'lead'`、`'request_signoff'`、`'session-'` 常量前缀）和宿主默认 locale 暴露在 UI 渲染层。

## 失败类与同类排查

- **失败类**：代码内部标识符与固定前缀透穿表达式 UI；`toLocaleTimeString([])` / `toLocaleString(undefined)` 依赖宿主系统环境变量而非应用内选定语言。
- **同类排查**：同步检查 `BoardTab`/`DagTab` 已走 `roleTextForCanonical`、`PresenceTab` 已走 `presenceRoleText`、`DeliverablesTab` 已走稳定 UTC `formatGeneratedAt`、`CultivationTab` 已走 `timeParts` + `cultivationTimeLabel`，均无同类裸标识或宿主 locale 漂移。

## 已修判定

- `@` 角色候选项统一携带 `section: t('trigger.companyRoles')`（中文「公司角色」、英文 `Company Roles`），由上游 `MenuView` 替代原始 `'company-roles'`；
- `TasksTab` 通过 `memberRoleText` 与 `presenceFromEvents`（`member.name === 'lead' || member.id === teamId`）均将 `'lead'` 规范映射为 CEO，不再出现 `'lead('` 或 `'lead 上线'`；
- `shortSessionId` 统一剥离 `'session-'` 前缀后取前 8 位，`CompanyHqPage` 与 `AttentionTab` 全部复用；HQ 总览待办卡片复用 `ATTENTION_KEYS` 与 `formatAttentionWhat`；`request_signoff` 映射为「高管双签 / Executive signoff」；`AttentionTab.formatWhen` 与 `StrategyPanel.formatCheckedAt` 按 `t('meta.language')` 显式使用 `zh-CN` 24 小时制（`hour12: false`）或 `en-US`。

## 修复证据

- 改动面：`packages/company-pack/src/lib/shared/text.ts`、`packages/company-pack/src/client/locales.ts`、`packages/company-pack/src/client/ux/company-triggers-shortcuts.ts`、`packages/company-pack/src/client/roles.ts`、`packages/company-pack/src/client/tabs/company-tabs.tsx`、`packages/company-pack/src/lib/presence/presence.ts`、`packages/company-pack/src/client/tabs/AttentionTab.tsx`、`packages/company-pack/src/client/ux/company-hq.tsx`、`packages/company-pack/src/client/startup/StrategyPanel.tsx`、`tests/client/ux/company-triggers-shortcuts.spec.ts`、`tests/client/tabs/company-tabs-body.spec.ts`、`tests/lib/presence/presence-board.spec.ts`、`tests/client/ux/company-hq.spec.ts`、`tests/client/tabs/attention-tab.spec.ts`
- 红：`pnpm test tests/client/ux/company-triggers-shortcuts.spec.ts tests/client/tabs/company-tabs-body.spec.ts tests/lib/presence/presence-board.spec.ts tests/client/ux/company-hq.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 修复前 5 failed（缺 `section`、TasksTab 现 `lead(未知)`、动态流现 `lead 上线`、HQ 现 `session-/approval/request_signoff:`、待办漏 `request_signoff:`）
- 绿：`pnpm test tests/client/ux/company-triggers-shortcuts.spec.ts tests/client/tabs/company-tabs-body.spec.ts tests/lib/presence/presence-board.spec.ts tests/client/ux/company-hq.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 5 文件与联动 `tests/lib/presence/`、`tests/client/i18n/` 共 17 文件 158/158 passed
- 提交：commit 11764dd1
