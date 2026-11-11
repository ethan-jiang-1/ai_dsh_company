# 2026-11-11 · 接手 gap 第三轮：pnpm 同钉、首跑路径、pre-publish READY 与角色计数

状态：implemented（用户 2026-11-11 直接授权：静默自主补齐第三轮接手审计 gap）
上游 = [handoff-gap-closure-round2](2026-11-11-handoff-gap-closure-round2.md)（clean-clone setup、prepack、卸载对账、CI）。本文收口 2026-11-11 只读诊断新发现的第三轮 gap。

## 决定

1. **root pnpm 对齐 vendor：`pnpm@11.7.0` → `pnpm@11.28.5`。** vendor 随 `dsh-v0.2.1-rc.5` 已是 11.28.5；bootstrap 却写“逐字一致”。先只改 root `packageManager`，`pnpm install --lockfile-only` 无 lock 变更、`pnpm install --frozen-lockfile` 通过。新增 `checks/gates/package-manager-parity.mjs`：两处必须都存在、都是 `pnpm@x.y.z` 且逐字相等，否则红。
2. **首跑顺序写全：`pnpm setup` → `pnpm bundle:init` → `pnpm company`。** 原 AGENTS 首跑句从 setup 直接跳 company，但 `tools/company.mjs` 在 workspace 缺失时要求先 bundle:init；CI 也先跑 bundle:init。命令表已补 `pnpm setup` 无参数、带 flags 必须 `node tools/setup.mjs ...`（setup-invocation spec 已有守卫）。
3. **pre-publish READY 说清楚，不删哨兵。** `market-index.staged.json` 在场时 `release --check` 默认拒绝 READY 是设计，不是坏；AGENTS 命令表与 release runbook 改为显式 `--allow-pre-publish-index`，publish 后删 staged 再跑默认 check。保留哨兵 = 防止把未发布版本当可托管索引。
4. **角色计数改六：`cordis.patch.yml` 两处“五个角色” → “六个公司角色”。** `preset-clock` 实际命中 ceo/vp-eng/vp-sales/coo/cfo/cmo 六个；CMO 增设时清了 AGENTS/market，补丁注释漏了。新增 `tests/harness/repo/role-count-claims.spec.ts`：六个公司角色各声明 `preset-clock`，随包补丁注释不得再出现“五个角色”。
5. **源码 clone 与发行两件套分开说。** `_dist/` 在 clean clone 只有 tracked 的《安装手册》，tarball 由 `pnpm release --prepare` 生成；README 的开发者入口补这一句，收件人仍用发行两件套。
6. **版本 0.11.5。** `cordis.patch.yml` 是随包内容，按版本纪律“改内容必 bump”同 diff 重导 `_dist`（tarball/手册/manifest/market index/staged 同步）；不带旧 0.11.4 字节继续。

## 输掉的方案

- **保留 root 11.7.0，只把 bootstrap 改成“双 pin”**：能消除假声明，但违反仓的“与 vendor 逐字一致”合同，clean clone 仍用两套 pnpm；对齐后 lock 无变化，成本更低。
- **改 vendor 的 packageManager 到 11.7.0**：vendor 是钉 SHA 只读；升 pin 才能动，代价远大于 root 对齐。
- **删 `market-index.staged.json` 让默认 check 变绿**：会把 0.11.5 的未发布预览误标成可托管；保留哨兵 + 文档 flag 才是真语义。
- **只改注释、不 bump/不重导**：`cordis.patch.yml` 随包分发，源/产物会立刻漂移；按版本纪律 bump。
- **把“五个角色”只改成“各角色”不写数**：更耐漂，但本轮先与六角色事实对齐；计数守卫由 spec 兜。
- **改生成的手册模板来写“源码 clone 无 tarball”**：手册是收件人路径，收件人本来就拿到两件套；源码 clone 说明归根 README。

## 证据

- `corepack pnpm --version` → 11.28.5；`corepack pnpm install --lockfile-only` → 430ms，`git diff --numstat -- pnpm-lock.yaml` 空。
- `pnpm install --frozen-lockfile` → `Already up to date`，`Done in 389ms using pnpm v11.28.5`。
- `pnpm verify` → `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）`；新增 `PASS package-manager-parity (pnpm@11.28.5)`、`gate-wiring ×70`。
- `pnpm test` → `Test Files 193 passed (193)` / `Tests 1554 passed (1554)`。
- `pnpm typecheck` → exit 0；`pnpm lint` → 0 warnings/0 errors；`pnpm dup` → 0 clones。
- `pnpm exec vitest run tests/harness/repo/role-count-claims.spec.ts tests/harness/repo/setup-invocation.spec.ts` → 3 passed。
- `node tools/checks-index.mjs --write` → `checks-index: 已生成 …（137 行）`；script-index 绿。
- `pnpm release --prepare` → `export-dist: ALL PASS`；tarball `0.11.5` 259 entries；sha256 `d1d7c14e924f324571c47e063549816c95c40b6db063ab85abbad3057126f730`；手册 0.11.5。
- `pnpm release --verify` → `release: verify 全绿；提交后跑 --check`（verify/test/release-smoke/company-entry/client-load/preset/present-catalog 全 pass；preset 11/11）。
- `release --check --allow-pre-publish-index` 的 READY 行见当轮回复（stamp 后给出 release commit SHA）。

## 未验

- `release --check` 的 READY 是点态：见当轮回复的 stamp 后 READY 行；本 Note 不预写未跑的输出。
- clean clone 重跑仍按 round2 证据（`337c2db6`）；本轮是 warm checkout。
- GitHub Actions 的 `setup-macos` 未在 GitHub 上执行；Desktop/Windows、真模型多轮行为未认证。

## 相关

- 第三轮只读诊断：2026-11-11 接手成本评估（报告在当轮回复，未落盘）。
- 运行合同：[release](../../docs/contracts/release.md) · [bootstrap](../../docs/guides/bootstrap.md) · [tests/README](../../tests/README.md)。
