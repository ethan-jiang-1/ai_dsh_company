---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-302：英文界面混入中文——培养页的时间是「刚刚 / 7 小时前」，读失败原因是「列目录被拒（…）」

> 严重级别：P2（次要偏重：语言开关是产品合同；英文用户会在英文句子里看到整段中文，且无法从上下文判断是「刷新时间」还是「目录名」）｜发现：2026-11-22（E2E 第三轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 5–6 个，别管那边怎么修」）。

## 症状

把 locale 设为 `en` 后：

- 培养记录读不到时，面板显示：
  `Cultivation records unreadable: .dsh-company/cultivation/records — 列目录被拒（.dsh-company/cultivation/records） (not zero).`
  — 模板是英文，`reason` 是硬编码中文。
- 培养记录「拒绝时间」显示：
  `Rejected in the target role context · 刚刚` / `· 7 小时前`
  — 模板是英文，时间标签是 `timeLabel` 的中文输出。
- 采纳记录/验证历史的「提出时间」「观察时间」同样走 `timeLabel`，同样中文。

这不是「某一条文案漏翻」，而是**两个客户端 helper 只写了中文**，被所有语言共用。

## 运行面

- **面 = client**：`packages/company-pack/src/lib/cultivation/cultivation-record.ts` 的 `timeLabel`；`packages/company-pack/src/client/cultivation/cultivation-data.ts` 的 `listDir`；消费方 `use-cultivation-board.tsx` / `CultivationBoardSections.tsx` / `CultivationInbox.tsx`。
- 数据面 = 记录 id 时间戳 / `decidedAt` / `verificationHistory.at`，以及 `workspaceFiles.list` 失败结果。

## 复现

1. 隔离 home 写 `cordis.patch.yml`：`- id: locale\n  config:\n    preference: en`；workspace 里把 `.dsh-company/cultivation/records` 做成普通文件（读失败）。
2. 起实例，打开右栏「Cultivation」→ 查看错误行（中文 reason）。
3. 换成正常 records 目录 + 一条 CEO 记录，拒绝它 → 查看「Rejected in the target role context · 刚刚」（中文时间）。

本轮实测原文：

```
Cultivation records unreadable: .dsh-company/cultivation/records — 列目录被拒（.dsh-company/cultivation/records） (not zero).
...
Rejected in the target role context · 刚刚
Rejected in the target role context · 7 小时前
```

## 根因与证据

1. `timeLabel` 只返回中文：
   - `packages/company-pack/src/lib/cultivation/cultivation-record.ts:242-255`：`刚刚` / `分钟前` / `小时前` / `昨天` / `MM-DD HH:MM`。
   - 调用方：`use-cultivation-board.tsx:107`（`stampOf`）、`CultivationBoardSections.tsx:33`（`verificationTime`）。
   - 英文 UI 的其它时间（待办 `formatWhen`）已经走 `t('attention.justNow')` 等 key；培养页没有。
2. `listDir` 的失败原因硬编码中文：
   - `cultivation-data.ts:161`：`const reason = \`列目录被拒（${dir}）\``
   - 这个 reason 被 `inboxUnread` 的中/英模板当作 `{reason}` 原样插入（`cultivation-actions.ts:131` 中文 / `:372` 英文）。
3. 其它 client 诊断也仍是中文（`console.warn` 不进 UI，不算本卡），但 `DirListing.reason` 是直接上屏的字段。

## 失败类与同类排查

**失败类 = 表达层双语只覆盖模板、没覆盖 helper 生成的可变片段**。同类：

- `timeLabel` 还被验证历史（`verificationTime`）和提出时间使用；所有语言共享同一份中文。
- `DirListing.reason` 的 `列目录被拒`、`读取被拒`（另一处 `:87`）都是中文；英文模板会原样拼接。
- 待办的 `formatWhen` 已本地化（`attention.justNow` / `minutesAgo`），是正确范式；培养页未复用。
- host 命令回执（拒绝/采纳）在 en 下是英文，说明 host 语言面已接；漏的是 client helper。

## 修复方案与范围

- **时间**：`timeLabel` 接受 locale/translator（或增加 `timeLabel(text, at, now, t)`），英文用 `Intl.RelativeTimeFormat` / 对应 key；所有调用方传当前语言。
- **失败原因**：`DirListing` 带结构化 code（`forbidden` / `not-directory` / `exception`）与可选参数，UI 用 `t` 渲染；不要把中文句子塞进 `reason` 再拼进英文模板。
- **判据**：en 下两条（读失败原因不含中文、拒绝/采纳时间不含「刚刚/分钟前/小时前」）；zh 保持原文；`company-copy`/locale 门禁覆盖新 key。
- **不改**：host 命令回执语言；待办已有的本地化时间。
- **材料性**：client 公开文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- `en` 页面里培养页的时间与读失败原因不再出现中文；
- `zh` 页面文案不回归；
- 两条 keyless（en 失败原因 / en 时间标签）+ 真页面 en 复核各绿。
