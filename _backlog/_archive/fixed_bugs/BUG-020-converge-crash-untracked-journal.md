---
status: 已修
severity: P2
opened: 2026-10-16
---

# BUG-020：converge 在「角色刚写、未入库的 journal」上崩，且崩后无续跑路径

> 严重级别：P2（次要——不损坏数据，但**收敛中断在半途且无官方恢复路径**，只能靠人按证据手工补完）｜发现：2026-10-16｜状态：已修（2026-10-16 同日修完两条）
> **两条根因均已修（2026-10-16 同日）**：① `git rm` 撞未跟踪 ⇒ 判 tracked 分支（`clearLiveJournal`）；② 崩后无续跑 ⇒ 新增 `converge --resume <目录名>`（只做剩余步骤、不搬移交付物；不可续跑时 fail-loud 并给恢复指引）。判据纯函数 = `convergenceResume`（lib），收据 = [implemented/2026-10-16-converge-resume.md](../../../notes/implemented/2026-10-16-converge-resume.md)。

## 症状（真现场，非构造）

用回归结束后的真实收敛触发：CEO 真会话刚新建 `kb/ceo/journal/2026-10-16-all-in-ai-2026-收口补记.md`（**未跟踪**），随即跑

```sh
source run/env.sh && node tools/converge.mjs --slug 2026-10-13-all-in-ai-2026
```

结果**抛异常中断在半途**：

```
Error: git rm -q company-workspace/kb/ceo/journal/2026-10-16-all-in-ai-2026-收口补记.md 失败：
fatal: pathspec 'company-workspace/kb/ceo/journal/2026-10-16-all-in-ai-2026-收口补记.md' did not match any files
    at git (tools/converge.mjs:42) ← converge (tools/converge.mjs:239)
```

崩后盘面 = **半态**（交付物已 git mv 进归档家、部分 live journal 已入证据副本，但台账行未追加、其余 live journal 未清）：

```
R  deliverables/2026-10-13-all-in-ai-2026/final.md -> deliverables-archive/…/final.md
D  kb/ceo/journal/2026-10-13-all-in-ai-2026.md          ← 已清
   kb/vp-eng|vp-sales|coo|cfo/journal/2026-10-13-….md   ← 仍在 live（未清）
   台账：无 ai-in-ai-2026 行                              ← 未追加
```

**且不可续跑**：重跑同一命令直接 `✗ deliverables/ 下无此目录或缺 meta.md`——收敛器只从活跃区找 slug，认不出「已搬了一半」。

## 根因

两条，独立：

1. **`git rm` 撞未跟踪文件**：`journal` 的清理走 `git rm -q <path>`（`tools/converge.mjs` 的 `converge()` journal 循环）。**角色刚写、尚未入库的 journal 是常态**（收口补记就是），而 `git rm` 对未跟踪路径直接 fatal ⇒ 抛。工具头注原本自称「git mv/git rm 只动 tracked 文件」——这句是**假设**，不是**保证**（它没做 tracked 判定）。
2. **崩溃无续跑**：收敛是一串有副作用的顺序操作（证据副本 → git mv → 清 journal → 台账行 → 打印 backfill 指引），**没有事务边界也没有幂等/续跑入口**；崩在哪一步，盘面就停在那一步，而 `converge(slug)` 的前置只认活跃区的 slug ⇒ 半态无法被工具自己接手。

## 暴露的失败类

「**多步破坏性操作的崩溃恢复**」——本仓既有同类先例：[BUG-015](../../_archive/fixed_bugs/BUG-015-charter-backfill-evidence-date-coupling.md)（写死日期导致断链）与收敛器自身的 2026-10-12 crash 教训（「字段必须在任何搬移前捕获」）。这次的形状是：**崩溃点落在搬移之后**，于是连重试都进不去。

**是否需要横切排查**：是，但范围限「多步破坏性脚本的续跑面」——建议口径：凡顺序执行 ≥3 步副作用且中途会改盘的工具，要么每步幂等、要么给 `--resume`/`--repair` 入口，要么在崩溃信息里**打印已完成/未完成清单 + 恢复命令**。

## 复现

```sh
# ① 造一个未跟踪的 journal（模拟角色刚写）
printf '# 测试\n' > company-workspace/kb/ceo/journal/<日期>-<slug>-收口补记.md
# ② 对一个已闭合动议跑收敛 → 抛路径不匹配、中断在半途
source run/env.sh && node tools/converge.mjs --slug <目录名>
# ③ 重跑 → ✗ deliverables/ 下无此目录或缺 meta.md（半态不可续跑）
```

## 修复关联

- **① `git rm` 撞未跟踪（已修，2026-10-16 本轮）**：清 journal 前先 `git ls-files --error-unmatch` 判 tracked；已跟踪走 `git rm`，未跟踪走 `rmSync`（语义等价——两者都进证据副本）。头注的「只动 tracked 文件」假设同步改成明示的分支语义。**验证方式 = 真现场复跑**（该分支是 IO 分支，纯函数层无可断言面；本轮的真现场就是它的红证）。
- **② 崩溃无续跑（已修 = 候选 A）**：`--resume <目录名>`：允许 slug 已在归档家时接续「清 journal → 台账行」，并在崩溃信息里打印「已完成/未完成 + 该跑的命令」；**B** 把整串操作做成幂等（每步先判是否已完成）；**C** 只加恢复指引（最低成本，但每次仍需人手工按证据补）。选 A 的理由：它把「人按证据手工补完」变成工具动作，且与既有的 `--charter-backfill`（同为「补做前一步没做完的收尾」）同形。

**当时的临时处置（已由上面的修复取代，留痕）**：撞上后按证据手工补完——证据副本与 live 原件逐字节 `cmp` 全同 ⇒ `git rm` 清 4 份 live 副本；台账行**用收敛器自己的口径**（逐字取 meta 一句话结论、插在末数据行之后）补 1 行。这是「人按证据补完」，**恰恰是该被 ② 消掉的那件事**。
