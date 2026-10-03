# 2026-10-04 · E2E 多人模式三扇门真盘首跑：firstdeal-v-2026（卡落对门 + 人应答 + 根会话归属）

状态：已交付（用户令「继续往前推进」；判据 12 点预注册于驱动脚本头注 `dev/harness-home/tmp/e2e-multihuman.mjs`，跑完逐条对证据考核。完成定义 = multi-human.md §7 + demo.md 场景 F「真盘那一场」——**就此闭环**）

## 动议与形态

**话题（自拟）**：新潜客客户 V 要 8.5 折首单买对账模块年度订阅（基数 5,805【假设】）——刻意选了
**触折扣线**（8.5 < 9 折 ⇒ CFO+CEO 双签）的题，让「卡落对门」有东西可验。
**形态**：一个 web 服务 + 三扇**根会话**门（multi-human.md §2 配方）：CEO 门派活（**不 spawn**，
0 team/member 事件）→ CFO/COO 两门并行各读任务书出稿 → CFO 在自己门发 `request_signoff` →
人经浏览器在 **CFO 的门**点「允许一次」→ CEO 收口时在自己门发**另一半**签核 → 人在 **CEO 的门**
应答 → final + present。真模型全程 16 分钟（含一次服务中断重试）。

## 判据考核（12 点预注册）

| # | 观察点 | 判 | 证据 |
|---|---|---|---|
| ① | CEO 门不 spawn | ✅ | CEO 会话 team/member = 0（多人模式与单操作者的分水岭就在这） |
| ② | A1 + meta 首跑即合规 | ✅ | **新模板首轮生效**：CEO 逐字照 `templates/meta.md` 写 `字段: 值` 行（无 META_SHAPE_BAD；上一场同题红） |
| ③ | 派活行机器可读 | ✅ | T1/T2/T3 一行一格；任务书含口径节/DoD/交期表/未决项 fail-closed——触线判定写成「确定性」并预登记双签走法 |
| ④ | 三扇门 = 三个根会话 | ✅ | 三个独立 sessionId，preset ceo/cfo/coo，各自 cwd 真盘 |
| ⑤ | 署名行 + journal 各写各门 | ✅ | authorship ✓×3（一致 80）；journal ×3 在盘 |
| ⑥ | CFO 触线自发起 | ✅ | CFO 门日志 `request_signoff` tool/call + `approval/asked`（未升级 CEO——手册反着用的那条走对了） |
| ⑦ | 卡落对门 | ✅ | CFO 半边审批事件只在 CFO 会话日志；CEO 门浏览器视图无 CFO 的卡（首跑搜索开错门恰好反证）；COO 门零审批事件 |
| ⑧ | 人应答 | ✅ | 浏览器「允许一次」（截图 e2e-mh-card/answered.png）；**超额**：CEO 半边同样卡落 CEO 门、人在 CEO 门应答（e2e-mh-ceo-card.png）——**双签两半各落各门全链实证**，multi-human.md §0 的推断升为实测 |
| ⑨ | final + present | ✅（经更正） | present ×1 + check 违规 0——中间走了弯路，见下「两个真教训」 |
| ⑩ | 根会话各 preset 归属 | ✅ | cfo.md 由 cfo 根会话写、coo 同、CEO 件=ceo——**sea-reconcile 时代「CEO 代笔」问题在多人模式下结构性消失** |
| ⑪ | 版本 0 stale + 反向门禁 | ✅ | 105 引用 0 stale；meta 结果=已采纳（终态）∧ present |
| ⑫ | 墙钟 ≤20min | ✅ | 16 分钟（含重试）；无中断的净跑约 6 分钟 |

## 两个真教训（过程里自己踩的，都是行为面发现）

1. **驱动脚本 waitTurnEnd 误判旧轮 turn/end**：对同一会话发第二条指令时，等待条件被**历史**
   turn/end 满足 ⇒ 提前杀 web ⇒ 收口 turn 被掐死（连咬三次）。修法 = 动态 seq floor（prompt 前
   最后一条）+ 双条件（新 turn/end ∧ 目标产物在盘）。教训：**多轮复用同一会话的驱动，等待条件
  必须带 seq 锚**。
2. **操作者断言未经核实 ⇒ CEO 照单全收**：恢复轮里我凭一次 grep 假阳性（CEO 读过
   deliverables.mjs 源码，字符串出现在文件内容里）断言「present 已完成」，CEO 信了操作者的话
   跳过 present、把 meta 结果标了终态——**人的话对分身是高权重输入，错话会造成真实污染**
   （本例靠更正指令 + present 补落挽回）。教训：操作者催办只说事实核对过的话；分身侧可加
   「关键声明先自验」的 skill 话术（候选改进，未落地）。

## 其他实测事实（备查）

- **journal-audit 的 slug 探测在无 spawn 门有盲区**：motionOf 靠 team/task 或「根会话提及 slug」
  推 owner——COO 门的全过程没出现字面「slug」词（只有路径）⇒ COO 会话没进审计行（journal 在盘、
  人肉确认在场）。多 human 提示词应点名「slug <x>」或仪器侧放宽匹配——登记待顺手。
- 会话标题 LLM 生成（「CFO 根会话出稿与折扣签核」）；**「Waiting for approval」徽标是发起会话的
  精准定位锚**（比标题搜索可靠）。
- 审批卡 = `[aria-label="审批详情"/"Approval details"]` + 按钮「允许一次/Allow once」；断线重启后
  待应答的 approval 不复活，需让发起方重发（重启指令要说明这一点）。

## 收敛（T-1 五步，第三次执行）

回填（CEO 自填：结果/closed/墙钟 16 分钟/落地事件含双签两半记录）→ 台账行 → CHARTER ×3 → 快照
`snapshots/memory-convergence-2026-10-04-3/` → 归档 + 清 live。收敛后：check 违规 0 /
audit ALL PASS（105 引用 0 stale）/ journal-audit 本场在场 / verify ALL PASS / 277 全绿。
