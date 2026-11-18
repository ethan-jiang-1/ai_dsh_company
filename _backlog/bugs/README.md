# bugs/ · 这次不修的缺陷

当场修掉的不建卡——**仅限非材料性**（判据唯一家 = [章程](../README.md)「缺陷的通道」；材料性修复要请示授权并报留痕）。建卡表示发现时决定这次不修。一文件一张 `BUG-<NNN>-<slug>.md`，新卡与索引行同次新增。同一轮有多张卡（哪怕两张），先按根因聚类并写批次计划（组 / 卡 / 共同根因 / 顺序 / 证据）再逐卡修——逐症状打补丁会把同一根因修三遍；**批次是本轮选择一起修的子集，不是所有活跃卡**。**修复流程 = [诊断与修复缺陷](../methods/bug-fix.md)**；本文件管编号、清单、模板与流水，不重复方法正文。

**下一个缺陷号**：Next BUG ID = 233；已分配 BUG-001..232。本目录与 [已修缺陷](../_archive/fixed_bugs/README.md)、[待修缺陷](../_archive/suspended_bugs/README.md) 一起算，取已分配最大号加一；编号在本文件维护。

修好 `git mv` 到 [fixed_bugs](../_archive/fixed_bugs/README.md)，查明未修到 [suspended_bugs](../_archive/suspended_bugs/README.md)；挂起不是修好。保留文件名与讨论正文，frontmatter 的 `status` 分别改成 `已修` / `待修`，状态行补修复或未修原因，卡顶补 `留痕：` 行，修相对链接并更新两边清单。 **已修卡还必须有 `## 修复证据`（改动面 / 红 / 绿 / 提交）；只翻状态 + `git mv`、仓库一行没变 = `fix-evidence` 门禁红（判据 = [章程](../README.md)「缺陷的通道」）。**

## 活跃清单

**活跃 11 张**：BUG-212（收尾验证链偏长）保持活跃；C14 10 张（BUG-223..232）见下方「## 2026-11-18 C14 修复后的守卫面 + 低置信运行态」。C13 10 张（BUG-213..222）已于 2026-11-17 修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)。

**独立卡**：BUG-212（收尾验证链偏长：pre-push 暖树 ~46s + docs-only 后 release --check 要全量 `--verify`）——用户 2026-11-17 收尾时点名「不能过长」，只立卡不修；见下方「## 2026-11-17 收尾验证链成本（BUG-212）」。

**上一轮收口**：2026-11-17 C12 归属波次探索（focus v7）的 10 张（BUG-202..211）已由 2026-11-17 用户指令授权本轮修复并全部迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；批次计划与根因组见下方「## 2026-11-17 修复交接（根因组 A–C：BUG-202..211）」。

**上一轮收口**：2026-11-16 C11 二轮（修复后的守卫面）的 10 张（BUG-192..201）已于 2026-11-16 全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；见下方「## 2026-11-16 修复交接（根因组 A–E：BUG-192..201）」。

**上一轮收口**：2026-11-15 C11 搬移副作用探索（focus v6）的 8 张（BUG-184..191）已于 2026-11-16 全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；见下方「## 2026-11-16 修复交接（根因组 A–D：BUG-184..191）」。上一轮 focus v5 的 8 张已全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)（见下方「## 2026-11-14 修复交接（根因组 A–D：BUG-176..183）」）。

**上一轮收口**（2026-11-14 focus v4）：8 张已全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)（见下方「## 2026-11-14 修复交接（根因组 A–C：BUG-168..175）」）。

**更早收口**（2026-11-14 focus v3）：8 张已全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)（见下方「## 2026-11-14 修复交接（根因组 A–D：BUG-160..167）」）。

**最早收口**（2026-11-13 focus v2）：8 张已于 2026-11-14 全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)（见下方「## 2026-11-14 修复交接」）。

## 2026-11-17 修复交接（根因组 A–C：BUG-202..211）

**用户指令（2026-11-17）**：「_backlog/bugs 里面有最近 exploratory test 发现的 bugs，你琢磨一下，看看是否能系统性修起来。计划有了后 setup goal 逐步按 REPO 的流程来推进。」——本句即本轮授权（材料性：新增/改判据门禁、覆盖率棘轮语义、pre-push 面规则、docs 合同与 shipped 字节；留痕 = 批次 Note `notes/implemented/2026-11-17-c12-ownership-wave-repairs.md`）。
终点 = 活跃清单清零、10 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent（独立盲审）` 与 `## 修复证据`（改动面/红/绿/提交）齐。

十张不是十个补丁，是 **三个「绿」的制造者没随搬移一起改**：oracle 的判别面、守卫的扫描面、live/shipped 声明。

| 组 | 卡 | 共同根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A oracle / 棘轮判别面** | [202](../_archive/fixed_bugs/BUG-202-refactor-drift-title-hash-and-duplicate-mask.md) / [203](../_archive/fixed_bugs/BUG-203-coverage-ratchet-rename-resets-floor.md) / [204](../_archive/fixed_bugs/BUG-204-ledger-branches-floor-cold-only.md) | oracle 名字声称的面大于实现；改名/冷环境被当成「变好」或「无变化」 | 202：测试体 AST 指纹 + **多重集**比较（纯逻辑进 `checks/lib/refactor-drift.mjs`）；203：基线键消失 = 红，`--rename`/`--drop` 显式迁移地板；204：补无尾竖线纯测试，冷/暖同形、地板回 100 |
| **B 守卫扫描面** | [205](../_archive/fixed_bugs/BUG-205-live-pointer-faces-miss-moved-libs.md) / [206](../_archive/fixed_bugs/BUG-206-coveredby-evidence-does-not-execute.md) / [207](../_archive/fixed_bugs/BUG-207-retired-path-misses-wave-renames.md) / [208](../_archive/fixed_bugs/BUG-208-face-boundaries-computed-imports.md) | `FACES` / `RETIRED_PATH_PREFIXES` / `coveredBy` 是手写清单，未随 63 lib + 77 renames 扩面；计算型 import 不可见 | 205：FACES 纳入 `tools/lib`、`checks/lib`、`probes/lib`、`tests/support` + 每面非空；206：新增入口 import 图 spec（本地 import 目标必须存在），`probes/**` 的 coveredBy 改「真执行该 spec」的 `coverage:ratchet`；207：退役面从 git 历史自动推导近期 rename/delete（脚本注释面）+ 手工表自检；208：`face-boundaries` 读 `unresolvedImports`，五个面空集断言 |
| **C live / shipped 声明** | [209](../_archive/fixed_bugs/BUG-209-live-declarations-stale-after-split.md) / [210](../_archive/fixed_bugs/BUG-210-shipped-comments-dev-only-paths.md) / [211](../_archive/fixed_bugs/BUG-211-tools-readme-lib-purity-contradiction.md) | 手抄面表/件数随树漂；shipped 注释指不随包路径；归属纯度句与实盘矛盾 | 209：删 `tests/README.md` 手抄面表（只留唯一源链接）+ Note 去件数；210：shipped 注释加「不随包分发」限定 + shipped-comments spec + 重建 `_dist`；211：纯度句改「不直接 import/调用；进程由调用方注入，靠评审」 |

**次序 = A1(204) → A2(203) → A3(202) → B1(208) → B2(205) → B3(206) → B4(207) → C1(209/211) → C2(210)**：
A 先修「判绿的人」（覆盖率地板 → oracle）；B 先补无判据的语法形式（208），再扩清单面（205），再让 coveredBy 有执行证据（206），最后改退役登记（207，会扫全树注释）；
C 文档/发布面最后落，`_dist` 同批重建。证据口径 = 先落代码提交拿 sha → 再翻 `修复已落地` / 归档补 `## 修复证据`；每卡红/绿写同一条可执行命令；日志落 `runtime/tmp/c12-fix/`。

**收口（2026-11-17）**：10 张全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent（独立盲审）` + `## 修复证据`（改动面/红/绿/提交）齐，证据提交 = `eccd5f16`。
`pnpm test` 260 files / 2200 tests、`verify` ALL PASS（retired-path 自动面 ×259 文件 + 558 脚本注释）、`typecheck`/`lint`/`dup`/`smoke:fast`/`test:checks` 全绿、`coverage:ratchet` PASS（198 文件）、`release --prepare` 重打 0.11.9。
共享机制决定与输掉的方案 = [批次 Note](../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)。

## 2026-11-17 收尾验证链成本（BUG-212，调查中）

**用户指令（2026-11-17）**：「感觉上我们东西都修完了，准备提交, 但是在尾巴上验证的 CI 啊，过程是不是比较长啊？如果过长, 你还是需要提交一个 BUG，这里不能过长呢, 毕竟经常用啊。」——本轮只立卡不修；实测与修法建议 = [BUG-212](BUG-212-pre-push-and-release-tail-budget-overrun.md)。

| 卡 | 共同根因 | 一句话 | 级别 |
|---|---|---|---|
| [212](BUG-212-pre-push-and-release-tail-budget-overrun.md) | pre-push 六段无机械预算；release stamp 把 docs-only 的 gitSha 过期与全量 verify 绑死 | 暖树全链 ~46s（覆盖率 21.8s / verify 11.1s）；docs-only 收尾要分钟级 `--verify` | P2 |

## 2026-11-17 修复交接（C13 运行时/发布面：BUG-213..222）

**用户指令（2026-11-17）**：「_backlog/bugs 里面有最近 exploratory test 发现的 bugs，你琢磨一下，看看是否能系统性修起来。计划有了后 setup goal 逐步按 REPO 的流程来推进。」——本句即本轮授权（材料性：发布形状/manifest、shipped 文本、client 注入声明、release 管线与 docs 合同；留痕 = 批次 Note `notes/implemented/2026-11-17-shipped-package-boundary.md`）。BUG-212 不并入本批。

这十张不是十个补丁，是**发布面没有自己的构建产物**：tarball 是仓库树的子集，`files`/manifest/README/注释/client 声明各自手写，于是同一道边界在五个载体上漏水。

| 组 | 卡 | 共同根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A 发布字节** | [213](../_archive/fixed_bugs/BUG-213-tarball-ships-type-dts-majority.md) / [220](../_archive/fixed_bugs/BUG-220-sourcemap-url-missing-maps.md) | `files`/构建产物清单把 dev 字节当运行时 | 类型只 ship `exports` 可达闭包（实测 3 个 `.d.ts`，import 改 `.js`）；tsdown `sourcemap: false`，bundle 无 `sourceMappingURL` |
| **B manifest** | [214](../_archive/fixed_bugs/BUG-214-shipped-prepack-missing-scripts.md) / [219](../_archive/fixed_bugs/BUG-219-shipped-devdeps-workspace-protocol.md) | dev lifecycle/元数据原样进 tarball | tarball manifest 去 `scripts` 与 `devDependencies`（source 保留）；`prepack` 仍由仓库打包前跑 |
| **C client 声明** | [217](../_archive/fixed_bugs/BUG-217-client-inject-missing-primitives.md) / [221](../_archive/fixed_bugs/BUG-221-client-inject-over-declared.md) / [222](../_archive/fixed_bugs/BUG-222-client-react-not-declared.md) | inject/peer 手写，不是从 bundle require 派生 | `dsh.client.inject` = 实际 package row（primitives）+ 8 条有 peer 背书的组合/排序边（删除会让 company-client-composition 红）；primitives 进 peer；react/react-jsx-runtime 由 vendor `PLATFORM_MODULES` 基线提供并在 README/checker 可追溯 |
| **D shipped 文本** | [215](../_archive/fixed_bugs/BUG-215-shipped-readme-dev-links.md) / [216](../_archive/fixed_bugs/BUG-216-shipped-comments-dev-paths.md) / [218](../_archive/fixed_bugs/BUG-218-readme-pnpm-runtime-prereq.md) | README/注释按仓库树写；pnpm 被写成包运行时前置 | shipped 专用 `README.shipped.md`（包内链接/外链，不含 dev 路径）；bundle/声明注释剥离；`cordis.patch.yml`/presets 注释加「不随包」；pnpm 改成「DSH 插件安装器使用 pnpm；缺失时 DSH 打印 `dsh: pnpm was not found…`」 |
| **E 门禁** | 全组 | 发布面没有机械判据，`release --check` 只看源码指纹 | 新 `tools/release/shipped-shape.mjs`（sanitizer + checker）+ `pnpm release:shape`；`export-dist` 在替换 `_dist` 前先 sanitize 再 check；spec 用合成 fixture 锁每条判据 |

**次序 = E(先红) → A/B/C/D 实现 → 重建 `_dist` → E(绿) → 真入口**：
先让 checker 对当前旧 tarball 列出全部 10 类违规（红），再在 `export-dist` 里加 sanitize（manifest/类型/注释/README），并改 source `package.json`/tsdown/cordis/presets；重建后同一命令绿。证据口径 = 先落代码提交拿 sha → 再翻 `修复已落地` / 归档补 `## 修复证据`；每卡红/绿写同一条命令 `pnpm release:shape`（旧 tarball 红 / 新 tarball 绿），另附解包/假 module table/真入口补充。

**终点** = C13 10 张全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent（独立盲审）` + `## 修复证据`；`pnpm verify`/`test`/`typecheck`/`coverage:ratchet` 绿；`_dist` 重打且 `release:shape` 绿。BUG-212 保持活跃，不动。

**收口（2026-11-17）**：10 张全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent（独立盲审）` + `## 修复证据`（改动面/红/绿/提交）齐，证据提交 = `f1629047`。
`pnpm release --prepare` ALL PASS（shipped-shape 137 entries）；`release:shape` PASS；`company-entry`/`client-load` ALL PASS；`pnpm test` 262 files / 2218 tests；`verify`/`typecheck`/`lint`/`coverage:ratchet`（200 文件）绿。
共享机制决定 = [shipped package boundary Note](../../notes/implemented/2026-11-17-shipped-package-boundary.md)。

## 2026-11-18 C14 修复后的守卫面 + 低置信运行态

**用户指令（2026-11-18）**：「你找那 bug 都修好了，咱们再来一轮，至少抓到 10 个再停下来，尤其找那些你心里比较发虚的领域」——本组 10 张全部 `调查中`，只开卡不修；证据 = [C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)。

| 组 | 卡 | 共同根因 | 一句话 | 级别 |
|---|---|---|---|---|
| A 新 checker 面 | [223](BUG-223-shipped-shape-globs-unchecked.md) / [224](BUG-224-shipped-shape-text-face-misses-content.md) / [225](BUG-225-shipped-shape-extensionless-dev-paths.md) / [226](BUG-226-shipped-shape-bundle-patch-unchecked.md) | checker 只拒 C13 当时见过的形状 | files glob / content 文本面 / 目录级 dev 路径 / bundle.patch 四类空绿 | P2 ×4 |
| B 发布新鲜度/接线 | [227](BUG-227-release-shape-stale-dist.md) / [228](BUG-228-shipped-shape-not-in-verify.md) | 真实 tarball 检查只在 release，且不比对源码 | 旧 `_dist` PASS；source 泄漏过 verify/pre-push | P2 ×2 |
| C 读模型 | [229](BUG-229-diff-activity-partial-view.md) / [230](BUG-230-team-event-overrides-missing-revision.md) | 类型必填当运行必填；缺 revision 无判据 | 部分视图抛错；旧事件覆盖 completed | P2 ×2 |
| D catalog 派生 | [231](BUG-231-catalog-silent-symlink-dir.md) / [232](BUG-232-catalog-empty-slug.md) | 坏形状静默 | symlink 子目录消失；空 slug 当已声明 | P2 ×2 |

本组是 Round 100–101 的产出；tarball/合成 checker/纯函数/临时 companyHome 均已实跑，未修任何产品代码。

## 2026-11-17 C13 运行时/发布面分离（focus v8）

**用户指令（2026-11-17）**：「我们不少脚本/代码，其实发布到运行时的不应该那么多，运行时的代码/脚本不应该依赖开发时刻的脚本，比如测试、设置环境等未来测试/验证什么的……沿着这个方向探索探索挖掘挖掘，再来一轮，至少 10 个」——本组 10 张已于 2026-11-17 修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；证据 = [C13 探索卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)。

| 组 | 卡 | 共同根因 | 一句话 | 级别 |
|---|---|---|---|---|
| A tarball 内容 | [213](../_archive/fixed_bugs/BUG-213-tarball-ships-type-dts-majority.md) | `files` 把类型面当运行时面 | 135 个 `.d.ts` vs 2 个运行时 JS | P2 |
| B package metadata | [214](../_archive/fixed_bugs/BUG-214-shipped-prepack-missing-scripts.md) / [219](../_archive/fixed_bugs/BUG-219-shipped-devdeps-workspace-protocol.md) | dev lifecycle/元数据泄漏进发布 manifest | `prepack` 指不存在的 scripts；`workspace:*` 让解包 npm 安装失败 | P2 ×2 |
| C 运行时 import | [217](../_archive/fixed_bugs/BUG-217-client-inject-missing-primitives.md) / [221](../_archive/fixed_bugs/BUG-221-client-inject-over-declared.md) / [222](../_archive/fixed_bugs/BUG-222-client-react-not-declared.md) | client 声明不是从 bundle require 派生 | 缺 primitives/react，过报 8 条 inject | P2 ×3 |
| D shipped 文本 | [215](../_archive/fixed_bugs/BUG-215-shipped-readme-dev-links.md) / [216](../_archive/fixed_bugs/BUG-216-shipped-comments-dev-paths.md) | README/注释按仓库树写 | README 5/5 链接断；76 处 dev 路径 | P2 ×2 |
| E 安装形状 | [218](../_archive/fixed_bugs/BUG-218-readme-pnpm-runtime-prereq.md) / [220](../_archive/fixed_bugs/BUG-220-sourcemap-url-missing-maps.md) | 安装前置/产物清单与运行时面不一致 | pnpm 成运行时前置；sourceMappingURL 无 map | P2 ×2 |

本组是 Round 97–99 的产出；tarball/解包/假 module table 均已实跑，未修任何产品代码。

## 2026-11-17 C12 归属波次探索（focus v7）

**用户指令（2026-11-17）**：「利用这个思路做 exploratory test……找到差不多10来个的时候收手，bug直接报，别试图去修整这些bug」——本组 5 张全部 `调查中`，只开卡不修；证据 = [探索卡](../issues/2026-11-17-ownership-wave-exploratory.md)。

| 组 | 卡 | 共同根因 | 一句话 | 级别 |
|---|---|---|---|---|
| A oracle 判别力 | [202](../_archive/fixed_bugs/BUG-202-refactor-drift-title-hash-and-duplicate-mask.md) | `--hashes` 只取 `titlePath`；`--compare` 用集合差 | 改断言仍报零测试体改动；重复测试删一条仍报零删除 | P2 |
| B 覆盖率地板 | [203](../_archive/fixed_bugs/BUG-203-coverage-ratchet-rename-resets-floor.md) / [204](../_archive/fixed_bugs/BUG-204-ledger-branches-floor-cold-only.md) | 单一基线同时服务暖/冷形状；改名只发 note | 改名重置高地板；ledger 暖树留 6 点盲区 | P2 ×2 |
| C 守卫扫描面 | [205](../_archive/fixed_bugs/BUG-205-live-pointer-faces-miss-moved-libs.md) | `FACES` 手写清单未随 63 个 lib 搬家扩面 | 新家注释里的死 spec 不扫 | P2 |
| D 证据执行 | [206](../_archive/fixed_bugs/BUG-206-coveredby-evidence-does-not-execute.md) | `coveredBy` 是声明，不是执行证据 | 探针/工具入口坏了 pre-push 仍绿 | P2 |
| E 退役登记 | [207](../_archive/fixed_bugs/BUG-207-retired-path-misses-wave-renames.md) | 退役前缀表是手写数组，未随 77 renames 更新 | 脚本注释里的旧家仍称「零残留」 | P2 |
| F 依赖图 | [208](../_archive/fixed_bugs/BUG-208-face-boundaries-computed-imports.md) | 只消费字面量 import；checks/probes lib 无图守卫 | 计算型反向 import 可绕过归属方向 | P2 |
| G live 声明 | [209](../_archive/fixed_bugs/BUG-209-live-declarations-stale-after-split.md) | 手写面表/件数无生成器 | tests/README 的 lib→replay 与 Note 件数仍按旧树 | P3 |
| H shipped 面 | [210](../_archive/fixed_bugs/BUG-210-shipped-comments-dev-only-paths.md) | 只清旧家，未区分 dev-only 同源说明 | 安装包里注释指向不存在的 tools/lib | P3 |
| I 归属规则 | [211](../_archive/fixed_bugs/BUG-211-tools-readme-lib-purity-contradiction.md) | 纯度句未随 probe/ 纳入 lib 更新 | 「lib 不启动进程」与 probe-web 矛盾 | P3 |

本组是 Round 94–96 的产出；9 条安装形状 lane、7 件 analyze 探针与 `smoke:all` 已实跑 PASS；clean worktree 未跑，见探索卡。

## 2026-11-16 修复交接（根因组 A–E：BUG-192..201）

**用户指令（2026-11-16）**：「_backlog/bugs 这里头又有不少当借助 exploratory test 发现的 bug，你系统性地看一看，考虑考虑怎么修复，他们给你 setup goal 目标是修复所有的 bug，你有足够的预算」——本句即本轮授权（材料性：新增结构门禁 `surface-coverage`、pre-push fail-closed 行为、各守卫 spec 的判据面；留痕 = 一篇批次 Note）。
终点 = 活跃清单清零、10 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent（独立盲审）` 与 `## 修复证据`（改动面/红/绿/提交）齐。

这十张是 Round 93 的产出，**共同根因**：上一轮守卫把「判据面」写成**上次出事的样本 / 后缀 / 文件清单**，不是载体的全集；选择器边界又让缺口不可见（unseen 不阻断、`--paths` 不归一、证据标签不可执行）。判据名 > 判据面 = 与 BUG-186 同族的假绿。

| 组 | 卡 | 同一根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A 面规则/选择器** | [192](../_archive/fixed_bugs/BUG-192-surface-rules-tracked-path-completeness.md) / [199](../_archive/fixed_bugs/BUG-199-pre-push-unseen-exits-zero.md) / [201](../_archive/fixed_bugs/BUG-201-pre-push-paths-dot-prefix-unseen.md) | 完备性只抽样；未分类不阻断；入口不归一 | 新门禁 `checks/gates/surface-coverage.mjs`（`git ls-files` 全集）+ 19 条路径登记；pre-push 对 `unseen` 退出非零；`--paths` 归一 `./`/反斜杠/`a//b` |
| **B 阈值键** | [193](../_archive/fixed_bugs/BUG-193-vitest-threshold-guard-accepts-directory.md) | 「命中真实文件」只查 `existsSync` | 三个守卫统一 `statSync().isFile()`（阈值 / 活指针 / 构建字面量）；负例 = 目录键红 |
| **C 活指针守卫** | [194](../_archive/fixed_bugs/BUG-194-live-pointer-guard-misses-js-source.md) / [195](../_archive/fixed_bugs/BUG-195-live-pointer-guard-misses-presets-skills.md) | 载体后缀/集合是白名单 | 源码面补 `.js/.mjs`；新增 `presets/**` 与 `.agents/skills/**` 两面；`FACES` 单一表 |
| **D 文档/构建字面量守卫** | [196](../_archive/fixed_bugs/BUG-196-typecheck-claim-guard-misses-checks-readme.md) / [197](../_archive/fixed_bugs/BUG-197-built-path-guard-misses-docs-ts.md) / [198](../_archive/fixed_bugs/BUG-198-built-path-guard-false-red-js-source.md) | 扫描面按上次事故文件；源码候选只认 `.ts/.tsx` | 计数面补 checks / run / runtime 的 README + `.agents/skills`；构建字面量面扩到 live 文本（md/ts/tsx/mjs/js/sh/yml）；源码候选补 `.js/.mjs` |
| **E 证据标签** | [200](../_archive/fixed_bugs/BUG-200-coveredby-coverage-ratchet-not-executable.md) | 人读标签 ≠ 可执行命令 | 词表标签改 `coverage:ratchet` + spec 断言每条标签都是 `package.json` 脚本 |

**次序 = B → E → C → D → A**：B/E 是单点（文件类型、标签可执行）；C/D 扩载体面互相独立；A 最后落——它把 pre-push 改成 fail-closed 并新增全 tracked 门禁，blast radius 最大，必须在其余判据先绿时才收紧。
**证据口径**：先落代码提交拿 sha → 再翻 `修复已落地` / 归档补 `## 修复证据`；每卡红/绿写同一条可执行命令。

**收口（2026-11-16）**：10 张全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent（独立盲审）` + `## 修复证据`（改动面/红/绿/提交）齐，证据提交 = `34f84fd2`。
`pnpm test` 253 files / 2153 tests、`verify` ALL PASS（新门禁 surface-coverage ×1900+、gate 总数 75）、`typecheck`/`lint`/`dup`/`smoke:fast`/`test:checks` 全绿、`coverage:ratchet` PASS（asset-lanes 98.33 / backlog-liveness 93.89 分支覆盖，均高于基线）。
共享机制决定与输掉的方案 = [守卫判据面 Note](../../notes/implemented/2026-11-16-guard-surfaces-not-samples.md)。

## 2026-11-16 C11 二轮探索（修复后的守卫面）

**用户指令（2026-11-16）**：「你发现的 bug 全全修好了……我需要你继续这样一口气能继续 exploratory test 找到 10 个 bug」——本组 10 张全部 `调查中`，只开卡不修；证据 = [探索卡 Round 93](../_archive/settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)。

| 组 | 卡 | 共同根因 | 一句话 | 级别 |
|---|---|---|---|---|
| A 面规则/选择器 | [192](../_archive/fixed_bugs/BUG-192-surface-rules-tracked-path-completeness.md) / [199](../_archive/fixed_bugs/BUG-199-pre-push-unseen-exits-zero.md) / [201](../_archive/fixed_bugs/BUG-201-pre-push-paths-dot-prefix-unseen.md) | 完备性 spec 只抽样；unseen 不阻断；入口不归一 | 19 条 tracked 路径 unseen；未分类可 push；`./` 前缀假阴性 | P2 ×3 |
| B 阈值键 | [193](../_archive/fixed_bugs/BUG-193-vitest-threshold-guard-accepts-directory.md) | 「命中真实文件」只查 existsSync | 目录键仍绿，阈值失效 | P2 |
| C 活指针守卫 | [194](../_archive/fixed_bugs/BUG-194-live-pointer-guard-misses-js-source.md) / [195](../_archive/fixed_bugs/BUG-195-live-pointer-guard-misses-presets-skills.md) | 守卫的载体后缀/集合不完备 | `.js` 源码与 presets/skills 里的旧 spec 路径仍绿 | P2 ×2 |
| D 文档/构建字面量守卫 | [196](../_archive/fixed_bugs/BUG-196-typecheck-claim-guard-misses-checks-readme.md) / [197](../_archive/fixed_bugs/BUG-197-built-path-guard-misses-docs-ts.md) / [198](../_archive/fixed_bugs/BUG-198-built-path-guard-false-red-js-source.md) | 扫描面按白名单；sourceCandidates 只认 .ts/.tsx | 导航文档/文档字面量漏扫；合法 `.js` 产物假红 | P2 ×3 |
| E 证据标签 | [200](../_archive/fixed_bugs/BUG-200-coveredby-coverage-ratchet-not-executable.md) | 人读标签 ≠ 可执行命令 | `coverage-ratchet` 照跑即失败 | P2 |

## 2026-11-16 修复交接（根因组 A–D：BUG-184..191）

**用户指令（2026-11-16）**：「_backlog/bugs 这里头有不少当借助 exploratory test 发现的 bug，你系统性地看一看，考虑考虑怎么修复，他们给你 setup goal 目标是修复所有的 bug，你有足够的预算」——本句即本轮授权（材料性：docs 合同 `docs/testing.md` + `notes/implemented` 活文档 + pre-push 面规则；留痕 = 一篇批次 Note）。
终点 = 活跃清单清零、8 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent（独立盲审）` 与 `## 修复证据`（改动面/红/绿/提交）齐。

这八张是 C11 首轮的产出，**共同根因**：三批纯搬移（`29ae8c94` tests 分轴 → `1eb14f46` src↔tests 对齐 → `57d34a34` tools 四组）之后，静态 import 之外的四类消费者——配置键（阈值 / 面规则）、动态 import 字面量、注释与 Note 里的路径、文档里的手写计数——没有随迁，而门禁的扫描面不覆盖它们；消费者对未命中一律静默。

| 组 | 卡 | 同一根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A 验证面静默失效** | [184](../_archive/fixed_bugs/BUG-184-vitest-coverage-thresholds-stale-host-paths.md) / [186](../_archive/fixed_bugs/BUG-186-pre-push-surface-rules-miss-src-lib-tools.md) | 配置注册表随文件搬移漂移，消费者对缺失键/未命中静默 | 阈值键改现行路径 + `tests/repo/budget/vitest-coverage-thresholds.spec.ts`；`SURFACE_RULES` 补 `src/lib → replay`、其余面用 `coveredBy` 申报无条件证据 + `selectSurfaces` 返回 `covered/unseen` + `asset-lanes.spec.ts` 覆盖面判据 |
| **B 真入口** | [185](../_archive/fixed_bugs/BUG-185-replay-lane-stale-built-presence-import.md) | 构建产物路径字面量未随 src/lib 分组更新 | replay 动态 import 指到 `lib/types/lib/presence/presence.js` + `tests/repo/structure/built-path-literals.spec.ts` |
| **C 活指针** | [187](../_archive/fixed_bugs/BUG-187-module-comments-stale-spec-paths.md) / [188](../_archive/fixed_bugs/BUG-188-implemented-note-ui-surface-stale-command.md) / [189](../_archive/fixed_bugs/BUG-189-implemented-note-generic-english-stale-path.md) / [190](../_archive/fixed_bugs/BUG-190-candidate-scan-comment-stale-spec.md) | spec 搬移/退役后，注释与决策记忆里的路径未更新；门禁不扫这些载体 | 5 条源码注释 + 2 条 Note + 1 条 audit 注释改现行家 + `tests/repo/docs/live-pointer-paths.spec.ts`（src / notes/implemented / checks/audit 三面） |
| **D 文档计数** | [191](../_archive/fixed_bugs/BUG-191-typecheck-coverage-counts-stale-docs.md) | 会漂的分数字面量无单一来源 | 两处 `x/y spec` 改成 include 减 exclude 公式 + `tests/repo/docs/typecheck-coverage-claim.spec.ts` |

**次序 = B → A1 → A2 → C → D**：B 是 P1 真入口（确定性红）；A1 是 A2 的同类存量（配置键）；A2 用 A1 的「登记表必须命中消费者」语义扩到面规则；C、D 独立但共用同一「活载体不在扫描面」诊断。共享机制决定一篇 Note，独立机械修复用 commit——本批只剩一篇批次 Note。
噪声/陷阱：**不**把 weekly 慢档（company-entry / release）塞进 pre-push——`company-entry` 要 `_dist` tarball（缺则 exit 2）且 ~1–2 min，成本边界与开发树可用性都否掉它；无额外 lane 的面写 `coveredBy`（词表 + hook 原文核对），不写空规则。
**证据口径**：先落代码提交拿 sha → 再翻 `修复已落地` / 归档补 `## 修复证据`；每卡红/绿写同一条可执行命令。

**收口（2026-11-16）**：8 张全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent（独立盲审）` + `## 修复证据`（改动面/红/绿/提交）齐，证据提交 = `713acc60`。
`pnpm test` 253 files / 2145 tests、`verify` ALL PASS、`typecheck`/`lint`/`dup`/`smoke:fast`/`test:checks` 全绿、`coverage:ratchet` PASS（asset-lanes 98.33 / backlog-liveness 93.89 分支覆盖，均高于基线）、`node checks/lanes/replay.e2e.mjs` ALL PASS。
共享机制决定与输掉的方案 = [搬移副作用 Note](../../notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md)。

## 2026-11-15 C11 搬移副作用探索（focus v6）

**用户指令（2026-11-15）**：「用这个新的 exploratory test 来做寻找 bug……找到 bug 就直接报，希望你能找到七八个吧」——本组 8 张全部 `调查中`，只开卡不修；证据 = [探索卡 Round 92](../_archive/settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)。

| 组 | 卡 | 共同根因 | 一句话 | 级别 |
|---|---|---|---|---|
| A 验证面静默失效 | [184](../_archive/fixed_bugs/BUG-184-vitest-coverage-thresholds-stale-host-paths.md) / [186](../_archive/fixed_bugs/BUG-186-pre-push-surface-rules-miss-src-lib-tools.md) | 配置注册表（阈值键 / 面规则）未随搬移扩面，消费者对未命中静默 | 5 个覆盖率阈值死键；pre-push 对 src/lib / tools 零真入口 | P2 ×2 |
| B 真入口 | [185](../_archive/fixed_bugs/BUG-185-replay-lane-stale-built-presence-import.md) | 构建产物路径字面量未随 src/lib 分组更新 | replay 车道确定性 MODULE_NOT_FOUND | P1 |
| C 搬移后活指针 | [187](../_archive/fixed_bugs/BUG-187-module-comments-stale-spec-paths.md) / [188](../_archive/fixed_bugs/BUG-188-implemented-note-ui-surface-stale-command.md) / [189](../_archive/fixed_bugs/BUG-189-implemented-note-generic-english-stale-path.md) / [190](../_archive/fixed_bugs/BUG-190-candidate-scan-comment-stale-spec.md) | spec 搬移/退役后，注释/Note/审计脚本里的路径未更新；门禁不扫这些载体 | 3 条模块头注 + 2 条 Note + 1 条 audit 注释 | P2 ×4 |
| D 文档计数 | [191](../_archive/fixed_bugs/BUG-191-typecheck-coverage-counts-stale-docs.md) | 会漂的分数字面量无单一来源 | 两份 live 文档停在 227/245、226/244（实测 231/249） | P2 |

## 2026-11-14 focus v5 探索（post-fix 3）

**用户指令（2026-11-14）**：「你发现的问题全修好了，继续往前，Exploratory test去寻找更多的bug」——本组 8 张全部 `调查中`，只开卡不修；证据 = [探索卡 Round 91](../_archive/settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)。

| 组 | 卡 | 一句话 | 级别 |
|---|---|---|---|
| A 共享形状层 | [176](../_archive/fixed_bugs/BUG-176-json-fence-example-extracted.md) / [181](../_archive/fixed_bugs/BUG-181-multiline-code-span.md) | 围栏示例 JSON 盖过真账本；跨行 code span 里的标题被当定义 | P2 ×2 |
| B 三态/平台路径 | [179](../_archive/fixed_bugs/BUG-179-internal-dotdot-over-rejected.md) / [180](../_archive/fixed_bugs/BUG-180-walk-company-dirs-windows-dotdot.md) | 内部 `..` 误杀；Windows `..\` 绕过 `..` 闸 | P2 / P1 |
| C fix-evidence 边界 | [177](../_archive/fixed_bugs/BUG-177-fix-evidence-valid-command-forms.md) / [178](../_archive/fixed_bugs/BUG-178-fix-evidence-section-in-code-block.md) / [182](../_archive/fixed_bugs/BUG-182-fix-evidence-noop-commands.md) | 合法命令被拒；代码块里的节标题截错；空操作命令也过 | P2 ×3 |
| D notes-tree 根 | [183](../_archive/fixed_bugs/BUG-183-notes-root-symlink-followed.md) | `notes/` 根本身是 symlink 仍被跟随 | P2 |

## 2026-11-14 修复交接（根因组 A–D：BUG-176..183）

**用户指令（2026-11-14）**：「你看，又发现了一些bug，你系统性地思考完了之后，看看怎么处理吧」。
本句即本轮授权（材料性：company-pack 公开行为 + 门禁判据 + docs），留痕 = Note。
终点 = 活跃清单清零、8 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent` 与 `## 修复证据` 齐。

这八张是**同一批层被推到边界后再推一层**：形状层的「容器/跨行」、路径层的「分隔符/规范化」、门禁读卡与命令解析。

| 组 | 卡 | 同一根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A 形状层容器与跨行** | [176](../_archive/fixed_bugs/BUG-176-json-fence-example-extracted.md) / [181](../_archive/fixed_bugs/BUG-181-multiline-code-span.md) | `extractJsonBlock` 仍整篇找第一个 json 块（围栏示例先命中）；code span 只在单行找闭合 | `scanDocumentDetailed` 产出**顶层围栏块**（info + content + 行号），`extractJsonBlock` 只取顶层 json 块；行内代码状态跨行维护（EOF 无闭合按字面） |
| **B 路径段语义** | [179](../_archive/fixed_bugs/BUG-179-internal-dotdot-over-rejected.md) / [180](../_archive/fixed_bugs/BUG-180-walk-company-dirs-windows-dotdot.md) | `..` 判定从「全拒绝」到「只按 `/` 切」：内部 `..` 被误杀、Windows `..\` 又漏判 | 平台无关分隔符切段 + 栈式消解：栈空再遇 `..` 才 unsafe，内部 `..` 规范化后照常走 |
| **C fix-evidence 读卡与命令** | [177](../_archive/fixed_bugs/BUG-177-fix-evidence-valid-command-forms.md) / [178](../_archive/fixed_bugs/BUG-178-fix-evidence-section-in-code-block.md) / [182](../_archive/fixed_bugs/BUG-182-fix-evidence-noop-commands.md) | 命令解析不认 `run`/`--filter`/`--import` 的值；节标题不区分围栏；空操作命令（`sh -c`/`git`/任意 `node` 文件）也能过 | 按命令语法解析「选项+值 / script / path」；节标题只在非围栏行匹配；拒绝 `sh -c`/`git`，`node`/`sh` 目标限定在测试/工具面 |
| **D notes 根** | [183](../_archive/fixed_bugs/BUG-183-notes-root-symlink-followed.md) | 子条目 symlink 拦了，根没拦；`statSync` 跟随链接 | 两处入口先 `lstat` 判 `notes` 根：symlink → 红；status 不跟随 |

**次序 = A → B → C → D**：A 先把形状层的「容器/跨行」收成闭集；B 独立；C 用 A 的围栏语义做门禁读卡；
D 独立。**证据口径**：先落代码提交拿 sha → 再归档补 `## 修复证据`；红/绿同一条可解析命令。

**收口（2026-11-14）**：8 张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent` + `## 修复证据`（改动面/红/绿/提交）齐，
证据提交 = `8a95fc51`。`pnpm test` 247 files / 2074 tests、`test:checks` 5 PASS、`typecheck`/`lint`/`dup`/`verify` 全绿。
证据与未覆盖轴 = [Note](../../notes/implemented/2026-11-14-shape-fences-and-gate-parsing.md)。

## 2026-11-14 focus v4 探索（post-fix 2）

**用户指令（2026-11-14）**：「继续再来……探索抓更多的bug」——本组 8 张全部 `调查中`，只开卡不修；证据 = [探索卡 Round 90](../_archive/settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)。

| 组 | 卡 | 一句话 | 级别 |
|---|---|---|---|
| A 共享形状层边界 | [168](../_archive/fixed_bugs/BUG-168-markdown-inline-code-comment.md) / [169](../_archive/fixed_bugs/BUG-169-markdown-unclosed-comment.md) / [172](../_archive/fixed_bugs/BUG-172-split-table-row-double-backslash.md) / [173](../_archive/fixed_bugs/BUG-173-legacy-json-in-comment.md) | 行内代码 `<!--` 起注释；未闭合注释吞后文；`\\|` 不切列；注释里的 legacy JSON 仍解析 | P2 ×4 |
| B 三态读契约 | [170](../_archive/fixed_bugs/BUG-170-read-company-file-dotdot-subclass.md) | `../` 越界路径 missing 与 unsafe 子类不稳定 | P2 |
| C 新门禁覆盖 | [171](../_archive/fixed_bugs/BUG-171-fix-evidence-deletion-surface.md) / [174](../_archive/fixed_bugs/BUG-174-notes-tree-symlink-invisible.md) / [175](../_archive/fixed_bugs/BUG-175-fix-evidence-fake-command.md) | fix-evidence 拒删除型修复；notes-tree 忽略 symlink；假命令也能过 fix-evidence | P2 ×3 |

## 2026-11-14 修复交接（根因组 A–C：BUG-168..175）

**用户指令（2026-11-14）**：「_backlog/bugs 现有大量刚才经过exploratory test发现的bug，你全部扫描完之后，系统地思考思考如何修复它们，按照我们的研发流程」。
本句即本轮授权（材料性：company-pack 公开行为 + 门禁判据 + docs），留痕 = Note。
终点 = 活跃清单清零、8 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent` 与 `## 修复证据`（改动面/红/绿/提交）齐。

这八张全在**上一轮自己新建的层**上找边界：共享形状状态机、三态读契约、两道新门禁。

| 组 | 卡 | 同一根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A 形状状态机** | [168](../_archive/fixed_bugs/BUG-168-markdown-inline-code-comment.md) / [169](../_archive/fixed_bugs/BUG-169-markdown-unclosed-comment.md) / [172](../_archive/fixed_bugs/BUG-172-split-table-row-double-backslash.md) / [173](../_archive/fixed_bugs/BUG-173-legacy-json-in-comment.md) | 共享层只处理了「块级容器」，没处理行内代码/未闭合/双转义；JSON 提取器另走原始文本 | `scanDocument` 增行内代码 span 与未闭合检测（`scanDocumentDetailed`）；`splitTableRow` 先 `\\` 后 `\|`；`extractJsonBlock` 吃注释掩码 |
| **B 三态子类** | [170](../_archive/fixed_bugs/BUG-170-read-company-file-dotdot-subclass.md) | `walkCompanyDirs` 对不存在的中间段早退，`..` 段没被判定，越界折成 missing | 逐段拒绝 `..`（越界一律 unsafe，missing 只表示「根内真没有」） |
| **C 新门禁** | [171](../_archive/fixed_bugs/BUG-171-fix-evidence-deletion-surface.md) / [174](../_archive/fixed_bugs/BUG-174-notes-tree-symlink-invisible.md) / [175](../_archive/fixed_bugs/BUG-175-fix-evidence-fake-command.md) | 门禁只按「文件存在/命令前缀」判，没覆盖删除、symlink、假命令 | 删除改由「提交 changed 列表」对账；notes-tree 遇 symlink 直接红；命令按 `package.json` scripts / 本地 bin / 路径真实性解析 |

**次序 = A → B → C**：A 先把共享层边界补齐（c 依赖同一形状语义）；B 独立；C 收尾门禁自身。
**证据口径**：按新流程「先落代码提交拿 sha → 再归档补 `## 修复证据`」；每卡红/绿写同一条可执行命令。

**收口（2026-11-14）**：8 张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent` + `## 修复证据`（改动面/红/绿/提交）齐，
证据提交 = `d6aa860d`。`pnpm test` 247 files / 2072 tests、`test:checks` 5 PASS、`typecheck`/`lint`/`dup`/`verify` 全绿。
证据与未覆盖轴 = [Note](../../notes/implemented/2026-11-14-shape-state-machine-and-gate-edges.md)。

## 2026-11-14 focus v3 探索（post-fix 回归）

**用户指令（2026-11-14）**：「继续再来……探索抓更多的bug」——本组 8 张全部 `调查中`，只开卡不修；证据 = [探索卡 Round 89](../_archive/settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)。

| 组 | 卡 | 一句话 | 级别 |
|---|---|---|---|
| A 文本形状层未共享 | [160](../_archive/fixed_bugs/BUG-160-req-check-raw-text-bom-fence.md) | `/req check` 仍读原始文本：BOM 缺头、围栏示例成幽灵需求 | P2 |
| B pre-push merge | [161](../_archive/fixed_bugs/BUG-161-pre-push-merge-commit-surface-skip.md) | 逐提交 `diff-tree` 漏 merge 提交的合并结果 | P1 |
| C PRD 结构容器/身份/格式 | [162](../_archive/fixed_bugs/BUG-162-prd-html-comments-parsed-as-definitions.md) / [164](../_archive/fixed_bugs/BUG-164-req-in-multiple-slices.md) / [165](../_archive/fixed_bugs/BUG-165-slices-escaped-pipe.md) / [166](../_archive/fixed_bugs/BUG-166-prd-changelog-format.md) | HTML 注释当定义；REQ 跨 slice 重复；转义竖线拆列；changeLog 日期/作者不校验 | P2 ×4 |
| D notes-tree lifecycle/日期 | [163](../_archive/fixed_bugs/BUG-163-notes-tree-rejected-status-unguarded.md) / [167](../_archive/fixed_bugs/BUG-167-notes-tree-invalid-calendar-date.md) | `rejected/` 状态行被跳过；日期只验形状不验日历 | P2 ×2 |

## 2026-11-14 修复交接（根因组 A–D：BUG-160..167）

**用户指令（2026-11-14）**：「能提交的先提交掉，然后你继续做。现在有新的一轮，又有新的bug上来了，准备修复新的bug吧」。
本句即本轮授权（材料性：company-pack 公开行为 + 门禁判据），留痕 = Note。
终点 = 活跃清单清零、8 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent` 与红→绿证据齐。

这八张是上一轮修复后的**回归扫**：四处仍是「同一事实有两个解释」，各收成一个来源：

| 组 | 卡 | 同一根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A 文档文本形状层** | [160](../_archive/fixed_bugs/BUG-160-req-check-raw-text-bom-fence.md) / [162](../_archive/fixed_bugs/BUG-162-prd-html-comments-parsed-as-definitions.md) | `/prd check` 与 `/req check` 各有一套行假设；`prd-check` 的围栏状态没覆盖 HTML 注释 | 新 `lib/markdown-shape.ts`（归一化 + 围栏 + HTML 注释），两个命令同读；注释片段从行文本移除而不是只加一个 bool |
| **B push 范围** | [161](../_archive/fixed_bugs/BUG-161-pre-push-merge-commit-surface-skip.md) | merge 提交在 `diff-tree` 下没有输出，逐提交取变更漏掉合并结果 | `commitPaths()` 对 merge 用 `git diff <first-parent> <sha>`；非 merge 不变 |
| **C PRD 结构与字段** | [164](../_archive/fixed_bugs/BUG-164-req-in-multiple-slices.md) / [165](../_archive/fixed_bugs/BUG-165-slices-escaped-pipe.md) / [166](../_archive/fixed_bugs/BUG-166-prd-changelog-format.md) | 归属/表格/字段解析只验形状不验语义：REQ 可跨 slice、`\|` 不识别、changeLog 只看分三段 | slice 解析维护 `reqOwner`；`splitRow` 扫描转义；changeLog 校验真实日历 + 非空作者/变更 |
| **D notes-tree** | [163](../_archive/fixed_bugs/BUG-163-notes-tree-rejected-status-unguarded.md) / [167](../_archive/fixed_bugs/BUG-167-notes-tree-invalid-calendar-date.md) | 门禁声称覆盖全 lifecycle/全日期，实际漏 rejected 与日历语义 | lifecycle 循环含 `rejected` 并校验 `rejected` 状态词；日期做真实日历往返，生效比较用解析值 |

**次序 = B → A → C → D**：B 独立且 P1；A 先立共享扫描层（C 的三个解析器都改在同一文件，依赖它）；C 随后；
D 是独立门禁面。

**收口（2026-11-14）**：8 张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent` + 红→绿证据齐、
`## 已修判定` 落卡。`pnpm test` 247 files / 2057 tests、`pnpm test:checks` 4 PASS、
`typecheck`/`lint`/`dup`/`verify` 全绿。证据与未覆盖轴 = [Note](../../notes/implemented/2026-11-14-shape-layer-and-structure-semantics.md)。


**上一轮收口**（2026-11-13 第四轮）：BUG-147..149 已迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；
BUG-150 复核不成立，迁 [settled_issues](../_archive/settled_issues/BUG-150-company-root-safety-spec-wrong-api-root.md)；
BUG-151 由 Safety 矩阵首跑发现，同轮修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)。

## 2026-11-13 focus v2 探索（C8/C9/C10）

**用户指令（2026-11-13）**：「对，抓到bug之后不要改，直接报就行了」——本组 8 张全部 `调查中`，只开卡不修；证据 = [探索卡 Round 86](../_archive/settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)。

| 组 | 卡 | 一句话 | 级别 |
|---|---|---|---|
| A PRD parser 形状 | [152](../_archive/fixed_bugs/BUG-152-prd-headings-crlf-bom.md) / [153](../_archive/fixed_bugs/BUG-153-prd-headings-fenced-code-blocks.md) | CRLF/BOM 假红；围栏示例被当定义 | P2 / P2 |
| B PRD gate 边界 | [154](../_archive/fixed_bugs/BUG-154-prd-gate-numbering-empty-value.md) / [155](../_archive/fixed_bugs/BUG-155-prd-gate-stale-session-cwd.md) / [156](../_archive/fixed_bugs/BUG-156-prd-gate-symlink-unreadable-fail-open.md) | numbering 空值放行；header cwd 与 present 分叉；symlink 不可读当旧动议 | P1 ×3 |
| C PRD 身份 | [157](../_archive/fixed_bugs/BUG-157-prd-duplicate-ac-slice-ids.md) | AC/slice 重号不判红 | P2 |
| D pre-push 范围 | [158](../_archive/fixed_bugs/BUG-158-pre-push-zero-sha-range.md) | 新分支只看 tip；删分支崩 | P1 |
| E client 错误环 | [159](../_archive/fixed_bugs/BUG-159-client-error-ring-empty-object-message.md) | `{}` 吞掉 event.message | P2 |



## 2026-11-14 修复交接（根因组 A–D：BUG-152..159）

**用户指令（2026-11-14）**：「_backlog/bugs 现有大量刚才经过exploratory test发现的bug，你全部扫描完之后，系统地思考思考如何修复它们，按照我们的研发流程」。
本句即本轮授权（材料性：company-pack 公开行为 + 命令面 + client UI），留痕 = Note。
终点 = 活跃清单清零、8 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/)、每卡 `审查：agent` 与红→绿证据齐。

八张卡不是八个补丁，是**四个「两套事实」根因**——每处都是同一个功能的两个载体各有一套解释：

| 组 | 卡 | 同一根因 | 修法（唯一事实源） |
|---|---|---|---|
| **A 文档文本形状层** | [152](../_archive/fixed_bugs/BUG-152-prd-headings-crlf-bom.md) / [153](../_archive/fixed_bugs/BUG-153-prd-headings-fenced-code-blocks.md) / [157](../_archive/fixed_bugs/BUG-157-prd-duplicate-ac-slice-ids.md) | headings 解析器把「原始字节」当「文档结构」：行尾 CR/BOM 改文本、围栏示例改结构、重复 id 改身份 | 入口归一化（去 BOM / CRLF→LF）+ 围栏感知扫描（三反引号 / 三波浪号）+ AC/slice `seen` 集合；`prd-check.ts` 一套扫描层，三个消费者都读它 |
| **B 交付闸门的事实源** | [154](../_archive/fixed_bugs/BUG-154-prd-gate-numbering-empty-value.md) / [155](../_archive/fixed_bugs/BUG-155-prd-gate-stale-session-cwd.md) / [156](../_archive/fixed_bugs/BUG-156-prd-gate-symlink-unreadable-fail-open.md) | 闸门自带第二套判据：自己的 numbering 正则、自己的 cwd（header 而非 projection）、自己的「读不到就放行」 | numbering 复用 `numberingMarker()`（/req check 同源）；cwd 复用 `ctx.workingDirectory.ensure`（present 同源）；读取用 `readCompanyFileAt()` 三态（missing 才豁免，unsafe 一律 deny）并登记载体 |
| **C push 范围** | [158](../_archive/fixed_bugs/BUG-158-pre-push-zero-sha-range.md) | zero-SHA 被当成「没有范围」而不是「范围未知」：新分支只看 tip，删 ref 仍去 diff | remote 全零 = `rev-list <local> --not --remotes` 覆盖整个出站提交集；local 全零 = 跳过该 ref |
| **D client 错误文本** | [159](../_archive/fixed_bugs/BUG-159-client-error-ring-empty-object-message.md) | `JSON.stringify` 的 `{}` 真值短路了 `event.message`；跨 realm Error 也只被当普通对象 | `textOf` 先从对象取 `message`/`reason`/`name`，取不到才回退 JSON/未知 |

**次序 = B → C → A → D**：B 是 P1×3 且同一函数，先立「闸门与命令同源」的骨架；C 独立收口另一条 P1；
A 是同一解析层三张 P2，一次改完；D 独立。

**收口（2026-11-14）**：8 张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；每卡 `审查：agent` + 红→绿证据齐，
`## 已修判定` 落卡。`pnpm test` 247 files / 2046 tests、`pnpm test:checks` 4 PASS、
`typecheck`/`lint`/`dup`/`verify` 全绿。证据与未覆盖轴 = [Note](../../notes/implemented/2026-11-14-eight-bug-second-sources.md)。

**2026-11-13 第三轮收口**：BUG-114..139、141..145 已迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；BUG-140 撤回 settled。

**2026-11-12 收口**：BUG-080..089 已迁 [fixed_bugs](../_archive/fixed_bugs/README.md)。

## 2026-11-13 修复交接（第四轮，根因组 G：BUG-147..149）

**用户指令（2026-11-13）**：「_backlog/bugs 这里又找到一堆bug……直到所有bug解决了」。三张 P1 同根：
**写 gate 与 residency 分离**——`exportGovernance` / bundle-manifest / cultivation-storage / revoke-journal /
upgrade log 仍直接拼 `.dsh-company`，根 symlink 时写到 workspace 外。本轮把它们全部迁到 `company-root`
（`ensureCompanyRoot/ensureCompanyDir/writeCompanyAtomic/readCompanyText`）并保留 write-gate；读面（bundle/
`readLedgerExport`）同步安全读。留痕 = Note。

**收口**：3 张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；BUG-150 复核不成立（spec 已传 workspace，55 passed）迁 settled。`pnpm test` 240 files / 1896 tests、
`typecheck`/`lint`/`dup`/`verify` 全绿。证据 = [Note](../../notes/implemented/2026-11-13-last-direct-writers.md)。

## 2026-11-13 修复交接（第三轮，根因组 A–F：BUG-114..145）

**用户指令（2026-11-13）**：「_backlog/bugs 这里又找到一堆bug……setup goal 静默，自主执行……直到所有bug解决了」；
本轮 30 张卡 + 期间新增 144/145，BUG-140 由探索复核撤回（测试选址，非产品缺陷）。本句即授权，留痕 = Note。
终点 = 活跃清单清零、卡全部迁 [fixed_bugs](../_archive/fixed_bugs/) 且 `审查：`/证据齐。

| 组 | 卡 | 同一根因 | 修法 |
|---|---|---|---|
| **A 状态根/形状** | 122/128/129/131/132/134/135/136/137/142/143/133/138/125 | `.dsh-company` 根/中间目录/叶子被 symlink 或文件替换，各自 join 后直读直写 | 共享 `company-root`（逐级 lstat + realpath + 原子写）；catalog/ledger/startup/bootstrap/命令统一 |
| **B 写 gate/lease** | 115/119/121/124/144 | lease 只在 boot 取一次；gate 靠调用点记得调 | `write-gate` + heartbeat token 校验 + 锁路径 lstat；旧写入口全接 gate |
| **C startup** | 120/123 | 坏 JSON 当 auto；危险 cwd 写盘 | `parseStartupSettingsState` + `resolveStartupWorkspace` + writable |
| **D 培养边界** | 117/127/130/139/141 | typed error 只在部分命令收口；adopt 可选短语缺参静默；verify 不看 revoked | 命令边界统一 catch；严格 adopt 形状；revoke 后拒 verify |
| **E 客户端/workflow** | 118/126/140/145 | 投影缺席/partial 崩；同名并发配对互换；任务板只信 store | null/partial 基座补 member；FIFO 配对；槽 projection 兜底 |
| **F 发布/导出** | 114/116 | 整目录替换删旧件；发布清单漏模板/共享 skill | staging 带旧件；must + release-smoke 断言 |

**收口**：`pnpm test` 238 files / 1827 tests、`typecheck`/`lint`/`dup`/`verify` 全绿。
证据与未验面 = [Note](../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)。

## 2026-11-13 修复交接（第二轮，根因组 S1–S6：BUG-104..113）

**用户指令（2026-11-13）**：「_backlog/bugs 这里又找到一堆bug，系统性地思考好怎么把这些bug能修好吧 setup goal 静默，自主执行……直到所有bug解决了……我给你最多的轮次」。
本句即本轮授权（材料性：host/client 行为 + docs 合同 + 命令面），留痕 = Note。
终点 = 活跃清单清零、10 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/) 且 `审查：`/证据齐。

| 组 | 卡 | 同一根因 | 修法 |
|---|---|---|---|
| **S1 任务板 merge/流错误** | [104](../_archive/fixed_bugs/BUG-104-team-task-merge-no-revision-null-view.md) / [112](../_archive/fixed_bugs/BUG-112-team-task-unassign-keeps-old-owner.md) / [105](../_archive/fixed_bugs/BUG-105-stream-error-not-rendered-in-board-dag-tasks.md) | merge 无 revision/基座、owner 缺席语义错；流错误只有 Presence 渲染 | revision + null 基座 + 缺席清 owner；三页签统一 StreamErrorNotice |
| **S2 symlink 穿透** | [108](../_archive/fixed_bugs/BUG-108-catalog-symlink-final-outside.md) / [113](../_archive/fixed_bugs/BUG-113-command-doc-symlink-outside-workspace.md) | workspace 可写目录的 symlink 被跟随读 | `safe-file`：lstat 非 symlink + realpath 在 root；catalog + 三条命令统一 |
| **S3 持久化/导出原子性** | [110](../_archive/fixed_bugs/BUG-110-governance-export-rm-before-rename.md) / [111](../_archive/fixed_bugs/BUG-111-saved-workspace-non-atomic-write.md) | 先删再 rename；settings 直接写 | 整 exports staging + backup 回滚；saved temp+rename + corrupt 可诊断 |
| **S4 warnings 传播** | [109](../_archive/fixed_bugs/BUG-109-catalog-warnings-dropped-in-audit-present.md) | 新增 warnings 只有 boot 消费 | audit 回执计数 + present/回扫逐条 warn |
| **S5 路径空白** | [107](../_archive/fixed_bugs/BUG-107-deliverables-audit-multi-space-path.md) | split+join 折叠连续空格 | 取原始剩余串 |
| **S6 lease PID 复用** | [106](../_archive/fixed_bugs/BUG-106-lease-pid-reuse-blocks-writer.md) | 只用 PID 存活判 stale | heartbeat mtime + 过期接管 + warning |

**收口**：10 张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；`pnpm test` 238 files / 1827 tests、
`typecheck`/`lint`/`dup`/`verify` 全绿。证据与未验面 = [Note](../../notes/implemented/2026-11-13-followup-bug-sweep.md)。

## 2026-11-13 修复交接（根因组 G1–G7：BUG-090..103）

**用户指令（2026-11-13）**：「_backlog/bugs 这里又找到一堆bug，系统性地思考好怎么把这些bug能修好吧」+
「setup goal 静默，自主执行……直到所有bug解决了」「bug数量众多，所以我给你最多的轮次……直到那个所有的bug解决了」。
本句即本轮授权（材料性：host 行为 + 随包内容 + docs 合同 + 命令面），留痕 = Note。
终点 = 活跃清单清零、14 张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/) 且 `审查：`/证据齐。

| 组 | 卡 | 同一根因 | 修法 |
|---|---|---|---|
| **G1 不可信 id 进路径** | [094](../_archive/fixed_bugs/BUG-094-bundle-manifest-id-path-traversal.md) / [102](../_archive/fixed_bugs/BUG-102-req-delivery-rule-path-traversal.md) | 模型可写 id 直接 `join` 进 home/pack 路径 | 单段 slug + residency 前缀 + 成员校验 |
| **G3 培养作用域/对账** | [090](../_archive/fixed_bugs/BUG-090-cultivation-revoke-unreachable-records-deletes-method.md) / [091](../_archive/fixed_bugs/BUG-091-cultivation-check-revoked-broken-unsafe.md) | home 方法层 vs workspace records；破坏性命令把空视图当全局空 | reachable 前置 + `--orphan` 显式确认；check 显式分 revoked/broken/invalid |
| **G2 存在≠可读** | [096](../_archive/fixed_bugs/BUG-096-deliverables-catalog-directory-eisdir.md) / [099](../_archive/fixed_bugs/BUG-099-deliverables-audit-nonexistent-final.md) | `existsSync` 当可读文件；审计不验当前对象 | `isFile()` + warnings + boot catch；audit 目标必须存在且是普通文件 |
| **G4 写入/迁移目标域** | [092](../_archive/fixed_bugs/BUG-092-cultivation-propose-empty-fields.md) / [093](../_archive/fixed_bugs/BUG-093-cultivation-legacy-migration-invalid-slug.md) | 工具入口只靠 schema required；迁移搬旧非法键 | trim 非空 + 往返校验；非法 slug 隔离 `.legacy-invalid/` |
| **G5 状态/事件配对** | [097](../_archive/fixed_bugs/BUG-097-workflow-runs-mispair-failed-call.md) / [098](../_archive/fixed_bugs/BUG-098-presence-pending-transition-shows-deleted.md) / [103](../_archive/fixed_bugs/BUG-103-tasks-tab-empty-despite-team-task-events.md) | 配对只看名字+顺序；状态迁移 else 兜底；任务板只信投影快照 | 用「产生 run 的证据」配对；状态显式分派；事件流补任务板 |
| **G6 发布失败路径/smoke** | [100](../_archive/fixed_bugs/BUG-100-export-dist-deletes-old-before-pack.md) / [101](../_archive/fixed_bugs/BUG-101-concurrent-home-smoke-stale-v2-and-lease-timing.md) | 先删后建；smoke 旧 schema + 单次快照 | staging→全成功再替换；smoke v3 + 轮询 lease |
| **G7 危险落点** | [095](../_archive/fixed_bugs/BUG-095-workspace-resolution-accepts-tmp-root.md) | 手写枚举漏 tmpdir | `dangerousRoots()` 从平台事实派生 |

**次序 = G1 → G3 → G2 → G4 → G5 → G6 → G7**（P1 先收口；同组先扫同类载体）。
**收口（2026-11-13）**：14 张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；`pnpm test` 236 files / 1788 tests、
`typecheck`/`lint`/`dup`/`verify` 全绿；`concurrent-home-smoke` 与 `release-smoke` ALL PASS。
证据与未验面 = [Note](../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)。

## 2026-11-12 修复交接（根因组 W/L/F/V：BUG-080..089）

**用户指令（2026-11-12）**：「_backlog/bugs 都有不少bug，你好好看一看，我们怎么系统性地把这些bug给解决了，它终点是所有bug都得解决，想清楚了之后就set up一个goal」
本句即本轮授权（材料性：host 模型可见文案/行为 + client UI + 随包内容 + docs 合同 + `notes/implemented` 决定），留痕 = Note。
终点 = 本文件活跃清单清零、十张卡全部迁 [fixed_bugs](../_archive/fixed_bugs/) 且`审查：`与证据齐；`pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm lint` 全绿。

十张卡同出 [启动策略 + wiki 回归/探索卡](../_archive/settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A1–A5 / H1–H13）。
按**根因**分四组，不逐症状打补丁：每组先定唯一事实源，再让所有载体消费它；每卡仍按「已修判定」留真红→绿证据。
逐卡修之前先做一次**同类载体扫描**（同组其它手写清单 / 词法路径 / 固定上限 / 整块排除面），把类修掉而不是只修点。

| 组 | 卡 | 同一根因 | 唯一事实源 / 修法 |
|---|---|---|---|
| **W workspace 权威与新鲜度** | [081](../_archive/fixed_bugs/BUG-081-strategy-panel-reads-session-workspace-command-writes-host.md) / [089](../_archive/fixed_bugs/BUG-089-boot-without-workspace-settings-not-injected.md) / [082](../_archive/fixed_bugs/BUG-082-strategy-panel-stale-wiki-check.md) | 同一份 `.dsh-company/startup.json` 有四处解释：面板按 Lead 会话盘读、命令/注入按 boot workspace、boot 无 workspace 时 section 根本不注册、派生 `wikiCheck` 无新鲜度契约 | 新增 `startupWorkspace(boot, agent)`：**会话 cwd 优先、boot 回退**，命令与 section 共用；section 无条件按 agent 注册并在 `agent/created` 补派生；派生检查带 `checkedAt`，过期只在「未刷新」态出现、绝不冒充当前可写/只读 |
| **F 盘上事实** | [084](../_archive/fixed_bugs/BUG-084-wiki-pointer-lexical-path-permission.md) / [085](../_archive/fixed_bugs/BUG-085-startup-options-read-limit-fixed-fixture.md) / [087](../_archive/fixed_bugs/BUG-087-wiki-template-copy-path-repo-only.md) | 用字符串/固定常量冒充盘上事实：词法路径判权限、64 行读上限对照内容增长、仓库相对路径给安装用户 | 权限判据 = 真实路径（`realpath`）+ `statSync().isFile()`；读上限从写方形状派生、截断 fail-loud + 内容预算门禁；模板按安装根给可执行路径，面板给当前部署的绝对路径 |
| **L 表达层单一源** | [080](../_archive/fixed_bugs/BUG-080-en-tab-title-map-missing-strategy.md) / [083](../_archive/fixed_bugs/BUG-083-company-settings-host-command-strings-mixed-language.md) | 页签/命令文案有第二份手写或单语载体：探针 `EN_TAB_TITLES`、host 命令 `description` / `SETTINGS_USAGE` / 未知字段错误 | 探针 en 标题从 `locales.ts` 同一份字典派生（不再手维护）；host 命令文案进同一字典、按语言注册/重注册；en 无 CJK 的 keyless 断言 |
| **V 验证面** | [088](../_archive/fixed_bugs/BUG-088-shipped-links-excludes-wiki-template.md) / [086](../_archive/fixed_bugs/BUG-086-strategy-button-tooltip-no-values.md)（+ 各组守卫） | 门禁为消假红整块排除，测试只证「在场」不证承诺行为 | 模板按模板自身根验链（不再整目录排除）；tooltip 值进 spec + 真页面断言；每组新 spec/门禁都留红证 |

**次序 = W → F → L → V**：W 先定 workspace/新鲜度契约（后面几组的读路径依赖它）；F 在同一 startup 模块收口盘上事实；
L 依赖 `settings-command` 的 W 重构后再动命令文案；V 独立收口并在每组补守卫。

**已定产品口径（BUG-081）**：启动策略跟随**会话所在项目**（Lead 会话 cwd；子会话继承 parent cwd，见 vendor
`packages/subagent/subagent/src/child-agent.ts`），boot workspace 只在会话无 cwd 时回退。面板本来就按 Lead 读；
命令与注入改齐即可，不为同一事实再造第二套解析。输掉的方案 = 「面板改读 host workspace」——需要新的
host→client 读面，且会话在别的项目时会显示另一个项目的策略；`/req` / `/prd` 的 `commandWorkspace` 不动
（公司数据根 ≠ 项目策略根）。本决定落 Note。

**逐卡收口**：先写 `## 已修判定`（可点名验证搭载的工作）再翻 `修复就绪`；落树翻 `修复已落地` 并记 `审查：agent` +
红→绿证据；最后 `git mv` 到 [fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引。真页面/安装面按卡点名：
`ui-scene-smoke --isolated --lang en`（080/086）、`release-smoke`（087）、模板内坏链接红证（088）。

**收口（2026-11-12）**：十张卡全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/)，两张索引同步；
`pnpm test` 236 files / 1761 tests、`pnpm typecheck`、`pnpm lint`、`pnpm dup`、`pnpm verify` 全绿；
`ui-scene-smoke --isolated --lang en` 10/10 无中文、`release-smoke` ALL PASS。
决定、红→绿证据与未验面 = [Note](../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)。

**2026-11-11 根因组 A（产品类型轴三处各自为政）——已收口**：允许值、默认值、播种各有一份事实。
三张卡已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；次序 = 先定单一来源 → 再校准默认 →
再让播种消费；证据 = [Note](../../notes/implemented/2026-11-11-product-type-single-source.md)。

| 卡 | 一句话 | 严重级 |
|---|---|---|
| —（本轮） | BUG-079 已修并迁 [fixed_bugs](../_archive/fixed_bugs/BUG-079-ceo-teammate-spawn-header-no-child-channel.md)：spawn/fork/retry 按 `childDepth > depth` 门控，control 消费同一座位；见 [Note](../../notes/implemented/2026-11-11-seat-spawn-depth.md) | — |
| —（本轮） | BUG-076 / 077 / 078 已修并迁 [fixed_bugs](../_archive/fixed_bugs/)：座位矩阵第二层（team 拆协作/spawn、九件套 guard + seat note、control 按 child 能力）；见 [Note](../../notes/implemented/2026-11-11-seat-matrix-team-collaboration.md) | — |
| —（本轮） | BUG-071 / 072 / 073 / 075 已修并迁 [fixed_bugs](../_archive/fixed_bugs/)：能力事实四载体（安装 / 座位 / header / 文档+内容）对齐；见 [Note](../../notes/implemented/2026-11-11-capability-seat-single-source.md) | — |
| —（本轮） | BUG-074 复核为**误报**（WeakSet 不挡 re-provide；`ctx.set` 不是 re-provide），已迁 [fixed_bugs](../_archive/fixed_bugs/BUG-074-per-agent-inject-not-reinstalled-on-service-change.md)：保留 guard + 注释 + 真 Cordis spec；见 [Note](../../notes/implemented/2026-11-11-inject-reentrancy-false-positive.md) | — |
| —（历史） | BUG-067 / BUG-068 / BUG-069 / BUG-070 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：pack 路径 / tier / 政策数字 / 委派真值四类声明↔载体对账；见 [Note](../../notes/implemented/2026-11-11-declaration-carrier-gates.md) | — |
| —（历史） | BUG-064 / BUG-065 / BUG-066 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：方法契约（类型适用性 + 事实载体 + fail-closed）+ `method-contract` 门禁；见 [Note](../../notes/implemented/2026-11-11-method-contract-type-facts.md) | — |
| —（历史） | BUG-056 已修并迁 [fixed_bugs](../_archive/fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md)：质量环裁决头哈希改由 pack 内 `verdict-hash.mjs` 回填；`未复验` 成为 audit warning | — |
| —（历史） | BUG-054 / BUG-055 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：dev/rehearsal kb 改由 seed.json 派生；team 角色包补任务书路径 + 署名行只抄真实文件 | — |
| —（历史） | BUG-051 / BUG-052 / BUG-053 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：worker family 的 control 过滤 + fan-out 诚实声明；`subagent_retry` 取消收敛 | — |
| —（历史） | BUG-050 复核为**环境陈旧误报**（dev profile 安装副本未更新），已迁 [fixed_bugs](../_archive/fixed_bugs/BUG-050-retry-depth-fix-fails-in-real-assembly.md)；BUG-045 / 046 / 047 / 048 / 049 已修 | — |
| —（历史） | BUG-045 / BUG-046 / BUG-047 / BUG-048 / BUG-049 全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：retry 注册面/深度单源 + 越界可见拒绝；`list_subagents` 暴露引擎身份；handbook 按 worker family 派生；UI 金样随显示名收窄刷新 | — |
| —（历史） | BUG-034 / BUG-035 已修并迁 [fixed_bugs](../_archive/fixed_bugs/)：SA/SQA 证据链必查（时间源 + 故障路径耐受）+ 审计 Q8–Q11；2026-11-07 E2E v8 验收 | — |

## 2026-11-11 修复交接（根因组 S：BUG-076 / 077 / 078）

**用户指令（2026-11-11）**：「现在你再看看bug里头有3个新的bug……把这3个bug都修了，系统性的先看看明白。」
本句即本轮授权（材料性：host 模型可见文案/行为 + content + docs），留痕 = Note。

三张卡同一根因 = **座位矩阵只建了一半**：BUG-072 只建模了“能不能 spawn”一个布尔，其余座位面仍按
preset 或单一 Lead 布尔推导：
- **076** = support root 只撤了 spawn 守卫；vendor `team:policy`/`team:identity` 与任务/消息面仍在（ghost task）；
- **077** = 一个 `team` 通道同时表示“Lead 的 spawn 权”与“成员的协作面”，teammate 被误伤；
- **078** = 控制工具按 preset 装，不看这个座位有没有 child（CEO teammate 拿到死工具）。

修法不逐卡打补丁：先建一个 `DelegationSeat`（lead/teammate/support + teamLead/teamCollaborate/controlsChildren），
header/section、guard、control 三处都读它；team 在 header 拆成 `team collaboration` 与 `team spawn (Lead only)`；
guard 从 spawn 扩到九件套；control 按“这个座位能不能拥有 child”装（不按 preset/角色一刀切）。
次序 = seat 判据 + spec → header/section/guard → control → 文档与 Note。

**收口（2026-11-11）**：三张卡已修并迁 [fixed_bugs](../_archive/fixed_bugs/)，两张索引同步；
`pnpm test` 199 files / 1594 tests、`pnpm typecheck`、`pnpm lint`、`pnpm dup`、`pnpm verify`、`preset-smoke` 全绿。
证据 = [座位矩阵 Note](../../notes/implemented/2026-11-11-seat-matrix-team-collaboration.md)。

## 2026-11-11 修复交接（根因组 F/G/H：BUG-071..075）

**用户指令（2026-11-11）**：「_backlog/bugs 有不少bug你要看看……最后把所有的bug都修了吧，你先盘算盘算。」
本句即本轮授权（材料性：host 模型可见文案 + company-pack 公开行为 + preset skill + 文档），留痕 = Note。

五张卡按**根因**分三组，不逐症状打补丁：

| 组 | 卡 | 同一根因 | 修法 |
|---|---|---|---|
| **G 注入生命周期** | [074](../_archive/fixed_bugs/BUG-074-per-agent-inject-not-reinstalled-on-service-change.md) | 原假设 = 把可重入的 `ctx.inject` 当成“每 Agent 跑一次”的 setup；**实测证伪** = WeakSet 只挡重复 `agent/created`，re-provide 仍重跑；卡里的 `ctx.set` 复现不是 re-provide | 保留三个 WeakSet 在正确位置 + 注释；真 Cordis spec 钉「re-provide 重装 / `ctx.set` 不通知 / 重复 created 不重复装」；红证 = 把 WeakSet 挪进 callback 即红 |
| **F 座位能力面** | [071](../_archive/fixed_bugs/BUG-071-capability-header-not-installed-wording.md) / [072](../_archive/fixed_bugs/BUG-072-support-root-can-spawn-team.md) / [073](../_archive/fixed_bugs/BUG-073-readme-one-shot-child-team-tools-stale.md) | 同一个能力事实有四个载体（工具安装 / 座位权限 / header 文案 / README+合同），各说各话 | 071 = 文案改“本座位不可用”（安装 ≠ 可用）；072 = support preset 不作 team 座位（header/section 不列）+ per-agent `spawn_teammate` guard；073 = README 已知限制改现行事实并回链守卫 |
| **H 内容单源** | [075](../_archive/fixed_bugs/BUG-075-eng-teaming-schema-rule-duplicated.md) | 合同缩编只搬长段、没扫表格短句，形成“声明不复述 + 实际复述” | 五档表删 schema 引擎句，只留用法判据；全 preset 扫描同型残留 |

**次序 = G → F → H**：G 先做（独立；结论 = 误报，保留 guard + 补真 Cordis spec）；F 再动 header/guard/文档；H 最后收内容。
**收口（2026-11-11）**：五张卡已修/已证伪并迁 [fixed_bugs](../_archive/fixed_bugs/)，两张索引同步；
`pnpm test` 198 files / 1581 tests、`pnpm typecheck`、`pnpm lint`、`pnpm verify`、`preset-smoke` 全绿。
证据 = [座位 Note](../../notes/implemented/2026-11-11-capability-seat-single-source.md) ·
[注入生命周期 Note](../../notes/implemented/2026-11-11-inject-reentrancy-false-positive.md)。

**2026-11-11 后续（E5–E11，根因组 B/C/D/E）——已全部收口**：经营组 B/E（064–066）与
内容/门禁组 C（067–069）+ 委派语义（070）均已修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；
证据 = [经营组 Note](../../notes/implemented/2026-11-11-method-contract-type-facts.md) ·
[声明↔载体 Note](../../notes/implemented/2026-11-11-declaration-carrier-gates.md)。

## 2026-11-11 修复交接（内容/门禁组 C + D：BUG-067 / 068 / 069 / 070）

**用户指令（2026-11-11）**：按审计建议 064 → 065/066 → 067–069 → 070 排期继续收口。
四张卡同型 = 声明↔载体漂移（pack 路径 / tier 标签 / 政策数字 / `maxDepth` 例子）；
修法 = 新 `pack-content-paths` + `content-manifest` tier 对账 + `content-single-home` 派生词表 +
`base-clean` 个案语言 denylist + 委派真值表 spec；留痕 = Note。

| 卡 | 根因 | 修法 | 留痕 |
|---|---|---|---|
| [BUG-067](../_archive/fixed_bugs/BUG-067-process-docs-dead-pointers.md) | pack-relative 死指针 | 新门禁 `pack-content-paths`；4 处 process-docs 指针改类型包 | Note |
| [BUG-068](../_archive/fixed_bugs/BUG-068-base-clean-deployment-case-language.md) | 门禁判据窄于教义 | 服务类附赠整块搬 policy-lines；`base-clean` 加 charter 个案语言 denylist | Note |
| [BUG-069](../_archive/fixed_bugs/BUG-069-tier-policy-gate-coverage.md) | tier / 政策数字自由文本 | `content-manifest` 解析 `加载：` 对账；`content-single-home` 从 policy-lines 派生词表 | Note |
| [BUG-070](../_archive/fixed_bugs/BUG-070-delegation-maxdepth-example-wrong.md) | 文档例子违背绝对语义 | `delegation.md` 真值；vendor `resolveChildDepth` keyless spec | Note |

**收口（2026-11-11）**：四张卡已修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；`pnpm verify` / `pnpm test` /
`pnpm typecheck` / `pnpm lint` 绿；决定与红→绿证据 = [Note](../../notes/implemented/2026-11-11-declaration-carrier-gates.md)。

## 2026-11-11 修复交接（经营组 B/E：BUG-064 / 065 / 066）

**用户指令（2026-11-11）**：「没事，出来的继续做……都修好」「按审计建议 064 → 065/066 → 067–069 → 070 排期」——
本句即本轮授权（材料性：presets / content / docs）。三张卡同型 = 方法没有声明类型 / 事实、缺了不 fail-closed；
修法 = 方法契约 + 事实载体（`kb/rates.md` / `kb/roster.md`）+ `method-contract` 门禁；留痕 = Note。

| 卡 | 根因 | 修法 | 留痕 |
|---|---|---|---|
| [BUG-064](../_archive/fixed_bugs/BUG-064-methods-not-product-type-aware.md) | 方法不随类型 | 10 个经营侧 skill 加方法契约；项目制方法只适用 hardware-software，business-software fail-closed；三个 workflow 加类型分派 | Note |
| [BUG-065](../_archive/fixed_bugs/BUG-065-cfo-rate-card-missing.md) | 费率无出处 | 新增 `content/company/rates.md` → seed `kb/rates.md`；CFO 方法改读；`<待填>` = 配置缺口 | Note |
| [BUG-066](../_archive/fixed_bugs/BUG-066-coo-person-level-staffing-without-roster.md) | 证据粒度错位 | 新增 `content/state/roster.md` → seed `kb/roster.md`；COO 三态区分配置缺口 / 真没人 | Note |

**收口（2026-11-11）**：三张卡已修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；`pnpm verify` / `pnpm test` /
`pnpm typecheck` 绿、`preset-smoke` ALL PASS；决定与红→绿证据 = [Note](../../notes/implemented/2026-11-11-method-contract-type-facts.md)。

## 2026-11-11 修复交接（根因组 A：BUG-061 / 062 / 063）

**用户指令（2026-11-11）**：「_backlog/bugs 也发现了几个bug，你看一看，判断一下修的次序，我们把它都修好吧」——本句即本轮授权。
三张卡同根因（产品类型轴三处各自为政：允许值 / 默认值 / 播种），按「先定单一来源 → 再校准默认 → 再让播种消费」
次序修复；修复触碰 `presets/_shared/skills/product-definition/`、`content/{charters,templates,state,kb-setup,product-types}/`、
`docs/guides/` 与 host 代码（company-pack 公开行为 + docs 合同 = 材料性），按章程「材料性修复不自授权」本应请示；
用户本轮明确点名修复，按「已由用户授权的工作按原授权继续」执行；留痕 = Note。

| 次序 | 卡 | 根因 | 修法 | 留痕 |
|---|---|---|---|---|
| 1 | [BUG-061](../_archive/fixed_bugs/BUG-061-product-type-allowed-values-drift.md) | 允许值多源 + 幽灵第三类 | 类型目录 = 唯一枚举；agent 面改指针；新门禁 `product-type-sources`；`project-services` 标未来类型（沿用 2026-11-10 决定） | Note |
| 2 | [BUG-062](../_archive/fixed_bugs/BUG-062-default-product-type-contradicts-business.md) | 默认值不随业务 | 默认改 `business-software`；`/req check` 回执点名 company 回落来源 | Note |
| 3 | [BUG-063](../_archive/fixed_bugs/BUG-063-bootstrap-process-docs-always-hardware.md) | 播种不看类型 | seed 用 `{productType}` 占位；bootstrap/tools 解析 + 缺/未知 fail-closed | Note |

**收口（2026-11-11）**：三张卡已按上述次序修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；
`pnpm verify` / `pnpm test` / `pnpm typecheck` 绿、`preset-smoke` ALL PASS；决定与红→绿证据 =
[Note](../../notes/implemented/2026-11-11-product-type-single-source.md)。

**收口要求**：每卡按「已修判定」留真红→绿证据与 `审查：` 记录，再 `git mv` 到
[fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引；`pnpm verify` + `pnpm test` 全绿
（TS 面加 `pnpm typecheck`）；改 preset skill 后跑 `preset-smoke`。

## 2026-11-10 修复交接（BUG-057）

**用户指令（2026-11-10）**：「先修 BUG-057；058 留决策」——本句即授权。BUG-057 触碰 pack 公开命令面
（`/req check` / `/prd check`），属材料性；留痕 = Note。

| 根因 | 卡 | 留痕 | 收口方式 |
|---|---|---|---|
| 操作员 slug 直接 `join` 进 deliverables 路径 | [BUG-057](../_archive/fixed_bugs/BUG-057-command-slug-path-traversal.md) | [Note](../../notes/implemented/2026-11-10-command-slug-boundary.md) | 共享 host-only `resolveDeliverablePath`（单段正则 + `relative` 纵深）；两条命令 spec 红→绿 + 真入口复跑 |
| dataBlocked 压成布尔、回执说「无 … 问题」 | [BUG-058](../_archive/fixed_bugs/BUG-058-command-datablocked-reason.md) | [Note](../../notes/implemented/2026-11-10-command-blocked-reason.md) | `CompanyRuntime.blockedReason` + `blockedCompanyText` 四处共用；guard/命令 spec 红→绿 + 无 workspace 真入口复跑 |
| 质量环 audit 的原文索引跨轮全局 | [BUG-059](../_archive/fixed_bugs/BUG-059-quality-loop-audit-r2-session-index.md) | commit 86410729 | `Map<sessionId,index>`；R2 新 verifier session 合成红→绿 + 真盘 R2 audit ALL PASS |
| 只读命令被启动态 dataBlocked 挡住 | [BUG-060](../_archive/fixed_bugs/BUG-060-readonly-command-session-workspace.md) | [Note](../../notes/implemented/2026-11-10-readonly-command-session-workspace.md) | `commandWorkspace` 用会话 cwd；`/req`/`/prd` 红→绿 + 无 workspace 启动真入口 success；写命令不改 |

## 2026-11-10 修复交接（第二轮：BUG-054 / BUG-055）

**用户指令（2026-11-10）**：「我有两个bug，你看一看，按照我们的流程把它修了吧」——本句即本轮授权。
BUG-055 触碰 `presets/` + `content/generic/`（company-pack 公开行为 = 材料性），按章程「材料性修复
不自授权」本应请示，但用户已在本轮明确点名修复，按「已由用户授权的工作按原授权继续，不重复请求批准」
执行；留痕按材料性规则给 Note。BUG-054 只动 `tools/` + tests + 指南事实句，非材料性，留痕记
`commit 684d09db`（工作树另有并发会话的 BUG-056 卡与 issue 卡改动，未纳入该提交）。

| 根因 | 卡 | 留痕 | 收口方式 |
|---|---|---|---|
| 旁路 fixture 与生产 seed 三份清单漂移（mirror 10 件 vs seed 14 件） | [BUG-054](../_archive/fixed_bugs/BUG-054-dev-rehearsal-kb-policy-lines-missing.md) | commit 684d09db | 新增 `tools/lib/core/kb-seeds.mjs`；mirror / `bundle-init` 只从 seed.json 派生；parity spec 钉同清单/同字节/only-fill |
| 角色包缺任务书字段、署名行写死默认路径 | [BUG-055](../_archive/fixed_bugs/BUG-055-team-role-packet-missing-taskbook.md) | [Note](../../notes/implemented/2026-11-10-team-role-packet-taskbook.md) | 角色包加 `任务书` + `署名行`；spawn 前先落 `drafts/ceo.md`；署名行只抄真实路径；presets spec + 真模型探针 |

## 2026-11-10 修复交接（第三轮：BUG-056）

**用户指令（2026-11-10）**：「你这两个半修好了之后，现在又有多余的一个新的bug了，你就继续修」——
BUG-056 是第八轮 exploratory 中发现的 P2；本轮修复触碰 `presets/_shared/skills/quality-loop` 与
pack 内新脚本（company-pack 公开行为 = 材料性），用户点名即授权。留痕 = Note。

| 根因 | 卡 | 留痕 | 收口方式 |
|---|---|---|---|
| 裁决头 hash 靠手算（`tail \| shasum` 含尾随换行）；裁决后改产物无可见标记 | [BUG-056](../_archive/fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md) | [Note](../../notes/implemented/2026-11-10-quality-loop-verdict-hash.md) | pack 内 `verdict-hash.mjs`（`--fix`/`--check`/`--body`）+ skill/guide 只教工具 + audit `post-verdict-unverified` warning；keyless + self-test + 真盘 evidence |

**2026-11-10 修复交接（第一轮：BUG-051/052/053，已收口）**：

**用户指令（2026-11-10）**：「_backlog/bugs 里面还有3个bug，如法炮制，先琢磨清楚之后按照我们这个repo的来修复吧，你来看看系统性的是不是有些规律，而不是一个一个修」。
三张卡按根因分两组修复并归档；本轮真装配探针另确认：只跑 `tsc -b` 不会更新 `lib/index.js`，
必须先 `tsdown` 重建 bundle（BUG-050 同型教训）。

| 根因 | 卡 | 收口方式 |
|---|---|---|
| E 声明面 / 执行面分裂（capability surface 两份事实） | [BUG-051](../_archive/fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md) ✅ + [BUG-052](../_archive/fixed_bugs/BUG-052-worker-leaf-control-surface.md) ✅ | 051 = 诚实声明（模型 `fanOut: parent-brief`，preset 不再承诺 1–2 硬数字，spec 钉文案）；052 = 硬过滤（control 工具 per-agent 安装，跳过 `WORKER_FAMILY_PRESETS`） |
| F 阻塞原语没有取消语义 | [BUG-053](../_archive/fixed_bugs/BUG-053-cancel-does-not-abort-subagent-retry.md) ✅ | `abortable` race + `ctx.subagents.interrupt(child)`，返回 `aborted`；keyless + 真装配 cancel 探针（35ms 收敛、无残留） |

**2026-11-09 修复后回归**：BUG-050 初报“retry 深度修复在真实装配失效”经复核为**环境陈旧误报**——
dev profile 的 `node_modules/dsh-company-pack` 是旧安装副本，`plugin add link:` 到当前源码后
CMO depth 2 正常返回 `depth-exceeded`。教训：真模型/真入口探针前先确认 profile 安装是当前源码/构建；
`pnpm test` + 重建 `lib` 都不能替代那一步。

**2026-11-08 六张卡同轮来源**：workflow + subagent 探索性测试（问题卡
[exploratory bug hunt](../_archive/settled_issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)）。发现方向 =
R2 强制 workflow + 缺失/坏源（036）、R3 委派深度链（037）、R5 W 分支内再委派（038）、
R7 原样返回全量 rows 的溢出压力（039）、R10 后台 W 中模型自选文本回答（040）、RS1 宿主重启（041）；同轮当场修掉的两条（命名 child 双重回执、CEO sleep 轮询）
记在 [探索 Note](../../notes/implemented/2026-11-08-workflow-subagent-exploration-fixes.md) 与
[研究材料结果节](../_archive/research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。

**2026-11-07 BUG-034/035 收口**：两张 P1 同源——「属性没人测 = 属性不存在」。修法 = 两侧 skill 各加两条条件必查
（记录与时间可信、故障路径的耐受）+ `sa-sqa-quality-audit` 新增 Q8–Q11（SA 侧 + SQA 侧）+ 两条 keyless 用例；
E2E `2026-11-07-portable-overload-detection-v8` 的 SA/SQA 产物 Q1–Q11 全 PASS、收口审计 10/10。
顺带修掉一个让所有 skill 改动都失效的前置缺陷：两个子人格 preset 缺 `tool-skill`、persona 未点名先加载，
技能正文从没被模型读到（run#3/run#4 日志 0 次 skill 名）。教训同 2026-10-19 三张卡：
**量得再准，量的也可能是别的东西**——这次是「技能装上了 ≠ 模型读到了」。

**2026-10-19 BUG-028 收口**：闸门④认总锚（title 或 prompt 点名即算，依赖链一并传递），lingang-recon 由 3 条误报 → 0 条违规；
守卫 = `tests/tools/deliverables-audit.spec.ts` 两条 keyless 断言（锚粒度 + 依赖链）。教训同 BUG-014：
**锚的粒度选错**——判据把纪律的意图（有真跟进为证）翻译成了一种形状（每个 T 号各一条锚），
于是纪律自己鼓励的"一条复查盯全部缺料"反倒撞红。

**2026-10-19 三张卡收口**：BUG-025 四条判定逐条成立，已修迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；
BUG-026 经实证为**误报**（wire 视图 ownerName 273/273 齐全，卡读的是 projcache 的 **state** 行）
已修迁 [fixed_bugs](../_archive/fixed_bugs/BUG-026-owner-missing-from-team-projection.md)（2026-11-09 由 `settled_issues` 改归：误报卡仍进已修缺陷表）；
BUG-027 症状真实但**根因不成立**（`ready ?? readyOf()` 在真 wire 上不可达），按真根因（徽章渲染门槛不看
status）修复后迁 [fixed_bugs](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)。

⚠ **三张卡共用的教训**：复现脚本必须指到**消费者真正读的那一层**。025 量的是盘上的 deliverables
（面板读的是动议表）、026/027 量的是 projcache 的 state（浏览器收的是 wire 视图）——
量得再准，量的也是别的东西。

BUG-001..022 已修迁、BUG-023 误报 [fixed_bugs](../_archive/fixed_bugs/BUG-023-cultivation-float-actions-dead.md)（2026-11-09 由 `settled_issues` 改归）、BUG-024 已修 [fixed_bugs](../_archive/fixed_bugs/README.md)。

## 2026-11-09 修复交接（本轮）

**用户指令（2026-11-09）**：「按照我们的流程排一个计划，之后逐一修复吧」「最好是系统性地看明白了，
从根上去解决……放在一块儿看看根上可能有问题，导致了两个现象或者三个现象」。五张卡（BUG-045..049）
已翻 `修复就绪`；本次修复触碰 company-pack 公开行为 / docs 合同，正常自授权不覆盖——本节用户明确指示
即授权（截至 2026-11-09 的授权记录）。修复按根因分组，不逐症状打补丁：

| 根因 | 卡 | 收口方式 |
|---|---|---|
| A 唯一期望源不覆盖后加能力面（声明↔运行时双源） | [BUG-049](../_archive/fixed_bugs/BUG-049-model-contract-retry-drift.md) ✅ + [BUG-045](../_archive/fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md) ✅ | 模型声明合同载体与 retry 注册面/深度（从 `depthRows.subagent` 派生）；pack `SUBAGENT_RETRY_SURFACE` 成唯一运行时表；`subagent_retry` 按调用者 preset 预算放行/可见拒绝 |
| B worker family 边界按 ID 白名单 | [BUG-047](../_archive/fixed_bugs/BUG-047-worker-family-handbook-scope.md) ✅ | 模型声明 handbook 归属（archetype 派生）；pack 默认按 worker family 派生 skip 集合 |
| C 模型可见面窄于引擎 durable 语义 | [BUG-046](../_archive/fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md) ✅ | `list_subagents` 读 child header 暴露 `agentPreset`/`delegationDepth`，缺失显式 `unavailable` |
| D 显示名变化未触发 UI 金样刷新 | [BUG-048](../_archive/fixed_bugs/BUG-048-ui-golden-brand-name-drift.md) ✅ | 确认意图后刷新金样；补 content→金样同 diff 映射 |

**收口要求**：每卡按「已修判定」留真红→绿证据与 `审查：` 记录，再 `git mv` 到
[fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引；`pnpm verify` + `pnpm test` 全绿（TS 面加
`pnpm typecheck`）；不修改 `vendor/dsh/`。

## 2026-11-08 修复交接（另一 Agent）

**用户指令（2026-11-08）**：“那这样我们可以先停一下，让另外一个Agent去修复发现的所有的bug。”
本区 6 张卡已翻 `修复就绪`：该翻转即门票；**因为修复会触碰 company-pack 公开行为 / docs 合同 /
常设指令，正常自授权不覆盖——本节的用户明确指示才是授权**。修卡不重新推敲范围，按各卡「已修判定」收口。

| 卡 | 级别 | in-repo 修复面（可改） | vendor 侧（只提上游，不改 `vendor/dsh`） |
|---|---|---|---|
| [BUG-036](../_archive/fixed_bugs/BUG-036-workflow-schema-enum-type.md) ✅ | P2 | 已修（2026-11-08）：`eng-teaming` 四条子集约束 + 合同钉子 `tests/contract/json-schema-subset.spec.ts` | `tool-workflow` 的 model-facing description / 子集校验提示（提案待上游） |
| [BUG-037](../_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md) ✅ | P2 | 已修（2026-11-08）：新增 `list_subagents` / `send_to_subagent`（官方 `ctx.subagents`，名字不被团队版 shadow）+ docs/§4 + `eng-teaming` | agent-team 的 `tryMembership` shadow（提案待上游；修好后退役两工具） |
| [BUG-038](../_archive/fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md) ✅ | P2 | 已修（2026-11-08）：`eng-teaming` 分支叶子规则 + 真跑观察（模型首轮自纠）+ 钉子 `workflow-contract-smoke` 第 6 条 | `workflow-ptc` 分支结果只取最后一轮结论（提案待上游） |
| [BUG-039](../_archive/fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md) ✅ | P1 | 已修（2026-11-08）：vp-eng preset 抬 `maxResultChars` 到 200k；探针证 spill 全文 71,677 字符可读；钉子 `tests/contract/workflow-result-budget.spec.ts` | `tool-workflow` 默认值下先截断再落盘的语义（提案待上游） |
| [BUG-040](../_archive/fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md) ✅ | P2 | 已修（2026-11-08，产品规避）：`eng-teaming` 分支禁传 schema、改单行 JSON + 父 parse；smoke 第 7 条 | `runtime.ts` 缺形状不匹配诊断（上游提案保留，恢复 schema 前必须有） |
| [BUG-041](../_archive/fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) ✅ | P1 | 已修（2026-11-08）：`list_subagents` 带 `lastTurnEnd`（durable 日志读，RS1 实测 interrupted）；ops 部署前置一行 | resume 时补 `subagent/end` 通知（体验增强，不再阻塞） |

**收口要求**：每卡修完翻 `修复已落地`，写 `## 已修判定` 对应的真红→绿证据与 `审查：` 记录，再 `git mv`
到 [fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引；`pnpm verify` + `pnpm test` 全绿；
不修改 `vendor/dsh/`（vendor 侧写清上游提案即可）。探索轮已落地的缓解（skill/docs/注释）不重复做，
先核对再补缺口；证据落 `runtime/tmp/explore/`（gitignored）或新 keyless spec。

## frontmatter 与模板

第一行 `---`，字段按 `status` / `severity` / `opened` 顺序。活跃状态 = `调查中`（原 `活跃`，2026-10-12 改名——与「活跃清单」撞词）/ `修复就绪` / `修复已落地` / `等人拍板`，出口值 `已修`/`待修`；翻转法与修复授权边界唯一家 = 章程「双轨状态生命周期」「缺陷的通道」。严重级为 `P0` 阻断 / `P1` 重要 / `P2` 次要——哪个级别走哪条通道见章程（severity 的消费者）。迁档时仅改 `status`，其余字段保留，状态行补 `审查：agent｜用户｜跳过 — 理由`。

```markdown
---
status: 调查中
severity: P1
opened: YYYY-MM-DD
---

# BUG-<NNN>：<一句话标题>

> 严重级别：P1（重要）｜发现：YYYY-MM-DD｜状态：调查中
>
> **留痕**：（归档时写三选一：`Note <notes/ 下真实路径>` ｜ `commit <sha>` ｜ `none — 理由`；判据 = 章程「缺陷的通道」的材料性）

## 症状
可观察的偏差、触发条件与影响面（host / client / preset / content / composition / tooling / release / vendor / environment）。

## 运行面
本缺陷落在哪个 DSH 面；这决定复现命令与证据档。面不明 = 还没到 `修复就绪`。

## 复现
最小、确定、可复跑的一条命令（**放进围栏或行内 code**；裸行不算）；修复前必须真红。贴命令与关键输出（脱敏）。

## 根因与证据
假设（可多条）→ 确认证据（会话日志 / `--dump-config` / bundle / git 历史 / 对照实验 / 真挂载）。未确认的假设留在卡上，不写成事实；翻 `修复就绪` 前必须已确认。

## 失败类与同类排查
本缺陷代表哪类失败（见 [failure classes](../../tests/failure-classes.md)）；同类调用点/载体扫了什么、结论是什么；不扫写理由。

## 修复方案与范围
根因修法（不是症状补丁）、改动面、明确不改的面、vendor 边界、材料性判断与留痕建议。

## 已修判定
修成什么算修好；可点名验证搭载的工作（其验证随那次运行给出真实答案才动）。翻转到 `修复就绪` 前必须写好——该翻转即门票且授权（限 P1/P2 修复型；排除项见[章程](../README.md)「缺陷的通道」，此处不列）。`修复就绪`/`修复已落地` 缺这一节 = `pnpm verify` 红（门禁查形状，不查判据写得对不对）。

## 修复证据
（`status: 已修` 且 `opened` ≥ 2026-11-14 必填；缺一即 `pnpm verify` 红——判据唯一家 = [章程](../README.md)「缺陷的通道」）

- 改动面：`path/to/changed`（存在，或在证据提交里被删除/重命名；不落在 `_backlog/`、`notes/`、`vendor/`）
- 红：还原什么 → 哪条断言红（实跑过的命令与结果；命令须可解析且非空操作：pnpm 脚本在 package.json、npx bin 在本地、路径存在；`sh -c`/`git` 不算）
- 绿：接回什么 → 哪条断言绿（同一命令）
- 提交：commit <sha>（红→绿所在提交；门禁对账：该提交必须真改到改动面）
```

`2026-11-15` 前的卡沿用旧节名（`根因（假设）` / `暴露的失败类` / `修复关联`），不追改；新卡按本模板。旧卡若要从 `调查中` 翻 `修复就绪`，先按新节名补齐——旧节名只在归档历史里保留。

## 修复批次模板（多卡同轮）

批次 = 本轮选择一起修的子集，不是所有活跃卡。先写这张表，再逐卡修；批次记录写进上方「修复交接」节（按日期加节），本表只是模板，卡仍是每 bug 的合同。

| 组 | 卡 | 共同根因（证据） | 修法（唯一事实源） | 顺序 | 证据 |
|---|---|---|---|---|---|
| A | BUG-… / BUG-… | … | … | 1 | 同一命令 / commit … |

一个组一个根因；一张卡只进一个组；组内一提交可服务多卡，但每卡的 `## 已修判定` 与 `## 修复证据` 必须各自成立。**一个共享机制决定一篇批次 Note（多机制可伞 Note 分节）；独立机械修复用 commit。**
