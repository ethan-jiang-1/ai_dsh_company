---
status: 修复就绪
severity: P2
opened: 2026-11-15
---

# BUG-188：implemented Note 里的 ui-surface 验证命令指向已搬走的 tests/host 路径

> 严重级别：P2（次要）｜发现：2026-11-15｜状态：修复就绪
>
> **关联**：[探索卡 Round 92](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M2（活指针）；[BUG-189](BUG-189-implemented-note-generic-english-stale-path.md) 同族（implemented Note 的事实落点未随测试树搬移）。
> **留痕**：Note（本批共用；落地同 diff 写 `notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md`）。

## 症状

[notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md](../../notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md) 第 40 行仍写：

```text
| patch 形状 | `pnpm test tests/host/ui-surface.spec.ts` | 5 passed：两条行 `disabled: true`、web-app 真行存在、controller 未禁用 |
```

但该 spec 已随 `41209376`（tests/harness 拆六面）搬到 `tests/ui/ui-surface.spec.ts`。照 Note 的命令跑会得到「No test files found」；现行命令仍能跑出 Note 描述的 5 passed。

## 运行面

决策记忆 / 文档指针（`notes/implemented/` 是活文档，N5 要求事实落点随改动就地更新）；不是运行时行为。

## 复现

```sh
pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 决策记忆
pnpm test tests/host/ui-surface.spec.ts   # 旧命令：exit=1，No test files found
```

实跑日志 = `runtime/tmp/c11/ui-surface-old.log` / `ui-surface-new.log`（2026-11-15）。

## 根因与证据

- **根因**：测试树从 tests/harness 拆成六面时，`ui-surface.spec.ts` 搬进 `tests/ui/`；Note 里的命令在反引号里、带空格，`bare-path` 按设计跳过带空格 token，`command-refs` 只扫 activeDocs（不含 `notes/implemented`），所以没有任何门禁看见它。
- **N5 约束**：该 Note 文件名日期 2026-11-02 ≥ 2026-10-09，属于「事实落点必须现行」的硬档；路径不是决定的正文，改命令不构成篡改决定。
- **确认**：旧路径不存在、`tests/ui/ui-surface.spec.ts` 存在且 5 passed；Note 仍逐字提及旧路径。

## 失败类与同类排查

**失败类 = 文档指针**（implemented Note 里的可执行命令未随测试搬移更新；命令带空格时绕过 bare-path）。

同类扫描：`notes/implemented/**` 的 `tests/*.spec.ts` 字面量逐条对盘；本处与 BUG-189 是仅有的两条活残留（其余 193 条命中都存在）。`notes/archived` / `_backlog/_archive` 是 frozen，不判。

## 修复方案与范围

- 把 Note 的命令改成 `pnpm test tests/ui/ui-surface.spec.ts`；结果文案（5 passed）不变。
- 防复发：`tests/repo/docs/live-pointer-paths.spec.ts` 的「决策记忆」用例扫 `notes/implemented/**` 的 `tests/*.spec.ts` 字面量（反引号与纯文本都扫）并要求存在。范围限于 live 决策记忆；`notes/archived/**` 与归档卡是冻结层，继续不判——历史收据不做回写。
- 明确不改：不改 Note 的决定叙述与历史结论，不改测试文件。

## 已修判定

`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 决策记忆` 退出 0；`rg -n 'tests/host/ui-surface\.spec\.ts' notes/implemented` 零命中；`pnpm test tests/ui/ui-surface.spec.ts` 5 passed。
