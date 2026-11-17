---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-204：ledger.ts 分支地板被冷环境实测拉低到 94，暖树上留出 6 点静默回归空间

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C12 归属波次探索卡](../issues/2026-11-17-ownership-wave-exploratory.md)（C12-5 / N3）。
> **留痕**：待修复者决定（本轮只开卡，不修）。

## 症状

`checks/lib/coverage-baseline.json` 把 `packages/company-pack/src/lib/accounting/ledger.ts` 的
`branches` 从 100 降到了 94：

```json
"packages/company-pack/src/lib/accounting/ledger.ts": { "statements": 100, "branches": 94 }
```

但在暖 dev 树上实跑 `pnpm coverage:ratchet`，该文件实际是 **100/100**，输出：

```text
coverage-ratchet note packages/company-pack/src/lib/accounting/ledger.ts 变好：100/94 → 100/100
coverage-ratchet: PASS（197 文件；基线 2026-11-17；豁免 6 条）
```

降低的理由（`e56a637a`）是冷 CI 上 `tests/lib/accounting/ledger.spec.ts` 的 3 个
`live bundle 台账（dev only）` 用例按设计 skip（fresh clone 无 dev home），ledger 分支只剩 94.11%。
但基线是**单一全局地板**：冷环境测得的 94 被当成暖树地板，暖树上 95–99 的真实分支回归会全部
被吞掉。

## 复现

```sh
node -e "const b=require('./checks/lib/coverage-baseline.json'); console.log(b.files['packages/company-pack/src/lib/accounting/ledger.ts'])"
pnpm coverage:ratchet
```

第二条命令输出 `ledger.ts 变好：100/94 → 100/100` 且 PASS；把 `94` 临时改成 `99` 再跑仍是 PASS
（暖树 100 ≥ 99），说明 94 给了 6 点松弛。`tests/lib/accounting/ledger.spec.ts` 的 skip 条件是
`describe.skipIf(!hasLive)`，`hasLive` 由 dev 盘 `company-workspace/.dsh-company/.../meta.md` 是否存在决定
（[ledger.spec.ts](../../tests/lib/accounting/ledger.spec.ts) 第 18/44 行）。

## 根因与证据

- 根因：同一个 `coverage-baseline.json` 同时服务暖 dev 树与冷 CI；`e56a637a` 用「冷环境实测值」
  覆盖了暖树地板，而没有把 dev-only 的 3 个用例从冷环境的 ledger 分支统计里排除，也没有双基线。
- 证据：基线 94 vs 暖树 100（`coverage-ratchet` 原文）；Note
  [ci-fresh-tree-vendor-install-and-heap](../../notes/implemented/2026-11-17-ci-fresh-tree-vendor-install-and-heap.md)
  决定 ⑤ 明确写了「修基线不修 spec」。
- 影响：`coverage:ratchet` 是 pre-push 的强制门；它的绿灯现在对 ledger 的分支回归有 6 点盲区。
  这是「修绿了」而不是「修对了」：冷环境的 skip 是设计，不应改变暖树的棘轮。

## 失败类与同类排查

**失败类 = 回归/纯逻辑**（环境差异被写成全局地板）。

同类：

- 改名/地板丢失的通用机制 → [BUG-203](BUG-203-coverage-ratchet-rename-resets-floor.md)。
- 其它 dev-only skip：`tests/repo/budget/skip-budget.spec.ts`（skip 预算）是否把 ledger 的 3 例
  算进冷/暖两形状？本卡只证 ledger。
- `vitest.config.ts` 的 10 个手选阈值是另一套地板，未包含 ledger；不与本卡重复。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 暖树地板保持 100；冷环境（3 例 skip）不能把它拉低。允许的实现：按 `hasLive` 两形状分别
   统计/比对，或把 live 用例的分支从冷环境 metrics 中排除，而不是降全局基线。
2. 最小负例：暖树上把 ledger 分支真实降到 95 → `coverage:ratchet` 红（当前会 PASS）。
3. 冷形状：fresh clone 上 3 例 skip 时仍能解释 94.11%，但不得改写暖树地板。

## 修复方向（不授权，仅记录）

- 给 baseline 增加「环境形状」维度（`warm` / `cold`）或 `devOnlySpecs` 列表，由 ratchet 在两种
  形状下选择；冷形状只允许「已知 dev-only 空洞」的显式豁免。
- 或者在 `vitest.config.ts` 用 coverage `exclude` 排除 live 用例所在文件，让 ledger 只按纯函数测；
  但那会改变统计语义，需先写决定。
