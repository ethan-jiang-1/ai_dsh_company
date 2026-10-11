---
name: web-window-ops
description: Use when starting the web observation window, doing live operations during a demo, or before presenting a running instance to the user, to run the boot-and-verify sequence — env isolation, pnpm dsh web, token URL from the startup banner, the zero-mount-failure smoke — and to act on the live symptom-to-action runbook.
---

# 观察窗启动与现场运维

**启动口令约定**：在本仓库上下文中，用户说“启动一下这个插件”“启动一下这个”或“把这个跑起来”，默认就是启动当前 Dream Team company pack 的独立 DSH Web 环境。直接执行本技能的启动与验证步骤；不要把 3080 当作运行口，也不要等待用户重复说明“Web、隔离环境、新端口”。完成启动后交付新 DSH 进程的带 token URL；除非用户明确要求，不自动创建会话或运行 demo。

适用：起观察窗、demo 现场运维、给用户呈现运行实例前（呈现即验证——先自己跑通，全绿才呈现）。
规则 owner：启动步骤与判据 = [docs/demo.md §前置](../../../docs/demo.md#前置本机)；现场症状→动作表 = [docs/guides/budget-and-ops.md §3](../../../docs/guides/budget-and-ops.md#3-demo-运维-runbook症状--动作)；呈现即验证规则 = [dev-loop §1](../../../docs/guides/dev-loop.md#1-执行链从授权到有证据交接)。

## 步骤

1. `source run/env.sh`——新 shell 必须；不 source = **静默**落日用 home。自检代替警告：`pnpm dsh --profile web --dump-config | grep -c company-pack` ≥ 1。
2. `pnpm dsh web -- --port 0 --no-open`——端口与 token URL 从启动横幅读（端口是环境状态，不是仓库事实）。
3. 零挂载失败冒烟：`node checks/smoke/client-load-smoke.mjs`——断言什么、前置与成本见[脚本头注](../../../checks/smoke/client-load-smoke.mjs)。
4. 现场出状况 → 按 [budget-and-ops §3](../../../docs/guides/budget-and-ops.md#3-demo-运维-runbook症状--动作) 症状表行动；**3080 是本 GUI 永不动**。
