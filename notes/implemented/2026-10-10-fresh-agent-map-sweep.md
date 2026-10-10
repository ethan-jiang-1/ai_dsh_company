# fresh-agent 三维审计轮：入口图漂移、计数病与探针判据收口（2026-10-10）

状态：已交付（2026-10-10）。**用户令**：「到仔细打扫卫生的时候了，目的是让 REPO 对 fresh agent 是清晰的、不困惑」——三维 = ①信息地图与渐进披露（agent doc chain / task execution chain / 布局与 README 是否不多不少）②信噪比与概念相左 ③系统性、结构性、一致性。**同日追加裁定**：「你为什么关心 SKILL 的数量呢？这里数量可能变化啊，你跟踪的意义没有啊」——**计数类表述一律退出现时入口图**。第二轮令：「发现的问题全都要修」。

## 问题

1. **skill 计数漂移（入口图三处）**：根 AGENTS.md 布局写「三个完成定义 skill」，盘上完成定义 skill 已是 4 个（D39 三件 + 试点轮 `preset-change-definition`）+ `web-window-ops`；台账 D39 行同句同漂。
2. **布局 notes/ 行不现形离场目录**：原只写 `proposed/ → implemented/`。
3. **布局 company-workspace 行漏 `deliverables-archive/`**：284 个 tracked 文件的大目录在入口图无性质判读。
4. **「四件套」一名二物**：run bundle 四件套 vs 人侧请求四件套在 orient 同页相邻两问各指一物。
5. **`.pi/`（外部工具任务态）不在 .gitignore**：只靠机器级全局 gitignore 隐身，换机器/新 clone 即露 untracked。
6. **entry-probe 语义审实测抓出的矛盾**（同日三轮，机器面 13/13 绿、语义面报 3+5 条）：
   - **C1/C4 = 冻结历史类误立**：审读把 `snapshots/probes/entry-probe/` 历史档案引用的旧文本（磨活曾为任务源、`_backlog/_archive/` 迁档前的旧池前缀）当现行矛盾——那些面是录制/归档时点的原文，按政策**不追改**，属判据没划清面。
   - **C2 = 我自己刚造的新标签**：布局行写「→ rejected/archived/postmortem（离场面三桶）」，与 [index §notes 行](../../docs/index.md) 的「离场两桶（D30）+ postmortem 单列」成第三套计数口径。**同轮暴露第四个盲区**：`checks|probes|tools` 的**脚本头注**运载指针，却不在任何 .md 扫描面——retired-path 扩面后实测红出两处（`cross-process-fs-probe` 引用已迁的 plans 研究卡、`time-context-probe` 引用已迁的 `_done/_closed_plans` 推敲卡），三门禁此前全绿放过。
   - **C3 = index 路由未随迁家改新**：现有文档表仍把「改动面→最小证据」记在 testing.md 名下（该表 2026-10-10 已迁 `tests/README.md`）。
   - **C5 = 成品口径两套措辞无单点映射**：公司手册写角色措辞「只有 CEO」，D20/判据写会话形状「Lead 的 present」；单公司与多人模式下二者重合，但「Lead ≡ CEO 根门」这一映射此前不在任何文件。
7. **幽灵指针 vendor/README.md（长期存活，靠门禁重挂藏身）**：纪律表把它当「vendor 钉版本 / 升 pin 流程合同」的权威，而**本仓从来没有这个文件**（`vendor/` 是子模块，只有 `dsh/`；`git log --all` 对该路径零记录——自 08ceba4 引入起就是幽灵）。它逃过所有审计的原因 = bare-path 的**双树重挂**：该 raw 被判成 `vendor/dsh` 下的同名文件命中（Cordis 自己的 vendoring manifest，语义完全不同的另一个文件）。
8. **`runtime/` 行自称"整树 gitignored"而实际 9 个文件 tracked**（`runtime/README.md`、`harness-home/README.md`、`cold-storage/…/r6-baseline/replay/*.jsonl` ×4、`probe-drill/schedule/two-instances.mjs`）。`.gitignore` 逐条规则其实是 `runtime/harness-home/*` + `!README.md` 这类**逐件**写法；而 bare-path 的整树豁免正建立在这句话上。
9. **`checks/README.md` 的索引规则无门禁，实测 11 个脚本缺索引**（索引规则原文：本目录第 107 行「新增入口同 diff 增加索引」）：`probes/fs-taskboard/` 5 个（S2/S5/S6 多人 UX 探针 + 协作 oracle + 同版本竞写）、`probes/session-context/` 3 个（S1/S4/S8）、`probes/team/` 3 个（S3 抢注竞速 + 多人端到端 + read-barrier 实验监听器）——全部**带头注**（`状态：常驻`），加入时间 2026-10-07…10-10，即多轮"加脚本不改索引"的累积漂移。
10. **结构性根因（fresh-agent 盲审实测）**：`AGENTS.md` 的 **fenced 布局块不在任何门禁射程**——bare-path 只吃单反引号 + TOP_DIRS 前缀，而布局块里的路径既无反引号、又按列对齐带尾随说明，两条都不满足。**上面第 7、8 两处腐化正住在这一块里**，这解释了它们为何能长期全绿存活。

## 决定

- **入口图写类目与 owner，不写数目**（用户裁定）：`AGENTS.md` 布局改「完成定义 skill 与 web-window-ops 的宿主（清单 = 目录本身，会话 catalog 自动发现）」；台账 D39 行同步去枚举；D39 Note 撤回我加的「落地后共 5 个」——**散文计数 = 无消费者、必漂的复述**（D28 枚举病 / D34「路径树即清单」同源）。数字改对 ≠ 漂移修掉。
- **离场目录不在布局行复述分类**：`notes/` 行只留链与 owner（分类唯一家 = notes/README.md），并同步把 index 该行的「离场两桶（D30）」计数措辞改成「离场与复盘目录（D30 起；逐桶判据唯一家 = notes/README）」——**全链零计数口径不一致**。
- **C1/C4 在判据层排除，不追改档案**：entry-probe 提示词的 conflicts 契约收窄到「**活跃树现行文本之间**的来源冲突」，点名历史面（snapshots 档案 / notes/archived / _backlog/_archive / deliverables-archive / runtime）的时效差异不立矛盾。
- **C2 的盲区用门禁堵死**（不动人工清扫）：retired-path 扫描面扩「checks|probes|tools|tests 的脚本**注释行**」——只扫注释（`//`、块注释行），不扫代码体（模板字符串/映射表是逻辑不是指针；本门禁自己的退役前缀映射表在单引号字符串里，自豁免）。
- `C5` 的单点映射落判据家 `demo.md`（「判据按会话形状核 = Lead 根门 present，与手册「只有 CEO」同指」），手册该行加指针——**手册是字节预算面，不复述判据**。
- **幽灵指针改指自足家**：纪律表该格改 `[release.md §vendor 政策](docs/release.md)`——该文件自称顶层合同（vendor 政策 + 升 pin 程序）且 §升 pin 程序自足；**不补建那个 README**（子模块内建文件会碰 vendor 只读面，且第二名只会再漂）。
- **同源盲区一并堵死**（bare-path 重挂例外）：raw 已带 `vendor/` 前缀时不再往 `vendor/dsh/` 下重挂——双树查本身保留（纪律表「权威（vendor 树）」列合法写 vendor 相对写法如 `packages/todo`）。
- `.pi/` 走 .gitignore 声明（带缘由注释）；写入者在本仓之外，不删目录。
- **布局块进射程**（新门禁 `layout-block`）：取 fenced 块的**首列路径 token** 做存在性检查（symlink 行、说明续行、`zz` 夹具负例跳过）。**只查存在性，不查散文语义**——"这句话说得对不对"不做机械判定（本仓既有边界：计数/措辞靠纪律与审读）。
- **`runtime/` 两处措辞改真**：`AGENTS.md` 布局行与 `runtime/README.md` 头部都改成「**绝大部分 gitignored、少数 tracked**」并列明哪几件 tracked（事实锚 = `.gitignore` 的逐件规则 + `git ls-files runtime`）。
- **补索引 11 条**：`checks/README.md` 按现有分区补入缺的 11 个脚本行（描述取自各脚本头注的「何时跑」，**不复述触发条件全文**——头注仍是唯一家）。

## 输掉的方案

- **把「三个」改成「四个」、给 D39 Note 补「现状 5 个」**（我最初的做法）：被用户裁定否决——下一位加 skill 即再漂，跟踪无消费者。
- **布局行列出离场三桶目录名**：被 probe 语义审否决（C2）——与 index 成第三套标签；分类细则归 notes/README 单家。
- **把退休前缀扫描面直接铺到全部脚本代码体**：否决。模板字符串与映射表承载逻辑（迁移工具正当地写着旧前缀到新家的换算），扫代码体必出假红；只扫注释行即覆盖真实的指针面。
- **给 C1/C4 类矛盾改档案（追改历史快照/archived Note）**：否决。冻结面按政策不追改，改记录 = 篡改证据；应在判据层划清「活跃树 vs 历史面」。
- **给「布局行计数与盘面一致」立门禁**：否决。判据要解析散文数字（机械判定性弱）；本轮改为不写计数，病灶消除而非把守。
- **补建那个 README 让指针变真**：否决。那要往只读子模块里加文件（碰 vendor 铁律），且权威内容本来已由 release.md 单家承担——把指针改指自足家才是治本。
- **裸路径门禁去掉双树重挂（一刀切只认本仓根）**：否决。纪律表「权威（vendor 树）」列的 vendor 相对写法（`packages/todo` 类）是合法且大量存在的用法，一刀切会制造几十处假红；正确刀口是**只禁重挂已带 `vendor/` 前缀的 raw**（那种写法无人会用来指子模块内部）。
- **orient 顶部词表/口径注记瘦身、dev-loop R1–R5b 历史标注洗澡、probes/tools 补目录 README**：均否决（首轮判断维持）——每条注记挡一次真实踩坑；历史标注自带「非现行义务」声明；checks/README 已索引全部脚本，目录级清单 = 第二清单必漂。

## 验证

| 检查 | 断言 | 结果（实跑原话） |
|---|---|---|
| 红样（改前实拍） | `ls .agents/skills/` 列 5 目录、其中 4 个完成定义，与根 AGENTS.md「三个完成定义」相抵 | 漂移属实（本轮动因） |
| **门禁红证（gate-change 纪律）** | 扩面后必须能抓住真事：`pnpm verify` | 2 处脚本头注命中退役前缀池（两池 = 本门禁 `RETIRED_PATH_PREFIXES` 的旧值，现行家分别为 `_backlog/issues/`、`_backlog/_archive/`）：`probes/fs-taskboard/cross-process-fs-probe.mjs:4`、`probes/session-context/time-context-probe.mjs:7`；`verify: 2 FAILURE(S)`。**同轮第二处扩面再抓一处真腐化**：`AGENTS.md:66` 的幽灵指针（见 §问题 7），门禁原话 = `FAIL bare-path: AGENTS.md:66 → 该路径不存在（双树均无——活指针腐化：改指针到现行家）` |
| 门禁转绿 | 两处头注改指现行家（`_backlog/_archive/settled_issues/…`，两文件 ls 确认在场）后复跑 | `PASS retired-path ×85 文件 + 122 脚本注释面`；`verify: ALL PASS` |
| **两道新守卫的反证复现**（"没见它红过的门禁不是证据"） | 临时把真事做回旧形状 → 必须红；还原 → 必须绿 | ① `time-context-probe` 头注改回旧 plans 池 → `FAIL retired-path: probes/session-context/time-context-probe.mjs:7 → 注释引用退役路径`，还原即 `ALL PASS`；② `docs/orient.md` 临时插幽灵指针 → `FAIL bare-path: docs/orient.md:78 → 该路径不存在（双树均无）`，还原即 `ALL PASS`；③ `AGENTS.md` 布局块临时插幽灵路径行 → `FAIL layout-block: AGENTS.md:15 → 该路径不存在（布局块指了盘上没有的路径）`，还原即 `PASS layout-block ×15` |
| **独立盲审（fresh-agent 盲读，无本轮记忆）** | 找"修复后是否真的不困惑了"，不看我的自述 | 实跑 `pnpm verify` ALL PASS + `pnpm test` 44/452；结论"入口链两跳可达、无断链、无循环"；**但抓出 4 处我漏的真问题**（见 §问题 8/9/10 + 一处我 Note 自报未发生的编辑已按"纠正"改写）+ 两条 fresh-agent 真实卡点（index 胖行误读、归档探针档案与现行文本不可区分）——**这正是本轮方法论的验证：自己审自己不够，独立盲审才抓得到自报不实** |
| `pnpm test`（终态） | 文档 + 门禁改动不打断 keyless 回归 | `Test Files 44 passed (44)` / `Tests 452 passed (452)` |
| `pnpm verify`（终态·全量） | 结构面全绿 | `verify: ALL PASS`（`bare-path ×462`、`retired-path ×85 文件 + 122 脚本注释面`、`doc-budget` 七文件含 index 143/143 顶格未涨、`handbook-budget` 手册 23184B + 1024B 余量 ≤ 32768） |
| entry-probe（真模型认证档） | 入口链文档改动后的升档义务 | 四次实跑见下「探针账」 |
| `git check-ignore -v .pi` | 本仓级 ignore 生效 | `.gitignore:24:.pi/	.pi`（exit 0） |

**探针账（四跑，全程如实）**：

| # | 命令 | 机器面 | 语义面 | 归因 |
|---|---|---|---|---|
| 1 | 默认 240s | `0/13` | 未执行 | `驱动：entry-probe: 轮次超时`、原始回答「（无回答）」——**不是内容红**；按掩盖黑名单**不加超时凑绿**，换长预算重跑 |
| 2 | `--timeout 480000` | `13/13` | 报 3 条矛盾 | C1+C5（存量真缺陷）+ C2（**我自己刚造的**）——全部修掉 |
| 3 | 判据收窄后 | `0/13` | `conflicts: []` | 13 题全答对、零矛盾，但**整份漏 evidence 数组** ⇒ 每题判「缺来源原文」= 输出形状抖动 |
| 4 | 重排提示词后 | `12/13` | `conflicts: []` | 证据回来了；唯一失分 Q1 = **改述**（模型写"保持历史性质、不收新件"，源文写"作为历史原文，不再新增条目；它们不是活跃问题、触发索引或任务来源"）——机器要求逐字，判失分正确 |

**第 3 跑的自我归因（不粉饰）**：我没有把 0/13 一句"模型抖动"带过——查了会话缓存（两跑同为 `deepseek-flash`，**不是换模型**），而第 3 跑前唯一的变量**就是我改的那句判据**（把 evidence 要求与 conflicts 判据塞进同一行长句）。据此按自伤处理：把「每题必须带 evidence」拆成独立一行、置于 conflicts 之前。第 4 跑证据即回正。**"先怀疑自己、再归因模型"**这条不写进文档，只写在这里当先例。

## 取代检查（每新增一篇 Note 触发）

- **部分取代**：同日 [stale-pointer-retired-path-gate](2026-10-10-stale-pointer-retired-path-gate.md) 立了 `retired-path` 门禁并关了三个盲区；本轮在其上**再关两个**（脚本注释面、bare-path 子模块重挂）——双方保留互链，该 Note 的「扫描面」事实锚已就地改新（决定正文不动，D38）。
- **不取代**：同日的 [minimal-evidence-mapping-home](2026-10-10-minimal-evidence-mapping-home.md)（改动面映射迁家）与 [completion-definition-skills](2026-10-09-completion-definition-skills.md)（skill 分层）各管一面。
  ⚠ **纠正（fresh-agent 盲审实测抓到）**：本篇早先草稿声称「completion-definition-skills 的计数被本轮顺手改新」——**该编辑从未发生**（该文件自 6d83d81 起未动）。如实结论 = **不改它**：其第 1 行标题（「三个完成定义 skill：…」）与第 7 行（「只有 **2** 个 skill」）都是 **D39 决定当时**的叙述，属冻结的决定正文（D38 只管路径/符号/默认值这类事实锚，不管历史计数）；本轮只改**现时入口图**里的计数（根 AGENTS.md 布局、index 台账行、snapshots/README 的探针描述），不改历史决策叙述。
- **无完整取代对象**：本轮不完整吸收任何既有 Note（历史审计轮的独有理由各自仍在原位）。

## 后果

- 入口图不再含会漂的计数与枚举：skill / 离场目录的清单家回到目录与 notes/README；fresh agent 对表不会再得出「文档撒谎」。
- 「四件套」消歧；`.pi/` 全机隐身；成品口径有了单点映射家（demo.md），手册只留指针。
- **探针脚本头注进入门禁射程**：这类指针此前只靠人眼，扩面后与文档同规格受检（本轮即抓 2 处）。
- **幽灵指针清除 + 同源盲区堵死**：`AGENTS.md` 纪律表该格的权威改指自足家 `release.md §vendor 政策`；bare-path 不再把已带 `vendor/` 前缀的 raw 重挂到子模块下——这类"重挂洗白"是活指针腐化的**新盲区形状**，与 retired-path 同源。
- **入口链文档的判据面收窄到活跃树**：历史面（快照档案/archived/_backlog/_archive/deliverables-archive/runtime）的时效差异不再逐轮误报，语义审的信噪比提高。
- entry-probe 语义审本轮实测价值拉满：抓到修复者自己刚造的 C2 + 两条存量死指针 + 一处幽灵指针 + 判据没划清历史面；**"先怀疑自己的改动，再归因模型"**成为一条可复用的先例。
- 冻结面（archived Note、历史探针档案、`_backlog/_archive`）**一处未改**——记录当时事实是它们的职责。
- **残留（如实记）**：entry-probe 机器面未达 13/13（现 12/13，唯一失分是改述而非仓库缺陷）；四条探针档案（含一次超时）已随本轮入 `snapshots/`，作为按次证据保留。
