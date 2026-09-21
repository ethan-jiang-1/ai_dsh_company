# 2026-09-21 · roadmap 重切垂直轮（D11）+ UI 归轮 + 轮次交接清单

## 决定

1. **迭代单位改为垂直轮**：否决原"先全角色（阶段 1）后团队（阶段 2）"的横切，改为
   R1 两人公司最薄全路径（CEO+VP-Eng+一条最小动议）→ R2 四人全员 → R3 汇报线 →
   R4 成品流程 → R5 皮肤+门禁。依据：FAQ 13 dev-loop 第 4 阶段（交付=完整垂直切片）+
   第 6 阶段（蛇形折回）+ 用户经验确认（vertical slice）；原 M1 独立会话验证不丢，
   降为轮内最窄验证。
2. **UI 归轮**（30 §5 v0/v1/v2 映射）：现成团队 UI（零自定义代码）R1 起作**观察窗**
   （两人公司上屏，红利不是门槛），R2 起进**验收门槛**（四人分镜 v0 全程 UI 可见）；
   自定义皮肤 v1 驾驶舱 / v2 委派工具卡 = R5。
3. **轮次交接两份清单**（支撑"每轮全新对话上下文"）：① 新会话开工动作进 guides/60
   §0.5（AGENTS.md→00-index→roadmap 当前轮→解 ⛔→Plan Mode→intents 登记；人只需说
   "继续下一轮"）；② 轮次收尾清单进 roadmap（同 diff：状态勾销、AGENTS.md 当前状态行
   同步、验收迁合同、Note 记"实际跑过的验证+环境状态"、intents 改 implemented）。
4. **Q4 门槛降低**：从"第一场 demo 动议主题"改为"R1 最小动议主题"（一句话任务即可）；
   整场剧本 R2 前再定。
5. **全库阶段号统一改轮次号**（R0–R5）：00-index（地图/出生地图/D5/Q1–Q4/新增 D11）、
   AGENTS.md（布局/命令表/当前状态）、README、guides/60、design/10 §3 / 20 实施顺序 /
   30 §1+§5（改名"分层归轮"）/ 40 状态行+§3、snapshots/README、company-pack 两个
   README。历史 notes 不动（档案性质）；roadmap 篇首保留一处旧称是对被否决方案的指称。

## 输掉的方案

- 保持原阶段表、仅阶段内垂直排队——系统"活体时刻"推迟到阶段 2 末；四角色文案
  upfront 写完违反"内容随切片生长"。
- 自定义 UI 提前到 R2/R3——client 面是 pack 第一段代码，内容/编排未稳时做皮肤会被
  蛇形折回白做；现成团队 UI 已够 R1/R2 观察。
- 轮次交接靠"上一轮对话里说清楚"——正是要消灭的跨轮上下文携带；机制必须落 repo 文档。

## 验证（实际跑过）

- `pnpm verify` → ALL PASS（md ×33、links ×33、presets ×4、claude-symlink、
  vendor-pin、pack-bundle）。
- 旧阶段号残留复查：`grep -rn '阶段 [0-9]' docs AGENTS.md README.md snapshots packages`
  → 仅 roadmap 篇首对被否决方案的有意指称，无其他残留。
- 新会话动线桌面检查（guides/60 §0.5 的路径逐跳核对）：AGENTS.md 自动加载（含当前
  状态 R0+Q4 阻塞）→ 00-index 台账/待定 Q → roadmap 状态列定位当前轮——每跳目标文件
  均存在且信息足以无补充开工（Q4 显式 ⛔）。

## 未验证 / 已知风险

- R1 表中"装 team web bundle 作观察窗"尚未实装（R0 立环验收本来未跑）；R1 开工时若
  web bundle 与 headless 验证路径冲突，回改 roadmap 该行为"观察窗可选"。
