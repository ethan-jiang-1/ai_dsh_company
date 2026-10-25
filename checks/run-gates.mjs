#!/usr/bin/env node
// 状态：常驻
// 结构门禁 runner（装配入口；**清单唯一源 = checks/gates/ 目录**，每门禁一文件——AGENTS.md 与
// dev-loop 只留指针，不复述清单——复述必漂）。
// **本行不写类数与项数**：那是易腐常量，实测写"12 类 / 16 项"后加了 3 道门禁就立刻失真
// （D28：枚举型事实的家 = 实现自己）。要全表就跑一次看 PASS 行——「跑一次看 PASS 行即得全表」
// 的性质不因切分而变。
// 纪律：只报告实际跑过的检查（dev-loop §1）；结构门禁不证明运行行为（testing.md §1）。
// 切分（2026-10-14，兑现 2026-10-05 立的触发线「>800 行或 >30 个门禁时，切成 gates/*.mjs +
// 本文件做薄 runner」）：每道门禁 = checks/gates/<名>.mjs 一个文件，注释与判据逐字随门禁搬走
// （跨门禁共享的常量由后来的门禁 import 先到的门禁模块，如 pin 常量 = gates/lib/pin.mjs）；
// 本文件只按原分区顺序装配——import 与调用顺序 = 原单文件顺序，PASS 行顺序即证明。
// 历史墓碑（原 §2c-ter，随拆分并入本头注）：
// ── intents 行预算门禁——已随 intents.md 退役拆除（2026-10-04，D34，用户令）────
// 为什么拆：该文件是第三本账（内容 100% 派生自 Note 状态行，_backlog 章程反双记账同款病），
// 且违反上游 no-index 教义（vendor notes README："Do not add a centralized INDEX.md"）——两道规矩
// （行预算 + 窗口冻结）都是在给派生索引续命。退役 = 删掉活表；授权链线索住 Note 状态行。
// 2026-10-09 清扫再删掉月度冻结表（账本身）。依据 = cleanup-round Note 决定 ④。
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as mdUtf8 from './gates/md-utf8.mjs'
import * as mdLinks from './gates/md-links.mjs'
import * as docBudget from './gates/doc-budget.mjs'
import * as handbookBudget from './gates/handbook-budget.mjs'
import * as runBundleClean from './gates/run-bundle-clean.mjs'
import * as noTrackedIgnored from './gates/no-tracked-ignored.mjs'
import * as trackedFileSize from './gates/tracked-file-size.mjs'
import * as gitignoreShape from './gates/gitignore-shape.mjs'
import * as companySkeleton from './gates/company-skeleton.mjs'
import * as shippedLinks from './gates/shipped-links.mjs'
import * as baseClean from './gates/base-clean.mjs'
import * as ledgerRouting from './gates/ledger-routing.mjs'
import * as ledgerParticipation from './gates/ledger-participation.mjs'
import * as docTaxonomy from './gates/doc-taxonomy.mjs'
import * as snapshotsBudget from './gates/snapshots-budget.mjs'
import * as barePath from './gates/bare-path.mjs'
import * as layoutBlock from './gates/layout-block.mjs'
import * as retiredPath from './gates/retired-path.mjs'
import * as navEnumeration from './gates/nav-enumeration.mjs'
import * as navCountClaims from './gates/nav-count-claims.mjs'
import * as pinCurrency from './gates/pin-currency.mjs'
import * as scriptTriggers from './gates/script-triggers.mjs'
import * as scriptStatus from './gates/script-status.mjs'
import * as distManual from './gates/dist-manual.mjs'
import * as scriptPort from './gates/script-port.mjs'
import * as presets from './gates/presets.mjs'
import * as presetRequiredConfig from './gates/preset-required-config.mjs'
import * as claudeSymlink from './gates/claude-symlink.mjs'
import * as vendorPin from './gates/vendor-pin.mjs'
import * as packShape from './gates/pack-shape.mjs'
import * as releaseReady from './gates/release-ready.mjs'
import * as presetRowDeps from './gates/preset-row-deps.mjs'
import * as clientHalves from './gates/client-halves.mjs'
import * as proposals from './gates/proposals.mjs'
import * as notesLiveness from './gates/notes-liveness.mjs'
import * as backlogLiveness from './gates/backlog-liveness.mjs'
import * as replaySceneLiveness from './gates/replay-scene-liveness.mjs'
import * as snapshotIndex from './gates/snapshot-index.mjs'
import * as guardRedRecord from './gates/guard-red-record.mjs'
import * as securityScan from './gates/security-scan.mjs'
import * as trackedToken from './gates/tracked-token.mjs'
import * as trackedSecrets from './gates/tracked-secrets.mjs'
import * as trackedPortability from './gates/tracked-portability.mjs'
import * as scriptIndex from './gates/script-index.mjs'
import * as replayFixtureFreshness from './gates/replay-fixture-freshness.mjs'
import * as replayUiFreshness from './gates/replay-ui-freshness.mjs'
import * as gateWiring from './gates/gate-wiring.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const ok = (name) => console.log(`  PASS ${name}`)
const fail = (name, detail) => { failures.push(`${name}: ${detail}`); console.log(`  FAIL ${name}: ${detail}`) }

const ctx = { root, ok, fail }
mdUtf8.run(ctx)
mdLinks.run(ctx)
docBudget.run(ctx)
handbookBudget.run(ctx)
runBundleClean.run(ctx)
noTrackedIgnored.run(ctx)
trackedFileSize.run(ctx)
gitignoreShape.run(ctx)
companySkeleton.run(ctx)
shippedLinks.run(ctx)
baseClean.run(ctx)
ledgerRouting.run(ctx)
ledgerParticipation.run(ctx)
docTaxonomy.run(ctx)
snapshotsBudget.run(ctx)
barePath.run(ctx)
layoutBlock.run(ctx)
retiredPath.run(ctx)
navEnumeration.run(ctx)
navCountClaims.run(ctx)
pinCurrency.run(ctx)
scriptTriggers.run(ctx)
scriptStatus.run(ctx)
distManual.run(ctx)
scriptPort.run(ctx)
presets.run(ctx)
presetRequiredConfig.run(ctx)
claudeSymlink.run(ctx)
vendorPin.run(ctx)
packShape.run(ctx)
releaseReady.run(ctx)
presetRowDeps.run(ctx)
clientHalves.run(ctx)
proposals.run(ctx)
notesLiveness.run(ctx)
backlogLiveness.run(ctx)
replaySceneLiveness.run(ctx)
snapshotIndex.run(ctx)
guardRedRecord.run(ctx)
securityScan.run(ctx)
trackedToken.run(ctx)
trackedSecrets.run(ctx)
trackedPortability.run(ctx)
scriptIndex.run(ctx)
replayFixtureFreshness.run(ctx)
replayUiFreshness.run(ctx)
gateWiring.run(ctx)

console.log(failures.length === 0 ? '\nverify: ALL PASS' : `\nverify: ${failures.length} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
