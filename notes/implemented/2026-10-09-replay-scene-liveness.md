# 2026-10-09 · 重放场景活性门禁——把「这场景算不算回归门」从散文升成字段（replay-scene-liveness）

状态：已消化（2026-10-09 实施完成；来源 = 用户令「按照你的推荐来做吧，Set up 一个 ongoing 的 goal 然后就把它推动落地」；
N5 同轮发现的静默堆积问题的同族处置——N5 治 `notes/`，本条治 `snapshots/replay/`）

## 决定

`snapshots/replay/` 每个场景的 `snapshot.yml` 增加 **`replayEligible`** 字段（三态）
+ **`# 资格理由（YYYY-MM-DD）：`** 行（**带判定日期**——资格是判断，判断会过期），由新门禁 `replay-scene-liveness` 强制；`snapshots/README.md`
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

另：每场景必须有 `snapshot.yml` + 三值之一 + 「# 资格理由（YYYY-MM-DD）：」行。

**日期不是装饰（2026-10-09 补强）**：初版只要求「# 资格理由：」，漏了日期。但 `runnable` 的依据是**一轮实测的 ALL PASS**——机制一漂，这条判断就过期了，而**无日期的理由查不出它有多旧**。加日期后「这条资格还成立吗」变成可回溯问题（复审时先看日期，再看判据是否仍绿）。负例 ⑤：把 `r2-motion` 的理由行抹掉日期 → **红**。

**首版判据是错的（如实记）**：第一版只分 `yes|no`，把 r6/r7 判成"能重放却没人知道"而报红。
**这是我判据太粗，不是场景有问题**——r6/r7 确实*有* fixture（所以 `--scenario` 跑得起来），
但判据红/组合 patch 缺失，它们**能跑但不能当回归门**。三态模型才如实。实地跑过才知道：
若我不真跑那三个 `--scenario`，就会把这两个场景误标成 `runnable`，门禁从此说假话。

## 实测读数（2026-10-09，本轮真跑）

**终读数（本轮全部真跑，含一次反转，见下节）**：

| 场景 | `--scenario` 实跑结果 | 定态 |
|---|---|---|
| `r2-motion` | **ALL PASS**（presence 档，35s） | `runnable` |
| `r3-delegation` | **4 FAILURE**（full 档；日志+两份 sidecar 漂） | `archived` |
| `foundation-workspace` | **3 FAILURE**（full 档；vendor 工具描述 + 日志漂） | `archived` |
| `r6-baseline` | **2 FAILURE**（member/task 集合等价红；queued 41→35） | `archived` |
| `r7-motion-final` | **起不来**（缺 `replay/cordis.snapshot.yml`） | `archived` |
| `r1` / `r4` / `r5b` / `scenario-b` | 无重放输入 | `baseline` |

门禁绿读数：`PASS replay-scene-liveness ×9（声明↔磁盘一致；runnable 1 / archived 4 / baseline 4）`。

## 现场反转：`runnable` 声明**本身会过期**（本轮最重要的发现）

**我先写错了，然后实测推翻了它——如实记。** 首版我把 `r3-delegation`、`foundation-workspace`
定成 `runnable`（依据 = 一次实跑 ALL PASS），提交了。收尾复跑时两者分别给 **4 FAILURE / 3 FAILURE**。

**先排除是我改坏的**：`git stash` 掉本轮全部改动、在已提交的 HEAD 上重跑，
`r3-delegation` **一样 4 FAILURE** ⇒ 漂移是本轮之前就存在的，与我改的文件无关
（我改的是注释/字段，动不了注入给会话的 system prompt 与工具表）。

**根因 = 录制是内容快照，仓库在动，快照不动**：

| 漂移源 | 证据（期望 vs 实际） |
|---|---|
| `company-workspace/AGENTS.md` 涨过注入预算 | 现 **19879 字节** > 16384 ⇒ 截断行文案变了（录制里是 `16757→15991`，现在是另一组数） |
| `workspace_doors` 工具入表（BUG-002 修复，10-06） | `tool-schemas` 第 1403 行：期望 `"write"` / 实际 `"workspace_doors"` |
| persona 文本演进 | `system-prompt#1` 第 7 行：期望一句行事口径 / 实际「目录里若见 team 工具…」 |
| **vendor DSH 工具描述演进** | `foundation-workspace`：`bash` description 期望「no state (cwd, variables, functions)」/ 实际「pass `workdir` instead of using `cd`」 |

**这不是缺陷，是"full 档"判据的定义使然**——脚本头注早就写明了：full 档 = 逐字节零 diff，
只适用于「录制与当前内容**同代**的场景」；并点名「（…的场景，r3-delegation）」。
**问题在于那条判断过期了**：r3 录制于 **2026-09-22**，而内容在 **10-07、10-08** 两次收口里演进过
⇒ 它已经不是同代场景，但 `replayJudges: full` 还挂着，于是它从"回归门"静默变成"永远红的噪音资产"。

**⇒ 42MB 重放资产里，9 个场景只有 1 个（`r2-motion`）还是能用的回归门。** 其余 3 个
（r3/foundation/r6）都"有输入、跑得起来、但判据必红"。这正是用户说的
「测试资产如何测试这一块确实也是比较扯淡的」——资产**看起来**是回归覆盖，其实不是。

**这恰好证明了本轮那两件事的必要性，也划出了门禁的边界**：
- `# 资格理由（YYYY-MM-DD）` 的**日期**不是装饰：一个 `runnable` 声明会随内容演进过期，
  **无日期就查不出它有多旧**。我是在写进门禁之后才被真实案例打中的。
- 门禁**只查声明↔磁盘相符，不跑 replay-smoke**（11–49s/场景超秒级预算）⇒ 它**抓不到**
  「声明 runnable 实则判据红」。本条是那个边界的**活证据**，不是假设。

**三条修法（都是决定，本轮未做，需要人拍）**：
① `--record` 重录（真模型、有成本）；② 降 `presence` 档（承认内容漂移，只守 member/task 集合与在场板同形）；
③ 加"按需/定期的 replay 探针"跑全场景、把结果回写到资格理由——**这才是能自动发现"声明过期"的机制**，
但它分钟级，只能做探针不能做门禁。**我的推荐 = ②（先止血）+ ③（防复发）**：② 立刻让 3 个资产回到
"真的守点什么"的状态；③ 让下次内容演进时有人被提醒，而不是靠我这种偶然复跑。

**另需写下一的运维规则（本轮没写，留判断）**：vendor DSH 升 pin 后，full 档录制的
tool-schemas/system-prompt 快照**必然**漂 ⇒ 升 pin 流程里应含"full 档场景重录或降档"一步。

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
  （收割一轮、丢个目录进来、没人知道它能不能跑）；
  ⑤ 抹掉 `r2-motion` 资格理由行的**日期** → **红**（资格会过期，日期让它可回溯）。
- 还原后 `PASS replay-scene-liveness ×9`；`pnpm verify` ALL PASS（**38 道**门禁）；
  `pnpm test` 36 files / 355 tests 绿。
- 改完 9 个 `snapshot.yml` 后 `replay-smoke --scenario r3-delegation` **仍 ALL PASS**
  （证明加字段没破坏 `js-yaml` 解析）。

## 后果

- 新增场景必须同 diff 带 `snapshot.yml` + `replayEligible` + **带日期的**资格理由，否则**门禁红**。
- 「runnable 1 / archived 4 / baseline 4」成为可查询事实，不再靠 README 散文——且这个数字本身是刺眼的（1/9）。
- 下一步（未做，留判断）：是否给 `runnable` 场景接自动跑（hook 或 CI 分档）、
  是否清理 `archived`/`baseline` 的历史体积——两条都需要人授权，本条只提供判据。
