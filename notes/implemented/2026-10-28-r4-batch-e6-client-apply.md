---
状态：implemented（2026-10-28，第四轮批 E6：client apply 收口）
---

# 批 E6：client `apply` 201 行压到 45 行，五块注册面各自有名

> 上游 = [第四轮六维打扫卡](../../_backlog/_archive/settled_issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告](../../_backlog/_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md) R4-08。

## 决定

1. `client/index.ts` 的 `apply` 只保留 effects（styles / error capture / instance guard）、错误 reporter、attention registry 与五个注册调用。
2. 五块注册面各自成命名函数，仍在同文件（不引新循环依赖）：
   - `registerTitle(ctx)`：窗口标题 + `:root[data-wk-role]`；
   - `registerToolCards(ctx)`：委派卡 + 团队卡 keyed slots；
   - `registerSidebarIdentity(ctx)`：品牌、角色徽标、会话头任务板；
   - `registerCompanyTabsWiring(ctx, attention)`：公司页签数据面 + `registerCompanyTabs`；
   - `registerCompanyViewWiring(ctx)`：公司整页视图 + `conversation.view` 注册。
3. `apply` 从 201 行降到 **45 行**；行为、inject 依赖、注册顺序不变。

## 输掉的方案

- **把五块拆到新文件**：拒绝。`makeContextWiring` 与 `ContextWiringScoped` 仍在同文件，搬出去会造循环 import；先在模块内命名分层，等这些闭包有第二个消费者再搬家。
- **把数据面工厂抽成共享实例**：拒绝。两个 inject 块的 scoped remote 不同，不能简单共用；保留各自构造，避免把“共享”误做成跨作用域单例。

## 后果

- 四个入口级函数现状：host `apply` 214、`CultivationBoard` 226、`cultivationCommandHandler` 206、client `apply` 45。
- 公司页签/整页两块从 apply 体内移出，改注册面时按函数名定位；`apply` 读起来是装配清单。

## 验证

- `pnpm test` → **110 files / 977 tests**；`pnpm verify` → ALL PASS；`pnpm typecheck` → exit 0。
- `ui-scene-smoke --isolated --golden` ×3 → 全绿（client apply 改动后真页面无回归）。
- 全量测试里 `company-client-composition` 的 whole-client 卸载/重载仍绿（注册/卸载面未改）。

## 未验 / 边界

- 五块仍在同文件（377 行），不是“每块一个文件”；这是本批的边界。
- Board 余下四块、command handler 六支内联、测试 helper/单 it 巨测仍是 P3 以后做。
