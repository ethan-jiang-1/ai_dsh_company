状态：implemented（2026-11-22）｜上游 = [BUG-140](../../_backlog/_archive/fixed_bugs/BUG-140-tasks-tab-still-empty-with-selected-team-task-session.md)、[BUG-150](../../_backlog/_archive/fixed_bugs/BUG-150-company-root-safety-spec-wrong-api-root.md)、[BUG-288](../../_backlog/_archive/fixed_bugs/BUG-288-attention-panel-list-missing.md)｜部分取代 = [2026-11-15-defect-fix-method](./2026-11-15-defect-fix-method.md) 的「非缺陷改判按问题轨归档」一条

# 撤回卡住已修区：`已结` 不等于 `已修`

## 决定

**缺陷编号的卡统一住 `_backlog/_archive/fixed_bugs/`**（用户 2026-11-22 定），包括原主张不成立的
「撤回/非缺陷」卡（反证、测试选址、spec 误用）。它们**不声称 `已修`**：

1. **`status: 已结`**：`已修` 只给真有系统面改动、且能交 `## 修复证据`（改动面 / 红 / 绿 / 提交）的卡。
   撤回卡没有改动面可交，翻 `已修` 就得凭空造一份——`fix-evidence` 存在的意义正是拦这个。
2. **卡头必须写明「撤回」或「非缺陷」**：`已结` 住已修区是「没有系统面改动」的自述，结论词不在场就成了
   「把修不动的卡翻成已结以跳过证据」的暗门。
3. **两门分工不变**：`backlog-liveness` 查位置 + 状态 + 结论词（新加的两条判据）；`fix-evidence` 只认
   `已修`，`已结` 卡根本不进它的检查面。规则正文 = [_backlog/_archive/fixed_bugs/AGENTS.md](../../_backlog/_archive/fixed_bugs/AGENTS.md)。

## 输掉的方案

- **搬回 `_archive/settled_issues/`（2026-11-15 先例）**：那是「非缺陷 = 换轨到问题轨」的读法，归档索引里
  也确实是这么登记的。用户 2026-11-22 改判：缺陷编号的卡按缺陷轨归档，`settled_issues/` 只留
  `YYYY-MM-DD-<slug>.md` 的问题卡。否（本 Note 取代该先例）。
- **翻成 `已修` 了事**：归档当天就这么做过一次，实测 `fix-evidence` 直接红——`缺「## 修复证据」（已修卡必须
  给改动面/红/绿/提交——翻状态 + git mv 不算修复）`。要绿只能编证据，等于把「修了」变成自述。否。
- **桶里放行 `已结` 但不加卡头锚**：最省事，也最危险——任何修不动的卡翻成 `已结` 就绕过了修复证据，
  门禁反而成了逃逸通道。否（保留结论词锚，见决定 2）。
- **新增 `非缺陷` 状态值**：2026-11-15 已否过一次（不扩缺陷状态机）；这次仍不扩——`已结` + 结论词已经
  说清「没修，因为不是缺陷」，多一个状态只会让翻转表再长一列。否。

## 后果

- `settled_issues/` 从此只装问题卡；`fixed_bugs/` 同时装 `已修` 与 `已结（撤回）`，索引里分两段列
  （[_archive/README.md](../../_backlog/_archive/README.md) 的「已修区里的撤回卡」小节）。
- 归档索引与 9 处引用（`bugs/README.md`、四篇 Note、探索卡、BUG-292 卡内）随卡改指向新路径；
  卡内相对链接按新目录层级改写（`./2026-…` → `../settled_issues/2026-…`，`../fixed_bugs/BUG-…` → `BUG-…`）。
- `fix-evidence` 的 `×131` 计数不变——撤回卡不进它的面，这一点由 `status !== '已修'` 保证，不是靠人记。

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| `node checks/run-gates.mjs`（`backlog-liveness`） | 撤回卡被当成「跑错桶」/ 用 `已结` 逃修复证据 | ① 三张撤回卡住 `fixed_bugs` 且 `已结` → **绿**；② BUG-150 卡头去掉「撤回」→ `FAIL …BUG-150…:1 已结卡住 fixed_bugs 必须在卡头写明「撤回」或「非缺陷」——否则是用 已结 逃 fix-evidence`；③ 同卡 `status: 调查中` → `FAIL …:2 status "调查中" 不属于此桶`；还原 → 两门 `PASS` |
| `node checks/run-gates.mjs`（`fix-evidence`） | 把撤回卡翻成 `已修` 骗过归档 | BUG-288（`opened 2026-11-20`）改 `status: 已修` → `FAIL fix-evidence …BUG-288… 缺「## 修复证据」（已修卡必须给改动面/红/绿/提交——翻状态 + git mv 不算修复）`；还原 → `PASS fix-evidence ×131 张新已修卡` |
| `npx vitest run tests/tools/backlog-liveness.spec.ts` | 判据回退成「只认 `已修`」或「不查结论词」 | 37 passed（新增一条三向：撤回结论齐 → 绿 / 缺结论 → 红 / 活跃值 → 不属于此桶） |
| `node --test tests/checks/gate-mutation.test.mjs` | 新拒绝分支是死代码 | 14/14 pass；阉割 `if (pool === '_archive/fixed_bugs' && … !/撤回\|非缺陷/.test(headText(text)))` → 夹具不再报「必须在卡头写明…」 |
| `pnpm verify` | 位置变了而索引/链接没跟 | 索引未改时 `backlog-liveness` 报「未被 `_archive/README.md` 索引链接点名」、`md-links`/`link-debt` 报 12 处死链；改完 ALL PASS |

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 已修区桶的状态集合（`已修` + `已结`） | `checks/lib/backlog-liveness.mjs`（`statuses['_archive/fixed_bugs']`） | `pnpm verify` 的 `backlog-liveness` 行 | 本文件与门禁注释头 |
| 撤回卡的结论词锁 | 同文件（`pool === '_archive/fixed_bugs' && data.status === '已结'` 分支） | 卡头 `状态：已结（撤回…）` 行 | 卡文件正文 |
| 修复证据只认 `已修` | `checks/gates/fix-evidence.mjs`（`meta.status !== '已修' → continue`） | `pnpm verify` 的 `fix-evidence ×N` 行 | 归档卡的 `## 修复证据` 节 |
| 归档索引里的撤回卡段 | `_backlog/_archive/README.md`「已修区里的撤回卡」 | 索引表 | 同文件 |
| 门牌（迁卡动作的上下文） | `_backlog/_archive/fixed_bugs/AGENTS.md` | 平台按目录注入 | 同文件 |

## 未覆盖轴

- [policy] **「撤回」是判断，不是机器结论**：门只查卡头有没有这个词，不证明反证真的做过——证据强度仍靠卡内的复现/取证节与 `审查：` 行 → `_backlog/_archive/fixed_bugs/AGENTS.md`
- [policy] **先例改判不自动回填**：2026-11-15 之前按问题轨归档的撤回卡之外的存量不回扫，规则只对新动作生效 → `_backlog/README.md`
- [covered] **索引与链接的机械面**：`backlog-liveness` / `md-links` / `link-debt` 由 `pnpm verify` 覆盖 → `checks/gates/backlog-liveness.mjs`
