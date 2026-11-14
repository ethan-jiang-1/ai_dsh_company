---
status: 推敲中
opened: 2026-11-14
---

# 推敲：测试资产杠杆——上一轮改善为什么没降低 bug 率，下一轮凭什么会

> 立卡：2026-11-14 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：note — 深挖结论：上一轮是“资产可管理性”（legibility）提升，不是“资产杠杆”（leverage）提升；下一轮按 P0 收口/分类/退役 → P1 生成器/差分/门禁元测试 → P2 棘轮。用户点名后翻 `待落地`，实施同 diff 写 `新建:notes/implemented/2026-11-14-test-asset-leverage.md`。
>
> **授权更新**：用户 2026-11-14「推动这个落地」= 本卡 P0/P1/P2 实施授权；原“只深挖”边界作废，实施记录见 `## 进展` 与 Note。
>
> **审查**：agent — 实施中；P0/P1/P2 大半已落，余 gate mutation / v6 dry-run / R2 提取。

## 问题与期望结果

**上一轮做过什么**：`test-asset-loop` + `test-asset-fence` + `world-shapes`/matrix 给 repo 加了四层 lane、`asset-lanes` 注册表、`test-census`、覆盖率棘轮、`failure-classes`、`naming-contract`、`fix-evidence`、`notes-tree`、`carrier` 门禁。**结果是资产可管理性大幅提升，但 exploratory 仍然每轮稳定 +8 个 bug。**

**数字（干净 HEAD）**：247 spec / 2074 tests / 29,090 行 / 5,042 个 expect / 1,770 个 it；74 门禁；29 冒烟；67 探针（全部手动、67 未分类）；已修 181 张；活跃 0。四轮：2034/8 → 2046/8 → 2066/8 → 2072/8（v5 修复后 2074/0）。**+32 个缺陷 vs +40 个用例；每轮新增用例与下一轮新缺陷同量级。**

**期望结果**：下一轮 exploratory 对**已识别类**的复发为 0；一个资产能覆盖 ≥3 个历史 bug（杠杆）；退役资产数 > 新增一次性 spec 数；`未覆盖轴` 不再只是 prose，而是“已分类 + 有去向”。

## 当前情况：上一轮的改善为什么没被体会到

### 1. 改善的是 legibility，不是 leverage

上一轮把“资产散落”变成“资产可管理”：有 lane、有 census、有 coverage、有 naming、有 gate。这些证明**资产存在且被登记**，不证明**资产能抓未知输入**。所以：
- 资产数从 238 涨到 247，bug 率仍是 8/轮；
- 67 个探针全手动、全未分类，census 只数“有什么”；
- 0 个资产被退役；一次性 spec 与无消费者探针没有减法。

### 2. 新门禁自己成了新的 bug 面

最近 32 张卡（BUG-152..183）按根因分组：

| 类 | 卡 | 数量 | 说明 |
|---|---|---|---|
| 文本形状层 | 152/153/157、160/162、168/169/172/173、176/181 | **11** | “哪些行算结构”一个类，反复出 |
| 门禁/证据 | 158/161（pre-push）、163/167（notes-tree）、171/174/175、177/178/182（fix-evidence） | **10** | 其中 8 张在上一轮新建的 fix-evidence/notes-tree |
| 路径/平台/根 | 170、179/180/183 | **4** | `..`/分隔符/根 symlink |
| PRD 闸门 | 154/155/156 | 3 | 第二套 numbering/cwd/文件形状 |
| 结构语义 | 164/165/166 | 3 | 归属/表格/日期 |
| client 文本 | 159 | 1 | `{}` 短路 |

**前两类 = 21/32（66%）**；上一轮新建门禁贡献了 8/32（25%）。**改善本身变成了下一个 bug 源**——因为新门禁是代码，但没有 gate mutation/元测试；它们只被“一次性红证”证过。

### 3. 新层复制了第二份事实源

- **markdown 形状 4 份实现**：`packages/company-pack/src/lib/markdown-shape.ts`、`checks/gates/fix-evidence.mjs:79` 的 `structuralFlags`、`checks/gates/notes-tree.mjs`、`tools/lib/backlog-liveness.mjs`。v5 修了围栏块，`structuralFlags` 仍在。
- **路径语义 3 处**：`company-root.ts` 的 `relToCompany` / `walkCompanyDirs` / POSIX `dirname`；`file-shape-agreement.spec.ts:174-190` 只枚举 5 条 rel。
- **lane 选择 4 处**：`asset-lanes.spec` / `lane-match.spec` / `pre-push-surfaces.test` / census；散文已漂（`fast-lane.mjs:5` 说 6 条、实际 4；`asset-lanes.mjs:274` 说 69 探针、实际 67）。
- **覆盖率豁免**：`coverage-baseline.json` 796 行，有 `removeWhen`，没有到期测试。

### 4. 未覆盖轴只写不消费——而下一轮 bug 已在上一轮 Note 里

- v3 Note `## 未覆盖轴`：注释与围栏嵌套、GFM 行内代码 `|` → v4 的 168/169/172/173。
- v4 Note `## 未覆盖轴`：行内代码 span 跨行/嵌套 → v5 的 181。
- v5 Note `## 未覆盖轴` 5 条：Windows 实机、跨行 code span 闭合行之后、围栏块嵌套、命令只证形态不证执行、notes 根 symlink 一律红 → **v6 的候选**。

**注意：这 5 条不是同一种东西**——需要分类，不能一律“加测试”：
1. **bug-shaped**：Windows `..\`（`path.win32` 可单测；真机仍缺）、围栏块嵌套（合法 Markdown 长围栏）；
2. **policy**：notes 根 symlink 一律红（v5 已定；未来支持要新形状）、跨行 span 闭合行之后（保守非结构，是取舍）；
3. **unprovable in verify**：命令“真跑过/真会红”不能在秒级 `verify` 里证明（执行归 test/pre-push）。

### v5 未覆盖轴的分类（P0.2）

| 轴 | 分类 | 现行证据 / 去向 |
|---|---|---|
| Windows `..\` | **environment gap**（字符串语义已有 fixture） | `tests/host/contract/file-shape-agreement.spec.ts` 的 `..\outside` 形状；真 runner 另立 trigger = `_backlog/triggers.md`「Windows CI/实机 runner 可用」 |
| 跨行 span 闭合行残余 | **policy** | 新增 `tests/lib/prd-check.spec.ts`「闭合行上的残余标题也不当定义」——保守非结构是取舍，不是 bug |
| 围栏块嵌套 | **covered** | `tests/lib/prd-check.spec.ts` BUG-176 用例（外层 4 反引号 + 内层 3 反引号 + 真账本） |
| 命令只证形态不证执行 | **unprovable in verify** | 执行归 `pnpm test` / pre-push；`fix-evidence` 只做命令语法解析（`tests/checks/fix-evidence.test.mjs`） |
| notes 根 symlink 一律红 | **policy** | `tests/checks/notes-tree.test.mjs` 的根 symlink 用例；未来支持要新形状，不直接放开 |

**结论**：5 条里 1 条 covered、1 条 environment gap、2 条 policy、1 条 unprovable；**没有一条需要再补“同类手写 spec”**。这比“看到未覆盖轴就加测试”少 4 个无效资产。

## 事实与读者

- 事实：**测试资产的杠杆/预防能力**（不是某个产品状态）。
- 唯一入口：`tests/`、`checks/lanes/`、`checks/gates/`、`tools/lib/asset-lanes.mjs`、`tests/failure-classes.md`、`tests/CENSUS.generated.md`。
- 读/写载体：测试资产作者、门禁作者、fresh agent、pre-push/周 lane。
- 环境坏法：新层/新门禁/新契约；exploratory 从“上一轮未覆盖轴”找；metric 只量资产存在。
- 一致性：census ↔ 盘面 ↔ 散文；类覆盖 ↔ 资产形状；新增门禁 ↔ 元测试。

## 未决问题

1. markdown 形状收口到一份 **纯 JS 核心**（门禁可 import、TS 薄包装），还是保留 4 份 + 差分？前者是“一处事实一个家”，后者是“测试兜分叉”；建议前者，差分只证 TS/JS 边界。
2. v5 的 5 条未覆盖轴，哪些进 P0 的“bug-shaped 语料”，哪些只做 policy 决策/文档边界？
3. R1–R3 退役是否安全：12 个 content english spec 中 11 个是 `content-english` 子集；`candidate-scan-labels` 语料已移出；`gitignore-guards` 门已做。需要先跑一次“删后全绿”验证。
4. 杠杆怎么度量：一个生成器/契约覆盖 ≥3 个历史 bug？类复发 <1/轮？退役数 > 新增一次性 spec 数？
5. `## 未覆盖轴` 怎么强制分类：`bug-shaped / policy / unprovable` 三档 + `→ 资产/issue/决定`；门禁查“每行有去向”。
6. 新门禁的元测试门槛：每个 gate 至少一份 `tests/checks` + 一次定向 mutation；否则不许进 `verify`。

## 进展（2026-11-14，实施中）

已落（commits `34ccab6c` / `refactor(test-assets)` / `feat(proof)` / `ed33e4cd`）：

- **P0.1 形状收口**：`markdown-shape-core.js` 一份核心（TS 薄包装 + 门禁 import）；`fix-evidence`/`proposals`/`notes-liveness` 共用 `sectionRange`；`tools/lib/backlog-liveness.mjs` 因 keyless seam 保留行级定位并注释边界。
- **P0.2 v5 轴分类**：Windows `..\` = environment gap + trigger；闭合行残余 = policy 夹具；围栏嵌套 = covered；命令执行 = unprovable；notes 根 symlink = policy。
- **P0.3 退役**：删 8 份 content english spec + `gitignore-guards`；3 份文件清单并进 `content-english`；`gitignore-shape` 门补 `company-workspace`/`_dist`；archived 死指针改指门禁。
- **P0.4 census v2**：`asset-consumers` 消费者图，96 个资产 **56 个 0 消费者**；`shape`/消费者列 + `lastRed`/`replaceBy`/`retireWhen` 字段说明。
- **证明层**：`bug-coverage` 181 张已修卡 → **76 有具名守卫（42.0%）**，baseline 只升不降；`markdown-shape.property` 200 例（weekly 1000）；`structure-agreement` 200 例差分；路径 9 条等价类。
- **P2 棘轮**：`notes-axes` 门禁（新 Note 未覆盖轴必须有 → 去向；红证已跑）；weekly `generative` lane（1000 例）；`failure-classes` 复发棘轮。

**R4 被自己的棘轮挡住**：`candidate-scan-labels.spec.ts` 看似“语料已移出”，但它是 **BUG-011 的唯一具名守卫**；删它会让 bug-coverage 从 76 掉到 75，baseline 立即红。**保留**，直到 BUG-011 有活守卫；这是“证明层”第一次阻止错误退役。

**余**：4 个高风险 gate 的**定向 mutation**（conformance 已补：fix-evidence/notes-tree 原有，naming/carrier 新增 root 注入测试）；4 消费者差分（prd-check / requirements-check / prd-gate / fix-evidence）；v6 dry-run 证据；R2 collaboration verdict 的纯逻辑提取。

## 方案与取舍

**P0（先做，1 天）— 止血 + 分类**
- **收口 markdown 形状**：抽 `新建:tools/lib/markdown-shape-core.mjs`（纯 JS，门禁 import；TS 侧 `markdown-shape.ts` 薄包装），4 份实现 → 1 份 + TS/JS 边界差分。
- **5 条未覆盖轴分类**：2 条 bug-shaped（Windows `..\`、围栏块嵌套）落命名 fixture + `path.win32` 单测；2 条 policy 落决定/`新建:_backlog/issues`；1 条 unprovable 写进 `docs/testing.md` 边界（命令执行归 test/pre-push）。
- **退役 R1–R3**：12 个 english spec 留 `content-english` 超集 + 文件清单一件；删 `candidate-scan-labels`；删 `gitignore-guards` 重复件（门已做）。删后跑全量。
- **census v2**：加 `lastRed`/`consumer`/`replaceBy`/`retireWhen`/`shape`；67 探针消费者图（A5）。

**P1（2–3 天）— 生成器/差分/门禁元测试**
- `新建:tests/support/doc-grammar.ts` + `新建:tests/lib/markdown-shape.property.spec.ts`：BOM/CRLF/围栏/跨行 span/注释/转义/JSON 块，200–500 例/面；手写 seeded，不引依赖。
- `新建:tests/host/contract/structure-agreement.spec.ts`：同一语料跑 prd-check / requirements-check / prd-gate / fix-evidence，断言结构分类一致。
- `新建:tests/checks/gate-mutation.test.mjs`：fix-evidence/notes-tree/naming-contract/company-root-carriers 的定向变异 + `tests/checks` 自测；shallow-clone/amend/detached 分支显式钉。
- 路径矩阵：`/`、`\`、`.`、内部 `..`、尾部 `..`、`a/../../b`，读写删同判据。

**P2（1–2 天）— 棘轮**
- `## 未覆盖轴` 每行 `bug-shaped|policy|unprovable → 资产/issue/决定`；`notes-liveness` 查。
- `failure-classes` 加 `lastRound`/`assetShape`/`recurrence`；同类连续两轮只有 example → 下一轮必须生成器/模型/元测试。
- weekly 生成 lane（keyless）；lane 注册表↔散文↔盘面三向；`test:e2e|entry` 选 0 件 = 假绿；覆盖率豁免到期。

**输掉的方案**：
- **再补更多 spec**：上一轮已证明 bug 率不变；
- **全量 mutation/soak**：慢、噪声、易 flaky；
- **fast-check/新依赖**：手写 seeded 生成器足够；
- **只加门禁**：新门禁是下一个 bug 面，没有元测试就会重演 v4/v5；
- **用覆盖率当改善指标**：线覆盖量执行，不量输入分布。

## 范围与排除项

**做**：P0/P1/P2（测试资产 + 门禁元测试 + 目录/退役），不改产品行为。
**不做**：改 host/client 业务逻辑；引入新依赖；全量 mutation/soak；真模型 fuzz；Windows-only gate（先 `path.win32` 单测）。

## 验收标准

- [x] P0：markdown 形状 4 → 1 份核心 + TS 薄包装；`fix-evidence.structuralFlags` / `notes-tree` / `backlog-liveness` 改为消费核心或只留边界适配。
- [x] P0：v5 的 5 条未覆盖轴逐条分类为 `bug-shaped|policy|unprovable`，每条有 `→` 资产/issue/决定；2 条 bug-shaped 有命名 fixture（红→绿）。
- [x] P0：R1–R3 退役后 `pnpm test`/`verify` 全绿；12 个 english spec 留超集 + 一件文件清单。
- [x] P0：census 有 `lastRed|consumer|replaceBy|retireWhen|shape`；67 探针有消费者或 `manualReason`。
- [x] P1：属性生成器覆盖 shape 类，至少能重放 3 个历史 BUG（152/168/176 各一类）；差分能抓“两个消费者结论相反”。
- [ ] P1：4 个高风险 gate 有 `tests/checks` + 定向 mutation；删 gate 一条规则 → 元测试红。
- [x] P2：`## 未覆盖轴` 每行有去向；类复发 ≥2 轮 → 生成器/模型/元测试；weekly 生成 lane 跑通。
- [ ] 度量：v6 dry-run 对已识别 bug-shaped 轴复发 = 0；退役数 > 新增一次性 spec 数；`pnpm verify`/`test`/`typecheck` 绿。

## 关闭条件

P0/P1 验收全绿 + v6 dry-run 证据（已识别轴 0 复发）+ Note 回链；P2 可另卡。用户验收后归档。

## 抽象度

- 换公司要改吗？→ 不会；这是测试资产工程。
- 换产品类型要改吗？→ 不会。
- 换做法要改吗？→ 会；若换 tracker/CI，lane/门禁实现跟着换，但“杠杆/分类/退役”判据不变。
- 只有机制本身变才改吗？→ 是。
- 第二消费者：下一个 fresh agent、测试资产作者、门禁作者。
- 搬家成本：低；规则住 `tests/`/`checks/`/`failure-classes`，不碰产品合同。
