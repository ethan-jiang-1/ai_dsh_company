// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 块内自洽：NOW_FILES/WARN_FILES/TOP_DIRS/RUNTIME_PREFIXES/RETIRED_PATHS/FIXTURE_PATH/
// NOTES_CURRENCY_EFFECTIVE_DATE + scanBarePaths + 计数器住本文件（2026-10-14 拆分轮整体搬入，
// 不改语义）；layout-block / retired-path / pin-currency 三道门禁 import 共享常量。
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// ── 2d. 裸路径门禁（notebook-hygiene §机械防线，2026-09-25；2026-09-26 扩面）─────────
// 负例留证 2026-09-27：公司手册反引号死路径 → bare-path 红（⚠ 负例要真破坏子串——includes 是子串匹配）。
// 负例留证 2026-10-09（N5 生效日分档）：`notes/implemented/2099-01-01-x.md` 内写死路径 → 红（见 N5 Note 验证表）。
// **N5 事实落点时效（currency）生效日**：文件名日期 ≥ 此日的 implemented/ Note 进入硬档——里面的
// 仓库裸路径必须指到现行家（DSH `.agents/notes/implemented/AGENTS.md`："Keep paths, symbols, defaults,
// and mechanisms current in the same change that alters them"）。此日之前的存量祖父豁免（历史负债，
// 清理是独立一轮）。选 2026-10-09 = 本政策落地日，此后新写/改动的 Note 一律受约束。
const NOTES_CURRENCY_EFFECTIVE_DATE = '2026-10-09'
// 为什么：活指针腐化有复发史（AGENTS 写 `notes/rejected/` 而目录不存在；升 pin 后旧机制引用漂移）。
// md-links 门禁只管 Markdown 链接，管不到反引号里的裸路径。
// **2026-09-26 扩面**（技术债清扫 B 组）：原范围只有导航五文件，而腐化实际长在 docs/design、
// docs/guides、notes/*.md、各 README 里（architecture 引了两条 0.1.7 拆包后已成空壳的 vendor 路径，
// budget-and-ops 引的 workflow-worker-thread 同样成空壳）——门禁边界与叙述边界不重合 = 盲区。
// 同时收窄匹配器，避免扩面后自带假阳性：跳过 `{a,b}` 花括号展开，剥掉 `path:12-34` 的引文行号后缀。
export const NOW_FILES = (() => {
  const out = ['AGENTS.md', 'README.md', 'ROADMAP.md', 'company-workspace/AGENTS.md',
    'snapshots/README.md', 'runtime/README.md', 'runtime/harness-home/README.md', 'packages/company-pack/README.md',
    'packages/company-pack/src/README.md'].filter(f => existsSync(join(root, f)))
  const walkMd = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd(path)
    return entry.name.endsWith('.md') ? [path.slice(root.length + 1)] : []
  })
  // `company-workspace/**` 也纳入（2026-09-26 补盲区）：它是**随每个成员会话注入**的事实面，
  // 里面的活指针腐化代价更高；而此前它不在扫描面内——实测本仓刚在那里留下一处死指针
  // （台账指向不存在的快照 README），三条门禁全都没抓到。
  // ⚠ 边界与 `markdown-links.mjs` 一致：**排除 `deliverables(-archive)/` 与 `journal/`**——那是公司
  // *产出物与记忆*（正文里出现 `packages/company-pack/...` 之类是业务叙述，不是仓库指针），
  // 拿仓库指针判据去扫它们必出假阳性（实测扩面第一跑即误报一份 final.md）。
  // `tests/**` 也纳入 pin-currency 的扫描面（2026-09-26 补）：夹具里的 pin 字面量同样会漂，
  // 实测全仓 tests/ 只有一处且等于当前 pin ⇒ 纳入零成本。
  return out.concat(
    walkMd(join(root, 'tests')),
    walkMd(join(root, 'docs')),
    // `notes/**` 分**两档**（2026-09-26 补盲区 + 分档；2026-10-09 N5 **重新划线**）：
    // · **硬档**（`proposed/` + `implemented/` + `_backlog/` 活跃推敲卡）= **活文档**——fresh agent 会照着它去干活；
    // · **观察档**（`postmortem/` + 明确冻结的 `_backlog/_archive/`）= **记录当时事实**的档案，只提醒不判红。
    //
    // ⚠ 2026-10-09 把 `implemented/` 从观察档移入硬档（N5 修复）。原注释说「改它就是篡改记录」，**这句是错的**：
    //   vendor `.agents/notes/implemented/AGENTS.md` 明文区分两件事——
    //     "Keep paths, symbols, defaults, and mechanisms current in the same change that alters them.
    //      Rewrite stale facts in place; do not append change history." +
    //     "**This is not a license to rewrite the *decision*** … A reversal of the decision or its rationale
    //      requires a new Agent Note and cross-link."
    //   即：**决定的正文不动**（改了要新 Note + 交叉链接），**事实的落点（路径/符号/默认值）要就地改新**。
    //   我们此前把这两件事一起冻住，等于把"当时的路径"当成了决定的一部分。
    // 实测代价（2026-10-09，同一把尺子）：本仓 574 处仓库裸路径提及里 **122 处（21.3%）盘上不存在**，
    //   52/135 个文件（38.5%）至少含一处死指针；vendor 自己的 implemented 树是 9/247（3.6%）与 7/527（1.3%）。
    //   **6 倍差距不是"历史必然"，是这条政策造出来的**——死了 6 倍，说明它一直在批量生产误导。
    // 反面证据（那条"36/39 是 vendor 上游改名"的观察）：只对**vendor 内部**路径成立。本仓自己的树
    //   （`notes/research`→退役、`snapshots/r2-motion`→重定位、`tests/*.spec.ts`→改名）是**本仓改名**造成的，
    //   改指针到现行家成本极低，没有任何"篡改记录"问题。指向 vendor 的路径若上游已删，写清"上游 X 版已删"
    //   或引向现行家即可，同样不是篡改——**篡改是把当时的结论改成另一套，不是把门牌号改成新的**。
    // 例外（仍是观察档）：`postmortem/` = 事故故事，DSH 语料明说它是**唯一**该有 war-story narrative 的层；
    //   `_backlog/_archive/` = 明确冻结且不是任务源（dev-loop §0.5）。
    // 此前只扫 `notes/` 直接子文件（`p.split('/').length === 2`）⇒ `proposed/` 与 `implemented/` 全在面外。
    walkMd(join(root, 'notes/proposed')),
    // ⚠ `notes/implemented/` 分**生效日两档**（2026-10-09 N5）——不能整棵拉进硬档：
    //   DSH 规矩是**前瞻性**的（"in the same change that alters them"），只管**改动发生的那一刻起**。
    //   生效日之前的存量是历史负债，一次性全判红会逼出一场 122 处的大清理，而不是建立一条会自己维持的规矩。
    //   （与 notes-liveness 同款口径：存量祖父豁免、新写从严。存量清理是独立一轮的事，见 N5 Note「未做」。）
    ...walkMd(join(root, 'notes/implemented')).filter(p => {
      const m = /\/(\d{4}-\d{2}-\d{2})-/.exec(p)
      return m !== null && m[1] >= NOTES_CURRENCY_EFFECTIVE_DATE
    }),
    walkMd(join(root, '_backlog')).filter(p => !p.startsWith('_backlog/_archive/')),
    walkMd(join(root, 'company-workspace')).filter(p => !/^company-workspace\/(deliverables|deliverables-archive|kb\/[^/]+\/journal)\//.test(p)),
  )
})()
/** Historical bare receipts are observed; rendered Markdown navigation still uses the hard link gate. */
// 2026-10-05：_backlog/_archive 明确冻结且不是任务源（dev-loop §0.5），其历史裸命令不能按活指针改写。
// 不豁免活跃 issues/bugs/research/methods，也不豁免这些历史文件的 Markdown 导航目标。
/** 观察档 = 事故故事与冻结归档：`notes/postmortem/`（DSH 语料：唯一该有 war-story narrative 的层）+
 *  明确冻结的 `_backlog/_archive/`；保留当时裸路径并提醒。
 *  ⚠ 2026-10-09 起 **`notes/implemented/` 不在此列**（N5）：它受「随改动就地更新事实落点」约束，见上方硬档注释。 */
const WARN_FILES = (() => {
  const walkMd = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd(path)
    return entry.name.endsWith('.md') ? [path.slice(root.length + 1)] : []
  })
  return [...walkMd(join(root, 'notes/postmortem')), ...walkMd(join(root, '_backlog/_archive'))]
})()
const TOP_DIRS = ['notes/', 'docs/', 'checks/', 'probes/', 'tools/', 'packages/', 'snapshots/', 'run/', 'runtime/', 'tests/', 'company-workspace/', 'vendor/', '_backlog/']   // 2026-10-10 补 '_backlog/'：NOW_FILES 本就含 _backlog 活跃卡，此前漏它 = 扫描面内一半路径从未被存在性检查（retired-path 门禁同轮立的同源盲区）
export const RUNTIME_PREFIXES = ['runtime/harness-home', 'runtime/harness-home-b', 'runtime/rehearsal-workspace', 'runtime/pw-browsers', '.pnpm-store']   // gitignored 运行态（2026-10-06 条目 A：dev/ 拆分，运行残留随迁顶层 runtime/）
// 双树查：本仓根 **或** vendor/dsh 命中即过（AGENTS 纪律表的"权威（vendor 树）"列合法使用 vendor 相对写法）。
// 白名单 = 历史性退役路径的叙述性提及（自带"现迁至…"说明的历史段）。
// `notes/implemented/2026-09-22-org-presence-board.md` = 2026-10-09 存量清扫迁 archived/ 的退役位置；
// 二轮审计研究笔记逐字引用该断链现场（自带现迁说明）——按本机制放行（2026-10-21）。
export const RETIRED_PATHS = new Set(['docs/plans/roadmap.md', 'notes/implemented/2026-09-22-org-presence-board.md'])
// 负例自重（2026-10-09 N5 立）：**故意写出来给人复现的假路径**，与「腐化指针」形状完全相同，静态扫描
// 分不开（实测：N5 生效后头两条命中就是我自己 Note 里描述负例用的 `docs/zz-tmp-unregistered.md`）。
// 约定 = 假路径里带 `zz-`/`zzz-`（本仓从未有过以 zz 开头的真实路径；见命名自带"这是测试值"的语义）。
// 为什么要放行而不能改措辞绕开：负例必须**逐字可复现**——把路径写成 `docs/zz‑tmp…`（换字符）或
// 「某个不存在的 docs 文件」就复现不了了。天真的做法是让作者改文风，正确做法是给假路径一个可判别的记号。
export const FIXTURE_PATH = /(^|\/)zz+-/
let barePathCount = 0
let plainNotesCount = 0
let barePathBad = false
const barePathWarn = []
/** 扫一批文件的反引号裸路径；hit 回调决定"判红"还是"记观察"。 */
const scanBarePaths = (files, hit) => {
  for (const rel of files) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/`([^`\n]+)`/g)) {
        let raw = m[1].replace(/^\.\//, '').replace(/\/+$/, '')
        if (!TOP_DIRS.some(d => `${raw}/`.startsWith(d))) continue
        if (/[*<>…{}]/.test(raw) || raw.includes(' ')) continue          // 通配/占位/花括号展开/命令行不是路径
        raw = raw.replace(/:\d+(?:-\d+)?$/, '')                          // 引文行号不是路径的一部分
        if (RUNTIME_PREFIXES.some(p => raw.startsWith(p))) continue
        if (FIXTURE_PATH.test(raw)) continue                             // 负例假路径（见上）
        barePathCount++
        // 双树查的**例外**（2026-10-10 补盲区，entry-probe 语义审实测）：raw 已带 `vendor/` 前缀时
        // **不再**往 `vendor/dsh/` 下重挂——否则 `vendor/README.md` 会命中 `vendor/dsh/vendor/README.md`
        // （Cordis 自己的 vendoring manifest，语义完全不同的另一个文件）而判绿。实测本仓纪律表正是
        // 靠这条重挂藏了一处死指针（`vendor/README.md` 本仓根本不存在），三条门禁全绿放过。
        // 双树查仍保留：纪律表"权威（vendor 树）"列合法地写 vendor 相对写法（如 `packages/todo`）。
        const inSubmodule = raw.startsWith('vendor/') ? false : existsSync(join(root, 'vendor/dsh', raw))
        if (!existsSync(join(root, raw)) && !inSubmodule && !RETIRED_PATHS.has(raw)) {
          hit(`${rel}:${i + 1}`, raw)
        }
      }
    })
  }
}

// ── 纯文本 notes/ 引用档（2026-10-21 立，六维度第二轮 Phase A）─────────────────────
// 为什么：budget-and-ops.md:41 曾以**纯文本**写「见 notes/implemented/2026-09-22-org-presence-board.md」
// （无反引号、非链接）——该 note 2026-10-09 已迁 archived/，反引号档（只扫 `…`）与 md-links（只扫链接）
// **双双失明**，断链存活到 2026-10-20 二轮审计（D4 实锤之一）。规则：活文档里
// notes/<生命周期>/<文件>.md 的纯文本提及必须指到现行家；引原句做证据的写法用反引号（= 逐字引用标记）。
// 负例留证 2026-10-21：本档出生红 = budget-and-ops.md:41 纯文本指已迁档的 org-presence-board（真断链，
// 非构造——D4 审计实锤即负例）；修复后绿（×计数见 ok 行）。zz- 假路径约定沿用 FIXTURE_PATH。
const PLAIN_NOTES_FILE = /notes\/(?:implemented|archived|proposed|rejected|postmortem)\/[A-Za-z0-9._-]+\.md/g
const scanPlainNotes = (files, fail) => {
  for (const rel of files) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      // 剥掉反引号段与 Markdown 链接目标——它们归反引号档 / md-links 管，不双计。
      const stripped = line.replace(/`[^`\n]+`/g, '').replace(/\]\([^)\n]*\)/g, '')
      for (const m of stripped.matchAll(PLAIN_NOTES_FILE)) {
        const raw = m[0].replace(/:\d+(?:-\d+)?$/, '')
        if (FIXTURE_PATH.test(raw)) continue
        plainNotesCount++
        if (!existsSync(join(root, raw)) && !RETIRED_PATHS.has(raw)) {
          fail(`${rel}:${i + 1}`, raw)
        }
      }
    })
  }
}

export function run({ root, ok, fail }) {
scanBarePaths(NOW_FILES, (where, raw) => {
  barePathBad = true
  fail('bare-path', `${where} → \`${raw}\` 不存在（双树均无——活指针腐化：改指针到现行家）`)
})
scanPlainNotes(NOW_FILES, (where, raw) => {
  barePathBad = true
  fail('bare-path', `${where} → 纯文本 ${raw} 不存在（notes 引用三选一：Markdown 链接〔md-links 管〕/ 反引号〔反引号档管〕/ 指到现行家）`)
})
scanBarePaths(WARN_FILES, (where, raw) => { barePathWarn.push(`${where} → \`${raw}\``) })
if (!barePathBad) {
  ok(`bare-path ×${barePathCount}（${NOW_FILES.length} 文件反引号裸路径存在性）+ 纯文本 notes 引用 ×${plainNotesCount}；另观察档 ${WARN_FILES.length} 文件`)
  if (barePathWarn.length > 0) {
    console.log(`  观察项 ${barePathWarn.length} 条（观察档 = \`notes/postmortem/**\` 与 \`_backlog/_archive/**\`：`
      + '记录**当时**事实的档案，里面引的路径当时是对的——**改它就是篡改记录**，故只提醒不判红）：')
    for (const w of barePathWarn) console.log(`    ${w}`)
  }
}
}
