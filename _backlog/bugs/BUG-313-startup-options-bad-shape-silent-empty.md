---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-313：派生选项文件字段类型写坏，被当成「公司内容里还没有可选项」——不是「读坏了」

> 严重级别：P2（次要偏重：选项文件是 host 派生、人工可改；字段类型坏时面板把「坏文件」说成「内容没有可选项」，用户会去装内容包而不是修文件）｜发现：2026-11-22（E2E 第四轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 8–10 个，别管那边怎么修」）。

## 症状

把 `.dsh-company/startup-options.json` 改成合法 JSON、但字段类型错：

```json
{ "v": 1, "productTypes": "not-an-array", "deliveryModes": [] }
```

刷新后打开「策略」：

- 面板显示 `公司内容里还没有可选项；先装内容包，这里会自动出现。`；
- 两个下拉只剩「自动」；
- 没有「选项文件读坏了」错误行（`optionsProblem` 是 null）。

同样的文件如果是**语法坏**（`{ not json`），面板会正确显示「选项文件读不出来（可能被截断）…」。即：坏 JSON 会报，坏字段类型不报。

## 运行面

- **面 = lib 解析 + client 策略面板**：`packages/company-pack/src/lib/startup/startup-settings.ts` 的 `parseStartupOptionsState`；`startup/StrategyPanel.tsx` 的 `optionsProblem`。
- 数据面 = host 派生的 `startup-options.json`。

## 复现

1. 起隔离实例（先让 host 生成一份正常 options）。
2. 覆盖 `startup-options.json` 为上面的合法 JSON（字段类型错）。
3. 刷新页面，打开「策略」。
4. 实测：`公司内容里还没有可选项`；无错误行。

## 根因与证据

`parseStartupOptionsState` 只校验「能 JSON.parse + 是对象」：

- `startup-settings.ts:251-271`：
  ```ts
  try { raw = JSON.parse(text) } catch { return { problem:'unreadable' } }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return { problem:'unreadable' }
  return { options: { productTypes: cleanList(record.productTypes), ... }, problem: null }
  ```
  `cleanList('not-an-array')` 折成 `[]`；`problem` 仍是 null。
- `StrategyPanel` 的 `nothingToPick` 在 `options.productTypes.length === 0 && deliveryModes.length === 0` 时显示「没有可选项」（`StrategyPanel.tsx:182,200`）。
- 于是「坏文件」与「空内容」共用同一 UI 文案。

## 失败类与同类排查

**失败类 = 解析器只区分语法坏，不区分字段形状坏**（F2 可诊断失败）。同类：

- `parseStartupSettingsState` 同样只校验 `v`，字段类型坏会折成 auto（见 BUG-314）。
- 成品索引有整文件形状检查；台账有坏行（303）；培养记录有坏形状；options 是剩余缺口。
- 不是「内容真的没有可选项」：host 内容里有 `business-software` 等（正常文件可证明）。

## 修复方案与范围

- **根因修法**：`parseStartupOptionsState` 校验 `productTypes`/`deliveryModes` 必须是字符串数组、`wikiCheck` 形状合法；不合法给 `problem:'unreadable'`（或 `'bad-shape'` 新态）而不是 silent `[]`。
- `StrategyPanel` 对 `bad-shape` 显示与「读不出来」同级但可区分的错误行。
- **判据**：字段类型坏 → 错误行；缺字段/空数组 → 合法「没有可选项」；语法坏 → 现有错误行；zh/en 同步。
- **不改**：`cleanList` 对正常单值的容错；host 派生逻辑。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 字段类型坏时面板明确说「选项文件形状不符」，不再说「内容里没有可选项」；
- 真正空内容/缺字段仍说「没有可选项」；
- 语法坏仍说「读不出来」；
- 三种 fixture 各一条断言 + 真页面一条。
