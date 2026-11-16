# 2026-11-16 · 维护面整理：合同声明 + observe 解散（P0 + P1）

状态：implemented（2026-11-16 落地；任务源 = 用户点名 [reorg-company handoff](../../_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-company.md) 并授权静默自主）

> 上游 = 用户 2026-11-16 原话：「你应该汲取了这个内容之后落地……除非有什么东西对你来说是荒唐的……Goal 之后静默自主」。handoff 的授权边界：P0 已点名、P1 需 A/B **明示答复**；用户本轮只给「落地 + 静默自主」总授权，**未对 A/B 作答**。据此按 handoff §4.2 建议取 A（抬顶 59→66 + Note 论证），B 未取——这不是「用户裁决 A」；若改 B 需新决定。
> 部分取代 [2026-11-15-tools-purpose-groups](./2026-11-15-tools-purpose-groups.md)（observe 组解散、工具面四组→三组）；其核心决定（保留 `tools/` 名、按用途分组）仍现行。
> 决策台账 = [D63](../../docs/reference/decisions.md)。
> 改名处置演进（2026-11-16）：三仓根目录统一由「可选远期」升为承诺方向 = [D64](../../docs/reference/decisions.md#d64) / [surface-root-unification-direction](./2026-11-16-surface-root-unification-direction.md)。本文「输掉的方案」中『三仓统一改名』指盲审撤回的**廉价 P0 改名**，非承诺的独立迁移项目；分类法与 company P0+P1 落地仍现行。

## 决定

1. **P0 先立合同，零搬家**：新增 [surface-contract](../../docs/surface-contract.md)——两层（oracle / entry）× 三面（judge / show / operate）× 两前置轴（生命周期 / 管道件）+ 判定顺序；根布局三行、`checks/` / `probes/` / `tools/` 首屏同步写面声明。
2. **例外表住查表层，不住合同文末**：handoff §3.4 说「13 条放合同文末」且 §3.1 给 28 行预算——两者不可兼得（表头 + 14 行已超合同预算的 5% 留白）。按 [docs/AGENTS](../../docs/AGENTS.md) 的层规矩（参考 = 查表与登记）落到 [surface-exceptions](../../docs/reference/surface-exceptions.md)；合同保持 24 行。**与 handoff 的有意偏差，已在此登记。**
3. **P1 搬家**：tools/observe/ 7 件（ask-latency / diagnose / explore-evidence / notes-audit / orient / propose-sampler / session-log-export）→ `probes/analyze/*-probe.mjs`（新域 `analyze`：共享 zstd + 会话日志/notes 读取 harness、同一证据源、同一解析失败模式）；tools/repo/refactor-drift.mjs → `checks/audit/refactor-drift-audit.mjs`（judge 归 `checks/`）。tools/observe/ 目录删除，工具面四组 → 三组。
4. **注册表与棘轮同 diff**：[asset-lanes](../../tools/lib/asset-lanes.mjs) PROBES +7（domain `analyze`）、失败类 +7（5 会话持久化 / 1 文档指针 / 1 模型可见文本）；`MAX_PROBES` 59 → 66（[test-census.spec](../../tests/repo/budget/test-census.spec.ts)）。口径 = **登记资产**：搬家是分类变更，入口总数不变，不是能力增长；此后新增仍只降不升。同 diff 在 [policy §P2](../../docs/policy.md) 补一句口径（分类迁移可校准 cap 并在 Note 论证），避免政策与棘轮口径相反。
5. **修了 handoff 的一处事实错误**：§4.3 称「相对 import 不用改，tools/observe 与 probes/analyze 同为两层深」——错。`probes/analyze/` 下入口的 `../lib/` 解析到不存在的 probes/lib/。7 件统一改 `../../tools/lib/` / `../../tools/drivers/`；orient 首次实跑 `ERR_MODULE_NOT_FOUND`，改后 exit 0。
6. **研究材料按「旧家 = 纯文本、反引号 = 现行家」处理**：`_backlog/` 活跃面是 bare-path **硬档**（不是 handoff 以为的观察档），搬家后旧路径会红；把旧家路径的反引号去掉、加「已落地」banner 保留时点文本，历史不篡改、门禁不误读。
7. **保留「新增工具四问」**（handoff §4.4 说「四问改三问」）：第二问（入口还是纯逻辑 / 属哪一步）仍是选组判据，删掉会丢判据；只把组枚举改成三组。**偏差登记。**
8. **台账加 D63**：让「维护面 = 两层×三面」有 D 号可路由（handoff 未提，属本轮补充）。

## 输掉的方案

- **B：退役 7 支同族探针，换 cap 不动**（handoff §4.2 备选）。否决：7 件仍是活的分析入口，退役丢证据面；且 P2 数的是登记资产，搬家不是能力增长——用退役换 cap 是拿真资产抵分类变化。
- **C：保留 tools/observe 作为 show annex**（full-classification 的 C 案）。否决：面纯度继续脏，fresh agent 仍按目录名把只读分析器当会动盘的操作。
- **例外表塞进 28 行合同**：照 handoff 原稿写会撞 doc-budget；压到 28 行内会丢每条理由（「为什么它不是面」正是表的全部价值）。
- **三仓统一改名 / 给三面开子目录**：前者盲审已撤回（gate 输入、hooksPath、数千引用），后者 handoff §6 明令不做——面是顶层目录，不是目录里的目录。
- **研究材料整体归档**：本仓 handoff 已消费，但另两仓 handoff 仍是待用交付物；整题目录迁档会埋掉它们。改为「旧家纯文本 + banner」。

## 状态事实与载体

- **事实**：维护面 = 两层 × 三面 × 两轴；目录默认面 = `checks/` judge · `probes/` show · `tools/` operate；例外只在 [surface-exceptions](../../docs/reference/surface-exceptions.md) 登记一次（现 6 条非面：1 已耗 / 2 冒烟 runner / 1 测试 runner / 1 纯查询 / 1 fixture）。
- **唯一入口**：[surface-contract](../../docs/surface-contract.md)（规则）；[surface-exceptions](../../docs/reference/surface-exceptions.md)（例外）；目录首屏 README 只做指针。
- **读载体 / 写载体**：读 = fresh agent 的 `ls checks probes tools` + 根布局三行；写 = 新入口落目录、例外同 diff 登记、`tools/` 顶层只许三组 + `lib` / `drivers` / `archive`（[script-index](../../checks/gates/script-index.mjs) 守）。
- **环境坏法**：来源 = 新入口按旧目录名落家（合同 + README 挡）；内容 = 例外表漏登（无门禁，靠同 diff 纪律）；生命周期 = 搬家后 import 深度错（本轮实证，行为面 `pnpm orient` 挡）；扫描面 = 注册表未同 diff（`test-census.spec` 双向对齐挡）。

## 未覆盖轴

- [covered] 结构门禁 + 生成物：`pnpm verify` 全绿（含 link / bare-path / script-index / script-triggers / doc-budget） → `checks/run-gates.mjs`
- [covered] 资产对齐与棘轮：census 双向对齐、cap 66、失败类零未分类 → `tests/repo/budget/test-census.spec.ts`
- [covered] 行为面：`pnpm orient` / `pnpm diagnose` / `pnpm notes:audit` 均 exit 0；orient 首跑暴露的 import 深度错已修 → `probes/analyze/orient-probe.mjs`
- [covered] 覆盖率：`pnpm coverage:ratchet` PASS（197 文件；asset-lanes 覆盖变好） → `tests/support/coverage-baseline.json`
- [policy] `MAX_PROBES` 抬顶属 P2 口径变更：按 handoff §4.2 建议取 A（用户未对 A/B 作答，授权依据见状态行）；B（退役换 cap）未取，理由见「输掉的方案」 → `tests/repo/budget/test-census.spec.ts`
- [environment-gap] 未跑真模型 / 浏览器 / 真页面：本轮只动维护面文件与文档，不触 preset、host、client 面 → `checks/lanes/preset.entry.mjs`
- [environment-gap] 未重跑 clean clone：无新依赖、无构建面变化，仅仓内路径与注册表 → `docs/guides/bootstrap.md`
- [policy] 库存口径分裂（INDEX 67 = 66 探针 + 1 fixture；census 66 = 注册探针）保持现状：handoff §2 只把它列为既有事实、未列入 P0/P1；修它要先决定「fixture 算不算公开入口」，属独立决定 → `tools/lib/checks-index.mjs`
- [unprovable] 仓库外书签/外部仓对旧扁平常量 tools/observe 的引用，本仓观测不到 → `docs/reference/external-research.md`

## 独立盲审

- 无历史上下文的只读子代理审 `b396d051..bfc44ede`（P0 + P1 + policy + 文档收口 + 预算注释），实跑 verify / test / test:checks / coverage / 三行为面 / 两生成物核对；**BLOCKER = 0**。
- 8 条建议，处置：①授权措辞写死「用户未对 A/B 作答」；②合同 oracle 改绑 `pnpm test`（vitest）与 `pnpm test:checks`（node:test）；③checks/README 标题「三面」改 judge/show/operate；④`[unprovable]` 锚点改外部材料登记；⑤研究材料 `orient.mjs` 旧文件名的反引号去掉；⑥spec 标题改成「smoke/audit/probes 全树 + tools 三组」；⑦例外表补 doc-budget cap 16（含红证）。**未取 ⑧**：归档链接标签仍写旧名——`notes/archived/AGENTS.md` 只许改链接那一行路径、正文与标签不动（冻结层）。

## 验证

| 判据 | 命令 | 层 / 失败类 / 负控（见过红） | 原话 |
|---|---|---|---|
| 搬完只改实现、不补引用 | `pnpm verify` | 结构 / 文档指针 / 红 | `FAIL link: checks/INDEX.generated.md:121 → ../tools/observe/ask-latency.mjs (target)`；`FAIL bare-path: _backlog/research/…/2026-11-16-reorg-company.md:20 → tools/observe 不存在` |
| orient 头注触发条件位置 | `node checks/run-gates.mjs` | 结构 / 文档指针 / 红 | 临时去掉 `// 何时跑：` 前缀 → `FAIL script-triggers: … probes/analyze/orient-probe.mjs`；还原 → 绿 |
| 新合同行预算 | `node checks/run-gates.mjs` | 结构 / 文档指针 / 红 | 上限临时 23 → `FAIL doc-budget: docs/surface-contract.md 24 行超上限 23`；还原 28 → `PASS doc-budget docs/surface-contract.md (24/28)` |
| 探针棘轮 | `npx vitest run tests/repo/budget/test-census.spec.ts` | 回归 / 注册生命周期 / 红 | `MAX_PROBES` 临时 59 → `AssertionError: 活跃探针总数不得超过 59…: expected 66 to be less than or equal to 59`；还原 66 → 5 passed |
| 结构门禁 | `pnpm verify` | 结构 / 全 12 类 / 红已见 | `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）` |
| keyless 回归 | `pnpm test` | 回归 / 全 12 类 / 见上 | `Test Files 253 passed (253)`；`Tests 2157 passed (2157)` |
| 门禁自测 | `pnpm test:checks` | 回归 / 注册生命周期 / 无（本轮未改门禁自测面） | `test:checks: 10 PASS / 0 FAIL` |
| 覆盖率 | `pnpm coverage:ratchet` | 回归 / 纯逻辑 / 无 | `coverage-ratchet: PASS（197 文件；基线 2026-11-14；豁免 5 条）` |
| 行为面（读） | `source run/env.sh && pnpm orient` | 行为 / 会话持久化 / 红→绿 | 首跑 `ERR_MODULE_NOT_FOUND … probes/lib/repository-layout.mjs`（exit 1）；修 import 后 exit 0，输出开发环境/会话/公司盘/待核节 |
| 行为面（读） | `source run/env.sh && pnpm diagnose` | 行为 / 会话持久化 / 无 | `EVENTS total=4 turns=0 interrupted=0 … FAILURES none`，exit 0 |
| 行为面（读） | `source run/env.sh && pnpm notes:audit` | 行为 / 文档指针 / 无 | 输出候选表，`死路径 0`，exit 0 |
| 生成物新鲜度 | `node tools/repo/checks-index.mjs --check`；`node tools/repo/test-census.mjs` | 结构 / 文档指针 / 红（搬完未生成时 script-index 红） | 两处 `与目录/盘上一致`（census spec 首条同时守） |
| 类型面 | `pnpm typecheck` | 类型 / 工具定义 / 无 | 四面 tsc 全绿（含 tests/repo 注释改动） |
