# 2026-09-28 · UX 走查第一轮：全程模拟 + 三件小修 + 不修清单

状态：implemented（2026-09-28。用户令「模拟用户走一遍、只做小而准的调优」；本轮 = UX ongoing goal 的
第一轮全量扫描，与 2026-09-27 的 icon/配色/tooltip/浮窗四轮连续走查反馈同一 Note 家族，
单独立稿因为本轮是**系统性走查**而非单点反馈。）

## 走查方法

playwright 模拟真实用户全流程（每阶段独立容错）：进入 → 开团队会话（窗口标题【CEO】✓）→ 公司整页视图
（子页签 icon 一致性检查）→ 右栏开满 8 页签（Start-chip 回切模式逐个开）→ 8 面板逐个快照（色条/标题/空态/
内容）→ 双浮窗 → 关浮窗 → 浮窗内容可用性（380px 宽下表格溢出检查）→ console 错误全量收集。
证据截图 = /tmp/sweep2-*.png、/tmp/sweep-fix-*.png（一次性运行态，不进版本库）。

## 已修（三件，全部小改）

1. **公司视图子页签补 icon ×4 + tone**（CompanyView.tsx）：看板/依赖图/在场/用量四个子页签原先纯文字
   ——侧栏页签都有 icon 色，同一产品两套视觉语言 = 摩擦点。复用 tab-icons 的 glyph + tone 类。
   实证：4/4 hasIcon + tone 类在场。
2. **PanelFrame 内容区横向滚动**（company-tabs.tsx + styles.ts）：走查实测 380px 浮窗里任务板表格
   横向溢出且 `overflow: visible`——内容被裁到**够不着**（最小 220px 钳制下更糟）。修 = children 包
   `wk-pane-body`（`overflow-x: auto`），滚动而非裁切。实证：`overflowX=auto`，可滚 296px。
3. **公司视图「浮出」按钮动态对象名**（CompanyView.tsx）：`浮出` → `浮出看板`/`浮出在场`…——此前与
   侧栏面板的「浮出」同名并排（走查脚本 strict violation 即真人也会歧义的证据）；tooltip 本就带对象名，
   现在按钮文本也带。侧栏面板的按钮保持通用「浮出」（语境在面板头内）。

## 有意不修（带理由）

| 发现 | 不修理由 |
|---|---|
| `changes.summary` 404 ×2（对 session-a58a4800 轮询） | vendor UI 自身行为（我们包零调用，grep 证）；无用户可见影响（UI 优雅降级）；深挖属 vendor 内部、收益低——若用户在意再立案 |
| 关浮窗 = 页签关闭（chip 离条） | vendor 语义（close=close）；保留路径已有两条（我们的「收回」按钮 + vendor dock 图标钮）；行为实测确认 |
| 页签条 9 chip | 实测零裁切（clipped=0），无需处理 |
| 各面板空态文案 | 已友好（如待办空态「没有等你的事——各角色都在正常推进」）；不动 |
| 8 面板「每 5 秒自动刷新」meta 措辞 | 语义准确（数据面统一 5s 轮询）；不动 |

## 走查副产物（流程知识，已留档在相关 Note）

- guide（Start）被接管后点条目不顶掉 Start ⇒ 连开多页签的姿势 = 每轮先点回 Start chip（脚本与真人同理）；
- tsdown 入口 = tsc 产物（lib/types/**），两步必须连跑——本轮又验证一次（补进 bootstrap.md 的警告拦住了复发）。

## 验证

tsc -b + tsdown 两步连跑零错 / client-load-smoke ALL PASS / playwright 实证（公司视图 icon 4/4、
浮窗 overflow-x auto 可滚、动态按钮标签构建通过）/ verify ALL PASS + test 全绿 / CI 绿。
