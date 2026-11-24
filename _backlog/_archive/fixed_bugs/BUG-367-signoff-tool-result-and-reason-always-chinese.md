---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-367：`request_signoff` 的模型侧回执与人侧审批理由恒为中文，`en` 公司不随语言

> 严重级别：P2（语言口径：签核工具的结果提示语走 [`signoffDecisionNote`](../../../packages/company-pack/src/lib/accounting/signoff.ts#L30-L36) 的四个中文字面量，审批请求 `reason` 也由 [`signoffReason`](../../../packages/company-pack/src/lib/accounting/signoff.ts#L23-L27) 拼成全角 `：`/`（）`——英文公司的模型会拿到中文工具结果、审批面板里也会显示中文标点的理由。`BUG-338` 扫的是**命令面**，工具面漏在清单外）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（en 工具回执/理由/诊断命令零中文；zh 不变）
>
> **留痕**：Note [2026-11-24-boundary-window-and-bad-shape-batch](../../../notes/implemented/2026-11-24-boundary-window-and-bad-shape-batch.md)（批次 360..369：工具面语言注入）

## 症状

1. **模型侧**：`request_signoff` 的 `output.render` 把 `{ decision, note }` 原样 JSON 化；`note` 四分支全是中文，与同一工具的英文 `description`（`Request human sign-off for a company sign-line…`）不一致。
2. **人侧**：官方 `ui-approval` 面板显示的 `reason` 是 `毛利线双签：本月折扣 7.8 折（考虑过 8 折…）` 形态——分隔符 `：` 与括号 `（）` 是中文全角，英文语境下同样出现。
3. 无 `agent` 时的兜底 `审批请求需要发起会话（agent）上下文。` 也是中文常量。
4. **同族第二个落点**：`/company-diagnostics`（[`client-diagnostics.ts`](../../../packages/company-pack/src/host/commands/client-diagnostics.ts#L37-L40)）的 `description`、用法错误、载荷错误、写入失败与成功回执全是中文字面量，且直接用 `ctx.commands.register`（没有走 `registerLocalizedCommand`）——`BUG-338` 收口五个命令时把这条诊断命令漏在清单外。

## 运行面

- **面 = lib + host**：[`packages/company-pack/src/lib/accounting/signoff.ts`](../../../packages/company-pack/src/lib/accounting/signoff.ts#L23-L36)、[`packages/company-pack/src/host/commands/signoff-tool.ts`](../../../packages/company-pack/src/host/commands/signoff-tool.ts#L22-L61)。

## 复现

```sh
pnpm exec tsx -e "
import { signoffDecisionNote, signoffReason } from './packages/company-pack/src/lib/accounting/signoff.ts';
for (const d of ['allowed-once','rejected','cancelled','timeout']) console.log(d, '->', signoffDecisionNote(d));
console.log(signoffReason({ line: 'Margin line', summary: 'discount 22%', detail: 'also considered 20%' }));
"
```

实测四行回执全为中文，`reason` 为 `Margin line：discount 22%（also considered 20%）`——英文入参被套上中文全角分隔符。

## 根因与证据

1. `lib/accounting/signoff.ts` 直接返回中文字面量，没有 `text(zh, en)` 注入面；host 注册处也没有传语言状态（对比 `registerCultivation`/`registerSettingsCommand` 已接 `CompanyLanguageState`）。
2. `BUG-338` 的清单只列了五个斜杠命令与 `contextSummary`，工具面（`request_signoff`）与审批 `reason` 不在其中，所以两轮双语收口都没覆盖到。

## 失败类与同类排查

- **失败类**：模型可见/人可见文案住在 `lib`/`host` 且没有语言注入面（`BUG-316/326/338` 同族，**工具面 + 诊断命令**两个落点）。
- **同类排查**：同包其它工具面——`workspace_doors`（描述英文、输出为 JSON 结构值，无长文案）、`list_subagents`/`send_message` 等继承 vendor；`cultivation` 工具已接 `t(zh, en)`（BUG-338 阶段一）。

## 修复方案与范围

- **根因修法**：`signoffDecisionNote` 与 `signoffReason` 改成成对返回（`{ zh, en }`）或接受 `text(zh, en)` 注入；`registerSignoffTool` 按当前公司语言取值，并在语言切换时用既有 `registerLocalizedCommand` 同款订阅重注册（工具描述是注册期字符串）。

## 已修判定

- `en` 语言下 `request_signoff` 的 `note` 四个分支均为英文、`reason` 用 ASCII 分隔符（`: ` 与括号）；`zh` 行为不变；用例对两种语言各断言一次，旧实现红、新实现绿；
- `en` 语言下 `/company-diagnostics` 的 `description`、用法/载荷/写入失败/成功回执全为英文（中文零残留），且它在语言切换时会重注册。

## 修复证据

- 改动面：`packages/company-pack/src/lib/accounting/signoff.ts`、`packages/company-pack/src/host/commands/signoff-tool.ts`、`packages/company-pack/src/host/commands/client-diagnostics.ts`、`packages/company-pack/src/index.ts`、`tests/lib/accounting/signoff.spec.ts`、`tests/host/commands/signoff-language.spec.ts`、`tests/host/commands/command-language.spec.ts`
- 红：`pnpm test tests/lib/accounting/signoff.spec.ts tests/host/commands/signoff-language.spec.ts tests/host/commands/command-language.spec.ts` —— 还原语言注入前 4 failed（en 回执/理由/诊断命令仍中文）
- 绿：`pnpm test tests/lib/accounting/signoff.spec.ts tests/host/commands/signoff-language.spec.ts tests/host/commands/command-language.spec.ts` —— 10/10 passed（en 四结局与 reason 全 ASCII；诊断描述/用法英文；zh 行为不变）
- 提交：commit fe4ffe2e
