# 2026-11-13 · 测试资产自校正系统 B/C/A 件：环外必跑回路 + 执行下限 + 资产盘子

状态：implemented（B/C/A 三件 2026-11-13 落地）

上游 = 用户 2026-11-13「按卡落地，静默自主、长期正确」；问题卡 = [test-asset-loop](../../_backlog/_archive/settled_issues/2026-11-13-test-asset-loop.md)；研究 = [dsh-test-strategy](../../_backlog/research/dsh-test-strategy/README.md)（缺口 D1/D5）。

## 决定

1. **lane 注册表住 `tools/lib/asset-lanes.mjs`，不是卡里计划的 checks/lanes/lanes.mjs。**
   理由：`tests/repo/layering.spec.ts` 禁止 spec import `checks|probes|tools` 下的驱动脚本，
   而注册表必须被 spec 机械校验；`tools/lib/` 是唯一允许的 keyless seam。注册表是纯数据 + 纯函数，
   import 无副作用、不起进程、不读盘。
2. **fast 成员从注册表派生（仍是 6 条），surface 只收 fast 之外的三条真入口。**
   surface 规则首版计划含 run-bundle / delegation / ledger / gates 四个面，实作时删掉——
   它们已被 fast 每次 push 无条件跑，再列一遍 = 同一检查跑两遍。surface 现在只收
   client → `client-load-smoke`、presets → `preset-smoke`、content → `replay-smoke`。
3. **pre-push 取范围用 hook 自带的四元组，不猜 base。**
   `git push` 通过 stdin 给 `<local ref> <local sha> <remote ref> <remote sha>`；用 `remote sha..local sha`
   算本次 outgoing 范围。remote sha 全零（新分支）退化为该提交的 `diff-tree`；只有手动直跑（无 stdin）
   才退化 `HEAD~1` 并**打印退化**。`--dry-run` 只选不跑。
4. **每周 lane = classic keyless，skip 清单每次打印。**
   `checks/lanes/keyless-lane.mjs --ci` 跑 18 条 classic（browser/model 逐条打印 SKIP 与原因）；
   CI 挂在 `fresh-clone.yml` 的 macOS 全量 setup 之后（每周一 + 手动）。首几周允许红——那是环境诊断信号，
   处置是修环境或把资产标 `ciSafe:false` + 理由，不删资产。skip 清单每次打印：资产可以手动，但不许静默消失。
5. **空间完备做成 spec，而不是靠自觉。**
   `tests/repo/asset-lanes.spec.ts` 双向校验「盘上每个冒烟都登记 / 注册表每个名字都有文件」，
   并要求无 lane 的条目必须写 `manualReason`、fast 固定 6 条。这是研究 M1「后缀即层」在本仓的可判形状。


6. **C 件：覆盖率从「手选阈值」升级为棘轮，并进 pre-push。**
   pre-push 最后一步从 `pnpm test` 换成 `node checks/audit/coverage-ratchet.mjs`（跑全量测试 + 覆盖率 + 比基线）；
   实测覆盖率运行 24s，与 test 同量级，不额外花时间。判据纯逻辑 = `tools/lib/coverage-baseline.mjs`：
   ① 任何文件低于基线 → 红；② 新文件 statements<80 / branches<70 → 红；③ statements<50 的已知空洞必须显式豁免；
   ④ 豁免过期（文件没了或已到 50%）→ 红，逼人删配对。基线 = `tests/support/coverage-baseline.json`，只升不降。
7. **现有 5 个低覆盖文件登记为「已知空洞」而不是假装没看见。** 3 个 0% 的 tools/lib 文件
   （carrier-registry / diagnosis / probe-window）+ 2 个启动策略 UI 文件（startup-store 40% / StrategyPanel 44.8%），
   每条写 `reason` + `removeWhen`；下次动到对应面时补测并删豁免，否则棘轮会因「过期豁免」报红。
8. **失败类决策表住 `tests/failure-classes.md`（新文件），不塞 `tests/README.md`。**
   README 已 99/100 行（doc-budget 顶格），12 行表塞不进去；表是参考型查表，不是导航，独立成页并从 README 一段链接。
   `docs/testing.md` 的执行下限一行同步（该文件 70/75，不再加行）。
9. **账本三列进 skill，不放 PR 模板。** 本仓没有 PR：证据账本落 `close-out-definition` 的「四链证据」
   （每条带层/失败类/负控）+ `agent-note-definition` 的验证表（同三列 + 「未覆盖」一节）。这是研究 B2 的结论
   （上一轮已否决「检查 Note 有没有某节」的重门禁）。

10. **A 件：盘子是生成物，探针也登记，失败类先显式「未分类」。**
    `tools/lib/test-census.mjs` 建模/渲染 + `tools/test-census.mjs` 写 `tests/CENSUS.generated.md`；
    数据 = 注册表（32 冒烟 + 69 探针）+ 盘上目录计数（71 门禁 / 246 spec）。32 个冒烟的失败类人工判定进
    `FAILURE_CLASS_BY_NAME`；69 个探针显式记「未分类」并在汇总里报数——**不假装已分类**，下一轮收敛。
11. **出生登记 = 注册表，不是头注。** 卡里原计划在头注加「失败类 / lane」两行；实作改为注册表字段：
    头注是第二份清单，必漂（本仓六份清单同一种病）。新冒烟不登记 → B 的 `asset-lanes.spec` 红；
    新冒烟没失败类 → A 的 `test-census.spec` 红（未分类只允许探针暂用）；新探针不登记 → 同一个 spec 红。

## 输掉的方案

- **注册表放 checks/lanes/lanes.mjs（卡里原计划）**：spec 只能读文本/正则，改一个字段就假红或漏判；改住 `tools/lib`。
- **surface 列全部七个面**：fast 已覆盖的面重复跑，push 变慢且失败归因重复；删到三条。
- **每周 job 先做观察性（continue-on-error）**：没有通知就没有可见性，等于又一个"没人看"的资产；
  改为让 schedule 失败（不挡 PR）——失败本身就是诊断信号。
- **用 `@{upstream}...HEAD` 猜范围**：hook 已给准确 SHA；猜 base 在新分支/多 ref push 时会错选或漏选。
- **把 browser/model 也塞进 `--ci`**：成本与凭据边界不同（真 Chromium / 真模型），会破坏"每周 keyless"的定位。


- **per-file 100% 一步到位**：本仓 190 个插桩文件、5 个已声明空洞；一步到位只会逼出「为覆盖率写测试」。借棘轮与「新文件下限」，不借数字。
- **把 5 个空洞留在基线里不声明**：0% 会永远 0%，没人知道；改为显式豁免 + 过期即红。
- **把覆盖率棘轮放 CI 而不是 pre-push**：CI 只有结构门，覆盖率进 CI 要么补 vendor 构建链（负担不成比例），要么永远不跑；pre-push 是唯一能保证每次变更都过的位置。
- **失败类表塞 `tests/README.md`**：doc-budget 顶格（99/100），且表是查表不是导航；独立成页。
- **用「检查 Note 有没有某节」的门禁做账本**：已被 rfc-tdd-loop Note 证伪为仪式性合规（空节即过）；账本只进 skill 的完成判据。

- **在资产头注加「失败类 / lane」两行（卡里原计划）**：与注册表重复、必漂；改为注册表字段，头注只留「状态 / 何时跑」。
- **给 69 个探针逐个判失败类**：没有证据的判定等于编造；显式记「未分类」并在 census 报数，下一轮按域收敛。
- **census 写「最后实跑日期」**：来自运行记录，属易变数据，会把生成物变成每次提交都变的文件；留给 weekly lane 的输出，不进 committed census。
- **把探针也塞进 weekly 自动跑**：多为真模型/真浏览器，成本与凭据边界不同；登记 ≠ 自动跑。

## 验证（实跑原话，2026-11-13）

| 判据 | 命令 | 原话 |
|---|---|---|
| 空间完备负例（红） | 临时建 checks/lanes/zz-unregistered.mjs + `pnpm vitest run tests/repo/asset-lanes.spec.ts` | `AssertionError: 这些 checks/lanes/*.mjs 没进 tools/lib/asset-lanes.mjs——新资产必须选 lane（或写 manualReason）: expected [ 'zz-unregistered' ] to deeply equal []` |
| 还原（绿） | 删除临时文件 + 重跑 | `Tests 5 passed (5)` |
| 按面选面（命中） | `node checks/pre-push-surfaces.mjs --stdin /tmp/refs-client --dry-run`（真实历史 commit `d31d8366` 的 parent..commit） | `因为改了 packages/company-pack/src/client/data/use-company-data.ts（命中 packages/company-pack/src/client/**；client 装配/入口改动 → 真页面零挂载失败）→ client-load-smoke` |
| 按面选面（不命中） | 同上换 docs-only 范围 | `本次未触发面级检查（规则表 = tools/lib/asset-lanes.mjs SURFACE_RULES）` |
| fast 迁移后不变 | `pnpm -s smoke:fast` | `ALL PASS（6 条，2.95s）` |
| 全量成员 | `node checks/lanes/keyless-lane.mjs --list` | 18 条 |
| 全量 runner | `node checks/lanes/keyless-lane.mjs --ci --filter gates-negative-smoke` | `1 PASS / 0 FAIL / 31 SKIP`（SKIP 逐条打印，含真模型/浏览器/手动理由） |
| 纯逻辑 | `pnpm vitest run tests/tools/lane-match.spec.ts` | 6 passed |
| 全链 | `pnpm test` / `pnpm typecheck` / `pnpm -s lint` / `pnpm -s dup` / `pnpm verify` | 244 files / 2008 tests；typecheck 0；lint 0；dup 0 clones；verify ALL PASS |


| 棘轮绿 | `node checks/audit/coverage-ratchet.mjs` | `coverage-ratchet: PASS（190 文件；基线 2026-11-13；豁免 5 条）` |
| 棘轮回归（红） | 基线临时把 `src/lib/run-bundle-paths.ts` 抬到 100 后重跑 | `FAIL [regressed] … statements 75% < 基线 100%` / `branches 0% < 基线 100%`；还原 → PASS |
| 新文件下限（红） | 临时建 tools/lib/zz-new-untested.mjs 后 `--run` | `FAIL [new-below-floor] tools/lib/zz-new-untested.mjs — 新文件 statements 0% / branches 0%（下限 80/70）`；删除 → PASS |
| 过期豁免（红） | 基线临时加 `tools/lib/zz-gone.mjs` 豁免后重跑 | `FAIL [stale-exemption] tools/lib/zz-gone.mjs — 豁免指向的文件已不存在`；还原 → PASS |
| 判据纯逻辑 | `pnpm vitest run tests/tools/coverage-baseline.spec.ts` | 6 passed（回归/新文件/空洞/过期豁免/nextBaseline/index） |
| pre-push 集成 | `sh .githooks/pre-push < /dev/null` | 全链实跑（verify + typecheck×4 + lint + dup + smoke:fast + surface 未触发 + coverage 棘轮） |

| census 漂移（红） | 手改 `tests/CENSUS.generated.md` 的「冒烟 32 → 99」后跑 spec | `AssertionError: census 是生成物：运行 node tools/test-census.mjs --write`；重新生成 → `Tests 3 passed` |
| census 一致性（绿） | `node tools/test-census.mjs --write` | `已写 144 行（冒烟 32 / 探针 69 / 门禁 71 / spec 246；未分类 69 = 全部探针）` |
| 探针登记 | `pnpm vitest run tests/repo/test-census.spec.ts` | 3 passed（探针双向一致、失败类词表、冒烟 0 未分类） |

## 状态事实与载体

- 事实：**资产 lane 的唯一家 = lane 注册表**；pre-push 按面补跑；每周全量 keyless。
- 唯一入口：`tools/lib/asset-lanes.mjs`（lane 成员 + 规则 + 纯匹配）、`checks/pre-push-surfaces.mjs`（取范围 + 跑）、
  `checks/lanes/keyless-lane.mjs`（全量）、`tests/repo/asset-lanes.spec.ts`（空间完备门）；
  执行下限的唯一入口 = `checks/audit/coverage-ratchet.mjs` + `tools/lib/coverage-baseline.mjs` + `tests/support/coverage-baseline.json`；
  失败类决策表 = `tests/failure-classes.md`；账本三列 = `close-out-definition` / `agent-note-definition` skill；盘子 = `tools/test-census.mjs` → `tests/CENSUS.generated.md`（生成物），一致性 = `tests/repo/test-census.spec.ts`。
- 读载体：`tests/README.md`「按面触发」一段、`checks/README.md` quick-select、`.githooks/pre-push` 头注、
  `checks/INDEX.generated.md`（生成物）。
- 一致性判据：`fast-lane.mjs` 从注册表派生；spec 双向校验；weekly 成员 = `laneOf('weekly')` 的 classic 子集。

## 未覆盖轴

- **每周 CI job 未实跑**：本地无 CI 环境，首次真实运行待观察；若红，按"修环境或标 ciSafe:false + 理由"处置。
- **browser / model 资产不在 `--ci`**：真 Chromium 与真模型按各自触发线手动跑，不进每周 sweep。
- **probe 未纳入注册表**：69 个探针归 A 件的 census；本件只收冒烟。
- **`--no-verify` 无强制留痕**：沿用既有逃生门规矩（收尾 Note 写原因），本件不新增门禁。
- **5 条已声明空洞仍是空洞**：carrier-registry / diagnosis / probe-window / startup-store / StrategyPanel——棘轮只保证它们不变差，补测是后续改动时的义务（`removeWhen`）。
- **性能层与失败类 5/11 仍缺**：组装转录（B6）与 benchmark 不在三件内；它们在失败类表里显式为「缺」。
- **69 个探针仍未分类**：census 显式报「未分类 69」；下一轮按域（team/fs-taskboard/browser-visual/session-context）收敛，不猜。
- **census 无「最后实跑」**：weekly lane 的失败潜伏时间目前只在 CI 日志；要进盘子得先定运行记录格式（未做）。
