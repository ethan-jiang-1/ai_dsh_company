# 2026-09-30 · 升 pin：dsh-v0.1.7-rc.2 → dsh-v0.2.0-rc.2

状态：已交付（基座钉 `dsh-v0.2.0-rc.2` = `639ed015397290b3745d163aafe02ffee4aa3f84`，事务 commit `78fb7de`；官方 `sync-dsh` 只读核对「簿记一致（矩阵 3 列）」；`probe --full` 真模型档未收口，见 §未验证）

## 问题

本仓钉住 `vendor/dsh` = `dsh-v0.1.7-rc.2`（`477b4f42`）。上游已发 `dsh-v0.2.0-rc.2`（`639ed015`），
区间 **448 commit**（0.1.7 那次 rc.1→rc.2 是 346——这次是小版本级跨越，非纯发布 bump）。

- 消费面 delta 报告 = [archived/2026-09-30-dsh-upstream-delta-0.2.0.md](../archived/2026-09-30-dsh-upstream-delta-0.2.0.md)：
  **纯适配、无 install 级阻塞**——24 个 `dsh-*` peer 包全部存在（版本 0.2.0-rc.2）、cordis 4.0.2→4.0.4
  （仍在本仓 range 内）、preset 声明形状零变化、client 数据层零 breaking、`materializeProfilePatch`
  五参签名逐字一致、host import 符号 25 个逐个核对全在。
- **唯一硬破面** = [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 的 `time-context`
  替换行：0.2.0 的 web-app 出厂补丁删了 `time-context`/`schedule`/`ui-schedule` 三行，整体迁入新可选
  bundle `dsh-experimental-schedule-bundle`（upstream `64a361ee44`）⇒ 替换语义下该行 not found 丢弃，
  日期通道断。

## 方案（对照 0.1.7 先例的三步走，本轮实测后简化为两步）

1. **阶段 0 · delta 分析**（子代理只读 `git show`/`diff`，未 checkout）：产出 delta 报告（上链）。
2. **①a 测量窗口**（登记偏离，短窗口、不留 commit）：vendor 切候选 → install/构建/门禁 → 还原。
   三轮窗口的实测沉淀见「实施实况 §测量窗口」；D27 在候选上**逐字复现**，且**升级**：嵌套环境连
   本仓自己的 host/client face 构建也开始撞 root-entry（见下）。
3. **①b+①c 合并事务**（单 commit `78fb7de`）：消费面适配 + 四处簿记 + lockfile + submodule 指针
   一次落盘——因为 patch 行改 insert 在**旧 pin 上必撞重复 id**（web-app 出厂行还在），适配与换基座
   不可分批验证；等价于官方事务的 validate→verify 顺序（簿记在门禁全绿前不落盘），门禁先行实测后
   才写簿记，失败可整树还原。

**D27 复核与升级（本轮最重要的机制发现）**：
- 官方 `sync-dsh --pin` 事务第③步 vendor 自建在嵌套工作区必失败（D27 在案）——0.2.0 上**逐字复现**
  `[@deepseek-ai/dsh-root] Cannot find entry: ["lib/types/{index,invariant,startup}.js"]`。
- 新事实：0.1.7 时代这三份 root entry 以**旧产物形式躺在树里**掩盖了问题；本轮产物消失后，
  **本仓自己的 host/client face 构建**（`tsdown --env.DSH_BUILD_FACE <face>`）也撞同一错——
  即"嵌套环境跑不了 vendor face 构建"是普遍事实，不是 vendor 自建特例。
- **独立 staging 树完整构建成功**（`git archive` + 独立 install（vendor 自己的 lockfile，frozen 过）+
  `pnpm run build` 全绿：CLI bin、347 个 client artifact、web dist 齐全；staging 需要 `git init`——
  0.2.0 新增 `scripts/client-build-environment.ts` 起手 `git rev-parse HEAD`）。
- ⇒ **本轮落账方式**：vendor 构建产物在 staging 生成后**拷回树内**（逐目录 `git check-ignore` 守门、
  拷后 `git status --porcelain` 断言仍空——铁律允许面"vendor 自己 .gitignore 覆盖的树内构建产物"），
  嵌套环境不再跑 vendor face 构建。bootstrap 配方的 face 构建步骤自本次起对 vendor 面失效，
  后续换 tag 的配方 = staging 构建 + 拷回（已记 release.md 升 pin 程序的现状差异，见 §遗留）。

## 输掉的方案

- **官方 sync-dsh 事务**：D27 复核逐字复现（证据 /tmp/pinwin/08、19 号日志；staging 对照实验见上）
  ⇒ 输给"测量窗口 + 手工簿记"（0.1.7 先例路径，证据链完整）。
- **先 ①b 适配后 ①c 落账（0.1.7 的分批顺序）**：time-context 行改 insert 在旧 pin 上必撞
  web-app 出厂行的重复 id（硬拒）⇒ 适配与换基座不可分批验证，输给"合并事务单 commit"。
- **嵌套环境修 face 构建**（造 root stub entry / 深挖 tsdown self-inclusion 机制）：造产物 =
  无源之产（root 包无 src），且 staging 已证同一 SHA 能完整构建 ⇒ 输给"staging 产物拷回"。
  root-entry 的长期正路 = **提上游**（tsdown 根配置 entry 引用无人产出的产物，上游 CI 从不命中）。
- **窗口期 install 用 `CI=true pnpm install`（frozen）**：pnpm 在 CI 态默认 frozen-lockfile，vendor
  新增 workspace 依赖（`dsh-experimental-schedule-bundle`）即硬拒 ⇒ 必须显式 `--no-frozen-lockfile`。
  另：registry 元数据拉取抖动（ECONNRESET 重试耗尽）会令 install 失败且**污染后续所有测量步骤**——
  窗口脚本必须有 install 重试，且 install 红后其余步骤的数据一律作废（v1/v2 窗口即此教训）。

## 验收

- delta 报告 + 人审证据 JSON（`notes/2026-09-30-pin-review-dsh-v0.2.0-rc.2.json`，bowhead/2026-09-30）先于簿记提交。
- `pnpm verify` ALL PASS（含 `pin-bookkeeping` / `pin-currency` / `pack-compat` 矩阵 3 列）；
  `sync-dsh` 只读模式报「簿记一致（dsh-v0.2.0-rc.2 @ 639ed015；矩阵 3 列）」。
- 全套门禁实测（详见「实施实况 §验证矩阵」）：verify / test 251 / preset-smoke（五角色真挂载）/
  client-load / release-smoke（真 tarball 安装）/ replay r3+r2 无 key 重放 + `--ui` 委派卡金样 /
  snapshot-motion / presence-e2e（团队全链）/ attention-e2e 7/7（审批全回路，真模型）/
  handbook-smoke / delegation-smoke（真模型）。
- `export-dist` 重导（pack 依赖面变了；`dist-manual` 门禁绿）。

## 风险 / 遗留

- **`_digested` 审计基线未随升**：外部研究树的机制文档核对基线仍停 0.1.7（AGENTS.md 簿记行已加
  历史注记标记）。下次动机制文档时先对 0.2.0 源码复核——升 pin 重校纪律照旧。
- **`probe --full` 未收口（已定性，非 0.2.0 适配问题）**：四轮 8→12→1→1→4 pass，失败全为
  "等待回复超时"。**帧级证据纠正了"并发限流"的初判**（初判写进事务 commit message，勿引用）：
  失败会话的 v4 日志（`session.v4.jsonl.zstd`，0.2.0 新格式+zstd——顺带记：找日志别再 grep
  `*.jsonl`）显示模型在**正常工作**（6 次工具调用、2 条 assistant 消息），卡在 step 3 的 LLM 调用
  **悬挂 ~2 分钟后报 `TRANSPORT` 失败**，vendor 重试梯（`[normal,5,…,500,10000,…]`，maxRetries 5）
  接管续跑——重试机制工作正常，但 probe 等待窗吃不住"单次悬挂数分钟"的传输抖动；probe 每轮因
  persona 的「开工先读 KB」纪律要打 3+ 次 LLM 调用，暴露面远大于单调用（handbook 单调用同刻通过
  的原因）。**复跑判据不变**：低峰期 `--full` 全绿后在本 Note 登记补跑结果；若低峰仍见 TRANSPORT
  悬挂，属提供方容量问题（挂账观察，不属本仓修复面）。可选缓解 = probe 头注的 timeout 默认值上调
  （90s 对"慢轮次 150s+"本就压线），留待下次动 probe 时顺手。
- **BUG-001（手册超字节顶，16384）仍在**：0.2.0 的 agent-instructions 把截断**横幅显性化**
  （"Workspace instruction budget 16384 bytes: truncated from 16757 to 15991 bytes"——r3 重录
  fixture 可见）。本轮日期口径节改写净减约 260 字节（缓解未治愈）；修复归 BUG-001 卡自身的流程，
  修后 r3 重录会再次带上（横幅字节随手册长度漂，重放归一化不含它——同代录制同代重放不受影响）。
- 搁置池回看（`_done/_misc/suspended.md`，规矩点名才读）：0.2.0 新增 `schedule-bundle`（出厂
  schedule + ui-schedule，可选 bundle）/ `tool-workflow` / `tool-jobs` / `session-query` 等面——
  **「自主节律」的复活条件（外部触发 ↔ 会话内自主续跑 seam）可能已部分到位**，值得单独开推敲卡
  核实（本轮不复活、不立项，只登记证据）；「并行快捷派活」的 per-child composition 未见对应 seam。

## 实施实况

**结果**：commit `78fb7de`（事务）+ `984415e`（证据 JSON + delta 报告）。vendor 钉 `dsh-v0.2.0-rc.2`；
`pnpm verify` ALL PASS；`pnpm test` 251/251；官方 sync-dsh 只读核对簿记一致。

**消费面适配（①b，全部落在事务 commit）**：
1. `cordis.patch.yml`：time-context 行**替换 → insert**（进既有 insert 列表首项；显式
   `disabled: false` 保留——insert 语义下默认 enabled，写显是文档），注释改记 0.2.0 迁移事实。
2. `dev/company.overlay.yml`：headless 补偿 insert **移除**（双轨收敛；两处都插会撞重复行 id 硬拒）。
3. pack manifest：24 个 peer range → `^0.2.0-rc.2`、cordis → `^4.0.4`；兼容矩阵加列
   `dsh-v0.2.0-rc.2`（`pack-compat` 绿）。root devDeps 无需动：工具链版本 0.2.0 已逐字一致，
   workspace 链接按 REQUEST_EXTENSION 理由保留（vendor 新根把工具包链接挪走了，与本仓诉求无关）。
4. **公司手册「日期口径」纠偏**：`8585637`（09-29 日期通道）欠下的同 diff 正文——原文仍写"没有
   任何取真日期的通道"；改记通道已上线（写真日期）+ 故障时 fail-closed 占位。净减 ~260 字节。

**落账（①c）**：verify.mjs `expectedTag/expectedSha`、AGENTS.md §vendor 簿记（加历史基线注记，
`pin-currency` 的历史标记豁免生效）、submodule HEAD、root lockfile（`--no-frozen-lockfile` 再生成；
vendor 根新增 schedule-bundle 依赖被吸收）、staging 产物拷回（~230 个 lib/dist 目录）。
另两处现在时文件的旧 pin 字面量：AGENTS.md 簿记行注记措辞 + `_closed_plans` 推敲卡加「当时」标记
（`pin-currency` ×2 红 → 绿，反证即本轮门禁输出）。

**测试基建随行为变化同 diff（scripts/ 本仓自由区）**：
1. `replay-smoke`：**日期通道墙钟归一化**（`<time-context-sample>` / `<time-context-elapsed>`，
   fixture 侧与重放侧对称——time-context 的 durable 注入是 0.2.0 上机制工作的直接证据，时间戳
   天然逐次不同）；**Preview Notice 首启模态**处理（0.2.0 新增，`ui-settings-models` welcomeTitle，
   按钮同名 Continue；Internal Testing Notice 同款"等出现再关"）。
2. `attention-e2e`：两连首启模态处理 + **待办入口定位器修正**——这是 09-27 页签更名
   （需要你→待办，commit fe99093 轮）欠下的脚本债：真模型档当时未重跑，脚本一直潜伏红
   （找「需要你」按钮/「需要你处理的事」列表均已不存在）。0.2.0 实测：入口是右栏 guide **按钮**
   （dockkit tabs 只有 Start，诊断转储留证后改按钮 role）；面板 v2 形状（等你处理/刚完成，
   列表 aria-label 待办事项，`待批审批` Tag 文案未变）。
3. r3-delegation **重录**（真模型：1 lead + 1 child、lead 37 行；fixture/sidecar 四份随
   system prompt 文案与工具表更新——cordis inspect 双工具进表）+ **ui 金样重录**（`--refresh-ui`；
   委派卡状态词 `Worked` → `Completed`，0.2.0 文案变化；卡的可访问名与渲染断言先于金样落盘）。
4. `snapshot-motion` PASS（actual 捕获 + independent expected 保留，无重录需求）。

**验证矩阵（2026-09-30，HEAD=78fb7de）**：
`verify` ALL PASS ／ `test` 251/251 ／ `preset-smoke` ALL PASS（五角色真挂载）／ `client-load` ALL PASS
（品牌槽渲染）／ `release-smoke` ALL PASS（npm pack → 干净 profile → 真安装 → roster + session/create）／
`replay-smoke` r3 全量零 diff + r2-motion ALL PASS ／ `replay-smoke --ui` 委派卡端到端 + 金样零 diff
ALL PASS ／ `snapshot-motion` PASS ／ `presence-e2e` 状态链 ALL PASS（真模型）／
`attention-e2e` 7/7 ALL PASS（触线→审批→面板→人批→同轮收口，真模型）／ `handbook-smoke` ALL PASS ／
`delegation-smoke` ALL PASS（控制名归团队版边界）／ `export-dist` ALL PASS ／
`probe --full` **1/15 未收口**（形态与判据见 §风险）。

**收割项候选（0.2.0 可见新面，未判收——升级纪律不捆绑，逐条判收归后续队列）**：
schedule-bundle（可选 bundle：schedule/ui-schedule 出厂行）· tool-workflow / workflow-ptc / tool-ralph ·
tool-jobs / jobs-local · tool-session-query / session-query-sqlite · ui-settings-session-log ·
browser-use 全家（chrome-devtools-mcp / playwright-mcp / stagehand-native）· computer-use 全家 ·
otel（product-telemetry-otel）· skill-office · dsh-web-fetch-http · typert "strict definition
withdrawn" 报错语义（本轮测量窗口实测：vendor lib 产物缺失时 gateway 全 RPC 红——机制上比
0.1.7 更 fail-loud）。

## 未验证 / 待续

- `probe --full` 收口补跑（判据见 §风险）；`--ui` 之外的浏览器巡检未扩面（本轮只保既有判据绿）。
- harvest 清单逐条判收（上表候选 → 后续队列，含搁置池「自主节律」复活条件的单独核实）。
- bootstrap.md 的 vendor 构建配方段未改（staging 路径只记在本 Note）——下次动 bootstrap 时把
  "vendor 换 tag 配方 = staging 构建拷回"写进 runbook，避免下一轮升 pin 再撞一遍。
