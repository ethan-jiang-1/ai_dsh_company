---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-333：`TeamToolCard` 英文模式下 `team_task_create` 带 `blocked_by` 仍渲染中文「依赖 t1、t2」（`BUG-329` 漏网）

> 严重级别：P2（表达层：`BUG-329` 在 `TeamToolCard` 的修法未闭合，`en` 对话流工具卡直接显示中文与中文顿号 `、`）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；触及 `client` 表达层，届时按材料性裁决）

## 症状

在英文界面下，当模型调用 `team_task_create` 且参数带 `blocked_by`（如 `['t1', 't2']`）时，[`TeamToolCard`](../../packages/company-pack/src/client/ui/TeamToolCard.tsx#L141-L170) 的卡片抬头与状态是英文（`Create task · Design API` / `Running…`），但紧接着的依赖明细行仍渲染成中文与中文顿号：

```html
<div class="wk-delegation-title">依赖 t1、t2</div>
```

## 运行面

- **面 = client UI**：[`packages/company-pack/src/client/ui/TeamToolCard.tsx`](../../packages/company-pack/src/client/ui/TeamToolCard.tsx#L110-L170)；回归测试 [`tests/client/ui/team-tool-card.spec.ts`](../../tests/client/ui/team-tool-card.spec.ts#L114-L127)。

## 复现

```sh
pnpm exec tsx -e "
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeamToolCard } from './packages/company-pack/src/client/ui/TeamToolCard.tsx';
import { en } from './packages/company-pack/src/client/locales.ts';
const tEn = (k, p) => p ? en[k].replace(/\{(\w+)\}/g, (_, m) => String(p[m] ?? '')) : en[k];
console.log(renderToStaticMarkup(createElement(TeamToolCard, {
  toolName: 'team_task_create',
  block: { callId: 'c1', name: 'team_task_create', argsRaw: JSON.stringify({ subject: 'Design API', blocked_by: ['t1', 't2'] }), turn: 1, step: 1, time: 0, subCalls: [] },
  t: tEn,
})));
"
```

（若直接跑 vitest 含 CSS 模块，可用 `renderToStaticMarkup` 渲染 `TeamToolCard` 并断言不含 `[\u3400-\u9fff]` 与 `[、；]`，当前输出为 `<div class="wk-delegation-title">依赖 t1、t2</div>`。）

## 根因与证据

1. [`TeamToolCard.tsx:142`](../../packages/company-pack/src/client/ui/TeamToolCard.tsx#L142) 调用 `teamCardModel(toolName, block)` 时**未传入 `t`**，`teamCardModel` 回退到中文 `defaultT`。
2. [`TeamToolCard.tsx:110-114`](../../packages/company-pack/src/client/ui/TeamToolCard.tsx#L110-L114) 在 `team_task_create` 分支中只赋了 `blockIds = blockers`，**漏设 `detailToken = { key: 'teamCard.taskDeps' }`**，随后第 131 行用 `defaultT` 把 `detail` 算成 `'依赖 t1、t2'`。
3. 第 169 行渲染 `{detailToken === undefined ? detail : t(detailToken.key, { ...detailToken.params, ids: joinList(blockIds ?? [], listSeparator(t)) })}`——因 `detailToken` 为 `undefined`，`listSeparator(t)` 与 `teamCard.taskDeps` 根本没被走到。
4. [`team-tool-card.spec.ts:117-122`](../../tests/client/ui/team-tool-card.spec.ts#L117-L122) 只测了 `teamCardModel` 的 `blockIds` 与 `model.detailToken?.params ?? {}`（`detailToken` 为 `undefined` 导致空对象断言真空通过），从未用 `<TeamToolCard t={tEn} />` 渲染带 `blocked_by` 的组件；`tests/client/i18n/` 也未纳管 `TeamToolCard`。

## 失败类与同类排查

- **失败类**：`client UI` / 双语表达层漏接（[`BUG-329`](../_archive/fixed_bugs/BUG-329-cultivation-en-list-delimiters-chinese.md) 同族遗留）。
- **同类排查**：同文件的 `titleToken` 与 `team_task_update` 的 `detailToken` 均有设置且在第 163/169 行走 `t(...)`；同组另一个工具卡 [`DelegationCard.tsx`](../../packages/company-pack/src/client/ui/DelegationCard.tsx#L75-L124) 无 `detailToken` 延迟翻译问题，但也尚未纳入 `tests/client/i18n/` 扫面。

## 修复方案与范围

- **根因修法**：在 `TeamToolCard.tsx:113` 为 `team_task_create` 补齐 `detailToken = { key: 'teamCard.taskDeps' }`，同时第 142 行把 `t` 传给 `teamCardModel(toolName, block, t)`；确保 `detail` 与 `detailToken` 在 `zh`/`en` 下一致。
- **测试补强**：在 `team-tool-card.spec.ts` 与 `tests/client/i18n/` 增加 `<TeamToolCard t={tEn} />`（含 `team_task_create` + `blocked_by` 与其余全部 `TEAM_TOOL_KEYS` + `DelegationCard`）双语渲染扫面，并用 `assertEnglishUiClean` 守住。
- **不改**：`locales.ts` 已有 `teamCard.taskDeps` 与 `ui.listSeparator` 键，无需新增字典键。

## 已修判定

- `<TeamToolCard toolName="team_task_create" block={...blocked_by:['t1','t2']...} t={tEn} />` 渲染英文依赖清单（含 `, `，零汉字、零顿号）；
- `teamCardModel` 对 `team_task_create` + `blocked_by` 返回 `detailToken: { key: 'teamCard.taskDeps' }`；
- `tests/client/ui/team-tool-card.spec.ts` 与 `tests/client/i18n/` 全覆盖 `TEAM_TOOL_KEYS` 与 `DelegationCard` 的 `en` 扫面并全绿。
