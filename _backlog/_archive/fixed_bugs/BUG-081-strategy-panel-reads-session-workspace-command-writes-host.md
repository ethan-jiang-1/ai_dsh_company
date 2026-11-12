---
status: 已修
severity: P1
opened: 2026-11-12
---

# BUG-081：会话 cwd 与 host workspace 不同时，策略面板读会话盘、命令写 host 盘——保存成功但面板永远不认

> 严重级别：P1（重要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A3 / H6）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

在一个 cwd ≠ host workspace 的公司会话里：

- 面板通过 `workspaceFiles`（按**会话**的 workspace 解析）读 `.dsh-company/startup.json`，显示会话盘的值；
- `/company-settings set …` 通过 `commandWorkspace(options.workspace, agent)` 优先用 **host workspace**，写的是另一份文件；
- 命令回执说「已设置 …；下一轮生效」，但面板重新读会话盘仍是旧值；`/company-settings show` 也读 host 盘，与面板显示不一致。

用户看到的是：在 A 项目里选「交付模式 = project-services」，回执成功；面板仍显示 A 项目原来的值/自动；实际改的是 host 的 B 项目策略。**A 项目文件没有被改，B 项目文件被静默改了。**

## 根因（假设）

两条读/写路径在 workspace 选择上不一致：

- **客户端读**：`readWorkspaceText` → `remote.workspaceFiles.read(leadOf(sessionId), path)`；`workspaceFiles` 按会话 header 的 cwd 解析 workspace root（`src/client/cultivation/cultivation-data.ts:72`，`src/client/index.ts:155-158`）。
- **命令写**：`commandWorkspace(workspace, agent)` 在 `workspace !== ''` 时**永远**返回启动 workspace，只有它为空才退回会话 cwd（`src/host/commands/command-workspace.ts:21-25`）。
- 面板与命令都声称操作「这个项目」的 `.dsh-company/startup.json`；同一份合同没有规定「项目」= 会话 cwd 还是 host workspace。

## 暴露的失败类

**同一份 workspace 级状态有两个 workspace 解析**：读走会话、写走 host，且没有一致性校验/告警。任何「会话 cwd ≠ host workspace」的入口（侧栏 workspace picker、外部 workspace、测试/排练盘、多个项目共用一个 home）都会命中。修复方向需要产品拍板「谁是权威」，不能只改一侧。

## 复现

1. 起隔离 company 实例（本次 `runtime/tmp/ui-scene-nxXILe`，host workspace = `…/home/company-workspace`）。
2. `session/create { cwd: '/tmp/explore-other-ws', agentPreset: 'ceo' }`；在 `/tmp/explore-other-ws/.dsh-company/startup.json` 写 `productType: hardware-software`。
3. 对会话执行 `/company-settings set deliveryMode project-services`。
4. 实测（2026-11-12）：

```
HOST  company-workspace/.dsh-company/startup.json:
  productType=null, deliveryMode=project-services, updatedAt=2026-11-12T12:53:39.200Z

OTHER /tmp/explore-other-ws/.dsh-company/startup.json:
  productType=hardware-software, deliveryMode=null, updatedAt=seed

workspaceFiles/read (同一会话) → OTHER 文件（hardware-software / deliveryMode=null）
/company-settings show          → HOST 文件（deliveryMode=project-services, productType=auto）
```

5. 结论：面板读到的与命令写到的不是同一份；保存回执为 success。会话 id = `session-fe8ccdc1-b87a-4642-9adf-3ba7dda62614`；证据脚本 = `runtime/tmp/rpc-explore.mjs`（gitignored）。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- 已拍板：**启动策略跟随会话所在项目**（Lead 会话 cwd；子会话继承 parent cwd），boot workspace 只在会话没有 cwd 时回退；面板已经按 Lead 读，命令与注入改齐。
- `SettingsCommandOptions` 的 workspace 改为经 `startupWorkspace(boot, agent)` 解析；`registerStartupSettings` 的 section 文本也用它，三处消费同一个函数。
- `/req`、`/prd` 的 `commandWorkspace` 不动（公司数据根 ≠ 项目策略根）；它们的既有语义见 2026-11-10 只读命令 Note。
- 加一条 keyless spec：同一会话 cwd ≠ host workspace 时，读、写、`show`、注入四处指向同一文件。

## 修复关联

- 发现于 A3；与 H6 一致。
- 相关合同：[`docs/contracts/profile.md`](../../../docs/contracts/profile.md) 的 startup 段（workspace 级）。
- 本卡不修；修复涉及 host 命令面（材料性）时按章程请示。

## 已修判定

修成：同一会话 cwd ≠ host workspace 时，面板读、`/company-settings set|show`、`company:startup-settings` 注入段、派生选项四处都指向**会话 cwd 那一份** `.dsh-company/`；host workspace 只在会话没有 cwd 时回退。写回执的「下一轮生效」与 section 的 workspace 解析是同一个函数，不再各说各话。

- keyless：`startupWorkspace(boot, agent)` 的 cwd 优先 / 回退两态；命令 handler 在 cwd≠boot 时写 cwd 文件、`show` 读回同一文件、host 文件不变；section 的 `text()` 读同一 cwd 文件（真临时盘 + 假 agent/ctx）。
- 真入口：host workspace 与 session cwd 不同的隔离实例里 `set deliveryMode`，`show` / 面板 / 注入读同一份；host 盘不被改。
- 红配方：把 `startupWorkspace` 改回 boot 优先 → 命令/section 的 cwd 用例红。
- 2026-11-12 实跑：把 `startupWorkspace` 改回 boot 优先 → 3 failed（lib/prompt/command 的 cwd 用例）；复原 → 42 passed。真装配（apply-lifecycle）与命令/注入读同一文件。
