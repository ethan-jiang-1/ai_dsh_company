---
状态：implemented（2026-10-28，第四轮 D6：客户端错误诊断通道）
---

# D6：浏览器错误经 host 诊断命令落盘，agent 可以 read

> 上游 = [第四轮六维打扫卡](../../_backlog/_archive/settled_issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告 D6-01](../../_backlog/_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。
>
> **2026-10-28 数据设计硬化 M1 部分取代落点**：日志迁 `$DSH_HOME/logs/company-client-errors.log`
> （旧 `cultivation/client-errors.log` 只读留一版）；命令/脱敏/不写会话事件的决定保留。见
> [RFC](../proposed/2026-10-28-data-design-hardening.md)。

## 决定

1. **新增 `/company-diagnostics client-error <URI-encoded JSON>` host 命令**：只接受 `client-error` 前缀，按字段白名单收 `kind/message/stack/at/href`，长度有界、token URL 脱敏，追加到 `<DSH_HOME>/logs/company-client-errors.log`（旧公司盘路径只读保留一版）。
2. **client 错误环加 reporter**：`installErrorCapture(target, ring?, onEntry?)`；client apply 注入 reporter，取当前 mainView 会话，1s 节流，经 `remote.commands.execute` 调上述命令；无会话时跳过，reporter 抛错不影响环。
3. **错误文本脱敏**：错误环的 message/stack/href 在入环前就把 `token=` 值替换为 `<redacted>`；host 命令再脱敏一次。
4. **文档边界**：仍**不写会话事件**（不冒充模型可见上下文）；agent 用 read 看 `$DSH_HOME/logs/company-client-errors.log`。运维表补了这条读法。

## 输掉的方案

- **`remote.workspaceFiles` 写文件**：拒绝。该 remote 只有 stat/read/list/changes，没有写方法；为它自造 vendor 机制违反本仓「不发明」。
- **新建 session 事件类型**：拒绝。需要 vendor 合同改动，超出产品仓边界。
- **只做“复制诊断”按钮**：拒绝。它只能靠人粘贴，不解决 agent 主动读；命令 + 公司盘日志是更直接的通道。
- **每错必发命令**：拒绝。渲染循环会刷屏；1s 节流 + 环去重 + 50 条上限。

## 后果

- 用户报“刚才页面报错了”后，agent 可以 `read $DSH_HOME/logs/company-client-errors.log` 看到错误原文、堆栈与页面 URL（token 已脱敏），不再只能重开新页。
- 该通道不改变会话事件；`diagnose` 不会因此多出一类事件。
- 新增一条用户可见命令；host-composition 的注册面名单从 2 命令变 3 命令（测试同步）。
- 2026-10-28 数据设计硬化 M1：日志离开公司盘、进宿主 `logs/`，单文件 256 KiB 轮转 `.1`；旧路径只读保留一版。

## 验证

- `tests/client/error-ring.spec.ts` → 4 passed；新增 reporter 脱敏 + reporter 抛错不影响环。
- `tests/company/host-composition.spec.ts` → 5 passed；真实 apply 注册 3 工具 + 3 命令，执行 `company-diagnostics` 后日志含 `页面 boom`、不含 `SECRET`。2026-10-28 M1 后 → 6 passed（新 home logs 路径 + 256 KiB 轮转）。
- `pnpm test` → **110 files / 976 tests**；`pnpm verify` → ALL PASS；`pnpm typecheck` → exit 0。

## 附：observer 生产接线

- 新增 `installAttentionObservers(ctx, attention)`（`attention-observers.ts`），client apply 只调这一行；spec 用假 ctx 验证它真的把两个 handler 挂到注入的 remote 上，并走通 next() 销账。
- `attached` 仍不是 whole-client 派发错误的端到端；纯接线函数已有行为级 spec。

## 未验 / 边界

- client apply 的 reporter 接线未在 whole-client 里端到端触发（host 命令与环分别有测试）；下一轮可补一个 whole-client 派发错误的用例。
- 错误环只覆盖 `error`/`unhandledrejection`/`console.error`；React error boundary 之外的静默逻辑错误仍无信息。
- 日志是宿主 `logs/` 下的普通文件，不是审计账本；单文件 256 KiB 轮转 `.1`，更长的保留策略仍归人工。
