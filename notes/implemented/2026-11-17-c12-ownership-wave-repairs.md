# 2026-11-17 · C12 归属波次的 10 张缺陷：把「绿」的制造者一并修好

状态：implemented（2026-11-17 修复中；本 Note 在代码提交时点为进行中，归档/逐卡证据/盲审结论随收口提交回填；任务源 = 用户「_backlog/bugs 里面有最近 exploratory test 发现的 bugs，你琢磨一下，看看是否能系统性修起来。计划有了后 setup goal 逐步按 REPO 的流程来推进。」）

> 上游 = [C12 归属波次探索卡](../../_backlog/issues/2026-11-17-ownership-wave-exploratory.md) + [10 张缺陷卡](../../_backlog/bugs/README.md)（BUG-202..211）。
> 本批不是十个症状补丁：归属波次改了 63 个 lib、77 个 renames 的落点，**「绿」的制造者**（oracle 判别面、覆盖率棘轮、守卫扫描面、live/shipped 声明）没有随迁。

## 决定

1. **oracle 的名字必须与判别面一致（BUG-202）**：`--hashes` 的指纹改成**测试体 AST 归一化哈希**
   （回读 `file.name` 源码，取 `describe`/`it`/`test` 回调体，TypeScript printer + 去注释 + 压空白，
   sha256 截 16 位），不再拿 `titlePath` 冒充测试体；参数化/非字面量标题退回标题指纹并在 stderr
   点名条数。`--compare` 改成**多重集**差（重复行 2→1 判红），纯逻辑搬进
   [`checks/lib/refactor-drift.mjs`](../../checks/lib/refactor-drift.mjs)，CLI 只做跑/读/写。
2. **改名/删除地板必须显式（BUG-203）**：`compareCoverage()` 对「基线键消失」判红
   （`missing-baseline`），改名给 `--rename old=new`（地板取 `max(旧, 新)` 迁到新键），确认删除给
   `--drop old`；`nextBaseline()` 保留未消费旧键，不许一次 `--update` 静默抹掉地板。
3. **冷/暖形状不共用「降标」的单一基线（BUG-204）**：`ledger.ts` 的唯一未覆盖分支是无尾竖线行；
   补一条无盘纯测试把两种行尾都钉住，冷树（3 个 live 用例 skip）也到 100，基线回 100。
   否决「双基线 / 把 live 用例从覆盖率排除」——前者引入第二套事实，后者改变统计语义。
4. **live 载体面按「新家」扩，不按上次事故的清单扩（BUG-205）**：`FACES` 纳入
   `tools/lib`、`checks/lib`、`probes/lib`、`tests/support`，每面收集 0 文件 = 红；
   `doc-grammar` 的负向样本改用现行 spec 路径，不留整文件豁免。
5. **`coveredBy` 必须有执行证据（BUG-206）**：新增
   [`entry-import-graph.spec.ts`](../../tests/repo/structure/entry-import-graph.spec.ts)，对
   `tools/**`、`checks/**`、`probes/**` 的每个 `.mjs` 解析本地静态/字面量动态 import，目标必须是
   普通文件；`probes/**` 的 `coveredBy` 从 `verify` 改成 `coverage:ratchet + verify`，因为
   coverage:ratchet 真跑该 spec。可解析 ≠ 运行时跑通，写进规则 why。
6. **退役面从 git 历史自动推导（BUG-207）**：`retired-path` 用最近 300 提交的
   `git log --diff-filter=RD -M --name-status` 得到旧路径，扫脚本注释面的路径 token；手工表保留
   历史前缀并加自检（`from` 不得仍存在、`to` 必须现行）；`_backlog/**`、`notes/archived/**`、
   `snapshots/**` 冻结；`负例留证` 块与 `FAIL …` 引文行豁免；浅克隆跳过自动面并在 PASS 行点名。
7. **计算型 import 必须有判据（BUG-208）**：`face-boundaries.spec.ts` 读
   `parseKeylessImports().unresolvedImports`，对 `checks/lib`、`checks/gates/lib`、
   `checks/lanes/lib`、`probes/lib`、`tests/support` 断言空集；`tools/lib` 的 3 条 vendor parser
   表达式仍由 `layering.spec.ts` 白名单管辖，两处不重复。
8. **手抄声明能删就删（BUG-209/211）**：`tests/README.md` 删掉手抄面表（含 `lib → replay-smoke`
   歧义句），只留「规则与成员唯一家 = SURFACE_RULES」；`lib-ownership-split` Note 去掉
   `16 件`/`1 件`，改结构口径。`tools/README.md` 的纯度句改成「lib 不直接 import/调用进程与网络；
   真进程/真网络以参数注入（`probe/` 是这一类），仍算 lib」，并明说「靠评审」。
9. **shipped 注释要带「不随包」限定（BUG-210）**：pack 源码里指向 `tools/lib` 子树的注释加
   「不随包分发」限定；新增 [`shipped-comments.spec.ts`](../../tests/repo/pack/shipped-comments.spec.ts)
   按注释块判限定；同批重建 `_dist`（0.11.9 重打），让 tarball 字节与源码同源。

## 输掉的方案

- **把 `--hashes` 改名成「标题指纹」了事**：诚实但 oracle 失去「纯搬移零行为漂移」的主判据；
  测试体 AST 已可 cheaply 得到，放弃它等于把 `toBe→toContain` 类削弱继续留给语义审。
- **对基线键消失只发 note、要求人工迁移地板**：正是 BUG-203 的形状；一次忘记迁移就永久丢地板。
- **给覆盖率做 warm/cold 双基线**：第二套事实必然漂；冷树缺的分支用无盘纯测试补上更便宜。
- **把 63 个 lib 的旧路径逐条写进 `RETIRED_PATH_PREFIXES`**：又一份会漂的手写清单；git 近期历史
  是现成的唯一事实源。
- **给 `coveredBy` 加「执行证明」字段**：把声明面扩得更大；先让 `coverage:ratchet` 真跑入口图 spec，
  成本秒级、复用既有无条件步骤。
- **在 `face-boundaries` 里直接白名单所有 unresolved 表达式**：白名单会给计算型 import 开后门；
  五个面要求空集，`tools/lib` 的 3 条已审阅表达式留在原地。
- **把 `tests/README.md` 的面表改成第二份自动生成表**：生成器本身也是声明；删掉手抄面表，指回唯一源。
- **只改 shipped 注释不重打 `_dist`**：源码/产物不同源，`dist-freshness` 与安装读者都会对不上。

## 状态事实与载体

- **事实**：C12 的 10 张 P2 卡已修复（归档与逐卡证据随收口提交）；共享机制 = 测试体指纹 + 多重集比较、覆盖率改名/删除
  显式化、ledger 冷/暖同形、四个新家的 live 指针面、入口 import 图、退役面 git 自动推导、
  计算型 import 空集、手抄声明删除、shipped 注释限定。
- **唯一入口**：`pnpm coverage:ratchet`（`checks/audit/coverage-ratchet.mjs`）；
  `node checks/audit/refactor-drift-audit.mjs`；`pnpm verify`（`checks/run-gates.mjs`）；
  `pnpm test`（vitest）；`pnpm release --prepare`（`tools/release/release.mjs`）。
- **读载体 / 写载体**：读 = `_backlog/bugs/README.md` 批次表 + 10 张卡 + 本 Note；写 = 新增
  oracle/spec 先判「纯逻辑进 `checks/lib` 还是 CLI」，新增面先改 `SURFACE_RULES` 的 coveredBy
  证明步骤，退役登记优先让 git 历史自动覆盖、手工表只留历史前缀。
- **环境坏法**：指纹退回标题（参数化标题）；入口图只证可解析不证运行时；退役自动面在浅克隆跳过；
  shipped 注释限定靠 spec 判源面，tarball 字节由 `release --prepare` 重建。

## 验证

- 红→绿逐卡证据随收口提交落到 10 张卡的 `## 修复证据`（改动面 / 红 / 绿 / 提交），本 Note 不重复抄命令。
- 代码提交时点（2026-11-17 实跑）：`pnpm verify` ALL PASS（retired-path 自动面 ×259 文件 + 558 脚本注释）；
  `pnpm test` 260 文件 / 2200 tests 全绿；`pnpm typecheck` exit 0；`pnpm lint` 0 warning；
  `pnpm coverage:ratchet` PASS（198 文件；ledger 100/100；`tests/support/keyless-imports.mjs`
  用 `--drop` 显式删除基线键）；`pnpm dup` 0 clones；`pnpm smoke:fast` 4 PASS；
  `pnpm test:checks` 10 PASS；`pnpm release --prepare --force` 重打 0.11.9，
  tarball 里 `tools/lib` 注释的未限定行数 = 0。
- 独立盲审：无本会话历史的只读子代理审代码提交与 10 张卡；结论随收口提交落到各卡状态行（代码提交时点为进行中）。

## 未覆盖轴

- [covered] 结构门禁：`pnpm verify` ALL PASS（含 retired-path 自动面 / surface-coverage / gate-wiring） → `checks/run-gates.mjs`
- [covered] keyless 回归：`pnpm test` 全绿（含新增 oracle / coverage / 入口图 / 声明 spec） → `tests/tools/refactor-drift.spec.ts`
- [covered] 覆盖率棘轮：`pnpm coverage:ratchet` PASS（ledger 100/100；基线键迁移显式） → `checks/lib/coverage-baseline.mjs`
- [covered] 类型面：`pnpm typecheck` exit 0 → `tsconfig.test-harness.json`
- [covered] 发布字节：`pnpm release --prepare` 重打 0.11.9；tarball 的 shipped 注释均带「不随包分发」限定 → `checks/lanes/release.entry.mjs`
- [unprovable] `--hashes` 对参数化/非字面量标题只退回标题指纹，不证测试体 → `checks/lib/refactor-drift.mjs`
- [unprovable] 入口 import 图只证本地目标可解析，不证运行时装配/导出形状 → `tests/repo/structure/entry-import-graph.spec.ts`
- [environment-gap] `retired-path` 的自动推导在浅克隆跳过（CI checkout 默认 depth 1） → `checks/gates/retired-path.mjs`
