---
status: 等人拍板
opened: 2026-11-02
---

# 推敲：主界面去掉 Trajectory 页签与右侧栏 New Terminal 入口

> 立卡：2026-11-02 ｜ 状态：等人拍板 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否 ｜ 审查：用户 — 待验收
>
> **结论/去向**：做 → `note` — `notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md`（已落树，待用户验收；验收后写 Note 并归档）。
>
> **用户原话（2026-11-02 走查反馈）**：「主Tab 这里 Trajectory 不需要, 去掉。右边 sidebar New Terminal
> 也去掉, 没有必要。这个诉求显性化到 issues 我们要跟踪这个决定的落地。」
>
> **走查实例**：dev home `runtime/harness-home`、`company` profile（产品同形安装）；不是 3080 日用 home。

## 问题与期望结果

**问题**：company profile 的对话主区当前有三个 View tab（Chat / Trajectory / 培养），用户判定 Trajectory
不需要；右侧栏开始页有 New terminal 入口，用户判定没有必要。两者都是 DSH web-app 的出厂 UI，
不是本包自己的组件——本包只能通过组合层/配置层决定它们的去留。

**期望结果**：

1. company profile 主区不再出现 Trajectory；剩 Chat + 培养（两个 View 时标签栏仍在，不退回单 tab）。
2. 右侧栏开始页不再出现 New terminal；终端入口与快捷键一起去掉（`terminal-controller` 宿主服务是否
   一并禁用见 D4，推荐保留）。
3. dev 与产品同形：改的是 pack 的 bundle patch，产品用户装同一 tarball 即得到同样结果；不改
   `vendor/dsh`、不改 3080 日用 home。
4. 不误伤现有能力：五个公司角色、公司九页签、Chat/培养、代码差异等 `developerTools` 面保持现状。

## 当前情况（已核对）

- **Trajectory 归属**（T/C）：`vendor/dsh/packages/bundle/web-app/cordis.patch.yml:457` 的 `ui-trajectory`
  行 → `@deepseek-ai/dsh-client-ui-trajectory`；client 在 `conversation.view` 注册 id `trajectory`、
  order 10（`packages/client/ui-trajectory/src/client/index.ts`）。
- **现成开关不够窄**（C）：`ui-conversation` 在 `developerTools` 关时隐藏 Trajectory
  （`src/client/apply.ts:212`）；`ui-agent-preset` 同开关只过滤 built-in `ptc`/`minimal`
  （`settings-store.ts:53` 的 `requiresCodingTools` 只认这两个，**不隐藏公司五角色**），但它同时影响
  代码差异/交互预览，且是每用户设置而非产品默认——用它去 Trajectory = 连带关掉别的东西、还依赖
  用户手动拨开关，不作为产品方案。
- **New terminal 归属**（T/C）：`web-app/cordis.patch.yml:300` 的 `ui-sidebar-terminal` 行 →
  `@deepseek-ai/dsh-client-ui-sidebar-terminal`；client 注册快捷键 `terminal.new`（`src/client/index.ts:55`）、
  右栏 tab 类型 `terminal` 与开始页 guide `new`「新建终端」（同文件 71–73）；宿主服务 =
  `terminal-controller`（web-app:130）。
- **合法改动点**（C/T）：本包 bundle 层 = `packages/company-pack/cordis.patch.yml`；`- id:` 可替换
  web-app 已存在的行。两行都在 web-app bundle 顶层，pack 在其后叠加，不需要 vendor patch。
- **前序决定**（C）：[培养主视图 Note](../../notes/implemented/2026-10-28-cultivation-main-view.md) 决定 1
  与验收「主区严格三 tab：Chat / Trajectory / 培养」；[ui-demo](../../docs/design/ui-demo.md) 命名表同句。
  本卡落地是**部分取代**，新 Note 必须写清并给旧 Note/文档加指针。
- **发布面**（C）：0.7.0 未发布；本改动只改 pack 的 profile patch，不改 tarball 结构/版本；产品发布
  仍按 [publish-handoff](../../docs/guides/publish-handoff.md)。

## 未决问题

| # | 待定 | 推荐 | 若选另一条 |
|---|---|---|---|
| D1 | New terminal 的范围 | **禁用 `ui-sidebar-terminal` 整行**：入口 + tab 类型 + 快捷键一起消失；`terminal-controller` 保留为无 UI 的宿主服务 | 只隐藏开始页入口：上游没有「只去 guide」的配置/开关，需改 vendor client 或 CSS 覆盖，违反 vendor 铁律/易碎，不做 |
| D2 | Trajectory 的去除方式 | **禁用 `ui-trajectory` 行**：只去掉 view 注册；轨迹数据/会话日志仍在，Chat 兜底 | 关 `developerTools` 开关：会连带隐藏代码差异/交互预览与 built-in `ptc`/`minimal`，且是每用户设置而非产品默认，不做 |
| D3 | 生效范围 | **pack 层**：dev + 产品 company profile 同形；产品用户装 tarball 即得到 | 只改 dev profile：产品不同形，且 dev 绿推不出用户绿，违背 [parity 卡](../_archive/settled_issues/2026-11-02-dev-product-path-parity.md)，不做 |
| D4 | `terminal-controller` 是否一并禁用 | **保留**：无 UI 入口时不分配进程；少动一条宿主服务，回滚面小 | 一并禁用：更彻底，但可能影响隐藏消费者，需另证 |

## 方案与取舍

### P0 · pack 层禁用两行

- 在 `packages/company-pack/cordis.patch.yml` 增加两条替换行（`- id:` 带 `name` + `disabled: true`）：
  `ui-trajectory` 与 `ui-sidebar-terminal`。不新增行、不改 vendor。
- 迁移语义：已有会话保存的 view 偏好若指向 trajectory，`resolveActiveView` 兜底到 Chat；已保存的右栏
  terminal tab 没有类型注册后不再渲染（终端是临时进程，无持久数据损失）——落地时在 Note 里写清。
- 出场门：company profile 主区只剩 Chat + 培养；右栏开始页无 New terminal；快捷键表无 `terminal.new`；
  两条插件行为 disabled/absent；无 `did not activate`。

### P1 · 验证与文档

- keyless：新增/扩展断言（patch 里两行 `disabled: true`；或 client 组合 spec 断言 view 列表无 trajectory）。
- 真页面：`client-load-smoke` + `ui-scene-smoke`（主区 tab 清单、右栏 guide 清单、公司九页签仍在）。
- 文档/Note 指针：[ui-demo](../../docs/design/ui-demo.md) 的「三 tab」句、
  [培养主视图 Note](../../notes/implemented/2026-10-28-cultivation-main-view.md) 的部分取代回链；
  产品行为合同若提到主视图，同 diff 更新。
- 全量：`pnpm verify` / `pnpm test` / `pnpm typecheck` / `release --check`；preset/client 冒烟。

### 取舍

- 不追求「隐藏入口但保留终端」：上游没有窄开关，自建 CSS/slot 覆盖是脆弱的第二套；整行禁用是
  DSH 既有的 patch 语义。
- 不做 vendor patch / 不升 pin：两行都在 web-app bundle，pack 替换足够。
- 不改 3080 日用 home：本仓只改 company profile 的包与 dev home；用户日常环境不在范围内。

## 验收标准

1. 干净/现有 company profile：主区 View tab = Chat + 培养（无 Trajectory）；切 Chat/培养正常；公司九页签仍在。
2. 右侧栏开始页无 New terminal；`terminal.new` 快捷键不再注册；无终端 tab 类型。
3. 六角色 roster 零 broken；`preset-smoke` 真挂载 ALL PASS；无 `did not activate` / loader error。
4. `ui-scene-smoke`（或等价真页面）断言：tab 清单无 trajectory、右栏 guide 无 new、公司页签齐全。
5. `pnpm verify` / `pnpm test` / `pnpm typecheck` 绿；`release --check` READY；tarball 内含新 patch。
6. 文档/旧 Note 的「三 tab」已改为「Chat + 培养」并带部分取代指针；parity 指南无新增表外差异。

## 范围与排除项

**范围**

- `packages/company-pack/cordis.patch.yml` 两行禁用；相应 keyless 断言/真页面检查；docs/Note 指针；
  发布前复验。

**排除**

- 改 `vendor/dsh`、升 pin、给上游提交 Trajectory/terminal 的配置项。
- 删除 `terminal-controller` 宿主服务、删除轨迹数据/会话日志（只去 UI 入口）。
- 改 3080 日用 `~/.dsh` home、改五角色 persona、改公司页签/培养视图。
- 真实 npm publish（仍走 publish-handoff）。

## 实施回执（2026-11-02）

**P0 完成**：`packages/company-pack/cordis.patch.yml` 加 `ui-trajectory` / `ui-sidebar-terminal` 两条
顶层替换行（`disabled: true`）；`terminal-controller` 保持 active。落地 Note =
[remove-trajectory-terminal-ui](../../notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md)。

**P1 完成**：`tests/company/ui-surface.spec.ts` 5 条 keyless；干净 home 产品形安装 + `preset-smoke`
ALL PASS；真页面主区 = Chat + 培养、右栏 guide = 9 公司页签、无 New terminal；`pluginInventory`
两条 `enabled:false`；`pnpm verify` / `pnpm test`（124 files / 1042 passed）/ `pnpm typecheck` 绿。

**附带修复**：`tools/company.mjs` 的旧 tarball 清理从 `plugin add` 前移到 add 之后——换内容时先删旧文件
会让 pnpm 读旧 spec 时 ENOENT（实测 `abef80f4` → `5fe5f189` 红）；修后安装成功、旧 tarball 清掉、
新 tarball 保留。

**未决**：`ui-attachment` 的 type-only `inject` 仍列 `ui-trajectory`，`preset-smoke` 闭包 lint 报
非致命 WARN；上游 tidy-up 不在本卡。

## 关联

- 用户反馈来源：2026-11-02 观察窗走查（dev home `runtime/harness-home`，`company` profile，端口 57849）。
- 前序决定：[培养主视图 Note](../../notes/implemented/2026-10-28-cultivation-main-view.md)（三 tab；本卡部分取代）。
- 同形约束：[dev/产品 parity 卡](../_archive/settled_issues/2026-11-02-dev-product-path-parity.md)、
  [parity 指南](../../docs/guides/dev-product-parity.md)。
- 现行合同/设计：[profile](../../docs/profile.md)、[ui-demo](../../docs/design/ui-demo.md)。
- 上游载体：`vendor/dsh/packages/bundle/web-app/cordis.patch.yml`（行 300/457）、
  `vendor/dsh/packages/client/ui-sidebar-terminal/`、`vendor/dsh/packages/client/ui-trajectory/`。
