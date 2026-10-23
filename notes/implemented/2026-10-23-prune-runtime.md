# 运行时清扫机制：>7 天 + 无引用才删

状态：implemented（2026-10-23；P7；用户令「7 天前的数据都不需要了」+「最近但别扭的由你判断」）

## 决定

1. **口径**：`runtime/` 下的生成物 **>7 天即清**；插件内容（`packages/company-pack`）与 docs/tests/checks/probes
   不在射程。四条留人：**被 tracked markdown 引用** / git tracked / README / 未到天数。
2. **工具**：[prune-runtime.mjs](../../tools/prune-runtime.mjs)：默认 dry-run，`--apply` 才删，`--days` 可调；
   候选 = 会话目录、诊断现场、tmp、replay 现场、探针证据、e2e 残留（含 `*-evidence-*` 目录）。
   判据纯逻辑 = [prune-runtime.mjs](../../tools/lib/prune-runtime.mjs)（keyless 三用例）。
3. **策略落 [runtime/README](../../runtime/README.md) §五**：口径、工具、为什么留引用、会话日志也在射程内。
4. **首次 apply**：删 105 项 / 22.9M；留 referenced×17、fresh×39。

## 输掉的方案

- **按目录整体老化删 `runtime/` 顶层**：会连 `profiles/`（dev home 安装面）、`pw-browsers/`、`rehearsal-workspace/`、
  tracked 的 cold-storage 基线一起删——这些不是“数据”，是运行与资产。
- **只按时间删、不查引用**：同日实测删 `write-conflict-evidence/` 与 `collab-audit/` 打断两篇 archived research 的
  md 链接（`md-links` 门禁红）。引用检查是前置，不是可选项。
- **把判据写成 shell 一行**：`--apply` 会 rm -rf，判据必须可单测；所以纯逻辑住 lib、三用例钉死留人原因。

## 后果

- `runtime/` 从“运行残留家”变成“有保留期的数据区”：>7 天的生成物默认会消失，长期证据要搬 `snapshots/` 或写进 Note。
- 会话日志在射程内：按 session id 引证的历史结论，不能再假设本机日志永远在。
- 工具踩坑已内化：`sizeOf` 用 `lstat` 且不跟符号链接（replay 现场里的 node_modules 有断链，`statSync` 直接 ENOENT）。

## 验证（真跑）

```text
npx vitest run tests/harness/prune-policy.spec.ts   # 3 passed（删/留原因/README 保护）
node tools/prune-runtime.mjs --days 7               # dry-run：候选 161 · 可删 105 / 22.0M · 留 56
node tools/prune-runtime.mjs --days 7 --apply       # 删 105 项，回收 22.9M
pnpm test     # 756 passed
pnpm verify   # ALL PASS
```

## 未验

- 更老的数据（`profiles/` 外的第二 home、`runtime/harness-home-b/`）不在候选里，本轮未评估。
- 被引用但已失效的路径未做二次核验（引用即留，保守方向）。
