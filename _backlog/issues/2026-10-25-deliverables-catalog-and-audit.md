---
status: 推敲中
opened: 2026-10-25
---

# 推敲：成品目录与审计产品化（生成器随产品走）

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否

**问题与期望结果：** 成品页签读 `kb/deliverables-index.json`，但生成器是仓库工具 `tools/deliverables-index.mjs`，不在 tarball 里；新装公司的页签永久报“维护者运行 node tools/...”。期望：安装后的成品闭环可用——空态清楚、新增/`present` 后能刷新、审计状态有明确来源（或明确“未审计”降级）。

**当前情况：**
- 客户端读 `kb/deliverables-index.json`（[company-data-plane.ts](../../packages/company-pack/src/client/company-data-plane.ts)）；错误文案在 [DeliverablesTab.tsx](../../packages/company-pack/src/client/DeliverablesTab.tsx)。
- 生成器 [tools/deliverables-index.mjs](../../tools/deliverables-index.mjs) 依赖仓库的审计/会话日志逻辑；不在 pack `files`。
- 模板 [meta.md](../../packages/company-pack/workspace/templates/meta.md) 把词表指向 `tools/lib/deliverables.mjs`。
- chairing skill 写 `node tools/converge.mjs`；手册说“这条是机器检查的”，但安装后没有该检查。
- `present` 是宿主工具；host 能读会话事件，但目前没有产品侧的 catalog/present 投影。

**未决问题：**
- 产品化还是降级：host 侧生成 catalog + present 投影（推荐），还是把页签标成“操作员专属”并隐藏？
- `present` 真相从哪来：会话事件、工具调用、还是 workspace `meta.md`？要选一个稳定面。
- 审计范围：只做 catalog，还是把 `deliverables-check` 的最小判据（final 必须 present、meta 形状）也产品化？
- 现有 index schema 是否保持兼容？

**下一步：** 等 Q2/operator 决策；写 RFC；先写“空态 + 生成 + present 投影”的失败检查，再实现 host 侧 generator。

## 范围与排除项
- 范围：host 侧 catalog 生成/刷新、client 空态与错误文案、模板/skill 引用、release-smoke 断言、单测。
- 排除：完整 `deliverables-check` 平移到产品（可作为第二阶段）；跨会话审计 UI。

## 已知与未决
- 已知：`present` 是 vendor 工具，host 可观察会话事件；catalog 只是读模型。
- 未决：present 投影的持久化位置（workspace JSON / home storage / 现算）；刷新触发（按需 / present 后 / 启动时）。

## 方案与取舍
- A host 侧生成 + 按需刷新（推荐）：不依赖仓库工具，catalog 有产品内真相。
- B 把 `tools/*` 随包发：最快，但把开发工具变成产品依赖，且需要 Node/仓库布局。
- C 隐藏页签：最省，但删掉公司核心的成品/审计面；不推荐。

## 验收标准

（初稿；RFC 时定稿。）

- 新装（无任何成品）：页签显示“还没有成品”，不是“维护者运行 node tools/...”。
- 新建 `deliverables/<日期>-<slug>/final.md` + `present` → 刷新后 catalog 出现条目；meta 形状错 → 明确错误。
- `release-smoke` 断言首启 catalog 为空/可生成；无仓库工具引用。
- 单测覆盖 catalog 解析与 present 投影；`preset-smoke` 仍绿。

## 关闭条件
- Q2/operator 决策已定；RFC 已批；验收实跑；卡顶写结论与去向。

## 裁决（2026-10-25）

- 产品化：host 侧生成 catalog + present 投影；完整 `deliverables-check` 平移不做（第二阶段）；未核条目标 `presented: null`，不冒充已 present。
- 去向：`notes/implemented/2026-10-25-installed-shape-self-sufficient.md`。
