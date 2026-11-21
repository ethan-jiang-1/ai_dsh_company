状态：implemented（2026-11-21）｜上游 = [BUG-291](../../_backlog/_archive/fixed_bugs/BUG-291-cultivation-records-unreadable-in-panel.md)、[BUG-292](../../_backlog/_archive/fixed_bugs/BUG-292-cross-session-pending-approvals-not-aggregated.md)、[BUG-288](../../_backlog/_archive/settled_issues/BUG-288-attention-panel-list-missing.md)、[BUG-290](../../_backlog/_archive/fixed_bugs/BUG-290-text-command-silent-no-op-without-session.md)

# 可诊断失败：读面必须说得出「哪个盘、为什么」

## 决定

读面（面板数据面 / 判据入口）的失败从「折成 null」改为**结果型**，并且三条文案必须分开：

1. **失败带原因**：`DirListing = { ok: true, names } | { ok: false, reason }`；面板数据面把
   `recordsProblem = { path, reason }` 一路带到 UI。`null` 只表示「首读未完成」，不再兼任「读不到」。
2. **空态声明作用域**：工作区名由会话 cwd 取（`workspaceLabelOf`），两个壳（侧栏页签 + 公司整页）都传下去；
   写死「公司盘」等于让两个盘在 UI 上同形。
3. **三态分文案**：`读取中` ／ `读不到：<目录>——<原因>（不算 0 条）` ／ `这个工作区（<ws>）下还没有培养记录`。
   空 ≠ 不可达 ≠ 未完成，三种状态各自可判。

判据属「产品合同」级（公开听感面），但授权来自本轮批次（用户 2026-11-21 点名 4 张卡 + 两族合同）。

## F4 的那一半：面板按会话呈现，就把作用域说在明处

「等你处理」最初只是**会话内**的投影：活体登记覆盖整页在场期，历史重建只读当前会话。当时的处置是
把边界写进空态（C 版文案）。**同日后续**：跨会话那一半已用 `remote.session.page` 落地——见
[2026-11-21-cross-session-pending-approvals](./2026-11-21-cross-session-pending-approvals.md)；
空态文案随之改回「本会话与同工作区其它会话里挂着的审批都会出现在这里」。

## 输掉的方案

- **只加 `console.warn`，UI 仍说「尚未读到」**：诊断留在控制台，用户与另一台机器的维护者都看不见——
  上一轮两次误判正是这么发生的。否。
- **空态继续用「公司盘」泛指**：两个工作区同形，等于把「看的是哪个盘」交给记忆。否。
- **把「读不到」折成 0 条**：V2 的既有约定（不可达 ≠ 0），否；本轮只是把「不可达」说到位。
- **BUG-288 用 `session/follow` 跨会话重建历史挂起项**：实测**未打开的会话拿不到 history 帧**
  （20 个候选两轮实跑零帧），方案不成立；要重建得换 `session/page` 或宿主聚合查询，属立项量级。否（见未覆盖轴）。

## 验证

- `vitest run tests/client/cultivation/cultivation-board.spec.ts`：**4/24 红 → 24/24 绿**（新增四条分别钉
  「标题点名 workspace」「空态点名 + 不冒充读不到」「不可达点名目录与原因」「首读未完成说读取中」）。
- 真页面两盘对照（同一份代码，只换 `--workspace`，隔离 home）：
  `company-workspace` → 标题 `培养对象 = company-workspace × CEO`，列出盘上 2 条记录；
  `runtime/rehearsal-workspace` → 标题点名，正文「这个工作区（rehearsal-workspace）下还没有培养记录。」
- `node checks/lanes/attention-e2e.entry.mjs`：**红**，原因不在面板——见「未覆盖轴」第一条。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 读面失败带原因 | `packages/company-pack/src/client/cultivation/cultivation-data.ts`（`DirListing`） | 面板数据面 `recordsProblem` | 远端 `workspaceFiles.list` 的结果态 |
| 面板作用域点名 | `workspaceLabelOf(cwd)`（同文件） | `CultivationBoard` / `CultivationInbox` | 会话 cwd（`sessions.byId[id].cwd`） |
| 三态文案（zh/en） | `packages/company-pack/src/client/cultivation/cultivation-actions.ts` | 同文件 `CULTIVATION_COPY` | 缺省 zh，en 同 key |
| session-store 键派生单一家 | `tools/lib/session/session-store-key.mjs`（门禁 = `checks/gates/company-root-carriers.mjs` 规则⑤） | 审计入口 + 两条 snapshot-motion | 工作区绝对路径 |

## 未覆盖轴

- [environment-gap] `attention-e2e` 在本机不可满足：`sandbox-exec` 被系统禁 ⇒ `run/env.sh` 导出 `danger-full-access` ⇒ 审批策略 `never` ⇒ `approval/asked` 与 `approval/decided(rejected)` 同一毫秒，挂起项在这台机器上不存在 → `run/env.sh`
- [policy] 跨会话历史挂起项重建要换数据面（`session/page` 或宿主聚合查询），客户端侧无可行路径 → `_backlog/_archive/settled_issues/BUG-288-attention-panel-list-missing.md`
- [unprovable] 空白页斜杠命令的静默丢失在 vendor 的 composer/transcript 面（host handler 实测被调用、结果从未渲染），上游提案与复现留在卡里 → `_backlog/_archive/fixed_bugs/BUG-290-text-command-silent-no-op-without-session.md`
- [covered] 培养页作用域与三态文案 → `tests/client/cultivation/cultivation-board.spec.ts`
- [covered] session-store 键只许从 helper 出（规则⑤，三处已迁移）→ `tools/lib/session/session-store-key.mjs`
