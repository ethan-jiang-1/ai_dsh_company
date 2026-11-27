// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；改动受预算管的文档或本门禁后跑 pnpm test:checks。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c. UTF-8 字节预算与反单行正文墙（2026-11-27 自物理行数切换为 UTF-8 字节）────
// 为什么：中文文档用物理行数当预算会反噬出单行 500–800 字的横排压缩密文（违背 vendor
// `docs/AGENTS.md` 词数预算原意与禁 Paragraph walls 规范）。
// 规则：
//   ① 按 `Buffer.byteLength(text, 'utf8')` 计费（`DOC_BYTE_BUDGETS`），保留 DSH ≥5% headroom
//      （`docs/` 适用，`docs/reference/` 豁免）与 >20% 反向棘轮（防上限长期悬空）；
//   ② `AGENTS.md` 与 `docs/**/*.md` 非代码块、非 GFM 表格的正文行不得超过 350 字符（按语义拆段/列表）。
// ⚠ 注释里不复述当前字节数——实测值由每次跑出的 PASS 行给出。
// 负例留证 2026-11-27（实地造红→还原→绿）：
//   ① 临时调低 docs/guides/orient.md 字节上限 → `FAIL doc-budget: docs/guides/orient.md … 字节超上限 …`；还原 → 绿。
//   ② 临时调高 docs/guides/orient.md 字节上限 >20% → `FAIL doc-budget: docs/guides/orient.md … 空置 >20%…`；还原 → 绿。
//   ③ 临时在 docs/guides/orient.md 追加 380 字单行正文 → `FAIL doc-budget: docs/guides/orient.md:… 单行正文 380 字符超上限 350…`；还原 → 绿。
export const SLACK_FLOOR = 0.2
export const HEADROOM_FLOOR = 0.05
export const MAX_PROSE_LINE_CHARS = 350

export const DOC_BYTE_BUDGETS = [
  ['notes/AGENTS.md', 1152],
  ['notes/implemented/AGENTS.md', 704],
  ['notes/archived/AGENTS.md', 640],
  ['_backlog/bugs/AGENTS.md', 1216],
  ['_backlog/_archive/fixed_bugs/AGENTS.md', 1152],
  ['tests/AGENTS.md', 960],
  ['AGENTS.md', 13440],
  ['docs/README.md', 7168],
  ['docs/AGENTS.md', 6400],
  ['docs/architecture.md', 8448],
  ['docs/policy.md', 15232],
  ['docs/testing.md', 11136],
  ['docs/contracts/client-ui.md', 6656],
  ['docs/contracts/content-charter.md', 6912],
  ['docs/contracts/cultivation.md', 8064],
  ['docs/contracts/data-model.md', 6272],
  ['docs/contracts/delegation.md', 12544],
  ['docs/contracts/demo.md', 4096],
  ['docs/contracts/host-and-lib.md', 5760],
  ['docs/contracts/multi-human.md', 7808],
  ['docs/contracts/presets.md', 16128],
  ['docs/contracts/profile.md', 8320],
  ['docs/contracts/release.md', 14848],
  ['docs/contracts/repo-hygiene.md', 6528],
  ['docs/guides/bootstrap.md', 15488],
  ['docs/guides/cdp-probe.md', 7680],
  ['docs/guides/demo-scenes.md', 22912],
  ['docs/guides/dev-loop.md', 11776],
  ['docs/guides/dev-product-parity.md', 4608],
  ['docs/guides/multi-human-runbook.md', 14208],
  ['docs/guides/orient.md', 5120],
  ['docs/guides/product-definition.md', 5888],
  ['docs/guides/publish-handoff.md', 5760],
  ['docs/guides/quality-loop.md', 7424],
  ['docs/guides/release-runbook.md', 4864],
  ['docs/guides/repo-handoff.md', 4608],
  ['docs/guides/run-ops.md', 13184],
  ['docs/guides/web-rpc.md', 3328],
  ['docs/reference/external.md', 9472],
  ['docs/reference/glossary.md', 3712],
  ['docs/reference/surface-exceptions.md', 1280],
  ['packages/company-pack/content/AGENTS.md', 4736],
  ['checks/README.md', 7936],
  ['tests/README.md', 20864],
  ['README.md', 7680],
  ['_backlog/README.md', 22016],
  ['notes/README.md', 17536],
  ['packages/company-pack/README.md', 21760],
]

/** 扫描非代码块、非 GFM 表格的超宽正文单行（防把多条规则塞进单行压缩墙）。 */
export function proseWallHits(text, maxChars = MAX_PROSE_LINE_CHARS) {
  const hits = []
  let inFence = false
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence || /^\s*\|/.test(line)) continue
    if (line.length > maxChars) {
      hits.push({ line: i + 1, length: line.length })
    }
  }
  return hits
}

export function run({ root, ok, fail, budgets = DOC_BYTE_BUDGETS }) {
  for (const [rel, cap] of budgets) {
    if (!existsSync(join(root, rel))) {
      fail('doc-budget', `${rel} 不在盘上——受预算管的常驻文档不许消失（内容该搬去哪就搬，文件本身留着）`)
      continue
    }
    const text = readFileSync(join(root, rel), 'utf8')
    const bytes = Buffer.byteLength(text, 'utf8')
    const proseCheck = rel === 'AGENTS.md' || rel.startsWith('docs/')
    const walls = proseCheck ? proseWallHits(text) : []
    if (walls.length > 0) {
      const first = walls[0]
      fail('doc-budget', `${rel}:${String(first.line)} 单行正文 ${String(first.length)} 字符超上限 ${String(MAX_PROSE_LINE_CHARS)}（禁止单行压缩正文墙，请按语义拆段或列表）`)
      continue
    }
    if (bytes > cap) {
      fail('doc-budget', `${rel} ${String(bytes)}B 超上限 ${String(cap)}B（先搬内容到该去的家，再压；不直接提额）`)
    } else if (rel.startsWith('docs/') && !rel.startsWith('docs/reference/') && bytes > Math.floor(cap * (1 - HEADROOM_FLOOR))) {
      fail('doc-budget', `${rel} ${String(bytes)}/${String(cap)}B，headroom <5%（DSH 目标内留白；先搬/压，不提额）`)
    } else if (bytes < Math.ceil(cap * (1 - SLACK_FLOOR))) {
      fail('doc-budget', `${rel} ${String(bytes)}B 只占上限 ${String(cap)}B 的 ${String(Math.round((bytes / cap) * 100))}%（空置 >${String(Math.round(SLACK_FLOOR * 100))}%：按现行内容下调上限，或 Note 论证保留）`)
    } else {
      ok(`doc-budget ${rel} (${String(bytes)}/${String(cap)}B)`)
    }
  }
}
