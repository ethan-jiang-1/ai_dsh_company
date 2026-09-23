# 流程偏离清单 · 线 B（DSH 纪律对照审计）· 合并版

> 性质：R6 诊断件。**生命周期：销账完成即删除本文件**（修正进各家：实践/门禁/合同；登记进 D 号
> 与 R6 Note；git 留史）。方向铁律与处置优先序同线 A 清单头注。
> 权威与基线：vendor 树（`dsh-v0.1.5-rc.2` = fb2c4b9e…）；研究底稿 =
> [research/2026-09-23-dsh-inround-task-surface](../../notes/research/2026-09-23-dsh-inround-task-surface.md)。
> 枚举方法：vendor 八源逐行抄录（根 AGENTS.md / docs/AGENTS.md / testing.md / development.md /
> .agents/notes 四份 / .github 全套 / postmortem README / packages/AGENTS.md），非记忆——
> 98 行全量底稿已删除（派生噪声不留家；P4 重枚举从上述源清单重建，行号会随 pin 漂移、以节名为准）。
> 判型词汇：照搬OK / 适配已登记（偏离有约束证据）/ 偏离待修 / 不适用+理由。

## 一、已证实偏离（七项）

| # | 偏离 | DSH 实态（源） | 本仓实态 | 判定 | 修正 |
|---|---|---|---|---|---|
| V1 | 编号垂直轮迭代单位 | issue→PR 连续流 | 轮号制；D11 引据系 FAQ dev-loop 单变更生命周期的拉伸 | 适配（约束真实：fresh context + demo 优先）但引据须改写 | D23 转型（P4） |
| V2 | roadmap 积累历史 | docs 只写 now；任务关闭离队；归档冻结 | 已✅段/待办历史/收尾程序内联 | **偏离**（线 A 病根） | P3 门禁 + P4 队列化 |
| V3 | 轮内任务面零使用 | todo_write + plan mode 双反馈面（base bundle 自带） | plan 有仪式；todo 零纪律 | **偏离** | P4 条目环加 todo 纪律 |
| V4 | 纪律表凭记忆 | 权威在 vendor 树 | 12 行漏预算/slop/issue 流/todo | **偏离** | P4 全量清单替换 |
| V5 | 收尾程序住计划层 | 程序住 cookbook | roadmap 轮次交接清单 | **错家** | P4 迁 guides/60 |
| V6 | 无复查环 | 门禁持续核查 + CI | 纪律表写完从未重校 | **缺机制** | 五件套之 5（sync-dsh 挂钩） |
| V7★ | 集中台账制 | `.agents/notes/README.md:19`："**Do not add a centralized `INDEX.md`**; the active lifecycle tree is the working inventory"（有专门 rationale note） | notes/intents.md + 00-index 决策台账是一等交接载体 | **反向适配**：fresh-context 换轮必需台账，DSH 的活树浏览不适用——但从未登记为明示偏离 | P4 登记进偏离注册表（约束：换轮换上下文） |

## 二、待审 28 行（SubC 枚举中判"偏离待审 25 + 适配待审 3"，浓缩；全表已删，P4 从源重建）

**偏离待审（25）——按处置聚类：**

| 聚类 | 行（SubC#） | 内容与建议 |
|---|---|---|
| A. 门禁时点纪律缺位 | #3 pre-push 检查、#67 lefthook 三钩 | 单人无 PR 可裁剪，但"push 前必跑"时点缺——**修**：收尾清单加"commit 前跑迭代环"一步（P4 合同 B4） |
| B. 文档机制缺位（=V2/V4 细化） | #47 只写 now、#52 词数预算、#53 slop checklist、#48 一段一物理行、#73 Note 就地更新、#74 归档冻结、#75 supersession、#78 Note 删除合并 | **修**：#47/#52/#53 进 P3 门禁 + 卫生合同；#48 裁剪登记（中文硬换行是本仓既有形态，照搬 = 全仓重排，不值）；#73/#74/#75/#78 进 P4 合同的低频条款（登记后按需启用） |
| C. 流程面缺位 | #31/#32/#79 PR 流与模板、#81 Issue 模板、#80 Issue 状态机（适配待审） | 无 GitHub 面——**不适用+登记**（等价物：队列/同 diff 收尾/收尾 Note 模板）；PR 模板三段（Motivation/Changes/Testing+Proof）**可裁剪进收尾 Note 模板**（P4） |
| D. 小实锤 | #39 typecheck（guides/60 写了步骤但 package.json 无 script）、#33 TODO 标记语义、#21 空 catch 说明、#22 注释只写本地事实 | **修 #39**：package.json 加 `"typecheck"` script（P2，机械）；#33/#21/#22 一句话进纪律表（P4），暂无违规实例 |
| E. 测试面待审 | #4 coverage gate、#56 HMR-safety 测试、#63（适配待审）快照 same-PR→轮末、#46 tutorial/reference 分类 | #4 不适用+登记（无 CI）；#56 转待办（pack client 面长大前）；#63 **修**：行为变更同 diff 归档进收尾清单（时点补齐）；#46 低优裁剪登记 |
| F. 其他 | #72 台账（=V7）、#93/#94/#95 pack README 三则、#97 todo/plan（=V3）、#40 用词纪律后半 | #93–95 转待办（pack 长大前补 Known Limitations 节等）；#40 裁剪登记（中文语境） |

**适配待审（3）**：#63（归 E）、#80（归 C）、#98 纪律 skill 化——**值得做**：把收尾模板/slop checklist 做成 `.agents/skills/`？DSH 用 skill 承载纪律避免指令文件变长，与本仓"指令是 advisory"结论同向。**转待办**（P4 后评估，不占本轮）。

**照搬OK 24 / 适配已有据 24 / 不适用 22**：无行动面，P4 重枚举时自然入表（判据：只报告实跑命令、model-visible⟺logged、fail-loud、vendor 铁律、测试七层重切、postmortem 标准照抄等——研究笔记 §二 与本仓 verify 门禁清单可交叉复原）。

## 三、弹性边界结论（进流程合同 B2）

- **允许的裁剪**（登记后生效）：无 GitHub → 队列 + 同 diff 收尾 + 收尾 Note 模板；无 CI → 本地门禁代行 + coverage 不适用；中文单语；fresh context → 集中台账（V7）+ 入口链交接；无归档层（规模）；中文硬换行（#48）。
- **不允许的偏离**（本轮修）：计划层积累历史；反馈面闲置；纪律不枚举；程序错家；无复查环；快照时点弱化。
- 一句话判据：**裁剪删"规模用不上的面"，不删"防走样的机制"。**

## 附 P3 · 入口链探针设计（dev 底稿已并，原文删）

- 题单 8 问三分类（状态过期/事实家漂移/自相矛盾），每题机器可核 token：Q1 当前条目+依据文件；Q2 下一条目；Q3 三态规则家（公司手册）；Q4 vendor tag+铁律（`dsh-v0.1.5-rc.2`/只读）；Q5 preset 完成定义（preset-smoke/dump 不算证据）；Q6 流程形态与依据（feature 流/D23）；Q7 认证档边界（guides/60 §9.1/不进回归）；Q8 矛盾以谁为准（台账/收尾 Note）。
- 形状：`scripts/entry-probe-smoke.mjs`（认证档）起真 web 会话，prompt 限读入口链三件；答案归档 `snapshots/entry-probe/<date>/`；两层断言（token grep + 人抽查）；**反证**：临时改 AGENTS.md 过期陈述 → Q1 红 → 还原绿（记录）。
- 开放：preset 用 standard（测入口链非人格）；不建金样（答案随文档演进，每轮跑新的）。

## 附 P4 · 两合同骨架（dev 底稿已并，原文删）

**文档卫生合同（进 00-index 现有"文档组织原则"节扩展，不新增文件）**：A1 tier 表（一处事实一个家：入口链=常备令/导航=地图台账/合同=现在时/指南=程序/计划=纯队列/时间层=notes）；A2 只写 now 的可查子集进门禁（禁计划层 ✅、禁历史叙事进合同层、词数上限——数值销账后定）；A3 命名体系（主题命名不时间编码；编号方案 N1 待定；旧名不硬迁）。
**流程合同（进 guides/60 现有章节扩展，不新增文件）**：B1 条目生命周期（Plan Mode 呈批 → todo_write 实施期 → 同 diff 收尾：docs now + Note + 门禁绿 + 完成即离队）；B2 偏离注册表（默认严格；初始集 = V1/V7/无 GitHub/无 CI/中文单语/fresh context/#48 硬换行/无归档层）；B3 五件套引用；B4 硬规矩继承（竖切/最窄验证/分层/轻任务/实跑报告/D15 + push 前迭代环）。
**开放决策（呈审时定）**：词数预算数值；编号方案；认证档全量扫节奏（按条目改动面 + 间隔）；AGENTS.md 纪律表替换形状（指向 P4 全量表还是内联缩编）。

## 销账记录（P2 填）

（待填）
