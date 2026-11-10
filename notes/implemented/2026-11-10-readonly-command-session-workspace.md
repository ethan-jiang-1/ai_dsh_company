# 2026-11-10 · 只读命令用会话 workspace：`/req` / `/prd` 不再被启动态 `dataBlocked` 永久挡住

状态：implemented（2026-11-10 交付；上游 = [BUG-060](../../_backlog/_archive/fixed_bugs/BUG-060-readonly-command-session-workspace.md)）
> 同机制的上游决定：[停写回执点名原因](./2026-11-10-command-blocked-reason.md)（BUG-058；本 Note 缩小它的
> 「raw session cwd 不改变命令启动态」结论：**只读**命令现在会用会话 cwd；写命令仍走停写守卫）。

## 问题

启动时没有 workspace（`DSH_COMPANY_HOME` 为空、cwd 不可用、无 saved），`prepareCompanyRuntime`
返回 `dataBlocked=true`，`/req` / `/prd` 直接返回「公司数据已停写」，即使命令所在会话的 cwd 已经
是一个有效公司 workspace（侧栏选 workspace 后的会话形状）。只读校验因此必须重启宿主才能跑。
这不是 writer 安全要求：`/req`/`/prd` **不写盘**，不需要 lease。

## 决定

1. `commands/command-workspace.ts`：`commandWorkspace(options.workspace, agent)` —— 启动 workspace
   优先；为空时退回 `agent.session.header.cwd`；都没有返回空串。
2. `/req` / `/prd` 的 handler 接收 `agent`，用上面的 workspace；**不再**按 `dataBlocked` 早退。
   没有 workspace 时才返回停写/未指定 workspace（保留 BUG-058 的原因文案）。
3. **写命令不动**：`/deliverables`（写 ledger）与 `/cultivation`（写记录/方法层）仍走 `dataBlocked`；
   picker 会话要写公司数据仍需重启（lease/初始化的正确边界）。
4. `resolveDeliverablePath` / `resolveProductType` 都用解析出的 workspace；`company.md` 回落也读会话
   workspace，而不是空串。

## 输掉的方案

- **全量 picker re-init**（在 `api-session/added` 里重取 lease、bootstrap、重注册命令/ledger/handbook）：
  这是独立性更强的功能，超出本 bug 的最小修复；且重取 lease 的时机/所有权要单独设计。先做只读面。
- **所有命令都允许用会话 cwd**：`/deliverables` 写 ledger、`/cultivation` 写方法层需要 writer lease；
  无 lease 写入会破坏 BUG-058/停写守卫的语义，不选。
- **只改文案不修行为**：BUG-058 已把文案改准（要求重启），但只读命令本不需要重启；继续让用户重启是
  可用性缺口，不选。
- **在 handler 里自己读 `agent.session.header.cwd` 两次**：路径解析/产品类型回落都需要同一个 workspace；
  抽 `commandWorkspace` 一处，避免 `/req` 与 `/prd` 各写一份。

## 后果

- 启动无 workspace、但命令所在会话 cwd 是公司 workspace 时：`/req`/`/prd` 正常返回；
  会话没有有效 workspace 时仍返回停写（原因 + 重启提示）。
- `/deliverables`/`/cultivation` 的停写行为不变；picker 后写命令仍需重启（BUG-058 的文案仍准确）。
- 只读命令不受 lease 冲突影响（读不需要 lease）；写命令仍受。
- 这是对 BUG-058「raw session cwd 不改变命令启动态」的**精确收窄**：对只读命令不成立；对写命令仍成立。

## 验证

- 红：两条命令 spec 各加「`dataBlocked` + 会话 cwd 有效 → 只读仍可跑」用例；临时把
  `if (options.dataBlocked) return blocked` 放回 handler → 两例 **2 failed**（`kind=error`）。
- 绿：移除早退后 `pnpm vitest run tests/host/commands/req-command.spec.ts
  tests/host/commands/prd-command.spec.ts` = **22 passed**。
- 真入口：`DSH_COMPANY_HOME=/tmp/definitely-not-a-company-workspace` 起 web（dataBlocked）+ 建
  cwd=`company-workspace` 的会话 → `/req check 2026-11-10-probe-cmd-business-software` **success**
  （层 MRD/StRS/PRD、动议类型 business-software）；同一 web 的合法 env 重启也 success。
- 全量：`pnpm test` / `pnpm verify` / `pnpm typecheck` / `lint` / `dup` 以收尾提交为准。

## 未验 / 未覆盖

- **真正的 GUI picker 点击**（原生目录选择器）未自动化；本 Note 证的是 picker 会话的**命令路径**
  （`commands/execute` + `agent.session.header.cwd`），不是 picker UI 本身。
- 写命令（`/deliverables`、`/cultivation`）在 picker 会话仍需重启；全量 re-init 未做。
- `agent.session.header.cwd` 在非公司会话/子目录会话的边界：只读命令会按 cwd 找
  `.dsh-company/deliverables`，找不到时返回「缺文档」，不猜盘根；是否要拒绝子目录另议。
