---
status: 已结
opened: 2026-11-12
---

# 界面呈现层 zh/en：Tab / Label / Button（默认 zh）

> 立卡：2026-11-12 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：用户 — 2026-11-12「只要界面上呈现部分有支持中英文的问题，就是 TAB、Label、button 这些」；agent — en/zh 真页面 + 1669 tests
>
> **结论/去向**：note — [表达层双语实施 Note](../../../notes/implemented/2026-11-12-i18n-expression-role-pilot.md)（范围 = 界面可见文案；I2/I3 不做）

## 原始意图（用户原话）

> 「好的，没有问题。这个应该是个挺挺轻松的事儿，是吧？就是要细致一些……兼容的问题不重要，我们只看今后怎么做对就行。」
>
> 「好的，挺好，那就那个这痕迹吧，显性化成issue，然后转向notes……要么就全英文。」
>
> 「嗯嗯, 其实只要界面上呈现部分有支持中英文的问题, 就是TAB, Label, button这些, 明白?」

## 问题与期望结果

**问题**：原来把「内部全英文」扩大成了全仓内容/注释/docs 迁移，偏离了用户真正要的：**只让界面上看得见的 Tab、Label、Button、空态/错误等文案支持 zh/en，默认 zh**。

**期望结果**：

1. company UI 的可见文案 zh/en，默认 zh；
2. 角色名按已定混排规则（CEO · 首席执行官 / 短 badge）；
3. 页面切换 English 后，9 个公司页签无中文残留；
4. 默认中文下 zh 金样不回退；
5. 内部注释、测试名、开发者文档**不做全量翻译**；I2/I3 从本卡范围移除。

## 当前情况（已实现）

- 9 个页签的 Tab / 标题 / Label / Button / 空态 / 错误：
  - 待办、看板、DAG、在场、用量、任务板、培养、台账、成品。
- 共用 PanelFrame：浮出/收回/刷新文案。
- 工具卡 / 委托卡。
- 培养：视图壳、Inbox、Journal、Feedback、Mine、Adopted、Board 说明、Chat、Compose。
- 角色名、catalog type/result、host 结果标签。
- 默认 zh；`locale.preference` 切换后无需刷新。

## 范围与排除项

**在范围内**：
- `src/client/**` 的用户可见文案（Tab / Label / Button / 空态 / 错误 / aria）；
- 角色名与结果/状态标签的表达层映射；
- 默认 zh、en 真页面、zh 金样、keyless 回归。

**明确排除**：
- I2：`src/**` 注释/日志/测试名全量翻译；
- I3：README/docs/AGENTS 开发者文档全量翻译；
- 内部 content 存量迁移作为本卡前置（已完成的部分保留，不作为完成条件）；
- 中英双份 UI / 每语言 preset / 端到端测试资产。

## 验收标准

- [x] 9 个公司页签 en 无中文残留：`ui-scene-smoke --isolated --lang en` ALL PASS。
- [x] zh 金样一致：`ui-scene-smoke --isolated --golden` ALL PASS。
- [x] Tab / Label / Button / 空态/错误走 company 字典；工具卡/委托卡/培养可见文案已接。
- [x] 角色名按 `roles.*` / 混排规则；默认 zh；切换无需刷新。
- [x] `pnpm test` 208 files / 1669 tests passed；`typecheck` / `lint` / `dup` / `verify` / `preset-smoke` 通过。
- [x] 未跑项如实记录：真模型 prompt 未跑（不属于界面呈现层验收）。

## 抽象度

- 换公司要改吗？→ 不改；语言是表达层偏好，公司名只来自部署 identity。
- 换产品类型要改吗？→ 不改；UI 文案与产品类型正交。
- 换做法要改吗？→ 会；新增界面文案必须同 diff 加 zh/en key，默认 zh。
- 只有机制本身变吗？→ 表达层是 UI 文案机制；内部英文不再是本卡范围。
- 第二消费者：中文用户 + 英文用户；内部代码/注释不消费这些文案。
- 搬家成本：低；字典 + 组件 `t`。

## 关闭条件

- 上述验收标准全过；真页面 en/zh 复跑通过。
- 归档时按 backlog 规则 `git mv` + 两索引。
