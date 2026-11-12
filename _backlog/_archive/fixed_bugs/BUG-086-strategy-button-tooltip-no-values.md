---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-086：策略按钮 tooltip 不列生效值；多字段/长 wiki 时 label 被截断，用户无法从 tooltip 补全

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A2 / H2）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

归档验收 A2 写：「把『做什么』设为某类型后，重新开面板前按钮即显示该值（或『策略：已设 N 项』），**tooltip 列出生效值**」。

实测（2026-11-12，隔离 zh 实例，seed `productType=business-software`）：

```html
<button class="wk-strategy-button" data-overridden="true"
        title="点开调整这个项目的套路（下一轮生效）">
  策略：business-software
</button>
```

- `title` 是固定句，**不含任何生效值**；全自动态是另一句固定句（`title="现在是全自动：不约束模型，让它自己判断"`）。
- 多字段时 label = `values.join(' · ')`，只按 `STARTUP_FIELDS` 顺序拼值，不带字段名；wiki 是路径，会被 CSS `text-overflow: ellipsis` 截断（`src/client/ui/styles.ts:820`）。
- 结果：用户看到 `策略：business-software · project-services · /Users/…` 截断后，hover 也拿不到完整值/字段归属。

## 根因（假设）

`StrategyButton` 只计算了一个固定 tooltip key：

```ts
const tooltip = face.loaded && overrides.length === 0
  ? props.t('strategy.button.tooltip.auto')
  : props.t('strategy.button.tooltip')
```

`src/client/startup/StrategyButton.tsx:50-52`；`strategy.button.tooltip` 的 zh/en 值都是通用句（`src/client/locales.ts:320,634`），没有把 `overrides` 拼进去。A2 的「tooltip 列出生效值」没有被实现，验收时也没有真页面断言 tooltip 内容。

## 暴露的失败类

**验收写了行为，测试只测了「有值」**：`strategy-button.spec.ts` 断言 label 含值、`data-overridden` 正确，但没有断言 `title` 含值；真页面探针只断言按钮在场。最终用户体验（hover 补全）落在两层测试之间。

## 复现

1. 隔离 zh 实例（本次 `runtime/tmp/ui-scene-nxXILe`）。
2. seed `startup.json` = `{productType:'business-software', deliveryMode:null, wiki:null}`。
3. cdp-probe `--steps`：点「待办」→ `waitText 策略：business-software`；`--html-out`。
4. 读 `button.wk-strategy-button` 的 `title` → `点开调整这个项目的套路（下一轮生效）`，无值。
5. 再设 `wiki='/very/long/.../wiki'` 与 `deliveryMode`，label 被 ellipsis 截断；tooltip 仍无值。

证据：`runtime/tmp/button-html.html`（gitignored）、`runtime/harness-home/diagnosis/cdp-probe-2026-11-12T12-58-31-802Z/`。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- `title` 由 `overriddenEntries` 生成多行：`策略：自动` 或 `产品类型：…\n交付模式：…\nwiki：…`；无覆盖时保留现有 auto 句。
- 保持 `strategy.button.tooltip` 作为「点开调整」的引导句，可追加在值列表后；不要把值塞进 label。
- 补 spec：有覆盖时 `title` 含每个已设字段的 label + 值；全自动时 `title` 等于 auto 句；en 同款。
- 真页面探针增加 `title` 断言（或 cdp-probe 的 `--title-out`），避免再次只测「按钮在场」。

## 修复关联

- 发现于 A2；与 H2 一致。
- 验收原文：[归档卡](../settled_issues/2026-11-12-startup-settings-landing.md) A2。
- 本卡不修；改 UI 文案/组件属材料性，按章程请示。

## 已修判定

修成：策略按钮的 `title` 在有多项覆盖时逐字段列「字段名: 值」（含长 wiki 路径），label 被 ellipsis 截断后可从 hover 补全；全自动仍是固定句，未读盘仍是中性引导句。

- keyless：静态渲染断言 title 含「做什么: …」「怎么交付: …」「参考资料（wiki）: …」；全自动 title 含「现在是全自动」且不塞空值。
- 红证：tooltip 还原成固定句 → 1 failed；复原 6 passed。
