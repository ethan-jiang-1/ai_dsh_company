# 2026-10-10 · 事实阻塞闸门（HITL）——外部正文读不到时的全链冻结规则

状态：implemented

> 2026-10-10 **同日修订**：HITL 从「唯一获取通道」改判**「最后手段」**——preset 全员挂
> `tool-bash` + browser（shell 出网不受 web_fetch 的 DNS 拦截，通道穷举优先）→
> [fact-finding-ladder](./2026-10-10-fact-finding-ladder.md)。本 Note 的闸门骨架（探针 →
> 待补料 → 依赖链冻结 → 收口规则）与扫描仪器语义**仍然有效**。

## 决定

1. **外部正文取不到 = 本部署常态，写进手册**（`company-workspace/AGENTS.md` §工作纪律·取证能力边界）：
   `web_search` 只回标题+URL；`web_fetch` 对一切域名被沙箱 DNS 策略拦截（25/25 主机名实证，
   含 example.com；报错 = `WEB_BLOCKED_URL`/`resolves to a non-public IP address`）；pack 无 shell 工具；
   浏览器位同过不了 DNS ⇒ **外部事实的唯一获取通道 = HITL 人补料**。依据 = 
   `deliverables/2026-10-10-ai-transformation-2026/drafts/ceo-source-hunt.md`（本轮真盘取证）。
2. **事实阻塞闸门立进手册**（§协作规矩·事实阻塞闸门）：①开工先打能力探针（一次搜索+一次 fetch）再分解；
   ②依赖外部事实的任务派活行状态写**「待补料」**，与其依赖链**一律不许标「完成」**；
   ③CEO 第一时间发一张补料卡（料落 `deliverables/<slug>/drafts/sources/`）；④补料落盘即解锁；
   ⑤final 结论层不得建立在未读到的事实上——降级「预案版（待补料重算）」或不收口。
   病灶 = ai-transformation-2026 轮：A 级事实 0 条，T1–T6 仍全部「完成」、final v1 照常收口。
3. **派活行状态枚举扩「待补料」+ 扫描仪器同步**（`tools/lib/candidate-scan.mjs`）：
   `ASSIGN_LINE` 正则扩枚举；R3/R3′ 把待补料任务**浮出 blocked**（不静默丢、不当候选）；
   待补料**不算依赖满足**，R3′ 的盘上稿**不假满足**待补料依赖（事实没回来 ≠ 稿在盘上）。
   红证：新 4 用例先红（1 failed 系测试断言写错平面规则语义，修正断言后实现绿）。
4. **CEO 组队 skill 加能力盘点步**（`presets/ceo/skills/assembling-the-team/`，五步→六步）：
   动议要外部事实 ⇒ 先打探针 ⇒ 判死就先 HITL 要料，**不许带"未核实"分解派活**。
5. 补料投放点：`deliverables/<slug>/drafts/sources/`（本轮已落 README 指明等待的料）。

## 输掉的方案

- **只改 skill 不立手册闸门**：skill 是 guidance，无机器可查状态——闸门必须落在派活行枚举上才咬得住
  （手册问询节流的教训同源：只靠倡议，"完成"照样满天飞）。
- **只立闸门不写能力边界**：每个角色还得现场撞 50+ 轮查询的墙（本轮实证成本）——边界先讲清，探针一发判死。
- **给全员配 shell 工具 / 扩浏览器位**：shell 是危险面且沙箱 DNS 照样墙死 fetch，浏览器同理——不解决
  "读到正文"，徒增攻击面；否。
- **接代理（`*_PROXY` 让 web-fetch-http 走代理路由跳过 DNS 检查）**：唯一能让 fetch 复活的杠杆，
  用户暂缓（2026-10-10 选择"全套上"不含此项）——留作后续独立轮，需用户提供本机代理端口。
- **占 postmortem 000N 编号**：单场事故、无停机、规则与证据已闭环——按 notes/README 判据不构成
  独立复盘体量，并入本 Note。

## 后果

- 旧任务书不受追溯（无「待补料」行的行为不变）；新枚举对 R2 不可见（平面规则只报待办）、
  对 R3/R3′ 可见（blocked 浮出）——**orient 的「待核工作候选」会显示冻结链**，符合"阻塞漏显示=零容忍"的既有口径。
- 手册 189/195（同 diff 16 处折行合并腾行，棘轮不破）。
- skill 文案改动 → preset-smoke 重跑（真挂载 5/5 过）；显示名与 id 未动。
- 卡兹克案的事实面等待人补料（sources/README 列明三入口 + 仓库文件）；补料到位后 VP-Sales 出 v2、
  T3/T4/T5 重算——**现有 final v1 的落地面结论在重算前按「预案版」读**。

## 验证（实际跑过）

- **红证（TDD）**：先在 `tests/company/candidate-scan-labels.spec.ts` 加 4 用例（待补料浮出 blocked /
  不算依赖满足且盘上稿不解锁 / R2 不当候选 / R3′ 不假满足）→ **4 failed**（解析器不认识该状态）
  → 扩 `ASSIGN_LINE` + R3/R3′ 分支 → **23/23 绿**。红长什么样：`scanR3` 的 blocked 缺 T1
  （行被正则静默丢弃）。
- `pnpm test`：**43 文件 / 445 测试全绿**（含新 4 用例）。
- `node checks/smoke/preset-smoke.mjs`：**ALL PASS**（5 preset 真挂载 + skills 隔离 + client 闭包）。
- `pnpm verify`：**ALL PASS**（doc-budget：手册 189/195；notes-liveness；md-links；ledger 全套）。
