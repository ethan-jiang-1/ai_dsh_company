---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-203：coverage-ratchet 对文件改名只发 note，旧键的高地板消失、新路径按新文件下限重新起算

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C12 归属波次探索卡](../issues/2026-11-17-ownership-wave-exploratory.md)（C12-5 / N3）。
> **留痕**：待修复者决定（本轮只开卡，不修）。

## 症状

`checks/lib/coverage-baseline.mjs` 的 `compareCoverage()` 只遍历**当前**统计里的文件：

- 当前文件在基线里 → 比 statements / branches，低于即红；
- 当前文件不在基线里 → 走「新文件」下限 `80 / 70`（或被豁免）；
- 基线里有、当前没有的键 → 只进 `notes`（`基线里的 … 已不在本次统计（文件删除/改名？基线更新时会移除）`），**不判红**。

因此一次 `git mv` 可以把 100/100 的文件重置成「新文件」，只要新路径 ≥ 80/70 就 PASS；旧键的
高地板只剩一条 note。`nextBaseline()` 随后会把旧键删掉，永久丢失。C11 的 63 个 lib 搬移靠人工
迁移基线键（`ca8e0e0f`）才没有踩到；没有机械判据要求「改名必须显式迁移地板」。

## 复现

```sh
node --input-type=module - <<'EOF'
import { compareCoverage, nextBaseline } from './checks/lib/coverage-baseline.mjs'
const baseline = { generatedAt: '2026-11-17', files: { 'pkg/old-home/moved.ts': { statements: 100, branches: 100 } }, exemptions: [] }
const current = { 'pkg/new-home/moved.ts': { statements: 85, branches: 75 } }
const { violations, notes } = compareCoverage(current, baseline)
console.log('violations=', JSON.stringify(violations))
console.log('notes=', JSON.stringify(notes))
console.log('next=', JSON.stringify(nextBaseline(current, baseline, '2026-11-17')))
EOF
```

实测输出：

```text
violations= []
notes= ["基线里的 pkg/old-home/moved.ts 已不在本次统计（文件删除/改名？基线更新时会移除）"]
next= {"generatedAt":"2026-11-17","files":{"pkg/new-home/moved.ts":{"statements":85,"branches":75}},"exemptions":[]}
```

## 根因与证据

- 根因：[coverage-baseline.mjs](../../checks/lib/coverage-baseline.mjs) 的 `compareCoverage()`：
  `for (const [path, value] of Object.entries(current))` 只判当前键；缺失基线键的循环只 `notes.push`。
  新键的判定是 `NEW_FILE_FLOOR = { statements: 80, branches: 70 }`。
- `nextBaseline()` 以 `current` 为全集重建，旧键不保留；所以下一次 `--update` 后旧地板彻底消失。
- 确认：上命令 2026-11-17 实跑，`violations=[]`；把同一 `current` 直接对照旧键应判 85/75 < 100/100。
- 影响：搬移/改名面（本波 77 renames、`2450d0ef` 63 件）是覆盖率棘轮最容易静默降标的地方；
  `coverage:ratchet` 绿 ≠ 地板未降。

## 失败类与同类排查

**失败类 = 回归/纯逻辑**（棘轮对「改名」与「降低」同形）。

同类：

- 同一波把 `ledger.ts` 分支地板 100→94，属冷/暖环境单一基线问题 →
  [BUG-204](BUG-204-ledger-branches-floor-cold-only.md)。
- `refactor-drift` 的「搬移等价」缺口 → [BUG-202](BUG-202-refactor-drift-title-hash-and-duplicate-mask.md)。
- 本卡的修法不应只是把 note 改红：真搬移（文件/describe 搬家）必须放行，否则每次搬移都红；
  需要「旧键 → 新键」的显式映射或 `git mv` 识别。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 基线键缺失必须是**待决状态**，不是 note：要么要求同 diff 的显式 rename 映射，要么在无映射时
   红并点名「旧键 X 消失、新键 Y 出现，疑似改名；请显式迁移地板」。
2. 最小负例：old 100/100、new 85/75、无映射 → 红；有显式映射 `old→new` → 绿且地板仍是 100/100。
3. 正例：真新增文件 85/75 → 走 80/70 新文件下限，绿；不误红。

## 修复方向（不授权，仅记录）

- 在 `compareCoverage` 里对「基线键缺失 + 新键出现」做配对候选（按 basename/相似度），要求显式
  `--rename old=new` 或基线里的 `renamedFrom` 字段；没有映射就红。
- 或在 `nextBaseline` 里保留未消费的旧键直到显式 `--drop-key`，让丢失地板成为显式动作。
