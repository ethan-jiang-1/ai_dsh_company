---
status: 调查中
severity: P2
opened: 2026-11-14
---

# BUG-162：PRD parser 不忽略 HTML 注释，注释里的示例仍成定义

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 89](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-153 修了围栏代码块，但另一类「非定义容器」HTML 注释仍未处理。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8b-html-comment.mts`。

## 症状

PRD 里用 HTML 注释保留示例/草稿时：

```html
<!--
## Slices
| S9 | fake | REQ-999 | x |
### REQ-999 示例
-->
```

`/prd check` 仍把注释里的 `### REQ-999` 当需求定义，报 `REQ-999.userStory 缺失` 等 9 条；`reqCount` 从 1 变 2。把注释放在 REQ 小节内同样产生幽灵需求。

同一文档去掉注释块后 `ok: true`，说明是注释容器未被识别。

## 根因（假设）

`scanLines()` 只维护围栏（``` / ~~~）状态；`prdRequirementBlocks()` / `parsePrdSlices()` 在非围栏行上匹配标题/表格，没有 HTML 注释（`<!-- … -->`，含多行）状态。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8b-html-comment.mts
```

输出 `HTML comment false [...]` 与 `HTML comment inline false [...]`，均含 `REQ-999` 的字段错误。

## 影响 / 失败类

**失败类 6/9（文档文本形状）**：注释是「非交付内容」的常规容器；合法 PRD 保留一段注释示例就被判红，present 闸门 deny。与 BUG-153 的围栏假红同族，但修复只覆盖了围栏。

## 修复方向（不在本卡实施）

- 在 `scanLines()` 增加 HTML 注释状态（`<!--` 到 `-->`，支持多行），注释行不参与标题/表格扫描；
- spec 覆盖「注释里的 REQ/Slices 不算定义」与「注释外正常解析」。

## 证据

- `runtime/tmp/c8b-html-comment.mts` / `.log`：注释块产生 `REQ-999` 的 9 条错误，`reqCount 2`。
- 代码：[prd-check.ts](../../packages/company-pack/src/lib/prd-check.ts) 的 `scanLines()` / `prdRequirementBlocks()`。
