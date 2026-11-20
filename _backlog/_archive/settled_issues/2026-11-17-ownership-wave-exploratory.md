---
status: 已结
opened: 2026-11-17
---

# 推敲：归属波次（挪目录 + 打扫卫生）的 exploratory test

> 立卡：2026-11-17 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent（独立盲审）— 2026-11-20 独立只读子代理复核：十假设全部判决、10 张 BUG-202..211 已修且证据齐（`eccd5f16`）、去向 Note 成立，无假交付；索引漂移（bugs/README 5 张/P3）与未跑面 owner 同变更修正
>
> **结论/去向**：implementation — 本卡执行 Round 94–96 的探索与证据（发现缺陷另开 [_backlog/bugs/](../../bugs/README.md) 卡；编号唯一源 = [bugs/README](../../bugs/README.md) 的 Next，2026-11-17 = 202）；本卡不改产品代码。决策记忆 = [C12 修复批次 Note](../../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)；产出 10 张 BUG-202..211 全部已修并迁 [fixed_bugs](../fixed_bugs/)。
>
> **收口（2026-11-20）**：Round 94–96 三面齐跑，C12-1..C12-10 全部判决；10 张 P2 卡由 2026-11-17 修复轮修复（`eccd5f16`）并迁 [fixed_bugs](../fixed_bugs/)。未跑面 = clean worktree、`pnpm setup` 独立跑、live 模型、Windows，以及 C12-4 的反向负控、验收 2 的 old→new 持久映射、验收 4 的 37 个卫生提交逐条分类（owner = 下一轮 exploratory/用户点名；C12-6/C12-8 的未证部分按 `部分确认` 保留，不升级为已证）。
>
> **授权边界**：静态 / keyless / 真入口 / 隔离 workspace+home 可自主；9 条安装形状 lane 与 clean worktree 按轮实跑；真模型 / 真页面只在需要时小预算。不修产品代码；不改 vendor。
>
> **前身**：[2026-11-12 深面持续探索](2026-11-12-deep-surface-continuous-bug-hunt.md) 于 2026-11-17 归档（C1–C11 + 93 轮）。本卡只承接 focus v7 = C12 归属波次；旧卡的 C1–C11 结论不重开，只在相交处引用。

## 问题与期望结果

2026-11-16/17 的归属波次把 63 个 lib 按「跨面地基 / judge / show / 测试专属」重分（`2450d0ef`，551 个文件改引用），又跟了 6 个单件搬移、依赖方向守卫、清单口径改版、覆盖率基线/豁免调整、11 条 lane `ciSafe:false`、`_dist` 重打与 shipped 注释清零。**这不是一次纯搬移**：同一波里被改的还有「绿」的制造者——守卫的扫描面、计数口径、基线/地板、CI 声明、发布字节、以及 agent 读的合同/Note。

`pnpm test` / `pnpm verify` 全绿证明「跑过的没红」，不证明：守卫没空转、数字仍同义、未跑档仍能跑、发布字节与源码同源、卫生提交没改规则。**本卡用 exploratory test 打这个差**：每轮选一个子面，先写可证伪假设与独立 oracle，再做负控与真入口，最后开缺陷卡或写观察。

**期望结果：** 每轮有：选面理由、假设表（独立 oracle）、实跑证据、H 判决（confirmed / refuted / unverified）、缺陷卡或观察、未跑面与 owner。不写「没有 bug」；单场真入口不写稳定。

**当前基线（2026-11-17 13:38，立卡时实测）：** `pnpm test` 256 files / 2170 tests；`pnpm verify` ALL PASS（2 门无对象；surface-coverage ×1954 / gate-wiring 75）；`pnpm typecheck` exit 0；活跃缺陷 0（BUG-184..201 已修）；version 0.11.9；census 30 冒烟 / 66 探针 / 75 门禁 / 256 spec / 10 门禁自测；INDEX 32 = 30 assets + 2 runners；coverage 197 文件 / 6 豁免（轮首重跑）。

## 波次账本（wave ledger）

`ce7a1a0b..HEAD` = 44 个提交 = **7 个搬移提交**（77 renames / 668 文件 slot）+ **37 个卫生/口径/守卫/发布/CI/合同/收据提交**。

### 搬移提交

| 提交 | 搬了什么 | renames / files | 声明的等价或理由 | C12 要另证的变量 |
|---|---|---|---|---|
| `d64e8430` | 7 件探针 → `probes/analyze/`；零漂移工具 → `checks/audit/` | 8 / 41 | 入口总数不变；`MAX_PROBES` 59→66 是分类迁移 | 探针真入口；零漂移工具的真用法 |
| `2450d0ef` | 63 个 lib → `tools/lib/{core,company,repo,release,session,probe}` / `checks/lib` / `probes/lib` / `tests/support` | 63 / 551 | 按归属分层；依赖方向进守卫 | 依赖方向、覆盖率面、类型面、真入口 |
| `e27a5318` | mutation 负例助手 → `tests/support/mutation.mjs` | 1 / 3 | 只有 tests/checks 消费 | 例外表 / 扫描面 |
| `439451cc` | pin 常量 → `tools/lib/core/pin.mjs` | 1 / 12 | 跨面共享，不是 judge 判据 | 覆盖率统计面 + 豁免 |
| `d9f634a9` | candidate-scan → `tools/lib/company/candidate-scan.mjs` | 1 / 6 | judge / show / tests 共用 | 基线键、消费者计数 |
| `b918abd3` | delegation-model → `tools/lib/company/delegation-model.mjs` | 1 / 32 | 同上 | 基线键、preset 面 |
| `4e1c0579` | compat-tags → `tools/lib/core/compat-tags.json`；coverage-baseline → `checks/lib/coverage-baseline.json` | 2 / 23 | 共享台账 / judge 基线 | 路径字面量守卫的扫描面 |

### 卫生提交（按主产物粗分）

| 组 | 代表提交 | 数量 | 为什么进 C12 |
|---|---|---|---|
| 指针/真相清扫 | `e52d20c9` `f3473f96` `3a99f0ed` `8cf8fd19` `37a4db98` `7a46c79f` | 6 | 「零行为」是自称；数字/规则/表的改动要逐 hunk 分类 |
| 清单/计数 | `0c8063c2` `01e32356` | 2 | 口径变了；同名的数不再同义 |
| 基线/覆盖 | `ca8e0e0f` `e56a637a` | 2 | 键、豁免、地板都动过 |
| 守卫 | `9b2485d1` `726f373f` `cc6d7542` `a6f09699` | 4 | 新判据的扫描面本身要负控 |
| 发布字节 | `f8d0f50c` `bfe316e6` `d7f0776c` `e0e8aa41` | 4 | 源码面 / tarball / 安装形状是三个形状 |
| CI | `e724da86` `9279bf30` | 2 | 11 条 lane 从「红」变「不跑」 |
| 冻结副本 | `0f416147` | 1 | 横幅 + MANIFEST 指纹 |
| 合同/方向/说明 | `14e1558a` `383aa5b8` `bfc44ede` `c0e982b1` `4844860c` `787585a5` `43d8ebda` `9c6535fd` `ac147a0c` | 9 | 声明本身就是 agent 的输入 |
| 收据/归档 | `c0334ae0` `92896f40` `52613a33` `b67228b4` `291f4b2a` `12af312b` `620507ec` | 7 | 只读；不作证据，只作「声称」 |

### 为什么 regression 抓不到（本波已有六条实证）

- `9b2485d1`：lib 拆组后 `tools/lib` 的 keyless 守卫**只扫顶层**，空转仍绿；修的是守卫自身的扫描面。
- `f3473f96`：`face-boundaries` 起初只扫 lib，漏掉 operate→judge 的入口层边；发现方式是读代码，不是跑测试。
- `2450d0ef`：按「消费者分类」把 repo-markdown 迁 `checks/lib` **实测红**（共享地基自包含），且 `findRepositoryRoot` 暴露「按目录深度算仓根」的旧假设。
- `e56a637a`：`ledger.ts` 分支覆盖 100% 只在暖 dev 树成立；冷 CI 94%。暖树本地永远绿。
- `bfe316e6` / `d7f0776c`：改 shipped src 注释会让 `_dist` 漂移，先回退、再「改注释 + 重打」同批落地。
- `8cf8fd19`：波次收口后独立盲审仍抓出 3 条 declaration blocker（含一个不实数字、一个 MANIFEST 自相矛盾）。

**结论：** 主风险不是「文件没搬对」，而是**「绿」的制造者被一起改了**——守卫、计数、基线、CI 声明、发布字节、以及 agent 读的合同/Note。C12 因此把 exploratory test 的单位从「面」换成「声明」：每条声明 × 实盘 × 门禁扫描面 × 负控 × 真入口。

## C12 的六个子面

| ID | 子面 | 问题 | oracle（不拿实现当 oracle） |
|---|---|---|---|
| N1 | **归属 / 依赖方向** | 声明方向 × 真实 import 图是否一致；守卫是否只扫了 lib、漏了入口层、漏了计算型 import/路径字面量；新家是否仍被旧面反向依赖 | [surface-contract](../../../docs/surface-contract.md) 的方向表 + 独立解析（静/动 import、re-export、spawn/读盘字面量）+ 父提交树；负控 = 在**未覆盖形式**里加一条违规边，看守卫是否真红 |
| N2 | **清单 / 口径** | INDEX 32/8/67/19、CENSUS 30/66/75/256/10、`MAX_PROBES=66`、`MAX_GATES=75`、无消费者 57 是否仍按声明定义从盘面重算；搬移件是否被双计/漏计；lib 是否被当成入口/探针 | 独立枚举（`git ls-files`、目录、注册表、生成器双跑）+ 定义表（asset/runner/probe/fixture/tool/query）+ 波次前基线；负控 = 在 `probes/lib` 放非探针（计数不变）/ 在探针域放新探针（计数 +1 且 cap 红） |
| N3 | **基线 / 豁免 / 阈值** | 覆盖率键迁移、6 条豁免、`ledger.ts` 地板 100→94、vitest include 变化：哪些是搬移等价、哪些是冷环境实测、哪些是静默降标；被豁免的模块是否在搬移后失去覆盖 | 父提交基线 vs HEAD 逐键对比 + 冷/暖两形状（跳过 dev-only spec）+ 豁免 `removeWhen`；负控 = 覆盖目录加 0% 新文件 → ratchet 红；删豁免 → 红；抬/降地板 → 红 |
| N4 | **卫生清扫的语义面** | 自称「零行为」的提交有没有改规则、数字、例外表、允许清单、删除行；被删的数字是「不实」还是「测不出来」；规则改动有没有决定/Note | 提交正文/Note 的声称 × diff 逐 hunk 分类（pointer-only / semantic）+ 独立重算数字 + 现行合同；负控 = 把一条真规则改错，看现有门禁是否红 |
| N5 | **发布字节 / 安装形状** | `_dist` tarball / 生成手册 / 冻结副本 MANIFEST / shipped 注释是否与源码面同源；`cordis.patch.yml` 的 B1 是否真随重打落地；安装副本是否仍指旧家 | `pnpm release --check` + `tar -tzf` 逐条 + 源码/产物字节对比 + MANIFEST 链自洽；负控 = 改一个 shipped 源文件不重打 → dist 指纹门必须红 |
| N6 | **真入口 / 未跑档** | 9 条安装形状 weekly lane（concurrent-home / external-workspace / interrupted-install / isolation-matrix / multi-install / permissions-recovery / profile-row / revoke-recovery / upgrade-while-running）在 lib 搬移后没有 HEAD 实跑证据，CI 又按 `ciSafe:false` 跳过；4 件搬移探针同样没有 HEAD 实跑证据；clean worktree 未跑 | 退出码 + 启动横幅 + 真安装/真会话；父提交对照；clean worktree 与暖树对照；负控 = 弄坏一个被搬 lib 的 import，看哪条入口红（都不红 = 入口没有真正消费它） |

## 首轮假设（先写死，2026-11-17）

| ID | 假设 | oracle | 入口 |
|---|---|---|---|
| C12-1 | 7 个搬移提交的旧家仍被**活的 executable 载体**引用（不是解释器、不是 frozen） | 77 renames × 全 tracked 载体；分类 live/frozen/fixture/deliberate/generated/shipped/ci/instructional；粗扫 9 文件命中要逐条判 | `git grep -F` 旧路径、`runtime/tmp/c12/` |
| C12-2 | `face-boundaries` 的扫描面不足以支撑「依赖方向已守住」：计算型 import、非字面量路径、入口层 / `run/` / CI 未覆盖 | 守卫源码 × 合同方向表 × 6 文件/10 条 `unresolvedImports` 实测；负控 = 在未覆盖形式里加违规边 | [face-boundaries.spec.ts](../../../tests/repo/structure/face-boundaries.spec.ts)、[keyless-imports.mjs](../../../tests/support/keyless-imports.mjs) |
| C12-3 | `refactor-drift --hashes` 的判别力低于它的名字：`bodyHash()` 取 `titlePath`，不是测试体；改断言而标题不变 → 仍 `ALL PASS 零测试体改动` | 读实现 + 合成 vitest JSON（同 `titlePath`、不同 `failureMessages`）实跑；见预检 | [refactor-drift-audit.mjs](../../../checks/audit/refactor-drift-audit.mjs) |
| C12-4 | INDEX/CENSUS 的公开数字至少一处与独立枚举不一致，或同名不同义（asset/runner/probe/fixture、tests/checks 收编） | 生成器双跑 + 独立枚举 + 波次前基线；负控 = 非探针/新探针样本 | [checks/INDEX](../../../checks/INDEX.generated.md)、[CENSUS](../../../tests/CENSUS.generated.md)、[asset-lanes.mjs](../../../tools/lib/core/asset-lanes.mjs) |
| C12-5 | 覆盖率基线/豁免里至少一条把「搬移造成的覆盖下降」记成了「冷环境」或「无可测分支」 | 父提交键值 vs HEAD；暖/冷两形状；逐条读 `reason`/`removeWhen`；负控 = 0% 新文件、删豁免 | [coverage-baseline.json](../../../checks/lib/coverage-baseline.json)、[coverage-ratchet.mjs](../../../checks/audit/coverage-ratchet.mjs) |
| C12-6 | 至少一条「零行为」卫生提交改了语义（规则/数字/例外/允许清单/删除行），且没有决定记录 | 逐 hunk 分类 + 数字重算 + 合同对读；负控 = 改错一条规则看门禁是否红 | `e52d20c9` `f3473f96` `8cf8fd19` `3a99f0ed` `7a46c79f` `37a4db98` |
| C12-7 | 11 条 `ciSafe:false` 里至少一条是「搬移/路径问题」而不是「干净 CI 无安装态」；或者 9 条未跑档在 HEAD 上会红 | 逐条在隔离 home 实跑 + 父提交对照 + 读失败首行（缺安装态 vs MODULE_NOT_FOUND） | [asset-lanes.mjs](../../../tools/lib/core/asset-lanes.mjs)、`checks/lanes/` |
| C12-8 | `_dist` / 安装手册 / 冻结副本 / shipped 注释至少一处与源码面不同源（旧路径、旧计数、旧 MANIFEST 链） | `pnpm release --check` + `tar -tzf` + 字节对比 + MANIFEST 自洽；负控 = 改源不重打 | `_dist/`、[release.entry](../../../checks/lanes/release.entry.mjs) |
| C12-9 | 4 件搬移探针（ask-latency / explore-evidence / propose-sampler / session-log-export）在 HEAD 上入口不通，或至少没有可复跑的实跑证据 | 隔离 home 最小入口；父提交对照；不能跑就写「不能跑」的证据 | `probes/analyze/` |
| C12-10 | clean worktree 与暖树分叉：暖树的空目录/残留产物让 verify 或某入口假绿 | `git worktree` + 同 store 安装或最小依赖；与暖树同命令对照；负控 = 删一个只存在于暖树的路径 | `pnpm verify` / `pnpm test` / 入口 |

## 预检坐标（只读探查，2026-11-17；是起点，不是本轮结论）

| # | 载体 | 预检看到什么 | 风险类 | 首轮怎么证伪 |
|---|---|---|---|---|
| 1 | [refactor-drift-audit.mjs](../../../checks/audit/refactor-drift-audit.mjs) | `bodyHash()` 取 `assertion.titlePath`；合成样本（同 `titlePath`、不同 `failureMessages`）→ `--compare` 仍 `ALL PASS 零测试体改动` | oracle 名 > 面 | 已用 runtime/tmp/c12-pre/ 的合成样本复现（`--compare` → ALL PASS）；首轮开卡（判 P2）并写明它不能证测试体 |
| 2 | [face-boundaries.spec.ts](../../../tests/repo/structure/face-boundaries.spec.ts) | 只用 `parsed.imports`；`parseKeylessImports` 另返回 `unresolvedImports`，spec 不读。全树实测 6 文件/10 条计算型边（含 replay 的 built presence 路径；其余 vendor/package） | 守卫盲区 | 负控 = 在扫描树加一条计算型违规边；若仍绿 → 缺口 |
| 3 | [asset-lanes.mjs](../../../tools/lib/core/asset-lanes.mjs) | `probes/**` 整片 `coveredBy: verify`；verify 不执行探针。7 件搬移探针里只有 orient / diagnose / notes-audit 在 Note 里实跑过 | 未跑档 | 4 件逐条最小入口；不能跑写理由 |
| 4 | [asset-lanes.mjs](../../../tools/lib/core/asset-lanes.mjs) | 11 条 `ciSafe:false`；cleanup Note 的发布验收覆盖 company-entry / preset，其余 9 条安装形状 lane 没有 HEAD 实跑记录 | 未跑档制度化 | 9 条隔离 home 实跑，或按预算抽样 + 未跑清单 |
| 5 | [coverage-baseline.json](../../../checks/lib/coverage-baseline.json) | 197 文件 / 6 豁免；4 条豁免是搬移件或新家（carrier-registry / diagnosis / probe-window / pin）；`ledger.ts` 地板 100→94 只在冷环境成立 | 静默降标 | 父提交逐键对比 + 冷/暖两形状 |
| 6 | [CENSUS](../../../tests/CENSUS.generated.md) / [INDEX](../../../checks/INDEX.generated.md) | 口径在波次内改过（asset/runner/fixture）；`MAX_PROBES` 59→66；`8cf8fd19` 手改 CENSUS 消费者 1→0 / 无消费者 56→57 | 口径漂移 | 独立枚举 + 生成器双跑；非探针/新探针负控 |
| 7 | `_dist/` / [cordis.patch.yml](../../../packages/company-pack/cordis.patch.yml) | `bfe316e6` 回退 shipped 注释 → `d7f0776c` 清零并重打 → `e0e8aa41` 再打 @`9279bf30`；B1 曾被推迟到「下次重打」 | 发布漂移 | `pnpm release --check` + tarball 逐条 + 源/产物字节对比 |
| 8 | 前身卡 + [issues/README](../../issues/README.md) | 调整前基线仍写 253/2153、Next 192、活跃 10；实测 256/2170、Next 202、活跃 0 | 声明漂移 | 已在立卡时修正；后续按轮重算 |

## 方法（每轮固定）

0. **取 wave set**：先按 `git log <wave-base>..HEAD` 把提交按「搬移 / 卫生 / 口径 / 基线 / 守卫 / 发布 / CI / 合同 / 收据」分类；每个搬移提交附 `git show --name-status -M` 的 old→new 映射与 changed files。提交正文 / Note / 收据只算「声称」，不作证据；波次前基线落 `runtime/tmp/c12/`（gitignored）。**C12 的 wave base = `ce7a1a0b`**（P0 合同之前）。
1. **选面 + 写期望**：从 N1–N6 选一个面，先写 8–12 条可证伪假设与独立 oracle（合同 / 父提交 / 盘面枚举 / 真入口），不拿实现当 oracle。
2. **静态取证**：读代码、测试、probe、Note 的「未跑 / 剩余风险」；把引用按 live / frozen / fixture / deliberate / **generated / shipped / ci / instructional** 分类；建「声明 → 门禁 → 扫描面 → 负控」矩阵，写不出扫描面或负控的格直接标 `unverified`。
3. **对抗夹具 + 负控**：优先 keyless 真文件 / 真 Cordis / 真装配；为每条关键断言做一次最小破坏（破坏 → 红 → 还原 → 绿）。**另测「空扫」与「宽分类」**：把扫描对象移走/清空，门禁应红而不是绿；把一条 glob 放宽到能吞掉整棵树，门禁应点名而不是静默。
4. **真实入口**：[preset.entry](../../../checks/lanes/preset.entry.mjs) / [client-load.entry](../../../checks/lanes/client-load.entry.mjs) / [release.entry](../../../checks/lanes/release.entry.mjs) / [company-entry.entry](../../../checks/lanes/company-entry.entry.mjs) 按面选择；另加 `pnpm company`、`pnpm setup`、orient / diagnose / notes:audit、hooks / pre-push、9 条安装形状 lane。`--help` / `--check` 只算前置。**clean worktree 与暖树是同一条判据的两个形状**，不能只跑暖树。
5. **判决 + 证据**：每格 PASS / FAIL / 未证 + 原因；FAIL 立刻开 `_backlog/bugs/` 卡（编号 = [bugs/README](../../bugs/README.md) 的 Next，当前 202）；观察标 owner。**每个格带「旧家 → 新家」「载体分类」「等价判据」「负控」「声明 → 门禁 → 扫描面」**——写不全的格不算 PASS。
6. **回填**：本卡追加 `## Round N`（已跑面、H 判决、BUG 卡、未跑面）；不覆盖旧结论；证据留 `runtime/tmp/c12/`（gitignored）；新探索脚本升常驻必须登记 [asset-lanes.mjs](../../../tools/lib/core/asset-lanes.mjs)。

## 轮次与停止

| 轮 | 面 | 内容 | 成本 |
|---|---|---|---|
| Round 94 | N1 / N2 / N4 | wave ledger；旧家全量 sweep + 载体分类；face-boundaries 负控；INDEX/CENSUS 独立重算；卫生提交逐 hunk 分类；refactor-drift oracle 审计 | keyless 静态，90 分钟 |
| Round 95 | N3 / N5 | 覆盖率父/子逐键 + 冷/暖两形状；豁免逐条；dist / tarball / 手册 / 冻结副本 / MANIFEST；`release --check` + 负控 | keyless + 构建档，90 分钟 |
| Round 96 | N6 | 9 条安装形状 lane + 4 件探针 + `pnpm company` / `pnpm setup` + clean worktree；父提交对照 | 真入口，120 分钟；无 live 模型则写未跑 |

**停止规则：** 3 轮后无新材料 → 收口；单轮无 material → 下一轮只补未跑轴；用户叫停优先。

## 证据、判据与处置

- **oracle 阶梯**（从强到弱）：① 每个 move 的父提交树；② 波次前声明（合同 / README / 计数 / 基线）；③ 独立枚举（`git ls-files`、AST import 图、workflow 原文、tarball）；④ 门禁负控（破坏 / 空扫 / 宽分类）；⑤ 真入口（退出码、横幅、产物）；⑥ `pnpm test` / `pnpm verify` 全绿——**只是底线，不是 oracle**。
- **载体分类**：live（agent / 人会照着做）/ frozen（记录当时事实）/ fixture（负向样本）/ deliberate（有意保留，须有 Note 与「何时修」）；C12 另加 generated（INDEX/CENSUS/手册/MANIFEST，只许生成器写）、shipped（进 tarball 的字节）、ci（只在 CI 形状成立）、instructional（skills/presets/docs/AGENTS/卡，agent 会照着执行）。
- **三种假绿**：① 空扫——守卫没扫到对象仍 PASS（`9b2485d1`）；② 宽分类——glob 吞掉整棵树，未分类不再出现；③ 未跑档——`ciSafe:false` / `coveredBy` / `--help` / weekly-only 被当成已跑。每种都要有反例或负控。
- **卫生提交分类**：pointer-only（路径 / 链接 / 名字）vs semantic（规则 / 数字 / 例外表 / 允许清单 / 删除行）。semantic 必须有决定记录或缺陷卡；没有就写观察 + owner。
- **证据落点**：卡内 Round + `runtime/tmp/c12/`（gitignored）+ 真页面/会话 id；文件面记路径/大小/哈希/mtime；命令面记原文。
- **处置**：材料性真缺陷 → `_backlog/bugs/` 卡（severity、复现、红→绿、影响面、与哪个 oracle 冲突）；非材料性 → 记录 + 请示；合同/文档漂移 → 观察 + owner；测试资产缺口 → 记缺口与建议门，不碰产品代码。
- **不写「没有 bug」**：只写已跑面未见 / 未跑面保留。

## 预算与停止

- 每轮 ≤ 90 分钟（Round 96 ≤ 120）；keyless 优先；证据 ≤ 8 MiB。
- live 模型只在「入口真模型行为」需要时用（小预算，隔离 workspace/home）；N1–N5 不需要 live。
- 发现越界写/密钥/真盘污染 → 立即停并报告；单个假设失败不阻塞其余。

## 验收标准

1. N1–N6 每面至少一轮，或逐项写「未跑 + 原因 + owner」；每轮有期望 vs 实测与证据坐标。
2. 每个搬移提交有 old→new 映射；每个格带「旧家 → 新家」「载体分类」「等价判据」「负控」「声明 → 门禁 → 扫描面」。
3. 每个「守卫仍有效 / 声明为真」结论有负控：`node checks/run-gates.mjs` 或对应 spec 先红后绿；空扫守卫另证对象数 > 0；没有负控写 `unverified`。
4. 每个卫生提交有 pointer-only / semantic 分类；semantic 改动有决定/Note 或缺陷卡。
5. 9 条安装形状 lane 与 4 件 analyze 探针逐条实跑，或写「未跑 + 原因」；clean worktree 至少跑一次 `pnpm verify`，并与暖树对照。
6. `node checks/audit/refactor-drift-audit.mjs --hashes` 至少实跑一次，并写明它能证/不能证什么（预检：只证标题，不证测试体）。
7. 发现材料性缺陷 → 开 `_backlog/bugs/` 卡；本卡不改产品代码。
8. 每轮回填 `## Round N`；`pnpm verify` 保持 ALL PASS；`pnpm test` 绿；证据 ≤ 8 MiB。

## 落地证据

- 本卡是 charter / 证据卡，不改产品代码；系统面 = 本卡 + 前身卡归档 + `runtime/tmp/c12-pre/` 预检脚本（gitignored）。
- 立卡时基线（实跑）：`pnpm test` 256 files / 2170 tests；`pnpm verify` ALL PASS（surface-coverage ×1954 / gate-wiring 75）；`pnpm typecheck` exit 0。
- 预检（实跑）：`node checks/audit/refactor-drift-audit.mjs --compare runtime/tmp/c12-pre/before.hashes runtime/tmp/c12-pre/after.hashes` 复现「同标题不同失败信息 → 同一指纹、仍报 ALL PASS」；`node runtime/tmp/c12-pre/unresolved-imports.mjs` → 6 文件 / 10 条计算型边；`node runtime/tmp/c12-pre/old-home-sweep.mjs` → 77 renames / 9 live 文件命中（研究材料与 implemented Note 为主，无 live executable 命中）。

## 关闭条件

- N1–N6 每面至少一轮，或逐项写未跑原因；C12-1..C12-10 全部判决。
- 3 轮内无新材料 → 收口；未跑档保留并标 owner。
- 所有 finding 已分诊（BUG 卡 / 观察 / deliberate）；不写「没有 bug」。
- `pnpm verify` + `pnpm test` 绿；审查记录齐后归档。

## Round 94（2026-11-17 · N1 / N2 / N4 · 静态与负控）

**状态：** keyless 实跑；本轮不开 live。

**选面：** 先打「守卫/声明」而不是旧指针：搬移的机械面看起来是干净的，真正的风险在判据面。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C12-1 旧家仍被活载体引用 | **refuted（live executable）/ 守卫面 confirmed** | 77 renames × live 顶层粗扫：9 个 live 文件命中，全部是研究材料、implemented Note 散文、一个守卫的负例注释；无 live executable 命中。但脚本注释/新家注释的守卫面有缺口 → [BUG-207](../fixed_bugs/BUG-207-retired-path-misses-wave-renames.md)、[BUG-205](../fixed_bugs/BUG-205-live-pointer-faces-miss-moved-libs.md) |
| C12-2 face-boundaries 扫描面 | **confirmed** | 计算型 import 注入 `probes/lib` 后 spec 仍 4 passed；`checks/lib`/`probes/lib` 无 keyless 图兜底 → [BUG-208](../fixed_bugs/BUG-208-face-boundaries-computed-imports.md) |
| C12-3 refactor-drift 判别力 | **confirmed** | 同 `titlePath` 不同失败信息 → 同一指纹且 `ALL PASS 零测试体改动`；重复行 2→1 → 仍 `零删除` → [BUG-202](../fixed_bugs/BUG-202-refactor-drift-title-hash-and-duplicate-mask.md) |
| C12-4 INDEX / CENSUS 口径 | **refuted** | 独立枚举：ASSETS 30 / PROBES 66 / lanes 32（30 assets + 2 runners）/ gates 75 / audit 8 / spec 256 / tests/checks 10；INDEX 32 = 30+2、probes 67 = 66+1、tools 19 = 17+1+1 均对盘 |
| C12-5 覆盖率基线 / 豁免 | **confirmed** | 改名合成样本 old 100/100 → new 85/75：`violations=[]`；暖树 `ledger.ts` 100/100 vs 地板 94 → [BUG-203](../fixed_bugs/BUG-203-coverage-ratchet-rename-resets-floor.md)、[BUG-204](../fixed_bugs/BUG-204-ledger-branches-floor-cold-only.md) |
| C12-6 卫生提交的语义面 | **部分 / doc confirmed** | `e52d20c9` / `3a99f0ed` / `7a46c79f` 逐 hunk 看只动指针/红态引用；但 live 声明仍按旧树写 → [BUG-209](../fixed_bugs/BUG-209-live-declarations-stale-after-split.md)、[BUG-211](../fixed_bugs/BUG-211-tools-readme-lib-purity-contradiction.md) |
| C12-9 4 件搬移探针 | **refuted** | `ask-latency` / `propose-sampler` / `explore-evidence` / `session-log-export` 均 exit 0（export 3656 份 / 1 无日志）；`orient` / `diagnose` / `notes-audit` 亦 exit 0；但 pre-push 不执行它们 → [BUG-206](../fixed_bugs/BUG-206-coveredby-evidence-does-not-execute.md) |
| C12-10 clean worktree | **unrun** | 成本高且本轮是 docs/cards 变更；保留到下一轮或用户点名的 clean clone |

**本轮负控（实跑）：**

| 负控 | 结果 |
|---|---|
| `tools/lib/core/asset-lanes.mjs` 注入陈旧 spec 注释 → `live-pointer-paths.spec` | 8 passed（绿）→ 守卫面缺口 |
| `probes/lib/orient.mjs` 注入计算型反向 import → `face-boundaries.spec` | 4 passed（绿）→ 守卫面缺口 |
| `tools/lib/core/asset-lanes.mjs` 注入 tools/observe 注释 → `run-gates` | `retired-path ×294 + 555 注释面` PASS（绿）→ 退役表缺口 |
| 探针注入不存在 import → pre-push + `run-gates` | 均 PASS；探针本身 `ERR_MODULE_NOT_FOUND` → coveredBy 空证据 |

**证据坐标：** `runtime/tmp/c12-pre/`（refactor-drift 合成样本、import 图、77 renames 粗扫）、
`runtime/tmp/c12/neg-*.log`、`runtime/tmp/c12/import-graph.mjs`。

## Round 95（2026-11-17 · N3 / N5 · 基线 / 发布字节）

**状态：** keyless + 构建产物只读；未重打 `_dist`。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C12-5 豁免与地板 | **confirmed** | 波次前基线 197 文件 / 5 豁免；HEAD 197 / 6（新增 `pin`）；`carrier-registry` / `diagnosis` / `probe-window` 在波次前已是豁免，非搬移造成；`ledger.ts` 100→94 是唯一数值降标 → [BUG-204](../fixed_bugs/BUG-204-ledger-branches-floor-cold-only.md) |
| C12-8 发布字节同源 | **部分 confirmed** | `_dist` tarball 旧家命中 0；安装手册旧家 0；MANIFEST 34 件 / README blob 与 `deployed_sha` 一致；但 shipped 的 3 处注释指向不随包的 `tools/lib/company/delegation-model.mjs` → [BUG-210](../fixed_bugs/BUG-210-shipped-comments-dev-only-paths.md) |
| `release --check` | **观察（非产品缺陷）** | HEAD 上 exit 1：manifest `gitSha` 620507ec ≠ HEAD；本卡/前身卡是 docs-only 提交，需手工 `--stamp`；不是本波搬移行为 |
| 覆盖率基线键迁移 | **pass** | 197 键全在盘；`delegation-model` / `candidate-scan` 历史值保留；无其它键丢失 |

## Round 96（2026-11-17 · N6 · 真入口 / 未跑档）

**状态：** 真入口实跑；隔离 home/workspace。

| 入口 | 结果 |
|---|---|
| 9 条安装形状 lane（concurrent-home / external-workspace / revoke-recovery / profile-row / permissions-recovery / interrupted-install / multi-install / upgrade-while-running / isolation-matrix） | 全部 `ALL PASS` / exit 0 |
| 7 件 analyze 探针（4 件搬移件 + orient / diagnose / notes-audit） | 全部 exit 0 |
| `pnpm smoke:all` | 17 PASS / 0 FAIL / 13 SKIP（真模型 / 真浏览器 / 手动档） |
| `pnpm company` / `pnpm setup` 独立跑 | 未单独跑；真 host 启动已由上述 lane 覆盖，setup 留待 clean clone 轮 |
| clean worktree | **unrun**（C12-10 保留） |

**判决：** C12-7 `ciSafe:false` 的 11 条里，实跑的 9 条安装形状 lane 全 PASS；没有「搬移/路径问题被
`ciSafe:false` 掩盖」的证据，假设 **refuted（本机）**。C12-9 4 件探针 **refuted**。

**未跑档（2026-11-20 收口时确权）：** clean worktree（C12-10）、`pnpm setup` 独立跑、live 模型、Windows 仍无实跑；owner = 下一轮 exploratory/用户点名，触发 = 下次 clean clone 或发布前复查。C12-4 的探测域负控与验收 2/4 的持久映射/逐条分类未补，记为 `unverified`，不冒充已证。

**证据坐标：** `runtime/tmp/c12/lane-*.log`、`runtime/tmp/c12/smoke-all.log`、`runtime/tmp/c12/coverage-ratchet.log`。

## 判决汇总

| ID | 判决 | BUG |
|---|---|---|
| C12-1 | refuted（live）/ 守卫面 confirmed | 205 / 207 |
| C12-2 | confirmed | 208 |
| C12-3 | confirmed | 202 |
| C12-4 | refuted | — |
| C12-5 | confirmed | 203 / 204 |
| C12-6 | 部分 / doc confirmed | 209 / 211 |
| C12-7 | refuted（本机 9 条 lane） | — |
| C12-8 | 部分 confirmed | 210 |
| C12-9 | refuted | 206（覆盖机制，不是探针本身） |
| C12-10 | unrun | — |

**本轮共开 10 张 P2 卡（BUG-202..211）**，当轮全部 `调查中`、不修产品代码（2026-11-20 收口：10 张已全部修复并迁 [fixed_bugs](../fixed_bugs/)）；未跑面 = clean worktree /
`pnpm setup` 独立跑 / live 模型 / Windows（owner = 下一轮 exploratory/用户点名；不写成已覆盖）。没有「没有 bug」的结论。

## 执行记录

- 2026-11-17 ｜ 立卡（focus v7）｜ 本卡 + 前身卡归档 + 120 个指向旧卡的链接修复 ｜ 基线 256/2170、verify ALL PASS、typecheck exit 0；预检 3 条（refactor-drift 标题指纹 / 6 文件计算型 import / 9 live 文件命中）｜ `pnpm verify` ALL PASS ｜ Round 94–96 未开，等用户 push。
- 2026-11-17 ｜ Round 94–96 ｜ `runtime/tmp/c12/` + `runtime/tmp/c12-pre/` ｜ 10 条假设判决 + 4 条守卫负控 + 9 条安装形状 lane + 7 件探针 + smoke:all | 10 张 BUG-202..211（调查中，不修） ｜ `pnpm verify` ALL PASS；`pnpm test` 256/2170；`pnpm typecheck` exit 0；smoke:all 17 PASS / 0 FAIL / 13 SKIP ｜ clean worktree / setup / live 未跑。
- 每轮：日期 ｜ 面 ｜ 命令/会话 id ｜ 期望 vs 实测 ｜ 证据坐标 ｜ 判定。
- 2026-11-20 ｜ 收口归档 ｜ 十假设判决复核 + 索引漂移修正 + 卡内/入链深度修正 ｜ 10 张 BUG-202..211 已修（`eccd5f16`）并迁 fixed_bugs；去向 = 批次 Note ｜ `pnpm verify` ALL PASS ｜ 审查：agent（独立盲审）。
