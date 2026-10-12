---
topic: ceo-minimal-assembly
intent: "为组队健壮性三层防御卡提供证据基线：系统触点盘点、17 场组队行为全景、失败链、外部 andon/RACI 实践、判据形状结论"
---

# 组队健壮性三层防御 · 证据基线（2026-10-12）

> 消费卡：[_backlog/issues/2026-10-12-ceo-minimal-assembly](../../settled_issues/2026-10-12-ceo-minimal-assembly.md)。
> 本文只放证据与方法出处；结论与取舍在卡上。研究方法 = requirements-probes（外部事实 → research skill；
> 系统内事实 → 读码；人的选择 → 不在本文，留卡上收敛点）。

## 一、系统内触点盘点（读码结论）

| 触点 | 现状 | 缺口 |
|---|---|---|
| vendor agent-team 任务机制 | 任务有 **claim / complete / release back / reopen**，Lead 可指派；CAS 防覆盖；**无自动释放**（inactivity/interrupt/退出都不释放 owner）——`packages/experimental/agent-team/README.md`（77 与 209 行附近） | **release-back 机制现成**，第三层不用改 vendor；缺的是「什么时候该 release + 打回该带什么」的规范层 |
| one-shot 委派 persona（ceo/agent.cordis.yml:211+） | 已有**内容域内 veto**（「技术不可行……直接说不」）与「不替别的职能下结论」 | veto 管的是**内容**不可行，不管**分派**本身超域——「这活不该我接」无规范 |
| assembling-the-team SKILL | 已有「列不出对应问题的职能不进」「拿不准时少叫」「陪跑一律不叫」 | 弱条款：被「多域范围裁定」与「验收字段设计」合法绕开（负例见 §二）；缺**结构性硬测试** |
| chairing-staff-meeting | 明确「名单由 assembling-the-team 定，本 skill 不再定名单」；第 4 步互审无门槛 | 互审 = 重仪式，无「防哪个失效」的前置问题 |
| 公司手册「协作规矩」 | 「这事问谁」路由、不碰列、【待澄清】通道 | grep「打回/退回/拒单/超域」**零命中**——第三层通道在、义务与 norm 无 |
| 审计面 | authorship-audit / deliverables-check 盯产出形状 | 组队规模与打回行为无任何观察面（语义不做机械判定——只 probe 不 gate） |

## 二、负例全景（17 场主会话组队行为统计 + 失败链）

**系统性偏置，非单场失误**（session 日志实测，`runtime/harness-home/sessions/--…company-workspace--/`）：
17 场主会话中 **~15 场四职起手**（spawn_teammate ×4）；例外仅续约评估 ×3（cfo/vp-sales/coo 三职——
域匹配正确）与 Q4 评审一场（cfo+coo 两职 ✓）。更重的浪费形态：AI 改造研究一场 **spawn=10**
（vp-sales/vp-eng/coo 各 -2/-3 代际重生——名字不复用机制下的重复供给）。

**负例场（session-6cce7fb4，ai-coding-security-2026）失败链四事件**：

- **F1 推荐项不是最小项**：范围卡的推荐 = C（三职），最小选项 A（内部研发侧）摆在旁边但标注了
  「叫 VP-Eng+COO」——**连 A 都不是单 owner**（为什么研发侧安全自查要 COO？答案是验收字段：落地日）。
- **F2 菜单与执行不一致**：C 写「叫 VP-Eng+COO+CFO **三职**」，但范围 C 自带「交付面敞口盘点」工作项
  → 执行时 spawn 了 **vp-sales**（四职）。菜单算术与工作项清单矛盾，用户按「三职」理解、按四职被扣费。
- **F3 无打回**：VP-Sales 收 T5（依赖：无、当天并行）零域内质疑、认领出稿 v1；CFO 同。第三层缺失。
- **F4 验收字段预订**：产出 B 的格式（每条带 owner/成本/落地日）在写任务书时就把跨域职能结构化进屋——
  字段需求 ≠ 该域必须全职在屋（初稿可由核心 owner 填、跨域值标「待确认」）。

值得保留的好行为（别一刀切掉）：CEO 开场三张卡澄清（范围/产出/钱）本身是对的；VP-Eng 发现
SSH 私钥可读后**升级用户**再行动（两张追加卡）是对的——问题只在组队规模与菜单算术。

## 三、外部实践（出处）

- **Andon（丰田 TPS）停线权**四原则（[Toyota TPS 官方](https://mag.toyota.co.uk/andon-toyota-production-system/)、
  [IndustryWeek: Leadership's Response Is the Critical Part](https://www.industryweek.com/operations/continuous-improvement/article/55394935/andon-is-a-signalbut-leaderships-response-is-the-critical-part)）：
  ① 拉闸权属于**每一个**操作工，不限资历；② **响应协议是关键**——拉闸必须得到标准、及时的响应
  （班组长限时到场），响应缺失 = andon 失效；③ **不追责假警报**——拉了没卦也要欢迎，惩罚拉闸 = 拉闸
  停止（静默产线）；④ 目标是快速遏制，不是 fault-finding。
  → 映射第三层：打回权给每个成员；CEO 对打回**必须有标准响应**（回收/重派/收窄三选一明说）；
  打回不追责、不计产出污点；打回的目标是纠错不是评判 CEO。
- **RACI** 的启发（[RACI 实务讨论](https://www.benchmarksixsigma.com/forum/profile/118017-venugopal-r/content/page/3#4)）：
  A（Accountable）唯一——每任务一个 owner 已是本仓规矩（单一 owner）；R（Responsible）被指派者
  对「这该不该我做」有**说 no 的位置**，否则 A 的错误无人纠正。
- 医疗业 stop-the-line（[Press Ganey](https://www.pressganey.com/docs/default-source/industry-edge/issue-11---december/is-it-in-you-to-stop-the-line-for-safer-care.pdf)）：
  停线权落地的第一杀手是**心理安全**——拉了会被记恨，就没人拉。→ 规范文本必须显式欢迎打回。

## 四、探针不可复现红的发现（方法边界）

`probes/session-context/ceo-assembly-probe.mjs` 两轮形状（轮 1 裸问给思路 / 轮 2 裁定+开工）对旧 skill
两跑均 **0 spawn、路由 VP-Eng**。对照 live 负例（四职），差异 = 真人交互是**多轮范围裁定 + 选项菜单 +
用户逐卡作答**（6cce7fb4 实录 5 条 user/message + 3 张卡），短探针压缩了裁定链 ⇒ 组队决策的关键输入
（用户选了哪个范围）没进探针。**判据形状结论**：可红判据必须复刻「选项菜单 + 用户逐卡作答」的交互
（探针 scene 加菜单轮，或录制场景），单轮裸问法证不了第一层。

## 五、给落地设计的输入清单

1. 第一层落 assembling-the-team：菜单必含**单 owner 起步项为推荐默认**（固有跨域动议如资本/对外承诺
   除外，需点名清单）；**菜单算术一致性**（选项写的在屋名单 = 该选项工作项的 owner 全集）；字段≠入屋。
2. 第三层落成员侧：域内核对义务（收到分派先问两件事：我的域？判据给我了吗？）+ 打回三件套 +
   vendor `release` 机制承载（认领后 release / 未认领直接打回）+ andon 三原则进规范文本。
3. CEO 侧「收打回 = 纠错信号」处理句进 assembling-the-team（响应三选一 + 不追责）。
4. 判据：菜单算术一致性可机械核（探针断言 spawn 名单 ⊆ 选中选项名单）；打回行为 = 真模型 probe
   （给成员超域任务，断言打回三件套）。
