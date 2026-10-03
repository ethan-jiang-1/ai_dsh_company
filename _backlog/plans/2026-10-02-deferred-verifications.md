# 推敲（残检收口）：两笔挂起的验证债——browser 行为复跑与 probe --full 低峰收口

> 状态：推敲中（**触发条件型等待卡**——两笔"待续"从 2026-09-30 收割轮 / 升 pin 轮的 intents 行迁来立卡，2026-10-02 intents 瘦身轮；细节住各自 Note，本卡只管触发与判收，不复述）｜毕业门判断 = 两笔各自触发条件成立、跑完判收即整卡毕业迁 `_done/_closed_plans/`｜⚠ 地基对账（2026-10-03）：**第 1 笔触发条件已成立**（chromium-1243 已装）但收割轮真入口实证出**新阻塞 = 角色沙箱拒写 playwright 缓存树**（EPERM 整树拒绝）——判收须先决上游 seam 三选一（见 §挂起项）；第 2 笔不变｜复活方 = 触发条件成立（已成立/seam 落地）且用户点名或维护者顺手收口

## 挂起项

| # | 项 | 触发条件 | 判收 | 出处（细节的家） |
|---|---|---|---|---|
| 1 | browser-use 行为验证复跑（playwright-mcp 选型后 `browser_navigate` 等后续行为） | ~~chromium-1243 安装审批通过并装好~~ **已成立（09-30 装好）——但出新阻塞**：角色会话产品沙箱拒写 playwright 缓存树（EPERM 整树拒绝非缺目录；工具会挂载、调用失败、模型诚实回退）⇒ 判收前置 = **上游 seam 三选一**（provider 可配缓存目录 / sandbox×browser-use 白名单 / attach 模式），见出处 §风险 | 真调用行为断言落日志（同批5b 首验口径） | [plugin-harvest-round](../../notes/implemented/2026-09-30-plugin-harvest-round.md) 批5b |
| 2 | `probe --full` 低峰双收口（提供方 TRANSPORT 悬挂 ~2min/次触发重试梯——非 0.2.0 适配问题，帧级定性在案） | 低峰窗口 + 有人点名（多步轮次暴露面大，不白跑） | 15/15 全绿或帧级定性结论归档进升 pin Note | [pin-upgrade-0.2.0-rc.2](../../notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md) 验证残留 |
