# 驾驭座第三轮：同请求三现的体感实证裁决 + 轮次回执/驾驶七问落地

状态：已交付（2026-10-08；批准：用户 2026-10-08 第三次点名读 `_dsh_plugin_agent_ready_development`「避免今后还是感觉驾驭无力」，经两轮选项确认——形状「重读收口+实证体检+定向调整」、落地授权「先呈修订方案再动」，随后逐条批准 A/B/C/D 与次序「A+B 先做，C 独立一轮」；授权链 = 本状态行 + [proposed RFC](../proposed/2026-10-08-dev-skills-pilot.md) 状态行）

## 问题

同一请求 34 小时内第三现：10-07 [realignment](2026-10-07-plugin-corpus-realignment.md)（28 页全判 + 五决定落地）→ 10-08 03:00 [strengthened-read](2026-10-08-plugin-corpus-strengthened-read.md)（验产 + 28 页亲读 + **零增量**判定）→ 03:34 用户再问且自述体感照旧（「驾驭感觉确实很糟糕」）。开工前核账三事实：① 语料零变化（外部树 HEAD `bbcf346ddb` = 10-07 0013 轮，工作树 clean，`verify.mjs` 过，`_coverage` 无 0014+）；② 前两轮判定产出全是 agent 侧事实；③ **「零增量」判定与「还是很糟糕」体感打架**——这个打架是本轮真正的诊断对象，第三次全量逐页判定被否（见输掉的方案）。

## 读法（可核验）

主会话亲读 native 卷全 4 篇 + 驾驶座页面（orient / tests/README）+ 本轮全部体检数据；sdlc 与 repo-harness 两卷由**两路无污染子代理**独立重判（不带前两轮结论），报回 9 项翻案候选——逐条回仓核实（下表）。体检三面：质量面 = 最近 12 篇收尾 Note 合规抽样；流程面 = git log 40 commits 轮次形状；资产面 = 索引完整性实测。

## 判定（H1/H2/H3）

**H1「前两轮判定有盲区」→ 基本维持，1 项翻案成立。** 骨架同构三路独立读一致。9 项候选核实：

| 候选（子代理报） | 仓内实况 | 裁决 |
|---|---|---|
| 开发 Skills 层缺失 | 仓无 `.agents/skills/`；vendor rc.2 `packages/skill/skill-filesystem/src/index.ts` `roots()` 实证自动发现 projectRoot 下 `.agents/skills/`（source `project-agents`）——机制在位缺内容；dev-loop 390/395 顶格佐证渐进披露缺失 | **翻案成立** → 条目 C |
| 门禁缺负例反证 | run-gates 22 区块 **21 个带「负例留证」**（日期+红绿形态，行内在案） | 误报 |
| 决定记录缺 Alternatives | [notes/README](../../notes/README.md) §二「备选必载」+「取代检查」俱在；近期 Note 全带「输掉的方案」 | 误报 |
| TODO 分档语义 | 代码 TODO 存量 **0**（实测） | 维持不采纳 |
| repository vantage | 10-08 已 conscious-skip；疑似复发（27→24 计数事故）的修法已落（管道实数） | 维持 skip |
| preset 生成清单+freshness | checks/README 索引 **16/16** 全命中零漂移；内容由 presets.spec + preset-smoke 守 | 维持（登记触发） |
| CI 分工 | `.github/workflows/ci.yml` + pre-hook verify+test；定界归 [ci-test-lane](2026-09-28-ci-test-lane.md) | 误报 |
| 收尾资产化缺失 | 每轮毕业留 Note/验证记录（120+ 篇，12/12 见下） | 误报 |
| 语义审升格门禁 | 立形状后 3/3 有记录且各有真发现——「维持指南」证据更足 | 维持 |

**H2「吸收了但没执行」→ 证伪。** 质量面实测：验证记录 **12/12** 全覆盖；语义审 10-07 21:48 立形状后 **3/3** 有记录（realignment / health-check / strengthened-read；[driver-purpose-top-level](2026-10-07-driver-purpose-top-level.md) 12:22 毕业早于形状落地 = 祖父豁免，其收割三问缺席属 doc-only 轮可辩护边界）；review 环真在工作——realignment 链收口后 3 轮 review 修掉 9+4+2 处真缺陷。**机器在转。**

**H3「驾驶座视图缺位」→ 成立，主病灶。** 四实证：① 同一请求第三次，前两轮产出未触及体感；② 质量环工作但驾驶座只见「收口了又修三遍」的返工形态，语义审产出从未以信心形态到过用户眼前；③ 资产零漂移（16/16）但用户动线上看不见——组织无病、可见性有病；④ 驾驶预算被元轮吃掉（10-05 一天六篇 steerability Note；10-06..08 九个 initiative 大半流程面，每轮结论「已对齐」→ 改文档 → 体感照旧）。

**裁决**：用户的反思「对 DSH 流程没吃透」在文本层两轮前已证伪；真缺口 = 流程全是给 agent 的维修手册，没给驾驭者做仪表。语料 native 00 开篇那句的另一半——「连成一条**可复查**的链」——复查的人是用户。

## 决定（同 diff 落地）

1. **条目 A｜轮次回执**：dev-loop §12 交接行重写为六行固定形状（外部行为与影响面 / 四链证据含未跑如实标 / 语义审结论 / 资产增量 / 未验证面与环境线索 / 下一脚建议），非平凡收尾必发；§0.5 goal 简报标注形状并入。依据 = native 00 §7 交付记录四要素 + repo-harness 01「任务完成后不依赖对话历史」。
2. **条目 B｜驾驶七问**：[orient](../../docs/orient.md) 补第七问「我驱动一轮，该在哪几脚踩刹车？」（立项脚 = 批 RFC 定验收，质量杠杆最重一脚 / 实施脚默认不打扰 / 收口脚收回执对照验收原文 / 体验脚四件套）；计数指针同步（**文件级四处 = AGENTS / README / index / orient，实改六行**——F2 同款口径，10-07 计数漂移教训直用）。
3. **条目 C｜开发 Skills 试点**：批准但独立一轮，RFC 落 [proposed/2026-10-08-dev-skills-pilot](../proposed/2026-10-08-dev-skills-pilot.md)（含方案、输掉的方案四案、可执行验收）。
4. **条目 D｜本 Note + index 登记**：防第四次重开同一讼——下次体感再冒头，先翻本 Note 的判定表与「不做什么」。

**不做什么（防再漂）**：负例反证 / 备选必载 / CI 分工 / 收尾资产化——已在位照旧；preset 生成清单 / repository vantage / TODO 分档 / 语义审升格——维持前轮判定零复发不动；**不为安心堆文档**（六误区「空 invariant」的文档版）。

## 输掉的方案

- **第三次全量逐页判定**：语料零 delta 三证 + 前两轮全判在案，重开已结之讼；本轮改做无污染复核（两路子代理）+ 体感实证（三面体检），翻案/维持均有仓内证据。
- **新仪表命令 / orient 扩 `--quality`**：回执本身就是仪表（收口脚送达驾驶座），建命令 = 无复发不建载体。
- **元轮预算门禁**（「连续两轮纯流程面须提示」一类）：判据未达「复发过」，只作 H3 实证④记档；回执⑥已含面别信息，观察。
- **entry-probe 运输层本轮就修**（JSON mode / 结构化输出）：两跑 0/13 均模型侧 JSON 畸形（run1 引 D32 行**既有**直引号未转义；run2 `"id":Q11` 值未加引号），非 diff 引入、非内容矛盾；改解析 = 掩盖黑名单「改归一化凑绿」邻域。**登记触发**：下次例行触发再 0/13 → 立运输层健壮性条目。两份归档 = [run1](../../snapshots/probes/entry-probe/2026-10-08/answer-00-24-25-841Z.md) / [run2](../../snapshots/probes/entry-probe/2026-10-08/answer-00-26-59-559Z.md)。

## 取代检查

- 与 [realignment](2026-10-07-plugin-corpus-realignment.md) / [strengthened-read](2026-10-08-plugin-corpus-strengthened-read.md)：**部分延伸**——两 Note 继续拥有 rc.2 语料判定本体与执行合规账；本 Note 拥有第三轮体感实证裁决（H1/H2/H3）与驾驶座修订。互链不合并。
- 与 [driver-purpose-top-level](2026-10-07-driver-purpose-top-level.md)：其 S5 拥有 orient 单页导航结构；七问是该页之后驾驶者视图线的延续（五问 = 质量视图，七问 = 流程视图），互链不合并。

## 中立体清扫（2026-10-08，commit 2044a29 收口后）

独立子代理盲扫（输入 = diff + 本 Note + RFC，按 [notebook-hygiene](2026-09-25-notebook-hygiene.md) 清单契约）：**blocker 0 / suggestion 3 / 判非 8**——全部机械可查声称（计数/预算/门禁/时间线/机制引文）独立复核零失配。3 条 suggestion 已同日修复：S1 三篇旧 Note 补前向互链（取代检查「互链」此前实为单向，恰是 H3「产出到不了读者眼前」的复发点，最优先修）；S2 取代检查「第四问」指称落空 → 改「五问 = 质量视图、七问 = 流程视图」的线描述；S3 计数口径三处不对齐 → 统一为 F2 同款文件级四处（六行）。判非 8 条留档防重查（全文见清扫报告）。

## 语义审记录（§13 四输入，收尾自查）

① 授权原文：三段授权链（点名→形状确认→逐条批准 A/B/C/D + 次序）与本 diff 逐项对上——A（§12 重写+§0.5 标注）/ B（orient 七问+四处计数指针）/ C（仅 RFC 落盘，未提前实施）/ D（本 Note + index 登记）；无扩围。② 合同文档：本 Note、RFC、orient、dev-loop、AGENTS、README、index 改动互链全核对；计数（六问→七问）指纹全仓 grep 收口（**四文件六行**：AGENTS ×1 / README ×1 / index ×2 / orient ×2；demo/presets 的 MEDDIC 六问为无关同形词，不动）。③ 证据选层：文档面 = verify + test（见验证记录）；真模型面 = entry-probe 触发成立实跑两跑，**阻断如实记**（运输层方差，未以任何形式凑绿）；机制面无代码改动（C 未实施）。④ Note：本文件即记录，备选四案必载。**自查发现**：初稿曾把 entry-probe 两跑 0/13 拟记为「未执行」——不实，是「执行了但被运输层整卷拒收」，已改准；另一处：体检①的祖父豁免判定（driver-purpose 12:22 早于 21:48）依据是 commit 时间线而非臆断，已核 `git log`。

收割三问：①异常 = entry-probe 双 0/13（→ 触发登记，见输掉的方案末条）；②值得钉 = 本 Note 判定表 + 回执/七问两处行为面；③运行态事实 = 语料零 delta 三证 + 探针方差尖峰（历史 9/13→13/13→11/13 → 今晚 0/13×2）。

## 验证记录（真跑过的命令与结果）

- `pnpm verify`（Note 落盘后终跑）：**ALL PASS**——doc-budget：dev-loop 394/395（回执重写净 +4）、orient 70/80、index 148/148（第三轮指针行内追加，行中性）、AGENTS 74/84；md-links 含本 Note 与 RFC 全绿；proposal-scheduled ×1（RFC 批准标记 + 验收节）；notes-liveness ×27 含本 Note。（Note 落盘前的首轮 verify 曾 3 FAIL = 三处链接指向本 Note 未落——同 diff 内由本文件收口，非缺陷。）
- `pnpm test`：36 文件 355 项**全绿**（~2s）——本轮纯文档 + RFC，无 spec 面。
- `node checks/smoke/entry-probe-smoke.mjs` ×2（触发条件成立：入口链文档改动 + key 在场；单跑预算 ×2）：**两跑均 0/13——阻断**，机制与处置见「输掉的方案」末条；语义审未因探针阻断而免（本节即补）。
