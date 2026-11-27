---
status: 已结
opened: 2026-11-27
---

# 推敲：梦之队 UX/UI Round 3 · 修复回归核验、隐藏深层缝隙、可访问性与真实交互闭环全扫计划

> 立卡：2026-11-27 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — Phase 0–3 白盒 DOM + 真 Chromium + 真模型三路交叉实证 + 独立只读子代理盲审（只报不修，0 产品代码改动）
>
> **结论/去向**：none — 已完成 Round 3 组 P/Q/S/T 全量 28 单元走查与三路实证，排除 4 项/部分误报后实证立案 `BUG-399..BUG-405`（[活跃 Bug 清单](../../bugs/README.md)），未改任何产品源码或 `vendor/dsh/`。

**问题与期望结果：** 继 [Round 1 全表面走查卡](./2026-11-27-ux-ui-full-verification-and-e2e.md)（`BUG-384..391`）与 [Round 2 盲区走查卡](./2026-11-27-ux-ui-round2-deep-audit-and-e2e.md)（`BUG-392..398`）先后修复合入后（基线起自 `528c60c1` / 结项时 `HEAD = 71dd1a46`），面向 `b99d1ca5..HEAD` 改动面、残余客户端/Host 模块及上游 `vendor/dsh` 集成缝隙做只读深扫，聚焦四大维度盲区：
1. **`BUG-392..398` 修复回归与遗漏同胞面（组 P）**；
2. **历史未深挖的客户端细节组件、异步竞态与生命周期（组 Q）**；
3. **DSH 上游集成 Seam、可访问性（A11y）与遮挡（组 S）**；
4. **Host 命令双语、真模型控制链与 R1/R2 显式未闭环项（组 T）**。

---

## 范围与排除项

- **包含范围**：
  - `packages/company-pack/src/client/` 全部最新改动（`BUG-392..398`）及 Round 1/2 尚未深入的边缘文件；
  - `packages/company-pack/src/host/` 对 UI 暴露文风/错误提示路径（`/cultivation`、`cultivation-context-read`、`company-root`、`write-gate`、`runtime-guard`）；
  - `vendor/dsh/packages/client/` 契约对接缝隙（只读对照）；
  - Round 1/2 遗留的真 Settings UI 切语/主题、全流程培养操作、`bash` 越权、`ask_user_question` 多题与 `6+2` 陈旧探针收口排查。
- **明确排除**：
  - **严禁改动 `vendor/dsh/`**（只读铁律）；
  - **严禁本轮修改任何 `packages/company-pack/src/` 产品源码、测试阈值或既有 `tests/BUG-COVERAGE.generated.md`**——只查报，实证后立 `BUG-399..405`。

---

## Round 3 实测结果台账（组 P / Q / S / T · 28 单元）

### 组 P · `BUG-392..398` 修复回归与同胞遗漏面（5 单元）

| ID | 范围 | 实测结论 | 关键证据与归宿 |
|---|---|---|---|
| **P1** | `final.md` → 发起复盘培养提交链 | **FAIL** | `targeted-r3.spec.tsx` 与 Chromium（`r3-01-p1-final-md-cultivate-rejected.png`）实证：携带绝对路径提交被 `'成品 ref 必须是安全的工作区相对路径'` 拒收 → [BUG-399](../fixed_bugs/BUG-399-final-md-cultivate-absolute-ref-rejected-and-open-surface-bypasses.md)。 |
| **P2** | Light 模式白底白字 Token 碰撞 | **FAIL** | Chromium 切浅色主题实测 `--dsw-alias-bg-layer-2` 与 `--dsw-alias-bg-base` 同为 `#ffffff`（`r3-02-light-mode-contrast.png`）→ [BUG-402](../../bugs/BUG-402-light-mode-layer2-invisible-highlight-and-390-textarea-overflow.md)。 |
| **P3** | 未迁移 `openTab` 入口、S4 TurnTail 与假 Toast | **FAIL** | `targeted-r3.spec.tsx` 复现 HQ 内 `register-s4-ux` / `StrategyButton` / `openDeliverables` 绕过 `openOnSessionSurface` 与假成功 Toast → [BUG-399](../fixed_bugs/BUG-399-final-md-cultivate-absolute-ref-rejected-and-open-surface-bypasses.md)。 |
| **P4** | 环境角标刷新谎报、HQ 内嵌 `ComposerStatusPill` 与 `HeroMotionOptions` | **FAIL（部分 PASS）** | Chromium 实测 HQ 内嵌保留 `ComposerStatusPill`（`pillInHq=1`），刷新后角标显 `待办 0`/`梦之队就绪` 而 `AttentionTab` 有挂起 `'红线测试待办'` → [BUG-400](../../bugs/BUG-400-embedded-workshop-status-pill-leak-and-cultivation-race-gaps.md)、[BUG-404](../../bugs/BUG-404-stale-zero-badges-after-reload-and-mine-revoked-tag.md)；空白非公司会话 `plainId` 下 `HeroMotionOptions` `count=0`（PASS）。 |
| **P5** | `BUG-392..397` 其余细节基线复核 | **PASS** | Phase 0 全量基线规格（303 文件 / 2868 用例含 `signoff`/`strategy`/`dag`/`context-picker`）与 `targeted-r3.spec.tsx` 通过。 |

### 组 Q · 未深挖客户端组件、流与异常恢复竞态（9 单元）

| ID | 范围 | 实测结论 | 关键证据与归宿 |
|---|---|---|---|
| **Q1** | `CultivationBoardSections` 并发、取消、读前空白与 Mine 归因 | **FAIL** | `targeted-r3.spec.tsx` 复现并发取消未禁用与 `records === null` 读前空白；Phase 2 `r3-07-cultivation-full-gui.png` 检出撤回后 `Mine` 仍显绿色已采纳标签 → [BUG-400](../../bugs/BUG-400-embedded-workshop-status-pill-leak-and-cultivation-race-gaps.md)、[BUG-404](../../bugs/BUG-404-stale-zero-badges-after-reload-and-mine-revoked-tag.md)。 |
| **Q2** | `CultivationCompose` 慢回执越位、`ContextPicker` 永驻加载、`visibilitychange` 风暴 | **FAIL** | `targeted-r3.spec.tsx` 复现切会话后误触发 `onSubmitted`、`listDeliverables` reject 后永驻加载、后台切换 RPC 读放大 → [BUG-400](../../bugs/BUG-400-embedded-workshop-status-pill-leak-and-cultivation-race-gaps.md)。 |
| **Q3** | `BudgetPanel`、`TasksPanel`、`DagPanel`、`LedgerTab` 异常数据边界 | **FAIL** | `targeted-r3.spec.tsx` 复现 `BudgetPanel` `NaN` 渲染与 `TasksPanel` 缺省数组崩溃 → [BUG-401](../../bugs/BUG-401-panel-nan-null-crashes-signoff-error-tag-and-question-id-mismatch.md)。 |
| **Q4** | `error-ring` 与 `instance-guard` 故障链边界 | **FAIL（部分排伪）** | `targeted-r3.spec.tsx` 复现 `error-ring` 乱序释放清空与 `flush` 丢包 → [BUG-401](../../bugs/BUG-401-panel-nan-null-crashes-signoff-error-tag-and-question-id-mismatch.md)；`localStorage` 写入 `'123'` 时 `instance-guard` 未抛错（排伪 PASS）。 |
| **Q5** | `attention.ts` 与 `presence.ts` `callId/id` 错位及中英混语 | **FAIL** | `targeted-r3.spec.tsx` 复现仅有 `id`（无 `callId`）的已答问询滞留待办 → [BUG-401](../../bugs/BUG-401-panel-nan-null-crashes-signoff-error-tag-and-question-id-mismatch.md)；`presence.ts` 仅见静态读码回退标签，未单独单列为运行时故障。 |
| **Q6** | `SignoffToolView` 异常终态仍显「等待签字」与卡片溢出 | **FAIL** | `targeted-r3.spec.tsx` 复现 `state='error'` / `'stopped'` 且无 JSON decision 时仍显等待签字 → [BUG-401](../../bugs/BUG-401-panel-nan-null-crashes-signoff-error-tag-and-question-id-mismatch.md)。 |
| **Q7** | 浮窗 `unfloatTab` 空置与冗余「浮出」按钮 | **FAIL** | Chromium 实测浮出窗内保留无响应的「浮出」按钮（`count=1`）→ [BUG-403](../../bugs/BUG-403-floating-pane-dead-close-draft-loss-dangling-aria-and-zindex.md)。 |
| **Q8** | 冷启首屏报错跨 Reload → 会话落盘与脱敏 | **PASS** | Phase 3 `phase3-live-r3.mjs` 实测错误写入 `runtime/harness-home/logs/company-client-errors.log` 且含 `?token=<redacted>`。 |
| **Q9** | 新增/拆分模块组合与边界回归 | **PASS** | `targeted-r3.spec.tsx`（14 用例）与 Phase 0 303 个 spec 文件通过。 |

### 组 S · DSH 上游 Seam、可访问性（A11y）与布局层叠（7 单元）

| ID | 范围 | 实测结论 | 关键证据与归宿 |
|---|---|---|---|
| **S1** | ARIA `aria-controls` 与 `:focus-visible` 可见性 | **FAIL** | Chromium 实测 4/4 `SegmentedControl` 产生悬空 `aria-controls`；`styles.ts` 局部将 `:focus-visible` 设为 `outline: none` → [BUG-403](../../bugs/BUG-403-floating-pane-dead-close-draft-loss-dangling-aria-and-zindex.md)。 |
| **S2** | `z-index` 弹窗叠压拦截 | **FAIL** | Chromium 实测打开弹窗时 `#dsh-instance-guard-banner`（`zIndex: 9999`）截获指针点击（`topHitId: dsh-instance-guard-banner`，`r3-04-zindex-modal-banner.png`）→ [BUG-403](../../bugs/BUG-403-floating-pane-dead-close-draft-loss-dangling-aria-and-zindex.md)。 |
| **S3** | `390×844` 窄窗控件/卡片溢横 | **FAIL（部分排伪）** | `.wk-cultivation-body-input` 因 `content-box` 溢出 `+18px`（`r3-05-390-overflow.png`）→ [BUG-402](../../bugs/BUG-402-light-mode-layer2-invisible-highlight-and-390-textarea-overflow.md)；`.wk-delegation` 长 URL 卡片实测正常换行（`sw=254, cw=254`，`r3-08-390-long-toolcards.png`，排伪 PASS）。 |
| **S4** | Tab 切换销毁培养表单草稿 | **FAIL** | Chromium 实测 `档案 -> 培养` 填表后切往它页再切回表单销毁（`formGone=true`）→ [BUG-403](../../bugs/BUG-403-floating-pane-dead-close-draft-loss-dangling-aria-and-zindex.md)。 |
| **S5** | `CompanyGuideHub` 缺失 `replaceTab: true` | **FAIL** | `phase2b-extra.mjs` 实测点击 Guide 后标签由 `["档案"]` 增至 `["档案","开始","作战板"]` → [BUG-403](../../bugs/BUG-403-floating-pane-dead-close-draft-loss-dangling-aria-and-zindex.md)。 |
| **S6** | 浮窗窄视口关闭死点 | **FAIL** | Chromium 实测 `<768px` 浮窗点关闭按钮后浮窗仍可见（`stillVisibleAfterClick=true`，`r3-06-floating-narrow-dead-close.png`）→ [BUG-403](../../bugs/BUG-403-floating-pane-dead-close-draft-loss-dangling-aria-and-zindex.md)。 |
| **S7** | 纯键盘端到端通测边界记录 | **PARTIAL（未另作全程自动化）** | 经 `S1`/`P5` 证实 `aria-controls` 悬空与 `outline: none` 阻断纯键盘可达性；全界面无鼠标串联巡检未单独成脚本。 |

### 组 T · 双语切语、Host 错误面与 R1/R2 未闭环真模型长尾（7 单元）

| ID | 范围 | 实测结论 | 关键证据与归宿 |
|---|---|---|---|
| **T1** | 真 Settings 弹窗热切 `zh ↔ en` 与亮/暗主题 | **FAIL（2 项排伪）** | `phase2c-settings.mjs` 实点击设置弹窗切 `English` 后，`StrategyButton`（`"Strategy: auto"`）与 `CommandScopeHint` **即时更新**（排伪 PASS，`r3-10-settings-real-en-lag.png`）；但 `/cultivation` 斜杠弹窗仍滞留中文描述（`slashCultHasChinese: true`）→ [BUG-405](../../bugs/BUG-405-host-cultivation-command-and-errors-unlocalized-and-live-en-lag.md)。 |
| **T2** | Host `/cultivation` 及路径/写闸硬编码中文报错 | **FAIL** | `host-commands-en.spec.ts` 实证 `en` 环境下 `/cultivation`、上下文读取及写闸/根路径校验返回中文报错 → [BUG-405](../../bugs/BUG-405-host-cultivation-command-and-errors-unlocalized-and-live-en-lag.md)。 |
| **T3** | 真模型 `bash` 越权审批原生 `ApprovalPanel` 透传 | **PASS** | `phase3b-bash-escalate.mjs` 实测 `sandbox_permissions: "require_escalated"` 触发上游 `ApprovalPanel`（`signoffCnt=0 allowVis=true`，`p3r3-01-bash-approval-panel.png`）。 |
| **T4** | 真模型多题 + 自由文本 `ask_user_question` | **PASS** | `phase3-live-r3.mjs` 实测两题向导与自由文本输入框（`ask=true radios=2`，`p3r3-02-multi-question-card.png`）。 |
| **T5** | `/cultivation` 附带引用 → 创建 → 采纳 → 验证 → 撤回 GUI 闭环 | **PASS（连带检出 BUG-404）** | Chromium 全链路 `verified=true revoked=true`（`r3-07-cultivation-full-gui.png`），同时发现撤回后 `Mine` 绿标残余并立 [BUG-404](../../bugs/BUG-404-stale-zero-badges-after-reload-and-mine-revoked-tag.md)。 |
| **T6** | 动态拉起真子代理 + `AttentionTab` 校验 | **PASS（子代理流）** | `phase3-live-r3.mjs` 实测动态子代理 `.wk-delegation` 渲染（`delCards=1`，`p3r3-03-dynamic-subagent-card.png`）；6 边界在 Phase 0 既有回归覆盖。 |
| **T7** | `6+2` 陈旧探针/车道差异对照表（见下） | **probe-stale（清单已收口）** | 汇总以下 8 处滞后于当前 Hub 结构与交互契约的精确差异供下轮适配器刷新。 |

---

## T7 · `6+2` 陈旧探针与 E2E 车道精确差异对照表

| 类型 | 脚本 | 陈旧假设 | 当前实际契约（需下轮适配） |
|---|---|---|---|
| Probe 1 | `probes/browser-visual/presence-panel-probe.mjs` | 第 64 行调用 `openCompanyTab(page, '在场', ...)` | 「在场」已并入 `团队` Hub 分段标签。 |
| Probe 2 | `probes/browser-visual/deliverables-catalog-probe.mjs` | 第 65 行调用 `openCompanyTab(page, '成品', ...)` | 「成品」已并入 `档案` Hub 分段标签。 |
| Probe 3 | `probes/browser-visual/cultivation-ux-walkthrough-probe.mjs` | 假设独立培养主标签入口 | 已迁移至 `档案 -> 培养` 与 HQ `培养工坊`。 |
| Probe 4 | `probes/browser-visual/cultivation-ux-scenarios-probe.mjs` | 同上，独立培养标签导航前提 | 同上（需经 `档案 -> 培养` 进入）。 |
| Probe 5 | `probes/browser-visual/sidebar-role-mark-probe.mjs` | Round 1 起列入 S1–S4 历史排外探针（待刷新结构锚点） | 需随 S1–S4 后侧栏 Hub 与角色标记重构重新校验。 |
| Probe 6 | `probes/browser-visual/dag-midflight-probe.mjs` | Round 1 起列入 S1–S4 历史排外探针（待刷新结构锚点） | 需随 `团队 -> DAG` / Hub 重构重新对齐选择器。 |
| Lane 1 | `checks/lanes/attention-e2e.entry.mjs` | 第 159 行直寻 `button` `/^待办/`；第 177 行期待原生 `/Allow once|允许一次/` 按钮 | 待办已迁至 `团队` Hub；`request_signoff` 已改渲染 `SignoffComposerCard`（`批准` / `拒绝`）。 |
| Lane 2 | `checks/lanes/human-loop-e2e.entry.mjs` | 第 160 行直开 `/?token=...` 后紧接第 161 行操作，未先关闭 Preview/Testing 提示弹框 | 打开首页需先等待并点 `Continue` 放行预览提示窗（与 `round3-chromium-audit.mjs` 一致）。 |

*(注：另有 `attention-panel-probe.mjs`、`budget-panel-probe.mjs`、`ledger-summary-probe.mjs` 同存旧独立标签名称，可随探针清理批次一并对齐。)*
