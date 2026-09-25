# 2026-09-26 · journal 日期机制：公司记忆里没有可信的"今天"

状态：已交付（2026-09-26：**用户只批 C 文案止损**——删"取次日"口径 + 无时钟时禁止写具体日期；
A（pack 侧 runtime context 注入）/ B（上游 seam）**未批**，留案见「输掉的方案」；台账两行已按会话日志修正）

## 问题

公司记忆的日期曾**链式漂移并复利三代**：

- 三场动议的真日期（权威来源 = 会话日志 `session.createdAt`）与落盘日期：

| 动议 | 真日期 | 落盘日期 | 漂移 |
|---|---|---|---|
| `emergency-x-incident-review` | 2026-09-25（台账既有值） | `2026-09-28-…`（journal 文件名） | +3（**漂移源头**） |
| `renewal-x-2026` | 2026-09-26 00:20 | `2026-09-29-…` | +3（= 09-28 的"次日"） |
| `revenue-plan-2027` | 2026-09-26 02:18 | `2026-09-30-…` | +4（= 09-29 的"次日"） |

- **复利形态**：COO / VP-Eng 的 journal 明写"日期下限可锚 `kb/ceo/journal/2026-09-29-…`"——
  后来者把漂移值当基准；CFO 三篇 09-30 跟随；`renewal-x-2026/final.md` 与
  `revenue-plan-2027/drafts/vp-sales-pipeline.md` 也把漂移路径写进了正文引用。
- **"记了但记错"**：正文首行标了「日期待核」（诚实），文件名与台账却写死具体数字（污染）
  ——诚实标注**挡不住数字扩散**。

## 根因（机制核实，2026-09-26，vendor 只读）

1. **公司角色没有任何取真日期的通道**：五角色 preset 未声明任何 shell/exec 工具行（核
   `packages/company-pack/presets/*/agent.cordis.yml`）；无时钟类工具；公司会话的 runtime context
   实测只有 file policy / approval policy / workspace 三项、**不含日期**；fs 工具的**模型面**输出
   不含 mtime（`ctx.fs.stat` 只用于类型/大小/版本路由，`fs-local/src/fsio.ts` 的 mtimeNs 不到模型）。
2. **原文案口径本身就是漂移算法**：CEO `chairing-staff-meeting` 记账步曾写"先读 `journal/` 最新
   一篇的日期，以它为基准取次日"——最新一篇已漂移时 **+1 必然复利**。打磨轮立的这条口径是漂移的
   **成因**，不是防线。
3. **原生 seam 存在但没人用**：vendor `scope.systemPrompt.context({ name, order, text })` 是现成的
   runtime context 贡献点（样例 = `packages/sandbox/sandbox-policy/src/index.ts:141-152`），而会话
   自身的时间戳（`session.createdAt` / 每条记录的 `time`）是**权威且已 logged** 的日期来源。

## 采用方案：C 文案止损

三处落点（一处事实一个家）：

1. **公司手册「日期口径」**（`company-workspace/AGENTS.md` §协作规矩）：全角色规则——没有取真日期
   的通道 ⇒ 不许推算 / 不许"取次日" / 不许凭记忆猜；取不到真日期时文件名与正文首行一律用占位
   `日期待核`，真日期由轮末收敛或人回填；**宁缺勿错**。
2. **CEO skill `chairing-staff-meeting` 记账步**：只留 CEO 侧动作（文件名 `日期待核-<slug>.md` +
   收工回报点名"日期待回填"），细则指手册（**不复制正文**，避免两份规矩）。
3. **台账 `kb/motion-ledger.md`**：两行漂移日期按会话日志修正为 09-26，表头加「日期口径」一行
   ——写日期的第三处也得立法，否则台账自己会被再写错。

## 输掉的方案

- **A · pack 侧 `systemPrompt.context` 注入日期**（用户本轮**未批**）：真修，但动 pack host 面
  （且需先核实 pack 组合面能否 inject `systemPrompt`）。**留案**：触发条件 = 日期缺失再次造成问题，
  或用户点名；届时按红线先报人。
- **B · 上游 seam**（**未批**）：提 DSH 原生注入日期（所有 agent 普适）。留案，同上。
- **继续"读最新一篇取次日"**：它就是漂移算法，三代红证在案。
- **journal 文件名改用序号**（`001-<slug>`）绕开日期：丢时间信息、与既有 46 篇命名不一致、
  台账仍需日期列。
- **自建时钟工具 / 自建定时器**：D13 不自造；原生 seam 已在。
- **只加强"日期待核"文案**：实测挡不住数字扩散。

## 后果 / 验证

- **代价**：日期暂时缺失（占位），由人 / 轮末收敛回填；**收益**：禁止写具体数字 ⇒ 漂移不再复利。
- 已执行：`handbook-smoke` ALL PASS（手册注入）；`preset-smoke` ALL PASS（5 preset 全部可挂载）；
  `pnpm verify` ALL PASS；`pnpm test` 190/190。
- **未验证（待人 / 下次动议）**：下一场真动议的 journal 与台账应写「日期待核」占位或真日期、
  不得出现推算值；复核方法 = 与 `dev/harness-home/sessions/.../session.v4.jsonl.zstd` 的
  `session.createdAt` 比对。

## 实施实况（2026-09-26）

- **冻结层只登记不改写**（沿既有裁决）：带漂移日期的文件 13 个（CEO journal ×2、CFO journal ×3、
  COO journal ×2、VP-Eng ×1、VP-Sales ×1、CEO CHARTER ×1、final ×2、drafts ×1）——内容一字未改，
  全文归 git；台账（可维护的事实家）已修正，journal 类只登记。
- 同源并行交付：**问询节流规矩**（同一轮实验的"追问疲劳"发现，用户同次批准）→
  [inquiry-throttle](./2026-09-26-inquiry-throttle.md)。
