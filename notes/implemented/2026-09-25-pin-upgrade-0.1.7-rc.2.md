# 2026-09-25 · 升 pin：dsh-v0.1.5-rc.2 → dsh-v0.1.7-rc.2

状态：已交付（2026-09-25 落地并收尾：基座已换到 `dsh-v0.1.7-rc.2`，消费面适配全绿；实施实况见文末）

## 问题

本仓钉住 `vendor/dsh` = `dsh-v0.1.5-rc.2`（`fb2c4b9e698e30edb738bca4cf0618587db7d203`，submodule 干净、
`pnpm verify` 的 `vendor-pin` + `vendor-clean` 双门禁在案）。2026-09-25 只读核对：上游已发到
**`dsh-v0.1.7-rc.2`（`477b4f420553e8a52c2fbccc464d7561b239c443`，2026-09-24 21:39）**。

- 钉住版与 0.1.7 系列之间共 **7 个 tag**（rc.3 / 0.1.6-alpha.1–2 / 0.1.7-alpha.1–2 / 0.1.7-rc.1 / 0.1.7-rc.2）；
  `pin → rc.1` = 3304 commit（其中 **2211 non-merge**，与增量报告口径一致）。
- 既有材料 [upstream-delta](../research/2026-09-24-dsh-upstream-delta.md) +
  [pin-upgrade-and-harvest](../research/2026-09-24-pin-upgrade-and-harvest.md) 以 **rc.1** 收口，
  [ROADMAP.md](../../ROADMAP.md) 的 ⏸ 行也写 rc.1 ⇒ **靶落后一个 tag**。
- 研究树本地尚无 rc.2 对象（其 tag 只到 rc.1）。**2026-09-25 阶段 0 已实测核实**：`rc.1 → rc.2` =
  **346 commit / 3429 文件 / +136,313 −24,518**，且落在本仓依赖的面上（`user-questions` 含 timed waits and
  late replies、`approval` 说明本地化与 auto-review、`preset` 19、`schedule` 20 含禁用 shipped schedule、
  `projection`、`workspace-files` 链接解析）——**不是纯发布 bump**。GitHub API 早先显示的 317/317 只是那一个
  merge commit 自身的版本号改动，不代表区间。明细见 [upstream-delta §⑦](../research/2026-09-24-dsh-upstream-delta.md)。

## 方案

1. **阶段 0 · 靶校正【已取证，待收口】**：rc.2 已抓进 `vendor/dsh`（**https 官方 GitHub，7.7s；不动 origin、
   不动 vendor HEAD**；ssh:443 在本机 VPN 后不通）。`rc.1 → rc.2` 增量已核实并写进增量报告 §⑦；两份研究材料的
   靶已改 rc.2，ROADMAP 已按 rc.2 立项。**取源结论 = https**；submodule 的 origin 仍指本机研究树（未改）。
2. **阶段 1 · 三步走（2026-09-25 阶段 0 实证后改序：官方脚本的事务模型装不下消费面改动）**
   - **①a 候选测量窗口**（登记偏离，短窗口、不留 commit）：把 submodule HEAD 切到 `dsh-v0.1.7-rc.2`
     （tag checkout，vendor tracked 零改动）→ `pnpm install` + host 面构建 → 跑现有门禁
     （`verify` / `test` / `preset-smoke` / `client-load` / `probe`）→ 产**[《实测影响面清单》](../research/2026-09-25-pin-upgrade-impact.md)**
     （哪道门禁、红/绿、归属原因、适配动作）→ **还原 HEAD**。窗口期内 `vendor-pin` 门禁红属已知。
   - **①b 消费面适配**（在旧 pin 上落地并 commit）：peerDependencies 重写（`dsh-agent-presets` 在 0.1.7
     不存在 ⇒ `dsh-agent-preset` + `dsh-agent-preset-registry`；range 对齐新 release）+ **bundle 补丁行**
     （[cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 引用的旧包名）+ preset 声明迁移
     （完成定义 = `preset-smoke` 真挂载）+ client 数据层重写（`remote.agentTeams` → 投影；
     完成定义 = client-load + presence-e2e + 快照回归）。静态门禁可过（`pack-compat` 只查"矩阵含当前 tag"，
     不查 peer range）；**代价 = 这一两个 commit 处于"声明已朝 rc.2、基座仍旧 pin"的短暂不一致**（可回滚）。
   - **①c 官方落账**：`node scripts/sync-dsh.mjs --pin dsh-v0.1.7-rc.2 --process-review <证据 JSON>`
     ——事务式：verify → fetch tag → 暂存新簿记/矩阵 → checkout 候选 → install → vendor 自建 → test +
     built `release-smoke` → 全过才写簿记/矩阵 → 再 verify。失败自动回滚；迭代到全绿。
   - 细项照增量报告 §⑥：⑤ 快照回归策略（V3 照跑 + 新录 V4 + 单向门写进 Note）；⑥ 发布链全量
     （`release-smoke` 穿新 peer 兼容门禁 + `deliverables-check` + `delegation-smoke`）；⑦ 15 条收割项升级后独立进队列。
3. **阶段 2 · 收割项登记**（升级后）：从增量报告 §④ 的 15 条里逐条判"对本 pack 的用途 + 建议立项与否"，
   各给归宿（ROADMAP / 搁置池）。其中与**自治 seam** 相关的（job 完成唤醒 idle owner、workflow、
   `schedule` 现状）顺手核对，作为搁置池「自主节律」的复活判据输入——只登记证据，不因它改升级范围。

## 输掉的方案

- **先 `sync-dsh` 再改 peerDependencies（原计划 ①→②）**：阶段 0 实证证伪——脚本要求"干净树 + 起手
  `verify` 绿 + 全程消费面不变"，而本包的 bundle 补丁引用 `@deepseek-ai/dsh-agent-presets`，该包在 rc.2
  **不存在**（拆为 `dsh-agent-preset` + `dsh-agent-preset-registry`）⇒ release-smoke 在候选上必挂，脚本
  无法承载消费面改动；输给"先测量、再适配、后官方落账"（①a→①b→①c）。
- **停在 rc.1**：rc.2 紧随其后（仅发布工程 commit），单独钉 rc.1 一落地即落后；输给"钉最新 rc"。
- **钉研究树 HEAD 而非 tag**：vendor 铁律与 [release.md](../../docs/release.md) 要求钉 SHA/tag 并走发布门禁，
  HEAD 未过门禁；输给"钉 tag"。
- **把 15 条收割项塞进升级条目**：增量报告 §⑥⑦ 明说"不捆绑"（两天级工程会被拖成不可验收的大条目）；
  输给"升级单独立项、收割项后置"。
- **为"跑满 8 小时"自建调度循环**：搁置池已判缺上游 seam，且 D9/D13 禁自建调度器；输给"提 seam"。

## 验收

- 阶段 0：研究材料与 ROADMAP 的靶一致为 rc.2；`rc.1 → rc.2` 增量有本地证据——**已达成：结论 = 非纯发布，
  346 commit / 3429 文件，落在 user-questions·approval·preset·schedule·projection·workspace-files 六面
  （增量报告 §⑦）**。
- 阶段 1：**先产出[《实测影响面清单》](../research/2026-09-25-pin-upgrade-impact.md)**（跑过哪些门禁、各自红／绿、红条的归属原因与适配动作、未覆盖的面），
  再逐项消红；`pnpm verify` 的 `vendor-pin` + `vendor-clean` 在 rc.2 上重校通过；`preset-smoke` 五角色真挂载；
  client-load + presence-e2e + 快照档绿；`release-smoke` 穿新兼容门禁；[AGENTS.md](../../AGENTS.md) 的
  vendor 簿记与兼容矩阵同步。
- 阶段 2：15 条收割项各有"立项／不立项 + 理由"与归宿。

## 风险

- 已列于增量报告 §⑤：peer 破面、preset 声明迁移工程量、V4 单向门；另有"`baseUrl` 解析环境"与
  "web-app 启动面兼容性"两项**需实测**。
- **阶段 0 推翻了"纯发布 bump"的预期**（rc.1→rc.2 = 346 commit，见 §⑦）⇒ 阶段 1 的《实测影响面清单》
  必须按这份增量逐面核对，不能只看 peer 破面那一项。
- 升级期间日用全局安装与本仓基线会分叉：按 [dev-loop §6](../../docs/guides/dev-loop.md) 的双 home 纪律跑，
  防"安静用错 home"。
- 取新 tag 的路径有一处现实坑：`vendor/dsh` 的 origin 指向本机研究树 `/Users/bowhead/deepseek-harness`，
  而 `.gitmodules` 写的是官方 GitHub ⇒ 阶段 0 先定取源，再动 submodule。


## 实施实况（2026-09-25）

**结果**：`vendor/dsh` 钉 `dsh-v0.1.7-rc.2` = `477b4f420553e8a52c2fbccc464d7561b239c443`；
`pnpm verify` ALL PASS；`pnpm test` 178/178；`preset-smoke` ALL PASS（五角色真挂载）；
`client-load-smoke` ALL PASS（真浏览器）；`release-smoke` ALL PASS（npm pack → 干净 profile → 真安装 → roster + session/create）；
官方 `node scripts/sync-dsh.mjs` 只读模式报「簿记一致（dsh-v0.1.7-rc.2 @ 477b4f42；矩阵 2 列）」。

**消费面适配（①b）**：
1. 根 `package.json`：`dsh-agent-presets`（0.1.7 已拆）→ `dsh-agent-preset` + `dsh-agent-preset-registry`；**这是 install 级阻塞**。
2. pack manifest：peer 名同步 + 全部 `dsh-*` range → `^0.1.7-rc.2`；`dsh.bundle.patch` 由字符串改**数组**（registry + 五角色）；新增 peer `@deepseek-ai/dsh-client-ui-workspace`（rc.2 打开会话统一走 `uiWorkspace.openSession`）。
3. `cordis.patch.yml`：`agent-presets`（roots 目录扫描，0.1.7 已移除）→ `agent-preset-registry`（`default: ceo`，按 id 替换 web-app 的 insert）。
4. 五份 `presets/<role>/agent.cordis.yml`：包成 `- insert:` + 一行 `dsh-agent-preset`（`config.plugins` 内联原行）；`preset.yml` 的 name/description/order 内联后删除；`customSkillDirs` 的 `baseUrl` 语义变了（旧 = 预设文件目录，新 = profile 目录）⇒ 改 `node_modules/dsh-company-pack/presets/<role>/skills/`。
5. **client 数据层重写**：`remote.agentTeams` 随 agent-team 的 `./remote` 导出在 0.1.7 整体移除 ⇒ 团队态改读 **Lead 会话的 `agentTeam` 投影**（`useSessions(state => state.projectionsBySession[lead]?.values.agentTeam)`，`useSessions` 来自槽标准 props）；成员语义随之改判（投影只给持久 `phase`，不再有 live 忙闲）⇒ `presence.ts` 加 `presenceStatusFromPhase`（`active` → 待命）；`sessions.open/openSubagent/current` 移除 ⇒ 导航统一 `uiWorkspace.openSession`；`PreparingToolCall` 无 `argsRaw` ⇒ 卡片收窄读；图标 `IconChecklistOutline14` → `…Medium`。
6. 门禁与测试：`pack-bundle` 接受字符串或数组；preset 结构门禁不再要求 `preset.yml`；`tests/presets.spec.ts` 的旧 `discoverPresets` 源码路径在 rc.2 不存在 ⇒ 改判声明形状（真挂载归 preset-smoke）；`presence-board.spec.ts` 夹具改 `phase`。
7. 环境：vendor postinstall `install-lefthook` 与 submodule 布局不兼容（`core.worktree` 在 common config）⇒ 构建带 `CI=true`（上游自带逃逸口）；root lockfile 的 `xlsx` CDN 条目缺 integrity（pnpm 重新解析时拒装）⇒ 按 vendor 自己的 lockfile 补齐。

**⚠ 登记偏离（D27）**：官方 `sync-dsh --pin` 的**事务跑不通**——它第③步要 vendor 自建，而 `pnpm --dir vendor/dsh run build` 在本仓**嵌套工作区**里必失败：
`ERROR [@deepseek-ai/dsh-root] Cannot find entry: ["lib/types/{index,invariant,startup}.js"]`（根包无 src/exports，无人产出这三份 entry；
旧 pin 时代它们以旧产物形式躺在树里，故一直未暴露；`tsdown -F` 无法排除根配置，vendor 自带 `clean` 在 rc.2 自身报错）。
**同 commit 的独立 staging 树（`git archive` + 独立 install）则能完整构建** ⇒ 结论 = 本仓嵌套形状与 vendor 自建不兼容，非上游缺陷。
本次落账方式 = **手工同步四处簿记**（`verify.mjs` 常量 / `AGENTS.md` 簿记 / pack 兼容矩阵 / submodule HEAD）+ 全套门禁留证（含 release-smoke 认证档），
**未执行** `sync-dsh` 的事务（install + vendor 自建 + test + built release-smoke 那一串）。

**未验证 / 待续**：
- `probe --full` / `handbook-smoke` / `delegation-smoke` / `presence-e2e` / `attention-e2e`（真模型档）**本轮未跑**——升 pin 已改变角色会话的基座，建议作为 ① 的收尾认证补跑。
- **快照/回放档**（两轮实测，进展与剩余）：
  1. `snapshot-motion-smoke` **PASS**。
  2. `replay-smoke` 启动器签名已修（rc.2 `materializeProfilePatch(source, cwd, profile, targetDir, index)` 多 `profile`）。
  3. 组合层已解：四处夹具（r2/r3 × cordis.yml/cordis.snapshot.yml）的旧 `agent-presets`+roots 行换成
     `agent-preset-registry` 行；五个角色预设行**不复制**（避免两份事实），改由 `replay-smoke` 用**可重复的 `--patch`**
     追加 `packages/company-pack/presets/<role>/agent.cordis.yml`（rc.2 的 `--patch` 是可重复收集器）。
  4. `r3-delegation` 已在 rc.2 **重录**（`--record`：1 lead + 1 child、lead 35 行）⇒
     `sidecar system-prompt/tool-schemas 零 diff` 由红转绿（说明录制与当前基座的提示/工具表对齐）。
  5. **无 key 重放已全绿**（根因与修法）：rc.2 的补丁**替换行校验 name** ——
     夹具里 `- id: llm-deepseek` 仍写旧包名（`@deepseek-ai/dsh-llm-deepseek`，rc.2 该行已换 `-api-key` 变体）
     会**整行被跳过**（组合转储可见 `patch: name mismatch … skipping`），而 rc.2 又多了一行
     `llm-deepseek-account` —— 两处叠加 ⇒ 真 LLM 路由仍注册 ⇒ 重放落真路由报 `MISSING_CREDENTIAL`。
     修法：四处夹具的 `llm-deepseek` 行按 rc.2 名字逐字对齐（`-api-key`）+ 补禁用 `llm-deepseek-account`；
     随后重录（lead 39 行 + 1 child）⇒ `replay-smoke` **ALL PASS**（两会话归一化零 diff + 四份 sidecar 零 diff）。
     `--scenario r2-motion`（presence 档）**ALL PASS**（在场板 5 行同形）。
  6. **`--ui` 浏览器档已全绿（三层根因逐层剥开）**：
     - ① 搜索框占位符 rc.2 改名（`Search sessions...` → `Search session names`；aria 未变）⇒ 定位器更新；
     - ② `expandTurnProcesses` 只点 enabled 的 `[data-turn-process]`（rc.2 里无过程的轮次 toggle 带 `disabled`），
       并**补点 rc.2 新增的步骤过程分组**（`message.stepProcess.done.tools` = "Called tools"，旧 pin 无此层）——
       委派卡就在这个折叠组里；
     - ③ **真根因**：rc.2 的 client 模块表（`window.__DSH_BOOT__` 的 `dsh.client` 行）**按 profile 的 node_modules 解析**，
       而本条 lane 是裸 `--patch` + 临时 home（没有 profile 安装）⇒ 本包 client 半解析不到，
       品牌槽与委派卡一起缺席（截图实证：侧栏显示官方 "DSH Local Build" 而非 "DSH Wochen Team"）。
       修法 = 给临时 profile 补**最小安装形状**（`node_modules/dsh-company-pack` 符号链接 + `dsh.profile.bundles` 声明）。
     之后按规矩重录（lead 36 行）+ `--refresh-ui` 刷金样 ⇒ `replay-smoke --ui` **ALL PASS**
     （委派卡渲染 ×1 + aria 树含委派卡 + 金样零 diff）；`r2-motion` 与 `r3-delegation` 的无 key 重放均 **ALL PASS**。
     附带教训：**一个回调里返回 disposer 数组**的 keyed 注册写法在 rc.2 下不生效（改为官方同形的"一键一 inject"）——
     这处虽不是本次卡的根因，但已按 rc.2 形状改正。

**补充实测（同轮稍后）**：
- `attention-e2e-smoke` **ALL PASS（7/7）**：触线 → 审批 → 注意力面板 DOM → 人点 Allow once → agent 同轮收口
  全回路在 rc.2 上通（唯一的适配是同一处搜索占位符改名）。
- `presence-e2e-smoke` **仍红**：它轮询的 RPC `agentTeams/view` 在 0.1.7 **已移除**（返回 `not found`）⇒
  三条状态链断言全挂。rc.2 的对应读法已核实：**`SessionControlController.control` 流**（`packages/api/session-controller/src/control.ts`）
  给出一个 `baseline` 帧 + 随后逐条 `{ type: 'projection', sessionId, key, value, seq }` 帧，
  团队态 = Lead 会话的 `agentTeam` 投影值。**待做** = 把该脚本从"轮询已移除的 RPC"改成"消费 control 流的投影帧"。

**presence-e2e 收口（同日）**：**ALL PASS**（41s；vp-eng/vp-sales 接活 phase=active → task pending → in_progress@vp-eng → completed 全链）。
rc.2 迁移路径（无 key 探针实证）：`agentTeams/view` RPC 已移除 ⇒ 改读 **`session/projections`**
（`{ request: { sessionId } }`——参数按 manifest 包在 `request` 里，与 `session/create` 同形；
返回 `{ asOfSeq, values }`，团队态 = `values.agentTeam`，成员只给持久 `phase`）。
**事故教训（自伤，值得记）**：迁移补丁里一步"改文案"的 `replace('agentTeams/view', …, count=1)`
首处命中的不是注释而是**真正的 RPC 调用**（头部注释写的是 `agentTeams.view` 带点号）⇒ 端点名被改成整句中文
⇒ 连续四轮 404 "not found"，且表象（"endpoint 404"）与真因（"字符串替换改坏调用点"）相距甚远。
复盘：对"改文案"类替换也要 assert 命中处上下文；排查时先 `grep` 实际调用点再谈机制。

**① 收官证据（2026-09-25 晚，HEAD=d7bb267 全量复跑）**：
`verify` ALL PASS ／ `test` 178/178 ／ `preset-smoke` ALL PASS（5 挂载 + 技能隔离 + 闭包 lint）／
`client-load` ALL PASS（品牌槽 + 零 loader 错误）／ `release-smoke` ALL PASS ／ `deliverables-check` ALL PASS ／
`handbook-smoke` ALL PASS ／ `snapshot-motion-smoke` PASS ／ `replay-smoke` r3 全量零 diff + r2 presence **ALL PASS** ／
`replay-smoke --ui` 委派卡端到端 + 金样零 diff **ALL PASS** ／ `attention-e2e` 7/7 **ALL PASS** ／
`presence-e2e` 状态链 **ALL PASS** ／ `probe --full` **15/15 ALL PASS**（前三跑失败项各不相同 ⇒ 确证提供方抖动）。
**换基座（队列 ①）就此交付**。余项均属后续队列：15 收割项（阶段 2，RFC 明示不捆绑）、D27 嵌套工作区 vendor 自建的长期解。
