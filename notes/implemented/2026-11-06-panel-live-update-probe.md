# 2026-11-06 · 「面板跟不跟会话」的机器判据：cdp-probe `--watch-tab` + 绿证

状态：implemented（2026-11-06；用户报「启动后右侧公司面板（看板/依赖图/在场/任务板）不跟会话更新」，
并确认当时看的是 **CEO 根会话**——排除了「未 follow 的成员会话」这一解释）

## 决定

- `probes/browser-visual/cdp-probe.mjs` 加两枚开关：`--watch-tab <页签标题>` 与 `--watch-expect <文本>`。
  `--ask` 之前先开该页签取 **before**；轮次收口后**不刷新页面**再取 **after**（同一浏览器、同一 dock）；
  `after` 里没有 `--watch-expect` 文本 ⇒ **exit 1**，verdict 里 `watch.updated` / `watch.expectFound` 落盘。
- 页签开/读抽成 `openCompanyTab` / `readCompanyTab` 两个函数，默认页签扫描与 watch 共用一份（不复制
  Start-chip 回切与 `[data-company-tab-title]` 读法）。

## 输掉的方案

- **另写一个独立探针**：两段式导航、首启双模态、Start-chip 回切这些坑要复制一遍；探测面 copy 必然漂移，
  重复检测也会红。
- **只靠 keyless 渲染 spec**：它们喂假 store，证明不了真投影帧到没到客户端——这正是本次要证的那一环。
- **直接改客户端加轮询**：没有 before/after 之前改，等于用猜测换一个「看起来好了」；先有判据再改。

## 验证（实跑）

- `source run/env.sh && node probes/browser-visual/cdp-probe.mjs '<gui-url>' --watch-tab 任务板
  --watch-expect PANELPROBE-9001 --ask '<CEO 组队 + 建任务>' --json-out /tmp/panel-watch2.json`
  ⇒ **exit 0**，九个页签全开、`consoleProblems=[]`、`watch.expectFound=true`：
  - before（页签已打开、面板已挂载）＝ `成员：lead(待命)` / `还没有共享任务。`（20 字）
  - after（同一浏览器、**未刷新**）＝ `成员：lead(待命)、cmo(待命)` + `task-1@2 PANELPROBE-9001 … 进行中 梦之队 CMO`（73 字）
- 旁证：该轮会话的投影缓存（`runtime/harness-home/storages/session_projcache/`）里确有 `agentTeam` 与
  `PANELPROBE-7421`（上一轮同形复现），说明宿主侧一直在算，客户端确实是在收帧后更新的。

## 后果

- 结论：**面板本身会跟会话更新**；用户此前看到的「空/不更新」最可能是当时根本没有 team（CEO 走
  `vp_*` 快捷委托），已被 2026-11-06 的 persona 修复（[两件套必须组队](2026-11-06-ceo-two-artifact-team-rule.md)）。
- 以后再报「面板不更新」，第一步不是改客户端，而是用这条腿取 before/after：`expectFound=false` 才是真红。
- 已知边界：本腿的 before 取在**新会话建立之前**的同一 dock 上；若将来出现「同一会话内第二任务不显示」，
  要用同一会话续跑一轮再取 after（脚本支持：不开 `--ask` 时 before/after 各取一次）。
