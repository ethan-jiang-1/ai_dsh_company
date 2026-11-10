---
status: 调查中
severity: P2
opened: 2026-11-10
---

# BUG-057：`/req check` / `/prd check` 的 slug 未校验，`..` 可读出 deliverables 根

> 严重级别：P2（次要）｜发现：2026-11-10｜状态：调查中
>
> **留痕**：（未修；发现于 2026-11-10 探索轮。修复时按材料性规则定 Note/commit。）

## 症状

- `/req check ../zz-outside` 返回 **success** 回执：
  `编号校验通过（../zz-outside）：…；层 = MRD/StRS/PRD；动议类型 = business-software；…`。
- `/prd check ../zz-outside` 也读到了同一个目录：返回的是内容判据错误（`opportunities[0].segment 缺失` 等），
  不是 `缺 MRD/PRD`——证明它读的是 deliverables 根**之外**的 `drafts/`。
- 两个命令都把操作员给的 slug 直接 `join(workspace, '.dsh-company/deliverables', slug, 'drafts')`；
  `path.join` 会规范化 `..`，于是 `../zz-outside` 落到 `company-workspace/.dsh-company/zz-outside`。
  `.` 与 `..` 同理（分别落到 `deliverables/drafts` 与 `.dsh-company/drafts`）。
- 影响面：只读（读 `mrd/strs/prd/syrs/irs/vv-plan/allocation.md` 与 `meta.md`，不回写、不执行）；
  但操作员命令的边界是「deliverables 目录名」，越界读取会绕过这个边界，并可能把越界路径/内容判据
  带进回执。**P2，不是 P0/P1**：本地操作员触发，读不到任意文件（只读固定文件名），不能写。

## 根因（假设）

`parseReqCheck` / `parsePrdCheck` 只校验 `check <token>` 的形状，token 本身不校验「单段目录名」；
handler 直接把 token 拼进路径，没有 `resolve` + `relative` 前缀检查。
两条命令是同一形状的两份拷贝（`req-command.ts` / `prd-command.ts`），所以修复应抽一处
`parseCommandSlug` / `resolveDeliverableDir`，而不是各打一个补丁。

## 暴露的失败类

**操作员输入 → 文件路径，没有边界校验**。检查同类消费者：`/deliverables audit <path>` 的 path 语义
（它本来就允许路径，需另判）、`/cultivation` 的 slug/路径、任何 `join(workspace, ..., rawInput)`。
本轮只确认 `/req` 与 `/prd` 两条；不把 `/deliverables` 的 path 设计当成同型缺陷。

## 复现

1. 在 `company-workspace/.dsh-company/` 下建 `zz-outside/drafts/{mrd,strs,prd}.md` 与 `meta.md`
   （内容抄 `deliverables/2026-11-10-probe-cmd-business-software`，meta 写 `编号体系: identity` +
   `产品类型: business-software`）。
2. `session/create`（cwd = company-workspace）→ `commands/execute`：
   - `/req check ../zz-outside` → success 回执（越界读到）。
   - `/prd check ../zz-outside` → 内容错误（越界读到）。
   - 对照：`/req check 2026-11-10-probe-cmd-business-software` → 正常回执。
3. 证据：2026-11-10 探索轮，web = dev home + company profile；测试 fixture 用完即删。
   注：首跑被 dev home 的陈旧 writer lease 挡住（dataBlocked，见 BUG-058）；清掉旧 holder 后复现。

## 修复关联

- `packages/company-pack/src/host/commands/req-command.ts`、`prd-command.ts`：slug 校验/目录解析。
- 共享 helper（建议 `src/lib/command-slug.ts` 或 commands 内小函数）：只允许 `^[A-Za-z0-9][A-Za-z0-9._-]*$`
  且拒绝 `.`/`..`；或 `resolve` 后 `relative(deliverablesRoot, dir)` 不得以 `..` 开头。
- `tests/host/commands/req-command.spec.ts` + `prd-command.spec.ts`：`../zz-outside` / `.` / `..` /
  `a/b` 必须返回 usage/error 且不读；合法 slug 仍绿。
- 文档：`/req check` / `/prd check` 的 usage 已说「deliverables 目录名」；修复是把这句话执行出来，
  不需要改合同语义。

## 已修判定

- `../zz-outside`、`.`、`..`、`a/b` 一律返回 usage/判别错误，**不产生** `编号校验通过` /
  `PRD 校验失败` 的越界回执；合法 slug 的回执不变。
- keyless spec 红→绿：先在 handler 上注入 `../zz-outside` 断言无越界回执（红），修后绿；
  负例里放一个真实 `drafts/` 在 deliverables 根外，证明确实读不到。
- 真入口复跑一次同 fixture（清 lease 后）→ 越界 slug 被拒；`pnpm verify` + `pnpm test` 绿。
