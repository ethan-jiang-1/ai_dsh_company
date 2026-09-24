# 2026-09-22 · R2 前皮肤薄片重排（UI 表达跟随其机制同轮交付）

## 背景（R1 之后的用户反馈）

R1 demo 体感：CEO 把活丢给 VP-Eng 后，**察觉不出 VP 是一个独立空间**——全程都发生在
CEO 会话流里，VP 会话从未被当作一个镜头来走；任务板只是个手动刷新的小下拉。用户要求：
CEO 一个独立空间、VP 一个独立空间、两个空间相互沟通，且**界面上有表达**。

## 决定（2026-09-22，用户批准）

1. **判断标准进计划**：R1 的三次失败（postmortem 0002 团队 UI 不可见、0003 重复挂载、
   本次体感）同属「机制上线了但人看不见」——**界面表达要跟它表达的机制同轮交付**，
   不整批押到最后一轮。
2. **R2**：分镜 v0 验收升级为「两空间镜头，不讲解也能看懂」；pack 头部任务板升级为
   **活面板**（打开期间自动刷新，成员状态/任务修订双侧实时）。
3. **R3**：命名委托工具与**委派工具卡**（`tool.call.toolview` 薄片，自 R5 v2 提前）同轮上线。
4. **R5**：驾驶舱 v1 变轻（工具卡已提前），含**协作动态流**（pack 自建 Remote 折叠
   session 事件——数据路径已核实：`ctx.on('session/event')` 是公开机制，`TeamService`
   自己也这么用）。

## 输掉的方案

- **「薄消息流」进 R2**（用户最初批准的形态，经 vendor 实证后撤回）：`TeamService` 对浏览器
  只暴露 `view`/`createTask`/`updateTask` 三个 `@Remote`（`agent-team/src/index.ts`），
  `TeamView = { members, tasks }`——**没有消息/邮箱读模型**。「谁→谁」消息流需要自建
  Remote 读模型，那是 R5 驾驶舱的既定机制，不是薄片。R2 里消息的跨空间可见由两处现有面
  承担：各会话对话流里 `send_message`/`spawn_teammate`/`team_task_*` 工具调用实时展开
  （[ui-demo §1](../../docs/design/ui-demo.md)）+ 任务板活面板。
- **驾驶舱整个提前到 R2**：R2 的瓶颈是内容（两角色文案/KB/skills）；驾驶舱要画的数据
  （四角色组织图、跨 VP 消息聚合）需要四角色先存在；发布门禁不滑档。

## 依据（实际查过）

- `vendor/dsh/packages/experimental/agent-team/src/index.ts`：仅三个 `@Remote`；
  `client.ts` 导出词汇表无消息类型。
- `packages/company-pack/src/client/TasksPanel.tsx`：现面板仅打开/手动刷新
  （`refresh()` 已在，活面板 = 打开期间轮询）。
- 落点：roadmap R2/R3/R5 三行 + UI 侧脚注 + AGENTS.md 当前状态行已同步修订。
