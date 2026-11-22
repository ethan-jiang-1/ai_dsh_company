状态：implemented（2026-11-22）｜上游 = [BUG-307](../../_backlog/_archive/fixed_bugs/BUG-307-cultivation-mine-cap-control-combined.md)、[BUG-308](../../_backlog/_archive/fixed_bugs/BUG-308-cultivation-chat-panel-i18n-leaks.md)、[BUG-309](../../_backlog/_archive/fixed_bugs/BUG-309-cultivation-self-record-listed-twice.md)、[BUG-310](../../_backlog/_archive/fixed_bugs/BUG-310-deliverables-index-silent-entry-drop.md)、[BUG-311](../../_backlog/_archive/fixed_bugs/BUG-311-ledger-header-mismatch-silent-empty.md)、[BUG-312](../../_backlog/_archive/fixed_bugs/BUG-312-attention-question-duplicate-key.md)、[BUG-313](../../_backlog/_archive/fixed_bugs/BUG-313-startup-options-bad-shape-silent-empty.md)、[BUG-314](../../_backlog/_archive/fixed_bugs/BUG-314-startup-settings-bad-shape-silent-auto.md)、[BUG-315](../../_backlog/_archive/fixed_bugs/BUG-315-cultivation-full-view-min-widths-ignored.md)

# E2E 第四轮：解析边界 / 声明消费点 / 身份合成

## 决定

九张卡里**七张是同一个病根**：「取了子集、声明了东西、或兜了个底，但没人把它说出来或执行」。
其中 307 / 309 / 312 是上一轮（306 / 295→299 / 同一块投影）修出来的回归——所以这轮的执行纪律
从「逐卡修」改成**修类不修卡**：每张卡的验收必须多跑同类组合。

1. **D″ 解析层必须报「丢了什么」（310 / 311，续 303）**
   `parseCatalog` 增 `skipped`（null / 非对象 / slug 空 / path 空各计一次）；`parseMotionLedger` 增
   `headerOk`（出现表行却认不出表头 ⇒ false）。面板各一句：「N 条条目形状不对已被跳过」/
   「表头与两种口径都对不上——0 场不是台账空」。
2. **I′ 声明约束必须被强制执行（307 / 309 / 315，续 306）**
   - `capControl(key, total, hidden)`：控件只在**真的隐藏了行**时出现（多列表共用一键时由调用方算实际隐藏数）；
   - `recordInbox.processedForViewer` 排除自己提的（`mine` 已带回执）；
   - `splitLayout(available, desiredChat)` 成为两栏布局的**唯一**计算：放不下 `BOARD_MIN + CHAT_MIN + SPLIT_GAP`
     就上下堆叠（`data-stacked`），而不是把两侧压到下限以下。
3. **F″ 身份不许回落内容（312，续 299）**
   问询活体没有平台 id，登记时合成 `question:<ms>:<seq>`；`attentionItemKey` 的无 id 分支改成按**时间**定位，
   **绝不**用摘要（299 当时的「退回内容身份」就是这条漏洞）。
4. **H′ i18n 判据扩面（308，续 302）**
   对话面板的提示与底部状态改走 `CULTIVATION_COPY`（新增 `chatSession`）；判据从培养面板扩到该面板。
5. **E′ 配置诊断到字段级（313 / 314，续 297）**
   `parseStartupSettingsState` / `parseStartupOptionsState` 查 `productType`/`deliveryMode`/`wiki` 与
   `productTypes`/`deliveryModes` 的类型，坏则 `corrupt|unreadable + field`，面板点名「字段「X」类型不对」。

## 输掉的方案

- **把 307 的控件 total 改成 `max(两列表)`**：4+4 时仍是 4 < 5 不出控件，但 6+1 时会说「共 6 条」而实际 7 行——
  计数与内容对不上。正解是「hidden 决定出现、total 决定文案」，两者分工。
- **让 315 在窄容器里横向滚动**：能保住两栏宽度，但把可读性换成滚动条；堆叠才是「两个面板都能读」。
- **给 312 的问询用摘要哈希当 id**：同文两条仍然撞；身份必须由**登记那一刻**造出来。
- **313/314 只把问题归成 `corrupt`/`unreadable` 不点名字段**：用户还是不知道该修哪一行。
- **310/311 只统计跳过数不报行号/字段**：人去点时找不到位置，等于还要自己数。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 成品索引跳过了多少条目 | `parseCatalog().skipped` | 成品面板错误行 | `kb/deliverables-index.json` |
| 台账表头认不认得 | `parseMotionLedger().headerOk` | 台账面板错误行 | `kb/motion-ledger.md` 表头 |
| 折叠控件该不该出现 | `capControl(key, total, hidden)` | 「我提交的」块 | `expandedLists` |
| 我提交/我已处理的分箱 | `recordInbox`（`processedForViewer` 排除自己提的） | 培养面板两块列表 | 记录 frontmatter |
| 问询的身份 | 观察者合成的 `question:<ms>:<seq>` | `attentionItemKey` + 列表 key | `user-questions/request` |
| 两栏还是堆叠 | `splitLayout(available, desiredChat)` | `data-stacked` + 栅格 | 容器宽度（ResizeObserver） |
| 配置哪个字段坏了 | `parseStartup*State().field` | 策略面板错误行 | `startup.json` / `startup-options.json` |
| 对话面板的文案 | `CULTIVATION_COPY`（含 `chatSession`） | 面板提示与底部状态 | — |

## 验证（真跑过）

- **307/309**：`vitest run tests/client/cultivation/cultivation-board.spec.ts tests/lib/cultivation/cultivation.spec.ts` —— 34/34 + 23/23。
  红证：控件 total 改回「两列表之和」→ 4+4 全显示还挂「共 8 条」；去掉 proposer 过滤 → self-rejected 进两个箱子。
- **310/311**：`vitest run tests/client/tabs/deliverables-catalog.spec.ts`（19/19）、
  `vitest run tests/lib/accounting/ledger.spec.ts tests/client/tabs/ledger-tab.spec.ts`（9/9 + 7/7）。
  红证：`skipped` 恒 0 / `headerOk` 恒 true → 面板不提示。
- **313/314**：`vitest run tests/lib/startup/startup-settings.spec.ts`（28/28）、`tests/client/startup/startup-load.spec.ts`（10/10）。
  红证：去掉字段检查 → 字段名丢失、折成空/auto。
- **308**：`vitest run tests/client/cultivation/cultivation-chat-panel.spec.ts` —— 7/7。红证：恢复写死 → en 命中 CJK、zh 出裸 `session: `。
- **312**：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts` —— 79/79。
  红证：去掉合成 id → 同文两条问询 id 都是 undefined。
- **315**：`vitest run tests/client/cultivation/cultivation-view-layout.spec.ts` —— 5/5（393 堆叠 / 1100 两栏 / 边界 / 期望过宽 / 首帧）。
  真 Chromium 量真 CSS 规则（从 `styles.ts` 原样抽）：1440 ⇒ 1044/390，1100 ⇒ 704/390，768 堆叠 ⇒ 768/768，375 ⇒ 375/375。
- 收尾：`test` 2548、`verify` ALL PASS、`typecheck` 0、`lint` 0、`dup` 0、`coverage-ratchet` PASS（210 文件）。

## 未覆盖轴

- [environment-gap] 315 的**整页**测量没取到：隔离实例无登录/模型，GUI 停在落地页开不出会话 → `packages/company-pack/src/client/cultivation/CultivationView.tsx`
- [policy] 布局判据落在「单元三档 + 真 Chromium 量真规则」；把它做成车道级断言需要可登录的实例 → `tests/client/cultivation/cultivation-view-layout.spec.ts`
- [policy] 问询合成 id 的唯一性靠「毫秒 + 进程内序号」，跨进程不保证 → `packages/company-pack/src/client/wiring/attention-observers.ts`
- [covered] 解析层 `skipped` / `headerOk` → `tests/client/tabs/deliverables-catalog.spec.ts`、`tests/lib/accounting/ledger.spec.ts`
- [covered] `LIST_CAPS` 每个键都有消费点 → `tests/client/cultivation/list-caps-consumed.spec.ts`
