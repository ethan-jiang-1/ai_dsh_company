状态：implemented（2026-11-22）｜上游 = [BUG-297](../../_backlog/_archive/fixed_bugs/BUG-297-strategy-read-failure-silently-auto.md)、[BUG-298](../../_backlog/_archive/fixed_bugs/BUG-298-fixed-read-limits-silent-truncation.md)、[BUG-299](../../_backlog/_archive/fixed_bugs/BUG-299-attention-dedupe-by-summary-drops-distinct-approvals.md)、[BUG-300](../../_backlog/_archive/fixed_bugs/BUG-300-cultivation-decided-at-raw-iso.md)

# E2E 第二轮：读面自带状态 / 静默回退 / 身份键 / 时间口径

## 决定

四张卡 = 三族 + 一条纯文案，各落一条可复用机制（不造新机制，把仓里已有的三件仪器盖到剩余面）：

1. **D 读面契约（298，297 吃它的失败/缺失区分）**：`readWorkspaceText` 此前只带回内容、丢掉 vendor 的
   `eof`，三个消费方各自猜「读完没」，三种猜法全错（台账少 64 场、记录把截断当全文、大索引报「形状不符」）。
   - 读面返回结果态 `{ ok:true, text, eof } | { ok:false, reason }`；上限收进 `client/data/read-limits.ts`。
   - 台账：截断 ⇒「只读取了前 240 行（文件更长）…不完整」；成品索引：判定顺序 unreadable → tooLarge →
     badShape（截断不再冒充形状坏）；培养记录：`bodyTruncated = !eof` ⇒「正文只加载了摘要…」。
   - 摘要窗（journal 预览 / 记录头）走 `asWindowReader`：**有意的**窗口，不算静默截断。
2. **E 静默回退（297）**：`startup.json` 坏/读不到被宽松解析折成 `EMPTY_STARTUP_SETTINGS`，面板全显示
   「自动」。接上早已存在但无人调用的 `parseStartupSettingsState`，`StartupFace.settingsProblem` 分
   `corrupt / unsupported / unreadable`；**缺失/空仍是合法 auto**（不制造噪声）。
   折算搬到纯函数 `startup/startup-load.ts`——composition 闭包在单测里不执行，留在那里等于没人验过。
3. **F 身份键（299）**：`mergeAttention` 用 `kind+jumpTo+what`（160 字摘要）去重，两条同摘要的**不同**
   审批互相吞掉；活体 `detail` 也在 `live.map` 里被丢。`AttentionItem.id` + `attentionItemKey`
   （有 id ⇒ `kind+jumpTo+#id`；消息类无 id 退回内容身份，不回退时间）打通 merge 与列表 key。
4. **G 时间口径（300）**：`decidedAt` 是 host 写的完整 ISO，正文必须与「提出时间」同口径（`timeLabel`），
   精确值放 `title`；解析失败回落原值。

## 输掉的方案

- **只把上限调大**：300 行台账能过、3000 行照样少报；上限不是根因，**丢掉 `eof`** 才是。
- **让每个消费方自己再读一次文件算行数**：多一次 I/O，且仍拿不到「vendor 认为读到哪」。
- **给 `readWorkspaceText` 加 `truncated?: boolean` 可选参数**：默认值会让新的调用点又静默成「完整」。
- **策略面板只加一条「读不到」**：corrupt 与 unreadable 的处置不同（改文件 vs 查权限），混成一条会误导。
- **`mergeAttention` 按 `what + time` 去重**：时间戳差几毫秒就让同一条 live/历史变两条（299 的原始 bug 反面）。
- **把 `decidedAt` 直接 `toLocaleString()`**：与同面板「1 小时前」仍不同口径，且不带时区说明。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 一段工作区文本读没读完 | `makeWorkspaceTextReader`（结果态 `{text,eof}`） | 台账/成品/培养/策略四个消费方 | `remote.workspaceFiles.read` 的 `eof` |
| 固定上限行数 | `client/data/read-limits.ts` | 四个消费方的提示与请求 | `workspaceFiles.read({limit})` |
| 策略文件的健康 | `startupFaceFrom`（`settingsProblem`） | `StrategyPanel` 三行错误 | `startup.json` 字节 |
| 待办条目的身份 | `attentionItemKey` | `mergeAttention` + 列表 key | `approval/asked` 的 id（活体 `approval/request` 透传） |
| 采纳/拒绝时间的人话 | `decidedAtLabel` | 培养面板两处 | 记录 frontmatter `decidedAt`（ISO） |

## 验证（真跑过）

- **298**：`vitest run tests/client/data/workspace-read-limits.spec.ts` 4/4（limit-1 ⇒ `eof=false`、limit/limit+1 ⇒ true、失败带原因）；真页面三夹具：
  台账「只读取了前 240 行（文件更长）——下面的统计与清单都不完整」／索引「成品索引超出读取上限（只读到前 2000 行）——不是形状问题」／
  记录「正文只加载了摘要，可能不完整；完整原文在 …」。
- **297**：`startup-load.spec` 6/6 + `strategy-panel.spec` 12/12；真页面坏 JSON ⇒「策略文件损坏（JSON 读不动），当前按「自动」显示——…」，
  删文件后同面板**无**错误行。
- **299**：`attention.spec` 27/27（同摘要不同 id ⇒ 2 条、同 id live+history ⇒ 1、live `detail` 保留、key 不撞）；
  `attention-observers.spec` 9/9（带/缺 id 两条）。
- **300**：`cultivation-board.spec` 27/27（正文人话 + `title` 精确 ISO）、`cultivation-record-time.spec` 2/2。
- 收尾：`test` 2496、`verify` ALL PASS、`typecheck` 0、`lint` 0、`dup` 0、`coverage-ratchet` PASS（210 文件）。

## 未覆盖轴

- [environment-gap] 造真实挂起审批仍要 `DSH_PERMISSION_MODE=workspace-write`（本机默认 `never` 自动拒）→ `run/env.sh`
- [policy] 读面上限是行数、且每个消费方各自决定「截断怎么显示」；未来新读面必须自己声明策略 → `packages/company-pack/src/client/data/read-limits.ts`
- [covered] 三个上限的边界（limit±1）与四种状态提示 → `tests/client/data/workspace-read-limits.spec.ts`
- [covered] 策略文件三态与「缺失不报错」→ `tests/client/startup/startup-load.spec.ts`
- [covered] 待办身份去重与活体 detail → `tests/client/wiring/attention.spec.ts`
