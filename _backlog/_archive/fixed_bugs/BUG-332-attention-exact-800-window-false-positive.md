---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-332：会话恰好 800 条事件时也被判「历史只扫了最近 800 条」——拿满一页不等于还有更早

> 严重级别：P2（次要：假边界会让用户以为还有未读审批；对恰好一页的完整历史是误报）｜发现：2026-11-23（E2E 第六轮）｜状态：已修｜审查：agent — 逐条核对已修判定（跨源/源内、多问题、恰好一页与 +1）
>
> **留痕**：commit 0b3b6428（与 325/331/332 同批：问询读模型，材料性；批次 Note 覆盖）。

## 症状

`readSessionEvents` 用 `maxMessages=HISTORY_PAGE_MESSAGES=800` 读一页，然后：

```ts
windowTruncated: full.value.hasMore === true || records.length >= HISTORY_PAGE_MESSAGES
```

如果某个会话**恰好**有 800 条事件（全部读完，`hasMore !== true`），`records.length >= 800` 仍为 true → `history.window='some'` → 面板显示「历史只扫描了最近 800 条事件——更早的挂起审批可能没出现」。实际上没有更早的事件。

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/presence/attention-history.ts` 的 `readSessionEvents`；`AttentionTab` 的 `history.window` 提示。
- 数据面 = `remote.session.page` 的 `records`/`hasMore`。

## 复现

1. 用一个恰好 800 条事件、没有更早事件的会话（或 mock page 返回 `records.length=800, hasMore=false`）。
2. 打开「待办」。
3. 期望：无窗口提示；实际：`history.window='some'` + 提示。

纯证据：

```sh
node --import tsx/esm -e "
// 等价逻辑（readSessionEvents 的判据）
const records = Array.from({length:800}, (_,i)=>({seq:i}))
const hasMore = false
console.log(hasMore === true || records.length >= 800)
"
# true
```

## 根因与证据

- `attention-history.ts` 的 `windowTruncated` 注释说「拿满一页 ≠ 只有这一页：vendor 的 hasMore 若有就直接用，否则拿满即视为可能还有更早的」；这是**保守**判定。
- 但 `hasMore` 明确为 false 时，仍然 `records.length >= 800` 分支判 true；两个条件应该是 `hasMore === true`，拿满只在 `hasMore` 缺失时作为兜底，而不是覆盖 false。
- `window='some'` 驱动 `attention.historyWindow` 提示；没有「完整」状态可区分。

## 失败类与同类排查

**失败类 = 保守下限判定覆盖了明确的完整信号**。同类：

- `hasMore` 缺失 → 拿满视为可能还有：合理兜底。
- `hasMore === false` + 恰好 800 → 本卡（误报）。
- 304/305 的窗口提示本身保留；本卡只修 false positive。
- 不是「800 条窗口太小」；是判定条件。

## 修复方案与范围

- **根因修法**：`windowTruncated = hasMore === true || (hasMore === undefined && records.length >= HISTORY_PAGE_MESSAGES)`；`hasMore === false` 明确完整。
- 或者让 `readSessionEvents` 返回 `{ truncated: 'yes'|'no'|'unknown' }`，面板分开渲染。
- **判据**：hasMore=false + 800 → 不提示；hasMore=true → 提示；hasMore 缺失 + 800 → 提示；799 → 不提示。
- **不改**：800 页大小；304/305 的读取失败/窗口提示。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 恰好 800 且 hasMore=false 不再显示窗口提示；
- hasMore=true/缺失 + 800 仍提示；
- 小于 800 不提示；
- 纯函数 spec + 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/client/presence/attention-history.ts`（`windowTruncated` 只看 `hasMore`）、`tests/client/presence/attention-history.spec.ts`
- 红：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts tests/client/presence/attention-history.spec.ts` —— 把判据改回 `records.length >= HISTORY_PAGE_MESSAGES` 后「恰好一页 ⇒ window=none」失败（误报）
- 绿：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts tests/client/presence/attention-history.spec.ts` —— 47/47 + 12/12 + 17/17
- 提交：commit 0b3b6428
