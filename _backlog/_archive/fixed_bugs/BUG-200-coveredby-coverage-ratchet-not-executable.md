---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-200：coveredBy 的 `coverage-ratchet` 不是可执行命令，pre-push 打印的“证据”照跑即失败

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（pre-push 非 ASCII 路径被 git C-quote 误判「未分类」；归档 ×1912 与修复提交 ×1924 不符）已修复；建议 S1–S5 处置（尾注标签、审查落盘、passed 数校正、`--paths` 不支持项、docs/testing.md 合同行）
>
> **关联**：[探索卡 Round 93](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-186 的 `coveredBy` 词表（`tools/lib/core/asset-lanes.mjs` / `checks/pre-push-surfaces.mjs`）。
> **留痕**：Note [2026-11-16-guard-surfaces-not-samples.md](../../../notes/implemented/2026-11-16-guard-surfaces-not-samples.md)（本批共用）。

## 症状

`UNCONDITIONAL_STEPS` 与多条 `coveredBy` 用 `coverage-ratchet`（连字符）。pre-push 对命中这些面的改动打印：

```text
pre-push surfaces: 改了 …（命中 …）→ 无额外 lane；证据 = 无条件 test:checks + coverage-ratchet + verify
```

但 `pnpm coverage-ratchet` 不存在：

```text
[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "coverage-ratchet" not found
Did you mean "pnpm coverage:ratchet"?
```

实际 hook 跑的是 `node checks/audit/coverage-ratchet.mjs`（脚本名 = `coverage:ratchet`）。一个照“证据”复跑的人会得到命令错误——而这正是本轮修复要消灭的「假证据」形状。

## 运行面

tooling / pre-push 豁免输出与 `UNCONDITIONAL_STEPS` 词表；不是产品运行时。

## 复现

```sh
pnpm coverage-ratchet
node checks/pre-push-surfaces.mjs --dry-run --paths tools/lib/core/asset-lanes.mjs
```

第一条 exit 1（脚本不存在）；第二条打印 `证据 = 无条件 test:checks + coverage-ratchet + verify`。日志 = `runtime/tmp/c11/coverage-ratchet-label.log`。

## 根因与证据

- **根因**：`UNCONDITIONAL_STEPS` 是人读标签，但被 pre-push 当“证据”打印；其中 `coverage-ratchet` 与真实入口（`node checks/audit/coverage-ratchet.mjs` / `pnpm coverage:ratchet`）不同名。`asset-lanes.spec` 的 `command` map 把标签映射到 node 路径，因此 spec 绿、人照标签跑却红。
- **确认**：`package.json` 只有 `coverage:ratchet`；`pnpm coverage-ratchet` exit 1；dry-run 输出标签。
- **为什么是缺陷**：判据/输出是 agent 与人的证据面；不可执行的“证据”是假绿的同族。

## 失败类与同类排查

**失败类 = 文档指针**（证据标签与可执行命令不一致）。

同类：`UNCONDITIONAL_STEPS` 的其余 6 条中 `verify` / `typecheck` / `lint` / `dup` / `smoke:fast` / `test:checks` 都有同名脚本；只有 `coverage-ratchet` 不一致。`pre-push-surfaces` 的 `coveredBy` 打印是唯一消费者。

## 修复方案与范围

- 把标签改成 `coverage:ratchet`（与脚本同名），或让输出打印真实命令 `node checks/audit/coverage-ratchet.mjs`；`UNCONDITIONAL_STEPS` 与 `asset-lanes.spec` 的映射同 diff 更新。
- 负例：`pnpm coverage:ratchet` 可执行；pre-push 输出里的每个“证据”都能直接复跑（或显式标注为 hook 步骤而非 pnpm 脚本）。
- 明确不改：coverage-ratchet 的阈值/基线语义。

## 已修判定

`node checks/pre-push-surfaces.mjs --dry-run --paths tools/lib/core/asset-lanes.mjs` 打印的每个证据项都能直接执行（`pnpm coverage:ratchet` 或 `node checks/audit/coverage-ratchet.mjs`）；`pnpm coverage-ratchet` 不再被输出为证据。

## 修复证据

- 改动面：`tools/lib/core/asset-lanes.mjs`、`tests/repo/budget/asset-lanes.spec.ts`
- 红：`pnpm test tests/repo/budget/asset-lanes.spec.ts`（`coverage-ratchet` 不是 package.json 脚本）
- 绿：`pnpm test tests/repo/budget/asset-lanes.spec.ts`（15 passed；标签 coverage:ratchet 可执行）
- 提交：commit 34f84fd2
