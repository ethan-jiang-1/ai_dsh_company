---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-211：tools/README 仍说 lib「不启动进程、不联网」，但 tools/lib/probe 就是 web 启动管道

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C12 归属波次探索卡](../issues/2026-11-17-ownership-wave-exploratory.md)（C12-10 / N4）。
> **留痕**：待修复者决定（本轮只开卡，不修）。

## 症状

[tools/README.md](../../tools/README.md) 的「实现层」同时写了两句互相打架的话：

- `lib/` 是共享地基，「**不启动进程、不联网**；「纯逻辑」不等于「不碰盘」」；
- `probe/` 是「探针运行管道（**web 启动**/CDP/页签目录，跨面共用）」。

而 [probe-web.mjs](../../tools/lib/probe/probe-web.mjs) 的 `startWeb()` 就是起 web 进程 + 等 banner
（进程启动器由调用方注入）：

```text
startWeb({ spawn: spawnProcess, ... }) → spawnProcess(...) → 等 BANNER_RE
```

它不是「不启动进程」；它只是**不直接 import** `node:child_process`（为了通过 `layering.spec` 的
keyless 守卫）。`tools/README.md` 的纯度声明与实盘不一致，且没有任何门禁能判「注入式进程启动」。
`2450d0ef` 把这批模块搬进 `tools/lib/probe` 时没有更新这句话。

## 复现

```sh
sed -n '18,24p' tools/README.md
sed -n '9,13p' tools/lib/probe/probe-web.mjs
grep -n 'export function startWeb\|spawnProcess' tools/lib/probe/probe-web.mjs | head
```

第 1 条显示「不启动进程」；第 2/3 条显示 `startWeb` 的注入式启动契约。

## 根因与证据

- 根因：`tools/README.md` 的「不启动进程、不联网」是 `tools/lib` 早期纯逻辑时的声明；`probe/` 的
  web 启动管道被 `2450d0ef` 纳入同一条实现层描述，但纯度句没有改成「不直接 import/调用，进程由
  调用方注入」。
- 证据：上三条命令；`layering.spec` 的 `inspectKeylessGraph` 只禁 import/调用，不检查注入函数的
  行为；`probe-web` 头注自己写了「为什么 spawn/fetch 一律注入」。
- 影响：这是归属规则（C12 的核心变量）的活声明矛盾。新 agent 按「lib 不启动进程」给进程启动器
  选家时，会把驱动逻辑塞进 `tools/lib` 再用注入绕过 keyless 守卫——正是 `probe/` 已经发生过的形状。

## 失败类与同类排查

**失败类 = 文档指针 / 归属规则声明与实盘不一致**。

同类：

- `probes/README.md` 的「lib/ 是 show 专属证据/判词」与 `probes/lib/orient.mjs` 的纯逻辑核心一致，
  没有同类矛盾。
- `checks/README.md` 的「checks/lib 保存 judge-wide 判据」与 `coverage-baseline.json` 数据文件/冻结套件
  的边界已在 `surface-contract` 说明。
- `tests/README.md` 的 lib→replay 歧义是另一条 → [BUG-209](BUG-209-live-declarations-stale-after-split.md)。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. `tools/README.md` 改为「lib 不直接 import/调用进程与网络；需要真进程/真网络的管道以参数注入，
   仍算 lib」，并点名 `probe/` 是这一类。
2. 如果没有门禁能判注入式启动，就明说「靠评审」；不要把「不启动进程」写成机械事实。
3. 最小复读：`sed` 三段应不再出现「不启动进程」与「web 启动」的直接矛盾。

## 修复方向（不授权，仅记录）

- 纯文档修复优先；若要把规则变成机械判据，需要设计「注入函数的调用点」白名单，成本高，
  不建议只为这一句加门禁。
