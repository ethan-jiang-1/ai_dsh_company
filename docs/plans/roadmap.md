# Roadmap · 分阶段落地（每步都有外部可观察的验收）

> 性质：**计划层**——会被实现逐阶段吞掉（验收标准进 docs/ 合同、决策进 notes/、过期即修订）。
> 来源：从 design/10-architecture.md §7 抽出（2026-09-21）；主通道决策 D4 见 [00-index](.../00-index.md)。

| 阶段 | 做什么 | 验收（外部可观察） |
|---|---|---|
| 0 立环 | repo + submodule 钉 tag + pnpm workspace + AGENTS.md + 双 home | `pnpm dsh --profile headless "hi"` 从源码跑通；typecheck 解析到 DSH src |
| 1 角色+内容 | 四个薄 preset 按 [40-role-content-plan.md](../design/40-role-content-plan.md) 落地：persona + skills 目录 + KB 骨架；M1 式独立会话验证 | 每个角色独立会话通过"入戏探针"（40 号文档 §3）；任意两会话 skills catalog 互不可见 |
| 2 团队 demo v0（主通道 M4） | profile 挂 team 两包（host+web bundle）；CEO 会话 spawn 三位 VP，任务板分派，跑通 [30-ui-demo.md](../design/30-ui-demo.md) §3 分镜 | 邮箱消息不丢不重；task CAS 拒绝过期修订；fork teammate 携带会议上下文；分镜全程 UI 可见 |
| 3 汇报线（通道 A） | **先把 team 两包从 bundle 改为直插行**（见 §3 通道 A 冲突注，仍零 JS）；CEO preset 加 `vp_eng`/`vp_sales` 命名委托工具（continuable + persona），作为团队之外的快捷派活 | CEO 委派出稿 → 全局 send_message 追加修改意见 → child 修订；日志可回放；团队工具对成员仍正常 shadow |
| 4 成品 | templates + deliverables 流程全量接入；`present` 标记产出 | 一次端到端"写作流水线"：brief → 分头出稿 → 互审 → 合稿落 deliverables/ |
| 5 UI 皮肤 + 门禁 | [30-ui-demo.md](../design/30-ui-demo.md) v1/v2 皮肤；verify / release-smoke / sync-dsh 脚本 | 驾驶舱页签跑通；`npm pack` → 干净 profile → `dsh plugin add` → 冒烟通过（源码直跑会掩盖依赖声明错误） |

主通道已核定（决策 D4，见 [00-index.md](../00-index.md)）：demo 主循环走团队（M4/通道 B），
通道 A 的命名委托工具作为"汇报线"补充在第 3 阶段加入，M2（自定义 provider）是可选增强
（触发条件见 [20-roles-isolation.md](../design/20-roles-isolation.md) §3 选型速查）。
UI 侧的 v0/v1/v2 与本表第 2/5 阶段对应（[30-ui-demo.md](../design/30-ui-demo.md) §5）。

## 维护规则

- 每阶段完成：勾销状态、把"验收"里已成为事实的部分迁入对应合同文档（见 00-index 的"合同出生地图"）。
- 阶段顺序调整或新增：直接改本表，并在 notes/ 记一行原因。
