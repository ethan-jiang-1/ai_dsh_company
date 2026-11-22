---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-309：自己提、自己拒的记录在「我提交的」里出现两次——一次当「已拒绝回执」，一次当「我的纠正」

> 严重级别：P2（次要：同一记录在同一块面板出现两行，用户会以为提交了两次或处理了两次）｜发现：2026-11-22（E2E 第四轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 8–10 个，别管那边怎么修」）。

## 症状

一条 `proposerRole: ceo, targetRole: ceo, status: rejected` 的记录（self correction），以 CEO 查看培养面板：

- 「我提交的 · 我已处理」里先出现一行 `已拒绝 CEO · 首席执行官的纠正` + 理由 + 拒绝时间；
- 紧接着又出现一行 `我的纠正` + `目标角色语境下的人已拒绝` + 同一理由。

同一条记录、同一块面板、同一用户，显示两次。

纯读模型证据：

```sh
node --import tsx/esm -e "
import { recordInbox } from './packages/company-pack/src/lib/cultivation/cultivation-record.ts'
const r = { id:'r1', kind:'correction', targetRole:'ceo', proposerRole:'ceo', proposerKind:'agent', source:'', expectation:'x', status:'rejected', reason:'no' }
const i = recordInbox([r], 'ceo')
console.log(i.processedForViewer.length, i.mine.length)
"
# 1 1
```

UI 两个子列表都渲染：`CultivationBoardSections.tsx:52`（processed）与 `:63`（mine）。

## 运行面

- **面 = lib 读模型 + client 面板**：`packages/company-pack/src/lib/cultivation/cultivation-record.ts` 的 `recordInbox`；`CultivationBoardSections.tsx` 的 `CultivationMine`。
- 数据面 = 记录 frontmatter 的 `proposerRole` / `targetRole` / `status`。

## 复现

1. 隔离公司盘写一条 `kind: correction, proposerRole: ceo, targetRole: ceo, status: rejected, reason: ...`。
2. 以 CEO 会话打开「培养」→「我提交的 · 我已处理」。
3. 看到两条同 id 的记录（processed 与 mine 各一条）。

## 根因与证据

`recordInbox` 对同一记录可以同时满足两个条件：

```ts
if (record.proposerRole === viewer) mine.push(record)
if (record.status === 'rejected' && record.targetRole === viewer) processedForViewer.push(record)
```

评论把 `processedForViewer` 说成「我已处理（目标是我、已拒绝——理由留档，提出者另在「我提交的」见回执）」，但对 **self record**，提出者就是目标者，两个箱都收；`CultivationMine` 又无条件渲染两个数组。

## 失败类与同类排查

**失败类 = 两个投影箱对 self 记录重叠，渲染面不去重/不分角色**。同类：

- self correction **open**：只在 `needsDecision` + `mine`（「需要我处理」与「我的纠正」两处；这是两个不同动作面，可能是合理的）。
- self correction **adopted**：`adoptedForViewer`（已采纳的方法）与 `mine` 两处；方法面与提交面，可能是合理的。
- self correction **rejected**：`processedForViewer` 与 `mine` 都是同一「我提交的」块内的回执，重复最明显。
- 建议先只收窄 rejected 这一格（或给两行不同角色标签）。

## 修复方案与范围

- **根因修法**：`processedForViewer` 只收 `proposerRole !== viewer` 的记录（别人提、我拒的）；self 记录的拒绝回执由 `mine` 承担。或在 `CultivationMine` 里对同 id 去重并保留一条（带「我提/我拒」双标签）。
- **判据**：self rejected → 只 1 行；他人提我拒 → 1 行（processed）；我提他人拒 → 1 行（mine）；self adopted/open 不变。
- **不改**：`needsDecision` / `adoptedForViewer` 的语义；记录文件。
- **材料性**：client/读模型公开呈现；修复需授权/留痕裁决，本轮不修。

## 已修判定

- self rejected 在「我提交的 · 我已处理」只出现一次；
- 他人提我拒、我提他人拒各自仍出现一次；
- 读模型 spec（1/1 → 1/0 或渲染去重）+ 真页面一条。
