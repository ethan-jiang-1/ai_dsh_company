# 2026-09-26 · journal 日期机制：公司记忆里没有可信的"今天"

状态：proposed（2026-09-26 用户裁定 UX 实验轮后转本提案；**执行待批准**——先提案后动手）

## 问题

公司记忆的日期正在**链式漂移并已复利**：

- 两场真动议实际跑于 **2026-09-26 00:20 / 02:18**（权威来源 = 会话日志 `session.createdAt`，
  `dev/harness-home/sessions/--Users-bowhead-ai_dsh_company-company-workspace--/session-306dafdf-…`
  与 `session-e40e44c2-…`），而落盘的是 `kb/ceo/journal/2026-09-29-renewal-x-2026.md` 与
  `2026-09-30-revenue-plan-2027.md`；台账 `kb/motion-ledger.md` 两行同值（带「待核」）。
- 漂移**已复利**：COO / VP-Eng 的 journal 明写"日期下限可锚 `kb/ceo/journal/2026-09-29-…`"——
  后来者把漂移值当基准；CFO 三篇 09-30 跟随。
- 形态是"**记了但记错**"：正文首行标了「日期待核」（诚实），文件名与台账却写死具体数字（污染）
  ——诚实标注**挡不住数字扩散**。

## 根因（机制核实，2026-09-26，vendor 只读）

1. **公司角色没有任何取真日期的通道**：五角色 preset 未声明任何 shell/exec 工具行（核
   `packages/company-pack/presets/*/agent.cordis.yml`）；无时钟类工具；公司会话的 runtime context
   实测只有 file policy / approval policy / workspace 三项、**不含日期**；fs 工具的**模型面**输出
   不含 mtime（`ctx.fs.stat` 只用于类型/大小/版本路由，`fs-local/src/fsio.ts` 的 mtimeNs 不到模型）。
2. **现有文案口径本身就是漂移算法**：CEO `chairing-staff-meeting` 记账步写"先读 `journal/` 最新
   一篇的日期，以它为基准取次日"——最新一篇已漂移时 **+1 必然复利**。打磨轮立的这条口径是漂移的
   **成因**，不是防线（红证：09-29 → 09-30）。
3. **原生 seam 存在但没人用**：vendor `scope.systemPrompt.context({ name, order, text })` 是现成的
   runtime context 贡献点（样例 = `packages/sandbox/sandbox-policy/src/index.ts:141-152`），而会话
   自身的时间戳（`session.createdAt` / 每条记录的 `time`）是**权威且已 logged** 的日期来源。

## 候选（三案，可叠加）

- **A · 机制层（本仓）**：pack 侧 host 贡献一行 runtime context「当前日期（取自本会话日志时间戳）」
  ——用原生 `systemPrompt.context` seam，不自造工具（D13）。**前置核实**：pack 的组合面能否
  inject `systemPrompt`、能否读到 session 记录时间；核实不过则退 B+C。**属 host 面新增，先报人**。
- **B · 上游 seam**：DSH 原生在 runtime context 注入日期（对所有 agent 普适）→ 提上游；落地前
  A 可作过渡。**不自建时钟工具、不自建调度器**。
- **C · 文案层止损（当天可做，与 A/B 不冲突）**：① 删掉"读最新一篇取次日"口径；② 无可信日期时
  **禁止写具体日期**——文件名与台账用「日期待核」占位，由轮末收敛或人回填。治的是**污染扩散**，
  治不了"没有日期"（本轮已证：光靠标注无效）。

**推荐次序**：C（立即止损）→ A（真修，前置核实通过才做）→ B（同时提上游，长期）。

## 输掉的方案

- **继续"读最新一篇取次日"**：它就是漂移算法，红证在案（09-29→09-30 复利）。
- **journal 文件名改用序号**（`001-<slug>`）绕开日期：丢时间信息、与既有 46 篇命名不一致、
  台账仍需日期列。
- **自建时钟工具 / 自建定时器**：D13 不自造；原生 seam 已在（`systemPrompt.context`）。
- **只加强"日期待核"文案**：实测挡不住数字扩散（本轮红证）。

## 验收

- 下一场真动议的 journal 文件名与台账日期 = **真日期**；复核方法 = 与
  `dev/harness-home/sessions/.../session.v4.jsonl.zstd` 的 `session.createdAt` 比对（keyless 可复核）。
- 现有漂移**登记**：台账 `kb/motion-ledger.md` 两行日期修正（证据 = 会话日志时间戳）；
  journal 属**冻结层不改写**、只登记（沿既有裁决）。
- A 案（若做）：keyless 测试证明 runtime context 文本含日期且取自会话记录（model-visible ⟺ logged）；
  client 面无改动。
- `pnpm verify` / `pnpm test` 保持绿。

## 风险

- A 案动 pack host 面：组合面能否 inject `systemPrompt` 需先核实；不通过则退 B + C。
- C 案的"禁止写日期"若过严，台账可能暂时缺日期列——**宁缺勿错**，可接受。
- 上游 B 时间不可控，不阻塞 A / C。

## 依据

- 体感与漂移证据：[implemented/ux-experiment-round](../implemented/2026-09-25-ux-experiment-round.md)
  §三档分拣（体感笔记原文已按 research 层生命周期并入该 Note，末次 blob `310227d`）。
- 既有口径（本轮要删的那句）：`packages/company-pack/presets/ceo/skills/chairing-staff-meeting/SKILL.md:23`。
