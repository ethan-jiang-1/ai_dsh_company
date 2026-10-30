# 2026-10-30 · _backlog 研究题：题目录 + 题名页与双层索引

状态：implemented（2026-10-30；用户当轮授权——「借鉴 ai_dsh_deep_research 的思路安排 research 与归档 research」，
取舍由用户拍板：全套落地 + 归档索引保留消费者/产出摘要列）

> 上游 = 用户点名（2026-10-30 会话）；无 `_backlog` 卡（制度整理，不是推敲卡毕业）。
> 借源 = 外部仓 ai_dsh_deep_research 的 `_backlog`（维护者本机；2026-10-30 当日态，登记见
> [external-research](../../docs/external-research.md)）；与本仓旧制（D31/D33）同源，本次是**研究层**的
> 形状升级，不是制度重立。现行规则 = [_backlog/research/README.md](../../_backlog/research/README.md)
> 与 [_archive/research/README.md](../../_backlog/_archive/research/README.md)。

## 决定

- **研究单元 = 研究题**：一个题 = `_backlog/research/<slug>/` 目录 + 题名页 `README.md`。题名页是
  **名头**，不是正文：`> 问题` / `> 消费者` / `> 产出的卡` 三行 + 材料表；归档后补 `> 归档：YYYY-MM-DD`。
- **命名**：slug 小写 kebab-case、不带日期、归档不改名（已有目录名保持原名）；材料仍为
  `YYYY-MM-DD-<slug>.md`，frontmatter 首字段 `topic`、次字段一行 `intent`，不写 `status`（不变）。
- **双层索引**：活跃 `research/README.md` 一题一行（名头｜问题｜消费者｜材料）；归档
  `_archive/research/README.md` 一题一行（名头｜材料｜历史消费者｜产出的卡｜归档）。
  `_archive/README.md` 只索引卡，研究只留路由一行——逐文件清单不在任何索引层重复。
- **生命周期**：最后一张活消费者离开 → 整个题目录 `git mv` 到 `_archive/research/<slug>/`，题名页补
  归档行，材料正文不重写、只修必要相对链接；归档是冻结证据，**不是实施授权**，引用不复活。
- **门禁只证形状**（`backlog-liveness`）：题名页在场；三行在场；归档题名页另有归档行；题名页被 shelf
  索引按**解析后路径**链接；材料被自己题名页按解析后路径逐份点名（散文提及不算）；shelf 根不落平铺材料。
- **存量迁移**：8 个归档题目录各补题名页；平铺的 `2026-10-04-multi-user-ux-walk.md` 归入新题
  `multi-user-ux/`（修 6 处相对链接：3 张卡 + 1 份协作题材料的交叉引用 + 移入文件自身 2 处）；`_archive/README.md`
  的「## 研究」清单与「## 随卡归档的研究」表退役，误列在该表里的 3 张卡
  （`2026-10-17-cultivation-gui-actions`、`BUG-023`、`BUG-026`）归位「已关闭问题」表。
- **数据出处**：题名页的消费者取自旧 `_archive/README.md` 的「曾服务于 / 服务卡」列与卡内链接；
  「产出的卡」无证据一律 `—`，不编造。

## 输掉的方案

- **只立规则、不动存量**：新旧两套形状并存，门禁要写 grandfather 豁免，下一轮还得补迁移——用户否。
- **只加题名页、不改门禁**：旧判据要求每份 `.md` 直接进 shelf 索引，题名页一加就红；"材料必须住题名
  目录、题名页必须点名"也无法机械保证，等于只靠自觉。
- **保留 `_archive/README.md` 的逐文件研究清单**：实测同一批材料在该文件列了两遍（bullet 6 行 + 表格
  16 行），正是章程反对的"一处事实两个家"；也挡住"索引一题一行"的可扫读性。
- **归档索引只留 名头｜材料｜归档**：更贴合"一处事实一个家"，但查归档要逐页点开；用户选保留
  消费者/产出的卡两列作导航摘要，明细仍在题名页（重复面 = 摘要，不承载细则）。

## 后果

- 新增研究：先建题目录与题名页，再写材料；索引只加一行，材料清单只住题名页。
- 归档：整目录迁移 + 归档行 + 索引一行；不再往 `_archive/README.md` 的卡表里塞研究行。
- 历史例外如实留在题名页：`repo-hygiene/` 的 round3/round4 材料曾于 2026-10-27/28 直接写入归档目录；
  `multi-user-ux/` 原平铺在 shelf 根，2026-10-30 归题。旧材料 frontmatter 不回填（现行旧制不变）。
- 台账登记 D50：`docs/decisions.md` 行数 60→61，`doc-budget` 上限同日 60→61（路由表按决定增长；
  本轮不顺手压缩尾部历史段——那属另一轮，避免把两件事塞进同一变更）。
- 无待办：门禁与 spec 同 diff 已接；后续写研究按
  [_backlog/research/README.md](../../_backlog/research/README.md) 的模板走。

## 验证

| 面 | 实跑命令与结果（2026-10-30） |
|---|---|
| 窄回归 | `npx vitest run tests/harness/backlog-liveness.spec.ts` → **1 file / 27 tests passed**（新增研究题三例：缺题名页/三行/归档行、散件与索引、两级反散文） |
| 结构门禁 | `pnpm verify` → **ALL PASS**（`backlog-liveness` 描述已含「研究题两级索引」） |
| 真树造红（逐条植入→还原） | ① 删 `_archive/research/collaboration/README.md` → `FAIL backlog-liveness: _backlog/_archive/research/collaboration/README.md 缺题名页——研究题必须有题名页（问题 / 消费者 / 产出的卡 / 材料）`；还原后绿。② 删 `agent-cultivation` 题名页「> 产出的卡：」行 → `…:1 缺「> 产出的卡：」行——题名页要回答研究什么、服务谁、产出了什么`。③ `notes-consistency` 材料链接改散文 → `… 未在题名页 notes-consistency/README.md 中被点名——材料清单必须与盘上一致`。④ 归档索引删 `repo-hygiene` 行 → `… 未被 _archive/research/README.md 索引链接点名——索引按题名页一行登记，不按文件`。⑤ 删 `run-bundle` 题名页「> 归档：」行 → `…:1 缺「> 归档：YYYY-MM-DD」行——归档题名页要记下归档日`。⑥ 材料移回 shelf 根 → `… 平铺在 shelf 根——研究材料必须住进题名目录（_backlog/_archive/research/<slug>/）`。六条原话同时写进 `backlog-liveness` 块注释 |
| 链接面 | 首跑曾因题名页相对链接少一级（`../settled_issues/` 应为 `../../settled_issues/`）红 25 条 md-links；修正后同一条 `pnpm verify` 全绿——这是形状之外唯一一次真实返工 |
| 全量回归 | `pnpm test` → **119 files / 1044 tests 全绿**（含 harness 区；观察窗/公司盘告警行是夹具预期噪声） |
