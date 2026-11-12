---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-120：startup settings 的 per-agent workspace 不做危险落点校验；会话 cwd 是 tmpdir 时会在 `/var/folders/.../T` 写 `.dsh-company/startup-options.json`

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（危险 cwd）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / startup 写路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

G7 已经把 `/`、`homedir()`、`tmpdir()`、`/tmp`/`/private/tmp` 定为危险落点，workspace 解析会拒绝它们。但 **startup settings 的 per-agent workspace** 直接返回会话 cwd：

```ts
startupWorkspace('/ws', { session: { header: { cwd: tmpdir() } } })
→ /var/folders/…/T
isDangerousRoot(tmpdir()) → true
```

`registerStartupSettings` 的 `agent/created` 回调随后 `options.watch.sync(workspace)`，会写：

```
<tmpdir>/.dsh-company/startup-options.json
```

即：一个公司角色会话只要 cwd 是 tmpdir（或 `/tmp`、OS home），启动策略派生就会在危险落点创建公司状态目录；G7 的「危险根不是项目」只覆盖 `resolveWorkspace`，没有覆盖 startup settings。

## 根因（假设）

- `startupWorkspace` 只做「会话 cwd 优先，否则 boot workspace」，不 `validateCompanyHome`、不 `isDangerousRoot`。
- `StartupOptionsWatch.sync` 也不校验，直接 `mkdir`/写；`registerStartupSettings` 没有 dataBlocked/writable 参数（BUG-119 同族）。
- BUG-081/089 为了「多 workspace 按会话 cwd」放宽到任意 cwd，但没有把 G7 的危险根判据接回来。

## 暴露的失败类

**「按会话 cwd」被当成「任意 cwd 都是项目」**：多 workspace 支持需要 cwd，但 cwd 仍要过落点校验；否则公司状态/派生文件会写进操作系统临时根、home 根等。危险根判据只在一处解析里用，别的写路径各自放行。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-startup-danger.mts
```

2026-11-13 输出：

```
tmpdir /var/folders/0_/…/T dangerous true
startupWorkspace boot=/ws agent=tmpdir -> /var/folders/0_/…/T
would write /var/folders/0_/…/T/.dsh-company/startup-options.json
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `startupWorkspace` 对 cwd 做 `isDangerousRoot`/`validateCompanyHome`；危险 cwd 回退 bootWorkspace 或返回空（不写，面板显示「当前会话 cwd 不是项目」）。
- `StartupOptionsWatch.sync` 入口再 defense-in-depth 校验一次；不要只靠调用方。
- `registerStartupSettings` 与 BUG-119 的 writable gate 合并：危险/blocked 时只读 section，不 `watch.sync`。
- 加 spec：tmpdir / `/tmp` / homedir / 根 / 子目录（允许）/ boot fallback。

## 修复关联

- 发现于 C3 startup 写路径回归；与 [BUG-095](BUG-095-workspace-resolution-accepts-tmp-root.md)（G7 workspace 解析）和 [BUG-119](BUG-119-lease-blocked-host-writes-startup-options.md)（startup 写 gate）同族。
- 相关：`src/lib/startup-settings.ts` 的 `startupWorkspace`；`src/host/startup/startup-watch.ts`；`src/host/startup/startup-prompt.ts`。

## 已修判定

修成：新增 `resolveStartupWorkspace`，会话 cwd 过 `isDangerousRoot`；危险 cwd 回退 boot，boot 也危险则空；startup-watch 入口再判一次。
- keyless：cwd=tmpdir/根 → 回退 `/ws`；boot+cwd 都危险 → 空；红证：直接返回 candidate → 2 failed。
