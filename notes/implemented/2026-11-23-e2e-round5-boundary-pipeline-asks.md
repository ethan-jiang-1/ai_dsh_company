状态：implemented（2026-11-23）｜上游 = [BUG-316](../../_backlog/_archive/fixed_bugs/BUG-316-cultivation-host-command-texts-not-localized.md)、[BUG-317](../../_backlog/_archive/fixed_bugs/BUG-317-attention-current-session-1000-cap-silent.md)、[BUG-318](../../_backlog/_archive/fixed_bugs/BUG-318-attention-history-candidate-cap-silent.md)、[BUG-319](../../_backlog/_archive/fixed_bugs/BUG-319-attention-questions-not-rebuilt-after-reload.md)、[BUG-320](../../_backlog/_archive/fixed_bugs/BUG-320-attention-approval-cap-five-silent.md)、[BUG-321](../../_backlog/_archive/fixed_bugs/BUG-321-cultivation-record-head-60-lines-false-broken.md)、[BUG-322](../../_backlog/_archive/fixed_bugs/BUG-322-cultivation-journal-head-240-title-fallback.md)、[BUG-323](../../_backlog/_archive/fixed_bugs/BUG-323-attention-history-cross-workspace-leak.md)、[BUG-324](../../_backlog/_archive/fixed_bugs/BUG-324-deliverables-catalog-field-shape-silent.md)

# E2E 第五轮：边界沿管线传递 / 重建覆盖全部类型 / 过滤器 fail-closed

## 决定

九张卡里**七张是同一个病根**：「边界在某一层被丢掉，下游就只能靠猜」。前三轮分别按层修过
（`workspaceFiles` 的截断 → 解析层的跳过 → 会话历史的窗口），但这一轮一次性冒出**六个新上限**，
证明按层修不管用：**边界必须是一个沿管线传递的值**。

1. **D‴ 边界沿管线传递（317 / 318 / 320 / 321 / 322 / 324）**
   - 注意力三处上限各自带边界：本会话事件窗（`eventsSeen` → `eventsTruncated`）、候选
     （`historyCandidates` → `total/capped`）、审批流（`pendingApprovals` → `{items, capped}`，
     跨会话汇总为 `approvalsCapped`）。面板三行提示 + **有边界时压住**「没有等你的事」。
   - 预览窗口不是格式判据：`readRecordHead` 解析失败时**补读全文再判坏**；journal 无 `#` 标题时
     **补读更大窗口**（`readJournalMore`）。
   - 解析层不猜字段形状：`parseCatalog` 允许字段缺省、**拒绝错类型**（计入 `skipped`），
     不再把 `root:"bogus"` 归一化成 active。
2. **F‴ 重建面覆盖「等你处理」的全部类型（319）**
   审批能重建、问询不能 → 刷新后少半张清单。新增 `pendingQuestions`（日志口径：`ask_user_question`
   的 `tool/call` 是「问了」，同 `callId` 的 `tool/result` 是「答了」；`user-questions/answered` 同 id 也认）
   与 `pendingAsks`（审批 + 问询合并、共享同一上限与 `capped`）。
3. **O 过滤器必须 fail-closed（323）**
   `currentCwd === undefined || summary.cwd === currentCwd` 把「未知」当「都匹配」——别的 workspace
   的挂起审批会出现在本工作区的待办里。改为 `historyCandidates`：cwd 缺失/空串 ⇒ `{ ok:false }`，
   一个都不扫，面板说「工作区还没就绪，暂不扫描其它会话」。
4. **H″ 宿主文案可翻译（316）**
   `/cultivation` 的 63 条回执全是中文字面量。host 已有语言桥（`CompanyLanguageState` 读
   `locale.preference`），只是命令面没用上——`registerCultivation` 收 `t(zh, en)`，63 条回执双语；
   条件片段改成「一次分支 + 两种语言叶子」（否则每加一种语言就多一份未覆盖分支，coverage 棘轮会红）。

## 输掉的方案

- **把三个上限调大**：只是把边界往后挪，第 7 个上限照样会冒出来；边界不报就永远有人在猜。
- **问询只认 `user-questions/answered`**：真日志里没有这个事件（问询是 tool 调用），只认它等于没修。
- **cwd 未知时扫「看起来像同工作区」的会话**：那是把越界包装成「尽力」。
- **host 回执在 client 侧按中文串做映射**：解析人写的句子不可靠，且改一个字就失效。
- **给每种语言复制一遍三元**：分支翻倍（本轮实际踩到，coverage 立刻红）；正解是「一次分支 + 叶子双语」。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 注意力三处边界 | `eventsSeen` / `historyCandidates` / `pendingApprovals.capped` | 待办面板三行提示 + 空态抑制 | 会话事件流 / 会话清单 / `STREAM_ITEM_CAP` |
| 挂起问询 | `pendingQuestions`（`pendingAsks` 合并） | 待办「等你处理」 | `ask_user_question` 的 `tool/call` + `tool/result` |
| 候选是否可扫 | `historyCandidates`（fail-closed） | 面板「工作区还没就绪」 | 当前会话 `cwd` |
| 预览窗口是否够 | `readRecordHead` 失败补读 / `readJournalMore` | 记录列表与 journal 标题 | 记录头 / journal 头部 |
| 成品索引字段形状 | `parseCatalog`（缺省可、错类型拒） | 面板「N 条条目形状不对」 | `kb/deliverables-index.json` |
| 命令回执的语言 | `registerCultivation(…, t)` | 面板回执行 | `locale.preference` |

## 验证（真跑过）

- **323**：`vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 23/23。
  红证：改回 fail-open → 3 failed（page 面被调用、别的 workspace 条目出现）。
- **317/318/320**：`vitest run tests/client/wiring/attention.spec.ts tests/client/tabs/attention-tab.spec.ts tests/client/presence/attention-history.spec.ts` —— 31/31 + 14/14 + 16/16。
  红证：去掉 `eventsSeen`／`capped` → 面板不提示且空态照旧说「没有等你的事」。
- **319**：`vitest run tests/client/wiring/attention.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 38/38 + 15/15。
  红证：重建只认审批 → 未答问询不出现。
- **321/322**：`vitest run tests/client/cultivation/cultivation-data.spec.ts` —— 7/7（61 行 frontmatter 的合法记录不进坏记录；无标题预览补读拿到真标题）。
- **324**：`vitest run tests/client/data/catalog-contract.spec.ts` —— 5/5（三种坏形状各计一次、合法的仍收）。
  红证：恢复静默归一化 → `bogus-root` 被当 active、`skipped` 不是 5。
- **316**：`vitest run tests/host/cultivation/cultivation-command.spec.ts` —— 21/21（en 下 correct/adopt/verify/reject 的回执与用法错误均无 CJK）。
- 收尾：`test` 2574、`verify` ALL PASS、`typecheck` 0、`lint` 0、`dup` 0、`coverage-ratchet` PASS（210 文件）。

## 未覆盖轴

- [environment-gap] 319 的真会话日志没取到（本机日志 zstd 里只有 v4 头行、无事件），口径按 `ask_user_question` 的 `tool/call` ↔ `tool/result` 推断并用夹具钉住 → `packages/company-pack/src/lib/presence/attention.ts`
- [environment-gap] 316 的真页面复核未跑（隔离实例无登录/模型，开不到命令面）；证据是 host 级 spec → `tests/host/cultivation/cultivation-command.spec.ts`
- [policy] 问询合成 id 的唯一性靠「毫秒 + 进程内序号」，跨进程不保证 → `packages/company-pack/src/client/wiring/attention-observers.ts`
- [covered] 三处注意力的边界与面板提示 → `tests/client/tabs/attention-tab.spec.ts`
- [covered] 成品索引字段形状与跳过计数 → `tests/client/data/catalog-contract.spec.ts`
- [covered] 命令回执双语 → `tests/host/cultivation/cultivation-command.spec.ts`
