---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-374：`req-command.parseDeclaredLayers` 不认 `[…]` 与引号，`layers: [MRD, SyRS]` 会让「产品类型不支持该层」的提醒静默失效

> 严重级别：P2（提醒静默失效：`/req check` 有一处专门比对「动议声明的层」与「产品类型支持的层」，但声明是用一条**独立**的正则拆分器读的——写成 YAML 序列 `[MRD, SyRS]` 或加引号时，拆分结果里带 `[`/`"`，`isLayer` 全部过滤掉，于是「不支持层」既不提醒也不报错；而同一份 `meta.md` 的层范围在 `checkRequirements` 里用的是 `parseList`（认方括号），两处对同一个 `layers:` 行得出不同集合）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（与 parseList 同集合）
>
> **留痕**：Note [2026-11-24-meta-single-source-and-presence-parity](../../../notes/implemented/2026-11-24-meta-single-source-and-presence-parity.md)（批次 370..376：layers 列表同口径）

## 症状

[`parseDeclaredLayers`](../../../packages/company-pack/src/host/commands/req-command.ts#L92-L98)：

```ts
const match = /^layers:\s*(.*)$/m.exec(text)
return (match[1] ?? '').split(/[,，、;；\s]+/).map(item => item.trim()).filter(item => item !== '')
```

方括号与引号没有剥离，随后 [`req-command.ts:287`](../../../packages/company-pack/src/host/commands/req-command.ts#L285-L292) 用 `.filter(isLayer)` 过滤：

```ts
const unsupported = parseDeclaredLayers(metaText).filter(isLayer).filter(layer => !allowed.has(layer))
```

`[MRD` / `SyRS]` / `"MRD` 都不是层名 → `unsupported` 为空 → 「产品类型不支持该层」的提醒整段消失。`checkRequirements` 内部用 [`metaLayers`→`parseList`](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L436-L455)（认方括号），所以同一行在两处得到不同集合。

## 运行面

- **面 = host**：[`req-command.ts`](../../../packages/company-pack/src/host/commands/req-command.ts#L92-L98) 与 [第 285-292 行](../../../packages/company-pack/src/host/commands/req-command.ts#L285-L292)；对照 [`requirements-check.ts`](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L436-L455)。

## 复现

```sh
pnpm exec tsx -e "
const split = (line) => line.split(/[,，、;；\s]+/).map(s => s.trim()).filter(s => s !== '');
const LAYERS = ['MRD','StRS','PRD','SyRS','IRS'];
for (const v of ['MRD, SyRS', '[MRD, SyRS]', '\"MRD, SyRS\"']) {
  console.log(JSON.stringify(v), '-> kept', JSON.stringify(split(v).filter(x => LAYERS.includes(x))));
}
"
```

实测 `"MRD, SyRS"` → `["MRD","SyRS"]`（提醒正常），`"[MRD, SyRS]"` → `[]`，`"\"MRD, SyRS\""` → `[]`（两种合法 YAML 写法都让提醒消失）。

## 根因与证据

1. `meta.md` 的同一个 `layers:` 行有两份解析器：命令侧 `parseDeclaredLayers`（裸正则 + 空白/逗号拆分），库侧 `parseList`（剥方括号、去引号）。
2. 提醒用的是命令侧那份，且过滤后「空集合」与「没声明」不可区分——静默。

## 失败类与同类排查

- **失败类**：同一字段两份解析器，宽的那份只用于“提醒”，于是它失效时没有任何信号（与 `BUG-370` 同族）。
- **同类排查**：`numbering` 的解析分叉见 BUG-370；`productType`/`deliveryMode` 的围栏不感知见 BUG-375；`metaLayers` 自身在全部未知层时会回落到默认层（`DEFAULT_LAYERS`），但那条有对应错误，属于有信号的一侧。

## 修复方案与范围

- **根因修法**：`parseDeclaredLayers` 改为调用库侧 `parseList`/`metaLayers` 的同一实现（或 `yamlScalarOrProblem` 后剥方括号），确保 `/req check` 与 `checkRequirements` 对同一个 `layers:` 行得出同一集合。

## 已修判定

- `layers: [MRD, SyRS]` 与 `layers: "MRD, SyRS"` 在 `/req check` 里都触发「产品类型不支持 SyRS」的同一条提醒；
- 三种写法下 `parseDeclaredLayers` 与 `metaLayers` 的集合相等（新增表驱动用例，旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/lib/docs/requirements-check.ts`、`packages/company-pack/src/host/commands/req-command.ts`、`tests/host/commands/req-command.spec.ts`
- 红：`pnpm test tests/host/commands/req-command.spec.ts` —— 还原裸拆分前 1 failed（`[MRD, SyRS]` 不触发不支持层提醒）
- 绿：`pnpm test tests/host/commands/req-command.spec.ts` —— 全绿（方括号/引号两种写法都报 SyRS 不支持）
- 提交：commit d700c76a
- 复审修正：commit 裸值 `MRD SyRS` / `MRD;SyRS` 仍拆分（方括号/引号走 parseList）
