---
status: 修复就绪
severity: P2
opened: 2026-11-21
---

# BUG-291：培养页显示「培养记录尚未读到」，但目录里有记录、直连 RPC 也读得到

> 严重级别：P2（次要偏重：培养这条人机协作入口在真实盘上整页不可用）｜发现：2026-11-21（端到端验收第七轮）｜状态：修复就绪
>
> **留痕**：端到端验收轮（2026-11-21）。

## 症状

在 `company-workspace` 里新建一个 CEO 会话（cwd 已确认 = `<repo>/company-workspace`），打开「培养」页签：

```
我的分身：CEO · 首席执行官
需要我处理
培养记录尚未读到（目录缺失或读取失败）——不算 0 条。
已采纳的方法
（空）
```

而盘上 `company-workspace/.dsh-company/cultivation/records/` 有 2 个 `.md`，其中
`20261028-152450-cd36.md` 是 `kind: correction`、`targetRole: ceo`、`status: open`——按
`recordInbox()` 规则应当出现在「需要我处理」。

## 复现

```sh
source run/env.sh && node tools/dev/company.mjs --no-open     # 取横幅 URL
# 页面：新建会话（CEO）→ 点「培养」
# 观测：需要我处理 段落显示「培养记录尚未读到（目录缺失或读取失败）」
```

## 已排除（2026-11-21 实测）

| 假设 | 证据 |
|---|---|
| 目录不存在 | `ls company-workspace/.dsh-company/cultivation/records` → 2 个 .md |
| 记录解析失败 | 用 `tsx` 直接 `parseRecord()` 两个文件 → 2 条解析成功，`recordInbox(records,'ceo').needsDecision = 1` |
| RPC 或服务端拒绝 | 直连 `workspaceFiles/list`（`workspaceFileScopeId` = 该会话 id，path = `.dsh-company/cultivation/records`）→ 返回 2 条 `{name, type:'file'}`，`truncated:false` |
| 会话 cwd 错 | 会话头 `cwd = <repo>/company-workspace`，`agentPreset: ceo` |
| 点号目录被禁 | 同目录的 `read`（成品索引 `.dsh-company/kb/deliverables-index.json`）在同一会话里能读到内容 |

## 第二批证据（2026-11-21，加了 console 诊断后）

同一实例、另建一个新会话再开「培养」：

- 段落变成「需要我处理 / **没有给我的建议或纠正。**」——**不再是"尚未读到"**；
- 同屏的 journal 素材正常列出（CEO 8 待审、VP-Eng 7 待审…）→ 说明 `listDir` 这次**成功**了；
- 页面 console **零** `[company] 列目录失败/异常`（本轮新加的诊断没触发）；
- 但盘上那条 `status: open`、`targetRole: ceo` 的记录依然没出现。

⇒ 失败面从"列目录"收窄到**「列出 records → 逐条解析」这一段**：`listDir` 通了，`readRecordHead(…, 240)` / `parseRecord()` 在客户端可能返回 null 或过滤掉，且同样没有任何诊断。Node 侧同两个文件 `parseRecord()` 得 2 条、`recordInbox('ceo').needsDecision = 1`，与面板显示矛盾。

## 第三批证据（2026-11-21，决定性）

在同一实例、新建 CEO 会话（cwd = 公司盘）里，给 `listDir` 与记录加载器各加一行诊断后实测：

```
console.warning: [company][cultivation] list {"recordNames":[]}
console.warning: [company][cultivation] {"viewer":"ceo","records":[]}
```

即：**`listRecords` 调用成功了（不是 null、不是异常），但返回的名字列表是空数组**；同一轮
`listJournal` 却正常返回（页面上 CEO 8 待审、VP-Eng 7 待审）。查看器 `viewer="ceo"` 正确。

矛盾点很尖锐：同一个 `workspaceFiles.list`、同一个会话、同一轮加载，
`.dsh-company/kb/ceo/journal` 有结果，`.dsh-company/cultivation/records` 返回空——而直连 RPC
（`workspaceFileScopeId` = 该会话 id）对后者返回 2 个 `{name,type:'file'}`。

⇒ 下一步只剩一件事：**在 `records` 那次 `list` 里打印原始 `entries`**
（本轮已加过该行、但按用户要求先停手，未取到读数）。三种可能：路径常量被改写、
`entries` 形状与 `{name,type}` 不符被过滤、或该次调用命中了不同 scope。

## 待查（更新后）

`packages/company-pack/src/client/cultivation/cultivation-data.ts:87`：

```ts
const result = await remote.workspaceFiles.list(leadOf(sessionId), dir, signal)
if (!result.ok) return null
```

三个候选，按可能性排序：

0. **客户端解析/过滤**（新首选）：`readRecordHead` 只有 60 行、`parseRecord` 对 `status`/`proposerKind` 等字段的要求是否比 Node 侧调用更严；以及 id 传的是文件名还是路径；
1. **AbortSignal 已中止**：React effect 在 StrictMode/重渲染下先 abort，`list` 抛错被 `catch` 吞成 null（`read` 因路径不同/时序不同未触发）——需在 catch 里打印原因，而不是静默 null；
2. **`remote` 包装差异**：`scoped.remote.workspaceFiles.list` 的实参与声明不一致（声明是 `(scopeId, path, signal)`）；
3. **`entries` 字段过滤**：`type === 'file'` 与实际条目 `type` 值不符（直连返回的是 `file`，但不排除客户端拿到的是另一种包装）。

判据：在 `listDir` 的 `catch` 与 `!result.ok` 分支各加一条 `console.warn`（本轮先用探针 console 采集验证），把静默失败变成可诊断失败。

## 失败类与同类排查

**失败类 = 静默失败（错误被 catch 成 null，UI 只说"读不到"）。**
同类：`readRecordHead`（同文件 :100）、`readWorkspaceText`（同模式 `catch → null`）都走同款静默路径；`成品`/`台账` 面板同样只能显示"未读到"，无法指出到底缺目录还是被拒。建议统一：失败时带上错误码/原因进 UI（或至少进 console）。

## 根因与证据

**（2026-11-21 对照实验，卡内假设在此收口）结论：不是读失败，也不是解析失败——面板一直在如实报告「它所在的那个 workspace」。**

对照实验（同一台机、同一份代码、隔离 home，各起一个实例，只换 `--workspace`）：

| 实例 | `--workspace` | 培养页「需要我处理」 | journal 待审计数 |
|---|---|---|---|
| 1 | `company-workspace`（盘上 `.dsh-company/cultivation/records/` 有 2 个 `.md`） | **列出 2 条**（一条 `kind: correction` 的 CEO 纠正 + 一条已拒绝记录） | CEO 22 / VP-Eng 16 / VP-Sales 6 / COO 6 / CFO 7 / CMO 1 |
| 2 | `runtime/rehearsal-workspace`（同目录**存在但 0 个 .md**、同盘 31 篇 journal） | 「**没有给我的建议或纠正。**」 | CEO **8** / … / VP-Eng **7** |

实例 2 的输出与卡上「第二批证据」逐字吻合（含 8 / 7 两个计数）——所以那两次观察的目标盘是
`runtime/rehearsal-workspace`，不是 `company-workspace`。即便会话 cwd 显示为 `company-workspace`，
观察窗的 landing 会**恢复该 home 上次使用的工作区**（dev home 实测 landing 顶部写的就是
`rehearsal-workspace`），面板随即按那个工作区取数。

代码侧同向：`client/cultivation/cultivation-data.ts` 的 `listDir` 以 `leadOf(sessionId)` 取
`workspaceFiles.list`，成功则按 `type === 'file' && name.endsWith('.md')` 过滤；`ok === false` 与异常
才返回 null（「尚未读到」）。空目录是**成功的空清单**，所以第二批证据里「不再是尚未读到、也没有
console 警告」正是空目录应有的样子。RPC 直连拿到 2 条，是因为那次直连用的是 `company-workspace`
那盘的会话——两边说的不是同一个盘。

被证伪的假设（按要求留在卡上）：目录不存在 / 记录解析失败 / RPC 拒绝 / 会话 cwd 错 / 点号目录被禁 /
AbortSignal 中止 / `remote` 包装差异 / `entries` 字段过滤。

## 失败类与同类排查（补充）

**失败类 = 空态不声明作用域（可诊断性缺口）**：面板说的是真话，但说给一个用户看不见的盘听。
「0 条」与「读不到」在 UI 上都不点名 workspace，于是**空 = 数据丢了**——上一轮两次误判都由它造成
（handoff §4 自己记了这条）。同类：成品页 / 台账页同样只说「未读到」；`presence.emptyActivity`
至少写了「打开期间的变化会出现在这里」。

## 修复方案与范围

1. 培养页（侧栏页签 + 公司整页两个壳）在标题行与空态里**点名当前 workspace**（会话 cwd 的 basename，
   必要时带 `<repo>/` 相对路径），让「看的是哪个盘」一眼可读。
2. 空清单与不可达必须给**两种不同文案**：空 = 「这个工作区下还没有培养记录」；不可达 = 点名目录 +
   原因（`ok:false` 与异常各自的原因，沿用本轮已加的两条 `console.warn`，把它们升成 UI 可读字段）。
3. 明确不改：判据与读模型语义不动（`空 ≠ 不可达` 的既有 V2 约定保留），不动 workspace 解析；
   不把「读不到」折成 0 条。

## 已修判定

- 在 `company-workspace` 上开（新会话 → 培养）：标题点名 `company-workspace`，「需要我处理」列出盘上那 2 条；
- 在 `runtime/rehearsal-workspace` 上开同样操作：标题点名 `rehearsal-workspace`，文案为「这个工作区下还没有培养记录」，
  **不是**「没有给我的建议或纠正」这类不声明作用域的句子；
- 目录缺失/不可读的负控：文案点名目录 + 原因，且与「0 条」可区分；
- 判据命令：`vitest run tests/client/cultivation/cultivation-board.spec.ts`（新增两条：点名 workspace、
  空 vs 不可达两种文案）。
