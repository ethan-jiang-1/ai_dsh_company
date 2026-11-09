# 2026-11-03 · skip 守卫：预期 N 个真跑（防静默加例）

状态：implemented（2026-11-03；七维复评 Phase 2 收尾）

> 上游 = 2026-11-03 fresh 复评 D5「skip 守卫只 allowlist 文件，没校验‘预期 N 个真跑’」。
> 前身 = [review-integrity-fixes](./2026-11-03-review-integrity-fixes.md) 的 skip-budget 首刀。

## 决定

- `tests/harness/repo/skip-budget.spec.ts` 增加第二条断言：对每个登记文件，解析 `describe.skipIf(...)` 回调体，
  数其中 `it(` 的数量；必须等于注释里 `skip 预期：… N 例` 的 N。
- 注释格式收紧为 `skip 预期：[^\n]*?\d+\s*例`；ledger 的“真跑 3 例”即可匹配。
- 这是**结构守卫**，不是运行证据：它证明“skip 块里的用例数没悄悄变”，不证明 dev home 真跑了那 3 例
  （后者仍由 `pnpm test` 0 skipped 读数与 spec 头注负责）。

## 输掉的方案

- **运行期数跳过条数。** `describe.skipIf` 为真时用例根本不执行，没有可挂的钩子。
- **只保留 allowlist + 文本“预期”。** 这正是上一刀的缺口：往 skip 块里加第 4 个 `it` 仍然绿。
- **解析 AST。** 当前文件形状固定（一个 skipIf + 直接 it），brace 扫描足够；引 TypeScript parser 换不来收益。

## 验证（实跑，2026-11-03 11:4x +08）

```text
npx vitest run tests/harness/repo/skip-budget.spec.ts   # 2 passed
# 红证：在 ledger 的 skipIf 块里临时加 it('__skip_guard_red', () => {})
#   → 1 failed：skip 块有 4 个 it，注释预期 3 例
# 还原 → 2 passed
pnpm test                                          # 138 files / 1102 tests
pnpm verify                                        # ALL PASS
```

## 边界

- 只覆盖 `describe.skipIf(...)` 的**直接** `it(` 计数；`it.skip` / 嵌套 describe 的形态不在本刀
  （出现时守卫的 allowlist 会先红，再按需扩解析）。
- 不替代 dev home 的 `0 skipped` 观察。
