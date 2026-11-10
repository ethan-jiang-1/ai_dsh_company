# 观察窗启动快序列：步骤归 demo.md §前置，交付启动保持同形安装

状态：implemented（2026-11-05）

## 决定

1. **快序列写进 [demo.md §前置](../../docs/contracts/demo.md#前置本机)**——观察窗启动步骤与判据的规则 owner（skill 与
   [dev-loop §1](../../docs/guides/dev-loop.md#1-执行链从授权到有证据交接) 都指向它）。不新建文档、不改进程技能。
2. 快序列 = 预检遗留 writer lease → 后台起服务**不等进程结束**（横幅出现即用）→ `cdp-probe` 只跑一次并与
   `client-load-smoke` 并行 → 已在跑的本仓实例优先复用。
3. **提速不换安装路径**：交付启动一律走默认同形安装（tsc/tsdown → `npm pack` → `plugin add file:`，模拟用户安装），
   `--link` 只留给改 presets 的调试；home 固定为 `run/env.sh` 选定的隔离 dev home，不用日用 `~/.dsh`。

## 输掉的方案

- **改 web-window-ops skill**（我最初提议）：用户 2026-11-05 明确否掉（“不要弄 SKILL”）——skill 管完成定义，
  启动步骤的规则 owner 已在 demo.md；两处写步骤必漂。
- **加进 [budget-and-ops §3](../../docs/guides/budget-and-ops.md#3-demo-运维-runbook症状--动作) 症状表**：那张表管现场
  突发症状；启动慢是步骤顺序问题，写进去会复述步骤，造成第二份事实。
- **用 `--link` 换速度**：能省 build/pack/add 的几秒，但不验打包面；用户要求“模拟用户安装启动”，交付启动不能用调试通道。

## 后果

- 启动程序只有一个家 = demo.md §前置；runbook 与 skill 只做路由与完成定义。
- 常驻服务用“等进程结束”的方式取输出会把就绪的 URL 白等掉；快序列把这段等待删掉，墙钟大头只剩并行后的验证。

## 验证

实测（2026-11-05，本会话会话日志的 zstd JSONL 时间戳；命令 = `zstd -dc <session>.jsonl.zstd` 后逐条取 `time`）：

- boot 命令 07:26:04 → 横幅日志 07:26:13：**9s**（含 tsc + tsdown + `npm pack` + `plugin add` + 起服务）。
- `job_output(wait:true)` 07:26:06 → 07:27:39 才返回：URL 已就绪 **86s** 后才被读到（常驻服务不结束，等到 90s 超时）。
- 验证串行：`cdp-probe` 15s ×2（重复）、`client-load-smoke` 17s = 32s；并行后墙钟 = 17s。
- `pnpm verify`：全绿（含 doc-budget 与 md-links）；文档超限时该门禁的红形态 = `行数超上限`，本次未触发。
- **2026-11-05 快序列实跑**（停旧实例后同 home 重起）：停旧 3s（端口关闭 + lease 释放）；boot **8.0s**
  （t0 → 横幅，150ms 轮询；其中构建+打包 **4.7s**、服务启动 **3.3s**，按启动日志落盘时间戳拆分）；并行验证
  **13.7s**（单跑 probe 15.1s / smoke 11.3s，被 probe 卡住；probe 9 页签零失败、console 零；smoke ALL PASS）；
  机器段合计 **21.7s**；从用户发话到全绿 **~73s**（差额 = 模型往返与取 token）。
