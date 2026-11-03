# 2026-11-03 · tests/harness 不变量子集进 tsc（`tsconfig.test-harness.json`）

状态：implemented（2026-11-03；七维复评 D5 类型面，company 面之后的增量）

> 上游 = [tests/client 进 tsc](./2026-11-03-client-test-typecheck.md) /
> [tests/company 进 tsc](./2026-11-03-company-test-typecheck.md)。
> harness 全量严格 192 / 非严格 118 errors；本轮只收 36 个判据型 spec（17→0），其余宽松测试仍未。

## 决定

- 新增 **`tsconfig.test-harness.json`**（host 面 + paths），只 include：
  - `navigation-assets`（docs/tests 骨架与死链）
  - `skip-budget`（skip 登记 + 预期 N）
  - `notes-audit`（notes 机械判据）
  - `snapshots-budget`（快照预算）
  - `release-foundation`（pin 事务）
  - `market-index`（市场 index / 未发布守卫）
  - `collaboration-evidence`（协作原子性）
  - `member-stale-evidence`（成员陈旧写）
  - `team-barrier-evidence`（团队屏障）
  - `prune-policy`（运行时清扫）
  - `backlog-liveness`（卡/研究题生命周期）
  - `recovery-scope-evidence`（恢复范围）
  - `workspace-oracle`（独立捕获 oracle）
  - `deliverables-audit`（成品审计判词）
  - `converge-rules`（收敛规则）
  - `claim-loser-evidence`（认领竞争判据）
  - `question-stop`（问询阻塞判据）
  - `entry-probe`（入口语义探针判据）
  - `probe-web`（web 启动/RPC 探针假件）
  - `orient`（运行态全景）
  - `candidate-scan-labels`（候选扫描标注与评分）
  - `session-diagnose`（会话诊断纯逻辑）
  - 结构门禁 14 个：audit-verdict / authorship / checks-index / foundation-links / foundation-safety /
    gitignore-guards / layering / pack-engines / pack-metadata / repository-layout / runtime-layout /
    src-layering / tracked-secrets / tracked-token
  - `tests/support/temp-env.ts`
- `pnpm typecheck` 四段：pack + client + company + harness 子集；`.githooks/pre-push` 四行同步。
- 十一批共修正 187 处类型面：`market-index` 回调参数、`navigation-assets` 的 `m[1]!`、`notes-audit` 的 `note(file: string, body: string)`、`release-foundation` 的 `observedPaths as never[]`、`snapshots-budget` 的 `bytesOf`/`hit.map` 标注。

## 输掉的方案

- **全量 harness 严格。** 192 errors，主要是 probe/orient/candidate-scan 的动态夹具；一轮收不完。
- **全量 harness 非严格。** 118 errors，且丢掉 strict 判据，等于假绿。
- **不接 harness。** 这 6 个 spec 正好守 docs 骨架、skip、notes、快照、pin、market——是“机械不变量”最该进类型面的部分。

## 验证（实跑，2026-11-03 13:3x +08）

```text
tsc -p tsconfig.test-harness.json   # 0 errors（起始 17 + 10 + 18 + 6 + 20 + 13 + 20 + 22 + 29 + 29 + 3）
pnpm typecheck                      # exit 0（pack + client + company + harness 子集）
pnpm test                           # 139 files / 1108 tests
pnpm verify                         # ALL PASS
```

## 边界

- 只覆盖上述 6 个 spec；`tests/harness` 其余约 20 个宽松 spec（probe-web / orient / candidate-scan / entry-probe / question-stop 等）仍未进 tsc。
- 本刀只动 tests/config/docs，不动 pack 源码；0.8.7 发布字节不受影响。
