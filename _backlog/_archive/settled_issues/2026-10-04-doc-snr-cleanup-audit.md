# 推敲：入口链信噪比与一致性清扫批（2026-10-04 四线审计）

> 状态：已毕业（2026-10-04 用户三拍板 + 点名执行，批次①+② 同日全落地；去向 = [implemented/2026-10-04-doc-snr-cleanup-round](../../../notes/implemented/2026-10-04-doc-snr-cleanup-round.md)；残余观察项见该 Note「未做」节）｜毕业门判断 = 该做→已消化｜下一步 = 无（重启以新卡回场引用本卡）

## 背景 / 触发

用户令「打扫卫生」：① fresh agent 视角下入口链（agent 链 / 任务执行链）的渐进披露是否不多不少、AGENTS.md 披露整个文件系统是否过度；② 全仓信噪比、有无概念相左。方法 = 四路独立子代理审计（docs 层 16 篇 / notes 层 124 件 / `_backlog`+`scripts`+共享盘 / fresh-agent 链路模拟）+ 亲跑 `pnpm verify`（全绿）。关键行号均已对盘复核。

## 总判定（先说结论）

- **入口链结构健康**：3 跳（AGENTS.md → dev-loop §0.5 → `notes/proposed/`）无环、能终止；当前 0 张已批 RFC 时正确动作是「报告后停止」，[dev-loop](../../../docs/guides/dev-loop.md) L26「不从历史条目推断任务」守得住。任务源三处（AGENTS.md / dev-loop §0.5 / index.md）表述一致（D32）。verify 自述门禁清单与 AGENTS.md 声称吻合（pin-bookkeeping 对 AGENTS.md §vendor 簿记是逐字机械核对，非 D28 病）。
- **两大系统性噪声模式**：①「用完的东西没有已用完标记」——退役机制残留活指针、已执行迁移脚本头注像活触发器、一次性探针无退役注记；②「now 层文件内联历史考古」——括号注里塞 D 号来龙去脉/负例出生现场/当年用户原话。
- **最大单点缺口**：AGENTS.md 通篇没有一句「你（读者）是维护者 agent，五个 wochen 角色是你维护的产物」——agent 链里 dev agent 与公司 persona 的区分全靠读者自己推断（「维护者」一词只出现在注入成员会话的公司手册里）。

## 已知与未决（发现清单，按严重级）

### A. 误导级（fresh agent 会被引向不存在/已废对象）

1. **死 ROADMAP 指针 ×3**：[demo.md L53](../../../docs/demo.md)、[ui-demo.md L54](../../../docs/design/ui-demo.md)、[index.md L53](../../../docs/index.md)（台账前言「搁置池准入条件见 ROADMAP」）。D32 声称「痕迹彻底清理」仍有漏网；index.md 台账行内 `plans/roadmap` 属历史语境可留。
2. **pre-D32 Note 无「已废」横幅**：重 ×2——[foundation-remediation L9](../../../notes/implemented/2026-09-24-foundation-remediation.md)（「ROADMAP.md 是活动/暂停项的唯一调度家」，读作现行路由）、[multi-human-ux L5](../../../notes/implemented/2026-09-26-multi-human-ux.md)（「已入搁置池并成提案稿」，所指两物现均不存在、无前向链接）；轻 ×3——notebook-hygiene、enforcement-channel-and-boundaries、client-review-fixes（修法 = 仿 [research-notes-lifecycle L3](../../../notes/implemented/2026-09-25-research-notes-lifecycle.md) 的 ⚠ 一行横幅）。
3. **`scripts/migration-rehearsal.mjs`**：C1 迁移已执行（2026-10-03，卡已毕业），头注仍是活触发器口径且 `--execute` 写真盘——最危险的一件。
4. **[motion-ledger L3](../../../company-workspace/kb/motion-ledger.md)**：成品口径仍写 `deliverables/<slug>/final.md`，而 27 个动议全已迁 `deliverables-archive/`——台账自己的定义在当前盘上为假。
5. **[demo.md L180](../../../docs/demo.md)**：场景 F 可粘贴脚本教人写「日期待核」占位——违反手册 2026-09-30 日期口径（真日期；占位仅限注入故障 fail-closed）。照脚本执行 = 违反手册。

### B. 概念相左（同一事实两处说法不一）

6. **公司页签数 5 vs 8**：[ui-demo.md L131/L138](../../../docs/design/ui-demo.md) + [index.md L146](../../../docs/index.md) 说五个平台页签；[cdp-probe.md L12](../../../docs/cdp-probe.md) 说八个，代码 `packages/company-pack/src/client/index.ts` L250 起注册八个（待办/看板/依赖图/在场/用量/任务板/培养/台账）。探针文档对，设计合同 + 地图过期。
7. **[presets.md](../../../docs/presets.md) 自相矛盾**：L102 说自主节律已由 0.2.0 收割批 3 落地；L149 说缺上游 seam 住退役搁置池——批 3 落地后尾行没跟上。
8. **[multi-human.md L38-39](../../../docs/multi-human.md)**「手册缺这条区分——已登记待补」：手册 L91-94、L149-150 早已含该区分（根会话 vs 被委派成员的分水岭）——「待补」已失效。
9. **证据纪律条数三说**：[dev-loop L267](../../../docs/guides/dev-loop.md)「七条」/ [testing.md L50](../../../docs/testing.md) 标题「九条教义」/ 实列 8 条（testing.md L52-59）。
10. **测试分层两张不重合的表**：dev-loop §9.1（8 层，含重放 lane、CLI 集成）vs testing.md §1（7 层，含行为质量档）——后者自称证明边界「唯一家」。
11. **[architecture.md L148/L154](../../../docs/design/architecture.md)** 通道 A 示例 YAML 用 `backgroundMode: continuable`——与 delegation.md/D18（one-shot，R3 实证）相反，且是可直接照抄的配置，更正只在 15 行后的散文里。
12. **AGENTS.md 入口句口径漂移**：L22/L72/L96 写「§0.5/§1」，L68 写「§0.5/§1/§12」（index.md L53 同后者）——统一为一种。

### C. 渐进披露（hop-0 载荷与户口缺口，非错误）

13. **AGENTS.md ~40/101 行是参考材料**：三实体表（② npm 全局 ③ 外部研究树对未跑过任何东西的 agent 无意义）、十行纪律表（唯一真正必须的一点——本仓 docs/testing.md ≠ vendor 同名文件——是表格前言里的一句脚注）、布局树内联 D 号考古（D31/D33 在阅读顺序上未定义）。修法方向 = KEEP 入口五件（身份句/任务路由/notes 段/命令表核心/vendor 铁律一句），其余 DEFER 到指针。
14. **任务源句被三套退役机制历史包裹**：AGENTS.md L22 要解析并 mental-discard 中心队列/磨清单/搁置桶三套死机制 + 两个 D 号才提取出一条活规则（dev-loop L23-26、README.md L12 同病）。
15. **scripts/ 混住常驻门禁与已耗一次性探针**：harvest-probe 自标「一次性」（诚实）、candidate-scan-eval / dag-midflight-probe 无标记；sync-dsh.mjs 是唯一无「何时跑」头注的脚本（32/32 合规的 script-triggers 门只扫模式名文件）。
16. **motion-ledger 无户口**：公司手册「事实的家」不提 `kb/motion-ledger.md`（grep 0 命中），但它是「台账」页签数据源、交付物多处引它、自带维护职责；[cfo CHARTER L39](../../../company-workspace/kb/cfo/CHARTER.md) 「日期待核」标题与同行「已回填并更名」自相矛盾。
17. **杂项**：两张已归档 BDD 卡状态行残留祈使「下一步」、引用标签写 `reference/`（实已随卡迁 `_done/_reference/`）；date-rule/time-context-probe 判据指向坟场卡；intents.md 底部 5 行 backfill 的排序注记只写在归档文件头；`_done/_misc` 外 167 个 .md 权限 600 与 README 644 混杂（无害）。

**未决**：C 类砍到多薄是品味问题（doc-budget 棘轮下 AGENTS.md 101/105 只余 4 行，须先搬后压）；发现 1 中 index.md L53 属台账历史语境还是活指针、批次②的三个裁断，均需用户拍板。

## 候选与取舍

- **批次①（机械修复，~12 项小修）**：死指针×3、Note 横幅×2、条数对齐实数、multi-human「待补」删、presets 自主节律尾行更新、AGENTS §0.5 句统一、demo 场景 F 日期口径、motion-ledger 口径 + 手册补一行、cfo CHARTER 标题回填、migration-rehearsal 头注标「已执行退役」。每项 = 改事实 owner + verify，符合 dev-loop §12 机械单步豁免。
- **批次②（结构性，需拍板三裁断）**：⑴ AGENTS.md 读者身份句 + 瘦身幅度；⑵ 测试分层两表并一（testing.md 自称唯一家，则 §9.1 表迁并）；⑶ scripts 一次性探针退役标记惯例（头注加字段 vs 集中迁 spent 池）。
- **取舍记录**：不建议为此新立 RFC 流程——批次①全在机械单步豁免内；批次②若拍板，按 AGENTS 行预算棘轮「先搬内容到该去的家，再压」。**不借**：给 notes/ 全量加中央索引（违背「文件树即清单」既定立场）；给 scripts 已耗探针立删除轮（harvest-ledger 等留作证据，加标记即可）。

## 毕业门

- **批次①**：清单逐项绿（`pnpm verify` + 相关面检查）即消化——逐项做完，本卡随最后一批关闭迁 `_done/_closed_plans/`，状态行记去向。
- **批次②**：三个裁断各得用户一句拍板 → 拍板即毕业（落 RFC 或并入批次①）。
- **反向出口**：用户判「现状可接受」→ 按「消化」关闭，本卡留档作下次升 pin 重校的输入。
