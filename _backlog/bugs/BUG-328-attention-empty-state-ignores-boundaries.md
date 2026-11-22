---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-328：候选被截/窗口被截/工作区未就绪时，空态仍说「没有等你的事」

> 严重级别：P2（次要偏重：317/318/323 都加了边界提示，但空态压制条件只认 `history.failed`/`eventsTruncated`/`history.approvalsCapped`，漏了 candidates/window/workspace）｜发现：2026-11-23（E2E 第六轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-23 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

「等你处理」为空时，`AttentionTab` 的真实条件是：

```tsx
waiting.length === 0
  ? (history.failed > 0 || eventsTruncated || history.approvalsCapped > 0
    ? null
    : <div>{t('attention.emptyWaiting')}</div>)
  : ...
```

但边界还有三种：

- `candidates.capped > 0`（第 21 个会话没扫）；
- `history.window === 'some'`（800 条窗口截断）；
- `!candidates.ok`（工作区未就绪，根本不跨会话）。

这三种都有独立提示行，却**不压制空态**。页面上会同时出现：

> 还有 N 个会话未扫描 / 历史只扫描了最近 800 条 / 工作区还没就绪
>
> 没有等你的事 —— 本会话与同工作区其它会话里挂着的审批都会出现在这里。

两句话互相矛盾：一边说没扫全，一边说没有。

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/tabs/AttentionTab.tsx` 的空态与三行边界提示。
- 数据面 = `historyCandidates` / `history.window` / `history.failed` / `eventsTruncated`。

## 复现

1. 造 21 个同工作区 root 会话（`candidates.capped=1`），都不含挂起审批。
2. 打开「待办」。
3. 期望：提示「还有 1 个会话未扫描」，不再说「没有等你的事」；实际：两行同时出现。
4. 同理：一条会话历史恰好 800 条（window='some'）；或 cwd 未解析（!candidates.ok）。

## 根因与证据

- `AttentionTab.tsx:202-207` 的抑制条件只列了 `history.failed`、`eventsTruncated`、`history.approvalsCapped`。
- `candidates.capped` 的提示在 `:188`，`history.window` 在 `:191`，`!candidates.ok` 在 `:187`；它们没有进入空态条件。
- 304/305 的修复把 `history.failed` 加进了空态抑制，但没把后来新增的 `window`/`candidates`/`workspace` 一起加。
- 这是「边界提示与空态判据两份清单」——新增边界只加了一处。

## 失败类与同类排查

**失败类 = 边界提示与空态抑制各自维护，新增边界漏接空态**。同类：

- `history.failed`：已接。
- `eventsTruncated`：已接。
- `history.approvalsCapped`：已接。
- `candidates.capped` / `history.window` / `!candidates.ok`：本卡。
- 当前会话 cap 的 `pendingAsks.capped` 也没接（卡 327）；同类。

## 修复方案与范围

- **根因修法**：把「是否有任何未扫边界」收成一个布尔/列表（`boundaries: ...`），提示行和空态都读同一个值；新增边界只改一处。
- 空态文案在边界存在时改为「已扫到的范围里没有待办——但还有未扫描范围」。
- **判据**：候选 capped / window some / workspace unknown 三种 → 不出现「没有等你的事」；全部扫全且无边界 → 空态正常；zh/en 同步。
- **不改**：边界提示的文案；扫描逻辑。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 三种边界各自都不再与空态并存；
- 无边界时空态仍出现；
- 新增边界只需改一处；
- 组件 spec 三态 + 真页面一条。
