# 客户端静态猎手、满态双语扫面与全 Slot 真挂载（质量预防首批）

状态：implemented（2026-11-23）；批准：用户 2026-11-23「同意按这个落地，记着需要高质量的落地」「……那我们就 set up goal 推动落地吧」（R1/R2/R3 直接设为阻断防线、R4 保留只读基线）。

上游 = [已结实施卡](../../_backlog/_archive/settled_issues/2026-11-23-client-static-guards-and-contract-sweep.md)；依据 = [研究总纲](../../_backlog/research/bug-prevention-and-discovery/README.md) 与 [实盘可行性核验与定制工具方案](../../_backlog/research/bug-prevention-and-discovery/2026-11-23-custom-linters-and-feasibility-audit.md)。

## 决定

在零新第三方 npm 依赖的前提下，把此前主要靠多轮 E2E 才暴露的四类客户端/读模型缺陷前移到秒级自动防线，并清掉已曝光的现行残留：

1. **升级 [`.oxlintrc.json`](../../.oxlintrc.json) 精选正确性规则并清零 11 处 hooks 依赖隐患**：
   - 在 `packages/company-pack/src/**/*.{ts,tsx}` 启用 `no-empty`、`typescript/no-explicit-any`、`react-hooks/rules-of-hooks`、`react-hooks/exhaustive-deps`（保持 React Compiler 规则 `react/set-state-in-effect`、`react/purity`、`react/refs`、`react/immutability` 关闭；对 `tests/**/*.{ts,tsx}` 关闭 `react/globals` 与 `react/no-children-prop` 测试探索写法噪音）。
   - 修复实 bug [`DeliverablesTab.tsx`](../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx) `useMemo` 漏 `t` 依赖导致语言切换后缺失日期分组头停留在「日期未记」，以及 `use-company-data.ts`、`AttentionTab.tsx`、`CultivationTab.tsx`、`CultivationView.tsx` 共 11 处 hooks 依赖，清除 `eventsRef`/`namesRef` ref 副作用依赖。
2. **自研 TS Compiler API 领域静态审计器**：
   - 纯规则引擎在 [`checks/lib/company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs)，CLI 入口在 [`checks/audit/company-static-audit.mjs`](../../checks/audit/company-static-audit.mjs)，已接入 [`package.json`](../../package.json) 的 `pnpm lint`（`--strict` 阻断 R1/R2/R3）。
   - **R1 `must-use-boundary`（TypeChecker 级）**：识别 `WorkspaceTextRead`、`DeliverablesCatalog`、`PendingApprovals`、`MotionLedger`、`workspaceFiles.read` 返回结果；读取数据字段却未消费对应 `eof`/`skipped`/`capped`/`badRows`/`headerOk` 且未整对象透传时阻断。`asWindowReader` 显式解构 `eof: _windowOnly` 表明有意窗口投影；`cultivation-data.ts` 补读fallback 使用 `whole.eof`。
   - **R2 `no-literal-cjk-or-punct`（AST 级）**：`src/client/**`（排除 `locales.ts`、`cultivation-actions.ts`、`list-separator.ts` 及 `styles.ts` CSS 注释）零硬编码 CJK 字面量、JSX 中文文本与 `.join('、'|'；')`；`src/lib/**` 设按文件精确字面量棘轮（已清零的 `lib/presence/attention.ts` 锁定为 0，新文件 0 容忍）。
   - **R3 `no-type-escape`（AST 级）**：无条件阻断 `undefined as never` / `null as never`；对剩余 `as never` 与 `JSON.parse(...) as T` 输出基线计数。
   - **R4 `hygiene-smells`（只读基线）**：输出未标注 `intentional-fallback:` 的静默 `catch`、JSX `defaultValue=` 与 `x === undefined || ...` 基线统计。
3. **满态/错态/边界态/全角标点双语扫面与现行残留清零**：
   - 共享测试断言辅助在 [`tests/support/i18n-assertions.ts`](../../tests/support/i18n-assertions.ts)（查汉字、中文全角标点 `[、；：（）「」]` 与裸 ISO 时间戳 `\d{4}-\d{2}-\d{2}T\d{2}:`）。
   - 将 [`tests/client/i18n/`](../../tests/client/i18n/attention-tab.spec.ts) 扩至 `AttentionTab`、`BoardPanel`/`DagPanel`/`TasksTableView`/`DeliverablesView`/`DeliverablesTab`、`LedgerTab`、`PresencePanel`/`BudgetPanel`、`StrategyPanel`/`CultivationTab` 的填充态、边界态、错态及实时切语行为。
   - 清理现行残留：[`attention.ts`](../../packages/company-pack/src/lib/presence/attention.ts) 新增 `AttentionWhatToken`、`buildApprovalCopy`、`buildQuestionCopy` 并由 [`AttentionTab.tsx`](../../packages/company-pack/src/client/tabs/AttentionTab.tsx) 按 `t` 本地化；`BoardPanel` 补齐 `columnLabel(column, t)` 并改 [`company-panels.tsx`](../../packages/company-pack/src/client/tabs/company-panels.tsx) 的 `driftText` 与 DAG `<title>`；`DeliverablesTab.tsx` `rowAria` 改用 `listSeparator(t)`；[`CultivationContextPicker.tsx`](../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx) 渲染 `catalog.skipped`；`cultivation-context-data.ts`、`context-wiring.ts`、`TeamToolCard.tsx`、`LedgerTab.tsx`、`CultivationCompose.tsx`、`instance-guard.ts`、`title-state.ts` 消除内联中文/英文漏译；[`client/index.ts`](../../packages/company-pack/src/client/index.ts) 与 [`company-identity.ts`](../../packages/company-pack/src/client/data/company-identity.ts) 消费 `result.value.eof` 并移除 `first.id as never`。
4. **全 Slot 真 `inject()` + `happy-dom` 挂载守卫**：
   - 在 [`tests/client/company-client-composition.spec.ts`](../../tests/client/company-client-composition.spec.ts) 对 `dsh-company-pack` 注册的全部 10 个 tab（body/title/guide）及全部非 tab slot（`conversation.input.left`、`conversation.view`、`tool.call.toolview`、`sidebar.brand.name`、`sidebar.session.row.leading`、`conversation.session.header.actions`）真实执行 `inject()` 并用 `createRoot` 挂载，断言零异常、零 `console.error`。

## 输掉的方案

- **基于 `oxlint` `jsPlugins` 编写 R1**：`oxlint 1.81.0` 的 `jsPlugins` 尚处 alpha 且无 TypeChecker，无法追踪 `Promise<WorkspaceTextRead>` / `Result` 等跨调用结构字段消费；改为零新依赖的 TS Compiler API。
- **一次性启用 `oxlint` 全量 React Compiler 规则与全仓清理 R4**：`react/set-state-in-effect` 对已有受控同步/异步效应存在误报，一次性改造 57 处静默 `catch` 与 `failOpenUndefined` 范围过大且易改坏语义；保留 R4 只读计数，分阶段增量收口。
- **把 `src/lib/**` 一刀切禁绝所有 CJK**：`src/lib/docs/prd-check.ts`、`cultivation-context.ts` 等非 UI 解析器含合法中文章节正则与面向命令行的诊断提示，硬归零会造成大量假阳或无收益重写；改为按文件严格棘轮 + 新文件 0 容忍 + `lib/presence/attention.ts` 归零。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| hooks 与通用 correctness 规则 | [`.oxlintrc.json`](../../.oxlintrc.json) | `pnpm lint`（oxlint）读；无运行态写入 |
| R1–R4 领域静态规则与 lib 棘轮 | [`checks/lib/company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs) | [`company-static-audit.mjs`](../../checks/audit/company-static-audit.mjs) 与 `pnpm lint` 读；扫描 `packages/company-pack/src/**` |
| 待办跨语言条目摘要 token | [`AttentionWhatToken`](../../packages/company-pack/src/lib/presence/attention.ts) | [`AttentionTab.tsx`](../../packages/company-pack/src/client/tabs/AttentionTab.tsx) `formatAttentionWhat` 按 `t` 渲染；[`locales.ts`](../../packages/company-pack/src/client/locales.ts) 持 zh/en |
| 全 Slot 真实注入首帧守卫 | [`company-client-composition.spec.ts`](../../tests/client/company-client-composition.spec.ts) | 读取实包导出的 slot registry，在 `happy-dom` 执行 `inject()` + `createRoot` |

## 落地证据

- **系统改动面**：[`.oxlintrc.json`](../../.oxlintrc.json)、[`package.json`](../../package.json)、[`tsconfig.test-client.json`](../../tsconfig.test-client.json)、[`checks/lib/company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs)、[`checks/audit/company-static-audit.mjs`](../../checks/audit/company-static-audit.mjs)、[`checks/INDEX.generated.md`](../../checks/INDEX.generated.md)、[`packages/company-pack/src/client/`](../../packages/company-pack/src/client/index.ts)、[`packages/company-pack/src/lib/`](../../packages/company-pack/src/lib/presence/attention.ts)、[`tests/support/i18n-assertions.ts`](../../tests/support/i18n-assertions.ts)、[`tests/tools/company-static-audit.spec.ts`](../../tests/tools/company-static-audit.spec.ts)、[`tests/client/i18n/`](../../tests/client/i18n/panels.spec.ts)、[`tests/client/company-client-composition.spec.ts`](../../tests/client/company-client-composition.spec.ts)、[`tests/CENSUS.generated.md`](../../tests/CENSUS.generated.md)、[`tests/BUG-COVERAGE.generated.md`](../../tests/BUG-COVERAGE.generated.md)。
- **实跑命令**：`pnpm lint`、`pnpm typecheck`、`pnpm coverage:ratchet`、`pnpm verify`、`pnpm dup`、`pnpm test:checks`、`node checks/lanes/ui-scene.entry.mjs --isolated --expected`、`node checks/lanes/ui-scene.entry.mjs --isolated --lang en`。

## 验证（真跑过）

- **负控 1（hooks 依赖 + locale 切换 reactivity）**：临时删去 `DeliverablesTab.tsx:155` `useMemo` 依赖中的 `t` → `pnpm lint` 报错 `react-hooks(exhaustive-deps): missing dependency: 't'` 且 `pnpm vitest run tests/client/i18n/panels.spec.ts` 失败（`expected '日期未记 · 1' to contain 'Date missing'`）；还原 `[filtered, t]` 后两项均绿（5/5）。
- **负控 2（R1/R2/R3/R4 领域静态规则）**：`tests/tools/company-static-audit.spec.ts` 9/9 通过（包含实仓 140 文件 0 违规、`parseCatalog` 丢 `.skipped` / 解构与透传边界 / `src/client` CJK 与 `.join('；')` / `src/lib` 新泄漏 / `undefined/null as never` 阻断 / R4 计数与无效 tsconfig fail-loud）。
- **负控 3（双语满态与全角标点）**：`pnpm vitest run tests/client/i18n/` 9 文件 30/30 通过（覆盖空态、填充态、多问题、审批、drift、坏行、截断、wiki 外部路径、`CultivationTab` 会话来源与 `en` 无汉字/全角标点/裸 ISO 检查）。
- **负控 4（全 Slot 真 `inject` + `happy-dom` 挂载）**：临时把 `CommandScopeHint.tsx:75` 改为 `list: undefined as never`（复现 `BUG-293`）→ `company-static-audit --strict` 报 `FAIL [R3:no-type-escape]` 且 `company-client-composition.spec.ts` 报 `TypeError: Cannot read properties of undefined (reading 'subscribe')`；还原后 4/4 通过，零抛错与零 `console.error`。
- **全量回归与真浏览器 UI 冒烟**：`pnpm coverage:ratchet`（283/283 文件、2629/2629 用例、212 文件覆盖率棘轮）全绿；`pnpm dup` 0 clones；`node checks/lanes/ui-scene.entry.mjs --isolated --expected` 10 页签金样一致、`--isolated --lang en` 10 页签无中文残留且浏览器错误环 0 命中；`pnpm test:checks` 11/11 PASS；`pnpm verify` 全绿（仅 2 个 replay 门禁无对象按预期跳过）。
- **独立盲审与修复闭环**：`research` 子代理 `817492aa-e94a-4732-8f2a-3ea225b30465` 按 P5 四输入盲审指出 2 项阻断与 4 项非阻断（`instance-guard.ts` / `title-state.ts` 生产未接运行时 `t`、`checks/lib/company-static-audit.mjs` R1 跳过三元/`useMemo`/嵌套解构与 `console.log` 假透传、`CultivationContextPicker` 切源未清 `skipped`、`.join('；')` 提示优先级、`CHINESE_PUNCT_RE` 扩展、`use-company-data` 卸载流断言非同义反复），已全部修复并在 `client/index.ts` 接通 `locale/change` 实时订阅，修后重跑客户端重构编包、全量 `coverage-ratchet`、`verify`、`lint`、`typecheck`、`dup`、`test:checks` 与双语真浏览器冒烟全部通过。

## 未覆盖轴

- [covered] client + shared lib 静态防线、满态双语组件渲染、全 slot real `inject()` happy-dom 挂载、孤立真实浏览器 10 页签中英文冒烟 → [company-static-audit.spec.ts](../../tests/tools/company-static-audit.spec.ts) 与 [company-client-composition.spec.ts](../../tests/client/company-client-composition.spec.ts)
- [policy] 历史 6 大解析器随机畸形输入 Fuzz 矩阵、统一 `Bounded<T>` 类型与 Live↔History 同源状态差分（归研究第二批另行立卡） → [缺陷预防研究](../../_backlog/research/bug-prevention-and-discovery/README.md)
- [environment-gap] 真模型会话下触发跨会话实时 `user-questions/request` 与 `approval/request` 弹窗（keyless 冒烟为空公司盘） → [注意力观察者 spec](../../tests/client/wiring/attention-observers.spec.ts)
