---
status: 已结
opened: 2026-11-15
---

# 推敲：src 与 tests 的目录名对齐——把 lib 也变成可镜像的组

> 立卡：2026-11-15 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent（独立盲审）— 见 §落地证据末条
>
> **结论/去向**：note — [2026-11-15-src-tests-dir-alignment Note](../../../notes/implemented/2026-11-15-src-tests-dir-alignment.md)

**问题与期望结果：** 用户 2026-11-15 点名：`packages/company-pack/src` 有和 `tests/repo` 同型的平铺问题；**最理想是源码目录名与测试目录名一一对齐**，agent 找测试资产时不用猜。上一轮已把 host/client 的镜像做成断言（[mirror.spec.ts](../../../tests/repo/structure/mirror.spec.ts)），但还差两块：host 有两个单文件组没有测试家（靠例外表登记），`src/lib` 33 个模块平铺、`tests/lib` 只有 15 个 spec 且只有 12 个同名——**没有目录名可对**。期望结果 = 三处（host / client / lib）都由「目录名集合相等」这条断言守住，例外只剩「另一种单位」的三条。

**当前情况：**

- `src/host` 11 组、`tests/host` 11 目录，交集 9；例外 = 源侧 `fs/`、`logging/`，测试侧 `contract/`、`index/`，外加 `tests/client/i18n/`（属性区），共 5 条。
- `src/host/fs/safe-file.ts` 被 3 组 5 个文件 import（ledger / run-bundle / commands）；`src/host/logging/rotating-log.ts` 被 2 组 2 个文件 import（run-bundle / commands）。**两者都是跨组叶子，不是装错组**——所以修法是给它们配测试目录，不是搬文件。
- `src/lib` 33 个文件平铺；`tests/lib` 15 个 spec（12 个同名）；`src/lib` 被 src + tests 的 78 处相对 import 引用。
- 上一张卡（[tests-tree-axis](./2026-11-15-tests-tree-axis.md)）的排除项已把「不动 src/lib」写成另一张卡——就是本卡。

**未决问题：** 无。授权 = 用户 2026-11-15「好的，听你的建议」（采纳「新卡 + 直接落地」）；已完成，证据见 §落地证据。

**下一步：** 已交付（2026-11-15）。①host 两条源侧例外清零（新 spec 10 例）；②`src/lib` 八组 + `tests/lib` 同名镜像（33 个模块、15 个 spec 搬家、补 2 条真 spec）；③mirror 的 lib 断言升级成目录名集合相等（例外降到 3 条）。

## 范围与排除项

**做：**

1. **host 例外清零（源侧两条）**：新增 `tests/host/fs/safe-file.spec.ts`（五态判据：missing / symlink / not-file / outside / ok）与 `tests/host/logging/rotating-log.spec.ts`（超限轮转 `.1`、轮转后仍追加、注入上限）。例外降到 3 条：`contract/`（跨载体不变量）、`index/`（根组合）、`i18n/`（属性区）——这三条是**另一种单位**，不是缺测试家。
2. **`src/lib` 分八组**：presence（presence、presence-status、board、dag、attention、tool-card、doors）· cultivation（5）· docs（prd-check、requirements-check、markdown-shape、markdown-shape-core.js、yaml-scalar）· deliverables（deliverables-catalog、deliverables-address）· delegation（delegation-capabilities、delegation-surface、delegation-tree、retry-policy）· startup（startup-settings、startup-command-copy）· accounting（ledger、budget、signoff）· shared（abortable、guards、role-copy、run-bundle-paths、text）。
3. **`tests/lib` 同名镜像**：15 个 spec 搬进对应组；`deliverables/` 与 `delegation/` 目前没有 lib 侧单元 spec，补两条真 spec（不是占位）。
4. **镜像断言升级**：`mirror.spec.ts` 的 lib 断言从「两侧都平铺」改成「两侧目录名集合相等」，与 host/client 同一条规则。

**不做（每条都有理由）：**

- **不动源码面的 interface**：`company-root.ts` 的双坐标系 17 导出、路径安全 5 份判据、frontmatter 5 份解析——缺陷轨，另案（证据在归档研究 §6）。
- **不拆 `tests/presets` / `tests/content`**：属性轴，一次扫全部角色/模板，按单位拆会碎。
- **不重开上一张卡**：归档永不重开，本卡引用它。
- **不为 `tests/lib` 的每个模块补一个 spec**：目录对齐 ≠ 覆盖补齐；本轮只补两个**目录存在性**需要的，其余覆盖账另案。

## 已知与未决

- 已知：搬 lib 会改 78 处相对 import（src + tests），由 `pnpm typecheck` 四面兜；`markdown-shape-core.js` 是 `.js`，它的 `.ts` 包装要一起改。
- 已知：`tests/lib` 的 spec 文件名含组合名（`presence-board`、`text-and-status`），会被搬进某个组而不是改名——文件名与模块的同名约定只对「一模块一 spec」成立。
- 未决：`doors` 归 presence 还是 shared——按「读模型/投影」归 presence；若日后它长出第二个消费者再议。

## 方案与取舍

- **选「建测试目录 + lib 分组」**：host 两个叶子跨组使用，搬文件会制造跨组反向边；建目录才是对齐。
- **输掉的**：①把 `safe-file`/`rotating-log` 塞进某一个现有组（会让其它组的 import 反向依赖那个组）；②`tests/lib` 用空目录或 `.gitkeep` 占位（空目录不是证据，git 也不跟踪）；③只改文档写「lib 按域看文件名」而不建目录（用户要的是目录名对齐）。
- **`shared/` 不是桶**：五个成员都是**跨域叶子**，判据 = 删除测试（删掉后复杂度散回 ≥2 个域）+ 消费者 ≥2 组；谁长出自己域的语义就搬去那个域。

## 验收标准

| 命令 | 断言 | 红形态 |
|---|---|---|
| `pnpm test tests/repo/structure/mirror.spec.ts` | host / client / lib 三处目录名集合相等；例外 3 条且每条仍真的对不上 | 新建 `src/lib/<新组>/` 不配 `tests/lib/<同名>/` → 红；补齐 `tests/host/fs/` 后例外未删 → 红 |
| `pnpm test tests/host/fs tests/host/logging` | 两条新 spec 覆盖五态判据与轮转上限 | 把 `plainFileProblem` 的 `symlink` 分支删掉 → 红；轮转阈值改成不轮转 → 红 |
| `pnpm test tests/lib` | 15 个原有 spec 全在（位置变、用例数不变）+ 2 条新 spec | 搬丢一个 → 计数红；新 spec 断言空转 → 红 |
| `pnpm test` | 245 + 2 = 247 个 spec 一个不少 | 少一个 → `test-census` 红 |
| `node tools/test-census.mjs --write` | census 与盘一致（spec 文件数、各组计数） | 不重跑 → `tests/repo/budget/test-census.spec.ts` 红 |
| `pnpm typecheck` | 四个 tsconfig 全绿（78 处 import 全解析） | 少补一层 `../` → TS2307 |
| `pnpm verify` | md-links / bare-path / layout / doc-budget 绿 | `src/README` 的模块清单与盘不符 → `src-readme-pointers` 红 |
| `rg -n "src/lib/[a-z-]+\.ts" packages/company-pack/src tests docs` | 只剩注释/历史引用，活 import 零条指向扁平路径 | 留一条 `../lib/presence.ts` → tsc 红 |

## 落地证据

- **host 例外清零**：新增 `tests/host/fs/safe-file.spec.ts`（五态判据）与 `tests/host/logging/rotating-log.spec.ts`（轮转上限），共 10 例。先建目录、例外未删时 mirror 红（`src/host/fs：两边都已存在——例外该删了`）→ 删例外 → 绿。
- **lib 八组**：`packages/company-pack/src/lib/{presence,cultivation,docs,deliverables,delegation,startup,accounting,shared}/`；`tests/lib/` 同名八组（15 个原 spec 搬家 + `deliverables-catalog.spec.ts`、`delegation-tree.spec.ts` 两条新 spec）。33 个模块一个不少（census 249 spec）。
- **镜像升级**：`tests/repo/structure/mirror.spec.ts` 三处目录名集合相等；红证 = 临时建 `src/lib/zz-temp/` → 1 failed（两侧差一个目录）→ 删除 → 5 passed。
- **连带面**：127 个 importer 的相对 import、6 个 `checks/**` 直接 import（proposals / notes-axes / notes-liveness / fix-evidence / roster-consistency / present-catalog）、40 张 archived bug 卡的 `npx vitest run tests/lib/...` 命令（`fix-evidence` 门禁要求可执行）、三份 README、census 重生成。
- **实跑（全绿面）**：`pnpm test` → 249 files / 2120 tests passed；`pnpm lint` / `pnpm test:checks` 10/10 / `pnpm smoke:fast` 4/4 / `pnpm dup` 0 clones；真入口 `client-load` / `preset` / `company-entry` / `release` / `replay` 全 ALL PASS；**clean clone**（/tmp 真 clone + setup）→ verify ALL PASS / test 249 files 2117 passed + 3 skipped / typecheck 绿。`pnpm release --check` 红属设计内（源码变、`_dist` 未重打）。
- **旧读数**：`pnpm test` → 249 files / 2118 tests passed（补两条轮转断言后为 2120）；`pnpm verify` → ALL PASS（2 门无对象）；`pnpm typecheck` → 四面 tsc 全绿；`pnpm exec vitest run tests/lib` → 17 files / 208 passed。
- **决定承载**：[Note](../../../notes/implemented/2026-11-15-src-tests-dir-alignment.md)。
- **审查**：agent（独立盲审）— 只读子代理复核工作树 diff（模块搬丢/搬错、夹具字符串误改、新 spec 假绿、mirror 守不守得住、冻结层改写是否越界、门禁是否被放宽）。结论：**blocker 2**（README 仍写五条例外且新 spec 落点漏 lib；冻结层 36 个文件白改）**+ suggestion 6**，全部收口：README 改「只剩三条」并把 `tests/lib/` 写进落点；冻结层按「md 链接必改 / fixed_bugs 近期命令必改 / 散文与历史链接还原」重做；mirror 补顶层散件断言；rotating-log 去掉常量断言并加轮转失败注入；safe-file 去装饰断言；spec-duplicates 注释改成可复现配方；src/README 去成员枚举；delegation-tree 补 label/mode。

## 事实与读者

- 事实：源码侧八组是**按域**的组（不是按层）；测试侧同名镜像；例外只剩三条「另一种单位」。
- 唯一入口：[tests/README.md](../../../tests/README.md) 分区表 + [mirror.spec.ts](../../../tests/repo/structure/mirror.spec.ts) 的 `EXCEPTIONS`；源码侧 owner 文档 = [src/README.md](../../../packages/company-pack/src/README.md)。
- 读载体 / 写载体：读 = agent 的「改 X 去 tests/X 找证据」反射；写 = 新增 src 模块时选组 + 配套测试目录。
- 环境坏法：来源（镜像规则此前无门禁）、内容（模块清单枚举）、生命周期（组变空）。

## 关闭条件

- 八行验收费全绿，且有真红→绿（第一、二行必须先红一次）。
- Note 落 `notes/implemented/`，卡顶 `结论/去向` 改真实链接；`审查：agent（独立盲审）— …`。
- 卡与索引同变更归档。
