---
topic: bug-prevention-and-discovery
intent: 记录首轮研究后的实盘可行性核验（4 项修正）并系统回答“除了通用 linter，本仓自研哪些定制静态/契约工具最有价值”
---

# 实盘可行性核验与自研定制 Linter / 契约工具方案

> **基线**：2026-11-23 实盘核验。本文做两件事：（1）对前三篇材料的关键假设做实仓干跑检验，修正 4 处与真实代码树不完全一致的判断；（2）专门回答用户追加问题——**像 `ai_dsh_company` 这样的项目，除了通用 linter，自己开发什么特别的检查/测试工具最有帮助**。本文仍是研究与立项前置材料，未修改源码或配置。

---

## 一、首轮研究的 4 项实盘核验与修正

在把研究转成 issue 之前，对着真实仓库做了只读干跑，得到 4 条直接影响落地设计的关键修正：

### 修正 1：已有 8 份 `tests/client/i18n/` 为何拦不住 7 张双语卡？——「只测空态」陷阱

实读 `tests/client/i18n/` 下全部 8 份 spec（如 [panels.spec.ts](../../../tests/client/i18n/panels.spec.ts)、[attention-tab.spec.ts](../../../tests/client/i18n/attention-tab.spec.ts)）发现：
- 本仓**已经**有双语渲染测试，而且 `AttentionTab` 早就写了 `expect(html).not.toMatch(/[\u4e00-\u9fff]/u)`。
- 它们漏掉 `BUG-300/302/308/316/326/329` 以及现行残留（`attention.ts:291`、`company-panels.tsx:159`、`CultivationBoardSections.tsx:286`、`cultivation-data.ts:90`、`cultivation-context-data.ts:197-250`）的**真正原因**是：
  1. 现有 i18n spec **只喂了空态夹具**（`cards: []`、`getPending: () => []`、`layout: { nodes: [] }`），满态卡片、drift 分支、错误态、多问题问询、边界提示从未被执行；
  2. 正则只查了汉字 `\u4e00-\u9fff`，**没查中文全角标点**（`、；：（）「」`），于是 `BUG-329` 和 `join('；')` 顺利逃脱。
- **落地修正**：不必另建双语测试体系，直接扩展现有 `tests/client/i18n/` 的夹具覆盖「满态 + 错态 + 边界态」，并把正则收紧为「零汉字 + 零全角中文标点 + 零裸 ISO 时间戳」。

### 修正 2：`happy-dom` 与全量 `bootClient` 已在场，真实缺口只有“最后一厘米”

首轮材料曾把 `tests/client/` 概括为“主要用 `renderToStaticMarkup`，缺少无头 DOM”。实查代码发现：
- `happy-dom` + `react-dom/client`（`createRoot`）**早已在 10+ 份 `tests/client/` spec 里使用**；
- [company-client-composition.spec.ts](../../../tests/client/company-client-composition.spec.ts) 甚至已经跑通了真实的 `bootClient` + web profile roster。
- **真正缺失的精确接缝**：`company-client-composition.spec.ts` 只检查了 `slots.entries(...)` 和 `tabs.entries()` **已注册**，**从未调用每个 slot 的 `inject()` 并渲染其组件**——这就是为什么 `CommandScopeHint` 的 `list: undefined as never`（`BUG-293`）能在一整套 composition spec 绿灯下于真页面崩溃。
- **落地修正**：零新依赖，直接在 composition / slot 挂载 spec 里把已注册的全部 tab 与 slot 真正执行 `inject()` + `happy-dom` 首帧挂载。

### 修正 3：`oxlint 1.81.0` 实跑干测——56ms 仅 23 条，且当场抓出 1 条现行真 Bug

实跑只读命令 `npx oxlint --react-plugin -D correctness -D react-hooks/rules-of-hooks -D react-hooks/exhaustive-deps -D no-empty -D typescript/no-explicit-any packages/company-pack/src`（43–56ms / 140 文件），全部 23 条命中分类如下：

| 规则 | 命中数 | 实盘分诊结论 |
|---|---:|---|
| `no-empty` | **0** | 可直接开启（注：因仓内静默 `catch` 多带注释或 `return null`，此规则单独拦不住静默降级，仍需定制规则） |
| `typescript/no-explicit-any` | **0** | 可直接开启，零存量成本 |
| `react-hooks/rules-of-hooks` | **0** | 可直接开启，零存量成本 |
| `react-hooks/exhaustive-deps` | **11** | **高信噪比，应开启！** 当场抓出 1 条现行真 bug：[DeliverablesTab.tsx](../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx) 第 154 行 `useMemo` 使用了 `t('deliverables.dateMissing')` 却漏写 `t` 依赖（打开页签时切中英文，缺失日期分组头不刷新）；另含 `use-company-data.ts:147,151` 依赖异味及 8 处 `props`/外层对象解构清理 |
| React Compiler 规则（`react/set-state-in-effect`、`react/purity`、`react/refs`、`react/immutability`） | **12** | 含少量真实异味（如 `use-company-data.ts:151` 渲染期读 `eventsRef.current`、`CultivationBoardSections.tsx:60,155` 渲染期调 `Date.now()`），但 `set-state-in-effect` 对 React 18 切会话重置状态存在模式冲突——**首批暂不启用**，避免强行重写无缺陷代码 |

### 修正 4：全历史分布、现行 10 处 `as never` 与活跃 E2E 卡的边界对齐

1. **全历史 331 张卡对照**：11-20 前的 281 张卡分布为工具/车道 110、会话/委派/其他 82、`client/lib` 37、`host` 26、`preset/content` 26；11-20 后的 50 张集中于 `client/lib`（40 张）是因为当时活跃的 [2026-11-21 公司页 E2E 设计卡](../../_archive/settled_issues/2026-11-21-company-e2e-test-design.md) 连续 6 轮定向打 UI 面。因此首批 issue 明确标注聚焦「通用静态防线 + client/lib 高发面」，与 E2E 设计卡分工互补、不替代它。
2. **现行 10 处 `as never` 逐条核查**：已核实无一处是 `undefined as never`（`BUG-293` 已修），多位于 vendor RPC / DOM 事件 / 未增强 Cordis 事件窄边界（`company-data-plane.ts:60`、`client/index.ts:229,339`、`context-wiring.ts:51`、`error-ring.ts:183-198`、`company-language.ts:87-89`）。因此规则设计为：**无条件禁止 `undefined/null as never`**，其余 `as never` 收拢为窄白名单或逐步清零，不搞一刀切破坏构建。
3. **额外顺手发现 1 处现行中文残留**：[cultivation-data.ts](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts) 第 90 行 `return { ok: false, reason: \`读取被拒（${path}）\` }`——`BUG-302` 修了 `dir-denied` 但漏了紧邻的文件读失败分支。

---

## 二、除了通用 Linter，像本仓这样的项目自己开发什么特别的工具最有帮助？

**先说结论：非常有帮助，而且正是通用 linter 的盲区所在。**

通用 linter（ESLint / `oxlint` / `tsc`）只懂**语言通用语法**（变量未用、hook 依赖漏写、类型不匹配），它们**根本不懂本项目的 5 个领域不变量**：
1. “读工作区文件返回的 `.eof`、解析索引返回的 `.skipped`、读审批返回的 `.capped` 不允许被调用方静默忽略”；
2. “`src/lib/` 只能产结构化数据，不能产中英文自然语言；`src/client/` 字典外不能出现汉字和中文全角标点”；
3. “本包手写的 `*Face`/`*Like` 窄接口不能在升 vendor pin 时与上游真实类型悄悄漂移”；
4. “任何公司面板在 `loading / unready / failed / empty / populated / bounded-empty` 六态 × 中英文下都必须满足同一组空态诚实性与双语不变量”；
5. “新增的守卫测试必须真的能抓红对应缺陷分支，而不是永远只走绿路径”。

### 实现路线对比：`oxlint` 原生 `jsPlugins` vs TypeScript Compiler API

实查仓内已安装的 `node_modules/oxlint/configuration_schema.json`（v1.81.0），本仓其实有两条**零新依赖**的自研通道：

| 维度 | 通道 A：`oxlint` 原生 `jsPlugins` | 通道 B：TypeScript Compiler API（`ts.createProgram`） |
|---|---|---|
| 是否已在仓内 | **是**（`oxlint 1.81.0` 已支持 `jsPlugins: ["./..."]` + Node 22 原生跑 JS/TS 插件） | **是**（`typescript 6.0.3` 已安装，稳定无 alpha 风险） |
| 速度与集成 | 挂进 `pnpm lint`，与 Rust 规则一次跑完（百毫秒级） | 独立 `checks/audit/` 或 `checks/gates/` 脚本（约 0.5–1.5s） |
| 能力天花板 | **纯语法 ESTree**——无法知道变量的类型定义 | **完整 `TypeChecker`**——能知道任意表达式/返回值的真实 TS 类型！ |
| 风险 | `oxlint` schema 明确标注 `jsPlugins` 处于 **alpha，不遵守 semver** | API 极稳定，但需随 `tsconfig` 建 program（纯 AST 模式连 program 都不用） |
| **最佳分工** | 等 `jsPlugins` 稳定后再考虑迁移纯语法规则 | **当前首选**：一套脚本同时支持轻量纯 AST（毫秒级）+ 按需 `TypeChecker` 语义检查 |

### 最值得本仓自研的 5 件“专属兵器”

#### 兵器 1：TypeChecker 驱动的「领域边界/诊断防丢弃检查器」（Must-Use-Field Checker）★ 最具独创价值

**通用 linter 完全做不到，但直击本仓第一、二大缺陷族（F1 + F2，合计 20/49 张卡）**：
- 利用 `ts.createProgram` + `checker.getTypeAtLocation(callExpr)`，对声明为“带边界/带诊断结果类型”的返回值（如 `WorkspaceTextRead` 的 `.eof`、`DeliverablesCatalog` 的 `.skipped`、`MotionLedger` 的 `.badRows`/`.headerOk`、`PendingApprovals` 的 `.capped`、`AttentionBoundaries`、`WorkspaceFilesFace.read` 返回的 `.eof`）：
  - 若调用方拿到该结果对象，消费了数据字段（如 `.text` / `.entries` / `.items` / `.rows`），但在同一作用域内既**没有读取对应的边界/诊断字段**，也没有把整个对象原样传给下游函数 → **直接报错**！
- **立刻能抓出什么**：
  - 当场抓出今日现行代码 [cultivation-context-data.ts](../../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts) 第 198 行（调 `parseCatalog(catalogText)` 读了 `catalog.entries`，却完全丢弃 `catalog.skipped`）！
  - 当场抓出今日现行代码 [client/index.ts](../../../packages/company-pack/src/client/index.ts) 第 339 行（调 `identityFiles.read(..., { limit: 200 })` 读了 `result.value.text`，却从未检查 `result.value.eof`）！
  - 未来任何人调用 `pendingAsks()` 却只拿 `.items` 丢掉 `.capped`（`BUG-327` 复发），写完代码 1 秒内红灯！
- **实现成本**：约 120–160 行 TypeScript（零外部依赖）。

#### 兵器 2：本仓专属领域 AST 规则集（`company-lint` / `checks/audit/`）

专盯过去 6 轮 E2E 反复复发、且通用 linter 管不了的 5 类模式：
1. **`no-user-text-in-lib` + `no-cjk-or-punct-outside-locale`**：`src/lib/**` 禁面向用户中文字符串；`src/client/**`（`locales.ts`、`cultivation-actions.ts` 字典外）禁 CJK 与中文分隔符 `.join('、'|'；')`（今日立刻命中 `attention.ts` 6 处、`company-panels.tsx:159`、`CultivationBoardSections.tsx:286`、`cultivation-data.ts:90`、`cultivation-context-data.ts` 5 处）；
2. **`no-nullish-as-never` + `audit-type-escapes`**：无条件禁 `undefined as never` / `null as never`（`BUG-293`），记录并棘轮管控 `as never` 与 `JSON.parse(...) as T`（不增只降）；
3. **`no-unexplained-silent-catch`**：任何 `catch` 块为空或仅返回 `null/undefined/[]/{}/false` 且缺少 `// intentional-fallback: <理由>` 标记时告警（逐步收口 138 处静默 catch）；
4. **`no-fail-open-scope-predicate` + `no-uncontrolled-default-value`**：命中 `x === undefined || y === x` 模式（`BUG-323`）或 JSX `defaultValue=`（`BUG-301`）告警；
5. **`no-stale-harness-assumptions`**：扫 `checks/` 与 `probes/` 中的旧顶层路径（`journal/`、`deliverables/`、`kb/` 无 `.dsh-company/` 前缀）与单语硬编码 Playwright 定位器（`BUG-286/287/289`）。

> **防噪声铁律**：所有新定制规则一律**先以只读审计脚本上线（带存量棘轮）**，清零存量并验证零假阳后，再决定哪几条升格为阻断门禁。

#### 兵器 3：声明式「面板六态契约测试驱动」（Panel Contract Harness）

不是 linter，而是专门为本仓 10 个公司页签 + 培养/策略视图定制的 **40 行共享测试基座**：
- 任意面板只要提供 6 份最小 ASCII 业务夹具（`loading` / `unready` / `failed` / `empty` / `populated` / `boundedEmpty`），harness 自动跑完 **12 组渲染（6 态 × zh/en）** 并统一断言：
  1. `en` 下全 6 态零汉字、零中文全角标点（`[、；：（）「」]`）、零裸 ISO 时间戳（`\d{4}-\d{2}-\d{2}T\d{2}:`）；
  2. `failed` / `unready` / `boundedEmpty` 态绝不渲染空态安抚词（「没有等你的事」「还没有…」「共 0 场」）；
  3. `happy-dom` 挂载与卸载零异常、零 `console.error`、React key 无重复告警。
- **价值**：把“每个面板靠人肉记得写 12 种边界单测”变成“接入 10 行声明即自动全覆盖”。

#### 兵器 4：Vendor 窄接口漂移守望者（Compile-Time Vendor Face Assignability）

本仓为避免耦合 vendor 内部细节，在 `src/client/` 与 `src/host/` 定义了大量本地 `*Face` / `*Like` 结构接口，并用 **42 处 `as unknown as`** 强转过去。隐患是：一旦 `vendor/dsh` 升 pin 改了字段名或可选性，`tsc` 完全不知情，直到运行时崩。
- **做法**：建一份仅参与 `pnpm typecheck` 的零运行时类型断言文件，用 `satisfies` / 赋值兼容性校验把每个自写 `*Face` 与真实 vendor 导出类型逐一钉死；升 pin 跑 `pnpm typecheck` 时，任何上游协议微调立刻在编译期暴露。

#### 兵器 5：可复用的轻量定向变异辅助（Targeted Mutation Helper）

本仓在 `tests/checks/gate-mutation.test.mjs` 和 `tests/checks/content-family.test.mjs` 已经验证了“克隆源码 + 局部变异 + 断言测试必红”的极高性价比。把克隆重定向逻辑抽成 80 行共享测试工具，针对核心读模型（`attention`、`cultivation-record`、`deliverables-index`、`ledger`、`startup-settings`）的 3 类高频算子（边界 `>=`↔`>`、跳过/截断计数置 0、fail-closed 改为 fail-open）跑周级变异，无需引入重型框架即可抓出类似 `BUG-332` 的弱断言。

---

### 三、自研工具的克制边界（什么时候**不该**自己造）

对照本仓 `docs/policy.md`（P2：无复发不造门禁）与 2026-11-04 lint Note 的教训：
1. **绝不重造 `oxlint` / `tsc` 已有的通用规则**（`react-hooks`、`no-unused-vars`、`no-empty` 直接用现成 Rust 引擎）。
2. **绝不让定制规则直接拦住没清理完的存量**——先只读报告 + 棘轮（存量只降不升），零假阳再设阻断。
3. **不搞重型独立编译器/AST 框架**——每件自研工具控制在 100–200 行清晰 JS/TS，直接复用仓内已有的 `typescript`、`vitest`、`happy-dom`，无新第三方依赖、搬家成本低。
