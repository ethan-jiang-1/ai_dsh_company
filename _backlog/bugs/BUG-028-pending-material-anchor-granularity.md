---
status: 调查中
severity: P2
opened: 2026-10-19
---

# BUG-028：闸门④的锚粒度与手册纪律不一致——一条总锚覆盖多任务时被判「行动幻觉」

> 严重级别：P2（次要——判据偏严不损坏数据，但**会把合规的收口判成违规**，逼角色为每个 T 号重复立锚）｜发现：2026-10-19｜状态：调查中

## 症状（真现场，第五/六场 `lingang-recon`）

`deliverables-check --only lingang-recon` 报 **3 条违规**：

```
pending-material-without-schedule | deliverables/2026-10-17-lingang-recon/drafts/ceo.md
  「待补料」任务 T4 无 schedule 跟进为证（schedule.json 无 `待补料·lingang-recon·T4`）
pending-material-without-schedule | … T5 …
pending-material-without-schedule | … T6 …
```

而盘面事实是**合规的**：

- 稿里三条派活行确实标了 `状态：待补料`（T4/T5/T6，各自写明依赖哪几项客户补料）；
- **schedule 里有一条真锚**：`待补料·lingang-recon·T1｜补料落地复查（M1–M12）`，prompt 里写明到点日期与复算动作、并列出 M1–M12 全部缺料项。

即：**CEO 立了一条覆盖全部缺料的总锚**（T1 = 补料复查），而 T4/T5/T6 是**受这条总锚约束的下游任务**。

## 根因

判据 `uncoveredPendingMaterial(pendingTaskIds, scheduleTasks, slug)` 的匹配是**逐 T 号精确**：

```js
const anchor = `待补料·${slug}·`
return (pendingTaskIds ?? []).filter(id => !texts.some(text => text.includes(`${anchor}${id}`)))
```

⇒ 只要某条派活行的 T 号**自身**没出现在任何 schedule 任务的 title/prompt 里，就判「行动幻觉」。
**它不认「总锚 + 下游依赖」这种形状**——而那恰是手册鼓励的省法（一条复查任务盯全部缺料，而不是给每个 T 号各立一条）。

实测佐证：把 lingang 锚从 schedule 里**临时移除**，违规数**仍是 3**（判据根本没读到那条锚）⇒ 判定与锚存在与否无关，只与「T 号字面是否出现」有关。

## 暴露的失败类

「**判据比纪律更严**」——纪律要的是「缺料必须有真跟进任务为证（防行动幻觉）」，
判据实现成了「每个 T 号必须各自有一条」。前者是意图，后者是过拟合的实现。
同类先例：[BUG-014](../_archive/fixed_bugs/BUG-014-charter-backfill-dedupe-false-skip.md)（查重锚从整文件 includes 收成条目行锚，方向相反但同属「锚的粒度选错」）。

## 复现

```sh
source run/env.sh && node checks/audit/deliverables-check.mjs --only lingang-recon
# → 3 条 pending-material-without-schedule（T4/T5/T6），而 schedule.json 里有 待补料·lingang-recon·T1
```

## 修复关联

**待定（本卡只记发现与判据，未修）**。候选（实施前须先补 keyless 红测）：

- **A（推荐）**：认「**总锚**」——若存在 `待补料·<slug>·<任一 T号>`，且其 prompt 覆盖了缺料项清单（或至少存在同 slug 的锚），则**降为观察项**（`pending-material-anchor-broad`），不判红。守卫：**该 slug 一条锚都没有时照旧判红**（真幻觉必须抓）。
- **B**：把判据改成「slug 级」——只要该 slug 有**任意** `待补料·<slug>·` 锚即通过，T 号粒度只用于**提示**。最省，但丢掉了「哪条任务没被盯」的信息。
- **C**：维持现判据，改**手册**要求「每个 `待补料` 派活行各立一条锚」——但那会让锚膨胀（本场会从 1 条变 4 条），且与「一条复查盯全部缺料」的省法冲突。

建议 **A**（保留粒度信息 + 认总锚），C 作为文档补充（写明「总锚可覆盖下游，须在 prompt 里点名缺料项」）。

## 本场处置

`lingang-recon` 的 3 条违规**保持红**——不修盘面、不为凑判据补 3 条假锚（那是为判据服务而不是为纪律服务）。该件的去向取决于本卡的修法或人判断。
