---
status: 调查中
severity: P2
opened: 2026-11-27
---

# BUG-390：多处用户可见面板漏出原始代码标识与错误本地化时制（company-roles / lead / request_signoff / session- / AM·PM）

> 严重级别：P2（四处高频交互界面直接向中文用户暴露内部英文标识符、固定前缀截断残片或系统默认 12 小时 AM/PM 时钟，影响可理解性与身份一致性）｜发现：2026-11-27｜状态：调查中

## 症状

1. **@ 触发器分组标题**：输入 `@` 弹出的补全菜单第二组标题直接显示字面量 **`company-roles`**（`02-zh-at-mention.png`，上方第一组已正确显示「文件与文件夹」）；
2. **任务板与协作动态角色名**：`作战板 → 任务板` 顶行成员列显示 **`lead(待命)`**（`06-zh-ops-tasks.png`），`团队 → 在场 → 协作动态` 显示 **`lead 上线`**（`09-zh-team-presence-aside.png`），而旁边的「在场」表格已规范显示 `CEO · 首席执行官 Lead`；
3. **HQ 与待办回退会话标签 `session-`**：HQ「总部总览 → 公司会话」列表里所有会话标签统统只显示 **`session-`**（`17-zh-hq-overview.png`，无任何可区分的字符）；
4. **待办列表工具名与时制**：`团队 → 待办` 待批行直接把原始工具名 **`request_signoff:`** 拼进中文条目（`08-zh-team-attention.png`、`32-phase3-live-req-command.png`），时间戳在中文界面渲染成 **`11:46 PM`**（12 小时英文制）。

## 运行面

- **面 = client + lib**：
  - `@` 分组头：[company-triggers-shortcuts.ts](../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts#L90-L95) 设 `name: 'company-roles'` 与 `showGroupTitle: true`，上游 [MenuView.tsx](../../vendor/dsh/packages/client/ui-input-trigger/src/client/MenuView.tsx#L141-L146) 用它查内置词典未命中后原样吐出；
  - `lead` 标签：[company-tabs.tsx](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L266) 用 `roleText(name, 'label', props.t, name)`（`ROLE_COPY` 只有 `'ceo'` 无 `'lead'`）而非 `presenceRoleText`；协作动态由 [presence.ts](../../packages/company-pack/src/lib/presence/presence.ts#L341) 硬编码 `displayNameFor(member.name, 'teammate')` 经 `use-company-data.ts` 与 `company-panels.tsx` 渲染出 `lead 上线`；
  - `session-` 切片：[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx#L413) 与 [AttentionTab.tsx](../../packages/company-pack/src/client/tabs/AttentionTab.tsx#L204) 均写 `id.slice(0, 8)`（而 DSH 会话 ID 前 8 字符恒为 `'session-'`）；
  - `request_signoff:` 与时制：[attention.ts](../../packages/company-pack/src/lib/presence/attention.ts#L140-L144) 把原始 `${toolName}` 拼进 `what`/`whatToken` 并经 [AttentionTab.tsx](../../packages/company-pack/src/client/tabs/AttentionTab.tsx#L105) 直接拼入条目；[AttentionTab.tsx](../../packages/company-pack/src/client/tabs/AttentionTab.tsx#L75) 调用 `toLocaleTimeString([])` 使用系统环境语言而非公司 `t('meta.language')`。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs
```

实测输出与截图：`D1_at_mention_localized_header FAIL (rawSectionHeader=true)`、`B5_tasks_lead_label FAIL (hasRawLead=true)`，截图 `02-zh-at-mention.png`、`06-zh-ops-tasks.png`、`08-zh-team-attention.png`、`09-zh-team-presence-aside.png`、`17-zh-hq-overview.png`。

## 根因与证据

四处共同违反「表达层/内部标识符隔离」纪律：直接把代码键名（`'company-roles'`、`'lead'`、`'request_signoff'`、`'session-'` 常量前缀）和宿主默认 locale 暴露在 UI 渲染层。

## 期望判据

- `@` 菜单分组头经由候选项 `section` 或本地化标签渲染为「公司角色」/「Company Roles」；
- `TasksTab` / `Presence` 协作动态统一走 `presenceRoleText` / `roleTextForCanonical('lead' → CEO)`；
- 会话短 ID 剥离 `session-` 前缀后再截短（如 `id.replace(/^session-/, '').slice(0, 8)`）；
- `request_signoff` 等内置公司工具在待办摘要中映射为本地化人类名称，时间格式化传入与当前公司语言一致的 locale。
