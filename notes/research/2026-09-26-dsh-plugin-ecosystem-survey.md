# 成熟 DSH 插件调研 → 上游 seam 提案稿（2026-09-26）

状态：**活研究**（喂给谁 = ROADMAP 搁置池三行：审批带版本/哈希、分类色板、结构化派活字段；毕业动作 =
seam 提交上游或 MVP 采纳后，结论并入 owner 文档本稿按 research 层生命周期处置）。
方法依据 = D29（动手发明前先探索、借鉴成熟 DSH 插件思想，下载量/影响力门槛）。

## 一、调研面

- 语料 = [awesome-dsh-plugins](https://github.com/jqueryscript/awesome-dsh-plugins)（386 插件，准入 ≥30★，star 核实 2026-09-22）+ 上游 `vendor/dsh/docs/capability-seams.md`（钉住 rc.2）。
- 检索四类：审批/策略、主题/配色、通知/收件箱、任务/owner 结构——对应本仓三条 seam 与结构化派活字段决策。

## 二、四类对照（谁做了什么、缺口在哪）

| 类 | 成熟插件（★） | 做了什么 | 对本仓的含义 |
|---|---|---|---|
| **审批/策略** | [Auto Review](https://github.com/PerryLink/dsh-auto-review) 115 / [Auto Mode](https://github.com/NanmiCoder/dsh-auto-mode) 133 / [Approval Gate](https://github.com/moon09300731/dsh-approval-gate) 63 | 审批流**可挂钩**：结构化 allow/deny 裁决信封、fail-closed 工具调用分类、可配置闸门与预设 | 证实 `ctx.approval` 是插件可观察可扩展的面；**无一家把稿件版本/哈希绑进审批载荷** ⇒ 版本穿透缺口（quote-z 活体实证）仍真、提案不重复造轮子 |
| **主题/配色** | [Transparent UI](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin) 388 / [Dream Skin](https://github.com/RevolutionLA/dsh-dream-skin) 125 / [Skin Market](https://github.com/kingOfSoySauce/dsh-skin-market) 105 | 整体皮肤/壁纸/明暗/accent 色，per-user 持久设置 | 全是**观感层**（accent = 单一强调色）；**无语义分类色板**（数据类别 → 稳定可区分色的令牌系统）⇒ 色板 seam 是真空白 |
| **通知/收件箱** | [DSH Pocket](https://github.com/shaobeichen/dsh-pocket) 770 / [Notifier](https://github.com/THEWOLFWALKER/dsh-notifier) 80 / web-push（搁置池已登记） | 会话镜像到手机、notify API + 渠道适配、远端审批 | 印证搁置池「借设计不装」裁决（MVP 期评估依赖门槛）；收件箱/通知 seam 有成熟参照形状 |
| **任务/owner 结构** | [Taskboard](https://github.com/shengsheng90/DSH-taskboard) 187 / [Agent Team GUI](https://github.com/toolclub/dsh-agent-team-gui) 153 / [Jev Decision](https://github.com/Devin-AXIS/jev-dsh-decision) 68 / [DSH YOLO](https://github.com/hanshanyike/dsh-yolo) 59 | 任务板/里程碑/结构化 owner 决策/DAG 编排 | 「任务结构化」是公认插件空间；本仓变体（**派活行内嵌任务书 + 回写纪律**）是文件原生形状，符合 D13 不引插件 |

## 三、Seam 提案稿 ①：审批载荷携带稿件版本/哈希

- **问题（活体实证）**：双签两半的审批理由钉 `cfo.md v2`（CEO 预写失效条款），CFO 签字轮推稿到 v3 ⇒
  盘面/审批错位，靠 final 人工对账兜住。根因 = 审批→版本的绑定只活在 `request_signoff` 的自由文本参数里，
  `approval/asked` / `approval/decided` 事件**无结构化版本字段**（源码核实，钉住 rc.2）。
- **上游扩展点（已核对存在）**：`ctx.approval` seam（`user-approval` 包）+ `approval/request` waterfall
  （capability-seams.md 服务表已文档化）。
- **提案形状**：`approval/request` 载荷增加**可选** `context` 结构（如 `{ slug, path, version, hash }`，由请求方
  自带、上游不解释只透传）；`approval/asked` / `approval/decided` 事件原样透传该结构。**无 context = 现状不变**
  （向后兼容，不强制所有审批携带）。
- **借鉴**：Auto Review 的结构化裁决信封证明"附加结构化数据随审批流走"是既有实践；我们只把它用到版本绑定。
- **效果**：审批记录可机器核对"签的是哪一版"（authorship-audit / 对账工具的直接输入）；不再依赖自由文本纪律。

## 四、Seam 提案稿 ②：分类色板令牌（categorical palette）

- **问题（活体证据）**：角色身份 UX 交付后，五个角色的徽标**共用品牌色**（黑色药丸），区分全靠读字——
  用户实测方向感"勉强能"。要每角色一色，平台令牌盘点（design-platform.css 182 个）只有语义状态色
  （error/success/warn/business），挪用会误导；feature 包禁写字面色（styling 纪律）⇒ 本仓**无法合规自解**。
- **提案形状**：design-platform 增加一组**语义中立**的分类色令牌（如 `--dsw-cat-1 … --dsw-cat-8`），只承诺
  "彼此可区分、明暗两套下可读"，不绑定任何含义；消费方自建 类别→令牌 映射（角色徽标是第一个消费者）。
- **借鉴**：皮肤插件的 accent 概念与 per-user 持久设置证明"用户可配置的外观"是既有实践；本提案把它提升为
  **平台令牌**（纪律合规），而非插件字面 CSS。
- **效果**：任何插件区分数据类别（角色/部门/动议类型）都有合规用色；深浅色主题自动适配。

## 五、结构化派活字段：生态佐证（补结论稿）

Taskboard / YOLO / Jev / Agent Team GUI 证实"任务结构化 + owner 指派"是公认插件空间；本仓结论
（要，配状态回写 + 双源核对两条纪律）与生态方向一致，但**不引插件**——派活行内嵌任务书是文件原生形状
（D13：优先现成载体）。生态里无一家做"任务书内嵌派活行 + 回写"的轻量变体，本仓做法不重复他人工作。
