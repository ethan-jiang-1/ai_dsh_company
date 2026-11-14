---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-155：present 闸门按 session header cwd 解析相对路径，与 present 的实际工作目录不一致

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 86](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C8-H4/H6 的路径面）；`present` 工具用 `ctx.workingDirectory.ensure`，闸门用 `session.header.cwd`。
> **留痕**：Note [2026-11-14-eight-bug-second-sources.md](../../../notes/implemented/2026-11-14-eight-bug-second-sources.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8-round1.mts`。

## 症状

会话 `header.cwd = /old`；用户/模型在会话里 `cd /old/new` 后，用**相对路径** present：

```text
.dsh-company/deliverables/z/final.md
```

- `present` 工具按当前 working directory 解析到 `/old/new/.dsh-company/deliverables/z/final.md`，其中是一份坏 PRD；
- `prd-gate` 用 `session.header.cwd`（`/old`）解析到 `/old/.dsh-company/deliverables/z/final.md`（不存在）→ `readTextInside` 返回 undefined → 视为旧动议 **allow**。

keyless 复现直接注入 `header.cwd=/old`，真实坏文档放在 `/old/new/...`，闸门返回 `gate stale-cwd allow`，而同一文档 `validateProductDocs` 为 `false`。

## 根因（假设）

- `gateToolCall()` 只取 `exec.agent?.session?.header?.cwd`（[prd-gate.ts](../../../packages/company-pack/src/host/commands/prd-gate.ts#L48) 的 `deliverableOf`），header cwd 是会话创建时的值；vendor `workingDirectory.set()` 只 append `working-directory/change` projection，不改 header。
- `present` 工具用 `ctx.workingDirectory.ensure(exec.agent)` 读同一 projection（vendor `session/working-directory/src/index.ts` 的 `get/ensure`），所以两者在 `cd` 后分叉。
- 同类触发：`header.cwd` 缺失（旧会话/未 ensure）时，相对路径直接 `undefined` → 闸门跳过。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8-round1.mts
```

看 `gate stale-cwd allow real invalid: false`。真实 `present` 路径解析见 vendor [working-directory/index.ts](../../../vendor/dsh/packages/session/working-directory/src/index.ts) 的 `ensure()` 与 [tool-present/index.ts](../../../vendor/dsh/packages/deliverables/tool-present/src/index.ts) 的 `ctx.workingDirectory.ensure(...)`。

## 影响 / 失败类

**失败类 6（会话/持久化）+ 10（组合）**：present 闸门可被「先 `cd`、再用相对路径」绕过；也可能反向：header 指向旧目录时误查另一份文档。闸门与工具对「当前工作目录」有两套事实。

## 修复方向（不在本卡实施）

- 闸门与 `present` 用同一 workingDirectory projection/服务解析路径（pre-execute listener 是 async，可 `await ctx.workingDirectory.ensure(...)`），或只接受绝对路径并明确拒绝相对路径。
- spec 覆盖 `cd` 后 present、header.cwd 缺失、绝对/相对两形状。

## 已修判定

```text
header.cwd=/old，cd 到 /old/new 后 present 相对路径 → 闸门看 /old/new 的文档（deny 坏 PRD），不再看 /old
present 侧解析器                                  → 同一 workingDirectory 服务（ctx.workingDirectory.ensure）
cwd 无法解析 + 相对路径指向 .dsh-company/deliverables → deny（不静默跳过）
绝对路径                                          → 仍按绝对路径解析（不回归）
```

判据由 `tests/host/commands/prd-gate.spec.ts` 的「cd 后相对路径」「cwd 缺失」两组用例搭载；红证 = 闸门改回 `session.header.cwd` → cd 用例变 allow。

## 证据

- `runtime/tmp/c8-round1.mts`：`gate stale-cwd allow real invalid: false`；临时 workspace 的坏 PRD 在 `/old/new/...`。
- 代码：[prd-gate.ts](../../../packages/company-pack/src/host/commands/prd-gate.ts#L48)；vendor [working-directory](../../../vendor/dsh/packages/session/working-directory/src/index.ts)、[tool-present](../../../vendor/dsh/packages/deliverables/tool-present/src/index.ts)。
