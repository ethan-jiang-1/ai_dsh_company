状态：implemented（2026-10-12；用户裁定原话「尽量不要去枚举/列举数量，那没意义，这东西一直在增长」）

# 增长型清单退出导航文档（D28 复发第二轮清扫）

## 决定

spec / 页签这类**持续增长的清单**从导航文档退役——件名与计数都不写，清单唯一家 = 实现自己
（目录树、客户端注册面、探针断言面）。口径对齐根 AGENTS.md 布局块对 `.agents/skills/` 的既有
措辞（「清单 = 目录本身」），本轮铺到其余导航面。五处：

- [tests/README](../../tests/README.md) 四区表：曾枚举 9/21 个 harness spec、9/12 个 company spec
  （漏 foundation-safety、orient、runtime-layout、session-log-generation、backlog-liveness 等）——
  [snapshots/README](../../snapshots/README.md) 引用的 foundation-safety 在导航里查无此件。改为
  区级职责描述 + 一句「spec 清单 = 各区目录本身；导航到区，不到件」。
- [docs/index](../../docs/index.md) 术语映射「公司页签」行：曾写「五个平台页签（看板/依赖图/在场/
  用量/任务板）」，客户端注册面同期已有待办/培养/台账切片——[cdp-probe](../../docs/guides/cdp-probe.md)
  断言面写 8，两文相左。改为「页签清单 = 客户端注册面，随切片增长、不在此枚举」。
- [docs/orient](../../docs/orient.md) 词表：「并入右栏五页签」同病，去计数。
- [ui-demo §5 命名表](../../docs/design/ui-demo.md)：「右栏页签（五个）」+ 代码实体只写
  `company-tabs.tsx`（实际注册面多文件）——改为指向客户端注册面；v4 行「五个平台页签」是交付
  时点记录（✅ 2026-09-23），历史层保留不改。
- [cdp-probe.md](../../docs/guides/cdp-probe.md) 与探针头注：「8 公司页签」计数改「全部公司页签」
  （清单由探针断言面自持，加页签随探针同 diff 变）。

**保留的枚举**（判定 = 不是增长型清单，或其家就是索引）：AGENTS.md 布局块的目录级映射
（目录结构低频变化，且该块就是空间地图的家）；[checks/README](../../checks/README.md) 脚本索引与
[snapshots/README](../../snapshots/README.md) 场景表（合同就是索引 + 同 diff 维护义务——本轮实测
checks/README 对在盘脚本全覆盖零漂移）。

## 输掉的方案

- **把数字更新到现状（21 / 8）**：一轮内正确、下一轮必再漂——本轮的 9/21 与 5/8 正是「上一次
  更新数字」的产物。用户否。
- **门禁化（导航文档出现 spec 基名即红）**：升格判据三前件已满足其二（本仓复发过——2026-09-26
  六份清单同病立 D28、2026-10-12 本轮五处；可机械判定）；卡在「负例已证会失败」，且合法点名
  （tests/README 头部对 layering.spec 的守卫点名链接）会误伤，白名单复杂度不值。**第三次复发时
  的窄门候选**：只扫 tests/README 四区表行。本轮先清扫不建门。

## 验证

- `pnpm verify` ALL PASS（md-links ×1240；doc-budget docs/index.md 143/143 顶格未超；doc-taxonomy
  20 份全登记；bare-path ×644）。
- `pnpm test tests/harness` 233/233 绿（navigation-assets 钉 tests/README 骨架锚点——锚点全保）。
- 漂移本身在门禁盲区（navigation-assets spec 自述「只断言锚点词不抄内容」）：本轮未改门禁、
  无红可造；验收 = 门禁绿 + 改前人工清点对照（harness 21 spec / company 12 spec / 客户端注册
  8 页签——本行为时点测量证据，非导航承诺）。
- entry-probe-smoke（真模型认证档；触发条件含 docs/index.md 改动）：两轮实跑——首轮 FAIL 0/13
  （轮次超时、原始回答为空：模型侧零响应，判瞬时基础设施；历史轮次 2026-10-07 / 10-10 均
  有分）；重试（`--timeout 360000`）FAIL 10/13——三处失败（Q2/Q7/Q9）均为「原文不匹配」的
  引文保真度问题（模型压掉空格与反引号），且全部落在 dev-loop.md / testing.md（本 diff 未触碰
  的文件），路由引对了文件；引用本 diff 所改 docs/index.md 的题（Q1/Q6）全过；上轮（2026-10-10）
  同为部分分 11/13，13/13 非该探针常态。判：无路由回归证据，引文噪声为已知形态、不据此弱化
  断言。两轮答卷已归档 entry-probe 目录。

## 同轮追加（2026-10-12 续：空间地图与层次归位）

- **architecture §6 目录树退役**：它是对 AGENTS.md 布局块 + project-map 的**第二份空间地图**
  （同 D28 病）——实测漏 tests/_backlog/_dist 三面、snapshots 与 company-workspace 两行注释过期
  （company-workspace 被注成 gitignore 而实际 310 文件 tracked）。§6 保留形态依据与要点 1–6
  （demo/presets/profile/index 的外部锚点），目录逐件唯一家回 [project-map](../../docs/project-map.md)。
  输掉的方案 = 就地改注释（下轮再漂，同「更新数字」）。
- **第三次复发证据**：[已结卡 doc-snr-cleanup-audit](../../_backlog/_archive/settled_issues/2026-10-04-doc-snr-cleanup-audit.md)
  第 27 行在 2026-10-04 已诊断「页签 5 vs 8」且结论写对（探针对、地图过期），修复一直未落地——
  诊断与修复之间没有执行通道，正是本类漂移的根因形态；窄门候选（见「输掉的方案」）的复发计数
  据此 +1。
- **cdp-probe.md 归位 guides/**：index 登记其为指南层，而分层规矩说指南住 guides/。git mv +
  入链修复（project-map / demo / checks-README / 探针头注 / index 登记）；[docs-tier-taxonomy](2026-10-09-docs-tier-taxonomy.md)
  Note 两处路径提及就地改新（currency 口径）。
- **role-content-plan §1 复刻面退役**：逐角色 persona/skills 清单与 presets.md 双写（2026-09-26
  实测漂移过一次）——设计层只留设计原则（§0）、落点政策（§2）、探针设计（§3），现时语义
  唯一家 = presets.md；index 登记行同步改口径。
- 机械单步（不另立记录）：README runtime 行补「mostly」、.gitignore 构建指针 §7→bootstrap、
  multi-human 头部链文本对齐实际归档位、demo「8 页签」→「全部公司页签」、run-gates 头注失准
  引用（architecture §6 → dev-loop §1）就地修正。
- **验证**：pnpm verify ALL PASS + pnpm test 全量 482/482 + entry-probe-smoke 结果见下行。
- entry-probe-smoke（第三轮；触发条件含 docs/index.md 改动）：FAIL 12/13——仅 Q8 一处引文保真
  噪声（模型压掉 AGENTS.md notes 行的空格/反引号，文件引对）；**语义层抓到两个真矛盾并已修复**：
  ① notes/proposed/README 的「卡离场（完成即离场）」是已退役队列制化石短语，与 _backlog 章程
  「按自身关闭条件离场、不等实施验收」相左 → 改为按章程口径；② AGENTS.md 任务源写成闭集、
  未指向「缺陷卡修复就绪自授权」例外（2026-10-12 新立）→ 补例外指针。两处均为一句话级修复
  （C1/C2 的红 = 探针矛盾报告原文，已归档 entry-probe 目录第四份之前的 00-20 答卷）。
- entry-probe-smoke（第四轮，C1/C2 红后复跑）：机器判据 **13/13 全过**（Q8 引文噪声本轮未现——
  方差），第三轮的 C1/C2 不再出现 = **红→绿成立**。探针另报一个新矛盾（手册与 demo.md 的
  「映射单家」互指悬空），判为**误报**——两句实为同指 demo.md 单家（「同指」≠「家在手册」）；
  但 demo.md 原句以「公司手册」开头、确易诱发该误读 → 语序重排消歧（家声明前置 + 明写「手册侧
  的映射单家即指此处」），技术内容零变化。四轮轨迹 0/13 → 10/13 → 12/13 → 13/13，两真矛盾
  由探针语义层抓出并修复——「机器全绿只证断言通过」的边界声明在本次收口实测成立。

## 同轮追加二：手册瘦身轮（顶格处置）

- **触发**：手册 195/195 顶格——按 [docs/AGENTS.md](../../docs/AGENTS.md) 棘轮教义，顶格 = 常驻层
  饱和信号，处置是**瘦身**不是提额。
- **做法**（运营规则全保留；机器可查短语一字不动——「占位=认领，非出稿」「让位=认领撤销，非出稿」、
  派活行格式与状态枚举、署名行形状、「待补料·<slug>·<T号>」锚、「日期待核」fail-closed 全部逐字保留；
  presets.spec 钉的职责边界/这事问谁/冲突与升级/承诺权四节未动）：
  - **搬**：审批三档与问人两条路的机制证据段（子会话审批受限 / 根会话分水岭）收紧为操作要点 +
    [multi-human §0](../../docs/multi-human.md) 指针——机制证据唯一家在彼处；
  - **压**：证据叙事退役（V4 反例数字、E1/E2 实测计数、真盘人原话引文、陈旧日期戳）——规则本体
    与教训保留，案例细节归 docs/ 与 Note；
  - 195 → **180 行**（-7.7%）、24.4KB → 24.2KB。
- **棘轮**：`DOC_LINE_BUDGETS` 195 → **190**（180/190 = 94.7%，≥5% 头寸）。
- **输掉的方案**：① 只改数字不改内容（= 提额前奏，反序）；② 大砍运营条目（手册是角色唯一可见的
  合同面——公司角色读不到 docs/，砍规则 = 砍行为约束）。
- **验证**：`pnpm verify` ALL PASS（doc-budget 180/190 新棘轮 + handbook-budget 24162B + 1024B
  ≤ 32768）+ `pnpm test` 全量绿（presets.spec 手册四节守卫含内）+ **handbook-smoke ALL PASS**
  （真模型 ceo 一次小调用：注入基线 = 公司手册、未混入开发仓库 AGENTS.md——手册改动的完成定义）。

## 同轮追加三：顶格收尾与 D28 复发门

- **index 瘦身**：143 → 141 行（§文档组织原则 -2、外部材料登记 intro 合并 -1）；**上限维持 143**——
  登记表绑定型饱和（行数下限 ≈ 文档登记 20 + 台账 41 + 术语/外部材料表 24 行），头寸 1.4% 未达 5%
  棘轮线，再压就是砍登记，按下方输掉的方案②否决；头寸 2 行留给未来 D 号。
- **dev-loop 瘦身**：393 → 382 行（头部 blockquote -2、§1 完成判断链 -1、§2 栈采样 -1、§6 item5/7/8
  重写 -7、教训段日期与叙事压缩 -5、§12 -1）；上限维持 395（头寸 3.3%）——剩余体量是操作表行
  （调试阶梯/插拔/分层表），同上否决再砍。两文件都把「R4 更正考古」「实测计数快照」类历史噪声退役
  （D26：移除无行动价值的历史噪声，保留解释约束的证据）。
- **nav-enumeration 门禁（D28 复发门，2026-10-12 立）**：三代复发（09-26 立教义 / 10-04 诊断未修 /
  10-12 再抓五处）满足升格判据 → 落地窄门：只扫 tests/README §四区 表行，「 / 」分隔标识符清单
  （≥3 项）或 spec 文件名即红，失败点名文件:行；清单的家 = 目录本身。**两方向红证**：
  ① 枚举负例（旧 9 项行写回）→ `FAIL nav-enumeration: tests/README.md:17 → …`；
  ② 缺节方向（表头改名「## 四区X」）→ `FAIL … 缺「## 四区」节`；还原即绿。**弱锚现场抓**：
  首版用「## 四区」前缀匹配，改名负例竟仍绿——当场收紧为 `^## 四区$` 整行锚
  （gate-change-definition「形状锚钉结构标记」的活教材；红证原话在门禁块注释头）。
- 输掉的方案（门禁）：a) 泛化到全文档扫枚举——误伤面不可控（checks/README 索引、术语映射表、
  AGENTS.md 布局块都是合法枚举），只钉已复发的最小面；b) 不建门纯靠纪律——10-04 卡证明
  「诊断了也会烂掉」，诊断与修复之间的通道缺口是真的。
- 输掉的方案（瘦身）：② 砍登记/操作表行凑 5% 棘轮线——登记与操作表就是这两份文档的本体，
  凑数 = 砍路由价值；诚实记录头寸缺口（1.4% / 3.3%）而非硬凑。
- **验证**：`pnpm verify` ALL PASS（含新门 PASS 行）+ `pnpm test` 482/482。
- **entry-probe 第五轮（index/dev-loop 瘦身后）**：FAIL 12/13——Q3 引文归属错位（模型把 demo.md 新语序的
  「单点映射家」句引到手册路径名下；判据答对、证据路径贴错）。判：无路由回归——句子真实存在于 demo.md，
  归属错位是模型侧方差被句首凸显放大；不为此回改措辞凑绿（与修门禁凑绿同构）。五轮轨迹
  0 → 10 → 12 → 13 → 12/13，机器层在引文保真噪声带内波动；本轮**矛盾报告为零**（C1/C2 修复持续有效）。
  答卷归档 entry-probe 目录（answer-00-57-00-663Z）。

## 同轮追加四：三行优化的执行（用户点名「这三处还有空间」——复查属实）+ 摩擦清单收编

- **信噪比**：dev-loop **同文件复述**两处去重——patch 语法（§2 行 → §4 唯一家）、pipefail 纪律
  （§12 → §1 唯一家）；§5 与 release.md 的跨文件重叠清算（时点表三行已落地 = 纯历史退役、OpenSpec
  触发随迁 release.md、程序/人审/矩阵唯一家归 release.md；index 外部材料落点与 run-gates 两处头注同步）。
  **matcher 诊断修正**：复查发现 squash 早已剥 `**`/反引号——五轮三次引文失败实为「跳列省略」（Q7，
  中间挖空 = 反幻觉设计正确拒绝）与「归属错位」（Q8/Q3，把别家句子引到本家路径），**不是格式噪声**；
  本 Note 此前两处「引文保真噪声」定性据此更正，matcher 不动（再松 = 削反幻觉）。
- **门禁盲区**：**nav-count-claims 落地**（页签计数声明门）——计数+页签 pattern 扫 docs/** + AGENTS.md +
  README.md；「一」豁免（「开一个页签」是操作叙述非清点）、notes/ 与快照载荷不扫（历史证据豁免，
  与 retired-path 归档豁免同边界）。红证：orient.md:6 插「五个平台页签」→ FAIL 点名短语与行号，还原即绿；
  豁免方向：cdp-probe「开一个页签」绿。ui-demo v4 行「五个平台页签」→「首批 = …」（留冻结清单、去计数）。
- **预算健康度**：**术语映射整节迁出 index → [terminology.md](../../docs/terminology.md)**（16 行查表面
  不占登记表绑定型文件的头寸；AGENTS/profile 指针随改）、**dev-loop §8 迁 [web-rpc.md](../../docs/guides/web-rpc.md)**
  （36 行 RPC runbook 独立成指南）、§5 压缩、**§0 导航表补全 13 节**（「一面墙」的结构解法：按节查表
  成为真承诺）。棘轮：index 143→**131**（内容 124，头寸 7 行 = 未来 ~7 个 D 号）、dev-loop 395→**367**
  （内容 348，头寸 19 行）——两文件头寸双双达标 ≥5%，上一轮的「诚实挂账」解除。
- **摩擦④「驾驶舱」词表张力**：根源清算 = 手册还在用史名指现役面板。改名三处（手册「台账」行、
  「待办」面板句、motion-ledger 渲染句）——10-10 Note 否决的是改 src 注释与历史文档，活合同不在其列；
  orient 词表自此完全准确（史名只存于 src 注释与历史层）。handbook-smoke 复跑 PASS。
- 输掉的方案：a) 拆分 dev-loop 为多文件——§N 交叉引用图（AGENTS/testing/notes 十几处 § 锚）会级联断，
  不值当（§7/§8 前例：迁内容保节号）；b) matcher 容忍跳列/换家——削反幻觉，否；c) 驾驶舱改名扩到
  src 注释——10-10 Note 已裁（史名保留）。
- **验证**：`pnpm verify` ALL PASS（22 份 docs 全登记 + 两新门 PASS + 新棘轮 124/131、348/367）+
  `pnpm test` 482/482 + **handbook-smoke ALL PASS**（真模型 ceo 注入基线）。
- 过程自捕：迁移脚本的 `\\n` 字面量 bug 把两行登记粘成一行、terminology 登记行被覆盖——doc-taxonomy
  门禁当场红（「未在 index 登记」），自愈 = 修脚本 + 补行。结构门禁抓 agent 自己的错，同轮实测第二次
  （第一次 = cdp-probe 归位时的归档卡死链）。
