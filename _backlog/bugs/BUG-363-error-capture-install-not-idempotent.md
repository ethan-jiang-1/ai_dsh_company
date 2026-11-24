---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-363：`installErrorCapture` 不是幂等的——重复安装把每条 `console.error` 记两遍，卸载后包装仍指向旧环

> 严重级别：P2（诊断证据失真：模块头注明确承诺「幂等：同一 target 重复安装只保留最后一份全局引用」，但 `console.error` 包装是**累加**的；页面重挂载后每条控制台错误在错误环里出现两次，卸载后残留的包装继续写进已经没人读的旧环）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

[`installErrorCapture`](../../packages/company-pack/src/client/wiring/error-ring.ts#L138-L201) 每次调用都做 `consoleFace.error = (...args) => { capture.push(...); originalConsoleError.apply(...) }`，其中 `originalConsoleError` 取的是**当前**的 `console.error`——也就是上一次装上的包装。于是：

1. 装两次后，一条 `console.error` 会先写进 `capture2`、再经 `originalConsoleError` 写进 `capture1`（两个环各一条）；
2. 两次卸载后，`console.error` 被恢复成「上一次的包装」而不是原始函数，此后所有控制台错误都写进已下线的旧环，当前环与 `__DSH_COMPANY_ERRORS__` 再也收不到。

## 运行面

- **面 = client**：[`packages/company-pack/src/client/wiring/error-ring.ts`](../../packages/company-pack/src/client/wiring/error-ring.ts#L138-L201)；装配处 [`client/index.ts`](../../packages/company-pack/src/client/index.ts#L85-L88)（`ctx.effect` 内 `installErrorCapture(window …)`，重挂载即第二次安装）。

## 复现

```sh
pnpm exec tsx -e "
import { createErrorRing, installErrorCapture } from './packages/company-pack/src/client/wiring/error-ring.ts';
const listeners = new Map();
const target = { addEventListener: (t,l) => listeners.set(t,l), removeEventListener: t => listeners.delete(t), console: { error: () => {} }, location: { href: 'http://x/' } };
const ring1 = createErrorRing(10), ring2 = createErrorRing(10);
const off1 = installErrorCapture(target, ring1);
const off2 = installErrorCapture(target, ring2);
target.console.error('boom');
console.log('after double install', ring1.list().length, ring2.list().length);
off2(); off1();
target.console.error('after uninstall');
console.log('after uninstall', ring1.list().length, ring2.list().length);
"
```

实测 `after double install 1 1`（一条错误进两个环）、`after uninstall 1 1`（卸载后 `ring1` 仍在增长，`ring2` 不再收到）。

## 根因与证据

1. 卸载函数只把 `console.error` 恢复成**本次安装前**的函数，而本次安装前可能已经是我们自己的包装 ⇒ 卸载不收敛。
2. 没有「已安装」标记：`global[ERROR_RING_KEY]` 只用于暴露环，没有被用来判重入。
3. 注释承诺的「只保留最后一份全局引用」只覆盖了 `global[ERROR_RING_KEY]`（环引用），没有覆盖 console 包装。

## 失败类与同类排查

- **失败类**：全局单例式 monkey-patch 缺少重入保护与「恢复原始值」的栈（`createErrorRing.restore` 只处理数据，不处理包装）。
- **同类排查**：同文件 `addEventListener('error'/'unhandledrejection')` 用的是同一函数引用，重复 `addEventListener` 会自动去重，因此只有 `console.error` 一路会重复；`AppFrame` 等 vendor 侧包装不在本包范围。

## 修复方案与范围

- **根因修法**：在 target 上记录原始 `console.error`（例如 `global['__DSH_ERROR_CAPTURE_ORIGINAL__']`）与一个安装计数；重复安装时只替换 `capture` 引用（闭包读当前环）而不叠加包装；卸载时只在计数归零时恢复原始函数。或者干脆让包装只由一个模块级单例持有、`install` 只切换目标环。

## 已修判定

- 连续安装两次后一条 `console.error` 只在一个环里出现 1 条（或明确约定「两个环各一条」并写下判据，二选一）；两次卸载后 `console.error` 等于安装前的原始函数（`===` 比较为真），旧环不再增长。
