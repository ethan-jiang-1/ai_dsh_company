# 2026-10-28 · 培养主视图：第三 tab，左板右对话

状态：批准（用户 2026-10-28 会话「对的，你开始做吧，Set up 一个 goal，把这个落地了」）；实施中
批准：用户 2026-10-28 会话「对的，你开始做吧，Set up 一个 goal，把这个落地了」。
进度：第一切片（IA / 左板 / 右栏命令面 / shell composer 隐藏）已落地；独立培养会话为下一阶段。

> 依据：用户走查判断「只有培养需要这个对话，其他面板不需要」，要求把培养从公司子页拎出来；
> 结构 = 主区三 tab（对话 / 轨迹 / 培养），培养 tab 内部左右分；公司总览保留无对话入口。

## 问题

公司整页视图把看板、依赖、在场、培养四个子页放在同一个 `conversation.view` 里，底部却一直挂着
会话级 composer：用户在培养页发消息，回复在 Chat，页面没有承接；其他三页又根本不需要对话。
继续在“公司页”里加历史/聊天只会复制第二个 Chat，状态分叉。

## 决定

1. **第三个主视图 = 培养**，不是通用“工作台”：`conversation.view` 三 tab 为 Chat / Trajectory / 培养；
   公司总览（看板 / 依赖 / 在场 / 交付）退回顶栏按钮 → 右栏已有页签，无对话。
2. **培养视图左板右对话**：左复用 `CultivationBoard`（纠正 / 方法 / journal / 赞踩 / 怎么养）；
   右是培养专属面板，自有 composer，不混主 Chat。
3. **第一切片先落命令面**：右栏只接 `/cultivation ...`，结果回在本面板；自由对话在独立培养会话
   接入后开放。**不伪造模型回复**。
4. **shell composer 在培养视图隐藏**：用 `html[data-dsh-cultivation-view] [data-composer-seat]`
   的 per-document 结构；切到 Chat / Trajectory 即恢复。后续独立会话接入时改为真正的
   view-owned composer。
5. **attach/写回**：下一阶段把左侧记录/方法作为上下文带进培养对话；采纳仍走 `/cultivation adopt`，
   写方法层，main Chat 不参与。

## 输掉的方案

- **通用工作台**：给所有公司子页配对话；用户明确“其他不需要”，过度设计。
- **培养留在公司子页、右侧挂全局 Chat**：composer 仍属 shell，回复与历史错位。
- **公司总览做第四个 tab**：三 tab 结构更清楚；总览用右栏无对话入口。
- **右栏内嵌第二份主 Chat 历史**：复制 Chat、状态/滚动分叉；不做。
- **用 ComposerBlock 把 shell composer 置灰**：会话级，跨窗口误伤；改为视图挂载期的 per-document 隐藏。

## 验收

- 主区严格三 tab：Chat / Trajectory / 培养；切 Chat/Trajectory 时培养右栏不渲染。
- 培养 tab 左是 `CultivationBoard`，右是培养面板；右栏 composer 是培养视图自己拥有，shell composer 隐藏。
- 命令面：`/cultivation ...` 真执行、真返回；自由文本明确提示阶段限制，不冒充模型。
- 公司总览按钮打开无对话右栏；不出现第四个 conversation view。
- keyless：CultivationView 挂载/卸载、shell composer 属性、CultivationChatPanel 命令/自由文本；
  `pnpm test` / `verify` / `typecheck` 全绿；真页面 `ui-scene-smoke` 无误。
- 下一阶段：独立培养会话 create/follow/prompt、流式/审批、attach/writeback；未完成前不宣称“培养对话已完整”。
