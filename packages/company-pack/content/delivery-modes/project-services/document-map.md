# 项目制 / 系统集成 · 文档映射

> 层：交付模式 · 加载：按需（T2）。本文件回答“project-services 动议多哪些文档、谁写、和 PRD 什么关系”。

## 文档链

```text
产品类型链（business-software / hardware-software）
  MRD → StRS → PRD
        │
        └─ 交付模式链（project-services）
             SOW → 里程碑 → RACI → UAT → 验收/移交
```

## 文档与 owner

| 文档 | 文件 | owner | 什么时候写 | 与 PRD 的关系 |
|---|---|---|---|---|
| SOW | `drafts/sow.md` | COO | PRD 初稿后 | 引用 PRD 的 REQ/AC；写 in/out of scope、依赖、里程碑、验收、变更控制 |
| 里程碑计划 | `drafts/milestones.md` | COO | SOW 后 | 每个里程碑的出口条件与收款节点；不替代 PRD 的 slice |
| RACI | `drafts/raci.md` | COO | 组队后 | 谁执行/谁负责/谁咨询/谁知情；人力引用 `kb/roster.md` |
| UAT 计划 | `drafts/uat.md` | COO | PRD 的 AC 稳定后 | UAT 用例覆盖 REQ/AC；不新造需求 |
| 验收/移交记录 | `drafts/acceptance.md` | COO | UAT 后 | 客户签字、遗留项、维护交接 |

## 模板

- [templates/sow.md](templates/sow.md)
- [templates/milestones.md](templates/milestones.md)
- [templates/raci.md](templates/raci.md)
- [templates/uat.md](templates/uat.md)
- [templates/acceptance.md](templates/acceptance.md)

## 机器可读规则

[delivery-rules.json](delivery-rules.json) 声明“本模式需要哪些文档、谁 owner、哪些字段必填”。
`/delivery check <slug>` 按 rules 检查 `documents.file` 与 `requiredSections`；`/req check` 仍管需求编号/追溯。
