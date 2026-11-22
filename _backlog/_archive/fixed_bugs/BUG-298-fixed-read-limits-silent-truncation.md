---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-298：固定行数读上限静默截断——台账少报 64 场、长记录少报几十行、大索引被误判「形状不符」

> 严重级别：P2（次要偏重：三个读面都是给人下判断的材料；截断后仍以「完整」口吻显示，会让人基于半个文件做决定）｜发现：2026-11-22（E2E 第二轮）｜状态：已修｜审查：agent — 逐条核对已修判定（三夹具边界 spec + 真页面三条原话）
>
> **留痕**：commit cb15f92c（client 读面契约 + 三个面板文案，材料性；批次 Note 覆盖）。

## 症状

三个独立现场，同一个根因：

### A. 台账少报 64 场

写一个 300 行的合法 `kb/motion-ledger.md`（表头 4 行 + 300 行数据），打开「台账」：

- 面板显示 **「共 236 场动议」**（不是 300）；
- 没有「只读了前 N 行 / 文件过大」之类提示；
- 第 237–300 行在面板上完全不存在。

### B. 培养记录少报几十行

写一条 2050 行正文的合法培养记录（`status: open`，目标 CEO），打开「培养」：

- 面板显示 **「展开全文（共 1989 行）」**（不是 2050+）；
- 点展开后，文件末尾的 `LONG_END_MARKER` 不出现；
- 没有任何「只加载了前 N 行 / 文件被截断」提示；`bodyTruncated` 被置成 false。

### C. 合法大索引被误判「形状不符」

写一个 160 个条目的合法 `kb/deliverables-index.json`（pretty JSON，2087 行），点「成品」的「重读」：

- 面板显示 **「成品索引形状不符（schema 1 / entries 缺失；本部署 host 会在下次启动时重建）」**；
- 文件本身是合法 JSON，host 也不会「重建」出更小的索引；
- 正确诊断应是「索引超出读取上限」或直接读到完整内容。

证据（本轮隔离实例）：`12-long-ledger.png`、`10-long-record.png`、`07-large-catalog.png`（原型证据目录，gitignored）。

## 运行面

- **面 = client 读面 + 读模型**：`packages/company-pack/src/client/index.ts` 的 `readLedger` / `readCatalog`；`cultivation/cultivation-data.ts` 的 `readRecord`；`data/workspace-text.ts` 的状态机；`tabs/DeliverablesTab.tsx` 的「形状不符」判定。
- 数据面 = `remote.workspaceFiles.read`（`limit` 是**行数**，不是字节数）。

## 复现

任选一个夹具（不需要模型）：

```sh
# A. 台账：300 行数据
python3 - <<'PY'
lines = ['# 台账', '', '| slug | 日期 | 类型 | 参与 | 墙钟 | 成品 | 一句话结论 |', '|---|---|---|---|---|---|---|']
lines += [f'| bulk-{i:03d} | 2026-11-22 | 决策 | CEO | 未记 | ✅ | row {i} |' for i in range(300)]
open('.dsh-company/kb/motion-ledger.md', 'w').write('\n'.join(lines) + '\n')
PY
# 打开「台账」→ 看统计行

# B. 培养记录：2050 行正文
python3 - <<'PY'
lines = ['---','schema: 1','kind: correction','targetRole: ceo','proposerRole: ceo',
         'proposerKind: agent','source: deliverables/x/final.md',
         'expectation: 长记录','status: open','---','','LONG_START_MARKER']
lines += [f'long body line {i:04d}' for i in range(2050)]
lines += ['LONG_END_MARKER','']
open('.dsh-company/cultivation/records/20261122-010300-long.md', 'w').write('\n'.join(lines))
PY
# 打开「培养」→ 看「展开全文（共 N 行）」与末尾标记

# C. 成品索引：160 个条目的合法 JSON
python3 - <<'PY'
import json
entries = [{'slug': f'bulk-{i:03d}', 'kickoff': '2026-11-22', 'type': 'decision', 'result': 'completed',
            'summary': f'bulk {i}', 'root': '.dsh-company/deliverables',
            'dir': f'2026-11-22-bulk-{i:03d}',
            'path': f'.dsh-company/deliverables/2026-11-22-bulk-{i:03d}/final.md',
            'ledgered': True, 'presented': False, 'metaProblem': None} for i in range(160)]
text = json.dumps({'schema': 1, 'generatedAt': '2026-11-22T00:00:00.000Z', 'counts': {}, 'entries': entries}, indent=2)
open('.dsh-company/kb/deliverables-index.json', 'w').write(text)
print('lines =', len(text.split('\n')))
PY
# 打开「成品」→ 点「重读」→ 看错误文案
```

## 根因与证据

1. **台账上限 240 行**：`packages/company-pack/src/client/index.ts:150`
   ```ts
   const readLedger = readWorkspaceText(WORKSPACE_TEXT_PATHS.ledger, 240)
   ```
   300 行文件只读前 240 行 → 236 条数据行；`ledgerStats` 按读到的行统计，于是「共 236 场」。
2. **培养记录上限 2000 行**：`cultivation-data.ts:125`
   ```ts
   readRecord: (sessionId, path, signal) => readText(path, 2000)(sessionId, signal),
   ```
   读回后 `parseRecord` 只看到前 2000 行；`bodyTruncated` 被无条件写成 false（`cultivation-data.ts:227`），面板把截断正文当全文，行数也按截断后的 body 算。
3. **成品索引上限 2000 行**：`client/index.ts:151`
   ```ts
   const readCatalog = readWorkspaceText(WORKSPACE_TEXT_PATHS.catalog, 2000)
   ```
   2087 行 JSON 被截在中间 → `JSON.parse` 失败 → `parseCatalog` 返回 null → 面板落到 `deliverables.badShape`（「形状不符…host 会在下次启动时重建」）。文件本身合法，重建也不会解决。
4. **共因**：`readWorkspaceText` / `makeWorkspaceTextReader` 只把 `{ limit }` 传给 `workspaceFiles.read`，返回面只取 `{ text }`，**丢弃了 vendor 的 `eof`/分页信息**；三个调用方各自把「截断」误当成「完整」或「坏形状」。

## 失败类与同类排查

**失败类 = 固定上限静默截断（truncated read treated as complete）**。同族：

- `STARTUP_SETTINGS_READ_LIMIT = 16`（`startup-settings.ts`）：设置文件若被格式化成 >16 行，同样会截断 → 宽松解析折成 auto；与 BUG-297 同族，但本卡不重复收。
- `readHead` 240 行（journal 预览）与 `readRecordHead` 60 行（记录摘要）是**有意的摘要窗**，有「摘要/未展开」文案，不算本卡；
- `HISTORY_PAGE_MESSAGES = 800`（待办历史页）也是固定窗，但没有「只读了最近 N 条」提示；是否要收进本族由修复者决定。
- 三个现场都用合法文件，排除了「文件本身坏」；错误全部出在读回后的判断。

## 修复方案与范围

- **根因修法**：让 `WorkspaceFilesFace.read` 返回 `eof`（vendor 已给分页信息），`readWorkspaceText` 的结果态带 `truncated`；三个消费方按场景处理：
  - 台账：截断时显示「只读了前 N 行（文件共 M 行）」并给全文件入口，统计明确标注不完整；
  - 培养记录：`bodyTruncated` 按 `!eof` 置位，面板出现「正文只加载了前 N 行」并给原文入口；
  - 成品索引：截断时显示「索引超出读取上限」，不要显示「形状不符」；或把上限提升到与索引实际规模匹配（并保留显式 too-large 错误）。
- **判据**：三个夹具各一条边界 spec（`limit - 1` / `limit` / `limit + 1` 行），断言「完整 vs 截断」可区分；真页面复核三条。
- **不改**：`workspaceFiles.read` 的 `limit` 语义（行数）；host 生成索引的格式；journal/记录摘要窗的既有文案。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 300 行台账 → 面板要么显示 300，要么明确「只读了前 236 行（共 300）」；不能无声少 64；
- 2050 行记录 → 面板要么读到末尾，要么明确「只加载了前 N 行」且 `bodyTruncated` 为 true；
- 2087 行合法索引 → 要么完整渲染，要么明确「索引过大，未完整读取」；不能再报「形状不符」；
- 三条边界 spec（limit±1）与真页面复核均绿。

## 修复证据

- 改动面：`packages/company-pack/src/client/cultivation/cultivation-data.ts`、`packages/company-pack/src/client/data/workspace-text.ts`、`packages/company-pack/src/client/data/read-limits.ts`、`packages/company-pack/src/client/tabs/LedgerTab.tsx`、`packages/company-pack/src/client/tabs/DeliverablesTab.tsx`、`packages/company-pack/src/client/startup/startup-load.ts`、`tests/client/data/workspace-read-limits.spec.ts`
- 红：`vitest run tests/client/data/workspace-read-limits.spec.ts` —— 读面拿掉 `eof`（改回裸 string）后，limit-1 档位断言失败（截断被当完整）；同窗口三个面板原话：台账「共 236 场」无声、索引「形状不符」、记录 `bodyTruncated=false`
- 绿：`vitest run tests/client/data/workspace-read-limits.spec.ts` —— 4/4（limit-1 ⇒ eof=false、limit/limit+1 ⇒ eof=true、失败带原因）；真页面三条（隔离 workspace 夹具）：
  台账「只读取了前 240 行（文件更长）——下面的统计与清单都不完整」／索引「成品索引超出读取上限（只读到前 2000 行）——不是形状问题」／记录「正文只加载了摘要，可能不完整；完整原文在 …」
- 提交：commit cb15f92c
