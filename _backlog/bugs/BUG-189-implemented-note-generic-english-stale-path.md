---
status: 修复就绪
severity: P2
opened: 2026-11-15
---

# BUG-189：implemented Note 仍指向已退役的 tests/content/generic-english.spec.ts

> 严重级别：P2（次要）｜发现：2026-11-15｜状态：修复就绪
>
> **关联**：[探索卡 Round 92](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M2（活指针）；[BUG-188](BUG-188-implemented-note-ui-surface-stale-command.md) 同族。
> **留痕**：Note（本批共用；落地同 diff 写 `notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md`）。

## 症状

[notes/implemented/2026-11-12-i18n-expression-role-pilot.md](../../notes/implemented/2026-11-12-i18n-expression-role-pilot.md) 第 280 行写：

```text
- 新增 tests/content/generic-english.spec.ts；注入中文 → 红，还原 → 绿。
```

该 spec 已在 `c567b2b7`（退役 9 份重复 spec）中被并入 `tests/content/content-english.spec.ts`；旧文件不存在。Note 是 2026-11-12 的 implemented 记录，属 N5 事实落点必须现行的硬档。

## 运行面

决策记忆 / 文档指针（`notes/implemented/`）；不是运行时行为。

## 复现

```sh
pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 决策记忆
pnpm test tests/content/generic-english.spec.ts   # 旧路径：exit=1，No test files found
```

实跑日志 = `runtime/tmp/c11/generic-english-old.log` / `content-english-new.log`（2026-11-15）。

## 根因与证据

- **根因**：2026-11-13 的测试资产退役轮把 `generic-english.spec.ts` 与其它 8 份重复 spec 收进 `content-english.spec.ts`；Note 里的路径是**普通文本**（无反引号、无链接），`bare-path` 的纯文本档只匹配 `notes/*` 引用、不匹配 `tests/*`，`md-links` 只查 Markdown 链接，`command-refs` 不扫 notes，所以没有任何门禁看见它。
- **确认**：旧路径不存在；`content-english.spec.ts` 含原 generic 6/6 文件清单与英文棘轮断言，4 passed；Note 仍逐字提及旧文件名。

## 失败类与同类排查

**失败类 = 文档指针**（退役/合并 spec 后，implemented Note 的普通文本路径未更新；纯文本 `tests/*` 不在任何扫描面）。

同类：`notes/implemented/**` 中所有 `tests/*.spec.ts` 普通文本引用逐条对盘；本处与 BUG-188 是仅有的两条活残留（其余为「当轮旧分区名」明确标注的历史叙述）。

## 修复方案与范围

- Note 第 280 行的文件名改成 `tests/content/content-english.spec.ts`；「注入中文 → 红，还原 → 绿」的结论不变。
- 防复发：同 BUG-188 的「决策记忆」用例（纯文本档也扫）。这是本批的窄决定：只覆盖 `notes/implemented/**` 的 `tests/*.spec.ts`，不扩成通用路径门禁；`notes/archived/**` 不判。
- 明确不改：不改 Note 的决定/历史、不改测试内容。

## 已修判定

`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 决策记忆` 退出 0；`rg -n 'generic-english\.spec\.ts' notes/implemented` 零命中；`pnpm test tests/content/content-english.spec.ts` 4 passed。
