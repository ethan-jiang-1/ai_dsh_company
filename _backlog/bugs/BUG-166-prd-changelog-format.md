---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-166：/prd check 不校验 changeLog 的日期/作者形状，非法日期也过门

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 89](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；`changeLog` 是状态离开 draft 的唯一留痕面。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8b-more-shapes.mts`。

## 症状

REQ 状态改为 `ready`，`changeLog` 写一条明显非法的记录：

```text
- changeLog: 2026-13-99 · nobody · bad
```

`validateProductDocs` 返回 `ok: true`，无错误。模板规定 `changeLog` 条目为 `<YYYY-MM-DD> · <who> · <change>`；解析器只检查按 `·` 切成三段，不校验日期/作者形状。

## 根因（假设）

`readRequirementFields()` 的 `changeLog` 分支只做 `entry.split('·')` + `parts.length === 3`；没有日期正则（`YYYY-MM-DD` 且月/日范围）与作者非空校验。`parsePrdHeadings()` 只在 `status !== draft` 时检查 `changeLog.length > 0`，空/坏日期都算“有”。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8b-more-shapes.mts
```

看 `bad changeLog true []`；把日期改成 `2026-11-14 · alice · ok` 仍 `ok`。

## 影响 / 失败类

**失败类 1/6（字段格式）**：`ready` 状态的审计链可以是一条无日期/假日期记录；`/prd check` 与 present 闸门都不红，后续追溯无法按日期排序/定位。

## 修复方向（不在本卡实施）

- `changeLog` 每段校验：日期 `^\d{4}-\d{2}-\d{2}$` 且真实日历（可用 `Date.parse` 往返）；作者非空；变更非空；
- spec 覆盖合法 / 缺段 / 假日期 / 空作者四形状。

## 已修判定

```text
changeLog 日期非真实日历（2026-13-99 / 2026-02-29 非闰年）→ 红
作者为空 / 变更说明为空 → 红
合法条目（2026-11-14 · alice · ok）→ 绿
```

判据由 `tests/lib/prd-check.spec.ts` 的 changeLog 用例搭载；红证 = 去掉日期/作者校验 → `bad changeLog true []` 复现。

## 证据

- `runtime/tmp/c8b-more-shapes.mts` / `.log`：`bad changeLog true []`。
- 代码：[prd-check.ts](../../packages/company-pack/src/lib/prd-check.ts) 的 `readRequirementFields()` `changeLog` 分支。
