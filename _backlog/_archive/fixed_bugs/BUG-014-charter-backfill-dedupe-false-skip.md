---
status: 已修
severity: P1
opened: 2026-10-12
---

# BUG-014：--charter-backfill 查重假跳过——COO 缺 ai-sprint-2026 历史纪要，卡上记了假绿

> 严重级别：P1（重要）｜发现：2026-10-12（f8bc123...HEAD 双轴代码评审 Spec 轴）｜状态：修复就绪
> **翻转记录（2026-10-12）**：根因动态复现坐实（收据在复现节）+ 修法选定 + 已修判定在场——缺陷轨翻转表「调查中 → 修复就绪」（P1 修复型自授权通道）。
> **修复（2026-10-12）**：查重判据迁 `tools/lib/converge-rules.mjs` 的 `charterHasEntry`（条目行形「- <日期> · <slug>（」锚），converge.mjs 不再整文件子串查重。红绿 = tests/harness/converge-rules.spec.ts（实现前模块缺红 → 10 用例绿，含 COO 反例钉住 includes 误报）。真仓重跑 backfill：ceo/vp-eng/vp-sales/cfo 真条目精确跳过、**coo +1**（缺的 ai-sprint-2026 条目补登，逐字取 meta，指针解析到真实证据目录）；`pnpm verify` ALL PASS + `pnpm test` 494/494——已修判定满足，修复已落地 → 已修归档。

## 症状

- 首轮 backfill 报 19 条落盘、验收表记「coo ai-sprint 查重跳过」为绿（归档卡验收表 L71）。
- 实核：`company-workspace/kb/coo/CHARTER.md` 的「## 历史纪要」节**没有** ai-sprint-2026 条目
  （该节条目止于旧轮）；其余 4 角色 × 4 slug 均正常落盘。
- 即：那个「查重跳过」不是真重复，是假跳过——公司记忆缺了一条，且卡上把它记成了预期行为。

## 根因（假设→已证）

[tools/converge.mjs:217](../../../tools/converge.mjs) 的查重判据 = `ct.includes(slug)`（整文件子串包含）。
缺陷 3 的引用重指把含 slug 字样的**证据路径**写进了 CHARTER——coo/CHARTER.md L14 有
`…/convergence-2026-10-12/2026-10-10-ai-sprint-2026/journal/coo/…`，子串 `ai-sprint-2026` 命中 →
backfill 误判「已登记」。子串查重对「路径恰好含 slug」零免疫力；COO 恰好是缺陷 3 重指的受害者。

## 暴露的失败类

「文本包含标识符」当「已登记」判据的子串查重类。横切排查：converge.mjs 内同类判据仅
appendLedger 的 `includes('| slug |')`——带 `| ` 定界符且台账行形固定，误触面小；修复时顺手核，
不另立卡。

## 复现

```sh
grep -c "ai-sprint-2026" company-workspace/kb/coo/CHARTER.md          # ≥1（路径命中）
sed -n '/## 历史纪要/,$p' company-workspace/kb/coo/CHARTER.md \
  | grep -c "· ai-sprint-2026（"                                       # 0（条目缺失）
```

**实跑收据（2026-10-12，零写入动态复现）**：
- 五份 CHARTER 对 `ai-sprint-2026` 的提及数：ceo 2 / vp-eng 2 / vp-sales 2 / **coo 1（唯一提及 = L14
  的证据路径，非条目）** / cfo 2；COO 历史纪要条目计数 = **0**；
- 无改动 re-run `--charter-backfill 2026-10-10-ai-sprint-2026`：五角色**全部**打印「CHARTER 已有
  ai-sprint-2026 记载——跳过」并报「✓ backfill 完成」exit=0——COO 在零条目情况下被报「已有」，
  假跳过坐实；`git status` 确认零写入（re-run 本身安全）。

## 修复关联

修法选定：查重改锚 = 只认历史纪要**条目行形**（行首 `- <YYYY-MM-DD> · <slug>（`），不认整文件子串；
修复后对 ai-sprint-2026 重跑 backfill 补 COO 条目（幂等：其余角色真重复仍跳过）。
**验证搭载**：匹配逻辑提取 `tools/lib/` 纯逻辑 + keyless spec（tools/ 面现无 keyless 回归锚——
tests/ 四分区不覆盖 tools/；本缺陷的回归检查随该 spec 给出，红 = 子串假跳过用例）。

## 已修判定

- keyless spec：子串假跳过用例先红、条目行锚后绿（实现前已见红）；
- 重跑 backfill 后 coo/CHARTER.md 历史纪要含 ai-sprint-2026 条目，五个 CHARTER 无重复条目；
- `pnpm verify` + `pnpm test` 全绿。
