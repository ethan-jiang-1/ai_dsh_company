# 2026-10-19 · 闸门④锚粒度：判据从「每个 T 号各一条锚」改成「锚点名 + 依赖链」

状态：已交付（[BUG-028](../../_backlog/_archive/fixed_bugs/BUG-028-pending-material-anchor-granularity.md) 已修迁归档；
判据唯一家 = `tools/lib/deliverables-audit.mjs` 的 `uncoveredPendingMaterial`）。

## 问题

闸门④的纪律是「**缺料必须有真跟进任务为证**（防行动幻觉：口头"已立提醒"而 schedule.json 为空，卡兹克案）」，
判据实现却写成了「**每个 `待补料` 的 T 号必须各自出现在某条锚的文本里**」。
于是纪律自己鼓励的省法——**一条复查总锚盯全部缺料**——成了唯一会撞红的写法。

真现场（第五/六场 `lingang-recon`）：CEO 立了一条 `待补料·lingang-recon·T1｜补料落地复查（M1–M12）`，
prompt 里逐项写到点后派 `T4` 复算接入方案、派 `T6` 定稿账务口径；`drafts/ceo.md` 有三条 `待补料` 派活行（T4/T5/T6）。
审计报 **3 条「行动幻觉」**，而盘面完全合规。

**实测佐证**（本卡原记，本轮复现）：把那条锚从 schedule 里临时移除，违规数**仍是 3** —— 判据与"锚存不存在"无关，
只与"T 号字面是否出现"有关。

先搜后写：同类先例 = [BUG-014](../../_backlog/_archive/fixed_bugs/BUG-014-charter-backfill-dedupe-false-skip.md)
（查重锚从整文件 `includes` 收成条目行锚，方向相反但同属「锚的粒度选错」）。无同主题的第二本账；
升 pin 那轮（[2026-10-19 升 pin](./2026-10-19-pin-upgrade-0.2.1-rc.2.md)）不涉及这条判据。

## 方案

判据唯一家改三处（`uncoveredPendingMaterial(ids, scheduleTasks, slug, depsById)`）：

| 规则 | 内容 | 为什么是这条粒度 |
|---|---|---|
| **锚的归属** | title 以 `待补料·<slug>·` 开头才算该 slug 的锚 | 与旧行为一致；slug 严格匹配防串场 |
| **点名** | 该 slug 的锚在 **title 或 prompt** 里整号边界匹配到该 T 号（`T4` 不吃 `T40`） | 总锚的自然形状就是"title 挂复查、prompt 写到位后派谁"——lingang 的 T4/T6 只出现在 prompt |
| **依赖链** | 待补料任务 A 依赖 B（`｜依赖：B`）且 B 已覆盖 ⇒ A 也覆盖；链只在待补料集合内走 | T5 的卡点是 T4 不是客户补料；沿已完成任务走会把"已收工"当成"有人盯着" |

守卫（三条都写在 keyless spec 里，`pnpm test` 每次跑）：无锚 slug 全判红、有锚但未点名的照旧红、`T10` 不被 `T1` 顶替、
依赖不在待补料集合不构成覆盖、互依成环不死循环、缺省不传依赖 = 旧行为（向后兼容旧调用面）。

报告粒度同 diff 改了：同一 slug 的未锚 T 号**合并成一条**违规（"T4、T5 无锚"），否则"判据偏严"会被"报告刷屏"复刻一次。

### 端到端这一场告诉我们的（比单测更值钱）

CEO 真写出来的形状是「**总锚挂 T1 复查，prompt 里逐个点名 T1/T2/T3 及对应补料项**」，T4 只作为
"数据源与脱敏的角度"出现在别处——即**总锚才是自然写法**，逐 T 号立锚是判据逼出来的畸形。
依赖链那一半同样被真盘面证实：T2/T3/T4 的依赖全是 T1，旧判据把它们当幻觉，实际它们是"等 T1 复查宣判"的下游。

## 输掉的方案

- **B（slug 级：该 slug 有任意锚即通过）**：最省，但丢掉"哪条任务没被盯"——真幻觉只要立一条无关锚就能洗白，
  判据从"证明有跟进"退化成"证明有过 schedule 动作"。
- **C（维持判据，改手册要求每个 `待补料` 行各立一条锚）**：会让锚膨胀（lingang 从 1 条变 4 条），
  且与"一条复查盯全部缺料"的省法正面冲突——**为判据服务而不是为纪律服务**。
- **只认 title 点名**：lingang 的 T4/T6 只在 prompt 里，会留 2 条误报；且总锚的自然写法就被判违规。
- **只认总锚、不做依赖链**：lingang 留 1 条误报（T5）。丢掉链路信息 ≈ 回到方案 B 的盲区。

## 验证（实跑证据）

| 检查 | 结果 |
|---|---|
| 新守卫先红 | `expected [ 'T4', 'T6' ] to deeply equal []`（旧实现只认字面 T 号） |
| 修复后 | `tests/harness/deliverables-audit.spec.ts` 40/40；`pnpm test` **669/669**（67 spec） |
| 真入口闭环 | `node checks/audit/deliverables-check.mjs --only lingang-recon`：**3 条违规 → `违规 0 条 —— ALL PASS`**（`drafts/ceo.md` 与 `schedule.json` 一字未改） |
| 红配方可复现 | 把 lib 退回旧的整句 `includes` ⇒ 两条守卫同时红（`[ 'T4', 'T6' ]` / `[ 'T4', 'T5' ]`）；还原 ⇒ 40/40 绿 |
| 门没钝（反证） | 锚换成别的 slug ⇒ `["T4","T5"]` 照旧红；`['T9']` 无点名 ⇒ 红；空库 ⇒ 全红 |
| 同 diff 连带 | 手册④行补一句（总锚须点名下游 `T<N>`）⇒ `replay-smoke --scenario r3-delegation` 夹具同步后 **ALL PASS**（12s，零 diff） |
| 结构门禁 | `pnpm verify` **ALL PASS** |
| **端到端（真模型）** | 排练场跑一场「只派活不出稿 + 立一条总锚」的微动议：CEO 真写出 4 条 `待补料`（T1–T4）、真立了 1 条 `待补料·gate4-e2e-probe·T1｜补料落地复查`；**旧判据在同一盘面上误报 `["T2","T3","T4"]` 3 条，新判据 0 条**；真审计入口报 `违规 0 条 —— ALL PASS`（唯一红 `final-not-presented` 是"没调 present"的真阳性，与本条无关） |

## 决定

- **D1**：认总锚，且**prompt 与 title 同权**（纪律要"为证"，命令式文本里 title 与 prompt 是一份证据的两段）。
- **D2**：补**依赖链传递**——这是原卡未预见的一半；只做总锚点名在真现场仍留 1 条误报。
- **D3**：违规按 slug 合并一条（报告面，不改判据）。
- **D4**（超出自授权，按用户本轮指示落）：**手册补一句**写明总锚必须点名下游 T 号。这句落在
  `packages/company-pack/workspace/AGENTS.md`，属 docs 合同面——按 `_backlog` 章程，缺陷卡 `修复就绪` 的自授权
  不覆盖它，本轮由用户"这个 BUG 给修了"明确指示关上；**已向用户补报**。

## 失败类与横切

「**判据把纪律的意图翻译成了一种形状**」：纪律说"有真跟进为证"，实现写成"每个 T 号各一条锚"。
这是 BUG-014 之后**同类第二次** ⇒ 下次设计"某物必须有证据"的判据，先问一句
**纪律允许几种合法形状**，再挑判据能认的那几种；只认一种形状的判据，迟早把合规判成违规。
横切排查范围：`checks/audit/` 下其余"必须存在某物"的判据（处置：本轮的锚面已修，其余判据未见同类误报，不预修）。

## 落账

改动面：`tools/lib/deliverables-audit.mjs`（判据）、`checks/audit/deliverables-check.mjs`（调用面 + 报告合并）、
`packages/company-pack/workspace/AGENTS.md`（④行补一句）、`tests/harness/deliverables-audit.spec.ts`（两条守卫 + 红配方）、
`snapshots/replay/r3-delegation/replay/`（夹具同步：注入体 + 手册 digest，**非重录**）、
`_backlog/`（卡迁归档 + 两处清单 + 索引链接）、`notes/implemented/2026-10-17-motion5-question-avoidance.md`（指向新位置）。
