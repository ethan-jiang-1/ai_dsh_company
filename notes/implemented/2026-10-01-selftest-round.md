# 2026-10-01 · 0.2.0 升级后全面自测轮：门禁 sweep + UX 走查 + 语义矛盾清剿

状态：已交付（用户点名「自测所有可能性，尤其交互与 UX」；round 起于 09-30 深夜、收于 10-01 凌晨）。
机械门禁 **18 项全绿**；UX 走查 **零产品级异常**（console 零 error 贯穿四轮）；语义矛盾探针跨 5 轮
**揪出 7 条真矛盾，全部修复**。commit：本 Note 连同修复同 diff（见 §修复清单）。

## 方法（三线）

1. **全门禁 sweep**（21 步顺序后台）：keyless 档 + 真模型档 + 交互探针，全在收割轮收口后的 HEAD。
2. **UX 走查 ×4 轮**（playwright 对运行中观察窗）：8 公司页签逐个开+快照 / 会话搜索 / 侧栏文件树 /
   设置域深走查（Plugins 页 + Automation tasks 页）/ 插件页 schedule-bundle 面 / 380px 窄视口 /
   首启双模态 / console 全收集。方法坑两处（v1 没处理 Start-chip 回切、⑧ 断言恒真）——**走查脚本的
   方法坑不是产品 bug**，v2/v4 修正后全过。
3. **entry-probe 语义矛盾探针 ×5 轮**：真模型读入口链文档找自相矛盾——真正的漏适应收割机。

## 结果 A：门禁 18 项全绿

`verify` / `test` 251 / `preset-smoke` 五角色 / `deliverables-check` 0 违规 / **`cross-process-fs-probe`**
（头注明令升 pin 后必复跑——fs 语义变了要知道）/ `dag-visual-probe` 12 判据 / `client-load` /
`replay` r3+r2 / `snapshot-motion` / **`time-context-probe`**（批3 改了组合行——复跑绿）/
`member-inquiry-probe` REFUSED（预期：成员被机制拒，与审批侧同结论）/
`handbook` / `delegation` / `presence-e2e` / `probe ping` 5/5 / `attention-e2e` 7/7（审批全回路）/
`budget-signoff` 双向对（$500 线不发审批、报价线发）/ `human-loop-e2e` 12/12（三类人机接口真证据）。

## 结果 B：UX 走查零产品级异常

8 页签（待办/用量/看板/任务板/依赖图/台账/在场/培养）逐个开+渲染 ✓；会话搜索（占位符+结果树）✓；
侧栏文件树（0.2.0 新交互）✓；设置域含 **0.2.0 新 session-log 页** ✓；**Plugins 页 schedule-bundle
开关面** ✓；**Automation tasks 页 = ui-schedule 任务页**渲染 ✓；380px 冷启动零横向溢出 ✓；
**console 零 error 贯穿四轮** ✓；首启双模态（Internal Testing + Preview Notice）✓。
已知边界登记：ui 金样的 Usage/Think 易腐值已掩码（replay-smoke）；跳过的面 = 真浏览器端到端
（ui lane 已覆盖委派卡）与浮窗重走查（09-28 轮刚做过、无相关改动）。

## 结果 C：抓到并修复的漏适应（本轮真正价值）

| # | 漏适应 | 修法 |
|---|---|---|
| 1 | **date-rule-probe + CEO skill 日期口径仪表反挂**：通道上线改了手册，但 skill 记账步仍教占位、probe 仍把「写真日期」判红——模型收到冲突指令跟了手册，被旧探针判红 | skill 记账步翻新（写真日期/故障 fail-closed）；probe 判据翻新（文件名=今日注入日期 PASS、占位 FAIL、问人 FAIL）；复跑 **PASS** |
| 2 | entry-probe 五矛盾之一：pack README 已知限制仍写「只对 0.1.7-rc.2 验证过」——**且 pin-currency 没扫到**（行内 `pack-compat` 撞历史标记词 `compat` 的豁免） | README 更新为 0.2.0 已验证；标记词假阴性登记（entry-probe 兜住了，门禁不扩） |
| 3 | dev-loop 两处 rejected/ 两套说法（§0.5「没有目录」×§12「不单开」vs D30 设立 + 目录在场 + 三处引为现存出口） | 两处都对齐 D30（§0.5 括注、§12 否决理由去留） |
| 4 | docs/index 任务源行自相矛盾（同句先说磨活是当前任务源、又说已整池退役）+ 公司手册裁决回流仍指磨清单 | index 行改「已批 RFC + 用户点名，磨活走推敲卡」；手册回流落点去掉磨清单（公司角色也写不了 dev 仓） |
| 5 | proposed/README 门禁描述仍写「队列索引行」（D32 已改查批准标记） | 对齐 D32 |
| 6 | **日期通道推敲卡「半实施状态」节全过时**（三方错位已全修，卡面仍以现役口吻描述；plans README 索引行同） | 卡盖「已收口」章（历史论证保留）；**唯一剩账 = 机制启用未经 RFC 批准（追认待用户）**；索引行同步 |
| 7 | 二层事实漂移 ×4：delta 报告躺在已退役的 notes/research/（毕业 → archived/，三处引用同步）；docs/index `_digested`「= 钉住 tag 基线」vs 簿记「落后一代」；D32 行与退役 Note 的搁置池路径未随二次归档更新；longrun-goal-shape Note 输入源未随 D32 更新 | 全部按「implemented/index 只跟事实」修（毕业搬移 + 引用重接 + 路径注记 + 事实更新行） |

**entry-probe 检查器两处保真改进**（失分主因定性：模型转抄噪声，错位题目逐轮轮换、分数恒 10-11/12）：
① 引文首尾 `…` 截断容忍（剥掉后仍逐字包含——截断前缀同样是原文在场证据）；② squash 剥 blockquote
`>` 前缀（源文件折行处的 markdown 标记，模型转抄自然不抄——「markdown 标记归一化」说了没做全）。
prompt 加引文纪律（优先整行照抄）。**残余**：转抄噪声不可根除（继续追 12/12 = 烧真模型磨噪声）；
探针的价值在语义矛盾层——本轮它兑现了 7 条。

## 输掉的方案

- **把窄视口面板级断言做到位**：三轮导航选择器都卡在「设置页开合后的右栏状态」——沉没成本超限后
  改做 380px 冷启动基线（PASS：零横向溢出）+ 登记 PanelFrame 滚动为 09-28 已验证面（本轮无相关改动）。
- **继续追 entry-probe 12/12**：见上，语义层价值已兑现，引文保真是模型转抄上限问题。

## UX 打磨实验（同轮追加：借 cdp-probe 实测交互层）

用内化的 cdp-probe 驱动对运行中观察窗做交互/延迟实测（三轮，方法坑两处先自认：单段导航的
挂载竞态、未开页签就测切换）：

- **新会话首帧 255ms**（冷热一致）——v1 测得的 10s 是导航假象，无性能问题。
- **页签切换 ~105ms**（aria-selected 翻转与面板内容同帧）——无问题。
- **浮窗开/收正常**（float 元素 ×6 出现、收回即恢复）；**问询超时自清实证**（挂了 40 分钟的
  验证问询自行收口，待办卡消散——0.1.7 timed-waits 的 fail-safe 在真实会话里生效）。
- **console 零 error 贯穿全部实验**。

**修的（自己留的 UX 污染）**：date-rule-probe 每跑一轮在排练场留一份 journal，18 份探针产物
堆积在培养面板的待审清单里。修 = 探针自清理（判定与日志完成后删本 run 产物）+ 存量清理；
复跑 PASS 且零残留（剩 9 份为真排练内容）。

**登记不动**：首启双模态（vendor 面）；公司共享盘里 09-25/26 时代的 `日期待核-*` journal
（培养面板待审的历史数据——轮末收敛归人，机制不代办）。

## UX 打磨实验 · 第二日追加（lab4–6：真实数据面 + composer 交互）

用户追加指令「可能还有潜在 bug，借助新工具把 UX 搞对」。换打法专挑**有真实数据的面**：

- **老会话兼容（最可能藏雷的面，实测干净）**：0.1.7 时代真会话（11 turns / 154 steps / 4.8M tok，
  9/29 录得）经 v4 格式迁移在 0.2.0 渲染器完整打开——正文、final.md 引用、Usage/turns 元信息
  全部正常，`[object Object]`/`NaN`/`isError` 零坏痕，console 零 error。**经由搜索链路打开**
  （会话列表行没有原生可点击祖先——div onClick，`el.click()` 打不通；搜索树条目点击是通路）。
- **composer 交互**：`/` 命令面板在新会话含全部收割命令（goal/compact/export/permission/model/
  plan——批1 的 /goal + /compact 人工可见 ✓）；`@` 引用弹层 ✓（kb/deliverables 文件清单）。
- **浮窗跨刷新持久** ✓（float 元素 ×6 刷新前后不变——float-geometry-memory 特性健在）。
- **用量面板真数据 sanity** ✓（今晚大量调用后无 NaN/undefined）。
- **问询超时自清实证**：挂 40 分钟的验证问询自行收口、待办卡消散（0.1.7 timed-waits fail-safe
  在真会话生效）。
- 走查方法教训追加：会话标题匹配要大小写敏感核对（「Token工厂」≠「token 工厂」）；会话列表行
  无原生点击祖先时改走搜索链路；UI 状态（页签/浮窗/滚动）不跨页面加载持久，实验要先建状态。

## 待续

- `probe --full` 低峰补跑（升 pin + 收割两轮工具面变化的合并收口；判据在升 pin Note）。
- 上游 seam 提案 ×2 候选：office-to-pdf 二进制落盘、browser-use × sandbox 可写目录（证据在收割 Note）。
- 日期通道机制的 RFC 追认（推敲卡唯一剩账，待用户）。
