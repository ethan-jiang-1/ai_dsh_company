# 六大解析器畸形 Fuzz、Bounded<T> 原语与 Live↔History 差分（质量预防二期）

状态：implemented（2026-11-23）；批准：用户 2026-11-23「那种事最合理的, 长期是正确的, 我就选择哪个, 如何? 推进吧」。

上游 = [已结实施卡](../../_backlog/_archive/settled_issues/2026-11-23-fuzz-bounded-differential-guards.md)；依据 = [研究总纲](../../_backlog/research/bug-prevention-and-discovery/README.md) 与 [落地路线图](../../_backlog/research/bug-prevention-and-discovery/2026-11-23-adoption-roadmap-and-stop-rules.md)（T1-1 / T1-2）。

## 决定

在零新第三方 npm 依赖的前提下，针对 11-20～23 占比 **55%** 的三大高发根因族（F1 有界截断、F2 解析器宽松吞错、F4 活体↔历史多源分裂）建立生成式契约与结构防线，并修掉顺带核出的现行脆弱点：

1. **加固 6 大解析器契约与双源共享提取**：
   - [`startup-settings.ts`](../../packages/company-pack/src/lib/startup/startup-settings.ts)：`parseStartupOptionsState` 校验 `productTypes`/`deliveryModes` 数组元素必须全为 `string`，且 `wikiCheck` 在场时必须为非数组对象，否则报 `unreadable`；保留 `settingsFieldProblem` 对 legacy 数字标量的既有 [`startup-load.spec.ts`](../../tests/client/startup/startup-load.spec.ts) 兼容。
   - [`deliverables-index.ts`](../../packages/company-pack/src/client/data/deliverables-index.ts)：`parseCatalog` 对 `slug`/`path` 先 `trim()` 再判空，并将 `kickoff`/`type`/`result`/`summary`/`dir`/`metaProblem` 在场却给错类型（非 string）的条目跳过计入 `skipped`。
   - [`deliverables-catalog.ts`](../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts) 与 [`deliverables-catalog.mjs`](../../tools/lib/company/deliverables-catalog.mjs)：`metaProblemsOf` 在 TS 与 JS 两侧统一 `.trim()` 校验必填字段，使空/空白必填值只报一次 `缺行`，不与格式 error 双重误报。
   - [`attention.ts`](../../packages/company-pack/src/lib/presence/attention.ts) 与 [`attention-observers.ts`](../../packages/company-pack/src/client/wiring/attention-observers.ts)：抽取并复用共享安全提取 `questionsFromPayload(payload)` 与 `approvalFromPayload(payload)`；修复原 `approval/request` 与 `user-questions/request` 对 `null`/`undefined`/非数组 `questions` 解引用抛出同步异常、阻断 `next()` waterfall 的风险；`mergeAttention` 将跨源问询去重改为计数多重集（`Map<string, number>` 1:1 抵消），避免 1 条活体把 2 条同文历史问询全吞。
2. **新增 `Bounded<T>` 边界原语 + R1 静态审计纳管 + 收敛静默 `.slice`**：
   - 新增 [`bounded.ts`](../../packages/company-pack/src/lib/shared/bounded.ts)（`Bounded<T>` 与 `takeBounded(source, cap, mode)`，向下取整并保证 `items.length + capped === total`）。
   - 在 [`company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs) 將 `Bounded`（带 `requiredProps: ['items', 'capped', 'truncated']`，排在 `PendingApprovals` 之前避免 `.truncated` 被误判遮蔽）纳入 R1 `must-use-boundary`。
   - `pendingApprovals`、`pendingAsks`、`historyCandidates` 接入 `takeBounded`；[`use-company-data.ts`](../../packages/company-pack/src/client/data/use-company-data.ts) 暴露 `activityCapped` 并在 [`company-tabs.tsx`](../../packages/company-pack/src/client/tabs/company-tabs.tsx)（`PresenceTab`）与 [`company-panels.tsx`](../../packages/company-pack/src/client/tabs/company-panels.tsx)（`PresencePanel`）通过 [`locales.ts`](../../packages/company-pack/src/client/locales.ts) `presence.activityCapped`（zh+en）诚实提示；[`cultivation-context-data.ts`](../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts) 让 `projectContextSessions` 返回 `Bounded<ContextSessionRow>`、`projectContextDeliverables` 返回 `capped` 并在 [`CultivationContextPicker.tsx`](../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx)（经 [`cultivation-actions.ts`](../../packages/company-pack/src/client/cultivation/cultivation-actions.ts) 双语 `CULTIVATION_COPY`）展示。
3. **6 大解析器 seeded 畸形 Fuzz 矩阵**：
   - 新增 [`parsers-fuzz.property.spec.ts`](../../tests/lib/shared/parsers-fuzz.property.spec.ts)（归组于镜像树 `tests/lib/shared/`），对 `takeBounded` 及 6 大解析器各跑 120 组确定性随机畸形 + 往返用例。
4. **`attention` 读模型性质 + Live↔History 同源差分测试**：
   - 新增 [`attention-parity.property.spec.ts`](../../tests/client/presence/attention-parity.property.spec.ts)，用 180 组随机工作区/历史（覆盖精确 800 条 `hasMore: false` 不误报与 `fail-closed`）+ 200 轮超越 `STREAM_ITEM_CAP` 且混入仅历史挂起项的交错序列验证 Live↔History 一致性、多重集 1:1 抵消及双通道畸形不崩溃。

## 输掉的方案

- **引入 `fast-check` 或 `StrykerJS` 到本次提交**：仓内 [`markdown-shape.property.spec.ts`](../../tests/lib/docs/markdown-shape.property.spec.ts) 已证明零依赖确定性 seeded 生成器在 Vitest 下可跑出高稳定度差分且无构建/升级税；先保持零新依赖路线，按 Tier 2 触发条件再行评估。
- **`settingsFieldProblem` 立刻拒绝数字标量**：实仓 [`startup-load.spec.ts`](../../tests/client/startup/startup-load.spec.ts) 已明确写有「`deliveryMode` 是数字 ⇒ 不报（数字是合法标量）」的 BUG-314 契约用例；保留数字标量兼容、严格阻断布尔/数组/对象，避免打破既有测试契约。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 统一有界容器原语 | [`Bounded`](../../packages/company-pack/src/lib/shared/bounded.ts) | `takeBounded` 构造；[`company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs) R1 强制消费 `.capped`/`.truncated` |
| 问询与审批共享安全提取 | [`questionsFromPayload`](../../packages/company-pack/src/lib/presence/attention.ts) / [`approvalFromPayload`](../../packages/company-pack/src/lib/presence/attention.ts) | [`attention.ts`](../../packages/company-pack/src/lib/presence/attention.ts) 与 [`attention-observers.ts`](../../packages/company-pack/src/client/wiring/attention-observers.ts) 共用 |
| 动态流与背景候选截断提示 | `presence.activityCapped` / `contextSessionsCapped` / `contextDeliverablesCapped` | [`locales.ts`](../../packages/company-pack/src/client/locales.ts) 与 [`cultivation-actions.ts`](../../packages/company-pack/src/client/cultivation/cultivation-actions.ts) 持 zh/en |

## 落地证据

- **系统改动面**：[`bounded.ts`](../../packages/company-pack/src/lib/shared/bounded.ts)、[`company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs)、[`startup-settings.ts`](../../packages/company-pack/src/lib/startup/startup-settings.ts)、[`deliverables-index.ts`](../../packages/company-pack/src/client/data/deliverables-index.ts)、[`deliverables-catalog.ts`](../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts)、[`deliverables-catalog.mjs`](../../tools/lib/company/deliverables-catalog.mjs)、[`attention.ts`](../../packages/company-pack/src/lib/presence/attention.ts)、[`attention-observers.ts`](../../packages/company-pack/src/client/wiring/attention-observers.ts)、[`attention-history.ts`](../../packages/company-pack/src/client/presence/attention-history.ts)、[`use-company-data.ts`](../../packages/company-pack/src/client/data/use-company-data.ts)、[`company-tabs.tsx`](../../packages/company-pack/src/client/tabs/company-tabs.tsx)、[`company-panels.tsx`](../../packages/company-pack/src/client/tabs/company-panels.tsx)、[`locales.ts`](../../packages/company-pack/src/client/locales.ts)、[`cultivation-context-data.ts`](../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts)、[`cultivation-actions.ts`](../../packages/company-pack/src/client/cultivation/cultivation-actions.ts)、[`CultivationContextPicker.tsx`](../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx)、[`parsers-fuzz.property.spec.ts`](../../tests/lib/shared/parsers-fuzz.property.spec.ts)、[`attention-parity.property.spec.ts`](../../tests/client/presence/attention-parity.property.spec.ts) 及对应更新 spec。
- **实跑命令**：`node tools/dev/build-client.mjs`、`pnpm lint`、`pnpm typecheck`、`pnpm coverage:ratchet`、`pnpm verify`、`pnpm dup`、`pnpm test:checks`、`node checks/lanes/ui-scene.entry.mjs --isolated --expected`、`node checks/lanes/ui-scene.entry.mjs --isolated --lang en`。

## 验证（真跑过）

- **负控 1（`metaProblemsOf` + 精准 800 页边界回归）**：临时移除 `deliverables-catalog.ts` 的 `raw.trim() === ''` 并把 `attention-history.ts` `windowTruncated` 改回 `|| records.length >= HISTORY_PAGE_MESSAGES` → `vitest run tests/lib/shared/parsers-fuzz.property.spec.ts tests/client/presence/attention-parity.property.spec.ts` 双双失败（`expected 'some' to be 'none'`、`expected [ 'kickoff 不是 YYYY-MM-DD：「   」' ] to deeply equal [ '缺行「kickoff:」', … ]`）；还原后 `16/16` 全绿。
- **独立盲审与修复闭环**：`research` 子代理 `63bcb0a5-ab60-4627-84c9-493f5f0cd870` 按 P5 盲审发现 2 项阻断（R1 `Bounded` 被 `PendingApprovals` 遮蔽导致只读 `.truncated` 误报、`approval/request` 缺 `isRecord` 在 `null`/`undefined` 时崩在 `next()` 之前）与 4 项非阻断（空白必填双重报错、`attention-parity` 缺超限与同文双问询、`PresencePanel` 同步、注释/类型清理），已全部修复。
- **全量最终回归**：代码最终修复后顺序跑完并全通：`node tools/dev/build-client.mjs` → `pnpm lint`（`oxlint` 0 warnings/errors + 静态审计 `--strict` 141 文件 0 violations）→ `pnpm typecheck` → `pnpm coverage:ratchet`（`285 passed (285)` 测试文件、`2647 passed (2647)` 用例、`coverage-ratchet: PASS（213 文件）`）→ `pnpm dup`（0 clones）→ `pnpm test:checks`（11 PASS / 0 FAIL）→ `ui-scene.entry.mjs --isolated --expected`（10 页签金样一致）& `--lang en`（10 页签零中文残留、错误环 0 命中）；并补跑 `pnpm verify` 验证结构门禁。

## 未覆盖轴

- [covered] `Bounded<T>` 静态防丢弃（含 `.capped` 与 `.truncated`）、6 大解析器 seeded 畸形 Fuzz、TS/JS `metaProblemsOf` 差分、`attention` 有界/身份/`Live↔History` 双源一致性及双语渲染 → [`parsers-fuzz.property.spec.ts`](../../tests/lib/shared/parsers-fuzz.property.spec.ts) 与 [`attention-parity.property.spec.ts`](../../tests/client/presence/attention-parity.property.spec.ts)
- [policy] `tools/` 子进程 RAII 包装（T1-4）、`vendor/` `*Face` 编译期漂移检查、Tier 2 品牌类型与 `fast-check`/StrykerJS（按实际复发触发另卡推进） → [落地路线图](../../_backlog/research/bug-prevention-and-discovery/2026-11-23-adoption-roadmap-and-stop-rules.md)
- [environment-gap] 真进程多会话实时并发 `approval/request` / `user-questions/request` waterfall 交互（keyless 冒烟为空公司盘） → [`attention-observers.spec.ts`](../../tests/client/wiring/attention-observers.spec.ts)
