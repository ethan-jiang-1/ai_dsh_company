---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-305：跨会话历史全部读失败时，待办仍显示「没有等你的事」——没有错误行，也没有降级提示

> 严重级别：P2（次要偏重：跨会话读取是唯一能看见未打开会话挂起审批的通道；全部失败时面板把「读不到」说成「没有」，用户会漏掉审批）｜发现：2026-11-22（E2E 第三轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 5–6 个，别管那边怎么修」）。

## 症状

`remote.session.page` 对所有候选会话都返回失败（网关错误、会话暂不可读、网断等）：

- `readPendingAcrossSessions` 对每个会话 catch 后返回 `[]`，整体返回空数组；
- `AttentionTab` 的 `historyPending` 变成 `[]`；
- 面板渲染「没有等你的事——本会话与同工作区其它会话里挂着的审批都会出现在这里」；
- 没有任何错误行，也没有「历史读取失败」提示。

即：**读不到 ≠ 没有**，但 UI 把两者折成了「没有」。单会话失败降级是合理策略；全部失败仍说「没有」不是。

## 运行面

- **面 = client 读模型 + 待办面板**：`packages/company-pack/src/client/presence/attention-history.ts` 的 `readPendingAcrossSessions`；`tabs/AttentionTab.tsx` 的 history effect / 空态。
- 数据源 = `remote.session.page`（每个候选一次探游标 + 一次取页）。

## 复现

纯函数，无需浏览器：

```sh
node --import tsx/esm - <<'EOF'
import { readPendingAcrossSessions } from './packages/company-pack/src/client/presence/attention-history.ts'
const page = async () => ({ ok: false, error: { message: 'gateway unavailable' } })
const rebuilt = await readPendingAcrossSessions(page, ['session-1', 'session-2'])
console.log('rebuilt', rebuilt.length)
EOF
```

本轮实测：

```
rebuilt 0
```

两个会话都读失败，返回空、无异常；`AttentionTab` 的 catch 分支只会保留上一轮结果，首次加载时上一轮就是空，因此面板显示空态。

## 根因与证据

1. 单会话 catch 折成空：`attention-history.ts:84-92`
   ```ts
   try { ... } catch { /* 单会话读不到 = 少了那一份历史，不是整体失败 */ return [] }
   ```
   这是 BUG-292 的有意降级；但它**没有把失败数带出来**。
2. `readPendingAcrossSessions` 返回 `readonly AttentionItem[]`，调用方无法知道「0 条」是「确实没有」还是「全部失败」。
3. `AttentionTab` 的 history effect 只 `setHistoryPending(rebuilt)`，没有 historyError 状态：
   - `AttentionTab.tsx:146-153`：catch 只保留上一轮；
   - 面板的 `streamError` 只属于 `session/follow` 流，不属于跨会话历史；
   - 空态无条件说「没有等你的事」。
4. 单测 gap：`attention-history.spec` 覆盖了「单会话失败降级」，但没有「全部候选失败 → 必须可诊断」。

## 失败类与同类排查

**失败类 = 降级没有可诊断面（read failure folded into empty）**，与 BUG-291（不可达 ≠ 0 条）、BUG-297（读坏 ≠ auto）同族。同类：

- 单会话失败降级本身是好的；问题是**失败计数/原因没有上报**。
- 候选 cap 20 / 800 条窗口是另外两条静默缺口（见 BUG-304）。
- 面板的 follow 流有 `streamError` 行；历史读取没有对应的错误行，这是不对称。
- 不是 host 面问题：`session/page` 失败原因在 `result.error.message` 里，client 自己丢了。

## 修复方案与范围

- **根因修法**：`readPendingAcrossSessions` 返回 `{ items, failed: [{ sessionId, reason }], total }`；`AttentionTab` 保存 historyError：
  - 部分失败：保留成功条目，行内显示「另 N 个会话历史读不到」；
  - 全部失败：显示明确错误行（不要显示「没有等你的事」）。
- **判据**：全失败 fixture → 返回 `failed.length === total`、items 空；面板错误行；部分失败 → 成功条目仍在 + 错误行；全成功 → 无错误行。
- **不改**：单会话失败不整体抛的策略；活体 observer；`streamError` 的 follow 面。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 所有候选都失败时，待办不再显示「没有等你的事」，而是明确「历史读不到」并给原因/数量；
- 部分失败时成功条目仍显示，且能看到剩余失败数；
- 全成功时无错误行、无噪声；
- 三条 keyless + 真页面（可注入失败 page）各绿。
