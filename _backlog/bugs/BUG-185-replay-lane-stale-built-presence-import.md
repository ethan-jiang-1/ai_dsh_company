---
status: 修复就绪
severity: P1
opened: 2026-11-15
---

# BUG-185：replay 车道仍 import 搬移前的 built presence 路径，真入口确定性失败

> 严重级别：P1（重要）｜发现：2026-11-15｜状态：修复就绪
>
> **关联**：[探索卡 Round 92](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M3（真入口）。
> **留痕**：Note（本批共用；落地同 diff 写 `notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md`）。

## 症状

`node checks/lanes/replay.e2e.mjs` 在 HEAD 上确定性失败：

```text
FAIL 异常: Cannot find module '/…/packages/company-pack/lib/types/lib/presence.js' imported from /…/checks/lanes/replay.e2e.mjs
replay-smoke: 1 FAILURE(S)
```

该车道在 `pnpm test` 之外（`replay` 登记为 surface + weekly 资产），所以 `pnpm test` / `pnpm verify` / pre-push 全绿时它仍是红的。真实构建产物现在是 `packages/company-pack/lib/types/lib/presence/presence.js`；旧的扁平路径 packages/company-pack/lib/types/lib/presence.js 已不存在。

## 运行面

tooling / 真入口车道（`checks/lanes/replay.e2e.mjs`，第三档重放 lane）。不是产品运行时；影响内容面与每周回归的证据链。

## 复现

```sh
node checks/lanes/replay.e2e.mjs
```

修复前实跑：`exit=1`，`replay-smoke: 1 FAILURE(S)`，异常原文 `Cannot find module '…/lib/types/lib/presence.js'`。完整日志 = `runtime/tmp/c11/replay-fail.log`。

## 根因与证据

- **根因**：`1eb14f46` 把 `src/lib/presence.ts` 搬进 `src/lib/presence/presence.ts`；TypeScript 构建产物随之变成 `lib/types/lib/presence/presence.js`，但 [replay.e2e.mjs](../../checks/lanes/replay.e2e.mjs) 的动态 import 仍拼旧扁平路径。动态 import 的路径是字符串，不在任何静态 import / tsconfig 解析面。
- **为什么当时的验收是绿的**：搬移 Note 的「重放」一行写 PASS；当时盘上还留着搬移前的 lib/types/lib/presence.js 旧构建产物，动态 import 命中了它。一次干净重建之后旧文件消失，失败才显形——**这是「绿建立在陈旧产物上」的典型**。
- **确认**：`ls` 显示 `lib/types/lib/presence/presence.js` 存在、lib/types/lib/presence.js 不存在；`pnpm typecheck`（tsc -b）之后重跑仍失败，排除「构建没做」。
- **同类扫描**：全仓 `lib/types/...js` 路径字面量逐条解析；活面只有这一处缺失（archived research 与 frozen pin 记录不算）。

## 失败类与同类排查

**失败类 = 导出形态**（消费构建产物的路径未随源码分组更新，且消费者不在 `pnpm test` 面）。

同类：`checks/`、`tools/`、`probes/` 的 `packages/company-pack/lib/types/*.js` 字面量全扫；`replay.e2e.mjs` 是唯一缺失。`snapshot-motion` 与 `pnpm smoke:fast` 实跑 PASS，不是同族。

## 修复方案与范围

- 把 `replay.e2e.mjs` 的动态 import 指到 `packages/company-pack/lib/types/lib/presence/presence.js`。
- 防复发：新增 keyless spec（`tests/repo/structure/built-path-literals.spec.ts`）扫 `checks/`、`tools/`、`probes/` 的 `lib/types/*.js` 字面量，要求对到现行源码（`lib/types/<path>.js` ↔ `src/<path>.ts(x)`），且构建树在场时产物必须存在。
- 明确不改：不改构建输出布局，不改 replay 的归一化逻辑，不重录 snapshot。

## 已修判定

`node checks/lanes/replay.e2e.mjs` 退出 0 且 `归一化日志零 diff` 仍 PASS；`pnpm test tests/repo/structure/built-path-literals.spec.ts` 绿。负控 = 把 import 临时改回旧的扁平路径 → 同一条车道命令红（MODULE_NOT_FOUND）且 spec 红，还原 → 绿。
