# 2026-10-09 · 重放场景活性门禁——把「这场景算不算回归门」从散文升成字段（replay-scene-liveness）

状态：已消化（2026-10-09 实施完成；来源 = 用户令「按照你的推荐来做吧，Set up 一个 ongoing 的 goal 然后就把它推动落地」；
N5 同轮发现的静默堆积问题的同族处置——N5 治 `notes/`，本条治 `snapshots/replay/`）

## 决定

`snapshots/replay/` 每个场景的 `snapshot.yml` 增加 **`replayEligible`** 字段（三态）
+ **`# 资格理由：`** 行，由新门禁 `replay-scene-liveness` 强制；`snapshots/README.md`
§快照与 live 盘差异的语义 里那条散文清单**降级为指针**（不再复述清单——复述必漂）。

**为什么做**（实测，不是推测）：

| 事实 | 读数 |
|---|---|
| `snapshots/replay/` 体积 | **42MB**（占 `snapshots/` 树 77%） |
| 默认重放的场景 | **1 个**（`r3-delegation` 420KB = **1%** 字节） |
| `replay-smoke` 在 hook/CI 里？ | **都不在**——纯手动 |
| 有输入却无法当回归门的场景 | **2 个**（r6 判据红、r7 缺 `cordis.snapshot.yml` 起不来） |

⇒ 场景可无限累积，"这场景算不算能跑的回归门"**全靠 README 散文记着**，没有任何机制
发现"又收了一个跑不起来的场景"。这正是 DSH 说的：Skill = guidance，只有**机械可判**的
规则才进门禁。

## 三态与各自查什么（判据来源 = 磁盘 + 场景自己的 snapshot.yml）

| 态 | 含义 | 门禁查什么 |
|---|---|---|
| `runnable` | 有重放输入**且判据绿**，可作回归门 | 必须有 `replay/session*.v3.jsonl` **且**有 `replay/cordis.snapshot.yml`（后者是 replay-smoke 硬要求，缺了直接 `exit(2)`） |
| `archived` | 有输入但判据红/起不来，归档证据 | 必须有 fixture（否则该归 `baseline`）；理由写「# 资格理由：」 |
| `baseline` | 无重放输入，时点基线对照 | 必须**没有** fixture——有输入却叫 baseline = **静默死资产**，正是本门禁要抓的 |

另：每场景必须有 `snapshot.yml` + 三值之一 + 「# 资格理由：」行（资格是判断，判断要留痕）。

**首版判据是错的（如实记）**：第一版只分 `yes|no`，把 r6/r7 判成"能重放却没人知道"而报红。
**这是我判据太粗，不是场景有问题**——r6/r7 确实*有* fixture（所以 `--scenario` 跑得起来），
但判据红/组合 patch 缺失，它们**能跑但不能当回归门**。三态模型才如实。实地跑过才知道：
若我不真跑那三个 `--scenario`，就会把这两个场景误标成 `runnable`，门禁从此说假话。

## 实测读数（2026-10-09，本轮真跑）

| 场景 | `--scenario` 实跑结果 | 定态 |
|---|---|---|
| `r3-delegation` | **ALL PASS**（full 档：归一化零 diff + sidecar） | `runnable` |
| `foundation-workspace` | **ALL PASS**（full 档 + workspace oracle） | `runnable` |
| `r2-motion` | **ALL PASS**（presence 档，49s） | `runnable` |
| `r6-baseline` | **2 FAILURE**（member/task 集合等价红；queued 41→35） | `archived` |
| `r7-motion-final` | **起不来**（缺 `replay/cordis.snapshot.yml`） | `archived` |
| `r1` / `r4` / `r5b` / `scenario-b` | 无重放输入 | `baseline` |

门禁绿读数：`PASS replay-scene-liveness ×9（声明↔磁盘一致；runnable 3 / archived 2 / baseline 4）`。

## 输掉的方案

- **另立 `SCENES.md` 登记表**：否决。内容派生的第三本账**必然漂移**——D34/D36 已拆过一次
  （决策台账、已退役的 notes/intents.md）。场景元数据本来就该住各场景自己。
- **只查"有输入 ⇒ runnable"**（二态）：否决——那样 r6/r7 会被迫标 `runnable`，门禁就在说假话
  （它们跑得起来但判据红）。见上「首版判据是错的」。
- **把 replay-smoke 接进 hook/CI**：本轮不做。11–49s/场景 × 9 场景远超秒级预算，且 4 个
  `baseline` 根本跑不了。**真正的缺口不是"没自动跑"，是"没声明"**——先让声明可信，跑不跑是下一层决定。
- **删除 `archived`/`baseline` 场景省 42MB**：不授权，且**删掉就丢了历史证据**。本门禁让
  "该不该留"变成可判断的问题（每场景带理由），但**不替人做删除决定**。

## 不证明什么（边界照 testing.md §1 写清）

**门禁不跑 replay-smoke**，所以它**不证明** `runnable` 的判据真的绿、也不证明 `archived` 真的红
——那要起进程、单场景 11–49s。它证明的是**声明与磁盘相符 + 判断留痕**，即
"没人能悄悄让一个场景失去可跑性而不被注意"。真绿由 replay-smoke 自己报。

## 验证（本轮真跑的）

- **四个负例，实地造红→还原→绿**：
  ① `r1-motion: baseline→runnable`（无输入却称可跑）→ **红**；
  ② `r3-delegation: runnable→baseline`（有输入却降级 = 静默死资产）→ **红**；
  ③ 删 `r3-delegation/replay/cordis.snapshot.yml` 而声明仍 `runnable` → **红**；
  ④ **新建一个无声明的新场景目录**（`r9-newly-harvested` + 真 fixture）→ **红**
  （「缺 snapshot.yml」）—— **这条最要紧：④ 就是本门禁要防的真实失败模式**
  （收割一轮、丢个目录进来、没人知道它能不能跑）。
- 还原后 `PASS replay-scene-liveness ×9`；`pnpm verify` ALL PASS（**38 道**门禁）；
  `pnpm test` 36 files / 355 tests 绿。
- 改完 9 个 `snapshot.yml` 后 `replay-smoke --scenario r3-delegation` **仍 ALL PASS**
  （证明加字段没破坏 `js-yaml` 解析）。

## 后果

- 新增场景必须同 diff 带 `snapshot.yml` + `replayEligible` + 资格理由，否则**门禁红**。
- 「runnable 3 / archived 2 / baseline 4」成为可查询事实，不再靠 README 散文。
- 下一步（未做，留判断）：是否给 `runnable` 场景接自动跑（hook 或 CI 分档）、
  是否清理 `archived`/`baseline` 的历史体积——两条都需要人授权，本条只提供判据。
