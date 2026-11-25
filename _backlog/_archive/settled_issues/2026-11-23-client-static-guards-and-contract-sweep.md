---
status: 已结
opened: 2026-11-23
---

# 落地：客户端静态猎手、满态双语扫面与全 Slot 真挂载（质量预防首批）

> 立卡：2026-11-23 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 批准：用户 2026-11-23「同意按这个落地，记着需要高质量的落地」「先提交一下git, 好的，没问题，我看你都已经搞得很清楚了，那我们就set up goal 推动落地吧」（R1/R2/R3 直接设为阻断防线、R4 保留只读基线） ｜ 可关闭：是 ｜ 审查：agent（独立只读盲审 `817492aa-e94a-4732-8f2a-3ea225b30465` 发现 2 阻断 + 4 非阻断，已全部修复并复验通过）
>
> **结论/去向**：`note` — [实施Note](../../../notes/implemented/2026-11-23-client-static-guards-and-contract-sweep.md)
>
> 来源：[缺陷预防与非 E2E 发现手段研究](../research/bug-prevention-and-discovery/README.md)（特别是 [实盘可行性核验与自研定制工具方案](../research/bug-prevention-and-discovery/2026-11-23-custom-linters-and-feasibility-audit.md)）。

**问题与期望结果：** 2026-11-20 试点后 3 天内通过 6 轮 E2E 又挖出 49 张有效缺陷卡（`BUG-283`–`BUG-332`，另 1 撤回），其中 81.6% 在 `src/client/` 与 `src/lib/`、87.8% 只需秒级 keyless `vitest` 即可打红；甚至第 6 轮刚收口，一次只读静态/lint 扫描就在 1 秒内再次命中现行残留（`DeliverablesTab.tsx:154` `useMemo` 漏 `t` 依赖、`attention.ts` 6 处硬编码中文含 `BUG-331` 新引入文案、`company-panels.tsx:159` 与 `CultivationBoardSections.tsx:286` 裸 `join('；')`、`cultivation-data.ts:90` 与 `cultivation-context-data.ts` 中文错误、`cultivation-context-data.ts:198` 丢弃 `catalog.skipped`、`client/index.ts:339` 读 200 行忽略 `eof`）。期望通过**零新第三方依赖**的首批机械防线，把“hooks 依赖洞、领域边界/诊断字段静默丢弃、双语满态/标点泄漏、Slot 接线崩溃”前移到秒级自动捕获，并同步清掉上述已曝光的现行残留。

**当前情况：**
- `oxlint 1.81.0` 已在仓内，但 `.oxlintrc.json` 几乎只启用了 `no-unused-vars`；只读干跑 `react-hooks/rules-of-hooks`、`react-hooks/exhaustive-deps`、`no-empty`、`typescript/no-explicit-any` 仅耗时 ~50ms，报 11 条 `exhaustive-deps`（含 `DeliverablesTab.tsx:154` 真 bug）与 0 条其他错误。
- `tests/client/i18n/` 已有 8 份 spec，但多只测空态且正则只查汉字不查中文全角标点，导致 7 张双语卡与现行残留逃逸。
- `tests/client/company-client-composition.spec.ts` 已在 `happy-dom` 下跑真实 `bootClient`，但只断言 `tabs`/`slots` 注册名，未调用 `inject()` 并挂载组件（`BUG-293` 逃逸缝隙）。
- 仓内已有 `typescript 6.0.3` Compiler API，可直接支撑零依赖的定制领域语义检查（含 TypeChecker 级 `must-use-field` 检查）。

**未决问题：**
1. 用户是否同意本卡作为首批窄切片（Tier 0 + 首批自研领域静态审计），先不与第二批（解析器畸形 Fuzz、`Bounded<T>` 重构、Live↔History 差分）混在一张卡里？
2. 定制静态审计脚本首批先落 `checks/audit/` 只读审计 + 负控自测（与 `pnpm lint` 分开跑、零假阳后再决定哪些条目升格为阻断门禁），还是其中已清零的项（如 `src/lib/` 零 CJK、`undefined as never` 禁令）本批直接进阻断检查？建议：**已清零项直接阻断，存量项（如 138 处静默 `catch`）先只读 + 棘轮计数**。

**下一步：** 待用户确认上述范围与两项取舍并授权实施；授权后将本卡翻 `待落地` 并按 `## 验收标准` 执行红→绿交付。

## 范围与排除项

**范围（四件套，零新第三方依赖）：**
1. **升级 `.oxlintrc.json` 精选正确性规则**：开启 `react-hooks/rules-of-hooks`、`react-hooks/exhaustive-deps`、`no-empty`、`typescript/no-explicit-any`（暂不启用 React Compiler 的 `set-state-in-effect` / `purity` / `refs` 规则）；修复 `DeliverablesTab.tsx:154` 漏 `t` 依赖及同批 10 处 hooks 依赖告警，使 `pnpm lint` 归零。
2. **自研轻量领域静态审计器（基于仓内 `typescript` Compiler API）**：在 `checks/audit/` 下新增只读审计脚本（拟名 `company-static-audit.mjs`）并在 `tests/tools/` 配负控 spec，覆盖 4 条本仓专属语义检查：
   - **R1 `must-use-boundary`（TypeChecker 级）**：调用返回 `WorkspaceTextRead`、`DeliverablesCatalog`、`PendingApprovals`、`MotionLedger` 或 `workspaceFiles.read` 的位置，若读取了数据字段却未读取对应的 `.eof`/`.skipped`/`.capped`/`.badRows`/`.headerOk` 且未透传结果对象 → 报告；
   - **R2 `no-literal-cjk-or-punct`（AST 级）**：`src/lib/**` 禁面向用户中文字符串；`src/client/**`（排除 `locales.ts` 与 `cultivation-actions.ts` 字典表）禁硬编码 CJK 与裸中文分隔符 `.join('、'|'；')`；
   - **R3 `no-type-escape`（AST 级）**：无条件拦截 `undefined as never` / `null as never`，并对剩余 `as never` 与 `JSON.parse(...) as T` 输出精确基线清单；
   - **R4 `hygiene-smells`（只读基线，不阻断）**：统计并列出无 `intentional-fallback` 说明的静默 `catch`、`defaultValue=`、`x === undefined || y === x` fail-open 谓词，供后续增量收口。
3. **补强现有 `tests/client/i18n/` 至“满态 + 错态 + 边界态 + 全角标点”并清理已曝光残留**：
   - 抽取轻量共享断言辅助（检查 en HTML 零汉字 + 零中文全角标点 `[、；：（）「」]` + 零裸 ISO 时间戳），把现有 i18n spec 从仅空态扩到满态/drift/多问题/错误/边界态；
   - 同步清理本次扫描已曝光的现行残留：`attention.ts` 6 处中文改结构 token 或字典渲染、`company-panels.tsx:159` 与 `CultivationBoardSections.tsx:286` 的 `join('；')` 走 locale、`cultivation-data.ts:90` 的中文读失败改错误码、`cultivation-context-data.ts` 5 处中文错误走 locale 并消费 `catalog.skipped`、`client/index.ts:339` 消费 `eof` 或显式走统一读原语。
4. **补齐全 Slot 真 `inject` + `happy-dom` 挂载守卫**：
   - 在 `tests/client/` 沿既有 `company-client-composition.spec.ts`（或紧邻的 slot 挂载 spec）对 `packages/company-pack/src/client/index.ts` 注册的全部 10 个 tab 与所有非 tab slot（`CommandScopeHint`、`RoleBadge`、`TasksAction`、`StrategyButton`、`CultivationView`、`DelegationCard`、`TeamToolCard`、`DreamTeamBrandName`）真实执行 `inject()` 并用 `happy-dom` 挂载首帧，断言零抛错、零 `console.error`。

**明确排除项：**
- 不在本卡实施第二批（6 大解析器畸形 Fuzz 矩阵、统一 `Bounded<T>` 重构、Live↔History 差分——另立第二卡）；
- 不在本卡引入新 npm 依赖（不装 `fast-check`、StrykerJS、`knip`、`oxlint-tsgolint`）；
- 不做品牌类型试点（Tier 2）或一次性清理全仓 138 处历史静默 `catch`（本卡只建基线，不搞全仓重写）；
- 不改 `vendor/`，不改角色 persona/skill/content，不取代或关闭当时的活跃卡 [2026-11-21-company-e2e-test-design.md](2026-11-21-company-e2e-test-design.md)（本卡负责把能前移的静态/无模型缺陷从 E2E 卸载出来，E2E 卡专注真浏览器/真边界）。

## 已知与未决

- 现行 `DeliverablesTab.tsx:72` 的 `rowAria` 使用 `.join(', ')`：需在实施时确认 zh 下的 `aria-label` 是否应改走 `listSeparator(t)`（建议同步走 `listSeparator(t)`，保持与 `BUG-329` 一致）。
- `oxlint` 的 `jsPlugins` 在 v1.81.0 处于 alpha 且无 `TypeChecker` 能力，故 R1–R4 采用仓内 `typescript` Compiler API 实现，稳定性高且能做 R1 的跨类型数据流分析。
- 本卡改到 `src/client/` 用户可见文案（如 `attention.ts` 多问题文案与 `cultivation-context-data.ts` 英文错误），实施前须加载 `company-ui-change-definition` skill，并核对 UI 金样是否受影响（`ui-scene-smoke --isolated --expected`）。

## 方案与取舍

| 决策点 | 选定方案 | 输掉的方案与理由 |
|---|---|---|
| 定制规则载体 | 基于仓内 `typescript` Compiler API 写轻量模块，由 `checks/audit/` 入口 + `tests/tools/` 负控自测消费 | `oxlint` `jsPlugins`（alpha、无 TypeChecker，做不了 R1）；引入 ESLint 全家桶（与本仓 `oxlint` 路线冲突且重） |
| `oxlint` 规则档 | 精选 `react-hooks/rules-of-hooks` + `react-hooks/exhaustive-deps` + `no-empty` + `typescript/no-explicit-any` | 一把打开全量 React Compiler 规则（`set-state-in-effect` 对 React 18 合法重置模式有误报，会引发无必要重构） |
| 存量债务处理 | 已确认清零项（R1 关键读面、R2 双语、R3 `null/undefined as never`）严格归零；历史 138 处静默 `catch` 与 42 处 `as unknown as` 先只读计数不阻断 | 一次性重构全部 138 处 `catch`（范围失控、极易引入行为变更） |
| Slot 挂载测试 | 复用已有 `happy-dom` + `createRoot` 与 `bootClient` 组合，补调 `inject()` 并挂载 | 引入 Playwright 或新建测试框架（违反 `docs/testing.md` 分层与零新依赖原则） |

## 验收标准

| 命令 / 位置 | 必须观察的断言 | 红形态 / 负控 |
|---|---|---|
| `pnpm lint` | 开启 4 条精选规则后 `0 warnings / 0 errors`；`DeliverablesTab.tsx` 切换 locale 后缺失日期分组头同步更新（补单测） | 临时从 `DeliverablesTab.tsx:154` 撤掉 `t` 依赖 → `pnpm lint` 与对应 spec 同时变红；还原即绿 |
| `node checks/audit/<自研静态审计脚本>` + `pnpm test tests/tools/`（对应负控 spec） | R1（`must-use-boundary`）、R2（`lib/` 与 `client/` 双语/标点）、R3（`null/undefined as never`）在现行源码上均为 0 违规；R4 输出准确基线计数 | 负控 4 组：① 调 `parseCatalog` 丢弃 `.skipped` → R1 红；② 在 `src/lib/` 或 `src/client/` 注入中文/裸 `join('；')` → R2 红；③ 注入 `undefined as never` → R3 红；④ 合法读取 `.eof`/字典文案 → 零误报 |
| `pnpm test tests/client/i18n/` | 现有 8 份 i18n spec 覆盖满态/错态/边界态/多问题/drift；en 渲染零汉字、零中文全角标点、零裸 ISO；`attention.ts` / `company-panels.tsx` / `CultivationBoardSections.tsx` / `cultivation-data.ts` / `cultivation-context-data.ts` 现行残留清零 | 临时把 `attention.ts` 多问题文案或 `company-panels.tsx:159` 改回硬编码中文/`；` → en 断言立刻变红；还原即绿 |
| `pnpm test tests/client/company-client-composition.spec.ts`（及新增 slot 挂载用例） | 全部 10 个 tab + 全部注册 slot 实际执行 `inject()` 并在 `happy-dom` 下首帧挂载成功，零未捕获异常、零 `console.error` | 临时把任一 slot 的 `inject()` 改成传 `undefined as never`（复现 `BUG-293`）→ 挂载测试当场红；还原即绿 |
| `pnpm verify` + `pnpm typecheck` + `pnpm dup` + `pnpm test` + `pnpm coverage:ratchet` | 全量门禁、类型、重复、keyless 回归与覆盖率棘轮全绿；若影响 UI 金样则同 diff 跑 `node checks/lanes/ui-scene.entry.mjs --isolated --expected` | 仅在以上四项定向负控均见过红并还原后，才认全绿有效 |

## 事实与读者

- 事实（拟改变）：新增 4 条 `oxlint` 正确性规则、1 套基于 TS Compiler API 的只读/负控静态审计器、满态双语断言与全 Slot 真 `inject` 挂载守卫；清理扫描曝光的 6 处现行残留。
- 唯一入口：lint 规则 = `.oxlintrc.json`；定制审计 = `checks/audit/` 新增脚本（并在 `checks/README.md` 索引）；双语断言 = `tests/client/i18n/`；Slot 挂载 = `tests/client/`。
- 读载体 / 写载体：静态审计只读 `packages/company-pack/src` 与 `tsconfig`；清理残留改 `packages/company-pack/src/{lib,client}/` 对应文件。
- 环境坏法：无新外部依赖或网络/浏览器前置；`tsconfig` 路径解析失败时 R1 必须显式报错（fail-loud），不得静默跳过报 0 违规。

## 抽象度

本卡改的是本仓维护期静态防线与客户端测试守卫，不改 company 角色能力或产品内容契约。
- 换公司要改吗？→ 不会（规则面向 TypeScript/React/双语机制，不写死任何公司实例）。
- 换产品类型要改吗？→ 不会。
- 换做法要改吗？→ 会（若未来 `oxlint` `jsPlugins` 稳定或引入新工具，可平滑替换 R2/R3 载体，不耦合产品代码）。
- 只有机制本身变才改吗？→ R1 依赖本仓边界结果类型清单（`WorkspaceTextRead` 等），仅在新增新边界结果类型时扩展清单。
- 第二消费者：R1/R2/R3 同时服务 `attention`、`cultivation`、`deliverables`、`ledger`、`startup` 五个客户端/读模型域。
- 搬家成本：低（审计脚本与测试夹具均在维护面，不污染 `packages/company-pack/src` 导出）。

## 关闭条件

- 用户确认范围与取舍并明确授权实施后，翻 `待落地` 并按 `## 验收标准` 落地交付；交付后产出真实 `notes/implemented/` Note、通过独立盲审、补齐 `## 落地证据` 与 `审查：`，再迁档 `settled_issues`。
- 若用户裁决缩减范围或改为先落第二批，先同步更新本卡范围/验收或按裁决另立卡再关停。

## 落地证据

- **系统改动面**：[`.oxlintrc.json`](../../../.oxlintrc.json)、[`package.json`](../../../package.json)、[`checks/lib/company-static-audit.mjs`](../../../checks/lib/company-static-audit.mjs)、[`checks/audit/company-static-audit.mjs`](../../../checks/audit/company-static-audit.mjs)、[`packages/company-pack/src/client/`](../../../packages/company-pack/src/client/index.ts)、[`packages/company-pack/src/lib/presence/attention.ts`](../../../packages/company-pack/src/lib/presence/attention.ts)、[`tests/tools/company-static-audit.spec.ts`](../../../tests/tools/company-static-audit.spec.ts)、[`tests/client/i18n/`](../../../tests/client/i18n/panels.spec.ts)、[`tests/client/company-client-composition.spec.ts`](../../../tests/client/company-client-composition.spec.ts)、[`notes/implemented/2026-11-23-client-static-guards-and-contract-sweep.md`](../../../notes/implemented/2026-11-23-client-static-guards-and-contract-sweep.md)。
- **实跑命令**：`pnpm lint`（0 errors/warnings + static-audit 0 violations）、`pnpm typecheck`、`pnpm coverage:ratchet`（283/283 files, 2629 tests PASS, 212 文件覆盖率棘轮 PASS）、`pnpm verify`、`pnpm dup`（0 clones）、`pnpm test:checks`（11 PASS / 0 FAIL）、`ui-scene.entry.mjs --isolated --expected` & `--isolated --lang en`（ALL PASS）。
