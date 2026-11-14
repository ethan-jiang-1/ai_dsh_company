// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c. 行数预算（缩编自 vendor `verify-doc-budgets`；防入口链继续膨胀——R6 D23/清单 B #52） ──
// 负例留证 2026-09-27：AGENTS.md 临时超上限 → doc-budget 红。
// 上限 = 立项时值 + 余量；超限先搬（内容挪到该去的家）再压，确需空间才在 Note 里说明后升上限。
// **2026-09-27 起采 DSH 棘轮语义（FAQ 07 入口链）**：瘦身轮后上限随内容下调、只降不升；反向棘轮守 >20% 空置；
// 上调须在 Note 里论证（三文件曾同时顶格 = 常驻层饱和信号，处置 = 瘦身不是提额）。
// 负例留证 2026-10-27（R3-17 反向棘轮）：把 docs/project-map.md 的上限临时写高（远高于内容）→
//   `FAIL doc-budget: docs/project-map.md … 空置 >20%（按现行内容 +5% 下调上限，
//   或 Note 论证保留）`；还原 99 → ALL PASS。web-rpc 曾长期空置（本轮下调到 30）。
// ⚠ 注释里**不要复述当前行数**——那是易腐常量，实测值由每次跑出的 PASS 行给出（2026-09-26 修：
//   原注释写"后 107 行"/"整治后 131"，实为 108 / 142，属"枚举型事实写两处"那一类腐化）。
const SLACK_FLOOR = 0.2   // 上限最多比现行内容高 20%；超过即视为棘轮未落实（R3-17）
const HEADROOM_FLOOR = 0.05 // DSH：目标内留 ≥5% headroom（docs/ 适用；2026-11-10 步 5）

export function run({ root, ok, fail }) {
const DOC_LINE_BUDGETS = [
  ['notes/AGENTS.md', 25],
  ['notes/implemented/AGENTS.md', 9], // 2026-11-14 立（notes-tree-and-carrier-gates）：按目录自动注入的义务——README 不会被注入，军规必须住 AGENTS.md；每条一句 + 指回 README
  ['notes/archived/AGENTS.md', 8],    // 同上：冻结禁令 + 唯一允许的链接路径修复；注入面常驻，棘轮只降不升
  ['_backlog/bugs/AGENTS.md', 12], // 2026-11-14 立（fix-evidence）：按目录注入的硬线——修 ≠ 翻状态 + git mv；只写两条硬线 + 指针，判据原文住章程
  ['_backlog/_archive/fixed_bugs/AGENTS.md', 11], // 同上：迁卡前三问（留痕/审查、修复证据四行、verify）——注入面常驻，棘轮只降不升
  ['tests/AGENTS.md', 19],
  ['AGENTS.md', 84],             // 2026-09-23 二次收口；2026-09-27 瘦身轮 108→100、棘轮 115→105；2026-10-06 条目 D 纯路由化（删复述与括号链，纪律指针化；当时 95→72），棘轮 105→84
  ['docs/index.md', 48],         // 2026-10-20 台账/外部材料迁出：131→70；2026-11-10 DSH 步 2：逐文档登记 → 书架（树即 inventory），内容 +5% = 48
  ['docs/reference/decisions.md', 67],     // 2026-10-20 自 index 迁出：D 路由表独立页；2026-10-30 +1（D50）；2026-11-02 +1（D56）；2026-11-07 +2（D57/D58）；2026-11-08 +1（D59 域路由）；2026-11-10 +1（D60 质量环，论证 = notes/implemented/2026-11-10-producer-verifier-quality-loop）；2026-11-13 +1（D61 PRD headings + present 闸门，论证 = notes/implemented/2026-11-13-prd-headings-definition）
  ['docs/reference/external-research.md', 30], // 2026-10-20 自 index 迁出（外部材料登记；只登记吸收落点，不承载合同事实）
  ['docs/repo-hygiene.md', 80], // 2026-10-25 立：git 边界与跨环境合同（新增门禁 tracked-portability 的解释面）
  ['docs/orient.md', 80],        // 2026-10-06 立（RFC driver-surface-package 条目 C：驾驭者白话五问单页，只导航不复述事实；反证 = 初稿超限红）
  ['docs/reference/terminology.md', 22],   // 2026-10-12 立：术语映射查表自 index 迁出（登记型查表，随 pin 升级演进；行数稳定，头寸宽于 5% 起步）
  ['docs/guides/web-rpc.md', 30], // 2026-10-12 立；2026-10-27 R3-17 棘轮下调：原 47 让 21 行长期空置，按现行内容 + 5% 收紧
  ['docs/guides/release-runbook.md', 75], // 2026-10-26 立：发布五步 runbook（合同仍住 release.md；本文件只留操作与失败定位）
  ['docs/guides/dev-product-parity.md', 60], // 2026-11-02 立：dev/产品差异表（合同 = release.md/profile.md；本文件只留同形点与允许差异）
  ['docs/guides/product-definition.md', 62], // 2026-11-05 立：MRD→PRD 交接与结构校验（合同 = presets.md/公司手册；本页只留操作与场景）
  ['docs/guides/quality-loop.md', 91], // 2026-11-10 立：质量环操作面（装方法包/发工/落盘/审计/读红；流程正本 = pack skill quality-loop，本页不复述流程）；首个预算 = 现行内容（E2E 校正两条判据 + 能力档改名共用前缀后 +5 行）+5%
  ['docs/guides/budget-and-ops.md', 72], // 2026-10-28 R4：补预算（原无上限；按现行内容 +5% 棘轮）
  ['docs/guides/cdp-probe.md', 68], // 2026-10-28 R4：补预算（原无上限；按现行内容 +5% 棘轮）
  ['docs/policy.md', 100],           // 2026-10-27 R3-19 立：政策层（自 dev-loop §10/§11/§13 + §0.5 规则迁出）
  ['docs/guides/debugging.md', 38],  // 2026-10-27 R3-18：排查阶梯自 dev-loop §2 迁出
  ['docs/guides/environments.md', 48], // 2026-10-27 R3-18：运行环境自 dev-loop §6 迁出
  ['docs/guides/dev-loop.md', 120], // 2026-09-26/27 升至 467（§13、inspect 句）后同日瘦身轮：§7 整段迁 guides/bootstrap.md、§7 留指针防断链（当时 467→376），棘轮 467→395；2026-10-12 二轮瘦身：§8 整段迁 guides/web-rpc.md、§5 时点表退役随迁 release.md（程序/人审/矩阵唯一家）、§0 导航表补全 13 节、§2/§12 同文件复述去重（patch 语法=§4、pipefail=§1），棘轮 395→367；2026-11-03 删 9 个空壳重定向节（§2/§4–§8/§9.1/§10–§11/§13，正文引用改指 debugging/tests README/policy），157→113 行，棘轮 165→120
  ['docs/testing.md', 75],       // 2026-10-04 立测试宪法（_digested/test-strategy 消化采纳轮；政策唯一家，只写 now——膨胀先迁，不加预算）；同日 61（§3.8 红/场景先行）；同日 75（§1.1 资产命名语法，用户点破 DSH「后缀即层」实践）；2026-10-09 §3.7 prove-it-red 补「标题带 BUG-nnn 的 describe/it = 守卫声明」判据句（guard-red-record 门禁接上；原句只写「三步留证」没给可判形状），**同 diff 压回 75 顶格**（引用链改「见该 Note」，不重复路径）。⚠ 顶格：下一句加进来前先迁——§1 分层表与 tests/README「改动面→最窄检查」有重叠面可搬
  ['docs/AGENTS.md', 62],        // 2026-10-09 N1 立（docs/ 分层规矩唯一家：一处事实一个家表 + 长度棘轮 + 更新时机 + 负知识；行数上限唯一源在 run-gates 不复述数字）；反证 = doc-taxonomy 门禁（表头/不属于这层 列缺失即红）
  ['docs/contracts/demo.md', 51],         // 2026-11-10 DSH 步 4：genre 拆分，场景/前置 → guides/demo-scenes；237→51
  ['docs/guides/demo-scenes.md', 207],    // 2026-11-10 步 4：演示前置 + 分镜 + 场景 B–F（内容 +5%）
  ['docs/architecture.md', 88], // 2026-11-10 DSH 步 3：design/architecture → 顶层有序地图（83 行 +5%）
  ['docs/contracts/multi-human.md', 76],  // 2026-11-10 步 4：runbook 迁 guides/multi-human-runbook；199→76
  ['docs/guides/multi-human-runbook.md', 133], // 2026-11-10 步 4：开门/交接/前提/迁移（内容 +5%）
  ['docs/contracts/presets.md', 139],     // 2026-11-10 步 4：工具枚举去重 + 培养回路迁 cultivation；198→139
  ['docs/contracts/cultivation.md', 58],  // 2026-11-10 步 4：培养回路/方法层（内容 +5%）
  ['packages/company-pack/content/AGENTS.md', 37], // 2026-09-28 借 FAQ 04：公司手册是随每个成员会话注入的最大常驻面，同享棘轮（只降不升、上调须 Note 论证）；岗位细节的家 = CHARTER/templates；2026-10-12 瘦身轮 195→190（机制证据段收指针、证据叙事压缩、陈旧日期戳退役——同 diff Note）
  // ── 2026-10-27 R3-17：入口链与最大合同补预算（原先 852 行 docs 无棘轮；checks/README 已从 193 压到 78）──
  ['checks/README.md', 59],        // 2026-11-03 A- D1：手工库存改为 INDEX.generated.md 生成物；README 只留快速选择 + 指针（56 行，+5% 棘轮）
  ['tests/README.md', 100],         // 改动面 → 最窄检查（入口链第四跳）
  ['docs/project-map.md', 99],     // 空间导航（入口链第一跳）
  ['docs/runtime-map.md', 88],     // 运行态地图（入口链第一跳之二）
  ['docs/contracts/release.md', 172],        // 最大未受管合同：发布形状与升 pin 程序
  ['docs/guides/bootstrap.md', 165], // 冷启动配方
  ['docs/contracts/delegation.md', 120],     // 汇报线合同
  ['docs/contracts/data-model.md', 40],      // 数据卡合同
  ['docs/contracts/profile.md', 66],         // host 组合合同
  ['docs/content-charter.md', 110],          // 2026-11-10 立：内容宪章（归位与抽象层次的唯一家；四槽/三层/四问/两测/两消费者/成本表/红牌/变更协议）104 行 +5%；宪法只写判据，步骤住 skill、清单住目录
  // ── 2026-11-03 R5-17：三份最大 owner 文档 + 根 README + 发布 handoff 补预算 ──
  // 审计实测：它们是活文档里最大的几份，却完全在棘轮外；预算 = 现行内容 +5–7%（只降不升）。
  ['README.md', 90],
  ['_backlog/README.md', 140],
  ['notes/README.md', 132],
  ['packages/company-pack/README.md', 160],
  ['docs/guides/publish-handoff.md', 95],
  // 负例留证 2026-11-10（DSH 步 5，5% headroom）：加规则后 docs/reference/decisions 65/65、delegation 120/120、
//   environments 48/48、release-runbook 75/75 等 11 项 FAIL；瘦身/拆 reference 豁免后 PASS。
// 负例留证 2026-11-03（R5-17）：publish-handoff 上限临时 95→80 →
  //   `FAIL doc-budget: docs/guides/publish-handoff.md 90 行超上限 80`；还原 95 → PASS。
]
for (const [rel, cap] of DOC_LINE_BUDGETS) {
  // 文件缺失时报「缺失」而不是抛异常：抛异常会**中断整个 run-gates**，
  // 后面所有门禁一行都不出（2026-10-09 红证：删 docs/AGENTS.md 时 doc-taxonomy 的失败菜单没机会打印）。
  if (!existsSync(join(root, rel))) {
    fail('doc-budget', `${rel} 不在盘上——受预算管的常驻文档不许消失（内容该搬去哪就搬，文件本身留着）`)
    continue
  }
  const lines = readFileSync(join(root, rel), 'utf8').split('\n').length - 1
  if (lines > cap) {
    fail('doc-budget', `${rel} ${lines} 行超上限 ${cap}（先搬内容到该去的家，再压；不直接加行）`)
  } else if (rel.startsWith('docs/') && !rel.startsWith('docs/reference/') && lines > Math.floor(cap * (1 - HEADROOM_FLOOR))) {
    // DSH：目标内至少 5% headroom；顶格=饱和信号，处置是搬/压，不是提额。
    // reference/ 是查表/台账（DSH: reference may be exhaustive），不设 5% 留白；仍受 20% 反棘轮。
    fail('doc-budget', `${rel} ${lines}/${cap} 行，headroom <5%（DSH 目标内留白；先搬/压，不提额）`)
  } else if (lines < Math.ceil(cap * (1 - SLACK_FLOOR))) {
    // 反向棘轮（R3-17）：上限长期悬空 = 「顶格即饱和」信号失效（web-rpc 曾长期空置，已下调）。
    // 处置是**下调上限**（不是写内容凑数）；确需预留空间 → Note 论证后显式下调到 content+5%。
    fail('doc-budget', `${rel} ${lines} 行只占上限 ${cap} 的 ${String(Math.round((lines / cap) * 100))}%（空置 >${String(Math.round(SLACK_FLOOR * 100))}%：按现行内容 +5% 下调上限，或 Note 论证保留）`)
  } else {
    ok(`doc-budget ${rel} (${lines}/${cap})`)
  }
}
}
