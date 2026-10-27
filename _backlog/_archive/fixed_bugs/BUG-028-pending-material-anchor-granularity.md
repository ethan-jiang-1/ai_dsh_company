---
status: 已修
severity: P2
opened: 2026-10-19
---

# BUG-028：闸门④的锚粒度与手册纪律不一致——一条总锚覆盖多任务时被判「行动幻觉」

> 严重级别：P2（次要——判据偏严不损坏数据，但**会把合规的收口判成违规**，逼角色为每个 T 号重复立锚）｜发现：2026-10-19｜状态：已修（2026-10-19，见「已修判定」与「修复实况」）

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
同类先例：[BUG-014](BUG-014-charter-backfill-dedupe-false-skip.md)（查重锚从整文件 includes 收成条目行锚，方向相反但同属「锚的粒度选错」）。

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

---

## 已修判定（2026-10-19 落，修复前写就）

**修成什么算修好**（三条全绿才算修好，缺一条即回翻 `调查中`）：

1. **认总锚**：`uncoveredPendingMaterial(ids, tasks, slug)` 在**该 slug 的锚**（title 以 `待补料·<slug>·` 开头）
   的 title/prompt 里**点名**某 T 号（整号边界匹配：`T4` 不吃 `T40`；title 与 prompt 同权）即算已锚。
2. **守卫不松**：该 slug 一条锚都没有 / 锚没点名该 T 号 ⇒ **照旧判红**（真幻觉必须抓）；
   别的 slug 的锚不算（防串场）；`T10` 不被 `T1` 的前缀顶替。
3. **真现场闭合**：`node checks/audit/deliverables-check.mjs --only lingang-recon` 由 **3 条违规 → 0 条**
   （T5 经「依赖链」一并覆盖，见下），且**不靠改盘面**（`drafts/ceo.md` 与 `schedule.json` 都不动）。

**验证搭载**：`tests/harness/deliverables-audit.spec.ts` 两条 keyless 守卫（锚粒度 + 依赖链）——
它们随 `pnpm test` 跑，是真答案；`replay-smoke --scenario r3-delegation` 因手册改一句而同 diff 重跑（同 diff 刷新夹具 digest）。

## 修复实况（2026-10-19）

**修法 = 候选 A（认总锚）+ 两条本卡未预见的补充**，判据唯一家 = `tools/lib/deliverables-audit.mjs`：

| 补的 | 为什么 |
|---|---|
| **prompt 也算点名**（不只看 title） | 总锚的自然形状正是"title 挂复查、prompt 里写到位后派哪个 T 号复算"——lingang 现场 T4/T6 就只出现在 prompt 里。只认 title 等于把纪律鼓励的省法判成违规 |
| **依赖链传递**（`｜依赖：T4`） | 只做总锚点名时 lingang 仍剩 1 条红（T5：它的卡点是 T4 不是客户补料）。链只在**待补料集合内**走（已完成的依赖不构成覆盖证明），带环安全；缺省不传依赖 = 旧行为 |

**红→绿实测**（实跑命令与输出）：
- 新守卫先红：`expected [ 'T4', 'T6' ] to deeply equal []`（旧判据只认字面 T 号）。
- 修后绿：`tests/harness/deliverables-audit.spec.ts` 40/40；`pnpm test` 669/669（67 spec）。
- 真入口闭环：`--only lingang-recon` 由 **3 条违规 → `违规 0 条 —— ALL PASS`**（盘面一字未改）。
- 反证（门没钝）：把锚换成别的 slug ⇒ `["T4","T5"]` 照旧判红；无锚 ⇒ 全判红；`T10` 不被 `T1` 顶替。

**同 diff 附带的两处**：
- **报告粒度**：同一 slug 的未锚 T 号合并成**一条**违规（"T4、T5 无锚"），不再一个 T 号一条——否则"判据偏严"会被"报告刷屏"复刻一次。
- **手册补一句**（`packages/company-pack/workspace/AGENTS.md` ④行）：写明"一条总锚可覆盖多个缺料任务，但必须在 title 或 prompt 里点名它解锁的下游 `T<N>`"。**这是 docs 合同面，超出自授权范围**——按用户本轮明确指示"这个 BUG 给修了"落，修复后补报。手册一改，`replay-smoke` 的两份注入体 + 手册 digest 随之重算（`--prepare` 重生成，夹具 = 录制数据，非重录）。

**端到端复验（真模型，2026-10-19）**：排练场跑一场「只派活不出稿 + 立一条总锚」的微动议，
CEO 真写 4 条 `待补料`（T1–T4，T2/T3/T4 依赖 T1）+ 真立 1 条总锚（prompt 点名 T1/T2/T3）⇒
**旧判据在同一盘面上误报 `["T2","T3","T4"]` 3 条，新判据 0 条**；真审计入口 `违规 0 条 —— ALL PASS`。
真形状印证了根因：**总锚才是 CEO 的自然写法**，逐 T 号立锚是判据逼出来的畸形。

**暴露的失败类（本卡原记）复核**：仍是"判据比纪律更严"，但真凶更具体——**判据实现把纪律的意图（有真跟进为证）翻译成了字面上的一个形状（每个 T 号各有一条锚）**，于是纪律自己鼓励的省法反而是唯一会撞红的那种写法。同类教训与 BUG-014 同源（锚的粒度选错），第二次出现 ⇒ 下次设计"某物必须有证据"的判据，先问**纪律允许几种合法形状**。
