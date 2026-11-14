---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-157：`/prd check` 不校验 AC/slice 身份唯一性

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 86](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C8-H8 的相邻面）；编号合同要求每个 kind 的号在动议内唯一。
> **留痕**：Note [2026-11-14-eight-bug-second-sources.md](../../../notes/implemented/2026-11-14-eight-bug-second-sources.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8-structural.mts`。

## 症状

同一 REQ 下写两条 `AC-001-1`（given/when/then 不同）：

```text
- acceptance:
  - AC-001-1
    - given: g
    - when: w
    - then: t
  - AC-001-1
    - given: g2
    - when: w2
    - then: t2
```

`validateProductDocs` 返回 `ok: true`、`acCount: 2`，不报重号。两个 `S1` slice 行同理 `ok: true`。

## 根因（假设）

- `parsePrdHeadings()` 只对 REQ id 做 `seen` 重号检查；acceptance 只校验 `AC-<REQ>-<n>` 格式与父号，不维护 AC 的 `seen` 集合。
- `parsePrdSlices()` 不维护 slice id 的 `seen` 集合；重复 `S1` 行都进 `slices` 数组，`validateProductDocs` 的 `find` 只取第一条。
- 合同（`content/templates/prd.md` + `requirements-model.md`）要求每个 kind 的号全局唯一、一个 REQ 属于恰好一个 slice；`/prd check` 是它的机械门。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8-structural.mts
```

看 `dup AC true []` 与 `dup slice true []`；同一文档去掉重复项即 `ok`。

## 影响 / 失败类

**失败类 1（纯逻辑/身份）**：重复 AC 让同一个验收 id 指向两个判据；重复 slice 让「REQ 属于哪个 slice」出现歧义。`/prd check` 与 present 闸门都不红，错误进入下游任务板/验收。

## 修复方向（不在本卡实施）

- AC 解析加 `seen`（按 REQ 内/全局，与合同一致），重复时点名两处；
- slice 解析加 `seen`，重复 id 报红；
- spec 覆盖「同 REQ 重 AC」「跨 REQ 重 AC」「重 slice」「合法多 AC」四形状。

## 已修判定

```text
同一 REQ 下两条 AC-001-1      → ok: false，错误点名 AC-001-1 重号
两条 S1 slice 行              → ok: false，错误点名 S1 重号
合法多 AC（AC-001-1/2）       → ok: true（不误判）
跨 REQ 重号（REQ-002 下写 AC-001-1） → 仍报父号不一致（现有行为不回归）
```

判据由 `tests/lib/prd-check.spec.ts` 的重号用例搭载；红证 = 去掉 AC/slice 的 seen 集合 → `dup AC true []` / `dup slice true []` 原样复现。

## 证据

- `runtime/tmp/c8-structural.mts`：`dup AC true []`、`dup slice true []`。
- 代码：[prd-check.ts](../../../packages/company-pack/src/lib/prd-check.ts#L407)（AC 解析）、[prd-check.ts](../../../packages/company-pack/src/lib/prd-check.ts#L452)（REQ 重号只覆盖 REQ）。
