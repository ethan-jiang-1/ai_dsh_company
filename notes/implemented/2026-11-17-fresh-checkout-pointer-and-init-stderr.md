状态：implemented

# 新鲜 checkout 的活指针与静默 init 收口（bug-fix 指针 ×3 + company init stderr）

> 2026-11-17 CI 修理轮的连带发现。前序 Note = [2026-11-17-ci-fresh-tree-vendor-install-and-heap](./2026-11-17-ci-fresh-tree-vendor-install-and-heap.md)（vendor install + heap）；本篇是它揭开后的第二层「本地绿≠CI绿」。搜过 notes/：无既有 owner 拥有「构建产物不做导航指针」与「dev 启动器 init 失败现场」两处决定；bug-fix.md 指针属事实落点随改动就地改新（N5），不需翻案。

## 决定

1. **[_backlog/methods/bug-fix.md](../../_backlog/methods/bug-fix.md) 三处「rebuild 后重建 client 产物」的指针从 client 构建产物路径改到构建入口 `packages/company-pack/tsdown.config.ts`，并注明产物是
   gitignored 构建输出、fresh checkout 上不存在。** 依据：`lib/**` 是产物，rebuild/rename 都会动它——
   「怎么重建」的导航指针语义就该指入口；bare-path 门禁在新鲜 checkout 上判「活指针腐化」是正确行为
   （CI run 44004329410 三 FAIL 实证，本地绿只因暖树 lib 在场）。
2. **[tools/dev/company.mjs](../../tools/dev/company.mjs) 的 web 模板 profile 初始化从 `stdio:'ignore'`
   改为捕获 stderr 并在失败时回放后退出非零。** 依据：clean clone 首跑 `pnpm company --no-open` 曾
   exit 1 于初始化步而 stderr 全吞（2026-11-17 10:34 现场，重试即绿、根因未复现）——失败必须点名；
   成功路径依旧安静。归可诊断性缺口（失败指向具体步骤 + 现场），非产品行为改动。

## 输掉的方案

- **给 bare-path 加「构建产物路径豁免」**：产物路径当导航指针的先例不能开——产物随构建漂，指针迟早再腐；
  且门禁改判据需要独立红绿登记，成本高于收益。指针改指入口一行解决。
- **把 `lib/**` 收进 git**：违反「源码/产物面不混」纪律（AGENTS 纪律表），且 pack `files` 门禁（pack-files）
  本来就禁止中间产物进包。
- **init 失败后自动重试一次**：把诊断变成抽签——失败该停在该停的地方让人看见，不是碰运气过。

## 状态事实与载体

- **现状事实**：bug-fix.md 的 client 重建指引指构建入口；`pnpm company` 的 init 失败回放 stderr（成功安静）。
- **载体**：照 bug-fix.md 做 client 改动的 agent（指针现状）；fresh clone 首跑撞 init 失败的人（stderr 现场）。
- **形状一致性**：本 Note 与上述两文件同 diff；门禁判据原文以 [checks/gates/bare-path.mjs](../../checks/gates/bare-path.mjs) 为家。

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| 指针 · 新鲜 checkout | install/CI（活指针腐化） | CI run 44004329410 bare-path 三 FAIL 点名 bug-fix.md:31/120/193 的 client 产物指针（lib/client.js，双树均无——红态引用不带反引号，防本门禁自伤）；修复后本地 verify ALL PASS（CI 绿收据 → receipts） |
| init 可诊断性 | 静默失败（typed 输出缺失） | 负控：`DSH_HOME` 指向只读目录跑 `node tools/dev/company.mjs --no-open` → init 必败且 stderr 回放可见（本 Note 同轮实跑）；此前同场景 `stdio:'ignore'` 只剩一行「步骤失败」 |
| clone 首跑恢复 | — | clone 树 `/tmp/dsh-company-cleanclone`：重跑 init 成功建 profile（PROFILE_CREATED）；后续 `release --verify` 全链收口（同轮实跑） |

## 未覆盖轴

- [environment-gap] clone 首跑 init exit 1 的原始根因未复现（单次现场，重试即绿；EPERM 复现路径为错 home 撞沙箱非同因）→ 证据通道 = [tools/dev/company.mjs](../../tools/dev/company.mjs) 的 stderr 回放（下次再咬会自带现场）
- [covered] `tsdown.config.ts` 是 pack 两面的构建入口 → 锚 = [packages/company-pack/tsdown.config.ts](../../packages/company-pack/tsdown.config.ts)
- [policy] 本轮独立机械修复走 commit 载体（bug-fix.md §7 无卡快修判据；两处均不触材料面）→ 锚 = [_backlog/AGENTS.md](../../_backlog/AGENTS.md)
