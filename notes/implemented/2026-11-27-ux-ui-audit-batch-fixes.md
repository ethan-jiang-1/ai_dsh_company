状态：implemented（2026-11-27）；批准：用户 2026-11-27 指令「系统性组织并全部修复 _backlog/bugs」｜上游 = [BUG-384](../../_backlog/_archive/fixed_bugs/BUG-384-hq-cultivation-workshop-infinite-session-create-loop.md)、[BUG-385](../../_backlog/_archive/fixed_bugs/BUG-385-hq-cultivation-board-ignores-locale-stays-chinese-in-en.md)

# BUG-384..391 批次收口：HQ 状态锁定、响应式护栏、跨源审批去重与表达层收口

## 决定

1. **HQ 主会话锁定与培养语言显式同步（[BUG-384](../../_backlog/_archive/fixed_bugs/BUG-384-hq-cultivation-workshop-infinite-session-create-loop.md) / [BUG-385](../../_backlog/_archive/fixed_bugs/BUG-385-hq-cultivation-board-ignores-locale-stays-chinese-in-en.md)）**：
   - `CompanyHqPage` 通过 `readKnownCultivationIds`（扫描 `localStorage` `dsh-company-hq-cultivation:*` 前缀并合并内存 `createdCultivationIdsRef`）排除已知培养会话，并由 `pickPrimarySession` 优先选 `mainView` 会话、其次保持已锚定的 `pinnedSessionIdRef`，确保新建培养会话即使以最新 `updatedAt` 排到 `sessions` 首位也绝不反推覆盖 `mainSessionId`；`HqCultivationWorkshop` 创建会话后立刻回调 `onCultivationSessionCreated` 并写入 `storageKey`，且对已知培养会话直接 `open` 不再套娃创建；
   - `CultivationBoardProps` 新增可选 `language?: 'zh' | 'en'` prop，并在 `CultivationBoard` 入口同步 `setCultivationLanguage(language)`，`HqCultivationWorkshop`、`CultivationTab`、`CultivationView` 三处宿主统一透传，消除“直开 HQ 培养工坊时模块语言未切换导致整块面板滞留中文”的隐式耦合。

## 输掉的方案

- **只靠 `origin` 或会话标题过滤培养会话（384）**：DSH `sessions.create({ cwd, agentPreset })` 创建的是常规顶层会话，没有独立 `origin: 'cultivation'` 字段，且会话标题可随首条消息或用户改名变化；基于 `localStorage` 前缀键集合 + 内存创建登记表 + `pinnedSessionIdRef` 锚定才与平台 `sessions` 契约一致且不碰 `vendor/dsh/`。
- **只在 `HqCultivationWorkshop` 补一行 `setCultivationLanguage()` 而不改 `CultivationBoard`（385）**：三处宿主各自维护一行副作用调用容易在新容器上线时再次漏掉；在 `CultivationBoard` 加显式 `language` prop 并在三处宿主同步透传，既保持向后兼容，又把语言同步收敛到共享组件边界。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| HQ 主会话锚定与培养会话排除 | [`pickPrimarySession`](../../packages/company-pack/src/client/ux/company-hq.tsx) | `CompanyHqPage` 读取、`onCultivationSessionCreated` + `dsh-company-hq-cultivation:*` 写入 |
| 培养板语言同步 | [`CultivationBoard`](../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx) | `HqCultivationWorkshop` / `CultivationTab` / `CultivationView` 透传 `language` |

## 验证（真跑过）

- **组 1（384/385）**：`pnpm test tests/client/ux/company-hq.spec.ts` —— 还原 `pickPrimarySession` 与 `language` 同步前 2 failed（`create` 被调用 6 次陷入死循环；en 界面仍输出「我的分身」）；修复后 7/7 passed，联动 `pnpm test tests/client/cultivation/` 184/184 passed、`pnpm typecheck` 与 `pnpm lint`（`company-static-audit: scanned=160 violations=0`）全绿。

## 未覆盖轴

- [covered] HQ 培养创建防反跳（模拟新会话 `updatedAt` 跃居首位）与英文直开 HQ 培养板零 CJK 渲染 → 去向：[company-hq.spec.ts](../../tests/client/ux/company-hq.spec.ts)
- [environment-gap] 真 Chromium 与真实 `company` profile 挂载下的 HQ 培养工坊完整端到端复测将在本批次收口阶段统一重建 `lib/client.js` 并运行 `ui-scene` / `client-load` / `phase2-audit` → 去向：[client-load.entry.mjs](../../checks/lanes/client-load.entry.mjs)
