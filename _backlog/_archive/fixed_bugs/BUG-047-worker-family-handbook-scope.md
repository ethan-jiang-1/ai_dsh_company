---
status: 已修
severity: P2
opened: 2026-11-09
---

# BUG-047：worker-orchestrator（及 worker-researcher）被注入公司手册，违背 worker family 的边界

> 严重级别：P2（次要）｜发现：2026-11-09｜状态：已修（2026-11-09：修复就绪 → 修复已落地 → 已修）
> 来源：2026-11-09 委派面重构后第四轮探索（W1b，worker-orchestrator 真 prompt 面）。
> 审查：agent — 对照「已修判定」逐条核过；真红→绿见「修复落地」，未跑真模型（keyless 注入面）。

## 症状

`worker-orchestrator` 的 system prompt 里出现了公司手册：

- 配置 `packages/company-pack/cordis.patch.yml` 的 `handbookSkipPresets: ['worker']` 只跳过 leaf。
- 真会话 `8143681a-4f2b-4ade-8575-3ae7cd8e52d6`（preset `worker-orchestrator`）的
  `system/message` 含 `Company content (read-only): …`（手册全文），而同轮的 leaf worker
  `fa5abf23-…` / `75ac6fca-…` 不含该段。
- 但 `worker-orchestrator` 的 persona 明写：“不读公司手册/CHARTER/journal，除非 brief 明确要求。”
  它作为 worker family 的“小工头”，按 brief 干活，不该自动拿到公司角色手册。

`worker-researcher` 同样不在 skip 列表里；它的 persona 引用了 `.dsh-company/kb/company.md`，
所以“是否要注入”需要单独决定，但当前没有显式决定，只是被 `['worker']` 漏掉。W1c 的真会话也确认：
researcher `9e7b0406-…`（preset `worker-researcher`）的 system prompt 含 `Company content (read-only):`，
而它只做了 `working_directory` / `read`，拒绝写盘。

## 根因（假设）

`registerHandbook` 的默认/配置 skip 名单只列 `worker`；`worker-orchestrator` / `worker-researcher`
是 2026-11-09 新增的 worker profile，没有同步进 `handbookSkipPresets`。`handbook.ts` 自己的注释说
“worker（执行手）不是公司角色……默认跳过 worker，未来 worker profile 由配置扩展”，但配置没有扩展。

## 暴露的失败类

**“worker family 的边界只对第一个 profile 生效”**：能力/配置按 preset id 白名单写死，新增 family
成员时默认继承“公司角色”的注入面。后果：token 税、persona 与 system prompt 矛盾（“不要读手册”却把
手册塞进上下文）、worker 可能按公司角色而非 brief 行事；researcher 的只读/角色边界也因此含糊。

## 复现

1. 创建 vp-eng 根会话，提示用 `subagent` 起 `agent_preset: worker-orchestrator`，让它带 2 个 leaf。
2. 读 `worker-orchestrator` 子会话的 `system/message`：含 `Company content (read-only):`。
3. 读 leaf worker 子会话的 `system/message`：不含该段。
4. 对照 `cordis.patch.yml` 的 `handbookSkipPresets: ['worker']` 与 orchestrator persona
   “不读公司手册/CHARTER/journal”。

关键会话（本地 durable 日志，gitignored）：

- VP-Eng：`session-2c169146-14d4-48c9-83c6-acd8025b0e47`
- orchestrator：`8143681a-4f2b-4ade-8575-3ae7cd8e52d6`
- leaf：`fa5abf23-c012-4d72-904b-772e334a4309`、`75ac6fca-0e59-48ab-afa1-83ef20d771cf`
- researcher：`9e7b0406-d45c-4a60-8ae4-6f8ea2607043`（W1c；handbook=true）

证据摘要：`runtime/tmp/explore/round4/r4-2026-11-09T09-47-02-512Z/w1b-orchestrator.json`
（gitignored；含 handbook 检查与 child header）。

## 修复关联

- `packages/company-pack/cordis.patch.yml` 的 `handbookSkipPresets`；
  `packages/company-pack/src/index.ts` 的默认值。
- `packages/company-pack/src/host/prompt/handbook.ts` 的默认/注释。
- `worker-orchestrator` / `worker-researcher` 的 persona 与 docs/presets。
- 测试：`tests/host/prompt/handbook.spec.ts` 目前只断言 `worker` 跳过；需按 family 覆盖
  `worker-orchestrator`（应跳过）与 `worker-researcher`（按决定）。

候选修法（待定）：把 `worker-orchestrator` 加进 skip；`worker-researcher` 若要读公司事实，显式
保留并写进 persona/docs，或也跳过、让它按 brief 读 `.dsh-company/kb/company.md`。不要靠“漏配”决定。

## 已修判定

- `worker-orchestrator` 的 system prompt 不再自动含 `Company content (read-only):`；
  leaf 仍不含；`worker-researcher` 的取舍有显式记录与测试。
- keyless spec 按 preset 断言 skip 名单；红形态 = 把 `worker-orchestrator` 从 skip 移除时断言红；
  还原后绿。
- 若 researcher 保留注入，docs/persona 说明“它需要公司事实”的理由，不留下“persona 说不要、系统却给”的矛盾。

## 修复落地（2026-11-09）

- **模型**：[`delegation-model.mjs`](../../../tools/lib/delegation-model.mjs) 新增
  `handbookSkipPresets()`：`archetype === 'worker'` 的全部 preset（三个）；不按 ID 列表。
- **运行时**：[`delegation-surface.ts`](../../../packages/company-pack/src/lib/delegation-surface.ts) 的
  `WORKER_FAMILY_PRESETS` 是 pack 唯一运行时表；[`handbook.ts`](../../../packages/company-pack/src/host/prompt/handbook.ts)
  默认 `skipPresets = WORKER_FAMILY_PRESETS`；`src/index.ts` 只在部署显式配置时覆盖；
  [`cordis.patch.yml`](../../../packages/company-pack/cordis.patch.yml) 删掉窄覆盖 `['worker']`。
- **researcher 取舍**：不注入；公司事实按 brief 读 `.dsh-company/kb/company.md`（persona 原本就这么写），
  researcher preset 头注同步改掉“手册由 agent-instructions 注入”的旧说法。
- **文档**：`docs/contracts/presets.md` 的 worker family 行与 researcher 说明写明“三个 profile 都不注入”。
- **真红→绿**：把 `WORKER_FAMILY_PRESETS` 收窄成 `['worker']` ⇒ **2 failed**（模型 parity +
  handbook family 用例 `worker-researcher: ... got 1`）；还原 ⇒ **17 passed**（两文件）。
- **全量**：`pnpm verify`、`pnpm test`、`pnpm typecheck` 全绿（同提交）。
- 决定与输掉的方案 = [handbook worker family Note](../../../notes/implemented/2026-11-09-handbook-worker-family.md)。
