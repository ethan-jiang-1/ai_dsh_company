# 2026-11-03 · 行预算补三份最大 owner 文档与发布 handoff

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D1 R5-17）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-17

## 决定

`checks/gates/doc-budget.mjs` 增五行预算，按现行内容 +5–7%：

| 文件 | 现行 | 上限 |
|---|---|---|
| `README.md` | 84 | 90 |
| `_backlog/README.md` | 132 | 140 |
| `notes/README.md` | 124 | 132 |
| `packages/company-pack/README.md` | 152 | 160 |
| `docs/guides/publish-handoff.md` | 90 | 95 |

这五份都是活文档，且此前完全在棘轮外；审计实测它们是“最大的未受管面”。

## 输掉的方案

- **继续不设上限。** 审计前它们已经长到 84–152 行；不设上限 = “顶格即饱和”的信号对它们永远不亮。
- **上限 = 现行行数。** 零头寸会逼每次正常补充都先写 Note 提额；+5–7% 是给正常演进的余量，不是增长许可。
- **生成式预算（按文件类型自动算）。** 会把“这份文档现在是否该瘦身”变成机器猜；预算的价值在**人决定**的棘轮。

## 验证（实跑）

```text
node -e "…doc-budget.run…"   # 40 行全部 PASS
# OK doc-budget README.md (84/90)
# OK doc-budget _backlog/README.md (132/140)
# OK doc-budget notes/README.md (124/132)
# OK doc-budget packages/company-pack/README.md (152/160)
# OK doc-budget docs/guides/publish-handoff.md (90/95)
```

红证（真破坏）：把 `publish-handoff` 上限临时改成 80 →
`FAIL doc-budget: docs/guides/publish-handoff.md 90 行超上限 80`；还原 95 → PASS。
门禁注释已记这条负例。

## 后果与边界

- 这五份再长就要先搬内容/压缩，或在 Note 里论证提额；反向棘轮仍守 >20% 空置。
- `docs/reference/decisions.md` 62/62 零头寸是另一类问题（编号只增不删），不在本轮；留在报告 R5-17 的剩余面。
