---
状态：implemented（2026-10-28，第四轮批 E4：CultivationBoard 首刀）
---

# 批 E4：把 483 行的培养面板拆成状态 hook + 收件箱组件

> 上游 = [第四轮六维打扫卡](../../_backlog/issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-08）](../../_backlog/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. **状态/动作出组件**：新建 `client/use-cultivation-board.tsx`，收 13 个 `useState`、`inFlight` 双击护栏、`capList/capControl`、`stampOf`、`run`、`confirmReject`、`openContextOf` 与 `outcomeOf`；返回值是 `CultivationBoardState`。
2. **最大一块出组件**：新建 `client/CultivationInbox.tsx`，“需要我处理”整块（记录/背景/折叠/采纳/拒绝/回执）只从 `board` 读状态；控件与文案逐字不变。
3. **Board 只留编排**：`CultivationBoard` 从 483 行降到 **226 行**（文件 311 行），保留身份条、创作入口、我提交的、已采纳、journal、赞踩与命令行折叠；`recordKindLabel` 随收件箱走。
4. **类型/导入同步**：`BODY_PREVIEW_LINES` 从 hook 导出；Board 清掉 `useRef/useState`、`recordInbox/recordStampOf/timeLabel`、已迁走的 helper 导入。

## 输掉的方案

- **一次把四块都拆成组件**：拒绝。先拆最大（~175 行）的收件箱与状态 hook，保留其余三块在原文件，避免一轮改动面过大。
- **用 Context 隐式传 board 状态**：拒绝。显式 `board` prop 可追踪、可测试；Context 会新增一层隐式依赖。
- **把状态留在 Board、只拆 JSX**：拒绝。状态机（双击护栏/回执/pending）才是 483 行的主体；先出 hook 才能让子组件只读。

## 后果

- `CultivationBoard` 函数 **483 → 226 行**；文件 **583 → 311 行**。
- 收件箱 221 行、状态 hook 181 行，各自可单独读/测；46 条 board spec 全绿。
- 未动：我提交的 / 已采纳 / journal / 赞踩四块仍在 Board；client `index.ts` apply 201 行仍是下一块。

## 验证

- `pnpm test tests/client/cultivation-board.spec.ts tests/client/cultivation-board-actions.spec.ts` → **46 tests passed**。
- `pnpm test` → **110 files / 974 tests**；`pnpm verify` → ALL PASS；`pnpm typecheck` → exit 0。
- 拆前后文案/按钮/键盘路径未改；`cultivation-board-actions` 的点击→命令行断言是行为级兜底。

## 未验 / 下一步

- Board 剩余四块未拆；E5 继续拆“已采纳/我提交的/journal”或转 client apply。
- observer 生产接线、共享 test helper、单 it 巨测仍未做；六维复评待这些收口后跑。
