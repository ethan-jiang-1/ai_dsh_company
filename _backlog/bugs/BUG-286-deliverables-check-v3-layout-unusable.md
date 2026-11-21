---
status: 修复就绪
severity: P2
opened: 2026-11-20
---

# BUG-286：`deliverables-check` 无法审 v3 布局——runbook 的收场验收命令必 exit 2

> 严重级别：P2（次要偏重：演示/交付收场的审计入口整体不可用）｜发现：2026-11-20（端到端验收）｜状态：修复就绪｜
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

按 [demo-scenes 收场验收](../../docs/guides/demo-scenes.md) 的第 8 步执行：

```
node checks/audit/deliverables-check.mjs
→ deliverables-check: company-workspace 下找不到任何 deliverables(-archive)/ 文件。
  --workspace 要给**含 deliverables/ 的工作区根**（如 company-workspace），不是 deliverables/ 本身。
  exit 2
```

而该 workspace 盘上有 22 个成品目录、多个 `final.md`（`company-workspace/.dsh-company/deliverables/*/final.md`）。

## 复现

```
source run/env.sh
node checks/audit/deliverables-check.mjs
node checks/audit/deliverables-check.mjs --workspace company-workspace/.dsh-company   # 也失败
```

第二条的失败点不同：
```
deliverables-check: 该工作区还没有会话目录：
  runtime/harness-home/sessions/--Users-bowhead-ai_dsh_company-company-workspace-.dsh-company--
```

## 根因与证据

脚本把**两个根当成同一个**：
1. 文件根：`listFiles(workspace)` 后要求相对路径以 `deliverables/` 开头（`checks/lib/deliverables-audit.mjs:366` 同样以 `${path}.startsWith('deliverables/')` 过滤）；
2. 会话根：`join(home,'sessions', '-'+workspace.replaceAll('/','-')+'--')` 由同一绝对路径派生。

v3 起数据在 `<workspace>/.dsh-company/deliverables/**`：传外层 workspace ⇒ 文件相对路径带 `.dsh-company/` 前缀、判据扫不到；传 `.dsh-company` ⇒ 文件 OK，但会话目录 key 变成另一个（DSH 按外层 workspace 分组）。两个根不再重合，任一传法都跑不完。

同期证据：present 账本记的是 `.dsh-company/deliverables/...`（见 `checks/lanes/present-catalog.e2e.mjs` 的 PASS 行），说明系统其余部分以 `.dsh-company/` 前缀为准。

## 失败类与同类排查

**失败类 = 布局迁移后判据的输入根未更新（静默不可用）。** 同类：`deliverables-check --workspace snapshots/replay/*/workspace.expected` 的用法（快照是整盘拷贝）同样按旧布局书写，需一并核；`deliverables-catalog` 探针注释要求 `company-workspace/kb/deliverables-index.json` 已生成，实际在 `.dsh-company/kb/` 下，属同一批陈旧路径陈述。

## 已修判定

1. `node checks/audit/deliverables-check.mjs`（默认 `company-workspace`）能产出 assessed 报告；
2. 文件根自动识别 `<ws>/.dsh-company`（存在 deliverables 时），会话根仍用外层 `<ws>`；
3. 会话日志里的 `.dsh-company/` 前缀在比对前归一，`present` 背书仍能对上；
4. 负控：空盘/错根仍 fail-loud（保留现有 exit 2 分支）。

## 修复方向（不授权，仅记录）

先补一条真盘回归（用临时 workspace + `.dsh-company/deliverables/x/final.md` 断言 assessed），再改脚本的两根识别；判据库只加前缀归一，不重写审计政策。

## 同族第三处（2026-11-20 验收轮实测）

`probes/browser-visual/deliverables-catalog-probe.mjs` 读的也是旧的 workspace 根索引路径
`company-workspace/kb/deliverables-index.json`（v3 起应为 `.dsh-company/kb/…`），直接 ENOENT 退出。
本轮已就地改到 v3 路径（探针可启动）；该探针随后另报「成品面板 8 行 vs 索引 62 条」「点打开未开到正文」，
是否同族待查，不并入本卡结论。
