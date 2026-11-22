---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-322：journal 只读前 240 字——长前言的标题读不到，面板静默退回文件名

> 严重级别：P2（次要：journal 预览标题是「这一篇讲什么」的唯一线索；长前言吞掉标题后，面板显示文件名，用户看不出内容）｜发现：2026-11-22（E2E 第五轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

一篇 journal 文件以一段长前言/注释开头（>240 字），真正的 `# 标题` 在第 240 字之后：

- 面板预览标题显示文件名（`2026-11-22-...`），而不是 `# 标题`；
- 没有「只读了前 240 字」的提示；
- 文件本身合法，标题就在后面。

## 运行面

- **面 = client 培养读面**：`packages/company-pack/src/client/cultivation/cultivation-data.ts` 的 `readHead: readText(path, 240)` / `journalRows`；`journalTitle` 在 `lib/cultivation/cultivation-inbox.ts`。
- 数据面 = `.dsh-company/kb/<role>/journal/*.md`。

## 复现

1. 写 `kb/ceo/journal/2026-11-22-long-preface.md`：
   ```
   # 这是一段超过 240 字的前言……
   （重复填充 >240 字）
   # 真正的标题
   ```
2. 打开「培养」→ journal 行。
3. 期望：显示「真正的标题」或提示「只读了前 240 字」；实际：显示文件名。

纯证据：

```sh
node --import tsx/esm -e "
import { journalTitle } from './packages/company-pack/src/lib/cultivation/cultivation-inbox.ts'
const full = '# ' + 'x'.repeat(260) + '\n# Real Title\n'
console.log(journalTitle(full), '|', journalTitle(full.slice(0,240)))
"
# Real Title | # xxxx…（截断的注释）
```

## 根因与证据

- `cultivation-data.ts:183`：`readHead: (sessionId, path, signal) => asWindowReader(readText(path, 240))(sessionId, signal)`。
- `journalRows` 用 `readHead` 读每角色前 3 篇；`inboxRows` 对读到的文本调用 `journalTitle`；标题在 240 之后时读不到。
- `journalTitle` 的兜底是「首段首个非空行」，于是长前言本身（或文件名）成为标题；没有 `truncated` 状态。
- `240` 是预览窗口，不是 journal 格式上限；`journalTitle` 没有行数/字符限制。

## 失败类与同类排查

**失败类 = 预览窗口截断标题，失败静默降级为文件名**（与 321 同族，但 journal 不判坏，只丢标题）。同类：

- 记录头部 60 行：321（会判坏）。
- journal 240 字：本卡（标题降级）。
- 记录全文 2000 字：有 `eof` 提示。
- 不是「journal 没有标题」：标题在窗口外。

## 修复方案与范围

- **根因修法**：读 journal 时用足够大的窗口（或先读全文再截正文），至少在窗口命中时返回 `truncated` 并在 UI 标「只读了前 N 字」；标题搜索可只读前 N 行而非前 N 字。
- 或按行读：标题通常在开头若干行；把窗口改为「前 80 行」而不是 240 字。
- **判据**：长前言 + 标题 → 标题可见或明确截断；真无标题 → 文件名；短 journal 不回归；zh/en 同步。
- **不改**：journal 格式；预览条数 `HEAD_LIMIT=3`。
- **材料性**：client 读面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 长前言 journal 的标题可见或明确说「只读了前 240 字」；
- 真无标题仍退文件名；
- 短 journal 不回归；
- 纯函数/组件 spec + 真页面一条。
