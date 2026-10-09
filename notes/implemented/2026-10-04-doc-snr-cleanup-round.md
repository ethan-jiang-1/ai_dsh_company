# 打扫卫生轮：入口链信噪比与一致性清扫（批次①+② 落地）

状态：implemented（2026-10-04 一次会话内完成批次①机械修复 + 批次②三裁断落地 + ④ intents.md 退役（D34，进行中追加）；判定材料 =
[_backlog 卡](../../_backlog/_archive/settled_issues/2026-10-04-doc-snr-cleanup-audit.md)（同日毕业迁档））

## 决定（用户三拍板，2026-10-04）

1. **AGENTS.md = 读者身份句 + 轻瘦身**（否决"只加身份句"与"大瘦身"）：开头补一句「你（读者）=
   维护本 repo 的开发 agent，五个 wochen 角色是产物」；三实体表 10 行压成 5 行散文（三实体指针全保留）；
   纪律表 11 行并成 6 行（全部 vendor 权威指针与落点保留，只并条目不删指针）。行预算 101→95。
2. **测试分层两表并到 testing.md**（否决"保持两表只对齐"与"并到 dev-loop"）：testing.md §1 收编
   重放 lane 与 CLI 集成两行（机制冒烟行拆出 replay），成为 9 层唯一层定义家；dev-loop §9.1 降为
   命令/预算速查 + 指针，补行为质量档行。头注压缩 2 行腾预算（75/75 守住）。
3. **scripts 探针退役标记 = 头注状态字段**（否决"迁 _spent/ 池"与"只修 migration-rehearsal"）：
   全部 39 个脚本头注自述「状态：常驻 | 已耗（YYYY-MM-DD+原因）」；新机械门禁 `script-status`
   （verify.mjs 2f-bis，反证已证：剥行红→还原绿）；已耗标记 = migration-rehearsal（C1 已执行，
   头注改退役口径）、harvest-probe（收割证据件）；**candidate-scan-eval 判常驻**（testing.md §4
   在引用它，审计怀疑"实验 B 已耗"不成立）；sync-dsh 补齐唯一缺失的「何时跑」头注。
4. **intents.md 退役（D34，用户裁定「有了 `_backlog` 还放在这儿是噪声」，本轮进行中追加）**：
   整表先按月冻结再删活文件；拆 `intents-row-budget` 门禁（verify.mjs 留墓碑注记）与
   （2026-10-09 清扫删掉那两份冻结表：它们仍是账，不是决定。历史在 git。）
   dev-loop §12 窗口规矩（换一行"授权链与时间轴"负知识）；指针重接 = AGENTS 布局行 + 纪律行、
   dev-loop §12 ×2、index.md notes 行、verify NOW_FILES/PIN_SKIP_FILES、entry-probe Q11 +
   两个 spec。理由三条：第三本账（内容 100% 派生自 Note 状态行，反双记账同款病）、膨胀病史三次
   （40.5KB 胖行 / 96 行超窗 / 本轮 61 行触限）、违反上游 no-index 教义（vendor notes README
   "Do not add a centralized INDEX.md"——活跃树即清单）。时间轴与授权链的替代面 = notes/ 文件名
   日期 + git log + Note 状态行。

## 批次①机械修复（各改事实 owner）

- 死 ROADMAP 指针 ×3：demo.md（镜头纪律）、ui-demo.md（槽位表）、index.md（D 台账前言）——均改
  "留升级路径 + D32 行指针"。
- pre-D32 Note 时代注记 ×2：foundation-remediation（「ROADMAP 是唯一调度家」）、multi-human-ux
  （「已入搁置池并成提案稿」）——加 ⚠ 横幅注记，正文不重写。
- 证据纪律条数三说：testing.md 标题去「九条」、dev-loop §9.1 去「七条」（条数 rot，实列 8 条自计）。
- multi-human.md「缺这条区分——已登记待补」→ 更正为手册已含（RFC f 行闭合）。
- presets.md 自主节律尾行（L149 仍说住退役搁置池）→ 批 3 已落地口径；批 3 行「搁置池复活项」尾注同步。
- AGENTS.md §0.5 句统一（L68 /§12 去除；index.md L53 同步）+ 任务源句退役历史压缩（细节一处
  hop = dev-loop §0.5 分支②）。
- demo.md 场景 F 观测点日期口径 → 真日期（`日期待核` 仅限 fail-closed）。
- motion-ledger 成品口径 → `deliverables/<日期>-<slug>/final.md` + 存量迁 archive 注；公司手册
  「事实的家」补 motion-ledger 户口行（台账页签数据源此前 0 命中）。
- cfo CHARTER sea-reconcile-2026 条目「日期待核」标题 → 2026-09-26（同条目括注与归档文件名均证）。

## 验证（实跑）

`pnpm verify` ALL PASS（doc-budget：AGENTS 95/105、testing 75/75、dev-loop 391/395、手册 195/195；
script-status ×39；md-links/bare-path/backlog-liveness 全绿）；`pnpm test` 283/283（1.19s）。
script-status 反证三步留证（sed 剥行 → FAIL script-status → 还原绿）。

## 输掉的方案

- **AGENTS 大瘦身**（布局树砍到 6 行、纪律表降 3 行指针）：hop-0 最干净，但搬运量大且纪律表指针
  并删有漏的风险——用户取轻瘦身；大瘦身留作下次手册注入字节逼近年限时重提。
- **scripts 迁 `_spent/` 池**：物理分家更彻底，但 import/相对路径要跟着改、且位置即状态的语义
  （脚本留在原地 = harvest-ledger 证据链可考）更合本仓"加标记"惯例——否决。
- **给 pre-D32 Note 直接改写正文**：违反"implemented 只跟事实/当时事实保留"——取 ⚠ 横幅注记
  （同 research-notes-lifecycle 先例）。

## 未做 / 观察（审计 C 类杂项，不阻塞毕业）

两张已归档 BDD 卡状态行残留祈使「下一步」与 reference/ 标签、date-rule/time-context-probe 判据指
坟场卡、167 个 .md 权限 600/644 混杂、intents 底部 backfill 行排序注记只在归档文件头——均低害，
留下次路过顺手收；AGENTS 布局树 D 号考古（D31/D33）本轮未砍（轻瘦身边界）。
