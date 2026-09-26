# 实验记录 · quote-z-2026（实验 C 签署腿 + 实验 B 真语料 #2）

状态：**进行中**（段一已交付 `ebe6c7c`；段二等两卡；段三待跑）。判据唯一来源 =
[评审 §五 C](./2026-09-26-multi-human-ux-review.md)。

## 段一产物（2026-09-26）

| 门（根会话） | preset | 产物 |
|---|---|---|
| CEO `88582ba0` | ceo | `drafts/ceo.md`（任务书：结构化派活行 T1/T2/T3 + VP 缺席 + 签字线约定）+ journal |
| CFO `2beb83d0` | cfo | `drafts/cfo.md` **v1→v2**（互审发现自身垫资口径缺口 ⇒ 返工，版本递增 + 知会）+ `drafts/cfo-review.md` v1（互审只出意见）+ journal |
| COO `44710d4e` | coo | `drafts/coo.md` v1 + journal |

**仪器**：authorship-audit 四稿全 ✓（署名 = 实际写入者）；deliverables-check 0 违规；
verify ALL PASS。

## ★ 段一的真发现（实验 B 真语料 #2 的实证）

用 `scripts/lib/candidate-scan.mjs` 扫这份**真任务书**（不是合成语料）：

| 规则 | 报什么 | 对不对 |
|---|---|---|
| **R1 纯文件存在** | **空**（四份稿都在 ⇒ "没活"） | ✗ **漏报**——T1/T2/T3 的状态行全是"待办"，活明明没销 |
| **R2 结构化派活行** | T1/T2/T3 待办 | ✓ 如实 |
| **R3 +动议状态** | T1/T2 候选；**T3 blocked（依赖 T2 未齐）** | ✗ **误判**——T2 实际已完成（coo.md 在场），但 blocked 的依据是**状态行**，而状态行没随出稿更新 |

⇒ **"任务状态"与"文件存在"是两个事实，只靠任何一个都会漂**：
- 只看文件（R1）⇒ 出了稿就以为完了（漏互审/返工）；
- 只看状态行（R3）⇒ 状态没回写就把已完成的依赖判成未齐。
- **这正是评审指认的第三种漂的真语料实证**，也是"要不要结构化派活字段"的正面证据——
  但注意：结构化字段本身也会漂（状态行不更新），**要么回写要么双源核对**。

## 仪器化过程中的两个机制事实（2026-09-26 干跑发现）

1. **`session/page` 事件流不带 header，也没有任何事件携带 agentPreset**
   （`permission/preset` 是文件沙箱策略，不是角色 preset）⇒ **任何想从事件流判"哪个角色发起"的审计
   都必须去读日志文件第一行的 header**（journal-audit 同款做法）。段三抽取器已按此修正并干跑通过
   （CFO 门 preset=cfo depth=0 / CEO 门 preset=ceo depth=0）。
2. `request_signoff` 的**调用参数**（summary/payload）在 `tool/call` 事件里——**审批对应哪一版稿**
   只能从这里（自由文本）核，`approval/asked`/`decided` 事件本身**没有结构化的版本字段**
   （段三跑完后在判据表里坐实这条）。

## ★ 段二的硬前提（源码级核实，2026-09-26）

`vendor/dsh/packages/interaction/user-approval/src/index.ts` 的 `decide()`：

```
this.ctx.waterfall(scopeTarget(req.agent, req.agent), 'approval/request', req,
  () => Promise.resolve<ApprovalOutcome>('unavailable'))   // 没接听者 = 立刻兜底失败
```

- **发卡时没客户端连着 ⇒ 瀑布立即落到 `unavailable`（fail-closed）**，`approval/asked` +
  `approval/decided {outcome:'unavailable'}` 照样成对落账——**不等待后来连接的客户端**；
- 页面开着但**中途刷新/关闭** ⇒ client `pending.delegate()` ⇒ 瀑布走空 ⇒ 同样 `unavailable`
  （这就是"刷新即丢"的精确机制）；
- 接听者**按会话作用域**（`scopeTarget(req.agent, req.agent)`）⇒ **只开 CEO 标签时，
  CFO 的卡会立刻 `unavailable`**——两扇门必须**同时**开着才能各接各的卡。

⇒ **实验流程的硬约束**：先开两个标签（CFO 会话 + CEO 会话）→ 再发卡 → 人在页面开着的状态下点。
若发卡时人不在，结果不是"卡挂着等"而是**立即失败关闭**（这本身是"界面外推送/收件箱"搁置项的根因，
也是实验 D 要观察的边界之一）。

## 段二（两卡，等点）

- CFO 门（`2beb83d0`）自己发起 `request_signoff`（8.8 折 < 9 折，理由写明对应 **cfo v2**）→ 卡只落 CFO 门；
- CEO 门（`88582ba0`）发起双签另一半 → 卡只落 CEO 门；
- **实际应答者** = 人在两个标签页各点一次（数据必须真人产生）。

## 段三判据表（待填）

| 字段 | CFO 半 | CEO 半 |
|---|---|---|
| 实际发起 agent（会话） | 待 | 待 |
| 发起会话 preset | cfo | ceo |
| 物理人（谁点的） | 待（人报） | 待（人报） |
| 稿件作者声明 | cfo v2（署名行） | —（CEO 不出稿） |
| 审批者（decided 事件） | 待 | 待 |
| **审批对应稿件版本** | 待（看理由文本能否核到 v2） | 待 |
| 最终 present 的会话 | — | 待 |

**要回答的机制问题**：审批事件里**有没有结构化字段**绑"签的是哪一版"？
（预期：**没有**——版本只活在 `request_signoff` 的自由文本理由里 ⇒ 这就是要提的上游 seam。）
