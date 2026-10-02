# 2026-10-02 · 消化对账与整改轮：_digested 0009 同 pin 后拿新尺子对账本仓

状态：implemented（用户点名："读新消化、反省哪些做得合理/不合理，尤其充分利用 DSH 插件"；goal 制两阶段——深挖核实 + 落地整改）

## 动机与总评

外部研究树 `_digested` 0009 轮把审计基线升到 `dsh-v0.2.0-rc.2`（与本仓 vendor pin 同 commit），新增
plugin-inventory（316 包货架）/ orchestration-ladder / capability-seams / harness-idea 专题与 FAQ
16/17（preset 三轴 / 找现成插件四步）。拿新尺子对账本仓的结论：**借用的"道"全部吻合**——入口形态
（preset + bundle patch、零新可执行入口 = FAQ 13 事实契约）、repo 形态（方案 A + pinned submodule）、
不发明纪律（D13/M2 停手/上游 seam 正路）、D32 队列整层退役（orchestration-ladder 09 页反证"中心
Task DAG executor"外部叙事）、harvest 收割姿势（FAQ 17 四步 = 出路一/二的教科书应用）；整改集中在
四处"到达面"缺口（簿记漂移 / 机制事实没到成员合同 / config 无意识漂移 / child 面无守卫）。

## 交付

1. **簿记修正**：AGENTS.md §vendor 簿记与 docs/index.md 登记行的 `_digested`"审计基线落后一代"注记
   → "0009 轮起同 pin"（2026-10-02 核对其 00-index 声明）。
2. **组合继承事实升为公司手册合同级**（company-workspace/AGENTS.md 协作规矩新条目"组合继承"）：
   spawn 成员继承 Lead 组合、角色身份靠成员名与任务书、方法论从 CHARTER/KB 文件读、多人模式例外。
   机制 owner 不动（roles-isolation §2/§4 + delegation.md §4），手册只收操作指令——"一处事实一个家"。
3. **agent-team 行 config 钉值**（cordis.patch.yml）：镜像官方 agent-team-profile patch
   （maxMembers 8 / maxTasks 256 / maxPendingMessagesPerMember 64 / maxMessageBytes 65536 /
   disposalTimeoutMs 5000 + freshProvider/forkProvider）——修复"裸 insert 无意识吃代码默认
   maxMembers 16"的漂移；8 顺带成为编制守卫（kb/org.md 超编的 spawn 在服务层被拦）。
4. **delegation-smoke [3] child 面守卫** + CEO preset 两份委托 persona 各加一行"别碰 team 工具"
   （防线）+ delegation.md §4.1/§6 与 pack README 已知限制段同步记账。
5. **升 pin 人审合同加两项**（docs/release.md）：experimental 行重校（对照官方 optional bundle
   patch 逐字段）+ 货架过账（plugin-inventory 对照，判收四档入台账 Note）。
6. 另修一处文档漂移：cordis.patch.yml 的 schedule 注释仍在描述**被证伪**的"pack dependencies ⇒
   reconcile 自动启用"路线（harvest Note §输掉的方案早已撤销、package.json dependencies 为空），
   改写为真实的 profile 级手动安装形状。

## 本轮新钉的机制事实（实证，出处 = 2026-10-02 真跑日志）

- **one-shot child 目录暴露 Team 工具为真**：child 会话 request/header 41 个工具，含全部六个 Team
  工具（spawn_teammate / team_task_×4 / wait_agent），且 child 会话头 `agentPreset: ceo`——上游
  README "One-shot child tool visibility" 限制与组合继承（composeFrom）在同一份日志里各自坐实。
- **child 定位载体 = `subagent/catalog`**（parent-owned direct-child 目录：`data.childId` 裸 UUID +
  `data.mode`）；本次真跑 CEO 日志里**没有** `subagent/start`（首版探针因此静默跳过——守卫必须把
  "定位不到"也当红）。读 child 日志必须用 subagent 地址（`{kind:'subagent', parentSessionId,
  childSessionId, mode}`）；裸 child id 被 session/page 拒绝："subagent Sessions require their
  durable parent address"（vendor session-controller/src/history.ts:349）。
- 探针首版两处实现错误全被真跑抓出（silent skip + 裸 id 拒绝）——"完成定义 = 真检查"的又一实例；
  仅靠 verify/test 全绿会带着坏守卫上线。

## 输掉的方案

- **独立 child 探针脚本** vs 挂 delegation-smoke `--delegate` 档：输——档内已花 2 prompt，child
  读取是纯日志操作零增量成本；独立脚本徒增一个认证档脚本。
- **断言"child 调 Team 工具被拒"**（更硬的语义）：输——依赖模型配合（child 得真去调用才有被拒
  证据），每跑多一轮且可能假阴性；先钉目录形状（确定性事实），"调不通"由 README 登记 + persona
  防线兜底。
- **组合继承事实落 pack README** vs 公司手册：输 README——README 是开发者面，成员会话读不到；
  手册是随会话注入的运行合同，"别假设角色 skill 能加载"的操作指令属于那里。
- **maxMembers 钉 16**（维持代码默认）：输——与官方组合对齐 + 编制守卫收益；8 对五角色 + 3 worker
  余量已足。

## 验证（实际跑过）

`pnpm verify` ALL PASS；`pnpm test` 251 passed（28 文件）；`preset-smoke` ×2（config 钉值后 +
persona 改后，五角色真挂载 ALL PASS）；`delegation-smoke --delegate --wall 300` ×3（前两跑分别暴露
silent-skip 与裸 id 拒绝两处实现错误，末跑 ALL PASS 含 [3] 守卫输出："child 目录 41 个工具：Team
工具在场 ×6"）。**收尾另按用户要求（"测完要拿证据"）全套复跑一轮留证**：verify / test（251/251）/
preset-smoke / delegation-smoke --delegate（含 [3] 守卫输出）四项各一次、全部 exit 0，原始输出已随
汇报原文呈交（2026-10-02 22:40–22:50）。

## 未完成与下一步

- **feedback 家族收割**（message-feedback / ui-message-feedback 出厂已挂零消费 + command-feedback，
  喂培养回路）= 推敲卡 [_backlog/plans/261002-feedback-channel-cultivation.md](../../_backlog/plans/261002-feedback-channel-cultivation.md)
  （毕业门 = 消费面选型/语义权重/demo 叙事三问）。
- 中档货架候选（web-search-exa、session-log-export、session-title-llm、inspector）登记在该卡附录，
  触发条件各自成立再议。
- 货架对照的完整"已用/排除"清单不复制进本 Note（防漂）——判收台账唯一源 =
  [harvest-round](./2026-09-30-plugin-harvest-round.md)，本轮结论是其残留面续查。

## 复盘一问

本轮把一条 agent 间口口相传的未成文规则（"升 pin 时要对照官方 optional bundle patch 核直插行"）
升格进了 release.md 人审合同——规则不再留空气。

## 第二轮（同日晚，用户追问"是否充分利用/是否同步最新/有没有更好的"——逐行 diff + 货架两遍复核）

**同步性（硬证据）**：`git ls-remote --tags` 核对上游——最新 tag = `dsh-v0.2.0-rc.2`（`639ed015`），
与 vendor pin **完全一致**，无更新的可同步。

**standard 逐行 diff（五 preset vs `vendor/.../standard.patch.yml` 全文对照）**：id 级与 config 级
全部对齐或有据例外——`sampleOverCapGlobResults`/`allowParallelInProgress`/`tool-web` config 逐字一致；
有据排除 = bash/pwsh（harvest 刻意排除档）、subagent-codex/claude-code（D16 同模型）、ralph（standard
自己也 disabled）、plugin-manager（standard disabled 行）；有据增强 = tool-cordis（09-25 收割轮
6c8582e 台账切片一，**有决策记录**——第一遍 grep 错 Note 曾误报"无记录"）、tool-session-query
（批2）、browser-use（批5b）。两个真缺口：① `tool-subagent` 行缺 standard 的
`modelSelectionSettings: true`（harvest 批1"照抄 standard"在该字段不成立且无记录）→ **已补齐**
（五 preset，D16 由 settings 侧保证、此字段接通不影响）；② 见下。

**发现并修复一个活 bug：手册注入静默截断（本轮最重要的产出）**。preset `agent-instructions.maxBytes`
钉 16384（0fc43ca 落地时手册仅 1,232B，13 倍余量），手册长到 17,417B 后**成员会话从「问询节流」中句
起整段丢失**（"工作纪律"节从未注入——真实 CEO 会话日志实证，截断点精确定位）。三层防线为何全没抓住：
行数栅栏管不到字节；09-28"maxBytes 两端核对"查了 overlay 层漏了 preset 层；README 限制行只把"改小会
静默裁"当假设警告。修复 = maxBytes 升 32768（五 preset，行内注释）+ **verify 新门禁 `handbook-budget`**
（手册字节 + 1024B ≤ maxBytes，五 preset 同值）——**负例 = 该 bug 自己的出生现场**（门禁首跑即红在
活 bug 上，修后转绿），红→还原→绿三步齐。修后真会话实证：手册六处特征句（首节→最后一行）全部 IN。

**货架两遍复核（第二遍逐 vendor 实路径、关键断言维护者抽验）**：第一遍的"feedback 家族 = 唯一高档
增量"实为**误判**——message-feedback/ui-message-feedback（web-app:69-70,381-382）、command-feedback
（base:310-311）、session-log-export、session-title-llm 均出厂已挂，不是增量是**无人消费**；真 opt-in
包增量只剩 web-search-exa（中档维持）。新发现两个零成本消费候选：contextPressure/contextBreakdown
投影（token-meter usage-projection.ts:173-218，补用量页签 compaction 预警）与 modelSelection 投影
（session-controller model-selection-projection.ts:58-82，在场/用量页签显成员模型）。推敲卡已改写为
修正版（消费决定卡：D1 消费面/D2 语义权重/D3 接入时机）。

**第二轮验证（实际跑过）**：verify（handbook-budget 首跑 RED 于活 bug → 修 preset → ALL PASS）；
preset-smoke ALL PASS（maxBytes + modelSelectionSettings 改后五角色真挂载）；delegation-smoke 基档
ALL PASS（新 CEO 会话）；该会话日志六特征句全 IN（截断已消除）。

**第二轮输掉的方案**：为截断修法备选"删 preset 显式 maxBytes 回落 dsh 默认 65536"——输：显式钉值 +
门禁是"预算是有意识决定"的载体，回落默认反而把决定权还给上游漂移；"瘦身手册至 16KB 内"——输：手册
内容全数有效（09-26 起每条都有实验/实测依据），砍事实省预算方向反了。
