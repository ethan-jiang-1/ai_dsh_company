---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-321：合法的长前置记录只读前 60 行——被当成「坏记录」整条丢掉，且没有「只读了头」的提示

> 严重级别：P2（次要偏重：记录只要 frontmatter 超过 60 行（长 contexts/多注释）就会被判坏；它是合法记录，全文可读，但列表用头部窗口判定）｜发现：2026-11-22（E2E 第五轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

写一条合法记录：frontmatter 里在必需字段后加 55 行 YAML 注释（`# c0`…），闭合 `---` 在第 60 行之后；正文短。

- 用 `parseRecord` 读全文：合法记录；
- 面板读记录列表：`readRecordHead` 只读前 60 行，拿不到闭合 `---`，`parseRecord` 返回 null；该条进入 `brokenRecords`（「坏记录」），记录从列表/收件箱里消失；
- 面板只说「N 条记录形状坏」，不会说「其实只是头窗口不够」。

纯证据：

```sh
node --import tsx/esm -e "
import { parseRecord } from './packages/company-pack/src/lib/cultivation/cultivation-record.ts'
const fields = ['kind: correction','targetRole: ceo','proposerRole: cfo','proposerKind: agent','expectation: x','status: open','source: s']
const comments = Array.from({length:55}, (_,i)=>'# c'+i)
const full = ['---', ...fields, ...comments, '---','','body'].join('\n')
console.log(parseRecord('r', full) !== null, parseRecord('r', full.split('\n').slice(0,60).join('\n')) !== null)
"
# true false
```

## 运行面

- **面 = client 培养读面**：`packages/company-pack/src/client/cultivation/cultivation-data.ts` 的 `readRecordHead: readText(path, 60)` / 记录列表加载；`parseRecord` 在 `lib/cultivation/cultivation-record.ts`。
- 数据面 = `.dsh-company/cultivation/records/*.md`。

## 复现

1. 在隔离盘写一条上述合法记录。
2. 打开「培养」。
3. 期望：记录出现在收件箱/我提交的，或至少明确说「只读了前 60 行」；实际：列入坏记录，整条不显示。

## 根因与证据

- `cultivation-data.ts:185`：`readRecordHead: (sessionId, path, signal) => asWindowReader(readText(path, 60))(sessionId, signal)`。
- 记录列表加载（`:274` 附近）对每个文件都先用 `readRecordHead` 再 `parseRecord`；头部窗口不足 → null → `broken.push(name)`，不再尝试全文。
- `readRecord` 全文窗口是 2000（`:186`），本可以读；但摘要阶段已经判坏，没有 fallback。
- 60 行是**头部窗口**，不是记录格式上限；`parseRecord` 不限制 frontmatter 行数。

## 失败类与同类排查

**失败类 = 预览窗口被当作格式判据，失败后不降级到全文**。同类：

- 成品索引/台账已有 row-level 诊断；培养记录有 `brokenRecords`，但这一步把「头窗口不够」也算坏。
- `readRecord` 的 2000 字窗口有 `eof` 提示；头部 60 行没有。
- 不是「记录真的破」：全文 `parseRecord` 成功；只是前缀超过 60 行。

## 修复方案与范围

- **根因修法**：`readRecordHead` 解析失败时用 `readRecord` 全文重试；或把头部窗口提高到足以覆盖 frontmatter 上限，并区分 `headTruncated` 与 `broken`。
- 失败仍要报；但「头窗口不够」不能归为「坏形状」。
- **判据**：60 行内的长前置记录 → 正常出现；真坏形状 → 仍进 broken；全文读取失败 → 报读取失败；zh/en 同步。
- **不改**：记录格式；`FULL_RECORD_LIMIT`；`readRecord` 2000 字窗口。
- **材料性**：client 读面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 合法长前置记录不再被判坏；
- 真坏记录仍报 broken；
- 读取失败与形状坏可区分；
- 纯函数/组件 spec + 真页面一条。
