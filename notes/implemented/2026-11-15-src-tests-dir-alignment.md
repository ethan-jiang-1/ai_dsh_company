# 2026-11-15 · src↔tests 目录名对齐：host 例外清零 + lib 八组镜像

状态：implemented（2026-11-15 落地；卡 = [src-tests-dir-alignment](../../_backlog/_archive/settled_issues/2026-11-15-src-tests-dir-alignment.md)，前置 = [tests-tree-axis](./2026-11-15-tests-tree-axis.md)）

> 上游 = 用户 2026-11-15「src 也有类似问题；最理想是代码目录名和测试目录名对齐，Agent 找测试资产容易」。上一轮把 host/client 的镜像做成断言后，还剩两块不对齐：host 两个单文件组靠例外表活着，`src/lib` 33 个模块平铺、没有目录名可对。

## 决定

1. **host 例外从 5 条降到 3 条。** `src/host/fs/safe-file.ts` 与 `src/host/logging/rotating-log.ts` 是**跨组叶子**（前者被 ledger / run-bundle / commands 三组 5 个文件消费，后者被 run-bundle / commands 两组消费）——搬家会制造跨组反向边。正解是给它们各配同名测试目录与聚焦 spec（五态判据 / 轮转上限），而不是把文件塞进某个组。剩下的三条例外是**另一种单位**：`contract/`（跨载体不变量）、`index/`（根组合）、`i18n/`（属性区）。
2. **`src/lib` 按域分八组，`tests/lib` 同名镜像。** presence（7：含 doors 门投影）· cultivation（5）· docs（5：含 markdown-shape-core.js）· deliverables（2）· delegation（4）· startup（2）· accounting（3：ledger/budget/signoff）· shared（5）。`shared` 的准入是判据不是习惯：**跨域叶子**——删除测试后复杂度散回 ≥2 个域、且消费者 ≥2 组；谁长出自己域的语义就搬去那个域。
3. **镜像断言统一成一条规则。** [mirror.spec.ts](../../tests/repo/structure/mirror.spec.ts) 从「host/client 目录名相等 + lib 两侧都平铺」升级成 **host / client / lib 三处目录名集合相等**，例外表只剩 3 条且继续防腐化（补齐例外未删 = 红）。
4. **两条新 lib spec 是真断言，不是占位。** `deliverables/` 与 `delegation/` 在 lib 侧此前没有单元 spec（覆盖在 client/host 立面），目录对齐要求它们存在——于是写 `parseMeta` 首现优先/中英文冒号、slug/路径归一/地址 encode，与 `buildDelegationTree` 的双来源进树、终态映射（投影 > timing > unavailable）、标签回落。
5. **连带面一次改齐**：127 个 importer 的相对 import、6 个 `checks/**` 直接 import（含 `roster-consistency` 的字符串路径）、40 张 archived bug 卡的 `npx vitest run tests/lib/...` 命令（`fix-evidence` 门禁要求命令可执行——这是冻结层唯一允许的路径修复）、三份 README 的组描述、census 重生成。

## 输掉的方案

- **把 `safe-file` / `rotating-log` 塞进某个现有组**：会让其它组的 import 反向依赖那个组（fs ← run-bundle 的反向边已经存在，再加一条只会更糟）。
- **`tests/lib/deliverables/` 用 `.gitkeep` 占位**：空目录不是证据，git 也不跟踪；用户要的是「找得到测试」，不是「目录存在」。
- **只改文档说「lib 按文件名找」**：文件名约定对组合名 spec（presence-board、text-and-status）不成立，且用户明确要目录名。
- **为 `tests/lib` 33 个模块各补一条 spec**：目录对齐 ≠ 覆盖补齐；本轮只补两条目录存在性需要的。
- **给 host 两个叶子单开新组**：group 已存在（fs/、logging/ 就是它们的组），缺的是测试家。

## 状态事实与载体

- **事实**：源码侧八组按域；测试侧同名镜像；镜像 = 目录名集合相等（host/client/lib 三处）；例外 = 另一种单位的三条。
- **唯一入口**：[src/README.md](../../packages/company-pack/src/README.md) 的 lib 段（组职责）+ [mirror.spec.ts](../../tests/repo/structure/mirror.spec.ts) 的 `EXCEPTIONS`。
- **读载体 / 写载体**：读 = agent「改 `src/lib/<组>/x.ts` → 去 `tests/lib/<组>/`」的检索反射；写 = 新增 lib 模块时选组、新组要配测试家。
- **环境坏法**：来源（镜像此前只覆盖 host/client）、内容（组名/成员散写）、生命周期（组变空后目录消失）。

## 未覆盖轴

- [covered] host/client/lib 三处目录名集合相等 + 例外防腐化 → [mirror.spec.ts](../../tests/repo/structure/mirror.spec.ts)
- [policy] `shared/` 的准入（跨域叶子、消费者 ≥2 组）没有机器判据，靠评审 → [src/README.md](../../packages/company-pack/src/README.md)
- [covered] 干净克隆的 verify / test / typecheck 全绿（3 skipped = dev-only 台账） → [.github/workflows/fresh-clone.yml](../../.github/workflows/fresh-clone.yml)
- [policy] `pnpm release --check` 仍红：源码面变了而 `_dist` 未重打——这是发布决策，不是代码缺陷；发版程序 → [release.md](../../docs/contracts/release.md)
- [unprovable] 别的仓/历史书签引用旧扁平 lib 路径，本仓无法观测 → [AGENTS.md](../../AGENTS.md)

## 验证

| 判据 | 命令 | 原话 |
|---|---|---|
| 例外补了没删 = 红 | 建 `tests/host/fs/` 后先跑 `pnpm exec vitest run tests/repo/structure/mirror.spec.ts` | 1 failed：`src/host/fs：两边都已存在——例外该删了`；删例外 → 5 passed |
| 新源组没测试家 = 红 | 临时建 `src/lib/zz-temp/` 再跑 mirror | 1 failed：`expected [...(6)] to deeply equal [...(7)]`；删除 → 5 passed |
| host 两条新 spec | `pnpm exec vitest run tests/host/fs tests/host/logging` | 11 passed（含轮转失败注入与默认上限行为） |
| lib 区全绿 | `pnpm exec vitest run tests/lib` | 17 files / 202 passed |
| 全量 keyless | `pnpm test` | 249 files / 2120 tests passed |
| 类型面 | `pnpm typecheck` | 四面 tsc 全绿（127 处 import 全解析） |
| 结构门禁 | `pnpm verify` | ALL PASS（2 门无对象） |
| 生成物 | `node tools/test-census.mjs --write` + `node tools/bug-coverage.mjs --write` | census 249 spec |
| lint | `pnpm lint` | 干净（盲审后补跑抓到 `mirror.spec.ts` 一个未用 helper，已删） |
| 门禁自测 | `pnpm test:checks` | 10 PASS / 0 FAIL |
| 快车道 | `pnpm smoke:fast` | 4/4 ALL PASS（5.86s） |
| 重复度 | `pnpm dup` | 0 clones |
| 真挂载（client） | 重打产物后 `node checks/lanes/client-load.entry.mjs` | ALL PASS：零挂载失败、零 loader 错误、品牌槽在场 |
| preset 挂载 | `node checks/lanes/preset.entry.mjs` | ALL PASS（6 角色 + 5 非角色） |
| 真安装/启动 | `node checks/lanes/company-entry.entry.mjs` | ALL PASS（tarball 安装 + 两次 boot + 第二 workspace） |
| 安装形状 | `node checks/lanes/release.entry.mjs` | ALL PASS（首次跑在应用内安装步因 registry 超时中断；重跑全绿——环境性） |
| 重放 | `node checks/lanes/replay.e2e.mjs` | ALL PASS（5s，归一化零 diff） |
| **clean clone** | `/tmp` 真 clone + submodule + `pnpm install` + `bundle:init` + `setup` | `verify` ALL PASS（3 门无对象）/ `test` 249 files · 2117 passed + 3 skipped / `typecheck` 绿 → CLEAN-ALL-GREEN |
| 发布就绪 | `pnpm release --check` | **红（设计内）**：源码面变但 `_dist` 未重打——要发版才 `--bump patch → --prepare/--verify`；本条不阻塞提交 |
| 独立盲审 | 只读子代理复核工作树 diff | **blocker 2**：`tests/README.md` 仍写五条例外、新 spec 落点漏 lib；冻结层 36 个文件白改。两条全收：README 改「只剩三条」并把 `tests/lib/` 写进落点；冻结层按「md 链接必改、fixed_bugs 近期命令必改、散文与历史链接还原」重做。建议全收：mirror 补顶层散件断言、rotating-log 去掉常量断言并加失败注入、safe-file 去装饰断言、spec-duplicates 注释改为可复现配方、src/README 去成员枚举、fixture 路径还原、delegation-tree 补 label/mode |
