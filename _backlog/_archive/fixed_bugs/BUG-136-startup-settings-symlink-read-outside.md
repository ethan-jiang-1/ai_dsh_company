---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-136：`startup.json` / `startup-options.json` 是 symlink 时读路径跟随读 workspace 外 JSON，外部设置直接生效

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（startup 读）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / startup 读路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/startup.json` 指向 workspace 外 JSON：

```ts
symlinkSync(outside, ws/.dsh-company/startup.json)
readStartupSettings(ws)
→ { v:1, productType:'business-software', deliveryMode:'project-services',
    wiki:'../../outside', updatedAt:'2026-01-01T00:00:00.000Z' }
```

`readStartupSettings` 直接 `readFileSync`，跟随 symlink；外部 JSON 被当作项目策略：
- 注入 section 按外部 productType/deliveryMode/wiki 渲染；
- `/company-settings show` 显示外部值；
- `startupWatch.sync` 用外部 wiki 布 watcher。

`readStartupOptions` 同样跟随 symlink（面板可显示外部可选项）。写路径 `writeAtomic` 的 rename 会替换 symlink（写安全），但读路径先信了外部内容。S2 的 safe-file 没覆盖 startup 读写。

## 根因（假设）

- `readStartupSettings` / `readStartupOptions` 用 `readFileSync`，没有 `plainFileProblem(workspace, path)` 的 lstat 非 symlink/residency。
- `startupSettingsPath` 只拼路径，不知道信任根。
- startup 是「项目策略」；workspace 可写，symlink 可用；读面必须与 final/meta 同一 safe-file 判据。

## 暴露的失败类

**设置读路径不校验文件形状**：写用 rename 替换 symlink，读却跟随；同一个文件在两个方向策略不一致。读面 safe-file 要覆盖所有用户可写设置文件，不只是交付物。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-startup-symlink-read.mts
```

2026-11-13 输出：

```
{"v":1,"productType":"business-software","deliveryMode":"project-services","wiki":"../../outside","updatedAt":"2026-01-01T00:00:00.000Z"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `readStartupSettings` / `readStartupOptions` 用 `plainFileProblem(workspace, path)`：symlink/outside → 视为 corrupt/unreadable（不读），给「startup.json 是 symlink，未采用」的告警。
- `readStartupOptions` 用 `readTextInside`/同判据；`startupWatch.sync` 不据外部值布 watcher。
- 与 BUG-123（corrupt 静默 auto）一起做：symlink/corrupt 都进 `problem` 面，不静默 auto。
- 加 spec：startup.json/options symlink→外部、symlink→内部、普通文件、目录；show/注入不采用外部值。

## 修复关联

- 发现于 C3 startup 读路径回归；与 [BUG-123](BUG-123-startup-json-corrupt-silent-auto.md)（corrupt 静默）和 [BUG-135](BUG-135-catalog-index-symlink-read-outside.md)（catalog 索引 symlink 读）同族，但本卡是 startup 设置。
- 相关：`src/host/startup/startup-store.ts` 的 `readStartupSettings` / `readStartupOptions`。

## 已修判定

修成：startup 读面用 `readStartupSettingsState`/`readStartupOptionsState`，symlink/目录 → unsafe，不采用外部值；`show`/注入按问题提示。
- keyless：startup.json symlink→外部 productType → problem=unsafe、settings 为空；红证：HEAD startup-store → 2 failed。
