状态：已交付

# 2026-11-17 CI 修理轮收据（六提交 + 全链绿态）

> 决定与机制 = [implemented/2026-11-17-ci-fresh-tree-vendor-install-and-heap](../../implemented/2026-11-17-ci-fresh-tree-vendor-install-and-heap.md) +
> [implemented/2026-11-17-fresh-checkout-pointer-and-init-stderr](../../implemented/2026-11-17-fresh-checkout-pointer-and-init-stderr.md)；本页只记跑过什么、绿在哪。

## 提交链（e724da86 → e56a637a）

| 提交 | 内容 |
|---|---|
| e724da86 | ci.yml/fresh-clone.yml 补 vendor install 步 + setup-macos NODE_OPTIONS=6144 + patch 登记 attachment WARN |
| 37a4db98 | bug-fix.md 产物指针改指构建入口 + company.mjs init stderr 回放 |
| 7a46c79f | Note 红态引用去反引号（bare-path 自伤） |
| 9279bf30 | 11 条 weekly lane ciSafe:false + 实测理由 |
| e0e8aa41 | _dist 重建（0.11.9 点态，tgz sha 8bf24126） |
| e56a637a | coverage 基线 ledger.ts branches 100→94（冷环境实测地板） |

## 绿收据（实跑）

- **ci workflow**：run 44006876227（9279bf30）GREEN——ci.yml verify job 首次在新链全绿。
- **clean clone 全链**（/tmp/dsh-company-cleanclone，金标准 origin clone）：install 2m8s → setup 全量构建 → `--check` 齐 → verify ALL PASS → test 2167 绿 → typecheck 绿 → `release --prepare` → `release --verify` **全绿**（真 tarball→干净 profile→boot→卸载→残留比对→client-load→preset-smoke→present-catalog）。
- **主仓发布点态**：`release --prepare --force` → `--verify` 全绿 → `--stamp 0.11.9 @ e0e8aa41` → `--check` **READY（7 项 pass）**。
- **本地全量**（每笔提交 pre-push enforcement 实跑）：verify ALL PASS / test 256 文件 2170 绿 / typecheck / lint 0 警告 / dup 0 克隆 / coverage-ratchet PASS（197 文件）。
- **真页面**：client-load-smoke ALL PASS；ui-scene `--isolated --expected` 金样 10 页签一致、错误环零命中。
- **真挂载**：preset-smoke 11/11（含隔离组/并发/skills 隔离），WARN 按决定③为预期。
- **fresh-clone dispatch**：run 44006907359 三 job 绿（install-verify 双 OS / install-channel）；setup-macos 的 keyless-lane 与 coverage-ratchet 修复后收据 = 修复提交后的 dispatch（本收据同批）。

## 红收据（修理前的真实红，全部来自 GitHub Actions log）

run 43998433633 / 43852645841（js-yaml + OOM）→ 44004329410（Note 指针 ×3）→ 44005588518 / 44005991302（Note 自伤反引号）→ 44004467565 / 44006907359（lane 11 红 + coverage 基线暖树过拟合）。
