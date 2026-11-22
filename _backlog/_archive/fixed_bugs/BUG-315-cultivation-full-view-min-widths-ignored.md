---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-315：培养主视图在 768px 下把左板/右栏压到 210/176——声明的 BOARD_MIN/CHAT_MIN 没有生效

> 严重级别：P2（次要偏重：主视图在窄桌面/分屏下仍可打开，但左右两栏都低于自己声明的下限，板面与对话都被压成不可读的窄条）｜发现：2026-11-22（E2E 第四轮）｜状态：已修｜审查：agent — 逐条核对已修判定（三档容器 + 边界 + 真 Chromium 量 CSS）
>
> **留痕**：commit 170be97a（client 布局，材料性；批次 Note 覆盖）。

## 症状

1440 下打开「培养」主视图正常。把视口调到 **768×900**（左右侧栏都开着），打开同一主视图：

实测（Playwright `getBoundingClientRect`）：

```
innerWidth 768
split.width 393
board.width 210.16   （BOARD_MIN = 380）
chat.width  176.84   （CHAT_MIN = 280）
```

- 文档没有横向滚动（`docScrollWidth = 768`），所以不是「滚动能解决」；
- 两栏都被 flex 压到远低于声明下限；
- 拖动分隔条也无法把板面拉回 380：`max = split.clientWidth - BOARD_MIN` 在 393 宽下只有 13，被 `Math.max(CHAT_MIN, …)` 夹成 280，板面反而更窄。

## 运行面

- **面 = client**：`packages/company-pack/src/client/cultivation/CultivationView.tsx` 的 `CHAT_MIN=280` / `BOARD_MIN=380` / `CHAT_DEFAULT=390` 与 `beginResize`；CSS 的 `--wk-cult-chat-width`。
- 触发条件 = 主区可用宽度 < BOARD_MIN + CHAT_MIN（左右侧栏同时打开时很常见）。

## 复现

1. 起实例，打开一个有会话的页面（主 tab「对话 / 培养」在场）。
2. 视口设为 `768×900`；左右侧栏保持打开。
3. 点主 tab「培养」。
4. `document.querySelector('.wk-cult-view-board').getBoundingClientRect().width` ≈ 210，`.wk-cult-chat` ≈ 177；两者都低于常量。

本轮证据：`runtime/tmp/e2e-evidence/fullview-768.png`（gitignored）。

## 根因与证据

- 常量：`CultivationView.tsx` 附近 `CHAT_MIN = 280`、`BOARD_MIN = 380`、`CHAT_DEFAULT = 390`。
- 初始宽度只按 localStorage/默认 390 算，**不看当前 split 可用宽度**：`initialChatWidth()` 只 clamp 到 `CHAT_MIN..CHAT_MAX`，没有 `split.clientWidth - BOARD_MIN` 上限。
- CSS 侧 `--wk-cult-chat-width: 390px` 在 393px 容器里被 flex 压缩到 176；板面同理，两边的 min-width 没有在布局层强制。
- 拖动时 `max = Math.max(CHAT_MIN, Math.min(CHAT_MAX, split.clientWidth - BOARD_MIN))`：393 - 380 = 13 → max=280；仍不能让 board ≥380，说明约束本身不可满足时没有「折叠侧栏/堆叠/横向滚动」的兜底。

## 失败类与同类排查

**失败类 = 声明了下限但没有在容器不足时降级**。同类：

- 本包其它窄栏（390）在 vendor 布局里折叠侧栏；主视图没有对应策略。
- `TasksTableView` 在窄栏用 `overflow-x:auto` 兜底；主视图没有。
- 不是字体/内容问题：即使空板/空对话，宽度也低于下限。

## 修复方案与范围

- **根因修法**：在挂载/ResizeObserver 时把 chat 宽度 clamp 到 `min(CHAT_MAX, max(CHAT_MIN, splitWidth - BOARD_MIN))`；当 `splitWidth < BOARD_MIN + CHAT_MIN` 时降级（折叠一侧/上下堆叠/至少给 board 横向滚动），不要静默压扁。
- 分隔条 `max` 采用同一计算；当不可满足时禁用拖动或切换布局。
- **判据**：768/900/1024/1440 四档：board ≥380 或明确堆叠；chat ≥280 或隐藏；无横向溢出；拖动不越界。
- **不改**：1440 的默认 390/板宽；localStorage 宽度记忆。
- **材料性**：client 公开布局；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 768 下主视图要么两栏都 ≥ 声明下限，要么切换成明确的堆叠/折叠布局（不是 210/176 静默压扁）；
- 拖动分隔条不能产生低于下限的布局；
- 1440 默认布局不回归；
- 四档视口各一条几何断言 + 截图。

## 修复证据

- 改动面：`packages/company-pack/src/client/cultivation/CultivationView.tsx`（`splitLayout` + `BOARD_MIN`/`CHAT_MIN`/`SPLIT_GAP` 导出 + ResizeObserver + `data-stacked`）、`packages/company-pack/src/client/ui/styles.ts`（堆叠栅格）、`tests/client/cultivation/cultivation-view-layout.spec.ts`
- 红：`vitest run tests/client/cultivation/cultivation-view-layout.spec.ts` —— 把 `splitLayout` 改回「永远两栏、右栏按期望宽」后「768 视口（容器 393）⇒ 堆叠」与「差 1px ⇒ 堆叠」失败（真实页面即 210/176 的窄条）
- 绿：`vitest run tests/client/cultivation/cultivation-view-layout.spec.ts` —— 5/5（393 堆叠；1100 两栏且两侧 ≥ 下限；刚好放下 / 差 1px 边界；期望过宽时左板仍 ≥ 下限；首帧未量到不跳）
  真 Chromium 量真 CSS 规则（从 `styles.ts` 原样抽）：1440 ⇒ board 1044 / chat 390；1100 ⇒ 704 / 390；768 堆叠 ⇒ 768 / 768；375 堆叠 ⇒ 375 / 375
- 提交：commit 170be97a
- **未做到的一步（如实记）**：整页（`conversation.view`）的端到端测量没取到——隔离实例无登录/模型，GUI 停在落地页开不出会话；本轮证据是「单元判据 + 真 Chromium 量真规则」两块，页面级测量列入未覆盖轴。
