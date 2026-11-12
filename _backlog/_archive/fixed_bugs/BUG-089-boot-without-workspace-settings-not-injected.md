---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-089：host boot 无 workspace 后补选/用会话 cwd 设的策略，回执说「下一轮生效」但 section 根本没注册

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A3/A4 / H7）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

host 启动时没有 workspace（`DSH_COMPANY_HOME` 指向不存在的目录，dataBlocked；见 BUG-060 的补选路径）。之后在侧栏选一个会话 workspace（本机实测 cwd `/…/b-no-ws`），执行：

```
/company-settings set productType hardware-software
→ 已设置 productType = hardware-software；下一轮生效。
/company-settings show
→ 当前：productType=hardware-software, ...
```

文件确实写到会话 cwd 的 `.dsh-company/startup.json`；但下一轮的真实 `system/message` **没有** `本项目的启动策略` 段（20,685 字符，与全自动同长；有段时是 20,880）。

根因是 `registerStartupSettings(ctx, workspace)` 只在 `apply` 时 `hasWorkspace` 为真才调用（`src/index.ts:135`）；启动时无 workspace 就再也不会注册。命令的 `commandWorkspace` 却会回退到会话 cwd，所以「写成功 + 回执说下一轮生效」和「模型看不到」同时成立。用户只有重启 host 才可能恢复。

## 根因（假设）

- 注册面把 workspace 当成 **boot 常量**；workspace 补选（BUG-060 路径）没有触发 `registerStartupSettings`。
- 命令面把 workspace 当成 **按 agent 解析**（`commandWorkspace` 回退 cwd），两者生命周期不同。
- 回执统一写「下一轮生效」，没有区分「section 已注册」与「需要重启」。

## 暴露的失败类

**注册面与写入面对 workspace 的生命周期不一致**：boot 时决定一次注册，之后 workspace 才出现；写路径却能工作。同类：任何「boot 时固定注册、运行时可补选 workspace」的 section/工具都可能静默不生效。

## 复现

1. 用一份没有 workspace 登记的 home 起 host；`DSH_COMPANY_HOME` 指向不存在的目录，`DSH_COMPANY_BOOTSTRAP=if-missing`。
2. `session/create { cwd: '<存在的临时 workspace>', agentPreset: 'ceo' }`。
3. `commands/execute`：`/company-settings set productType hardware-software`；读回 `show` 与文件。
4. 发一条 prompt；读 `system/message`：`startup=false`、`product=false`、长度 20,685（无段）。
5. 重启 host（同一 workspace）后再发 prompt：段出现（B7 冷恢复实测 20,880）。

证据：`runtime/tmp/b7-nows.mjs`、`runtime/tmp/b7-nows-result.json`（gitignored）；session `session-e941a972-6f00-4094-86ca-3600a7bb5fda`。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- `registerStartupSettings` 不再依赖 boot 的 `hasWorkspace`：无条件注册 `agent/created` 监听，在创建时按该 agent 的会话 cwd 解析 workspace（`startupWorkspace`）并注册 section。
- section 的 `text` 是 live thunk，每次 assembly 重读该 workspace 的 `startup.json`；命令写入同一 workspace，所以回执的「下一轮生效」成立。
- per-agent WeakSet 保留（重复 `agent/created` 不重复装）；support 仍跳过；无 cwd 且无 boot workspace 时不注入空段。
- 验收：boot 无 workspace → 补选 → set → 下一轮真 system/message 有段；重启后不重复；support 仍跳过；keyless spec 覆盖。

## 修复关联

- 发现于 A3/A4 的 boot-无-workspace 复现；与 H7 一致。
- 相关：BUG-060 的 workspace 补选路径；[BUG-081](BUG-081-strategy-panel-reads-session-workspace-command-writes-host.md)（同一 workspace 权威问题的另一面）。

## 已修判定

修成：host boot 没有 workspace（`dataBlocked`）时，之后在会话 cwd 里设的策略也会生效——`registerStartupSettings` 不再依赖 boot 的 `hasWorkspace`，在 `agent/created` 时按该 agent 的会话 cwd 注册 section；下一轮注入段读到同一份 `startup.json`，回执的「下一轮生效」不再是空话。

- keyless：`registerStartupSettings(ctx, '')` + 假 agent cwd 有 `startup.json` → section 注册且 `text()` 非空（含「本项目的启动策略」）；无 cwd 时不注入空段；重复 `agent/created` 不重复装。
- 真入口：无 workspace 起 host → 会话 cwd 有效 → `set productType` → 下一轮 `system/message` 含策略段；重启后不重复。
- 红配方：恢复 `if (hasWorkspace) registerStartupSettings(...)` → 注册用例红（0 section）。
- 2026-11-12 实跑：恢复 `if (hasWorkspace) register...` → apply-lifecycle 1 failed（0 section）；复原 → 4 passed。boot 无 workspace 时 agent/created 仍注册 section 并从会话 cwd 读策略。
