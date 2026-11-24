# _archive/ · 离开活跃区
- [2026-11-21-company-e2e-test-design.md](settled_issues/2026-11-21-company-e2e-test-design.md) — 消化收口：6 轮 E2E（`BUG-293`–`BUG-332`）全部修复归档、`BUG-296` 构建指纹已入真实页面车道，系统防线由 11-23 两篇质量预防 Note 承接。
- [2026-11-23-fuzz-bounded-differential-guards.md](settled_issues/2026-11-23-fuzz-bounded-differential-guards.md) — 质量预防二期（四件套）：6 大解析器契约加固与 seeded 畸形 Fuzz 矩阵（120 组×6）、`Bounded<T>` 原语及静态审计 R1 纳管、`attention` 读模型性质 + `Live↔History` 同源差分（200 轮）与共享安全提取；独立盲审 2 阻断 + 4 非阻断全清；去向 = [实施Note](../../notes/implemented/2026-11-23-fuzz-bounded-differential-guards.md)。
- [2026-11-23-client-static-guards-and-contract-sweep.md](settled_issues/2026-11-23-client-static-guards-and-contract-sweep.md) — 质量预防首批（四件套）：oxlint hooks/正确性规则、TS Compiler API R1–R4 静态审计器、满态双语断言 + 残留清零、全 Slot 真 `inject` + `happy-dom` 挂载守卫；独立盲审 0 阻断；去向 = [实施Note](../../notes/implemented/2026-11-23-client-static-guards-and-contract-sweep.md)。
- [BUG-341-cold-boot-company-identity-skipped-and-quoted-empty-product-name.md](fixed_bugs/BUG-341-cold-boot-company-identity-skipped-and-quoted-empty-product-name.md) — 冷启动 `registerSidebarIdentity` 订阅 `sessions.list` 加载 `company.md`，`parseCompanyIdentity` 复用 `yamlScalar` 解引号与占位符。
- [BUG-345-lease-reentrant-release-leaks-heartbeat-interval.md](fixed_bugs/BUG-345-lease-reentrant-release-leaks-heartbeat-interval.md) — `acquireCompanyLease` 抽出共享 `releaseLease` 与幂等 `makeRelease`，修复重入 `first→second` 释放泄漏心跳定时器。
- [BUG-344-subagent-retry-reports-zero-attempts-when-second-start-aborts.md](fixed_bugs/BUG-344-subagent-retry-reports-zero-attempts-when-second-start-aborts.md) — `subagent_retry` 在 `startActivation` 被取消时按 `childIds.length` 返回 `attempts`，消除 `attempts: 0` 与 `childIds` 矛盾。
- [BUG-346-presented-ledger-concurrent-write-lost-update.md](fixed_bugs/BUG-346-presented-ledger-concurrent-write-lost-update.md) — `presented-domain` 为 `ensureLedger`/`recordLedger`/`auditLedger` 增加按 store 维度的 Promise 串行队列并给 `fileStore` 临时文件补充 `randomUUID()`。
- [BUG-360-format-tokens-1000k-instead-of-1m.md](fixed_bugs/BUG-360-format-tokens-1000k-instead-of-1m.md) — 令牌档位按舍入后判定。
- [BUG-361-first-text-keeps-crlf-carriage-return.md](fixed_bugs/BUG-361-first-text-keeps-crlf-carriage-return.md) — 首行文本先归一换行。
- [BUG-364-instance-guard-future-heartbeat-never-expires.md](fixed_bugs/BUG-364-instance-guard-future-heartbeat-never-expires.md) — 实例心跳双边新鲜度 + 写时清理。
- [BUG-362-ledger-slugs-accept-malformed-rows.md](fixed_bugs/BUG-362-ledger-slugs-accept-malformed-rows.md) — 台账 slug 集合复用行有效性。
- [BUG-368-yaml-scalar-unbalanced-quote-kept-and-trailing-dropped.md](fixed_bugs/BUG-368-yaml-scalar-unbalanced-quote-kept-and-trailing-dropped.md) — YAML 坏引号 fail-closed。
- [BUG-369-workspace-doors-unset-preset-chinese-placeholder.md](fixed_bugs/BUG-369-workspace-doors-unset-preset-chinese-placeholder.md) — 未设置 preset 用 null 省略。
- [BUG-367-signoff-tool-result-and-reason-always-chinese.md](fixed_bugs/BUG-367-signoff-tool-result-and-reason-always-chinese.md) — 签核工具与诊断命令随语言。
- [BUG-365-company-data-unbounded-event-accumulation.md](fixed_bugs/BUG-365-company-data-unbounded-event-accumulation.md) — follow 事件数据层有界。
- [BUG-366-context-candidates-fail-open-on-unknown-cwd.md](fixed_bugs/BUG-366-context-candidates-fail-open-on-unknown-cwd.md) — 背景候选未知 cwd fail-closed。
- [BUG-363-error-capture-install-not-idempotent.md](fixed_bugs/BUG-363-error-capture-install-not-idempotent.md) — 错误捕获单层安装、逐层卸载可逆。
- [BUG-352-session-diagnose-reads-flat-team-member-shape.md](fixed_bugs/BUG-352-session-diagnose-reads-flat-team-member-shape.md) — 诊断解包真实 team/member v2。
- [BUG-355-cultivation-data-stale-feedback-abort-problem-and-load-race.md](fixed_bugs/BUG-355-cultivation-data-stale-feedback-abort-problem-and-load-race.md) — 培养数据 hook 切换复位 + 中止守卫 + 代次。
- [BUG-359-attention-same-millisecond-stream-items-collapse.md](fixed_bugs/BUG-359-attention-same-millisecond-stream-items-collapse.md) — 注意力身份用事件 seq，仅跨源去重。
- [BUG-356-motion-ledger-escaped-pipe-row-dropped.md](fixed_bugs/BUG-356-motion-ledger-escaped-pipe-row-dropped.md) — 台账方言统一 splitTableRow。
- [BUG-357-presented-slug-carryover-broken-by-custom-meta-slug.md](fixed_bugs/BUG-357-presented-slug-carryover-broken-by-custom-meta-slug.md) — present 身份取 meta slug + 旧账本回退。
- [BUG-354-presence-activity-unassigned-owner-leaks-chinese-in-en.md](fixed_bugs/BUG-354-presence-activity-unassigned-owner-leaks-chinese-in-en.md) — 无负责人动态 token 化。
- [BUG-358-board-unassigned-label-chinese-in-en-and-missing-role-label.md](fixed_bugs/BUG-358-board-unassigned-label-chinese-in-en-and-missing-role-label.md) — 看板 ownerLabel 归 null + roleLabel。
- [BUG-351-method-skill-text-unescaped-yaml-description.md](fixed_bugs/BUG-351-method-skill-text-unescaped-yaml-description.md) — 方法 SKILL.md description 编码 + 采纳前自检。
- [BUG-353-converge-and-journal-audit-broken-on-v3-dot-dsh-company.md](fixed_bugs/BUG-353-converge-and-journal-audit-broken-on-v3-dot-dsh-company.md) — converge/journal-audit 迁 v3 双根，索引生成器导入补齐。
- [BUG-340-static-audit-r1-r2-bypass-gaps.md](fixed_bugs/BUG-340-static-audit-r1-r2-bypass-gaps.md) — 静态审计六条绕过缝隙补齐，host 纳入 CJK 棘轮、字典独立成件。
- [BUG-338-host-commands-and-cultivation-source-bilingual-gaps.md](fixed_bugs/BUG-338-host-commands-and-cultivation-source-bilingual-gaps.md) — host 命令面与 req/prd 校验器诊断随语言，语言切换重注册。
- [BUG-339-parsers-edge-malformed-inputs-silent-fold.md](fixed_bugs/BUG-339-parsers-edge-malformed-inputs-silent-fold.md) — 四个读模型解析器的边缘坏形状显式诊断，不再静默折成正常值。
- [BUG-347-tools-deliverables-catalog-empty-slug-dropped-by-client.md](fixed_bugs/BUG-347-tools-deliverables-catalog-empty-slug-dropped-by-client.md) — tools 目录索引与 host 同 slug 回落判据，客户端不再丢成品。
- [BUG-334-cultivation-record-problems-i18n-and-unrendered-context.md](fixed_bugs/BUG-334-cultivation-record-problems-i18n-and-unrendered-context.md) — 损坏诊断代号化 + 背景告警渲染，en 零中文。
- [BUG-336-presence-message-activity-chinese-in-en.md](fixed_bugs/BUG-336-presence-message-activity-chinese-in-en.md) — 消息动态与多任务行令牌化，en 零中文标点。
- [BUG-333-team-tool-card-deps-chinese-in-en.md](fixed_bugs/BUG-333-team-tool-card-deps-chinese-in-en.md) — 团队工具卡依赖行语言无关令牌，en 不再漏中文。
- [BUG-337-delegation-flow-missing-tag-not-localized.md](fixed_bugs/BUG-337-delegation-flow-missing-tag-not-localized.md) — 委派流程缺失标签入字典。
- [BUG-348-cultivation-chat-panel-creates-orphan-session-after-unmount.md](fixed_bugs/BUG-348-cultivation-chat-panel-creates-orphan-session-after-unmount.md) — 培养对话效应在 reject 与 `create` 恢复点补 `cancelled` 守卫，不删 key、不建孤儿会话。
- [BUG-350-cultivation-compose-stale-target-role-across-session-switch.md](fixed_bugs/BUG-350-cultivation-compose-stale-target-role-across-session-switch.md) — 养成表单 `key = currentSessionId:viewer`，切换会话/视角重建，不保留旧 `targetRole`。
- [BUG-335-cultivation-invalid-decided-at-nan.md](fixed_bugs/BUG-335-cultivation-invalid-decided-at-nan.md) — 非法 `decidedAt` 回退原串；`timeParts` 新增 `invalid` 档，NaN 不再进 UI。
- [BUG-349-cultivation-revoke-overwrites-already-revoked-records.md](fixed_bugs/BUG-349-cultivation-revoke-overwrites-already-revoked-records.md) — 撤回与核对共用 `isActiveAdoptedRecord`，已撤回记录不再被二次写 `revokedAt`。
- [BUG-343-req-command-delivery-mode-bypasses-safe-content-id.md](fixed_bugs/BUG-343-req-command-delivery-mode-bypasses-safe-content-id.md) — `/req check` 的 `deliveryMode` 与 `/delivery check` 同口径：`isSafeContentId` + 目录枚举，穿越值回归「未知交付模式」。
- [BUG-342-handbook-override-follows-symlinks-and-crashes-on-dir.md](fixed_bugs/BUG-342-handbook-override-follows-symlinks-and-crashes-on-dir.md) — `readHandbook` 读 `.dsh-company/overrides/AGENTS.md` 改走 `readCompanyFile` 拒绝 symlink/目录/越界并告警回退默认手册。
- [BUG-329-cultivation-en-list-delimiters-chinese.md](fixed_bugs/BUG-329-cultivation-en-list-delimiters-chinese.md) — en 列表分隔符「、」；`listSeparator`/`joinList` 单点取，令牌参数不预拼。
- [BUG-326-cultivation-command-description-inner-errors-chinese.md](fixed_bugs/BUG-326-cultivation-command-description-inner-errors-chinese.md) — 命令元数据与内部错误仍中文；description/hint/停写/两类错误走 `t`（不伪造 reason 翻译）。
- [BUG-325-attention-question-live-history-id-mismatch.md](fixed_bugs/BUG-325-attention-question-live-history-id-mismatch.md) — 问询 live/history 两套 id；跨源按内容去重、源内按 id。
- [BUG-331-attention-multi-question-request-only-first.md](fixed_bugs/BUG-331-attention-multi-question-request-only-first.md) — 多问题只显第一个；摘要带「共 N 个问题」、detail 列全部。
- [BUG-332-attention-exact-800-window-false-positive.md](fixed_bugs/BUG-332-attention-exact-800-window-false-positive.md) — 恰好一页误报窗口截断；判据只看 `hasMore`。
- [BUG-327-attention-current-approval-cap-still-silent.md](fixed_bugs/BUG-327-attention-current-approval-cap-still-silent.md) — 当前会话 capped 被丢；`ownAsks` 只算一次、capped 进边界对象。
- [BUG-328-attention-empty-state-ignores-boundaries.md](fixed_bugs/BUG-328-attention-empty-state-ignores-boundaries.md) — 空态只认三个边界；改由 `hasBoundary` 单一判据。
- [BUG-330-attention-question-copy-and-cap-still-approval-only.md](fixed_bugs/BUG-330-attention-question-copy-and-cap-still-approval-only.md) — 字段/文案仍只写审批；统一到 asks 语义。
- [BUG-316-cultivation-host-command-texts-not-localized.md](fixed_bugs/BUG-316-cultivation-host-command-texts-not-localized.md) — 培养命令 host 回执全中文；`t(zh,en)` 贯穿 63 条回执，判据 en 回执无 CJK。
- [BUG-319-attention-questions-not-rebuilt-after-reload.md](fixed_bugs/BUG-319-attention-questions-not-rebuilt-after-reload.md) — 问询刷新后从待办消失；`pendingAsks` 从 tool/call ↔ tool/result 重建问询。
- [BUG-324-deliverables-catalog-field-shape-silent.md](fixed_bugs/BUG-324-deliverables-catalog-field-shape-silent.md) — catalog 字段形状坏被静默归一化；改为跳过并计数。
- [BUG-321-cultivation-record-head-60-lines-false-broken.md](fixed_bugs/BUG-321-cultivation-record-head-60-lines-false-broken.md) — 60 行头窗口把合法长 frontmatter 记录判坏；头窗口失败补读全文再判。
- [BUG-322-cultivation-journal-head-240-title-fallback.md](fixed_bugs/BUG-322-cultivation-journal-head-240-title-fallback.md) — 240 行预览窗口吞标题；无标题时补读更大窗口。
- [BUG-317-attention-current-session-1000-cap-silent.md](fixed_bugs/BUG-317-attention-current-session-1000-cap-silent.md) — 本会话 1000 事件窗口静默截断；面板报「只保留最近 N 条」并压住空态。
- [BUG-318-attention-history-candidate-cap-silent.md](fixed_bugs/BUG-318-attention-history-candidate-cap-silent.md) — 候选只扫 20 个；带回 `total/capped` 并提示「还有 N 个会话没扫」。
- [BUG-320-attention-approval-cap-five-silent.md](fixed_bugs/BUG-320-attention-approval-cap-five-silent.md) — 审批流 5 条上限；`pendingApprovals` 返回 `{items, capped}` 并提示「还有 N 条未显示」。
- [BUG-323-attention-history-cross-workspace-leak.md](fixed_bugs/BUG-323-attention-history-cross-workspace-leak.md) — cwd 未解析时候选过滤 fail-open（越界）；改 fail-closed（不扫 + 面板提示）。
- [BUG-315-cultivation-full-view-min-widths-ignored.md](fixed_bugs/BUG-315-cultivation-full-view-min-widths-ignored.md) — `BOARD_MIN`/`CHAT_MIN` 没被 CSS 消费；`splitLayout` 单点计算，放不下就堆叠。
- [BUG-312-attention-question-duplicate-key.md](fixed_bugs/BUG-312-attention-question-duplicate-key.md) — 同文问询撞 React key；登记时合成 id，key 不再回落摘要。
- [BUG-308-cultivation-chat-panel-i18n-leaks.md](fixed_bugs/BUG-308-cultivation-chat-panel-i18n-leaks.md) — 对话面板双向漏语言；两处改走 copy 表，判据 en 无 CJK / zh 无裸 session:。
- [BUG-313-startup-options-bad-shape-silent-empty.md](fixed_bugs/BUG-313-startup-options-bad-shape-silent-empty.md) — options 字段类型坏冒充「没有可选项」；`unreadable + field`。
- [BUG-314-startup-settings-bad-shape-silent-auto.md](fixed_bugs/BUG-314-startup-settings-bad-shape-silent-auto.md) — settings 字段类型坏冒充 auto；`corrupt + field`，面板点名。
- [BUG-310-deliverables-index-silent-entry-drop.md](fixed_bugs/BUG-310-deliverables-index-silent-entry-drop.md) — 成品索引坏 entry 静默丢；`skipped` + 面板提示。
- [BUG-311-ledger-header-mismatch-silent-empty.md](fixed_bugs/BUG-311-ledger-header-mismatch-silent-empty.md) — 台账表头 typo 静默 0 行；`headerOk` + 面板「表头与两种口径都对不上」。
- [BUG-307-cultivation-mine-cap-control-combined.md](fixed_bugs/BUG-307-cultivation-mine-cap-control-combined.md) — 折叠控件按合并总数判断；改按实际隐藏数（307 是 306 的回归）。
- [BUG-309-cultivation-self-record-listed-twice.md](fixed_bugs/BUG-309-cultivation-self-record-listed-twice.md) — 自己提自己拒的记录进两个箱子；`processedForViewer` 排除自己提的。
- [BUG-306-cultivation-mine-list-cap-dead.md](fixed_bugs/BUG-306-cultivation-mine-list-cap-dead.md) — `LIST_CAPS.mine=5` 是死配置；`CultivationMine` 接上折叠，计数用折叠前总数。
- [BUG-301-strategy-wiki-input-stale-after-reset.md](fixed_bugs/BUG-301-strategy-wiki-input-stale-after-reset.md) — wiki 输入非受控，重置后仍显示旧值且会回写；改受控 + 外部值同步。
- [BUG-302-english-ui-chinese-time-and-reason.md](fixed_bugs/BUG-302-english-ui-chinese-time-and-reason.md) — en 界面混入中文时间/原因；`timeParts` 结构化 + 字典渲染 + 原因代号，判据 = en 渲染无 CJK。
- [BUG-303-ledger-malformed-rows-silent-drop.md](fixed_bugs/BUG-303-ledger-malformed-rows-silent-drop.md) — 台账坏行静默丢；解析返回 `{rows,badRows}`，面板说「跳过 N 行（格式不符）」。
- [BUG-304-attention-history-window-misses-old-approvals.md](fixed_bugs/BUG-304-attention-history-window-misses-old-approvals.md) — 800 条窗口外的挂起审批看不见；读面带 `windowTruncated`，面板说「只扫描了最近 800 条」。
- [BUG-305-attention-history-all-read-fail-silent-empty.md](fixed_bugs/BUG-305-attention-history-all-read-fail-silent-empty.md) — 历史全失败仍说「没有等你的事」；结果态带 `failed`，面板出错误行并压住空态。
- [BUG-300-cultivation-decided-at-raw-iso.md](fixed_bugs/BUG-300-cultivation-decided-at-raw-iso.md) — 采纳/拒绝时间裸 ISO；`decidedAtLabel` 走人话，精确值留 `title`。
- [BUG-299-attention-dedupe-by-summary-drops-distinct-approvals.md](fixed_bugs/BUG-299-attention-dedupe-by-summary-drops-distinct-approvals.md) — 待办按 160 字摘要去重吞掉不同审批；改为身份键（审批 id），活体 detail 透传。
- [BUG-297-strategy-read-failure-silently-auto.md](fixed_bugs/BUG-297-strategy-read-failure-silently-auto.md) — 策略文件坏/读不到被折成「自动」；三态诊断 + 面板错误行，缺失/空仍是合法 auto。
- [BUG-298-fixed-read-limits-silent-truncation.md](fixed_bugs/BUG-298-fixed-read-limits-silent-truncation.md) — 固定行数读上限静默截断（台账/记录/索引）；读面返回 `{text,eof}`，三个面板各自说「不完整/超上限/只加载了摘要」。
- [BUG-294-cultivation-no-pending-lies-about-empty-workspace.md](fixed_bugs/BUG-294-cultivation-no-pending-lies-about-empty-workspace.md) — 有记录但零待办被说成「工作区还没有培养记录」；四态矩阵第四格给新文案。
- [BUG-295-attention-item-unbounded-approval-reason.md](fixed_bugs/BUG-295-attention-item-unbounded-approval-reason.md) — 待办把整段审批理由当摘要；`attentionSummary` 折叠 + 全文留 `detail`，活体与历史同源。
- [BUG-296-real-page-lanes-stale-client-bundle.md](fixed_bugs/BUG-296-real-page-lanes-stale-client-bundle.md) — 真页面车道只查产物存在、不查新鲜，旧字节报绿藏住了 293；构建指纹 + 三条车道启动前比对（stale → EXIT=2）。
- [BUG-293-command-scope-hint-slot-crash.md](fixed_bugs/BUG-293-command-scope-hint-slot-crash.md) — 注册体把 `list` 写成 `undefined as never`，composer 槽每次加载崩；接回真实 `sessions.list` 并把判据改成渲染 inject 真实产物。
- [BUG-292-cross-session-pending-approvals-not-aggregated.md](fixed_bugs/BUG-292-cross-session-pending-approvals-not-aggregated.md) — 待办只覆盖本会话；跨会话聚合无正路（retain source 封闭 / follow 零帧），本轮把作用域写进空态。
- [BUG-288-attention-panel-list-missing.md](fixed_bugs/BUG-288-attention-panel-list-missing.md) — 已结（反证）：`ask` 策略下后开的页面能看到挂起审批；lane 红是环境 `never`。
- [BUG-290-text-command-silent-no-op-without-session.md](fixed_bugs/BUG-290-text-command-silent-no-op-without-session.md) — 空白页敲斜杠命令无反馈；host 实测被调用、结果丢在 vendor transcript 面，本仓落「会话未开始」提示（政策 B）。
- [BUG-291-cultivation-records-unreadable-in-panel.md](fixed_bugs/BUG-291-cultivation-records-unreadable-in-panel.md) — 面板如实报告自身 workspace，但 UI 从不点名「哪个盘」；收窄为作用域可诊断性，空/不可达/读取中三态分文案。
- [BUG-286-deliverables-check-v3-layout-unusable.md](fixed_bugs/BUG-286-deliverables-check-v3-layout-unusable.md) — v3 布局把「文件根」与「会话根」拆开后判据入口仍当同一个（默认档 exit 2）；两个根 + present 前缀归一后真盘 assessed。
- [BUG-289-human-loop-decision-journal-not-written.md](fixed_bugs/BUG-289-human-loop-decision-journal-not-written.md) — 判据按旧布局找 journal，产品写对了 `.dsh-company/kb/ceo/journal/`；改常量后 12/12 绿。
- [BUG-287-session-search-locale-hardcoded.md](fixed_bugs/BUG-287-session-search-locale-hardcoded.md) — 探针/车道写死英文可访问名，默认 zh 产品档整批导航超时；14 文件改双语正则。
- [BUG-285-upgrade-lane-frozen-identity-semantics.md](fixed_bugs/BUG-285-upgrade-lane-frozen-identity-semantics.md) — 升级守卫冻结已废止的「创建版本」语义而长期红；改断言 id/createdAt 保留 + pack.version 跟随 + v3 备份。
- [BUG-284-dev-wrapper-orphan-writer-holds-lease.md](fixed_bugs/BUG-284-dev-wrapper-orphan-writer-holds-lease.md) — 杀 wrapper 后 dsh 成孤儿持 writer lease，下一次启动静默停写；补 SIGINT/SIGTERM/SIGHUP 转发。
- [BUG-283-dev-wrapper-home-missing-opaque-failure.md](fixed_bugs/BUG-283-dev-wrapper-home-missing-opaque-failure.md) — `--home` 目录不存在时模板初始化 exit null/空 stderr；先建 home 并点名 spawn 错误。

- [2026-11-20-quality-prevention-contract-pilot.md](settled_issues/2026-11-20-quality-prevention-contract-pilot.md) — content 合同族预防试点：动态成员矩阵 + 独立业务锚点 + 共享分支/接线负控 + 开发入口修订，bootstrap 局部试点与生产源头研究同批交付；剩余候选记为以后做；去向 = [实施Note](../../notes/implemented/2026-11-20-quality-prevention-contract-pilot.md)。
- [2026-11-17-ownership-wave-exploratory.md](settled_issues/2026-11-17-ownership-wave-exploratory.md) — C12 归属波次探索：Round 94–96 六面齐跑，10 张 BUG-202..211 全部修复归档；未跑面（clean worktree/setup/live/Windows）与 3 项 unverified 如实保留；去向 = implementation（[批次 Note](../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)）。
- [2026-11-17-runtime-shipped-boundary-exploratory.md](settled_issues/2026-11-17-runtime-shipped-boundary-exploratory.md) — C13 运行时/发布面分离：Round 97–99，10 张 BUG-213..222 全部修复归档；汇总表编号偏 1 已订正；去向 = implementation（[批次 Note](../../notes/implemented/2026-11-17-shipped-package-boundary.md)）。
- [2026-11-18-low-confidence-runtime-exploratory.md](settled_issues/2026-11-18-low-confidence-runtime-exploratory.md) — C14 修复后的守卫面 + 低置信运行态：Round 100–101，10 张 BUG-223..232 全部修复归档；G5/G6 与 Round 102 未跑已写明 owner；去向 = implementation（[批次 Note](../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)）。
- [2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md](settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md) — C16 门禁管线指纹 + 更低置信运行态：Round 105–107，20 张 BUG-243..262 全部修复归档；判决账订正（6 条直接判决/覆盖、4 条部分、10 条未跑）见卡；去向 = implementation（[批次 Note](../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)）。
- [2026-11-20-company-file-read-state.md](settled_issues/2026-11-20-company-file-read-state.md) — workspace三态owner、旧视图委托、五个状态函数一次读取；领域政策与At语义保留，真实文件/负控验收；去向 = [Note](../../notes/implemented/2026-11-20-company-file-read-state.md)。
- [2026-11-19-guard-residuals-and-runtime-edges.md](settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md) — C17 门禁残余面七轴探索：产出 20 张 P2 卡（BUG-263..282）全部修复归档；去向 = implementation（[批次 Note](../../notes/implemented/2026-11-19-guard-residuals-closure.md)）。
- [2026-11-15-src-tests-dir-alignment.md](settled_issues/2026-11-15-src-tests-dir-alignment.md) — src↔tests 目录名对齐：host 例外清零 + `src/lib` 八组镜像；去向 = [Note](../../notes/implemented/2026-11-15-src-tests-dir-alignment.md)。
- [2026-11-15-tests-tree-axis.md](settled_issues/2026-11-15-tests-tree-axis.md) — 测试树分轴：镜像断言 + `tests/repo` 六个 owner 子目录 + 去组数枚举；去向 = [Note](../../notes/implemented/2026-11-15-tests-tree-axis.md)。
- [2026-11-13-suffix-lane-alignment.md](settled_issues/2026-11-13-suffix-lane-alignment.md) — spec/e2e/entry/checks 四层 + 四条命令；去向 = note。
- [2026-11-13-test-asset-naming-contract.md](settled_issues/2026-11-13-test-asset-naming-contract.md) — 目标树 + 资产正名 + naming-contract 门禁；去向 = note。
- [2026-11-13-test-asset-loop.md](settled_issues/2026-11-13-test-asset-loop.md) — 测试资产自校正系统 B/C/A（lane 注册表/按面 pre-push/覆盖率棘轮/失败类表/census）；去向 = note。
- [2026-11-12-bilingual-landing.md](settled_issues/2026-11-12-bilingual-landing.md) — 界面呈现层（Tab / Label / Button）zh/en；默认 zh、角色名混排；内部英文 I2/I3 不在范围；去向 = note。
默认不要读；从活卡或索引点名才打开。路径表示离场状态；历史讨论与证据原文保留，迁移只修导航链接与索引。

| 目录 | 放什么 |
|---|---|
| [settled_issues/](settled_issues/README.md) | 问题已有结论并符合关闭条件 |
| [suspended_issues/](suspended_issues/README.md) | 推敲被用户叫停，尚无结论 |
| [fixed_bugs/](fixed_bugs/README.md) | 已修复缺陷；编号权威在其 README |
| [suspended_bugs/](suspended_bugs/README.md) | 查明但尚未修复的缺陷 |
| [research/](research/README.md) | 归档研究题：题名页 + 一题一行索引；随最后一张活卡整目录迁入 |
| [legacy/](legacy/README.md) | 退役历史池，只按历史引用读取，不再收新件 |

## 待修缺陷

| 卡 | 挂起原因 | 触发器 |
|---|---|---|
| [BUG-212](suspended_bugs/BUG-212-pre-push-and-release-tail-budget-overrun.md) | docs-only 快速路径已修；pre-push 46s 成本-only | 连续两次 >60s / 真实阻塞投诉 |

## 已关闭问题

| 卡 | 历史结论 | 日期 |
|---|---|---|
| [BUG-263（已修）](fixed_bugs/BUG-263-pipeline-install-manual.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-264（已修）](fixed_bugs/BUG-264-pipeline-market-index.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-265（已修）](fixed_bugs/BUG-265-inventory-backslash-path.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-266（已修）](fixed_bugs/BUG-266-inventory-symlink-file.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-267（已修）](fixed_bugs/BUG-267-manifest-version-unvalidated.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-268（已修）](fixed_bugs/BUG-268-seed-target-unsafe.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-269（已修）](fixed_bugs/BUG-269-delivery-documents-refs.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-270（已修）](fixed_bugs/BUG-270-check-rules-values.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-271（已修）](fixed_bugs/BUG-271-dev-command-pnpm-forms.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-272（已修）](fixed_bugs/BUG-272-dev-command-probes.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-273（已修）](fixed_bugs/BUG-273-content-required-dirs.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-274（已修）](fixed_bugs/BUG-274-inventory-duplicate-gate.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-275（已修）](fixed_bugs/BUG-275-catalog-whitespace-final.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-276（已修）](fixed_bugs/BUG-276-catalog-json-unreadable-silent.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-277（已修）](fixed_bugs/BUG-277-presence-revision-gap-not-consumed.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-278（已修）](fixed_bugs/BUG-278-presence-unknown-status-label.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-279（已修）](fixed_bugs/BUG-279-bundle-upgrade-no-backup.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-280（已修）](fixed_bugs/BUG-280-release-docs-only-manual.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-281（已修）](fixed_bugs/BUG-281-release-docs-only-rename.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-282（已修）](fixed_bugs/BUG-282-release-stamp-check-asymmetry.md) | 已修：C17 组 | 2026-11-19 |
| [BUG-243（已修）](fixed_bugs/BUG-243-pipeline-fingerprint-sanitizer.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-244（已修）](fixed_bugs/BUG-244-required-shipped-misses-generic-content.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-245（已修）](fixed_bugs/BUG-245-required-shipped-misses-product-docs.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-246（已修）](fixed_bugs/BUG-246-required-shipped-misses-delivery-templates.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-247（已修）](fixed_bugs/BUG-247-required-shipped-misses-content-templates.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-248（已修）](fixed_bugs/BUG-248-required-json-schema-only-parse.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-249（已修）](fixed_bugs/BUG-249-seed-json-empty-object-passes.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-250（已修）](fixed_bugs/BUG-250-preset-yaml-not-parsed.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-251（已修）](fixed_bugs/BUG-251-persona-pnpm-methods-init.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-252（已修）](fixed_bugs/BUG-252-source-shape-no-dev-command-scan.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-253（已修）](fixed_bugs/BUG-253-allow-stale-arbitrary-reason.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-254（已修）](fixed_bugs/BUG-254-lease-unreadable-lock-takeover.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-255（已修）](fixed_bugs/BUG-255-bundle-created-at-invalid.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-256（已修）](fixed_bugs/BUG-256-bundle-pack-mismatch.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-257（已修）](fixed_bugs/BUG-257-presence-unknown-status-ignored.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-258（已修）](fixed_bugs/BUG-258-presence-deleted-no-reopen.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-259（已修）](fixed_bugs/BUG-259-catalog-empty-final.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-260（已修）](fixed_bugs/BUG-260-catalog-json-symlink.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-261（已修）](fixed_bugs/BUG-261-content-manifest-extra-drift.md) | 已修：C16 组 | 2026-11-18 |
| [BUG-262（已修）](fixed_bugs/BUG-262-content-manifest-refs-not-checked.md) | 已修：C16 组 | 2026-11-18 |
| [2026-11-18-guard-closure-and-unreadable-inputs.md](settled_issues/2026-11-18-guard-closure-and-unreadable-inputs.md) | 已结；C15 门禁闭环 + 不可读/部分输入（BUG-233..242 已修）；去向 = implementation（`56e4f986`） | 2026-11-18 |
| [BUG-233（已修）](fixed_bugs/BUG-233-required-shipped-misses-runtime-content.md) | 已修：REQUIRED_SHIPPED 43 条含 seed 源 | 2026-11-18 |
| [BUG-234（已修）](fixed_bugs/BUG-234-preset-set-completeness-unchecked.md) | 已修：EXPECTED_PATCH 12 且目标非空 | 2026-11-18 |
| [BUG-235（已修）](fixed_bugs/BUG-235-source-fingerprint-includes-dev-readme.md) | 已修：dev README 移出 sourceFingerprint | 2026-11-18 |
| [BUG-236（已修）](fixed_bugs/BUG-236-allow-stale-no-reason.md) | 已修：--allow-stale=理由，CI 禁止 | 2026-11-18 |
| [BUG-237（已修）](fixed_bugs/BUG-237-required-shipped-empty-file.md) | 已修：关键件 trim 非空 + JSON parse | 2026-11-18 |
| [BUG-238（已修）](fixed_bugs/BUG-238-catalog-unreadable-throws.md) | 已修：meta/ledger 不可读 warning 降级 | 2026-11-18 |
| [BUG-239（已修）](fixed_bugs/BUG-239-catalog-unreadable-final-silent.md) | 已修：final 不可读 → 无 final + warning | 2026-11-18 |
| [BUG-240（已修）](fixed_bugs/BUG-240-team-event-reopens-in-progress.md) | 已修：缺 revision 状态序只进不退 | 2026-11-18 |
| [BUG-241（已修）](fixed_bugs/BUG-241-presence-unknown-phase-diverges.md) | 已修：未知 phase 行/动态同落 unknown | 2026-11-18 |
| [BUG-242（已修）](fixed_bugs/BUG-242-presence-message-content-missing.md) | 已修：缺 content 降级「（空）」 | 2026-11-18 |
| [BUG-223（已修）](fixed_bugs/BUG-223-shipped-shape-globs-unchecked.md) | 已修：files glob/content 关键件闭包 | 2026-11-18 |
| [BUG-224（已修）](fixed_bugs/BUG-224-shipped-shape-text-face-misses-content.md) | 已修：TEXT_FACE 纳入 content，dev 路径同判 | 2026-11-18 |
| [BUG-225（已修）](fixed_bugs/BUG-225-shipped-shape-extensionless-dev-paths.md) | 已修：DEV_DIR 识别无扩展名/目录级引用 | 2026-11-18 |
| [BUG-226（已修）](fixed_bugs/BUG-226-shipped-shape-bundle-patch-unchecked.md) | 已修：dsh.bundle.patch 目标逐个在包 | 2026-11-18 |
| [BUG-227（已修）](fixed_bugs/BUG-227-release-shape-stale-dist.md) | 已修：release:shape 比对 sourceFingerprint（含 README.shipped） | 2026-11-18 |
| [BUG-228（已修）](fixed_bugs/BUG-228-shipped-shape-not-in-verify.md) | 已修：checkSourceShape 并入 shipped-links gate | 2026-11-18 |
| [BUG-229（已修）](fixed_bugs/BUG-229-diff-activity-partial-view.md) | 已修：diffActivity 部分视图 ?? [] | 2026-11-18 |
| [BUG-230（已修）](fixed_bugs/BUG-230-team-event-overrides-missing-revision.md) | 已修：缺 revision 时保护 completed/deleted 终态 | 2026-11-18 |
| [BUG-231（已修）](fixed_bugs/BUG-231-catalog-silent-symlink-dir.md) | 已修：子目录 symlink warning 不静默 | 2026-11-18 |
| [BUG-232（已修）](fixed_bugs/BUG-232-catalog-empty-slug.md) | 已修：空 slug 回退目录名 + warning | 2026-11-18 |
| [BUG-213（已修）](fixed_bugs/BUG-213-tarball-ships-type-dts-majority.md) | 已修：类型 135→3 且 import 改 `.js`；`release:shape` 判闭包 | 2026-11-17 |
| [BUG-214（已修）](fixed_bugs/BUG-214-shipped-prepack-missing-scripts.md) | 已修：tarball manifest 去 `scripts.prepack`；源码 prepack 保留 | 2026-11-17 |
| [BUG-215（已修）](fixed_bugs/BUG-215-shipped-readme-dev-links.md) | 已修：shipped README 用 README.shipped.md，包外相对链接清零 | 2026-11-17 |
| [BUG-216（已修）](fixed_bugs/BUG-216-shipped-comments-dev-paths.md) | 已修：bundle/注释 dev 指针剥离；cordis/presets 加「不随包」 | 2026-11-17 |
| [BUG-217（已修）](fixed_bugs/BUG-217-client-inject-missing-primitives.md) | 已修：primitives 进 peer + client.inject；假 module table missing=[] | 2026-11-17 |
| [BUG-218（已修）](fixed_bugs/BUG-218-readme-pnpm-runtime-prereq.md) | 已修：pnpm 改成 DSH 插件安装器依赖 + 缺包诊断 | 2026-11-17 |
| [BUG-219（已修）](fixed_bugs/BUG-219-shipped-devdeps-workspace-protocol.md) | 已修：tarball 去 devDependencies/workspace 协议 | 2026-11-17 |
| [BUG-220（已修）](fixed_bugs/BUG-220-sourcemap-url-missing-maps.md) | 已修：sourcemap 关，tarball 无 `.map`/sourceMappingURL | 2026-11-17 |
| [BUG-221（已修）](fixed_bugs/BUG-221-client-inject-over-declared.md) | 已修：保留 8 条 peer 背书的组合边；纠 README 的 inject 语义 | 2026-11-17 |
| [BUG-222（已修）](fixed_bugs/BUG-222-client-react-not-declared.md) | 已修：react 由 vendor PLATFORM_MODULES 基线提供，checker 可追溯 | 2026-11-17 |
| [BUG-202（已修）](fixed_bugs/BUG-202-refactor-drift-title-hash-and-duplicate-mask.md) | 已修：`--hashes` 拿标题冒充测试体、`--compare` 集合差吞重复；AST 测试体指纹 + 多重集比较 | 2026-11-17 |
| [BUG-203（已修）](fixed_bugs/BUG-203-coverage-ratchet-rename-resets-floor.md) | 已修：基线键消失只发 note、改名重置地板；`missing-baseline` 红 + `--rename/--drop` 显式迁移/删除 | 2026-11-17 |
| [BUG-204（已修）](fixed_bugs/BUG-204-ledger-branches-floor-cold-only.md) | 已修：冷环境 skip 把暖树 ledger 地板拉到 94；补无尾竖线纯测试、冷/暖同形回 100 | 2026-11-17 |
| [BUG-205（已修）](fixed_bugs/BUG-205-live-pointer-faces-miss-moved-libs.md) | 已修：live 指针 FACES 未随 63 lib 扩面；四个新家入面 + 每面非空 | 2026-11-17 |
| [BUG-206（已修）](fixed_bugs/BUG-206-coveredby-evidence-does-not-execute.md) | 已修：coveredBy 只是声明、pre-push 不加载探针；入口 import 图 spec + probes 改 coverage:ratchet | 2026-11-17 |
| [BUG-207（已修）](fixed_bugs/BUG-207-retired-path-misses-wave-renames.md) | 已修：退役前缀表没登记本波 77 renames；从近期 git 历史自动推导 + 手工表自检 | 2026-11-17 |
| [BUG-208（已修）](fixed_bugs/BUG-208-face-boundaries-computed-imports.md) | 已修：face-boundaries 丢弃 unresolvedImports；五个面断言空集 | 2026-11-17 |
| [BUG-209（已修）](fixed_bugs/BUG-209-live-declarations-stale-after-split.md) | 已修：tests/README 手抄面表与 Note 件数漂移；删手抄表/数字 + 声明守卫 | 2026-11-17 |
| [BUG-210（已修）](fixed_bugs/BUG-210-shipped-comments-dev-only-paths.md) | 已修：shipped 注释指向不随包的 tools/lib；加「不随包分发」+ spec + 重打 `_dist` | 2026-11-17 |
| [BUG-211（已修）](fixed_bugs/BUG-211-tools-readme-lib-purity-contradiction.md) | 已修：tools/README「lib 不启动进程」与 probe web 启动矛盾；改注入式措辞 + 靠评审 | 2026-11-17 |
| [2026-11-12-deep-surface-continuous-bug-hunt.md](settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md) | 已结；C1–C11 探索收官（BUG-090..201 分批修复归档；focus v6 两轮 18 张）；C12 归属波次另立 [新卡](settled_issues/2026-11-17-ownership-wave-exploratory.md) | 2026-11-17 |
| [BUG-192（已修）](fixed_bugs/BUG-192-surface-rules-tracked-path-completeness.md) | 已修：19 条 tracked 路径无面规则/豁免、完备性只抽样；新门禁 `surface-coverage` 全 tracked 判据 + 登记 | 2026-11-16 |
| [BUG-193（已修）](fixed_bugs/BUG-193-vitest-threshold-guard-accepts-directory.md) | 已修：阈值键守卫放过目录；三处守卫统一 `statSync().isFile()` | 2026-11-16 |
| [BUG-194（已修）](fixed_bugs/BUG-194-live-pointer-guard-misses-js-source.md) | 已修：活指针守卫漏 `.js` 源码；源码面后缀补 `.js/.mjs` | 2026-11-16 |
| [BUG-195（已修）](fixed_bugs/BUG-195-live-pointer-guard-misses-presets-skills.md) | 已修：活指针守卫漏 presets/`.agents/skills`；两个 live 载体面入 `FACES` | 2026-11-16 |
| [BUG-196（已修）](fixed_bugs/BUG-196-typecheck-claim-guard-misses-checks-readme.md) | 已修：计数守卫漏 checks/run/runtime README 与 skills；导航面补全 | 2026-11-16 |
| [BUG-197（已修）](fixed_bugs/BUG-197-built-path-guard-misses-docs-ts.md) | 已修：构建字面量守卫只扫 checks/tools/probes `.mjs`；扩到 live 文本面 | 2026-11-16 |
| [BUG-198（已修）](fixed_bugs/BUG-198-built-path-guard-false-red-js-source.md) | 已修：合法 `.js` 源码产物被假红；源码候选补 `.js/.mjs` | 2026-11-16 |
| [BUG-199（已修）](fixed_bugs/BUG-199-pre-push-unseen-exits-zero.md) | 已修：未分类改动面只打印不阻断；`unseen` 一律退出非零 | 2026-11-16 |
| [BUG-200（已修）](fixed_bugs/BUG-200-coveredby-coverage-ratchet-not-executable.md) | 已修：证据标签 `coverage-ratchet` 不可执行；改 `coverage:ratchet` + 可执行性断言 | 2026-11-16 |
| [BUG-201（已修）](fixed_bugs/BUG-201-pre-push-paths-dot-prefix-unseen.md) | 已修：`--paths` 不归一 `./`/反斜杠；归一后才进选择器 | 2026-11-16 |
| [BUG-184（已修）](fixed_bugs/BUG-184-vitest-coverage-thresholds-stale-host-paths.md) | 已修：vitest 5 个 host 覆盖率阈值键指向搬移前路径、阈值静默失效；改现行路径 + 键命中 spec | 2026-11-16 |
| [BUG-185（已修）](fixed_bugs/BUG-185-replay-lane-stale-built-presence-import.md) | 已修：replay 动态 import 旧 built presence 路径（MODULE_NOT_FOUND）；指到 presence/presence.js + 构建字面量 spec | 2026-11-16 |
| [BUG-186（已修）](fixed_bugs/BUG-186-pre-push-surface-rules-miss-src-lib-tools.md) | 已修：pre-push 面规则缺 src/lib/tools，搬移面零真入口；src/lib→replay + `coveredBy` 申报 + 覆盖面 spec | 2026-11-16 |
| [BUG-187（已修）](fixed_bugs/BUG-187-module-comments-stale-spec-paths.md) | 已修：5 条源码注释仍指搬移前 spec 路径（含 2 处 cultivation 同类补漏）；活指针 spec | 2026-11-16 |
| [BUG-188（已修）](fixed_bugs/BUG-188-implemented-note-ui-surface-stale-command.md) | 已修：implemented Note 的 ui-surface 命令指向 tests/host 旧家；改 tests/ui + 活指针 spec | 2026-11-16 |
| [BUG-189（已修）](fixed_bugs/BUG-189-implemented-note-generic-english-stale-path.md) | 已修：implemented Note 指向已退役 generic-english spec；改 content-english + 活指针 spec | 2026-11-16 |
| [BUG-190（已修）](fixed_bugs/BUG-190-candidate-scan-comment-stale-spec.md) | 已修：audit 注释指向不存在的 candidate-scan-labels spec；改 assignments + 活指针 spec | 2026-11-16 |
| [BUG-191（已修）](fixed_bugs/BUG-191-typecheck-coverage-counts-stale-docs.md) | 已修：两份 live 文档手写覆盖分数停在搬移前；改 include 减 exclude 公式 + 计数声明 spec | 2026-11-16 |
| [2026-11-15-src-tests-dir-alignment.md](settled_issues/2026-11-15-src-tests-dir-alignment.md) | 已结；host 两条源侧例外清零（fs/logging 各配测试目录）、`src/lib` 按域分八组且 `tests/lib` 同名镜像、mirror 升级为三处目录名集合相等（249 files / 2118 tests、verify ALL PASS、四面 tsc 绿）；去向 = [Note](../../notes/implemented/2026-11-15-src-tests-dir-alignment.md) | 2026-11-15 |
| [2026-11-15-tests-tree-axis.md](settled_issues/2026-11-15-tests-tree-axis.md) | 已结；镜像成为断言（`tests/repo/structure/` 下的 set-equality + 五条例外防腐化）、`tests/repo` 35 个 spec 换 owner 轴分六组、三份 README 去组数枚举并补 host 组表两行（245 files / 2099 tests、verify ALL PASS、四面 tsc 绿）；去向 = [Note](../../notes/implemented/2026-11-15-tests-tree-axis.md) | 2026-11-15 |
| [BUG-176（已修）](fixed_bugs/BUG-176-json-fence-example-extracted.md) | 已修：示例围栏里的 json 块被当账本；顶层围栏块成为唯一来源 | 2026-11-14 |
| [BUG-177（已修）](fixed_bugs/BUG-177-fix-evidence-valid-command-forms.md) | 已修：合法命令形态（`pnpm run`/`--filter`/`node --import`）被拒；按语法解析选项+值 | 2026-11-14 |
| [BUG-178（已修）](fixed_bugs/BUG-178-fix-evidence-section-in-code-block.md) | 已修：代码块里的节标题截错；节标题只在非围栏行匹配 | 2026-11-14 |
| [BUG-179（已修）](fixed_bugs/BUG-179-internal-dotdot-over-rejected.md) | 已修：内部 `..` 被误杀；栈式消解，越界才 unsafe | 2026-11-14 |
| [BUG-180（已修）](fixed_bugs/BUG-180-walk-company-dirs-windows-dotdot.md) | 已修：Windows `..\` 绕过闸；平台无关分隔符 + 入口归一 | 2026-11-14 |
| [BUG-181（已修）](fixed_bugs/BUG-181-multiline-code-span.md) | 已修：跨行行内代码里的标题被当定义；code span 状态跨行维护 | 2026-11-14 |
| [BUG-182（已修）](fixed_bugs/BUG-182-fix-evidence-noop-commands.md) | 已修：空操作命令（`sh -c`/`git`/任意 node 文件）也算证据；拒绝并限定入口面 | 2026-11-14 |
| [BUG-183（已修）](fixed_bugs/BUG-183-notes-root-symlink-followed.md) | 已修：`notes/` 根 symlink 被跟随；根 lstat 判定直接红 | 2026-11-14 |
| [BUG-168（已修）](fixed_bugs/BUG-168-markdown-inline-code-comment.md) | 已修：行内代码里的注释记号起注释；`scanDocument` 增代码 span 状态 | 2026-11-14 |
| [BUG-169（已修）](fixed_bugs/BUG-169-markdown-unclosed-comment.md) | 已修：未闭合注释静默吞后文；`scanDocumentDetailed` 报起始行号，两命令各报根因 | 2026-11-14 |
| [BUG-170（已修）](fixed_bugs/BUG-170-read-company-file-dotdot-subclass.md) | 已修：`a/../..` 越界折成 missing；`walkCompanyDirs` 走目录前全量拒绝 `..` 段 | 2026-11-14 |
| [BUG-171（已修）](fixed_bugs/BUG-171-fix-evidence-deletion-surface.md) | 已修：删除型修复被存在性硬判拦住；改由证据提交 changed 对账 | 2026-11-14 |
| [BUG-172（已修）](fixed_bugs/BUG-172-split-table-row-double-backslash.md) | 已修：双反斜杠吞竖线；`splitTableRow` 先双反斜杠再单转义竖线 | 2026-11-14 |
| [BUG-173（已修）](fixed_bugs/BUG-173-legacy-json-in-comment.md) | 已修：注释里的 legacy JSON 仍生效；`extractJsonBlock` 吃注释掩码 | 2026-11-14 |
| [BUG-174（已修）](fixed_bugs/BUG-174-notes-tree-symlink-invisible.md) | 已修：notes-tree 对 symlink 视而不见；depth 1–3 的 symlink 直接红 | 2026-11-14 |
| [BUG-175（已修）](fixed_bugs/BUG-175-fix-evidence-fake-command.md) | 已修：假 pnpm 脚本充当证据；命令按 scripts/本地 bin/路径解析 | 2026-11-14 |
| [BUG-160（已修）](fixed_bugs/BUG-160-req-check-raw-text-bom-fence.md) | 已修：`/req check` 仍读原始文本（BOM 缺头、围栏幽灵 REQ）；与 `/prd check` 共用 `lib/markdown-shape.ts` | 2026-11-14 |
| [BUG-161（已修）](fixed_bugs/BUG-161-pre-push-merge-commit-surface-skip.md) | 已修：merge 提交 `diff-tree` 无输出、合并结果的 surface 改动漏检；`commitPaths()` 改取第一父 diff | 2026-11-14 |
| [BUG-162（已修）](fixed_bugs/BUG-162-prd-html-comments-parsed-as-definitions.md) | 已修：HTML 注释里的 REQ/Slices 当定义；`scanDocument` 增加注释状态并把片段移出行文本 | 2026-11-14 |
| [BUG-163（已修）](fixed_bugs/BUG-163-notes-tree-rejected-status-unguarded.md) | 已修：notes-tree 状态行检查跳过 `rejected/`；纳入 lifecycle 并要求 `rejected` 状态词 | 2026-11-14 |
| [BUG-164（已修）](fixed_bugs/BUG-164-req-in-multiple-slices.md) | 已修：同一 REQ 列进两个 slice 仍绿；`parsePrdSlices` 维护 `reqOwner` 并点名两处 | 2026-11-14 |
| [BUG-165（已修）](fixed_bugs/BUG-165-slices-escaped-pipe.md) | 已修：Slices 表 `\|` 被当列分隔；`splitTableRow` 按未转义竖线切列并还原字面竖线 | 2026-11-14 |
| [BUG-166（已修）](fixed_bugs/BUG-166-prd-changelog-format.md) | 已修：changeLog 假日期/空作者过门；校验真实日历日期与非空作者/变更 | 2026-11-14 |
| [BUG-167（已修）](fixed_bugs/BUG-167-notes-tree-invalid-calendar-date.md) | 已修：notes-tree 只验日期形状；文件名日期做真实日历往返，生效比较用解析值 | 2026-11-14 |
| [BUG-152（已修）](fixed_bugs/BUG-152-prd-headings-crlf-bom.md) | 已修：CRLF/BOM 的 headings PRD 被判「没有定义小节」；入口归一化（去 BOM、CRLF→LF），三编码同判 | 2026-11-14 |
| [BUG-153（已修）](fixed_bugs/BUG-153-prd-headings-fenced-code-blocks.md) | 已修：围栏里的示例标题/Slices 表被当定义；`scanLines()` 维护围栏状态（三反引号/三波浪号），只有围栏外算结构 | 2026-11-14 |
| [BUG-154（已修）](fixed_bugs/BUG-154-prd-gate-numbering-empty-value.md) | 已修：present 闸门把空值 `numbering:` 当旧动议放行；闸门改读 `numberingMarker()` 三态，与 `/req check` 同判 | 2026-11-14 |
| [BUG-155（已修）](fixed_bugs/BUG-155-prd-gate-stale-session-cwd.md) | 已修：闸门按 header.cwd 解析相对路径、与 present 分叉；改读 `ctx.workingDirectory.ensure`，解析不到时明确 deny | 2026-11-14 |
| [BUG-156（已修）](fixed_bugs/BUG-156-prd-gate-symlink-unreadable-fail-open.md) | 已修：meta/drafts symlink/越界被当旧动议放行；`readCompanyFileAt()` 三态（missing 才豁免，unsafe 一律 deny）+ 载体登记 | 2026-11-14 |
| [BUG-157（已修）](fixed_bugs/BUG-157-prd-duplicate-ac-slice-ids.md) | 已修：AC/slice 重号不判红；AC 与 slice 各自维护 seen 集合并点名重号 | 2026-11-14 |
| [BUG-158（已修）](fixed_bugs/BUG-158-pre-push-zero-sha-range.md) | 已修：新分支只看 tip、删 ref 崩；remote 全零取整条出站提交集，local 全零跳过；`tests/checks` 三条形状自测 | 2026-11-14 |
| [BUG-159（已修）](fixed_bugs/BUG-159-client-error-ring-empty-object-message.md) | 已修：`{}` 的 `JSON.stringify` 短路 `event.message`；`textOf` 先读 `message`/`reason`/`name` 再退 JSON | 2026-11-14 |
| [2026-11-14-institutional-test-ratchet.md](settled_issues/2026-11-14-institutional-test-ratchet.md) | 已结；宪章（单原语+盲审分权+封顶）× 流程（多轮独立盲审，首轮抓 6 BLOCKER；轮次见 Note）× 元门禁（禁裸解析/mdast 差分/路径矩阵/分支变异/负债棘轮）；去向 = [Note](../../notes/implemented/2026-11-14-institutional-test-ratchet.md) | 2026-11-14 |
| [2026-11-14-decision-ledger-unification.md](settled_issues/2026-11-14-decision-ledger-unification.md) | 已结；`docs/reference/decisions.md` 拆现行/已退役双表 + D1–D61 `#dN` 锚点 + `docs/decisions.md` 顶层门牌 + `ledger-routing` 接管表外控长（10 单测 + 5 分支变异 + 两轮独立盲审）；去向 = [Note](../../notes/implemented/2026-11-14-decision-ledger-unification.md) | 2026-11-14 |
| [2026-11-14-notes-tree-and-carrier-gates.md](settled_issues/2026-11-14-notes-tree-and-carrier-gates.md) | 已结；`notes-tree` 门禁（形状 + 状态行）+ 两份注入载体（`notes/implemented/AGENTS.md` / `notes/archived/AGENTS.md`）；七组真树红证 + 19 项回归；去向 = [Note](../../notes/implemented/2026-11-14-notes-tree-and-carrier-gates.md) | 2026-11-14 |
| [2026-11-14-test-asset-leverage.md](settled_issues/2026-11-14-test-asset-leverage.md) | 已结；形状单核 + 退役 10 + census v2（72/97 无消费者）+ bug-coverage 76/181 + property/差分/路径 + 4 门禁 conformance/mutation + notes-axes/weekly lane；去向 = [Note](../../notes/implemented/2026-11-14-test-asset-leverage.md) | 2026-11-14 |
| [2026-11-13-landing-semantics-agents-md.md](settled_issues/2026-11-13-landing-semantics-agents-md.md) | 已结；“落地 = 系统可验证变更 + 实跑证据；写 RFC/搬卡不算”写进入口/模板/门禁；三条门禁红→绿；去向 = [Note](../../notes/implemented/2026-11-13-landing-semantics.md) | 2026-11-13 |
| [2026-11-13-workflow-entry-and-fact-checkpoint.md](settled_issues/2026-11-13-workflow-entry-and-fact-checkpoint.md) | 已结；RFC 成立（P0 入口/一致性 → P1 事实检查点 → P2 可执行验收）；实施不在本卡关闭条件内；去向 = [RFC](../../notes/proposed/2026-11-13-workflow-entry-and-fact-checkpoint.md) | 2026-11-13 |
| [2026-11-13-test-asset-fence-p0.md](settled_issues/2026-11-13-test-asset-fence-p0.md) | 已结；测试资产围栏 P0：mutation 守卫 + replay `--refresh` + candidate 已耗 + `smoke:fast` 6 条进 pre-push；verify/test 242/1997/pre-push 全绿 | 2026-11-13 |
| [2026-11-13-adversarial-shape-matrix-p0.md](settled_issues/2026-11-13-adversarial-shape-matrix-p0.md) | 已结；shape 库 + Safety/Agreement 矩阵 + 载体登记 + 门禁；verify ALL PASS、test 242/1997、4 红证 + 进程 smoke ALL PASS；去向 = [Note](../../notes/implemented/2026-11-13-adversarial-shape-matrix.md) | 2026-11-13 |
| [BUG-151（已修）](fixed_bugs/BUG-151-upgrade-log-target-symlink-writes-outside.md) | 已修：upgrade log 叶子目标被 symlink/目录占用时跟随写外/裸抛 EISDIR；`appendUpgradeLog` 预检 unsafe 跳过；Safety 134 passed、KNOWN_GAP 清零 | 2026-11-13 |
| [2026-11-12-startup-strategy-wiki-regression-exploration.md](settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md) | 已结；启动策略（界面）+ wiki 知识地图（配置）回归/探索：A1–A5 / B1–B8 + named child；10 张 BUG-080..089；未证 teammate/workflow 等；去向 = none（只产证据/BUG 卡） | 2026-11-12 |
| [2026-11-12-wiki-knowledge-map-landing.md](settled_issues/2026-11-12-wiki-knowledge-map-landing.md) | 已结；wiki 模板（AK 三层 + OKF 最小 frontmatter）+ 六角色共享协议 skill + 指针三档校验 + 注入按位置分档；verify/test(233 files/1723)/typecheck/preset-smoke 全绿 + 外部只读真会话实测；去向 = [Note](../../notes/implemented/2026-11-12-wiki-knowledge-map-landing.md) | 2026-11-12 |
| [2026-11-12-startup-settings-landing.md](settled_issues/2026-11-12-startup-settings-landing.md) | 已结；composer 入口 + 右栏「策略」页签（三字段、首项自动、选项从 content 枚举）+ workspace 级 `startup.json` + `company:startup-settings` 软注入；verify/test(231 files/1704)/typecheck/ui-scene-smoke(10 页签) 全绿；去向 = [Note](../../notes/implemented/2026-11-12-startup-settings.md) | 2026-11-12 |
| [2026-11-12-internal-english-canonical.md](settled_issues/2026-11-12-internal-english-canonical.md) | 已结；表达层双语 + 内部全英文 canonical（内容/persona/skills/注释/日志/领域值/picker 统一英文）；去向 = [RFC](../../notes/proposed/2026-11-12-internal-english-canonical.md) | 2026-11-12 |
| [2026-11-12-bilingual-company.md](settled_issues/2026-11-12-bilingual-company.md) | 已结；中英文双语（默认中文）：代码盘面 + DSH locale 机制 + 默认 zh + 纪律三件套方案；去向 = [RFC](../../notes/proposed/2026-11-12-bilingual-company.md)；实施由 RFC 承载 | 2026-11-12 |
| [2026-11-11-delegation-capability-scoping-regression-exploration.md](settled_issues/2026-11-11-delegation-capability-scoping-regression-exploration.md) | 已结；委派能力域化后回归+探索：A1–A6/B1–B6 已跑面 + 5 张 BUG-071..075（文案/support root/README/注入生命周期/skill 缩编）；verify/test/preset-smoke/delegation-smoke/release-smoke/product-team-e2e/vp-eng probe 全绿；未证 = teammate cold resume 等；去向 = none | 2026-11-11 |
| [2026-11-11-delegation-policy-capability-scoped.md](settled_issues/2026-11-11-delegation-policy-capability-scoped.md) | 已结；capability header + 五段 section + core skill + per-agent workflow_runs；team 按 Lead 权限；6 座位真挂载 + CMO/COO/VP-Eng pilot + product-team-e2e-smoke ALL PASS；verify/test/typecheck/lint/dup/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-11-delegation-policy-capability-scoped.md) | 2026-11-11 |
| [2026-11-11-delegation-contract-truth.md](settled_issues/2026-11-11-delegation-contract-truth.md) | 已结；maxDepth 行上限、team 上下文 `fresh|fork`、`teamLeadWhenRoot`、native/repo 控制标签、A/B/C/D→原生四通道；vendor-parity spec 红→绿；presets/full test/typecheck/preset-smoke/verify 全绿；去向 = [Note](../../notes/implemented/2026-11-11-delegation-contract-truth.md) | 2026-11-11 |
| [2026-11-11-delivery-mode-v2.md](settled_issues/2026-11-11-delivery-mode-v2.md) | 已结；`/delivery check`（productized 无要求 / project-services + managed-service 按 rules 查文档与 section）+ 硬软能力前置 capabilities.md；productized 方法以后做、默认交付模式保留；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-11-delivery-check-v2.md) | 2026-11-11 |
| [2026-11-11-delivery-mode-axis.md](settled_issues/2026-11-11-delivery-mode-axis.md) | 已结；两轴交付模式 `project-services` + `managed-service`（content/delivery-modes + meta 交付模式 + 经营方法 + workflow 分派 + awareness + sources 门禁 + 两轴测试矩阵）；verify/test/typecheck/preset-smoke/two-axis-gates-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-11-delivery-mode-axis.md) | 2026-11-11 |
| [2026-11-08-workflow-subagent-exploratory-bug-hunt.md](settled_issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md) | 已结；八轮探索 + 资产先行（A/B）；BUG-045–060 修复归档；研究题随卡归档；去向 = [Note](../../notes/implemented/2026-11-10-exploration-asset-strategy.md) | 2026-11-11 |
| [2026-11-10-product-type-semantics.md](settled_issues/2026-11-10-product-type-semantics.md) | 已结；`b2b-saas` → `business-software`（MRD/StRS/PRD；SaaS 交付模式）+ product-definition/manifest/fixture/tests/docs；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-business-software-product-type.md) | 2026-11-10 |
| [2026-11-10-motion-product-type.md](settled_issues/2026-11-10-motion-product-type.md) | 已结；`meta.md` 产品类型 + `/req check` 动议优先/company 回落/未知报错 + 角色/手册/测试；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-motion-product-type.md) | 2026-11-10 |
| [2026-11-10-coo-cfo-delegation.md](settled_issues/2026-11-10-coo-cfo-delegation.md) | 已结；CEO 五条命名行（`coo`/`cfo` maxDepth 1）+ team 角色包 + model/UI/tests/docs；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-coo-cfo-delegation.md) | 2026-11-10 |
| [2026-11-10-sa-sqa-method-packs.md](settled_issues/2026-11-10-sa-sqa-method-packs.md) | 已结；`system-architecture@1.0.0` + `vv-plan@1.0.0` 两侧方法 + `methods:init` + blocker 升级 + tests；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-sa-sqa-method-packs.md) | 2026-11-10 |
| [2026-11-10-materiality-and-trace-decision.md](settled_issues/2026-11-10-materiality-and-trace-decision.md) | 已结；材料性 = 授权与留痕共用判据（章程一处定义 + 三处引用）+ 缺陷轨 `留痕：` 裁决 + 归档卡去向落点解析门（self-link 红→绿）；落点修复 2 卡 + 6 索引行；verify ALL PASS、167 files/1348 tests；去向 = [Note](../../notes/implemented/2026-11-10-materiality-and-trace-decision.md) | 2026-11-10 |
| [2026-11-10-producer-verifier-quality-loop.md](settled_issues/2026-11-10-producer-verifier-quality-loop.md) | 已结；质量环（`quality-loop-producer` 有手 / `quality-loop-verifier` 真只读·无 bash + VP-Eng `quality_loop_produce`/`quality_loop_verify` 命名行 + 共享流程 skill + 角色方法层 `<pack>@<version>` fail-closed + 裁决原文/哈希 + 事后审计判据与非角色边界派生）；verify/test/typecheck/preset-smoke 全绿、审计自证 5 支、一次真模型 E2E（R1 fail→R2 pass，审计 ALL PASS）；去向 = [Note](../../notes/implemented/2026-11-10-producer-verifier-quality-loop.md) | 2026-11-10 |
| [2026-11-10-content-charter.md](settled_issues/2026-11-10-content-charter.md) | 已结；内容宪章（四槽/三层/四问/两测/两消费者/成本表/红牌/变更协议）+ 归位 skill + 入口门 `charter-entry`（5 条负例留证 / 3 支全覆盖）+ 卡模板 `## 抽象度` + P5 归位一问；verify ALL PASS、167 files/1347 tests；冷读证「撞得到 + 用得上」；去向 = [Note](../../notes/implemented/2026-11-10-content-charter.md) | 2026-11-10 |
| [2026-11-10-docs-dsh-alignment.md](settled_issues/2026-11-10-docs-dsh-alignment.md) | 已结；五步 DSH 对齐（值 / index 书架 / design→notes+architecture / genre 拆分 / 5% headroom）+ 四篇 rationale 收口 + canonical 守卫；verify ALL PASS、167 files/1347 tests、typecheck；去向 = [Note](../../notes/implemented/2026-11-10-docs-dsh-alignment.md) | 2026-11-10 |
| [2026-11-10-docs-layer-restructure.md](settled_issues/2026-11-10-docs-layer-restructure.md) | 已结；docs/ 分层重整（顶层 8 门/宪法 + contracts/ 7 + reference/ 3）；index 首屏按目的路由；227+ 链接跟随后 verify ALL PASS、167 files/1347 tests；冻结层 122 文件只改路径；用户“都提交”＝接受；去向 = [Note](../../notes/implemented/2026-11-10-docs-layer-restructure.md) | 2026-11-10 |
| [2026-11-09-company-specificity-externalization.md](settled_issues/2026-11-09-company-specificity-externalization.md) | 已结；三层分离（generic/product-types/company + contracts 版本轴）、T0–T3 加载与 manifest 预算、政策/复核/编号单家、两公司 fixture 与测试字面量门；verify ALL PASS、166 files/1319 tests、release-smoke ALL PASS；去向 = [Note](../../notes/implemented/2026-11-09-generic-specific-separation.md) | 2026-11-09 |
| [2026-11-09-delegation-residuals-closeout.md](settled_issues/2026-11-09-delegation-residuals-closeout.md) | 已结；P-H/P-I 确定性注入、worker-workflow no-go、companyDelegationTerminal 投影；1300、6+3、9 页签全绿；去向 = [残差收口 Note](../../notes/implemented/2026-11-09-delegation-residuals-closeout.md) | 2026-11-09 |
| [2026-11-09-retire-sa-sqa.md](settled_issues/2026-11-09-retire-sa-sqa.md) | 已结；退役 system-architect/system-qa：目录/父行/patch/support/模型 specialist/文档/测试/探针清理；worker family 保留；6+3、1297、verify 全绿；去向 = [退役 Note](../../notes/implemented/2026-11-09-retire-sa-sqa.md) | 2026-11-09 |
| [2026-11-09-specialist-worker-taxonomy.md](settled_issues/2026-11-09-specialist-worker-taxonomy.md) | 已结；researcher→worker-researcher（只读 named-only worker profile）；SA/SQA 升 specialist（skills/authority）；删 leaf；CEO subagent_research 改钉；P-L + preset-smoke 6+5 + 全量绿 | 2026-11-09 |
| [2026-11-09-presets-delegation-architecture.md](settled_issues/2026-11-09-presets-delegation-architecture.md) | 已结；模型/两层合同/静态矩阵/UI 树+completed/failed/retry/worker leaf+小工头；P5 不生成、P-I host 不自动重试；worker-workflow planned；去向 = [Note](../../notes/implemented/2026-11-09-presets-delegation-model.md) | 2026-11-09 |
| [2026-11-08-vpeng-workflow-channel.md](settled_issues/2026-11-08-vpeng-workflow-channel.md) | 已结；vp-eng 接入 workflow 同身份扇出（两行 + 两 peer + 五档 skill + 文档/Note）；Step 0 最小 workflow 绿（danger-full-access）、常驻行为 probe ALL PASS；去向 = [Note](../../notes/archived/2026-11-08-vpeng-workflow-channel.md) | 2026-11-08 |
| [2026-11-08-user-facing-readme-and-first-use.md](settled_issues/2026-11-08-user-facing-readme-and-first-use.md) | 已结；README/手册改使用者面向 + 「第一次经营一家公司」六步 + 凭据/支持口径；`readme-manual-commands` 门先红后绿；冷读 README 7.0/7、手册 7/7；去向 = [Note](../../notes/archived/2026-11-08-user-facing-readme-and-first-use.md) | 2026-11-08 |
| [2026-11-07-sa-sqa-capability-organization.md](settled_issues/2026-11-07-sa-sqa-capability-organization.md) | 已结；SA/SQA 能力组织按场景取用学科域（A+C：固定五行 + 任务书统一声明 + SQA 逐行域审计）；纯软件 live 真跑 R0–R7 全绿 | 2026-11-08 |
| [2026-11-07-requirements-teaming-landing.md](settled_issues/2026-11-07-requirements-teaming-landing.md) | 已结；需求识别/编号 + VP-Eng 组队的程序伞卡：D1–D8 口径、11 张执行卡、W0–W5 执行计划全部收口；去向 = [程序 Note](../../notes/archived/2026-11-07-requirements-teaming-program.md) | 2026-11-07 |
| [2026-11-07-requirements-contract.md](settled_issues/2026-11-07-requirements-contract.md) | 已结；A1 编号合同（R1–R10/退役词/范围豁免/并发）+ meta 标记 + 门禁 | 2026-11-07 |
| [2026-11-07-requirements-templates.md](settled_issues/2026-11-07-requirements-templates.md) | 已结；A2 五层模板 + layer/definition 头 + PRD JSON 唯一定义点 + allocation 附录 | 2026-11-07 |
| [2026-11-07-requirements-checker.md](settled_issues/2026-11-07-requirements-checker.md) | 已结；A5 纯逻辑 checker（重复/悬空/退役/孤儿/覆盖/计数/矩阵） | 2026-11-07 |
| [2026-11-07-requirements-command.md](settled_issues/2026-11-07-requirements-command.md) | 已结；A6 `/req check` 操作员命令 + 命令集注册 | 2026-11-07 |
| [2026-11-07-requirements-cmo-vpeng.md](settled_issues/2026-11-07-requirements-cmo-vpeng.md) | 已结；A3 CMO 产 MRD+StRS、VP-Eng 只产 PRD（source/traces） | 2026-11-07 |
| [2026-11-07-requirements-sa.md](settled_issues/2026-11-07-requirements-sa.md) | 已结；A4a SA 产 SyRS+IRS+allocation+架构，验证点改引用不发号 | 2026-11-07 |
| [2026-11-07-requirements-sqa.md](settled_issues/2026-11-07-requirements-sqa.md) | 已结；A4b SQA 用 TC-### 写 V&V（layer V&V + table-rows + covers + L1–L4） | 2026-11-07 |
| [2026-11-07-requirements-migration.md](settled_issues/2026-11-07-requirements-migration.md) | 已结；A7 旧盘迁移/豁免/升级面（process-docs 只补缺 seed） | 2026-11-07 |
| [2026-11-07-requirements-e2e.md](settled_issues/2026-11-07-requirements-e2e.md) | 已结；A8 五层真跑（重跑一次 ALL PASS：checker 绿 MR4/REQ44/IF8/TC49） | 2026-11-07 |
| [2026-11-07-vpeng-teaming.md](settled_issues/2026-11-07-vpeng-teaming.md) | 已结；B1 VP-Eng 组队（vp_cmo + eng-teaming 四档 + 继承口径修正） | 2026-11-07 |
| [2026-11-07-vpeng-evidence-closeout.md](settled_issues/2026-11-07-vpeng-evidence-closeout.md) | 已结；B2 VP-Eng 包 E2E + CEO 回归（ALL PASS）+ 程序收口 | 2026-11-07 |
| [2026-11-06-system-architect-sqa.md](settled_issues/2026-11-06-system-architect-sqa.md) | 已结；VP-Eng 落地项目的 E/V 分家：SA + SQA 两个委派子人格（子人格档）、委托行 `maxDepth: 2`、SQA 否决直达 CEO；真模型 E2E 证两独立会话/preset/depth=2；去向 = [SA/SQA Note](../../notes/archived/2026-11-06-sa-sqa-subpersonas.md) | 2026-11-06 |
| [2026-11-03-repo-hygiene-round6.md](settled_issues/2026-11-03-repo-hygiene-round6.md) | 已结；fresh agent 七维复评（落地后 A-/A/A-/A-/A-/A-/A-）+ 三棵测试树层次化 + 腐化通道四条机械面（retired-claims / command-refs / dist-manual 同源 / ledger 顺序）+ 错误中继与 D7 两项；去向 = [context-rot-guards Note](../../notes/archived/2026-11-03-context-rot-guards.md) 等 9 篇 | 2026-11-03 |
| [2026-11-03-repo-hygiene-round5.md](settled_issues/2026-11-03-repo-hygiene-round5.md) | 已结（消化）；A–F 各批已落地或被第六轮承接；残余 = npm publish（外部）与零入链分诊（已定性不批量迁） | 2026-11-03 |
| [2026-11-02-remove-trajectory-terminal-ui.md](settled_issues/2026-11-02-remove-trajectory-terminal-ui.md) | 已结；pack 禁 `ui-trajectory` / `ui-sidebar-terminal` 两行，主区 = Chat + 培养、右栏无 New terminal；组合面 + 真页面验收通过；去向 = [Note](../../notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md) | 2026-11-03 |
| [2026-11-02-harness-release-alignment.md](settled_issues/2026-11-02-harness-release-alignment.md) | 已结；FAQ 26 术语/current docs/发布字节证据链对齐；0.7.1；去向 = [distribution-alignment Note](../../notes/implemented/2026-11-02-distribution-alignment.md) | 2026-11-02 |
| [2026-11-02-dev-product-path-parity.md](settled_issues/2026-11-02-dev-product-path-parity.md) | 已结；dev 默认 tarball + `--link` 显式快速通道、parity 指南/门禁、市场 staged；去向 = [parity Note](../../notes/implemented/2026-11-02-dev-product-path-parity.md) | 2026-11-02 |
| [2026-11-01-plugin-lifecycle-publish.md](settled_issues/2026-11-01-plugin-lifecycle-publish.md) | 已结；0.7.0 发布就绪（install/身份/index/升卸/本地 registry 演练）；公有 publish/托管 = handoff | 2026-11-02 |
| [2026-11-01-plugin-as-product-v3.md](settled_issues/2026-11-01-plugin-as-product-v3.md) | 已结；bundle 产品/无 launcher/workspace 解析/内容在包/run bundle 全嵌套/账本分区；0.7.0 复核；去向 = [v3 Note](../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md) | 2026-11-02 |
| [2026-11-01-plugin-as-product.md](settled_issues/2026-11-01-plugin-as-product.md) | 已结；0.5.0 产品形状：company profile/启动器/workspace v2/登记/seed/手册碰撞/方法账本留 host；v1 边界 = Web onboarding/Windows/registry/威胁注入 | 2026-11-01 |
| [2026-11-01-landing-plan.md](settled_issues/2026-11-01-landing-plan.md) | 已结；P0–P6 执行回执；v1 边界不阻塞关闭 | 2026-11-01 |
| [2026-11-01-product-lifecycle.md](settled_issues/2026-11-01-product-lifecycle.md) | 已结；安装/首启/升级/降级/备份/恢复/搬移/卸载/doctor + 运行中升级/坏安装注入 | 2026-11-01 |
| [2026-11-01-workspace-and-data-safety.md](settled_issues/2026-11-01-workspace-and-data-safety.md) | 已结；选/切/搬/备/删、lease、v2 身份、方法/账本留 host + 导出；不可信项目边界测试 | 2026-11-01 |
| [2026-11-01-release-and-docs.md](settled_issues/2026-11-01-release-and-docs.md) | 已结；0.5.0 发布面/文档面落地（手册/README/docs/CHANGELOG/门禁）；registry 不启用、Windows/容器不承诺；验收 = release --verify 全绿 | 2026-11-01 |
| [2026-10-30-cultivation-case-entry.md](settled_issues/2026-10-30-cultivation-case-entry.md) | 已结；培养主任务工作/目标优先单入口第一切片（work 字段 + 单表单 + 预览）；去向 = [case-entry Note](../../notes/archived/2026-10-30-cultivation-case-entry.md)；对话式梳理/AI 起草另决 | 2026-10-30 |
| [2026-10-30-cultivation-entry-followup.md](settled_issues/2026-10-30-cultivation-entry-followup.md) | 已结；目标角色显式选择、入口文案、自纠正状态、验证历史逐条、对话失败保留草稿；去向 = [entry-followup Note](../../notes/archived/2026-10-30-cultivation-entry-followup.md)；主任务 IA 另决 | 2026-10-30 |
| [2026-10-29-cultivation-experience.md](settled_issues/2026-10-29-cultivation-experience.md) | 已结；培养主线（案例工坊 A）+ 来源/决定/验证历史落地；去向 = [implemented Note](../../notes/archived/2026-10-30-cultivation-work-improvement-traceability.md)；真人走查留 Note 后续观察 | 2026-10-30 |
| [2026-10-28-data-design-round2.md](settled_issues/2026-10-28-data-design-round2.md) | 已结；二轮削洋葱 8 项（ctx.fs / 派生显示 / K cache / 日志 / peers 修；指令面/namespace/T4-T7 边界）；0.4.1；去向 = [implemented Note](../../notes/archived/2026-10-28-data-design-round2.md) | 2026-10-28 |
| [2026-10-28-data-design-hardening.md](settled_issues/2026-10-28-data-design-hardening.md) | 已结；数据设计硬化（账本→domain、方法层→公司级、数据卡 v2）；M1–M4 落地（0.4.0）；去向 = [implemented Note](../../notes/archived/2026-10-28-data-design-hardening.md) | 2026-10-28 |
| [2026-10-27-six-dim-raise.md](settled_issues/2026-10-27-six-dim-raise.md) | 已结；六维提分 D1/D4/D5 → A-（开工最小路径 / 0.3.15 交付面 + dist-freshness / UI 金样 + 认证档）；去向 = 三篇 implemented Note | 2026-10-28 |
| [2026-10-27-repo-hygiene-round3.md](settled_issues/2026-10-27-repo-hygiene-round3.md) | 已结；第三轮六维度打扫 A/B/C/D 全批，R3-01…26 逐项处置（18 修 / 5 部分 / 3 明确不作），去向 = 六篇 implemented Note | 2026-10-27 |
| [2026-10-28-repo-hygiene-round4.md](settled_issues/2026-10-28-repo-hygiene-round4.md) | 已结；第四轮六维打扫 A–E 全批，D1–D6 = A-，去向 = 12 篇 implemented Note（A/B/C/D/E1–E6/D6 + P3 follow-up） | 2026-10-28 |
| [2026-10-27-data-model-gaps.md](settled_issues/2026-10-27-data-model-gaps.md) | 已结；G1–G12 落三份 Note，剩余多 Host 高可用为边界 | 2026-10-27 |
| [2026-10-27-data-model-review-followup.md](settled_issues/2026-10-27-data-model-review-followup.md) | 已结；F1–F10 落 [review-followup](./settled_issues/2026-10-27-data-model-review-followup.md) | 2026-10-27 |
| [2026-10-27-data-model-closeout.md](settled_issues/2026-10-27-data-model-closeout.md) | 已结；R1–R6 落 [data-model-r1-r6](../../notes/archived/2026-10-27-data-model-r1-r6.md) | 2026-10-27 |
| [2026-10-25-distribution-contract.md](settled_issues/2026-10-25-distribution-contract.md) | 已实施；去向 = [distribution-lifecycle](../../notes/archived/2026-10-25-distribution-lifecycle.md) | 2026-10-25 |
| [2026-10-25-install-lifecycle-evidence.md](settled_issues/2026-10-25-install-lifecycle-evidence.md) | 已实施；去向 = [distribution-lifecycle](../../notes/archived/2026-10-25-distribution-lifecycle.md) | 2026-10-25 |
| [2026-10-25-shipped-content-self-contained.md](settled_issues/2026-10-25-shipped-content-self-contained.md) | 已实施；去向 = [installed-shape-self-sufficient](../../notes/archived/2026-10-25-installed-shape-self-sufficient.md) | 2026-10-25 |
| [2026-10-25-deliverables-catalog-and-audit.md](settled_issues/2026-10-25-deliverables-catalog-and-audit.md) | 已实施；去向 = [installed-shape-self-sufficient](../../notes/archived/2026-10-25-installed-shape-self-sufficient.md) | 2026-10-25 |
| [2026-10-25-standalone-deployment-shape.md](settled_issues/2026-10-25-standalone-deployment-shape.md) | 已实施；去向 = [standalone-deployment](../../notes/archived/2026-10-25-standalone-deployment.md) | 2026-10-25 |
| [2026-10-25-deployment-identity-and-workspace-guard.md](settled_issues/2026-10-25-deployment-identity-and-workspace-guard.md) | 已实施；去向 = [standalone-deployment](../../notes/archived/2026-10-25-standalone-deployment.md) | 2026-10-25 |
| [2026-09-28-dag-edge-routing.md](settled_issues/2026-09-28-dag-edge-routing.md) | 已实施；决定稿已删，历史在 git | 2026-09-28 |
| [2026-09-28-float-geometry-memory.md](settled_issues/2026-09-28-float-geometry-memory.md) | 已实施；决定稿已删，历史在 git | 2026-09-28 |
| [2026-09-28-sidebar-split-budget.md](settled_issues/2026-09-28-sidebar-split-budget.md) | 不做 | 2026-09-28 |
| [2026-10-10-plain-language-closing.md](settled_issues/2026-10-10-plain-language-closing.md) | 已实施并真验收通过（说人话收口：四模板一分钟摘要 + present description 通道） | 2026-10-10 |
| [2026-10-12-ceo-minimal-assembly.md](settled_issues/2026-10-12-ceo-minimal-assembly.md) | 已实施（组队健壮性三层防御：最小在屋/菜单算术/成员打回权；RFC 与探针收据在卡） | 2026-10-12 |
| [2026-10-23-cultivation-context.md](settled_issues/2026-10-23-cultivation-context.md) | 已实施（D1=A/D2=A；RFC + 实施 Note + 真浏览器 probe） | 2026-10-23 |
| [2026-10-12-workspace-convergence.md](settled_issues/2026-10-12-workspace-convergence.md) | 已落地（收敛执行器 converge.mjs + 常态化入轮末 + 首轮 4 slug 收敛与四缺陷修复） | 2026-10-12 |
| [2026-10-10-multi-instance-guard.md](settled_issues/2026-10-10-multi-instance-guard.md) | 已实施并双实例实测通过（多实例警告横幅）；跨浏览器检测边界如需另立卡 | 2026-10-10 |
| [2026-10-10-extract-without-behavior-change.md](settled_issues/2026-10-10-extract-without-behavior-change.md) | 已实施并验收通过（探针 web 启动与 backlog 活状态收成模块，行为不变） | 2026-10-10 |
| [2026-10-10-smoke-boot-extraction.md](settled_issues/2026-10-10-smoke-boot-extraction.md) | 已实施并验收通过（10 个 smoke 启动块迁 probe-web，两处钉值未动） | 2026-10-10 |
| [2026-10-10-proactive-wake-loop.md](settled_issues/2026-10-10-proactive-wake-loop.md) | 已实施并拍板 B（保持 ask+开局预热；机制全通：schedule 主动唤醒 + HITL 正确跳出） | 2026-10-10 |
| [2026-09-29-collab-mechanism-evidence.md](settled_issues/2026-09-29-collab-mechanism-evidence.md) | 消化；证据归消费卡与 probe | 2026-10-03 |
| [2026-09-29-date-channel-mechanism.md](settled_issues/2026-09-29-date-channel-mechanism.md) | 已实施并获追认 | 2026-10-03 |
| [2026-09-29-deliverables-lifecycle-metadata.md](settled_issues/2026-09-29-deliverables-lifecycle-metadata.md) | 已实施并记录于 Note | 2026-10-03 |
| [2026-09-29-writing-collab-locks-redis.md](settled_issues/2026-09-29-writing-collab-locks-redis.md) | 已实施并记录于 Note | 2026-10-03 |
| [2026-10-02-deferred-verifications.md](settled_issues/2026-10-02-deferred-verifications.md) | 验证债已判收 | 2026-10-05 |
| [2026-10-02-feedback-channel-cultivation.md](settled_issues/2026-10-02-feedback-channel-cultivation.md) | 推敲已结；后续另立项 | 2026-10-03 |
| [2026-10-04-cross-process-shared-disk.md](settled_issues/2026-10-04-cross-process-shared-disk.md) | 用户选择协调面方案 | 2026-10-04 |
| [2026-10-04-doc-snr-cleanup-audit.md](settled_issues/2026-10-04-doc-snr-cleanup-audit.md) | 审计与当轮处置已完成 | 2026-10-04 |
| [2026-10-04-human-agent-unity-ux-bdd.md](settled_issues/2026-10-04-human-agent-unity-ux-bdd.md) | 已实施首批方案 | 2026-10-04 |
| [2026-10-04-multi-user-concurrency-bdd.md](settled_issues/2026-10-04-multi-user-concurrency-bdd.md) | 已实施首批方案 | 2026-10-04 |
| [2026-10-04-work-status-visibility.md](settled_issues/2026-10-04-work-status-visibility.md) | 用户确定可见性方向 | 2026-10-04 |
| [2026-10-05-repository-steerability.md](settled_issues/2026-10-05-repository-steerability.md) | 六条工作已分别交付；一项延后触发留 owner | 2026-10-05 |
| [2026-10-06-driver-surface-package.md](settled_issues/2026-10-06-driver-surface-package.md) | 五项全部交付；决定稿已删，历史在 git | 2026-10-06 |
| [2026-10-09-postmortem-guard-survival.md](settled_issues/2026-10-09-postmortem-guard-survival.md) | 不新增通用存活机制；按需 owner 验证，重大重构时人工对照 | 2026-10-10 |
| [2026-10-09-decision-ledger-home-migration.md](settled_issues/2026-10-09-decision-ledger-home-migration.md) | D1–D9 保留 design 路由；不迁 Note、不为此提额 | 2026-10-10 |
| [2026-10-09-stale-pointer-cleanup.md](settled_issues/2026-10-09-stale-pointer-cleanup.md) | 不单独清理祖父存量；按需修实际阻断导航的指针 | 2026-10-10 |
| [2026-10-09-collaboration-safety-acceptance.md](settled_issues/2026-10-09-collaboration-safety-acceptance.md) | 四问裁决均 A；维持现行合同＋裁2/裁4 文档化申请（待用户授权） | 2026-10-10 |
| [2026-10-11-plain-language-human-exits.md](settled_issues/2026-10-11-plain-language-human-exits.md) | 已实施并验收（人话出口规范：摘要来源治理 + 阻塞/非阻塞/表达行为证据） | 2026-10-11 |
| [2026-10-11-human-exits-expression.md](settled_issues/2026-10-11-human-exits-expression.md) | 已实施并验收（表达层：台账全文入口、compact 显示模式、open-in-app 现场链路） | 2026-10-11 |
| [2026-10-11-human-exits-replay-scene.md](settled_issues/2026-10-11-human-exits-replay-scene.md) | 已建成并零 diff 复演（阻塞拍板 replay 场景 + 场景级浏览器答题人） | 2026-10-11 |
| [2026-10-12-backlog-process-made-explicit.md](settled_issues/2026-10-12-backlog-process-made-explicit.md) | 已实施并验收（制度显性化：缺陷通道＋双轨状态生命周期＋agent 门牌＋门禁镜像互查；去向 = implemented Note） | 2026-10-12 |
| [2026-10-13-agent-cultivation.md](settled_issues/2026-10-13-agent-cultivation.md) | 已实施并验收（培养回路 C 路径首版：公司页培养入口＋记录闭环＋角色方法层跨会话生效；拍板三项与验证收据在卡；去向 = implemented Note D43） | 2026-10-13 |
| [2026-10-16-code-structure-round3.md](settled_issues/2026-10-16-code-structure-round3.md) | 已实施并验收（deliverables 拆「形状与身份 / 声明对账」两模块＋spec 一一对应＋触发线；导出普查守恒与四条红证在 Note；Item 2 留独立第二轮） | 2026-10-16 |
| [2026-10-16-all-in-ai-ceo-closeout.md](settled_issues/2026-10-16-all-in-ai-ceo-closeout.md) | 已拍板并实施 A+B（收口必须先 present 入手册；converge 拦未结审计发现）；本条真实收口仍归公司侧 | 2026-10-16 |
| [2026-10-19-issue-card-quality.md](settled_issues/2026-10-19-issue-card-quality.md) | 已结（A 内容收口执行：四卡当前态/修订史、blockedBy、README 薄索引、研究稿失效标记、成品台账拆卡、wire golden 订正）；B 以后做，C = 后续卡执行协议 | 2026-10-19 |
| [2026-10-19-company-panels-ux-priority.md](settled_issues/2026-10-19-company-panels-ux-priority.md) | 已结（用户拍：看板+依赖图 → 任务板 → 台账；成品台账已拆新卡；判据 = 证据可复用 × 影响 × 代价） | 2026-10-19 |
| [2026-10-19-board-dag-ux-deep-dive.md](settled_issues/2026-10-19-board-dag-ux-deep-dive.md) | 已结（新鲜度文案说真话 + DAG 进行中徽章独立样式 + 窄栏/长链实测；用户接受 pane 自身纵向滚动；真 21 节点整页双滚动留未执行） | 2026-10-19 |
| [2026-10-20-fresh-agent-repo-hygiene.md](settled_issues/2026-10-20-fresh-agent-repo-hygiene.md) | 已结（两轮六维度审计 + 全部发现修复：P0 反馈通路〔BUG-030/031 + replay 注入面闭环〕、P1–P4 语义/结构/测试/常驻层、notes 归档 31 篇、手册重构 187→154 行；已接受取舍登记 = Phase B–F Note；六维度评分报告随对话交付） | 2026-10-21 |
| [2026-10-19-taskboard-table-ux-deep-dive.md](settled_issues/2026-10-19-taskboard-table-ux-deep-dive.md) | 已结（依赖列 owner · subject + id 次要；行 id 并入任务列；已删死映射移除；入口探针 1440/390 PASS） | 2026-10-19 |
| [2026-10-19-ledger-ux-deep-dive.md](settled_issues/2026-10-19-ledger-ux-deep-dive.md) | 已结（40 行 = parseMotionLedger 真文件；全文入口 16/27；刷新 30s；人读 60s/5 步/复述难/总体还行 → 接受） | 2026-10-19 |
| [2026-10-24-run-bundle-clean-base.md](settled_issues/2026-10-24-run-bundle-clean-base.md) | 已实施并交付（run bundle = 安装单元：bundle.json + 整盘去 tracked + 哈希升级 + 0.3.0 分发；证据 = implemented Note） | 2026-10-24 |
| [2026-10-19-deliverables-ledger.md](settled_issues/2026-10-19-deliverables-ledger.md) | 已结（成品目录 = 生成索引 kb/deliverables-index.json + 只读第 9 页签；44 份/活跃 5/归档 39/台账外 5；present 审计仍归 deliverables-check） | 2026-10-19 |
| [2026-10-17-cultivation-gui-actions.md](settled_issues/2026-10-17-cultivation-gui-actions.md) | 已实施；培养 GUI 行动面的 UX 推敲（时刻地图 / 输入清单把手审计 / 迭代框架 / 体验协议），去向 = 同名毕业 Note | 2026-10-17 |

## 已修缺陷

| 卡 | 标题 | 日期 |
|---|---|---|
| [BUG-001-manual-truncation.md](fixed_bugs/BUG-001-manual-truncation.md) | 公司手册超出注入预算导致尾部截断 | 2026-10-02 |
| [BUG-002-dual-ceo-silent-supersession.md](fixed_bugs/BUG-002-dual-ceo-silent-supersession.md) | 双 CEO 门静默易主 | 2026-10-06 |
| [BUG-003-present-no-role-gate.md](fixed_bugs/BUG-003-present-no-role-gate.md) | present 无角色门禁 | 2026-10-06 |
| [BUG-004-claim-yield-not-machine-readable.md](fixed_bugs/BUG-004-claim-yield-not-machine-readable.md) | 占位让位不可机判 | 2026-10-06 |
| [BUG-005-dual-signoff-single-door-routing.md](fixed_bugs/BUG-005-dual-signoff-single-door-routing.md) | 双签多门退化单签 | 2026-10-06 |
| [BUG-006-ceo-meta-vocab-drift.md](fixed_bugs/BUG-006-ceo-meta-vocab-drift.md) | CEO 产出 meta 词表漂移 | 2026-10-07 |
| [BUG-007-collaboration-probe-false-positives.md](fixed_bugs/BUG-007-collaboration-probe-false-positives.md) | 协作探针接受无操作/错误状态，且等待不存在的第2轮 | 2026-10-10 |
| [BUG-008-recon-pack-archive-drift.md](fixed_bugs/BUG-008-recon-pack-archive-drift.md) | recon-pack 存量判据漂移（归档件降 legacy-archive 观察项） | 2026-10-10 |
| [BUG-009-star-topology-no-lateral-channel.md](fixed_bugs/BUG-009-star-topology-no-lateral-channel.md) | 对账回合缺失：规则 + 行为验证（V4 红 → 新场景 CEO 双向转述） | 2026-10-11 |
| [BUG-010-scheduler-single-point-hitl-freeze.md](fixed_bugs/BUG-010-scheduler-single-point-hitl-freeze.md) | 调度单点：HITL 前排空规则 + 行为验证（V4 ask 先于建任务 → 新场景先建 10 任务） | 2026-10-11 |
| [BUG-011-instruction-carries-unverified-guess.md](fixed_bugs/BUG-011-instruction-carries-unverified-guess.md) | 指令夹带未证猜测：规则 + 派活行可选「假设」段（机器可读落点 + 解析断言） | 2026-10-11 |
| [BUG-012-same-model-hats-independent-review-overclaim.md](fixed_bugs/BUG-012-same-model-hats-independent-review-overclaim.md) | 同模五帽：5 份模板加「复核独立性层级 + 边际宽度」两栏 + keyless 断言 | 2026-10-11 |
| [BUG-013-e2e-driver-token-committed.md](fixed_bugs/BUG-013-e2e-driver-token-committed.md) | 观察窗 token 随无关 e2e driver 入库：untrack + .gitignore 显式规则（token 重启轮换，无历史重写） | 2026-10-12 |
| [BUG-015-charter-backfill-evidence-date-coupling.md](fixed_bugs/BUG-015-charter-backfill-evidence-date-coupling.md) | backfill 证据路径写死运行日：按 slug 解析真实收敛目录 + fail-loud | 2026-10-12 |
| [BUG-014-charter-backfill-dedupe-false-skip.md](fixed_bugs/BUG-014-charter-backfill-dedupe-false-skip.md) | backfill 子串查重假跳过：查重改条目行锚，COO 缺失条目补登 | 2026-10-12 |
| [BUG-016-converge-self-description-drift.md](fixed_bugs/BUG-016-converge-self-description-drift.md) | converge 自述三处失真：参数唯一源归工具头注（未知旗标 fail-loud）+ 文案对齐 journal-only 与 --charter-backfill | 2026-10-12 |
| [BUG-017-record-hygiene-residue.md](fixed_bugs/BUG-017-record-hygiene-residue.md) | 记录残留：归档卡计数统一、stray 断链删、台账叙述校正、补 convergence implemented Note | 2026-10-12 |
| [BUG-018-authorship-instance-preset-false-positive.md](fixed_bugs/BUG-018-authorship-instance-preset-false-positive.md) | 署名审计把同角色多实例 preset（coo vs coo-2）判成署名不实：写入者归属补基础角色规范化，真盘 10 条假阳性清零 | 2026-10-16 |
| [BUG-020-converge-crash-untracked-journal.md](fixed_bugs/BUG-020-converge-crash-untracked-journal.md) | 收敛半态可续跑：清 journal 判 tracked（未跟踪不再致崩）＋converge --resume（只做剩余步骤） | 2026-10-16 |
| [BUG-019-final-present-evidence-lost.md](fixed_bugs/BUG-019-final-present-evidence-lost.md) | 判据加证据可得性声明（--evidence-from）：证据不可考降观察档、不声明照旧判红；首版「证据丢失」诊断经深挖推翻为真阳性 | 2026-10-16 |
| [BUG-021-ask-user-question-no-scripted-answer-path.md](fixed_bugs/BUG-021-ask-user-question-no-scripted-answer-path.md) | 问询能自行收口：五角色 preset 钉 `tool-ask-user` 的 timed 形态（legacy 无界前台窗 ⇒ RPC 只吃 continued ⇒ 驱动永久挂起丢活） | 2026-10-18 |
| [BUG-022-ask-user-unbounded-timeout-override.md](fixed_bugs/BUG-022-ask-user-unbounded-timeout-override.md) | 驱动侧停点判定：问询无配对结果时分类"有界等待/无界卡死/逾期"，看到无界就停并报（模型传 `timeout: -1` 那条路） | 2026-10-18 |
| [BUG-024-cultivation-row-loses-action-after-failure.md](fixed_bugs/BUG-024-cultivation-row-loses-action-after-failure.md) | 失败后按钮卡「处理中…」：真根因=命令面可永不回话（`finally`+20s 截止边修好）；另修**验收仪器**竞态（断言要等收口，别在 t≈0 抓快照） | 2026-10-19 |
| [BUG-025-ledger-reads-wrong-data-face.md](fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md) | 台账数据面口径错配：面板读的是 40 行动议表，调研与四卡把「993 份成品」记在台账名下 ⇒ 订正文档口径 + 补一条钉住「数据面 = `kb/motion-ledger.md`」的判据 | 2026-10-19 |
| [BUG-027-false-dependency-ready-badge.md](fixed_bugs/BUG-027-false-dependency-ready-badge.md) | 依赖徽章不看 status ⇒ 131 枚「等 …」噪声挂在已完成/进行中的卡上；**卡上原根因（`ready ?? readyOf()` 回落）经实证不可达**，真缺陷是渲染门槛 ⇒ 门槛加 pending 判据 + 回落补 pending 半句 + 两条 keyless 判据 | 2026-10-19 |
| [BUG-028-pending-material-anchor-granularity.md](fixed_bugs/BUG-028-pending-material-anchor-granularity.md) | 闸门④锚粒度与纪律不一致——总锚覆盖多任务被判行动幻觉 | 2026-10-19 |
| [BUG-029-committed-web-token-recurrence.md](fixed_bugs/BUG-029-committed-web-token-recurrence.md) | 观察窗 token 再次随 runtime 日志入库：untrack + `.gitignore` + 类级 tracked-token 窄扫（值不打印）+ 红绿守卫 | 2026-10-20 |
| [BUG-030-diagnose-approval-outcome.md](fixed_bugs/BUG-030-diagnose-approval-outcome.md) | diagnose 审批判读字段错位（读想象键读不到 outcome）：按真 v4 形状判读 + asked/decided 按 id 配对 + 夹具取真日志样 | 2026-10-20 |
| [BUG-033-revoke-recovery-body-edit-loss.md](fixed_bugs/BUG-033-revoke-recovery-body-edit-loss.md) | revoke 恢复把“已撤销 + 用户后改正文”回滚成旧全文：journal 目标态 + 第三态 conflict | 2026-10-27 |
| [BUG-032-r3-rerecord-not-replayable.md](fixed_bugs/BUG-032-r3-rerecord-not-replayable.md) | r3 重录不可重放（委派通知到达竞态）：`--record` 自检 + ≤3 次重录；失败保留现场 | 2026-10-23 |
| [BUG-031-orient-scenario-children-file-shape.md](fixed_bugs/BUG-031-orient-scenario-children-file-shape.md) | orient --scenario 对 children 文件形状 ENOTDIR 崩：statSync 分流（文件计 1 / 目录数 .jsonl） | 2026-10-20 |

| [BUG-034-no-absolute-time-source-for-signed-records.md](fixed_bugs/BUG-034-no-absolute-time-source-for-signed-records.md) | 记录可举证必须有时间源：SA/SQA skill 必查 + 审计 Q8/Q10 + E2E v8 验收 | 2026-11-07 |
| [BUG-035-short-circuit-withstand-undefined.md](fixed_bugs/BUG-035-short-circuit-withstand-undefined.md) | 通流/承力路径必须有故障电流耐受：SA/SQA skill 必查 + 审计 Q9/Q11 + E2E v8 验收 | 2026-11-07 |
| [BUG-036-workflow-schema-enum-type.md](fixed_bugs/BUG-036-workflow-schema-enum-type.md) | workflow schema 子集：enum/const 需单值 type、无 type 数组；skill 四条 + 合同钉子 `tests/contract/json-schema-subset.spec.ts` | 2026-11-08 |
| [BUG-039-workflow-result-truncation-lossy-spill.md](fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md) | >50k 结果先截断再落盘：preset 抬 maxResultChars 到 200k，spill 全文可读；探针 71,677 字符 + 渲染钉子 | 2026-11-08 |
| [BUG-037-root-team-tool-shadowing.md](fixed_bugs/BUG-037-root-team-tool-shadowing.md) | 根门被团队版控制名 shadow：新增 `list_subagents` / `send_to_subagent`（官方服务、不被 shadow）+ 合同/技能同步 | 2026-11-08 |
| [BUG-038-workflow-branch-nested-delegation-result.md](fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md) | 分支内再委派返回值混回执：分支当叶子规则 + 真跑自纠观察 + 机制钉子（回执拼接） | 2026-11-08 |
| [BUG-041-host-restart-orphans-inflight-child.md](fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) | 重启后 in-flight child 成孤儿：`list_subagents` 带 durable `lastTurnEnd`（interrupted）+ ops 部署前置 | 2026-11-08 |
| [BUG-040-workflow-schema-text-answer-discarded.md](fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md) | schema 分支丢文本：产品规避（分支禁 schema、单行 JSON + 父 parse）+ smoke 第 7 条；引擎诊断仍缺 | 2026-11-08 |
| [BUG-043-list-subagents-includes-teammates.md](fixed_bugs/BUG-043-list-subagents-includes-teammates.md) | teammate 混入 subagent 列表：行加 role/address（队名/session id）+ description/skill 两套寻址；keyless 14 条 | 2026-11-08 |
| [BUG-044-background-job-lost-on-restart.md](fixed_bugs/BUG-044-background-job-lost-on-restart.md) | 后台 job 不跨重启：新增 `workflow_runs` durable 视图（lost+running+children）；keyless 6 条 + 真实 C7b 日志离线验证 | 2026-11-08 |
| [BUG-042-list-subagents-lastturnend-missing.md](fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md) | `lastTurnEnd` 恒缺：换 sessionPersistence 读 + open-turn 推断 interrupted（inferred-open-turn）；keyless 20 条 + C2f 真实验证 | 2026-11-08 |
| [BUG-045-subagent-retry-depth-budget-bypass.md](fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md) | retry 绕过行级深度：注册面/深度单源（`SUBAGENT_RETRY_SURFACE` = 通用 `subagent` 行）+ 越界 `depth-exceeded` 不起 child；keyless 红→绿 | 2026-11-09 |
| [BUG-049-model-contract-retry-drift.md](fixed_bugs/BUG-049-model-contract-retry-drift.md) | 模型声明漂移：合同 `delivered`/`merged` + `carrierPath`；`retrySurface()` 派生注册面/深度；parity spec 钉运行时/YAML/模型三边 | 2026-11-09 |
| [BUG-047-worker-family-handbook-scope.md](fixed_bugs/BUG-047-worker-family-handbook-scope.md) | handbook 边界按 worker family 派生（三个 profile 都不注入）；默认取 family，配置只作覆盖；keyless 按 preset 断言 | 2026-11-09 |
| [BUG-046-parent-cannot-verify-child-preset-depth.md](fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md) | `list_subagents` 从 child durable header 暴露 `agentPreset`/`delegationDepth`（十进制字符串），读不到显式 `unavailable`；keyless 红→绿 | 2026-11-09 |
| [BUG-048-ui-golden-brand-name-drift.md](fixed_bugs/BUG-048-ui-golden-brand-name-drift.md) | 金样随 D14 显示名收窄刷新（`--refresh-golden` 后 `--golden` 绿）；tests/README 的 `src/lib` 读模型行补“显示名 → 同 diff 金样”映射；不升门禁 | 2026-11-09 |
| [BUG-050-retry-depth-fix-fails-in-real-assembly.md](fixed_bugs/BUG-050-retry-depth-fix-fails-in-real-assembly.md) | 复核为**环境陈旧误报**：dev profile 旧安装副本，`plugin add link:` 当前源码后 CMO depth 2 正常 `depth-exceeded`；教训 = 真入口探针前确认 profile = 当前源码/构建 | 2026-11-09 |
| [BUG-051-worker-orchestrator-leaf-cap-contract.md](fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md) | fan-out 改成父代理 brief 预算（模型 `fanOut: parent-brief`，preset 去掉“1–2”硬数字）+ spec 钉文案；4-task 真装配仍 4 leaf（观察） | 2026-11-10 |
| [BUG-052-worker-leaf-control-surface.md](fixed_bugs/BUG-052-worker-leaf-control-surface.md) | control 工具 per-agent 安装，worker family 不装；真装配 alpha 工具目录 21 个、无 control；sibling 注入仍被运行时拒 | 2026-11-10 |
| [BUG-053-cancel-does-not-abort-subagent-retry.md](fixed_bugs/BUG-053-cancel-does-not-abort-subagent-retry.md) | `abortable` race + `ctx.subagents.interrupt(child)`；cancel 后 35ms root/child `aborted`、无 sleep 残留；keyless + 真装配 | 2026-11-10 |
| [BUG-054-dev-rehearsal-kb-policy-lines-missing.md](fixed_bugs/BUG-054-dev-rehearsal-kb-policy-lines-missing.md) | 旁路 kb 清单改由 seed.json 派生（mirror 10 件 vs seed 14 件）；parity spec 钉同清单/同字节/only-fill；`policy-lines` / `review-protocol` 归位 | 2026-11-10 |
| [BUG-055-team-role-packet-missing-taskbook.md](fixed_bugs/BUG-055-team-role-packet-missing-taskbook.md) | 角色包补 `任务书` + `署名行`，CEO 先落 `drafts/ceo.md` 再 spawn；署名行只抄真实路径；真模型 probe ALL PASS（294s） | 2026-11-10 |
| [BUG-056-quality-loop-verdict-hash-trailing-newline.md](fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md) | 裁决头 hash 改由 pack 内 `verdict-hash.mjs` 回填（`--fix`/`--check`）；skill/guide 排除 `tail \| shasum`；`未复验` 成为 audit `post-verdict-unverified` warning | 2026-11-10 |
| [BUG-060-readonly-command-session-workspace.md](fixed_bugs/BUG-060-readonly-command-session-workspace.md) | 只读命令用会话 cwd：`/req`/`/prd` 不再被启动态 dataBlocked 永久挡住；写命令仍走停写守卫 | 2026-11-10 |
| [BUG-059-quality-loop-audit-r2-session-index.md](fixed_bugs/BUG-059-quality-loop-audit-r2-session-index.md) | 质量环 audit 原文索引按 session 隔离（R2 新 verifier session 不再误报 `not-verbatim`）；合成红→绿 + 真盘 R2 audit ALL PASS | 2026-11-10 |
| [BUG-058-command-datablocked-reason.md](fixed_bugs/BUG-058-command-datablocked-reason.md) | `dataBlocked` 回执点名真实原因（workspace/lease/bundle/落点）+ 重启提示；四命令共用 `blockedCompanyText`；不改变停写守卫 | 2026-11-10 |
| [BUG-057-command-slug-path-traversal.md](fixed_bugs/BUG-057-command-slug-path-traversal.md) | `/req`/`/prd` 的 slug 越界读：共享 host-only `resolveDeliverablePath`（单段正则 + `relative` 纵深）；两 spec 红→绿 + 真入口复跑 | 2026-11-10 |
| [BUG-026-owner-missing-from-team-projection.md](fixed_bugs/BUG-026-owner-missing-from-team-projection.md) | 误报证伪（wire 视图 ownerName 齐全，卡读的是 projcache state 行）→ 防复发判据 = `tests/lib/presence/board.spec.ts` 真 wire 形状断言；2026-11-09 由 `settled_issues` 改归本表 | 2026-10-19 |
| [BUG-023-cultivation-float-actions-dead.md](fixed_bugs/BUG-023-cultivation-float-actions-dead.md) | 误报证伪（浮窗正常；真凶 = 探针跨轮复用 id 撞遗留方法目录）→ 修复落探针卫生，S4b 恢复硬判 PASS；2026-11-09 由 `settled_issues` 改归本表 | 2026-10-18 |

| [BUG-061-product-type-allowed-values-drift.md](fixed_bugs/BUG-061-product-type-allowed-values-drift.md) | 产品类型允许值单一来源：类型目录 = 唯一枚举 + `product-type-sources` 门禁；`project-services` 标未来类型 | 2026-11-11 |
| [BUG-062-default-product-type-contradicts-business.md](fixed_bugs/BUG-062-default-product-type-contradicts-business.md) | 默认 `productType` 改 `business-software`（与公司主业一致）；`/req check` 回落回执点名来源 | 2026-11-11 |
| [BUG-063-bootstrap-process-docs-always-hardware.md](fixed_bugs/BUG-063-bootstrap-process-docs-always-hardware.md) | seed `{productType}` 占位：process-docs 按类型播种，缺/未知 fail-closed；E4 差分 true→false | 2026-11-11 |

| [BUG-064-methods-not-product-type-aware.md](fixed_bugs/BUG-064-methods-not-product-type-aware.md) | 方法契约：类型适用性 + 需要事实 + 缺则 fail-closed；`method-contract` 门禁；business-software 不套项目制 | 2026-11-11 |
| [BUG-065-cfo-rate-card-missing.md](fixed_bugs/BUG-065-cfo-rate-card-missing.md) | 新增 `kb/rates.md` 事实载体（`<待填>` = 配置缺口）；CFO 方法改读，不再声称 org/CHARTER 有费率 | 2026-11-11 |
| [BUG-066-coo-person-level-staffing-without-roster.md](fixed_bugs/BUG-066-coo-person-level-staffing-without-roster.md) | 新增 `kb/roster.md` 席位名册；COO 三态（可承接 / 配置缺口 / 真没人），不编人名 | 2026-11-11 |

| [BUG-067-process-docs-dead-pointers.md](fixed_bugs/BUG-067-process-docs-dead-pointers.md) | 4 处 process-docs 死指针改类型包 + `pack-content-paths` 门禁 | 2026-11-11 |
| [BUG-068-base-clean-deployment-case-language.md](fixed_bugs/BUG-068-base-clean-deployment-case-language.md) | 服务类附赠搬 policy-lines + `base-clean` charter 个案语言 denylist | 2026-11-11 |
| [BUG-069-tier-policy-gate-coverage.md](fixed_bugs/BUG-069-tier-policy-gate-coverage.md) | `加载：` 头与 manifest 对账 + policy 数字从 policy-lines 派生（9 个） | 2026-11-11 |
| [BUG-070-delegation-maxdepth-example-wrong.md](fixed_bugs/BUG-070-delegation-maxdepth-example-wrong.md) | `maxDepth` 绝对语义真值 + vendor `resolveChildDepth` keyless spec | 2026-11-11 |
| [BUG-071-capability-header-not-installed-wording.md](fixed_bugs/BUG-071-capability-header-not-installed-wording.md) | header 改「本座位不可用」口径：安装 ≠ 可用；工具在也可被拒 | 2026-11-11 |
| [BUG-072-support-root-can-spawn-team.md](fixed_bugs/BUG-072-support-root-can-spawn-team.md) | support preset 不作 team 座位：不列 team + per-agent `spawn_teammate` guard | 2026-11-11 |
| [BUG-073-readme-one-shot-child-team-tools-stale.md](fixed_bugs/BUG-073-readme-one-shot-child-team-tools-stale.md) | README 已知限制删 0.2.0 旧观察，改现行 child 组合/Lead-only 事实 | 2026-11-11 |
| [BUG-074-per-agent-inject-not-reinstalled-on-service-change.md](fixed_bugs/BUG-074-per-agent-inject-not-reinstalled-on-service-change.md) | **误报**：WeakSet 不挡 re-provide；`ctx.set` 不是 re-provide；保留 guard + 真 Cordis spec | 2026-11-11 |
| [BUG-075-eng-teaming-schema-rule-duplicated.md](fixed_bugs/BUG-075-eng-teaming-schema-rule-duplicated.md) | `eng-teaming` 表内 schema 引擎句删除，引擎事实只住 workflow 合同 | 2026-11-11 |
| [BUG-076-support-root-still-has-team-tools-policy.md](fixed_bugs/BUG-076-support-root-still-has-team-tools-policy.md) | support root 九件套 team 工具全拒 + `company:delegation-seat` 纠正 vendor policy | 2026-11-11 |
| [BUG-077-teammate-header-omits-team-collaboration.md](fixed_bugs/BUG-077-teammate-header-omits-team-collaboration.md) | team 拆 `team collaboration` / `team spawn (Lead only)`；teammate 列协作、注入 member section | 2026-11-11 |
| [BUG-078-teammate-dead-subagent-control-tools.md](fixed_bugs/BUG-078-teammate-dead-subagent-control-tools.md) | control 按座位/child 能力装：CEO teammate 无，vp-eng teammate 保留 | 2026-11-11 |
| [BUG-079-ceo-teammate-spawn-header-no-child-channel.md](fixed_bugs/BUG-079-ceo-teammate-spawn-header-no-child-channel.md) | spawn/fork/retry 按 `childDepth > depth` 门控；CEO teammate 无 spawn，vp-eng teammate 保留；control 消费同一座位 | 2026-11-11 |
| [BUG-147](fixed_bugs/BUG-147-export-governance-symlink-root-writes-outside.md) | --- | 2026-11-13 |
| [BUG-148](fixed_bugs/BUG-148-bundle-manifest-root-symlink-writes-outside.md) | --- | 2026-11-13 |
| [BUG-149](fixed_bugs/BUG-149-cultivation-root-symlink-writes-outside.md) | --- | 2026-11-13 |
| [BUG-114](fixed_bugs/BUG-114-governance-export-corrupt-ledger-drops-old-snapshot.md) | --- | 2026-11-13 |
| [BUG-115](fixed_bugs/BUG-115-lease-takeover-no-fencing-old-writer.md) | --- | 2026-11-13 |
| [BUG-116](fixed_bugs/BUG-116-release-inventory-misses-wiki-template-shared-skill.md) | --- | 2026-11-13 |
| [BUG-117](fixed_bugs/BUG-117-cultivation-adopt-as-missing-slug.md) | --- | 2026-11-13 |
| [BUG-118](fixed_bugs/BUG-118-member-events-dropped-without-team-projection.md) | --- | 2026-11-13 |
| [BUG-119](fixed_bugs/BUG-119-lease-blocked-host-writes-startup-options.md) | --- | 2026-11-13 |
| [BUG-120](fixed_bugs/BUG-120-startup-settings-dangerous-session-cwd.md) | --- | 2026-11-13 |
| [BUG-121](fixed_bugs/BUG-121-company-settings-blocked-host-writes.md) | --- | 2026-11-13 |
| [BUG-122](fixed_bugs/BUG-122-catalog-root-file-symlink-enotdir.md) | --- | 2026-11-13 |
| [BUG-123](fixed_bugs/BUG-123-startup-json-corrupt-silent-auto.md) | --- | 2026-11-13 |
| [BUG-124](fixed_bugs/BUG-124-lease-lock-directory-path-blocks.md) | --- | 2026-11-13 |
| [BUG-125](fixed_bugs/BUG-125-audit-symlink-canonicalizes-to-target.md) | --- | 2026-11-13 |
| [BUG-126](fixed_bugs/BUG-126-workflow-concurrent-same-name-pairing-swap.md) | --- | 2026-11-13 |
| [BUG-127](fixed_bugs/BUG-127-cultivation-records-file-throws.md) | --- | 2026-11-13 |
| [BUG-128](fixed_bugs/BUG-128-bootstrap-replace-follows-symlink-write-outside.md) | --- | 2026-11-13 |
| [BUG-129](fixed_bugs/BUG-129-dsh-company-symlink-root-writes-outside.md) | --- | 2026-11-13 |
| [BUG-130](fixed_bugs/BUG-130-cultivation-write-root-throws.md) | --- | 2026-11-13 |
| [BUG-131](fixed_bugs/BUG-131-kb-symlink-catalog-writes-outside.md) | --- | 2026-11-13 |
| [BUG-132](fixed_bugs/BUG-132-catalog-index-path-directory-eisdir.md) | --- | 2026-11-13 |
| [BUG-133](fixed_bugs/BUG-133-startup-json-directory-eisdir.md) | --- | 2026-11-13 |
| [BUG-134](fixed_bugs/BUG-134-dsh-company-symlink-command-read-outside.md) | --- | 2026-11-13 |
| [BUG-135](fixed_bugs/BUG-135-catalog-index-symlink-read-outside.md) | --- | 2026-11-13 |
| [BUG-136](fixed_bugs/BUG-136-startup-settings-symlink-read-outside.md) | --- | 2026-11-13 |
| [BUG-137](fixed_bugs/BUG-137-presented-ledger-symlink-read-outside.md) | --- | 2026-11-13 |
| [BUG-138](fixed_bugs/BUG-138-presented-ledger-directory-eisdir.md) | --- | 2026-11-13 |
| [BUG-139](fixed_bugs/BUG-139-cultivation-verify-after-revoke.md) | --- | 2026-11-13 |
| [BUG-141](fixed_bugs/BUG-141-cultivation-adopt-reject-verify-throws.md) | --- | 2026-11-13 |
| [BUG-142](fixed_bugs/BUG-142-bootstrap-replace-directory-eisdir.md) | --- | 2026-11-13 |
| [BUG-143](fixed_bugs/BUG-143-bootstrap-directory-entry-eexist.md) | --- | 2026-11-13 |
| [BUG-144](fixed_bugs/BUG-144-write-gate-bypassed-by-direct-company-writes.md) | --- | 2026-11-13 |
| [BUG-145](fixed_bugs/BUG-145-team-with-event-tasks-partial-view-crash.md) | --- | 2026-11-13 |
| [BUG-146](fixed_bugs/BUG-146-use-company-data-agent-team-projection-oom.md) | --- | 2026-11-13 |
| [BUG-104](fixed_bugs/BUG-104-team-task-merge-no-revision-null-view.md) | 任务板 merge 按 revision/null 基座；取消认领清 owner | 2026-11-13 |
| [BUG-105](fixed_bugs/BUG-105-stream-error-not-rendered-in-board-dag-tasks.md) | board/dag/tasks 统一渲染 streamError（投影可能过期） | 2026-11-13 |
| [BUG-106](fixed_bugs/BUG-106-lease-pid-reuse-blocks-writer.md) | lease heartbeat mtime；PID 复用旧锁可接管并 warning | 2026-11-13 |
| [BUG-107](fixed_bugs/BUG-107-deliverables-audit-multi-space-path.md) | audit 路径保留原始空白（连续空格不折叠） | 2026-11-13 |
| [BUG-108](fixed_bugs/BUG-108-catalog-symlink-final-outside.md) | catalog final/meta 拒绝 symlink/越界（safe-file） | 2026-11-13 |
| [BUG-109](fixed_bugs/BUG-109-catalog-warnings-dropped-in-audit-present.md) | catalog warnings 进 audit 回执 + present/回扫日志 | 2026-11-13 |
| [BUG-110](fixed_bugs/BUG-110-governance-export-rm-before-rename.md) | exports 整目录 staging + backup；失败回滚不丢旧版 | 2026-11-13 |
| [BUG-111](fixed_bugs/BUG-111-saved-workspace-non-atomic-write.md) | saved workspace temp+rename；坏 JSON 标 corrupt | 2026-11-13 |
| [BUG-112](fixed_bugs/BUG-112-team-task-unassign-keeps-old-owner.md) | 取消认领（无 ownerId）清空 ownerName | 2026-11-13 |
| [BUG-113](fixed_bugs/BUG-113-command-doc-symlink-outside-workspace.md) | /prd /req /delivery 文档读面拒绝 symlink/越界 | 2026-11-13 |
| [BUG-090](fixed_bugs/BUG-090-cultivation-revoke-unreachable-records-deletes-method.md) | revoke 先判 records 可达；0 记录需 --orphan，不再误删跨 workspace 方法 | 2026-11-13 |
| [BUG-091](fixed_bugs/BUG-091-cultivation-check-revoked-broken-unsafe.md) | check 排除 revokedAt、计坏记录、非法 methodSlug 报「记录坏」 | 2026-11-13 |
| [BUG-092](fixed_bugs/BUG-092-cultivation-propose-empty-fields.md) | propose 空字段拒绝 + recordText/parseRecord 往返，坏记录不落盘 | 2026-11-13 |
| [BUG-093](fixed_bugs/BUG-093-cultivation-legacy-migration-invalid-slug.md) | legacy 非法 slug 隔离 .legacy-invalid；listMethods 只列合法 | 2026-11-13 |
| [BUG-094](fixed_bugs/BUG-094-bundle-manifest-id-path-traversal.md) | bundle id 单段校验 + 身份目录前缀检查，v2 非法 id 换新 | 2026-11-13 |
| [BUG-095](fixed_bugs/BUG-095-workspace-resolution-accepts-tmp-root.md) | dangerousRoots 从平台事实派生，tmp 根不再当 workspace | 2026-11-13 |
| [BUG-096](fixed_bugs/BUG-096-deliverables-catalog-directory-eisdir.md) | catalog 只读普通文件 + warnings；boot 初始化 catch | 2026-11-13 |
| [BUG-097](fixed_bugs/BUG-097-workflow-runs-mispair-failed-call.md) | workflow 配对改用「产生 run 的证据」，失败 call 不抢下一次 | 2026-11-13 |
| [BUG-098](fixed_bugs/BUG-098-presence-pending-transition-shows-deleted.md) | presence 任务状态显式分派；pending=退回待办，未知=状态未知 | 2026-11-13 |
| [BUG-099](fixed_bugs/BUG-099-deliverables-audit-nonexistent-final.md) | audit 目标必须存在且是普通文件，不预置未来 slug | 2026-11-13 |
| [BUG-100](fixed_bugs/BUG-100-export-dist-deletes-old-before-pack.md) | export-dist staging→全成功再替换，失败保留旧 _dist | 2026-11-13 |
| [BUG-101](fixed_bugs/BUG-101-concurrent-home-smoke-stale-v2-and-lease-timing.md) | smoke 改读 v3 workspace bundle；lease 结论轮询等待 | 2026-11-13 |
| [BUG-102](fixed_bugs/BUG-102-req-delivery-rule-path-traversal.md) | deliveryMode/productType 成员校验 + residency，不读 workspace 自造规则 | 2026-11-13 |
| [BUG-103](fixed_bugs/BUG-103-tasks-tab-empty-despite-team-task-events.md) | 任务板/看板/依赖图用 team/task 事件补投影旧快照 | 2026-11-13 |
| [BUG-080](fixed_bugs/BUG-080-en-tab-title-map-missing-strategy.md) | en 页签标题从同一份字典派生：10/10 含 Strategy；缺 en key 探针 fail-loud | 2026-11-12 |
| [BUG-081](fixed_bugs/BUG-081-strategy-panel-reads-session-workspace-command-writes-host.md) | 启动策略 workspace = 会话 cwd 优先（面板/命令/注入同一份） | 2026-11-12 |
| [BUG-082](fixed_bugs/BUG-082-strategy-panel-stale-wiki-check.md) | wikiCheck 带 checkedAt + watcher 新鲜度；面板不拿快照冒充当前值 | 2026-11-12 |
| [BUG-083](fixed_bugs/BUG-083-company-settings-host-command-strings-mixed-language.md) | /company-settings 描述/用法/错误/回执双语单一源；语言切换重注册 | 2026-11-12 |
| [BUG-084](fixed_bugs/BUG-084-wiki-pointer-lexical-path-permission.md) | wiki 指针按真实路径判可写/只读；index.md 必须是文件；~ 展开 | 2026-11-12 |
| [BUG-085](fixed_bugs/BUG-085-startup-options-read-limit-fixed-fixture.md) | 选项读上限从预算派生；截断 fail-loud + 真实 content 预算 spec | 2026-11-12 |
| [BUG-086](fixed_bugs/BUG-086-strategy-button-tooltip-no-values.md) | 策略按钮 tooltip 逐字段列生效值（截断可补全） | 2026-11-12 |
| [BUG-087](fixed_bugs/BUG-087-wiki-template-copy-path-repo-only.md) | 模板拷贝命令改安装视图；面板给当前部署绝对路径 | 2026-11-12 |
| [BUG-088](fixed_bugs/BUG-088-shipped-links-excludes-wiki-template.md) | 模板按自身根验链（不再整目录排除）；坏链接 verify 红 | 2026-11-12 |
| [BUG-089](fixed_bugs/BUG-089-boot-without-workspace-settings-not-injected.md) | boot 无 workspace 也按 agent 会话 cwd 注册 startup section | 2026-11-12 |

### 已修区里的撤回卡（`status: 已结`）

住 `fixed_bugs/` 但不声称 `已修`——原主张被反证/不成立，没有系统面改动（判据 = [fixed_bugs 门牌](fixed_bugs/AGENTS.md)）。

| 卡 | 结论 | 日期 |
|---|---|---|
| [BUG-140（撤回）](fixed_bugs/BUG-140-tasks-tab-still-empty-with-selected-team-task-session.md) | 测试选址：真页面默认落在新空会话；显式选中任务会话后任务板 (2)，原文保留测试方法证据 | 2026-11-13 |
| [BUG-150（撤回）](fixed_bugs/BUG-150-company-root-safety-spec-wrong-api-root.md) | spec 误用：复核时 spec 已传 workspace，company-root-safety 55 passed；无产品改动 | 2026-11-13 |
| [BUG-288（撤回）](fixed_bugs/BUG-288-attention-panel-list-missing.md) | 反证：`ask` 策略下后开的页面能看到挂起审批；lane 红是环境 `never`（残留跨会话缺口 = BUG-292） | 2026-11-20 |

## 暂停卡

目前无问题卡或缺陷卡停放于对应归档目录。

## 退役历史池

| 文件 | 原用途 | 日期 |
|---|---|---|
| [suspended.md](legacy/suspended.md) | 退役的旧搁置池 | 2026-09-28 |
| [polish.md](legacy/polish.md) | 退役的旧磨清单 | 2026-09-28 |
