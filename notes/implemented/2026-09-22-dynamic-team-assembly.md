# 2026-09-22 · 按问题组队（CEO 的团队成型方法）

状态：**已消化（2026-09-22）**——双向行为对照两场全过（两职能不超编 / 四职能不漏人），
本文件从 `notes/proposed/` **毕业**到 `notes/implemented/`。实现与实测见
[implemented/2026-09-22-team-assembly-and-rehearsal-split.md](./2026-09-22-team-assembly-and-rehearsal-split.md)。
归属：轮间待办①（R4 收尾后做，不占轮）；兼作 R6「分身成长」的 U1 活体探针实操（**R6 前置全清**）

## 背景（用户原话）

> “CEO 不需要每件事情都让 4 个手下忙……我就是想让一个问题的动态团队出来。”

现状是**团队不随问题成形，随演示需要成形**：R2 那场动议是为了展示全员才选的（一条动议同时要四个
职能判断）、场景 B 用 3 个、R4 场景 C 用 2 个——**三次的名单都是人的选择**。R4 场景 C 最直接：那份
prompt 里写着“用 `spawn_teammate` 拉起 vp-sales 与 coo 两位（**只要这两位**）”——**是人在当 CEO，
不是 CEO 在当**。

## 依据（实际查过）

- **CEO 只有 1 个 skill**，而 [design/role-content-plan](../../docs/design/role-content-plan.md) §1 原计划 3 个：
  `chairing-staff-meeting` / `task-decomposition` / `synthesizing-deliverables`。后两个从没做。
- 现有那个 skill 的步骤是：澄清 → **拆解分派（DAG）** → 追进度 → VP 互审 → 收口 → 记账。它
  **从“DAG 拆解分派”开始，默认已经决定要开会了**；标题还叫“（R2 五角色版）”。中间那句“需要谁
  开工就 `spawn_teammate` 拉起谁”给了**职能路由**（技术→VP-Eng、市场→VP-Sales、落地→COO、
  钱→CFO），但**没有任何一步在问“要不要叫人、叫几个、走哪条通道”**。
- 职能路由已有三处重复载体：该 skill 步骤 2、`company-workspace/AGENTS.md` 的「这事问谁」表、
  CEO persona 的两条路规则。⇒ 新 skill **必须把这块责任搬过去，不能并存**，否则 CEO 会拿到两条
  互相覆盖的指示。
- 成本是真的：每个 teammate = 真模型调用；`kb/org.md` 有 AI 试点每案 $200/月硬顶，
  [guides/dev-loop](../../docs/guides/dev-loop.md) §10 立了“自动化只许轻任务”。让 CFO 陪跑一个与钱
  无关的动议，是要付钱的。

## 提案

新增 CEO skill（名字建议 `assembling-the-team`，按问题组队）——内容五步：

1. **先问“要不要叫人”**：纯 CEO 职权（立项 / 砍项 / 优先级 / 对外口径）自己拍，不拉人；
2. **要谁**：按“这次动议要回答哪些问题”列职能（对照手册路由表），**列不出来的不进**；
3. **不叫谁也写下来**（避免事后“怎么没问财务”）——与“分歧保留”是同一种诚实；
4. **走哪条通道**（现在最容易混的地方）：
   - 只要一份单职能稿 → `vp_eng` / `vp_sales`（one-shot 前台，**最便宜**）
   - 多职能判断 + 互审 + 要反复追加意见 → `spawn_teammate`（team）
   - 单职能但要来回改 → 也是 team（成员持久）
5. **定 slug**（交付物三态，R4 的合同）。

**两处配套**（缺一则 skill 不会被加载、或被架空）：

- **persona 加挂钩**，且**排在 `chairing-staff-meeting` 之前**——先定这间屋子有谁，再主持；
- 把 `chairing-staff-meeting` 步骤 2 的职能归属**搬进新 skill**，并去掉标题里的“R2 五角色版”。

## 验收判据

行为验收（**不听它怎么说，看它叫了几个**）：

1. **不许超编**：给一个只涉及两个职能的动议，prompt **不提任何名单** ⇒ 只拉起那两个；
2. **不许漏人**：给一个确实需要四个职能的动议 ⇒ 四个都到，没漏；
3. **不叫谁要有理由**：CEO 会话里能读到“这次不叫 CFO，因为……”；
4. 产物落 R4 的三态判据：`node scripts/deliverables-check.mjs` 0 违规。

只跑第 1 条不够——那分不清“会挑”与“一律少叫”。**必须双向对照。**

## 输掉的方案（为什么不做成别的东西）

- **不做“总控调度器”**：那要自建机制（D13 禁止）。DSH 现成载体就是 skill（按需加载的方法）+
  persona（身份与开工动作）；模板即流程（design/role-content-plan §0.4）的同一个思路。
- **不塞 R5**：R5a 是门禁与发布、R5b 是驾驶舱，都不属于任何一半；且 **D19 刚为"同轮塞太多面"
  把 R5 拆开**，往收尾中的 R4 或已拆的 R5 里塞新能力是同一种错。
- **不叫 R4.5**：数字该跟着主题走（D10 同理）——R4 的线是成品流程，这件事是 CEO 内容面；且它
  没有新合同出生（复用现有认证档），不具备“一轮”的形状。
- **不做“每个职能一个常驻成员”**：那正好是这次要消灭的——团队该随问题成形。

## 风险与未决

- **persona / skill 是 advisory，不是确定性**（见
  [implemented/2026-09-22-agent-workflow-community-practice](../implemented/2026-09-22-agent-workflow-community-practice.md)
  与 D15）：所以验收落在“叫了几个”的行为上，不落在“文件写得好不好”。若两场对照仍不达标，退路是
  把判据机械化（从会话日志读 `team/member` 事件数做 keyless 断言）——**但那要等行为先稳定**，
  别本末倒置。
- **手滑方向是“少叫”**：可能把该问的职能省掉。第 2 条对照就是防这个的。
- **它顺带解掉 R6 的阻塞项**：R6「分身成长」的验收是“改 `presets/<role>/` → 三道门禁 + 该角色探针
  全绿、旧会话不受影响”，阻塞项是“只差一次活体探针（改一次 `SKILL.md`，看新会话是否生效）”。
  本项**就是**那次实操 ⇒ 做完在 roadmap 里把 R6 的阻塞项划掉。

## 条目去向（2026-09-22 毕业时补）

| # | 条目 | 去向 | 证据 |
|---|---|---|---|
| 1 | 新 skill `assembling-the-team`（五步） | ✅ 已交付 | `presets/ceo/skills/assembling-the-team/SKILL.md`；重装后 preset-smoke 挂载 PASS |
| 2 | persona 挂钩（排在 chairing 之前） | ✅ 已交付 | `presets/ceo/agent.cordis.yml`（含收紧句“名单里没有的职能一个都不叫”） |
| 3 | 职能归属从旧 skill 搬走（不并存） | ✅ 已交付 | `chairing-staff-meeting` 步骤 2 改指 assembling-the-team；标题/描述去“R2 五角色版” |
| 4 | 验收 1 不许超编 | ✅ PASS | 第一场：无名单动议只拉 vp-eng + coo |
| 5 | 验收 2 不许漏人 | ✅ PASS | 第二场：四职能全到 |
| 6 | 验收 3 不叫谁有理由 | ✅ PASS | “动议没问，所以没叫这两个职能，不为稳妥陪跑”写入 CEO 正文 |
| 7 | 验收 4 三态判据 0 违规 | ✅ PASS | 排练场 2 成品 / 11 过程稿 / 0 违规 |
| 8 | 风险条“不达标退路机械化判据” | 未触发 | 措辞迭代一次后行为即达标（implemented Note“判据外的实证收获”） |
| 9 | 顺带：U1 活体探针（R6 前置） | ✅ 完成 | 三档之②“只有新会话变”，research/digital-twin §5.5 |
