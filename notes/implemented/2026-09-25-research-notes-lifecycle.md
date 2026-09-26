# 2026-09-25 · research 层生命周期立规 + 首轮清扫

状态：已交付（规则 = 开发环 §12「research 层只放活研究」；首轮六篇清扫完成：2 删 / 2 转活参考 / 2 喂收割轮改状态行）。

## 问题

`notes/research/` 是 notes 树里唯一没有成文生命周期的层：开发环 §12 给 proposed/implemented 写了完整毕业规则，
research 层只有半句括号「另有自身约定」，从未落地。后果已现（用户 2026-09-25 点出）：六篇研究稿里两篇实际已消化
（升 pin 落地、适配问题收口），却还躺在 research/，状态行还挂着「进行中」/「仍待核」——研究完利用了
（消化掉或放弃），不能一直留在研究层。

## 决定（三站分流 + 三选一处置）

**知识按性质分流，不按文件搬家**：

| 内容 | 去处 |
|---|---|
| 结论、取舍、否决理由 | owner Note（毕业 = 正文改写，唯一活的家） |
| 仍被合同/待续项引用的判定 | 留 research/ 转活参考，状态行写清「喂给谁」 |
| 全文原稿 | git 历史（`git show <sha>:notes/research/…` 一行取回） |

**消费方毕业时同 diff 三选一**（已写进 [开发环 §12](../../docs/guides/dev-loop.md)）：仍在用 → 留下并改状态行指向
新消费方；已消化 → 结论并入 owner Note 后删文件，收尾 Note 记末次 commit SHA（一跳可达全文）；放弃 → 否决理由随
owner Note「输掉的方案」节，正文删。

与仓里既有实践一致（ROADMAP 历史段「活研究进、落地即出」——**该段已于 2026-09-26 删除**，
全文在 git `git show d159b0228e2b`；2026-09-23 前后四篇研究稿照此毕业）——本次只是
把约定写下来、补上状态行与 SHA 保险。

## 首轮清扫台账（六篇逐一）

| 篇 | 判定 | 处置 |
|---|---|---|
| 2026-09-24-dsh-development-memory | 已消化：Notes 原则部分采纳进 [foundation-first-step](./2026-09-24-foundation-first-step.md)；生命周期适配由 [notes-lifecycle-absorption](./2026-09-24-notes-lifecycle-absorption.md) + §12 收口；基线为旧 pin，vendor 引用已过期 | **删**；末次 SHA `335901e`；引用改写 = foundation-first-step §Consequences |
| 2026-09-25-pin-upgrade-impact | 已消化：A–D 四组事实（install 阻塞、D27 硬阻塞、CI=true 逃逸口、vendor clean 报错）全部已在 [pin-upgrade 收尾 Note](./2026-09-25-pin-upgrade-0.1.7-rc.2.md)「实施实况」节 | **删**；末次 SHA `6f57fe5`；引用改写 ×4（收尾 Note 两处 / intents / ROADMAP 历史段——该段 2026-09-26 已删，见 `d159b0228e2b`） |
| 2026-09-25-harness-alignment-ledger | 仍在用：dev-loop §9.1 / index / architecture / README 四处活引用，不照搬清单 owner = 其 §四.4 | 留；状态行「已交付」→「活参考」 |
| 2026-09-25-human-agent-ux-patterns | 消化完但有后续读者（UX 候选判定唯一家；搁置池「视觉打磨二期」待复活）——**用户裁定留** | 留；转活参考；顺手修 label rot（链接文字仍写 proposed/ 而目标已毕业） |
| 2026-09-24-dsh-upstream-delta | 仍在用：§④ 15 收割项 = [收割轮 RFC](../implemented/2026-09-25-harvest-round.md) 判定输入；ledger 交叉引用其收割项⑤⑬ | 留；状态行改指收割轮 + 毕业动作 |
| 2026-09-24-pin-upgrade-and-harvest | 半消化：升级方案半已被收尾 Note 取代；收割审计半喂收割轮 | 留；状态行写明「半消化」+ 剩余活价值 + 毕业动作 |

## 输掉的方案

- **开 `notes/research/archived/` 目录收已消化全文**：用户 2026-09-25 二选一裁决否。沿 rejected/ 裁断先例
  （开目录造空壳）：结论的家 = owner Note，全文的家 = git（零维护、不腐化、自带时间戳）；目录里的是第二份
  事实 + 无人读的坟场——「不能一直留在这儿」反对的正是工作树堆死料，换门牌不解决问题。可达性缺口
  （git 不便浏览）由收尾 Note 记 SHA 补足。
- **全部保留只加状态行不删**：腐化源头没除，且违背「活研究进、落地即出」先例。输给三选一。
- **已消化研究稿毕业迁入 implemented/**：研究稿是输入不是决策记录；毕业 = 正文改写后原稿是脚手架不是合同，
  迁移只会把 implemented/ 变成第二个研究堆。输给「结论并入 + 原稿归 git」。

## 验证

- `pnpm verify`：ALL PASS（本轮实跑；md-links 含 notes 树零悬空——被删两稿的全部引用同 diff 改写；
  doc-budget dev-loop 440/440——新增 1 条规则 + 三条既有细则压单行，净增 0 行；裸路径门禁无新违规）。
- 按改动面选档：纯 docs/notes 变更，无代码面——test / preset-smoke 等不适用。

## 条目去向

- 规则 owner = [开发环 §12](../../docs/guides/dev-loop.md)（本 Note 为裁决记录与首轮台账）。
- **第二轮清扫（2026-09-26）**：上一条的处置**已执行**——`dsh-upstream-delta` 与 `pin-upgrade-and-harvest`
  毕业删除（6 处入站链接改文字引用）；`harvest-ledger` 留（唯一消费者 = 搁置池六项出处）；
  `harness-alignment-ledger` 留（四处活引用）；`human-agent-ux-patterns` 留（用户裁定）。
  五篇 → 三篇，**留下的每篇状态行写明唯一消费者 + 毕业触发**（不再有"模糊挂着"的条目）。

- 收割轮收口时按各稿新状态行处置：upstream-delta 与 pin-upgrade-and-harvest 毕业删除（结论落收割轮收尾
  Note / harvest-ledger）；收割轮产出的 harvest-ledger 按同规则进 research/。
- 无队列条目变更（记事面卫生线，随本 Note 交付）。
