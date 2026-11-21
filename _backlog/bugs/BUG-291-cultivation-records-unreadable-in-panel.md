---
status: 调查中
severity: P2
opened: 2026-11-21
---

# BUG-291：培养页显示「培养记录尚未读到」，但目录里有记录、直连 RPC 也读得到

> 严重级别：P2（次要偏重：培养这条人机协作入口在真实盘上整页不可用）｜发现：2026-11-21（端到端验收第七轮）｜状态：调查中
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

## 待查（失败点已收窄到客户端 `listDir`）

`packages/company-pack/src/client/cultivation/cultivation-data.ts:87`：

```ts
const result = await remote.workspaceFiles.list(leadOf(sessionId), dir, signal)
if (!result.ok) return null
```

三个候选，按可能性排序：

1. **AbortSignal 已中止**：React effect 在 StrictMode/重渲染下先 abort，`list` 抛错被 `catch` 吞成 null（`read` 因路径不同/时序不同未触发）——需在 catch 里打印原因，而不是静默 null；
2. **`remote` 包装差异**：`scoped.remote.workspaceFiles.list` 的实参与声明不一致（声明是 `(scopeId, path, signal)`）；
3. **`entries` 字段过滤**：`type === 'file'` 与实际条目 `type` 值不符（直连返回的是 `file`，但不排除客户端拿到的是另一种包装）。

判据：在 `listDir` 的 `catch` 与 `!result.ok` 分支各加一条 `console.warn`（本轮先用探针 console 采集验证），把静默失败变成可诊断失败。

## 失败类与同类排查

**失败类 = 静默失败（错误被 catch 成 null，UI 只说"读不到"）。**
同类：`readRecordHead`（同文件 :100）、`readWorkspaceText`（同模式 `catch → null`）都走同款静默路径；`成品`/`台账` 面板同样只能显示"未读到"，无法指出到底缺目录还是被拒。建议统一：失败时带上错误码/原因进 UI（或至少进 console）。
