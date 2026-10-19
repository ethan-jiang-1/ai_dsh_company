# 2026-10-19 · 升 pin：原 `dsh-v0.2.0-rc.2`（历史）→ `dsh-v0.2.1-rc.2`

状态：已交付（基座钉 `dsh-v0.2.1-rc.2` = `687f282e8625c6b8d11ff58211a90524be2e4317`；事务 commit 见 §落账）。

## 问题

本仓原钉（历史）`vendor/dsh` = `dsh-v0.2.0-rc.2`（`639ed015`），上游已发 `dsh-v0.2.1-rc.2`（`687f282e`）。
用户点名升 pin 并要求**验证本仓插件仍兼容**，验收线 = "端到端测试过了才算升级结束"。

先搜后写：本决定**部分取代** [2026-09-30 升 0.2.0 的 Note](./2026-09-30-pin-upgrade-0.2.0-rc.2.md) §收割项候选
（schedule-bundle 那一项**本轮判收**：退役并被 preset 行所有权接管，见 D-E）与
[roles-isolation §2](../../docs/design/roles-isolation.md) 的"M2 需自写 provider"结论（就地补记已不需要）。
没有同主题的第二本账。

0.2.1 不是发布 bump 而是**模型级改动**（三份上游升档指南：`v0.2.1-alpha.1/subagent-activations`、
`v0.2.1-alpha.1/subagent-preset-composition`、`v0.2.1-alpha.3/plugin-engines-dsh`）：

1. **委托 = activation**：`dsh-tool-subagent` 删除 `backgroundMode` / `enableRunInBackground` /
   `persona` / `toolFilter`（Config 硬拒，preset 会被标 broken）。每次调用返回
   `{ kind: 'activation', subagentId }`（线上 `started subagent <id>`），child 终稿以**父会话完成通知**
   送达（`subagent-settled` / `notice`）；`job_output` / `job_kill` 不再代收 subagent。
2. **child 的人格只能由 `agentPreset` 给**（不钉 = 继承父 preset）。
3. **schedule bundle 退役**：宿主 `schedule` 服务与 `ui-schedule` 由 web-app 组合挂；
   `time-context` + `tool-schedule` 变成 **preset 行所有权**。
4. team 的 `maxPendingMessagesPerMember` 删除；`tool-session-query` 包搬到 `packages/experimental/`。

## 方案（测量窗口 + 单合并事务，0.2.0 先例）

1. **staging 树构建**（D27 在案：嵌套工作区跑不了 vendor face 构建）：`git archive` 候选 →
   独立 install（本地 store + npmmirror）→ `pnpm run build` 9/9 绿 → 产物按清单 `git check-ignore`
   守门拷回（17935 个文件，`snapshots/` 排除）→ vendor `git status --porcelain` 零行。
2. **窗口内 red→green 逐项重校**（先测后改，每项留红证）：preset 形状 → delegation-smoke →
   replay → docs/tests。
3. **簿记最后写**：门禁全绿后才动 `pin.mjs` / AGENTS.md / 兼容矩阵 / submodule 指针（同一 commit）。

## 决定（含"待你裁决"一件）

- **D-A · 角色 preset 取代 per-tool persona**（已做）：`vp_eng` → `agentPreset: vp-eng`、
  `vp_sales` → `vp-sales`。人格/技能文案不再维护第二份；child 也从"继承 CEO 的工具与 skills"
  变成"拿到该角色的面"——这是 0.2.1 的收益，那条 2026-10-02 的"child 只带 CEO skills"记账随之作废。
- **D-B · 新增 `researcher` preset（待你裁决）**：CEO 的通用委托行必须钉一个 preset，否则 child
  继承 CEO = 一个没有 CEO 判断材料的"迷你 CEO"。我选了最小代价方案：新增只读调研手 preset
  （`presets/researcher/`，`tool-fs` 显式 `write:false` / `edit:false` + 检索/联网/todo，
  **没有** skills、没有 journal/CHARTER 义务）。它是**手不是第五个职能**，不进
  `COMPANY_ROLE_IDS`（在场板/培养面/署名都不出现）。名册因此 5 → 6 张卡（order 9 排最后）。
  - 备选（我否掉的）：① 通用委托行也钉 `vp-eng` —— 语义谎报（所有调研都自称 VP-Eng）；
    ② 干脆不提供通用委托 —— 砍掉 CEO 的并行调研手。
  - **要撤很容易**：删 `presets/researcher/` + `package.json` 的 patch 行 + `COMPANY_SUPPORT_PRESET_IDS`。
- **D-C · CEO 不挂续驶控制行**（维持 D18）：team shadow + 名册寻址没变，subagent child 仍够不到；
  activation 模型只是把"终稿怎么回来"改了，不改变"能不能续驶"。
- **D-E · schedule-bundle 判收 → preset 行所有权**（已做）：`time-context` + `tool-schedule` 进五个
  角色 preset 的 `preset-clock` 组（钉 `Asia/Shanghai`），宿主 `schedule` 服务与 `ui-schedule`
  页由 web-app 组合给。组合层的替换行删掉（0.2.1 下它是 not found 丢弃，留着就是假声明）。
  这条把 0.2.0 Note 的"收割项候选"里 schedule-bundle 那一项**判收完毕**。
- **D-D · 兼容矩阵继续累加**（追加 `dsh-v0.2.1-rc.2`，4 列）：`^0.2.0-rc.2` 在 includePrerelease 下
  本来也满足，但 peer range 仍显式升到 `^0.2.1-rc.2`——升 pin 是记账决定，不是巧合满足。

## 输掉的方案

- **官方 `tools/sync-dsh.mjs --pin`**：第③步 vendor 自建在嵌套工作区不可实现（D27）⇒ 输给 staging 构建 + 拷回。
- **先改代码再切候选**：`backgroundMode` 残留在 0.2.0 上是合法的、在 0.2.1 上是 broken——两侧都绿的时刻
  只有"合并事务"这一种（0.2.0 先例同理）⇒ 输给测量窗口内一并重校。
- **persist/mount 卡在旧 provider**：`agentPreset` 是官方 provider 的性质，自写 provider 无必要 ⇒
  输给"三行工具各钉一个 preset"（`docs/design/roles-isolation.md` §2 已就地补记）。
- **replay 侧放宽判据**（把 r3 降档 presence）：会丢掉 r3 独有的全量保真 ⇒ 输给**重录 + 归一化补词**。
- **改 provider 让 `session/page` 认 child 地址**：为读一个字段动 vendor = 违反铁律 ⇒ 输给"读 child 日志首帧"。

## 验收（全部实跑，2026-10-19）

| 层 | 命令 | 结果 |
|---|---|---|
| 结构 | `pnpm verify` | **ALL PASS**（含 `vendor-pin` `pin-currency` `pack-compat ×4` `vendor-clean`） |
| 回归 | `pnpm test` | **667/667**（67 spec） |
| 挂载 | `preset-smoke` | **ALL PASS**：5 角色 + researcher 全部真挂载，零 broken |
| 安装形状 | `release-smoke` | **ALL PASS**（npm pack → 干净 profile 真安装 → roster/session → 首启自举幂等） |
| 重放（full 档） | `replay-smoke --scenario r3-delegation` | **ALL PASS**（归一化零 diff + 4 sidecar 零 diff，11–13s 无 key，重录后连跑 3 次稳定） |
| 重放（presence 档） | `replay-smoke --scenario r2-motion` | **ALL PASS**（member/task 集合等价 + 在场板同形，37s） |
| 端到端 · 手册 | `handbook-smoke` | **ALL PASS**（ceo 注入公司手册，非开发 AGENTS.md） |
| 端到端 · 汇报线 | `delegation-smoke --delegate` | **ALL PASS**：收到 activation 回执、child `agentPreset=vp-eng`、child 目录 67 工具且无 Team 工具 |
| 端到端 · 团队 | `presence-e2e-smoke` | **ALL PASS**（3 状态链，37s） |

## 实施实况

**vendor 面**：staging 构建 9/9 绿（130s，"recorded 325 client artifact(s)"）→ 拷回 17935 文件 →
vendor 树内 `pnpm install --frozen-lockfile`（vendor node_modules 是 .gitignore 覆盖的产物面，
0.2.1 新增 `node-addon-require-builtin` 依赖，不刷就 boot 即红：`host preparation failed`）。

**消费面适配**（全部同 diff）：
1. **五个角色 preset**：删 `backgroundMode` / `enableRunInBackground`；各加 `preset-clock` 组
   （`time-context` 钉 `Asia/Shanghai` + `tool-schedule`），插在 persona 之前。
2. **CEO delegation 组**：`tool-subagent`（`subagent` → **`subagent_research`** + `agentPreset: researcher`）、
   `vp_eng` / `vp_sales`（`agentPreset` 取代 persona + one-shot 两位）。
   **形态取"最小形"**：中途试过把 fork、workflow 编排位一并挂回来（原 0.2.0 有此两者），实测把 r3 重放的
   投递时序竞态放大（模型多了一轮"要不要 fork/workflow"的推理）且没有本仓场景需要它 ⇒ 撤掉，
   persona 里对应的 workflow 句子同 diff 删除（工具不在场就不许写进 persona）。
3. **`cordis.patch.yml`**：dead `time-context` 替换行 → 说明注释（行归 preset）；`agent-team` config
   去掉 `maxPendingMessagesPerMember`。
4. **`package.json`**：39 个 peer range → `^0.2.1-rc.2`；新增 `dsh-tool-schedule` peer；patch 数组加
   `./presets/researcher/agent.cordis.yml`；兼容矩阵加列。
5. **簿记四处**：`checks/gates/lib/pin.mjs`（tag/SHA）、AGENTS.md §vendor 簿记、
   `dsh.compatibility.dshReleases`、submodule 指针（+ root `pnpm-lock.yaml` 重生成）。

**测试基建随行为变化同 diff**：
1. `delegation-smoke` **重写教义 + 判据**：回执断言由"前台拿到 child 正文"改为"收到 activation 回执"；
   `[3]` 改为读 child 日志**首帧** `agentPreset`（0.2.1 起 child 地址在 gateway 侧被边界校验拒绝，
   `session/page` 读不了它）+ 断言 Team 工具不在场；目录表加 `subagent_research`。
2. `replay-logic.mjs` **新增两处归一化**：runtime-context 快照里的 `harness:source` / `app:web-surface`
   **整表整句** token 化（0.2.1 起会话正文带上本机 checkout 路径与随机端口——重录实测两段全红，
   diff 全落在这一节）。Section 名与位置仍被断言（漂移仍会红）；spec 同 diff 扩两行。
3. `r3-delegation` **重录**（真模型 2 段，lead 46 行 + 1 child）+ 场景组合两侧补 `time-context` 行；
   `snapshot.yml` 记 `reRecordedAt` 与重录理由。
4. `release-smoke` / `replay-smoke` 的临时 profile **删掉 schedule-bundle**（退役 + 与 preset 行撞重复 id）；
   `tools/export-dist.mjs` 的安装手册去掉"再装节律 bundle"那一步。
5. `tests/presets/presets.spec.ts`：三条断言按新契约重写（agentPreset、preset-clock、researcher 守卫）；
   `tools/lib/company-roles.mjs` 新增 `COMPANY_SUPPORT_PRESET_IDS`，presets 门禁与 preset-smoke 一并覆盖它。

**红→绿证据（每项都先看到红）**：
- `delegation-smoke --delegate`：`模型可见工具目录里没有 subagent`（改写期自伤删了 delegation 组）→
  `child preset = (未知)`（读错字段）→ 绿。
- `preset-smoke`：`tool-fs-search / tool-todo invalid config`（researcher 抄行名没抄必填 config，
  与 0001 postmortem 同一个坑）→ 绿。
- `replay-smoke --scenario r3-delegation`：先 `5 FAILURE(S)`（runtime-context 的 harness:source /
  web url 漂移）→ 归一化补词 + 重录后仍红，diff 落在**投递簿记**：`session-log-deepseek/delivery-accepted`
  与 `agent/inbox/spliced` 的先后（录制带 200ms 流间隔 ⇒ 屏障先、splice 在 `step/start` 之后；重放瞬间
  收口 ⇒ 两向都出现过），以及 `throughSeq` 的数值（同一次投递 38 vs 37）——**位置是墙钟、内容是语义**。
  取"序列判据剔投递簿记 + 独立『投递内容集合等价』判据"（`splitDeliveryPlumbing`），`throughSeq` 因
  vendor 快照归一化强制其为数字，只能在**读回时** token 化（盘上仍是合法录制）→ 重录后连跑 3 次
  `ALL PASS`。**输掉的修法**：① 在 `replay-logic.mjs` 里 token 化 `throughSeq` —— 装配阶段就被 vendor
  拒（`must be a non-negative safe integer`）；② 相邻对重排（保留 seq）—— 换了个形状的同一处红（投递
  还会跨 `step/start`），且等于把判据放宽到能吞掉真漂移。
- `replay-smoke --scenario r2-motion`：green（presence 档不吃这两节）。
- `pnpm verify`：`vendor-pin` / `pin-currency` / `bare-path docs/profile.md:61` /
  `link _backlog/_archive/.../2026-10-13-dsh-capabilities.md` 四处红 → 逐条修指针 → ALL PASS。

**顺带修的旧债**：`docs/profile.md` 的 `agent-team/src/mailbox.ts` 指针（0.2.1 已无此文件）、
归档研究文里 `session-query/tool-session-query/README.md` 指针（包已搬）、
`notes/implemented/2026-10-12-backlog-process-made-explicit.md` 的过期 pin 字面量。

## 风险 / 遗留

- **`researcher` 是新增的发布面**（待裁决，见 D-B）。它已进 `preset-smoke` 与 presets 门禁，
  但**不在**在场板/培养面/交付物署名的枚举里——若裁决要它成为"第六角色"，那三处要一起改。
- **`_digested` 审计基线**仍是 0.2.0rc.2 的核对结论；下次动机制文档先对 0.2.1 源码复核。
- **`maxPendingMessagesPerMember`** 已从 pack patch 与 ops 表删除，但**没有**替代的"信箱条数背压"
  参数——若将来出现消息洪水，处置面只剩 `maxMessageBytes` + 任务板 `maxTasks`。
- 关于 r3 场景：重录用的是**当前**组合，所以它检测的是"组合漂移"，不是"0.2.0 升 0.2.1 的行为差"；
  后者由 `delegation-smoke` / `presence-e2e` / `handbook-smoke` 三条真模型链路覆盖。
