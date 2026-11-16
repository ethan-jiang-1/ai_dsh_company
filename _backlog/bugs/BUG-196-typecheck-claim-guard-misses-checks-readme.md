---
status: 修复就绪
severity: P2
opened: 2026-11-16
---

# BUG-196：类型面计数守卫不扫 checks/README 等导航文档，旧分数仍可存活

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：修复就绪
>
> **关联**：[探索卡 Round 93](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-191 的守卫（`tests/repo/docs/typecheck-coverage-claim.spec.ts`）。
> **留痕**：Note（本批共用；落地同 diff 写 `notes/implemented/2026-11-16-guard-surfaces-not-samples.md`）。

## 症状

`typecheck-coverage-claim.spec.ts` 扫描 `docs/**` + `AGENTS.md` / `README.md` / `tests/README.md` / `packages/company-pack/README.md`，但不含 `checks/README.md`、`run/README.md`、`runtime/README.md`、`.agents/skills/**`。向 `checks/README.md` 追加 `227/245 spec`，spec 仍 2 passed——一份被 fresh agent 读的导航文档仍可写回会漂的旧分数。

## 运行面

tooling / 文档计数守卫（`tests/repo/docs/typecheck-coverage-claim.spec.ts`）。

## 复现

```sh
cp checks/README.md /tmp/checks-readme.bak
printf '\n227/245 spec（mutation probe）\n' >> checks/README.md
pnpm test tests/repo/docs/typecheck-coverage-claim.spec.ts   # 期望红，实际 2 passed
cp /tmp/checks-readme.bak checks/README.md
```

实跑日志 = `runtime/tmp/c11/mut-typecheck-claim.log`（spec exit 0）；还原后 `git diff` 为空。

## 根因与证据

- **根因**：BUG-191 的修复把「导航面」手写成 4 个文件 + `docs/**`；`checks/README.md`、`run/README.md`、`runtime/README.md` 是同级导航资产，没有进集合。`.agents/skills` 是模型指令，同样会教出「覆盖 x/y」。
- **确认**：向 `checks/README.md` 注入旧分数 → spec 绿；还原 → 绿。
- **为什么这是缺陷**：判据的标题是「live 文档不写死类型面覆盖分数」；`checks/README.md` 是 live 文档。

## 失败类与同类排查

**失败类 = 文档指针**（计数类断言按文件清单，不按「导航面」全集）。

同类：`docs/testing.md`/`dev-loop` 已修；`tests/README.md` 在面内；`checks/README.md`/`run/README.md`/`runtime/README` 不在；`.agents/skills` 不在。`bare-path`/`command-refs` 不查数字。

## 修复方案与范围

- 扫描面改成「所有 live Markdown 导航面」：`docs/**`、`checks/README.md`、`run/README.md`、`runtime/README.md`、`tests/README.md`、根 `README.md`、`AGENTS.md`、`packages/company-pack/README.md`、`.agents/skills/**`；排除 `notes/`（历史收据）。
- 负例 = 向 `checks/README.md` 注入 `227/245 spec` → 红；还原 → 绿。
- 明确不改：不保留任何分数写法（公式路线不变）。

## 已修判定

向 `checks/README.md` 注入 `227/245 spec` → `pnpm test tests/repo/docs/typecheck-coverage-claim.spec.ts` 红；还原 → 2 passed。`node runtime/tmp/c11/typecheck-count-check.mjs` 仍 exit 0（实际 235/253）。
