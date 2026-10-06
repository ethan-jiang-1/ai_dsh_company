# 2026-10-06 · 观测收尾包：orient --session + 白话层收尾 + 实跑清偿

状态：proposed（批准：2026-10-06 用户令「毕业 Note 边界节留给你裁决的都想做，如何安排你定」——三条全做；次序与切片由本 RFC 拟定 = A→B→C，ongoing goal 推进；前包 = [driver-surface-package](../implemented/2026-10-06-driver-surface-package.md) / [observation-hardening](../implemented/2026-10-06-observation-hardening.md)）

## 问题（三笔登记债的真实形状，2026-10-06 核实）

1. **orient preset 只看每 slug 最新一个会话**：历史会话的 preset 口径只能走 session-log-export 手工导——驾驭者想查「某个 slug 里各会话分别用的什么 preset」没有入口。
2. **白话层收尾**：全量盘点后实际只剩 `docs/index.md`（有性质行、无「什么时候读」，且预算顶格 148/148 只能原地改）；project-map.md 白话导语已在。前包边界节「design 子文档未铺」的措辞偏保守——design/guides 全部已覆盖。
3. **实跑清偿**：两包改过路径的脚本只有语法/import 补偿检查，真实入口未跑。可负担的 keyless lane 已核实：replay-smoke（无 key ~11s）、client-load-smoke（keyless ~10s）、snapshot-motion-smoke（keyless CLI 集成）；preset-smoke 需模型 key（本机已有）。20 个重探针（多用户/模型/浏览器长跑）保持按头注触发。

## 方案（三条目）

### 条目 A：orient --session（历史会话 preset 口径）

- `pnpm orient --session <slug>`：列该 slug 最近 N 个会话的 preset / createdAt / cwd（解每个会话日志头部，zstd 同款 CLI 解码；无头行如实「无」；解码失败「不可用」）。
- `pnpm orient --session <slug>/<id前缀>`：单会话详情（头部字段 + 命中确认）。
- lib 纯函数：`listSlugSessions(home, slug, limit)`（列会话 id/mtime）+ 复用 `parseSessionPreset`；CLI 侧解码注入。slug 不存在 → fail-loud 报错。
- 成本界：每会话只解头部前 64KB，限最近 10 个。

### 条目 B：白话层收尾

- `docs/index.md` 首屏性质行原地并入「什么时候读」（预算 148/148 不破，零增行）。
- 复核走查：全部 docs/*.md 首屏一句话可懂何时读（含 project-map 导语、runtime-map 性质块的判定），结果记毕业 Note——此后白话层视为全覆盖，不再是债。

### 条目 C：实跑清偿

- 实跑四个真实入口并记录结果进毕业 Note：replay-smoke（keyless headless replay，验证 replay-runs 路径）、client-load-smoke（headless 浏览器，验证 web profile 装配）、snapshot-motion-smoke（keyless CLI）、preset-smoke（真模型，验证五 preset 挂载）。
- 判据：各脚本自身 PASS 即绿；红了当场修（呈现即验证纪律），修不动按真卡住停。
- 不入包：20 个重探针（多用户/长跑）——seam 已有机械守卫 + rehearsal-init 实跑兜底，保持按头注触发。

## 非目标

- 不改 orient 主视图形状（--session 是增量入口）；不做完整 YAML 解析；不动 run-gates/archive/notes 制度/company-workspace 手册；重探针不整批实跑。

## 输掉的方案（留尸）

- **orient 主视图解全部历史会话的 preset**：只为历史口径把主视图拖慢，违背秒级性格；历史口径走 --session 增量入口。
- **`--session` 解全量日志**：头部字段在前 64KB，全解是浪费。
- **实跑全部 24 个 seam 消费脚本**：多数需多用户/模型/浏览器长跑，成本失控；机械守卫 + rehearsal-init + 代表性 lane 已覆盖风险面。
- **白话层强行铺到 index 台账内部**：台账行有 own 格式（D 号 + 主题），首屏行覆盖即止，不重写台账。

## 验收（先行点名怎么测；每条目独立红绿）

- **A**：①spec 先红（listSlugSessions/--session 渲染缺失）；②实现后绿 + layering 守卫绿；③走查——真实 slug 列出会话 preset（company-workspace slug 应见 ceo 与「无」两态）、不存在 slug fail-loud。
- **B**：①index.md 原地改后预算门禁绿（≤148）；②走查——全部 docs 首屏一句话可懂，结果记毕业 Note；③md-links 绿。
- **C**：①四个入口实跑，输出 PASS 收据逐条记毕业 Note（含命令与耗时）；②红了当场修并记红→绿；③verify + vitest 收尾全绿。

每条目一个 commit + push + 简报；毕业 Note = 并入本 RFC 毕业改写。
