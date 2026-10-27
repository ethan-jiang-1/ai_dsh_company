# 2026-10-12 · 工作区收敛执行器（converge.mjs）：堆积治理常态化入轮末

状态：implemented（2026-10-12 用户点名落地；推敲 owner = `_backlog/_archive/settled_issues/2026-10-12-workspace-convergence.md`——本 Note 只承载落地决定与后续缺陷修复取舍，不复述推敲）

## 问题

live 公司盘随动议持续堆积（journal 曾达 39 篇跨 5 角色、live deliverables 曾达 7 slug）：角色开工读最近 journal 的上下文被历史噪声稀释、扫盘变吵。收敛政策已有家（`snapshots/README.md` §归档动作五步）但全靠手工，摩擦高到不常做——堆积没有常态化出口。

## 决定

- **CLI = 机械执行器，政策家不变**：`tools/converge.mjs` 实现 §归档动作的可机械化子集——无参计划模式（列可收敛/未闭合 slug + journal 收割预览）、`--slug` 收敛单个（证据副本 → `snapshots/archive/convergence-<收敛日>/<slug>/` → 归档家 git mv → journal 清出留 .gitkeep → 台账行逐字自动追加）、`--dry-run`、`--charter-backfill` 补登 CHARTER 历史纪要。语义判断与政策仍归 snapshots/README §归档动作与人。
- **常态化入轮末**：`docs/guides/dev-loop.md` §12 收尾清单含收敛步（无参计划 → 逐个 --slug → --charter-backfill）；工具入口登记 = `checks/README.md`。
- **判定规则单源**：`tools/lib/converge-rules.mjs`（journal 归属 / CHARTER 条目查重锚 / 证据目录解析 / CLI 旗标解析），回归锚 = `tests/harness/converge-rules.spec.ts`（负例留证 ×3）+ `tests/harness/gitignore-guards.spec.ts`（BUG-013 的 ignore 规则守卫）。
- **证据副本只收 journal**（被从 live 删除的才需留底）；交付物本体 git mv 进 `company-workspace/deliverables-archive/`，不双份拷贝。

## 输掉的方案

- **证据副本整目录拷进 snapshots**：首轮实跑把 snapshots 顶爆 64M 预算（84.1M）——交付物本体已随 git mv 持久留存归档家，双份纯冗余。修 = journal-only。
- **journal 按 slug 前缀匹配收割**：误吞后继 slug——未闭合 `-light`/`-v2` 的 11 篇当轮记忆被清（git 恢复）。修 = 「与任何其他 slug 精确同名则排除」进 lib。
- **backfill 查重用整文件子串 includes**：被引用路径里的 slug 字样误触——COO 假跳过、ai-sprint-2026 条目漏登。修 = 条目行锚 `charterHasEntry`（BUG-014）。
- **backfill 证据路径写死运行日**：隔天补登必写断链且 exit 0 无报警。修 = 按 slug 解析真实收敛目录 + fail-loud（BUG-015）。
- **维持「用户说一句才收敛」**：堆积复发无出口、手工五步摩擦高——用户裁定按工程流程落地执行器并常态化入轮末。

## 后果

- 轮末收尾多一步（无参计划，有 ✓ 可收敛才动作）；台账行由 CLI 逐字追加（防漏记）。
- 证据副本体积随收敛线性增长——触发条件已入账 `_backlog/triggers.md`（snapshots 体积门禁红 → 冷存外置）。
- 收敛的爆炸半径 = 所有以 live 路径为锚的断言与引用——CLI 自动重指 CHARTER/implemented Note 指针，spec 锚随迁；收敛后立即全量 verify（pre-push 兜底）。
- CHARTER 历史纪要的教训性文字仍由人把守（CLI 逐字取 meta 转录，不代写判断）。

## 验证（全部实跑，2026-10-12）

- 首轮全量收敛：4 slug 收完、journal 39→12、snapshots 回预算（`pnpm verify` snapshots-budget 56.5M/64M PASS）。
- 缺陷红绿：实跑暴露缺陷 1–5，红绿收据逐条在归档卡验收表；后续评审缺陷落卡 BUG-013..017（复现收据在卡复现节），013–016 已修归档。
- 回归锚：`pnpm test tests/harness/converge-rules.spec.ts` = 13/13（parseFlags 用例实现前函数缺红）；`tests/harness/gitignore-guards.spec.ts` = 1/1（留证含删规则红 → 还原绿实跑）；全量 `pnpm verify` ALL PASS + `pnpm test` 49 文件 / 498 用例绿。
- 未验留观：隔天补登的真实现场首跑（机制已被 spec 与 fail-loud 覆盖，未自然发生——triggers 无此观察项，属低风险常态）。
