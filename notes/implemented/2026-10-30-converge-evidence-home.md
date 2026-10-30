# 收敛证据家：journal 随归档件走，`snapshots/archive` 退役（2026-10-30）

状态：implemented（2026-10-30；起因 = notes/ 分诊时发现「下一次真收敛会让 `snapshot-index` 变红」；
顺手撞出第二个洞：run bundle 后 `company-workspace/` 整树 gitignored，归档步的 `git add` 对忽略路径必败。
授权 = 用户「能长远做，把它做对」的长期治理目标）

## 问题

两条互相独立的断裂叠在同一个工具上：

1. **证据落点已死**：`tools/converge.mjs` 仍把 journal 副本写到
   `snapshots/archive/convergence-<日期>/<slug>/`，但 [snapshots/README](../../snapshots/README.md)
   自 2026-10-25 起声明产品仓**只留合成场景**，且 `snapshot-index` 门禁把 `archive` 桶里未登记的目录判红。
   真收敛一次 = 盘上多一个未登记场景 = `pnpm verify` 红。10-25 后没真收敛过，所以一直绿。
2. **归档步的 git 动作已不成立**：D45/D46 后 `company-workspace/` 整树 gitignored，而
   `archive-move` 仍对归档路径做 `git add -A`；git 对显式给出的忽略路径直接 fatal。
   即使证据落点修好，收敛也会在第一篇 journal 之后崩在搬移步。

两者都不是“文档旧了”，是**工具按过期世界运行**。分诊只改 Note 会把地雷留在原地。

## 决定

1. **证据家 = 归档件自己的 `journal/`**：`deliverables-archive/<目录>/journal/<role>/<file>`。
   journal 是交付物的 provenance，随交付物一起归档、一起备份、一起搬 home；单一持久拷贝，
   不再另造 `snapshots/archive/convergence-*`。
2. **收敛顺序改为**：journal 副本写入活跃交付物 `journal/` → fs rename 搬进归档家（副本随行）→
   清 live journal（留 `.gitkeep`）→ 台账行 → 索引重建。`rewriteRefs` 把 CHARTER / implemented Note
   里的 live journal 指针改指归档件路径。
3. **归档搬移 = 纯 fs rename**：删除 `archiveGitArgs` / `git add` 分支。workspace 是业务盘、不是 git 面；
   收敛不再假装 stage 交付物。
4. **`charterBackfill` 不再解析 `convergence-*` 日期目录**：直接看归档件 `journal/` 是否在场；
   历史收敛没有副本时，写“历史收敛未留 journal 副本”，不再因找不到目录而 fail。
5. **删除 `archive-move-probe`**（它认证的 git add 面已不存在；git 历史保留）；现行端到端证据 =
   [converge-e2e-probe](../../probes/fs-taskboard/converge-e2e-probe.mjs)。

## 输掉的方案

- **保留 `snapshots/archive`，给每次收敛自动补 README 行**：违反 2026-10-25「产品仓只留合成证据」的边界，
  还会把真实 journal 带进 git 历史；README 行也变成第二个会漂的账。
- **写到 `runtime/convergence-<日期>/`**：本机迁移副本，不进部署盘的备份/搬 home；收口证据会随机器丢。
- **不拷贝，靠 session 日志或 git 历史**：live journal 本身 gitignored 且会被清；session 日志不是业务归档，
  角色下一次开工也读不到。
- **`git add -f` 强制 stage 归档件**：把业务盘重新塞回 git，直接违反 D45/D46 的整盘去 tracked。
- **只改文档、工具留到下一轮**：分诊的整个理由就是“下一脚会踩”——把已知地雷留在轮末收敛路径上，
  等于用文档记录一个必崩的动作。

## 后果

- 收敛后，`deliverables-archive/<目录>/` 里同时有 `meta.md` / `final.md` / `drafts/` / `journal/`；
  备份业务盘即备份证据，不需要第二个目录。
- CHARTER 历史纪要的 journal 指针变成 `deliverables-archive/<目录>/journal/<role>/`；旧条目里的
  `snapshots/archive/...` 是历史路径，不再改写（D38 只要求现行落点）。
- `snapshots/` 的预算与索引不再受收敛影响；`convergenceSlices` 只为存量/历史口径保留。
- 历史归档件没有 `journal/`：backfill 会如实写“历史收敛未留 journal 副本”，不伪造路径。
- `archive-move-probe` 已删除（git 历史保留）；现行判据在 `converge-e2e-probe`。

## 验证（真跑）

先红（修前）：
```text
node probes/fs-taskboard/converge-e2e-probe.mjs
#   收敛退出码 1：git add -A -- runtime/probe-…/deliverables-archive/… 失败
#   “The following paths are ignored by one of your .gitignore files”
#   ⇒ 归档步在 run bundle 时代必崩；同时旧路径仍写 snapshots/archive（snapshot-index 会红）
```

后绿（修后）：
```text
node probes/fs-taskboard/converge-e2e-probe.mjs
#   ALL PASS（16/16）：退出码 0 / 归档家 / 活跃区消失 / live journal 清 /
#   归档件 journal 副本 / 台账行 / 索引含 slug / backfill 退出 0 /
#   CHARTER 纪要写的是 journal/ceo/（不是 <role> 占位）/
#   resume --dry-run 不动盘 / backfill 全员 5 角色 / 按角色 journal / 带时间 kickoff 幂等
npx vitest run tests/harness/converge-rules.spec.ts
#   49 passed（纯 fs 搬移计划；resolveEvidenceDir 用例随功能删除）
pnpm test
#   119 files / 1042 tests passed
pnpm verify
#   ALL PASS（52 门；snapshot-index ×3 不再受收敛影响）
```

未验：`--charter-backfill` 已由临时工作区覆盖（含角色路径），但未在真动议的归档件上跑
（历史归档件无 journal 副本；本轮不伪造现场）。
