# Roadmap · 垂直轮迭代（每轮一场动议从 CEO 进出，系统先起来再逐轮加宽）

> 性质：**计划层**——被实现逐轮吞掉（验收进 docs/ 合同、决策进 notes/、过期即修订）。
> 2026-09-21 重切（D11）：原"先全角色（阶段 1）后团队（阶段 2）"的横切否决，改垂直轮——
> 交付按完整垂直切片、验证按最窄证据、打磨蛇形折回；原 M1 独立会话验证不丢，降为轮内
> 最窄验证。UI 归轮：现成团队 UI 在 R1 作观察窗、R2 进验收；自定义皮肤 R5（30 §5）。
> **每轮换全新对话上下文执行**——交接不吃上下文，靠文末两份清单。

| 轮 | 状态 | 做什么（垂直：动议从 CEO 进、交付从 CEO 出） | 轮内最窄验证 | 验收（外部可观察） | 合同/内容随之出生 |
|---|---|---|---|---|---|
| R0 立环 | ✅ 完成 | 环境：submodule 钉 tag + workspace + AGENTS.md + 双 home | `pnpm verify` 结构门禁 | `pnpm dsh --profile headless "hi"` 从源码跑通；typecheck 解析到 DSH src | `profile.md` 骨架 |
| R1 两人公司 | ✅ 完成 | CEO + VP-Eng（骨架 persona + 各 1 个核心 skill）；pack 装进 web profile 作**观察窗**（零自定义 UI）；一条最小动议（Q4 已定：「给我们公司要不要自建知识库写一页技术评估」）：收动议 → spawn teammate → 派一任务 → VP 出稿 → CEO 收口 `present` | 两角色入戏探针：**Web 会话**分别选 CEO / VP-Eng preset（⚠ headless 不挂 preset，见 [10 §6](../design/10-architecture.md) 要点 6） | **Web 会话**里一场完整动议的会话日志 + `deliverables/` 第一份交付物（UI 是唯一载体，不是红利） | CEO/VP-Eng 的 40 号文案；`demo.md` 雏形 |
| R2 四人全员 | ▶ 可开工 | +VP-Sales +COO（文案+skills）；任务板 DAG 分派；VP 间至少一次互审（mailbox 跨层级）；fork teammate 下发会议上下文 | 新增两角色独立会话探针；task CAS 拒绝过期修订 | [30-ui-demo](../design/30-ui-demo.md) §3 分镜 v0 **全程 UI 可见**；消息不丢不重 | `presets.md`（四角色语义合同）；40 号补全 |
| R3 汇报线 | — | **team 两包从 bundle 改直插行**（10 §3 冲突注，仍零 JS）；CEO 加 `vp_eng`/`vp_sales` 命名委托工具（continuable + persona），团队之外的快捷派活 | 委托 child 与 team 成员并存不互破（shadow 语义） | 委派出稿 → 全局 send_message 追加意见 → child 修订；日志可回放 | `delegation.md` |
| R4 成品流程 | — | templates + deliverables 流程全量接入 | 模板即流程：写作类工作流第一版 = 模板 + skill 指引 | 端到端写作流水线：brief → 分头出稿 → 互审 → 合稿落 `deliverables/` | `demo.md` 定稿 |
| R5 皮肤 + 门禁 | — | [30-ui-demo](../design/30-ui-demo.md) §5 v1 驾驶舱页签 / v2 委派工具卡；verify / release-smoke / sync-dsh 脚本 | 发布纪律时点表（[guides/60](../guides/60-dev-loop.md) §5）逐项补 | 驾驶舱页签跑通；`npm pack` → 干净 profile → `dsh plugin add` → 冒烟通过 | `release.md` |

主通道不变（D4）：demo 主循环走团队（M4/通道 B）；通道 A 命名委托 R3 加入；M2（自定义
provider）可选增强（触发条件见 [20-roles-isolation.md](../design/20-roles-isolation.md) §3）。
UI 侧：v0（现成团队 UI）＝ R1 观察窗起、R2 进验收；v1/v2 ＝ R5（[30-ui-demo.md](../design/30-ui-demo.md) §5）。

## 轮次交接（每轮全新对话上下文，靠这两份清单不吃上下文）

**新会话开工动作**（guides/60 §0.5 的展开版；人只需说"继续下一轮"）：

```text
AGENTS.md（自动加载）→ docs/00-index.md（台账 + 待定 Q）→ 本表找当前轮
→ 有 ⛔ 先解阻塞 → Plan Mode 出 decision-complete 计划 → notes/intents.md 登记 → 开工
```

**轮次收尾清单**（同一 diff 内完成，缺一即未收尾）：

1. 本表状态列勾销（🔄 → ✅，下一轮标 ⛔ 或待命）；
2. `AGENTS.md` 当前状态行同步改写（"现在"的唯一权威）；
3. 验收中已成事实的部分迁入对应合同（00-index 合同出生地图）；
4. `notes/implemented/` 记本轮 Note——"实际跑过的验证 + 环境状态"必写（下轮会话判断
   "哪些已就绪"只读这里，不信记忆不信聊天记录）；
5. `notes/intents.md` 对应行改 implemented。

## 维护规则

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
