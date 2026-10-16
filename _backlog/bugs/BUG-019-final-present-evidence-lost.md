---
status: 调查中
severity: P2
opened: 2026-10-16
---

# BUG-019：会话日志被清理后 `final-not-presented` 变成不可证伪的红（活跃件无豁免档）

> 严重级别：P2（次要——不阻断任何验收，但把「证据不可考」报成「声明缺失」，且活跃件没有 2026-10-10 那类存量豁免档）｜发现：2026-10-16｜状态：调查中

## 症状

真盘 `source run/env.sh && node checks/audit/deliverables-check.mjs` exit 1，剩一条违规：

```
违规 1 条：
  final-not-presented | deliverables/2026-10-13-all-in-ai-2026/final.md
    成品在盘上，但没有任何 Lead 会话的 deliverables/presented 事件声明过这份交付物
```

而该件的 `meta.md` 自己写着 `结果: 已完成（final v2 已 present）`——**公司侧声称 present 发生过**，工具侧说没有任何声明。

## 根因（假设）

判据的输入是「工作区文件清单」+「会话日志」两件（`tools/lib/deliverables.mjs` 头注：本模块不做 I/O，调用方喂进来）。
`final-not-presented` 的判法是「盘上有成品 ∧ 喂进来的会话里没有对应 present 事件」——**它无法区分**：

- ① 真的没 present（越权直写成品）；与
- ② present 发生过，但**那份会话日志已不在审计源里**。

本件是 ②。取证（2026-10-16 全量实扫）：

- 扫遍本机**两处 DSH home 的全部会话日志（`session.v3.jsonl.zstd` 逐份 zstd 解帧）**：`runtime/harness-home` 57 份 + `~/.dsh` 553 份 = **610 份，`all-in-ai-2026` 命中 0**。
- 同期的其他会话日志**在**（例如 `journal-audit` 仍能认出本件的会话号 `350eb581`，且 10-10 那次 hard-gate 缺口是它记录的历史事实）。
- 本件的收口 commit `6f18aaa`「chore(backlog+公司盘): … + all-in-ai-2026 收口产物」**只提交了 `final.md` / `meta.md`，没有同时归档会话日志**——而仓库对已审动议是有先例的：`snapshots/archive/<slug>/sessions/*.jsonl`（q3-business-review、emergency-x-incident-review 等），配套工具 = `tools/session-log-export.mjs`。

⇒ **本件的 present 证据已随会话日志的清理而永久丢失**，本机无法重建。这条红是「证据不可考」，不是「声明缺失」。

## 暴露的失败类

「判据把**证据不可得**当成**事实不成立**」——同一族的两条已修先例：
- [BUG-008](../_archive/fixed_bugs/BUG-008-recon-pack-archive-drift.md)（归档件存量降 `legacy-archive` 观察档）；
- [BUG-018](../_archive/fixed_bugs/BUG-018-authorship-instance-preset-false-positive.md)（同一原因二次报 / 判别面误判）。

区别在于：BUG-008 的豁免键是**路径形态**（`deliverables-archive/` 前缀），而本条的键是**证据可得性**（审计源里有没有那个时间段的会话日志）——后者没有判据，于是「活跃区 + 日志已清理」的件永远红。

**是否需要横切排查**：是，范围 = 所有以「会话声明」为输入的判据（`final-not-presented` / `presented-final-missing` / `dangling-present` / `present-result-not-final` / 署名与版本核对）——它们都有同一个盲区：**输入不成对**（盘是全量、日志可能残缺）时报的是「事实缺失」而不是「证据缺失」。

## 复现

```sh
# ① 本机两处 home 全扫，命中 0（今天的现场）
source run/env.sh && node -e "
const { execFileSync } = require('node:child_process'); const { readdirSync, statSync, existsSync } = require('node:fs'); const { join } = require('node:path')
for (const home of ['runtime/harness-home', process.env.HOME + '/.dsh']) {
  const root = join(home, 'sessions'); if (!existsSync(root)) continue
  let n = 0, hit = 0
  const walk = (d, depth) => { if (depth > 3) return
    for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name)
      if (e.isDirectory()) walk(p, depth + 1)
      else if (e.name === 'session.v3.jsonl.zstd') { let t; try { t = execFileSync('zstd', ['-dc', p], { maxBuffer: 5e8 }).toString() } catch { continue }
        n++; if (t.includes('all-in-ai-2026')) hit++ } } }
  walk(root, 0); console.log(home, '扫描', n, '命中', hit)
}"
# ② 判据侧：活跃件没有豁免档（归档前缀才有）
source run/env.sh && node checks/audit/deliverables-check.mjs   # exit 1，final-not-presented
```

## 修复关联

**待定（本卡只记发现与判据，未修）**。候选方向（实施前须补 keyless 红测）：

- **A（推荐）**：判据输入扩一个「证据可得性」维度——例如调用方显式声明本次审计的**会话日志覆盖时段**（或喂进来的日志里该 slug 所属动议日期**全天**无任何日志）；此时「成品在盘 ∧ 无 present ∧ 该时段证据不可得」报**新观察码**（如 `present-evidence-missing`，不判红），而不是 `final-not-presented`。守卫必须钉住：证据**可得**时照旧判红（否则真越权被放过）。
- **B**：把「收口时同批归档会话日志」变成硬动作（`converge.mjs` 或收口清单加一步 + 门禁查「已收敛 slug 必有 `snapshots/archive/<slug>/sessions/`」）——治新增，但本机这件的历史证据不会回来。
- **C**：给活跃件也开 `--sessions` 缺证据豁免（照 BUG-008 的注记口径）——最省，但豁免键是人工声明，**不给判据**，等于把红改成靠人记得传旗标。

建议 **B + A**（B 防再犯、A 修判别），并明确本件的处置：证据确已丢失 ⇒ 应在判据上落成 A 的观察档，而不是人工把它改成绿。

**本件的当下状态**：形状腐化已归零（`cdd0919`），剩这一条 `final-not-presented` 未处置——它需要 A 类判据（工具变更）或人裁决（是否接受「证据不可考」作为离场理由）。
