---
status: 已修
severity: P2
opened: 2026-11-10
---

# BUG-054：dev/rehearsal 盘缺 `policy-lines.md` / `review-protocol.md`，COO/CFO 判据闭合不了

> 严重级别：P2（次要）｜发现：2026-11-10｜状态：已修（2026-11-10：调查中 → 修复就绪 → 修复已落地 → 已修）
>
> 来源：第八轮 exploratory test（[问题卡](../../issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)）；
> 证据 = `runtime/team-role-packet-exploratory-2026-11-10.json`（gitignored）与 COO 输出
> `runtime/rehearsal-workspace/.dsh-company/deliverables/2026-11-10-probe-team-role-packet/drafts/coo.md`。
> 留痕：commit `684d09db`（非材料性；只动 `tools/` + tests + 指南事实句，根因与影响面在 commit message）。
> 修复 = `tools/lib/kb-seeds.mjs`（seed.json 唯一读取面）+ 两条旁路改走它；旁路不再维护第三份清单。
> 审查：agent — 对照「已修判定」逐条核过；红→绿与真入口见「修复落地」。

## 症状

team 角色包探针里，COO 成员按角色包读了 CHARTER 与两份 skill，但写出的核查反复标「并行上限/预算线的
唯一事实家文件缺失，越线判据无法闭合」：`runtime/rehearsal-workspace/.dsh-company/kb/policy-lines.md`
与 `review-protocol.md` 不存在。dev 的 `company-workspace/.dsh-company/kb/` 也缺这两个文件。
COO/CFO 的 CHARTER 与公司手册都指向 `.dsh-company/kb/policy-lines.md`，缺文件时它们只能把预算/审批
判据标成「待确认」。

## 根因（确认，2026-11-10）

不是生产 bootstrap 的问题：`content/kb-setup/seed.json` **有** `company/policy-lines.md` 与
`company/review-protocol.md` 两条 seed，真实 `bootstrapCompanyWorkspace` 会补。
缺口在 dev/rehearsal 两条旁路：

- `tools/lib/rehearsal.mjs` 的 `mirrorCompanyReference` 只复制 `state/{company,org,owners,motion-ledger,
  process-docs}.md` 与 charters，没有复制 `company/policy-lines.md` / `company/review-protocol.md`；
- `tools/bundle-init.mjs` 也只复制 `company.md / org.md / owners.md / motion-ledger.md`，没有复制
  `company/` 下的政策/复核文件。

**实测比假设更大**：红 spec 显示 mirror 只有 10 个 kb 文件，而生产 seed 是 14 个；除上面两份外还缺
`process-docs.md` 与 `AGENTS.md`。原假设里「charters/process-docs 已对」**被证伪**——
`mirror` 抄的 source `content/state/process-docs.md` 早已不存在（`copy` 是静默 no-op），而
`AGENTS.md` 从未进过旁路清单。静默跳过 source 缺失正是这个失败类的一部分。

结果：dev/探针/排练盘与生产 seed 不同形，COO/CFO 在探针里看到的是缺判据的公司盘。这属于
「fixture 与真实 bootstrap 不同形」的失败类，不是角色行为错。

## 暴露的失败类

**探针/排练盘 ≠ 生产 bootstrap 盘**：同一条 `kb/` 路径，在两套初始化路径下内容不同；探针的
「缺文件」结论会被误读成产品缺陷。横切排查：`bundle:init`、`mirrorCompanyReference`、`seed.json`
三处清单**不同步就是这一类**——实测 mirror 与 seed 差 4 个文件（policy/review/process-docs/AGENTS），
不是「charters/process-docs 已对」。修法不是逐项补，而是让两条旁路只从 seed.json 派生。

## 复现

```sh
ls company-workspace/.dsh-company/kb/policy-lines.md   # 修前不存在
ls runtime/rehearsal-workspace/.dsh-company/kb/policy-lines.md   # 修前不存在
pnpm exec vitest run tests/harness/tools/kb-seeds.spec.ts   # 修前：mirror 10 件 vs seed 14 件红
node runtime/team-role-packet-exploratory-2026-11-10.mjs
# 读输出 drafts/coo.md：COO 标「policy-lines / 并行上限缺失」
```

对照：`packages/company-pack/content/kb-setup/seed.json` 有两条 seed；
`packages/company-pack/src/host/run-bundle/bootstrap.ts` 走 seed，生产路径正常。

## 修复关联（实际做法）

- 新增 `tools/lib/kb-seeds.mjs`：读 `seed.json`、过滤 `.dsh-company/kb/` 目标、复制（`onlyMissing`
  对齐生产只补缺语义）；缺清单 / 坏 JSON / target 越界 / **缺源都 fail-loud**（静默跳过正是本卡失败类）。
- `mirrorCompanyReference` 与 `bundle-init` 改走同一复制面，不再各维护文件清单。
- 新增 `tests/harness/tools/kb-seeds.spec.ts`：与生产 `readSeeds` 同清单 + fresh workspace 文件逐一
  对同字节 + `onlyMissing` 不覆盖 + mirror 清单一致 + bundle-init 接线。任一侧漏文件即红。
- 同 diff 更新 `docs/guides/bootstrap.md`、`docs/guides/environments.md`、`tools/rehearsal-init.mjs`
  里「复制什么」的事实句（原句仍写 templates/符号链接，已过期）。

## 修复落地（2026-11-10）

- 红：`pnpm exec vitest run tests/harness/tools/kb-seeds.spec.ts` → 2 failed；mirror 实测 10 件，
  缺 `policy-lines.md` / `review-protocol.md` / `process-docs.md` / `AGENTS.md`；bundle-init 未接
  `seedKbFiles`。
- 绿：同一命令 → **5 passed**。
- 真入口：`node tools/rehearsal-init.mjs` 后 `runtime/rehearsal-workspace/.dsh-company/kb/` 含
  `policy-lines.md` / `review-protocol.md` / `process-docs.md` / `AGENTS.md`。
- dev 盘：对 `company-workspace` 跑生产 `bootstrapCompanyWorkspace`（与 app 首启同一函数）→
  created = `policy-lines.md`、`review-protocol.md`、`AGENTS.md`；skipped = 33（只补缺，不覆盖）。
- 真模型复跑：`node runtime/team-role-packet-exploratory-2026-11-10.mjs` → COO v2 稿明说
  v1 的「policy-lines.md / review-protocol.md 不存在」已被本盘实测推翻；`policy-lines.md` 12 行 /
  `review-protocol.md` 12 行均在场（证据 `runtime/team-role-packet-exploratory-2026-11-10.json`，
  gitignored）。
- 证据家：`tests/harness/tools/kb-seeds.spec.ts`（回归）；conversation evidence 见提交说明。

## 已修判定

- fresh dev workspace 与 fresh rehearsal workspace 的 `.dsh-company/kb/` 都含
  `policy-lines.md` / `review-protocol.md`；
- COO/CFO 角色包探针不再报「唯一事实家文件缺失」；
- parity spec 在任一侧漏文件时红，补齐后绿；`pnpm verify` / `pnpm test` 绿。
