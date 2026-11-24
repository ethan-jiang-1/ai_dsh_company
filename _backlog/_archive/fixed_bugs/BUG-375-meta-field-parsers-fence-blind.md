---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-375：`productType` / `deliveryMode` 的行解析不感知围栏，`meta.md` 里**引用的模板样例**会盖过真值

> 严重级别：P2（同一份 `meta.md` 的字段解析有三种结构敏感度：`numbering` 走结构行（围栏里的假字段不算），`productType`/`deliveryMode` 用 `/^productType\s*[:：]\s*(.+)$/m` 直接全文首匹配（围栏里的样例行**算**）。动议 `meta.md` 里粘过模板（或把字段示例放进代码块）时，解析出的类型/交付模式是示例值 → `/req check`、`/delivery check` 报「未知产品类型/交付模式」并拒绝，或按错误类型跑规则）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（结构行过滤）
>
> **留痕**：Note [2026-11-24-meta-single-source-and-presence-parity](../../../notes/implemented/2026-11-24-meta-single-source-and-presence-parity.md)（批次 370..376：字段解析结构感知）

## 症状

[`req-command.parseProductType`](../../../packages/company-pack/src/host/commands/req-command.ts#L75-L81)、[`req-command.parseDeliveryMode`](../../../packages/company-pack/src/host/commands/req-command.ts#L84-L90)、[`delivery-command.parseDeliveryMode`](../../../packages/company-pack/src/host/commands/delivery-command.ts#L61-L67) 都是「全文首个匹配行」，不带结构过滤。同一份文件的 `numbering` 走 [`metaFieldLines`](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L396-L403)（`structural` 行 + frontmatter），围栏里的假字段会被跳过。

## 运行面

- **面 = host**：上述三个解析器；对照 [`requirements-check.metaFieldLines`](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L396-L403)。

## 复现

```sh
pnpm exec tsx -e "
const meta = ['\`\`\`','productType: ghost','deliveryMode: ghost-mode','\`\`\`','productType: business-software','deliveryMode: project-services'].join('\n');
console.log('productType ->', /^productType\s*[:：]\s*(.+)$/m.exec(meta)?.[1]);
console.log('deliveryMode ->', /^deliveryMode\s*[:：]\s*(.+)$/m.exec(meta)?.[1]);
"
```

实测 `productType -> ghost`、`deliveryMode -> ghost-mode`：围栏里的示例行胜出，真值被忽略（`req-command.ts:75-90` 与 `delivery-command.ts:61-67` 用的就是这两条正则）。

## 根因与证据

1. 三个字段解析器各自手写正则，没有复用 `metaFieldLines` 的结构过滤（`numbering` 已用上，说明能力存在、只是没推广）。
2. `meta.md` 允许自由文本与注释（模板头注明确「non-field lines are ignored by parsing」），引用模板片段是常见做法。

## 失败类与同类排查

- **失败类**：同一文件内字段解析的结构敏感度不一致（`BUG-370` 的孪生：那边是标量口径，这边是结构口径）。
- **同类排查**：`hasDeclaredDeliveryMode`（`req-command.ts:101-107`）同样用裸正则，随本卡一并修；`parseDeclaredLayers` 见 BUG-374。

## 修复方案与范围

- **根因修法**：抽一个 `metaField(text, name)` helper：先 `metaFieldLines`（结构行）+ `yamlScalarOrProblem`，再按需做占位符（`<…>`）规则；`productType`/`deliveryMode`/`layers`/`numbering`/`hasDeclaredDeliveryMode` 全部改用它。

## 已修判定

- 上述复现下 `productType` 解析出 `business-software`、`deliveryMode` 解析出 `project-services`（围栏内样例被跳过）；
- `numbering` 的既有结构行为不变；`/req check`、`/delivery check`、present 闸门三条路对同一份 meta 的类型/模式判断一致（新增用例，旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/lib/docs/requirements-check.ts`、`packages/company-pack/src/host/commands/req-command.ts`、`packages/company-pack/src/host/commands/delivery-command.ts`、`tests/host/commands/req-command.spec.ts`、`tests/host/commands/delivery-command.spec.ts`
- 红：`pnpm test tests/host/commands/req-command.spec.ts tests/host/commands/delivery-command.spec.ts` —— 还原裸正则前 2 failed（围栏示例 ghost 胜出）
- 绿：`pnpm test tests/host/commands/req-command.spec.ts tests/host/commands/delivery-command.spec.ts` —— 全绿（围栏内示例跳过，真值生效）
- 提交：commit d700c76a
