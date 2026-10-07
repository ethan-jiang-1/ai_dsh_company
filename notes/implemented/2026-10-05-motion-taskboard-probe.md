# 2026-10-05 · 真动议首验：手册「动议任务板」行被模型真实执行（motion-taskboard-probe）

状态：已交付（2026-10-05 用户点名「跑 A」；probe = [motion-taskboard-probe.mjs](../../probes/motion-taskboard-probe.mjs)
常驻；两次真动议：第一次被问询纪律正确阻塞——probe 设计缺陷非模型缺陷；第二次零歧义动议全流程走通）

## 交付

- **probe（常驻）**：真 headless 公司会话（cwd=排练场，注入当日手册含新行），动议 prompt 刻意
  **零任务板指令**（只给动议 + 排练路径硬约束）——验模型是否按注入手册**自发**执行新流程。
- **判定：A1/A2/A3/A4 全 PASS**（A2 经离线时序分析修正，见下）——手册「动议任务板」行被模型
  真实执行，且行为质量超判据（自发互审、返工重开、硬边界内化）。

## 验证（实际跑过的）

- **动议一（口径模糊版）**：CEO 走 7 步 23 工具调用后 `ask_user_question` 澄清范围并**阻塞等人**
  ——问询纪律正确工作（把上下文备到人能一眼决定）；headless 探针无人应答 = **probe 设计缺陷**
  （模糊动议 + 无应答通路）。顺带暴露模型路径错位一次（读 CHARTER 爬到仓库根，自行恢复）。
- **动议二（零歧义版）5/5**：
  - A1 CEO 落 **5 任务全部带 writeScopes**（`drafts/vp-eng.md`、`drafts/vp-eng-review.md`、
    `journal/vp-eng`——连互审与 journal 的 scope 都规划了）；
  - A2 认领→写时序 **5/5**（离线分析修正后；最近一对 margin **22ms** 仍成立）；
  - A3 completed 5 + journal 回执 3；
  - A4 final 落排练路径 + **公司共享盘 deliverables 零新增**（排练不污染判据过）。
- **行为质量超判据**：CEO 自发创建互审任务（T3/T4）；互审后**返工重开任务再认领**（T1/T2
  rev 4→6，稿重写——手册「返工显式通知 + 新版本号」被走通）；任务描述内置形状规格与硬边界
  （「不写预算金额、不承诺折扣与价格」——CFO 边界纪律内化进任务书）；meta.md 回填 + present
  声明 + 派活行状态对齐。
- probe 自身两轮 bug（resultText 读法、epoch ms 当 ISO 解析）均被「断言带原文」当场暴露——
  红绿留痕即修复路径。
- 资产 = [snapshots/motion-taskboard-probe/2026-10-05/](../../snapshots/probes/motion-taskboard-probe/2026-10-05/timing-analysis.md)
  （timing-analysis.md 离线判定 + probe-stdout）。

## 输掉的方案

- **模拟真人应答通路**（服务层 `answer(agent, callId, answer)` 存在，web 客户端走 UI 应答，
  BFF RPC 面未反查到位）：本次改用**零歧义动议**绕开——应答通路留待 H8 多人开门时一并解决
  （真人本来就到场，无需模拟）。
- **离线判定代替第三次重跑**：A2 修正后未再花真模型成本跑第三条动议取 4/4 绿资产——行为样本
  已有两场（阻塞样本 + 全绿样本），probe 修复后随时可复跑（`node scripts/motion-taskboard-probe.mjs`）。

## 依据

- 手册行来源：[shared-disk-taskboard-coordination](./2026-10-04-shared-disk-taskboard-coordination.md)
- 机制层证据：[taskboard-presence-probe](./2026-10-04-taskboard-presence-probe.md)（2/2 采样）
- 会话：`session-cd37bd20`（动议二，全流程）/ `session-2c54bb7c`（动议一，问询阻塞样本）
