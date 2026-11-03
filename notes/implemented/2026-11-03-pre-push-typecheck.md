# 2026-11-03 · Phase 4：pre-push 加 typecheck

状态：implemented（2026-11-03；七维复评 Phase 4）

> 上游 = 2026-11-03 fresh 复评 D5/D3「typecheck 不在任何 push 门；tests 也不在 tsc」。

## 决定

- `.githooks/pre-push` 在 `checks/run-gates.mjs` 之后、`pnpm test` 之前加
  `node ./node_modules/typescript/bin/tsc -b packages/company-pack || exit 1`。
- 只覆盖 pack 两面（host + client）——tests 进 tsc 需要 host/client 两个 test project（单项目实测
  527 errors；见 [D2 Note](./2026-11-03-d2-companyview-removal.md)），不在本刀硬接。
- 同步两处描述：`docs/testing.md` §5、`docs/guides/dev-loop.md` §12 push 段。

## 输掉的方案

- **把 `pnpm typecheck` 整条塞进 hook。** 等价，但 hook 只依赖 node 二进制更稳（不经 pnpm script 层）。
- **把 tests 也塞进同一个 tsc 程序。** 单项目 527 errors（react/@types、`.mjs` 声明、vendor 子路径、
  host/client Context 双增强冲突）；硬接会把 hook 变红且不可维护，须先拆两面 test project。
- **只靠人记得跑 typecheck。** 2026-11-03 之前的 hook 只跑 verify+test，类型面在 push 门完全缺席。

## 验证（实跑，2026-11-03 10:3x +08）

```text
# 红证：临时在 src/host/paths.ts 写 `const __hook_red: number = "x"`
sh .githooks/pre-push < /dev/null
# exit 1：verify ALL PASS → TS2322 Type 'string' is not assignable to type 'number'（在 test 之前拦下）

# 还原后
sh .githooks/pre-push < /dev/null
# exit 0：verify ALL PASS + tsc -b exit 0 + 135 files / 1084 tests
```

## 成本与边界

- 增量 typecheck ~1s；冷启动/首次构建另计。
- 只证 pack 源码的类型面；**不证 tests 类型**（独立轮：两面 test project 或 tools/lib 的 `.d.ts`）。
