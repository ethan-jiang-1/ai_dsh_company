状态：implemented（2026-11-24）；批准：用户 2026-11-24 指令「修 _backlog/bugs 最新发现的问题」并建批次 goal 推进｜上游 = [BUG-351](../../_backlog/_archive/fixed_bugs/BUG-351-method-skill-text-unescaped-yaml-description.md)、[BUG-352](../../_backlog/_archive/fixed_bugs/BUG-352-session-diagnose-reads-flat-team-member-shape.md)、[BUG-353](../../_backlog/_archive/fixed_bugs/BUG-353-converge-and-journal-audit-broken-on-v3-dot-dsh-company.md)、[BUG-354](../../_backlog/_archive/fixed_bugs/BUG-354-presence-activity-unassigned-owner-leaks-chinese-in-en.md)、[BUG-355](../../_backlog/_archive/fixed_bugs/BUG-355-cultivation-data-stale-feedback-abort-problem-and-load-race.md)、[BUG-356](../../_backlog/_archive/fixed_bugs/BUG-356-motion-ledger-escaped-pipe-row-dropped.md)、[BUG-357](../../_backlog/_archive/fixed_bugs/BUG-357-presented-slug-carryover-broken-by-custom-meta-slug.md)、[BUG-358](../../_backlog/_archive/fixed_bugs/BUG-358-board-unassigned-label-chinese-in-en-and-missing-role-label.md)、[BUG-359](../../_backlog/_archive/fixed_bugs/BUG-359-attention-same-millisecond-stream-items-collapse.md)

# BUG-351..359 批次收口：身份单一派生与 v3 双根

## 决定

1. **v3 工作区双根单一解析（[BUG-353](../../_backlog/_archive/fixed_bugs/BUG-353-converge-and-journal-audit-broken-on-v3-dot-dsh-company.md)）**：
   `tools/lib/company/workspace-roots.mjs` 的 `resolveCompanyRoots(workspace, hasBundle)` 给出 `{workspaceRoot, companyRoot, bundleRel}`——
   文件操作走 `companyRoot`，会话/仓库相对路径走 `workspaceRoot`。`converge.mjs` 的 archive-move 用 **company 相对路径**，
   `journal-audit` 的 `presence()` / `formatViolations()` 用 companyRoot 下的 `kb/`；历史扁平快照仍兼容（无 bundle 时两根相同）。
2. **用户文本入 YAML 必须编码 + 落盘自检（[BUG-351](../../_backlog/_archive/fixed_bugs/BUG-351-method-skill-text-unescaped-yaml-description.md)）**：
   `methodSkillText` 用 `JSON.stringify` 产出合法 YAML 双引号标量；新增 `methodSkillProblem` 在 adopt 写盘前自检
   frontmatter（name/description 可逐字还原），不自洽则拒绝 adopted，杜绝「面板已采纳、DSH 静默丢弃」。
3. **`lib` 不产展示文案（[BUG-354](../../_backlog/_archive/fixed_bugs/BUG-354-presence-activity-unassigned-owner-leaks-chinese-in-en.md) / [BUG-358](../../_backlog/_archive/fixed_bugs/BUG-358-board-unassigned-label-chinese-in-en-and-missing-role-label.md)）**：
   无负责人任务动态改走 `presence.activity.taskClaimedUnassigned` / `taskCompletedUnassigned` 专用 token；
   `BoardCard.ownerLabel` 改 `string | null`，由 `t('tasks.unassigned')` 渲染；`BoardTab` 补 `roleLabel`；`UNASSIGNED_LABEL` 从 lib 退役。
4. **同一实体身份单一派生（[BUG-356](../../_backlog/_archive/fixed_bugs/BUG-356-motion-ledger-escaped-pipe-row-dropped.md) / [BUG-357](../../_backlog/_archive/fixed_bugs/BUG-357-presented-slug-carryover-broken-by-custom-meta-slug.md) / [BUG-359](../../_backlog/_archive/fixed_bugs/BUG-359-attention-same-millisecond-stream-items-collapse.md)）**：
   - 表格方言统一 `splitTableRow`（lib TS + tools JS 两侧），`\|` 留在单元格；
   - presented 写入与 catalog 读侧同用 `deliverableSlug(fields, dir)`；`presentedOf` 对旧账本按路径回推目录名 slug 再比一次；
   - 注意力条目带 `eventKey = event.seq`，`attentionItemKey` 优先它，`mergeAttention` 只在 live↔history 之间去重；React key 加 index 后缀。
5. **效应恢复点守卫 + 代次（[BUG-355](../../_backlog/_archive/fixed_bugs/BUG-355-cultivation-data-stale-feedback-abort-problem-and-load-race.md)）**：
   切会话先 `setFeedback(null)`；`useCultivationPanelData` 的每次 `load()` 分配单调 `seq`，`stale() = aborted || seq !== loadSeq` 在每个 await 恢复点与 state 提交前检查。
6. **诊断按上游真实 schema（[BUG-352](../../_backlog/_archive/fixed_bugs/BUG-352-session-diagnose-reads-flat-team-member-shape.md)）**：
   `team/member` v2 从 `data.member.{name,phase,error}` 取；扁平形状仅作退化兼容，测试夹具换真实 vendor 形状。


## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| v3 工作区双根 | [`resolveCompanyRoots`](../../tools/lib/company/workspace-roots.mjs) | `converge.mjs` / `journal-audit.mjs` 消费；`tests/tools/workspace-roots.spec.ts` 钉形状 |
| 方法 SKILL.md 的 YAML 编码与自检 | [`methodSkillText`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts) + [`methodSkillProblem`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts) | host `commandAdopt` 写盘前消费 |
| 表格方言 | [`splitTableRow`](../../packages/company-pack/src/lib/docs/markdown-shape-core.js) | `ledger.ts` / `deliverables-catalog.ts`(TS/JS) / tools 两处 |
| 成品身份 slug | [`deliverableSlug`](../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts) | presented 写入与 catalog 读取同用；`presentedOf` 兼容旧账本 |
| 注意力事件身份 | [`attentionItemKey`](../../packages/company-pack/src/lib/presence/attention.ts) | `streamAttention` 写 `eventKey`；`mergeAttention` 只跨源去重 |

## 输掉的方案

- **给 `presentedOf` 做一次账本迁移/补写两个 slug 键**：需要写盘与版本升级，且旧账本仍可能漏；读侧路径回推是零迁移、可逆的兼容层。
- **`converge.mjs` 内各自探测 `.dsh-company`**：两份探测会再次漂移；抽 `resolveCompanyRoots` 纯函数并加 spec。
- **`methodSkillProblem` 直接调用 vendor YAML 解析器**：会新增 pack 对 vendor skill 包的 peer 依赖；改为校验编码产物（JSON 双引号标量 + 逐字还原），与 DSH 解析器语义一致。
- **注意力条目改用 `what` 内容做 key**：BUG-312 已证伪（同文两条撞 key）；改用事件 `seq` 才是真身份。
- **`useCultivationPanelData` 每次 load 新建 AbortController**：会把同一 effect 的 timer/focus 触发变成互相中止；代次守卫更小且保留既有 abort 语义。

## 验证（真跑过）

- `pnpm test` 全量通过（本批收口后将在推送前复跑）；逐卡红→绿证据见各卡 `## 修复证据`。
- `node checks/audit/company-static-audit.mjs --strict`：0 违规（host CJK 棘轮按新增成对句小幅上调，见审计表注释）。
- `pnpm verify` ALL PASS。

## 未覆盖轴

- [covered] v3 双根：`tests/tools/workspace-roots.spec.ts` + 临时 v3 盘的 converge/journal-audit e2e（卡内证据） → 去向：[workspace-roots.spec.ts](../../tests/tools/workspace-roots.spec.ts)
- [covered] 台账转义竖线：`tests/lib/accounting/ledger.spec.ts` 与 `tests/tools/deliverables-catalog-tools.spec.ts`（TS/JS 同方言） → 去向：[ledger.spec.ts](../../tests/lib/accounting/ledger.spec.ts)
- [covered] presented 自定义 slug 归档延续与旧账本回退：`tests/host/ledger/catalog.spec.ts` → 去向：[catalog.spec.ts](../../tests/host/ledger/catalog.spec.ts)
- [covered] 注意力同毫秒身份与跨源去重：`tests/client/wiring/attention.spec.ts` → 去向：[attention.spec.ts](../../tests/client/wiring/attention.spec.ts)
- [covered] 培养数据并发：`tests/client/cultivation/cultivation-data-races.spec.ts` → 去向：[cultivation-data-races.spec.ts](../../tests/client/cultivation/cultivation-data-races.spec.ts)
- [covered] 诊断 v2 形状：`tests/session/session-diagnose.spec.ts` → 去向：[session-diagnose.spec.ts](../../tests/session/session-diagnose.spec.ts)
- [policy] `journal-audit` 的归档证据只认 snapshots 场景；生产里 `.dsh-company/deliverables-archive/**/journal` 的在场判定仍靠 live journal 或快照 → 去向：[journal-audit.mjs](../../checks/audit/journal-audit.mjs)
- [policy] `session-diagnose` 的 `user-questions/request` 分支仍按运行时 waterfall 形状读，落盘日志里通常是 `tool/call(ask_user_question)`；本批只修 `team/member` → 去向：[BUG-352](../../_backlog/_archive/fixed_bugs/BUG-352-session-diagnose-reads-flat-team-member-shape.md)
