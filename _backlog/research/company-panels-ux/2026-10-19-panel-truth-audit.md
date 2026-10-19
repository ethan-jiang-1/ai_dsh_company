---
topic: 公司面
intent: "把『公司面面板 UX 深挖』四张卡里可机械复核的事实收成一处：面板真实数据面、真投影字段实况、以及三张卡与真相对不上的地方（含可复跑脚本）。"
---

# 公司面面板真相复核：四张卡的前提有几条站得住（2026-10-19）

服务：[已结公司面优先级卡](../../_archive/settled_issues/2026-10-19-company-panels-ux-priority.md) 与它拆出的三张深挖卡
（[台账](../../issues/2026-10-19-ledger-ux-deep-dive.md)｜[看板 + 依赖图](../../_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)｜
[任务板](../../_archive/settled_issues/2026-10-19-taskboard-table-ux-deep-dive.md)）及三张缺陷卡
（[BUG-025](../../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md)｜[BUG-026](../../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md)｜
[BUG-027](../../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)）。

**口径**：本轮 = **读码 + 真数据实跑**，**没开浏览器**。凡标「实测」的都有本文件给出的可复跑命令；
凡标「待真浏览器」的仍是假设。上一份调研（`2026-10-19-panel-inventory-and-priority.md`）的**数据量数字有两条要改**
（见 §一），本文件是它的增补与订正，不是替代。

> ## ⚠ §三 的取法错了（2026-10-19 晚补正，结论反转）
>
> 本文件 §三 的脚本读 `record.rows.agentTeam.val.tasks`——那是投影的 **state**（`TeamTaskSnapshot`），
> **不是浏览器收到的 wire 视图**（`TeamTaskView`）。缓存落盘的是 state，wire 视图由 `wire.view(state)`
> 现算（`session-projection/src/index.ts:466`）。两者差着 `ownerName` 与 `ready` 两个字段——
> **恰好就是 §3.1/§3.2 指控的对象**。
>
> 按 wire 视图重跑（复刻 vendor `projectTaskView` + `buildTeamProjection`，只取当前版本 `ver === 4` 的行）：
>
> ```
> 61 板 / 298 任务：ownerId 273 → wire ownerName 273（解不出 0）
>                   ready === true 18，其中非 pending 0
> 我们的真读模型 tasksFromTeamView 吃这批真 wire：379 行 / 已解析 owner 344 / readyOnNonPending 0
> ```
>
> ⇒ **§3.1 的结论作废**（owner 一个都没丢；[BUG-026](../../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md) 是误报）；
> **§3.2 的根因作废**（`??` 回落不可达——官方给的是 `false` 这个有效值，不触发回落），但**症状是真的**，
> 真根因是**徽章渲染门槛不看 status**（147 枚徽章里 129 枚挂在已完成的卡上、2 枚挂在进行中的卡上），
> 已按真根因修复，见 [BUG-027](../../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)「结论」节。
> 下面 §三 的脚本与两节原文**保留作为错误样本**（根因纪律：被证伪的假设留在原地，不抹掉），
> 但**不要再用它们做判断**。§3.3 的 drift 脚本只读 subject/description/blockedBy/status——这四个字段
> state 与 wire 都有且同值，**该节结论不受影响**。
>
> **2026-10-19 质量审补充**：§五/§六 的「换底」结论仍以本页已证伪的 owner/ready 前提为依据；保留作历史建议，当前判断见 [已结质量卡](../../_archive/settled_issues/2026-10-19-issue-card-quality.md)。

---

## 一、上一份调研里要订正的三个数

| 上份调研的说法 | 本轮实测 | 订正理由 |
|---|---|---|
| 「台账条目 **993**（当前 98 + 归档 895）」 | 台账面板实渲染 **40 行**（`kb/motion-ledger.md` 的动议表）；993 = `deliverables*` 目录的**文件数** | 两个面混用了。见 [BUG-025](../../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md) |
| `LedgerTab` 命中 **7** 份文档 | 按同一命令 `grep -rl LedgerTab notes/ _backlog/ docs/` 实测 **10** 份（含（_backlog 里 3 份是这轮刚写的卡/research） | 数字本身没钉脚本与时点，复跑已不同频；"痛点 7 份"多半是**现在的卡在自我引用**，不是历史痛点 |
| 最大板 21 条、中位 **0** | 最大 21 条、非空会话 84、**非空板的中位 4 条**（"中位 0"是含 1638 个空板一起算的） | 两个中位数说的是不同问题；对"最大板有多难受"应该看 84 个非空板 |

**历史痛点的真实构成**（读一遍那 10 份就知道）：`LedgerTab` 的 10 份里，7 份是
`notes/implemented/2026-10-11-human-exits*.md` 那条线（**同一件事**：摘要两行边界 + 全文入口，
已交付）与 3 份 `_backlog` 本轮新卡。**没有任何一份是"台账规模太大"或"找不到成品"**。
⇒ 「台账痛点最多 ⇒ 最该先做」这条论据**不成立**。

---

## 二、面板真实数据面（读码直达行）

**这是上一轮调研缺的那条连线**：盘上有什么 ≠ 面板读什么。

| 面板 | 数据面（代码事实） | 实测规模 |
|---|---|---|
| 台账 `LedgerTab` | `index.ts:205` 读 **`kb/motion-ledger.md`**（`parseMotionLedger` 解析表行） | **40 行动议**（68 行文件：10 行说明 + 判定块） |
| 看板 `BoardPanel` | `use-company-data.ts:103` 读 `projectionsBySession[lead].values.agentTeam` | 379 任务 / 84 非空板 / 最大 21 |
| 依赖图 `DagPanel` | 同上（`layoutDag(tasks)`） | 同上 |
| 在场 `PresencePanel` | 同上 + `session/follow` 流 | 成员数（每板 ≤6） |
| 任务板 `TasksTableView` | 同上（`data.team` 直传） | 同上 |
| 用量 `BudgetPanel` | `useProjection('tokenUsage'/'sessionStats')` | — |
| 培养 `CultivationBoard` | `remote.workspaceFiles` 读 journal/记录目录 | — |

**读法**：真正的"993 条成品"目前**没有任何面板读**。若想要成品台账，那是**新数据面 + 新信息架构**，
不是现有台账的 UX 打磨（见 BUG-025 的"路 A / 路 B"）。

### 台账实跑解析（复跑脚本）

```sh
cd /Users/bowhead/ai_dsh_company && node -e "
const {readFileSync}=require('fs');
const H=['slug','日期','类型','参与','墙钟','成品','一句话结论'];
let seen=false,rows=[];
for(const l of readFileSync('company-workspace/kb/motion-ledger.md','utf8').split('\n')){
  const t=l.trim(); if(!t.startsWith('|')) continue;
  const c=t.slice(1,t.endsWith('|')?-1:undefined).split('|').map(s=>s.trim());
  if(!seen){ if(c.length===H.length&&H.every((n,i)=>c[i]===n)) seen=true; continue }
  if(c.every(s=>/^[-: ]*$/.test(s))) continue; if(c.length!==H.length) continue;
  rows.push({slug:c[0],summary:c[6]});
}
console.log('rows=',rows.length,'maxSummaryLen=',Math.max(...rows.map(r=>r.summary.length)),
  'summaries>120=',rows.filter(r=>r.summary.length>120).length);
"
# 实测：rows= 40 maxSummaryLen= 663 summaries>120= 16
```

⇒ 台账的**真实规模问题不是行数**，是**单行摘要长度**（最长 663 字；16/40 行超过 `FULL_TEXT_HINT = 120`
所以带「全文」按钮）。**规模论据换个对象还在**（"看不完"从"行多"变成"行太长"），代价小得多。

---

## 三、真投影字段实况（`session_projcache`）

**取法**（上一份调研给的取法 `rows.agentTeam` 是错的，真路径多一层 `record`）：

```sh
cd /Users/bowhead/ai_dsh_company
node -e "
const {readdirSync,readFileSync}=require('fs');
const dir='runtime/harness-home/storages/session_projcache/sessions';
const files=readdirSync(dir).filter(f=>f.endsWith('.json'));
let withTeam=0,total=0,nonEmpty=0,sizes=[],ownerId=0,ownerName=0;
for(const f of files){
  const t=JSON.parse(readFileSync(dir+'/'+f,'utf8'))?.record?.rows?.agentTeam?.val?.tasks;
  if(!Array.isArray(t)) continue;
  withTeam++; total+=t.length; if(t.length) { nonEmpty++; sizes.push(t.length) }
  for(const k of t){ if(k.ownerId!==undefined) ownerId++; if(k.ownerName!==undefined) ownerName++ }
}
sizes.sort((a,b)=>a-b);
console.log({files:files.length,withTeam,total,nonEmpty,max:Math.max(...sizes),
  medianOfNonEmpty:sizes[Math.floor(sizes.length/2)],tasksWithOwnerId:ownerId,tasksWithOwnerName:ownerName});"
# 实测：{files:1738, withTeam:1722, total:379, nonEmpty:84, max:21, medianOfNonEmpty:4,
#        tasksWithOwnerId:344, tasksWithOwnerName:0}
```

### 3.1 owner 100% 缺失 ⇒ ~~BUG-026~~ **【已证伪，见顶部补正】**

真任务对象长这样（storage 里**有** ownerId，**无** ownerName）：

```json
{"id":"task-1","revision":3,"subject":"VP-Sales 出稿：SLA 对外承诺…","description":"slug=support-sla-page。…",
 "status":"completed","ownerId":"ed50c1ec-a6c7-451d-9dba-554cf7e04517","blockedBy":[],"writeScopes":[…]}
```

同文件的 `members[0]` = `{"id":"ed50c1ec-…","name":"vp-sales","phase":"active"}` ⇒ ownerId 可解，ownerName 没给。
上游 `projection.ts:321-332` 的 `teamTaskViewSchema` 是 `.strict()` 且**不含** `ownerName`/`ownerId`；
而 `task-view.ts:38` 的工具视图**带** ownerName——**两个形状，我们读错了那个**。

⇒ ~~「看板的正确性（板面 owner = 投影真值）能否断言」这个问题的诚**实答案是：真值为空，
渲染也为空——断言会假绿**。这就是为什么看板卡的验收标准必须**换底**（见 §五）。~~
**❌ 这段已证伪**：wire 视图上 owner 齐全，断言不会假绿。看板卡的验收标准**不必**因本条换底。

### 3.2 ready 语义被放宽 ⇒ ~~该根因~~ **【已证伪；症状真，真根因 = 徽章门槛，见顶部补正】**

```sh
node -e "
const {readdirSync,readFileSync}=require('fs');const dir='runtime/harness-home/storages/session_projcache/sessions';
let a=0,b=0;
for(const f of readdirSync(dir).filter(x=>x.endsWith('.json'))){
  const ts=JSON.parse(readFileSync(dir+'/'+f,'utf8'))?.record?.rows?.agentTeam?.val?.tasks;
  if(!Array.isArray(ts)||!ts.length) continue; const st=new Map(ts.map(t=>[t.id,t.status]));
  for(const t of ts){ if(t.status==='deleted') continue; const bb=t.blockedBy??[]; if(!bb.length) continue;
    if(!bb.every(id=>st.get(id)==='completed')) continue; t.status==='pending'?b++:a++ }}
console.log({wrongBadgeOnNonPending:a,legitPending:b});"
# 实测：{ wrongBadgeOnNonPending: 131, legitPending: 6 }
```

流程对照：官方 `ready = status==='pending' && taskReady(...)`（`task-view.ts:56`）；我们
`ready: task.ready ?? readyOf(blockedBy, statusById)`（`board.ts:193`）——`false` 是有效值却触发回落，
`readyOf` 又不看自己的 status ⇒ **131 张已完成的卡白带「依赖已就绪」**。

### 3.3 声明 vs 板面分叉（drift）在真数据上还活着

```sh
node -e "
const {readdirSync,readFileSync}=require('fs');const dir='runtime/harness-home/storages/session_projcache/sessions';
const RX=/依赖\s*[:：]?\s*((?:T\d+[\s、,，/]*)+)/g;let boards=0,withDrift=0,n=0;
for(const f of readdirSync(dir).filter(x=>x.endsWith('.json'))){
  const ts=JSON.parse(readFileSync(dir+'/'+f,'utf8'))?.record?.rows?.agentTeam?.val?.tasks;
  if(!Array.isArray(ts)||!ts.length) continue; boards++;
  const m=new Map(); for(const t of ts){const k=/^\s*T(\d+)\b/.exec(t.subject); if(k)m.set('T'+k[1],t.id)}
  let bad=0;
  for(const t of ts){ const text=t.subject+'\n'+(t.description??''); const d=[];
    for(const x of text.matchAll(RX)){const p=text.slice(0,x.index).trimEnd().slice(-1); if(p!==''&&'不无非勿未'.includes(p))continue;
      for(const tok of (x[1]?.match(/T\d+/g)??[])) if(!d.includes(tok))d.push(tok)}
    if(!d.length) continue; if(d.some(l=>{const id=m.get(l);return id===undefined||(!(t.blockedBy??[]).includes(id)&&id!==t.id)})) bad++ }
  if(bad){withDrift++;n+=bad}
}
console.log({boards,boardsWithDrift:withDrift,driftTasks:n});"
# 实测：{ boards: 84, boardsWithDrift: 2, driftTasks: 4 }
```

⇒ 分叉是**稀有但真实**的（2/84 板、4 个任务）——这恰恰是**频次低但代价高**的一类，适合**有判据后修**，
不适合"UX 轮顺带"。看板卡把它列为可抓的一类是对的，但应当**先把它变成断言**而不是等浏览器看。

---

## 四、只读码就能定性的渲染/文案事实

| 位置 | 事实 | 判定 |
|---|---|---|
| `CompanyView.tsx:102` | 看板/依赖图/在场三个子页都显示「每 5 秒刷新」 | **假的**：`useCompanyData` 是 `useSessions` 订阅（投影推送），前三个子页**无轮询**；只有培养线（`CULTIVATION_REFRESH_MS = 30_000`）有真实间隔。这是**文案说 5 秒、实际是推送**——与 2026-10-18 走查找到的"说 5s 实际 30s"是**同一类缺陷的第二个实例** |
| `board.ts:172-197` | `tasksFromTeamView` 丢 `deleted` 墓碑（`status === 'deleted' → continue`） | 看板与任务板都显不到已删任务；台账卡说"状态标签含**已删**"——`TasksPanel.tsx:16` 有 `deleted: '已删'` 这个映射但**永远不会命中**（truth 上 deleted=0，但一旦有就静默） |
| `company-panels.tsx:64-69` | `statusBadge`：pending ⇢「可开工」，in_progress ⇢「进行中」，都挂 `wk-dag-ready` 样式 | **同 BUG-027 族的文案问题**：一个 **in_progress** 节点的依赖若还没完成，"可开工"是错的措辞 |
| `company-panels.tsx:135-145` + `styles.ts:314` | `fitScale` 下限 0.75，**只按宽度**缩放；触底后由 `overflow-x: auto` 横滚 | **纵向不缩、不滚**：串行链 21 个节点 = 高 **2366px**（实测 `layoutDag`），纵向滚动由外层视图承担。窄栏下 `overflow-x` 会把 `overflow-y` 一起变成 `auto`——**依赖图页签会自带纵向滚动条，与整页滚动**双滚动 |
| `styles.ts:171` + `:179-191` | `.wk-row-name` `flex: 0 0 11rem`；`.wk-row-task` `-webkit-line-clamp: 2`（两行边界） | 台账行**已**有两行钳制 + 「全文」入口（`LedgerTab.tsx:66-98`）⇒ 台账卡的假设「无折叠/无筛选 ⇒ 993 行平铺」在**行长度**维度上**已被证伪**（每行是有界的） |
| `company-panels.tsx:101-133` | 看板无「列内折叠 / 计数上限」 | 最大板 21 条、三列分列 ⇒ **单列最多 21 张卡**，不是"21 连排"；规模压力远小于台账卡原先设想的 993 |

---

## 五、三张深挖卡的验收标准要换底（本轮最重要的结论）

> ⚠ **本节已失效（2026-10-19 A 收口）**：第 1 步的 golden 取法读的是 **state**，不是 wire；按此做会重犯 BUG-026。当前建议的验收方案见已结的 [看板卡](../../_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)（wire golden + 现有探针）。下文保留为错误样本，**不要照做**。

三张卡现在把验收压在"**板面 = 投影真值**"上。§三证明**真值本身缺 owner 字段、ready 语义被放宽**——
直接照卡里的写法去跑，**会跑出假绿**（真值也是"未分配"，断言"相等"通过）。

**正确的换底顺序（本文件建议的替代验收）**：

1. **先有 golden**：从 `session_projcache` 里挑 1 个最大板（21 条）与 2 个中板，把 `record.rows.agentTeam.val`
   **原样落进 `snapshots/`**，作为"真值"固定资产（不依赖运行时随机会话）。
2. **纯函数判据（keyless，不需要浏览器）**：`tasksFromTeamView(golden)` 逐字段 == 期望的
   `{id, subject, status, ownerLabel, revision, blockedBy, ready}`——**带 ownerId 的那种**。
   这一步就能抓住 BUG-026 与 BUG-027，而且**比开浏览器便宜一百倍**。
3. **浏览器只补"渲染层"缺口**：DOM 里的任务数/卡文案 == 纯函数输出（**不是** == 投影），
   这样浏览器断言就只测渲染，不再承担"投影到底长什么样"这件它测不了的事。
4. **刷新语义断言**改成读 `refreshLabel` 与 `CULTIVATION_REFRESH_MS` 这类**常量对照**——
   不需要浏览器也能定死；浏览器只验"文案真出现在页面顶"。

---

## 六、反证与限制（如实）

> ⚠ **本节基于 §三 的已证伪前提**：owner 全缺不成立（wire 273/273 齐全）。下面的 owner 推测保留为错误样本；当前结论见 [已结质量卡](../../_archive/settled_issues/2026-10-19-issue-card-quality.md) 与 [看板卡](../../_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)。

- **没开浏览器**：所有"长什么样"的结论都是读码推的，**截图证据一份没有**。上一份调研的口径
  （"未跑前全是假设"）依然适用。
- **owner 全缺有可能是开发 home 特有的**（例如这段样本全是探针/脚本会话）——但 1722/1738 会话都带
  `agentTeam`、344 个任务带 ownerId，**不像个别现象**。真机复核命令见 §三；若在真实使用 home 上
  ownerName 存在，BUG-026 降级为"开发期样本问题"。
- **"中位 0 vs 中位 4"** 的选择会影响"板子平均有多满"的判断；本文件两个数都给了。
- `projcache` 1738 份文件**全部解析成功**（本轮实测 `{parsed: 1738, bad: 0}`）；脚本里的 `try/catch`
  是防御性的，本轮没有跳过任何文件。
- 「纵向不缩、双滚动」那条是**按 CSS 推断**的（`overflow-x: auto` 会把 `overflow-y` 计算成 `auto`），
  **没有实测**——要实测必须开浏览器，本轮口径不许，故标为待验。
- 本文件**不主张**任何面板"该先做"；优先级判断见父卡。

## 七、可复跑脚本汇总

本文件内给出的四段 `node -e` 都是**只读**、**不需要 key、不需要浏览器**，直接在仓库根跑。
它们合起来就是本轮所有"实测"数字的来源；日后卡上的数字若要引用，应指向这里而不是重写一遍。
