# research/ · 卡片的调研依据

短结论回 [issues](../issues/README.md) 或 [bugs](../bugs/README.md)，较长的证据阅读、综述、机制笔记住这里。先从卡片链接选读，不必通读目录；半成品合法。

## 契约

- 只收值得保留且服务活跃卡的材料，卡片链接它。一次性草稿留仓内 gitignored 工具区，见 [开发环 §11](../../docs/guides/dev-loop.md)；长期超出原卡用途的材料向 [下游](../../notes/README.md) 申请处理，不自行变成 Note。
- 按主题子目录组织，文件名 `YYYY-MM-DD-<slug>.md`。新主题开子目录，不平铺新材料；索引记含主题的路径。
- 原始证据保留 URL、原句、版本/样本、获取限制与反证；分清事实、推论和实现状态。不能从 schema、一次运行或代理读数推出收益与真实采纳。
- 材料可服务多张卡。最后一张使用它的活卡离开时 `git mv` 到 [研究归档](../_archive/research/README.md)，主题结构、文件名、frontmatter 与历史证据正文保留，修相对链接。
- 没有活卡使用的材料不留这里。索引写活卡及用途；间接使用写清引用链，“原卡”不能代替当前消费者。结构检查不证明证据质量或方法有效。

## frontmatter

新文件第一项为 `topic`，第二项为一行加引号的 `intent`；不写 `status`，不把原料伪装成结论。

```yaml
---
topic: 技术
intent: "为什么需要这份依据。"
---
```

`topic` 用对应主题的短中文词；迁档时字段不变，历史材料不强制回填。

## 索引

| 文件 | 活卡与用途 |
|---|---|
| [backlog-ux/2026-10-19-issue-card-audit.md](backlog-ux/2026-10-19-issue-card-audit.md) | [已结质量卡](../_archive/settled_issues/2026-10-19-issue-card-quality.md) + 四张公司面卡：当前态/陈旧引用/状态问题的审计与 A 收口依据；Card v2 与 DSH 执行层映射（B 以后做） |
| [company-panels-ux/2026-10-19-panel-inventory-and-priority.md](company-panels-ux/2026-10-19-panel-inventory-and-priority.md) | [已结公司面优先级卡](../_archive/settled_issues/2026-10-19-company-panels-ux-priority.md)：真实数据量/交互面/历史痛点与 Top 3 依据（**§二 数据量归属 / §四 痛点计数 / §五 评分已被下一行订正**） |
| [company-panels-ux/2026-10-19-panel-truth-audit.md](company-panels-ux/2026-10-19-panel-truth-audit.md) | 同一父卡 + 三张深挖卡 + [BUG-025](../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md) / [BUG-026](../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md) / [BUG-027](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)：面板真实数据面、真投影字段实况与可复跑脚本（⚠ **§三 取法已证伪**：读的是 projcache state 行而非 wire 视图；**§五/§六 仍基于该旧前提**——见文首补正与质量审稿） |

随卡归档的材料见 [研究归档](../_archive/research/README.md)。
