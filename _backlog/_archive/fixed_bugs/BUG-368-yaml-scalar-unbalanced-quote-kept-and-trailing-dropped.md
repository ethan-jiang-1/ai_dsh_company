---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-368：`yamlScalar` 对不成对引号把引号当内容返回，品牌名会带上一个 `'`；带尾巴的引号值又被静默截断

> 严重级别：P2·低影响（解析口径：`yamlScalar` 是 `company.md` / `meta.md` / `startup` 等字段的共用标量解析器。引号没闭合时它退化成「去注释」，把起始引号留在值里（品牌名变成 `'Acme AI`）；引号闭合但有尾巴时（`'a' trailing`）又把尾巴静默丢掉——两种都是「坏 YAML 被当成好值」）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（坏引号不折成好值）
>
> **留痕**：Note [2026-11-24-boundary-window-and-bad-shape-batch](../../../notes/implemented/2026-11-24-boundary-window-and-bad-shape-batch.md)（批次 360..369）

## 症状

[`yamlScalar`](../../../packages/company-pack/src/lib/docs/yaml-scalar.ts#L9-L17)：

```ts
const quote = value[0]
if (quote === '"' || quote === "'") {
  const end = value.indexOf(quote, 1)
  if (end !== -1) return value.slice(1, end)
}
const comment = value.indexOf(' #')
return (comment === -1 ? value : value.slice(0, comment)).trim()
```

- 引号未闭合（`'abc`）⇒ `end === -1` ⇒ 落到注释分支 ⇒ 返回**含引号**的 `'abc`；
- 引号闭合但有尾巴（`'a' trailing`）⇒ 返回 `a`，尾巴被静默丢弃（真 YAML 里这是语法错误）。

## 运行面

- **面 = lib**：[`packages/company-pack/src/lib/docs/yaml-scalar.ts`](../../../packages/company-pack/src/lib/docs/yaml-scalar.ts#L9-L17)；消费方 [`company-identity.parseCompanyIdentity`](../../../packages/company-pack/src/client/data/company-identity.ts#L60-L76)（侧栏品牌）、`bootstrap`、`req-command` 的 `productType`。

## 复现

```sh
pnpm exec tsx -e "
import { yamlScalar } from './packages/company-pack/src/lib/docs/yaml-scalar.ts';
import { parseCompanyIdentity } from './packages/company-pack/src/client/data/company-identity.ts';
console.log(JSON.stringify(yamlScalar(\"'abc\")), JSON.stringify(yamlScalar(\"'a' trailing\")));
const id = parseCompanyIdentity(['---','company: Acme',\"productName: 'Acme AI\",'---',''].join('\n'));
console.log('brand =', JSON.stringify(id?.productName));
"
```

实测 `"'abc"`、`"a"`、`brand = "'Acme AI"`——侧栏品牌会渲染出一个多余的起始单引号。

## 根因与证据

1. 引号分支只判「有没有闭合」，没有「闭合后是否还有非注释内容」的校验；失败时又**回落到非引号分支**，于是坏输入变成了「带引号的正常值」。
2. 同一函数被多处当作「已经解好引号」的权威值使用（`BUG-341` 修的正是「没复用本函数」），所以它自身的坏输入行为会被放大到品牌/产品类型上。

## 失败类与同类排查

- **失败类**：宽容解析器在语法错误上静默产出可疑值（`BUG-339` 同族，落点是 YAML 标量层）。
- **同类排查**：`parseStartupSettings` 的 `cleanScalar` 只做 trim/占位符，不碰引号（JSON 源，无此问题）；`parseMeta` 不剥引号（`meta.md` 用裸值约定）——本函数是唯一入口，改它影响全部消费方，须同时核 `yamlScalar` 用例。

## 修复方案与范围

- **根因修法**：引号分支在找不到闭合引号时返回原文并**标记不合法**（或抛给调用方按「坏形状」处理）；闭合后有尾巴时同样视为坏形状，不要静默截断。若保持单返回值签名，至少把「未闭合」的情况原样保留但由调用方判 `startsWith(quote)` 拒绝——更干净的是加一个 `yamlScalarOrProblem()` 的结构化版本，旧函数委托给它。

## 已修判定

- `yamlScalar("'abc")` 不再被当成已解引号的值（要么返回 `'abc` 但由结构化版本报 problem，要么按坏值处理）；`'a' trailing` 不再静默返回 `a`；
- `parseCompanyIdentity` 对未闭合引号返回 `null`（身份无效、保留出厂词标），不产出带引号的品牌名。

## 修复证据

- 改动面：`packages/company-pack/src/lib/docs/yaml-scalar.ts`、`packages/company-pack/src/client/data/company-identity.ts`、`tests/lib/docs/yaml-scalar.spec.ts`、`tests/client/ui/brand.spec.ts`
- 红：`pnpm test tests/lib/docs/yaml-scalar.spec.ts tests/client/ui/brand.spec.ts` —— 还原前 3 failed（未闭合引号被当值、带尾巴被静默截断、品牌带引号）
- 绿：`pnpm test tests/lib/docs/yaml-scalar.spec.ts tests/client/ui/brand.spec.ts` —— 全绿（problem 结构化；身份文件返回 null，出厂词标保留）
- 提交：commit 5d877e75
