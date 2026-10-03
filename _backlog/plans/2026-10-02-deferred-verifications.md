# 推敲（残检收口）：两笔挂起的验证债——browser 行为复跑与 probe --full 低峰收口

> 状态：推敲中（**触发条件型等待卡**——两笔"待续"从 2026-09-30 收割轮 / 升 pin 轮的 intents 行迁来立卡，2026-10-02 intents 瘦身轮；细节住各自 Note，本卡只管触发与判收，不复述）｜毕业门判断 = 两笔各自触发条件成立、跑完判收即整卡毕业迁 `_done/_closed_plans/`｜复活方 = 触发条件成立（chromium 装好 / 低峰窗口）且用户点名或维护者顺手收口

## 挂起项

| # | 项 | 触发条件 | 判收 | 出处（细节的家） |
|---|---|---|---|---|
| 1 | browser-use 行为验证复跑（playwright-mcp 选型后 `browser_navigate` 等后续行为） | chromium-1243 安装审批通过并装好 | 真调用行为断言落日志（同批5b 首验口径） | [plugin-harvest-round](../../notes/implemented/2026-09-30-plugin-harvest-round.md) 批5b |
| 2 | `probe --full` 低峰双收口（提供方 TRANSPORT 悬挂 ~2min/次触发重试梯——非 0.2.0 适配问题，帧级定性在案） | 低峰窗口 + 有人点名（多步轮次暴露面大，不白跑） | 15/15 全绿或帧级定性结论归档进升 pin Note | [pin-upgrade-0.2.0-rc.2](../../notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md) 验证残留 |
