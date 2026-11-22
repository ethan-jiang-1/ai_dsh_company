/**
 * 工作区文本读面的**固定行数上限**（一处事实一个家）。
 *
 * 这些值是 `remote.workspaceFiles.read` 的 `limit`（**行数**，不是字节）。它们不是「随便够大」的数字：
 * 超过上限时 vendor 返回 `eof: false`，面板必须据此说「只读了前 N 行」，**不能**把截断当完整
 * （BUG-298：台账少报 64 场、记录把截断当全文、大索引被误判「形状不符」）。
 *
 * 为什么集中在这里：此前上限散落在 `client/index.ts` 与 `cultivation-data.ts`，提示文案要写
 * 「前 N 行」时无处可取，容易又写死一份。
 */

/** 台账（`kb/motion-ledger.md`）：看统计与最近动议足够，超出会截断并提示。 */
export const LEDGER_READ_LIMIT = 240

/** 成品索引（`kb/deliverables-index.json`）：索引随成品数增长，超出按「超过读取上限」处理。 */
export const CATALOG_READ_LIMIT = 2000

/** 培养记录全文：长记录会被截断，面板按 `bodyTruncated` 提示「只加载了前 N 行」。 */
export const RECORD_READ_LIMIT = 2000
