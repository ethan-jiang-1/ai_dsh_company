---
name: quality-loop
description: 质量环（quality-loop-producer → quality-loop-verifier → 处置 → 复验）：把复杂产出交给两个独立 activation——一个按外部方法包做、一个按同一方法包独立复核，裁决原文落盘可审计。任务书必须点名方法包 `<pack>@<version>`，没给就 fail-closed 停下。
---
# 质量环：一个做、一个验，方法与裁决都在纸面上

**什么时候用**：一份产出要"做得对"而不只是"做完了"——复杂设计/实现、需求或接口稿、要交给别人
接着用或对外的东西。一个人在同一个上下文里既做又验会互相干扰（锚定、共享盲区、自我评分），
这个流程用**两个独立 activation** 把它们分开。

**前置**：调用方组合里有两条命名行 `quality_loop_produce`（→ `quality-loop-producer`，有手）
与 `quality_loop_verify`（→ `quality-loop-verifier`，只读）——同一个 `quality-loop-` 前缀，一搜就是一整套。
两者是**能力档**，不是公司角色：它们只有身份与工具面，没有方法、没有流程。
本 skill 是流程的唯一家；**方法不在任何 preset 里**（`<DSH_HOME>/company/methods/<preset id>/<pack>/`）。
裁决是内部质量闸的证据包，**对外签字仍归人**（`review-protocol.md` 的具名人类复核不因本流程豁免）。

## 0. 三句话

1. **方法必须先点名**：任务书写 `method: <pack>@<version>`，两侧同名同版本；缺了任一侧 = 停下，不猜。
2. **验的人只看产物**：交接包给基线 + 产物路径 + 约束 + 方法，**不给产出者的推理与自评**。
3. **裁决原样落盘**：验证者只读、写不了盘；由调用方（VP-Eng）把它的最终正文原样写进
   `verdict-r<N>.md` 并带头（session / preset / depth / method / body-sha256）。改一个字节，哈希就对不上。

## 1. 任务书（`brief.md`）

一次任务一份，字段齐全才算可以开工：

| 字段 | 内容 |
|---|---|
| 目标 | 这份产物要解决什么问题、给谁用（一句话） |
| 约束 | 时间/成本/技术/合规/不许碰的范围 |
| 基线 | 产物要建立在什么之上（文件路径、上游稿、版本） |
| 产物路径 | 产出者写哪儿（相对交付目录）；验证者读同一个路径 |
| 方法 | `method: <pack>@<version>`（两侧同名同版本） |
| 轮次上限 | 默认 **2**（产→验→处置→复验）；超限升级，不加轮 |
| 验收口径 | 什么算通过：方法检查表全覆盖 + 无 blocker 发现 |

方法没给、或任一侧加载不到同名同版本 skill ⇒ **fail-closed**：不发工，回报缺什么。

## 2. 两轮交接（严格串行：先生产，再验证）

**次序是硬的**：先 `quality_loop_produce` 落盘，**等它这一轮收工**，再发 `quality_loop_verify`。
两个一起发出去没有意义——验证者拿到的会是半成品，那叫打断，不叫复核。

**发工（产出者）**：`quality_loop_produce` 的 brief = 任务书全文 + 产物路径 + "先加载 `method` 点名的 skill"。

**交接包（给验证者）**：`handoff-r<N>.md`，只含四样——基线、产物路径、约束、方法。
**不许**附产出者的推理链、自评、"我已经检查过了"。附了就等于让验证者复核自己。

**裁决（验证者交回）**：最终正文即裁决。正文形状固定：

```
## 裁决：<pass | fail>
### 检查表
| check-id | 结果 | 证据 |
|---|---|---|
| <方法里的 id> | pass / fail / skip | 一句可核对的证据；skip 必须写为什么 |
### 发现
- F1 [<check-id>][blocker] 一句话：哪里不对、影响什么
- F2 [<check-id>][advisory] …
```

规则：**方法检查表里的每个 check-id 都要有一行**（缺行 = 不通过，不是"没查"）；
每条发现一个编号；裁决 append-only——复验是新的一块或新文件，**不改旧的**。

## 3. 落盘（调用方做，验证者做不了）

```
<交付目录>/quality-loop/
  brief.md              任务书
  handoff-r<N>.md       交接包
  verdict-r<N>.md       裁决原文：第一行头 + 正文（正文 = 验证者最终正文，一字不改）
  dispositions-r<N>.md  处置表
```

`verdict-r<N>.md` 头行（**一行，机器解析**，`body-sha256` = 头行之后全部正文的 sha256；
可先写 `body-sha256=待填`，落盘后用下面的命令回填）：

```
<!-- quality-loop: round=1 session=<验证者 sessionId> preset=quality-loop-verifier depth=<delegationDepth> producer=<产出者 sessionId> method=<pack>@<version> body-sha256=<hex64> -->
```

取 session / depth / producer = `list_subagents` 对应行（读 child durable header；读不到写 `unavailable` 并说明）。
`producer` 不是装饰：审计用它核**先产后验**（验证者会话必须在产出者首轮收工之后才创建）。

**哈希只走工具，不手算**：先把正文和头写进 `verdict-r<N>.md`，再运行

```sh
node <company-content>/../presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs --fix .dsh-company/deliverables/<slug>/quality-loop/verdict-r1.md
```

它按审计同一口径（正文去掉结尾空白）重算并回填。**不要用 `tail -n +2 file | shasum`**——它把文件
尾随换行也算进哈希，audit 会判 `body-modified`（2026-11-10 真实事故 BUG-056）。只取正文哈希用
`--body <正文文件>`；核对用 `--check <verdict文件>`。
**别手改正文**：改了就与头、与验证者会话对不上（审计会红）。

## 4. 处置（每条发现三选一，不许静默忽略）

`dispositions-r<N>.md`：

```
| 发现 | 处置 | 说明 |
|---|---|---|
| F1（首格也可写 `F1 [check-id] 标题`） | 已修 | 改了哪儿 + 复验怎么看到 |
| F2 | 反驳 | 证据：为什么这条不成立（要有可核对的东西，不是"我觉得"） |
| F3 | 接受 | 风险是什么 + 由谁接受（具名岗位/人；不加"谁接受"不算处置） |
```

`blocker` 级发现不许用"接受"结案（要接受就升级给授权人，写进说明）。

**裁决后改了产物/稿**：不能停在"裁决过、后来改了"——要么开 R2 新裁决（`verdict-r2.md`），
要么在处置说明里显式写「未复验」并由授权人接受该残留。audit 对最后一轮 dispositions 里的
「未复验」给 `post-verdict-unverified` warning（不冒充原文一致；不是运行时 veto）。

## 5. 轮次与升级

1. **R1**：产出收工 → 交接 → 才发验证 → 裁决 → 逐条处置。
2. **R2**：修完复验（新裁决文件 `verdict-r2.md`），只看上一轮发现与检查表，不重开全线。
   复验轮把上一轮的发现**重列为「已消除 / 仍成立」**即可，不必再抄一份处置表（处置归首次提出它的那一轮）；
   只有**本轮新出现**的发现才要在 `dispositions-r2.md` 里处置。
3. **超限**（R2 仍有 blocker，或产出者与验证者对同一条反复互不相让）⇒ **停下升级**：
   把两轮裁决、处置表、分歧点原样交上去，由委派者（VP-Eng）裁决，必要时上 CEO/人。
   **不许**自己加第三轮把分歧磨平——磨平的分歧会在交付时变成事故。

## 6. 方法包契约

一份方法 = 两侧各一份 skill，**同 `method`、同 `version`，`side` 不同**（`side` 是方法包自己的词表：
`producer` / `verifier`；目录名跟 preset id 走，所以是 `quality-loop-producer` / `quality-loop-verifier`）：

```
<DSH_HOME>/company/methods/quality-loop-producer/<pack>/SKILL.md
<DSH_HOME>/company/methods/quality-loop-verifier/<pack>/SKILL.md
```

```yaml
---
name: <pack>
description: <一句话：这套方法管什么、产出什么>
metadata:
  method: <pack>        # 两侧同名
  version: <x.y.z>      # 两侧同版本
  side: producer        # producer | verifier
---
```

正文四段（顺序不重要，内容要在）：**输入契约**（吃什么）｜**程序**（怎么做）｜
**检查表**（`check-id` + 判据 + 证据要求；验证侧逐条出结论）｜**输出契约**（产物必含哪些节）。
产出侧与验证侧的检查表用**同一批** check-id——否则覆盖核对没有锚。

方法由**人**放进方法层（pack 升级不擦、新会话生效）；角色自己不能写它。
换公司/换产品类型只换方法包，preset 与流程不动。

## 7. 独立性怎么说（别说过头）

- 标注 = **上下文独立复核（同模异上下文，独立性有限）**——不得报成"异人"或"双人复核"。
- 它解决锚定、自评、注意力稀释；**不解决**同源盲区与模型相关性。
- 关键结论旁标**边际宽度**（差几格/几个百分点翻面）。
- 对外交付件仍走 `review-protocol.md`：具名人类复核人 + 独立性层级 + 缺口数据 fail-closed。
  本流程的产出是给那个人的**证据包**，不是签字。
