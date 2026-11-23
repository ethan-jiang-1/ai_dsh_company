---
status: 已结
opened: 2026-11-23
---

# 落地：六大解析器畸形 Fuzz、Bounded<T> 边界原语与 Live↔History 同源差分（质量预防二期）

> 立卡：2026-11-23 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 批准：用户 2026-11-23「那种事最合理的, 长期是正确的, 我就选择哪个, 如何? 推进吧」 ｜ 可关闭：是 ｜ 审查：agent（独立只读盲审 `63bcb0a5-ab60-4627-84c9-493f5f0cd870` 发现 2 阻断 + 4 非阻断，已全部修复并复验通过）
>
> **结论/去向**：`note` — [实施Note](../../../notes/implemented/2026-11-23-fuzz-bounded-differential-guards.md)
>
> 来源：[缺陷预防与非 E2E 发现手段研究](../../research/bug-prevention-and-discovery/README.md)（[落地路线图](../../research/bug-prevention-and-discovery/2026-11-23-adoption-roadmap-and-stop-rules.md) T1-1 / T1-2 与 [定制工具方案](../../research/bug-prevention-and-discovery/2026-11-23-custom-linters-and-feasibility-audit.md)）。

**问题与期望结果：** 首批质量预防卡已建立静态猎手（R1/R2/R3/R4）、hooks 门禁、双语满态扫面与全 Slot 真挂载；但实证解剖指出占比 **55%** 的高发家族（F1 有界截断 13 张 + F2 解析器宽松吞错 7 张 + F4 活体↔历史多源分裂 7 张）仍缺少「生成式畸形 Fuzz + 统一有界原语 + 双源同源差分」自动防线。代码核查同时直接暴露出多处现行隐患：`startup-settings.ts` 缺 `productTypes`/`deliveryModes` 数组元素与 `wikiCheck` 对象形状校验；`deliverables-index.ts` 未对空白 `slug`/`path` 与可选串字段错型过滤；`metaProblemsOf` 对空必填值漏报；`attention-observers.ts` 直接对 `request.questions.map` 解引用且未与 `questionListOf` 共享提取；`use-company-data.ts` 与 `cultivation-context-data.ts` 存在静默 `.slice` 未报截断计数。本卡零新依赖推进 Tier 1 核心防线，把解析、有界读取与活体↔历史一致性收成自动化性质/差分契约。

**当前情况：**
- 6 大解析器仅有单点样例测试，尚无系统化畸形变异 Fuzz；`markdown-shape.property.spec.ts` 已验证 seeded 生成式矩阵在本仓性价比极高。
- `attention` 读模型已有 `AttentionBoundaries` 与 `pendingAsks`，但尚缺统一 `Bounded<T>` 原语及针对 `registerAttentionObservers` ↔ `pendingAsks` 的随机序列同源差分 oracle。

## 范围与排除项

**范围（四件套，零新第三方依赖）：**
1. **加固 6 大解析器与双源共享问题/审批提取**：
   - [`packages/company-pack/src/lib/startup/startup-settings.ts`](../../../packages/company-pack/src/lib/startup/startup-settings.ts)：`parseStartupOptionsState` 校验 `productTypes`/`deliveryModes` 数组元素全为 `string` 且 `wikiCheck` 在场时必须为非数组对象，否则报 `unreadable`（保留 `settingsFieldProblem` 对 legacy 数字标量的既有 `startup-load` 兼容，严拦布尔/数组/对象）。
   - [`packages/company-pack/src/client/data/deliverables-index.ts`](../../../packages/company-pack/src/client/data/deliverables-index.ts)：`parseCatalog` 对 `slug`/`path` 先 `trim()` 再判空，并将 `kickoff`/`type`/`result`/`summary`/`dir`/`metaProblem` 在场却给错类型的条目跳过计入 `skipped`。
   - [`packages/company-pack/src/lib/deliverables/deliverables-catalog.ts`](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts) 与 [`tools/lib/company/deliverables-catalog.mjs`](../../../tools/lib/company/deliverables-catalog.mjs)：`metaProblemsOf` 统一 `.trim()` 判必填与格式，避免空白必填值双重报错且保持 TS/JS 同口径。
   - [`packages/company-pack/src/lib/presence/attention.ts`](../../../packages/company-pack/src/lib/presence/attention.ts) 与 [`packages/company-pack/src/client/wiring/attention-observers.ts`](../../../packages/company-pack/src/client/wiring/attention-observers.ts)：抽取共享 `questionsFromPayload(payload)` 与 `approvalFromPayload(payload)`，消除观察者对 `null`/`undefined`/非数组 `questions` 同步崩溃，`mergeAttention` 跨源问询改计数多重集（1:1 抵消）。
2. **新增 `Bounded<T>` 边界原语 + R1 静态审计纳管 + 收敛现有静默 `.slice`**：
   - 新增 [`packages/company-pack/src/lib/shared/bounded.ts`](../../../packages/company-pack/src/lib/shared/bounded.ts)（`Bounded<T>` + `takeBounded`）。
   - 在 [`checks/lib/company-static-audit.mjs`](../../../checks/lib/company-static-audit.mjs) 将 `Bounded`（带 `requiredProps`）纳入 R1 `must-use-boundary`。
   - 接入 `pendingApprovals`、`pendingAsks`、`historyCandidates`；改造 [`use-company-data.ts`](../../../packages/company-pack/src/client/data/use-company-data.ts)（`activityCapped` 并在 `PresenceTab` / `PresencePanel` 经 `locales.ts` zh+en 提示）与 [`cultivation-context-data.ts`](../../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts)（`projectContextSessions` 返回 `Bounded`、`projectContextDeliverables` 返回 `capped` 并在 [`CultivationContextPicker.tsx`](../../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx) 提示）。
3. **6 大解析器 seeded 畸形 Fuzz 矩阵**：
   - 新增 [`tests/lib/shared/parsers-fuzz.property.spec.ts`](../../../tests/lib/shared/parsers-fuzz.property.spec.ts)，覆盖 `takeBounded` 与 6 大解析器。
4. **`attention` 读模型性质 + Live↔History 同源差分测试**：
   - 新增 [`tests/client/presence/attention-parity.property.spec.ts`](../../../tests/client/presence/attention-parity.property.spec.ts)，验证有界充要条件（含 800 条无截断边界）、身份不塌缩、超限与混合 Live↔History 同源一致及双通道畸形防护。

**明确排除项：**
- 不引入新 npm 依赖（不装 `fast-check` / `StrykerJS` / `knip`）。
- 不在本卡改造 `tools/` 子进程 RAII、品牌类型或全仓 57 处静默 `catch` 大改造。
- 不改 `vendor/` 与角色 `content/presets`。

## 验收标准

1. `pnpm lint`、`pnpm typecheck`、`pnpm dup`、`pnpm test:checks`、`pnpm coverage:ratchet`、`pnpm verify` 全绿。
2. `parsers-fuzz.property.spec.ts` 与 `attention-parity.property.spec.ts` 全绿并带真实负控红→绿留证。
3. 通过 `ui-scene.entry.mjs --isolated --expected` 与 `--lang en` 真浏览器冒烟。
4. 通过独立 `research` 子代理 P5 盲审、产出 `notes/implemented/2026-11-23-fuzz-bounded-differential-guards.md` 并归档。

## 关闭条件

- 完成上述全部验收标准、通过独立盲审、补齐 `## 落地证据` 与 `审查：`，迁档 `settled_issues/`。

## 落地证据

- **系统改动面**：[`bounded.ts`](../../../packages/company-pack/src/lib/shared/bounded.ts)、[`company-static-audit.mjs`](../../../checks/lib/company-static-audit.mjs)、[`startup-settings.ts`](../../../packages/company-pack/src/lib/startup/startup-settings.ts)、[`deliverables-index.ts`](../../../packages/company-pack/src/client/data/deliverables-index.ts)、[`deliverables-catalog.ts`](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts)、[`deliverables-catalog.mjs`](../../../tools/lib/company/deliverables-catalog.mjs)、[`attention.ts`](../../../packages/company-pack/src/lib/presence/attention.ts)、[`attention-observers.ts`](../../../packages/company-pack/src/client/wiring/attention-observers.ts)、[`attention-history.ts`](../../../packages/company-pack/src/client/presence/attention-history.ts)、[`use-company-data.ts`](../../../packages/company-pack/src/client/data/use-company-data.ts)、[`company-tabs.tsx`](../../../packages/company-pack/src/client/tabs/company-tabs.tsx)、[`company-panels.tsx`](../../../packages/company-pack/src/client/tabs/company-panels.tsx)、[`locales.ts`](../../../packages/company-pack/src/client/locales.ts)、[`cultivation-context-data.ts`](../../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts)、[`cultivation-actions.ts`](../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts)、[`CultivationContextPicker.tsx`](../../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx)、[`parsers-fuzz.property.spec.ts`](../../../tests/lib/shared/parsers-fuzz.property.spec.ts)、[`attention-parity.property.spec.ts`](../../../tests/client/presence/attention-parity.property.spec.ts)、[`实施Note`](../../../notes/implemented/2026-11-23-fuzz-bounded-differential-guards.md)。
- **实跑命令**：`node tools/dev/build-client.mjs`、`pnpm lint`（0 warnings/errors + static-audit `--strict` 141 文件 0 violations）、`pnpm typecheck`、`pnpm coverage:ratchet`（285/285 files, 2647 tests PASS, 213 文件覆盖率棘轮 PASS）、`pnpm verify`、`pnpm dup`（0 clones）、`pnpm test:checks`（11 PASS / 0 FAIL）、`ui-scene.entry.mjs --isolated --expected` & `--lang en`（10 页签均 ALL PASS）。
