# 收敛半态续跑（2026-10-16）：`converge --resume` ＋清 journal 判 tracked

状态：implemented（授权 = 用户 2026-10-16「按你推荐的跑, 按流程落地」；缺陷卡 = [BUG-020](../../_backlog/_archive/fixed_bugs/BUG-020-converge-crash-untracked-journal.md)（已迁 fixed_bugs）；commit = 见本 Note 同轮）

## 事故回顾（为什么需要续跑）

真 CEO 会话补做收口时，收敛崩在**第 3 步**：CEO 刚写的 `kb/ceo/journal/<日期>-<slug>-收口补记.md` **尚未入库**，而清 live journal 走 `git rm` ⇒ `fatal: pathspec … did not match`。盘面停在半态（交付物已入归档家、journal 清一半、台账未追加），且**重跑进不去**——`converge(slug)` 的前置只认活跃区 slug，得 `✗ deliverables/ 下无此目录或缺 meta.md`。当时的处置是**人按证据手工补完**（逐对 `cmp` 证副本与原件逐字节相同才敢删 live；台账行按收敛器口径补）。**那件事就是本轮要消掉的。**

## 决定

**两条一起修，判据住 lib、动作住工具：**

1. **清 live journal 判 tracked**（`clearLiveJournal`，收敛与续跑共用）：`git ls-files --error-unmatch` 判定——已跟踪走 `git rm`、未跟踪走 `rmSync`（语义等价：两者都已在证据副本里）。`.gitkeep` 只在**缺时**写（幂等：重写会让未改动的 tracked 文件凭空出现在 `git status`）。
2. **`converge --resume <目录名>`**：交付物已在归档家、但 journal/台账没做完时接手。**只做剩余步骤**（证据副本 → 清 live journal → 台账行 → 打印 backfill 指引），**不搬移已归档的交付物**；不可续跑时 fail-loud 并给恢复指引。
3. **判定是纯函数** `convergenceResume({dirName, journalled, hasFinal, archived})` → `{resumable, reason, remaining}`，`reason ∈ 'ok' | 'still-active' | 'directions-missing'`；`remaining` **只列还需做**的步骤（零 live journal ⇒ journal 步视为已完成 ⇒ 续跑幂等）。住 `tools/lib/converge-rules.mjs` 的理由同零 journal 前置：**`checks/**` 不许被 `tests/` 导入**，判据住门禁侧就测不到。

## 输掉的方案

- **崩溃现场整片回滚重来**：败于信息损失——半态本身是 BUG-020 的第一手证据；且交付物已搬移、证据副本已在，回滚会制造第二处不一致。
- **把续跑做成「自动检测并继续」**（无旗标）：败于**显式优于隐式**——收敛是破坏性操作，工具不该在「你以为在计划」时自己动手补做。`--resume` 要求点名目标，与 `--charter-backfill`（同为「补做前一步没做完的收尾」）同形。
- **让 `--slug` 自己认半态**（活跃区没有就去看归档家）：败于语义混淆——`--slug` 的合同是「收敛一个**活跃**动议」，让它在活跃区找不到时改去补做归档件，会让「收敛」与「续跑」两种意图分不开，也让 `✗ deliverables/ 下无此目录` 这条**有用的报错**消失。
- **每步都做成幂等**（候选 B）：败于成本——五步里「证据副本」「fs rename + git add」的幂等化要处理同目录已存在、已被 URL 重写过引用等分支，改动面远大于一个续跑入口；先给入口，幂等化留给真有第二次崩溃时再谈。
- **续跑时重建证据目录日期为「原收敛日」**：败于无据可依——半态里没有可靠的「原日」记录；用当天日期并在输出里打明路径，比猜一个日期好（证据副本本身幂等，重复不损坏）。

## 后果

- **半态有了官方出路**：`node tools/converge.mjs --resume <目录名>`；不可续跑时它自己说清下一步该跑什么（`still-active` → 给 `--slug` 命令）。
- **收敛不再因「角色刚写、未入库的 journal」而崩**（真现场验证）。
- 收敛路径的**两种意图分开了**：`--slug` = 收敛活跃动议；`--resume` = 补完已归档但不完整的收敛。
- 未做（记录在案）：五步的**全量幂等化**（候选 B）；把「崩了该跑什么」写进崩溃信息本身（本轮写在续跑入口的 fail-loud 文案里，未改崩溃路径）。

## 验证

- **先红后绿（纯函数层）**：新写 5 条断言 → 先跑得 `× convergenceResume is not a function`（5 条全红）→ 实现 → `23 passed`（`converge-rules.spec` 20 → 23；含既有旗标断言随新键同步）。
- **真入口三分支（造件，不碰真数据）**：造临时归档件 `2026-10-16-resume-test`（归档家有 meta+final、live 有未跟踪 journal、台账无行）⇒
  - `--resume` → `续跑收敛 · …（剩余：journal / ledger / backfill）` + 证据副本 + 清 live journal + 台账行，exit 0；复核：台账**+1 行**、live journal **清零**；
  - 再跑一次（幂等）→ `· 零 live journal 可清` + `台账已有 … 行——跳过追加`，exit 0；
  - `--resume 2026-12-…`（不存在）→ `✗ 不可续跑（directions-missing）` + 恢复指引，**exit 1**；
  - `--resume 2026-10-12-ai-coding-security-2026-v3`（真在活跃区）→ `✗ 不可续跑（still-active）` + `请走正常收敛：… --slug …`，**exit 1**。
  - 测试残留已清（临时归档件、证据目录、台账测试行）。
- **红配方（负例留证行已进 spec）**：把 `convergenceResume` 的归档家分支去掉 ⇒「已入归档家 ⇒ 可续跑」那条红；另一半（`git rm` 撞未跟踪）**没有纯函数可断言面，其红证 = 真现场**（BUG-020 症状节原文）。
- **全量**：`pnpm test` → `62 passed (62)` / `577 passed (577)`；`pnpm verify` ALL PASS；真盘 `deliverables-check` 律 0 违规（本轮未动真数据）。
