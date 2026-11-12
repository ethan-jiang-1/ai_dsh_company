---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-092：`cultivation_propose` 接受空 expectation/body，写出一条坏记录并回报 `recorded:true`

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / H-tool-input）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

模型侧 `cultivation_propose` 的 schema 只标 `required`，没有非空约束；execute 也不校验：

```
proposal.execute({ kind:'correction', targetRole:'ceo', expectation:'', body:'' }, …)
→ { id:'20261112-235625-3fj2', recorded:true,
    note:'已记录培养提案 …（纠正），待目标角色本人用 /cultivation adopt 采纳或 reject 拒绝。' }

loadRecords → { records: 0, broken: 1, reachable: true }
check       → 'CEO 方法层与已采纳记录一致（0 条）'
```

- 模型得到 `recorded:true`，以为提案已入账；实际记录 `expectation` 为空，`parseRecord` 返回 null，收件箱/对账都读不到；`adopt` 会报「记录不存在」。
- 同一家公司里人侧命令 `/cultivation correct` 对空 expectation/body 是明确 error（`commandCorrectOrSuggest` 有 guard）；两条入口的校验面不一致。

## 根因（假设）

- `cultivation_propose` 的 `parameters` 只有 `required`，没有 `minLength`/非空 trim；`execute` 直接把 `args.expectation` / `args.body` 写进 `recordText`（`src/host/cultivation/cultivation.ts:680` 附近）。
- `recordText` 对 `expectation` 只 `oneLine`，不拒绝空串；`parseRecord` 是唯一的坏形状发现点，但它在写入之后。
- `commandCheck` 又不计 `broken`（见 [BUG-091](BUG-091-cultivation-check-revoked-broken-unsafe.md)），所以这条坏记录完全静默。

## 暴露的失败类

**模型入口与人类入口的校验不对称**：同一份记录形状，命令面 guard 齐、工具面只靠 schema required；模型可以写出人面明确拒绝的数据，且回执说成功。

## 复现

```sh
node --import tsx/esm runtime/tmp/c1-guards.mts
# C: proposal empty -> ...; C load -> {"records":0,"broken":1,...}; C check -> "一致（0 条）"
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `cultivation_propose` 的两个必填文本做 trim 后非空校验，并在 execute 里返回 `recorded:false` + 可读 note；
- 给 `expectation` / `body` 加上与命令面一致的长度上限（body 可单独定）；
- 写入前用 `recordText` + `parseRecord` 往返一次，坏形状不落盘；
- 加 keyless spec：空/空白 expectation、空 body、超长、只空白正文 → recorded:false，磁盘零新增。

## 修复关联

- 发现于 C1；与 [BUG-091](BUG-091-cultivation-check-revoked-broken-unsafe.md) 的「坏记录不可见」相连，但根因在工具输入校验。
- 合同：[`docs/contracts/cultivation.md`](../../../docs/contracts/cultivation.md)「分身只能用 cultivation_propose 提案」。

## 已修判定

修成：`cultivation_propose` 对 expectation/body 做 trim 后非空 + 长度上限校验；写入前 `recordText`→`parseRecord` 往返，坏形状不落盘；拒绝时 `recorded:false` + 可读 note，磁盘零新增。

- keyless：空/空白 expectation、空/空白 body 四种输入全部 recorded:false，records 目录零文件。
- 红证：去掉校验/往返 → 新用例 failed；复原 16 passed。
