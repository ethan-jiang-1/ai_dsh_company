---
status: 调查中
severity: P2
opened: 2026-10-18
---

# BUG-023：培养面板浮出成浮窗后，行内动作点了没反应

> 立卡：2026-10-18 ｜ 状态：调查中 ｜ 发现：UX 场景轮（`probes/browser-visual/cultivation-ux-scenarios.mjs` S4b）
> 严重级别：P2（不损坏数据；但"浮窗里看着一样、点了没反应"是静默失效——人多半会再点几次然后放弃）

## 症状（真浏览器实测）

真 web + chromium，CEO 会话、公司盘、培养页签：

1. 点面板头「浮出」→ 浮窗出现（`[data-dockkit-float]` ×1）；
2. 浮窗里能看到待办行（`待处理 uxsc-…-bulk-1`，含「采纳」「拒绝」按钮）；
3. 点「采纳」→ **记录不翻 adopted、行内无任何回执/错误**（说明 `actions.run` 压根没被调用，不是 host 拒绝）。

## 现场证据（同一轮探针日志）

- `浮出前已有浮窗 0 个 → 浮出后 1 个`（排除"旧副本"干扰）；
- `浮窗容器内同名行有 2 份（副本）`——**浮窗容器里同一行出现两份**；
- 逐份试（`force: true` 两份都点）→ 记录仍不翻；首份行文本原样是 `CEO分身的纠正 | UX场景：批量待办 2 | 做法：第 2 条。 | 采纳 | 拒绝`（无 `处理中…`、无回执）；
- 同一个按钮在**停靠**面板里点一次就生效（同轮 S2a/S3/S6 都证明过）⇒ 差异只在"浮出"这个形态。

## 猜测（待证，别当结论）

- 浮窗里可能是**第二棵 React 树**（`sidebar.right.pane.tab` body 被 portal/克隆到浮窗容器）⇒ 命中测试落在了非活副本上（点击事件没到 handler）；
- 或者浮窗几何来自陈旧 rect（离屏）⇒ 强制点击派发到视口外，事件不落地；
- 两份副本本身也说明"同一 pane 被渲染了两次"，与上面任一条都相容。

## 复现

```sh
source run/env.sh && node probes/browser-visual/cultivation-ux-scenarios.mjs --shots
# 看 S4b；截图落 runtime/human-exits-evidence/ux-scenarios/S4b-float*.png
```

## 已修判定（待写：修法定了再补）

- [ ] `--shots` 那轮到 S4b 能 PASS（浮窗里点一次「采纳」→ 记录翻 adopted + 行内出回执）；
- [ ] 浮窗容器内同名行**只有一份**（或两份但都活）；
- [ ] 顺带确认：浮出状态**跨会话恢复**时不会把旧会话的面板带进来（本轮另有一条同族观察）。
