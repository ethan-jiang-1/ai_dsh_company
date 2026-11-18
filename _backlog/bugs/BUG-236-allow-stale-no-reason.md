---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-236：release:shape 的 --allow-stale 不要求理由，warn 后仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-4 / H4）。
> **留痕**：待修复者决定（只开卡，不修）。

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
- 证据：上命令；[tools/release/shipped-shape.mjs](../../tools/release/shipped-shape.mjs) 的 `allowStale`/`staleReason` 分支。
- 影响：发布门禁的降级可以静默化；与「显式降级」的意图不符。

## 失败类与同类排查

**失败类 = 发布面 / 门禁降级**（降级无理由）。

同类：BUG-235（指纹边界）；BUG-227（上一轮 stale）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. `--allow-stale` 必须带 `=理由`（或 `--allow-stale <reason>`），无理由直接 `/red`；CI 环境可禁止该 flag。
2. 最小负例：无理由 `--allow-stale` → exit 1；带理由 → exit 0 + WARN。
3. 正例：`--prepare` 后的 `_dist` 无 flag → PASS。
