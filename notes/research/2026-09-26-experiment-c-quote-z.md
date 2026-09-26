# 实验记录 · quote-z-2026（实验 C 签署腿 + 实验 B 真语料 #2）

状态：**✅ 全部完成（2026-09-26）**——段一产物、段二两卡（自主应答，如实标注）、段三合稿+present+
全仪器。判据唯一来源 = [评审 §五 C](./2026-09-26-multi-human-ux-review.md)。

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
- ~~页面开着但**中途刷新/关闭** ⇒ 同样 `unavailable`~~ **❌ 此推断被实测证伪（2026-09-26 暂停后复跑前）**：
  用户关掉浏览器后，两张卡**没有**失败关闭，而是**无限挂起**（asked 1 / decided 0，轮次阻塞 20+ 分钟）。
  `unavailable` 兜底只在**派发时就没有接听者**的情形成立；**已派发出去的请求，客户端断开不会让它落账**。
  **干净解锁的正路 = `session/cancel`**（实测：两会话各落 `approval/decided {outcome:'cancelled'}`、
  轮次正常收尾）——这也是一条要写进 runbook 的运维动作；
- **正确结论**：卡的两种死法——派发时没人（`unavailable`，秒失败）/ 派发后没人答（**挂死**，需 cancel）。；
- 接听者**按会话作用域**（`scopeTarget(req.agent, req.agent)`）⇒ **只开 CEO 标签时，
  CFO 的卡会立刻 `unavailable`**——两扇门必须**同时**开着才能各接各的卡。

⇒ **实验流程的硬约束**：先开两个标签（CFO 会话 + CEO 会话）→ 再发卡 → 人在页面开着的状态下点。
若发卡时人不在，结果不是"卡挂着等"而是**立即失败关闭**（这本身是"界面外推送/收件箱"搁置项的根因，
也是实验 D 要观察的边界之一）。

### 三扇门在侧栏里的标题（2026-09-26 从 session/title 事件核出，点卡时按标题认门）

| 门 | preset | 侧栏标题 |
|---|---|---|
| **CFO 门（点卡 A）** | cfo | **CFO 8.8折毛利测算稿** |
| **CEO 门（点卡 B）** | ceo | **写折扣报价任务书** |
| （COO 门，本场无需开） | coo | 承接三年框架与排期出稿 |

## ★ 用户暂停（2026-09-26）+ 实验 D 的第一条**活体数据**

用户开好两扇门后反馈：**"看窗口名字都不知道哪一个是哪一个……晕头转向"**，要求暂停。
这正是评审 §五 D（门的心智模型）预测的混淆——**被真实用户当场撞上**，比任何模拟实验都硬。

**即修（Level 0，零代码）**：vendor 本来就有 `session/rename` RPC
（`packages/api/session-controller/src/index.ts:402` `@Remote('rename')`，
参数 `{sessionId, title}`；侧栏渲染的就是它，`tree.ts:294 sessionTitle`）⇒
直接把三个门改名带角色前缀：

| 门 | 新标题（侧栏现在就显示这个） |
|---|---|
| CEO `88582ba0` | **【CEO】折扣报价动议 · quote-z-2026** |
| CFO `2beb83d0` | **【CFO】8.8折毛利测算 · quote-z-2026** |
| COO `44710d4e` | **【COO】三年框架承接 · quote-z-2026** |

**角色可见性的三层答案**（回应"能不能把角色名放上去"）：
- **L0（已做，零代码）**：开门时顺手 `session/rename` 加角色前缀——立即可用，应写进 runbook 与开门配方；
- **L1（本仓 pack 的 client 面，不动 vendor）**：company-pack 的 `src/client/`（品牌皮肤面）加
  "当前会话角色"徽标/头部标识——需要 spike client 插件 API（`ctx.sidebarRightTabs` 一类）；
- **L2（上游）**：会话原生带角色身份并在 UI 各处显示——提 seam，不自建。
- **浏览器标签页标题**：跟着会话标题走（改名后标签也会带【角色】）——待用户侧栏确认。

**暂停时的状态**（都可安全恢复）：
- 两张卡曾无限挂起（用户关页**没有**触发失败关闭——实测证伪了"关页⇒unavailable"的推断），
  已用 `session/cancel` 干净解锁（各落 `cancelled`）；复跑时在新一轮重新发卡；
- 段一产物全部已提交；段三脚本就绪。goal 已按用户要求暂停。

## 段二（两卡，等点）

- CFO 门（`2beb83d0`）自己发起 `request_signoff`（8.8 折 < 9 折，理由写明对应 **cfo v2**）→ 卡只落 CFO 门；
- CEO 门（`88582ba0`）发起双签另一半 → 卡只落 CEO 门；
- **实际应答者** = 人在两个标签页各点一次（数据必须真人产生）。

## 段三判据表（✅ 2026-09-26 自主收尾完成——用户授权"静默自主全部做完"，应答者如实标注）

| 字段 | CFO 半 | CEO 半 |
|---|---|---|
| 实际发起 agent（会话） | `session-2beb83d0`（CFO **根会话**，自己发起不升级） | `session-88582ba0`（CEO 根会话） |
| 发起会话 preset / depth | `cfo / 0` | `ceo / 0` |
| 物理人（谁应答） | **维护者代理经真实浏览器 UI 点「Allow once」**（actionRow 末按钮，语言无关定位；用户授权静默自主，不冒充真人） | 同左（另一扇门各点各的） |
| 卡落哪扇门 | **只在打开 CFO 会话的页面出现**（脚本在该页等到卡 ×1）⇒ "根会话自己发起 ⇒ 卡落自己门"实证 | 只在 CEO 会话页出现 |
| 稿件作者声明 | `cfo.md` 署名 cfo（**v2→v3**，见下） | —（CEO 只合稿，署名行 ceo v1 任务书） |
| 审批者（decided 事件） | `approval/decided {outcome: allowed-once}` | 同左 |
| **审批对应稿件版本** | **v2**（只活在理由自由文本；CEO 半甚至预写"再返工换 v3 则本次签字不生效"条款） | **v2**（理由明写"依据 = cfo.md（v2，稿首「出稿：cfo｜版本 v2」）；本请求只对 v2 生效"） |
| 最终 present 的会话 | — | `session-88582ba0`（`deliverables/presented: quote-z-2026/final.md`） |

### ★★ 头条发现：版本穿透（活体实证）

两半审批的理由都钉在 **cfo.md v2**（CEO 半预写了失效条款）⇒ **CFO 在签字轮里把稿推到 v3**
（v3 变更自述"仅更新签字线状态"）⇒ **盘面 v3 / 审批 v2 错位**。final.md 如实记录：
"按 v2 取权威版号；盘上稿首现已改写为 v3……版号待对齐"。

⇒ **审批→版本的绑定只活在 `request_signoff` 的自由文本理由里，机制无结构化字段**；
本轮靠 CEO 在理由里预写失效条款 + final 人工对账才兜住。**上游 seam（审批载荷带稿件版本/哈希）
从此有实证**——正是磨清单"双签没有版本穿透载体"那条的活体证据。

### 全仪器（收口后实跑）

- `deliverables-check`：**0 违规 ALL PASS**（成品 15 份，含 quote-z-2026/final.md）
- `authorship-audit`：quote-z 四稿**署名=写入者全 ✓**（cfo v3 仍署名 cfo）
- `journal-audit`：quote-z 各角色 journal 在场（CEO journal 含收口与审批记账）
- `candidate-scan`（真语料 #3）：R1 空、R2 仍报 T1–T3 待办（派活行状态未回写——已知漂）、
  R3 closed=true（final 在场 ⇒ 不报候选）⇒ 三条规则在**收口后**的分歧如实呈现。
