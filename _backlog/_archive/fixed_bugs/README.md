# fixed_bugs/ · 已修复缺陷卡

从 [`../../bugs/`](../../bugs/README.md) 迁入。卡片保留文件名和讨论正文，状态行记录修复判定，卡顶写 `留痕：` 行（`Note <路径>` / `commit <sha>` / `none — 理由`；判据 = 章程「缺陷的通道」）。编号计数器唯一家 = [`../../bugs/README.md`](../../bugs/README.md)（本文件不复述数字，避免两处漂）。归档索引 = [`../README.md`](../README.md)，制度 = [`../../README.md`](../../README.md)。

## 修复流水（倒序）

- **BUG-160..167**（2026-11-14，根因组 A–D，P1×1 + P2×7）：focus v2 修复后的回归扫（Round 89），
  仍是「同一事实两个解释」——
  **A** 文档文本形状层：[160](BUG-160-req-check-raw-text-bom-fence.md) `/req check` 与 `/prd check` 分叉、
  [162](BUG-162-prd-html-comments-parsed-as-definitions.md) HTML 注释当定义 → 新 `lib/markdown-shape.ts` 共享；
  **B** [161](BUG-161-pre-push-merge-commit-surface-skip.md) merge 提交漏检 → `commitPaths()` 第一父 diff；
  **C** [164](BUG-164-req-in-multiple-slices.md) REQ 跨 slice、[165](BUG-165-slices-escaped-pipe.md) 转义竖线、
  [166](BUG-166-prd-changelog-format.md) changeLog 日期/作者；
  **D** [163](BUG-163-notes-tree-rejected-status-unguarded.md) rejected 生命周期漏检、
  [167](BUG-167-notes-tree-invalid-calendar-date.md) 非法日历日期 → notes-tree 全覆盖。
  每卡红→绿证据见卡内 `## 已修判定`；`pnpm test` 247 files / 2057 tests、`test:checks` 4 PASS、
  `typecheck`/`lint`/`dup`/`verify` 全绿。详见 [形状层 Note](../../../notes/implemented/2026-11-14-shape-layer-and-structure-semantics.md)。

- **BUG-152..159**（2026-11-14，根因组 A–D，P1×4 + P2×4）：exploratory Round 86（C8/C9/C10）八张卡，
  同一病根 = 同一功能的两个载体各有一套解释，修法都是先收成唯一事实源——
  **A** headings PRD 文本形状层：[152](BUG-152-prd-headings-crlf-bom.md) BOM/CRLF 归一化、
  [153](BUG-153-prd-headings-fenced-code-blocks.md) 围栏感知扫描、[157](BUG-157-prd-duplicate-ac-slice-ids.md) AC/slice 重号；
  **B** present 闸门与命令/工具同源：[154](BUG-154-prd-gate-numbering-empty-value.md) `numberingMarker()`、
  [155](BUG-155-prd-gate-stale-session-cwd.md) `ctx.workingDirectory.ensure`、
  [156](BUG-156-prd-gate-symlink-unreadable-fail-open.md) `readCompanyFileAt()` 三态 + 载体登记；
  **C** [158](BUG-158-pre-push-zero-sha-range.md) push 范围按 zero-SHA 语义分派（新分支 = 出站提交集，删 ref = 跳过）；
  **D** [159](BUG-159-client-error-ring-empty-object-message.md) 错误环先字段后 JSON，`{}` 不再吞 `event.message`。
  每卡红→绿证据见卡内 `## 已修判定`；`pnpm test` 247 files / 2046 tests、`test:checks` 4 PASS、
  `typecheck`/`lint`/`dup`/`verify` 全绿。详见 [八缺陷 Note](../../../notes/implemented/2026-11-14-eight-bug-second-sources.md)。

- **BUG-151**（2026-11-13，P1）：upgrade log 叶子目标被 symlink/目录占用时跟随写外/裸抛 EISDIR；
  `appendUpgradeLog` 先 `companyFileProblem` 预检，unsafe 跳过。Safety 矩阵 134 passed；`KNOWN_GAP` 清零。
  详见 [adversarial-shape-matrix Note](../../../notes/implemented/2026-11-13-adversarial-shape-matrix.md)。

- **BUG-147..149**（2026-11-13，根因组 G，P1×3）：最后三处未迁 `company-root` 的直写面——
  [147](BUG-147-export-governance-symlink-root-writes-outside.md) 治理导出根/staging、
  [148](BUG-148-bundle-manifest-root-symlink-writes-outside.md) bundle 身份读写、
  [149](BUG-149-cultivation-root-symlink-writes-outside.md) cultivation/revoke-journal/upgrade log。
  根 symlink 一律拒绝，写 gate + residency 同时过。红→绿见 Note；`pnpm test` 240 files / 1896 tests。详见
  [最后直写面 Note](../../../notes/implemented/2026-11-13-last-direct-writers.md)。

- **BUG-114..139、141..146**（2026-11-13，根因组 A–F，P1×5 + P2×27）：状态根/写 gate/命令边界的第三次回归收口——
  **A** 共享 `company-root`（逐级 lstat + realpath + 原子写）覆盖 catalog/ledger/startup/bootstrap/命令；
  **B** `write-gate` + lease heartbeat token 校验 + 锁路径形状 + 全部旧写入口接 gate；
  **C** startup corrupt/unsafe 可诊断、危险 cwd 回退；**D** 培养命令边界统一 catch、严格 adopt、verify 拒 revoked；
  **E** 投影 null/partial 补 member、workflow FIFO、撤销 BUG-140 的 OOM 兜底；
  **F** 导出沿用旧件、发布清单补 wiki 模板/共享 skill。BUG-140 经复核不成立（测试选址），迁 settled_issues。
  红→绿逐组见 Note；`pnpm test` 238 files / 1827 tests；`typecheck`/`lint`/`dup`/`verify` 全绿。详见
  [状态根/写 gate Note](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)。

- **BUG-104..113**（2026-11-13，根因组 S1–S6，P2×10）：上一轮修复后的回归扫收口——
  **S1** [104](BUG-104-team-task-merge-no-revision-null-view.md) / [112](BUG-112-team-task-unassign-keeps-old-owner.md) /
  [105](BUG-105-stream-error-not-rendered-in-board-dag-tasks.md) 任务板 merge revision/基座/owner 语义 + 三页签流错误条；
  **S2** [108](BUG-108-catalog-symlink-final-outside.md) / [113](BUG-113-command-doc-symlink-outside-workspace.md)
  workspace symlink 穿透（`safe-file` lstat+realpath）；
  **S3** [110](BUG-110-governance-export-rm-before-rename.md) / [111](BUG-111-saved-workspace-non-atomic-write.md)
  导出整目录 staging + backup 回滚；saved temp+rename + corrupt；
  **S4** [109](BUG-109-catalog-warnings-dropped-in-audit-present.md) warnings 传播；
  **S5** [107](BUG-107-deliverables-audit-multi-space-path.md) audit 原始路径；
  **S6** [106](BUG-106-lease-pid-reuse-blocks-writer.md) lease heartbeat/stale 接管。
  红→绿逐卡见 Note；`pnpm test` 238 files / 1827 tests；`typecheck`/`lint`/`dup`/`verify` 全绿。详见
  [回归扫 Note](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)。

- **BUG-090..103**（2026-11-13，根因组 G1–G7，P1×3 + P2×11）：高复杂度面持续探索的 14 张缺陷，按根因收口——
  **G1** [094](BUG-094-bundle-manifest-id-path-traversal.md) / [102](BUG-102-req-delivery-rule-path-traversal.md)
  不可信 id 进路径（单段 slug + residency + 成员校验）；**G3** [090](BUG-090-cultivation-revoke-unreachable-records-deletes-method.md) /
  [091](BUG-091-cultivation-check-revoked-broken-unsafe.md) 培养作用域/对账（reachable + `--orphan` + revoked/broken/invalid）；
  **G2** [096](BUG-096-deliverables-catalog-directory-eisdir.md) / [099](BUG-099-deliverables-audit-nonexistent-final.md)
  存在≠可读（isFile + warnings + audit 目标）；**G4** [092](BUG-092-cultivation-propose-empty-fields.md) /
  [093](BUG-093-cultivation-legacy-migration-invalid-slug.md) 写入/迁移目标域；**G5**
  [097](BUG-097-workflow-runs-mispair-failed-call.md) / [098](BUG-098-presence-pending-transition-shows-deleted.md) /
  [103](BUG-103-tasks-tab-empty-despite-team-task-events.md) 事件配对/状态显式/任务板事件补齐；**G6**
  [100](BUG-100-export-dist-deletes-old-before-pack.md) / [101](BUG-101-concurrent-home-smoke-stale-v2-and-lease-timing.md)
  发布 staging + smoke v3/lease；**G7** [095](BUG-095-workspace-resolution-accepts-tmp-root.md) 危险落点派生。
  红→绿逐卡见 Note；`pnpm test` 236 files / 1788 tests；`typecheck`/`lint`/`dup`/`verify` 全绿；
  `concurrent-home-smoke`、`release-smoke` ALL PASS。详见
  [缺陷横扫 Note](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)。

- **BUG-080..089**（2026-11-12，根因组 W/F/L/V，P1×2 + P2×8）：启动策略 + wiki 的十张同轮缺陷，
  按根因收口——**W** [081](BUG-081-strategy-panel-reads-session-workspace-command-writes-host.md) /
  [089](BUG-089-boot-without-workspace-settings-not-injected.md) /
  [082](BUG-082-strategy-panel-stale-wiki-check.md) 统一 `startupWorkspace`（会话 cwd 优先）+ section 无条件注册 +
  `checkedAt`/watcher 新鲜度；**F** [084](BUG-084-wiki-pointer-lexical-path-permission.md) /
  [085](BUG-085-startup-options-read-limit-fixed-fixture.md) /
  [087](BUG-087-wiki-template-copy-path-repo-only.md) 真实路径 / 选项预算 + fail-loud / 安装视图模板路径；
  **L** [080](BUG-080-en-tab-title-map-missing-strategy.md) /
  [083](BUG-083-company-settings-host-command-strings-mixed-language.md) en 页签从字典派生 + 命令文案双语单一源；
  **V** [088](BUG-088-shipped-links-excludes-wiki-template.md) /
  [086](BUG-086-strategy-button-tooltip-no-values.md) 模板按自身根验链 + tooltip 值。
  红→绿：081 3 failed→42 passed、089 1→4、082 2+2→12、084 4→25、085 1+1→24、087 1→7、080 2→4、
  083 2→12、086 1→6、088 verify FAIL→ALL PASS。`pnpm test` 236 files / 1761 tests；
  `typecheck`/`lint`/`dup`/`verify` 全绿；`ui-scene-smoke --isolated --lang en` 10/10 无中文；
  `release-smoke` ALL PASS。详见
  [缺陷横扫 Note](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)。

- **BUG-079**（2026-11-11，P2）：[卡](BUG-079-ceo-teammate-spawn-header-no-child-channel.md) CEO teammate header 列
  `spawn`，但 depth 1 / childDepth 1 没有可用 child 通道；`controlsChildren` 又与 vp-eng teammate 矛盾。
  修法 = 能力表 `childDepth` + `DelegationSeat.depth/canStartChild`；spawn/fork/retry 按
  `childDepth > depth` 门控，control 消费 `controlsChildren`。红→绿：8 failed / 37 passed → 45 passed；
  `pnpm test` 199 files / 1596 tests；真座位 CEO/VP-Eng teammate 复验。详见
  [座位 spawn depth Note](../../../notes/implemented/2026-11-11-seat-spawn-depth.md)。

- **BUG-076 / BUG-077 / BUG-078**（2026-11-11，根因组 S，P2）：座位矩阵第二层——同一个 `team` 布尔覆盖 spawn/协作/控制三种能力。
  [076](BUG-076-support-root-still-has-team-tools-policy.md) support root 的 vendor team policy/identity + 九件套仍在，
  guard 只拦 spawn（ghost task 可建）；[077](BUG-077-teammate-header-omits-team-collaboration.md) teammate header 只列 spawn，
  把实际可用的协作面否掉；[078](BUG-078-teammate-dead-subagent-control-tools.md) CEO teammate 拿到无 child 的
  `list_subagents`/`send_to_subagent`。修法 = `DelegationSeat`（`seat.ts`）单一判据 + team 拆
  `team collaboration`/`team spawn (Lead only)` + guard 九件套 + seat note + control 按 child 能力装。
  红→绿：guard 收窄到 spawn 1 failed、删 seat note 1 failed、team 回 lead-only 1 failed、去掉 teammate child 判据 1 failed；
  还原全绿。`pnpm test` 199 files / 1594 tests；`typecheck`/`lint`/`dup`/`verify`、`preset-smoke` 全绿。详见
  [座位矩阵 Note](../../../notes/implemented/2026-11-11-seat-matrix-team-collaboration.md)。

- **BUG-071 / BUG-072 / BUG-073 / BUG-075**（2026-11-11，根因组 F/H，P2）：能力事实的四个载体各说各话——
  [071](BUG-071-capability-header-not-installed-wording.md) header 把“本座位不可用”写成“未安装”（teammate 工具面仍有
  `spawn_teammate`）；[072](BUG-072-support-root-can-spawn-team.md) support preset 作为 root 被 vendor 当 Lead、能实际组队，
  “不组队”只是文案；[073](BUG-073-readme-one-shot-child-team-tools-stale.md) README 仍写 0.2.0 的 one-shot child 可见 Team 工具；
  [075](BUG-075-eng-teaming-schema-rule-duplicated.md) `eng-teaming` 声明 schema 事实不在本 skill，表格短句却仍复述。
  修法 = header 改“座位可用”口径 + `isSupportPreset()` 座位判据（support root 不列 team）+ per-agent
  `spawn_teammate` guard + README/合同/内容改现行事实 + 删表内引擎句。红→绿：恢复 `team: lead` 与旧文案 →
  `delegation-contracts.spec` 2 failed / 5 passed；还原 7 passed。新 guard spec 4 passed。`pnpm test`
  198 files / 1581 tests、`typecheck`/`lint`/`verify`、`preset-smoke` 全绿。详见
  [座位 Note](../../../notes/implemented/2026-11-11-capability-seat-single-source.md)。

- **BUG-074**（2026-11-11，P2，**误报**）：[卡](BUG-074-per-agent-inject-not-reinstalled-on-service-change.md) 原假设
  = per-agent 注入用 Agent 级 WeakSet 短路，Cordis `inject` re-provide 后不再装 section/`workflow_runs`。
  真 Cordis 实测：provider 卸载/再挂时 callback 仍重跑，WeakSet 只挡重复 `agent/created`；卡里的
  `ctx.set('tools', …)` 只覆盖值、不通知依赖，不是 re-provide。处置 = 保留 WeakSet + 注释 + 真 Cordis spec
  `tests/host/index/inject-reentrancy.spec.ts`（6 项）；红证 = 把 WeakSet 挪进 callback → 1 failed / 5 passed。
  详见 [误报 Note](../../../notes/implemented/2026-11-11-inject-reentrancy-false-positive.md)。

- **BUG-067 / BUG-068 / BUG-069 / BUG-070**（2026-11-11，内容/门禁组 C + D）：
  [067](BUG-067-process-docs-dead-pointers.md) process-docs 的 4 处 pack-relative 死指针——新增
  `pack-content-paths` 门禁，指针改类型包；[068](BUG-068-base-clean-deployment-case-language.md)
  章程个案语言——服务类附赠整块搬 `policy-lines.md`，`base-clean` 加 charter denylist；
  [069](BUG-069-tier-policy-gate-coverage.md) tier / 10%——`content-manifest` 对账 `加载：` 头，
  `content-single-home` 从 policy-lines 派生 9 个政策数字；[070](BUG-070-delegation-maxdepth-example-wrong.md)
  `maxDepth` 例子——绝对语义真值 + vendor `resolveChildDepth` keyless spec（1/1→THROW、1/2→ALLOW）。
  红→绿：pack 路径 / tier / 30% / 个案句 / 1/1 期望各自造红后还原；`pnpm test` 175 files / 1463 tests；
  `pnpm verify` ALL PASS。详见
  [Note](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)。

- **BUG-064 / BUG-065 / BUG-066**（2026-11-11，经营组 B/E）：[064](BUG-064-methods-not-product-type-aware.md)
  方法不随类型——10 个经营侧 skill 加 `方法契约`（适用产品类型 + 需要事实 + 缺则 fail-closed），
  项目制方法只适用 `hardware-software`，business-software fail-closed；三个 workflow 加类型分派。
  [065](BUG-065-cfo-rate-card-missing.md) 费率无出处——新增 `content/company/rates.md`（seed `kb/rates.md`），
  CFO 方法改读，`<待填>` = 配置缺口。[066](BUG-066-coo-person-level-staffing-without-roster.md) 证据粒度错位——
  新增 `content/state/roster.md`（seed `kb/roster.md`），COO 三态区分配置缺口 / 真没人。
  新门禁 `method-contract`；红→绿：删契约 / 类型 nope / 事实未播种 / workflow 无 fail-closed → 红，还原 → PASS；
  `pnpm test` 174 files / 1458 tests；`preset-smoke` ALL PASS。详见
  [Note](../../../notes/implemented/2026-11-11-method-contract-type-facts.md)。

- **BUG-061 / BUG-062 / BUG-063**（2026-11-11，P1，根因组 A）：产品类型轴三处各自为政——
  [061](BUG-061-product-type-allowed-values-drift.md) 允许值多源（`project-services` 被 agent 面点名、
  CMO 漏 `business-software`）；[062](BUG-062-default-product-type-contradicts-business.md) 默认
  `hardware-software` 与公司主业相反；[063](BUG-063-bootstrap-process-docs-always-hardware.md) fresh 盘
  恒播 hardware-software 合同。修法 = 类型目录成唯一枚举 + `product-type-sources` 门禁；默认改
  `business-software` + `/req check` 回执点名回落来源；seed 用 `{productType}` 占位 + bootstrap/tools
  按类型解析、缺/未知 fail-closed。红→绿：新门 3 类反证 + `seed-integrity` 3 类反证；`pnpm test`
  174 files / 1455 tests；`pnpm typecheck` 绿；`preset-smoke` ALL PASS；E4 差分
  `business == hardware` true→false。详见 [Note](../../../notes/implemented/2026-11-11-product-type-single-source.md)。

- **BUG-060**（2026-11-10，P2）：启动无 workspace 时 `dataBlocked` 把 `/req`/`/prd` 一起挡住，
  侧栏选 workspace 后的会话仍要重启；只读命令不需要 lease。修法 = `commandWorkspace` 用
  `agent.session.header.cwd` 回落；只为「有 workspace」放行只读，写命令仍停写。
  红→绿：两 spec 新用例修前 2 failed → 22 passed；真入口无 workspace 启动 + 会话 cwd 有效 →
  `/req check` success。详见 [卡](BUG-060-readonly-command-session-workspace.md) 与
  [Note](../../../notes/implemented/2026-11-10-readonly-command-session-workspace.md)。

- **BUG-059**（2026-11-10，P2）：质量环 audit 的原文索引用**跨轮全局** `lastTextIndex`；R2 换了新
  verifier session（`cdf67a74`）后仍从 R1（`7ae15c99`）的 index+1 找，新 session 的正文被跳过，
  误报 `not-verbatim`。修法 = `lastTextIndexBySession`（按 session id 记；同 child 续跑才沿用）。
  红→绿：合成 R1/R2 不同 session 用例修前 1 failed → 40 passed；真盘 R2 audit ALL PASS。
  同轮另修正 R1 头 hash（正文已核为 verifier 原文，`verdict-hash.mjs --fix` 重算；不是本卡根因）。
  详见 [卡](BUG-059-quality-loop-audit-r2-session-index.md)。

- **BUG-058**（2026-11-10，P2）：`dataBlocked` 被压成布尔，`/req`/`/prd`/`/deliverables`/`/cultivation`
  回执硬编码「无 workspace/身份/lease 问题」，真实原因却是 lease 被占/未选 workspace；raw session cwd
  不改变启动态。修法 = `CompanyRuntime.blockedReason` 收 guard 的六类原因，`blockedCompanyText` 四处共用
  （原因 + 动作 + 重启提示），不改变停写守卫本身。红→绿：guard 三例 reason 断言 + 四命令 spec 文案断言
  （修前红）→ 1442 tests 绿；真入口无 workspace 回执点名 `DSH_COMPANY_HOME 指向的目录不存在…`，有效 env
  重启后正常。详见 [卡](BUG-058-command-datablocked-reason.md) 与
  [Note](../../../notes/implemented/2026-11-10-command-blocked-reason.md)。

- **BUG-057**（2026-11-10，P2）：`/req check` / `/prd check` 把操作员 slug 直接 `join` 成路径，
  `../zz-outside` 能读出 deliverables 根之外（只读）。修法 = 共享 host-only `resolveDeliverablePath`
  （单段 slug 正则 + `relative` 纵深校验），两条命令不再各拼路径。红→绿：两条 spec 先各 1 failed
  （根外 fixture 被读到且 checker 被调用）→ 20 passed；真入口 `../zz-outside` / `.` / `..` /
  `..%2Fzz-outside` 全拒，合法 slug 回执不变。详见 [卡](BUG-057-command-slug-path-traversal.md) 与
  [Note](../../../notes/implemented/2026-11-10-command-slug-boundary.md)。

- **BUG-056**（2026-11-10，P2）：质量环 verdict 头的 `body-sha256` 靠手算，模型用了 `tail -n +2 | shasum`（含文件尾随换行），audit 按「去掉结尾空白」判 `body-modified`；裁决后改产物只在处置表写「未复验」，audit 看不见。修法 = pack 内新增 `presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs`（`--fix` 按 audit 同口径回填、`--check`/`--body`）；skill §3/guide §2 只教工具并明确排除 `tail | shasum`；`body-modified` detail 补尾随换行提示；audit 对最后一轮 dispositions 的「未复验」给 `post-verdict-unverified` warning；不新增 `artifact-sha256`（理由见 Note 输掉的方案）。红→绿：quality-loop spec 修前 1 failed → **39 passed**；真盘 `--deliverable` 显示 `body-modified`（`5738a1…` vs `d9d252…`）+ 新 warning；工具对副本 `--check` MISMATCH → `--fix` → `--check` OK；audit `--self-test` 7 支 ALL PASS。详见 [卡](BUG-056-quality-loop-verdict-hash-trailing-newline.md) 与 [Note](../../../notes/implemented/2026-11-10-quality-loop-verdict-hash.md)。

- **BUG-055**（2026-11-10，P2）：team 角色包没有「任务书」字段，`work-handoff` 却把署名行路径写死；CEO 只发 spawn prompt 时，成员只能套默认路径，`drafts/coo.md` 的 `任务书` 指向不存在的 `drafts/ceo.md`。修法 = 角色包加 `任务书` + `署名行` 两字段；`assembling-the-team` 第 6 步把「先落任务书再 spawn」写成硬前置；`work-handoff` 署名行改成 `<角色包给的任务书路径>` + `任务书 = 角色包（无文件）` fallback；`collaboration` 角色包清单同步。红→绿：presets spec 新断言修前 1 failed → 43 passed；真模型 `team-taskbook-probe` ALL PASS（294s）：`drafts/coo.md` 首行 `出稿：COO｜版本 v1｜任务书 = .dsh-company/deliverables/2026-11-10-taskbook-probe/drafts/ceo.md`，指向真实文件。详见 [卡](BUG-055-team-role-packet-missing-taskbook.md) 与 [Note](../../../notes/implemented/2026-11-10-team-role-packet-taskbook.md)。

- **BUG-054**（2026-11-10，P2）：dev/rehearsal 旁路各自维护 kb 文件清单，与生产 `seed.json` 三份漂移——mirror 实测 10 件 vs seed 14 件，缺 `policy-lines.md` / `review-protocol.md` / `process-docs.md` / `AGENTS.md`，COO/CFO 在探针里无法闭合预算/并行判据。修法 = 新增 `tools/lib/kb-seeds.mjs`（读 seed.json、缺源 fail-loud），`mirrorCompanyReference` 与 `bundle-init` 只从它派生；parity spec 钉同清单/同字节/only-fill。红→绿：`tests/tools/kb-seeds.spec.ts` 修前 2 failed（10 vs 14）→ 5 passed；`node tools/rehearsal-init.mjs` 后四件全在场；dev 盘跑生产 `bootstrapCompanyWorkspace` created = policy/review/AGENTS、skipped 33（只补缺）。详见 [卡](BUG-054-dev-rehearsal-kb-policy-lines-missing.md)。

- **BUG-051 / BUG-052**（2026-11-10，同一根因：声明面/执行面分裂）：051 = `worker-orchestrator` 的 description/persona 写“1–2 个 leaf”，运行面只有 depth、没有 child-count 闸（4 件 brief 起 4 个 leaf）；052 = host 全局注册的 `list_subagents`/`send_to_subagent` 绕过 worker leaf 的“无 control”声明。修法 = 051 诚实声明（模型 `fanOut: parent-brief, hardMax: null`，preset 去掉硬数字，spec 钉文案）；052 硬过滤（control 工具 per-agent 安装，跳过 `WORKER_FAMILY_PRESETS`；full role/CEO/未知 preset 保留）。真装配：alpha `request/header` 21 tools、无 control，模型自报缺工具；4-task orchestrator 仍 4 leaf（观察，不把 4 当故障）。红→绿：052 过滤收窄 ⇒ 1 failed；051 fanOut/文案改回 ⇒ 3 failed；还原全绿。详见 [BUG-051](BUG-051-worker-orchestrator-leaf-cap-contract.md) / [BUG-052](BUG-052-worker-leaf-control-surface.md) 与 [Note](../../../notes/implemented/2026-11-10-capability-surface-enforcement.md)。

- **BUG-053**（2026-11-10，P1）：cancel parent turn 不能中止 `subagent_retry` 的阻塞 child——root/child 无 `turn/end`、bash sleep 继续跑。修法 = 新增 `abortable`（promise 与 `AbortSignal` race + 摘监听），`startActivation`/`activation.result` 接入；abort 时 `ctx.subagents.interrupt(childId, {kind:'ancestor', agent})` 并返回 `stopReason: aborted`。真装配：cancel 后 35ms root `aborted(user)` / child `aborted(parent)`，retry result `tool call aborted`，`sleep 117` 无残留。红→绿：裸 `await activation.result` ⇒ hung；还原 ⇒ 4 + 15 passed。详见 [卡](BUG-053-cancel-does-not-abort-subagent-retry.md) 与 [Note](../../../notes/implemented/2026-11-10-blocking-tool-cancellation.md)。

- **BUG-050**（2026-11-09，复核为**环境陈旧误报**）：初报“BUG-045 的深度修复在真实装配下失效”来自
  dev profile 的旧安装副本（`profiles/company/node_modules/dsh-company-pack` 13:58 的副本），
  `startWeb --profile company` 加载它，而非当前源码；`pnpm test`/`lib` 重建都不能更新该副本。
  把 profile 改为 `plugin add link:` 当前源码后，CMO depth 2 的 `subagent_retry` 返回
  `attempts: 0` / `stopReason: depth-exceeded` / 无 child，修复有效。教训 = 真入口探针前必须确认
  profile 安装 = 当前源码/构建；详见 [卡](BUG-050-retry-depth-fix-fails-in-real-assembly.md)。

- **BUG-048**（2026-11-09）：`ui-scene-smoke --isolated --golden` 红——金样仍写“梦之队 CEO”，页面已按 D14 收窄为“CEO”。修法 = 先确认产品意图（显示名收窄是有意行为）与 diff 只有「在场」一行，再 `--refresh-golden`；`--golden` 复核 9 页签一致。同 diff 在 `tests/README` 的 `src/lib` 读模型行补“显示名变化 ⇒ 同 diff 刷 UI 金样”的映射；按 policy P2 不升门禁（首犯 + 真浏览器成本）。详见 [卡](BUG-048-ui-golden-brand-name-drift.md)。

- **BUG-046**（2026-11-09）：父代理看不到 child 的 `agentPreset` / `delegationDepth`——引擎把身份写在 child durable header，`list_subagents` 只投影 catalog + 最后一个 `turn/end`，父代理只能信 child 自述。修法 = 同一次 `sessionPersistence.open()` 读 `handle.header`，`SubagentRow` 增必填 `agentPreset` / `delegationDepth`（十进制字符串）+ `identityDetail`；读不到显式 `unavailable`（不默认 worker/0，`0` 是真值）。红→绿：临时不读 header ⇒ 3 failed（readChildTurnState 身份、list 暴露、depth 0），还原 ⇒ 20 passed；`pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿。详见 [卡](BUG-046-parent-cannot-verify-child-preset-depth.md) 与 [Note](../../../notes/implemented/2026-11-09-subagent-identity-observable.md)。

- **BUG-047**（2026-11-09）：公司手册豁免只写 `['worker']`，新增的 `worker-orchestrator` / `worker-researcher` 默认被注入全文——orchestrator persona 说“不读手册”，system 却给了。修法 = 边界按 archetype 派生（模型 `handbookSkipPresets()` 与 pack `WORKER_FAMILY_PRESETS` 同源），`registerHandbook` 默认取 family、配置只作覆盖，`cordis.patch.yml` 删掉窄列表；researcher 明确不注入（公司事实按 brief 读 `company.md`）。红→绿：family 表收窄回 `['worker']` ⇒ 2 failed（模型 parity + handbook family），还原 ⇒ 17 passed；`pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿。详见 [卡](BUG-047-worker-family-handbook-scope.md) 与 [Note](../../../notes/implemented/2026-11-09-handbook-worker-family.md)。

- **BUG-049 / BUG-045**（2026-11-09，同一根因）：`subagent_retry` 的注册面/深度不在“唯一期望源”，host 另硬编码 `allowedPresets` 与全局 `maxDepth: 3`——depth 2 的 CMO 用 retry 起出 depth 3 worker，绕过行级 `maxDepth: 2`；同时合同已落载体仍标 `planned`。修法 = 模型声明合同 `delivered`/`merged` + `carrierPath`，`retrySurface()` 从 `COMPOSITIONS.*.depthRows.subagent` 派生（full role）；pack `SUBAGENT_RETRY_SURFACE` 成唯一运行时表；`subagent_retry` 调用前按 `max(header, runtime)+1` 与调用者预算比较，越界返回 `attempts: 0` / `stopReason: depth-exceeded` 不调 `startActivation`。红→绿：CMO 预算 2→3 ⇒ 4 failed，还原 ⇒ 32 passed；合同状态 delivered→planned ⇒ 1 failed，还原 ⇒ 10 passed；`pnpm verify` / `pnpm test`（166 files / 1331 tests）/ `pnpm typecheck` 全绿。详见 [BUG-045](BUG-045-subagent-retry-depth-budget-bypass.md) / [BUG-049](BUG-049-model-contract-retry-drift.md) 与 [Note](../../../notes/implemented/2026-11-09-delegation-surface-single-source.md)。

- **BUG-042**（2026-11-08）：`list_subagents.lastTurnEnd` 在真实装配恒缺——终态读的是 `sessionQuery`，而它在本 pack 的 `isolate: {sessionQuery:true}` 组内，host 工具 `ctx.get` 拿不到；fake service 的单测把它藏住了。修法 = **换层**读 root 的 `sessionPersistence.open(id,'read')`；`childTurnState` 区分终态/open turn/无 turn——**open turn + inactive = `interrupted` + `inferred-open-turn`**（宿主被杀且 terminal 未落盘的 durable 签名）；读失败才 `unavailable` + detail；有界重试 + warn。keyless = 17 单元 + 3 真实 JsonlSessionPersistence（create/append/close，红配方）；真实装配 C2f 干净 home 首次查询即 interrupted，041 的“至少 interrupted”证据恢复。详见 [卡](BUG-042-list-subagents-lastturnend-missing.md)。

- **BUG-044**（2026-11-08）：后台 workflow job 不跨宿主重启——job 登记表随进程消失，`job_list` 空、`job_output` unknown，父会话没有可查的终态/结果；child 会话 durable 但在（C7/C7R）。修法 = 新增 host 工具 **`workflow_runs`**：只读父会话自己的 `tool-workflow/run-start|agent-start|run-end` + 工具回执，输出 `{runId,name,background,jobId?,status,children}`；无 run-end 且 job 注册表不认识 → **`lost`**（明确标注；原结果不恢复，children 可冷恢复取当前事实）。keyless 6 条；真实 C7b 会话日志离线验证输出 lost + jobId + 4 children。C7b 探针里模型未实际调用该工具（行为观察，能力已验）。上游：job registry durable 化/resume 对账。详见 [卡](BUG-044-background-job-lost-on-restart.md)。

- **BUG-043**（2026-11-08）：`list_subagents` 把 `spawn_teammate` 的成员也列出来（同一个 child 机制的两个视图），与 team `list_agents` 重叠且描述未说明，模型可能选错寻址。修法 = **不隐藏、标身份**：每行加 `role: 'teammate' | 'subagent'` 与 `address`（teammate → 队名，subagent → session id），身份来自 `agentTeams.tryMembership/listMembers`（服务缺席/非成员全按 subagent，不丢行）；description + `eng-teaming` 写死两套寻址。keyless 14 条（含 team/无 team/非成员/description 断言）。未跑 C3 真模型观察，按“description/skill 写死 + 绿证据”分支收口。详见 [卡](BUG-043-list-subagents-includes-teammates.md)。

- **BUG-040**（2026-11-08）：schema 分支的 child `completed` 但只回文本（没调 `structured_output`）→ 引擎丢文本、给父裸 null，且无诊断（R10）。**按产品规避收口**：`eng-teaming` 工作流分支**禁传 schema**，改“只回一行 JSON + 父脚本 `JSON.parse`；失败把原文记 `missing`”——本仓唯一会碰 schema 的分支形状被去掉，completed 的答案不再被折成 null；smoke 第 7 条钉住“非 schema 分支原样返回文本、父 parse 成功”。引擎缺陷仍在（上游提案与真 diff 在卡内；恢复 schema 前必须先有诊断）。详见 [卡](BUG-040-workflow-schema-text-answer-discarded.md)。

- **BUG-041**（2026-11-08）：宿主重启把 in-flight child 变孤儿——child durable 记 `turn/end interrupted`，父会话没有新 turn/通知，也查不到（R3 之前的控制名 shadow 加剧了“无法查询”）。修法 = `list_subagents` 每行带 `lastTurnEnd`：用 `sessionQuery.readSession(childId)` 读 child **durable 日志**（`openAt: never` 只禁搜索，durable 读仍可用；RS1 真实重启会话实测 `interrupted`）+ 每行 `running/inactive`；`budget-and-ops` 加“升级/重启时还有 subagent 在跑”一行（先收口；重启后查/`send_to_subagent` 冷恢复）。仍缺（不阻塞）：错过的完成通知正文，正文本就要冷恢复或上游 resume 对账。详见 [卡](BUG-041-host-restart-orphans-inflight-child.md)。

- **BUG-038**（2026-11-08）：workflow 分支内再起 subagent 时，`agent()` 返回的是 child **最终文本原样拼接**（`started subagent … <值>`），回执与结论不区分；带 schema 的嵌套分支会因 child 没调 `structured_output` 折成 null（R5）。修法 = 产品规则“分支默认是叶子”（确需两层让父直接起第二层）+ 真跑观察：模型首轮嵌套后自行读到混合回执并重构为父层扇出；同轮修正 skill 的“一定 null”过度断言（3 次复现无 null）；机制钉子 = `checks/lanes/workflow-contract.e2e.mjs` 第 6 条。上游提案 = 分支结果只取最后一轮结论或分开回执。详见 [卡](BUG-038-workflow-branch-nested-delegation-result.md)。

- **BUG-037**（2026-11-08）：根会话必是 Team Lead ⇒ `tool-agent-team` 按同名 shadow 掉全局 `send_message` / `list_agents`，根门够不到自己起的 `subagent` child（R3：`list_agents` 只回 lead、`send_message` 报 `active teammate not found`、`wait_agent` no-active-peer）。修法 = **替代控制名**（不是再劝模型）：新增 host 工具 `list_subagents`（父会话 `subagent/catalog` durable 事件 → id/label/mode/status）与 `send_to_subagent`（官方 `ctx.subagents.sendMessage`）；`docs/contracts/delegation.md` §4 与 `eng-teaming` 控制面同步；真挂载 79 tools 含两者 + 行为 spec。上游提案 = 让根直接用全局控制名；修好后退役这两个工具。详见 [卡](BUG-037-root-team-tool-shadowing.md)。

- **BUG-039**（2026-11-08）：workflow >50k 结果被工具**先截断再落盘**，spill 文件因此只是截断副本、notice 还写 "Full formatted result"——模型可读面缺段找不回（R7：完整 85.9k → 收到 49,929 + `[truncated: 35806]`；spill 50,102 含同一标记）。修法 = **配置真修**：tool-workflow 的 `maxResultChars` 是配置项（默认 50000），vp-eng preset 抬到 200k，让引擎 spill 设计生效（头尾预览 + 全文落盘 + 可读路径）；同日真模型探针 4×500 行：工具结果无截断标记、spill 71,677 字符含首尾行、模型 read/grep 核对；合同钉子 `tests/contract/workflow-result-budget.spec.ts` 钉渲染上限与 preset 配置。上游仍建议默认值下先交全文给 spill。详见 [卡](BUG-039-workflow-result-truncation-lossy-spill.md)。

- **BUG-036**（2026-11-08）：workflow `agent({schema})` 的模型面只列允许关键字，没写节点约束——enum/const 必须挂在**单值 type** 节点上、`type` 不接受数组、oneOf 不能与 type 并列、根必须 object；模型按标准 JSON Schema 写 enum 自然首跑即整轮 `UNSUPPORTED_SCHEMA` fatal、零 agent（R2；R13 的 type 数组是第二实例）。修法 = `eng-teaming` 写清四条（R6 enum+type 7 agents completed、R15 nullable 用 oneOf 首跑完成，均零 fatal）；新增**合同钉子** `tests/contract/json-schema-subset.spec.ts` 按 pin 钉住引擎语义（上游改则红，提示删/改 skill 与台账 `[CT-IN]`）。上游建议 = tool-workflow description 补一句子集约束。详见 [卡](BUG-036-workflow-schema-enum-type.md)。

- **BUG-034/035**（2026-11-07）：SA/SQA 证据链两处同源缺口——签名事件记录没有绝对时间源；串在通流回路的装置只给 25 A/10 s、未定义短路电流耐受。修法 = 两个 skill 各加两条条件必查（记录与时间可信 / 故障路径的耐受）+ `sa-sqa-quality-audit` Q8–Q11（SA 侧 + SQA 侧；条件触发、SKIP 不算红）+ 两条 keyless 用例；顺带修掉**让所有 skill 改动失效的前置缺陷**——两个子人格 preset 缺 `tool-skill`、persona 未点名"先加载"，技能正文从没被模型读到（run#3/run#4 日志 0 次 skill 名），并修审计把 SA/VP-Eng 稿当 SQA 的假绿口径、drafts 只扫一层的漏读。红绿 = 删词/删行 ⇒ 本用例 1 failed → 还原 38 passed；真实产物 v4 Q8–Q11 红、v8 Q1–Q11 全 PASS（E2E `2026-11-07-portable-overload-detection-v8`）。教训 = **属性没人测 = 属性不存在**；**装上了 ≠ 读到了**。详见 [BUG-034](BUG-034-no-absolute-time-source-for-signed-records.md) / [BUG-035](BUG-035-short-circuit-withstand-undefined.md) 与 [Note](../../../notes/archived/2026-11-07-sa-sqa-evidence-chain.md)。

- **BUG-033**（2026-10-27）：revoke 恢复把“已撤销 + 用户后改正文”回滚成旧全文——journal 只存旧全文、用 `revokedAt:` 猜目标态；用户在后改正文（保留 revokedAt）会被整条回滚。修法 = 从旧全文 + revokedAt 纯函数推导目标全文；恢复只认 old/target，第三态 conflict 不覆盖；守卫 = 同 spec 的“revokedAt + 正文被改 ⇒ conflict 且字节不变”。红绿 = 新用例先红（旧实现 restore 旧全文）→ 修复后 4/4 绿。详见 [卡](BUG-033-revoke-recovery-body-edit-loss.md)。

- **BUG-032**（2026-10-23）：r3 重录产不出可重放 fixture——委派完成通知落在 lead 轮内/轮后两种形状（3 vs 4 次模型调用），重放到达时机相反即 `llm-replay: script exhausted`。修法 = `--record` 录完立即 keyless 自检、红则重录（≤3 次），失败如实保留现场；不在重放侧宽容 script 用尽。红绿 = 前三次重录全红 → 修复后连续两次 `--record` 第一次即自检绿、replay ALL PASS。教训 = **录制类命令要自证可回放，别把运气交给下一次**。详见 [卡](BUG-032-r3-rerecord-not-replayable.md)。

- **BUG-031**（2026-10-20）：`orient --scenario replay/r3-delegation` ENOTDIR 崩——runBundleView 对 children 引用一律 readdirSync，而 r3 声明的是单文件形状（`sessions/vp-eng-child.jsonl`）。修法 = statSync 分流（文件且 .jsonl 计 1 / 目录数 .jsonl）；守卫 = orient.spec 真实 r3 断言 + 文件形状夹具（红 2 failed → 绿 27/27，活体视图完整渲染）。教训 = 消费引用合同要枚举全部合法形状。详见 [卡](BUG-031-orient-scenario-children-file-shape.md)。
- **BUG-030**（2026-10-20）：diagnose 审批判读字段错位——decisionOf 读想象键（decision/answer），真 v4 日志是 `{id,outcome}`（vendor persistence-catalog 权威），每条审批渲染成 `approval ? → `（无名无结论）；工具名在同 id 的 approval/asked 侧。附带同修 turn/end 对象 error 的 [object Object] 渲染。修法 = 读 outcome + asked/decided 按 id 配对 + detailOf 序列化 + 夹具改真形状；红 4 failed → 绿 27/27，活体 `approval request_signoff → rejected`（reason「毛利<30% 双签」可对勘）。教训 = **夹具用想象形状 = 绿灯保释错实现**，新工具判据夹具应从真日志取样。详见 [卡](BUG-030-diagnose-approval-outcome.md)。
- **BUG-029**（2026-10-20）：观察窗 token 再次随 `runtime/web-logs` 日志入库（BUG-013 同类复发）。修法 = untrack + `.gitignore` 规则 + **类级 tracked-token 窄扫**（`tools/lib/tracked-token.mjs` + `checks/gates/tracked-token.mjs`）+ `.gitignore` 红绿守卫；不做历史重写。红→绿：临时 tracked 文件写合成 token URL → `FAIL tracked-token ...`；移除 → `PASS tracked-token ×1740`；`pnpm verify` ALL PASS、`pnpm test` 71/699。详见 [卡](BUG-029-committed-web-token-recurrence.md) 与 [Note](../../../notes/archived/2026-10-20-tracked-token-guard.md)。
- **BUG-028**（2026-10-19）：闸门④的锚粒度与纪律不一致——一条总锚覆盖多任务时被判「行动幻觉」（lingang-recon 实测 3 条误报）。修法 = 认总锚（该 slug 的锚在 title **或 prompt** 里点名 T 号即算已锚，整号边界匹配）+ 依赖链传递（`｜依赖：T4` 且 T4 已覆盖 ⇒ 连带覆盖），无锚/未点名照旧判红。红→绿：新守卫先红 `expected [ 'T4', 'T6' ] to deeply equal []`，修后 `pnpm test` 669/669；真入口 `--only lingang-recon` **3 条违规 → ALL PASS**（盘面一字未改）。同 diff 补手册一句（总锚须点名下游 T 号）。详见 [卡](BUG-028-pending-material-anchor-granularity.md)。
- **BUG-025**（2026-10-19）：台账数据面的口径错配——面板一直读 `kb/motion-ledger.md`（40 行动议表），而调研与四张卡把「993 份成品」记在台账名下，下游论证全线继承。修法 = 订正文档口径（面板代码本就正确）+ 补一条钉住「面板数据面 = `kb/motion-ledger.md`」的判据（`tests/client/wiring/client-face.spec.ts`；红/绿实证：改路径 ⇒ 1 failed，还原 ⇒ 5 passed）。真正的收获是失败类：**盘上有什么 ≠ 面板读什么**，那条连线此前无人查。详见 [卡](BUG-025-ledger-reads-wrong-data-face.md)。
- **BUG-019**（2026-10-16）：判据加「证据可得性」维——显式声明 `evidenceMissingBefore`（CLI `--evidence-from`）后，该期内无 present 背书的成品由违规降为观察项 `present-evidence-missing`；不声明维持严格判红。深挖同时推翻首版诊断（本案是**真阳性**：收口会话从未调 `present`）。详见 [卡](BUG-019-final-present-evidence-lost.md)。
- **BUG-020**（2026-10-16）：收敛半态可续跑——清 live journal 判 tracked（未跟踪走 `rmSync`，不再因「角色刚写未入库的 journal」崩在半途）＋新增 `converge --resume <目录名>`（只做剩余步骤、不搬移交付物；不可续跑时 fail-loud 给恢复指引）；判定纯函数 = `convergenceResume`。详见 [卡](BUG-020-converge-crash-untracked-journal.md)。
- **BUG-018**（2026-10-16）：署名审计的写入者归属补「基础角色」规范化——`tools/lib/authorship.mjs` 新增 `baseRoleOf`（只抹 `<角色>-<数字>` 实例后缀），判档与显示用基础角色、原始 preset 存 `writerRaw`；真盘 `authorship-audit` 由「署名不实 10 + exit 1」变「署名不实 0 + ALL PASS」。守卫 = 同 spec 的「规范化只抹实例后缀，不吞跨角色差异」。详见 [卡](BUG-018-authorship-instance-preset-false-positive.md)。
- **BUG-017**（2026-10-12）：记录残留四件清偿——归档卡计数统一为五缺陷、issues/README stray 断链删、台账叙述校正、落地决定补 implemented Note（convergence-executor）。详见 [卡](BUG-017-record-hygiene-residue.md)。
- **BUG-016**（2026-10-12）：converge 自述三处对齐——未知旗标 fail-loud（`--plan` 即拒）、dev-loop §12 与 checks/README 改无参计划口径、动作清单/完成 TODO 对齐 journal-only 与 `--charter-backfill`。详见 [卡](BUG-016-converge-self-description-drift.md)。
- **BUG-015**（2026-10-12）：backfill 证据目录按 slug 解析真实收敛目录（`tools/lib/converge-rules.mjs` `resolveEvidenceDir`：多日取最新、无证据 fail-loud）——隔天补登不再写断链。详见 [卡](BUG-015-charter-backfill-evidence-date-coupling.md)。
- **BUG-014**（2026-10-12）：backfill 查重改条目行锚（`charterHasEntry`），COO 缺失的 ai-sprint-2026 历史纪要已补登；回归锚 = `tests/tools/converge-rules.spec.ts`。详见 [卡](BUG-014-charter-backfill-dedupe-false-skip.md)。
- **BUG-013**（2026-10-12）：runtime/e2e/assembly-e2e-driver.mjs untrack + `.gitignore` 显式规则——观察窗 token 出库（重启即轮换，无历史重写）；规则防再犯。详见 [卡](BUG-013-e2e-driver-token-committed.md)。
- **BUG-010**（2026-10-11）：HITL 前排空的行为验证落地（`probes/session-context/hitl-dispatch-order-probe.mjs`）：V4 = `ask-before-dispatch`，新场景 = `dispatch-before-ask`（ask 前已建 10 个任务）。
- **BUG-009**（2026-10-11）：对账回合的行为验证落地（`probes/session-context/reconcile-round-probe.mjs`）：V4 = `no-reconcile`，新场景 = `reconciled`（CEO 双向转述对方数值）。
- **BUG-012**（2026-10-11）：5 份带「AI 使用声明」的模板各加「复核独立性层级」与「边际宽度」两栏；`tests/content/templates.spec.ts` keyless 断言守（删栏位即红）。行为面等下一份带复核的 final 观察。
- **BUG-011**（2026-10-11）：派活行扩可选 `｜假设：<待证/内容>` 段（`tools/lib/candidate-scan.mjs` 解析出该字段）；`tests/tools/candidate-scan-labels.spec.ts` 断言新旧行都解析。统计面等下一场派活跑法。
- **BUG-023**（2026-10-18，2026-11-09 由 `settled_issues` 改归）：查证为**误报**——浮窗功能正常，"点了没反应"来自探针跨轮复用稳定 id 撞上上一轮遗留的 `method-<id>` 目录（host 明确拒绝，行内原话一直在）。修复落在**探针卫生**：每轮唯一 id + 失败路径必读行内原话 + 收尾连方法层残留一起清，改完 S4b 从已知缺陷档恢复硬判并 PASS。详见 [卡](BUG-023-cultivation-float-actions-dead.md)。
- **BUG-026**（2026-10-19，2026-11-09 由 `settled_issues` 改归）：查证为**误报**——wire 视图 `ownerName` 273/273 齐全，卡读的是 projcache 的 **state** 行（`TeamTaskSnapshot` 本就不含 `ownerName`/`ready`）。修复落在**防复发判据**：`tests/lib/board.spec.ts` 以真 wire 形状断言 owner 解析不丢、非 pending 任务 `ready === false`。失败类 = 读盘上存了什么 ≠ 读消费者那一层。详见 [卡](BUG-026-owner-missing-from-team-projection.md)。
- **BUG-008**（2026-10-10）：deliverables-check 归档件存量降 `legacy-archive` 观察项（exit 1→0）；原 recon-pack 判据漂移清零。
