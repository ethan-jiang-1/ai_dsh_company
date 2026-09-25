# 2026-09-25 · 打磨轮：磨清单四项清账 + 打磨型 goal 形态首实践

状态：已交付（2026-09-25：四项清账——2 修 + 1 复核已合规 + 1 文档节；行为验证一条红证如实记「需机制」；实况见文末）

## 问题

ROADMAP §磨清单（notebook-hygiene 立）现有 4 项低优先磨活无主：三条执行期观察项
（事件复盘场成员 journal 缺席〔W8 同款第二次〕/ CEO journal 文件名自记日期漂移 / q3 场 `final.md`
换行不合规）+ snapshots 与 live 盘差异逐项语义目录。它们是"发现的真问题"，正是
[longrun-goal-shape](../implemented/2026-09-25-longrun-goal-shape.md) 定义的**打磨型输入源**——放着不清，
下次复盘还会撞同样的坑。

## 方案

1. **逐项小修**（每项独立 commit，验收各自明确）：
   - **journal 缺席**：内容面修——相关角色 persona/skill 补一句"收工必须写 journal"（改 preset 内容 ⇒
     preset-smoke 验收）；
   - **文件名日期口径**：CEO skill 写清 journal 文件名的日期取法（自记日期漂移 = 口径缺失）；
   - **q3 换行**：直接修 `company-workspace/deliverables/q3-business-review/final.md` 的结尾换行
     （`deliverables-check` 由红转绿即验收）；
   - **snapshots 语义目录**：文档活——`snapshots/README.md` 或各 snapshot.yml 补"与 live 盘的差异逐项
     语义"节（读档人不靠猜）。
2. **打磨型 goal 形态首实践（dogfood）**：本轮按 dev-loop §0.5 新写法起 goal——objective 写
   **预算（1–2 轮）+ 输入源（§磨清单）+ 枯竭即收口**；跑完把"形态好不好用"的实测体会记进收尾 Note
   （长程 goal 形态条目的验收回访）。

## 输掉的方案

- **四项各开一条队列行**：粒度太细违「队列行 ≤3 行」；输给"一轮清账"。
- **只清不练**：打磨型形态立了没用过，写法对不对没有实证；输给"顺带 dogfood"。
- **snapshots 语义目录做大**（逐场景全量比对）：磨活不是工程，先补"读档人需要的语义说明"，全量比对
  等真有人读档撞墙再说。

## 验收

- 磨清单四项全部清账（修掉或明确归宿），§磨清单节清空或仅剩带触发的待办；
- preset 内容改动 = `preset-smoke` ALL PASS；q3 项 = `deliverables-check` ALL PASS；文档项过 `pnpm verify`；
- 打磨型 goal 形态实测体会记入收尾 Note（含"写法哪里别扭/哪里好用"）。

## 风险

- journal 缺席是**行为问题**（模型不守规矩）而非纯文档——skill 加句能不能真管住要实测（probe 内容档或
  下一场动议观察）；管不住就记"文案不够、需机制"，不硬凑。
- 打磨型 goal 与收割轮（交付型）混跑会互相干扰；对策 = 顺序执行不并行。


## 实施实况（2026-09-25 交付）

- **journal 缺席**：五份 skill 的收工步加**硬闸门**语气（"没写 journal = 任务未完成"）；
  **行为验证一条红证**：排练单发任务实测——draft 按工作流形态正常产出（skill 生效于出稿），但
  journal 步仍缺席（8→8 篇）⇒ 按本 RFC 风险预案记 **「文案不够、需机制」**：机制候选 =
  ① CEO skill 定稿盘点步加"各成员 journal 在场盘点"；② deliverables-check 式 journal 审计（注意
  排练/真盘边界）。**重挂磨清单**（带机制候选与触发）——不硬凑、不假装文案解决了行为问题。
- **CEO 日期漂移**：记账步立**文件名日期口径**（读 journal/ 最新一篇取次日；没把握标「日期待核」，
  不凭记忆猜——红证：本盘无系统时钟，模型只能猜）。
- **q3 换行**：复核**已合规**（xxd：`。\n` 单结尾换行；deliverables-check 持续 ALL PASS）——磨项清账。
- **snapshots 语义目录**：snapshots/README 加「快照与 live 盘差异的语义」节——时点基线 vs 演进现在
  （同名 slug 漂移 = 正常演进）、journal 轮末收敛差异、排练/真盘隔离；判腐化走 replay/deliverables-check。
- **验证**：verify ALL PASS / test 186 / **preset-smoke ALL PASS**（skill 改动的完成定义）/ deliverables-check
  ALL PASS；行为探针 ≈ $0.3（boot+一轮，无浏览器）。
- **打磨型 goal 形态回访**（dogfood）：本轮在交付型总 goal 内执行（队列恰两项，未单起打磨型 goal）；
  打磨的**机制面**实践成立——输入源（磨清单）→ 逐项清账 → 枯竭（四项全处置，新发现重挂）即收。
  形态首次单独起跑留给未来"自动琢磨打磨"类请求；本轮实证一条：**打磨型输入源会自我繁殖**
  （行为红证又生成一条新磨项）——"枯竭即收口"的判据要按"本轮不再新增磨项"算，不是"清单清零"。
