状态：implemented（2026-11-24）；批准：用户 2026-11-24 指令「修 _backlog/bugs 最新发现的问题」并建批次 goal 推进｜上游 = [BUG-363](../../_backlog/_archive/fixed_bugs/BUG-363-error-capture-install-not-idempotent.md)

# BUG-360..369 批次收口：边界窗口、坏形状与可逆安装

## 决定

1. **全局安装必须可逆、幂等（[BUG-363](../../_backlog/_archive/fixed_bugs/BUG-363-error-capture-install-not-idempotent.md)）**：
   `installErrorCapture` 对同一 target 只保留一层 `console.error` 包装；安装/卸载用环栈维护「当前环」，
   重复安装只让栈顶收条目，卸载退自己那层、退到零才恢复原始函数。包装与原始函数的对应住
   `WeakMap<target, ConsoleCaptureState>`，不写全局字符串键。

## 输掉的方案

- **在 target 上放 `global['__DSH_ERROR_CAPTURE_ORIGINAL__']` 字符串键**：会与页面其它脚本争用全局命名空间；
  `WeakMap` 随 target 生命周期回收，且不暴露可被误改的全局引用。
- **每次安装先恢复再重装**：卸载语义变成「隐式重置」，中间那一层安装失去可逆性；环栈保留逐层可逆。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 错误捕获安装/卸载 | [`installErrorCapture`](../../packages/company-pack/src/client/wiring/error-ring.ts) | `WeakMap` 单例状态；`tests/client/wiring/error-ring.spec.ts` 钉双层语义 |

## 验证（真跑过）

- **BUG-363**：`pnpm test tests/client/wiring/error-ring.spec.ts` —— 还原前 1 failed（一条错误进两个环、卸载后旧环增长）；修复后 9/9 passed。
- `pnpm verify` ALL PASS。

## 未覆盖轴

- [covered] 双层安装/逐层卸载的环栈语义 → 去向：[error-ring.spec.ts](../../tests/client/wiring/error-ring.spec.ts)
- [policy] 同一 target 上 vendor 侧的 `console.error` 包装不计入本包保证 → 去向：[error-ring.ts](../../packages/company-pack/src/client/wiring/error-ring.ts)
