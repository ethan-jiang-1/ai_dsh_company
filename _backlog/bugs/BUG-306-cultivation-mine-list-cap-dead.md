---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-306：培养面板的「我提交的」列表没有接上已声明的 5 条折叠上限——记录一多就整段铺开

> 严重级别：P2（次要偏重：`LIST_CAPS.mine = 5` 已写在状态 hook 里，但渲染面从不调用 `capList`/`capControl`；提交记录多时「我的纠正/建议」整段铺开，把下面的「已采纳的方法 / journal」顶得很远）｜发现：2026-11-22（E2E 第三轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 5–6 个，别管那边怎么修」）。

## 症状

隔离公司盘里放 20 条 `proposerRole: ceo` 的记录（self correction / suggestion 均可），以 CEO 会话打开「培养」：

- 「我提交的 · 我已处理」把 20 条全部铺开；
- 没有「显示全部（共 20 条）」/「收起」控件；
- 同页的「需要我处理」有 10 条上限、`已采纳的方法` 有 5 条上限，唯独 mine 没有。

`use-cultivation-board.tsx:29` 明确写了：

```ts
const LIST_CAPS = { inbox: 10, mine: 5, adopted: 5 } as const
```

`capList` 支持 `mine`，`capControl` 也支持，但渲染面从未调用——配置是死的。

## 运行面

- **面 = client**：`packages/company-pack/src/client/cultivation/use-cultivation-board.tsx` 的 `LIST_CAPS` / `capList` / `capControl`；`CultivationBoardSections.tsx` 的 `CultivationMine`。
- 数据面 = `recordInbox(...).mine` 与 `processedForViewer`。

## 复现

1. 隔离公司盘写 20 条记录（`proposerRole: ceo`，`status` 任意；`targetRole` 任意），或连续提交 6 条以上。
2. 以 CEO 会话打开「培养」→「我提交的 · 我已处理」。
3. 期望：最多 5 条 + 「显示全部（共 N 条）」；实际：全部铺开，无控件。

纯代码证据：

```sh
grep -rn "capList('mine'\|capControl('mine'" packages/company-pack/src/client
# 无输出
```

## 根因与证据

1. 上限表声明了 mine：`use-cultivation-board.tsx:29`
   ```ts
   const LIST_CAPS = { inbox: 10, mine: 5, adopted: 5 } as const
   ```
2. 通用折叠函数支持任意 key：`use-cultivation-board.tsx:91-103`
3. `CultivationMine` 直接全量 map：
   - `CultivationBoardSections.tsx:44`：`inbox.processedForViewer.map(...)`
   - `:55`：`inbox.mine.map(...)`
   - 两处都没有 `capList('mine', ...)` / `capControl('mine', ...)`。
4. 于是 `LIST_CAPS.mine` 是**死配置**；单测也没钉「20 条只显示 5 + 控件」。

## 失败类与同类排查

**失败类 = 声明了上限但消费面没接（dead cap）**。同类：

- `inbox` 与 `adopted` 都正确调用了 `capList`/`capControl`（`CultivationInbox` / `CultivationAdopted`）；
- `CultivationMine` 同时渲染 `processedForViewer` 与 `mine` 两个数组，缺少一个整体的折叠策略；是本卡要定的设计点。
- 不是数据面问题：`recordInbox` 返回全量是正确的（读模型不截断）；问题在渲染层。

## 修复方案与范围

- **根因修法**：`CultivationMine` 用 `capList('mine', ...)` + `capControl('mine', total)`；明确 total 是「processed + mine 合并」还是「各自 cap」，避免同一 self-record 在两个子块重复时计数错。
- **判据**：20 条 mine → 默认 5 条 + 「显示全部（共 20 条）」；展开后 20 条；收起回 5；zh/en 同步。
- **不改**：`recordInbox` 的全量返回；`inbox`/`adopted` 的既有 cap。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 「我提交的」列表受 `LIST_CAPS.mine` 约束，超过 5 条出现折叠控件；
- 展开/收起可逆，计数正确（不把两个子块重复计）；
- 20 条夹具 keyless + 真页面各一条。
