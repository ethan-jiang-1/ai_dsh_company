# 2026-11-14 · 测试治理制度棘轮：宪章 × 流程 × 元门禁

状态：implemented（2026-11-14 落地）

> **部分取代**：[2026-11-14-test-asset-leverage](./2026-11-14-test-asset-leverage.md)（首轮「杠杆」落地；本轮把它留下的双状态机、注释与代码相反、路径双标、收尾放水逐项收口，首轮 Note 只保留已更新的事实）。

上游 = [问题卡](../../_backlog/_archive/settled_issues/2026-11-14-institutional-test-ratchet.md)（已结）；研究题 = [test-asset-spiral](../../_backlog/_archive/research/test-asset-spiral/README.md)（已归档）。

## 决定

1. **宪章层**：横切语义（Markdown 形状、frontmatter、路径）**只许一个原语**；共享层缺陷必须交独立真值差分/全通道矩阵；门禁 ≤ 75、探针 ≤ 59 只降不升（`docs/testing.md`、`docs/policy.md` §P2）。
2. **流程层**：废除“作者收尾自查”，非平凡变更收尾必须真跑**独立只读子代理盲审**（输入集 = policy §P5：当前 diff + 四样判据），`BLOCKER = 0` 才许归档；`## 未覆盖轴` 必须四分类并指向盘上真实文件（`docs/policy.md` §P5、`.agents/skills/{close-out,gate-change,agent-note}-definition/SKILL.md`）。
3. **元门禁层**：`markdown-shape-core.js` 收成单状态机；`tools/lib/repo-markdown.mjs` 复用 `vendor/dsh` 的 `mdast`+`js-yaml`；`company-root-carriers` 用 AST 静态禁裸解析（并入既有门禁，门禁数不涨）；`doc-grammar.ts` 真语法生成器 × `mdast` 独立真值差分；4 消费者契约；读/写/建目录与 `prd-gate` 同判据路径矩阵；`gate-mutation.test.mjs` 分支级变异；资产负债棘轮（`MAX_GATES=75`/`MAX_PROBES=59`，探针 67→59，未分类 0）。
4. **盲审是首验也是主证据**：本卡自身收尾真跑了多轮独立盲审（轮次与结论见验证），首轮抓出 6 个作者自查没发现的 BLOCKER。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 本仓测试与门禁的**原语唯一性、证明等级下限、验收分权、治理资产总量上限** |
| 唯一入口 | 宪章 `docs/{testing,policy}.md` + 三个完成定义 skill；原语 `markdown-shape-core.js`、`repo-markdown.mjs`；门禁 `company-root-carriers`/`notes-axes`；元测试 `gate-mutation.test.mjs` |
| 读载体 | 后续开发会话 agent、独立盲审子代理、`pnpm verify`、pre-push、weekly generative lane |
| 写载体 | `checks/gates/`、`tools/lib/`、`tests/`、`packages/company-pack/src/{lib,host}` |
| 一致性判据 | `company-root-carriers ×52 / 禁裸解析 ×137` 绿；`gate-wiring ×75`；`test-census` 棘轮；新 Note 未覆盖轴带四分类与非自链真文件 |

## 输掉的方案

- **新写 3–4 道独立门禁**（`no-raw-parsing`/`probe-budget`/…）：门禁自身是 bug 面；规则并入既有 owner，门禁数不涨。
- **pack 运行时直接依赖 `mdast`**：扩大发布依赖面；pack 保持零依赖单状态机，`mdast` 只在测试/门禁层作真值。
- **保留“小改动可自查”模糊措辞**：疲劳期必被解释成“这次可自查”；改按客观触发面（卡归档/门禁增改/跨模块）强制盲审。
- **一次性全删 52 个零代码引用探针**：部分是按需真模型诊断资产；先修消费者口径，合并同族与历史走查件（67→59）。
- **穷举式禁令声称“全部形态”**：盲审指出静态禁令必有边；改为在门禁头注**声明边界**（开放集合）并靠盲审补位。

## 验证

| 层 | 失败类 | 切片 | 提交 | 负控（亲眼见红→还原绿） |
|---|---|---|---|---|
| 静态门（`doc-budget`） | 12 文档/指针 | W1 宪章/Skill | `8bbfb0c5` | 超 `doc-budget` headroom → `pnpm verify` 红；还原压简绿 |
| 静态门（AST 扫描） | 12 文档/指针 | W2 单原语 + 禁裸解析 | `a4b6a7db` | 植入 `/^##\s+/` / `/^---\r?\n/` → 门禁点名 file:line；5 份静默损坏的 SKILL.md YAML 头被它抓出并修好 |
| keyless 差分（property × `mdast`） | 1 纯逻辑 | W3 生成器 + 4 消费者 + 路径矩阵 | `4b463116` | 破坏转义/跨行 span/长围栏判据 → 差分在 seed 内红 |
| 门禁元测试（分支变异） | 12 文档/指针 | W4 分支变异 + 实盘锚点 + 棘轮 | `789b39fb` | 删门禁分支 → 坏夹具漏过；`--filter zz-none` exit 1 |
| keyless（host 契约 + property） | 1 纯逻辑 | 首轮盲审整改（6 BLOCKER + 4 建议） | `ee93d85f` | `splitTableRow` 转义、`scanDocumentDetailed` 标点转义各被破坏一次，property seed=0/1 立即红 |
| 门禁元测试 | 12 文档/指针 | 次轮盲审整改（2 BLOCKER） | `817340db` | 删字符串前缀分支 → `gate-mutation` 字符串夹具漏过 |
| 门禁元测试 | 12 文档/指针 | 三轮建议收口 | `a1dc14a6` | 补逃逸形态（`(?:^|\n)##`、`\n#{2}`、`[#]{2}`、`startsWith('##')`）各有判红断言 |
| 覆盖率棘轮 | 1 纯逻辑 | 归档前覆盖棘轮回补 | `a5ab852f` | `pnpm coverage:ratchet` 先红（`notes-audit` branches 86.79% < 87%；a1dc14a6 留下不可达去重分支）；删该分支 + 三个标题体裁用例后 88.46%，变异 `TITLE_SIGNALS` 使新用例红一次，基线 `--update` 只升不降 |
| 静态门（AST 扫描）+ 门禁元测试 | 12 文档/指针 | 盲审整改：四输入单源 + 工具盘 `.dsh-company` 登记门 + 越界注释对齐 | `82831fc1` | 未登记的 `tools/lib` 直写 `.dsh-company` → `company-root-carriers` 红并点名 `scaffold.mjs:4`；登记后绿；变异该分支 → 坏夹具漏过；越界 `../` 用例收紧为 `toBe('unsafe')` 后仍绿 |
| 静态门（AST 扫描） | 12 文档/指针 | 末轮复审建议：host/工具盘统一 AST 写调用 + 路径实参判据 | `10b29105` | 旧文本判据下只读 host 模块被误红、promises `mkdir` 不红；改后 `node --test` 两文件 20/20（含 gate-mutation），`pnpm verify` 绿 |

**盲审记录**（每轮独立只读子代理，输入集 = policy §P5；轮次 = 盘上真实运行，不合并计数）：

1. 第 1 轮 BLOCKER 6 / SUGGESTION 4 → `ee93d85f` 全清；
2. 第 2 轮 BLOCKER 2（禁裸解析可逃逸、盘上 `candidate-scan`/`base-clean` 两处漏网、前序 Note 事实漂移）→ `817340db`；
3. 第 3 轮 BLOCKER 0 / SUGGESTION（逃逸形态补全）→ `a1dc14a6`；
4. 第 4 轮（归档前收口）BLOCKER 2 / SUGGESTION 3（盲审输入集三处矛盾；policy §P2 工具盘 `.dsh-company` 路径门空承诺；注释与断言相反；卡/Note 循环回指；四探针源码切片残余未声明）→ `82831fc1` + 本 Note；
5. 第 5 轮（复审）BLOCKER 2 / SUGGESTION 5（输入集仍三套复述；归档记录预写轮次与结论；`.dsh-company` 字面量一字符逃逸；`reason` 未强制；整模块豁免；卡路径清单缺纯模块；路径边界未声明）→ 本轮整改；
6. 第 6 轮 BLOCKER 1 / SUGGESTION 5（归档索引仍写「三轮」；多行 import 误红、promises 写 API 漏判、模板后缀逃逸、`symbol` 未强制、generative 计数漂移）→ 本轮整改；
7. 第 7 轮 BLOCKER 0 / SUGGESTION 2（host 扫描未跟进 AST：只读误红、`:0` 行号、promises 漏判；字面量按文件级判会把错误消息误红）→ 整改（host 与工具盘统一 AST 写调用 + 路径实参判定）；
8. 第 8 轮（末轮）BLOCKER 0 / SUGGESTION 0 → 归档（实跑 11/11 独立夹具 + 真根 verify/test:checks/test/generative 全绿）。

终验（本轮实跑）：`pnpm verify` ALL PASS（`company-root-carriers ×52`：写面 7 / knownGap 0 / 禁裸解析 ×137 / 工具盘入口 2；`gate-wiring ×75`）；`pnpm test` 244 files / 2093 tests；`pnpm test:checks` 10 PASS / 0 FAIL；`node checks/lanes/generative.e2e.mjs` 14/14；`pnpm smoke:fast` 4/4；`pnpm coverage:ratchet` PASS（197 文件）；`pnpm typecheck` / `lint` / `dup` 绿；`pnpm notes:audit` 状态行不符 0。

## 未覆盖轴

- [policy] **静态禁裸解析是开放集合**：只管 `^` 锚 / `\n` 前缀 / `[#]{n}` 正则与 `startsWith/split` 的 `#…` 字面量，标识符间接传参、`slice/replace/match` 不扫；门禁头注已声明边界，其余靠盲审补位 → `checks/gates/company-root-carriers.mjs`
- [policy] **notes-axes 锚点只验“任一盘上真实非自身文件”**，不验与该轴语义相关；语义相关性交盲审判断 → `checks/gates/notes-axes.mjs`
- [unprovable] **BUG-181 跨行反引号行的真值来自生成器自报**（`multilineSpanLines`），不是 `mdast` 独立差分，属已声明策略断言 → `tests/lib/markdown-shape.property.spec.ts`
- [policy] **四个真模型探针的 verdict 仍由受控源码切片断言退出码关系**（探针是带副作用的驱动脚本，不能直接 import 执行；`collaboration-oracle` / `team-concurrency` 两簇已抽纯模块）→ `tests/evidence/collaboration-probe-verdict.spec.ts`
- [policy] **工具盘 `.dsh-company` 字面量门是开放集合**：只认字面量里的路径段（`'.dsh-company'`、`'./.dsh-company/kb'`、`` `${ws}/.dsh-company` ``、`` `${ws}/.dsh-company${sub}` ``）；变量拼接（`'.dsh' + '-company'`）与 `WRITE_CALLS`（sync + promises，host 与工具盘共用）之外的新写 API 不扫，登记粒度 = 整模块（已登记的 rehearsal/kb-seeds 后续新增裸写不再红）→ `checks/gates/company-root-carriers.mjs`、`tools/lib/carrier-registry.mjs`
- [policy] **`symlink-prefix` 变体在 4 消费者契约里只断言 `prd-gate` deny**，读写面同判据由路径矩阵单独覆盖 → `tests/host/contract/structure-agreement.spec.ts`、`tests/host/contract/file-shape-agreement.spec.ts`
