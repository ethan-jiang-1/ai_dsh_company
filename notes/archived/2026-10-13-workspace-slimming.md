# 公司盘瘦身：过程物料不进 git（成品与制度件入库）

状态：implemented（2026-10-13；起因 = 用户「company-workspace 里其实只有部分内容值得进入 GIT」）

## 决定

公司盘按三层分家，**入库面**从此只有前两层：

| 层 | 内容 | 入库 | 家 |
|---|---|---|---|
| ① 制度件 | 手册 / `templates/` / `kb/org.md` / 五份 `CHARTER.md` + 起动件 | ✅ | `packages/company-pack/workspace/**`（唯一真源，[骨架 Note](../implemented/2026-10-13-company-workspace-skeleton-shipped.md)） |
| ② 业务成品 | `deliverables*/<日期>-<slug>/final.md` + `meta.md`（+ 台账行） | ✅ | 运行盘 `company-workspace/` |
| ③ 过程物料 | `deliverables*/<日期>-<slug>/drafts/**`（含 `sources/` 的 PDF/HTML/raw） | ❌（`.gitignore` 点名） | 运行盘本地（工作树保留） |

量级（实测）：**531 件出索引**（34 个 drafts 目录）、**72 件成品留下**（35 final + 37 meta）、
≈70MB 不再进仓。历史仍在 git 历史里（`rm --cached` 只出索引）——回溯得到，只是不再随每次 clone 落地。

## 机制改动（四处，缺一处就有静默坑）

1. `.gitignore` **点名**两条规则（`company-workspace/deliverables/*/drafts/` 与 `…-archive/*/drafts/`）——
   不 blanket 整个 `deliverables/`（那会把成品也挡在门外，spec 有反向断言）。
2. **`tools/converge.mjs` 的归档搬移改机制**：`git mv <目录>` 遇到未跟踪文件会 fatal
   （`not under version control`），drafts 现在正是未跟踪的 ⇒ 改成 **fs rename + `git add -A -- <旧> <新>`**
   （成品照样 stage 成重命名）。计划住 `tools/lib/converge-rules.mjs` 的 `archiveMovePlan`（纯逻辑缝）。
3. **`tools/orient.mjs` 加 ignored 面计数**：只数 tracked 会把这层本地过程稿报成"零改动"（静默失真）——
   概览现在两行：`git 改动 N 处（company-workspace 面）` + `本地过程稿 M 项（ignored）`。
4. **排练验收判据改档**（`docs/guides/dev-loop.md` §7）：`git status --porcelain company-workspace/` 为空
   → `--ignored=matching … **无新增**`（ignored 也要看，否则探针漏写真盘的检查会静默变弱）。

防回潮：**`drafts-untracked` 门禁**（`checks/run-gates.mjs`）——`git add -f` 能绕过 .gitignore，
所以做**进程级**核查：`git ls-files` 里出现任何 `/drafts/` 路径即红并点名文件。

## 输掉的方案

1. **blanket ignore `company-workspace/deliverables/`**：成品（final/meta）是公司的历史账，一起挡掉 = 把值得读的也扔了。
2. **维持全 tracked**：仓库随每场动议涨 10–40MB；且"给别人安装"时会把我们产线的过程物料一并带出去。
3. **业务数据拆独立仓 / submodule**：converge、deliverables-check、orient、rehearsal 全要跨仓跳，收益不抵复杂度（数据再涨 10× 再回看）。
4. **journal 也出 git**：converge 的 `git rm` 收割与 [journal-audit](../../checks/audit/journal-audit.mjs) 的"在场(已归档)"识别都吃 tracked 面；
   留待有明确收益时再动（现在它们小、且是收敛流程的输入）。
5. **只在 .gitignore 写规则、不做进程级核查**：`git add -f` 能绕过（[gitignore-guards spec](../../tests/harness/gitignore-guards.spec.ts) 自己登记过这个盲点）。

## 后果与边界

- **fresh clone 没有 drafts**：过程物料本来就不该进仓；`deliverables/<slug>/drafts/` 在 clone 后不存在是预期
  （公司盘只恢复业务成品与制度件）。
- **`git add -f` 仍能绕过规则**——靠门禁（`drafts-untracked`）兜，不靠纪律。
- **归档搬移的语义没变**：converge 照旧"证据副本 → 搬进归档家 → 清 live journal → 台账行"；变的只是搬移机制。
- **真实例里的 converge 未在本轮执行**：本轮的机制证据 = 临时 git 仓真跑（probe）；真盘收敛仍按人驱动的轮末动作走
  （`node tools/converge.mjs` 计划模式实跑过，两个可收敛 slug 在列）。

## 验证（都真跑过）

- `pnpm verify` —— **ALL PASS**，含新门禁 `PASS drafts-untracked 公司盘过程物料零 tracked（drafts/sources 不进 git）`。
- 门禁反证（红→还原→绿）：`git add -f company-workspace/deliverables-archive/2026-09-22-agent-workflow/drafts/vp-eng.md`
  ⇒ `FAIL drafts-untracked: index 里有 1 件 drafts（…）：company-workspace/deliverables-archive/2026-09-22-agent-workflow/drafts/vp-eng.md`
  → **实测教训**：`git restore --staged` 对 ignored 的新增项**不解除**暂存，要 `git rm --cached -- <路径>` ⇒ 绿（已写进门禁注释）。
- 搬移机制反证（红→还原→绿）：把 `archiveMovePlan` 退回 `['mv', …]` ⇒
  探针 `archive-move-probe: git mv … → fatal: bad source …`、**2 FAILURE(S)** → 还原 ⇒ **ALL PASS**。
- `node probes/fs-taskboard/archive-move-probe.mjs` —— **ALL PASS**（临时 git 仓真跑：A1 计划形状 / A2 目录真搬走含未跟踪件 /
  A3 tracked 面 stage 成 `R  …final.md -> …final.md` / A4 ignored 面不进索引）。
- `pnpm test` —— **53 files / 524 tests 绿**；`node checks/audit/deliverables-check.mjs` —— **违规 0 条 ALL PASS**；
  `node tools/converge.mjs`（计划模式）正常列出可收敛 slug 与 journal 收割预览。
- **一次真拦截记录**：搬移那条测试初版住 `tests/harness/converge-rules.spec.ts` 并真跑 git，
  被 `tests/harness/layering.spec.ts` 当场判红（回归层不许子进程）⇒ 拆成"spec 只钉计划形状 + probe 真跑"。
- **未跑**（如实登记）：真盘上的 converge 执行（人驱动的轮末动作；本轮不代跑）。

## 落点

- 规则：`.gitignore`（两条点名规则 + 理由/量级注释）。
- 机制：`tools/lib/converge-rules.mjs`（`archiveMovePlan`）、`tools/converge.mjs`（搬移段）、`tools/orient.mjs`（ignored 计数）。
- 判据：`checks/run-gates.mjs` 的 `drafts-untracked`、`probes/fs-taskboard/archive-move-probe.mjs`、
  `tests/harness/converge-rules.spec.ts`（纯计划）、`tests/harness/gitignore-guards.spec.ts`（规则在场）。
- 文档：`docs/guides/dev-loop.md` §7、`snapshots/README.md` §归档动作、`docs/project-map.md` 公司盘行。
