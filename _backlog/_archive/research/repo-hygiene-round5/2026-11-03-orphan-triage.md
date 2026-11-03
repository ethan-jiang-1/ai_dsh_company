---
topic: 仓库卫生
intent: "2026-11-03 零入链 Note 的全量分诊：76 篇 orphan 的真实构成、是否该迁收据层、为什么不做批量移动。"
---

# 零入链 Note 全量分诊（2026-11-03）

> 上游 = [notes 高腐化面分诊](./2026-11-03-notes-consistency.md)；本文补齐“70+ 篇零入链”。
> 方法 = `node tools/notes-audit.mjs --json` 的 `orphans` + 每篇读 `## 决定` / 标题 / 文件名；
> 分类是**机械辅助**，不是决定；移动/删除仍按 notes/README §五。

## 读数

```text
notes:audit --json
  implemented: 129
  orphans: 76
  其中：有 ## 决定 = 59
        文件名像收据/批次/发布/审计 = 17（16 有决定、1 无）
        其余 = 0
```

## 结论：orphan ≠ stale

- **59/76 是带 `## 决定` 的活跃决策记忆**，只是没有别的 Note 链回它。`notes/README.md` 的 no-index 教义
  下这是常态：Note 按主题 grep 检索，链接只用于「取代/部分取代」回链，不要求每篇都有 inbound。
- **17 篇收据/发布候选**里，16 篇本身也带决定（发布字节、门禁、收口规则），不是纯流水；把它们迁
  `archived/receipts/` 会把仍有效的发布/门禁决定从 implemented 记忆里拿走。只有 `2026-10-16-closeout-requires-present`
  无 `## 决定`，是纯纪律修复收据，可迁；但单篇迁移收益低，且它仍被 close-out 语境引用。
- 因此**不做批量移动/删除**；`orphans` 是诊断项，不是“70 个缺陷”。高腐化面（CompanyView / workflow /
  符号链接 / v3 旧叙述）已在上一份分诊里处理。

## 收据候选清单（不是迁移决定）

| Note | 有决定节 | 标题 |
|---|---|---|
| `2026-10-16-closeout-requires-present` | 无 | 收口纪律缺口修复：present 前置 |
| `2026-10-23-audit-verdict` | 有 | 审计判词结构化 |
| `2026-10-23-record-self-check` | 有 | 录制自证可回放 |
| `2026-10-27-d4-release-and-dist-guard` | 有 | 发布/分发 guard |
| `2026-10-27-r3-b-authority-and-closeout` | 有 | R3 权限与收口 |
| `2026-11-03-closeout-release-claim` | 有 | 收尾 skill 发布声明规则 |
| `2026-11-03-harness-test-typecheck` | 有 | harness 子集进 tsc |
| `2026-11-03-pre-push-typecheck` | 有 | pre-push 加 typecheck |
| `2026-11-03-release-0.7.2` / `0.8.0` / `0.8.1` / `0.8.3` / `0.8.4` / `0.8.6` / `0.8.7` | 有 | 各版发布字节 |
| `2026-11-03-release-readiness-pointer` | 有 | readiness 指路 |
| `2026-11-03-release-uninstall-smoke` | 有 | release-smoke 卸载 |

## 建议

1. **保持现状**：59 篇决定 + 16 篇带决定的发布/门禁记忆留在 `implemented/`。
2. 若要减噪音，只迁 `2026-10-16-closeout-requires-present`（纯收据）到 `archived/receipts/`，需一次
   link 更新 + digest 一行；收益低，不是本轮必做。
3. `notes:audit` 的 `orphans` 不进 verify 门禁——它没有“是否该有链接”的判据；硬门禁会逼人加假链。

## 边界

- 本文只做分类与建议，不动文件；`notes:audit` 的硬项（noDecision / deadPaths / missingBacklinks）仍为 0。
- 收据层规则 = [notes/README §一/§五](../../../../notes/README.md)；digest = [收据 digest](../notes-consistency/2026-10-30-receipts-digest.md)。
