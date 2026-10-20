---
topic: 仓库卫生
intent: "以 fresh agent 视角复核六轴（渐进披露 / 代码分层 / 文档-执行-验收结构 / 上下文腐化 / 测试资产 / 反馈通路），为「fresh-agent 全仓打扫卫生」问题卡提供可复跑证据与分批修复建议。"
---

# Fresh-agent 全仓打扫卫生审计（2026-10-20）

> 服务：[问题卡](../../settled_issues/2026-10-20-fresh-agent-repo-hygiene.md)｜关联：[BUG-029](../../fixed_bugs/BUG-029-committed-web-token-recurrence.md)
> 口径：**只读审计 + 实跑 keyless / 真浏览器 / 重放**；未跑真模型认证档（成本与时长）；`vendor/dsh/` 只读。
> 本文件里的数字都来自本轮实跑，命令见 §6；历史 payload 不碰。token 值不转录。
> 目的不是证明仓库差，而是找出「fresh agent 会在哪里看错、看漏、看瞎」。

## 0. 一句话结论

系统整体是健康的：结构门禁、711 个 keyless 用例（审计时 695；本轮新增守卫/探针测试 16 个）、6 个 preset 真挂载、真浏览器加载、r3 full 重放全部绿；
代码也不是平铺的，`host/` / `lib/` / `client/` 的分层成立。

但**上下文面已经饱和，而通用反馈闸门落后于最近几轮功能增量**：

1. **总账靠手维护**：`checks/README.md` 与 `snapshots/README.md` 是最会漂的两份文档——一个漏 5 个公开入口，
   一个漏 4 个场景，且抄进去的计数（44 行、9 场景 1 可跑）已经过期。它们恰好是 D28 警告的「集中清单」。
2. **通用「全部页签」探针是假全量**：`cdp-probe` 的 tabs 数组还是 8 个（少「成品」），且只断言
   `body.innerText` 里出现页签词，不断言面板体真的渲染；空面板也能过。
3. **失败现场不留痕**：`replay --ui` 把截图/aria/console 写进 `/tmp` 的固定文件名，下一次运行覆盖；
   `client-load-smoke` / `cdp-probe` 失败时没有截图。仓库已有 `runtime/harness-home/replay-diagnosis`，没接上。
4. **同类失败复发（已修）**：观察窗 token 第二次随 runtime 日志入库；BUG-013 当时只修了 `runtime/e2e/` 路径，
   没有升成类级「tracked 文件不得含 token URL」守卫。安全闸也只扫 `company-workspace`。
   批次 0 已补 tracked-token 窄扫 + untrack + gitignore；详见 BUG-029 与 Note。

结论：这不是「再写几份文档」的问题，而是**把验收/反馈的总账从手维护改成生成或门禁强制**的问题。

## 1. 健康基线（先说什么没坏）

| 检查 | 本轮结果 | 备注 |
|---|---|---|
| `pnpm verify` | ALL PASS | 热跑 7.4s；冷跑 43.7s（首次 1652 文件 I/O） |
| `pnpm test` | 76 文件 / 711 用例全绿（审计时 70/695） | 热跑 9.4–23.6s（缓存状态不同）；冷跑 55.4s；Tests 阶段 7.7–13.5s |
| `client-load-smoke` | ALL PASS | 真浏览器，26.4s；无 banner、无 loader error、品牌在场 |
| `preset-smoke` | ALL PASS | 5 公司角色 + researcher 全部真挂载，30.1s |
| `replay-smoke` r3-delegation | ALL PASS | full 档归一化零 diff + sidecar 零 diff，14.7s |
| `replay-smoke` r2-motion | ALL PASS | presence 档 + 在场板同形，98.9s；`--ui` 真浏览器 80.8s |
| 源码可达性 | 42/42 个 `src/**` 文件被 tests 直接或传递 import | 可达 ≠ 行/分支覆盖（见 §5） |
| 测试卫生 | 零 `it.skip`、零 `should` 标题、零 TODO/FIXME | `layering.spec` 仍在拦子进程/浏览器/密钥 |
| 工作树 | `git status --short` 为空 | 跑完冒烟后无残留 tracked 改动 |

这些说明「系统能跑、测试有牙、重放有锚」。下面的问题主要是**面与面之间的一致性**，不是主链断了。

## 2. 六轴发现

### 2.1 轴①/③ 文档、渐进披露、文档-执行-验收结构

**做得对的部分**

- 根 `AGENTS.md` → `docs/orient.md` / `project-map` / `runtime-map` → 主题合同/指南的入口链是清楚的；
  每份文档开头有「什么时候读」，路由表按任务而不是按文件组织。
- `docs/testing.md`（政策）与 `tests/README.md`（行级映射）有意识分工；`checks/README.md` 只索引、
  触发/成本/状态回脚本头注；`notes/` 与 `_backlog/` 的 owner 文件写得比多数仓库清楚。
- 测试分层守卫（`tests/harness/layering.spec.ts`）是真的机械门禁，不是口号。

**问题**

1. **验收映射有四份，互相不完全一致**：`docs/testing.md` §1/§2、`tests/README.md` 的「改动面→最窄检查」、
   `docs/guides/dev-loop.md` §9.1 的预算表、`docs/design/architecture.md` §10 的「改什么→该面验收」。
   政策说「行级映射唯一家 = tests/README」，但另外三处仍各自展开表格与层名；其中 §10 已经落后于
   成品/培养/成品目录这些新面。fresh agent 不知道该信哪一份。
2. **两份手维护总账就是漂移源**：
   - `checks/README.md` 155 行 / 108 个链接，声称「本索引提供分类和可点击入口」「新增入口同 diff 增加索引」；
     实测 5 个非门禁公开入口没进索引：`board-drift-probe`、`sidebar-role-mark-probe`、
     `archive-move-probe`、`ask-latency.mjs`、`deliverables-index.mjs`（32 个 gates 不进索引是设计，不算）。
   - `snapshots/README.md` 43 行场景表，盘上 47 个场景；漏 `archive/convergence-2026-10-12`、
     `-10-16`、`-10-20`、`visual/cultivation-gui` 四行。它自己说「以下索引覆盖当前场景」。
3. **`docs/index.md` 把三种活压在一页**：129 行 / 131 行上限（98%）。其中 `## 决策台账` 53 行、
   `## 外部研究材料登记` 22 行 = 75/129（58%）是历史路由/外部材料；真正回答「现在该读哪份」的
   地图只剩约一半。fresh agent 找当前入口要先穿过 44 行 D 号台账。
4. **`docs/design/` 718 行不在行数预算内，且混入了现在时/操作内容**：`architecture.md` §7「落地节奏（现在时）」、
   §10「改动归属表」；`roles-isolation.md` §3 选型速查；`ui-demo.md` §1–§2 实现指引。
   `docs/AGENTS.md` 对设计层的要求是「只保留仍指导未来选择的机制依据，已落地的叙述归 Note」——
   这些内容已经越层，但没有预算/门禁拦。
5. **角色数量在 7 处写成「五」**：实际 `dsh.bundle.patch` 有 6 个 preset（5 公司角色 + researcher）。
   `README.md:19`、`docs/presets.md:30`（「五张卡」）、`docs/release.md:77`、`docs/guides/bootstrap.md` 第 75/105 行、
   `docs/profile.md:39`、`docs/design/architecture.md:119` 都还写五；而 `docs/presets.md:24` 同一页又写
   「本 pack 6」——**同页自相矛盾**。这是 0.2.1 加 researcher 后没有做全量措辞清扫的典型上下文漂移。
6. **`src/README` 的模块枚举也漂了**：写「十一模块」并列出 11 个，实际 `src/lib/` 有 12 个
   （漏 `deliverables-catalog.ts`）。`nav-enumeration` 门禁只查 `tests/README.md` §四区，不覆盖这里。
7. **文档预算全面见顶**：9 份受管文档全部 ≥86%，其中 `docs/guides/web-rpc.md` 47/47、
   `company-workspace/AGENTS.md` 190/190 顶格。顶格是「该面饱和」的信号；下一次加规则只有
   「搬/压/提额」三条路。现在没有一处留出 ≥5% 头寸，说明瘦身速度已跟不上增量。

### 2.2 轴② 代码结构层次与深模块

**结论：不是平铺的，分层是对的；问题在缝上，不在层上。**

- `packages/company-pack/src/` 42 个文件、约 7.8k 行：`index.ts`（host 入口）、`host/`（Node-only）、
  `lib/`（共享纯逻辑）、`client/`（浏览器面）四块清楚；最大文件 `styles.ts` 571 行（样式表，合理），
  `CultivationBoard.tsx` 485 行、`company-panels.tsx` 379 行、`DeliverablesTab.tsx` 316 行，
  都是领域内聚的大件，不是「什么都在一个文件」。
- 深模块做得好的：`use-company-data.ts`（公司视图与页签共用一个数据面）、
  `company-tab-registration.ts`（一个 catalog 派生 body/title/guide 四处贡献）、
  `tools/lib/`（session-log、deliverables、workspace-oracle 等纯逻辑缝）。

**缝上的重复（会随功能漂移）**

1. **`memberDot` 在 `company-tabs.tsx:139` 与 `company-panels.tsx:72` 各一份**，映射完全相同；
   `firstText` 在 `lib/presence.ts:151` 与 `lib/attention.ts:66` 各一份。`presence-status.ts`
   已经是状态词汇的 owner，这两个映射应该收进去，或者至少只留一份。
2. **`client/index.ts` 两处重复构造同一数据面**：`createCompanySessionAdapters`、
   `makeCultivationFiles`、`makeCultivationActions` 在页签注入块（约 184–202 行）和公司视图注入块
   （约 240–242 行）各构造一次。两处注释都说「同一语义」，但没有任何机械约束保证它们一起改。
   一个 `createCompanyDataPlane(scoped)` 工厂（深模块）可以消灭这层重复。
3. **成品目录的 schema 有两份**：`src/client/DeliverablesTab.tsx:24–45` 的 TS 类型 + `parseCatalog`
   手工校验，与 `tools/lib/deliverables-catalog.mjs` 第 16–28 行 的 JSDoc 形状 + generator 各一份。
   两边各有 keyless 测试，但**没有测试用 generator 的真实输出喂 parser**；生成器加字段、parser 不认，
   单测仍可全绿，只有跑 `deliverables-catalog-probe` 才暴露。一个共享 schema（或生成类型）是更深的模块。
4. **host 入口把内部读模型当公开导出**：`src/index.ts:18/24` `export * from './lib/presence.ts'` /
   `'./lib/doors.ts'`，理由是 `checks/smoke/replay-smoke.mjs` 要用。包是 private，风险有限，
   但这是「为测试便利扩大接口」的典型浅化；更干净的做法是测试/检查直接 import `lib/` 源码，
   或给内部读模型一个 test-only 子路径。
5. **`memberDot`/`memberTone` 与 `presence-status` 的分工**：状态词在 lib，颜色/圆点映射在 client，
   两个 client 文件又各一份。建议把「状态 → 展示语义」整体放进 `presence-status`，client 只负责渲染。

**可选（不急）**

- `client/` 23 个文件平铺在一层；可以按 `panels/`、`tabs/`、`data/` 分，但会带来大量 import 搬迁。
  当前有 `refactor-drift-oracle` 可以兜零行为漂移，但收益不如上面的缝重复大。
- `CultivationBoard` 485 行可拆子组件；它已经是一个领域视图，拆分主要是可读性，不是正确性。

### 2.3 轴④ 上下文腐化与偏移（腐化账本）

| # | 文档/资产的说法 | 当前事实 | 证据 |
|---|---|---|---|
| 1 | 7 处写「五角色 / 五张卡」 | 6 个 preset（5 角色 + researcher） | `preset-smoke` 末尾 6 个 PASS；`package.json` 的 bundle 数组 6 个 preset 文件 |
| 2 | `README.md:19`「roster 可见五角色 preset」 | roster 含 researcher | 同上 |
| 3 | `docs/release.md:77`「roster 五角色零 broken」 | release-smoke 只验 5 个公司角色；researcher 没验 | `checks/smoke/release-smoke.mjs` 第 15/20 行 `ROLES = COMPANY_ROLE_IDS` |
| 4 | `snapshots/README.md:15`「索引覆盖当前场景」 | 43 行 vs 47 个场景；漏 4 个 | `find snapshots -mindepth 2 -maxdepth 2 -type d | wc -l` = 47 |
| 5 | `snapshots/README.md:34`「44 行 = 索引」 | 生成索引 47 条 | `company-workspace/kb/deliverables-index.json` `counts.total=47`；`snapshots/visual/deliverables-catalog/computed.json` `total=47` |
| 6 | `snapshots/README.md:82`「9 个场景只有 1 个 runnable」 | 10 个场景，runnable 2 | `pnpm verify` 的 `replay-scene-liveness ×10（runnable 2 / archived 4 / baseline 4）` |
| 7 | `probes/browser-visual/cdp-probe.mjs:111` tabs 8 个 | 注册面 9 个（成品缺） | `company-tab-registration.ts` 9 个 `id: 'dsh-company-pack/...`；`tab-icons.tsx:149`「九个页签」 |
| 8 | `docs/demo.md:21` / `docs/guides/cdp-probe.md:14`「全部公司页签」 | 探针只开 8 个，且只验文本词 | 见 §2.5 |
| 9 | `packages/company-pack/README.md:39`「手册 ≈17.4KB」 | 26,424B | `handbook-budget` 输出 26424B + 1024B ≤ 32768 |
| 10 | `packages/company-pack/src/README.md:16`「十一模块」 | 12 个 lib 模块 | `ls src/lib/*.ts` 12 个 |
| 11 | `docs/project-map.md:29`「runtime 全部 gitignored」 | 审计时 11 件 tracked；修复后 9 件（两件日志已 untrack） | `git ls-files runtime` |
| 12 | `runtime/README.md` 第 5–8 行 + 根 `AGENTS.md:25` 的 tracked 白名单 | 审计时两处都漏 runtime/web-logs/*.log；修复后 runtime README 已补 ignored 说明 | 同上；且其中一件含 token → BUG-029 |
| 13 | `docs/testing.md` 第 12/49 行「keyless 不证明装配」「现状零 mock」 | whole-client spec 真 boot + RemoteMock；另有 `vi.mock('node:os')` | `tests/client/company-client-composition.spec.ts` 第 4–15/57 行；`tests/harness/foundation-safety.spec.ts:8` |
| 14 | `checks/smoke/replay-smoke.mjs:7`「~11s」 | r3 14.7s；r2 98.9s；r2 `--ui` 80.8s | 本轮实跑 |
| 15 | `checks/smoke/client-load-smoke.mjs:4`「~10s」 | 26.4s | 本轮实跑 |
| 16 | `docs/guides/dev-loop.md:252` 引「Tests 5.16s/3.40s，全程 13.6s/4.8s」 | Tests 7.7–13.5s，全程热 9.4–23.6s / 冷 55.4s | 本轮实跑；单点值不是稳定值 |
| 17 | `DeliverablesTab.tsx:11`「44 条也不至于糊成一片」 | 47 条 | 生成索引 47 |

**这些不是孤立的错字，是一条链**：功能增量（researcher / 成品页签 / 新场景 / whole-client 测试 /
新探针）各自带了局部资产，但**没有一次「扫总账」的动作**。仓库已经用 `nav-enumeration` /
`nav-count-claims` 抓过两次同类病，但两个门禁的射程只到 `tests/README.md` §四区和 docs 的「页签计数」，
没有覆盖角色数、场景索引、探针清单、成本声明、mock/装配声明。于是每次都是「新面 + 旧总账」，
下一次 fresh agent 读到的就是 5 和 6 并存。

**上下文面饱和的量化**

- 受预算文档：`AGENTS.md` 77/84、`docs/index.md` 129/131、`docs/orient.md` 75/80、
  `docs/terminology.md` 19/22、`docs/guides/web-rpc.md` 47/47、`docs/guides/dev-loop.md` 350/367、
  `docs/testing.md` 71/75、`docs/AGENTS.md` 55/62、`company-workspace/AGENTS.md` 190/190。
- 公司手册：190 行 / 26,424B，`agent-instructions.maxBytes=32768`，只剩 5.3KB 头寸；它是**每个公司
  会话首帧注入**的最大常驻面。手册里已经有 12+ 条按日期追加的规则（任务板、派活行、HITL 前排空、
  复核独立性、present 顺序……），继续追加会先撞预算，再撞静默截断。
- `docs/design/` 718 行不在预算内；`docs/demo.md` 226 行、`docs/multi-human.md` 190 行、
  `docs/presets.md` 189 行也不在。不是说这些必须短，而是**没有棘轮的地方最会长出历史叙述**。

### 2.4 轴⑤ 测试资产组织、测试点、覆盖、类型

**组织是好的**：`tests/` 四区（company/client/presets/harness）、`checks/` 三面（smoke/audit/gates）、
`probes/` 四机制域、`tools/` 三子目录（lib/drivers/archive），都有 owner README；`tests/README.md` 的
「改动面→最窄检查」是正确形状。测试资产不是散在包内的。

**覆盖与类型**

- 76 个 spec / 711 个用例（审计时 70/695；本轮新增 6 个守卫/契约 spec）；按区：company 17 文件 / 244 用例、
  client 26 / 169、harness 27 / 265、presets 1 / 21。42/42 个 `src/**` 文件从 tests 直接或传递可达
  （35 个直接 import）。
- 类型是充沛的：纯函数/读模型、`react-dom/server` 静态渲染、happy-dom 真事件、真实 Cordis `Context`
  / `SlotRegistry`、whole-client `bootClient`、仓库结构/文档元测试。没有为了覆盖率凑数。
- **没有覆盖率仪表**：`package.json` 没有 coverage 依赖/脚本，无法回答行/分支覆盖；上面的「42/42 可达」
  只是 import 图，不是执行覆盖。这是「覆盖是否充沛」目前无法量化回答的根因。
- **whole-client 档放错层**：`tests/client/company-client-composition.spec.ts` 真 boot 生产
  `bootClient` × web profile bundle roster，断言 9 个页签类型、3 组 keyed slot、fiber 卸载/重载；
  冷跑 17.1s、热跑 5–6s，是 keyless 套件里最贵的单文件。它证明的是**组合/装配**，而
  `docs/testing.md` 的 keyless 行明说「不证明装配」——测试做了正确的事，合同没给它位置。
- **mock 声明过期**：`docs/testing.md` 说 keyless「现状零 mock」；实际至少有
  `company-client-composition` 的 RemoteMock（网络边界，白名单内）与
  `foundation-safety.spec.ts` 的 `vi.mock('node:os')`（环境边界）。白名单允许它们，但「零 mock」
  的绝对句应该改成「零未列入白名单的 mock」或列出这两处。
- **安装形状 lane 盲一个 preset**：`release-smoke` 用 `COMPANY_ROLE_IDS`（5）验 roster，只
  `session/create` ceo；researcher 只在开发 home 的 `preset-smoke` 里验过。一个只在干净 tarball
  安装时坏的 researcher 行，`release-smoke` 不会红。
- **通用端到端 roll-up 缺失**：`client-load-smoke` 只验品牌 + 零挂载失败；`replay --ui` 只验
  「在场」页签 + 点行进成员；`cdp-probe` 名义上验全部页签，实际 8/9 且只验文本（见 §2.5）。
  成品、看板、依赖图、任务板、台账、培养各自有 probe/visual fixture，但没有一个「一次跑全部页签
  且验内容」的入口；新增第 10 个页签时，最可能的情况是 composition spec 先红（它硬编码 9 个 id），
  而真页面探针仍绿。
- **解析器 vs 生成器没有契约测试**：`parseCatalog` 的 fixture 是手写的；没有用
  `tools/deliverables-index.mjs` 的真实输出跑一次 parser。两者形状漂移时，单测与 probe 可能各绿各的。
- **重放只有 2/10 可跑**：`replay-scene-liveness` 的当前读数是 runnable 2（r2/r3）/ archived 4 /
  baseline 4。r2 是 presence 档，`归一化全量比对` 与 `sidecar` 都 SKIP；r3 是 full 档但只有
  1 个 child。其余 8 个场景是历史证据，不能当回归网用。这是「症状复现」资产的最大缺口：
  录制很多，能重放的很少。
- **测试输出有噪声**：`pnpm test` 的 stderr 里有 12 条 React `useLayoutEffect does nothing on the server`
  （来自 `LedgerTab` 的静态渲染）；`replay --ui` 的 console log 有 4 条 LaTeX 警告。它们不是失败，
  但会训练 agent 忽略 stderr。

### 2.5 轴⑥ 反馈通路：日志、真实页面、症状复现

**已经通的**

- `session-log-export.mjs` 能把 zstd 多帧会话日志导成明文；`orient` 能列最近会话与 preset；
  `replay-smoke` 能把录制跑成会话/读模型判据；`attention-e2e` / `human-loop-e2e` 是真正
  真模型 + 真浏览器 + 截图的关键人机回路；`replay --ui` 真的打开页面、连工作区、点在场板行、
  断言成员会话面包屑。
- `runtime/harness-home/replay-diagnosis` 与 `replay-runs` 已经是失败诊断的家；
  `client-load-smoke` 能抓到「整窗砖在 BootPage」这一类挂载失败。
- `security-scan` 的自测（8+3 支有区分度、34 件指纹）是真的会咬人的件，不是绿输出。

**没通的**

1. **`cdp-probe` 是「假全量」**：
   - `tabs` 数组 8 个，注册面 9 个；`exitCode` 条件写死 `tabsOpened.length !== 8`。新增「成品」页签后，
     它仍然是 8/8 绿，**不会发现第 9 个页签缺失**。
   - 每个页签的判据是 `document.body.innerText.includes(tab)`。点开页签后，页签标题本身就在正文里，
     所以「点得到 + 标题在」几乎恒真；它没有断言面板体的独特内容（如「组织在场板」「成品目录」
     `aria-label`、行数、空态/错误态），也没有断言可见性/尺寸/遮挡。空面板、零高度、被模态盖住
     都可能过。
   - 失败时只打印 JSON verdict，没有截图/aria/console 落盘；`--keep-browser` 也救不了事后复盘。
2. **失败现场是 ephemeral + overwritten**：`checks/smoke/lib/replay-ui.mjs` 第 101–105 行 把
   `replay-ui-fail.png`、`replay-ui-fail.aria`、`replay-ui-console.log` 写到 `/tmp` 固定路径；
   `:250–251` 又写 `/tmp/replay-ui-after-click.aria`。下一次运行覆盖同名文件；跨会话无法回溯。
   `client-load-smoke` / `cdp-probe` 失败没有截图。`runtime/README.md` 的 tmp 出口表也没登记这些路径。
3. **日志有数据面、缺查询面**：`orient` 显示工作区、最近会话、preset、公司盘、场景数，但不显示
   「最近一次失败的 turn / 被拒的审批 / 工具错误 / 最后的 assistant 文本」。fresh agent 要读
   `dev-loop §3.7` 才知道 zstd 多帧、再手工 `session-log-export`、再 grep。没有一个
   `pnpm logs` / `orient --errors` 入口把「症状 → 会话日志 → 对应 replay 场景」串起来。
4. **绿的含义被稀释**：`replay-smoke` presence 档会打印
   `PASS 归一化全量比对 SKIP`、`PASS sidecar SKIP`（用 `check(..., true)` 表示 skip），
   同一次 PASS 里还会打印 27 条「缺 …」的 queued 记录。fresh agent 很难判断哪些是判据、
   哪些是已知差异、哪些是下一步要看的信号。`PASS` 不应该同时表示「跳过」。
5. **成本声明与场景不匹配**：`replay-smoke` 头注写「无 key ~11s」，那是 r3 单 child 的价；
   r2 五会话 98.9s、`--ui` 80.8s。`client-load` 写 ~10s，实测 26.4s。`dev-loop §9.1` 引用的
   Tests 5.16s/3.40s、全程 13.6s/4.8s 是单点热态；实测热态在 9.4–23.6s 间波动、冷跑 55.4s。
   选检查的第一依据就是成本，数字不写场景名/缓存态就会让 agent 选错层。
6. **安全反馈的通路断在范围上（已修）**：审计时 `security-scan` 只扫 `company-workspace`；
   同一套 a2 对 runtime/web-logs 能报 `HIGH-ENTROPY-ASSIGNMENT`，但没人跑。BUG-029 就是这么漏的。
   `g-a2` 支持 `--tracked-only --tracked-list`，但全 tracked 扫描会命中两处测试替身
   （`human-exits-nonblocking-probe` 的动态 token 参数、`orient.spec` 的占位 secret），
   故批次 0 改用窄的 tracked-token 门禁，并把 security-scan 的范围声明写清。
7. **`PASS`/`SKIP`/`FAIL` 的机器可读性**：`makeFailingCheck` 只有 pass/fail 两态；脚本没有
   `skip()` 原语，也没有 summary（`PASS n / SKIP m / FAIL k`）。这对人读和 agent 读都不够。

## 3. 腐化账本（按「说法 → 事实 → 可能的根因」）

| 说法 | 事实 | 根因假设 |
|---|---|---|
| 5 角色 / 5 张卡 | 6 preset | 0.2.1 加 researcher 后没有全量措辞清扫；门禁不查角色数 |
| 索引覆盖当前场景 | 47 场景 / 43 行 | 手维护清单，无覆盖门禁 |
| 成品目录 44 行 | 47 | 生成索引更新了，文档里的计数没更 |
| 9 场景 1 可跑 | 10 场景 2 可跑 | 2026-10-09 的时点判断留在了现在时段落 |
| 全部公司页签 | 8/9 且只验文本 | 探针自持清单，无注册面对照；无内容标记 |
| 手册 17.4KB | 26.4KB | 2026-10-02 的实测值没有随手册增长更新 |
| 十一模块 | 12 | 手枚举，无目录对照 |
| runtime 全部 gitignored | 审计时 11 件 tracked；修复后 9 件 | 导航句写的是「大部分」，落笔成了「全部」；两件日志已 untrack |
| keyless 不证明装配 / 零 mock | whole-client + RemoteMock/vi.mock | 新测试类型加进来了，宪法层表没加行 |
| replay ~11s / client-load ~10s | r2 98.9s / 26.4s | 成本按最小场景/热缓存写，未标场景 |
| tracked 文件无 token | 审计时 runtime/web-logs 含 token；已修 | 路径级修复（BUG-013）+ 安全闸只扫公司盘；批次 0 补类级窄扫 |
| 新增入口同 diff 加索引 | 5 个公开入口未入索引 | 索引是手维护的，没有覆盖门禁 |

## 4. 修复计划（按「先让绿有意义，再让总账不靠人记，最后瘦身」）

> 与本问题卡的方案对应：批次 0+1 ≈ 方案 B；批次 2 ≈ 方案 C；批次 3 ≈ 方案 D；
> 方案 A（只逐条修字、不立守卫）不推荐，下面不再单列。

### 批次 0 · 立刻止血（安全，已完成 2026-10-20）

- 处理 [BUG-029](../../fixed_bugs/BUG-029-committed-web-token-recurrence.md)：`git rm --cached` 两件 web 日志；
  `.gitignore` 加 runtime/web-logs/；`runtime/README.md` 的 tracked/ignored 表同步。
- 加一条**窄**的类级守卫：扫 `git ls-files`，只报 `https?://...token=[A-Za-z0-9_-]{20,}`；
  负例 = 临时 tracked 文件写合成 token URL，必须红；测试替身不命中。不要直接全量跑 a2，
  否则会被两处测试替身假红。
- 不做历史重写：token 是进程级、重启轮换，和 BUG-013 同一裁定。

验收：`git ls-files runtime/web-logs` 空；`.gitignore` 命中；守卫红/绿留证；`pnpm verify` + `pnpm test` 绿。
**结果（2026-10-20）：已完成**——两件日志 untrack 并删除；`.gitignore` + 根 `AGENTS.md` + `runtime/README.md`
同步；`tracked-token` 门禁 + 4 条测试落地；红/绿见 [BUG-029](../../fixed_bugs/BUG-029-committed-web-token-recurrence.md)
与 [Note](../../../../notes/implemented/2026-10-20-tracked-token-guard.md)。

### 批次 1 · 一致性清扫（≈半天，低风险）

- 角色数：`README`、`presets.md`、`release.md`、`bootstrap.md`、`profile.md`、`architecture.md`
  统一成「5 公司角色 + researcher（委派子人格，不是第六职能）」；`presets.md:24` 与 `:30` 对齐。
- `release-smoke` 把 researcher 加进 roster + `session/create`（或明确写「不验 researcher」并解释为什么）；
  至少让安装形状 lane 看得见第 6 个 preset。
- `snapshots/README.md`：补 4 个场景；把「44 行」改成生成索引的 47（或删掉数字）；把「9 场景 1 可跑」
  改成「10 场景 2 可跑（r2/r3）」并标日期。
- `cdp-probe`：tabs 从 8 补到 9；每个页签加**独特内容标记**（不是标题词）：如在场板 `role=list name=组织在场板`、
  成品目录 `role=list aria-label=成品目录`、任务板行数、空态/错误态；失败时截图 + aria + console 落
  `runtime/harness-home/replay-diagnosis/<timestamp>/`，打印路径。
- `src/README` 的「十一模块」改为「十二模块」并补 `deliverables-catalog`（或删枚举、留目录指针）。
- `project-map` 的 runtime 句改成「mostly gitignored，逐件见 runtime/README」；`runtime/README.md` 补 web-logs。
- 成本声明：`replay-smoke` 的 ~11s 改为「r3 ~15s / r2 ~80–100s（--ui 另计）」；`client-load` ~10s 改 ~25s；
  `dev-loop §9.1` 的引号数字改成「热/冷两档，见实测」或删具体秒数。成本数字是易腐常量，最好只留量级 + 场景。

验收：`pnpm verify` + `pnpm test` 绿；`client-load-smoke` + `preset-smoke` + `replay r3/r2` 绿；
`cdp-probe` 在真实例上 9/9 且每个页签有内容标记；`release-smoke` 能覆盖 researcher。

### 批次 2 · 验收契约与反馈原语（1–2 天，中风险）

- `docs/testing.md`：keyless 行加「whole-client composition（真 bootClient，无浏览器）」子层；
  「零 mock」改成「零未列入白名单的 mock」，列出 RemoteMock / `vi.mock('node:os')` 两处；
  成本预算改成「场景 + 热/冷」而不是单点秒数。
- `tests/README.md` 的「改动面→最窄检查」：client 面板行补 `cdp-probe`（全页签 + 内容标记）与
  对应 visual probe；成品目录行补 `deliverables-catalog-probe`；安装行补 researcher。
- `checks/smoke/lib/replay-ui.mjs`：失败现场改写到 `runtime/harness-home/replay-diagnosis/<scenario>-<timestamp>/`
  （截图/aria/console/URL），不再用 `/tmp` 固定名；成功运行也保留一份可选的 console 摘要。
- `client-load-smoke` / `cdp-probe` 失败时复用同一个 `captureFailure` helper（截图 + aria + console + URL）。
- `replay-smoke` 的 `check` 增加 `skip()` 原语；presence 档只打印 summary（PASS/SKIP/FAIL 计数），
  「缺 queued」这类记录写到诊断文件或只在 `--verbose` 打印；`PASS` 不再表示 SKIP。
- 生成式总账（建议同时做）：
  - `checks/README.md` 的脚本行由头注生成，或至少加 `script-index` 门禁（目录 ↔ 索引覆盖）；
  - `snapshots/README.md` 的场景表由 `snapshot.yml` 生成，或加 `snapshot-index` 门禁（目录 ↔ 索引覆盖）；
  - `docs/index.md` 的决策台账/外部研究登记迁出为独立路由页（或 notes 侧），index 只留「现在读哪份」。
- 新增门禁的负例（每条都要红/绿留证）：snapshot-index 删一行 → 红；tab-probe 去掉成品 →
  红；tracked-token 写合成 URL → 红；roster 写「五角色」而实际 6 → 红（如果采用措辞门禁）。

### 批次 3 · 结构瘦身（2–3 天，高风险；需 Note 与复验）

- `docs/design/` 加行数预算；把 §7/§10 这类现在时/操作表迁到合同或 tests/README 指针，
  只留「为什么选 A 不选 B」；`roles-isolation` 的选型表与 `ui-demo` 的实现指引同样降为指针。
- `company-workspace/AGENTS.md` 瘦身：手册只留宪章级（事实的家、职责边界、签字线、承诺权、
  多人模式分水岭），任务板/派活行/HITL 前排空/复核独立性等流程细节迁到对应角色 skill 或
  `kb/<role>/` 文档；每次迁移后跑 `preset-smoke` + `handbook-smoke` + 相关探针。
- `client/index.ts` 抽 `createCompanyDataPlane`；`memberDot`/`firstText` 收进 lib；
  成品目录 schema 收敛到一处（generator 产出类型或共享 JSON schema）。
- 日志诊断入口：`pnpm diagnose`（或 `orient --errors`）——取最新会话，导出/解析日志，
  列出失败 turn、工具错误、被拒审批、最后 assistant 文本，并匹配 replay 场景/snapshot，
  把证据写到 `runtime/harness-home/diagnosis/<timestamp>/`。这是把 §2.5 的散件串起来的深模块。
- 覆盖率：加 `@vitest/coverage-v8`（或等价）与 `pnpm test --coverage` 的非门禁报告；
  先观察，不设阈值，避免为了数字写测试。
- 重放场景：逐场景决定「修（补 `--refresh`/重录）或明确归档」；`snapshots/README.md` 的
  `replayEligible` 与日期继续做唯一事实家；不要在文档里写「都能复现」。

### 4.1 修复进展（2026-10-20）

- **批次 0**：BUG-029 已修（untrack + `.gitignore` + tracked-token 窄扫 + 红绿守卫）。
- **批次 1**：角色数统一；`snapshots/README.md` 补 4 场景并去过期计数；`cdp-probe` 从注册源解析 9 页签、断言面板体内容、失败落诊断区；`client-load`/`replay --ui` 失败现场同落诊断区；`src/README`/`runtime`/`project-map`/成本声明同步；`checks/README.md` 补 5 入口 + script-index 门禁；`release-smoke` 覆盖 researcher。
- **批次 2**：`docs/testing.md` whole-client/mock 声明；`tests/README.md` 映射补 cdp-probe/researcher；`PASS`/`SKIP` 分离；新增 `pnpm diagnose` 日志失败摘要。
- **结构切片**：`docs/index.md` 拆出 [decisions.md](../../../../docs/decisions.md) / [external-research.md](../../../../docs/external-research.md)（129→60 行）；`docs/design` 加预算、architecture §7/§10 降指针；`firstText`/`memberDot` 收进共享层；`client/index.ts` 数据面收成 `company-data-plane.ts`；成品目录 generator→parser 契约测试；SSR layout warning 消除。
- **证据**：`pnpm verify` ALL PASS、`pnpm test` 76/711、`client-load` ALL PASS、`cdp-probe` 9/9、`release-smoke` ALL PASS（含 researcher）、`replay --ui` ALL PASS（SKIP 显式）。详见 [consistency sweep Note](../../../../notes/implemented/2026-10-20-fresh-agent-consistency-sweep.md)。
## 5. 剩余与决定（2026-10-20 更新）

用户已授权全部修复；批次 0–2 + 结构切片完成。剩余三件不阻塞当前绿：

1. **手册内容瘦身**：`company-workspace/AGENTS.md` 26.4KB / 190 行（预算 32KB/190 行）仍在上限内；流程细节迁 skills/CHARTER 属产品内容重构，需 `preset-smoke` + `handbook-smoke` + 角色行为复验，列为下一轮触发项。
2. **重放 2/10**：修/归档要内容成本；`snapshots/README.md` 已写清当前读数，不冒充全可跑；逐场景 `replayEligible` 仍是唯一事实家。
3. **host 入口 `export *`**：package private + replay 读 built index 的现有 seam；保留为已接受取舍，出现第二个消费者再开 test-only 子路径。
## 6. 附录：本轮实跑命令与读数

```text
pnpm verify                                  # ALL PASS；热 7.4s / 冷 43.7s
pnpm test -- --reporter=dot                  # 76 files / 711 tests；热 9.4–23.6s / 冷 55.4s；Tests 7.7–13.5s
node checks/smoke/client-load-smoke.mjs      # ALL PASS；26.4s
node checks/smoke/preset-smoke.mjs           # ALL PASS；6 preset；30.1s
node checks/smoke/replay-smoke.mjs --scenario r3-delegation   # ALL PASS；14.7s；full 零 diff
node checks/smoke/replay-smoke.mjs --scenario r2-motion       # ALL PASS；98.9s；presence
node checks/smoke/replay-smoke.mjs --scenario r2-motion --ui  # ALL PASS；80.8s；真浏览器在场板
git ls-files runtime                         # 审计时 11 件；修复后 9 件（两件日志已 untrack）
find snapshots -mindepth 2 -maxdepth 2 -type d | wc -l   # 47
grep -c '^| \[' snapshots/README.md          # 43
node checks/lib/ci-security-gates/g-a2-secret-scan.mjs --target=runtime/web-logs   # VIOLATION，exit 2
```

未跑：`release-smoke`（keyless，但构建+干净安装耗时）与真模型探针
（entry-probe / probe --full / attention / human-loop / presence-e2e），原因是成本与时长；
这些面的结论只基于头注、代码与本轮已有的 smoke 读数，不冒充已跑。
