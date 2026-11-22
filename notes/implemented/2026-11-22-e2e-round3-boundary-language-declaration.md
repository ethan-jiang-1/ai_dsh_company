状态：implemented（2026-11-22）｜上游 = [BUG-301](../../_backlog/_archive/fixed_bugs/BUG-301-strategy-wiki-input-stale-after-reset.md)、[BUG-302](../../_backlog/_archive/fixed_bugs/BUG-302-english-ui-chinese-time-and-reason.md)、[BUG-303](../../_backlog/_archive/fixed_bugs/BUG-303-ledger-malformed-rows-silent-drop.md)、[BUG-304](../../_backlog/_archive/fixed_bugs/BUG-304-attention-history-window-misses-old-approvals.md)、[BUG-305](../../_backlog/_archive/fixed_bugs/BUG-305-attention-history-all-read-fail-silent-empty.md)、[BUG-306](../../_backlog/_archive/fixed_bugs/BUG-306-cultivation-mine-list-cap-dead.md)

# E2E 第三轮：边界必须可见 / 表达层与语言 / 声明必须有消费点

## 决定

六张卡 = 三族 + 一条交互语义。共同点是**上一轮「读面带状态」只修到了 workspaceFiles 一层**：同样的病
在会话历史（304/305）、解析层（303）、表达层（302）、声明层（306）各留了一份。

1. **D′ 取子集必须报边界（304 / 305 / 303）**
   - `readSessionEvents` → `{ events, windowTruncated }`（vendor 的 `hasMore` 优先；拿满一页保守判截断）；
     `readPendingAcrossSessions` → `{ items, scanned, failed, window }`。
   - 面板：`failed > 0` 出错误行「有 N 个会话的历史读不到」并**不再**声称「没有等你的事」；
     `window === 'some'` 出「历史只扫描了最近 800 条」。
   - `parseMotionLedger` → `{ rows, badRows }`（坏行带行号与单元格数）；台账面板增「有 N 行格式不符已被跳过」。
2. **H 表达层 helper 不得写死语言（302）**
   - `lib` 的 `timeParts(at, now)` 只产出结构（just-now / minutes / hours / yesterday / date）；
     `cultivationTimeLabel` 用 `CULTIVATION_COPY` 的 zh/en 键渲染，是培养面板时间的**唯一出口**。
   - `listDir` 的失败原因改成代号 `'dir-denied'`，面板按字典翻（`inboxUnreadDirDenied`）。
   - 判据：`en` 渲染断言 **无 CJK**（`/[\u4e00-\u9fff]/` 不命中；夹具数据用 ASCII，只钉文案）。
3. **I 声明必须有唯一消费点（306）**
   - `CultivationMine` 接 `capList` / `capControl`；控件计数用**折叠前**总数（cap 之后再取长度永远等于上限）。
   - 判据：6 条 ⇒ 5 条 + 「显示全部（共 6 条）」；另加静态判据——`LIST_CAPS` 的每个键都必须有
     `capControl('<key>'` 消费点（`tests/client/cultivation/list-caps-consumed.spec.ts`）。
4. **J 受控输入 + 外部重置（301）**
   - wiki 输入改受控：本地草稿 + 外部值变化时以 store 为准同步；失焦比较草稿与 store，相同则不写。

## 输掉的方案

- **把 304 的窗口调大（800 → 5000）**：只是把边界往后挪，长会话照样看不见；要么报边界，要么真分页。
- **305 全部失败时仍然只显示空态**：那是把「读不到」说成「没有」，正是这类卡的原始症状。
- **303 只统计坏行数、不报行号**：人去点时找不到哪一行，等于还要自己数。
- **302 让 `lib` 收 translator**：`lib` 会反向依赖 client 的字典；改成只产出结构，语言留在渲染层。
- **306 把 `LIST_CAPS` 删掉、写死 5**：删掉声明只是让「没人消费」变成「没有声明」，判据仍不存在。
- **301 在失焦时读 DOM 的 value**：非受控的根源；受控后失焦只读草稿，与 store 比较。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 跨会话历史读到哪、失败几个 | `readPendingAcrossSessions`（结果态） | 待办面板的错误行/窗口提示 | `remote.session.page` 的 `hasMore` + 失败 |
| 台账有哪些行被跳过 | `parseMotionLedger`（`badRows`） | 台账面板的跳过提示 | `kb/motion-ledger.md` 字节 |
| 时间的人话 | `timeParts` + `cultivationTimeLabel`（zh/en 键） | 培养面板四处时间 | 记录 id / `decidedAt` / `verificationHistory.at` |
| 读失败原因的语言 | 代号 `'dir-denied'` + 字典键 | 培养收件箱错误行 | `workspaceFiles.list` 失败 |
| 列表折叠上限 | `LIST_CAPS` ↔ `capControl('<key>'` | 三个列表块 | `expandedLists` 状态 |
| wiki 输入的值 | store（受控草稿） | 策略面板输入框 | `startup.json` |

## 验证（真跑过）

- **304/305**：`vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 18/18
  （拿满一页 ⇒ `window=some`；全失败 ⇒ `failed=N`、`items` 空；面板出错误行并压住空态；窗口提示含 800）。
  红证：把 `window` 强制为 `'none'` 且空态改回无条件渲染 → 3 failed。
- **303**：`vitest run tests/lib/accounting/ledger.spec.ts tests/client/tabs/ledger-tab.spec.ts` —— 7/7 + 6/6
  （坏行 `line 6 / 3 cells` 记账；面板「共 1 场动议」+「有 1 行格式不符已被跳过」）。红证：恢复静默 `continue` → 2 failed。
- **302**：`vitest run tests/client/cultivation/cultivation-board.spec.ts` —— 31/31（en 渲染无 CJK，时间出
  `5 minutes ago`、原因出 `the directory listing was denied`）；`cultivation-record-time.spec.ts` 五档 + `cultivation-actions.spec.ts` zh/en 五档。
  红证：时间渲染改回 `timeLabel` → 2 failed。
- **301**：`vitest run tests/client/startup/strategy-panel-input.spec.ts` —— 3/3（重置后清空、同值失焦零写入、改字写入）。
  红证：换回 `defaultValue` → 1 failed。
- **306**：`vitest run tests/client/cultivation/cultivation-board.spec.ts`（31/31）+ `list-caps-consumed.spec.ts`（1/1）。
  红证：删掉 `capControl('mine'` 消费点 → 判据说「这些键声明了但渲染面从不消费：mine」。
- 收尾：`test` 2520、`verify` ALL PASS、`typecheck` 0、`lint` 0、`dup` 0、`coverage-ratchet` PASS（210 文件）。

## 未覆盖轴

- [environment-gap] 造「挂起审批 + 900 条后续事件」的现场仍要真会话日志；本轮窗口判据用纯函数夹具 → `tests/client/presence/attention-history.spec.ts`
- [policy] 800 条窗口保留（报边界而非改大）；未来要「真分页」是另一张卡 → `packages/company-pack/src/client/presence/attention-history.ts`
- [policy] en-CJK 判据目前覆盖培养面板；其他面板接入同一判据是下一轮的机械扩展 → `tests/client/cultivation/cultivation-board.spec.ts`
- [covered] 三个上限的边界与折叠控件 → `tests/client/cultivation/cultivation-board.spec.ts`
- [covered] `LIST_CAPS` 每个键的消费点 → `tests/client/cultivation/list-caps-consumed.spec.ts`
