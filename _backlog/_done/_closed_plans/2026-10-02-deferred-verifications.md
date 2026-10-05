# 推敲（残检收口）：两笔挂起的验证债——browser 行为复跑与 probe --full 低峰收口

> 状态：**已毕业（2026-10-05 用户令维护者侧系统性复跑浏览器行为链——「你已经有自己测试浏览器的能力」；两笔全判收）**｜毕业门判断 =
> 第 2 笔 2026-10-03 补跑判收（14/15、TRANSPORT 零复发）；第 1 笔 = browser-behavior-probe 首跑 5/5——
> 导航/读内容/点击/输入真调用断言落资产，角色会话沙箱两层墙精确定位（EPERM 缓存标记层已被 env 重定向
> 击穿：HOME + PLAYWRIGHT_BROWSERS_PATH，B0 栅栏内实证；chromium 子进程沙箱内崩溃层待 seam ②）｜
> **去向指针 = [implemented/2026-10-05-browser-behavior-probe](../../../notes/implemented/2026-10-05-browser-behavior-probe.md)**
> （分层判据、seam 选型证据、上游一行修复点住那里）

## 挂起项

| # | 项 | 触发条件 | 判收 | 出处（细节的家） |
|---|---|---|---|---|
| 1 | browser-use 行为验证复跑（playwright-mcp 选型后 `browser_navigate` 等后续行为） | ~~chromium-1243 安装审批通过并装好~~ **已成立（09-30 装好）——但出新阻塞**：角色会话产品沙箱拒写 playwright 缓存树（EPERM 整树拒绝非缺目录；工具会挂载、调用失败、模型诚实回退）⇒ 判收前置 = **上游 seam 三选一**（provider 可配缓存目录 / sandbox×browser-use 白名单 / attach 模式），见出处 §风险 | 真调用行为断言落日志（同批5b 首验口径） | [plugin-harvest-round](../../../notes/implemented/2026-09-30-plugin-harvest-round.md) 批5b |
| 2 | ~~`probe --full` 低峰双收口~~ **已判收（2026-10-03，用户点名触发补跑）**：`--full --timeout 240000` = 14/15 PASS、**TRANSPORT 零复发**（升 pin 轮四轮悬挂未再出现——提供方容量抖动定性关闭）；唯一 miss = ceo#3 内容断言词面（回复实质正确，非缺陷） | ~~低峰窗口 + 有人点名~~ 已兑现 | ✅ 帧级定性归档进升 pin Note §风险 补跑登记 | [pin-upgrade-0.2.0-rc.2](../../../notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md) §风险 |
