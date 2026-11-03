# 2026-11-03 · 运行前提守卫补直接判据：写盘决策四种状态

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D2 R5-07）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-07

## 决定

新增 `tests/company/runtime-guard.spec.ts`，用临时 home/workspace 直接跑真实
`prepareCompanyRuntime`，钉住四种写盘决策：

1. 干净 workspace + 无 manifest → `hasWorkspace=true`、`dataBlocked=false`、`bundleState=missing`；
2. `bundle.json` 损坏 → 仍解析出 workspace，但 `dataBlocked=true`、`bundleState=corrupt`，并告警；
3. writer lease 被另一个 live pid 占着 → `dataBlocked=true`，告警点名 holder；
4. `DSH_COMPANY_HOME` 指向不存在的目录 → `hasWorkspace=false`、`dataBlocked=true`、`workspace=''`，
   且不创建该目录。

## 输掉的方案

- **只靠 `host-composition.spec.ts`。** 它跑的是正常路径（无 manifest → 可写）；坏 manifest、lease
  冲突、落点不存在三条停写分支此前只有代码没有判据。
- **mock `prepareCompanyRuntime` 的依赖。** 那会绕开真实 lease 文件与 manifest 解析，测到的是 mock
  行为；本档用真临时盘，失败可复现。
- **把四种状态压成一个 `it`。** 失败时只报一个不透明名字；四例分开，红在哪条一眼可见。

## 验证（实跑）

```text
npx vitest run tests/company/runtime-guard.spec.ts
# 4 passed
```

红证：未单独制造；四条断言分别对应四个分支，改动 `runtime-guard.ts` 的判定（例如 lease 失败仍
`dataBlocked=false`）会直接红。测试用 `process.ppid` 伪造“另一个 live writer”，不依赖时序。

## 后果与边界

- 不主张真 profile 装配、真会话、Client picker；`workspace` 解析只测 `DSH_COMPANY_HOME` 一支
  （cwd/saved 分支仍由 `workspace-resolution` 的现有 spec 覆盖）。
- `env.company` 在 macOS 上 `/var` → `/private/var`，断言用 `realpathSync` 对齐 canonical 语义。
