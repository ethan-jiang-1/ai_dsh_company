# 2026-11-27 第二轮 UX/UI 缺陷系统性排查与四批修复收口（BUG-392..BUG-398）

状态：implemented（2026-11-27）｜归类：决策记忆｜取代：无｜上游缺陷卡：[BUG-392](../../_backlog/_archive/fixed_bugs/BUG-392-signoff-composer-enter-focus-trap-and-answerable-guard-gaps.md) / [BUG-393](../../_backlog/_archive/fixed_bugs/BUG-393-hq-rightbar-no-surface-crash-and-embedded-workshop-lifecycle.md) / [BUG-394](../../_backlog/_archive/fixed_bugs/BUG-394-cross-session-brand-text-and-startup-abort-state-leaks.md) / [BUG-395](../../_backlog/_archive/fixed_bugs/BUG-395-dag-empty-mount-never-scales-and-deliverables-hidden-filter-trap.md) / [BUG-396](../../_backlog/_archive/fixed_bugs/BUG-396-context-picker-arrow-trap-modal-shortcuts-and-stacked-drag.md) / [BUG-397](../../_backlog/_archive/fixed_bugs/BUG-397-live-locale-lag-in-cultivation-errors-and-remaining-raw-labels.md) / [BUG-398](../../_backlog/_archive/fixed_bugs/BUG-398-contextual-actions-drop-ref-dead-float-save-and-hero-draft-overwrite.md)

## 决定

（自 2026-11-27 起生效）第二轮 UX/UI 7 张活跃缺陷卡（`BUG-392..BUG-398`）按数据安全 → 跨页签生命周期崩溃 → 会话/图形渲染状态泄露 → 键盘无障碍 → 动态语言与动作契约一致性四批集中根治：

1. **批 1（P0 安全与表面切换，提交 `1d9368a1` / 归档 `ec21a7ee`）**
   - **BUG-392**：[signoff-card.tsx](../../packages/company-pack/src/client/ux/signoff-card.tsx) 收紧 `SignoffComposerCard` 键盘决策路径，仅无修饰键的 `Enter`/`Escape` 触发放行/拒绝，避让 `<summary>`、`<a>` 与「拒绝」`<button>`，加入 IME（`isComposing`/`keyCode === 229`/`compositionEnd`）、`event.repeat`、同步锁及 `answerable !== true` 五道护栏。
   - **BUG-393**：抽出一处 [sidebar-right-guard.ts](../../packages/company-pack/src/client/wiring/sidebar-right-guard.ts)（`openOnSessionSurface`）统一由 [register-s1-ux.ts](../../packages/company-pack/src/client/ux/register-s1-ux.ts)、[register-s3-ux.ts](../../packages/company-pack/src/client/ux/register-s3-ux.ts) 与 [context-wiring.ts](../../packages/company-pack/src/client/wiring/context-wiring.ts) 复用，先切回主会话面再等 `sidebarRight.mounted` 就绪，消除 HQ 内点脚手栏或打开原文抛出 `sidebarRight: no session surface is mounted`；[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx) 修复内嵌培养工坊 `retryNonce`/`mainSessionId` 复位并接入 [workshop-sessions.ts](../../packages/company-pack/src/client/ux/workshop-sessions.ts) 以在窄嵌框隐藏顶层指挥带与 Hero 胶囊（并在 `ready` 写入前同步登记避免首帧闪露），同时合并 HQ 历史待办数据源。
2. **批 2（P1 跨盘隔离与图/筛选退化，提交 `e2337ab8` / 归档 `3bf49b85`）**
   - **BUG-394**：[company-identity.ts](../../packages/company-pack/src/client/data/company-identity.ts) 与 [index.ts](../../packages/company-pack/src/client/index.ts) 在切到无身份声明的工作区或读失败时回落出厂词标；[workspace-text.ts](../../packages/company-pack/src/client/data/workspace-text.ts) 在会话变化时重置状态而非保留前盘路径；[startup-handlers.ts](../../packages/company-pack/src/client/startup/startup-handlers.ts) 与 [StrategyPanel.tsx](../../packages/company-pack/src/client/startup/StrategyPanel.tsx) 守卫 `signal.aborted` 并按会话隔离残留报错/草稿。
   - **BUG-395**：[company-panels.tsx](../../packages/company-pack/src/client/tabs/company-panels.tsx) 的 `DagPanel` 按 `hasNodes` 重新挂接 `ResizeObserver` 并以 React `useId()` 隔离 `<marker>`；[DeliverablesTab.tsx](../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx) 在条件筛选（「台账外」/「未 present」）归零隐藏按钮前同步退回 `'all'`，防止视图永久锁死空态。
3. **批 3（P1 键盘无障碍与分栏拖拽，提交 `28e0398d` / 归档 `b9c4f473`）**
   - **BUG-396**：[company-triggers-shortcuts.ts](../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts) 的 `observeFixedInput` 增加原生弹窗 `[role="dialog"]` / `[aria-modal="true"]` 与终端/编辑器焦点守卫；[CultivationContextPicker.tsx](../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx) 区分输入框内光标与列表键盘移动并记录触发源元素，`Escape` 取消后在 [CultivationCompose.tsx](../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx) 归还焦点；[CultivationView.tsx](../../packages/company-pack/src/client/cultivation/CultivationView.tsx) 与 [styles.ts](../../packages/company-pack/src/client/ui/styles.ts) 为窄屏垂直堆叠分割线支持 `ArrowUp`/`ArrowDown`、纵向拖拽及 `blur`/`pointercancel` 清理。
4. **批 4（P2 双语响应与动作闭环，提交 `bec52daf` / 归档 `528c60c1`）**
   - **BUG-397**：[cultivation-actions.ts](../../packages/company-pack/src/client/cultivation/cultivation-actions.ts)、[CultivationCompose.tsx](../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx)、[use-cultivation-board.tsx](../../packages/company-pack/src/client/cultivation/use-cultivation-board.tsx) 与 [CultivationInbox.tsx](../../packages/company-pack/src/client/cultivation/CultivationInbox.tsx) 改存结构化 `DraftProblem.code` 并在渲染期按当前语言解析；[CultivationBoardSections.tsx](../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx)、[DelegationFlowPanel.tsx](../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx)、[delegation-tree.ts](../../packages/company-pack/src/lib/delegation/delegation-tree.ts)、[DeliverablesTab.tsx](../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx)、[ui-expected.mjs](../../checks/lib/ui-expected.mjs)（`（世界时）` 归一化）、[locales.ts](../../packages/company-pack/src/client/locales.ts) 与 [instance-guard.ts](../../packages/company-pack/src/client/wiring/instance-guard.ts) 完成全部原始角色名、表头、世界时后缀、短会话 ID 本地化及 `locale/change` 即时重译。
   - **BUG-398**：新增 [compose-intent-store.ts](../../packages/company-pack/src/client/cultivation/compose-intent-store.ts) 与 [deliverables-focus-store.ts](../../packages/company-pack/src/client/tabs/deliverables-focus-store.ts) 贯通「附带上下文起草培养」（含 `extractDeliverableRelativePath` 将终稿绝对路径安全归一为工作区相对路径以通过 `encodeContextToken` 提交）与「核对草稿定位成品」两条跨面板意图通道；移除 `panel.floatTitle` 从未实现的虚构位置记忆承诺；Hero/CommandDock（[ambient-chrome.tsx](../../packages/company-pack/src/client/ux/ambient-chrome.tsx)）在插入模板/前缀前保留非空已有草稿（并在后续提交 `71dd1a46`、`1e263bda` 及盲审收敛补齐 hook lint 与 240 文件覆盖率棘轮）。

## 输掉的方案

- **只修单个点击入口（如仅改 footer）而不是统一 `openOnSessionSurface` 守卫**：会遗漏 HQ 培养工坊「打开文件」与成员上下文打开等兄弟入口，且各自复制切屏逻辑违背去重纪律。
- **在 `cultivation/` 或 `startup/` 目录引入 `useSyncExternalStore`**：违反仓库 `client-css` 对客户端 React 外部 store 的使用边界；改以局部受控 state + 显式订阅/回调驱动，并通过全部静态审计。
- **保留未实现的「记住浮窗位置」文案而不落盘，或绕过 `coverage-ratchet` 基线**：前者制造虚假 UI 承诺，后者削弱质量防线；实际采取「实落意图通道 + 去假承诺」并补足测试覆盖率至全部超过基线。
- **在收尾提交里顺手修改或暂存并发产生的第三轮审计卡（`BUG-399..BUG-405`）**：跨工作流混批会破坏范围边界与回滚可控性；严格仅按精确路径提交本批文件。

## 状态事实与载体

| 面 | 载体 | 边界 |
|---|---|---|
| 审批防误触 / 表面守卫 | [signoff-card.tsx](../../packages/company-pack/src/client/ux/signoff-card.tsx) / [sidebar-right-guard.ts](../../packages/company-pack/src/client/wiring/sidebar-right-guard.ts) / [workshop-sessions.ts](../../packages/company-pack/src/client/ux/workshop-sessions.ts) | 单一表面切换守卫与无状态判断；零自造路由表 |
| 跨盘隔离 / 图与筛选恢复 | [company-identity.ts](../../packages/company-pack/src/client/data/company-identity.ts) / [workspace-text.ts](../../packages/company-pack/src/client/data/workspace-text.ts) / [company-panels.tsx](../../packages/company-pack/src/client/tabs/company-panels.tsx) / [DeliverablesTab.tsx](../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx) | 状态严格随 `sessionId`/`cwd` 复位；空筛选自动退回全部 |
| 键盘与语言响应 / 意图槽 | [CultivationCompose.tsx](../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx) / [CultivationContextPicker.tsx](../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx) / [compose-intent-store.ts](../../packages/company-pack/src/client/cultivation/compose-intent-store.ts) / [deliverables-focus-store.ts](../../packages/company-pack/src/client/tabs/deliverables-focus-store.ts) | 所有 `zh`/`en` 文案归口 `locales.ts` 与 `cultivation-copy.ts`；结构化错误码渲染期解析；绝对交付路径归一后再入 `encodeContextToken` |
| 门禁 / 测试 / 覆盖映射 | [BUG-COVERAGE.generated.md](../../tests/BUG-COVERAGE.generated.md) / [coverage-baseline.mjs](../../checks/lib/coverage-baseline.mjs) / [company-client-composition.spec.ts](../../tests/client/company-client-composition.spec.ts) | 每个修复对应红→绿单测；0 `vendor/dsh/` 改动 |

## 验证（真跑过）

全部下列命令均在最终代码提交（`79a562d7`）对应的代码版上实跑退出 0（先有 `task-2097` 跑完 build/静态/单测/棘轮，提交 `79a562d7` 后紧接跑完 `smoke:fast`/`test:checks`/5 条无密钥浏览器车道）：

- `node tools/dev/build-client.mjs` → 成功构建 host ESM（`454.53 kB`）与 client CJS（`646.66 kB`），写指纹 `dff45627d3c0…`（入口 [tsdown.config.ts](../../packages/company-pack/tsdown.config.ts)）。
- `node tools/repo/bug-coverage.mjs --write && pnpm typecheck && pnpm lint && pnpm dup && pnpm notes:audit` → `bug-coverage` 写 411 行；包与三个测试 tsconfig 0 错误；`oxlint` 0 警告 0 错误（488 文件）；[company-static-audit.mjs](../../checks/audit/company-static-audit.mjs) `--strict` `scanned=164 violations=0`；`jscpd` 0 克隆（162 文件）；`notes-audit` 0 异常。
- `pnpm verify`（`checks/run-gates.mjs`）→ **ALL PASS**（含 `vendor-pin`、`vendor-clean`、`notes-link`、`fix-evidence`、`guard-red-record` 等全部门禁 0 失败）。
- `pnpm -s exec vitest run --maxWorkers=4 --coverage --coverage.reporter=json-summary --coverage.reportsDirectory=runtime/coverage-ratchet && node checks/audit/coverage-ratchet.mjs --from-existing` → `Test Files 303 passed (303)`、`Tests 2868 passed (2868)`、`coverage-ratchet: PASS（240 文件；基线 2026-11-26；豁免 4 条）`（`packages/company-pack/src/client/index.ts` 由 `86.58/63.63` 升至 `90.75/66.66`，`CultivationCompose.tsx` 由 `91.91/85.21` 升至 `94.28/85.71`）。
- `pnpm smoke:fast && pnpm test:checks` → `smoke:fast: ALL PASS（4 条，1.94s）`；`test:checks` 全绿（含 `company-root-carriers.test.mjs` 8/8 等）。
- 5 条无密钥真实浏览器车道（`source run/env.sh`）：
  - `node checks/lanes/client-load.entry.mjs` → `ALL PASS`（挂载零失败、console 零 loader 错误、品牌槽在场）
  - `node checks/lanes/ui-scene.entry.mjs --isolated --expected` → `ALL PASS`（金样一致 3 个页签，浏览器错误环零命中）
  - `node checks/lanes/ui-scene.entry.mjs --isolated --lang en` → `ALL PASS`（en 页面无中文残留 3 个页签）
  - `node checks/lanes/client-error-chain.entry.mjs` → `ALL PASS`（加载即报错入环 → 会话打开 → host 日志落盘）
  - `node checks/lanes/multi-window-banner.entry.mjs` → `ALL PASS`（同源两页面互见心跳触发横幅）
- `git diff --name-only vendor/dsh` → 输出为空（`vendor/dsh` 零字节改动）。
- 审查：独立只读盲审初审发现 3 项阻断（Note 断链/事实偏差与 BUG-398 `final.md` 绝对路径未归一导致提交被拒），修复并补测至 `79a562d7` 后经独立只读盲审复审确认 **0 阻断通过**（三问全 PASS，`vendor/dsh/` 零改动）。

## 未覆盖轴

- [covered] client 构建产物、TypeScript、oxlint/静态审计、`jscpd` 去重、全量 spec、240 文件覆盖率棘轮、结构门禁（`pnpm verify`）与 5 条无密钥浏览器 E2E 车道 → 去向：[BUG-COVERAGE.generated.md](../../tests/BUG-COVERAGE.generated.md) / [coverage-baseline.mjs](../../checks/lib/coverage-baseline.mjs) / [ui-scene.entry.mjs](../../checks/lanes/ui-scene.entry.mjs)
- [environment-gap] 真实 `DEEPSEEK_API_KEY` 会话下模型现场发起 `request_signoff` 并由用户在 Web UI 端完整流转审批的 live 模型回合未在本批另行触发，双签卡片键盘护栏与渲染契约已由 happy-dom 组件回归测试及 `ui-scene-smoke` 覆盖 → 去向：[signoff-card.spec.ts](../../tests/client/ux/signoff-card.spec.ts) / [client-load.entry.mjs](../../checks/lanes/client-load.entry.mjs)
- [policy] 并发第三轮深审新增的活跃缺陷（[bugs/README.md](../../_backlog/bugs/README.md) 中 `BUG-399..BUG-405`）属于下一修复周期范围，本批次收口刻意未改动、未暂存 → 去向：[bugs/README.md](../../_backlog/bugs/README.md)
