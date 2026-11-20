# 2026-11-20 · 公司盘 workspace 文件读取结果

状态：implemented（2026-11-20 落地；验证见下）

上游 = [状态读取 Issue](../../_backlog/_archive/settled_issues/2026-11-20-company-file-read-state.md)。本决定只部分细化[状态根/写gate决定](2026-11-13-state-root-write-gate-sweep.md)的workspace读取结果与五个消费者观察协议；根路径安全、写gate仍由旧Note拥有。补充[后三处直写Note](2026-11-13-last-direct-writers.md)中的bundle-manifest现行读入口形状；不取代其写升级决定。不是新增安全机制或全仓优先级裁定。

## 决定

在 `host/run-bundle/company-root.ts`，workspace读取使用 `readCompanyFile(workspace, rawRel): CompanyFileRead`。它保留原 `ensureCompanyRoot(workspace)` containment、路径规范化与剥 `.dsh-company/` 规则，并返回 `text | missing | unsafe`。已有 `companyFileProblem` 和 `readCompanyText` 从该结果派生，保留其他有损调用者。`readCompanyFileAt(companyHome, rel)` 继续使用确切根、不剥前缀；两种根不可互换。

Startup settings/options、bundle manifest、catalog state、presented ledger 五个状态读取函数各消费一次结果。它们继续拥有JSON解析、schema/版本/legacy、默认值、状态映射、文案和审计策略。参数历史名 companyHome 不改变 catalog/ledger 当前接收workspace的事实。

底层类别是保守分桶而非精确错误原因：`plainFileProblem` 的 lstat 异常可归 missing；打开/读取异常归 unsafe。适用目标文件的确认缺失/路径拒绝不作内容读取，成功拿到的文本按此次结果解析，失败下次调用重新读取。此接口减少重复payload读取与五个调用者的先判再读责任；不构成文件系统原子快照、race修复、I/O性能声明或精确 errno 分类。

## 输掉的方案

- **在每个消费者继续配对 `companyFileProblem` 与 `readCompanyText`**：实测五处各读目标文本两次，且调用者要维护观察顺序；现在的定点反例会抓住任一处恢复配对。
- **把消费者直接改到 `readCompanyFileAt`**：At使用确切companyHome且不剥workspace前缀，也不做workspace containment；会改变输入语义。
- **统一JSON store/schema或重做错误分类**：收益不能证明扩大的发布与领域耦合成本；本变更保留各消费域政策和历史保守类别。

## 状态事实与载体

- 唯一读取owner：`packages/company-pack/src/host/run-bundle/company-root.ts` 的 `readCompanyFile`（workspace）及独立的 `readCompanyFileAt`（exact companyHome）。
- 读取事实：公司盘文件是workspace下 `.dsh-company/` 的普通文件。读载体是五个host状态函数；写载体不变，本决定无写入/持久化协议变化。
- 环境失败：missing/unsafe沿用safe-file/company-root现有分桶；坏JSON与版本含义由每个consumer处理。
- 无模型或Cordis组合行为变化，无外部字节变更承诺。

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| `pnpm test tests/host/contract/file-shape-agreement.spec.ts` — 94/94通过，Vitest 0.109s（命令总时长约0.41s）；五消费者各有parseable坏形状输入。实现前基线45项中五处全因2次/1次读计数失败；后续恢复startup settings旧配对时9个场景失败。临时workspace前缀剥离关闭：94项中52失败，明确包含新合法子路径的前缀断言和五消费者。临时unsafe→missing：startup settings子集10项中3失败（directory、symlink、open-failure）、7通过；其余84项因名称筛选跳过 | deterministic read contract | 三项变异均由现有runner加载；原文件真实读写，断言观察具体类别/字面文本/次数。每次变异已恢复后重跑green |
| `pnpm test tests/host/startup/startup-store.spec.ts tests/host/contract/startup-state-agreement.spec.ts tests/host/run-bundle/bundle-manifest.spec.ts tests/host/ledger/catalog.spec.ts tests/host/contract/ledger-state-agreement.spec.ts` — 5 files / 85 tests passed | deterministic state classification | startup/manifest/catalog/ledger既有missing/unsafe/bad/version矩阵通过 |
| `pnpm typecheck` — 最终通过（含单次故障观察器修正） | type/import | 首次fixture path tuple的两个 `string | undefined`及临时unused import已修复 |
| `pnpm lint && pnpm dup` — 最终0 warnings/errors（420 files），0 clones（141 files） | source conventions | 临时unused import被lint抓红；删除后全绿 |
| `pnpm verify && pnpm notes:audit` — 最终ALL PASS；2个无对象replay freshness门skip；audit死路径/取代缺回链/状态行不符均0 | structural/ownership | 归档中间态曾因未搬路径/已结仍活跃及pack README超1行失败；完成迁移、链接修复、原文合行后全绿 |
| `pnpm test --reporter=dot` — 最终265 files / 2401 tests passed，24.74s | keyless regression | 前一次2400通过、1失败为BUG覆盖生成表的两处行号过期；用 `node tools/repo/bug-coverage.mjs --write` 刷新后同命令全绿 |
| 当前工作树的 `git diff --check` | worktree integrity | trailing whitespace检查通过；保留既有外部HEAD 5ac0446b，不创建/改写提交 |

## 独立语义审与后果

无历史上下文只读审阅者 `d10b9aed-8d56-462d-9687-0e2adcdc0ee0` 对照授权、原Issue验收、合同及HEAD^到工作树差异：0 blocker。五消费者真实调用和完整输入并未缩水；精确目标过滤与call-through落实；未把未完成验收藏入未覆盖轴。单次故障标记和3/7/84计数两条建议均修正并复审通过；其独立R/S/L/B 6文件179项通过。前轮白名单/样本/双向指针/状态阻断已修订；卡和研究现已归档，旧Note保留双向关系。

删掉的是五处重复读取与调用顺序义务；schema、版本、失败文案及未来调用者选择有损视图仍需人工维护。无新增材料性产品异常、runner或门禁；资产为真实文件断言，没有新的运行态操作事实。保留外部提交 `5ac0446b`，其标题“五处”实际只迁四处；本轮未提交补齐startup settings及验证文档，不创建或改写提交。

## 未覆盖轴

- [covered] workspace前缀、反斜杠、根/叶形状与At确切根差异 → `tests/host/contract/file-shape-agreement.spec.ts`
- [covered] 五消费者合法/missing/unsafe/空白/坏JSON、读后变化或删除、读失败、无写回与下次恢复 → `tests/host/contract/file-shape-agreement.spec.ts`
- [policy] symlink/越界和I/O失败仍使用既有unsafe保守分桶；lstat异常仍沿用missing；未新增errno状态 → `packages/company-pack/src/host/fs/safe-file.ts`
- [unprovable] 内容读取至多一次不等于原子filesystem snapshot或无TOCTOU → `packages/company-pack/src/host/run-bundle/company-root.ts`

测试观察器只包裹本spec显式指定的绝对目标路径，成功读与非目标读均call-through；坏形状、首次文本与恢复断言独立来自固定JSON样本。它按 `docs/testing.md` 的有限例外运行，不证明其他I/O API或跨进程行为。
