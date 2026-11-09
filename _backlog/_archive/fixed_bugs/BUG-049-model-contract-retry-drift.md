---
status: 已修
severity: P2
opened: 2026-11-09
---

# BUG-049：delegation-model 声明面漂移——两个已落合同仍标 `planned`，`subagent_retry` 注册/深度不在模型

> 严重级别：P2（次要）｜发现：2026-11-09｜状态：已修（2026-11-09：修复就绪 → 修复已落地 → 已修）
> 来源：2026-11-09 委派面重构后第四轮探索（K1 静态/合同对账）。
> 审查：agent — 对照「已修判定」逐条核过；实跑的红/绿见「修复落地」，未跑真模型（本卡是静态/声明面）。

## 症状

模型自称“唯一期望源”，但静态声明与实现/运行时不一致：

1. [`tools/lib/delegation-model.mjs`](../../../tools/lib/delegation-model.mjs) 的 `CONTRACTS`：
   - `policy.delegation.status = 'planned'`，但共享 skill 已落并在六个 full role 挂载；
   - `engine.workflow.status = 'planned'`，但 `company:workflow-contract` section 与
     `content/contracts/workflow.md` 已落（vp-eng 真 systemPrompt 命中）。
   - `engine.subagent.status = 'planned'` 仍可解释（没有独立 section；并入 policy），但现状没有写清。
2. `subagent_retry` 的**生产注册面**在
   [`src/index.ts`](../../../packages/company-pack/src/index.ts) 硬编码为
   `allowedPresets: ['vp-eng','vp-sales','coo','cfo','cmo']`，默认 `maxDepth: 3`；
   模型里只有 `RETRY.subagent.runtimeTool = 'subagent_retry'`，没有注册 preset 列表，也没有深度。
3. `COMPOSITIONS.*` 没有任何 retry 字段；`tests/presets` 的模型/组合 spec 全绿，因为它们不检查
   contract `status`，也不检查 retry 注册面/深度。

这与 [BUG-045](BUG-045-subagent-retry-depth-budget-bypass.md) 直接相关：模型不知道 retry 的深度面，
所以静态矩阵无法阻止“CMO 行 2、retry 3”的分裂。

## 根因（假设）

P1 落地时模型把合同 `status` 写成 `planned`（当时确实未落载体）；P2/P3 把 policy skill 与 workflow
section 落掉后，没有回填 `status`。`subagent_retry` 是 P4 新增的 host 原语，只进了运行时与 keyless
spec，没有进“唯一期望源”的模型字段；`src/index.ts` 的注册列表是第二个事实家。

## 暴露的失败类

**“唯一期望源不覆盖后加能力”**：新工具/新合同只落在实现与测试，没有回填模型；静态门禁仍绿，
但模型已经不能回答“这个能力属于谁、最大深度是多少、哪些 preset 有”。这类漂移会让
[BUG-045](BUG-045-subagent-retry-depth-budget-bypass.md) 这种路径预算分裂无法被矩阵发现。

## 复现

- 读 `tools/lib/delegation-model.mjs` 的 `CONTRACTS` / `RETRY` / `COMPOSITIONS`；
- 读 `packages/company-pack/src/index.ts` 的 `registerSubagentRetry(...)`；
- 读 `packages/company-pack/cordis.patch.yml` 的 `handbookSkipPresets`（另见
  [BUG-047](BUG-047-worker-family-handbook-scope.md)）；
- 跑 `pnpm test tests/presets`：全绿，但不覆盖上述漂移。

证据摘要：`runtime/tmp/explore/round4/k0.json`（gitignored；K0 静态对账输出）。

## 修复关联

- `tools/lib/delegation-model.mjs`：`CONTRACTS.*.status`、retry 的注册面/深度/幂等门；
  `COMPOSITIONS.*` 或 `RETRY` 至少声明“哪些 preset 有 retry、每个 preset 的上限”。
- `packages/company-pack/src/index.ts`：注册列表从模型/常量读取，或由 spec 反查；
  避免两处事实家。
- `tests/presets/delegation-model.spec.ts` / `delegation-contract.spec.ts`：断言
  “已落 carrier 的 contract 不得是 planned”、“retry 注册面/深度与模型一致”。
- 与 BUG-045 的修法联动：retry 深度必须按 preset 解析；模型是解析的来源之一。

## 已修判定

- `policy.delegation` / `engine.workflow` 的 `status` 与真实载体一致；`engine.subagent` 的
  “planned/merged”状态写明，不留含糊。
- 模型声明 `subagent_retry` 的注册 preset 与深度策略；spec 在 host 注册面或模型漂移时红。
- `pnpm test tests/presets` 含一条红形态：把 CMO 的 retry 深度/注册从模型里改掉 → 断言红；
  还原后绿；不再出现“模型不知道 retry 深度”的空白。

## 修复落地（2026-11-09）

- **模型**：[`delegation-model.mjs`](../../../tools/lib/delegation-model.mjs) 的 `CONTRACTS` 改为
  `delivered`（`policy.delegation` / `engine.workflow`，带真实 `carrierPath`）/ `merged`
  （`engine.subagent` → `policy.delegation`）；`RETRY.subagent` 声明 `childPreset` 与
  `depth: 'caller-generic-subagent-row'`；新增 `retrySurface()`，只从
  `COMPOSITIONS.*.depthRows.subagent` 派生（full role）。
- **运行时**：[`retry-policy.ts`](../../../packages/company-pack/src/lib/retry-policy.ts) 的
  `SUBAGENT_RETRY_SURFACE` 是唯一注册来源；[`src/index.ts`](../../../packages/company-pack/src/index.ts)
  不再硬编码 preset 列表。
- **parity spec**：[`delegation-retry.spec.ts`](../../../tests/presets/delegation-retry.spec.ts) 钉
  运行时表 == 模型 `retrySurface()` == 各 preset YAML 通用 `subagent` 行；
  [`delegation-model.spec.ts`](../../../tests/presets/delegation-model.spec.ts) 钉 `delivered` 的
  `carrierPath` 文件存在、`merged` 的 `mergedInto` 可解析。
- **真红→绿**：`policy.delegation.status` delivered→planned ⇒ 模型 spec **1 failed**
  （`expected 'planned' to be 'delivered'`）；还原 ⇒ **10 passed**。
  `SUBAGENT_RETRY_SURFACE.presets.cmo` 2→3 ⇒ retry parity spec **2 failed**；还原 ⇒ **9 passed**。
- **全量**：`pnpm verify`、`pnpm test`（166 files / **1331 tests**）、`pnpm typecheck` 全绿（同提交）。
- 决定与输掉的方案 = [single-source Note](../../../notes/implemented/2026-11-09-delegation-surface-single-source.md)。
