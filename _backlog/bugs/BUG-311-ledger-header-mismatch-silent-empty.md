---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-311：台账表头写错一个词就整表消失——面板显示「共 0 场」且不报错

> 严重级别：P2（次要偏重：台账是审计视图；表头 typo 会让全部动议静默消失，用户可能以为台账是空的）｜发现：2026-11-22（E2E 第四轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 8–10 个，别管那边怎么修」）。

## 症状

把 `kb/motion-ledger.md` 的表头从 `参与` 写成 `参与方`（其它列不变，行数据合法）：

- 面板显示 `共 0 场动议 · 成品 0 · 墙钟未记 0`；
- 列表为空；
- 没有「表头不符 / 无法解析 / 0 行」提示。

文件不是空文件：下面还有一行完整动议；只是表头不匹配 `HEADERS` 中的两种（中文 legacy / 英文 canonical）。

## 运行面

- **面 = lib 解析 + client 台账页签**：`packages/company-pack/src/lib/accounting/ledger.ts` 的 `parseMotionLedger`；`tabs/LedgerTab.tsx`。
- 数据面 = `kb/motion-ledger.md`（部署侧人工可改）。

## 复现

```sh
cat > .dsh-company/kb/motion-ledger.md <<'EOF'
| slug | 日期 | 类型 | 参与方 | 墙钟 | 成品 | 一句话结论 |
|---|---|---|---|---|---|---|
| a | 2026-11-22 | 决策 | CEO | 未记 | ✅ | x |
EOF
```

打开「台账」→ `共 0 场动议`，无错误行。

纯函数：

```sh
node --import tsx/esm -e "
import { parseMotionLedger } from './packages/company-pack/src/lib/accounting/ledger.ts'
console.log(parseMotionLedger('| slug | 日期 | 类型 | 参与方 | 墙钟 | 成品 | 一句话结论 |\\n|---|---|---|---|---|---|---|\\n| a | 2026-11-22 | 决策 | CEO | 未记 | ✅ | x |\\n'))
"
# { rows: [], badRows: [] }
```

## 根因与证据

`parseMotionLedger` 的 header 检测只认两个固定 HEADERS：

- `ledger.ts:37-45`：逐行找 header；没找到就 `continue`；之后所有行都因为 `headerSeen === false` 被跳过；
- 坏行记账（BUG-303）只在 `headerSeen === true` 之后生效；表头本身不匹配时 `badRows` 仍是空；
- `LedgerTab` 只看到 `{ rows: [], badRows: [] }`，于是渲染正常空态「共 0 场」。

## 失败类与同类排查

**失败类 = 解析器把「认不出表头」折成「没有数据」**。同类：

- BUG-303 修了**表头之后**的坏行；表头本身不匹配仍静默。
- 台账是唯一一个「表头是格式合同、但不匹配时没有文件级错误」的读面；成品索引有「schema/entries 缺失 → 形状不符」。
- 若用户把表头改成英文 canonical，`HEADERS` 支持；改成 `参与方` 这种近似词则静默。

## 修复方案与范围

- **根因修法**：解析返回 `headerFound: boolean`（或 `badRows` 里记一条 `header` 原因）；`LedgerTab` 在 `headerFound === false` 且文件有表行时显示「表头不符（期望 …）——无法解析台账」，不要当 0 条。
- 或更宽容：按列数 + 位置解析，表头只做警告；但先要能说出来。
- **判据**：表头 typo → 错误行 + 原文行号；空文件/只有注释 → 合法 0 条；两个 HEADERS → 正常解析。
- **不改**：`ledger-participation` 门禁（仓库内格式）；`ledgerStats` 口径。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 表头不匹配时面板明确报「表头不符」并指出文件，不再显示「共 0 场」；
- 空文件/纯注释台账仍是合法 0 条（无错误）；
- 中文/英文两种表头正常；
- 解析层 header 状态 + 面板一条断言。
