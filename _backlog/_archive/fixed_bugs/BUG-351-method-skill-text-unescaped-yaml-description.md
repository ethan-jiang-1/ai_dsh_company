---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-351：`methodSkillText` 未对 `expectation` 做 YAML 转义，含 `: ` 等合法期望语句采纳后会写坏 `SKILL.md` 被 DSH 静默丢弃

> 严重级别：P1（核心回路静默失效：`/cultivation adopt` 返回成功并将记录标为 `adopted`，但写出的 `<cultivationRoot>/<role>/<slug>/SKILL.md` YAML frontmatter 不可解析，DSH `skill-filesystem` 运行时静默忽略该技能）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（六类恶意期望句均解析且逐字还原）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（批次 351..359：用户文本入 YAML 必须编码 + 落盘自检）

## 症状

1. 人类通过 UI 或 `/cultivation correct <期望行为> :: <做法>` 提交、然后执行采纳（`commandAdopt`）时，只禁止期望行为包含 `::`，允许正常的标点与空格（例如 `接口报错: 收口前先列未决项`、`[TODO] 先核对基线`、纯数字 `123` 等）；
2. [`methodSkillText`](../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L318-L330) 在第 322 行直接把未经 YAML 转义的 `oneLine(input.expectation)` 拼进 `description: ${oneLine(input.expectation)}`；
3. [`vendor/dsh/packages/skill/skill-filesystem/src/index.ts`](../../../vendor/dsh/packages/skill/skill-filesystem/src/index.ts#L810-L826) 的 [`parseFrontmatter`](../../../vendor/dsh/packages/skill/skill-filesystem/src/index.ts#L924-L936) 用标准 `parseYaml(yaml)` 解析 `SKILL.md` frontmatter——遇 `: ` 抛 nested mapping 错误、遇 `[`/`*` 抛语法错误、遇纯数字使 `stringField(data, 'description')` 返回 `undefined`，结果打一条 warn 后**整份丢弃该已采纳技能**，而培养面板仍显示 `已采纳`。

## 运行面

- **面 = lib + host**：[`packages/company-pack/src/lib/cultivation/cultivation-record.ts`](../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L318-L330)、[`packages/company-pack/src/host/cultivation/cultivation.ts`](../../../packages/company-pack/src/host/cultivation/cultivation.ts)（`commandAdopt`）。

## 复现

使用临时 `workspace` 与 `cultivationRoot` 通过 `registerCultivation` 注册并调用真实 `/cultivation` handler：

1. 执行 `correct 接口报错: 收口前先列未决项 :: 检查 HTTP 状态码并记录原因`（返回 `success`）；
2. 对生成的记录执行 `adopt <id>`（返回 `success`）；
3. 用与 DSH 同源的 YAML frontmatter 解析器 [`parseFrontmatter`](../../../tools/lib/core/repo-markdown.mjs) 解析落盘的 `<cultivationRoot>/ceo/<slug>/SKILL.md`：
   - 实测文件内容包含未加引号的 `description: 接口报错: 收口前先列未决项`；
   - `parseFrontmatter` 返回 `present: true` 且 `error` 非空（YAML 解析失败）。

## 根因与证据

1. [`cultivation-record.ts`](../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts#L322) 直接模板插值 `description: ${oneLine(input.expectation)}`，未按 YAML 标量规则转义（例如 `JSON.stringify(oneLine(input.expectation))` 双引号标量）；
2. [`commandAdopt`](../../../packages/company-pack/src/host/cultivation/cultivation.ts) 写盘前未校验产出的 `SKILL.md` 是否通过标准 YAML frontmatter 解析，即标记录为 `adopted`。

## 失败类与同类排查

- **失败类**：自拼 YAML frontmatter 未按上游 YAML 解析器语法转义任意用户输入，导致消费方静默丢弃已生成技能。
- **同类排查**：`company-root-carriers` 门禁（[`checks/gates/company-root-carriers.mjs`](../../../checks/gates/company-root-carriers.mjs#L337-L340)）只检查仓库源码树内静态 `SKILL.md`，管不到运行时 `/cultivation adopt` 写到 `$DSH_HOME/company/methods/` 的产物；另需同步检查 `methodSkillText` 中 `name` 与其余 `SKILL.md` 生成处。

## 修复方案与范围

- **根因修法**：在 `methodSkillText` 对 `description`（以及必要时的其它标量字段）使用安全 YAML 字符串编码（例如 `JSON.stringify(oneLine(input.expectation))`——JSON 字符串同时是合法 YAML 双引号标量），并在落盘前做一次 `SKILL.md` frontmatter 自洽检查。

## 已修判定

- `expectation` 含 `: `、`[tag]`、`*`、`"`、`#` 或纯数字时，`commandAdopt` 生成的 `SKILL.md` 经 `yaml` / `parseFrontmatter` 解析无错误且 `description` 逐字还原为期望行为原文。

## 修复证据

- 改动面：`packages/company-pack/src/lib/cultivation/cultivation-record.ts`、`packages/company-pack/src/host/cultivation/cultivation.ts`、`tests/lib/cultivation/cultivation.spec.ts`、`tests/host/cultivation/cultivation-command.spec.ts`、`checks/lib/company-static-audit.mjs`（host CJK 棘轮 +3，成对新增句）
- 红：`pnpm test tests/lib/cultivation/cultivation.spec.ts tests/host/cultivation/cultivation-command.spec.ts` —— 还原编码/自检前 5 failed（`: `/`[tag]`/纯数字的 frontmatter 解析失败）
- 绿：`pnpm test tests/lib/cultivation/cultivation.spec.ts tests/host/cultivation/cultivation-command.spec.ts` —— 52/52 passed（六类期望句经 `parseFrontmatter` 逐字还原；adopt 真实写盘可解析）
- 提交：commit b781937f
