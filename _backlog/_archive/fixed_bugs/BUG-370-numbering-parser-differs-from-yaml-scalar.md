---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-370：`numbering:` 的解析口径与同一份 `meta.md` 的其它字段分叉——合法 YAML 写法被拒，`numbering :` 反而静默豁免整道编号闸门

> 严重级别：P2（双向都错：**误拒**——`numbering: "identity"` / `numbering: identity # 旧动议` 被当成「不在词表」，`/req check` 报错、present 闸门拒绝交付；**误放**——`numbering : identity`（冒号前有空格，YAML 合法）在该解析器里「未声明」，于是被当成旧动议，整道编号/追溯检查被静默跳过）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（declared/valid 三态）
>
> **留痕**：Note [2026-11-24-meta-single-source-and-presence-parity](../../../notes/implemented/2026-11-24-meta-single-source-and-presence-parity.md)（批次 370..376：meta 标量单一来源）

## 症状

[`numberingMarker`](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L408-L418) 用 `/^numbering:\s*(.*)$/` 直接取值，**不经** `yamlScalar`、也不认占位符；而同一个 `meta.md` 里的 `productType` / `deliveryMode` 走 [`yamlScalar`](../../../packages/company-pack/src/lib/docs/yaml-scalar.ts)（引号与行尾 `#` 注释都合法，见 BUG-062/063），`layers` 走 `parseList`：

| 写法 | `numberingMarker` | `productType` 同款解析 |
|---|---|---|
| `identity` | ✅ valid | ✅ |
| `"identity"` | ❌ 值 = `"identity"` → 不在词表 | ✅ |
| `'identity'` | ❌ 值 = `'identity'` | ✅ |
| `identity # 旧动议` | ❌ 值带注释 | ✅（去注释） |
| `<identity (write it …)>`（模板原样） | ❌ 不在词表 | 视为未声明（占位符规则） |
| `numbering : identity` | ❌ **declared:false** → 旧动议豁免 | ✅ |

后两种是**反方向**的错误：前者把「模板占位符」判成非法（本该等于未声明），后者把「合法声明」判成未声明，从而在 [`prd-gate.gateToolCall`](../../../packages/company-pack/src/host/commands/prd-gate.ts#L205-L212) 与 `checkRequirements` 两条路上都**跳过**编号检查（fail-open）。

## 运行面

- **面 = lib + host**：[`requirements-check.ts`](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L395-L418)、[`prd-gate.ts`](../../../packages/company-pack/src/host/commands/prd-gate.ts#L205-L212)、[`req-command.ts`](../../../packages/company-pack/src/host/commands/req-command.ts)（经 `metaLayers`）。

## 复现

```sh
pnpm exec tsx -e "
import { numberingMarker } from './packages/company-pack/src/lib/docs/requirements-check.ts';
for (const meta of ['numbering: identity', 'numbering: \"identity\"', \"numbering: 'identity'\", 'numbering: identity # 旧', 'numbering : identity', 'numbering: <identity (write it …)>']) console.log(JSON.stringify(meta), JSON.stringify(numberingMarker(meta)));
"
```

实测：`numbering: "identity"` → `{"declared":true,"value":"\"identity\"","valid":false}`；`numbering : identity` → `{"declared":false,...}`（= 旧动议豁免）。

## 根因与证据

1. `meta.md` 的字段解析有三套口径：`yamlScalar`（productType/deliveryMode）、`parseList`（layers）、裸正则（numbering）。三套对引号/注释/空格/占位符的宽容度不同。
2. `numberingMarker` 的「未声明」语义本来只该表达「整行不存在」，却把「行存在但写法不在词表」的一部分也折进未声明（`numbering :`），于是豁免面扩大。
3. 模板 [`content/templates/meta.md`](../../../packages/company-pack/content/templates/meta.md) 给的 `numbering: <identity …>` 占位符在 `numberingMarker` 里落成 `valid:false`，而 `cleanScalar`/`yamlScalar` 的占位符规则（`<…>` = 未设置）没有在这里生效。

## 失败类与同类排查

- **失败类**：同一文件的同一族字段各写一套标量解析（`BUG-062/063` 的回潮，落点是新加的 `numbering`）。
- **同类排查**：`layers:` 在 `requirements-check` 走 `parseList`（认 `[…]`），但 `req-command.parseDeclaredLayers` 另写一份（见 BUG-374）；`productType`/`deliveryMode` 的围栏不感知见 BUG-375。

## 修复方案与范围

- **根因修法**：`numberingMarker` 改为「结构行 + `yamlScalarOrProblem` + 占位符规则」：`<…>` → 未声明；引号/注释按标量解；`bad scalar` → 明确报「写法非法」而不是折成未声明；`^numbering\s*:` 允许冒号前空白。与 `parseProductType`/`parseDeliveryMode`/`parseDeclaredLayers` 收进同一 helper。

## 已修判定

- `numbering: "identity"`、`numbering: identity # 旧`、`numbering : identity` 三种写法都得到 `declared:true, valid:true`；`numbering: <identity …>` 得到 `declared:false`（= 未声明，不报错）；
- `numbering: ghost` 仍 `valid:false` 且 `/req check` 与 present 闸门都拦；
- `tests/lib/docs/requirements-check.spec.ts` 增加上述六种写法的表驱动断言（旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/lib/docs/requirements-check.ts`、`packages/company-pack/src/host/commands/req-command.ts`、`tests/lib/docs/requirements-check.spec.ts`
- 红：`pnpm test tests/lib/docs/requirements-check.spec.ts` —— 还原前 5 failed（引号/注释/冒号空格/占位符写法）
- 绿：`pnpm test tests/lib/docs/requirements-check.spec.ts` —— 全绿（六种写法；ghost 仍 invalid）
- 提交：commit d700c76a
