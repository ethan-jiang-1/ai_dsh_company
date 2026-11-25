---
topic: bug-prevention-and-discovery
intent: 给出与 ai_dsh_company 现有架构、测试宪法和预算纪律相容的分阶段落地路线图与防过度工程停止条件
---

# 落地路线图、成本收益比与防过度工程红线

> **定位**：将 [代码实践研究](2026-11-23-coding-practices-for-bug-prevention.md) 与 [非 E2E 发现手段研究](2026-11-23-beyond-e2e-bug-discovery-methods.md) 映射回本仓现有的 `package.json`、`checks/`、`tests/`、`docs/testing.md` 与 `vendor/dsh/docs/defensive-patterns`，排出**先做什么、后做什么、绝对不做什么**。**本文为决策参考，不构成实施授权。**

---

## 1. 与本仓现有体系的对齐原则

本仓已有非常成熟的工程纪律（`AGENTS.md`、`docs/testing.md`、`tests/failure-classes.md`、`checks/lanes/generative.e2e.mjs`），因此落地路线必须遵守四条约束：
1. **复用既有载体，不另起炉灶**：静态规则进 `.oxlintrc.json` 或既有 `checks/gates/`；生成式/性质/fuzz 测试进 `tests/`（快速核心）与 `checks/lanes/generative.e2e.mjs`（重档 weekly）；组件交互与双语扫面进 `tests/client/`；白盒清单回接 `_backlog/methods/`。
2. **严守速度预算**：`pnpm verify`、`pnpm lint`、`pnpm test` 保持秒级；重型 fuzz（千例级）和变异测试放进 weekly / 手动 lane，不拖垮每次迭代和 pre-push。
3. **以“删除了哪份人工维护义务”验收，不以“加了多少规则/测试数”验收**：沿 11-20 研究的标准，每项落地必须带真实负控（红→绿）。
4. **先切高密度痛点，不全仓一刀切重构**：集中打 `src/client/` + `src/lib/` 的四个高发区（`attention`、`cultivation`、`deliverables`/`ledger`、`startup`）。

---

## 2. 分层优先级路线图（Tier 0 → Tier 1 → Tier 2）

### Tier 0：零新依赖、半天到一天级投入、立刻抓出今日真实残留（最高 ROI）

| 候选切片 | 具体动作 | 依赖变化 | 预计耗时 / 成本 | 立刻带来的收益 |
|---|---|---|---|---|
| **T0-1. 升级 `.oxlintrc.json` + 禁类型逃逸** | 打开 `oxlint` 内置 correctness + `react-hooks` + 空 `catch` 规则；加轻量 AST 守卫禁 `as never`、审计新增 `JSON.parse(...) as T` | **0 新依赖** | 运行 < 1s | 永久堵死 `BUG-293` 类接线逃逸，暴露 hooks 依赖洞与裸空 `catch` |
| **T0-2. 全组件 + 全命令双语扫面 spec** | 在 `tests/client/i18n/` 与 `tests/host/` 增加全组件/全命令 en 渲染零 CJK + 零中文标点 + 零裸 ISO 扫面（涵盖空/错/边界态） | **0 新依赖**（复用 `renderToStaticMarkup`） | 运行 < 1s | **当场捕获** `attention.ts:94/130/139/166/289/291`、`CultivationBoardSections.tsx:286`、`company-panels.tsx:159`、`cultivation-context-data.ts` 等今日真实残留 |
| **T0-3. 静态结构异味审计脚本（只读先跑，成熟后再入 gate）** | 用 `node_modules/typescript` 在 `checks/audit/` 下新增只读代码卫生审计脚本（拟名 `code-hygiene-audit.mjs`）：统计并定位 `as never` / `as unknown as` / 裸 `catch` / 裸 `continue` / 无 `eof` 的 `{ limit }` / 裸 `.slice(CAP)` / `defaultValue=` / `checks+probes` 旧路径与单语定位器 | **0 新依赖** | 运行 ~1s | 把人工 E2E 碰运气变成一张精确的“待清零债务地图”，新 PR 可增量拦截 |
| **T0-4. 全 Slot 真 `inject` + 挂载冒烟** | 在 `tests/client/` 遍历 `client/index.ts` 注册的每个 slot，在真实 `SlotRegistry` 下执行 `inject()` 并实际渲染（有会话/无会话/空态/错态） | **0 新依赖**（或按需补 jsdom 环境） | 运行 < 1s | 永久堵死 `BUG-293`、`BUG-290` 类渲染期接线崩溃 |

### Tier 1：结构性消灭三大最高发缺陷族（1–3 个迭代切片）

| 候选切片 | 具体动作 | 消灭的缺陷族 | 验收方式 |
|---|---|---|---|
| **T1-1. 全量解析器畸形输入 Fuzz 矩阵** | 为 6 大解析器（`catalog` / `ledger` / `startup-settings` / `startup-options` / `cultivation-record` / `attention`）建统一畸形变异矩阵：任何非法字段/坏表头/坏行必须出诊断，零静默归一化 | **F2（7 张）** | 接进 `pnpm test`（快速核心）+ `generative.e2e.mjs`（大样本）；带 3 项反向负控 |
| **T1-2. `Bounded<T>` 原语 + 读模型性质测试 + Live↔History 差分** | 把 `AttentionBoundaries` 范式抽为极薄的 `Bounded<T>` + `combineBoundaries`，清理剩余无边界切片（`client/index.ts:339`、`use-company-data.ts`、`cultivation-context-data.ts`）；为 `attention` / `cultivation` / `splitLayout` 建性质测试与 Live↔History 差分 | **F1（13 张）+ F4（7 张）+ F5（`306/307/309/315`）** | `visible + capped === total`、精确边界不误报（`BUG-332`）、双源合并去重零重行；接 `generative.e2e.mjs` |
| **T1-3. `lib/` 无自然语言契约 + 单一受控输入/分箱封装** | 将 `lib/presence/attention.ts` 等处残留自然语言改为结构 token（与 `timeParts` 同款）；清理 `cultivation-context-data.ts` 的中文错误与丢弃的 `skipped` | **F3 + F5** | T0-2 双语扫面全绿 + `src/lib/` 零 CJK 门禁 |
| **T1-4. `tools/` 进程 RAII 包装（`spawnManaged` / `runCheckedSync`）** | 收拢 `tools/dev/` 与 `checks/lanes/` 的子进程启停与信号转发，统一 `result.error` 诊断 | **F7（`BUG-283/284`）** | 孤儿进程 + 不存在 `cwd` 负控回归 |

### Tier 2：中长期深化护栏（按触发条件开启，不提前投入）

| 候选切片 | 具体动作 | 触发条件 / 边界 |
|---|---|---|
| **T2-1. 关键品牌类型试点** | 在 `attention` + `cultivation` 试点 `LocalizedText` / `PreviewText` vs `CompleteText` / 必填 `EntityIdentity` | T1-2/T1-3 完成后评估类型样板摩擦，只保留零绕过、真删义务的品牌 |
| **T2-2. 引入 `fast-check` 与 StrykerJS（weekly 档）** | `fast-check` 用于状态机模型测试（`StrategyPanel`/`CultivationBoard`/`AttentionTab`）与自动 shrink；StrykerJS 仅对 `src/lib/` + `src/client/{data,presence}/` 跑定期变异审计 | 当手写 seeded 生成器维护成本上升，或高覆盖率模块仍发生边界漏网时引入；**绝不进 pre-push** |
| **T2-3. `oxlint-tsgolint`（type-aware）与 `knip`** | 开启 `no-floating-promises` / `switch-exhaustiveness-check`；定期跑 `knip` 清理死导出与未消费常量 | 按既有 lint Note 触发条件开启 |
| **T2-4. 收窄 `tsconfig.test-*.json` 的 `exclude` + 清理 138 处静默 `catch`** | 逐批给历史 `catch` 分类（改结果态 / 标 `intentional-fallback`），逐步把被排除的 test spec 接回类型面 | 伴随相关模块改动增量推进，不搞一次性全仓大扫除 |

---

## 3. 反过度工程红线与停止条件（Stop Rules）

借鉴 11-20 研究最宝贵的清醒：预防工具本身也会长成新的维护债务。以下做法**明确不做**：

1. **不做全仓函数式框架重写**：不引入 `fp-ts` / `Effect` / 重型自研状态管理框架；用原生 TypeScript 判别联合 + 30–50 行纯组合子即可拿到 90% 的收益。
2. **不把“高噪声静态规则”直接设为阻塞门禁**：新 AST 猎手先以 `checks/audit/` 只读报告形式试跑并清理存量，确认**零假阳**后再按棘轮方式锁进门禁，绝不逼开发者写满屏 `eslint-disable`。
3. **不拿“变异分数 100% / 覆盖率 100%”当 KPI**：变异测试只针对高风险纯逻辑/状态机核心，用于发现“没测到边界”的真实盲区，绝不为凑分数去测 trivial getter 或样式字符串。
4. **不把 `PreviewText` / `LocalizedText` 品牌化强推到不痛的内部工具代码**：只在发生过多次逃逸的用户面/持久化面使用。
5. **不废除 E2E，也不把 E2E 当日常找虫主手段**：保留精简的高价值真入口车道（真加载、真安装、真多进程、真浏览主路径）；当同一失败类连续两轮在 E2E 出现时，**强制停止继续写单点 E2E，改为补前四层的结构约束或生成式测试**（严格落实 `tests/failure-classes.md` 已写明的复发棘轮！）。
6. **每项落地前先过“删除了什么义务”检验**：如果一个新抽象/新扫描器只是增加了样板代码、却没有删掉调用方的重复判断或没有抓住真实历史/现行反例，直接 `no-go`。

---

## 4. 下一步建议（供用户拍板，当前未动手）

建议优先从 **Tier 0（T0-1 ～ T0-4）** 切第一张实施卡：
- **零新依赖**、改动面极窄且高度可控；
- 能立刻在 1 秒内把今天扫描出的真实残留（`attention.ts` 硬编码中文、3 处硬编码分隔符、`cultivation-context-data.ts` 中文错误与丢弃 `skipped`、10 处 `as never`、无 `eof` 的固定读取）变成**自动化红灯**；
- 随后再按 **T1-1（解析器畸形 Fuzz）** 和 **T1-2（`Bounded<T>` + 读模型性质/差分测试）** 拆两张独立小卡推进，避免一揽子大重构。
