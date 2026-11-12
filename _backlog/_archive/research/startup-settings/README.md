---
status: 已定性
opened: 2026-11-12
---

# 启动 Settings：composer 红框处的总设置入口与启动强制配置

> 问题：在 composer 工具栏红框处（auto-continue 与模型选择之间）加一个按钮，弹出总 settings：选依赖哪个 wiki、强制本次研究的产品类型 / 交付模式等「套路」，不让模型随意发挥。注入点、持久化、启动注入机制各是什么？可行形状与取舍？
> 消费者：用户 2026-11-12 直接点名研究（本会话；暂无活卡）
> 产出的卡：[2026-11-12 启动设置落地](../../settled_issues/2026-11-12-startup-settings-landing.md)（已结，去向 implementation）
> 归档：2026-11-12
> 结论：红框槽 `conversation.input.left` 可注入，且 DSH 有现成的「composer → `pluginNavigation.openBundle` → Plugins 页公司配置卡 → `configForms`/profile patch」原生通道（official experimental voice-input 同款）；但 settings modal 无公共 opener、DSH 无 workspace 级设置载体——推荐「DSH 原生承载公司级默认 + `.dsh-company/startup.json` 承载 workspace 覆盖」双轨，字段集 = 必选 6（wiki/productType/deliveryMode/method/collaborationMode/timeZone）+ 可选 3，五项决策待用户拍板（见落地材料 §10.3）。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-12-startup-settings.md](2026-11-12-startup-settings.md) | 工具栏注入点 / settings modal / 持久化 / 启动注入机制取证与方案比较 | 2026-11-12 |
| [2026-11-12-settings-candidates.md](2026-11-12-settings-candidates.md) | 全仓「可做成 setting 的指定点/默认值/阈值」盘点：58 行 A/B/C/D 分类 + 21 处猜问清单 + v1 字段集 | 2026-11-12 |
| [2026-11-12-dsh-native-landing.md](2026-11-12-dsh-native-landing.md) | 落入 DSH 的原生载体穷举（opener/pluginNavigation/settings.section/configForms/profile patch/per-session 载体/注入面）+ 推荐形状与五项决策 | 2026-11-12 |
| [2026-11-12-parent-handoff.md](2026-11-12-parent-handoff.md) | 父会话一手核实的机制锚点、合同层指针与跨题交接 | 2026-11-12 |
| [ux/](ux/)（[两步视觉稿](ux/2026-11-12-ux-two-steps.svg) + PNG） | 用户视角两步：点工具栏标签 → 点开「这个项目怎么跑」一张卡（三行，全有默认值） | 2026-11-12 |
