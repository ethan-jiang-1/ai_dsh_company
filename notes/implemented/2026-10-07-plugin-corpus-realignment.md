# 插件仓语料 rc.2 对照：四焦点线差距判定与定向修订

状态：已交付（2026-10-07；批准：用户 2026-10-07 点名「认真读 _dsh_plugin_agent_ready_development，吸取到本 repo 避免驾驭无力」并经对话确认「判定 + 定向修订」深度；焦点四线 = 流程闭环可见性 / 交付判断·语义评审 / 测试资产地图 / 防过度吸收）

> 语料：`/Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/`（repo 外只读树），
> 钉 tag `dsh-v0.2.0-rc.2` = 本仓当前 vendor pin；前代 `_agent_ready_development`（更名前）钉
> `dsh-v0.1.7-rc.1`，旧判定 = [harness-alignment-ledger](../archived/2026-09-25-harness-alignment-ledger.md)。
> 读法 = 主会话亲读 12 篇焦点页逐条判 + 一路子代理判其余 13 页，两组结论交叉一致。

## 问题

驾驭者自述：每次驱动能干点，但质量没保障感、流程有问题、测试资产不知道在哪——假设是「对 DSH 流程没吃透」。要求以 rc.2 语料为镜重判差距（新卷 native-development-model 首次直接以**独立插件仓**为受众，即本仓身份），再做定向修订。

诊断总判：**机制层大面积已对齐**——旧台账 27 篇判定之后，本仓又落地了 D35 notes 分类 owner、测试宪法、S1–S5 目录分区与 run bundle 面板，本轮 20 页延续旧判零翻案。病不在制度缺，在四处：

1. **流程闭环只有零件没有脊柱**：四不等式（挂得上≠行为对≠装得上≠已获批）与交付判断四角色分离（机器证据 / 语义审 / 批准 / 用户显式交互各答一问、不可互相冒充）从未在一页显性——散在 dev-loop §1/§12/§13、testing.md、release.md 五处，拼装负担即「驾驭无力」感的直接来源。
2. **语义审只有边界声明没有执行形状**：全仓唯一一句是「入口探针机器通过不等于语义审阅通过」（dev-loop §12），entry-probe 连续 27 次答卷标「语义审阅：未执行」——声明在空转，质量滑过去的地方正是没人按形状做过这道判断的地方。
3. **外部语料登记指死路径**：语料已更名（`_agent_ready_development` → `_dsh_plugin_agent_ready_development`）并 re-pin rc.2，index 登记表未同步。
4. **release publish 侧要件只在台账里**：registry 三态前瞻登记于旧台账 §五，没落在未来决策发生地（release.md 版本纪律）。

## 判定（新语料 28 内容页 + 特殊文件；三态 = 已对齐 / 采纳 / 不适用+触发）

**延续旧判（20 页，rc.2 复核无新形状）**：repo-harness 全卷 11 页（01–09 + README/index）与
sdlc-reference 9 页（README/index + 02/03/05/07/08/09/10）——旧台账判定全部成立；不照搬清单
（旧台账 §四.4：生成 catalog、双语 pairing、CI/PR/加权评审面、skills 家、change-scope 脚本等）
全部维持，触发条件不变（第二贡献者 / PR 面 / 真实 npm 发布）。

**本轮重判（8 页 = 语料演进的 4 页 + 新卷 4 页）**：

| 页 | 判定 | 依据 |
|---|---|---|
| native/README + 00-index（新卷脊柱页） | **采纳** | 四不等式 + 交付判断四角色 + 六误区。六误区中五条本仓已对齐（goal 三停止条件 / mock 白名单 / oracle 独立 / 门禁升格判据 / vendor 铁律）；四不等式与四角色无家 → 本轮落地（决定 1/2） |
| native/01 新仓起步 | 已对齐（历史） | 起步五步（加载/owner/证据/安装/评审）本仓全部越过；安装兼容侧缺口 = 触发登记（决定 4） |
| native/02 术语页 | 不适用 | 本仓已有 index 术语映射；建第二词典必漂 |
| sdlc/01 note-lifecycle（收窄版） | 已对齐 | 「持久决定理由 + 机械/局部编辑豁免」收窄 = D35 notes/README §二逐句对应，无增量 |
| sdlc/04 证据路由（含新增 §5 负例接真实接受路径） | 已对齐 | prove-it-red + 门禁升格判据 + pre-push 真实接线（verify+test 全量）为同构；focused coverage 双指定不适用（无 coverage 基建；触发 = 引入 coverage 时） |
| sdlc/06 语义评审 | **采纳** | 「三层证据不互相冒充」表已对齐（testing §1 / D15 / §12 边界句）；缺的是执行形状 → 决定 2 |
| sdlc/11 发布（0013 修订版） | 采纳（触发型） | rehearsal 侧已对齐（release-smoke）；publish 侧三要件 → 决定 4 |
| 根 README / _coverage / verify(.test).mjs | 不适用（形态） | 语料自维护纪律的对应物本仓已有（vendor 簿记 + 升 pin delta note + 门禁负例纪律）；verify.test.mjs「完整副本过真实入口测负例」= prove-it-red 同构 |

**焦点线四结论**：

1. **闭环可见性**：差距成立 → 决定 1。脊柱落在 dev-loop §1（不另开总览页，防第二事实家）。
2. **交付判断/语义评审**：差距成立（有声明无形状，空转有实证）→ 决定 2。
3. **测试资产地图**：双向查表其实已存在（tests/README = 改动面→最窄检查；snapshots/README 索引 = 场景→证明范围+消费入口），缺的是把「双向反查」当一句口诀显性化 → 决定 3；不建新表（防第二权威）。
4. **防过度吸收（反向检查）**：本轮通过——新吸收仅 4 处文档修订 + 1 处触发登记，全部行中性或落在无预算面；零新门禁（门禁升格判据：无复发证据不建 gate）；不照搬清单全部维持。

## 决定（修订落点，同 diff 交付）

1. **dev-loop §1 加「完成判断链」**：挂得上 ≠ 行为对 ≠ 装得上 ≠ 已获批，四条各指到门（preset-smoke / 该面场景判据 / release-smoke / 语义审+用户验收）；§12 交接行补「外部行为与影响面、明确未执行的检查」。
2. **dev-loop §13 加「语义审最小清单」**：四输入重读当前 diff（授权验收原文 / 该面合同文档 / 证据选层 / Note）+ finding 四要素（缺陷/位置/影响/证据）+ blocker 与建议分开 + 审记收尾 Note——把边界声明变成可执行形状。
3. **orient.md 补一问**「怎么知道做完了且质量可靠」：四条链白话版 + 测试资产双向反查——驾驭者直接可视。
4. **release.md 版本纪律登记发布三要件**：registry 三态幂等（无→publish / sha512 同→skip / 异→fail「改内容没升版」）+ 改内容必 bump + 发布字节=冒烟字节——旧台账 §五前瞻迁到未来决策发生地。
5. **index.md 修死路径登记**（更名 + 新旧台账双指针，行中性）+ **run-gates EXTERNAL_PINS 注释同步**。

## 输掉的方案

- **单页「开发闭环总览」新文档**：脊柱有价值，但 AGENTS 入口链 + dev-loop §0.5/§1/§12 已承载同一条环；新页 = 第二事实家（旧台账对语料 01 篇同款否决）。脊柱以 §1 的六行块落地。
- **吸收 sdlc-07「push 后 fetch 核对 remote==HEAD」**：单分支直推 + git 自带 non-fast-forward 报错，机械化收益低于维护成本；触发 = 历史改写或并行分支时再评。
- **TODO/FIXME 语义档**：旧台账已登记触发（TODO 开始累积时先定义）；当前无存量，不预建。
- **语义审做成 gate（收尾 Note 必含「语义审：」行一类）**：无复发证据不建 gate；且形式化空行恰是语料点名的「空 invariant」负资产。观察 2–3 轮，语义审仍空转再升格。
- **旧台账追加 rc.2 增补节**：archived = 冻结，改它就是篡改记录；由本 Note 承接增量判定并互链（部分取代，双方保留）。

## 取代检查

- 与 [harness-alignment-ledger](../archived/2026-09-25-harness-alignment-ledger.md)：**部分取代**——旧台账继续拥有 0.1.7-rc.1 逐页判定与不照搬清单（§四.4 仍被 dev-loop §9.1 等四处活引用）；本 Note 拥有 rc.2 语料 + 新卷的增量判定与四焦点线修订。互链不合并。
- 与 [entry-execution-chain-debt](2026-09-26-entry-execution-chain-debt.md)：其「semantic review pending」边界声明仍有效；执行形状由本 Note §决定 2 接续。
- 与 [notes-lifecycle-absorption](2026-09-24-notes-lifecycle-absorption.md)：无重叠——它拥有 sdlc-01 页六条点选吸纳；该页 rc.2 收窄的判定归本 Note。

## 验证记录（真跑过的命令与红/绿形态）

- `pnpm verify`：**ALL PASS**——doc-budget 实测 dev-loop 389/395、orient 61/80、index 148/148
  （行中性达成：登记行重写不加行）、testing 75/75 与 AGENTS.md 未动；md-links 全绿（含本 Note 三处
  互链与 index 新增链接）；pin-currency ×4（本 Note 与 index 的 `dsh-v0.2.0-rc.2` = expectedTag，
  `dsh-v0.1.7-rc.1` 走 EXTERNAL_PINS 豁免）；notes-liveness ×24 含本 Note。
- `pnpm test`：36 文件 355 项**全绿**（2.28s）——本轮纯文档 + 门禁注释改动，无 spec 面；
  tests/README 骨架（navigation-assets 钉）未动。
- 语料侧自洽核验：`node verify.mjs`（语料目录内）通过：34 Markdown / 2 scripts / 23 SVG——
  所引语料结构自洽；这不是本仓门禁，记为引用前的尽职核对。
- 本轮**零新门禁**（门禁升格判据：无复发证据不建 gate）→ 无 prove-it-red 义务；语义审形状的
  升格触发已写进「输掉的方案」末条（观察 2–3 轮仍空转再议）。
