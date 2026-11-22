---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-301：策略面板的 wiki 输入框是非受控的——「恢复自动」后仍显示旧值，点一下再失焦又把旧值写回去

> 严重级别：P2（次要偏重：重置看起来生效、盘上也确实清空，但输入框显示旧指针；用户再点一下输入框（哪怕不改字）失焦，旧值会被重新保存）｜发现：2026-11-22（E2E 第三轮）｜状态：已修｜审查：agent — 逐条核对已修判定（重置清空 / 同值失焦零写入 / 改字写入）
>
> **留痕**：commit 40be5b63（client 公开交互 + 会写盘的 bug，材料性；批次 Note 覆盖）。

## 症状

隔离实例，工作区里有 `wiki/index.md`：

1. 打开「策略」，在 wiki 输入框填 `wiki`，回车/失焦 → 盘上 `startup.json` 写入 `wiki: "wiki"`，输入框显示 `wiki`。
2. 点「恢复自动」→ 盘上 `startup.json` 变成 `wiki: null`，但**输入框仍显示 `wiki`**。
3. 再点一下这个输入框（不修改文字）然后 Tab 失焦 → 盘上 `startup.json` 又变回 `wiki: "wiki"`。

即：重置在 UI 上没有完成；而且「碰一下旧输入框」会撤销重置。用户会以为 wiki 已恢复自动，实际下一轮又按旧 wiki 跑。

本轮实测（当前 HEAD）：

```
after set wiki: {"wiki":"wiki"} input=wiki
after reset:    {"wiki":null}   input=wiki
after stale-input blur: {"wiki":"wiki"} input=wiki
```

## 运行面

- **面 = client**：`packages/company-pack/src/client/startup/StrategyPanel.tsx` 的 `StrategyRow`（wiki 分支）与「恢复自动」按钮。
- 数据面 = `startupStore` 的 settings / `startup.json`。

## 复现

1. 隔离 company profile + 临时 workspace，起真实例。
2. 工作区建 `wiki/index.md`；打开「策略」，在 wiki 输入框填 `wiki` 并回车。
3. 点「恢复自动」；确认 `.dsh-company/startup.json` 的 `wiki` 是 null，但输入框仍显示 `wiki`。
4. 点输入框再 Tab 失焦；确认 `startup.json` 的 `wiki` 又变成 `wiki`。

## 根因与证据

- 输入框是非受控的：`StrategyPanel.tsx:102-113`
  ```tsx
  <input className="wk-strategy-input" defaultValue={row.value ?? ''}
    onBlur={event => {
      const next = event.currentTarget.value.trim()
      if ((next === '' ? null : next) === row.value) return
      onWiki(next === '' ? null : next)
    }} ...
  ```
  `defaultValue` 只在挂载时生效；`row.value` 从 `"wiki"` 变 `null` 时 React 不会更新 DOM 输入框，所以视觉上仍是 `wiki`。
- `onBlur` 用 `row.value` 判断「有没有改」；重置后 `row.value === null`，而 DOM 里还是 `wiki`，于是 `(next === null ? null : next) === row.value` 为 false，触发一次 `onWiki("wiki")`——**旧值被当成用户的新输入重新保存**。
- 「恢复自动」按钮只调用 `reset`（`StrategyPanel.tsx:216-224` 附近），没有清空/重建输入框。

## 失败类与同类排查

**失败类 = 非受控输入 + 重置语义不完整**。同类：

- 产品类型/交付模式是 `<select value={...}>`（受控），重置后正确回到「自动」；只有 wiki 这个自由输入框是非受控的。
- 其他「外部值变化后输入框要跟着变」的面：`CultivationCompose` 的 `targetRole/work/expectation/body` 都是受控 state；`StrategyPanel` 的 wiki 是唯一 `defaultValue`。
- 不是 host 写盘问题：盘上 `wiki:null` 已正确写入；问题在 UI 的显示与 blur 判断。

## 修复方案与范围

- **根因修法**：wiki 输入改成受控（`value` + `onChange` 草稿 + 失焦提交），或在 `row.value` 变化时用 `key`/effect 显式把 DOM 值同步到当前值；重置/外部 reload 后输入框必须是空。
- `onBlur` 的「有没有改」应比较**提交前的草稿**与当前值，而不是拿可能过期的 DOM 值去和 `row.value` 比。
- **判据**：keyless 两态（设置 → 重置后 input 为空；重置后 focus/blur 不产生 save 命令）+ 真页面复核；`startup.json` 与输入框同帧一致。
- **不改**：`/company-settings reset` 的 host 语义；其它两个受控下拉。
- **材料性**：client 公开交互；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 设 wiki → 点「恢复自动」：盘上 null、输入框空、无 pending save；
- 重置后点输入框再失焦：不再写回旧值；
- 外部 reload 使 row.value 变化时，输入框显示当前值而不是上次的 DOM 值；
- keyless 两态 + 真页面复核各绿。

## 修复证据

- 改动面：`packages/company-pack/src/client/startup/StrategyPanel.tsx`（wiki 输入改受控 + 外部值同步）、`tests/client/startup/strategy-panel-input.spec.ts`（新）
- 红：`vitest run tests/client/startup/strategy-panel-input.spec.ts` —— 换回 `defaultValue`（非受控）后「store 重置为 null 后输入框清空」失败（输入框仍 `wiki`）；同条件「同值失焦不写回」在旧实现里会把 `wiki` 写回
- 绿：`vitest run tests/client/startup/strategy-panel-input.spec.ts` —— 3/3（重置后清空、同值失焦零写入、改字失焦写入 `wiki`）
- 提交：commit 40be5b63
