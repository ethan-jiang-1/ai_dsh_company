---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-082：wiki 目录搬走后，策略面板仍显示「可写 / 只读」；`show` 与注入已说失效

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A2 / H3）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

1. `.dsh-company/startup.json` 的 `wiki` 指向一个存在的目录（本机实测 `/tmp/explore-wiki`，带 `index.md`，workspace 外）。
2. `.dsh-company/startup-options.json` 的 `wikiCheck` = `{ok:true, location:'outside'}`（boot 或上次写设置时派生）。
3. 打开右栏「策略」：wiki 行显示 **「在 workspace 外：角色只读」**，没有失效提示。
4. 把 `/tmp/explore-wiki` 删掉，重新打开面板（另一页签 → 策略）：仍然显示 **「在 workspace 外：角色只读」**。
5. 同一时刻 `/company-settings show` 返回：

```
wiki=/tmp/explore-wiki（⚠ 失效：目录不存在）
```

注入段每次 assembly 现查盘，也会说失效；只有面板还相信派生文件里的旧 `wikiCheck`。

## 根因（假设）

`wikiCheck` 只在 `refreshStartupOptions` 时重算（host boot + 每次写设置；`src/host/startup/startup-store.ts:150`），面板只在 mount / 自身保存后 `loadStartup`，**没有刷新入口、没有周期读、也没有在打开面板时重算**。`startupRows` 只信 `options.wikiCheck`（`src/lib/startup-settings.ts:261-276`），所以过期结论会一直显示到用户再改一次设置或重启 host。

Note 把它写成「短暂显示旧结论，直到下一次刷新」，但代码里没有「下一次刷新」的触发面；用户视角是**无限期**的。

## 暴露的失败类

**派生状态没有新鲜度契约**：`show` / 注入是活读，面板是快照；同一合同却宣称「面板与 `show` 都点名失效原因」。凡是有盘上事实（目录存在、文件内容）的派生字段，都要在读取处明确「何时重算 / 失败时显示未知」，不能让快照冒充当前值。

## 复现

1. 隔离 company 实例（本次 `runtime/tmp/ui-scene-nxXILe`）。
2. 写 `startup.json` = `{wiki:'/tmp/explore-wiki', ...}`；写 `startup-options.json` = `{wikiCheck:{value:'/tmp/explore-wiki',ok:true,problem:null,location:'outside'}, ...}`。
3. cdp-probe `--steps`：点「待办」→ 点「策略」→ `waitText 项目策略`；`body-out` 含「在 workspace 外：角色只读」。
4. `rm -rf /tmp/explore-wiki`；重复第 3 步；`body-out` 仍是「在 workspace 外：角色只读」。
5. `commands/execute /company-settings show` → `⚠ 失效：目录不存在`。

证据：`runtime/tmp/stale-before.txt`、`runtime/tmp/stale-after.txt`、`runtime/tmp/rpc-show.mjs` 输出（gitignored）；实例 = `runtime/tmp/ui-scene-nxXILe`。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- `wikiCheck` 加 `checkedAt`；host 在 wiki 指针盘上变化时重算并重写派生文件（watch 指针目录 + 最近存在祖先；删除/改名/index 变化都触发），面板重新打开读到的是新检查而不是快照。
- 面板只在「检查值 == 当前 `settings.wiki`」且 `checkedAt` 非空时显示可写/只读/失效结论，并标「上次检查 …」；值不匹配或无时间戳时显示「还没检查」，不谎报可用或失效。
- watch 不可用（权限/平台）时只剩时间戳与「未检查」态，仍不冒充当前值；不把每次读写成 `command/run`。
- 修后验收：删目录 → 重新打开面板 → 明确说失效 + 原因；`show` / 注入 / 面板三处一致；keyless spec 覆盖「过期 check 不显示为可用」。

## 修复关联

- 发现于 A2；与 H3 一致。
- 合同：[`docs/contracts/profile.md`](../../../docs/contracts/profile.md) 的 wiki 段（面板与 `show` 都点名失效原因）。
- 本卡不修；如修复涉及 host 读面/前端文案（材料性）按章程请示。

## 已修判定

修成：`wikiCheck` 带 `checkedAt`；host 在 wiki 指针盘上变化（目录/index 删除、改名、出现）时重算并重写派生文件；面板只在检查对得上当前 `settings.wiki` 且有 `checkedAt` 时给出「可写/只读/失效 + 原因」，并标「上次检查 …」，不再拿快照冒充当前值。

- keyless：`checkedAt` 序列化/解析；假 watch 端口触发删除事件 → 派生文件 `ok:false` + `problem:'missing'` 且 `checkedAt` 更新；值不匹配/无 `checkedAt` 时面板行不显示可用或失效结论，显示「还没检查」。
- 真页面：删 wiki 目录 → 重开面板 → 显示「目录不存在」+ 检查时间；`show` / 注入段同样说失效。
- 红配方：去掉删除事件的重算回调 → 派生文件仍 `ok:true` 的用例红；去掉 `checkedAt` 门槛 → 面板「谎报可用」用例红。
- 2026-11-12 实跑：去掉 watcher 重算 → 2 failed；面板 `checkCurrent` 恒真 → 2 failed；复原 → 12 passed。`checkedAt` 往返 + 假 watcher 删目录 → 派生文件 invalid。
