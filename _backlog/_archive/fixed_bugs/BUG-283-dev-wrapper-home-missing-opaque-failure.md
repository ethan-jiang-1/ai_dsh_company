---
status: 已修
severity: P3
opened: 2026-11-20
---

# BUG-283：`pnpm company --home <不存在目录>` 初始化失败且无诊断（exit null / 空 stderr）

> 严重级别：P3（次要，维护者入口）｜发现：2026-11-20（端到端验收）｜状态：已修｜修复：2026-11-20｜审查：agent（同轮 E2E 实跑复核）
>
> **留痕**：端到端验收轮（2026-11-20，用户令「端到端……发现问题报bug」）。

## 症状

用隔离 home 起实例：`node tools/dev/company.mjs --home "$PWD/runtime/e2e-home" --workspace "$PWD/company-workspace" --no-open`，当 `runtime/e2e-home` 尚不存在时：

```
company(dev): 缺 company profile；用 web 模板初始化（仅首次）
company(dev): 步骤失败（exit null）：web 模板初始化 company profile；stderr ↓
```

`exit null` + 空 stderr，没有任何可行动信息；把目录 `mkdir` 出来再跑即成功。

## 复现

```
rm -rf runtime/e2e-home
node tools/dev/company.mjs --home "$PWD/runtime/e2e-home" --workspace "$PWD/company-workspace" --no-open
```
（`--home` 的目录不存在；`--workspace` 存在。）

## 根因与证据

模板初始化的 `spawnSync(..., { cwd: home, ... })` 以 **home 自身** 为 cwd；home 不存在 ⇒ spawn 直接返回 `error`（ENOENT），`status === null`、`stderr === ''`。调用方只把 `status` 与 `stderr` 回放，于是失败被压成一句无因的「exit null」。
证据：同命令在 `mkdir -p` 之后 exit 0 并出 `dsh web:` 横幅；直接以 `cwd=home` 跑同一条 CLI 命令（home 已存在）也 exit 0。

## 失败类与同类排查

**失败类 = 环境失败被压成无诊断。** 同类：`--home` 是本次要创建的目录，却被当成既存前置；其他 spawn 点（boot 子进程）以 workspace 为 cwd，workspace 缺失时脚本另有显式检查（`company(dev): workspace 不存在`），无此问题。

## 已修判定

`--home` 指向尚不存在的目录时：先建目录再初始化，能起到 `dsh web:` 横幅；失败时消息点名 home 路径与 spawn 错误。

## 修复证据

- 改动面：`tools/dev/company.mjs`
- 红：上面的复现（`exit null`、空 stderr）
- 绿：同一命令（home 不存在）→ `GREEN-A: 缺失 home 也能初始化并起服务`
- 提交：commit bee0f4fc
