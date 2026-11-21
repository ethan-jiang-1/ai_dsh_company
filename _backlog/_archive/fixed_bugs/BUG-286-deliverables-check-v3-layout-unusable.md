---
status: 已修
severity: P2
opened: 2026-11-20
---

# BUG-286：`deliverables-check` 无法审 v3 布局——runbook 的收场验收命令必 exit 2

> 严重级别：P2（次要偏重：演示/交付收场的审计入口整体不可用）｜发现：2026-11-20（端到端验收）｜状态：已修｜审查：agent — 逐条核对四条「已修判定」（真盘 assessed / 双根 / 前缀归一 / 空盘仍 exit 2）并复跑 spec；工具面非材料性，按 P5 不在必须独立盲审的类（问题卡/门禁/跨模块收口）
>
> **留痕**：commit afe75dcc（工具/判据面修复，非材料性；不建 Note）。

## 症状

按 [demo-scenes 收场验收](../../../docs/guides/demo-scenes.md) 的第 8 步执行：

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
本轮已就地改到 v3 路径（探针可启动）。随后另报的「成品面板 8 行 vs 索引 62 条」已定位为**探针跨 workspace 对账**：
面板按当前会话所属 workspace 读索引（`workspaceFiles.read(leadOf(sessionId), …)`，见 `client/cultivation/cultivation-data.ts:66`），
探针却固定读 `company-workspace` 的索引——dev 盘上最近会话属于 `runtime/rehearsal-workspace`（2 条成品），
所以面板显示 2/8 都正常，**不是产品缺陷**；要改的是探针按会话 workspace 取期望值。
「点打开未开到正文」仍未定性（可能是「在应用中打开」依赖本机外部应用，探针不可观测）。

## 修复落地（2026-11-21）

- **两个根**：`checks/lib/deliverables-audit.mjs` 新增纯函数 `resolveRunRoots()` —— 给定 `--workspace` 与两级探测结果，返回「外层 workspace 根 / 文件根 / present 前缀」。规则：数据在 `<ws>/.dsh-company/deliverables` ⇒ 文件根下沉、会话根仍外层；直接给 `<ws>/.dsh-company` ⇒ 会话根退回外层；旧布局与已归档快照 ⇒ 两个根同一、前缀空串（口径一字未动）。
- **入口接线**：`checks/audit/deliverables-check.mjs` 只在入口做 I/O 探测（唯一做 I/O 的地方），之后文件清单 / 台账 / meta / drafts 读**文件根**，`sessions/` 目录名派生仍用**外层根**；判词里多印一行两个根（「审的是哪个盘」不再靠猜）。
- **present 前缀归一**：`auditDeliverables` 新增 `presentPrefix`，比对前剥掉 `.dsh-company/`。真盘实测效果：修复前 present 事件全军覆没（60 个 slug 会判 `final-not-presented`），修复后只剩 3 个真的没 present 过的（`ai-game-angel-2026`、`portable-overload-detection-v4` / `-v5`）。
- **回归**：`tests/tools/deliverables-audit.spec.ts` 新增四条（两个根三种形状 + present 前缀的正例/负控）。回归层禁子进程（`layering.spec.ts`），所以入口接线由真盘实跑认证，纯函数由 spec 钉住。

**真盘观察（不是本卡范围）**：默认档现在 `assessed:true`，但带 60+ 条既有违规（大多是 `meta.md` 用旧中文键 `类型:`/`结果:`，`validateMeta` 认 `type:`/`result:`；以及 3 条 `unshaped-file`、6 条 `final-not-presented`）。这是 dev 盘历史数据，属「存量口径」问题，不随本卡改判据。

## 修复证据

- 改动面：`checks/lib/deliverables-audit.mjs`、`checks/audit/deliverables-check.mjs`、`tests/tools/deliverables-audit.spec.ts`
- 红：`vitest run tests/tools/deliverables-audit.spec.ts` —— 撤掉两个源码文件的改动后 4/45 失败（`resolveRunRoots` 不在导出面、`presentPrefix` 不生效）；同窗口真盘 `node checks/audit/deliverables-check.mjs --json` exit 2「找不到任何 deliverables(-archive)/ 文件」
- 绿：`vitest run tests/tools/deliverables-audit.spec.ts` —— 45/45 通过；同窗口真盘同一命令 `assessed:true`（sessions 403 / finals 62 / presented 60；`--workspace company-workspace/.dsh-company` 同样 assessed）
- 提交：commit afe75dcc
