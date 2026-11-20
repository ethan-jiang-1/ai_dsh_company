---
status: 已修
severity: P2
opened: 2026-11-20
---

# BUG-284：杀掉 dev wrapper 后 dsh 子进程成孤儿并持 writer lease ⇒ 下一次启动静默停写

> 严重级别：P2（次要偏重：会让产品「公司数据已停写」而用户看不到原因）｜发现：2026-11-20（端到端验收）｜状态：已修｜修复：2026-11-20｜审查：agent（同轮红绿实证）
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

`pnpm company`（`tools/dev/company.mjs`）收到 SIGTERM 退出后，它 spawn 的 dsh 服务进程仍存活并继续持有 `$DSH_HOME/company-pack.lock`；随后任何新实例启动都会看到：

```
dsh: company-pack：另一个 writer 正在使用这个 home（pid …）；公司数据已停写（DSH 会话仍可用），先关掉另一个 writer
```

用户侧表现为「页面能开，但公司数据不再写入」，且那个 writer 是看不见的孤儿。

## 复现

```
node tools/dev/company.mjs --home <临时home> --workspace <ws> --no-open &   # W=$!
# 等横幅出现，取端口 PORT；CHILD=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t)
kill -TERM $W
kill -0 $CHILD   # 修复前：仍存活（端口仍 LISTEN）
```

## 根因与证据

wrapper 末尾 `spawn(node, [cli, ...])` 之后没有把 SIGINT/SIGTERM/SIGHUP 转发给子进程，也没有在收到信号时退出等待；SIGTERM 只终止 wrapper 自身，子进程继续运行并持有 lease。

实测（2026-11-20）：
- 21:14 观察到孤儿 pid 69731（cwd=`company-workspace`、端口 62591）持锁，导致我的实例启动即「公司数据已停写」；
- 21:22 受控红测：`wrapper=28670 port=64873 child=30980` → `RED: 子进程存活（孤儿），端口 64873 仍在`。

## 失败类与同类排查

**失败类 = 生命周期不配对（父进程与资源持有者分离）。** 同类：`upgrade-while-running`/`concurrent-home` 等 lane 用 SIGTERM 收摊，正是这条路径让 dev home 被孤儿占住；lane 自身的 `stop()` 因此可能「以为停了」。

## 已修判定

wrapper 收到 SIGINT/SIGTERM/SIGHUP 时把信号转给子进程；子进程退出后 lease 释放，下一次启动不再报「另一个 writer」。

## 修复证据

- 改动面：`tools/dev/company.mjs`
- 红：`node tools/dev/company.mjs --home <临时home> --workspace <ws> --no-open &`，取端口后 `kill -TERM $!`，再 `kill -0 <子进程pid>` → 子进程仍存活、端口仍 LISTEN
- 绿：`node tools/dev/company.mjs --home <临时home> --workspace <ws> --no-open &`，取端口后 `kill -TERM $!`，`kill -0 <子进程pid>` 返回非零（子进程随 wrapper 退出）
- 提交：commit bee0f4fc
