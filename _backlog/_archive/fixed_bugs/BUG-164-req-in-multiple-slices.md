---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-164：/prd check 不校验「一个 REQ 只能属于一个 slice」：同一 REQ 列进两个 slice 仍绿

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 89](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-157 修了 slice/AC 的**重号**，但「REQ 跨 slice 重复归属」是另一条身份规则。
> **留痕**：Note [2026-11-14-shape-layer-and-structure-semantics.md](../../../notes/implemented/2026-11-14-shape-layer-and-structure-semantics.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8b-more-shapes.mts`。

## 症状

同一 REQ 同时列进 S1 与 S2，且 REQ 的 `slice: S1`：

```text
| S1 | 最小端到端 | REQ-001 | ok |
| S2 | 另一个 | REQ-001 | ok |
```

`validateProductDocs` 返回 `ok: true`、无错误。合同/技能明确「a REQ belongs to exactly one slice」。

## 根因（假设）

`validateProductDocs()` 对每个 slice 只检查「列出的 REQ 存在」，对每个 REQ 只检查「其 `slice` 在表中且该行列出它」；没有反向检查「该 REQ 是否也被其它 slice 列出」。`parsePrdSlices()` 的 `seen` 只防 slice id 重号，不防 REQ 跨行重复。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8b-more-shapes.mts
```

看 `REQ in two slices true []`；去掉 S2 行后同文档仍 `ok`。

## 影响 / 失败类

**失败类 1（纯逻辑/身份）**：同一 REQ 属于两个 slice 时，任务拆分/依赖/验收的归属出现两个答案；`/prd check` 与 present 闸门都不红。与 BUG-157 的「重号」不同：这里两个 slice id 都合法，重复的是 REQ 的归属。

## 修复方向（不在本卡实施）

- `validateProductDocs()` 反向建 `reqId -> sliceIds`，任一 REQ 出现在 >1 个 slice 即红；
- 或 `parsePrdSlices()` 维护 `reqSeen`，跨行重复即报；
- spec 覆盖「跨 slice 重复」「同 slice 内重复」「合法单归属」三形状。

## 已修判定

```text
同一 REQ 同时列进 S1 与 S2 → 红，点名两个 slice
同一 slice 行里重复列同一 REQ → 红
单归属（合法形状）→ 绿，不误判
```

判据由 `tests/lib/prd-check.spec.ts` 的归属用例搭载；红证 = 去掉 `reqOwner` 映射 → `REQ in two slices true []` 复现。

## 修复证据

- 改动面：`packages/company-pack/src/lib/prd-check.ts`、`tests/lib/prd-check.spec.ts`
- 红：去掉 slice 解析里的 `reqOwner` 映射 → 跨 slice 与同 slice 重复两条用例红
- 绿：接回归属映射 → `tests/lib/prd-check.spec.ts` 29 passed，单归属不误判
- 提交：commit 85e6fec9
## 证据

- `runtime/tmp/c8b-more-shapes.mts` / `.log`：`REQ in two slices true []`。
- 代码：[prd-check.ts](../../../packages/company-pack/src/lib/prd-check.ts) 的 `validateProductDocs()` / `parsePrdSlices()`。
