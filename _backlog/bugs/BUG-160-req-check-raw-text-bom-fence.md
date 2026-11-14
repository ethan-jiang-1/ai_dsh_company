---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-160：`/req check` 仍按原始文本解析：BOM 缺头、围栏示例成幽灵需求

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 89](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-152/153 修了 `prd-check` 的文本形状层，但 `/req check` 的 `parseHeader` / `headingDefinitions` 是另一套解析。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8b-reqcheck.mts`。

## 症状

同一对 MRD/StRS/PRD：

- **BOM PRD**：`/prd check` 侧已归一化（BUG-152 修复），但 `checkRequirements` 报 `drafts/prd.md 缺 layer/definition 头`、`缺层 PRD`，计数从 `REQ:2/AC:1` 掉到 `REQ:1/AC:0`。
- **围栏示例**：PRD 里 ```md 围栏中的 `### REQ-999` 被 `/req check` 当成定义，索引多出 `REQ-999`，并报 `孤儿 REQ-999`；`REQ` 计数从 2 变 3。

## 根因（假设）

- [requirements-check.ts](../../packages/company-pack/src/lib/requirements-check.ts) 的 `parseHeader()` 用 `/^---\r?\n/`，不剥 BOM；`headingDefinitions()` 用 `text.split('\n')` + `line.trim()`，没有围栏状态。
- `prd-check.ts` 的 `normalizeDocument()` / `scanLines()` 只服务 `/prd check`；两个命令各有一套「什么是文档结构」的解释，同一份文件在两边结果不同。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8b-reqcheck.mts
```

输出：`BOM PRD false [...]`（缺头 + 缺层 + 覆盖率下降）；`fenced PRD false [ '孤儿 REQ-999 ...' ]`，`REQ:3`、`REQ999 defs 1`。

## 影响 / 失败类

**失败类 6（持久化文本形状）+ 1（纯逻辑）**：`/req check` 是编号/追溯/层覆盖的唯一命令；BOM 让合法文档被判缺头，围栏示例让幽灵需求进入索引/覆盖统计。与 `/prd check` 的结论相反，操作员无法判断该信哪边。

## 修复方向（不在本卡实施）

- 抽出共享的文档文本形状层（去 BOM/CRLF、围栏扫描），`prd-check` 与 `requirements-check` 都消费同一份；
- `parseHeader` 入口剥 BOM；`headingDefinitions` 跳过围栏行；
- spec 用同一 BOM/围栏文档同时跑 `/prd check` 与 `/req check`，断言结论一致。

## 已修判定

```text
BOM PRD        checkRequirements 不再报缺头/缺层；REQ 计数与 LF 版一致（不再 2→1）
围栏里的 REQ-999 不进索引（无「孤儿 REQ-999」）；REQ 计数不再 2→3
同一份 BOM/围栏文档同时跑 validateProductDocs 与 checkRequirements → 结论一致（parity 用例）
结构层唯一家 = lib/markdown-shape.ts；prd-check 不再留本地 normalize/fence 副本
```

判据由 `tests/lib/requirements-check.spec.ts` 的 parity 用例搭载（同 diff 落）；红证 = 把 `parseHeader`/`headingDefinitions` 改回原始文本处理 → BOM 缺头与围栏幽灵需求两条复现。

## 证据

- `runtime/tmp/c8b-reqcheck.mts` / `.log`：BOM `REQ:1/AC:0`；围栏 `REQ:3` + 孤儿 REQ-999。
- 代码：[requirements-check.ts](../../packages/company-pack/src/lib/requirements-check.ts)；对照 [prd-check.ts](../../packages/company-pack/src/lib/prd-check.ts)。
