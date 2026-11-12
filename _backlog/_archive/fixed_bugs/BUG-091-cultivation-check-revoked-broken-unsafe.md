---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-091：`/cultivation check` 对账口径漏：撤回后仍报「记录缺方法」、坏记录不计数、非法 methodSlug 直接抛错

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / H-check）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`/cultivation check` 声称「只报告孤儿（不自动删/改）」，但实测三种输入都对不上账：

1. **正常撤回后误报缺失**
   - `adopt <id> as check-method` → success；`check` → `CEO 方法层与已采纳记录一致（1 条）`；
   - `revoke check-method` → success（方法目录删除，记录写 `revokedAt`）；
   - `check` → `对账结果：记录缺方法 <id>（缺方法 check-method）`。
   - 方法是被**人主动撤回**的，不是丢失；记录 status 仍是 `adopted`，`check` 没排除 `revokedAt`。
2. **坏记录被当成 0 条**
   - 记录目录里有一条不可解析记录（`loadRecords` 报 `broken: 1`）；
   - `check` → `CEO 方法层与已采纳记录一致（0 条）`——坏记录没有出现在对账结果里，也没有计数。
3. **非法 methodSlug 让 check 抛错**
   - 手工/旧数据把一条 adopted 记录的 `methodSlug` 写成 `../evil`；
   - `check` → 抛 `不安全的方法路径：ceo/../evil`（普通 `Error`），命令面没有可读回执；`commandCheck` 只 catch `UnsafeCultivationPathError`，`readMethod` 对非法 slug 抛的是普通 `Error`。

## 根因（假设）

`commandCheck` 的对账模型只有「status === adopted && targetRole === face.role」：

- 不排除 `revokedAt`（撤回后记录仍是 adopted，这是数据形状）；
- 不消费 `loaded.broken`；
- 对 `record.methodSlug` 不做 `SLUG_RE` 预校验，直接交给 `storage.readMethod`，后者对非法 slug 抛普通 `Error`。

## 暴露的失败类

**对账只看「状态字段」，不看「生命周期字段 / 坏数据计数 / 值的合法性」**：撤回、坏记录、非法 slug 都是同一份记录的不同真实态；check 把它们折成「一致」或「异常」，而不是如实报告。对账工具一旦说谎，人就不会再信它。

## 复现

```sh
node --import tsx/esm runtime/tmp/c1-check-revoke.mts
node --import tsx/esm runtime/tmp/c1-guards.mts
```

2026-11-12 原始输出（节选）：

```
check-before → "CEO 方法层与已采纳记录一致（1 条）"
revoke → success；methodRemoved false
check-after  → "对账结果：记录缺方法 …（缺方法 check-method）"
C load → {"records":0,"broken":1,"reachable":true}
C check → "CEO 方法层与已采纳记录一致（0 条）"
B check unsafe slug THREW -> 不安全的方法路径：ceo/../evil
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `adopted` 过滤加 `record.revokedAt === undefined`；撤回后的记录应显示「已撤回」，不参与缺方法判定。
- 把 `loaded.broken` 写进回执：`另有 N 条坏记录未计入`（与 archive 的回执口径一致）。
- `methodSlug` 先 `SLUG_RE` 校验；非法值报「记录 X 的 methodSlug 不合法」而不是抛普通 Error；`readMethod` 的普通 Error 也应在 commandCheck 边界收成可读结果。
- 加 keyless spec：revoke 后 check 绿；坏记录计数；非法 slug 可读错误。

## 修复关联

- 发现于 C1；与 [BUG-090](BUG-090-cultivation-revoke-unreachable-records-deletes-method.md) 同属 revoke/check 完整性面，但修法不同。
- 合同：[`docs/contracts/cultivation.md`](../../../docs/contracts/cultivation.md)「数据诚实：不可达 ≠ 0」。

## 已修判定

修成：`check` 的已采纳集合排除 `revokedAt`；坏记录与已撤回记录计数进回执；`methodSlug` 先过 `SLUG_RE`，非法值报「记录坏」而不是抛普通 Error；`readMethod` 的其它错误收成可读对账项；孤儿文案改成「方法无本 workspace 记录（可能属于其它 workspace）」。

- keyless：撤回后 check 不再报缺方法且出现「已撤回/坏记录」；非法 slug 的 check 返回 success + 「不合法」。
- 红证：去掉这三处处理 → 2 failed；复原 15 passed。
