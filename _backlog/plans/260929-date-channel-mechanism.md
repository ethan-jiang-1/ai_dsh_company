# 推敲：日期通道——启用出厂 time-context，让角色开局即有真日期

> 状态：✅ **半实施已收口（2026-09-30）**——(a) 路线落地：日期通道上线 + 手册/skill/probe 判据三处文面改完（见 notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md 与 plugin-harvest-round.md）；探针判据已翻新并复跑绿。**唯一剩账 = 机制启用未经 RFC 批准（追认待用户）**｜毕业门判断 = 倾向该做 D2'（已兑现，待追认）｜下一节「⚠ 半实施状态」保留为当时的风险论证（历史，勿当现役）

## 背景 / 触发

- 用户 2026-09-29 点名：deliverables 的话题**至少要有 kick-off 日期**。
- [journal-date-mechanism](../../notes/implemented/2026-09-26-journal-date-mechanism.md) 当时只批了
  C 文案止损，留案了 A（pack 侧自建 `systemPrompt.context` 注入）与 B（上游 seam）两个未批方案，
  触发条件 = "日期缺失再次造成问题，或用户点名"——**已 fired**（用户点名）。
- 拆卡理由不变：本卡是机制问题（company-pack 组合面），与姊妹卡
  [deliverables-lifecycle-metadata](./260929-deliverables-lifecycle-metadata.md)（纯目录/契约）正交；
  作用面不止 deliverables（journal 文件名、台账行、一切要日期的产物）。

## 已知与未决

### 2026-09-29 关键新发现（本卡据此重写）

**钉住的 vendor 里出厂就有时钟插件**：`@deepseek-ai/dsh-time-context`（context 组，
README 自述 "gives the model a clock"）——随 web-app bundle 挂载但 **`disabled: true`**
（[vendor/dsh/packages/bundle/web-app/cordis.patch.yml:121-123](../../vendor/dsh/packages/bundle/web-app/cordis.patch.yml)；
`schedule` 同样 disabled），本仓 pack 未启用 ⇒ 角色会话至今无时钟。
**留案 A（自建注入）被这个出厂件超越：不用自建，换行启用即可。**

其形状（[README](../../vendor/dsh/packages/context/time-context/README.md) 核实）恰好比留案 A 想做的更好：

- 注入物 = **durable user-role 消息**（当前时间 ISO+时区、浏览器时区政策、elapsed），进**会话历史** ⇒
  可回放、可压缩、model-visible ⟺ logged 不变量不破——比注入 runtime context 块（易失快照）更适合当日期事实源；
- 默认 `refreshIntervalMs` 10 分钟一条（`0` = 每步注入）；`timeZone` 可配 fallback（我们给 `Asia/Shanghai`）；
  多人模式各门自带浏览器时区，请求内自动选带；
- 浏览器区缺失/混合时用 fallback 显示并指示模型问人——宁缺勿错的精神与现行口径一致。

### 其余已知（沿前版）

- 现状 = C 止损（已批）：无通道 ⇒ 占位 `日期待核`，真日期由轮末收敛/人回填；
  不止损的红证 = 三代链式漂移复利（真日期 09-25/09-26/09-26 被记成 09-28/09-29/09-30）。
- 原生 seam（`scope.systemPrompt.context`，sandbox-policy 样例
  [index.ts:141-152](../../vendor/dsh/packages/sandbox/sandbox-policy/src/index.ts)）仍在，但**不再需要走它**。
- 注入 ≠ 消灭回填：历史件、盘外产物仍要轮末回填；但 `日期待核` 量趋零、台账行当场可写
  （今天 5 个新话题无台账行，日期难产是原因之一）。

### 配套改文面（与机制同 diff，一处事实一个家；盲审后从两件补全为四件）

1. 公司手册「日期口径」：从"没有通道 ⇒ 一律占位"改成"**读 time-context 注入的时间写真日期；
   注入缺失时占位**"（禁推算/禁取次日的核心条款不变）——⚠ 改文受**双预算约束**：行数棘轮
   （`DOC_LINE_BUDGETS` 余 9 行）+ **字节顶（BUG-001：手册 16768 字节已越 maxBytes 16384，
   尾部正在被截）**——改文与 BUG-001 修复（调 maxBytes 或瘦身）须同批处理；
2. **CEO skill 记账步**（`chairing-staff-meeting/SKILL.md:30`，盲审补——原稿漏了这处，而它恰是
   现在最硬的占位指令源，无条件句式把机制收益挡在门外）；
3. **台账表头日期口径行**（"取不到写「日期待核」"的条件句仍成立，指路补"注入时间优先"）；
4. `scripts/date-rule-probe.mjs` 判据①：从"文件名必须占位"升级为"文件名日期**必须与注入消息一致**"
   （探针先读会话注入做对照；不升级则该仪表会把正确行为判红）。
   另：~~组合探针（cwd=company-workspace）~~ **已被盲审 F-11 改判——见探针结果节**。

### 探针结果（2026-09-30，`scripts/time-context-probe.mjs`，真模型单步）

- **判据①② PASS**（脚本 PASS 口径 = ①+②）：① 注入事件在场（`user/message` + `source.kind=time-context`，
  turn 1 step 1 即注入）；② 模型转写注入原文进纪要正文（实测为逐字，超出判据要求）。
- **③ 观察项亦符合**（脚本定义 ③ 不计红绿）：文件名用注入日期（`2026-09-30-…md`）而非占位——
  模型自己判对了"取得到真日期"的条件分支（现行手册的条件句式语义不用改，改文只需把指路换成"读注入时间"）。
- **"探针盲区"被盲审 F-11 改判（二轮）**：原判"排练场不注入公司手册、组合行为从未测过"**不成立**——
  排练场的 AGENTS.md 自 09-22 起就是**指向真盘手册的符号链接**（vendor `findProjectRoot` 空 markers
  返回 cwd），09-30 探针**已经**同时拿到手册+skill 目录+注入时钟，且模型选对了分支。⇒ "cwd=真盘
  组合探针"验收件**撤销**（也免除与"探针不写本盘"纪律的冲突，D-T5 随之消解）；真实剩余问题收窄为
  **skill 记账步的无条件占位文案 vs 注入**——由 `date-rule-probe` 判据升级覆盖（它跑的正是 skill 步）；
  真实工作区复跑降级为可选。注意这使半实施风险**更真实而非更轻**：矛盾指令每个会话都在场，
  探针单例证明模型目前能解，不证明每场都能解。
- **组合语义红证（白捡）**：patch 替换行只换 **config 整块**；行级键 `disabled` 是**按键覆盖**——
  不显式写 `disabled: false`，web-app 的 `disabled: true` 依旧生效（首跑 config 换上了、插件仍关着，
  `--dump-config` 才看出来）。已写进 [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 行注释防重踩。
- 配套检查：`preset-smoke` ALL PASS（5 preset 挂载）、`pnpm verify` ALL PASS；
  改动三处已落盘（pack 替换行 / overlay insert / peerDependencies）。

### ⚠ 半实施状态（盲审升格为最高优先级风险；~~2026-09-30 现役~~ **→ 已收口 2026-09-30 晚，本节为历史论证**）

> ✅ **收口记录**：手册「日期口径」/ CEO skill 记账步 / date-rule-probe 判据 三处已全部翻新
> （commits 见 notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md），探针复跑绿（写真日期 PASS）。
> 本节以下的「三方打架」论证保留为当时事实。**仍待用户**：机制启用的 RFC 追认。

机制已启用（工作树三处落盘），但改文面未跟——**三方互相打架，且这是现役状态不是假设**：
手册「日期口径」仍断言"没有任何取真日期的通道"（**已成假话**，且手册随每个角色会话注入）；
CEO skill 记账步（SKILL.md:30）**无条件**教占位（把机制收益挡在门外）；`date-rule-probe` 判据①
仍要求占位（会把"正确使用真日期"判红——仪表反挂）。盲审 C 给的升级路径：注入与手册同上下文矛盾
→ 行为按会话分裂 → journal 混代（`日期待核-*` 与 `2026-09-30-*` 并存）→ 轮末回填漏新代文件 →
**日期漂移失去可见锚点**。中间态行为眼下恰好安全（skill 挡着，不会写错日期），**但不该过周末**。
两个收口选项（用户拍）：**(a) 补完改文面**（= RFC 落地。**准确表述（盲审 D-S1-7）**：留案触发
已 fired、探针判据①②绿，但"启用出厂件"本身**仍待本 RFC 批准**——半实施正是未批先行的现役状态，
(b) 正为它存在；剩的全是文案 + (a) 的退路条文见探针节）或 **(b) 回滚 patch 至 disabled** 等正式批准。
**跨卡联动（盲审 D-T6）**：(a) 落地瞬间使布局卡 B1 模板"日期字段全占位"变假话——meta 开局日期口径
须并入手册「日期口径」同一句、B1 模板随 (a) 同 diff 改（两卡文面联动已双登记）。

## 候选与取舍

| 方案 | 形状 | 代价 / 收益 |
|---|---|---|
| **D1 维持现状** | C 止损 + 轮末回填 | 零机制成本；回填税常驻、journal 长期 `日期待核`、台账滞后（已漏 5 行）|
| **D2' 启用 time-context（本卡倾向）** | pack bundle patch **替换** web-app 的 time-context 行（去 `disabled`、config `timeZone: Asia/Shanghai`）——与 `agent-preset-registry` 同款换行模式；headless 组合经 `dev/company.overlay.yml` insert 补行（既有双轨）| 原生件零自建（D13 不自造直接满足）；成本 = patch 一行 + peerDependency 登记 + `preset-smoke` + 探针实测；可调噪声（`refreshIntervalMs`）；午夜跨界动议取注入时刻所在日（可接受）|
| **D3 上游 seam** | 给 DSH 提原生改进 | **降级为不需要**：出厂件已覆盖本需求；仅当想要"放进 runtime context 块"或"每步必注"才值得上游 |
| **D4 不动机制** | 只做姊妹卡 A2（收敛补日期） | 树上时间轴有了；journal/台账维持回填；与 D2' 可叠加 |

**组合关系**：D2' 与 D4 正交可叠加。⚠ 与姊妹卡的耦合要在两边都记一笔：**D2' 落地 ⇒ 姊妹卡 A1
（出生即带日期目录名）的"CEO 没有时钟"死结解除**——A1 复活为真候选，那边的命名取舍要在本卡毕业后再定。

## 毕业门

- **该做门**：用户裁 D2' ⇒ ① 探针（分钟级）**已过（2026-09-30，见上节结果）**；
  ② RFC 三件（问题/方案/验收）——问题与方案已在本卡成熟，验收 = preset-smoke + time-context-probe
  （已立）+ 手册「日期口径」改文 + `date-rule-probe` 判据升级同 diff。**只差用户一句话。**
- **放弃门**：用户裁"回填税可忍" ⇒ 本卡结论并回 [journal-date-mechanism](../../notes/implemented/2026-09-26-journal-date-mechanism.md)
  「输掉的方案」节（留案 A/B 关死为"出厂件存在亦不启用"，防重复推敲），本卡迁 `_done`。
- **不阻塞声明**：姊妹卡（布局）不需要本卡结论；但本卡若毕业为 D2'，姊妹卡需回头重看 A1/A2 取舍
  （那条耦合注在两边都已登记）。
