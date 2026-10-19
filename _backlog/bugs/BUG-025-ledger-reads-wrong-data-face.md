---
status: 调查中
severity: P1
opened: 2026-10-19
---

# BUG-025：台账面板读错了数据面——不是 993 条成品，是 40 行动议表

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：调查中

## 症状

「台账」页签（`LedgerTab.tsx`）显示的**不是**公司盘里那 993 份成品，而是 `kb/motion-ledger.md` 这张
**40 行的动议表**。两个后果同时成立：

1. **规模论点作废**：「993 条真数据压规模」是父卡把台账排第一的**首要理由**，但这个面板实际只渲染
   **40 行**——比培养面板的 300 条合成负载小一个数量级。台账"数据最大"的前提不成立。
2. **真实任务做不成**：台账卡（`2026-10-19-ledger-ux-deep-dive`）的验收任务原文是「找到 2026-10-17
   那份**临港预审的成品**，并说出它的**参与角色与结论**」。`deliverables/2026-10-17-lingang-recon/`
   在盘上真实存在，但**不在动议表里**——这个面板没有它的行，任务永久无法完成。

## 根因（已确认，读码级）

数据面读的是 `kb/motion-ledger.md`，**不是** deliverables 目录：

- `packages/company-pack/src/client/LedgerTab.tsx:22` — 注入面 `readLedger`，注释写明「读 `kb/motion-ledger.md` 全文」
- `packages/company-pack/src/client/index.ts:205` — `workspaceFiles.read(leadOf(sessionId), 'kb/motion-ledger.md', { limit: 240 }, signal)`
- `packages/company-pack/src/lib/ledger.ts:30` — `parseMotionLedger(text)`：解析 markdown 表的**行**
- `tests/company/ledger.spec.ts:14` — 真台账断言也是读 `company-workspace/kb/motion-ledger.md`

动议表与 deliverables 是**两个不同的东西**（口径也不同）：

| 面 | 单位 | 实测条数 | 取法 |
|---|---|---|---|
| `kb/motion-ledger.md` | 一场**动议**（一行 = 一次多角色开会） | **40**（表头 41 行、分隔行 1） | `parseMotionLedger` 实跑 |
| `deliverables/` + `deliverables-archive/` | 一份**成品目录** | **993 个文件**（6 + 39 个目录） | `find … -type f \| wc -l` |

**为什么调研会错**：调研文档与四张卡都把「台账」和「deliverables」当成同一个数据面
（调研 `2026-10-19-panel-inventory-and-priority.md` §二 第一行就把 993 记在"台账条目"名下）。
这是**同一个错一个家**、下游四张卡全继承。父卡「前几轮读码」没读 `index.ts` 那行 `read`。

**不是同名巧合**：`LedgerTab.tsx` 头注自己写清楚了——「读 `kb/motion-ledger.md` 渲染每场动议的
日期/类型/参与/墙钟/成品/结论」。面板一直是对的，是**卡写错了**。

## 暴露的失败类

**"读码"在没有读到数据取用的那一行时是什么都证明不了的**。四张卡都标了「全部实查」，
但数据量那条事实来自 `find`（盘上有什么），而面板的数据面来自 `remote.workspaceFiles.read(path)`
（面板读什么）——**两者之间的连线没人查**。横切排查范围：其余五个面板的"数据面 → 渲染"
连线是否也只在卡上推断、未经读码确认（看板/依赖图/任务板三卡本轮已补，见调研 §三）。

## 复现

```sh
cd /Users/bowhead/ai_dsh_company
# 1. 面板真正读的东西有多少行
node -e "…parseMotionLedger(读 kb/motion-ledger.md)…"   # → 40 行（脚本见调研 §二）
wc -l company-workspace/kb/motion-ledger.md              # → 68 行（含 10+ 行说明/判定块）

# 2. 盘上的成品有多少
find company-workspace/deliverables company-workspace/deliverables-archive -type f | wc -l   # → 993
ls -d company-workspace/deliverables/*/ | wc -l                                              # → 6

# 3. 台账卡要件的那份成品在不在面板里
ls -d company-workspace/deliverables/2026-10-17-lingang-recon/   # 存在
grep -c "lingang-recon" company-workspace/kb/motion-ledger.md     # → 0（不在动议表 ⇒ 面板无此行）
```

## 修复关联

**修的不是这个 BUG，是这个 BUG 之前的问题**：台账到底该是**动议台账**（现设计，40 行）还是
**成品台账**（卡里写的 993 条）——这是**产品决策**，不是缺陷。两条路：

- **路 A（台账 = 动议台账，保留现设计）**：改四张卡与调研的**事实与验收标准**（实测 40 行、
  把那句"找临港预审成品"的任务换成动议表里真有的行）。面板代码不用动。
- **路 B（台账 = 成品台账）**：另开问题卡设计"按 deliverables 目录列出成品"的信息架构
  （993 份 × meta.md 读取 = 新数据面 + 性能问题），属新功能，不是 UX 深挖。

本 BUG 的**缺陷**部分是：**卡上的数字与任务与面板实现不符，且会误导下游**。
哪条路，都要先把这个错的地方改对。

## 已修判定

- 调研文档与四张卡里 **993 / 40 的归属不再混用**：写清「动议台账 = N 行」与「成品目录 = 993 文件」
  各是什么、各属哪个面板、哪个是本节论据。
- 台账卡的验收任务**能在面板里做到**：任务里的那份成品在面板数据面上有对应行；做不到就换任务。
- 台账"排第一"的理由**换成本轮实测后的真理由**（或明确降级）。
- 机器判据（防复发）：`tests/company/ledger.spec.ts` 加一条**断言台账数据面 = `kb/motion-ledger.md`**
  （现已有真文件断言，但卡/调研的"993"没有任何测试或门禁绑定——本轮**不加新门禁**，只把这条
  错留在卡上让它不再复发）。
