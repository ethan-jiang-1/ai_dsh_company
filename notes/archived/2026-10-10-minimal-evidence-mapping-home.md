# 2026-10-10 · 改动面行级映射单家化与 fresh-agent 审计修复轮

状态：implemented（2026-10-10 用户审阅 fresh-agent 审计报告后令「发现的问题全都要修」；行级映射搬家是本轮唯一需记录取舍的决定，其余为事实落点就地改新）

## 问题

fresh-agent 审计（本日）发现三类结构性问题：

1. **双写**：[docs/testing.md](../../docs/testing.md) §2 与 [tests/README.md](../../tests/README.md) 各持一张「改动面 → 检查」表——六行重叠、粒度略异，是「一处事实一个家」的现行违例面；run-gates 的 doc-budget 注释已自我点名（testing.md 顶格 75/75，「§1 分层表与 tests/README 有重叠面可搬」）。
2. **内容相左**：[docs/guides/dev-loop.md](../../docs/guides/dev-loop.md) §1 第 5 步与 §12「完成条目」写「`_backlog` 表行/卡验收通过后离场」——与 2026-10-09 章制（[_backlog/README.md](../../_backlog/README.md)：结论 + 交接去向已记录即可关闭，**不等**实施验收）相反，且「表行」是 D32 已退役的队列概念。
3. **登记漂移**：[docs/index.md](../../docs/index.md) 外部材料登记缺第七处（`ai_dsh_assitant/_backlog`——现行 `_backlog` 制度 2026-10-09 整体重立的借源），D31 行仍只指向 D31/D33 前朝；D30 行「research 目录退役」未说清退役的是 notes 侧旧 research 层，现行调研家 `_backlog/research/` 反而像被退役了。

取代检查：活跃树无同决定 owner——最近邻 D36（台账纯路由）、D38（Note 事实落点时效）不与本 Note 冲突，无取代。

## 决定

1. **行级映射的家 = tests/README**（合并两表为一，增「同 diff 义务」列承载 testing.md §2 的政策判据）；testing.md §2 只留政策原则（同 diff 交付 / 不替代组装转录）并留一行指针。导航面是 AGENTS.md/orient/README「选验证」路由的实际落点，agent 查表就在那里；宪法管"什么算证据"，导航管"先跑哪个"。
2. dev-loop §1/§12 收口措辞改为指针（`_backlog` 卡关闭条件唯一家 = 其 README），删除「表行」残词。
3. index.md：外部材料登记补第七处行；D31 行补 2026-10-09 重立路由；D30 行家改 notes/README 并消歧义；台账前言登记「反向（制度级重立必有台账行/登记行）无门禁」的已知缺口与升格触发条件。
4. 机械教导面修正：根 [AGENTS.md](../../AGENTS.md) 布局补 `.agents/skills/`（完成定义 skill 的家，D39——计数不入文档，清单 = 目录本身）+ 命令表 preset-smoke 补 `source run/env.sh` 前缀；tests/README 无 key 首跑补 bootstrap 前置；dev-loop §9.1 预算口径改新（tests 阶段 vs 进程全程）；orient 词表补 research 四义与三层/九层口径；README/orient/AGENTS 展开 DSH = DeepSeek Harness；[architecture](../../docs/design/architecture.md) 性质句改写（原句「当前合同归本目录维护」与 docs/AGENTS.md 分层相抵）。

## 输掉的方案

- **反方向合并**（删 tests/README 表、行级映射留宪法）：拒绝——三份入口文档的「选验证」路由都落在 tests/README，导航面才是查表处；宪法里放操作表会让 testing.md 更顶格，且导航文件失去其存在理由。
- **给「制度级重立必有台账行」升机械门禁**：拒绝——门禁升格判据（dev-loop §9）要求错误本仓复发过，目前一例（2026-10-09 backlog 重立漏登记）；且「重大/制度级」不可机械判定。处置 = 台账前言登记缺口 + 本轮补路由，复发再议。
- **给 backlog 重立补 D42 台账行**：拒绝——index.md 顶格 143/143、无既定腾行来源（本条写作时引用的「D1–D9 家迁移腾 9 行」处方，已由 [2026-10-09-decision-ledger-home-migration 已结卡](../../_backlog/_archive/settled_issues/2026-10-09-decision-ledger-home-migration.md) 于同日裁决否决——design 节锚是出生即 design 的依据、迁移腾不出九行；2026-10-10 事实落点随 run-gates 注释修正就地改新）；在 D31 行补路由达到同等可发现性，零行成本（index 净行数不变：剔一行与 D15 重复的 notes 表路由 + 增一行第七处登记）。

## 后果

testing.md 降至约 71/75（顶格缓解一档）；tests/README 成为行级映射单家（骨架锚点 persona / client 面板 / 读模型 / 检查与工具入口由 navigation-assets spec 继续钉住）；runtime-map、orient、根 AGENTS.md 对「查表去 tests/README、政策去 testing.md」的既有指针仍然成立，无需改。
⚠ **纠正（2026-10-10 独立盲审实测抓到，同轮已修）**：上句对 `notes/README.md` 的指控**不成立**——该文件那行问的是「改动面 → 最小证据**选择**」（= 已迁走的**行级映射**），却仍单点指 `testing.md §2`（现只剩政策），fresh agent 照它点进去选检查会扑空。已改指 `tests/README.md`（政策指针另列）。
⚠ **再补一处同源漏网（同日第三轮盲审抓到，已修）**：`.agents/skills/preset-change-definition/SKILL.md` 第 15 行引「与纯措辞润色的**分流判据** = testing.md §2（带旧锚点）」——该「分流判据」逐字就是本文迁走的那张表 persona/skill 行的「同 diff 义务」列内容；该 skill 第 9 行本已正确指向 `tests/README.md`，**同文件内自相矛盾**。已改指 `tests/README.md` 的 persona/skill 行。
**教训（两处一起看）**：迁移后「既有指针是否仍成立」要按**每处指针的语义意图**逐条核——**它想取的是被迁走的东西、还是留下的东西**，不能按两条捷径判：① "关键词仍在目标文件出现"（本文件上句原判据）；② "锚点标题还在、链接能解析"（我修第一处时对第 15 行的误判——`md-links` 绿只证明链接不断，**不证明它指对了那张表**）。能机械守的只有"链接解析"，"指对了对象"这一步没有门禁，只能靠按意图逐条读。

## 验证

| 命令 | 断言 | 形态 |
|---|---|---|
| `set -o pipefail && pnpm verify` | 结构门禁全绿（md-links / bare-path / retired-path / ledger-routing / doc-budget：AGENTS.md 77/84、index 143/143、testing.md 71/75、dev-loop 388/395、orient 75/80） | ALL PASS（首跑曾红一次：ledger-routing 拦下 D30/D31「一句话」超 100 字符——链接语法计入单元格，链接改放「家」列后转绿） |
| `set -o pipefail && pnpm test` | 452 keyless 断言全绿，navigation-assets 钉住的 tests/README 骨架锚点全保留 | 44 files / 452 passed |

红证说明：本轮未新增门禁，无新负例义务；双写本身无门禁可红（doc-budget 只查行数）——它是被语义审抓到的，这正是「机器绿灯 ≠ 语义通过」的又一实例。未验项：真模型/真挂载档（entry-probe、preset-smoke）未跑——本轮改的是文档导航与指针，不触及其断言面，如实标未执行。

## 收尾语义审结论（dev-loop §13）

四输入过一遍当前 diff：①授权原文 = 审计报告的发现清单（P1/P2/P3/Q1 三缺口 + 台账单向性），逐条对照已修，范围外多做 = 无；②该面合同文档同 diff 改新（testing.md / tests/README / dev-loop / index / orient / README / AGENTS / architecture）；③证据选层 = 文档/指针面最小证据即 verify + test（testing.md §1 第 1 行），未混入更重的档；④Note = 本文件。发现并当场处置：初稿曾在 §2 重复 §4 的 workspace.expected 独立编写句——删（新双写即造）；dev-loop §9.1 尾注「宪法还拥有改动面→最小证据映射」随搬家同步改新。
