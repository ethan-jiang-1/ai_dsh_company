---
topic: 仓库卫生
intent: "第二轮 fresh-agent 打扫（同日晚，母卡持续跟进）：六维度复评——验证上轮修复是否守住、挖上轮未解深水区、抓上轮之后的新腐化；产出带证据的分级发现与改善清单。"
---

# 第二轮六维度打扫卫生审计（2026-10-20 晚）

> 服务：[母卡](../../issues/2026-10-20-fresh-agent-repo-hygiene.md)｜上一轮：[fresh-agent-audit](./2026-10-20-fresh-agent-audit.md)（批次 0–2+结构切片同日完成）
> 口径：fresh agent 只读评审 + 亲跑全部 keyless lane（verify / test〔子代理〕/ orient / diagnose / client-load-smoke / preset-smoke / cdp-probe 活体 / replay r2 / replay r3）+ 四个独立子代理深挖（D2 代码结构 / D4 上下文腐化 / D5 测试资产 / D6 反馈通路）；vendor/dsh 只读；真模型认证档未跑。
> 数字基线：76 spec（company 18 / client 26 / presets 1 / harness 31）·36 门禁 ·52 探针 ·14 smoke+4 audit · tools/lib 36 模块 · src 45 文件 7853 行 · notes 记忆 ≈8300 行 · 47 快照场景 · 725 commits。

## 0. 一句话结论

系统六维度整体健康、上轮修复全部守住（36 门 ALL PASS / 711 用例绿 / 6 preset 挂载 / cdp-probe 9/9 活体复验）；
但本轮抓到**一件当日新鲜复发的结构性问题**（replay 回归网实际只剩 1/10）与**一批门禁拦不住的语义面债务**
（纯文本引用盲区 / 计数无对家 / 术语三义 / 常驻层饱和 / notes 检索退化）。腐化主形态已从「文档说谎」转为「检索层退化 + 常驻层饱和 + 回归网变薄」。

## 1. 头号发现：replay 回归网实际只剩 1/10（r3 被纯 docs 提交打断）

证据链（全部本轮实测）：

1. `node checks/smoke/replay-smoke.mjs --scenario r3-delegation` **红**：full 档「归一化日志零 diff」session#1 第 13 行失败（差异在注入手册内容）。
2. 根因 = 提交 `589d785`（2026-10-20 21:58，手册去重 190→187 行）——手册（`packages/company-pack/workspace/AGENTS.md`，唯一家；company-workspace 是符号链接）是会话注入内容，改它=改回放输入；r3 录制（2026-10-10 重录）含旧手册。
3. 上轮审计当天早些时候 r3 曾全绿（14.7s）→ 589d785 是唯一中间变量。
4. 通路缺口：pre-push hook 只跑 verify+test（不含 replay）；tests/README「改动面→最窄检查」**没有**「pack workspace 制度件/注入面 → replay」行；`replay-scene-liveness` 门禁按设计不跑进程（只证声明↔磁盘一致），r3 的 runnable 声明已失真。
5. r2 虽绿，但其内容级判据（归一化全量/sidecar）是 presence 档显式 SKIP——**可跑回归网实际 = 1 个场景（r2 presence 档，只守在场板形状）**。
6. 病理与 snapshots/README「录制是内容快照而仓库在动」自述一致——上轮审计后的当日复发，新形态 = runnable 声明失真。

次级发现（反馈质量）：replay-smoke full 档 session 行差异显示 `JSON.stringify(...).slice(0,700)` 截断头（replay-smoke.mjs:657-659），手册差异在第 ~150 行 → 期望/实际可见前缀完全相同，跑动中的 agent 看不出差异在哪；`firstDiff()`（:585，首行精确定位）只用于 sidecar（:714）与 --ui。

修法（P0，技术路线已验证）：
- ① tests/README 改动面表加一行「pack workspace 制度件/注入面（手册、CHARTER、模板、persona、工具表）→ 受影响 replay 场景重跑/重录」。
- ② 新门禁 `replay-fixture-freshness`（keyless 静态、不跑进程）：对每个 runnable 场景，从 replay fixture 的 user/message 提取注入手册文本（r3 fixture 实测含注入）、persona sidecar 对比现行源——漂移即红，指向「重跑/重录/转 archived」三选一。红配方现成：改手册一字即红（589d785 就是活例）。
- ③ r3 处置二选一（需用户拍板，重录要真模型几分钟）：重录 or 声明翻 archived。
- ④ session 行 diff 改用 firstDiff + 失败现场落诊断区（sidecar 已有先例）。

## 2. 六维度分评

### D1 文档与代码清晰度、渐进披露 —— 判定：成立，边角有债

- 入口链（AGENTS.md → 三图 → 按任务表 → 合同/指南 → 头注）亲测成立；任务走查「改 CEO persona」3 跳达落点（AGENTS.md → project-map → presets.md → agent.cordis.yml），preset-change-definition skill 兜完成定义。
- 「notes 按主题检索」无机制：AGENTS.md 要求检索相关 Note，但无主题索引（no-index 教义，有意）、无检索工具（orient 不索引 notes）、无配方教给新 agent；实测 grep 可行但词汇碎片化降召回（「驾驶舱」命中旧 note、「在场」命中新 note、「presence」命中代码——同一机制三个词）。
- 源码地图 1 处实质漂移：src/README L18-19「client 半消费 presence/board/budget」过期——实测 client 直接消费 lib 的 **10/13** 模块（2026-10-05 重写后新增台账/成品/培养页签没回填）；照这句去改 ledger 面板会引向错误的最小阅读集。
- AGENTS.md 布局块完备性缺口：漏 `company-workspace/cultivation/`、`run/entry-probe.patch.yml`+`run/README.md`、`_backlog/triggers.md`（layout-block 门禁只查「写的存在」，不查「存在的都写了」）。
- checks/README 163 行 81 入口是平铺临界区，但有 script-index 门禁钉住覆盖；AGENTS.md 首读密度高（D 号/黑话需查 decisions/terminology——设计如此，orient 兜白话）。

### D2 代码与测试的结构层次 —— 判定：真分层、深模块，pack 内边角有债

- 结构判定（子代理全量走查）：层次真实、方向单向、入口薄（host 190 行编排 / client 272 行组合根）；lib 13 模块几乎全叶子；presence facade 拆法是教科书级；3 跳测试 host/client 侧达标，client 最深链 5 文件是数据折算分层的合理代价。
- Top-10 文件无一真·神模块；最宽两个 = lib/cultivation.ts（397 行五合一，presence 当年同款宽度）与 host/cultivation.ts。
- 「一处事实一个家」在 pack 内部落空：五角色名册 3 份字面量（presence-status.ts:51 / lib/cultivation.ts:11 / host/cultivation.ts:253,288）+ 显示名双词汇（PRESET_DISPLAY_NAMES vs ROLE_LABELS）——加角色动 ≥4 处。
- run-gates「清单唯一源 = gates/ 目录」名实不符：runner 是手工 import+调用块（run-gates.mjs:19-99），零孤儿探测——新门禁忘接线 = 静默哑弹（当前实测 36/36 全接线，0 孤儿）；这是门禁体系里唯一没被门禁管住的事。
- client/ 28 文件平铺 + styles.ts 571 行单点：client 半的渐进披露靠目录表+README 支撑而非结构本身。
- deliverables-catalog 同名异职（src/lib 地址 vs tools/lib 生成器）grep 噪声；门禁间横向 import（script-status/port ← script-triggers）有惯例但非完全独立。
- 走查对比：加探针 3 文件最顺滑（头注门禁自动执法）；加门禁 2 文件但接线手工；client 面板 3-4 文件。
- 测试结构同评：company 区 1:1 同名映射、最大 spec 非大杂烩（578 行 = 8 describe 规则族 35 it 全带 BUG 号溯源）；元测试 ~11%（全套）健康未失控，guard-red-record 门禁反向约束。

### D3 文档/执行/验收整体结构 —— 判定：异常清晰，但流程自身重量偏高

- 一处事实一个家 + 行预算棘轮 + 四链完成判断 + 六行回执 + 五个完成定义 skill：结构纪律罕见地强，全部亲验有效。
- 风险 = 流程装备对单人仓偏重（六行回执/四输入语义审/收割三问/复核一问——每轮收尾的固定成本）；这是有意识的取舍，不是腐化。
- dev-loop §2 出现 3.5–3.9 小数编号层（追加式生长痕迹）；presets.md 工具表嵌「harvest 批1/批2/批5a」历史批次叙述（合同层混时间轴，与 docs/AGENTS「不追加变更史」原则相悖）。

### D4 上下文腐化与偏移 —— 判定：点状已发生、面状健康；主形态转移

（子代理只读审计；其未查面已如实声明：design 四份与手册全文未通读、note 未全量两两比对、verify/test 未实跑而以母卡当日记录为基线逐项对盘——实锤两处由主 agent 一手复核补强）

- 上轮批次 0–2 修复逐一复核：**全部真修**；死指针率 ~1/60（上轮 17 项账本 → 本轮 2.5 处）。
- 实锤 2.5 处（均经主 agent 一手复核）：budget-and-ops.md:41 纯文本引用已迁档 note（「见 notes/implemented/2026-09-22-org-presence-board.md」而该 note 实际在 notes/archived/；bare-path 只扫反引号、md-links 只扫链接，双失明——decisions.md D22 行同事实却是对的，同事实两处陈述一处漂移的活例）；notes/README.md:73「0001–0004 在档」实际 0001–0003（0004 已随 63a0f90 删除；分类 owner 文件自带过期计数，无对家门禁）；（祖父豁免档 1 处 entry-execution-chain-debt:66，设计内豁免非门禁失败）。
- 措辞家族残留：orient.mjs:129 运行时输出串「五角色组合」（上轮修了 7 处文档，漏运行时字符串——修字必漏字符串的实例）。
- 术语面：R3 三义重载最危险（退役轮次 R3 / 快照场景号 r3 / R3′ 扫描口径——R3′ 定义在 Note 但 terminology/orient 无声明）；观察窗=驾驶舱=驾驶座已声明但 terminology.md 无行；「成品/交付物/deliverables」边界清楚但「成品」无表行。
- 滞留研究稿：_backlog/research/company-panels-ux（2 份）+ backlog-ux（1 份）——消费卡已归档但研究稿未随迁（章程义务未执行）；checks/README:162 触发表指针还压在活跃路径。
- 陈旧标记零实弹（TODO/FIXME 全为领域词/红绿叙述/负例约定）；_backlog 无死卡。
- **预算饱和系统性**：4 份 ≥95%（web-rpc 47/47、手册 187/190+26.4KB/32KB、dev-loop 350/367、roles-isolation 178/187）；11 份合同无预算 ≈1309 行（demo 226 / multi-human 190 / presets 189 / release 135 / delegation 114 / bootstrap 108…）——无棘轮处最会长历史叙述（上轮批次 3 未执行的最小切片）。
- **notes 检索退化**：implemented 78 件 5705 行、记忆总量 ≈8300 行 ≈ 当前合同 3 倍；状态行抽 5 全合规；但无检索手段+词汇碎片化——腐化主形态已从「文档说谎」转为「检索层退化」。
- 门禁结构性盲区清单（六类，上轮未系统化列出）：纯文本路径引用 / 计数断言无对家 / 词汇别名重载 / 布局完备性 / 随卡离场流程义务 / 措辞家族修字漏运行时字符串。

### D5 测试资产组织、测试点、覆盖、类型 —— 判定：合理性高、覆盖良好偏上、类型中上

（子代理全量评审 + 本轮亲跑）

- 实跑：`pnpm test` 76 spec / 711 it 全绿 27.6s；`pnpm verify` 36 门 6.4s。composition 单用例 5.9s=全套 36%；act() 警告 12 次刷屏（CultivationBoard.tsx:33）。
- 测试点合理性：**高**——行为判据为主（命令入参/审计 oracle+tmpdir 变异反证/真插件 apply+真 schema 校验/真事件派发）、强断言、反证文化贯穿（guard-red-record 22 声明全对真事故卡+红配方）；最弱一档 client-face 源码文本断言有事故锚+视觉探针兜底，属有意的廉价早检分工。
- 覆盖：tools/lib 33/36 直接 spec（3 个间接或属非 keyless 基础设施）；src/lib 12/13 直接；**声明外缺口**：use-company-data 订阅/轮询生命周期无窄 spec、attention/presence/budget 三面板无专视觉探针、replay 仅 2/10 runnable（本轮实测实为 1/10，见 §1）。docs/testing.md 未覆盖声明与升级地图逐条核实**全部准确**（六项升级无一偷跑）。
- 类型充沛度：九层有真资产（含安全 lane 5 闸真扫+34 件指纹、审计/语料档、并发冲突语义 22 探针）；**缺三种**：性能回归（无任何性能判据，升级地图已声明未建）、负载压力（并发停在 2 写者正确性）、可跑回放网宽度。
- 「改动面→最窄检查」表 5 实例实跑验证可用无断链，被 navigation-assets spec + script-index 门禁机械钉住。
- 测试代码质量：均 127 行/spec；无千行巨无霸；中文行为命题现在时可当文档读；夹具收敛史有注释；夹具发射器让探针与 spec 共用输入。

### D6 反馈通路 —— 判定：设计成体系、六环链闭环；但主力查询工具埋着两颗当日新生 bug

（子代理只读盘点 + 主 agent 一手复现全部硬发现）

**通的（亲测）**：七条 lane 全通——verify 4.6s（逐门计数）/ orient 3.2s（全景+凭据+run bundle）/ orient --scenario r2（引用视图完整）/ diagnose（秒级摘要+token 脱敏）/ client-load-smoke 8.2s（真浏览器）/ preset-smoke 4.7s（6 preset）/ cdp-probe 活体 11.5s（9/9 页签零失败零 console 问题）；「呈现即验证」链闭环（起窗 banner token → CDP 断言 → verdict → 失败落 diagnosis/，盘上数小时前的真实失败证据在场：cdp-probe-2026-10-20T12-53-52-966Z/）；RPC 通路文档与实现互证（probe-web 被 25 探针消费）；13 条症状→动作 runbook 指向的手段逐一核实存在；无 doc-only 断链。

**🔴 BUG A（diagnose 审批判读整列失真，一手复现）**：真实 v4 日志 `approval/decided.data = {id, outcome:"rejected"|...}`（vendor persistence-catalog 权威 + session-1d120f37 实测原行），但 session-diagnose.mjs:27-29 decisionOf 只读 `decision?.kind/decision/answer/approval?.decision`——键完全不相交 ⇒ 实测输出 `FAILURES - approval ? → `（无名、无结论、无 outcome）：每条审批都渲染成不可读失败行；allowed-once 会被误报、真 rejected 丢结论；工具名未按 id 连 approval/asked。测试夹具（session-diagnose.spec.ts:13）用想象形状 `{toolName, decision}` ⇒ 76 spec 全绿但工具读真日志必错——典型夹具漂移。**附带发现**：同工具 `turn 1 error：[object Object]` 渲染也坏（error 未字符串化）。该工具 2026-10-20 早晨才生（consistency sweep 批次 2），bug 未登记。
**🔴 BUG C（orient --scenario 对 r3 崩，一手复现）**：`ENOTDIR: scandir …/r3-delegation/sessions/vp-eng-child.jsonl`（orient.mjs(lib):294-296 runBundleView 假设 children 是目录，r3 声明文件）——「深看某次运行」在 2 个 runnable 场景之一上不可用（r2 正常）。
**🟠 replay 舰队老化**：runnable 2/10 → 本轮实测 r3 红（§1）⇒ 实际 1/10；历史场景代码锚未记；sidecar 失败转储仍落 /tmp 固定名（replay-smoke:711-712——上轮把截图搬进 diagnosis/ 时这处漏网，同类跨轮覆盖风险）。
**🟡 次级**：orient newestLogFile 未走 pickSessionLog（世代模块明令消灭的分叉读取点，当前只影响 preset 头）；client-load-smoke console 只过滤 loader 错误（其它控制台错误须附着 lane 补）；orient 无活进程/端口现势视图；diagnose `--session` 前缀不认 `session-` 全名（工具自己输出的形态它不收，实测）而 orient 两态都吃——口径不一。
**判定**：跑动中的 agent 不是瞎的（页面六环 + 日志四段 + runbook 全实指），但「日志还原」主力工具的正确性缺口（BUG A/C）让它降级为「可信但要绕」——且两颗都是当日新生工具的 bug，恰证「新面 + 旧总账」的速度差。

## 4. 上轮修复守住面（复核结论）

- 36 门 ALL PASS、711 用例绿、6 preset 挂载、cdp-probe 9/9（活体）、release-smoke 含 researcher（子代理代码核对）、runtime tracked 白名单恰 9 件、mock 白名单两处属实、checks/snapshots 索引门禁生效、docs/index 拆分完成、design 四件入预算。
- 上轮明确遗留四件仍开放：手册饱和（187/190）、replay 2/10（本轮进一步恶化至实跑 1/10）、host `export *`（已接受取舍）、批次 3 结构瘦身未执行（11 份无预算合同是其存量）。

## 5. 改善清单（优先级提案，待用户 REVIEW）

- **P0 反馈通路正确性（keyless 可修，小切片）**：
  - BUG A：diagnose 审批判读——decisionOf 读 `outcome`（对齐 vendor 枚举 allowed-once/rejected/cancelled/unavailable）+ 按 id 连 `approval/asked` 拿工具名 + 修 `[object Object]` 渲染 + 夹具改从真日志取样（session-1d120f37 的原行现成）；
  - BUG C：orient runBundleView 兼容 children 为文件；
  - replay r3 修复四件套（§1）：tests/README 加「注入面改动 → replay」映射行 + 新门禁 replay-fixture-freshness（keyless 静态比对新旧注入内容，红配方现成）+ r3 处置拍板（重录[真模型几分钟] or 翻 archived）+ full 档 session diff 改 firstDiff + 失败现场落诊断区（顺带收 /tmp sidecar 尾巴）+ diagnose/orient `--session` 前缀口径统一。
- **P1 语义面止血（D4）**：修 2 处实锤（budget-and-ops.md:41 改指 archived/；notes/README.md:73 改「0001–0003 在档」）+ bare-path 补「docs 纯文本 notes/ 引用」档（或规矩化 notes 引用必须反引号）；计数断言建对家（改指针或扩 nav-count-claims）；orient.mjs:129「五角色组合」措辞；AGENTS.md 布局块补 cultivation/、run/ 两件、_backlog/triggers.md。
- **P2 结构收拢（D2）**：五角色名册收进 presence-status 单一家（pack 内 3 份字面量 → 1）；run-gates 孤儿探测（gates/ 目录 vs 手工接线清单机械比对——门禁体系里唯一没被门禁管住的事）；src/README 消费面句修正（L18-19 实测 10/13）或删枚举留目录指针。
- **P3 测试资产补强（D5）**：composition 拆分/缓存（5.9s=全套 36%）；act() 警告清理（12 次）；use-company-data 生命周期 spec；attention/presence/budget 视觉探针；性能最小档（按升级地图触发条件）。
- **P4 常驻层与检索（D4）**：terminology.md 补三行项目内别名组（观察窗×3 / R3 三义 / 成品边界——19/22 正好用掉头寸）；web-rpc（47/47）与手册（187/190）棘轮搬家；demo/multi-human/presets 立冻结预算（批次 3 最小切片）；notes 检索配方一行（`rg -l '<词>' notes/implemented` + 决策级先查 decisions.md）；滞留研究稿随卡归档 + checks/README:162 指针同 diff 更新。

## 6. 本轮实跑命令与读数（关键摘录）

```text
pnpm verify                                          # ALL PASS 36 门 4.6s
pnpm orient                                          # 3.2s；凭据✓；47 场景（archive12·corpora1·probes16·replay10·visual8）
pnpm test（子代理）                                   # 76 spec / 711 it 全绿 27.6s
node checks/smoke/client-load-smoke.mjs              # ALL PASS 8.2s
node checks/smoke/preset-smoke.mjs                   # ALL PASS 6 preset 4.7s
pnpm dsh web（--port 0 --no-open，后台）              # banner token URL → cdp-probe 9/9 零失败 11.5s → 已清理
node checks/smoke/replay-smoke.mjs --scenario r2-motion        # ALL PASS 34s（presence 档）
node checks/smoke/replay-smoke.mjs --scenario r3-delegation    # 1 FAILURE：归一化日志零 diff（session#1 第 13 行）
git status --porcelain                               # 评审零足迹
```
