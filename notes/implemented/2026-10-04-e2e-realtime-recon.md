# 2026-10-04 · E2E 自主动议 realtime-recon-2026：多角色全链路 + feedback 👍 点击呈现验证

状态：已交付（用户令「静默自主执行、自拟题目、多角色、测试靠证据、review 证据」；判据 13 点**跑前预注册**于驱动脚本头注 `dev/harness-home/tmp/e2e-motion.mjs`，跑完逐条对证据考核——见下表）

## 动议与驱动

**话题（自拟）**：客户 X（9 家存量客户之一、对账模块老客户）提出「实时对账 + 月度财报自动生成」
增值包——12 个月 / 45 天上线 / 年费 +25%，要不要接、怎么接。选它的理由：一条动议同时需要四职能
判断，且与既有场景宇宙连续（客户 X = 场景 B/E 的老客户，KB 里有续约案 5,805 价格线）。
**驱动**：维护者经 web API 开 CEO 根会话（`session-320aceed`，cwd=真盘），单操作者模式，真模型
全程 **6 分钟**（460 事件；spawn ×4 = vp-sales/vp-eng/coo/cfo；T1–T7 七格派活行全 CAS 链）。

## 判据考核表（13 点预注册，证据逐条）

| # | 观察点 | 判 | 证据 |
|---|---|---|---|
| ① | A1 命名（注入真日期建目录） | ✅ | `deliverables/2026-10-04-realtime-recon-2026/`（无占位） |
| ② | meta.md 开局字段 + validateMeta | **△ 首跑红** | CEO 写了内容齐全的 meta 但用 markdown 加粗列表（不合 `字段: 值` 词表行）⇒ `META_SHAPE_BAD` 红；维护者收敛时机械转合规（原稿全文保留在 meta 内备查）。**根因 = 手册只说「形状机器可查」没教字面格式**——改进项见下 |
| ③ | 任务书派活行机器可读 | ✅ | T1–T7 七行全在；瑕疵：T5 重复一行陈旧「待办」（状态对齐漏一行，不判红、登记） |
| ④ | 真团队 spawn ×4 | ✅ | CEO 会话 team/member ×4（成员名 vp-sales/vp-eng/coo/cfo） |
| ⑤ | 任务板 CAS | ✅ | team/task pending→in_progress→completed 全链（T1–T7 共 22 条状态事件） |
| ⑥ | 成员稿署名行 | ✅ 5/6 | 5 份带 `出稿：<角色>｜版本 vN｜任务书=…`；**cfo.md 缺署名行**（正文有「出稿」字样但非规定格式）⇒ audit 判「无署名」观察档，登记 |
| ⑦ | 互审稿 ×2 | ✅ | vp-eng-review / vp-sales-review，只出意见不改稿（coo/vp-sales 各升 v2） |
| ⑧ | final + present 反查 | ✅ | present 事件 ↔ 盘上 final 身份对上；check 违规 0 |
| ⑨ | journal 收工留痕 | ✅ | 五角色各一篇；journal-audit 判在场（收敛后=已归档） |
| ⑩ | authorship-audit | ✅ | 本场 7 稿全「一致」（一致 70→77）、署名不实 0、新引用 0 stale（102 处全对） |
| ⑪ | 反向门禁零红 | ✅ | present ∧ 结果=已采纳（终态）——新门禁首场即合规（meta 归一后） |
| ⑫ | 轻任务墙钟 ≤30min | ✅ | **6 分钟**（460 事件） |
| ⑬ | **👍 点击呈现**（D1 遗留缺口） | ✅ | 真浏览器 7/7：点 👍→「提交反馈」弹窗→提交；wire = 会话日志 `feedback/message-put` positive；DOM = 培养页签「赞踩清单」出现「👍 赞」行；截图 `dev/harness-home/tmp/e2e-feedback-{before,after}.png` |

## 考核（角色质量，判据外的主观面）

- **CEO**：口径先行（预答三问写进任务书 §0 全员共用）、派活行/依赖/CAS 全对、分歧保留 5 条
  （D1–D5，vp-sales「主卖 B」与 CEO「A 先行」的分歧没被抹平）、未代笔。
- **vp-eng/coo**：veto 用得准（范围-工期组合 veto + 限定 veto，对象具名、不针对客户）；
  vp-eng 的「字段口径冻结=头号差距」直接引用了 emergency-x 事故教训——**跨动议组织记忆生效**。
- **cfo**：数字带【事实/假设/算式】标注、零美元数不给过/不过（毛利线不可判的 fail-closed 正确）；
  瑕疵 = 稿首署名行格式。
- **vp-sales**：谈判序列五步 + 「9 折锚是负价不报不背书」——先例引用正确。

## 本轮 E2E 抓到的三个真实缺陷（都已处置）

1. **52ca6a7 的 client 面从未构建**：`tsc -b packages/company-pack` 在 cultivation.ts 三处类型错
   （TS2352/TS2379）——自该提交起 pack client bundle 一直是旧的，上轮「client-load ALL PASS」
   验的是旧包（培养页签「人的赞/踩」块缺席，呈现即验证当场抓到）。修 = isItem 收窄改 ItemShape
   （note 保持 unknown，消费侧窄化）+ 双步重建；行为面 9/9 不变。**完成定义教训：client 面改动
   的完成定义必须含 tsc -b + tsdown 双步真跑**（bootstrap 有写，52ca6a7 没跑）。
2. **headless 无客户端时 ask_user_question 挂起**：首跑 CEO 按纪律开场三问（问得很好：基数/口径/
   45 天性质），但无浏览器客户端接卡时 >10 分钟不 settle（工具默认 timeout 120s 未生效——
   证据 `dev/harness-home/tmp/e2e-stall-evidence.jsonl`）。**操作者驱动动议的章程必须带「不要提问，
   缺事实按标准档假设并写明」**（前轮 motion2-full.mjs 已有此条款，本轮重跑前应先读它——教训）。
3. **meta 字面格式无教学面**：手册/模板都没写 `字段: 值` 行格式，CEO 只能即兴。改进候选：
   `templates/meta.md` 模板一件（待下一轮顺手，涉及 CEO skill 引用）。

## 其他实测事实（备查）

- 会话标题由 `session-title-first-prompt-llm` 生成（「实时对账增值包动议」）——按标题搜会话要用
  生成标题，不能用首条消息前缀。
- UI locale 默认英文（aria-label = 'Good response'/'Submit feedback'）——浏览器断言选择器要双语。
- 已存在 positive 评分时 👍 按钮态变 'Remove rating'，再点 = 撤销（retract）——自动化脚本必须
  先查 aria-pressed。
- 幂等实测：同消息同评分重复 put 不追加事件；不同消息各记一条（本场 ×3 positive）。

## 收敛（T-1 五步，第二次执行）

回填 meta（维护者归一）→ 台账行（墙钟首次记实测 6 分钟）→ CHARTER ×5 纪要 → 快照
`snapshots/memory-convergence-2026-10-04-2/`（迁移前切片：五 journal + 全部交付物）→
归档 + 清 live（活跃根归零）。收敛后：check 违规 0 / audit 一致 77·0 不实·0 stale /
journal-audit 本场在场（余 1 条缺席 = emergency-x coo 既有历史账）/ verify ALL PASS / 277 全绿。
