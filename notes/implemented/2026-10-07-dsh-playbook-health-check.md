# DSH 套路体检：三路审计与漂移清障

状态：已交付（2026-10-07；批准：用户点名「现在你知道 DSH 的套路了，检查 repo 里哪些潜在问题需要补足」）

> 方法 = 以 `_dsh_plugin_agent_ready_development`（rc.2）提炼的体检表（四不等式 / 一处事实一个家 /
> 负知识有家 / 知识外置五问 / 错误何时被发现 / 六误区）扫全仓。三路子代理（合同新鲜度 / 资产守卫覆盖 /
> 决策记忆负知识）+ 主会话机械漂移 grep + entry-probe 第三跑（触发成立：入口链文档当日有改动）。
> **全部子代理发现先由主会话逐条亲自核实才修**（本会话已两证子代理也会有错：探针误报 1 条、
> Standards 复核数错 1 次）。

## 发现与处置

**A · 合同语义新鲜度（16 条全核实，15 修 1 复核后修正）**——病根集中 = rc.2 升 pin（09-30）与
0.2.0 harvest 批次落地后，合同文档未同 diff 收口：

- **blocker 三条**：①roster 实为 **9 条**（出厂 4：cordis/minimal/ptc/standard + pack 5），presets.md
  两处写 10/出厂 5——修；②**`subagent` `maxDepth` rc.2 默认 = 1**（vendor `subagent/src/index.ts:202`
  `default(1)`），delegation.md「默认 3 够 4 层」、budget-and-ops 同款、**ceo preset 注释**三处依据失效
  ——全修（含 preset 注释，过 preset-smoke）；③`agent-team-profile` / `agent-team-web-profile` 双包
  rc.2 vendor `experimental/` **均在**，ui-demo/roles-isolation「已不存在」错述——修（直插是取舍不是缺货）。
- **worth-fix 十条**：maxMembers「默认 8」实为代码默认 16、官方 bundle 与本仓 patch 均钉 8（×3 处修准）；
  profile.md host 行清单漏批 2 `session-query-sqlite` / 批 3 `time-context` 两替换行（补行）；demo.md
  引已移除的 `sessions.openSubagent`（→ `uiWorkspace.openSession`）；multi-human 引已归档的
  sea-reconcile live 路径（→ archive 路径）；architecture「官方 patch 只关续驶、one-shot 仍可用」理由
  过期（实为 `tool-subagent-control/list-agents/tool-subagent` 全 `disabled: true`——直插结论仍立，理由改写）；
  ui-demo「三位 VP/名册四行」（→ 四职能/五行）；role-content-plan「手册→全局 skills root」与自身 §1
  矛盾（→ `company-workspace/AGENTS.md` 注入）；budget-and-ops「workflow-worker-thread 行」已不存在
  （→ `workflow-ptc`/`tool-workflow` 行——**主会话复核时改准了一处自己先改错的**：`maxTotalAgents`
  归 `tool-workflow` 行，不是 workflow-ptc）；`foldTeam()` API 不存在（→ `foldSubagentDescriptor` /
  agentTeam 投影）；src/README lib 九模块漏 `doors.ts`（→ 十模块 + index.ts 的 `workspace_doors` 注册补记）。
- **observed 三条**：user-questions 行号 :101-106 → :140 附近（修）；presets.md:120 旧包名
  `agent-presets` + insert 枚举不全（改 `agent-preset-registry` + 指向 cordis.patch.yml 唯一源）；工具面表
  缺批 5a/5b 行（plan-mode 五角色 + browser-use VP-Sales，补行）。

**B · 资产与守卫覆盖**：dev-loop §6 明文「判据/审计类脚本一律接入 runtime-home」——**三个读
`$DSH_HOME/sessions` 真盘的脚本没接**：journal-audit（原手搓弱守卫只挡精确等值——重复实现 +
更弱）、authorship-audit（裸奔）、session-log-export（裸奔，`--home` 逃生口保留）。全部换
`requireDevHome` 家族守卫；**红绿双证**：本会话（DSH_HOME 天然继承日用值）三脚本全部 exit 2 拒绝；
source env.sh 后 journal-audit / authorship-audit 双 ALL PASS。另 snapshots 索引欠 4 行
（r7-motion-final + 三个 10-06 探针场景）——补行，r7 的 `workspace.expected` 按场景声明如实标注
「录制整盘拷贝，非独立 oracle」。lib 14 模块无孤儿；tests/README 表无误导缺行。

**C · 决策记忆与负知识**：干净——取代债零（互链配对 + 逆转均按 notes/README 处理）、已知限制段
逐条与实况吻合、rejected 空且自洽、proposed 零悬置。无动作。

**主会话机械面**：四处退役路径漏网（runtime-map「dev/」、architecture 树注「intents.md」、dev-loop
§9.1 规则措辞「`scripts/`」、_backlog/README「`scripts/run-gates.mjs`」——S1/S2/D34 三轮大迁移的
清障残留）+ §6 `rg` 路径 + §8 端口示例注记——全修。

**entry-probe 第三跑**：11/13（Q8/Q13 = 模型引文保真方差，非仓问题）；conflicts 3 条 → **1 真 2 判非**：
C1 `_backlog` 死路径（修）；C2 dev-loop 与 notes/README 收尾粒度不一致 = **判非**（owner 分工：收尾仪式
归 dev-loop §1+§12，Note 义务归 notes/README，探针自己也是「以更全者为准」）；C3 手册「只有 CEO」
vs D20「Lead 会话」= **判非**（角色语域 vs 实现判据的有意分居，桥的家 = D20 + deliverables.mjs）。

## 判非与登记（不动，理由在此）

- bootstrap.md vendor 构建配方段仍为已证伪的嵌套路径——**先于本轮**的已登记触发（09-30 Note 拥有：
  下次动 bootstrap 时写入 staging 配方），不顺手改。
- 端口三处叙述（3080 默认/3081 示例/3086 EADDRINUSE）互洽——补了「示例值」注记即止。
- snapshots 体积 56M/64M（余 8M）——README 已有升级路径（压缩归档→外置冷存），**报用户知晓**，
  不预启处置；下次整盘归档前先看这条。
- keyless-imports 仅 tests 消费 = 满足判据非缺口；orient 警告模式 = RFC driver-surface 有意设计。

## 语义审记录（本轮自身的审）

四输入：①授权原文 = 用户点名体检+补足——25 处修复全部在授权面内，无扩围（漂移修复属「docs 只写
now」的既定义务）；②合同文档 = 修复即同步（本 Note 即同 diff 记录）；③证据选层 = preset 改动过
presets.spec(13 绿)+preset-smoke(5/5 挂载)；守卫改动红绿双证；文档面 verify+test；④Note = 本文件。
发现：主会话自查两处自身错误已被流程抓住（workflow-ptc/tool-workflow 归属先改错后核准；两个新链接
相对路径错被 md-links 门禁当场拦红）——门禁与复核链在工作。

## 验证记录（真跑过的命令与红/绿形态）

- `pnpm test tests/presets`：13 项全绿；`node checks/smoke/preset-smoke.mjs`：**ALL PASS（5 preset
  全部可挂载）**——preset 注释改动的完成定义（testing §2）。
- 守卫红证：三脚本未 source env.sh（DSH_HOME=日用）→ 全部 exit 2 拒绝（消息含「与日用 home 重叠」）；
  绿证：source 后 journal-audit / authorship-audit ALL PASS（真盘零违规，顺带完成一次真实审计）。
- `pnpm verify`：**ALL PASS**（中间一次 2 FAILURE = 我新加的两个 md 链接相对路径错——门禁当场拦红，
  修正后全绿；这正是门禁的意义）；`pnpm test`：36 文件 355 项全绿。
- entry-probe 第三跑归档：`snapshots/probes/entry-probe/2026-10-07/answer-16-16-58-165Z.md`（11/13，
  2 条 conflicts 判非理由见上）。
