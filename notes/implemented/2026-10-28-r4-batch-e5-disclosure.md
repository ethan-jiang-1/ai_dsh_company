---
状态：implemented（2026-10-28，第四轮批 E5：渐进披露收口）
---

# 批 E5：第二跳 owner 加“什么时候读”，preset 完成定义只留一个家

> 上游 = [第四轮六维打扫卡](../../_backlog/_archive/settled_issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-11 / R4-13）](../../_backlog/_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. **第二跳 owner 加发现信号**：`packages/company-pack/src/README.md`、`tests/README.md`、`checks/README.md` 顶部各加一行“什么时候读”。它们正是入口链第二跳，却此前没有“按需加载”的行为提示。
2. **preset 完成定义单家**：`docs/presets.md` 的“培养验收”不再自称完整完成定义，改为“完整完成定义 = preset-change-definition skill；本段只补培养内容特有的入戏证据”。根 AGENTS 命令表已在批 A 改成“真挂载检查 + skill 指针”，两处不再互指。
3. **不新增清单**：没有建第二份 preset 检查表；skill 仍是次序/最小证据/场景义务的唯一家。

## 输掉的方案

- **把四处 preset 完成定义合并成一份长清单**：拒绝。会复制 skill 内容到合同层，下一次漂移还是两处。
- **在 tests/README 里补 host 行时顺便再列一遍脚本**：拒绝。行级映射已指向 tests/README；脚本触发条件唯一家仍是脚本头注。

## 后果

- 读者在第二跳就能判断“这份文件现在要不要读”；不用先读全文再决定。
- preset 改动只有一个完成定义 owner（skill）；presets.md 只保留“培养内容”的追加证据。
- 未动：skill 正文本身、preset 实际测试；本批纯文档。

## 验证

- `pnpm verify` → ALL PASS（含 doc-taxonomy / doc-budget / md-links）。
- `pnpm test` 前一批已全绿；本批无代码/测试改动。

## 未验 / 下一步

- observer 生产接线、共享 test helper、单 it 巨测、client `apply` 201 行、client error 会话可见性仍未收口。
