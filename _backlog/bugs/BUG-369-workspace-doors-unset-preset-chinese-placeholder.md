---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-369：`workspace_doors` 把「没选 preset」写成中文字面量 `(未选 preset)`，模型看到中文且与同名字面 preset 不可区分

> 严重级别：P2·低影响（机器可见面口径：`doorsFromSessions` 用**展示用中文串**当 preset 值，直接进 `workspace_doors` 工具的 JSON 输出——模型在英文任务里读到中文字段值；同时该值把「未设置」编码成一个合法字符串，无法与真的名叫 `(未选 preset)` 的 preset 区分）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

[`doorsFromSessions`](../../packages/company-pack/src/lib/presence/doors.ts#L47-L50)：

```ts
const preset = fact.agentPreset !== undefined && fact.agentPreset !== '' ? fact.agentPreset : '(未选 preset)'
```

`workspace_doors` 工具逐行输出 `preset`（[`workspace-doors.ts`](../../packages/company-pack/src/host/workspace/workspace-doors.ts#L74-L85)），所以模型拿到的是 `{"preset":"(未选 preset)","sessionCount":1,…}`——中文常量进了机器可见载荷；且三种不同输入（缺字段、空串、真叫这个名字的 preset）折叠成同一个值。

## 运行面

- **面 = lib + host**：[`packages/company-pack/src/lib/presence/doors.ts`](../../packages/company-pack/src/lib/presence/doors.ts#L47-L50)、[`packages/company-pack/src/host/workspace/workspace-doors.ts`](../../packages/company-pack/src/host/workspace/workspace-doors.ts#L52-L90)。

## 复现

```sh
pnpm exec tsx -e "
import { doorsFromSessions } from './packages/company-pack/src/lib/presence/doors.ts';
const f = (preset) => [{ sessionId:'a', cwd:'/w', agentPreset: preset, running:false }];
for (const p of [undefined, '', '(未选 preset)']) console.log(JSON.stringify(p), '->', JSON.stringify(doorsFromSessions(f(p)).rows[0].preset));
"
```

三行输出全为 `"(未选 preset)"`。

## 根因与证据

1. 读模型把「无值」编码成展示串，而不是结构化的 `null`/缺字段；展示串又恰好是中文（`lib` 侧不该产出人类语言文案——同族见 `BUG-354`/`BUG-358`）。
2. 工具输出的 schema 里 `preset` 是 `required: true` 的 `string`，所以实现方「不得不」给个字符串——根因是 schema 与数据模型没有表达 `null`。

## 失败类与同类排查

- **失败类**：用展示文案代替缺失值（`BUG-354` 的 `未分配`、`BUG-358` 的 `UNASSIGNED_LABEL` 同一族，落点是**工具输出**）。
- **同类排查**：`board.ts` 的 `ownerLabel` 已改 `string | null`（BUG-358 修复），可作为同款改法参照；`presence.ts` 的 `statusLabel` 也返回中文标量，但只有 client 消费（未进工具输出），单独核对后另计。

## 修复方案与范围

- **根因修法**：`DoorRow.preset` 改为 `string | null`（`null` = 未设），工具输出的 schema 允许 `preset: { type: ['string','null'] }` 或直接省略该键；需要人话时由 client 字典给 `doors.noPreset`。

## 已修判定

- 缺 preset / 空串两种输入下 `workspace_doors` 的输出不再含中文，且能区分「未设置」（`null`/缺键）与「真叫这个名字的 preset」；`pnpm exec tsx` 复现三行结果不再折叠成同一值。
