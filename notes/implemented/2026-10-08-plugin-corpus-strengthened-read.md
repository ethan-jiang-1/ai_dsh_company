# 插件仓语料加强轮：验产 + 28 页全亲读，零增量判定

状态：已交付（2026-10-08；批准：用户 2026-10-08 点名「认真读才刚更新的 _dsh_plugin_agent_ready_development，看应该吸取多少到本 repo，避免驾驭无力」并经选项确认「验产 + 定向深读」深度；动机原话 =「还没实验，主要是因为内容有变，所以我希望加强」）

> 语料：`/Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/`（repo 外只读树）。
> 读法（可核验）：主会话亲读全部 28 内容页（native README/00/01/02；sdlc README/00/01–11；
> repo README/00/01–09）+ 特殊件（根 README、`_coverage/README` 与 00 全文、`verify.mjs` 实跑）；
> 重点 = 上一轮（[plugin-corpus-realignment](2026-10-07-plugin-corpus-realignment.md)）委派给子代理
> 判定的 13 页（sdlc 02/03/05/07/08/09/10/11 + repo 03/04/06/08/09），本轮全部由主会话亲自重读。

## 问题

驾驭者感觉每次驱动能干点但质量无保障、流程有问题、测试资产不知道在哪，假设是「对 DSH 流程没吃透」，要求以更新后的语料为镜加强吸收。开工前先核账，三个事实改变了这轮的形状：

1. **语料自 2026-10-07 后零变化**：外部树 HEAD = `bbcf346ddb`（2026-10-07，0013 轮「独立发行 + 钉 release tag」），该目录工作树 clean；`verify.mjs` 实跑通过（34 Markdown / 2 scripts / 23 SVG）——与 10-07 判定时记录的计数逐位一致。「才刚更新好」的这一版正是 10-07 realignment 全判过的那一版，**无新增量待判定**。
2. **同一请求 10-07 已执行过一轮**（realignment Note，28 页全判 + 五决定落地）；本轮真正的增量空间只剩两处：① 验产五决定与接线是否在位且**被执行**（不是只在）；② 上轮 13 篇委派页的亲读复核（「加强」的字面兑现）。
3. **之后已有两轮对着三痛点**：10-06 [测试资产收割](2026-10-06-test-asset-harvest.md)（收割三问 + r6 基线）与 10-08 [DSH 套路体检](2026-10-07-dsh-playbook-health-check.md)（用语料体检表扫全仓修 25 处漂移）。

## 验产（全部在位，含执行面）

- **五决定**：dev-loop §1 完成判断链（:57–61）/ §13 语义审最小清单（:375–380）/ §12 收尾清单语义审行（:343）与收割三问（:341）/ [orient](../../docs/orient.md) 五问（:35–41，四链白话 + 双向反查）/ [release.md](../../docs/release.md) 版本纪律三要件（:111–114，registry 三态 + 改内容必 bump + 发布字节=冒烟字节）/ [index 登记](../../docs/index.md)行。
- **接线**：AGENTS 纪律表「任务反馈面」行含 §13 指针；entry-probe **Q13** 在 spec（:22）进真模型认证面。
- **执行合规（观察期条款无复发）**：10-08 体检轮自身带完整语义审记录（四输入齐全，其 Note :64–70）+ 探针第三跑 11/13 归档——10-07 留下的考验条款「后续非平凡收尾是否照 §12 行执行语义审」至今合规。

## 判定（28 页亲读 × 三痛点线：流程闭环 / 测试资产 / 质量保证）

**零翻案、零漏吸收**。逐卷结论：

- **native 卷（4 页，脊柱重读）**：四不等式 / 交付判断四角色 / 六误区 / owner 五行表与 10-07 判定一致。唯一曾拟标记的点——主仓「非平凡模型/协议/用户可见变化同 PR 必带录制场景」义务——核对后判**已对齐**：语料自己允许独立仓「适配 + 声明替代证据与未覆盖处」，本仓 [testing §2](../../docs/testing.md) 改动面表即适配声明本体（行为判据面同 diff 必带场景；机制面以 delegation-smoke 真入口断言模型可见工具目录为替代证据），非漏吸收。
- **sdlc 卷（13 页，含上轮委派 8 页）**：01 = D35 [notes/README](../README.md) 逐句对应无增量；02/07/10 = 主仓远端执行面（Issue policy / stack / weighted approval），不照搬清单维持、触发不变（第二贡献者 / PR 面 / 历史改写）；03 = Plan≠权限的机制事实，dev-loop §0.5 拥有；04 = 证据路由同构（prove-it-red / 门禁负例 / pre-push 全量接线），focused coverage 触发维持（无 coverage 基建）；05 = tier / now-vs-rationale 分立 / repository-vantage 已分散吸收（D10/D26/D35 + 裸路径门禁）；06 = 三层证据不冒充 + 执行形状 10-07 已落地；08 = 历史证据边界（git 不载命令证据 ⇒ 命令证据住 Note 验证记录）结构性吸收；09 = 意图载体谱系对照成立（RFC / `_backlog` 推敲卡 / postmortem 反面入口 / TODO 三档语义触发器**未点燃**——代码零存量实测，5 处命中全为描述触发器本身的文档行）；11 = publish 三要件在位 + 「未到触发不预建脚本」纪律。
- **repo-harness 卷（11 页，含上轮委派 5 页）**：01/02 = 入口链 / 五类 owner / 负知识 owner / 生成目录 vs 路径树即清单 / 渐进披露全对齐（entry-probe 即其认证面，本仓对「文档可导航」的机器认证甚至强于语料描述的 DSH 自身）；03 = Skill≠gate、可机械规则下沉门禁 = 门禁升格判据同款；04 = 参与阶梯 + SessionEventMap 横切义务 = 设计四问（:96–104）同构；05 = 六层反馈表（本仓九层更强）+ invariant 查关系不查存在性 + 错误信息三要素（失败对象/违反规则/修正入口）；06 = 三查询面 = 调试阶梯 + rc.2 收割的进程内查询节（:92–95）；07 = 三成本 / 四边界 / 三问检验（10-08 体检已用作体检表）；08 = 仓库分类学（顶层分区 owner 文件化 / 证据跟 owning 层走 / 五种维护形态——本仓对应 S1–S5 + snapshots 五桶 + 生成物「永不手改」门禁）；09 = 双仓词汇对齐（index 术语映射即其落点）+ 继承边界（不复制 AGENTS/Notes/gates）。
- **特殊件**：根 README 四类陈述（运行时事实/主仓要求/插件仓建议/仓库自定 = 不照搬清单的语料侧表述）、`_coverage` 维护账、`verify(.test).mjs`（完整副本过真实入口测负例 = prove-it-red 同构）——维持 10-07「不适用（形态）」判。

## 决定

1. **零增量**：语料 rc.2 当前状态在「吸收有度」纪律下吸收完毕——本轮零新文档行（除本 Note 与 index 登记行）、零新门禁、不照搬清单全部维持、全部已登记触发器不变。
2. **两处 considered-and-skipped 记档（防重开讼，非缺口）**：① sdlc-01「过时已批 RFC 显式转 rejected」的规则——本仓 proposed/ 只收已批 RFC，废弃路径由 proposal-graduated 门禁 + 用户裁决自然覆盖，边缘太薄不预铺；② sdlc-05「repository vantage」判定问（读者只拿 HEAD 能否核验每个 claim）作一行显性 litmus——实质已分散于 D35 真证据（实施者不看对话就能复现）+ 裸路径门禁 + D26，无复发不预铺。两者触发 = 出现实际复发再立。
3. **判定信心升级**：语料判定口径从「15 亲读 + 13 委派」升级为「28 页全亲读」，本 Note 即户口；下次语料演进（`_coverage` 出 0014+ 轮或 re-pin 新 tag）时以此为本底做增量判定，不重读全卷。

## 输掉的方案

- **为「加强」而多抄内容**（如 sdlc-06 §4 高风险语义维度清单抄进 dev-loop §13）：语义审三实例（realignment ×2 + 体检轮）证明现有四输入形状产出真发现；抄清单 = 预算膨胀 + 语料自己点名 "guidance, not a complete checklist"。维持不抄。
- **全新 28 页重判台账**（推翻式重审）：语料零 delta + 10-07 已全判 + 本轮亲读交叉一致，重判 = 重开已结之讼（备选必载教义的反面）；本 Note 只拥有「亲读复核 + 零增量」这层增量。
- **entry-probe 第四跑**：本轮不动入口链路由面（只加 Note + index 登记行），按脚本头注触发条件不点燃，不为仪式烧真模型预算。

## 取代检查

- **后续延伸（2026-10-08）**：同请求第三现的体感实证裁决（零增量判定之上，改验执行面与驾驶座体感）=
  [driver-receipt-round](2026-10-08-driver-receipt-round.md)（部分延伸，互链不合并）。
- 与 [plugin-corpus-realignment](2026-10-07-plugin-corpus-realignment.md)：**部分延伸**——10-07 Note 继续拥有 rc.2 语料的判定本体与四焦点线修订；本 Note 拥有「28 页全亲读复核、验产执行面、零增量与 considered-skipped 清单」。互链不合并。
- 与 [harness-alignment-ledger](../archived/2026-09-25-harness-alignment-ledger.md)：无重叠（旧台账拥有 0.1.7-rc.1 逐页判定与不照搬清单 §四.4，仍有效）。

## 语义审记录（§13 四输入，收尾自查）

① 授权原文：用户令 = 认真读 + 判定吸取多少 + 「验产/定向深读」确认——本轮产出（验产 + 零增量判定 + 记档）在授权面内，无扩围；② 合同文档：判定所引仓内落点（dev-loop §1/§12/§13、testing、release、orient、notes/README、index）全部本会话亲读核过，行号属实；③ 证据选层：文档面 = verify + test（见下）；语料面 = verify.mjs 实跑 + 零 delta 三证；真模型面未动（Q13 路由面无改动）；④ Note：本文件即记录，备选必载三案。自查发现（如实）：「零增量」的证明范围是「吸收有度纪律下的显性吸收面」，不等于「语料对本仓再无价值」——边界由决定 2 的 considered-skipped 与全部维持的触发器圈定；下次语料演进须重开增量判定（决定 3）。

收割三问：①异常 = 无（无红无阻断）；②值得钉 = 本 Note（判定户口）；③运行态事实 = 语料 HEAD 零变化三证（下节）。

## 验证记录（真跑过的命令与结果）

- 语料侧尽职核对（非本仓门禁）：`node _dsh_plugin_agent_ready_development/verify.mjs`（外部树根）**通过**（34 Markdown / 2 scripts / 23 SVG）。
- 零 delta 三证：外部树 `git log -5` HEAD = `bbcf346ddb`（2026-10-07）；`git status -- <语料目录>` 输出为空；verify 计数与 10-07 Note 记录逐位一致。
- 本仓（本 Note + index 登记行落地后实跑，命令链 `set -o pipefail && pnpm verify && pnpm test`）：`pnpm verify` **ALL PASS**——notes-liveness ×26（含本 Note）；pin-currency ×4（`dsh-v0.2.0-rc.2` = expectedTag）；md-links ×1090 / 225 files（含本 Note 两条新互链）；doc-budget index 148/148、dev-loop 390/395、testing 75/75 全行中性；`pnpm test` **36 文件 355 项全绿**（2.16s）。
