# 2026-11-14 · 测试资产杠杆：从 legibility 到 leverage

状态：implemented（2026-11-14 落地）

上游 = [问题卡](../../_backlog/_archive/settled_issues/2026-11-14-test-asset-leverage.md)（已结）；深挖材料 = [测试资产螺旋](../../_backlog/research/test-asset-spiral/2026-11-14-test-asset-spiral.md)。

## 决定

1. **先收口第二事实源，再加资产。** markdown 形状从「pack TS 一份 + fix-evidence 简化版 + 各门禁 sectionBody」收成
   `packages/company-pack/src/lib/markdown-shape-core.js` 一份核心：TS 侧 `markdown-shape.ts` 只做类型包装，
   `fix-evidence` / `proposals` / `notes-liveness` 直接 import 核心的 `sectionRange`。
   `tools/lib/backlog-liveness.mjs` 因 keyless seam（`tests/repo/layering.spec.ts` 禁止 `tools/lib` 依赖
   `tools/lib` 之外）保留行级节定位，边界写在文件里——**最终是 2 个实现 + 一条声明的 keyless 边界，不是 4 份各说各话**。
2. **退役优先于新增。** 删 8 份 content english spec（超集 `content-english` + 3 份唯一文件清单合并）、
   删 `gitignore-guards` spec（`gitignore-shape` 门补 `company-workspace`/`_dist`），
   删 candidate-scan-labels 的 321 行语料测试；把 BUG-011 的「假设段」、CMO、ASSIGN canonical 四个活守卫
   迁到 `tests/tools/candidate-scan-assignments.spec.ts`（带 `// 负例留证`）。**退役 10 份，新增 4 份（property / structure-agreement / v6 dry-run / candidate 活守卫）。**
3. **census v2 回答“谁在用”。** `tools/lib/asset-consumers.mjs` 只读引用图（精确 token，排除自身/README/generated 索引）；
   30 冒烟 + 67 探针里 **72 个 0 消费者**。字段加 `shape`/`lastRed`/`replaceBy`/`retireWhen`；
   `lastRed` 未接运行日志，填 `—` 不伪造。
4. **证明层：历史 BUG 覆盖 + 变形不变量 + 差分。**
   - `tools/lib/bug-coverage.mjs`：181 张已修卡 → **76 有具名守卫（42.0%）**，105 无（保守下界）；baseline 只升不降，
     新修 BUG（opened ≥ 2026-11-15）缺具名守卫即红。
   - `tests/lib/markdown-shape.property.spec.ts`：200 个 seeded 文档（weekly lane 1000）证归一化幂等、围栏永不
     `structural`、行首注释 vs 行内 `<!--`、表格转义列数。
   - `tests/host/contract/structure-agreement.spec.ts`：200 个生成文档证 `sectionRange` 与 `scanDocumentDetailed`
     选中同一个标题；`file-shape-agreement` 加 9 条路径等价类。
5. **棘轮：未覆盖轴必须有去向。** `checks/gates/notes-axes.mjs`：新 Note（文件名 ≥ 2026-11-15）的
   `## 未覆盖轴` 每个顶层条目必须带 `→` 去向，无条目也红；用 core 的 `sectionRange` 排除围栏里的假节。
   `tests/failure-classes.md` 加复发规则：同类连续两轮只有 example → 下一轮必须生成器/模型/元测试。
6. **门禁自身要能被证伪。** `tests/checks/gate-mutation.test.mjs` 对 naming/carrier/fix-evidence/notes-tree
   各删一条规则，坏夹具必须从 mutant 漏过；4/4 通过。naming/carrier 另补 root 注入 conformance。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 测试资产的**杠杆/预防能力**：形状单一来源、退役、消费者、历史守卫、未覆盖轴去向 |
| 唯一入口 | `markdown-shape-core.js`（形状）、`asset-consumers`/`bug-coverage`（度量）、`notes-axes`/`failure-classes`（棘轮） |
| 读载体 | fresh agent、测试资产作者、门禁作者、pre-push/weekly lane |
| 写载体 | `checks/gates/`、`tests/checks/`、`tests/lib/`、`tests/host/contract/`、`tools/lib/` |
| 一致性判据 | 形状 2 实现 + 边界；census/coverage 生成物与盘面一致；新 Note 未覆盖轴有去向；新 BUG 有具名守卫 |

## 输掉的方案

- **继续一 bug 一 spec**：v2–v5 已证明 bug 率 8/8/8/8；例子型资产关实例不关类。
- **直接把 4 份形状实现都 import 到 `tools/lib`**：`tools/lib` keyless seam 会红；改为 core + 声明边界。
- **全量 mutation / soak**：慢、噪声、易 flaky；只做 4 个高风险门禁的定向 mutation。
- **引 fast-check**：手写 seeded 生成器足够；不新增依赖。
- **用覆盖率当改善指标**：线覆盖量执行，不量输入分布；改用 bug-coverage + 类复发 + 退役数。
- **R4 直接删**：bug-coverage 棘轮先挡住（BUG-011 唯一守卫）；先迁守卫再退役，而不是把门禁当形式。

## 验证

| 层 | 实跑证据 |
|---|---|
| 结构 | `pnpm verify` **ALL PASS**（75 门禁；notes-axes 新 Note 0 篇） |
| 回归 | `pnpm test` **243 files / 2064 tests** |
| 类型 | `pnpm typecheck` 绿 |
| 门禁自测 | `pnpm test:checks` **9 PASS / 0 FAIL** |
| 变形红证 | 把围栏行改成 `structural: true` → property「围栏内永不 structural」红；还原绿 |
| notes-axes 红证 | 临时 `2026-11-15-zz-axis.md` 缺去向 → `FAIL notes-axes: …没有 → 去向`；删除后 PASS |
| mutation | naming/carrier/fix-evidence/notes-tree 各删一条规则 → 坏夹具漏过；4/4 |
| R4 棘轮 | 先 `candidate-scan-labels` 删了会让覆盖 76→75 → 红；迁 BUG-011 守卫后删，覆盖仍 76 |
| v6 dry-run | `tests/evidence/v6-dry-run.spec.ts`：Windows `..\` → unsafe；围栏嵌套只取顶层 json |
| 度量 | 已修 181 / 具名守卫 76（42.0%）；30 冒烟 + 67 探针 / 0 消费者 72；退役 10 / 新增 4 |

## 未覆盖轴

- [covered] **4 消费者跨层契约差分**（`prd-check` / `requirements-check` / `prd-gate` / 读卡原语同语料）→ `tests/host/contract/structure-agreement.spec.ts`
- [covered] **R2 collaboration verdict 纯逻辑抽离**（拆除源码切片 `vm.runInNewContext`）→ `tools/lib/collaboration-oracle-verdict.mjs`、`tests/evidence/collaboration-probe-verdict.spec.ts`
- [environment-gap] **Windows 实机/CI runner** → `_backlog/triggers.md`、`tests/host/contract/file-shape-agreement.spec.ts`
- [unprovable] **静态门禁内证明测试命令“历史上真红过”** → `checks/gates/fix-evidence.mjs`、`.agents/skills/close-out-definition/SKILL.md`
- [policy] **失败类跨轮复发轮次不单造假精确字段**：以具名守卫棘轮与生成式差分承接 → `tests/failure-classes.md`、`tests/repo/bug-coverage.spec.ts`
