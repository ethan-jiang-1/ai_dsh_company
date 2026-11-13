---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-070：delegation.md 的 `maxDepth` 例子在绝对语义下不成立

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note — [声明↔载体门禁](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E11

## 症状

[delegation.md](../../../docs/contracts/delegation.md)（第 40 行）写：

> `maxDepth` 是绝对上限（`0` 禁止、`1` 只允许直接子代；省略读 Host 默认 1）。
> `vp_eng`/`vp_sales` 行是 1——VP-Eng 可能是团队成员（depth 1），子代落 2；`spawn_teammate` 仅 Lead 可调。

但按 vendor 的真实 `resolveChildDepth`（子代 depth = parent + 1，超过 maxDepth 即抛
`SubagentDepthError`），真值表是：

| parentDepth | maxDepth | childDepth | 结果 |
|---|---|---|---|
| 1 | 1 | 2 | **THROW** |
| 1 | 2 | 2 | ALLOW |
| 2 | 1 | 3 | **THROW** |
| 2 | 2 | 3 | **THROW** |
| 2 | 3 | 3 | ALLOW |

所以“`vp_eng` 行 maxDepth 1 + VP-Eng 是 depth 1 的团队成员 ⇒ 子代落 2 可行”**不成立**：
depth 1 的父会话调用 maxDepth 1 的行，child 落 2，直接抛错。
如果那句话想说的是 `vp_cmo`（VP-Eng 版 `maxDepth: 2`），那它把两行混在了一起。

## 根因（假设）

文档把“某个调用行自己的 maxDepth”和“调用者当前 depth”放在一句里，且用了接近相对层级的措辞
（“子代落 2”），读者很容易以为 maxDepth 是“还能再往下几层”而不是绝对 depth。绝对语义在
同一段前半句写对了，后半句的例子却没按绝对语义算。

## 暴露的失败类

**委派预算的语义误读**：把 `maxDepth` 当相对层级，会写出“depth 1 的 VP-Eng 还能再叫 vp_eng”的
错误配置/文档；实际运行拒付。同型检查：所有“深度/预算/上限”的说明是否给了可代入的真值表，
而不是只给一句例子。

## 复现

```sh
node --import tsx/esm _backlog/_archive/research/two-product-structure-audit/experiments/e11-maxdepth-truth-table.mjs
```

- 输出 `1 / 1 / 2 → THROW SubagentDepthError`。
- 同一脚本打印 delegation.md 第 40 行与 `vp_eng` / `vp_cmo` 行。
- 原始输出：[raw/e11.txt](../research/two-product-structure-audit/experiments/raw/e11.txt)

## 修复方向（未授权）

- 把第 40 行改写成两张表：
  - `vp_eng`/`vp_sales`（maxDepth 1）：**只能从 depth 0（根/Lead）调用**；depth 1 的成员调用会抛错。
  - `vp_cmo`（VP-Eng 版 maxDepth 2）：depth 1 的 VP-Eng 可以调用，child 落 2。
- 明确一句：“`maxDepth` 是 child 的绝对 depth 上限，不是剩余层数；parent depth + 1 > maxDepth 即拒绝。”
- 加一条 keyless 测试/守卫，用 `resolveChildDepth` 钉住 1/1→THROW、1/2→ALLOW。

## 修复关联

未修。修复面 = `docs/contracts/delegation.md`；可在 `tests/` 或 preset 合同测试里加真值表断言。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. `delegation.md` 的 `maxDepth` 说明改成绝对语义 + 真值（`0/1→1 ALLOW`、`1/1→2 THROW`、
   `1/2→2 ALLOW`、`2/3→3 ALLOW`、`2/2→3 THROW`）；`vp_eng`/`vp_sales`=1 只能从 depth 0 调，
   `vp_cmo`=2 可让 depth 1 的 VP-Eng 调。
2. keyless spec 直引 vendor `resolveChildDepth`，钉住 1/1 throw、1/2 allow、2/3 allow、2/2 throw。
3. 反证：把 1/1 期望改成 allow → spec 红；还原 → 5 passed。
4. `pnpm test` 绿；doc-budget 仍留 ≥5% headroom。

## 修复与验证

- `docs/contracts/delegation.md` 的“深度”改成绝对语义 + 5 组真值；`vp_eng`/`vp_sales`=1 的
  调用边界写清（只能从 depth 0 调），`vp_cmo`=2 单独说。
- 新增 `tests/contract/delegation-depth-truth-table.spec.ts`：直引 vendor
  `resolveChildDepth`，用 `{ options.subagentDepth, session.header.delegationDepth }` 构造 parent，
  覆盖 `0/1`、`1/1`、`1/2`、`2/3`、`2/2`。
- 红→绿：把 `1/1` 的期望从 throw 改成 allow → `1 failed | 4 passed`；还原 → `5 passed`。
- doc-budget：`docs/contracts/delegation.md` 114/120（保留 ≥5% headroom）。
- `pnpm test` 175 files / 1463 tests。
- 证据 = [Note](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)「验证」节。
