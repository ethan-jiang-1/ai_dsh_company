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
