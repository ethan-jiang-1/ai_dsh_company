---
status: 推敲中
opened: 2026-11-15
---

# 推敲：测试树分轴——让「镜像」成为不变量，让「owner 轴」有名有姓

> 立卡：2026-11-15 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：note — `notes/implemented/<本卡 slug>.md`（计划；落地时换成真实文件名与链接）

**问题与期望结果：** 用户要「测试底下拆分出的子目录能跟源码对应起来，今后找东西容易」。实测（[研究材料](../research/tests-src-correspondence/2026-11-15-tests-src-correspondence.md)）显示：能对应的区已经对应了，但对应关系只写在散文里、已经漂了 5 处；真正平铺的大区 `tests/repo` 没有源码对象可对应。**期望结果** = 两条轴都变成可验证的东西：有一个源组的区，目录名相等是断言；没有源组的区，按 owner 分并在 README 写清「本区不是镜像区」。本轮推敲完成 = 方案、范围、验收标准、排除项都能被独立读者判对错。

**当前情况：** 全部数字与出处见[研究材料](../research/tests-src-correspondence/2026-11-15-tests-src-correspondence.md)，这里只留判据级事实：

- 244 个 spec / 29,785 行里，**100 个（41%）不 import 任何 src 模块**——它们没有可镜像的对象。
- 镜像对账：host 9/11（源独有 `fs/` `logging/`，测试独有 `contract/` `index/`）、client 6/6（另有属性区 `i18n/`）、lib 平铺 ↔ 平铺（15 个 spec 对 33 个模块）。
- 「组有几组」有四个 owner、三种说法：`src/README.md` 说 9 组列 8 个名字、`src/host/README.md` 表里 9 行、`tests/README.md` 说九组列 8 个名字，盘上都分别是 11；client 说五组、盘上 6；commands 说五个、实际 7 个命令名。**没有任何门禁比对「表 ↔ 盘」**；唯一管计数声称的 `checks/gates/nav-count-claims.mjs` 只扫「页签」。
- `tests/repo` 35 个 spec / 2,183 行 / 零子目录，读的是 `docs/`、`package.json`、`checks/`、`runtime/`、`snapshots/` —— **零个 src 模块**。
- 空壳 harness 目录已随 2026-11-15 的 `51a1c61b` 删除（暖树残留；clean clone 一直没它）——本卡只保留「文档不再点名 + 防复活」两条，不再有删除动作。

**未决问题：** 只有一条——**授权**。本卡是立项与执行方案，不是授权；用户点名后翻 `待落地` 再开工（`待落地` 本身也不是任务源）。方案内部的技术选择都已在下面拍完，不留开放项。

**下一步：** 等用户点名。点名后顺序固定：① 先写 set-equality spec 并在现状上跑红（红的就是本卡 §当前情况 的 4 处漂移）；② 补例外表 → 绿；③ 搬 `tests/repo` 的 35 个 spec 到六个 owner 目录；④ 删组数枚举与空壳；⑤ 回填 `## 落地证据`，带 Note 归档。

## 范围与排除项

**做：**

1. **镜像轴**：新增一个 spec（放 `tests/repo`，与 [navigation-assets.spec.ts](../../tests/repo/navigation-assets.spec.ts) 同类、与 [skip-budget.spec.ts](../../tests/repo/skip-budget.spec.ts) 同形），断言 `src/host/*` 与 `tests/host/*`、`src/client/*` 与 `tests/client/*` 的目录名集合相等，例外必须在一张**带理由的表**里登记，未登记即红。
   初始例外五条：`fs/`、`logging/`（叶子模块，唯一证据由调用方 spec 带）、`contract/`（跨载体不变量）、`index/`（根组合，对应 `src/index.ts`）、`i18n/`（属性区）。**不为 fs/ 与 logging/ 各建一个测试目录**：一目录一 spec 对 7 行模块，信息量低于例外表一行。
2. **owner 轴**：`tests/repo` 的 35 个文件按「谁的事实」分六组——structure（7）· pack（6）· release（6）· docs（7）· budget（7）· security（2）。spec 粒度不动（仍一文件一钉），只加一层目录；`tests/README.md` 明写「本区按 owner，不按源码」。
3. **去枚举**：`tests/README.md`、`src/README.md`、`src/host/README.md` 里的「九组 / 五组 / 五个 `/命令`」换成「清单 = 目录本身」的指针（D28 已在 `src/lib` 的模块清单上执行过）。空壳 harness 目录已删，不再列动作。

**不做（每条都有理由，防后人重开）：**

- **不做全树镜像**：41% 的 spec 没有源码对象；`tests/contract` 测的是 pinned `vendor/dsh` 引擎，给它造源组 = 假 seam。
- **不把这 21 个 import `tools/lib` 的 repo spec 搬去 `tests/tools`**：它们的主体是 docs/包/运行区，工具只是读文件的工具。按「谁的事实」分，不按「用了谁的函数」分。
- **不拆 `tests/presets` / `tests/content` 的角色/族目录**：`persona-english` 一次扫 11 个角色，按角色拆会把一条属性碎成 11 份；属性轴另案（前缀或 README 一句话），不进本卡。
- **不动 `src/lib` 的目录结构**：平铺 ↔ 平铺已经是对的；缺口补在覆盖（`tool-card` 等 3 个模型可见模块），是另一张卡。
- **不动源码面的 interface**：`company-root.ts` 的 17 导出/双坐标系、路径安全 5 份实现、frontmatter 5 份解析——都是真缺陷面，但属源码轨，见研究的 §6；本卡只动 tests/ 与四份文档。
- **不沿用 2026-11-13 已否决的「产品面 / meta 面」二分**：本卡不新建大类，只要求**现存同级目录名**对齐 + 例外表。

## 已知与未决

- 已知：搬 35 个文件会连带四处机械面——`checks/gates/tests-literals.mjs` 的 ALLOW 路径、`tsconfig.test-harness.json` 的 exclude、`tests/BUG-COVERAGE.generated.md` 与 `tests/CENSUS.generated.md` 两份生成物、`checks/README.md` 里两处路径。全部列进验收费。
- 已知：相对 import 各多一层 `../`，由 `pnpm typecheck` 兜（tsc 两面 + harness 面）。
- 未决：新 spec 的最终文件名（计划 `tests/repo/<mirror>.spec.ts`，落地时定）；`structure` 组是否含 `prune-policy`（它读 `runtime/`，也可归 budget）——落地时按文件头注的「who owns it」定，并在例外表/分组表里给理由。

## 方案与取舍

**选 C（断言 + 换轴 + 去枚举）。** 取舍：

- 只加断言（A）：4 处漂移立刻变红，但 `repo` 仍 35 平铺，用户要的「找东西容易」只兑现一半。
- 只拆 repo（B）：目录变清楚，但镜像轴仍无人守，半年后会再漂。
- C = A + B：两条轴各自可验证，且 `repo` 的六组有 owner 文档可指（`docs/`、`package.json`、`release.md`、`asset-lanes`）。
- **输掉的**：全树镜像（无对象）、按 import 工具归类（轴错）、产品/meta 二分（2026-11-13 已否决）。**保留的**：`tests/lib` 平铺对平铺（同构就是对应）。

## 验收标准

| 命令 | 断言 | 红形态 |
|---|---|---|
| `pnpm test tests/repo/<mirror>.spec.ts` | 两半目录名集合相等；五条例外逐条带理由；新增源组未配测试家即失败 | 删掉例外表里 `fs/` 一行 → 报「未登记」；或新建 fs/ 空目录 → 同样红 |
| `rg -n "九组\|五组\|五个 /命令" tests/README.md packages/company-pack/src/README.md packages/company-pack/src/host/README.md` | 零命中（组清单 = 目录本身） | 把任一枚举写回 → 命中即红 |
| `pnpm test` | 244 个 spec 一个不少；`tests/repo` 仍 35 个文件，只是换了目录 | 搬丢一个 → `tests/repo/test-census.spec.ts` 与 `layering` 红 |
| `node tools/test-census.mjs --write` | `tests/CENSUS.generated.md` 与盘一致 | 不重跑 → `tests/repo/test-census.spec.ts` 红 |
| `node tools/bug-coverage.mjs --write` | `tests/BUG-COVERAGE.generated.md` 里的 spec 路径同步 | 不重跑 → `tests/repo/bug-coverage.spec.ts` 红 |
| `pnpm typecheck` | 三面 tsc 绿（含 harness 面） | 搬完少补一层 `../` → TS2307 |
| `pnpm verify` | md-links / bare-path / tests-literals / gate-wiring 绿 | `tests-literals` 的 ALLOW 未跟着搬 → 被公司名判红 |
| `test ! -d tests/harness` | 空壳不复活，且四份文档不再点它的名 | 目录复活 → 非零 |

## 事实与读者

- 事实（新增/修改）：新增「测试树分轴」这一层事实：镜像轴 = 目录名相等；owner 轴 = repo 六组；属性轴暂不命名。
- 唯一入口：`tests/README.md`（分区表与「新 spec 落点」节）。
- 读载体 / 写载体：读 = 维护 agent 的目录检索；写 = 新 spec 放哪的规则。宿主半与 client 半不进本卡。
- 环境坏法：根（没有）、叶（零覆盖模块）、内容（组数枚举）、生命周期（空壳 `harness`）、来源（镜像规则无门禁）——其中「来源」与「内容」是本卡靶面。

## 关闭条件

- 八行验收费全绿，且有真红→绿（第一行必须在现状上先红一次）。
- Note 落 `notes/implemented/`，卡顶 `结论/去向` 改为真实链接；`审查：agent（独立盲审）— …`（门禁/跨模块收口按章程不许作者自查）。
- 卡与索引同变更归档（`_backlog/issues/README.md` 移行、`_backlog/_archive/settled_issues/README.md` 增行）。
