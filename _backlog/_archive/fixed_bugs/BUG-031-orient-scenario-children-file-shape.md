---
status: 已修
severity: P2
opened: 2026-10-20
---

# BUG-031：orient --scenario 对 children 为文件形状的场景 ENOTDIR 崩——runBundleView 只当目录读

> 严重级别：P2（一般）｜发现：2026-10-20（六维度第二轮审计，D6 通路盘点）｜状态：已修（2026-10-20，用户授权 P0 批次）

## 症状

`pnpm orient --scenario replay/r3-delegation` 直接崩：

```text
ENOTDIR: not a directory, scandir '.../r3-delegation/sessions/vp-eng-child.jsonl'
```

orient 自己宣传的「深看某次运行」在 2 个 runnable 场景之一上不可用（r2 目录形状正常）。

## 事实与根因

- `tools/lib/orient.mjs` runBundleView 的 children 计数一律 `readdirSync(childrenRef)`——
  但 snapshot.yml 的 `session.children` 有两种合法形状：目录（r2：`sessions/`）与单文件（r3：`sessions/vp-eng-child.jsonl`）。
  文件形状上 readdirSync 抛 ENOTDIR，CLI 层未捕获直接 exit 1。

## 修复（红→还原→绿）

- children 引用先用 `statSync` 分流：文件且 `.jsonl` 计 1；目录数 `.jsonl` 件数；缺失如实 0。
- 守卫 = `tests/harness/orient.spec.ts`：真实 tracked 场景 r3 断言（不崩且计 1）+ 夹具文件形状用例。
- 红相（修前实测）：orient.spec 2 failed（真实 r3 ENOTDIR + 夹具文件形状）；
  绿相：27/27；活体：`orient --scenario replay/r3-delegation` 完整渲染 run bundle 视图。

## 教训

**消费一种「引用合同」时要枚举合同的全部合法形状**——snapshots/README 的 Run bundle 引用合同里
children 的两种声明形状都是真实场景在用的，视图层只测过自己造的那一种。
