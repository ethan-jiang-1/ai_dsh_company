---
status: 修复就绪
severity: P2
opened: 2026-10-12
---

# BUG-015：backfill 证据路径写死「今天」——隔天补登必写断链

> 严重级别：P2（次要）｜发现：2026-10-12（评审聚合者独立巡检）｜状态：修复就绪
> **翻转记录（2026-10-12）**：沙箱对照实验坐实（收据在复现节）+ 修法选定 + 已修判定在场——缺陷轨翻转表「调查中 → 修复就绪」（P2 修复型自授权通道）。

## 症状

当前 CHARTER 指针全对只是**巧合同日**：4 个 slug 全在 2026-10-12 收敛并 backfill，
全部指针指向 `convergence-2026-10-12/`。工具没有任何「按 slug 找真实证据日」的逻辑——
将来隔天为早前收敛的 slug 补登（`--charter-backfill` 的设计用途正是补登），写入的 journal
路径指向不存在的 `convergence-<运行日>/`。

## 根因（假设→已证）

[tools/converge.mjs](../../tools/converge.mjs) 的 `today` 常量（:27）同时服务两个语义：
证据目录按**收敛日**创建（copyEvidence :85），backfill 指针按**运行日**书写（charterBackfill :219）。
两日不同即断链。`convergence-${today}/` 路径串在文件内 5 处内联（copyEvidence/计划行/CHARTER 重指/
notes 重指/backfill），无单一出处。

## 暴露的失败类

时间耦合类——一个常量顶「创建日」与「引用日」两个语义。横切排查：本仓 tools/ 面同款
「今日」耦合仅此一家；门禁侧 bare-path 会兜红（缓解：错路径活不过下一次 verify），
但工具应自己写对，不能靠门禁擦屁股。

## 复现（沙箱对照实验，2026-10-12 实跑）

真仓不能动盘，按 §11 在仓外沙箱复刻最小树（目录 /tmp/bug015-repro：tools/ 副本 +
deliverables-archive/2026-10-01-ai-demo/meta.md + 无该 slug 字样的 CHARTER + 证据目录
snapshots/archive/convergence-2026-10-01/…/journal/coo/——**证据日期 = 10-01，运行日 = 10-12**）：

```sh
node $SB/tools/converge.mjs --charter-backfill 2026-10-01-ai-demo      # exit=0
grep -o "convergence-[0-9-]*" $SB/company-workspace/kb/coo/CHARTER.md  # → convergence-2026-10-12
ls $SB/snapshots/archive/                                              # → convergence-2026-10-01
```

写入的指针指向 convergence-2026-10-12/（运行日），真实证据在 convergence-2026-10-01/——
**断链坐实，且工具 exit=0 未报警**（无 fail-loud）。沙箱已清理。

## 修复关联

修法选定：backfill 按 slug 扫 `snapshots/archive/convergence-*/<dirName>/` 解析**实际**证据目录名；
无目录 → fail-loud 报错退出。日期解析逻辑随 BUG-014 的 `tools/lib/` 提取同批落 keyless spec。

## 已修判定

- 隔日 dry-run 打印的 journal 路径与真实证据目录一致（用例进 keyless spec，先红后绿）；
- 无证据目录时非零退出并报「无收敛证据目录」；
- `pnpm verify` 全绿（bare-path 不红）。
