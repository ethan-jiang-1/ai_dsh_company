---
status: 已修
severity: P2
opened: 2026-10-16
---

# BUG-019：`final-not-presented` 的判别盲区（会话日志残缺时不可证伪）——**本案经查为真阳性**

> 严重级别：P2（次要——不阻断验收；且**本案不是它的实例**，见下）｜发现：2026-10-16｜状态：已修（2026-10-16 修「可修的那半」：证据可得性声明）
>
> ⚠ **本卡经 2026-10-16 深挖后，首版诊断被推翻一半**：原假设「证据已随会话日志清理丢失」**不成立**——本案的 `final-not-presented` 是**真阳性**（收口会话从未调用 `present`，见「深挖结论」）。工具**判对了**。卡保留，因为「分不清『真没声明』与『证据不可考』」这个**判别盲区仍然存在**，只是本案没命中它。

## 深挖结论（2026-10-16；推翻本卡首版的诊断）

**首版诊断（错）**：会话日志被轮换/清理 ⇒ `present` 证据永久丢失 ⇒ 判据把「证据不可考」报成「声明缺失」。
**实测结论（对）**：**`present` 声明从未发生**。证据链：

1. **收口会话 = `session-350eb581`**（journal-audit 认得它，`all-in-ai-2026 @ 2026-10-13T09:51`），日志在 `runtime/harness-home/sessions/--Users-bowhead-ai_dsh_company-company-workspace--/session-350eb581-…/session.v4.jsonl.zstd`，557 行。
2. **该会话调过 16 类工具、95 次 `tool/call`，其中没有 `present`**：
   `skill, bash, read, session_search, web_search, write, edit, team_task_create, spawn_teammate, send_message, wait_agent, list_agents, team_task_list, team_task_update, schedule_create, ask_user_question`
   ——收口靠 `write` 把 `final.md` 写进盘，再 `team_task_update` 收任务。
3. **`present` 当时确实在工具表里**（该会话 `request/header` 的工具清单含 `{"name":"present","description":"Declare existing files as final del…`）⇒ **工具在手、没用**，不是能力缺失。
4. **全量严格重扫 = 0 条真 present**：用判据自己的解析器（`parseSessionLog`）扫遍本机**两个 home 的全部会话日志 2783 份**（v3 610 + v4 2173），解析出 `presented` 路径含 `all-in-ai-2026` 的会话 = **0**。
5. 该会话的 `meta.md` 写着 `结果: 已完成（final v2 已 present）`——**公司侧自述与工具侧事实相反**：自述里的 present 是**纸面声明**，没有对应的机器动作。

⇒ `final-not-presented` **判得对**（公司手册的收口纪律 = CEO 用 `present` 声明成品，本场跳过了这一步）。本条**不是工具假阳性**。

## 保留下来的真缺陷（判别盲区）

判据的输入是「盘上文件清单 + 喂进来的会话日志」两件（`tools/lib/deliverables.mjs` 头注）。`final-not-presented` 的判法是「盘上有成品 ∧ 审计源里没有对应 present 事件」——它**分不清**：

- ① 真没 present（**本案**，已实测证实）；与
- ② present 发生过，但那段时间的会话日志不在审计源里（归档件靠路径豁免，活跃件无档）。

盲区②是 **latent**（本案没命中），但机制上真实存在：`deliverables-check` 只有 `--sessions <dir>`「我把日志喂给你」这一种表达，**没有「该时段的日志我拿不到」的表达**。一旦真发生②，判据会把「证据不可考」报成「声明缺失」。

## 本案暴露的另两条（不在本卡射程，已另立）

- **公司的收口流程缺口**：动议可以「`结果=已完成` + 写盘 final」收口，**不经 `present`**，而判据要求 present ⇒ 这类动议必然红。见 [_archive/settled_issues/2026-10-16-all-in-ai-ceo-closeout](../../_archive/settled_issues/2026-10-16-all-in-ai-ceo-closeout.md)。
- **首版取证方法缺陷**（自省，供后续同类取证参考）：按文件名模式 `session.v3.jsonl.zstd` 扫，漏了同目录下的 **v4** 日志（2783 中的 2173）。凡「扫遍会话日志」的取证，**动作必须按目录遍历 + 版本无关**，或直接用 `tools/session-log-export.mjs`。

## 复现

```sh
# ① 全量严格重扫：真 present = 0（用判据解析器，不靠 grep）
source run/env.sh && node -e "
const { execFileSync } = require('node:child_process'); const { readdirSync, existsSync } = require('node:fs'); const { join } = require('node:path')
;(async () => { const { parseSessionLog } = await import('./tools/lib/deliverables-audit.mjs')
let n = 0, hits = 0
for (const home of ['runtime/harness-home', process.env.HOME + '/.dsh']) { const root = join(home, 'sessions'); if (!existsSync(root)) continue
  const walk = (d, dep) => { if (dep > 3) return
    for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name)
      if (e.isDirectory()) { walk(p, dep + 1); continue }
      if (!/^session\.v[34]\.jsonl\.zstd\$/u.test(e.name)) continue
      let t; try { t = execFileSync('zstd', ['-dc', p], { maxBuffer: 8e8 }).toString('utf8') } catch { continue }
      n++; if (parseSessionLog(t).presented.some(x => x.path.includes('all-in-ai-2026'))) hits++ } }
  walk(root, 0) }
console.log('扫描', n, '份；真 present 事件', hits, '条') })()"
# ② 判据现状
source run/env.sh && node checks/audit/deliverables-check.mjs --only all-in-ai-2026   # exit 1：final-not-presented
```

## 修复关联

**未实施**。修法取决定位：本案是真阳性 ⇒ **不能**给判据加「无证据即放行」的救济（那会掩盖真违规）。盲区②若要有机制，正路是**显式表达证据不可得**（审计源声明覆盖时段；缺证据时报新观察码而非判红），并配守卫钉「证据可得时照旧判红」。**在本案里，正确动作是补做 `present` 而不是改判据**（该动作归公司侧，见 issues 卡）。

**本卡当下不修的理由**：判别盲区是 latent（无实测中招实例），修它要动 `deliverables-check` 的输入契约与退出码语义 ⇒ 按「无复发证据不改判据」与「不在顺手修里夹带结构性变更」两条纪律，留在 `bugs/` 待按优先级决定。

**状态说明（历史，现已修）**：本卡当时**不是 `修复就绪`**——查清了但**给不出可机械判定的「已修判定」**（盲区是 latent；修法要动判据的输入契约，而贸然加「无证据即放行」的救济反而会掩盖真违规）。按章程「修复就绪 = 门票 + 授权」的口径，这里没有合格门票，故留 `调查中`，等优先级或用户点名。
