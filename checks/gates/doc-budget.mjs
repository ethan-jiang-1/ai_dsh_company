// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c. 行数预算（缩编自 vendor `verify-doc-budgets`；防入口链继续膨胀——R6 D23/清单 B #52） ──
// 负例留证 2026-09-27：AGENTS.md 临时超上限 → doc-budget 红。
// 上限 = 立项时值 + 余量；超限先搬（内容挪到该去的家）再压，确需空间才在 Note 里说明后升上限。
// **2026-09-27 起采 DSH 棘轮语义（FAQ 07 入口链）**：瘦身轮后上限随内容下调（≥5% 头寸）、只降不升；
// 上调须在 Note 里论证（三文件曾同时顶格 = 常驻层饱和信号，处置 = 瘦身不是提额）。
// ⚠ 注释里**不要复述当前行数**——那是易腐常量，实测值由每次跑出的 PASS 行给出（2026-09-26 修：
//   原注释写"后 107 行"/"整治后 131"，实为 108 / 142，属"枚举型事实写两处"那一类腐化）。
export function run({ root, ok, fail }) {
const DOC_LINE_BUDGETS = [
  ['AGENTS.md', 84],             // 2026-09-23 二次收口；2026-09-27 瘦身轮 108→100、棘轮 115→105；2026-10-06 条目 D 纯路由化（删复述与括号链，纪律指针化；当时 95→72），棘轮 105→84
  ['docs/index.md', 131],        // 2026-09-26 升至 149（D29/D30 行）；2026-09-27 瘦身轮：合同落点段删并、D19+D21 / D23+D24 并行、肥行压一行指针（当时 149→139），棘轮 149→146；2026-10-04 升至 147（文档地图加 testing.md 宪法行，Note 同 diff）；2026-10-05 升至 148（D35 台账行，Note 同 diff）；2026-10-09 D36 台账降级纯路由表（33 行 8.8KB → 34 行一句话，最长行 644→≤100）+ N1 分层规矩迁 docs/AGENTS.md（原 §文档组织原则 表 + 生命周期列搬出，本文件只留现状登记），棘轮 148→143（当时 141，留 ≥5% 头寸）；2026-10-09 N4 加 D37–D40 四行台账（+4），**同 diff 压回 143 顶格**——压掉的都是已被 docs/AGENTS.md 或下表接管的复述（导航句、§文档路由 前言、外部研究段三行折两行）。⚠ **台账每加一个 D 号都要先腾一行**（顶格 = 饱和信号，处置 = 瘦身不是提额）。此前在此点名的「D1–D9 家迁移（腾 9 行）」已被 `_backlog/_archive/settled_issues/2026-10-09-decision-ledger-home-migration.md`（2026-10-10 结）裁决否决：九条的 design 节锚是**出生即 design 的决定依据**（初始台账与设计文档 commit 25f7c13 同批建账可溯；D36 Note 同判「凭空补 Note 是造历史」），且实测迁移腾不出九行——未来加 D 号前按 docs/AGENTS.md 处置次序（①搬②压③提额）在实际可瘦身处操作，不提额。2026-10-12 二轮瘦身：§文档组织原则与外部材料 intro 压缩、**术语映射整节迁出 terminology.md**（查表面不占登记表绑定型文件的头寸，登记见 §现有文档），棘轮 143→131（内容 124，头寸 7 行 = 未来 ~7 个 D 号）
  ['docs/orient.md', 80],        // 2026-10-06 立（RFC driver-surface-package 条目 C：驾驭者白话五问单页，只导航不复述事实；反证 = 初稿超限红）
  ['docs/terminology.md', 22],   // 2026-10-12 立：术语映射查表自 index 迁出（登记型查表，随 pin 升级演进；行数稳定，头寸宽于 5% 起步）
  ['docs/guides/web-rpc.md', 47], // 2026-10-12 立：驱动 Web 面会话的 RPC runbook 自 dev-loop §8 迁出（常驻层瘦身轮；操作表行绑定，头寸起步 ≥5%）
  ['docs/guides/dev-loop.md', 367], // 2026-09-26/27 升至 467（§13、inspect 句）后同日瘦身轮：§7 整段迁 guides/bootstrap.md、§7 留指针防断链（当时 467→376），棘轮 467→395；2026-10-12 二轮瘦身：§8 整段迁 guides/web-rpc.md、§5 时点表退役随迁 release.md（程序/人审/矩阵唯一家）、§0 导航表补全 13 节、§2/§12 同文件复述去重（patch 语法=§4、pipefail=§1），棘轮 395→367（内容 348，头寸 19 行）
  ['docs/testing.md', 75],       // 2026-10-04 立测试宪法（_digested/test-strategy 消化采纳轮；政策唯一家，只写 now——膨胀先迁，不加预算）；同日 61（§3.8 红/场景先行）；同日 75（§1.1 资产命名语法，用户点破 DSH「后缀即层」实践）；2026-10-09 §3.7 prove-it-red 补「标题带 BUG-nnn 的 describe/it = 守卫声明」判据句（guard-red-record 门禁接上；原句只写「三步留证」没给可判形状），**同 diff 压回 75 顶格**（引用链改「见该 Note」，不重复路径）。⚠ 顶格：下一句加进来前先迁——§1 分层表与 tests/README「改动面→最窄检查」有重叠面可搬
  ['docs/AGENTS.md', 62],        // 2026-10-09 N1 立（docs/ 分层规矩唯一家：一处事实一个家表 + 长度棘轮 + 更新时机 + 负知识；行数上限唯一源在 run-gates 不复述数字）；反证 = doc-taxonomy 门禁（表头/不属于这层 列缺失即红）
  ['company-workspace/AGENTS.md', 190], // 2026-09-28 借 FAQ 04：公司手册是随每个成员会话注入的最大常驻面，同享棘轮（只降不升、上调须 Note 论证）；岗位细节的家 = CHARTER/templates；2026-10-12 瘦身轮 195→190（内容 180：机制证据段收指针、证据叙事压缩、陈旧日期戳退役——同 diff Note）
]
for (const [rel, cap] of DOC_LINE_BUDGETS) {
  // 文件缺失时报「缺失」而不是抛异常：抛异常会**中断整个 run-gates**，
  // 后面所有门禁一行都不出（2026-10-09 红证：删 docs/AGENTS.md 时 doc-taxonomy 的失败菜单没机会打印）。
  if (!existsSync(join(root, rel))) {
    fail('doc-budget', `${rel} 不在盘上——受预算管的常驻文档不许消失（内容该搬去哪就搬，文件本身留着）`)
    continue
  }
  const lines = readFileSync(join(root, rel), 'utf8').split('\n').length - 1
  lines <= cap
    ? ok(`doc-budget ${rel} (${lines}/${cap})`)
    : fail('doc-budget', `${rel} ${lines} 行超上限 ${cap}（先搬内容到该去的家，再压；不直接加行）`)
}
}
