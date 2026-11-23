---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-358：任务看板把 `lib` 里的中文 `'未分配'` 直出到 `en` 界面，且 `BoardTab` 漏接 `roleLabel`

> 严重级别：P2（i18n 漏词：`en` 模式下打开「任务看板」页签，任何未认领任务的负责人标签渲染成 `未分配`，而同屏列头/状态/空态全是英文）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

1. [`UNASSIGNED_LABEL = '未分配'`](../../packages/company-pack/src/lib/presence/board.ts#L28) 在 [`boardColumns`](../../packages/company-pack/src/lib/presence/board.ts#L239-L252) 里被折进 `BoardCard.ownerLabel`；
2. [`BoardPanel`](../../packages/company-pack/src/client/tabs/company-panels.tsx#L112-L127) 直接 `roleLabel(card.ownerLabel)`，而 [`BoardTab`](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L172) 渲染 `<BoardPanel columns={data.columns} t={props.t} />` **没有传 `roleLabel`**（默认 `label => label`），于是 `en` 下输出中文；
3. 同一族的三处渲染面里只有它既没接本地化函数、又让 `lib` 带着中文展示值——[`TasksTableView`](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L305) 用 `roleLabel` + `t('tasks.unassigned')`，[`DagPanel`](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L210) 接了 `roleTextForCanonical`（未认领节点因 `ownerLabel === null` 干脆不画 owner，所以不漏词）。

## 运行面

- **面 = lib + client**：[`packages/company-pack/src/lib/presence/board.ts`](../../packages/company-pack/src/lib/presence/board.ts#L24-L31) 与 [第 234-252 行](../../packages/company-pack/src/lib/presence/board.ts#L234-L252)、[`company-panels.tsx`](../../packages/company-pack/src/client/tabs/company-panels.tsx#L112-L127)、[`company-tabs.tsx:172`](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L172)。

## 复现

纯读模型侧（可 `tsx` 直跑）：

```sh
pnpm exec tsx -e "
import { boardColumns, UNASSIGNED_LABEL } from './packages/company-pack/src/lib/presence/board.ts';
const cols = boardColumns([{ id: 'task-1', subject: 's', description: '', status: 'pending', ownerName: null, revision: 1, blockedBy: [], ready: true, revisionGap: false, statusGap: false }]);
console.log(JSON.stringify({ label: UNASSIGNED_LABEL, card: cols[0].cards[0].ownerLabel }));
"
```

实测 `{"label":"未分配","card":"未分配"}`。渲染侧（隔离探针，happy-dom）：`renderToStaticMarkup(<BoardPanel columns={…} t={en} />)` 的输出里列头是 `Pending / In progress / Completed`、空态是 `This column is empty for now.`，而负责人徽章是 `未分配`——整段 HTML 命中 `/[\u3400-\u9fff]/`。

## 根因与证据

1. [`board.ts:28`](../../packages/company-pack/src/lib/presence/board.ts#L28) 把展示文案放在 `lib` 读模型里（`lib/presence/board.ts` 顶部注释自己也写着「文案归 client 的 `t`，`src/lib` 不返回中文」——`TASK_STATUS_LABEL` 已被 `columnLabel` 绕过，`UNASSIGNED_LABEL` 是同一约定的漏网处）；
2. [`company-panels.tsx:127`](../../packages/company-pack/src/client/tabs/company-panels.tsx#L127) 把该值当「已翻译文本」消费；
3. [`company-tabs.tsx:172`](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L172) 未传 `roleLabel`，与同文件另两处渲染面的接线不一致（即使未来 `lib` 改回 null，看板也缺少把角色 id 本地化的通道）。

## 失败类与同类排查

- **失败类**：`lib` 读模型返回展示文案 + 渲染面漏接 `roleLabel`（`BUG-333` / `BUG-336` / `BUG-354` 同族，本轮的第 4 处独立落点）。
- **同类排查**：同文件 `TASK_STATUS_LABEL` 已被 `company-panels.tsx` 的 `columnLabel` 覆盖，但仍作为 `BoardColumn.label` 流传——建议一并改成 id（`BoardStatus` 已是 id）；`lib/presence/doors.ts` 的 `'(未选 preset)'`、`lib/cultivation/cultivation-inbox.ts` 的 `journalTitle` 空文本 `'（空）'`、`board.ts` 的 `driftLabel` 是同一类残留，逐个确认是否有 UI 直出路径。

## 修复方案与范围

- **根因修法**：`BoardCard.ownerLabel` 改为 `string | null`（null = 未分配），由 `BoardPanel` 用 `t('tasks.unassigned')` 渲染；`BoardTab` 补 `roleLabel={label => roleTextForCanonical(label, props.t)}`，与 `DagPanel` 同形；`UNASSIGNED_LABEL` 从 `lib` 退役（`company-panels.tsx` 的再导出同步删）。
- **判据**：`en` 下看板零汉字；`zh` 文案不变。

## 已修判定

- `en` 下 `BoardPanel`（未认领 + 已认领混合）渲染零汉字，未认领显示 `Unassigned`；`zh` 显示「未分配」；
- `BoardTab` 传 `roleLabel`，看板已认领名与 `DagPanel` 同源；
- 渲染探针加入 `tests/client/` 或 `tests/client/i18n/` 的满态扫面，旧实现红、新实现绿。
