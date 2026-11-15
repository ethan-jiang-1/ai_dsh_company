# 2026-11-15 · 测试树分轴：镜像成为不变量，owner 轴有名有姓

状态：implemented（2026-11-15 落地；卡 = [tests-tree-axis](../../_backlog/_archive/settled_issues/2026-11-15-tests-tree-axis.md)，研究 = [tests-src-correspondence](../../_backlog/_archive/research/tests-src-correspondence/README.md)）

> 上游 = 用户 2026-11-15「测试底下要拆分出的子目录，最好是跟源码能对应起来」+ 研究题实测：244 个 spec 里 100 个（41%）没有源码对象；`tests/host` 9/11、`tests/client` 6/6、`src/lib` 与 `tests/lib` 同为平铺。本轮只动测试树与四份文档，不动源码面。

## 决定

1. **镜像从散文变成断言。** 新增 [mirror.spec.ts](../../tests/repo/structure/mirror.spec.ts)：`src/host/*` ↔ `tests/host/*`、`src/client/*` ↔ `tests/client/*` 的目录名集合相等；对不上的必须在一张带理由的表里登记，且**登记过的例外必须仍然对不上**（补齐后忘了删 = 红）——例外表因此不会腐化成第二份过期清单。另断言 `src/lib` 与 `tests/lib` 同为平铺（不造 33 个子目录）。五条例外：源侧 `fs/`（safe-file 叶子，唯一证据由调用方 spec 带）、源侧 `logging/`（rotating-log 同上）、测试侧 `contract/`（跨载体不变量）、测试侧 `index/`（根组合面，对应 `src/index.ts` 而非某个组）、测试侧 `i18n/`（属性区，一次扫多组）。
2. **`tests/repo` 换轴：35 个 spec 按「谁的事实」分六个 owner 目录。** structure 7 · pack 6 · release 6 · docs 7 · budget 7 · security 2，加新镜像 spec 后 36 个。搬动只给相对 import 多一层 `../`，**断言、夹具字符串、注释一字未动**（逐文件与 `HEAD` 版对比：34/35 只有 import 行不同；唯一例外是 `skip-budget.spec.ts` 的自指路径（旧扁平路径 → `tests/repo/budget/skip-budget.spec.ts`），不改它会把自己当未登记 skip 扫进去）。理由：这 35 个读的是 `docs/`、`package.json`、`checks/`、`runtime/`、`snapshots/`，**没有源码对象**——34/35 零个 src import，唯一例外 `pack-exports.spec.ts` 钉的是导出面（`src/index.ts` + `src/client/index.ts`），仍然是「包形状」而不是「某个组的逻辑」。按源码分不是难，是没有对象。
3. **三份 README 去计数，改成指针。** [tests/README.md](../../tests/README.md)、[src/README.md](../../packages/company-pack/src/README.md)、[host/README.md](../../packages/company-pack/src/host/README.md) 里「九组 / 五组 / 五个 `/命令`」全部删掉，写「清单 = 目录本身」（D28 早已在 `src/lib` 的模块清单上执行过，只是没用到组计数）。同时修掉组表本身的漂移：host 组表补 `fs/` 与 `startup/` 两行、`commands/` 行从 5 个命令名补到 7 个；src/README 的 client 清单补 `startup/`。
4. **连带面一次改齐**（搬目录最容易漏的四个机械面）：`tsconfig.test-harness.json` 的 exclude、`checks/gates/tests-literals.mjs` 的 ALLOW、两份生成物（`node tools/repo/test-census.mjs --write`、`node tools/repo/bug-coverage.mjs --write`）、四处类型面计数 `226/244 → 227/245`、全仓旧路径引用（`docs/`、`checks/README.md`、`notes/implemented`、`notes/archived`、`_backlog/_archive` 的链接路径修复）。生成物的头注路径住在 `tools/lib/`，一并改。
5. **`tests/README.md` 写清两根轴：** 有源码组的区跟组名同名（host/client），没有源码对象的区按 owner 或消费者归（repo 六个 owner 子目录、session、evidence、ui）。「新 spec 落点」从「按四区归位」这句过期话改成这条判据。

## 输掉的方案

- **全树镜像**：41% 的 spec 没有源码对象；`tests/contract` 测的是 pin 住的 `vendor/dsh` 引擎，给它造源组 = 假 seam。
- **把 21 个 import `tools/lib` 的 repo spec 搬去 `tests/tools`**：它们的主体是 docs/包/运行区，工具只是读文件的工具。按「谁的事实」分，不按「用了谁的函数」分。
- **为 fs/ 与 logging/ 各建一个测试目录**：一目录一 spec 对 7 行模块，信息量低于例外表一行；而且这两个模块的真实证据在调用方 spec 里，搬过去会造出「目录有了、覆盖没变」的假镜像。
- **删掉 host 组表，只留目录**：保住「每组管什么」的一句话速览，只去掉计数与文件清单式枚举；表随目录更新（本轮已补两行）。
- **沿用 2026-11-13 已否决的「产品面 / meta 面」二分**：本卡不新建大类，只要求现存同级目录名对齐 + 例外表。

## 状态事实与载体

- **事实**：测试树有两根轴——镜像轴（有源组的区，目录名相等）与 owner 轴（无源对象的区，按「谁的事实」分）；属性区（i18n / presets 的一次扫全量）暂不命名。
- **唯一入口**：[tests/README.md](../../tests/README.md)「分区」与「新 spec 落点」两节；例外表唯一家 = [mirror.spec.ts](../../tests/repo/structure/mirror.spec.ts) 的 `EXCEPTIONS`。
- **读载体 / 写载体**：读 = 维护 agent 的目录检索（改了 X → 去 tests/X 找证据）；写 = 新 spec 放哪、新源组要配哪个测试家。宿主半与 client 半的运行时不进本层。
- **环境坏法**：来源（镜像规则此前无门禁）、内容（组数计数四处漂）、生命周期（harness 空壳残留）——本轮封了来源与内容，空壳已由 `51a1c61b` 删除。

## 未覆盖轴

- [covered] 镜像两侧目录名与例外防腐化 → [mirror.spec.ts](../../tests/repo/structure/mirror.spec.ts)
- [policy] 组数计数不再有门禁守着，靠 D28 纪律（本仓刚证明计数会漂） → [tests/README.md](../../tests/README.md)
- [environment-gap] 移动后的类型面只在暖树验过，clean clone 的 `pnpm typecheck` 未跑 → [.github/workflows/fresh-clone.yml](../../.github/workflows/fresh-clone.yml)
- [unprovable] 外部消费者（别的仓/历史书签）可能仍按旧路径引用 tests/repo，本仓无法观测 → [AGENTS.md](../../AGENTS.md)

## 验证

| 判据 | 命令 | 原话 |
|---|---|---|
| 新 spec 会红 | 临时清空例外表后 `pnpm exec vitest run tests/repo/structure/mirror.spec.ts` | 3 failed：`[ 'fs', 'logging' ]`、`[ 'contract', 'index' ]`、`{ srcOnly: [], testsOnly: [ 'i18n' ] }`；还原例外表 → 5 passed |
| repo 区全绿 | `pnpm exec vitest run tests/repo` | 36 files / 176 tests passed |
| 全量 keyless | `pnpm test` | 245 files / 2099 tests passed |
| 结构门禁 | `pnpm verify` | ALL PASS（2 门无对象） |
| 类型面 | `pnpm typecheck` | 四面 tsc 全绿 |
| 计数清零 | `rg -n "九组\|五组\|五个 /命令" tests/README.md packages/company-pack/src/README.md packages/company-pack/src/host/README.md` | 零命中（exit 1） |
| 独立盲审 | 只读子代理复核工作树 diff | **blocker 0**；8 条建议全收（计数 227/245、34/35 表述、软链目录判据、README 五条例外、skip-budget 自指路径） |
| 生成物新鲜 | `node tools/repo/test-census.mjs --write` + `node tools/repo/bug-coverage.mjs --write` | census 245 spec；bug-coverage 204 行 |
