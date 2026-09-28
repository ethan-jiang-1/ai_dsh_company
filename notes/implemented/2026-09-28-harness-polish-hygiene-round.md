# 2026-09-28 · harness 打磨轮 2：FAQ 04/05/11/15 吸收 + 卫生清扫 + 十维复测

状态：implemented（2026-09-28。起因 = 用户令「时间到了打扫卫生和借鉴更好的 harness 的主意」——
上轮 [enforcement 通道](./2026-09-27-enforcement-channel-and-boundaries.md) 清掉结构性缺口后，
本轮补判 FAQ 家族其余四个相关目录并清偿在案卫生债。三项用户裁决当日给齐：owners 死副本删除 /
空会话清除 / journal 日期授权回填。）

## 一、借鉴落地（判定 = [archived/faq-04-05-11-15-judgment](../archived/2026-09-28-faq-04-05-11-15-judgment.md)，立即借九条）

1. **常驻注入面纳入行预算**：`verify.mjs DOC_LINE_BUDGETS` + `['company-workspace/AGENTS.md', 195]`
   ——手册（186 行 ≈ 16.4KB）是随每个成员会话注入的最大常驻面，同享棘轮（只降不升、上调须 Note）。
   **负例已证**：填 10 行 → 196/195 红 → 按备份还原 → 186/195 绿（还原用 `cp` 备份不用
   `git checkout`——上轮瘦身轮事故教训的直接应用，本次工作树有大量未提交内容）。
2. **pack README 已知限制段**：钉版基线 / 子会话审批受限 / 浮窗垫片 / 注入基线与宿主 maxBytes
   （maxBytes 两端核对结论一并写在此处：overlay 未显式配 ⇒ dsh 默认 65,536B，基线 ≈ 26–28KB 够用）；
   dev-loop §12 收尾清单加「pack 行为面变更同 diff 更新该段」。
3. **dev-loop 五处**（383/395，预算内）：§0.5 goal objective 引用授权原文、扩围即回授权（FAQ 15）；
   §9 门禁升格判据——具体错误复发过 + 可机械判定 + 负例已证，语义要求不做成 gate（FAQ 15）；
   §12 宣布完成前对照条目原文验收需求/体验（FAQ 15）+ 整片 revert（FAQ 11）+ 空气规则三选一收口
   （FAQ 11）；§2 补 `AGENTS.local.md`/`CLAUDE.local.md` 临时叠加句（vendor agent-instructions 实证支持）。
4. **运维 runbook 一行**（guides/budget-and-ops.md）：改手册/CHARTER 进行中会话看不到 = 触达驱动注入
   无 watcher，处置 = 碰一次工作区文件或重开（防 demo 现场误判挂载坏）。
5. **role-content-plan 一句**：skill `description` 是常驻注入面，每条必含"何时用"触发时机。

## 二、卫生清扫（用户裁决三项 + 两处易腐常量）

1. **owners 双家销账**：`packages/company-pack/src/lib/routing.ts`（`OWNERS_TABLE` 死副本 +
   `roleOfWho`/`routeByRole`，全仓零生产消费者、仅测试 import）与 `tests/routing.spec.ts` 整体退场，
   git 留史；事实家唯一 = `kb/owners.md`（foundation-safety 对 kb 根三件的镜像守卫不受影响）。
   将来注意力面板要用路由时按红线流程重新接线（读 .md，不再手抄副本）。
2. **空会话清除**：dev home `session-94246222`（00:08）/`session-b6df0661`（00:09）——实核 = 单轮
   纯「你好」（preset 签名各含 ceo+vp-eng / ceo+coo，与瘦身轮 Note 记的 vp-eng/coo 对上）；备份
   `/tmp/wochen-hello-sessions-backup-2026-09-28/` 后删除。实质会话（含用户作答的实验腿证据）未动。
3. **journal 日期回填（授权代行）**：六份 `日期待核-*` 全部实为 **2026-09-26**——dev home 会话库
   时间线取证：quote-z 写入簇 = 09-26 20:51–21:07（present 会话 `session-88582ba0` 在内），
   sea-reconcile 写入簇 = 09-26 15:55–16:13，其后零写入。`git mv` 更名 + 首行日期 + 回填戳 + 活引用
   （cfo CHARTER 历史行 / 两份 final 盘点行 / journal 互引）同步更新；**过程稿（drafts）里的规则性
   文本不动**（档案不篡改——当时占位就是对的）；快照冻结件不动；排练场运行态不动。
4. **易腐常量两处**（docs/index.md，D28 口径）：外部研究树「199 个提交 / describe 串」→ 改为无数字
   表述 + 钉基线复核结论（2026-09-28：被引用文件自注册起零变化）；FAQ 07 行「16 文件」计数删除。

## 三、十维复测（对照 09-27 基线快照 = [harness-gap-audit-faq07](../archived/2026-09-27-harness-gap-audit-faq07.md)）

| 维 | 09-27 | 09-28 复测 | 依据 |
|---|---|---|---|
| 变更闭环 01 | 像回事 | 像回事 | 无回归；本轮自身即按闭环走（代码+docs+测试+Note+intents 同批） |
| 归属 02 | 像回事 | 像回事 | **owners 双家消除**（唯一在案双家清零）；易腐常量两处清理 |
| 决策记录 03 | 像回事 | 像回事 | 无变化 |
| 静与动 04 | 像回事 | 像回事 | journal「日期待核」回填队列清偿（回填债 = 0） |
| 正确路径 05 | 像回事 | 像回事 | 无变化 |
| 入口链 07 | 像回事 | 像回事 | 饱和解除维持（100/105、139/146、383/395、手册 186/195 新栅栏） |
| 执行链 08 | 像回事（继承） | 像回事（继承） | 无变化 |
| 反馈 09 | **有但不成体系** | **像回事** | pre-push hook + CI（三跑闭环绿）+ 19 类反证账 + skill 三件套；本轮新增预算行带负例上岗 |
| Skills 11 | 像回事（偏弱） | 像回事 | 边界三件套补齐后维持；description 触发时机约定又进一层 |
| 披露 13 | 像回事（继承） | 像回事（继承） | 注入面从「无口径」变「有栅栏 + 已核对 maxBytes 两端」 |

**结论：十维全部「像回事」（两维继承），无结构性缺口**——超过 FAQ 06 的「像回事」总验收线。
剩余全部为「有压力再借」档（触发条件见判定稿），与「不照搬」台账（继续守）。

## 输掉的方案

- **handbook-smoke 加注入字节数打印**：手册已有行预算栅栏 + pack README 记了基线数值，打印属重复
  事实家；等真实压力信号再说。
- **只删 `OWNERS_TABLE` 保留 `roleOfWho`/`routeByRole`**：两函数同样零生产消费者——留半死代码
  反而让「表没了函数还在」更糊涂；整文件退场最干净，要用时从 git + `kb/owners.md` 重建。
- **journal 回填走「轮末收敛」通道**：收敛 = 人做且是大动作（本轮非收敛轮）；日期回填是独立小动作，
  有会话库硬证据，授权后代行并在每份文件留戳，不动证据正文。

## 验证（实际跑过的）

- `pnpm verify` ALL PASS（新预算行 186/195 在列；dev-loop 383/395；doc-budget 负例红→还原绿见上）。
- `pnpm test` **230/230**（238−8 = routing.spec 死代码测试随文件退场）；`tests/layering.spec.ts` 无 routing 引用。
- 负例后终态：`git status` 干净度确认于提交前；md-links/裸路径门禁对新改文档全绿。
- 全仓活引用复查：六份 journal 旧名引用在活文件中为零（仅 drafts 规则性文本 / 排练场 / 快照保留）。
- **并行 Agent 观察（协议备忘，用户点拨）**：`kb/owners.md` 在 09:15 出现本会话之外的去指涉修改
  （删「routing.ts 重复事实家」注记——owners 侧配套清理，内容与本轮裁决同向但非本会话所为）。
  处置 = **按明确路径提交、排除该文件**，改动留给其作者会话；判据 = 「碰到工作树里非己方的、
  与己不重叠的改动 ⇒ 有并行 Agent 在同步执行，不吞并、不回滚」。

## 登记与指针

- 判定台账 +1 行进 docs/index.md §外部研究材料登记（04/05/11/15 → 判定稿）；intents.md +1 行指针。
- ROADMAP §磨清单 owners 行已磨即离队；renewal-y 归属与 dev home 探针残留两行维持原触发条件。
- 有压力再借六条带触发条件住判定稿，不进 ROADMAP（防磨清单膨胀——FAQ 15 升格判据同理适用于清单）。
