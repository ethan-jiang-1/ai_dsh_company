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
| [repo-hygiene/2026-10-20-fresh-agent-audit.md](repo-hygiene/2026-10-20-fresh-agent-audit.md) | [fresh-agent 全仓打扫卫生问题卡](../issues/2026-10-20-fresh-agent-repo-hygiene.md)：六轴证据、腐化账本与 A–D 分批修复建议；关联 [BUG-029](../_archive/fixed_bugs/BUG-029-committed-web-token-recurrence.md) |
| [repo-hygiene/2026-10-20-followup-six-dimension-audit.md](repo-hygiene/2026-10-20-followup-six-dimension-audit.md) | 同一问题卡（第二轮持续跟进）：上轮修复复核全守住 + 新发现（replay 实际 1/10、diagnose 审批判读 BUG A、orient --scenario r3 崩 BUG C）+ P0–P4 改善清单待用户选批 |

随卡归档的材料见 [研究归档](../_archive/research/README.md)。
