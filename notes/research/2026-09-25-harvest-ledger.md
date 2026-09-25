# 2026-09-25 · 收割台账：delta §④ 十五项逐条判定（rc.2 能力收割，owner RFC = harvest-round）

状态：已完成（判定 15/15，零待定；实测证据 = harvest-probe 六轮真模型探针 + vendor 源码核对）

| # | 能力 | 判定 | 理由 / 证据 |
|---|---|---|---|
| 1 | agentTeam 投影 + session.projections + control 流 + useProjection | **已收**（随升 pin 强制路径） | client 已迁移投影读取（升 pin ①b）；presence-e2e 用 `session/projections` ALL PASS |
| 2 | RemoteStream uplink 双工流 | **不收** → 搁置 | 无交互式面板需求；复活 = 交互式面板（插话/追加油）立项 |
| 3 | session 创建 presetId 参数 | **不收（delta 描述失准修正）** | rc.2 的 RPC 面一直是 `agentPreset`（本仓一直在用）；`presetId` 是 session-controller 内部 API（`agent.ts:243`）非本仓消费面 |
| 4 | plugin-manager manifest 品牌化字段 | **不收（delta 描述失准修正）** | rc.2 plugin-manager 源码无 title/icon/tags 字段（grep 零命中）；npm name/description 已覆盖（pack 现有） |
| 5 | cordis_inspect_list / query 检查工具 | **收（切片一）** | web bundle 已带 host providers；角色 preset 需声明 `tool-cordis` 行（出厂 cordis preset 同款裸行）⇒ 五角色加行 + preset-smoke；dev-loop §2 调试阶梯补"进程内查询"档 |
| 6 | subagent 上限后端化 + Web 设置页 | **不收** → 搁置 | 改 patch 一行就能调，无频调需求；复活 = 多动议并行频撞上限 |
| 7 | job-controller + terminal-controller | **不收** → 搁置 | demo 运维线；复活 = demo 需求出现 |
| 8 | workspace-changes（turn 级文件变更审阅） | **收（验证完成）** | host 侧确凿：`workspace/changes` 事件落日志（探针两轮）；ui-deliverables 链路在跑（present 行/预览钮全工作）。**实测知识**：变更捕获需要 **git 仓**——无仓只抓 file-tool 编辑，bash 写入不可见（真公司盘在本仓内天然有 git ✓；排练场裸目录受影响）。审阅卡的 headless DOM 定位六轮未遂（vendor e2e 用自有 data-\* 钩子 + 预置会话，不走 aria 路）——观察窗人工看一眼即终验（`pnpm dsh web -- --port 3081`） |
| 9 | office-to-pdf + spreadsheet 预览 | **收（验证完成）** | 探针确凿：CSV + PDF 侧栏预览双双点开（入口 = present 行"在侧边栏打开"按钮；截图 ×2/轮 × 多轮） |
| 10 | job 完成默认唤醒 idle owner | **已收**（基座默认行为） | 升 pin 即生效，无需本仓动作 |
| 11 | Team 容量参数 | **收（登记）** | 容量/信箱背压调参处一行登记进 docs/profile.md（组合合同 home） |
| 12 | remote-mock 测试支撑 | **不收** → 搁置 | 现有 keyless 测试链够用；复活 = client 测试需要 mock remote |
| 13 | volatile config + --dump-config-schema | **收（登记）** | dev-loop §2 调试阶梯随 #5 一并登记（自描述 schema 工具） |
| 14 | 新工具族（ssh/browser-use/voice/PTC/auto-review/skill-office） | **不收** → 搁置 | demo 储备，无需求不预挂（D13 同判）；复活 = demo 卖点需求逐项点名 |
| 15 | OTLP 产品遥测 | **不收** → 搁置 | 默认不挂载；复活 = 运营侧使用数据需求 |

**总账**：已收 2（#1 #10）／ 收 5（#5 #8 #9 #11 #13）／ 不收 8（含 2 条 delta 描述失准修正 #3 #4）。
**探针方法记**（六轮迭代教训，对以后写 UI 探针有用）：真入口与文案要从 vendor locales/e2e 里取
（页签 "Review · turn N"、预览入口 = present 行按钮）；`workspace/changes` 事件只带 turn 号（清单在
host service，UI 卡去取）——断言要对层；变更捕获要 git 仓；headless 下 attached+滚动比 visible 稳。
