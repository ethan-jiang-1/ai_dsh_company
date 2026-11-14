# 2026-11-14 · 测试资产杠杆：从 legibility 到 leverage

状态：implemented（2026-11-14 落地）

上游 = [问题卡](../../_backlog/_archive/settled_issues/2026-11-14-test-asset-leverage.md)（已结）；深挖材料 = [测试资产螺旋](../../_backlog/research/test-asset-spiral/2026-11-14-test-asset-spiral.md)。

## 决定

1. **先收口第二事实源，再加资产。** markdown 形状从「pack TS 一份 + fix-evidence 简化版 + 各门禁 sectionBody」收成两层授权单原语：
   pack 与门禁消费 `packages/company-pack/src/lib/markdown-shape-core.js` 单一状态机（`markdown-shape.ts` 只做类型包装），
   keyless 治理层（`backlog-liveness` / `notes-audit` / `bug-coverage` / `notes-tree` / `proposals`）统一消费
   `tools/lib/repo-markdown.mjs`（复用 `vendor/dsh` `mdast` GFM + `js-yaml`），并由 `company-root-carriers` AST 扫描静态禁绝手写裸解析。
2. **退役优先于新增。** 删 8 份 content english spec（超集 `content-english` + 3 份唯一文件清单合并）、
   删 `gitignore-guards` spec（`gitignore-shape` 门补 `company-workspace`/`_dist`），
   删 candidate-scan-labels 的 321 行语料测试；把 BUG-011 的「假设段」、CMO、ASSIGN canonical 四个活守卫
   迁到 `tests/tools/candidate-scan-assignments.spec.ts`（带 `// 负例留证`）；合并/退役 8 个同构探针（67→59）。
3. **census v2 回答“谁在用”。** `tools/lib/asset-consumers.mjs` 合并自动调度 lane 数与显式引用图（排除自身/README/generated 索引）；
   现行盘面 30 冒烟 + 59 探针（`MAX_PROBES = 59`、`MAX_GATES = 75`、未分类失败类 **0**、**50 个 0 消费者**）。字段加 `shape`/`lastRed`/`replaceBy`/`retireWhen`；
   `lastRed` 未接运行日志，填 `—` 不伪造。
4. **证明层：历史 BUG 覆盖 + 组合语法差分 + 4 消费者契约。**
   - `tools/lib/bug-coverage.mjs`：181 张已修卡 → **76 有具名守卫（42.0%）**，105 无（保守下界）；baseline 只升不降，
     新修 BUG（opened ≥ 2026-11-15）缺具名守卫即红。
   - `tests/lib/markdown-shape.property.spec.ts`：500 个组合语法 seeded 文档（weekly lane 1000）× `mdast` GFM 独立真值差分，
     证归一化幂等、顶层围栏载荷、4+ 空格缩进代码块、行首/行内注释与 GFM 表格逐单元格转义还原一致。
   - `tests/host/contract/structure-agreement.spec.ts`：500 个生成文档对齐二级节定位 + 90 组同源语料对齐 4 消费者（`prd-check` × `requirements-check` × `prd-gate` × 读卡原语）；
     `file-shape-agreement` 覆盖 16 条路径等价类的读/写/建目录/`prd-gate` 全通道同判据矩阵。
5. **棘轮：未覆盖轴必须有四分类与非自链实盘锚点。** `checks/gates/notes-axes.mjs`：新 Note（文件名 ≥ 2026-11-14，覆盖 `notes/implemented/` 与 `notes/archived/`）的
   `## 未覆盖轴` 每个顶层条目必须带 `[covered|policy|environment-gap|unprovable]` 前缀且 `→` 右侧指向非自链的盘上真实文件；用 core 的 `sectionRange` 排除围栏里的假节。
   `tests/failure-classes.md` 加复发规则：同类连续两轮只有 example → 下一轮必须生成器/模型/元测试。
6. **门禁自身要能被分支级证伪。** `tests/checks/gate-mutation.test.mjs`（并入 `checks/lanes/generative.e2e.mjs`）对高风险门禁的核心拒绝分支与浅克隆跳过分支逐条做定向 mutation（mutant 副本隔离在 gitignored `node_modules/.cache/gate-mutations/`，不碰 tracked 目录），坏夹具必须从对应 mutant 漏过，另验 `keyless-lane` 零命中非零退出。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 测试资产的**杠杆/预防能力**：双层单原语垄断、上限封顶退役、消费者计数、历史守卫、未覆盖轴实盘锚点 |
| 唯一入口 | `markdown-shape-core.js` + `repo-markdown.mjs`（形状/AST）、`asset-consumers`/`bug-coverage`（度量）、`notes-axes`/`failure-classes`（棘轮） |
| 读载体 | fresh agent、测试资产作者、门禁作者、pre-push/weekly lane |
| 写载体 | `checks/gates/`、`tests/checks/`、`tests/lib/`、`tests/host/contract/`、`tools/lib/` |
| 一致性判据 | 单原语静态禁裸解析；census/coverage 生成物与盘面一致（`MAX_GATES=75`/`MAX_PROBES=59`/未分类=0）；新 Note 未覆盖轴带四分类与非自链真文件；新 BUG 有具名守卫 |

## 输掉的方案

- **继续一 bug 一 spec**：v2–v5 已证明 bug 率 8/8/8/8；例子型资产关实例不关类。
- **在 `tools/lib` 反向 import `packages/company-pack`**：违反 `tools/lib` keyless seam；改为 `tools/lib/repo-markdown.mjs` 消费 `vendor/dsh` `mdast` + `js-yaml`，并与 `markdown-shape-core.js` 做 500 例跨层差分对齐。
- **全量字节码 mutation / 长时 soak**：慢、噪声、易 flaky；只对高风险门禁的核心拒绝/跳过分支做定向分支级 mutation。
- **引 fast-check**：手写 seeded 生成器足够；不新增依赖。
- **用覆盖率当改善指标**：线覆盖量执行，不量输入分布；改用 bug-coverage + 类复发 + 退役数。
- **R4 直接删**：bug-coverage 棘轮先挡住（BUG-011 唯一守卫）；先迁守卫再退役，而不是把门禁当形式。

## 验证

| 层 | 实跑证据 |
|---|---|
| 结构 | `pnpm verify` **ALL PASS**（75 门禁；notes-axes 新 Note 8 篇） |
| 回归 | `pnpm test` **243 files / 2064 tests** |
| 类型 | `pnpm typecheck` 绿 |
| 门禁自测 | `pnpm test:checks` **9 PASS / 0 FAIL** |
| 变形红证 | 把围栏行改成 `structural: true` → property「围栏内永不 structural」红；还原绿 |
| notes-axes 红证 | 现判据 = 四分类前缀 + `→` 右侧盘上真实非自身文件锚点；临时新 Note 写 `- [policy] x → 决定：留后续卡` → `FAIL notes-axes`；删除后 PASS（旧「缺去向」判据已被取代） |
| mutation | `tests/checks/gate-mutation.test.mjs` 现覆盖 naming/carrier/fix-evidence/notes-tree/notes-axes/backlog-liveness/ledger-routing 七个门禁的分支 + keyless-lane 零命中；17 tests 全绿；每分支被删后坏夹具漏过（首版只有 4 门禁，后续由 [institutional-test-ratchet] 扩展） |
| R4 棘轮 | 先 `candidate-scan-labels` 删了会让覆盖 76→75 → 红；迁 BUG-011 守卫后删，覆盖仍 76 |
| v6 dry-run | `tests/evidence/v6-dry-run.spec.ts`：Windows `..\` → unsafe；围栏嵌套只取顶层 json |
| 现行盘面读数 | 已修 181 / 具名守卫 76（42.0%）；30 冒烟 + 59 探针（未分类 0 / 0 消费者 50）；75 门禁（`notes-axes` 生效日 `2026-11-14`） |

## 未覆盖轴

- [covered] **4 消费者跨层契约差分**（`prd-check` / `requirements-check` / `prd-gate` / 读卡原语同语料）→ `tests/host/contract/structure-agreement.spec.ts`
- [covered] **R2 collaboration verdict 纯逻辑抽离**（拆除源码切片 `vm.runInNewContext`）→ `tools/lib/collaboration-oracle-verdict.mjs`、`tests/evidence/collaboration-probe-verdict.spec.ts`
- [environment-gap] **Windows 实机/CI runner** → `_backlog/triggers.md`、`tests/host/contract/file-shape-agreement.spec.ts`
- [unprovable] **静态门禁内证明测试命令“历史上真红过”** → `checks/gates/fix-evidence.mjs`、`.agents/skills/close-out-definition/SKILL.md`
- [policy] **失败类跨轮复发轮次不单造假精确字段**：以具名守卫棘轮与生成式差分承接 → `tests/failure-classes.md`、`tests/repo/bug-coverage.spec.ts`
