# 2026-11-13 · 错误环不再把浏览器良性通知当 client 错误

状态：implemented（2026-11-13 落地）

上游 = 用户「启动一下这个插件」的启动自检（[web-window-ops](../../.agents/skills/web-window-ops/SKILL.md) 呈现即验证）：
`cdp-probe` 在健康实例上判红，暴露的是错误环的取文顺序与过滤缺口，不是启动失败。

后续（2026-11-14）：`textOf` 的取文顺序继续收口——普通对象先读 `message`/`reason`/`name`，`'{}'` 不再短路
`event.message`；见 [八缺陷 Note](2026-11-14-eight-bug-second-sources.md)（BUG-159）。本 Note 的 `null` 判据不变。

## 决定

1. **`error` 事件的 `error === null` 时用事件自带的 `message`**。原实现 `textOf(value.error) || textOf(value.message)`
   里 `textOf(null)` 返回字符串 `"null"`（`JSON.stringify(null)`），抢在 `||` 回退之前，环里只剩一条没头没尾的
   `message: "null"`——真正的原因（`Script error.` / 浏览器通知原文）被吞掉。`textOf` 对 `null`/`undefined` 一律返回空串。
2. **滤掉浏览器派发的 ResizeObserver 循环通知**（`ResizeObserver loop completed with undelivered notifications.` /
   `ResizeObserver loop limit exceeded`）。它们走 `error` 事件（`error === null`），但既不是异常、不中断渲染、
   也无堆栈；开右栏触发一次就足以让按「`clientErrors` 非空 = 红」判定的 `cdp-probe` 假红。只在这两条**固定原文**
   上过滤，其余 `error === null` 的事件照收（跨源脚本的 `Script error.` 正是需要留痕的）。

边界：过滤在**错误环入口**（`packages/company-pack/src/client/wiring/error-ring.ts` 的 `onError`），
不是各消费者（`cdp-probe` / `ui-scene-smoke` / host 日志）各写一份——否则 DevTools 与
[预算与运维 §3](../../docs/guides/budget-and-ops.md) 指引读到的日志仍被污染。

## 输掉的方案

- **只在 `cdp-probe` 的断言里过滤**：机器腿变绿，但页面内环、`company-client-errors.log` 与用户
  DevTools 依旧被通知刷屏；且每个消费者要各写一份同样的过滤（多份事实）。
- **忽略所有 `error === null` 的 error 事件**：会连跨源脚本的 `Script error.` 一起丢——那是最需要用户侧留痕的一类。
- **修布局循环源头**：通知在开右栏（dock 尺寸变化）时出现；包内两处自有 `ResizeObserver`
  （`company-panels.tsx` 的 `DagPanel`、`LedgerTab.tsx` 的 `LedgerSummary`）都带「宽度未变不 setState」守卫，
  没有回路迹象，触发点在 vendor 的 dock 面（vendor 铁律禁改）。不在本轮硬追。

## 验证（实跑原话，2026-11-13）

| 层 | 命令 | 红 / 绿形态 |
|---|---|---|
| 红（修前） | `node probes/browser-visual/cdp-probe.mjs '<URL>'`（两次） | `exit=1`；`clientErrors=[{"kind":"error","message":"null",...}]`；证据目录 `runtime/harness-home/diagnosis/cdp-probe-*-{09-57-53,09-59-37}/` |
| 定位（修前） | 两段式导航（先 origin 再带 token）+ 点「打开右侧边栏」，捕获阶段听 `window` error | `message: "ResizeObserver loop completed with undelivered notifications."`，`error: null`，`lineno/colno=0`——确认不是插件异常 |
| keyless | `npx vitest run tests/client/wiring/error-ring.spec.ts` | 7 passed（新增两条：`error=null` 用 message、通知不入环） |
| 类型面 | `node ./node_modules/typescript/bin/tsc -b packages/company-pack` | exit 0 |
| 绿（修后真页面） | `node probes/browser-visual/cdp-probe.mjs '<URL>'` | `exit=0`；`clientErrors=[]`、`tabFailures=[]`、10/10 页签、`consoleProblems=[]`、`exceptions=[]` |
| 零挂载 | `node checks/lanes/client-load.entry.mjs` | ALL PASS（无 banner / 零 loader 错误 / 品牌槽在场） |
| 结构 | `pnpm verify` | ALL PASS |
| 回归 | `pnpm test` | 246 files / 2021 tests passed |

## 状态事实与载体

- 事实：浏览器「用户可见错误」集合 = 真异常 + unhandled rejection + `console.error`，**不含** ResizeObserver 循环通知。
- 唯一入口（过滤与取文）：[error-ring.ts](../../packages/company-pack/src/client/wiring/error-ring.ts) 的 `textOf` / `onError`。
- 写载体：页面环 `window.__DSH_COMPANY_ERRORS__` → host 诊断命令 → `$DSH_HOME/logs/company-client-errors.log`
  （见 [budget-and-ops §3](../../docs/guides/budget-and-ops.md)）；
- 读载体：`cdp-probe` verdict 的 `clientErrors`、`ui-scene-smoke`、`pnpm diagnose`。
- 测试：[error-ring.spec.ts](../../tests/client/wiring/error-ring.spec.ts)。

## 未覆盖轴

- 真浏览器里只验了 Chromium（探针驱动）；Firefox/Safari 是否也把这两条通知派发成 `error` 事件、原文是否一致未验。
- 修后没有再构造一次「真异常 + 通知并存」的页面现场；该叠加由 keyless spec 的两条独立用例分别钉住。
- 触发通知的 vendor dock 布局回路未定位（见输掉的方案）；如它哪天变成可见卡顿，另开缺陷卡从
  `diagnosis/` 现场的实拍追。
