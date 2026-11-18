---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-236：release:shape 的 --allow-stale 不要求理由，warn 后仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1/B2 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C15 卡](../settled_issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-4 / H4）。
> **留痕**：批次 Note [2026-11-18-shipped-key-closure-and-unreadable-inputs](../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)（本批共用）。

## 症状

`release:shape` 的 `--allow-stale` 是「显式降级」，但可以不带理由：

```sh
node tools/release/shipped-shape.mjs --allow-stale
```

在源码与 `_dist` 不一致时输出：

```text
shipped-shape WARN freshness: _dist 的 sourceFingerprint … ≠ 当前源码 …——先 pnpm release --prepare（或 --allow-stale 显式降级）（--allow-stale 未给理由）
shipped-shape PASS（…；137 entries）
exit=0
```

也就是说 CI/脚本可以无理由地拿旧 `_dist` 过门；唯一区别是一行 WARN，不阻断。

## 复现

```sh
printf '\n<!-- probe -->\n' >> packages/company-pack/README.shipped.md
node tools/release/shipped-shape.mjs --allow-stale
git checkout -- packages/company-pack/README.shipped.md
```

实测 `exit=0`、`WARN` 后 `PASS`。

## 根因与证据

- 根因：`allowStale` 只判 flag 存在，`staleReason` 为空时仍放行；没有「无理由 = 失败」或「CI 环境禁止 allow-stale」的判据。
- 证据：上命令；[tools/release/shipped-shape.mjs](../../../tools/release/shipped-shape.mjs) 的 `allowStale`/`staleReason` 分支。
- 影响：发布门禁的降级可以静默化；与「显式降级」的意图不符。

## 失败类与同类排查

**失败类 = 发布面 / 门禁降级**（降级无理由）。

同类：BUG-235（指纹边界）；BUG-227（上一轮 stale）。

## 已修判定

修成什么算修好：

1. `--allow-stale` 必须带 `=理由`；裸 flag 直接红；CI 环境禁止该 flag。
2. 最小负例：`--allow-stale` → exit 1；`--allow-stale=test` → exit 0 + WARN。
3. 正例：`--prepare` 后的 `_dist` 无 flag → PASS。

## 修复证据

- 改动面：`tools/release/shipped-shape.mjs`
- 红：`pnpm release:shape`（`--allow-stale` 无理由：exit 1（WARN + FAIL））
- 绿：`pnpm release:shape`（`--prepare` 后 `release:shape` PASS；`--allow-stale=test` 显式降级）
- 提交：commit 56e4f986
