---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-119：lease 已判 dataBlocked 的第二个 host 仍会写 workspace 的 `startup-options.json`（startup settings 不走写 gate）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（writable/gate）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / lease 写 gate）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

第二个 host 启动时 lease 被占（`dataBlocked=true`，启动输出「公司数据已停写」）。建一个 CEO 会话后，workspace 里仍出现：

```
$WS/.dsh-company/startup-options.json
{
  "v": 1,
  "productTypes": ["business-software","hardware-software"],
  "deliveryModes": ["productized","managed-service","project-services"],
  "wikiCheck": {...}
}
```

即：lease 说「公司数据已停写」，`registerStartupSettings` 仍在 `agent/created` 时调 `options.watch.sync(workspace)`，把启动策略派生文件写进 `.dsh-company/`。`dataBlocked` 只被传给 `registerCultivation` / 命令 / `ensureRunBundle` / `initializeCatalog`，**没有传给 startup settings**。

真实后果：第二个 host 与真 writer 同时读写同一 workspace 的派生文件；writier 刚改 `startup-settings.json`，blocked host 可能用旧值重写 `startup-options.json`；如果 workspace 原来没有 `.dsh-company`，blocked host 还会创建一个。

## 根因（假设）

- `index.ts` 调 `registerStartupSettings(ctx, hasWorkspace ? workspace : undefined, {...})`，没有 `dataBlocked` 参数；`registerStartupSettings` 的 `agent/created` 回调无条件 `options.watch.sync(workspace)`。
- `startupWatch.sync` 自己也不知道 `dataBlocked`；它只按 workspace 写派生文件。
- 之前的写 gate 审计覆盖了命令/自举/成品目录，漏了 startup settings 的 per-agent 路径。

## 暴露的失败类

**写 gate 按注册点逐个传，漏一个就绕**：`dataBlocked` 是 host 级事实，但每个注册面自己收/不收；新增或旧的 per-agent 写路径（startup settings、watcher）没有统一 gate。需要「公司盘写操作」的统一守卫，而不是每个调用点自己记得。

## 复现

```sh
node runtime/tmp/newbugs-blocked-startup.mjs
```

2026-11-13 原始输出：

```
session undefined options exists true
options { "v":1, "productTypes":[…], "deliveryModes":[…], "wikiCheck":… }
```

（`session undefined` 是脚本没解出 id，不影响；host 已 boot，lease 被占，options 文件被写。）

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `registerStartupSettings` 接收 `writable: boolean`/`dataBlocked`；`agent/created` 时 `writable===false` 只装 section（读），不调 `watch.sync`、不布 watcher。
- 或统一写 gate：`withCompanyWrite(workspace, fn)` 先校验 lease token/`dataBlocked`，所有 `.dsh-company` 写都走它；startupWatch 是第一个迁移者。
- 若产品认为 startup-options 是「非权威派生、可写」，也要在 lease 文案里排除它，并保证它不会创建公司盘；当前文案说「公司数据已停写」。
- spec：lease blocked + `agent/created` → 不写 options、不创建 `.dsh-company`；真 writer → 正常写。

## 修复关联

- 发现于 C3 lease 写 gate 回归；与 [BUG-115](BUG-115-lease-takeover-no-fencing-old-writer.md) 同属 lease 边界，但本卡是同 home 第二 host 的写 gate 漏点。
- 相关：`src/index.ts` 的 `registerStartupSettings` 调用；`src/host/startup/startup-prompt.ts` / `startup-watch.ts`。

## 已修判定

修成：`registerStartupSettings` 收 `writable`，index 传 `!dataBlocked`；false 时只装只读 section，不 `watch.sync`；`writeCompanyAtomic` 的写 gate 再兜底。
- keyless：writable=false + agent/created → sync 0 次、section 仍装；红证：写 gate blocked → `CompanyWriteBlockedError`。
