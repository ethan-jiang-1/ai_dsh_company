---
status: 调查中
severity: P2
opened: 2026-11-11
---

# BUG-075：`eng-teaming` 一边说 schema 引擎事实住 workflow contract，一边又复述“分支不传 schema”

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：调查中

## 症状

[eng-teaming](../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md) 的两个位置互相矛盾：

- 第 16 行（2.5 档表）仍写：`**分支不传 schema**，只回一行 JSON，父脚本 JSON.parse`；
- 第 38 行（workflow 使用）写：`schema/截断/spill/重启/终态等**引擎事实**住 company:workflow-contract section；本 skill 不复述`。

同一份 skill 里，schema 规则既被声明“不在本 skill”，又被复述了一次。`company:delegation-workflow` section
也只留“分支只回一行 JSON”的用法，schema 子集/不支持形状在 `content/contracts/workflow.md`（引擎事实）里。
这正是 Issue 2 要消灭的“引擎事实混进角色方法 skill”的一个残留。

## 根因（假设）

`eng-teaming` 缩编时保留了五档表的 workflow 单元格原文，只把长段硬规则删掉；`分支不传 schema` 属于
workflow 引擎事实，应随长段一起移走，但表内短句没被扫到。

## 暴露的失败类

**“只搬长段、不扫表格/短句”的合同缩编**：同一事实在长段里搬走了，表格单元格/一行注释还留着，
就会形成“声明不复述 + 实际复述”的自相矛盾；模型读到短句仍会照旧执行旧规则。

## 复现

```sh
rg -n "schema|workflow-contract" packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md
```

输出同时命中第 16 行的“分支不传 schema”与第 38 行的“schema … 住 company:workflow-contract；本 skill 不复述”。

## 修复方向（未授权）

- 五档表的 workflow 单元格只留**用法判据**：≥3 同构、分支只回一行可解析 JSON、父脚本聚合、只读/一分支一文件；
  删掉“分支不传 schema”这个引擎事实句，或改成“schema 规则见 `company:workflow-contract`”。
- 检查同表/其他角色 skill 是否还有同类引擎短句（`schema 子集`、`spill`、`maxResultChars`、`restart`）。
- 验收：`eng-teaming` 不再出现 schema 子集/`分支不传 schema` 的事实句；`pnpm test tests/presets` 绿；
  `preset-smoke` 绿；VP-Eng workflow probe 仍 ALL PASS。

## 修复关联

未修。发现于 [委派能力域化回归 + 探索卡](../issues/2026-11-11-delegation-capability-scoping-regression-exploration.md)
A4 静态债；Issue 2 Note 的「无规则丢失」检查漏了表格短句。
