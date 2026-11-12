---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-121：`dataBlocked` 的 host 仍能 `/company-settings set` 写 `startup.json` + 重派生 options；命令只在「无 workspace」时用 blocked 文案

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（dataBlocked）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / lease 写 gate）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`SettingsCommandOptions` 有 `dataBlocked`/`blockedReason`，但 handler 只在 `workspace === ''` 时使用它：

```ts
const workspace = startupWorkspace(options.workspace, agent)
if (workspace === '') {
  return { kind:'error', text: options.dataBlocked ? blockedCompanyText(...) : noWorkspace }
}
// dataBlocked 且 workspace 非空 → 继续 read/write
```

在 lease 被占、`dataBlocked=true` 的 host 上执行：

```
/company-settings set productType business-software
→ success「已设置 productType = business-software；下一轮生效。」
→ 写入 <WS>/.dsh-company/startup.json（实测存在）
→ refreshOptions → startup-options.json
```

即：host 启动时已报「公司数据已停写」，人命令仍能改项目策略（并且 `refresh` 会再写派生文件）。`dataBlocked` 只挡了「没有 workspace」的路径，没挡写。

## 根因（假设）

- handler 把 `dataBlocked` 当成「无 workspace 的错误文案来源」，没有作为**写 gate** 在 workspace 解析之后立即返回。
- `show` 是只读，可以放行；`set`/`reset` 必须拒绝。
- `refreshOptions` 回调没有 `writable` 参数；生产 watcher 也会写（BUG-119/120 同族）。

## 暴露的失败类

**写 gate 被当成「文案开关」**：`dataBlocked` 只在错误分支用，没有成为所有写命令的前置。命令注册面收到事实，但 handler 自己决定用在哪——新增/旧命令容易漏。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-settings-blocked.mts
```

2026-11-13 原始输出：

```
result {"kind":"success","text":"已设置 productType = business-software；下一轮生效。"}
settings exists true
{ "v":1, "productType":"business-software", ... }
```

（脚本注入 `dataBlocked:true` + 非空 workspace；`refreshOptions` 用 no-op，证明写发生在 handler 本身。）

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- handler 在解析 workspace 之后：`if (options.dataBlocked) return { kind:'error', text: blockedCompanyText(...,'设置') }`，仅对 `set`/`reset`；`show` 只读可放行（或也 blocked 文案）。
- `refreshOptions` 只在写成功后调用；生产 watcher 接收 `writable`/`dataBlocked`。
- 与 BUG-119/120 合并成统一 `withCompanyWrite` gate；命令、watcher、catalog 都走同一判据。
- spec：`dataBlocked:true` + `set`/`reset` → error 且文件字节不变；`show` 仍可读；`dataBlocked:false` 正常写。

## 修复关联

- 发现于 C3 写 gate 回归；与 [BUG-119](BUG-119-lease-blocked-host-writes-startup-options.md)（watcher 写）和 [BUG-120](BUG-120-startup-settings-dangerous-session-cwd.md)（危险 cwd）同族，但本卡是**人命令**的 handler 漏 gate。
- 相关：`src/host/commands/settings-command.ts` 的 `registerSettingsCommand`。

## 已修判定

修成：settings 命令在解析 workspace 后，`set`/`reset` 若 `dataBlocked` 立即返回 blocked 文案；`show` 只读放行；写失败（目录占用等）结构化 error。
- keyless：dataBlocked set → error 且文件未写；startup.json 是目录 → 可读 error；红证：HEAD startup-store → 2 failed（含 133）。
