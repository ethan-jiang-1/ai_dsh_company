# 2026-11-10 · 材料性与留痕决定点：一个判据、一次裁决、一条可解析的落点

状态：implemented（2026-11-10 交付；上游 = [卡](../../_backlog/_archive/settled_issues/2026-11-10-materiality-and-trace-decision.md)）
> 研究依据 = [issue-bug-traceability](../../_backlog/_archive/research/issue-bug-traceability/README.md)（实测盘点 + 判断与取舍）。
> 前决定 = [五道门](./2026-11-02-backlog-five-gates.md)（去向封闭集、审查记录；本篇在它上面补「落点解析」与缺陷轨的留痕裁决）。

## 决定

1. **一个判据，两个消费者。****材料性 = P0，或修复/结论触碰章程 / 常设指令、docs 合同、company-pack 公开行为、已记录决定（`notes/implemented` 状态行）。**
   定义唯一家 = [`_backlog/README.md`](../../_backlog/README.md)「缺陷的通道」。它不是新清单——原本就是「能不能自己修」的授权排除项，
   现在同时回答「要不要留痕」。别处只引用，不复制清单。
2. **一个决定点：把留痕裁决挂到已有的授权请示上。** 缺陷轨——材料性修复在翻 `等人拍板` 的授权请示里**同时给出留痕建议**
   （`Note` / `commit` / `none — 理由`）；归档时卡顶写 `留痕：` 行（形状 = [`bugs/README.md`](../../_backlog/bugs/README.md) 模板、
   [`fixed_bugs/README.md`](../../_backlog/_archive/fixed_bugs/README.md) 归档块）。非材料性修复不建卡、不请示，
   commit message 写根因与影响面。
3. **问题轨同一判据。** `去向=implementation` 只承载非材料性结论；材料性结论用 `note`，或 `implementation` + 指向承载决定 Note 的链接
   （伞卡模式），不得只写 commit；`none` 要写理由。
4. **落点从「词」变成「可解析的事实」。** `去向=note` 的落点必须是 `notes/` 下真实文件的 Markdown 链接；`backlog-liveness` 查
   （`opened ≥ 2026-11-03`，旧卡祖父豁免）。self-link / inline code / 散文都不算——失败形态是「顺着卡找不到理由」，与没留等价。
   本轮修掉落点：**卡顶 2 张**（2026-11-08 两张自链）+ **正文同类 12 处**（8 张卡把「交付 Note / 实施 = …」链回卡自己；
   研究盘点只统计了卡顶那一行，正文是这一轮挖出来的）+ [`_archive/README.md`](../../_backlog/_archive/README.md) 6 行；
   另修 [`issues/README.md`](../../_backlog/issues/README.md) 7 行同类指针（卡验收未点名，同类一行级，已报）。
   门只盯卡顶：正文是散文，不造机械判据。
5. **入口与习惯。** [`_backlog/AGENTS.md`](../../_backlog/AGENTS.md) 加一行分诊路由（材料性 → 立卡 + 请示；非材料性 → 当场修 + commit）；
   [收尾 skill](../../.agents/skills/close-out-definition/SKILL.md) 收割三问①改「**材料性**的才立 BUG 卡」并承担入口钩子
   （[`budget-and-ops`](../../docs/guides/budget-and-ops.md) 的同一句同 diff 跟随）；[`bugs/README.md`](../../_backlog/bugs/README.md) 写「同一轮 ≥3 张卡先按根因分组」。

## 输掉的方案

- **每 bug 一卡**：卡是推敲层，不是修理台账；会给 `已修` 制造大量噪声，也违反 notes 对机械单步的豁免。
- **新目录 / 新状态**（`落地中` 一类）：第二本账；五道门刚拒绝过，状态只该由 frontmatter 一处持有。
- **语义门禁**（机器判断「这是不是材料性」）：不可机械判定，[policy §P2](../../docs/policy.md) 明确不做；机器只能查得到「落点解不解析」。
- **把五项清单复制进 `bugs/README`、收尾 skill、`budget-and-ops`**：四处副本必漂（本轮修的正是清单的两套文本打架）。改为「限定语 + 指针」。
- **让门禁检查 `留痕：` 行在场**：本轮不升。新规则尚无复发证据，且形状检查会逼出「留痕：none — 无」这类空壳；记**承压候选**——
  若新规则生效后的 10 次材料性修复里仍有 ≥3 次没有留痕裁决，问题在执行钩子而不在措辞，那时再考虑把留痕问题写进翻转守卫。
- **本轮改根 `AGENTS.md`**：84/84 顶格，净零改写不动；先让 close-out skill 承担钩子，按证据再动（卡内排除项同口径）。

## 后果

- **材料性修复多一次显式裁决**（在你本来就要拍板的那一刻），非材料性修复变快（不建卡，commit 承载根因与影响面）。
- **归档卡的 Note 落点从此可机械验证**：链回卡自己会红，读者一跳就到理由。
- **旧卡不回填**（`opened < 2026-11-03` 的卡不动正文）；`留痕：` 行不追改历史缺陷卡——存量卡的价值在修复证据，不在补齐字段。
- **边界**：落点解析只证明「链得到」，不证明「写得对」；材料性判断仍是语义判断，语义审仍要人 / agent 读。

## 验证

真跑过的命令与红绿形态如下（每条都是原话摘录）：

| 检查 | 命令 | 红 | 绿 |
|---|---|---|---|
| 落点解析门（真树反证） | 植入 `_backlog/_archive/settled_issues/zz-probe-note-selflink.md`（`去向：note — [Note](./同名卡.md)`）+ 归档索引加行 → `node checks/run-gates.mjs` | `FAIL backlog-liveness: _backlog/_archive/settled_issues/zz-probe-note-selflink.md:10 归档「去向=note」的落点未解析到 notes/ 下的真实文件——写 Markdown 链接到 Note（链到卡自己/inline code/散文都顺不上理由）`（且只有这一条，说明索引行只触发落点检查） | 删卡与索引行 → `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）` |
| 豁免方向（旧卡不回填） | `npx vitest run tests/tools/backlog-liveness.spec.ts` | — | 夹具 `2026-11-02-old-self-link`（`opened < 2026-11-03` + self-link）不红；真树旧卡（如 `2026-11-02-remove-trajectory-terminal-ui.md`）在全量里仍绿 |
| keyless 覆盖 | `npx vitest run tests/tools/backlog-liveness.spec.ts` | 先把 lib 的新检查改成 `if (false && dest === 'note')` → `Tests 1 failed \| 32 passed (33)` | 还原 → `Tests 33 passed (33)`；新增用例覆盖 self-link / inline code / 文件不存在三种红与真链接、旧卡两种绿 |
| `留痕：` 形状可过门 | 植入 `_backlog/_archive/fixed_bugs/zz-probe-trace-line.md`（卡顶 `留痕：none — 探针卡…`）+ 索引行 → `pnpm verify` | — | `verify: ALL PASS`（形状不撞现有门禁）；删卡与索引行后仍 ALL PASS |
| 一处定义（grep 原话） | `grep -rn 'company-pack 公开行为' --include=*.md _backlog` | — | 非历史区的唯一命中 = `_backlog/README.md`「缺陷的通道」的材料性定义段；`bugs/README.md` 两处命中是 2026-11-08/09 的**历史交接叙事**，不是规则副本 |
| 矛盾消解（grep 原话） | `grep -rn '当场修掉的不建卡' _backlog`；`grep -rn '抓到异常' .agents docs` | — | 前者的规则句只有两处，均带「仅限非材料性」限定（另有研究材料/卡内引用旧文的对照行）；后者两处均为「①抓到异常没——**材料性**的才立」 |
| 落点修复 | 逐链接验证存在性 + `pnpm verify` | 修前（研究盘点 2026-11-10 实测，本轮未重跑）：卡顶 2 处 + 索引 6 行把「Note」链回卡自己，`pnpm verify` 仍 ALL PASS（旧门只查词） | 修后全部指向 `notes/archived/` 下同名真实文件；全 `_backlog` 自链扫描 = `self-links: 0 broken: 0`；`pnpm verify` ALL PASS |
| 全量结构与回归 | `pnpm verify`；`pnpm test` | — | 见收尾回执四链证据（本轮实跑） |

## 语义审（四输入：授权原文 / 合同 / 证据选层 / Note）

带授权原文（用户 2026-11-10「好好思考挖掘，沿着研发流程推动落地」+ 卡内 7 条验收）重读 diff，逐条对照后确认：七条验收全部有对应物；
证据选层合理（门禁面用真树反证 + spec 双例，制度面用 grep 原话，运行面不涉及）。**审出一条需记录的边界**：
`留痕：` 行本轮只靠模板与 skill 引导、没有机械守卫——这是**有意**的（见「输掉的方案」最后两条），已记为承压候选，不是遗漏。

**反事实走查（验收 #7，取最近一轮的材料性修复）**

- **BUG-053（P1，`subagent_retry` 取消不收敛）**：修复改了 host 工具的外部可观察行为 + 新增 `abortable` 缝 = 触碰 company-pack 公开行为，
  **是材料性**。旧规则下它的留痕是「做完了顺手写了 Note」：卡在第 97 行才写「决定与输掉的方案 = [Note]」，
  归档索引行没有 Note 链接，状态行也没有留痕裁决。新规则会让它在翻 `等人拍板` 的请示里就必须写一句
  「留痕：Note（可取消语义改变了 retry 的外部行为）」，归档时卡顶留下 `留痕：` 行 → 结论不变，但**决定被写在最便宜的那一刻**，
  且读者从卡顶一跳就到理由。对照同轮 BUG-051/052：同样是卡尾才链 Note（第 87/110 行），归档索引行同样没有链接——同一形态。
- **BUG-041（P1）**：卡上第 75 行提到「收口 Note」，**没有链接**——这正是新 `留痕：` 行要消灭的形态：说了有理由，但顺着卡找不到。
  旧门禁不会红（缺陷轨本来不查落点），新规则会让它在归档时把路径写进卡顶。
- **结论**：新规则会在当时问出那一句，且答案就是现在这些 Note——规则没有改变结论，改变的是「决定何时被显式化、落点是否可追」。

## 未验证与承压候选

- **未验证**：真模型/真装配面对本变更不适用（纯制度面 + 一个结构门禁），未跑 preset-smoke / release-smoke。
- **未验证**：`留痕：` 行的实际执行率——规则生效后的第一次材料性修复才会给出第一个样本。
- **承压候选**：① `留痕：` 形状不进 gate（触发条件见「输掉的方案」）；② 根 `AGENTS.md` 的净零改写（触发条件 = 之后仍观察到 fresh agent 漏掉分诊）；
  ③ 决策台账不加 D 号——这是 [D56](../../docs/reference/decisions.md) 制度的一次修订而非重立，决定的家 = 章程 + 本 Note；
  `decisions.md` 65/65 顶格，要加就得先瘦身腾位（不做顺手扩围）。
- **已知边界**：门只查卡顶 `去向` 行；正文里的 Note 指针（本轮一次性清掉 12 处）没有机械守卫——正文是散文，判据留在语义审。
  全 `_backlog` 现无自链（`self-links: 0 broken: 0`），复发成本 = 一次扫描 + 一次修链。
