# bugs/ · 这次不修的缺陷

当场修掉的不建卡——**仅限非材料性**（判据唯一家 = [章程](../README.md)「缺陷的通道」；材料性修复要请示授权并报留痕）。建卡表示发现时决定这次不修。一文件一张 `BUG-<NNN>-<slug>.md`，新卡与索引行同次新增。同一轮拿到 ≥3 张卡，先按根因分组列表再逐卡修——逐症状打补丁会把同一根因修三遍。

**下一个缺陷号**：Next BUG ID = 80；已分配 BUG-001..079。本目录与 [已修缺陷](../_archive/fixed_bugs/README.md)、[待修缺陷](../_archive/suspended_bugs/README.md) 一起算，取已分配最大号加一；编号在本文件维护。

修好 `git mv` 到 [fixed_bugs](../_archive/fixed_bugs/README.md)，查明未修到 [suspended_bugs](../_archive/suspended_bugs/README.md)；挂起不是修好。保留文件名与讨论正文，frontmatter 的 `status` 分别改成 `已修` / `待修`，状态行补修复或未修原因，卡顶补 `留痕：` 行，修相对链接并更新两边清单。

## 活跃清单

**2026-11-11 根因组 A（产品类型轴三处各自为政）——已收口**：允许值、默认值、播种各有一份事实。
三张卡已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；次序 = 先定单一来源 → 再校准默认 →
再让播种消费；证据 = [Note](../../notes/implemented/2026-11-11-product-type-single-source.md)。

| 卡 | 一句话 | 严重级 |
|---|---|---|
| [BUG-079](BUG-079-ceo-teammate-spawn-header-no-child-channel.md) | CEO teammate header 列 `spawn`，但它没有可用 child 通道；`controlsChildren` 又与 vp-eng teammate 相反 | P2 |
| —（本轮） | BUG-076 / 077 / 078 已修并迁 [fixed_bugs](../_archive/fixed_bugs/)：座位矩阵第二层（team 拆协作/spawn、九件套 guard + seat note、control 按 child 能力）；见 [Note](../../notes/implemented/2026-11-11-seat-matrix-team-collaboration.md) | — |
| —（本轮） | BUG-071 / 072 / 073 / 075 已修并迁 [fixed_bugs](../_archive/fixed_bugs/)：能力事实四载体（安装 / 座位 / header / 文档+内容）对齐；见 [Note](../../notes/implemented/2026-11-11-capability-seat-single-source.md) | — |
| —（本轮） | BUG-074 复核为**误报**（WeakSet 不挡 re-provide；`ctx.set` 不是 re-provide），已迁 [fixed_bugs](../_archive/fixed_bugs/BUG-074-per-agent-inject-not-reinstalled-on-service-change.md)：保留 guard + 注释 + 真 Cordis spec；见 [Note](../../notes/implemented/2026-11-11-inject-reentrancy-false-positive.md) | — |
| —（历史） | BUG-067 / BUG-068 / BUG-069 / BUG-070 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：pack 路径 / tier / 政策数字 / 委派真值四类声明↔载体对账；见 [Note](../../notes/implemented/2026-11-11-declaration-carrier-gates.md) | — |
| —（历史） | BUG-064 / BUG-065 / BUG-066 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：方法契约（类型适用性 + 事实载体 + fail-closed）+ `method-contract` 门禁；见 [Note](../../notes/implemented/2026-11-11-method-contract-type-facts.md) | — |
| —（历史） | BUG-056 已修并迁 [fixed_bugs](../_archive/fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md)：质量环裁决头哈希改由 pack 内 `verdict-hash.mjs` 回填；`未复验` 成为 audit warning | — |
| —（历史） | BUG-054 / BUG-055 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：dev/rehearsal kb 改由 seed.json 派生；team 角色包补任务书路径 + 署名行只抄真实文件 | — |
| —（历史） | BUG-051 / BUG-052 / BUG-053 已修并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：worker family 的 control 过滤 + fan-out 诚实声明；`subagent_retry` 取消收敛 | — |
| —（历史） | BUG-050 复核为**环境陈旧误报**（dev profile 安装副本未更新），已迁 [fixed_bugs](../_archive/fixed_bugs/BUG-050-retry-depth-fix-fails-in-real-assembly.md)；BUG-045 / 046 / 047 / 048 / 049 已修 | — |
| —（历史） | BUG-045 / BUG-046 / BUG-047 / BUG-048 / BUG-049 全部修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)：retry 注册面/深度单源 + 越界可见拒绝；`list_subagents` 暴露引擎身份；handbook 按 worker family 派生；UI 金样随显示名收窄刷新 | — |
| —（历史） | BUG-034 / BUG-035 已修并迁 [fixed_bugs](../_archive/fixed_bugs/)：SA/SQA 证据链必查（时间源 + 故障路径耐受）+ 审计 Q8–Q11；2026-11-07 E2E v8 验收 | — |

## 2026-11-11 修复交接（根因组 S：BUG-076 / 077 / 078）

**用户指令（2026-11-11）**：「现在你再看看bug里头有3个新的bug……把这3个bug都修了，系统性的先看看明白。」
本句即本轮授权（材料性：host 模型可见文案/行为 + content + docs），留痕 = Note。

三张卡同一根因 = **座位矩阵只建了一半**：BUG-072 只建模了“能不能 spawn”一个布尔，其余座位面仍按
preset 或单一 Lead 布尔推导：
- **076** = support root 只撤了 spawn 守卫；vendor `team:policy`/`team:identity` 与任务/消息面仍在（ghost task）；
- **077** = 一个 `team` 通道同时表示“Lead 的 spawn 权”与“成员的协作面”，teammate 被误伤；
- **078** = 控制工具按 preset 装，不看这个座位有没有 child（CEO teammate 拿到死工具）。

修法不逐卡打补丁：先建一个 `DelegationSeat`（lead/teammate/support + teamLead/teamCollaborate/controlsChildren），
header/section、guard、control 三处都读它；team 在 header 拆成 `team collaboration` 与 `team spawn (Lead only)`；
guard 从 spawn 扩到九件套；control 按“这个座位能不能拥有 child”装（不按 preset/角色一刀切）。
次序 = seat 判据 + spec → header/section/guard → control → 文档与 Note。

**收口（2026-11-11）**：三张卡已修并迁 [fixed_bugs](../_archive/fixed_bugs/)，两张索引同步；
`pnpm test` 199 files / 1594 tests、`pnpm typecheck`、`pnpm lint`、`pnpm dup`、`pnpm verify`、`preset-smoke` 全绿。
证据 = [座位矩阵 Note](../../notes/implemented/2026-11-11-seat-matrix-team-collaboration.md)。

## 2026-11-11 修复交接（根因组 F/G/H：BUG-071..075）

**用户指令（2026-11-11）**：「_backlog/bugs 有不少bug你要看看……最后把所有的bug都修了吧，你先盘算盘算。」
本句即本轮授权（材料性：host 模型可见文案 + company-pack 公开行为 + preset skill + 文档），留痕 = Note。

五张卡按**根因**分三组，不逐症状打补丁：

| 组 | 卡 | 同一根因 | 修法 |
|---|---|---|---|
| **G 注入生命周期** | [074](../_archive/fixed_bugs/BUG-074-per-agent-inject-not-reinstalled-on-service-change.md) | 原假设 = 把可重入的 `ctx.inject` 当成“每 Agent 跑一次”的 setup；**实测证伪** = WeakSet 只挡重复 `agent/created`，re-provide 仍重跑；卡里的 `ctx.set` 复现不是 re-provide | 保留三个 WeakSet 在正确位置 + 注释；真 Cordis spec 钉「re-provide 重装 / `ctx.set` 不通知 / 重复 created 不重复装」；红证 = 把 WeakSet 挪进 callback 即红 |
| **F 座位能力面** | [071](../_archive/fixed_bugs/BUG-071-capability-header-not-installed-wording.md) / [072](../_archive/fixed_bugs/BUG-072-support-root-can-spawn-team.md) / [073](../_archive/fixed_bugs/BUG-073-readme-one-shot-child-team-tools-stale.md) | 同一个能力事实有四个载体（工具安装 / 座位权限 / header 文案 / README+合同），各说各话 | 071 = 文案改“本座位不可用”（安装 ≠ 可用）；072 = support preset 不作 team 座位（header/section 不列）+ per-agent `spawn_teammate` guard；073 = README 已知限制改现行事实并回链守卫 |
| **H 内容单源** | [075](../_archive/fixed_bugs/BUG-075-eng-teaming-schema-rule-duplicated.md) | 合同缩编只搬长段、没扫表格短句，形成“声明不复述 + 实际复述” | 五档表删 schema 引擎句，只留用法判据；全 preset 扫描同型残留 |

**次序 = G → F → H**：G 先做（独立；结论 = 误报，保留 guard + 补真 Cordis spec）；F 再动 header/guard/文档；H 最后收内容。
**收口（2026-11-11）**：五张卡已修/已证伪并迁 [fixed_bugs](../_archive/fixed_bugs/)，两张索引同步；
`pnpm test` 198 files / 1581 tests、`pnpm typecheck`、`pnpm lint`、`pnpm verify`、`preset-smoke` 全绿。
证据 = [座位 Note](../../notes/implemented/2026-11-11-capability-seat-single-source.md) ·
[注入生命周期 Note](../../notes/implemented/2026-11-11-inject-reentrancy-false-positive.md)。

**2026-11-11 后续（E5–E11，根因组 B/C/D/E）——已全部收口**：经营组 B/E（064–066）与
内容/门禁组 C（067–069）+ 委派语义（070）均已修复并迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；
证据 = [经营组 Note](../../notes/implemented/2026-11-11-method-contract-type-facts.md) ·
[声明↔载体 Note](../../notes/implemented/2026-11-11-declaration-carrier-gates.md)。

## 2026-11-11 修复交接（内容/门禁组 C + D：BUG-067 / 068 / 069 / 070）

**用户指令（2026-11-11）**：按审计建议 064 → 065/066 → 067–069 → 070 排期继续收口。
四张卡同型 = 声明↔载体漂移（pack 路径 / tier 标签 / 政策数字 / `maxDepth` 例子）；
修法 = 新 `pack-content-paths` + `content-manifest` tier 对账 + `content-single-home` 派生词表 +
`base-clean` 个案语言 denylist + 委派真值表 spec；留痕 = Note。

| 卡 | 根因 | 修法 | 留痕 |
|---|---|---|---|
| [BUG-067](../_archive/fixed_bugs/BUG-067-process-docs-dead-pointers.md) | pack-relative 死指针 | 新门禁 `pack-content-paths`；4 处 process-docs 指针改类型包 | Note |
| [BUG-068](../_archive/fixed_bugs/BUG-068-base-clean-deployment-case-language.md) | 门禁判据窄于教义 | 服务类附赠整块搬 policy-lines；`base-clean` 加 charter 个案语言 denylist | Note |
| [BUG-069](../_archive/fixed_bugs/BUG-069-tier-policy-gate-coverage.md) | tier / 政策数字自由文本 | `content-manifest` 解析 `加载：` 对账；`content-single-home` 从 policy-lines 派生词表 | Note |
| [BUG-070](../_archive/fixed_bugs/BUG-070-delegation-maxdepth-example-wrong.md) | 文档例子违背绝对语义 | `delegation.md` 真值；vendor `resolveChildDepth` keyless spec | Note |

**收口（2026-11-11）**：四张卡已修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；`pnpm verify` / `pnpm test` /
`pnpm typecheck` / `pnpm lint` 绿；决定与红→绿证据 = [Note](../../notes/implemented/2026-11-11-declaration-carrier-gates.md)。

## 2026-11-11 修复交接（经营组 B/E：BUG-064 / 065 / 066）

**用户指令（2026-11-11）**：「没事，出来的继续做……都修好」「按审计建议 064 → 065/066 → 067–069 → 070 排期」——
本句即本轮授权（材料性：presets / content / docs）。三张卡同型 = 方法没有声明类型 / 事实、缺了不 fail-closed；
修法 = 方法契约 + 事实载体（`kb/rates.md` / `kb/roster.md`）+ `method-contract` 门禁；留痕 = Note。

| 卡 | 根因 | 修法 | 留痕 |
|---|---|---|---|
| [BUG-064](../_archive/fixed_bugs/BUG-064-methods-not-product-type-aware.md) | 方法不随类型 | 10 个经营侧 skill 加方法契约；项目制方法只适用 hardware-software，business-software fail-closed；三个 workflow 加类型分派 | Note |
| [BUG-065](../_archive/fixed_bugs/BUG-065-cfo-rate-card-missing.md) | 费率无出处 | 新增 `content/company/rates.md` → seed `kb/rates.md`；CFO 方法改读；`<待填>` = 配置缺口 | Note |
| [BUG-066](../_archive/fixed_bugs/BUG-066-coo-person-level-staffing-without-roster.md) | 证据粒度错位 | 新增 `content/state/roster.md` → seed `kb/roster.md`；COO 三态区分配置缺口 / 真没人 | Note |

**收口（2026-11-11）**：三张卡已修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；`pnpm verify` / `pnpm test` /
`pnpm typecheck` 绿、`preset-smoke` ALL PASS；决定与红→绿证据 = [Note](../../notes/implemented/2026-11-11-method-contract-type-facts.md)。

## 2026-11-11 修复交接（根因组 A：BUG-061 / 062 / 063）

**用户指令（2026-11-11）**：「_backlog/bugs 也发现了几个bug，你看一看，判断一下修的次序，我们把它都修好吧」——本句即本轮授权。
三张卡同根因（产品类型轴三处各自为政：允许值 / 默认值 / 播种），按「先定单一来源 → 再校准默认 → 再让播种消费」
次序修复；修复触碰 `presets/_shared/skills/product-definition/`、`content/{charters,templates,state,kb-setup,product-types}/`、
`docs/guides/` 与 host 代码（company-pack 公开行为 + docs 合同 = 材料性），按章程「材料性修复不自授权」本应请示；
用户本轮明确点名修复，按「已由用户授权的工作按原授权继续」执行；留痕 = Note。

| 次序 | 卡 | 根因 | 修法 | 留痕 |
|---|---|---|---|---|
| 1 | [BUG-061](../_archive/fixed_bugs/BUG-061-product-type-allowed-values-drift.md) | 允许值多源 + 幽灵第三类 | 类型目录 = 唯一枚举；agent 面改指针；新门禁 `product-type-sources`；`project-services` 标未来类型（沿用 2026-11-10 决定） | Note |
| 2 | [BUG-062](../_archive/fixed_bugs/BUG-062-default-product-type-contradicts-business.md) | 默认值不随业务 | 默认改 `business-software`；`/req check` 回执点名 company 回落来源 | Note |
| 3 | [BUG-063](../_archive/fixed_bugs/BUG-063-bootstrap-process-docs-always-hardware.md) | 播种不看类型 | seed 用 `{productType}` 占位；bootstrap/tools 解析 + 缺/未知 fail-closed | Note |

**收口（2026-11-11）**：三张卡已按上述次序修复并迁 [fixed_bugs](../_archive/fixed_bugs/)；
`pnpm verify` / `pnpm test` / `pnpm typecheck` 绿、`preset-smoke` ALL PASS；决定与红→绿证据 =
[Note](../../notes/implemented/2026-11-11-product-type-single-source.md)。

**收口要求**：每卡按「已修判定」留真红→绿证据与 `审查：` 记录，再 `git mv` 到
[fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引；`pnpm verify` + `pnpm test` 全绿
（TS 面加 `pnpm typecheck`）；改 preset skill 后跑 `preset-smoke`。

## 2026-11-10 修复交接（BUG-057）

**用户指令（2026-11-10）**：「先修 BUG-057；058 留决策」——本句即授权。BUG-057 触碰 pack 公开命令面
（`/req check` / `/prd check`），属材料性；留痕 = Note。

| 根因 | 卡 | 留痕 | 收口方式 |
|---|---|---|---|
| 操作员 slug 直接 `join` 进 deliverables 路径 | [BUG-057](../_archive/fixed_bugs/BUG-057-command-slug-path-traversal.md) | [Note](../../notes/implemented/2026-11-10-command-slug-boundary.md) | 共享 host-only `resolveDeliverablePath`（单段正则 + `relative` 纵深）；两条命令 spec 红→绿 + 真入口复跑 |
| dataBlocked 压成布尔、回执说「无 … 问题」 | [BUG-058](../_archive/fixed_bugs/BUG-058-command-datablocked-reason.md) | [Note](../../notes/implemented/2026-11-10-command-blocked-reason.md) | `CompanyRuntime.blockedReason` + `blockedCompanyText` 四处共用；guard/命令 spec 红→绿 + 无 workspace 真入口复跑 |
| 质量环 audit 的原文索引跨轮全局 | [BUG-059](../_archive/fixed_bugs/BUG-059-quality-loop-audit-r2-session-index.md) | commit 86410729 | `Map<sessionId,index>`；R2 新 verifier session 合成红→绿 + 真盘 R2 audit ALL PASS |
| 只读命令被启动态 dataBlocked 挡住 | [BUG-060](../_archive/fixed_bugs/BUG-060-readonly-command-session-workspace.md) | [Note](../../notes/implemented/2026-11-10-readonly-command-session-workspace.md) | `commandWorkspace` 用会话 cwd；`/req`/`/prd` 红→绿 + 无 workspace 启动真入口 success；写命令不改 |

## 2026-11-10 修复交接（第二轮：BUG-054 / BUG-055）

**用户指令（2026-11-10）**：「我有两个bug，你看一看，按照我们的流程把它修了吧」——本句即本轮授权。
BUG-055 触碰 `presets/` + `content/generic/`（company-pack 公开行为 = 材料性），按章程「材料性修复
不自授权」本应请示，但用户已在本轮明确点名修复，按「已由用户授权的工作按原授权继续，不重复请求批准」
执行；留痕按材料性规则给 Note。BUG-054 只动 `tools/` + tests + 指南事实句，非材料性，留痕记
`commit 684d09db`（工作树另有并发会话的 BUG-056 卡与 issue 卡改动，未纳入该提交）。

| 根因 | 卡 | 留痕 | 收口方式 |
|---|---|---|---|
| 旁路 fixture 与生产 seed 三份清单漂移（mirror 10 件 vs seed 14 件） | [BUG-054](../_archive/fixed_bugs/BUG-054-dev-rehearsal-kb-policy-lines-missing.md) | commit 684d09db | 新增 `tools/lib/kb-seeds.mjs`；mirror / `bundle-init` 只从 seed.json 派生；parity spec 钉同清单/同字节/only-fill |
| 角色包缺任务书字段、署名行写死默认路径 | [BUG-055](../_archive/fixed_bugs/BUG-055-team-role-packet-missing-taskbook.md) | [Note](../../notes/implemented/2026-11-10-team-role-packet-taskbook.md) | 角色包加 `任务书` + `署名行`；spawn 前先落 `drafts/ceo.md`；署名行只抄真实路径；presets spec + 真模型探针 |

## 2026-11-10 修复交接（第三轮：BUG-056）

**用户指令（2026-11-10）**：「你这两个半修好了之后，现在又有多余的一个新的bug了，你就继续修」——
BUG-056 是第八轮 exploratory 中发现的 P2；本轮修复触碰 `presets/_shared/skills/quality-loop` 与
pack 内新脚本（company-pack 公开行为 = 材料性），用户点名即授权。留痕 = Note。

| 根因 | 卡 | 留痕 | 收口方式 |
|---|---|---|---|
| 裁决头 hash 靠手算（`tail \| shasum` 含尾随换行）；裁决后改产物无可见标记 | [BUG-056](../_archive/fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md) | [Note](../../notes/implemented/2026-11-10-quality-loop-verdict-hash.md) | pack 内 `verdict-hash.mjs`（`--fix`/`--check`/`--body`）+ skill/guide 只教工具 + audit `post-verdict-unverified` warning；keyless + self-test + 真盘 evidence |

**2026-11-10 修复交接（第一轮：BUG-051/052/053，已收口）**：

**用户指令（2026-11-10）**：「_backlog/bugs 里面还有3个bug，如法炮制，先琢磨清楚之后按照我们这个repo的来修复吧，你来看看系统性的是不是有些规律，而不是一个一个修」。
三张卡按根因分两组修复并归档；本轮真装配探针另确认：只跑 `tsc -b` 不会更新 `lib/index.js`，
必须先 `tsdown` 重建 bundle（BUG-050 同型教训）。

| 根因 | 卡 | 收口方式 |
|---|---|---|
| E 声明面 / 执行面分裂（capability surface 两份事实） | [BUG-051](../_archive/fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md) ✅ + [BUG-052](../_archive/fixed_bugs/BUG-052-worker-leaf-control-surface.md) ✅ | 051 = 诚实声明（模型 `fanOut: parent-brief`，preset 不再承诺 1–2 硬数字，spec 钉文案）；052 = 硬过滤（control 工具 per-agent 安装，跳过 `WORKER_FAMILY_PRESETS`） |
| F 阻塞原语没有取消语义 | [BUG-053](../_archive/fixed_bugs/BUG-053-cancel-does-not-abort-subagent-retry.md) ✅ | `abortable` race + `ctx.subagents.interrupt(child)`，返回 `aborted`；keyless + 真装配 cancel 探针（35ms 收敛、无残留） |

**2026-11-09 修复后回归**：BUG-050 初报“retry 深度修复在真实装配失效”经复核为**环境陈旧误报**——
dev profile 的 `node_modules/dsh-company-pack` 是旧安装副本，`plugin add link:` 到当前源码后
CMO depth 2 正常返回 `depth-exceeded`。教训：真模型/真入口探针前先确认 profile 安装是当前源码/构建；
`pnpm test` + 重建 `lib` 都不能替代那一步。

**2026-11-08 六张卡同轮来源**：workflow + subagent 探索性测试（问题卡
[exploratory bug hunt](../_archive/settled_issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)）。发现方向 =
R2 强制 workflow + 缺失/坏源（036）、R3 委派深度链（037）、R5 W 分支内再委派（038）、
R7 原样返回全量 rows 的溢出压力（039）、R10 后台 W 中模型自选文本回答（040）、RS1 宿主重启（041）；同轮当场修掉的两条（命名 child 双重回执、CEO sleep 轮询）
记在 [探索 Note](../../notes/implemented/2026-11-08-workflow-subagent-exploration-fixes.md) 与
[研究材料结果节](../_archive/research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。

**2026-11-07 BUG-034/035 收口**：两张 P1 同源——「属性没人测 = 属性不存在」。修法 = 两侧 skill 各加两条条件必查
（记录与时间可信、故障路径的耐受）+ `sa-sqa-quality-audit` 新增 Q8–Q11（SA 侧 + SQA 侧）+ 两条 keyless 用例；
E2E `2026-11-07-portable-overload-detection-v8` 的 SA/SQA 产物 Q1–Q11 全 PASS、收口审计 10/10。
顺带修掉一个让所有 skill 改动都失效的前置缺陷：两个子人格 preset 缺 `tool-skill`、persona 未点名先加载，
技能正文从没被模型读到（run#3/run#4 日志 0 次 skill 名）。教训同 2026-10-19 三张卡：
**量得再准，量的也可能是别的东西**——这次是「技能装上了 ≠ 模型读到了」。

**2026-10-19 BUG-028 收口**：闸门④认总锚（title 或 prompt 点名即算，依赖链一并传递），lingang-recon 由 3 条误报 → 0 条违规；
守卫 = `tests/harness/tools/deliverables-audit.spec.ts` 两条 keyless 断言（锚粒度 + 依赖链）。教训同 BUG-014：
**锚的粒度选错**——判据把纪律的意图（有真跟进为证）翻译成了一种形状（每个 T 号各一条锚），
于是纪律自己鼓励的"一条复查盯全部缺料"反倒撞红。

**2026-10-19 三张卡收口**：BUG-025 四条判定逐条成立，已修迁 [fixed_bugs](../_archive/fixed_bugs/README.md)；
BUG-026 经实证为**误报**（wire 视图 ownerName 273/273 齐全，卡读的是 projcache 的 **state** 行）
已修迁 [fixed_bugs](../_archive/fixed_bugs/BUG-026-owner-missing-from-team-projection.md)（2026-11-09 由 `settled_issues` 改归：误报卡仍进已修缺陷表）；
BUG-027 症状真实但**根因不成立**（`ready ?? readyOf()` 在真 wire 上不可达），按真根因（徽章渲染门槛不看
status）修复后迁 [fixed_bugs](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)。

⚠ **三张卡共用的教训**：复现脚本必须指到**消费者真正读的那一层**。025 量的是盘上的 deliverables
（面板读的是动议表）、026/027 量的是 projcache 的 state（浏览器收的是 wire 视图）——
量得再准，量的也是别的东西。

BUG-001..022 已修迁、BUG-023 误报 [fixed_bugs](../_archive/fixed_bugs/BUG-023-cultivation-float-actions-dead.md)（2026-11-09 由 `settled_issues` 改归）、BUG-024 已修 [fixed_bugs](../_archive/fixed_bugs/README.md)。

## 2026-11-09 修复交接（本轮）

**用户指令（2026-11-09）**：「按照我们的流程排一个计划，之后逐一修复吧」「最好是系统性地看明白了，
从根上去解决……放在一块儿看看根上可能有问题，导致了两个现象或者三个现象」。五张卡（BUG-045..049）
已翻 `修复就绪`；本次修复触碰 company-pack 公开行为 / docs 合同，正常自授权不覆盖——本节用户明确指示
即授权（截至 2026-11-09 的授权记录）。修复按根因分组，不逐症状打补丁：

| 根因 | 卡 | 收口方式 |
|---|---|---|
| A 唯一期望源不覆盖后加能力面（声明↔运行时双源） | [BUG-049](../_archive/fixed_bugs/BUG-049-model-contract-retry-drift.md) ✅ + [BUG-045](../_archive/fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md) ✅ | 模型声明合同载体与 retry 注册面/深度（从 `depthRows.subagent` 派生）；pack `SUBAGENT_RETRY_SURFACE` 成唯一运行时表；`subagent_retry` 按调用者 preset 预算放行/可见拒绝 |
| B worker family 边界按 ID 白名单 | [BUG-047](../_archive/fixed_bugs/BUG-047-worker-family-handbook-scope.md) ✅ | 模型声明 handbook 归属（archetype 派生）；pack 默认按 worker family 派生 skip 集合 |
| C 模型可见面窄于引擎 durable 语义 | [BUG-046](../_archive/fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md) ✅ | `list_subagents` 读 child header 暴露 `agentPreset`/`delegationDepth`，缺失显式 `unavailable` |
| D 显示名变化未触发 UI 金样刷新 | [BUG-048](../_archive/fixed_bugs/BUG-048-ui-golden-brand-name-drift.md) ✅ | 确认意图后刷新金样；补 content→金样同 diff 映射 |

**收口要求**：每卡按「已修判定」留真红→绿证据与 `审查：` 记录，再 `git mv` 到
[fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引；`pnpm verify` + `pnpm test` 全绿（TS 面加
`pnpm typecheck`）；不修改 `vendor/dsh/`。

## 2026-11-08 修复交接（另一 Agent）

**用户指令（2026-11-08）**：“那这样我们可以先停一下，让另外一个Agent去修复发现的所有的bug。”
本区 6 张卡已翻 `修复就绪`：该翻转即门票；**因为修复会触碰 company-pack 公开行为 / docs 合同 /
常设指令，正常自授权不覆盖——本节的用户明确指示才是授权**。修卡不重新推敲范围，按各卡「已修判定」收口。

| 卡 | 级别 | in-repo 修复面（可改） | vendor 侧（只提上游，不改 `vendor/dsh`） |
|---|---|---|---|
| [BUG-036](../_archive/fixed_bugs/BUG-036-workflow-schema-enum-type.md) ✅ | P2 | 已修（2026-11-08）：`eng-teaming` 四条子集约束 + 合同钉子 `tests/harness/contract/json-schema-subset.spec.ts` | `tool-workflow` 的 model-facing description / 子集校验提示（提案待上游） |
| [BUG-037](../_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md) ✅ | P2 | 已修（2026-11-08）：新增 `list_subagents` / `send_to_subagent`（官方 `ctx.subagents`，名字不被团队版 shadow）+ docs/§4 + `eng-teaming` | agent-team 的 `tryMembership` shadow（提案待上游；修好后退役两工具） |
| [BUG-038](../_archive/fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md) ✅ | P2 | 已修（2026-11-08）：`eng-teaming` 分支叶子规则 + 真跑观察（模型首轮自纠）+ 钉子 `workflow-contract-smoke` 第 6 条 | `workflow-ptc` 分支结果只取最后一轮结论（提案待上游） |
| [BUG-039](../_archive/fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md) ✅ | P1 | 已修（2026-11-08）：vp-eng preset 抬 `maxResultChars` 到 200k；探针证 spill 全文 71,677 字符可读；钉子 `tests/harness/contract/workflow-result-budget.spec.ts` | `tool-workflow` 默认值下先截断再落盘的语义（提案待上游） |
| [BUG-040](../_archive/fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md) ✅ | P2 | 已修（2026-11-08，产品规避）：`eng-teaming` 分支禁传 schema、改单行 JSON + 父 parse；smoke 第 7 条 | `runtime.ts` 缺形状不匹配诊断（上游提案保留，恢复 schema 前必须有） |
| [BUG-041](../_archive/fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) ✅ | P1 | 已修（2026-11-08）：`list_subagents` 带 `lastTurnEnd`（durable 日志读，RS1 实测 interrupted）；ops 部署前置一行 | resume 时补 `subagent/end` 通知（体验增强，不再阻塞） |

**收口要求**：每卡修完翻 `修复已落地`，写 `## 已修判定` 对应的真红→绿证据与 `审查：` 记录，再 `git mv`
到 [fixed_bugs](../_archive/fixed_bugs/) 并同步两张索引；`pnpm verify` + `pnpm test` 全绿；
不修改 `vendor/dsh/`（vendor 侧写清上游提案即可）。探索轮已落地的缓解（skill/docs/注释）不重复做，
先核对再补缺口；证据落 `runtime/tmp/explore/`（gitignored）或新 keyless spec。

## frontmatter 与模板

第一行 `---`，字段按 `status` / `severity` / `opened` 顺序。活跃状态 = `调查中`（原 `活跃`，2026-10-12 改名——与「活跃清单」撞词）/ `修复就绪` / `修复已落地` / `等人拍板`，出口值 `已修`/`待修`；翻转法与修复授权边界唯一家 = 章程「双轨状态生命周期」「缺陷的通道」。严重级为 `P0` 阻断 / `P1` 重要 / `P2` 次要——哪个级别走哪条通道见章程（severity 的消费者）。迁档时仅改 `status`，其余字段保留，状态行补 `审查：agent｜用户｜跳过 — 理由`。

```markdown
---
status: 调查中
severity: P1
opened: YYYY-MM-DD
---

# BUG-<NNN>：<一句话标题>

> 严重级别：P1（重要）｜发现：YYYY-MM-DD｜状态：调查中
>
> **留痕**：（归档时写三选一：`Note <notes/ 下真实路径>` ｜ `commit <sha>` ｜ `none — 理由`；判据 = 章程「缺陷的通道」的材料性）

## 症状

## 根因（假设）

## 暴露的失败类
本缺陷代表哪类失败；是否需要横切排查及其范围。

## 复现

## 修复关联

## 已修判定
修成什么算修好；可点名验证搭载的工作（其验证随那次运行给出真实答案才动）。翻转到 `修复就绪` 前必须写好——该翻转即门票且授权（限 P1/P2 修复型；排除项见[章程](../README.md)「缺陷的通道」，此处不列）。`修复就绪`/`修复已落地` 缺这一节 = `pnpm verify` 红（门禁查形状，不查判据写得对不对）。
```
