# N5 事实落点时效：`notes/implemented/` 不再当冻结档案

状态：已消化（2026-10-09；用户令「能修的就修，能补的就补」——本条 = 第二遍深挖 gap N5，🔴 项）。

## 问题：一条写进注释的政策，在批量生产死指针

`checks/run-gates.mjs` 的 `bare-path` 门禁把 `notes/implemented/` 划进「**观察档**」，注释原文：

> **观察档**（`implemented/` `postmortem/`）= **记录当时事实**的档案——里面引的路径**当时是对的**
> （实测 36/39 条是 vendor 上游改过名）。**改它就是篡改记录** ⇒ 每次提醒、不判红。

「改它就是篡改记录」这句话是**错的**，而且代价可测。

### 与 vendor 的正面冲突

`vendor/dsh/.agents/notes/implemented/AGENTS.md` 明文把两件事分开：

> **Keep an implemented Agent Note current with what actually shipped**
> Keep paths, symbols, defaults, and mechanisms current in the same change that alters them.
> Rewrite stale facts in place; do not append change history.
>
> **This is not a license to rewrite the *decision***
> Update factual realization in place. A reversal of the decision or its rationale requires a
> new Agent Note and cross-link.

即：**决定的正文不动**（翻案要新 Note + 交叉链接），**事实的落点（路径 / 符号 / 默认值）就地改新**。
本仓把这两件事**一起冻住**了——等于宣布「当时那个路径」是决定的一部分。它不是。

### 实测代价（同一把尺子，两边都量）

用本仓 `bare-path` 的同一套匹配逻辑（反引号 + 顶层目录前缀 + 双树查 + 排除通配/行号/runtime）：

| 树 | 仓库路径提及 | 盘上不存在 | 含 ≥1 死指针的文件 |
|---|---|---|---|
| **本仓 `notes/implemented/`** | 574 | **122（21.3%）** | **52 / 135（38.5%）** |
| vendor `.agents/notes/implemented/`（英文） | 247 | 9（3.6%） | 7 / 527（**1.3%**） |

**6 倍差距。** vendor 那 3.6% 是「规则是前瞻性的、老 Note 没人再碰」的自然残留；
本仓 38.5% 是**政策造出来的**——制度性地把死指针判为合规，它当然越攒越多。

### 那条「36/39 是 vendor 上游改名」的观察错在哪

它只对**指向 vendor 的**路径成立。本仓自己造成的腐化占多数，而且是本仓改名：

| 死指针目标 | 次数 | 现行家 |
|---|---|---|
| notes/research（**已退役**） | 12 | 退役并入 `_backlog/issues/` + `_backlog/research/`（D30/D31） |
| notes/intents.md（**已退役**） | 4 | 曾冻进月度表；2026-10-09 清扫删表，历史在 git（D34） |
| `packages/preset/agent-presets/*` | 9 | vendor 上游重新分包（本仓路径改写即可） |
| `tests/*.spec.ts`（根级） | ~18 | 已分子目录：`tests/client/`、`tests/presets/`、`tests/harness/`、`tests/company/` |
| `snapshots/r{1,2,3,4}-motion`、`snapshots/dag-*` | ~17 | 已归 `snapshots/replay/`、`snapshots/probes/` |
| snapshots/README（少 `.md`） | 3 | `snapshots/README.md` |

「改指针到现行家」在这里没有任何「篡改记录」的问题——**门牌号改了，把门牌号改成新的，不是篡改**。
篡改是把**当时的结论**改成另一套。

## 决定

`notes/implemented/` 从观察档移入**硬档**，但按 DSH 的**前瞻语义**分生效日两档：

- **文件名日期 ≥ `NOTES_CURRENCY_EFFECTIVE_DATE`（2026-10-09）**：其反引号仓库裸路径必须指到现行家，否判红。
- **此日之前的存量**：祖父豁免（历史负债）。一次性判红 122 处会逼出一场大清理，而目标不是清理一次，
  是建立一条**会自己维持**的规矩。这与 `notes-liveness` 的存量口径一致（2026-10-05 立，同款豁免）。
- **仍是观察档**：`notes/postmortem/`（DSH 语料明说它是**唯一**该有 war-story narrative 的层）+
  明确冻结的 `_backlog/_archive/`（不是任务源，dev-loop §0.5）。

配套：**负例假路径记号 `zz-`/`zzz-`**。负例必须逐字可复现，因此必然写出「形状上像死路径」的字符串；
静态扫描分不开它与真腐化（N5 生效后头两条命中就是我自己 Note 里的负例）。约定 = 假路径带 `zz+-`，
门禁放行——本仓从未有过以 `zz` 开头的真实路径（已审计）。天真的做法是让作者改文风绕开，
正确做法是给假路径一个**可判别的记号**。

## 输掉的方案

- **整棵 `implemented/` 直接拉进硬档**：否决。122 处红堵在 push 上，实际结果是有人把整段加进
  `RETIRED_PATHS` 白名单了事——门禁变装饰。分生效日才留得住。
- **保持观察档，只把提醒计数调醒目**：否决。这正是原状；38.5% 的数字说明「提醒」不是有效机制。
- **一次性清理 122 处**：否决（本轮）。多数是机械改名（`tests/*.spec.ts`、`snapshots/*`），但
  notes/research 与 intents.md 那 16 处要判断每条该指哪个新家。混进本轮的策略改动里，
  会让「政策生效」这个可验证的核心淹没在 122 处逐条判断里。**未做 = 显式欠账**，见下。
- **给 122 处建一份豁免清单**：否决。手写清单必漂——这正是 D36 刚拆掉的那类账（第三本账）。
  日期祖父是**可推导**的（从文件名算），不需要维护。
- **改措辞绕开负例命中**（如把路径写成「某个不存在的 docs 文件」）：否决。负例就不可复现了，
  而「负例必逐字可复现」是 notes/README 的硬要求（「哪条命令/断言什么/红长什么样」）。

## 未做（显式欠账）

- **存量 122 处死指针一个没修**（生效日前，祖父豁免）。清理轮 = 按上面「现行家」表机械改名
  + 16 处需判断的逐条定家。判据已就位：修完 `bare-path` 的硬档就自然覆盖它们。
- 未把生效日推早。推早 = 清完存量之后的事。

## 验收

- `pnpm verify`：`PASS bare-path ×N（…另观察档 M 文件）`，且观察档文件数**下降**（原 120+，现 37）。
- **红/绿双向**（都实跑）：
  1. **红**：新建 `notes/implemented/2099-01-01-*.md` 写死路径 → `FAIL bare-path` 点名文件:行 → 删除 → 绿。
  2. **豁免仍生效**：给生效日前的 Note 追加死路径 → **仍然 ALL PASS**
     （当时样本是一篇 2026-09-21 的日记，该文件已在同日清扫中删除；豁免按文件名日期，不绑定某一篇）→ 还原 → 绿。
  3. `zz-` 记号：负例假路径不再命中（N1/N3 的两条 Note 由红转绿即是证据）。
- 注释与本条 Note 一致：`run-gates.mjs` 里那句「改它就是篡改记录」已删除并写明为什么错。

## 验证记录（2026-10-09 实施）

| 步 | 实跑命令 | 判据与结果 |
|---|---|---|
| 两边量尺 | 本仓 vs vendor 同一匹配逻辑 | 122/574（21.3%）与 52/135 文件 **vs** 9/247（3.6%）与 7/527 文件；**6 倍** |
| 红（硬档） | 建 `2099-01-01-currency-probe.md` 含 `docs/zz-not-real-currency-probe.md` | `FAIL bare-path: notes/implemented/2099-01-01-currency-probe.md:7 → …` → 删除 → 绿 |
| 绿（祖父档） | 给一篇 2026-09-21 的 Note 追加 `docs/zz-also-not-real.md` | **`verify: ALL PASS`**（豁免生效，确认不是漏扫）→ 还原 → 绿。该样本文件后来删了，规则仍按日期 |
| 假路径记号 | 检查全仓 `zz` 前缀 | 无任何真实路径以 `zz` 开头 ⇒ 记号安全，不会掩蔽真腐化；N1/N3 两 Note 由红转绿 |
| 观察档收缩 | `pnpm verify` | 观察档文件数 120+ → **37**；`PASS bare-path ×308（52 文件…另观察档 37 文件）` |
| 全量 | `pnpm verify` + `pnpm test` | `verify: ALL PASS`；36 files / 355 tests 绿 |
