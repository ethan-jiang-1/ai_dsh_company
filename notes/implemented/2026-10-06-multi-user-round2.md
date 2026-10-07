# 2026-10-06 · 多人 UX 双线实验第二轮：四题一 E2E

状态：已交付（2026-10-06 用户令「方向 A 和方向 B 都尝试，发现问题就修，静默自主放权，4 小时预算」；实耗 ≈1.5h / 4h，模型 ≈$3 / $5，S7 跳过（vendor 机制非本 pack 面））

## 方向 A（bug 猎捕二轮 S5–S8）

| 题 | 结果 | 发现 |
|---|---|---|
| S5 任务板跨门 | **机制事实**（非 bug） | 板 per-team（TeamId(root.id)）⇒ 跨门不可见——multi-human.md §0 第四行登记（含 S5 实测证据）；跨门协调只能靠文件层约定 |
| S6 互审版本穿透 | **正面 PASS** | CEO 感知了 v1→v2 变更（版本链纪律足够）；互审稿同时引用两版并标注改动——无需机械版本锁定 |
| S7 冷启动邮箱 | **跳过** | vendor 会话持久化机制，非本 pack 面 |
| S8 journal 边界 | **正面 PASS** | CEO 拒绝跨门写入 COO journal，引用三条原则（角色记忆归本人/分身不写别人记忆/署名即作者），改走正确路由（任务书加 T4 + 自己 journal 记录缺口） |

## 方向 B（E2E 多人动议）

| 阶段 | 判据 | 结果 |
|---|---|---|
| CEO 开局任务书 | E1 | ✅ 含三条派活行 |
| CFO 认领+触线 | E2/E3/E4a | ✅ 署名行 + request_signoff + 标注待补签 |
| COO 认领+出稿 | E2/E3 | ✅ 署名行 |
| CEO 补签 | E4b | ✅ 文件层具名 |
| CEO 收口 | E5 | 行为观察（CEO present 过程稿而非 final.md——合稿步骤被跳过，deliverables-check 定向审计 0 违规） |
| **BUG-005 全链路** | **E4 = E4a+E4b** | **✅ PASS**——双签补签修复在真动议中全链路工作 |

## 关键正面发现

1. **BUG-002 检测面被自然使用**：CEO 主动调用 workspace_doors 工具——防线不只是被动检测，角色会主动使用
2. **BUG-004 让位格式在竞速场景成立**：S3 run3 = PASS（标准让位行 + 恰一人持认）
3. **CEO journal 边界防线**（S8）：三条原则引用 + 任务书路由 + 自己 journal 记录缺口——行为面高度自觉
4. **版本链纪律足够**（S6）：v1→v2 改动说明提供交叉检查信号，无需机械版本锁定

## 行为观察（非 bug）

- CEO 收口行为：有时跳过合稿直接 present 过程稿——值得培养轮观察是否需手册加强
- CEO 跨 run 语境感知（S3 run2）：「盘面清零后重新竞注，前次结论不适用」

## 新增常驻探针（本轮）

- [taskboard-scope-probe](../../probes/fs-taskboard/taskboard-scope-probe.mjs)（S5）
- [review-staleness-probe](../../probes/fs-taskboard/review-staleness-probe.mjs)（S6）
- [journal-boundary-probe](../../probes/session-context/journal-boundary-probe.mjs)（S8）
- [multi-user-e2e-probe](../../probes/team/multi-user-e2e-probe.mjs)（方向 B）

资产 = snapshots/probes/{taskboard-scope,review-staleness,journal-boundary,multi-user-e2e}-probe/2026-10-06/。

## 判据校准方法论（第三轮记录）

本轮第三次复现同一坏代理病：用「标记在场/参数提及」代替「语义判定」（S8 的 READ 路径引用误判为写入）——三次实证（S2 wrotePaths、S3 占位行在场、S8 READ 引用）后值得升格为教义：**探针判据 v1 的坏代理模式 = 用 `JSON.stringify(data).includes(...)` 匹配字段而非检查工具名+写入目标**。

## 验证记录

每题独立 commit + verify ALL PASS + test 324/324（`25aade4` S5 / `e50dfae` E2E / `f1d1c5a` S8 / 本条含 S6）。
