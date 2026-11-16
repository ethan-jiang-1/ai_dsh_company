# 2026-11-15 · 缺陷修复方法显性化：从症状到已修卡，按根因成批、先红后修、材料性不自授权

状态：implemented（2026-11-15 落地；决定号 = D62）

上游 = 用户 2026-11-15：「`_backlog/methods` 看看这里头其实是我们的一些方法学……backlog 里头其实是有两个东西，一个是 issue 的落地（往往可能是先满足出现高质量的 note），一个是 bug 的 fix……没显性化的流程模型可能会瞎发挥……越全面越好，记得这个是 DSH 插件的开发」。

## 问题

- `_backlog/methods/` 此前是**问题轨**的方法架（澄清 / 证据 / 验收 / 结论 / `issue-to-note`）；缺陷轨有制度、状态机、卡模板和两道门，却没有一篇工作程序。
- 隐式模型散在章程翻转表、ledger 的修复交接段和 commit body 里；复现、根因证据、同类排查、材料性中途变化、非缺陷改判、无卡快修都没有出口物。
- **多卡同轮也没有模型**：有时一张一张修，有时半批一起修，有时几批并行；一堆 bug 背后往往只有一两个根因。旧规则只有一句「≥3 张先按根因分组」，没有聚类、排序、批次记录、按变更判材料性，也没有「什么时候该出一篇批次 Note」。结果是逐症状打补丁，或者把一批共享根因的修复写成 N 篇互不相干的流水。
- `修复就绪` 是**自授权例外**，卡是唯一的事前证据面；旧门只查 `## 已修判定` 非空——没复现、猜根因、没扫同类也能拿到自授权。
- 两个轨的出口不同：问题轨是决定 / Note；缺陷轨是系统面改动 + 红→绿 + 提交对账。把缺陷修成 Note，或把问题结论当成改代码，都是把两条轨混成一条。

## 决定

1. **新增 `_backlog/methods/bug-fix.md`**：缺陷轨工作程序。按 DSH 插件面（host / lib / client / preset / content / composition / tooling / release / vendor / environment）路由复现与证据；三条硬停（期望行为有争议 → 问题轨；没红循环 → 不修；根因未证或材料性未授权 → 不翻 `修复就绪`）；无卡快修最小闭环；`修复就绪` 前与 `已修` 前两张 checklist。
2. **方法导航显性化两轨**：`_backlog/methods/README.md` 顶部加两轨表，明确问题轨出口 = 结论 / Note，缺陷轨出口 = `已修` 卡 + 红→绿证据 + 对账提交；Note 只在材料性或成批共享机制决定时附一篇。
3. **批次模型显性化**：`_backlog/methods/bug-fix.md` §3 定义「批次 = 本轮选择一起修的子集，不是所有活跃卡」；先盘点（症状 / DSH 面 / 机制假设 / severity / 材料性 / 红循环），再**按机制聚类**（不是按文件或措辞）并确认共同根因；一组一修、按依赖与爆炸半径排序；每卡保留自己的 `## 已修判定` / `## 修复证据`；材料性按**变更**判，不按卡判，一个材料性批次一次授权请求（每张材料卡各自翻 `等人拍板`）；批次计划写进 [bugs ledger](../../_backlog/bugs/README.md)「修复交接」段，不建第二套 tracker。
4. **Note 门槛按批次判**：一个**共享机制决定**（一张或若干张卡）——有真实替代（逐症状 vs 修原语）、有持久不变量 / 合同 / 顺序约束——就写**一篇批次 Note**，卡上 `留痕：Note <path>` 指向同一篇；若批次含多个互不相同的共享机制，写一篇伞 Note 分节，或各自一篇，仍禁止每卡一篇；独立机械 one-off 用 commit，不写 Note。**批次 Note 是决定留痕，不是材料性升格**：它不把非材料卡变成材料卡，也不替代授权。**禁止每卡一篇，也禁止该写时用「卡上都记了」逃掉**。这正对应 notes 的判据：真实替代 + 持久取舍。
5. **卡模板与入口接上**：`_backlog/bugs/README.md` 新模板 = 症状 / 运行面 / 复现 / 根因与证据 / 失败类与同类排查 / 修复方案与范围 / 已修判定 / 修复证据；新加「修复批次模板」表（组 / 卡 / 共同根因 / 修法 / 顺序 / 证据）；`_backlog/AGENTS.md`、`_backlog/bugs/AGENTS.md`、`_backlog/README.md` 加方法与批次指针。
6. **机械门补一面**：`backlog-liveness` 对 `修复就绪` / `修复已落地` 追加 `## 复现`、`## 根因与证据`、`## 失败类与同类排查` 非空；`opened ≥ 2026-11-15` 的 `## 复现` 还要求命令住围栏或行内 code（裸行不算；纯散文 / 只贴输出，含 `node:`/`sh:` 堆栈，红）。spec 正负例；真树红证见下。门只查形状，不证明证据为真。
7. **`fix-evidence` 不动**：它管归档四行 + 提交对账；新门管翻门票前的证据面。两道门一前一后，都不在 `verify` 里重跑测试。

## 输掉的方案

- **把程序写进 `_backlog/README.md` 章程**：章程是制度与判据，且 140 行顶格；程序随做法变，应住 methods。章程只留一行指针。
- **一 gate 一篇方法**：问题轨的方法按问题类型切，不按门切；缺陷轨一篇覆盖全链就够，拆五篇会制造第二套导航。
- **只靠 `diagnosing-bugs` 技能**：通用 feedback-loop 很好，但不含本仓的材料性、授权、卡形状、证据对账；且不是每个会话都可见。方法正文自走，技能可见时借用其纪律。
- **只加门禁、不写方法**：形状门只能证明「写过」，不能证明「修对」；假红、测试迁就实现、修症状不修根因都仍会漏。
- **每个缺陷都写 Note**：把知识层变流水账；缺陷轨的完成判据是改动 + 证据，Note 只在材料性或持久决定时写。
- **按卡逐张修，不做批次聚类**：同一根因修 N 遍，证据和排序都散；ledger 的修复交接段已经证明「按根因分组、组内一次修」是实际有效的形状。
- **把批次做成第二套 tracker / 新状态**：批次是本轮选择一起修的子集，不是生命周期值；记录住 ledger 的修复交接段，卡仍是工作项。
- **只按「卡多」决定写 Note**：Note 判据是决定是否持久，不是数量；共享机制决定写一篇批次 Note，独立机械 one-off 用 commit。
- **新增 `非缺陷` 状态**：这是换轨，不是缺陷轨终态；按问题轨归档（BUG-140 先例），不扩展缺陷状态机。
- **立即把 `## 运行面` / `## 修复方案与范围` 也做成门**：先收最载重的三节；其余先当方法 checklist，等复发再加，符合「不预铺」。

## 归位

**为什么这层**：这是「怎么做」的工作程序，随做法变；问题轨的同类已经在 `methods/`，缺陷轨的对应物也应在同一层。**什么会逼它搬家**：如果缺陷修复变成公司 preset 的通用能力（不是本仓 backlog 的工作程序），才进 `content/` 的方法层。**哪个更低层被排除**：`bugs/README.md` 是台账 / 模板 / 流水，`_backlog/AGENTS.md` 是按目录注入的薄门牌，根 `AGENTS.md` 是入口链——都不适合放一篇完整程序。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 缺陷轨有独立工作程序；批次 = 本轮子集，按机制聚类、按依赖排序；翻 `修复就绪` 前必须有 复现 / 根因与证据 / 失败类与同类排查 / 已修判定 四节；修 = 系统面改动 + 同一条命令红→绿 + 对账提交 |
| 规则唯一家 | `_backlog/README.md`「缺陷的通道」 |
| 程序唯一家 | `_backlog/methods/bug-fix.md` |
| 卡形状 | `_backlog/bugs/README.md` 模板；注入门牌 = `_backlog/bugs/AGENTS.md` |
| 批次记录 | `_backlog/bugs/README.md`「修复交接」段（组 / 卡 / 共同根因 / 顺序 / 证据）；不建第二套 tracker |
| Note 门槛 | 共享机制决定 → 一篇批次 Note；独立机械 one-off → commit；判据仍 = `notes/README.md` §二 |
| 机械门 | `checks/gates/backlog-liveness.mjs`（翻门票前四节；`opened ≥ 2026-11-15` 的复现节须有围栏/行内命令，裸行与只贴输出不算）+ `checks/gates/fix-evidence.mjs`（归档四行 + 提交对账） |
| 导航 | `_backlog/methods/README.md`、`_backlog/AGENTS.md` |
| 决策台账 | `docs/reference/decisions.md` D62（一行路由） |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| 结构门禁 `pnpm verify` | 2 | ① 真树植入临时卡 BUG-999（`修复就绪` 只有 `## 已修判定`，验证后删除）→ `FAIL backlog-liveness: <临时卡>:1 「修复就绪」卡缺非空 ## 复现——翻门票前先把红色复现写在卡上；…缺非空 ## 根因与证据——…；…缺非空 ## 失败类与同类排查——…`；② 临时卡 BUG-997（`## 复现` 只有散文）→ `FAIL backlog-liveness: <临时卡>:11 「修复就绪」卡 ## 复现 没有可执行的命令/脚本——命令放进围栏或行内 code；纯散文 / 只贴输出不算`；两次删卡 + 索引行 → `verify: ALL PASS；2 门无对象` |
| 单测 `pnpm test tests/tools/backlog-liveness.spec.ts` | 3 | 正例 35 passed；缺 `已修判定` / `复现` / `根因与证据` / `失败类与同类排查` 各自红；复现只有散文、只贴输出（`node:` 堆栈）、裸行红；围栏命令、行内命令、`cd … && …`、`./node_modules/.bin/tsdown` 绿；`调查中` 不误红 |
| 全量 | — | `pnpm test` 249 files / 2120 tests；`pnpm test:checks` 10 PASS / 0 FAIL；`pnpm typecheck`、`pnpm lint`、`pnpm dup`（0 clones）全过 |
| 文档面 | — | `pnpm verify` ALL PASS（md-links / doc-budget / method 形状 / notes-*；批次模板链接） |

## 未覆盖轴

- [policy] **新门只查形状**：四节非空 + `## 复现` 有围栏/行内命令（裸行、纯散文、常见输出前缀不算）；不证明复现真红、根因真确认、同类真扫过；真证据仍靠 `fix-evidence` 与独立盲审 → `_backlog/methods/bug-fix.md`、`checks/gates/backlog-liveness.mjs`
- [policy] **命令锚挡不住所有 output 行**：`git version …` / `npm ERR! …` 这类命令词+空格的输出仍可能过；门只挡常见前缀（node:/sh:/curl:/git:）、裸行与纯散文 → `_backlog/methods/bug-fix.md`、`checks/lib/backlog-liveness.mjs`
- [policy] **批次的「同根因」是判断**：没有门禁证明一组卡真的共享根因、排序合理或 Note 该写；靠 ledger 批次表 + 独立盲审 + 每卡证据 → `_backlog/bugs/README.md`、`_backlog/methods/bug-fix.md`
- [policy] **无卡快修没有卡 / 门禁**：非材料性当场修靠 commit body 与轮次回执，机械面不查 → `_backlog/methods/bug-fix.md`、`docs/guides/dev-loop.md`
- [policy] **非缺陷改判沿用先例**：不新增状态 / 门禁，按问题轨归档 → `_backlog/_archive/settled_issues/BUG-140-tasks-tab-still-empty-with-selected-team-task-session.md`
- [covered] **方法与导航的形状**：method frontmatter、md-links、doc-budget 由 `pnpm verify` 覆盖 → `checks/gates/backlog-liveness.mjs`、`checks/gates/doc-budget.mjs`
- [environment-gap] **真模型 / 真浏览器证据**：按面选择，不在 `pnpm verify` 内重跑；本仓 keyless 面不覆盖 → `docs/testing.md`、`tests/README.md`
