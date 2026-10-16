# 归档 journal 检索修复（2026-10-16）：journal-audit 认两种形状＋在场判据收紧为文件名命中

状态：implemented（授权 = 用户 2026-10-16「setup goal 后推进剩下的事情」；现场 = 收敛 `role-boundary-diagnosis-2026` 时压出；commit = 见本 Note 同轮）

## 事故（怎么发现的）

收敛 `role-boundary-diagnosis-2026`（五道前置全过、exit 0、**没崩**——顺带验证了上轮的 `clearLiveJournal` 修复）之后，`journal-audit` **反而报该场五职全缺席**。查下去是**路径契约在命名换代时断了**：

- `converge.mjs` 把 journal 留底到 `<场景>/<dirName>/journal/<role>/`（现行形状）；
- `journal-audit` 只查 `<场景>/workspace.actual/kb/<role>/journal/`（`memory-convergence-*` 时代的整盘拷贝形状）。

⇒ 实测：审计报 **16 条缺席，其中 9 场其实有证据在盘**（收敛切片里躺着 5–12 篇/场）。**收敛过的场次全被误报缺席**——一个只会随时间恶化的盲区。

## 决定

1. **判据提为 lib 纯函数 `pickArchivedJournal({dirs, slug})`**（`tools/lib/converge-rules.mjs`）：调用方按两种形状枚举候选目录，函数负责在目录里找目标 journal。住 lib 的理由同前几轮：`checks/**` 不许被 `tests/` 导入，判据住审计脚本里就测不到。
2. **audit 侧两种形状都枚举**：老形状 `<场景>/workspace.actual/kb/<role>/journal/` + 新形状 `<场景>/<dir>/journal/<role>/`。
3. **在场判据收紧为「只认文件名命中」**（含 `日期待核-<slug>.md` 这类**精确尾段**），**不做正文包含**。

## 输掉的方案

- **只按正文包含 slug 判定**（首版，已否）：败于**假阳性在场**——首版实测把 `emergency-x` 的 coo 行解析到 `role-boundary-diagnosis-2026/journal/coo/…`（一份完全无关的文件，只因正文提到那个 slug）。假阳性在场**比漏报更坏**：它会静默掩盖真缺口，正是这条审计存在的理由。
- **只认文件名包含**（不含精确尾段）：败于历史命名——`日期待核-<slug>.md` 这类文件名里 slug 不是独立段，`includes` 能中但会连带命中 `<slug>-v2` 之类；用「剥 `.md` 后精确等值或 `-<slug>` 尾段」更稳。
- **改名历史快照去迁就审计**（把 `convergence-*` 改成 `memory-convergence-*` 形状）：败于「改数据迁就工具」——快照是证据资产，形状已入库有 git 历史；修工具是正路。
- **让 converge 改写成老形状（造 `workspace.actual/kb/...`）**：败于体积与语义——那形状是为「整盘拷贝」设计的，为一个检索便利去复制整棵树不值（`snapshots` 总量已 57M/64M）。

## 后果

- **`journal-audit` 由「缺席 16 条 FAIL」变 `ALL PASS`**（缺席 0 / 存疑 1 / 已知历史缺口 2）；`已归档` 明细逐条指向正确文件。
- **一条误登记的纠正**：名册里唯一那条「emergency-x 的 coo 历史缺口」——我先据假阳性判它其实在场并清了名册，**收紧判据后复核**：该场归档区确实只有 ceo 一篇，coo 与 vp-eng 当轮真没留 journal，与 `kb/coo/CHARTER.md:34`、`kb/vp-eng/CHARTER.md:30` 的「当轮未留 journal，W8 同款缺口」逐字对上 ⇒ **名册恢复为两条**（原只收 coo，漏了 vp-eng）。该场现正确落 `🟡 已承认历史缺口`、不进退出码。
- **教训留档在代码里**：`pickArchivedJournal` 与 `KNOWN_MISSES` 的注释都写明「假阳性在场会静默掩盖真缺口 ⇒ 判据宁可收紧」——这是本轮最有价值的一句。
- 连带：新门禁 `ledger-participation` 抓到**收敛器自己**写的台账行（照抄 meta“参与”原文不合口径）⇒ 规范化判据提为 lib `canonicalParticipation`，**写入点与门禁同一把尺**。

## 验证

- **keyless（6 条，含两处负例）**：文件名命中优先于同目录里「正文提到该 slug」的别的文件；**只有正文提到 ⇒ 必须 null**（假阳性守卫）；历史命名按精确尾段命中；都没命中 ⇒ null；目录不存在 ⇒ null（不抛）；五角色集合/子集/去注解/非角色名 ⇒ 规范化四例。
- **真消费面**：`journal-audit` 由 `缺席 16 条 FAIL` → `缺席 0 条 ALL PASS`；抽验 `renewal-x-2026`（老形状四职齐）、`emergency-x`（`🟡` 两条已承认缺口 + ceo 在场）、`all-in-ai-2026`（ceo 行指回 `2026-10-13-all-in-ai-2026.md`，不再串到别人家）。
- **全量**：`pnpm test` → `62 passed (62)` / **`590 passed (590)`**；`pnpm verify` ALL PASS；`deliverables-check` 全盘 **违规 0 条**。
- **收敛面**：`converge --slug 2026-10-16-role-boundary-diagnosis-2026` exit 0（证据副本 5 篇 + 归档家 + 台账行 + CHARTER 五份补登）。
