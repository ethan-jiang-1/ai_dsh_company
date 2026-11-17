---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-187：模块头注仍把 keyless spec 指向搬移前的扁平 tests/lib 路径

> 严重级别：P2（次要）｜发现：2026-11-15｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（typecheck 规则类型互斥；归档后 bug-coverage 缺具名守卫）已修复；建议 S1–S8 全部处置（根配置覆盖、tools coveredBy 补 coverage-ratchet、tests/README 同 diff、阈值判据口径、负例过滤、词表全量核对、计数校正、删「未接 N」数字）
>
> **关联**：[探索卡 Round 92](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M2（活指针）。
> **留痕**：Note [2026-11-16-move-side-effects-and-live-pointers.md](../../../notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md)（本批共用）。

## 症状

模块的公开头注写着「keyless 单测 = <旧路径>」，但 spec 已搬进分组目录：

| 载体 | 头注里的旧路径 | 现行家 |
|---|---|---|
| packages/company-pack/src/lib/accounting/ledger.ts 第 5 行 | tests/lib/ledger.spec.ts | `tests/lib/accounting/ledger.spec.ts` |
| packages/company-pack/src/lib/accounting/signoff.ts 第 4 行 | tests/lib/signoff.spec.ts | `tests/lib/accounting/signoff.spec.ts` |
| packages/company-pack/src/lib/presence/presence-status.ts 第 72 行 | tests/lib/presence-board.spec.ts | `tests/lib/presence/presence-board.spec.ts` |

agent 照着注释跑 `pnpm test tests/lib/ledger.spec.ts` 会得到「No test files found」；`bare-path` 只扫 Markdown 的反引号裸路径，不扫 `.ts` 注释；`command-refs` 只扫 activeDocs，不扫源码注释。所以 `pnpm verify` 全绿。

**同类补漏（本轮扩面）**：Round 92 预检把两处 cultivation 指针标为「同类但非本批」（earlier spec 拆分残留，`1eb14f46` 又碰过这两个文件）：

| 载体 | 旧指针 | 现行家 |
|---|---|---|
| packages/company-pack/src/client/cultivation/cultivation-data.ts 第 8 行 | tests/host/cultivation.spec.ts | `tests/host/cultivation/`（command / context / maintenance 三份） |
| packages/company-pack/src/host/cultivation/cultivation.ts 第 22 行 | tests/host/cultivation.spec.ts | 同上 |

新守卫扫 `src/**` 全部 `tests/*.spec.ts` 字面量——不把这些一起修，守卫一上线就是红的；「同类但非本批」不构成跨批豁免的理由。

## 运行面

lib 面（源码注释）与验证面（文档指针）；不是运行时行为。影响 agent 的检索反射「改了 X → 去注释点名的 spec 找证据」。

## 复现

```sh
pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 源码注释
```

修复前实跑：5 条 `→ tests/...spec.ts` 全部盘上不存在（含上面表格的 5 行）；修复后同一命令绿。独立探针 = `node runtime/tmp/c11/live-pointer-check.mjs`（前三条 STALE）。

## 根因与证据

- **根因**：`1eb14f46` 把 `tests/lib` 的 spec 搬进八个域组，127 个 importer 与 6 个 checks import 都改了，但这三处**注释里的路径**不在 import 面，漏了。cultivation 两处更早（spec 按 R5-23 拆族时）就失效，`1eb14f46` 只是又碰过文件。
- **回归性**：`0ec98374`（2026-11-15 04:40）刚把这三处从更早的旧分区名修到 `tests/lib/*.spec.ts`；同日 14:47 的搬移又把它们打回旧家——同一类指针在一次搬移里被重新制造。
- **确认**：旧路径不存在、现行路径存在；五个载体都仍提及旧路径（spec 逐条读取文件验证）。

## 失败类与同类排查

**失败类 = 文档指针**（代码注释作为活指针，搬移后未随迁；扫描面不覆盖源码注释）。

同类扫描：`runtime/tmp/c11/live-pointer-sweep.mjs` 扫 761 个 live 文件；除本卡 3 处 + BUG-188/189/190 的 3 处外，`src/**` 还有上表两处 cultivation（本轮并入）。其余命中是 frozen / fixture / 负例 / 有意保留（见 Round 92 表）。`bare-path` 的扫描面 = Markdown + 反引号；源码注释不在内。

## 修复方案与范围

- 三处注释改成现行分组路径；两处 cultivation 改成 `tests/host/cultivation/`（目录指针，后续再拆 spec 也不会立刻失效）。
- 防复发：`tests/repo/docs/live-pointer-paths.spec.ts` 的「源码注释」用例扫 `packages/company-pack/src/**` 的 `tests/*.spec.ts` 字面量并要求存在。
- 明确不改：不改测试文件、不改模块行为、不改 `tests/lib` 分组。

## 已修判定

`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 源码注释` 退出 0；`rg 'tests/lib/(ledger|signoff|presence-board)\.spec\.ts' packages/company-pack/src` 零命中；`pnpm test tests/lib` 仍绿。负控 = 把任一注释改回旧路径 → 同一命令红；还原 → 绿。

## 修复证据

- 改动面：`packages/company-pack/src/lib/accounting/ledger.ts`、`packages/company-pack/src/lib/accounting/signoff.ts`、`packages/company-pack/src/lib/presence/presence-status.ts`、`packages/company-pack/src/client/cultivation/cultivation-data.ts`、`packages/company-pack/src/host/cultivation/cultivation.ts`、`tests/repo/docs/live-pointer-paths.spec.ts`
- 红：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 源码注释`（5 条旧指针：3 lib + 2 cultivation）
- 绿：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 源码注释`（1 passed / 5 skipped）
- 提交：commit 713acc60
