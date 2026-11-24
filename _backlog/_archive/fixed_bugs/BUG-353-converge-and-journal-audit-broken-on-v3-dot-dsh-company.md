---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-353：`converge.mjs` 与 `journal-audit.mjs` 仍硬编码 v3 之前的扁平工作区路径，v3 公司盘全量失效

> 严重级别：P1（维护与审计面失效：v3 run-bundle 把数据搬进 `.dsh-company/` 后，`converge.mjs` 看不到任何活跃/归档交付物也无法清 live journal，`journal-audit.mjs` 找不到 live journal 并把所有未归档场次错报为「缺席」）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（v3 计划/索引/审计三路 e2e）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（批次 351..359：双根单一解析；机械修复）

## 症状

自 v3 run-bundle（`.dsh-company/`，见 `BUG-286`）落地后，[`company-workspace/`](../../../company-workspace) 下仅存在 `.dsh-company/{deliverables,deliverables-archive,kb,...}`，根目录不再有 `deliverables/` 或 `kb/`；但两份核心工具仍写死旧结构：

1. [`tools/repo/converge.mjs`](../../../tools/repo/converge.mjs#L42-L50) 把 `ACTIVE`、`ARCHIVE`、`LEDGER` 与 `kb/<role>/journal`（[第 129 行](../../../tools/repo/converge.mjs#L129)、[第 156 行](../../../tools/repo/converge.mjs#L156)、[第 248 行](../../../tools/repo/converge.mjs#L248)、[第 380 行](../../../tools/repo/converge.mjs#L380)）直接拼在 `WS`（`company-workspace`）下面：
   - 默认跑 `node tools/repo/converge.mjs` 看不到 `.dsh-company/deliverables/` 里任何目录（输出零条目），`--slug` / `--charter-backfill` / `--resume` 全部找不到目录；
   - 若通过环境变量 `CONVERGE_WS_REL=company-workspace/.dsh-company` 强指子目录，[`rebuildCatalogIndex`](../../../tools/repo/converge.mjs#L90-L92) 又会把 `.dsh-company` 尾段原样传给 `DELIVERABLES_WS_REL`，而 [`tools/repo/deliverables-index.mjs`](../../../tools/repo/deliverables-index.mjs#L19-L20) 会再拼一层 `.dsh-company/kb/deliverables-index.json`，写错到 `company-workspace/.dsh-company/.dsh-company/kb/deliverables-index.json`；
2. [`checks/audit/journal-audit.mjs`](../../../checks/audit/journal-audit.mjs#L189-L218) 第 102 行过滤 `cwd.endsWith('company-workspace')` 下的真实会话，但第 189 行 `presence()` 与第 218 行 `formatViolations()` 均硬编码 `join(workspace, 'kb', role, 'journal')`（而非 `.dsh-company/kb/<role>/journal`），导致凡是未归档进入快照的 v3 真盘会话一律被误判 `**缺席**`（退出码 `1`）。

## 运行面

- **面 = tools + checks**：[`tools/repo/converge.mjs`](../../../tools/repo/converge.mjs#L42-L160)、[`checks/audit/journal-audit.mjs`](../../../checks/audit/journal-audit.mjs#L188-L229)。

## 复现

1. 在真仓根目录直接跑只读计划：`node tools/repo/converge.mjs`（当前 `company-workspace/.dsh-company/deliverables/` 下有成品目录），实测输出零条「可收敛 / 未备」项；
2. 在 `runtime/` 临时 v3 盘内用 `CONVERGE_WS_REL=<probe>/.dsh-company` 跑 `node tools/repo/converge.mjs --rebuild-index`，实测索引被误写进 `<probe>/.dsh-company/.dsh-company/kb/deliverables-index.json`；
3. 造临时 `$DSH_HOME` + v3 形态 `company-workspace/.dsh-company/kb/ceo/journal/2026-11-24-demo-motion.md` + 对应 zstd 会话日志，跑 `node checks/audit/journal-audit.mjs --cwd <ws>/company-workspace`，实测返回退出码 `1` 并打印 `ceo:**缺席**`。

## 根因与证据

1. [`deliverables-check.mjs`](../../../checks/audit/deliverables-check.mjs#L60-L67) 与 [`deliverables-index.mjs`](../../../tools/repo/deliverables-index.mjs#L19-L20) 在 `BUG-286` 时拆出了 `workspaceRoot` / `companyRoot`（`<ws>/.dsh-company`），[`quality-loop-audit.mjs`](../../../checks/audit/quality-loop-audit.mjs#L309) 也已迁往 `.dsh-company/deliverables`，但 `converge.mjs` 与 `journal-audit.mjs` 漏未同步迁移。

## 失败类与同类排查

- **失败类**：v3 布局迁移未通过共享根解析函数覆盖全部工作区消费者，仅更新了部分审计/索引脚本。
- **同类排查**：需对照 [`resolveRunRoots`](../../../checks/lib/deliverables-audit.mjs#L294-L302) 的双根模型排查 `converge.mjs` 内 `deliverables-check` 调用（第 72 行未传 `--workspace` 也会绕过 `CONVERGE_WS_REL`）以及 `steps()`/`archiveMovePlan()` 的 `wsRel` 拼装。

## 修复方案与范围

- **根因修法**：让 `converge.mjs` 与 `journal-audit.mjs` 复用与 `deliverables-check` 同口径的 `workspaceRoot` / `companyRoot` 双根解析（兼容 `.dsh-company/` v3 布局与历史扁平归档快照），其中 `converge.mjs` 的 `DELIVERABLES_WS_REL` 传外层 `workspaceRoot` 相对路径、文件操作用 `companyRoot`。

## 已修判定

- 在 v3 `<ws>/.dsh-company/` 工作区上，`converge.mjs`（计划模式、收敛与 `--rebuild-index`）能正确识别并写入 `.dsh-company/` 下目录与索引，且 `journal-audit.mjs` 能命中 `.dsh-company/kb/<role>/journal/` 而不误报缺席。

## 修复证据

- 改动面：`tools/lib/company/workspace-roots.mjs`、`tests/tools/workspace-roots.spec.ts`、`tools/repo/converge.mjs`、`checks/audit/journal-audit.mjs`、`tools/repo/deliverables-index.mjs`（e2e 顺带暴露的 `deliverableSlug` 缺失导入）
- 红：`node tools/repo/converge.mjs --slug 2026-11-24-demo --allow-open-findings` —— 在 v3 临时盘（`CONVERGE_WS_REL` 指外层 workspace）还原前归档 rename 指向 `<ws>/deliverables/...` 抛 `ENOENT`；同盘 `journal-audit` 旧实现报 `ceo:**缺席**`、exit 1
- 绿：`node tools/repo/converge.mjs --slug 2026-11-24-demo --allow-open-findings` —— 归档件 + journal 副本落 `.dsh-company/`、`--rebuild-index` 写 `.dsh-company/kb/deliverables-index.json`；同盘 `journal-audit` 报 `ceo:确认`、缺席 0、exit 0；扁平布局回归通过
- 提交：commit 7010fa85
