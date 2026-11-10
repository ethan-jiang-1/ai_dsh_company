---
status: 已修
severity: P2
opened: 2026-11-10
---

# BUG-060：`/req` / `/prd` 被启动态 `dataBlocked` 挡住，picker 会话的只读校验必须重启

> 严重级别：P2（次要）｜发现：2026-11-10｜状态：已修
>
> **留痕**：Note [notes/implemented/2026-11-10-readonly-command-session-workspace.md](../../../notes/implemented/2026-11-10-readonly-command-session-workspace.md)
>
> **审查**：agent — 重读 diff + 两命令 spec 红→绿 + 真入口「无 workspace 启动 + 会话 cwd 有效」复跑；见「修复证据」。

## 症状

- 启动时没有 workspace（`DSH_COMPANY_HOME` 无效/为空），`prepareCompanyRuntime` 返回
  `dataBlocked=true`；此时在侧栏选了一个 workspace 的会话里跑 `/req check <valid>`，仍返回
  `公司数据已停写（原因：…）；先处理该原因再校验…`——只读校验被启动态挡住，必须重启宿主。
- **只读**命令不需要 writer lease；`/req`/`/prd` 不写盘。BUG-058 只修了回执原因，没有修这个
  启动态耦合；实际可用性仍是「重启才能查」。

## 根因（假设）

`registerReqCommand`/`registerPrdCommand` 只拿启动时的 `workspace` 与 `dataBlocked` 闭包；
handler 不看命令所在会话的 `agent.session.header.cwd`。启动无 workspace 时 `workspace=''`，
即使会话 cwd 是有效公司盘，命令也直接早退（`dataBlocked`）。
写命令（`/deliverables`、`/cultivation`）确实需要 lease，不能同样放开；只读面应能用会话 cwd。

## 暴露的失败类

**启动态与命令会话态混用**：全局 writer 状态被当成所有命令的读权限。只读命令应只依赖
「有没有一个可解析的 workspace」，写命令才依赖 lease/初始化。同型检查：其他只读命令（如有）
是否也被 `dataBlocked` 早退。

## 复现

1. `DSH_COMPANY_HOME=/tmp/definitely-not-a-company-workspace` 起 web（dev home + company profile）。
2. `session/create(cwd=company-workspace)`，`commands/execute`：
   `/req check 2026-11-10-probe-cmd-business-software` → 修前 dataBlocked；修后 success
   （层 MRD/StRS/PRD、动议类型 business-software）。
3. 同一 web 用有效 `DSH_COMPANY_HOME` 重启 → success（对照组）。
4. 证据：2026-11-10/11 探索轮；fixture 留在 dev `company-workspace` 作复跑样本。

## 修复关联

- 新增 `packages/company-pack/src/host/commands/command-workspace.ts`：
  `commandWorkspace(options.workspace, agent)` = 启动 workspace 优先，否则 `agent.session.header.cwd`。
- `req-command.ts` / `prd-command.ts`：handler 接收 `agent`；只在 workspace 为空时返回停写/未指定；
  不再按 `dataBlocked` 早退。`resolveDeliverablePath` 与 `resolveProductType` 用该 workspace。
- 写命令（`deliverables-command.ts`、`cultivation.ts`）**不改**：仍走 `dataBlocked`/lease。
- 测试：两条命令 spec 加「dataBlocked + 会话 cwd 有效 → 只读仍可跑」；原有 dataBlocked 用例改成
  `workspace=''`（无会话 cwd）→ 仍停写。

## 已修判定

- `dataBlocked=true` + 会话 cwd 是有效 workspace → `/req check` / `/prd check` 正常回执（不写盘、不取 lease）。
- 无 workspace 且无会话 cwd → 仍返回停写/未指定（BUG-058 的原因文案保留）。
- `/deliverables` / `/cultivation` 的停写行为不变；picker 后写命令仍需重启。
- 两命令 spec 红→绿；`pnpm verify` / `pnpm test` / `pnpm typecheck` 绿；真入口复跑通过。

## 修复证据（2026-11-10/11）

- **红**：把 `if (options.dataBlocked) return blocked` 临时放回两 handler → 新用例 **2 failed**
  （`expected 'error' to be 'success'`）；移除后 **22 passed**。
- **绿**：两 spec 22 passed；真入口 `DSH_COMPANY_HOME=/tmp/nonexistent` + 会话 cwd=`company-workspace`
  → `/req check` success（修前同一路径 dataBlocked）。
- **残留**：真正的 GUI picker 点击未自动化（本卡证的是 picker 会话的命令路径）；写命令仍需重启
  （全量 re-init 未做，见 Note 的「输掉的方案」）。
