---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-361：`firstText` 只按 `\n` 切行，CRLF 消息的首行会带一个 `\r` 进动态与摘要

> 严重级别：P2（内容口径：Windows/粘贴来源的消息正文是 CRLF，`firstText` 取「首行」时把行尾的 `\r` 一起返回；该字符串进在场动态、注意力摘要与工具卡预览，界面上表现为不可见控制字符，日志/复制里是可见的 `^M`）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

[`firstText`](../../packages/company-pack/src/lib/shared/text.ts#L15-L24) 用 `block.text.trim().split('\n')[0]` 取首行。`trim()` 只去掉整串首尾空白：`"a\r\nb"` 的 `trim()` 仍是 `"a\r\nb"`，`split('\n')[0]` 得到 `"a\r"`——尾随 `\r` 留在结果里。

## 运行面

- **面 = lib**：[`packages/company-pack/src/lib/shared/text.ts`](../../packages/company-pack/src/lib/shared/text.ts#L15-L24)；消费方 [`presence.ts`](../../packages/company-pack/src/lib/presence/presence.ts) 的消息预览、[`attention.ts`](../../packages/company-pack/src/lib/presence/attention.ts) 的升级正文预览。

## 复现

```sh
pnpm exec tsx -e "
import { firstText } from './packages/company-pack/src/lib/shared/text.ts';
const out = firstText([{ type: 'text', text: 'a\r\nb' }]);
console.log(JSON.stringify(out), out.length);
"
```

实测输出 `"a\r" 2`（期望 `"a"` 1）。经 `presence.activity` 的动态行后，界面与日志里都能看到这个裸 `\r`。

## 根因与证据

1. `split('\n')` 没有按行尾归一处理 CRLF/孤立 CR；本仓其它读面早有归一（[`normalizeDocument`](../../packages/company-pack/src/lib/docs/markdown-shape-core.js#L1-L18) 去 BOM/CRLF/孤立 CR），`firstText` 是漏接的那一个。
2. `trim()` 只作用于整串，不作用于切出来的首行。

## 失败类与同类排查

- **失败类**：文本取首行时没有统一换行归一（同一仓已有唯一实现可复用）。
- **同类排查**：`presence.ts` / `attention.ts` 的其它首行取法；`cultivation-inbox.journalTitle` 用 `line.trim()` 逐行判断，不受影响（已核）。

## 修复方案与范围

- **根因修法**：`firstText` 内先做换行归一（`replace(/\r\n?/g, '\n')`）再切行，并对切出的首行再 `trim()`；或复用共享的归一函数。

## 已修判定

- `firstText([{type:'text',text:'a\r\nb'}]) === 'a'`；`firstText` 对孤立 `\r`（`'a\rb'`）也给 `'a'`；既有 `firstText` 用例保持绿。
