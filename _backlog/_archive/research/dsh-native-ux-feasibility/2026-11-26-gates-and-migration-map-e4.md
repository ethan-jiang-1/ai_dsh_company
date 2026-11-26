---
topic: dsh-native-ux-feasibility
intent: Audit all gates, keyless specs, browser probes, golden files, and coverage ratchets coupled to the current UI, and map them to a 4-wave incremental migration plan (S1–S4).
---

# E4 门禁、单测、Golden 与渐进迁移影响图谱

> 本材料记录 E4 静态盘点结论：逐一核对现有 `checks/`、`tests/`、`probes/`、`snapshots/` 与 `packages/company-pack` 现状 UI 的硬耦合点，并将整个改造拆为可独立验收、互不阻塞的 S1–S4 四波迁移路径。

## 1. 耦合资产清单（按改动波次受影响程度分级）

### A. 结构门禁与 Golden 快照

| 资产路径 | 检查/解析对象 | 何时会红 | 解耦 / 同步方式 | 涉及波次 |
|---|---|---|---|---|
| `checks/gates/ui-expected-freshness.mjs` | 校对 `tools/lib/probe/company-tab-catalog.mjs` 提取的目录与 `snapshots/visual/company-shell/ui.expected.json` 是否一致 | 右栏 `sidebar.right.tabs` 清单、标题文案或图标变动但未刷新 golden | 仅当 S2 收编右栏 Tab 时运行 `node checks/lanes/ui-scene.entry.mjs --isolated --refresh-expected` 同步 golden | S2 |
| `checks/lib/ui-expected.mjs` & `tools/lib/probe/company-tab-catalog.mjs` | 用 `TAB_ROW` / `FACE_ROW` 正则静态提取 `company-tab-registration.ts`、`tab-icons.tsx`、`locales.ts` | 修改 `company-tab-registration.ts` 的注册结构导致正则解析漏配/错配 | 保持 `TAB_ROW` / `FACE_ROW` 静态可解析形状，或同步调整 `company-tab-catalog.mjs` 正则与单元测试 | S2 |
| `.agents/skills/company-ui-change-definition/SKILL.md`（完成定义 + 双语字典要求） | 要求所有用户可见 UI 字符串同时提供 `zh` 与 `en`（默认 `zh`），经由公司字典而非硬编码字面量 | 新增任何无 `locales.ts` 词典键的中/英文硬编码文案 | 所有 S1–S4 新增槽位与面板一律通过 `locales.ts` 注册 `zh`/`en` 字典 | S1–S4 |
| `checks/lib/coverage-baseline.json` & `pnpm coverage:ratchet` | 按文件维度卡覆盖率底线 | 新增组件/wiring 未补 `.spec.ts(x)` 或删除旧大文件未更新基线 | 每波新增文件配齐 keyless unit/integration spec；S3 删除旧修炼特化壳层时按实测重算或更新基线说明 | S1–S4 |

### B. 浏览器 / 运行时 Lane 与 Visual Probe

| 资产路径 | 断言内容 | 影响分析 | 同步策略 | 涉及波次 |
|---|---|---|---|---|
| `checks/lanes/ui-scene.entry.mjs` | 启动真实 web 观察窗并比对 `ui.expected.json` | 仅受右栏 Tab 数量/标题/图标变更影响 | S1 零破坏；S2 与 `ui.expected.json` 同提交刷新 | S2 |
| `checks/lanes/client-load.entry.mjs` | 验证浏览器端加载 `dsh-company-pack` 零挂载报错、零 console/runtime error | 若新增 `ctx.inject([...])` 未同步在 `package.json` `dsh.client.inject` 声明对应上游客户端包，将在运行时抛 inject 缺失 | S1–S4 每次新接入 `@deepseek-ai/dsh-client-*` 服务时同步更新 `packages/company-pack/package.json` 的 `dsh.client.inject` 与 `devDependencies` | S1–S4 |
| `probes/browser-visual/cdp-probe.mjs` | 读取 `parseCompanyTabCatalog`，逐个点击右栏 Tab 并断言 `[data-company-tab-title]` 存在 | 右栏 Tab 精简后，只要保留的 Tab 仍带 `[data-company-tab-title]` 且与目录一致即可通过 | S2 确保精简后的 3 个常驻/聚合 Tab 仍渲染 `[data-company-tab-title]` | S2 |
| `probes/browser-visual/attention-panel-probe.mjs` | 针对关注/收件箱面板的视觉探针 | S2 将 `attention` 收编进精简右栏或主区 HQ 时需保持其关键选择器或同步探针 | S2/S3 核对选择器稳定性 | S2, S3 |

### C. Keyless 客户端回归测试 (`tests/client/`)

| 测试文件 | 当前硬编码断言 | 对重构波次的约束 | 迁移动作 | 涉及波次 |
|---|---|---|---|---|
| `tests/client/company-client-composition.spec.ts` | 断言 `COMPANY_TAB_IDS`（当前全部 10 个 Tab ID）与 `COMPANY_SLOTS` 全集，基于真实 `bundleRoster` + `createClientTest` 启动 | S1 新增槽位不改 Tab 数量但可能增加 `COMPANY_SLOTS` 期望或保持扩展断言；S2 精简右栏 Tab 时必须同步更新 `COMPANY_TAB_IDS` | S1 可追加槽位断言；S2 更新 `COMPANY_TAB_IDS`；S3 追加 `main` + `sidebar.panellist` 组合断言 | S1, S2, S3 |
| `tests/client/tabs/company-tab-registration.spec.ts` | 断言 `EXPECTED_TYPES` 枚举当前全部 10 个右栏 Tab | 右栏收敛（10→3 + `sidebar.right.tab.guide` 透传）会使该枚举失效 | S2 同步收敛为目标右栏 Tab 列表，并新增 `sidebar.right.tab.guide` 透传非公司条目的断言 | S2 |
| `tests/client/cultivation/cultivation-view.spec.ts` | 断言 `html[data-dsh-cultivation-view]` 属性切换与 `.wk-cult-chat` 存在 | S3 用全局 `main` + `SessionProvider` + `conversation.content` 替代 DOM 劫持后，该特化 DOM 属性与私有聊天气泡将被清退 | S3 重写为验证 HQ/Cultivation `main` 面板 + `embedded` 会话挂载与零 `html[data-dsh-cultivation-view]` / `[data-composer-seat]` 劫持 | S3 |
| `tests/client/ui/client-css.spec.ts` | 校验所有 `var(--dsw-*)` 存在性（扫描 `vendor/dsh/packages/client/**/*.css`）、禁止 `var(--dsw-*)` 带颜色字面量 fallback、`.wk-node`/`.wk-edge` 动画纯净度、`.wk-role-badge <= 16px` 且 `border-box`、6 角色色 distinct | 天然护栏：`web-styling` 与暗色主题一致性的机器校验已在此处，只需补充对非 `var()` 裸色（如 `#16111f`）、`dockkit` 私有选择器、`[data-composer-seat]` 隐藏规则的禁令 | S4 清理 `styles.ts` 字面量色/字重/`1px` 边框/私有 DOM 穿透，并在 `client-css.spec.ts` 锁定反回归规则 | S3, S4 |

---

## 2. S1–S4 四波渐进迁移地图（Zero-Breakage → 收口退债）

通过实验与静态审计，最稳妥且完全适配 `/goal` 分波落地的顺序如下：

1. **Wave S1（零破坏增量增强，不改 10 Tab 目录）**：
   - 范围：注册 `shell.overlay` 全局 `Toast`、会话活跃期感知的 `conversation.session.header.utilities` / `sidebar.footer.action`、工作区冷启动 `conversation.hero.options` 与 `conversation.input.dock`、`/req` `/prd` `/delivery` 结构的 `conversation.chat.commandview`、`conversation.chat.assistant-actions`、`sidebar.right.tab.document.actions`（交付终稿精准匹配）、以及基于 `tool.call.toolview`（`request_signoff`）+ `conversation.composer` chain（`priority: 0`）的签批卡片（含 Host 侧 `signoffReason` 结构化生成）。
   - 对现有门禁影响：**ZERO breaking**——10 个右栏 Tab、Golden `ui.expected.json`、`company-tab-registration.spec.ts` 全部保持绿灯，新增单元测试覆盖即可通过。

2. **Wave S2（右栏体验收敛：10 Tab → 3 Tab + Guide 透传与快捷调度）**：
   - 范围：实现 `sidebar.right.tab.guide` chain 路由（`priority: 0`，透传保留上游 `files` 等非公司条目，按阶段收敛/切换），将 10 个平铺右栏 Tab 收敛为 3 个高内聚入口（并保留 `documentpreview` 上下文动作与 `sidebarRight.openResource` 多窗格分栏/子代理侧栏能力），新增 `@` 输入触发器（`ctx.inputTriggers.registerSource`）与快捷键目录（`ctx.shortcuts.register`）。
   - 对现有门禁影响：同步更新 `company-tab-catalog.mjs` 解析目录、`company-tab-registration.spec.ts`、`company-client-composition.spec.ts`，并执行 `node checks/lanes/ui-scene.entry.mjs --isolated --refresh-expected` 刷新 `ui.expected.json`。

3. **Wave S3（全球工作台 `main` 面板 + 修炼特化壳层退场）**：
   - 范围：注册 `sidebar.panellist` + `main` 全局「梦之队 HQ」面板（内嵌 `SegmentedControl` 分栏与公司总览/预算/修炼工作台），使用官方 `SessionProvider` + `renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false })` 替代手搓的 `CultivationChatPanel` 聊天列表，彻底删除 `styles.ts` 中 `html[data-dsh-cultivation-view]`、`[data-composer-seat] { display: none }` 与 `height: calc(100dvh - 76px)` 脆弱 CSS 规则。
   - 对现有门禁影响：重写 `tests/client/cultivation/cultivation-view.spec.ts`，更新 `company-client-composition.spec.ts` 的 `COMPANY_SLOTS`，并在 `client-css.spec.ts` 增加禁回规则（禁止 `[data-composer-seat]` 出现在 `styles.ts`）。

4. **Wave S4（原语统一与 `web-styling` / 暗黑模式彻底收口）**：
   - 范围：将自定义控件收敛至 `@deepseek-ai/dsh-client-ui-primitives`（`Button`、`Tag`、`Pill`、`SegmentedControl`、`Toast`、`Dialog`、`Menu`），清理 `styles.ts` 中的硬编码色值（`#16111f`）、越界字重（`600`/`650` → 上限 `500`）、粗边框（`1px` → `0.5px`）及内部 `dockkit` 属性穿透；基于 `conversation.chat.turnTail` / `ctx.uiConversation.events` 补全轮次交付摘要收口条。
   - 对现有门禁影响：扩展 `tests/client/ui/client-css.spec.ts` 校验全量 Token 与样式合规，在 Light + Dark 双主题下跑通 `pnpm typecheck && pnpm test && pnpm verify && pnpm lint && node checks/lanes/client-load.entry.mjs && node checks/lanes/ui-scene.entry.mjs --isolated`。
