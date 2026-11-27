---
status: 调查中
severity: P2
opened: 2026-11-27
---

# BUG-397：实时切语培养报错滞留与残留未本地化标识（`DelegationFlowPanel` 裸 `preset`/`subagent`、`DeliverablesTab` `UTC`、在场 `session-`、`tasks.col.owner`）

> 严重级别：P2（双语与表达层一致性缺陷：热切语言时培养模块已写入组件 state 的校验/报错文本保留旧语言；多处界面仍暴露内部英文标识符、未翻译字典项及固定 `UTC` 后缀）｜发现：2026-11-27｜状态：调查中

## 症状

1. **实时切换语言后培养报错文本滞留**（复现用例 `R2`）：在中文态点击培养「拒绝 → 确认拒绝（空理由）」生成报错 `拒绝要留一句理由（会留档给提出者）。`，随后将 `language` 切换为 `'en'`，同一卡片的 `Needs me`、`Confirm rejection`、`Cancel` 已翻为英文，但报错文字仍卡在中文 `拒绝要留一句理由（会留档给提出者）。`（`CultivationBoardSections`、`CultivationCompose` 状态同理，且全局代理 `setCultivationLanguage` 在多语言重渲染间存在竞态）；
2. **`DelegationFlowPanel` 暴露原始 `preset` 与 `mode`**（真实深色 Chromium 截图 `runtime/tmp/ux-audit-r2/out/shots/r2p2-04-dark-dag-1440.png`）：中文界面「委派流程」列表标签直接印出原始内部值 **`ceo`**、**`subagent`**（及 **`continuable` / `one-shot`**），未使用 `roleText` 与双语 `mode` 映射；
3. **其余同类残余泄漏**：
   - `openMemberAside`（真实 Chromium 截图 `r2-04-live-toggle-en.png`）：打开已停止的子代理旁路窗格时标签页/标题仍显示截断原始 ID **`session-fff`**；
   - [DeliverablesTab.tsx](../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx#L124-L127)：`formatGeneratedAt` 固定硬编码 `'YYYY-MM-DD HH:mm UTC'` 而不随 `zh`/`en` 本地化时制与本地展示习惯；
   - [locales.ts](../../packages/company-pack/src/client/locales.ts#L142)：中文词典将任务板第四列表头 `'tasks.col.owner'` 保留为全小写英文 **`'owner'`**（紧邻「任务」「依赖」「状态」）；
   - [CultivationInbox.tsx](../../packages/company-pack/src/client/cultivation/CultivationInbox.tsx#L118)：背景卡片副标 `background.role` 未经 `roleLabel(...)` 转换直接拼出原始角色 ID。

## 运行面

- **面 = client + lib**：
  - [cultivation-copy.ts](../../packages/company-pack/src/client/cultivation/cultivation-copy.ts#L575-L585) / [use-cultivation-board.tsx](../../packages/company-pack/src/client/cultivation/use-cultivation-board.tsx#L60-L78) / [CultivationCompose.tsx](../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx#L95-L100)；
  - [DelegationFlowPanel.tsx](../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx#L59-L60)；
  - [DeliverablesTab.tsx](../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx#L124-L127)；
  - [locales.ts](../../packages/company-pack/src/client/locales.ts#L142) 与 [CultivationInbox.tsx](../../packages/company-pack/src/client/cultivation/CultivationInbox.tsx#L118)。

## 复现

```sh
pnpm vitest run --config runtime/tmp/ux-audit-r2/vitest.tmp.config.ts
bash -c 'source run/env.sh && node runtime/tmp/ux-audit-r2/round2-part2-audit.mjs'
```

- 白盒用例 `R2` 实测混排输出：`"Confirm rejection Cancel 拒绝要留一句理由（会留档给提出者）。"`；
- Chromium 实测截图：`r2p2-04-dark-dag-1440.png`（可见 `满图 CEO ceo d0 完成` / `company-workspace subagent d1`）、`r2-04-live-toggle-en.png`（可见 `session-fff`）。

## 根因与证据

1. 培养 UI 错误状态直接存储翻译后的终态字符串，而非保存错误码/结构化参数在渲染期按当前 `t`/语言动态解析；
2. [DelegationFlowPanel.tsx](../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx#L59-L60) 与 [CultivationInbox.tsx](../../packages/company-pack/src/client/cultivation/CultivationInbox.tsx#L118) 直接插值原始内部字段 `node.preset`/`node.mode`/`background.role`；
3. [locales.ts](../../packages/company-pack/src/client/locales.ts#L142) 中文词典 `'tasks.col.owner'` 漏译；`DeliverablesTab.tsx#L126` 固定拼接 `'UTC'`；`instance-guard.ts` 仅依赖 10 秒轮询而未监听 `locale/change`。

## 失败类与同类排查

- **失败类**：翻译过早冻结在 React state 中 + 二级小众展示标签漏走字典表。
- **同类排查**：`PresenceTab`、`TasksTableView` 与 `AttentionTab` 经 `BUG-390` 已接 `roleText`/`shortSessionId`，但 `DelegationFlowPanel`、`CultivationInbox` 与中文字典 `tasks.col.owner` 当时未一并纳入。

## 已修判定

- 培养模块错误态改为存 token/原因码并在渲染时解析，热切语言无中文/英文混合残余；
- `DelegationFlowPanel`（`preset` & `mode`）、`CultivationInbox` 背景角色名、`tasks.col.owner` 与 `instance-guard`（监听 `locale/change`）全部本地化且统一收口。
