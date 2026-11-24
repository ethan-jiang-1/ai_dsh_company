---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-364：`shouldWarn` 把「未来时间戳」的心跳当永久新鲜——系统时钟回拨一次就长期挂着多实例横幅

> 严重级别：P2（误报且不可自愈：判据只有 `now - ts < STALE_MS`，时间戳在未来时差值为负、恒小于阈值，于是某个已关闭的标签页留下的心跳（写它时时钟比现在快）永远不会过期，横幅一直说「另有 1 个观察窗」，用户无法通过关闭窗口消除）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（未来 null/真新鲜告警/过期 null + 写时清理）
>
> **留痕**：Note [2026-11-24-boundary-window-and-bad-shape-batch](../../../notes/implemented/2026-11-24-boundary-window-and-bad-shape-batch.md)（批次 360..369：时间双边窗口）

## 症状

[`shouldWarn`](../../../packages/company-pack/src/client/wiring/instance-guard.ts#L18-L28) 的新鲜度判据是 `now - ts < STALE_MS`（`STALE_MS = 20_000`）。`ts > now` 时差值为负，条件恒真 ⇒ **未来时间戳的心跳自己不会过期**。NTP 校正、夏令时手改、换机器/换时区后复用同一 origin 的 localStorage 都会产生这种记录。

## 运行面

- **面 = client**：[`packages/company-pack/src/client/wiring/instance-guard.ts`](../../../packages/company-pack/src/client/wiring/instance-guard.ts#L9-L28)；写心跳在同一文件 [`writeBeat`](../../../packages/company-pack/src/client/wiring/instance-guard.ts#L30-L38)。

## 复现

```sh
pnpm exec tsx -e "
import { shouldWarn } from './packages/company-pack/src/client/wiring/instance-guard.ts';
const now = Date.now();
console.log('future beat:', shouldWarn(JSON.stringify({ other: now + 600_000 }), now, 'self'));
console.log('stale beat :', shouldWarn(JSON.stringify({ other: now - 60_000 }), now, 'self'));
"
```

实测 `future beat` 返回横幅文案（`⚠ 检测到另有 1 个观察窗实例在运行…`），而 `stale beat` 返回 `null`——差 10 分钟的过去记录正确过期，差 +10 分钟的未来记录却永久有效。

## 根因与证据

1. 判据没有下界：只排除「太旧」，没有排除「不可能存在」（`ts > now + 容差`）。
2. `writeBeat` 每次只写自己那一格，从不清理别人的过期/异常记录，于是坏记录会一直留在 `localStorage` 里被反复判真。

## 失败类与同类排查

- **失败类**：时间窗口只做单边约束（只防旧、不防未来），等价于「负年龄即新鲜」。
- **同类排查**：`attention.ts` 的 `formatWhen`/`b.time - a.time` 排序对负值只是排序，不产生误判；`cultivation-record.timeParts` 有 `Number.isNaN` 守卫（`BUG-335` 已修）。本仓其它「新鲜度」判据（`lease` 心跳用文件 mtime 与 holder 时间，单边比较）未见未来值来源。

## 修复方案与范围

- **根因修法**：新鲜度改成双边窗口（`ts <= now + SKEW_TOLERANCE && now - ts < STALE_MS`），并在 `writeBeat` 时顺手裁掉「过旧或超前」的邻居记录（顺手解决存储只增不减）。

## 已修判定

- `shouldWarn(JSON.stringify({ other: now + 600_000 }), now, 'self')` 返回 `null`；`now - 19_000` 的真新鲜心跳仍返回横幅；`writeBeat` 后 `localStorage` 里不再保留超前/过旧的键。

## 修复证据

- 改动面：`packages/company-pack/src/client/wiring/instance-guard.ts`、`tests/client/wiring/instance-guard.spec.ts`
- 红：`pnpm test tests/client/wiring/instance-guard.spec.ts` —— 还原单边判据前 2 failed（未来心跳永久告警、坏记录不被清理）
- 绿：`pnpm test tests/client/wiring/instance-guard.spec.ts` —— 7/7 passed（未来 null、19s 新鲜告警、60s 过期 null；写心跳裁掉 stale/future）
- 提交：commit 1d7e92e0
