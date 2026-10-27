---
状态：implemented（2026-10-28，第四轮批 C：diagnose 真话）
---

# 批 C：让 `diagnose` 把非零 bash、等审批与 child 失败都说出来

> 上游 = [第四轮六维打扫卡](../../_backlog/issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-06）](../../_backlog/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. **bash 非零退出单列 `NONZERO`**：`tool/result` 文本里的 `[exit code: N≠0]` 与 `job/settled.detail` 的 `exit code: N` 都收，按 `toolCallId` 去重；不再因为 `isError:false` 而全绿。
2. **中断轮归因**：不再一律说“进程被杀/崩溃”。回看该轮最后一个 `tool/call`：`ask_user_question` → “等人回答”；存在未 `decided` 的 `approval/asked` → “等审批”；否则才说“中断（最后工具 X）”。
3. **待审批单列**：`approval/asked` 没有配对 `decided` 的进 `pendingApprovals`（带 toolName/reason），在 `FAILURES` 里明说“未 decided”。
4. **child 会话可 diagnose**：不再要求目录名以 `session-` 开头；`newestSession` 与 `--session <slug>/<childId>` 都以“有 canonical 日志”为准。
5. **team failed 入摘要**：`team/member`（及 `agent-team/member`）`phase=failed` 进 `teamFailures`，在 lead 摘要点名。
6. **坏 JSON 与 `--strict`**：`badLines>0` 进 FAILURES；`--strict` 对 FAILURES 或 `NONZERO` 都 exit 1；`--json --strict` 同样生效（此前 JSON 分支恒 exit 0）。

## 输掉的方案

- **把所有非零 bash 都塞进 `FAILURES`**：拒绝。grep 无匹配、stat 探路等常见非零不是故障；单列 `NONZERO` 让人逐条看，`--strict` 再当失败。
- **只读 `job/settled` 或只读 `tool/result`**：拒绝。两者都可能缺；取并集并按 callId 去重，才不漏。
- **中断轮继续叫“崩溃”**：拒绝。等 ask/审批是产品停点，误诊会让人重启/重跑。
- **把 child 目录强制改名成 `session-`**：拒绝。那是 vendor 的目录形状，不改上游数据；诊断侧放宽匹配。

## 后果

- 真实 `session-01b060a7` 从 `toolErrors=0 / FAILURES none` 变为 `nonzero=4`（8 个事件去重成 4 条命令）并列命令尾部；`--strict` / `--json --strict` 均 exit 1。
- `--session <slug>/<childId>` 可直接读 child（实测 `daadc7d2…`）。
- 等 ask/审批的中断轮不再被当成崩溃；`diagnose` 的 `EVENTS` 行新增 `nonzero` 与 `pendingApprovals`。

## 验证

- `pnpm test tests/harness/session-diagnose.spec.ts` → 12 tests passed（新增非零 bash 去重、等人回答、待审批、team failed 四例）。
- `source run/env.sh && pnpm diagnose --session '--Users-bowhead-ai_dsh_company-company-workspace--/session-01b060a7'` → `nonzero=4`、`NONZERO 4`、4 条命令尾部；`FAILURES none`（无 isError）。
- 同一命令 `--strict` → exit 1；`--json --strict` → exit 1，JSON 含 `toolNonZeroExits`。
- `pnpm diagnose --session '…/daadc7d2-b1ce-47c1-8193-a49f1bf59ac1'` → 正常输出（child 无 `session-` 前缀）。
- `pnpm verify` → ALL PASS；`pnpm test` → **107 files / 963 tests**；`pnpm typecheck` → exit 0。

## 未验

- 真模型/team 失败的真实日志未制造；team failed 与 pending approval 由纯逻辑夹具覆盖。
- 等审批的真实中断会话未复现；`interruptedHints` 的审批分支用 `approval/asked` 夹具验证。
