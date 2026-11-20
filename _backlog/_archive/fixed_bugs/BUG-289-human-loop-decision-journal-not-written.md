---
status: 已修
severity: P2
opened: 2026-11-20
---

# BUG-289：human-loop 的「裁决回流」判据看错目录——产品写对了文件，车道自 v3 起永远红

> 严重级别：P2（次要偏重：人机协作第三条验收整条失效三周）｜发现：2026-11-20（端到端验收第二轮）｜状态：已修｜修复：2026-11-20｜审查：agent（同轮红→绿实证）
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

`node checks/lanes/human-loop-e2e.entry.mjs` 第三相稳定报 2 FAIL：

```
PASS 缺口：人答后同/下轮收口（第 3 个 turn/end）
FAIL 缺口：裁决回流落盘（journal/gift-rule-gap.md 在场）
FAIL 缺口：回流含裁决与缺口要素（500 + 缺口/礼品）
human-loop-e2e: 2 FAILURE(S)
```

连续两个独立样本（22:00、22:12 起跑）都是同一结果。

## 复现

```
source run/env.sh && node checks/lanes/human-loop-e2e.entry.mjs
```

## 根因与证据

判据常量停在 v3 之前的布局：

```js
const JOURNAL_GAP = join(REHEARSAL, 'journal', 'gift-rule-gap.md')   // 旧
```

而产品按手册把裁决写进**公司盘**的角色 journal：

```
runtime/rehearsal-workspace/.dsh-company/kb/ceo/journal/gift-rule-gap.md
```

文件内容完全符合验收（`# 2026-11-20 · 规矩缺口：客户赠礼金额上限` / `缺口：…未覆盖…` / `裁决（人，2026-11-20）：上限 500 元…` / `回落点：本次仅记入本 journal…`），且 `500`、`缺口` 两个要素都在。也就是说：**产品行为正确，判据读错了地方**，自 v3 布局（2026-11-01）起该相一直假红。

## 失败类与同类排查

**失败类 = 判据路径停留在旧布局（假红）。** 同类：BUG-286（`deliverables-check` 在 v3 布局下不可用）是同一族的另一处；凡以 workspace 根拼 `journal/`、`deliverables/`、`kb/` 的判据都该按 `<ws>/.dsh-company/` 复核。

## 已修判定

1. `JOURNAL_GAP` 指向 `<ws>/.dsh-company/kb/<role>/journal/…`，并在常量旁写明 v3 家与本次实证；
2. 同一条命令 12/12 ALL PASS（含落盘与要素两条）。

## 修复证据

- 改动面：`checks/lanes/human-loop-e2e.entry.mjs`
- 红：`node checks/lanes/human-loop-e2e.entry.mjs` → `FAIL 缺口：裁决回流落盘（journal/gift-rule-gap.md 在场）` + `FAIL 缺口：回流含裁决与缺口要素`（2 FAILURE，连续两样本）
- 绿：`node checks/lanes/human-loop-e2e.entry.mjs` → `human-loop-e2e: ALL PASS（12/12）——补料/建议/规矩缺口→裁决→回流 三类接口真证据`
- 提交：commit b2db07d5
