---
status: 已修
severity: P2
opened: 2026-10-12
---

# BUG-017：评审面记录残留——缺陷计数 3/4/5 并存、stray 断链、台账叙述与 diff 出入、缺 convergence Note

> 严重级别：P2（次要）｜发现：2026-10-12（f8bc123...HEAD 双轴代码评审 Standards 轴 + Spec 轴③）｜状态：修复就绪
> **翻转记录（2026-10-12）**：四条复现实跑见红（收据在复现节）+ 修法选定 + 已修判定在场——缺陷轨翻转表「调查中 → 修复就绪」（P2 修复型自授权通道）。
> **修复（2026-10-12）**：①归档卡计数统一为「五个实跑缺陷」（结论行 + 推敲记录标题——只动数字与台账叙述，不动讨论正文）；②issues/README L9 stray 裸链接删除；③台账叙述校正为「4 slug 入账（3 行新增；V4 行系既有、查重跳过）」；④落地决定补 implemented Note `notes/implemented/2026-10-12-workspace-convergence-executor.md`（按 agent-note-definition：决定/输掉的方案/后果/验证四件 + 全实跑收据）——「卡承载推敲、Note 承载落地决定」的分工就此表态。门禁归属核实：md-links / bare-path 均不扫裸括号链接（stray 此前两门禁都放行）——按卡上预案不立新门禁，修掉即止。`pnpm verify` ALL PASS + `pnpm test` 494/494——已修判定满足，修复已落地 → 已修归档。

## 症状

1. **归档卡缺陷计数三值并存**：结论行（L10）「四缺陷」、推敲记录标题（L18）「三个实跑缺陷」、
   实列五条（缺陷 1–5，L29 起含缺陷 5）——追加式写作没回改旧计数。
2. **stray 断链残留**：[_backlog/issues/README.md:9](../../issues/README.md) 旧裸链接
   `(../_archive/settled_issues/README.md)。` 未清、新文直接续接其后。
3. **台账叙述与 diff 出入**：卡 L17「台账 4 行已追加」，`git diff f8bc123...HEAD -- …/motion-ledger.md`
   实际 +3 行（V4 行系既有、被查重守卫跳过）。
4. **非平凡变更零 Note**：246 行新工具 + 流程常设化，`notes/implemented/` 无 convergence 条目
   （[notes/README](../../../notes/README.md) §二「非平凡变更同 diff 新增或更新相关 Note」）；同日
   另三件工作均有 Note，唯独此件默认走了「卡即记录」，与成文规则相左。

## 根因（假设→已证）

卡片三连发（15:47 fix → 15:48/16:00 补记）时序拆分 + 追加不回改；收尾清单无「断链/计数一致性」
步；Note 缺位是流程歧义（_backlog 卡与 notes Note 双轨均可承载结论）被默认走卡——**流程歧义本身
也该在修复轮一并表态**（补 Note，或成文豁免「卡可替代」，二选一写清）。

## 暴露的失败类

记录漂移类。横切排查：裸括号断链是否在既有 md-links / bare-path 门禁视野内——修复时核一次；
若两门禁都不查裸括号链接，本卡不立新门禁（残留一处、修掉即可），结论写回此处。

## 复现

```sh
grep -n "四缺陷\|三个实跑缺陷" _backlog/_archive/settled_issues/2026-10-12-workspace-convergence.md
sed -n '8p' _backlog/issues/README.md
git diff f8bc123...HEAD --stat -- company-workspace/kb/motion-ledger.md   # +3
ls notes/implemented/ | grep -ci 收敛                                      # 0
```

**实跑收据（2026-10-12）**：① grep 命中 L10「四缺陷」+ L18「三个实跑缺陷」（实列五条）；② stray
裸链接在 issues/README **L9**（立卡时误记 :8——复现即校正）；③ `git diff f8bc123...HEAD --
…/motion-ledger.md` = 1 file changed, 3 insertions(+)；④ implemented/ 无 convergence 条目（grep 计 0）。

## 修复关联

修法选定：①计数统一为「五个实跑缺陷」（结论行与标题行同步，只改数字不动讨论正文——冻结卡失真
修正）；②删 stray 裸链接；③台账叙述补「（+3 新增；V4 行系既有，查重跳过）」；④补 convergence
executor 的 implemented Note（全日期卡名，登记时定；素材 = 归档卡：输掉的方案、五缺陷红绿、
常态化裁定），按 agent-note-definition 走。

## 已修判定

- 四条复现全部反转（计数唯一、链接可解析、叙述与 diff 一致、Note 在场且状态行合规）；
- `notes-liveness` 门禁对新 Note 绿；`pnpm verify` 全绿。
