---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-093：legacy 方法层迁移把非法 slug（大写/空格/超长）原样搬进公司级方法根，之后 check 报孤儿、revoke 无法处理

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / H-migration）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

旧 profile 的方法层是自由目录名，M3 迁移把它原样复制到 `<DSH_HOME>/company/methods/<role>/<slug>/`，但没有用 `SLUG_RE` 校验：

```
profiles/company/company-cultivation/ceo/Bad Slug/SKILL.md
→ migrateLegacyMethodLayers(dshHome, methods)
→ copied: ['ceo/Bad Slug']
→ listMethods('ceo') = ['Bad Slug']
→ /cultivation check → "…方法无记录 Bad Slug…"
→ /cultivation revoke Bad Slug → 解析/路径校验失败（SLUG_RE），无法通过命令清理
```

`Bad Slug` 这种目录不是合法 skill slug（大写 + 空格），但 `listMethods` 只认「目录 + 普通 SKILL.md」，所以它会一直出现在 check 的孤儿列表里；`revoke` 只接受 `^[a-z0-9][a-z0-9-]{0,63}$`，人侧没有任何命令能删除它（只能手工 `rm`）。迁移 marker 已写，重复启动也不会再处理。

## 根因（假设）

- `migrateLegacyMethodLayers` 对旧目录的 `slug.name` 不做 `SLUG_RE` 校验，也不区分「合法但冲突」与「根本不该进方法层」；只做 copy/conflict。
- `listMethods` 的方法发现面比 `readMethod`/`revoke` 更宽（任意目录名），于是「看得见但删不掉」。
- 迁移 marker 在 warnings/非法项之后仍写，失败/跳过没有重试面。

## 暴露的失败类

**迁移的输入域比目标域的校验宽**：旧格式允许自由目录名，新格式有 slug 约束；迁移只搬内容，不做目标域校验，结果把旧世界的非法键带进新世界。同类：任何 legacy → 新 schema 的迁移都要在目标 schema 边界上校验/隔离。

## 复现

```sh
node --import tsx/esm runtime/tmp/c1-guards.mts
# D migrate -> {"copied":["ceo/Bad Slug"],...}
# D check -> "...方法无记录 Bad Slug..."
# D methods -> ["Bad Slug"]
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 迁移前用 `SLUG_RE.test(slug.name)` 判定：非法 slug 不进方法根，写到 `<DSH_HOME>/company/methods/<role>/.legacy-invalid/<profile>/<name>.md` 并记 warning（或直接跳过 + 日志），不写进 skill 扫描面。
- `listMethods` 只列满足 `SLUG_RE` 的目录（或让 `readMethod`/`revoke` 的域与 list 一致）；非法目录在 check 里以「非法方法名」报告，而不是孤儿。
- 迁移 marker 只在无 warnings/非法项时写，或在结果里保留可重试标记；至少日志列出跳过项。
- 加 keyless spec：旧目录含大写/空格/超长 slug → 不进方法根、check 不报孤儿、迁移结果有 warning。

## 修复关联

- 发现于 C1；与 [BUG-090](BUG-090-cultivation-revoke-unreachable-records-deletes-method.md) / [BUG-091](BUG-091-cultivation-check-revoked-broken-unsafe.md) 同属「方法层的可见域与可操作域不一致」。
- 合同：[`docs/contracts/cultivation.md`](../../../docs/contracts/cultivation.md)「旧 `<profile>/company-cultivation/` 只读留一版」。

## 已修判定

修成：legacy 迁移对不满足 `SLUG_RE` 的目录不进方法根，隔离到 `<role>/.legacy-invalid/<profile>/<name>.md` 并记 warning；`listMethods` 只列合法 slug，`check` 不再把它们当孤儿；迁移 marker 记 invalid 计数，boot 日志点名。

- keyless：`Bad Slug` / `UPPER` 被隔离、`good-slug` 正常迁入；`listMethods` 只返回 `good-slug`；旧文件内容留在隔离区。
- 红证：去掉隔离 + list 过滤 → 1 failed；复原 5 passed。
