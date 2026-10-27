---
状态：implemented（2026-10-28，第四轮批 E3：host apply 首刀）
---

# 批 E3：把 host apply 的两个内联工具/门投影拆出入口

> 上游 = [第四轮六维打扫卡](../../_backlog/_archive/settled_issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-08）](../../_backlog/_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. `request_signoff` 的 `defineTool` 定义搬到 `host/signoff-tool.ts`，导出 `registerSignoffTool(ctx)`；apply 只调用注册。
2. 工作区门投影（`api-session/added|removed|status` 事实表）与 `workspace_doors` 工具搬到 `host/workspace-doors.ts`，导出 `registerWorkspaceDoors(ctx)`；apply 只调用注册。
3. apply 的文档头改成“编排入口”：运行前提 + 装配次序，具体实现按 host 文件分家。
4. `defineTool` / `signoffReason` / `signoffDecisionNote` / `doorsFromSessions` 从入口 import 移除，入口不再持有工具 schema。

## 输掉的方案

- **把整个 apply 一次性拆成 7 个 register 函数**：拒绝。先拆两个最大的内联工具，保持本批可审查；bootstrap/bundle/catalog 仍留在 apply，下一刀再动。
- **把门投影 facts 做成模块级单例**：拒绝。fact 表必须按 apply 闭包隔离（重载/多实例不串），所以 `registerWorkspaceDoors` 内部创建 Map。

## 后果

- `apply` **326 → 214 行**；`src/index.ts` 280 行。入口只剩前提、注册调用、bootstrap/bundle/catalog 编排。
- 两个工具 schema 与门投影各住一个 host 文件；`workspace_doors` 的事实表仍按 apply 闭包隔离。
- 未动：`CultivationBoard` 583 行（单组件 483）、client `index.ts` 316 行（apply 201）、bootstrap/bundle/catalog 段仍在 apply。

## 验证

- `pnpm test tests/company/host-composition.spec.ts tests/company/apply-lifecycle.spec.ts tests/company/catalog-wiring.spec.ts` → 10 passed。
- `pnpm verify` → ALL PASS；`pnpm typecheck` → exit 0。
- 注册面仍 3 工具 + 2 命令（host-composition 的名单断言未改）。

## 未验 / 下一步

- Board/client apply 未拆；E4 转 `CultivationBoard`（先抽状态 hook 与四段 JSX 子组件）。
- 未跑真模型/真页面；本批只动 host 注册面，keyless 覆盖足够。
