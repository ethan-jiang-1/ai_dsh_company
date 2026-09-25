# 2026-09-25 · 打磨轮：磨清单四项清账 + 打磨型 goal 形态首实践

状态：proposed（2026-09-25 入队；排在收割轮之后——收割轮的判定/实测先清，本轮收内容面尾工）

## 问题

ROADMAP §磨清单（notebook-hygiene 立）现有 4 项低优先磨活无主：三条执行期观察项
（事件复盘场成员 journal 缺席〔W8 同款第二次〕/ CEO journal 文件名自记日期漂移 / q3 场 `final.md`
换行不合规）+ snapshots 与 live 盘差异逐项语义目录。它们是"发现的真问题"，正是
[longrun-goal-shape](./2026-09-25-longrun-goal-shape.md) 定义的**打磨型输入源**——放着不清，
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
