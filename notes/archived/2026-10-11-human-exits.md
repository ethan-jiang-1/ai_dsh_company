# Human Exits：双轨人话出口与高管消化漏斗

状态：已消化（2026-10-11；批 1/2/3 逐条验收均取得真实证据，条目去向见文末）
来源：[语言层 issue](../../_backlog/_archive/settled_issues/2026-10-11-plain-language-human-exits.md)；[表达层 issue](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-expression.md)
批次证据：[批 1](2026-10-11-human-exits-batch1.md)｜[批 2](2026-10-11-human-exits-batch2-contract.md)｜[批 3](2026-10-11-human-exits-batch3-ui.md)

## 问题

内部 Agent 协作需要保留高密度上下文，但管理层出口必须能快速定位结论、下一步和待拍板事项。当前 V4 活跃 `meta.md` 的「一句话结论」为 835 字，并直接进入台账和 LedgerTab；部分历史行含内部机制术语。对话出口已有较好基础，但缺少统一的双轨表达规则、阻塞选择规则和取证入口约定。

目标是建立一条可复核的三批交付路径：

1. 摘要字段与台账保持单一来源，修正 V4 活跃长行；不设 meta 硬字数上限，不批量改历史行。
2. 对人回复使用短人话首段；阻塞选择进入 `ask_user_question`，非阻塞缺口带显式假设继续；比较结构和数字取证按场景使用。
3. 补齐 LedgerTab 的有界视觉显示与非 hover 全文入口，记录 compact 观察窗操作，并现场核实已有 `open-in-app` 能力。

Agent 间 drafts、任务书、成员消息保持原有密度。本 RFC 只批准起草与呈批；任何产品代码、preset、模板或文档实现都须在 Plan Mode 通过后，按批次获得实施授权。

## 方案

### 批 1：摘要与台账来源治理

- 重写 `company-workspace/templates/meta.md` 中「一句话结论」的业务语言规格：准确、适合台账扫描、避免机制术语；事实/假设的详细标注留在 final 报告体，行内用自然语言说明条件或未实测状态。
- 在 `company-workspace/kb/motion-ledger.md` 维护规矩中声明台账摘要是 meta 字段的逐字引用，不在台账另写第二个结论。
- 只修 `company-workspace/deliverables-archive/2026-10-10-ai-transformation-2026-v4/meta.md` 的活跃长行，保留“V4 达标、反事实未达标、真实缺陷已修复”核心事实；不批量改其他历史行或 archive。
- 不增加 100/120 字等硬限制，不以 UI 截断代替内容治理。

### 批 2：人话回复与决策表达

- 在 CEO persona/相关手册的现有 owner 处落双轨制和三件套：结论、下一步（谁/何时）、要拍板的事。
- 阻塞型选择必须使用 `ask_user_question`；选项 label 写可执行动作，description 写关键后果。非阻塞缺口显式写默认假设并继续，轮末列待确认项。
- 多个选项需要按共同维度权衡时，默认使用短 GFM 表格；简单二选或窄屏不适合表格时使用短列表。
- 只给影响结论、需要拍板或需要复核的关键数字加文件行锚；重复数字和背景数字不逐项加锚。DSH 已提供 GFM、文件链接行号定位和侧栏预览。
- 会话首段保持短，详细论证进入 final/drafts；不承诺通过改 Chat renderer 折叠助手长文。

### 批 3：浏览和显示

- LedgerTab 对摘要设置稳定的视觉行数边界，同时提供键盘和触屏可达的完整文本查看；`title` hover 不能作为唯一全文入口。此边界只约束展示，不约束内容字数。
- 将 compact TranscriptView 的开窗步骤维护在 `docs/demo.md` §前置；说明过程行折叠但不声称折叠助手长文。
- 现场核实 bundle 已启用的 `open-in-app`，成功后补公司手册说明；若现场因环境失败，记录运行态证据，不修改上游或凭源码存在判通过。

## 依赖与顺序

批 1 → 批 2 → 批 3。批 1 提供摘要来源和模板基础，批 2 依赖语言 owner 的规则，批 3 可在内容规则确定后验证显示密度。每批独立验收；批 3 不替代批 1 的内容治理。

实施时：preset/persona 变更遵循 `preset-change-definition`；客户端变更遵循 `cordis-plugin-development`；模型行为证据与确定性测试分开，真实模型采用少量代表场景和有界观察，长期语料评估暂缓。

## 输掉的方案

- **新增翻译中转 Agent**：否决。增加延迟和成本，且会破坏“产出者负责翻译”的单一 owner；规范应落在现有 persona、模板和手册。
- **把 drafts、任务书和成员消息全部改浅**：否决。它们服务 Agent 间协作，用户已明确内部高密度上下文保留。
- **为人话新增 Chat renderer 或摘要 widget**：否决。上游没有缺失的摘要机制；替换 `conversation.chat.node` 是大手术，且不能解决内容 owner 问题。
- **把台账摘要截断到固定字符数**：否决。用户已选择不设 meta 硬上限；截断会损失结论，且无法修复错误来源。
- **所有比较都强制使用表格、所有数字都强制加锚**：否决。DSH 表格在窄宽度会横向滚动，全面加锚会制造噪声；采用场景默认和关键数字取证规则。
- **引入图表库或新 UI 插件**：否决。现有 Markdown、侧栏预览、页签和 ask 能力已覆盖当前需求，新增依赖没有独立收益。

## 验收

### 批 1：确定性和文档验收

1. 在 V4 meta 中断言：活跃「一句话结论」不再是原 835 字段，仍准确包含 V4 达标、反事实未达标、真实缺陷已修复三项事实；不得出现新的硬字数门禁。
2. 读取 meta 与 motion ledger，断言对应台账行与 meta 字段逐字一致，且新增/修正内容使用业务语言，不把内部机制术语作为常驻结论主体。
3. 运行 `git diff -- company-workspace/deliverables-archive/2026-10-10-ai-transformation-2026-v4/meta.md company-workspace/kb/motion-ledger.md company-workspace/templates/meta.md`，断言历史台账行、archive 和非 V4 活跃行没有被批量改写。
4. 运行 `pnpm verify`；通过信号为文档、链接、预算和 backlog 门禁全绿。失败信号包括来源不一致、路径失效或文档预算超限。

### 批 2：模型行为与表达验收

**Given** 一个需要管理层拍板的阻塞选择，**When** 角色收口，**Then** 首段给出结论/下一步/待拍板事项，并产生 `ask_user_question`；选项是动作加关键后果。失败为拍板埋在长散文尾部或首段出现机制黑话。

**Given** 一个非阻塞缺口，**When** 角色仍可推进，**Then** 明示默认假设继续，并在轮末列待确认项；失败为不必要地阻停工作。

**Given** 多个选项需要按共同维度权衡，**When** 生成审阅内容，**Then** 使用短 GFM 表格；简单二选或窄屏不适合时使用列表。关键结论/复核数字带文件行锚，重复或背景数字不逐项加锚。

代表场景先固化为 replay/会话断言；真模型只做有界单场观察并保存日志，不把真模型表现伪装成 `pnpm test` 的确定性证明。Markdown 渲染能力由 DSH 自有测试承担。

### 批 3：界面、文档和现场验收

1. 组件/视图测试使用超长摘要 fixture：宽、窄视口均保持稳定行高；摘要有省略提示；鼠标、键盘和触屏均能打开完整文本；短摘要直接可读。仅有 `title` hover 或 clamp 后无全文入口均失败。
2. 真实装配运行 `client-load-smoke`，确认 LedgerTab 可挂载；若代码触及已组装 browser 输出，再运行仓库规定的 web replay 检查。
3. 依 `docs/demo.md` §前置完成 compact 操作，确认过程行折叠而最终回复仍可见；说明不得声称 compact 会折叠助手长文。
4. 在真实观察窗对交付物执行 `open-in-app`，确认目标文档在侧栏预览；源码存在但现场入口不可用不算通过，环境缺失须记录为阻断。

### 批次共同收口

每个切片遵守：先让最窄判据红，再做最小实现，再用同一判据转绿；验证命令、红/绿输出、未执行的现场前提写入毕业 Note。未获得下一批授权不得跨批实现。

## 执行方式（已执行，现存为约束）

三批按批 1 → 批 2 → 批 3 顺序落地，每片都先只读勘查 owner 与最窄验收入口，再走「先红 → 最小实现 → 同判据转绿」；红/绿收据在 [批 1](2026-10-11-human-exits-batch1.md) / [批 2](2026-10-11-human-exits-batch2-contract.md) / [批 3](2026-10-11-human-exits-batch3-ui.md) 三份 Note。

执行期仍成立的停止条件（越界即停、先改 RFC 再动手）：来源关系不确定、验收不可执行、红测试未真实失败、修改超出本 RFC、preset 规则与既有角色合同冲突、模型观察显示规则不稳定、UI 全文入口无法同时满足键盘/触屏，或现场依赖缺失且无替代证据。

批次完成定义（现已兑现，判据仍可用于回归）：

- 批 1：meta 与台账逐字同源，V4 活跃摘要准确，历史范围未扩大，`pnpm verify` 通过。
- 批 2：阻塞与非阻塞代表场景通过，preset keyless 检查与真挂载 smoke 通过；有界真实模型观察单独记录，不冒充确定性回归；内部协作内容密度未被改写。
- 批 3：LedgerTab 宽/窄视口行高稳定、被裁必有入口，键盘/触屏可达全文，`client-load-smoke` 通过；compact runbook 可执行；`open-in-app` 有现场证据。

最终收口按 §条目去向执行：逐条对照本 RFC 做语义审查，真实验收证据写进毕业 Note 与三份批次 Note，两张 issue 随之离场。

## 条目去向

本 RFC 已毕业到 `notes/implemented/`；正文冻结，各条的现行归宿与证据如下。

| 条目 | 归宿 | 真证据 |
|---|---|---|
| 批 1｜摘要与台账来源治理 | [批 1 Note](2026-10-11-human-exits-batch1.md)：`templates/meta.md` 规格、`kb/motion-ledger.md` 同源规矩、V4 活跃 meta 改写 | 红：V4 meta 无对应台账行 → focused ledger test 失败；绿：`tests/company/ledger.spec.ts` 6 passed + `pnpm verify` |
| 批 2｜阻塞型选择 | [批 2 Note](2026-10-11-human-exits-batch2-contract.md)：CEO preset 与主持动议 skill 的 ask 规则 | `probes/session-context/human-exits-probe.mjs`：真实 CEO 会话记录到 `ask_user_question` + 首段结论/下一步/拍板 |
| 批 2｜非阻塞缺口 | 同上：显式默认假设 + 轮末待确认项 | `probes/session-context/human-exits-nonblocking-probe.mjs`：`asked:false`、显式假设、轮末「待你拍板」，事件落盘 `runtime/human-exits-evidence/` |
| 批 2｜比较结构与数字锚 | 同上：条件 GFM 表格/列表 + 关键数字文件行锚 | `probes/session-context/human-exits-expression-probe.mjs`：短表 + `#L` 行锚 PASS |
| 批 3｜LedgerTab 有界显示与全文入口 | [批 3 Note](2026-10-11-human-exits-batch3-ui.md)：`LedgerTab.tsx` 全文切换、`styles.ts` 台账专属布局 | 红：摘要宽度归零且短摘要被隐藏无入口 → 修复；绿：`probes/browser-visual/ledger-summary-probe.mjs` 1440/390px、键盘/触屏全文 PASS |
| 批 3｜compact 显示模式 | 同上 + `docs/demo.md` §前置步骤 5 | `probes/browser-visual/compact-view-probe.mjs`：简洁/标准/详细 2471 字符且 198 条过程行折叠，完全展开 19874 字符，助手最终长回复逐字保留（1257 字，切回后逐字一致） |
| 批 3｜open-in-app 现场 | 同上 + `docs/demo.md` §前置步骤 6 | `probes/browser-visual/open-in-app-probe.mjs`：`final.md` 进侧栏预览后 `POST /api/session/openWorkspacePath` 200 且携带目标绝对路径，无 alert |

仍按 RFC 暂缓或未单测的两项：长期语料评估；简单二选/窄屏列表场景。两张 issue 已随本 RFC 毕业离场到 `_backlog/_archive/settled_issues/`。

## 收口后复核（2026-10-11，两轴独立审 + 本人复跑）

复核抓到的真缺陷与处置（都改了实现/资产，不是只写说明）：

- **keyless replay lane 红**：`checks/smoke/replay-smoke.mjs` 在 r3-delegation 上报 2 条 FAIL——sidecar 还是旧 CEO prefix、两处注入体还是旧公司手册。复核实测确认：**该 lane 在本轮之前已经红过**（同日更早的手册改动新增 4 条协作规矩，没人跑这条 lane），本轮又加了 CEO 措辞与手册一行两处。处置 = 同步夹具（sidecar 文本、注入体正文、`source.changes[0].digest`）后 `replay-smoke: ALL PASS`；这是**夹具同步不是重录**（本机无 key），已在 `snapshots/replay/r3-delegation/snapshot.yml` 的资格理由里写明并要求此后改手册/persona 同 diff 跑该 lane。**该 lane 有姿态前提**：脱敏只盖姿态事件的**值**，它们的在场/位置随机器姿态变 ⇒ 必须先 `source run/env.sh`；裸跑实测 1 FAILURE（复现脚本自己声明的「序列漂移照样红」，非夹具漂），前置已写进脚本头注与场景说明。
- **台账行高不稳**（批 3 实现缺陷）：按字符阈值决定裁不裁 ⇒ 22/29 行不裁，1440px 高到 102px（≈6 行）、390px 到 155px（≈9 行）。改为**所有行两行边界 + 按量出的溢出给入口**后，两档视口 maxLines=2 且 buttons == clipped。
- **空转断言**：`tests/client/client-face.spec.ts` 原有两条断言在基线上恒绿（`/summary/` 命中 `row.summary`、`/height:/` 命中 `line-height:`）；已改写成逐条在 6094d67 上转红的 7 条，并补「不许给短行开免裁口子」。
- **探针弱于其声称**：`human-exits-probe` 用全文 grep 判三件套（「埋在尾部」反例照样绿）⇒ 收紧到正文前 400 字 + 机制黑话负判据；`human-exits-nonblocking-probe` 的假设/待确认项改为分别落**开头 400 字**与**末 500 字**，收紧后重跑 PASS。
- **证据不可复核**：三条浏览器探针只打印、不落盘 ⇒ 现在都把判定 JSON（含 open-in-app 的**目标绝对路径**、台账两档视口的行高/按钮/裁切计数）写进 `runtime/human-exits-evidence/`。
- **索引缺口**：`checks/README.md` 漏登记 `human-exits-nonblocking-probe.mjs`，已补。
- **越界与孤儿**：公司手册里我加的 compact 一句未被 RFC 授权（授权只到 demo.md §前置）⇒ 已删；`snapshots/probes/human-loop-e2e/2026-10-11/*.png` 无 Note 消费 ⇒ 已在批 2 Note 里点名。

### 第二轮复核（2026-10-11 深夜，两轴复审 + 换路径实测）

新增抓到并按上面同款标准处置的：

- **replay lane 的姿态前提**：`snapshot.yml` 原文「判据不随机器沙箱姿态漂」过头——脱敏只盖姿态事件的**值**，在场/位置随机器姿态变。裸跑实测 1 FAILURE（session#0 runtime-context 行 + session#1 权限/inbox 事件错位），`source run/env.sh` 后 ALL PASS。已把前置写进 `checks/smoke/replay-smoke.mjs` 头注与场景说明（那是复现脚本自己声明的「序列漂移照样红」，不是夹具漂）。
- **阻塞支探针遇到真·模型路径故障**：一次实跑 `turn/end.reason = error / MALFORMED_RESPONSE`（模型想调 `ask_user_question` 但工具入参 JSON 坏了），旧探针把它报成「行为不符」。已加**错误识别 + 有界重试一次 + 退出码 2（环境/模型路径失败，非行为判据）**，并把判定与事件落盘；重跑 PASS。稳定性实录：非阻塞支 4/4 通过；阻塞支 2 场有记录的观察里 1 通过 1 场模型路径错误（样本太小，不足以下频率结论）。
- **首帧无入口**（判据）：60–120 字在窄栏会被裁，却不满足字符提示 ⇒ 量溢出改用 `useLayoutEffect`（绘制前跑）。
- **无障碍名不含可见标签**（WCAG 2.5.3，A 级）：`全文` vs `查看完整结论` ⇒ 改成 `全文（查看完整结论）`／`收起（收起完整结论）`。
- **死钩子**：`is-long` 类没有任何 CSS 消费 ⇒ 从 DOM 去掉（只留 `hinted` 布尔），相应断言改成查入口本身。
- **视觉夹具缺位**（tests/README 第 25 行：用户可见客户端改动要同 diff 交场景或视觉夹具）：台账截图原先只落 gitignored 目录 ⇒ 新增 `snapshots/visual/ledger-summary/`（两档视口截图 + computed.json，探针 `--fixture` 写入）并登记进 snapshots/README；390px 图上可直接看到两行边界、省略号与「全文」入口同框。
- **换路径实测新增覆盖**（都过）：容器级宽度变化（浮出成浮窗 356px ⇒ 入口 7→17；收回复原）、窗口连续缩放无抖动（同宽度两次采样一致）、展开态下收窄再收起不丢入口（被裁且无入口 = 0）、`deliverables-check` 违规 0、`preset-smoke`／`handbook-smoke`/`cdp-probe` 全绿。

### 第三轮：把"没做的"逐条做掉（2026-10-11 深夜）

| 欠账 | 处置 |
|---|---|
| 夹具同步 ≠ 重录 | **做了真重录**（`replay-smoke --record`，真模型 2 段）：r3-delegation 的 raw + fixture 换成真录制，`replay-smoke` 复跑 ALL PASS。附带验证：**重录产出的 sidecar 与我手同步的那份逐字节一致**——那次同步没有造假。 |
| 探针脚手架重复（约 25 行 × 3～4 份） | 抽到 [tools/lib/probe-window.mjs](../../tools/lib/probe-window.mjs)（关首启提示、开会话、开公司页签），三条浏览器探针改用它；cdp-probe 保持驱动层逐字拷贝契约不动。 |
| 本机应用是否真打开 | 边界不变（机器只证到 Host 成功 + 目标绝对路径）；见下方"仍然存在"。 |
| 批 2 代表场景固化为 replay | **做成了**：[snapshots/replay/human-exits-ask](../../snapshots/replay/human-exits-ask/)（阻塞拍板），`--scenario human-exits-ask` 无 key 重放 ALL PASS、零 diff。三个卡点逐个解掉：日志不封盘（ask 前景等待没人作答）⇒ 给驱动装**真 UI 认领作答**（`answerer: browser` 场景开关，录/放对称）；RPC 直答对未认领问询返回 `false` ⇒ 走浏览器；UI 搜索按名字匹配 ⇒ 驱动先 rename 成**确定性**标题（带时间戳会写进日志、重放必红，实测过）。卡 [human-exits-replay-scene](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-replay-scene.md) 同次结掉。 |
| 顺带修掉的harness缺陷 | `--record` 的守卫原先写死「≥1 child」⇒ 单轮场景录完必被判失败且不落盘；改成按 `snapshot.yml` 的 `session.children` 声明算期望。 |

仍然存在的边界（未修，如实记）：批 2「代表场景固化为 replay」未做（已立卡 [human-exits-replay-scene](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-replay-scene.md)，卡点实测在案）；本机应用是否真打开文件只能由人确认；夹具同步不等于重录，攒够改动后应做一次真重录；阻塞支真实模型行为样本仍小（1 通过 / 1 模型路径错误），要谈稳定率得再跑几场；探针间有重复脚手架（未抽取）。
