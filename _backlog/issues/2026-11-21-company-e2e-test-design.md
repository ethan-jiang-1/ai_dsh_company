---
status: 推敲中
opened: 2026-11-21
---

# 推敲：从 exploratory 转向公司页端到端（E2E）——设计、首批场景与 2026-11-21 实跑结果

> 立卡：2026-11-21 ｜ 状态：推敲中 ｜ 类型：Design ｜ 毕业：未定 ｜ 可关闭：否 ｜ 审查：待
>
> **结论/去向**：none — 本轮只产设计、原型证据与 4 张 BUG 卡（293–296）；未改产品代码、未落 lane。
>
> **授权边界**：用户 2026-11-21 指令 = 「改向端到端来测试……设计设计端到端……发现问题直接报 bug，别急着修」。本卡是设计/交接，不是实施授权；落探针/车道需用户再点名。

## 问题

最近一批改动集中在 client 用户可见面（待办跨会话聚合、命令作用域提示、培养页作用域/三态、成品索引根）。它们有一个共同点：**单元/静态渲染 spec 大部分是绿的，真实页面却可能红**——`CommandScopeHint` 的 4/4 单测绿而真页面每次加载都崩（BUG-293）就是现场。exploratory test 靠人/agent 随手点，覆盖到哪算哪；而这批改动的失败模式恰恰是「页签能开、面板有字，但某条注入面/空态/摘要说假话」，不点进那个状态就看不见。

另外，现有真页面车道只查 `lib/client.js` **存在**，不查它是否由当前源码构建；源码改了没重建时，车道会对着旧字节报绿（BUG-296）。所以「有真页面车道」不等于「真页面判据有效」。

## 目标

1. 用一条**可复跑、可证据化**的 E2E 路径覆盖最近改动的用户可见面，而不是再跑一遍已有单测。
2. 每个场景都有**独立 oracle**（DOM 文本/角色/结构、计算布局、console/pageerror、网络、RPC/会话日志、截图），且先能见红再信绿。
3. 区分两档成本：keyless 夹具档（秒级/分钟级，可常在 client 面改动后跑）与真模型档（分钟级/$1–2，只在触线/审批/真会话行为改动时跑）。
4. 发现缺陷只开卡，不在同一轮修；E2E 报告要能回答「最近的修改质量怎么样」。

**非目标**：替代 keyless 单测；替代 preset-smoke / release-smoke；证明「真人不会困惑」；把真模型 E2E 塞进 `pnpm test` 秒级环；改 vendor 或产品代码。

## 设计

### 1. 分层与位置

- **档 1：keyless 夹具 E2E（默认）**——隔离 company profile + 真 workspace + 真 Chromium；用 RPC 造会话、用盘上夹具造记录/成品/审批历史。~40–90s。
- **档 2：真模型 E2E（触线时）**——同一 harness，`DSH_PERMISSION_MODE=workspace-write`（审批策略 `ask`），真模型触发 `request_signoff`；~3–5 min、$1–2。
- **位置**：show 面 = 待落的 company-e2e 探针（放 `probes/browser-visual/`，给人看/收证据，允许红）；judge 面 = 待落的 company-e2e 车道（放 `checks/lanes/`，只在稳定后、且先解决 BUG-296 的新鲜度）。**本轮未落**，因为场景还依赖 4 张未修卡；先落 lane 会让 `smoke:all` 常红。
- **永不**进 `tests/`（真浏览器/真模型；`repo/layering.spec.ts` 已禁）。

### 2. Harness 形状

隔离 home + 临时 workspace，产品同形安装（不生造旁路）：

1. `dsh --profile company --from-default-profile web --dump-default-config` + `dsh plugin --profile company add <pack 目录>`（link；与 `ui-scene --isolated` 同形）。
2. 预置 `storages/workspace.json`（defaultWorkspaceId 指向临时 workspace），避免读 OS 默认盘。
3. 夹具：`.dsh-company/cultivation/records/*.md`、`kb/<role>/journal/*.md`、`kb/deliverables-index.json`、`deliverables/<date>-<slug>/final.md`、`kb/motion-ledger.md`。
4. 真 Chromium（`tools/drivers/playwright.mjs`）；每场景截图 + 导出 `body.innerText`；捕获 `console.error` / `pageerror` / `requestfailed` / 4xx。
5. RPC（`tools/lib/probe/probe-web.mjs` 的 `companyCookie` / `companyRpc`）造会话、改名、发 prompt、`session/page` 对账；真模型只用于审批触线。
6. 证据落 `runtime/tmp/e2e-evidence/<ts>/`（gitignored）或 `snapshots/probes/company-e2e/<date>/`（收据时）；不把 token 写进证据。

### 3. 场景矩阵（首批，按最近改动）

| # | 场景 | 最近改动 | 断言（独立 oracle） | 2026-11-21 实跑 |
|---|---|---|---|---|
| S1 | 隔离冷启动 / 首启模态 / 品牌 / composer | — | 无 `Failed to load plugins`；品牌在场；console 零 error | 绿（除 BUG-293 的槽错） |
| S2 | 10 个公司页签逐个开、面板非空 | 卡片/台账/成品/策略 | 注册源页签全开；面板体可见非空；文本金样 | 绿（10/10） |
| S3 | 空白会话 composer 提示 | BUG-290 / BUG-293 | 空白会话 `.wk-command-scope-hint` 出现；会话有轮次后消失 | **红 → BUG-293** |
| S4 | 培养页作用域 / 空 / 不可达 | BUG-291 | 标题点名 workspace；空态点名 workspace；不可达点名路径+原因 | 绿（三态） |
| S5 | 培养页坏记录 / 采纳 | 培养动作面 | 坏记录列「读不动」而非 0 条；采纳后记录进已采纳方法、盘上 status=adopted | 绿（坏记录/采纳）；**同屏空态假话 → BUG-294** |
| S6 | 成品索引 62 条 / 重读 / 缺失 | BUG-286 | 62 条渲染；重读拿到新文件；缺失显示「索引不可读」 | 绿 |
| S7 | 跨会话挂起审批（页面先开） | BUG-292 / BUG-288 | 另一会话的 `approval/asked` 在 15s 内出现；同一条只 1 行；去处理跳到审批卡；批后清 | 绿（live 出现 / 去处理 / 批后清） |
| S8 | 跨会话挂起审批（刷新后） | BUG-292 | 刷新后历史重建仍显示；空态说真话 | 绿 |
| S9 | 英文档 / 窄 390 | 双语 / 响应式 | en 页签文本无中文残留；窄视口无横向溢出、面板可读 | 绿 |
| S10 | 构建新鲜度 | BUG-296 | 源码新于产物时车道必须红/先重建 | **红 → BUG-296** |

**未进首批**：看板/DAG/任务板/在场需要真团队数据（模型或更复杂的夹具）；策略保存/reload；多审批并发（dual-gate）；审批历史 >800 条/20 会话 cap 的边界；跨 workspace 候选过滤。这些是后续增量，先不写成「已覆盖」。

### 4. 场景判据纪律

- **先能见红**：每个场景至少有一次「撤掉机制 → 红」的记录；否则不把绿当证据。
- **文本 + 结构 + 副作用三面**：不只 `innerText`；必要时看 `data-company-tab-title`、`role=list/listitem`、按钮可访问名、计算布局（`getBoundingClientRect`、`scrollWidth`）、盘上文件与 RPC 日志。
- **状态必须能区分**：加载中 / 不可达 / 空 / 有数据但无待办 —— 四态各自可判（BUG-291/294 的教训）。
- **摘要 vs 详情**：列表行只放可扫摘要；全文留在详情/展开面（BUG-295）。
- **产物新鲜度**：真页面车道必须先过构建指纹（BUG-296），否则「绿」是旧字节的绿。

## 本轮实跑结果（2026-11-21 23:08–00:00）

- 隔离实例：官方 web 模板建 company profile + pack link；临时 workspace + 夹具；Playwright Chromium 1440×960 / 390×844。
- S1/S2/S4/S6/S7/S8/S9 绿；S3、S5（空态）、S10 红。
- 4 张卡：[BUG-293](../_archive/fixed_bugs/BUG-293-command-scope-hint-slot-crash.md)（P1，注入面 `list: undefined`，单测绿/真页面崩）、[BUG-294](../_archive/fixed_bugs/BUG-294-cultivation-no-pending-lies-about-empty-workspace.md)（P2，无待办被说成工作区无记录）、[BUG-295](../_archive/fixed_bugs/BUG-295-attention-item-unbounded-approval-reason.md)（P2，整段审批理由进列表摘要）、[BUG-296](../_archive/fixed_bugs/BUG-296-real-page-lanes-stale-client-bundle.md)（P1，真页面车道旧构建假绿）。
- 原型证据（gitignored）：`runtime/tmp/e2e/company-e2e.mjs`、`runtime/tmp/e2e-evidence/2026-11-21T15-*`、官方车道证据 `runtime/harness-home/diagnosis/cdp-probe-2026-11-21T15-31-00-953Z/`。
- 结论：这批改动**不是「exploratory 抓不到」，而是 exploratory 没走到那几个状态**；E2E 在约 10 个场景里抓到 4 个，其中 2 个是「单测绿、真页面红」的系统性假绿。跨会话审批、培养三态、成品索引、i18n/窄栏是稳的。

## 2026-11-22 第二轮（pipeline：293–296 在修，这边继续找）

用户指令：并行修复进程处理 293–296，这边不碰修法，继续找 3–5 个。第二轮在隔离实例上补了策略读坏、读上限（台账/长记录/大索引）、同摘要双审批、时间口径五组场景，新立 4 张：

- [BUG-297](../_archive/fixed_bugs/BUG-297-strategy-read-failure-silently-auto.md)：策略文件坏/读不到时静默回退 auto（有 `parseStartupSettingsState` 诊断但没接）。
- [BUG-298](../_archive/fixed_bugs/BUG-298-fixed-read-limits-silent-truncation.md)：固定行数读上限静默截断——300 行台账显示 236、2050 行记录显示 1989、2087 行合法索引报「形状不符」。
- [BUG-299](../_archive/fixed_bugs/BUG-299-attention-dedupe-by-summary-drops-distinct-approvals.md)：待办按 160 字摘要去重，两条不同审批塌成一条；活体 `detail` 在 merge 时丢失。
- [BUG-300](../_archive/fixed_bugs/BUG-300-cultivation-decided-at-raw-iso.md)：培养采纳/拒绝时间裸 ISO，与提出时间的「1 小时前」不一致。

第二轮跑绿：策略正常设值/刷新/重置；选项文件坏/空有显式错误态；培养拒绝空理由校验、采纳、撤回、跨角色建议路由、journal 不可达；台账正常；成品目录/打开 final/unicode+空格路径；浮窗 1440 与 390；命令提示两态。仍红：297/298/299/300。

## 2026-11-22 第三轮（goal：找 5–6 个）

并行进程收掉 297–300 后，本轮在隔离实例上补了策略交互、英文动作面、台账坏行、跨会话历史窗口/全失败、培养列表上限、成品归档/筛选、培养创作/验证、团队任务板/依赖图/在场/用量。新立 6 张：

- [BUG-301](../_archive/fixed_bugs/BUG-301-strategy-wiki-input-stale-after-reset.md)：wiki 输入非受控，重置后旧值仍在且失焦会回写。
- [BUG-302](../_archive/fixed_bugs/BUG-302-english-ui-chinese-time-and-reason.md)：en 界面混入 `刚刚/7 小时前` 与 `列目录被拒（…）`。
- [BUG-303](../_archive/fixed_bugs/BUG-303-ledger-malformed-rows-silent-drop.md)：台账坏行静默丢，4 行只显示 2 行。
- [BUG-304](../_archive/fixed_bugs/BUG-304-attention-history-window-misses-old-approvals.md)：跨会话历史只读最近 800 条，老审批漏。
- [BUG-305](../_archive/fixed_bugs/BUG-305-attention-history-all-read-fail-silent-empty.md)：历史全失败仍显示「没有等你的事」。
- [BUG-306](../_archive/fixed_bugs/BUG-306-cultivation-mine-list-cap-dead.md)：`LIST_CAPS.mine=5` 死配置，10 条全铺开无折叠。

第三轮跑绿：策略正常设值/刷新/重置；培养创作（空校验 + 跨角色建议落盘）、采纳/拒绝/撤回/验证（通过）、建议路由、journal 不可达；成品归档筛选/打开、unicode+空格路径；台账正常/截断提示；团队任务板/看板/依赖图/在场/用量（3 任务 + 依赖链）；待办身份去重（修后两条同摘要不再塌）；en 页签主体。仍红：301–306。目标 5–6 个，本轮 6 个。

## 2026-11-22 第四轮（goal：8–10 个）

并行进程收掉 301–306 后，本轮把主视图/对话面板/表单形状/解析边界/折叠计数补了一遍，新立 9 张（307–315）：

- [BUG-307](../_archive/fixed_bugs/BUG-307-cultivation-mine-cap-control-combined.md)：两个子列表各折 5 条、控件按合并总数——4+4 全显示仍挂「显示全部」。
- [BUG-308](../_archive/fixed_bugs/BUG-308-cultivation-chat-panel-i18n-leaks.md)：培养对话面板 en 中文提示、zh 英文 `session:`。
- [BUG-309](../_archive/fixed_bugs/BUG-309-cultivation-self-record-listed-twice.md)：self rejected 在「我提交的」列两次。
- [BUG-310](../_archive/fixed_bugs/BUG-310-deliverables-index-silent-entry-drop.md)：成品索引坏 entry 静默丢。
- [BUG-311](../_archive/fixed_bugs/BUG-311-ledger-header-mismatch-silent-empty.md)：台账表头 typo → 共 0 场无提示。
- [BUG-312](../_archive/fixed_bugs/BUG-312-attention-question-duplicate-key.md)：同文 question 撞 React key。
- [BUG-313](../_archive/fixed_bugs/BUG-313-startup-options-bad-shape-silent-empty.md)：options 字段类型坏冒充「没有可选项」。
- [BUG-314](../_archive/fixed_bugs/BUG-314-startup-settings-bad-shape-silent-auto.md)：settings 字段类型坏冒充 auto。
- [BUG-315](../_archive/fixed_bugs/BUG-315-cultivation-full-view-min-widths-ignored.md)：768 主视图左板/右栏压到 210/176，声明下限未生效。

第四轮跑绿：策略正常、培养创作/采纳/拒绝/撤回/验证、成品归档/筛选/打开/unicode 路径、台账正常/截断/坏行（303 修后）、团队任务板/看板/依赖图/在场/用量、待办身份去重、en 主体。仍红：307–315。目标 8–10，本轮 9。

## 2026-11-22 第五轮（goal：8–10 个）

并行进程收掉 307–315 后，本轮从「en 真提交」和「长会话/多会话/长前置」两组边界切入，新立 9 张（316–324）：

- [BUG-316](../bugs/BUG-316-cultivation-host-command-texts-not-localized.md)：培养命令 host 回执/错误 en 仍中文（真页面「Record it」实测）。
- [BUG-317](../_archive/fixed_bugs/BUG-317-attention-current-session-1000-cap-silent.md)：当前会话只留 1000 事件，旧审批静默丢。
- [BUG-318](../_archive/fixed_bugs/BUG-318-attention-history-candidate-cap-silent.md)：跨会话候选只扫 20 个，无边界提示。
- [BUG-319](../bugs/BUG-319-attention-questions-not-rebuilt-after-reload.md)：问询刷新后从待办消失。
- [BUG-320](../_archive/fixed_bugs/BUG-320-attention-approval-cap-five-silent.md)：6 条挂起审批只显 5 条。
- [BUG-321](../_archive/fixed_bugs/BUG-321-cultivation-record-head-60-lines-false-broken.md)：60 行头窗口把合法长前置记录判坏。
- [BUG-322](../_archive/fixed_bugs/BUG-322-cultivation-journal-head-240-title-fallback.md)：240 字窗口吞 journal 标题。
- [BUG-323](../_archive/fixed_bugs/BUG-323-attention-history-cross-workspace-leak.md)：cwd 未解析时注意力候选 fail-open 到所有工作区。
- [BUG-324](../_archive/fixed_bugs/BUG-324-deliverables-catalog-field-shape-silent.md)：catalog 字段形状坏被静默归一化。

第五轮跑绿：培养主视图/对话面板（含中英切换）、策略 wiki 路径（内/外/缺失）、团队任务分配+在场、en 主体。新红：316–324。目标 8–10，本轮 9。

## 输掉的方案

- **只靠 exploratory 继续人肉点**：本轮 4 个缺陷里 2 个是「单测绿 + 页签能开」的假绿，人肉不点进那个状态就漏；且不可复跑。
- **全页截图 diff 当 E2E**：只能证明像素，不证明状态语义；对文案/空态/摘要无判据，且易受数据/字体/动画漂移。
- **把真模型 E2E 当门禁**：R3 教训——模型不配合就永远绿不了，成本与墙钟不可控；只能触线时跑。
- **在 dev home 上跑**：会话/审批/成品会污染真盘，且同一 workspace 的 seed 不可重复；必须隔离 home + 临时 workspace。
- **把真浏览器塞进 `tests/` 秒级环**：layering 守卫已禁；且会让 `pnpm test` 变慢、变 flaky。
- **只加 `getByText` 冒烟**：本轮 S3 的页签全开、S5 的「已采纳」都在，单看文本会漏掉矛盾；必须同屏对账 + 副作用。

## 未决问题

1. **落 show 还是 judge**：先落 company-e2e 探针（放 `probes/browser-visual/`，允许红、给人看），还是等 4 卡修完直接落 lane？建议先 probe，稳定后再挑 2–3 个关键场景进 `pnpm smoke:all`。
2. **审批夹具**：真模型触线（$1–2、依赖模型配合）vs 写 plaintext session log（`compression: none` + 追加 `approval/asked`）造历史。后者更便宜但需要吃透 v4 日志形状；本轮用真模型，未证明夹具方案。
3. **构建新鲜度（BUG-296）先修**：不解决它，任何真页面 lane 的绿都不足信；建议先加构造指纹，再谈 lane 落地。
4. **数据夹具维护**：培养记录/成品索引/台账的 schema 会漂；夹具要与 `tests/fixtures` 的 provenance 纪律对齐，而不是散落在探针里。
5. **预算与触发面**：keyless 档 ~40–90s 适合 client 面改动后/pre-push 面；真模型档只在触线/审批/会话行为改动时；需要写进头注，不进每周全量。

## 下一步

1. 用户裁决 4 张卡是否修、以什么次序（建议：293/296 先修，294/295 文案/摘要随后；293 不修则 BUG-290 的缓解等于没落）。
2. 若同意落 E2E：先加构建新鲜度门（BUG-296 的修法），再把本轮原型收成 company-e2e 探针（放 `probes/browser-visual/`，S1–S10，keyless + `--model` 档），最后按稳定性挑 judge 子集。
3. 本轮不改产品代码；卡上的修复方案与已修判定是建议，不是实施授权。
