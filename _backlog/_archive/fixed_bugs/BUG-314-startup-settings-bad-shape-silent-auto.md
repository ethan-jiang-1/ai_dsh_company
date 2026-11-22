---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-314：startup.json 字段类型坏（数组/对象/数字）被折成「全自动」——诊断器只查了 `v`

> 严重级别：P2（次要偏重：设置文件是项目策略的唯一持久载体；字段类型坏时面板显示 auto，用户不知道设置已失效）｜发现：2026-11-22（E2E 第四轮）｜状态：已修｜审查：agent — 逐条核对已修判定（字段名点名 + null/缺省不误报）
>
> **留痕**：commit c94655f1（与 314/313 同批：配置诊断 + 面板文案，材料性；批次 Note 覆盖）。

## 症状

把 `.dsh-company/startup.json` 改成合法 JSON、`v:1` 正确，但字段类型错：

```json
{ "v": 1, "productType": [], "deliveryMode": 42, "wiki": {} }
```

刷新后打开「策略」：

- 三个下拉全部「自动」；
- 输入框空；
- **没有**损坏/形状错误提示（`settingsProblem` 是 null）。

对比：坏 JSON（`{ this is not json`）会显示「策略文件损坏」；缺字段/空文件是合法 auto。即：坏 JSON 报，坏字段类型不报。

## 运行面

- **面 = lib 解析 + client 策略面板**：`packages/company-pack/src/lib/startup/startup-settings.ts` 的 `parseStartupSettingsState`；`startup-load.ts`；`StrategyPanel.tsx`。
- 数据面 = `startup.json`（人工可改）。

## 复现

1. 起隔离实例，先设一个 `productType` 确认正常。
2. 覆盖 `startup.json` 为上面的合法 JSON（字段类型错）。
3. 刷新，打开「策略」。
4. 实测：全部「自动」，无错误行。

## 根因与证据

`parseStartupSettingsState` 只校验 `v`：

- `startup-settings.ts:193-216`
  ```ts
  if (record.v !== 1) return { problem: ... }
  return {
    settings: { v:1, productType: cleanScalar(record.productType), ... },
    problem: null,
  }
  ```
  `cleanScalar([])` / `cleanScalar(42)` / `cleanScalar({})` 折成 `null`；`problem` 仍是 null。
- `cleanScalar` 是「取字符串，否则 null」的宽松转换；适合容错，但不适合诊断。
- `StrategyPanel` 只在 `settingsProblem` 非 null 时显示错误行（`StrategyPanel.tsx:197-199`）；这里拿不到。

## 失败类与同类排查

**失败类 = 宽松解析吞掉字段形状坏（诊断器只查版本字段）**。同类：

- `parseStartupOptionsState` 同样只查 JSON 对象，字段类型坏折空（BUG-313）。
- `parseCatalog`/`parseMotionLedger` 的坏形状已有行级/文件级诊断；startup 设置这一面没有。
- 不是「文件缺失/空」：缺失/空仍是合法 auto；本卡的输入是非空、v 正确但字段类型坏。

## 修复方案与范围

- **根因修法**：`parseStartupSettingsState` 对三个字段做类型校验：允许 `null` 或 `string`；其它类型（数组/对象/数字/布尔）记 `problem:'corrupt'`（或 `'bad-shape'`），`settings` 仍给 auto 供面板渲染。
- `StrategyPanel` 按 `settingsProblem` 显示错误行；文案区分「损坏/形状不符」。
- **判据**：字段类型坏 → 错误行 + auto 值；字段缺失/空 → 合法 auto；坏 JSON → 现有损坏；未来 v → unsupported；zh/en 同步。
- **不改**：`cleanScalar` 的宽松语义（host/旧调用方）；`startup.json` 写入格式。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 字段类型坏（数组/对象/数字）时面板明确说「策略文件形状不符」，不再冒充 auto；
- 缺失/空文件仍是合法 auto；
- 坏 JSON 仍是「损坏」；未来 schema 仍是「不支持」；
- 四种 fixture 各一条 + 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/lib/startup/startup-settings.ts`（两个解析器增字段检查 + `field`）、`packages/company-pack/src/client/startup/{startup-store,startup-load,StrategyPanel}.ts(x)`、`packages/company-pack/src/client/locales.ts`
- 红：`vitest run tests/client/startup/startup-load.spec.ts tests/lib/startup/startup-settings.spec.ts` —— 去掉字段检查（只查 `v`）后「字段类型坏」用例失败 —— 去掉字段检查（只查 `v`）后「字段类型坏」用例失败（折成 null/空集合、无字段名）
- 绿：`vitest run tests/client/startup/startup-load.spec.ts tests/lib/startup/startup-settings.spec.ts` —— 28/28 + 10/10（三个字段各自分支、options 双字段、null/缺省不误报、面板点名 `productType`）
- 提交：commit c94655f1
