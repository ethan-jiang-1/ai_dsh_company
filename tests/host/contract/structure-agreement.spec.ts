// 负例留证 2026-11-14：去掉 multilineSpanCloseLine 或把长围栏判据改为 `>= 3` ⇒ BUG-181 / seed=3 节起点差分红；去掉 prd-gate.ts 的 `replaceAll('\\', '/')` ⇒ seed=3 混合分隔符路径红；还原即绿。
/**
 * 跨层结构与 4 消费者契约差分（W3.1 / W3.2，2026-11-14）：
 * 1. `sectionRange` / `scanDocumentDetailed`（pack 原语）与 `repo-markdown.mjs`（`mdast` GFM 门禁原语）
 *    在 500 份组合语法文档上对 `## <标题>` 的定位一致（已声明 BUG-181 跨行反引号策略行除外）；
 * 2. 同一批生成/故障注入的交付物语料（`meta.md` + `mrd.md` + `prd.md` + 治理卡）同时喂给：
 *    ① `validateProductDocs`（`prd-check`）
 *    ② `checkRequirements`（`requirements-check`）
 *    ③ `gateToolCall`（`prd-gate`，含盘面真实读取与混合分隔符路径）
 *    ④ 门禁读卡原语（`repo-markdown` `sectionBody` / `parseFrontmatter` 与 `sectionStructuralText`）
 *    四者在接受/拒绝方向与豁免口径上零分叉。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gateToolCall } from '../../../packages/company-pack/src/host/commands/prd-gate'
import { readCompanyFileAt } from '../../../packages/company-pack/src/host/run-bundle/company-root'
import {
  scanDocumentDetailed,
  sectionRange,
  sectionStructuralText,
} from '../../../packages/company-pack/src/lib/markdown-shape'
import { validateProductDocs } from '../../../packages/company-pack/src/lib/prd-check'
import { checkRequirements } from '../../../packages/company-pack/src/lib/requirements-check'
import { headingSections, parseFrontmatter, sectionBody } from '../../../tools/lib/repo-markdown.mjs'
import { makeDeliverableBundle, makeDocDetailed } from '../../support/doc-grammar'

const CASES = Number(process.env.MARKDOWN_SHAPE_CASES ?? 500)
const BUNDLE_CASES = 84
const HEADINGS = ['修复证据', '验收', '决定', '其它', '状态事实与载体', '未覆盖轴'] as const

describe(`sectionRange × scanDocumentDetailed × repo-markdown（${String(CASES)} seeded docs）`, () => {
  it('pack 原语与 mdast 门禁原语选中的二级节起点一致（已声明 BUG-181 跨行反引号策略除外）', () => {
    for (let seed = 0; seed < CASES; seed += 1) {
      const generated = makeDocDetailed(seed)
      const scan = scanDocumentDetailed(generated.text)
      const astSections = headingSections(generated.text) as Array<{
        readonly depth: number
        readonly title: string
        readonly startLine: number
      }>
      const policySpanSet = new Set(generated.multilineSpanLines)

      for (const heading of HEADINGS) {
        const range = sectionRange(generated.text, heading, scan)
        const astMatch = astSections.find(
          section => section.depth === 2 && section.title === heading && !policySpanSet.has(section.startLine),
        )
        if (range === undefined) {
          expect(astMatch, `seed=${String(seed)} / ${heading}：pack 未命中但 mdast 命中`).toBeUndefined()
          continue
        }
        const line = scan.lines[range.start]
        expect(line?.structural, `seed=${String(seed)} / ${heading} 选中了非结构行`).toBe(true)
        expect(line?.text.trim(), `seed=${String(seed)} / ${heading} 行文本不命中`).toBe(`## ${heading}`)
        expect(range.start + 1, `seed=${String(seed)} / ${heading} 节起点行号与 mdast 不一致`).toBe(
          astMatch?.startLine,
        )
      }
    }
  })
})

describe(`4 消费者跨层契约差分（prd-check × requirements-check × prd-gate × 读卡原语，${String(BUNDLE_CASES)} 组）`, () => {
  it('同源有效语料与可控故障注入下 4 消费者结论严格同向，且混合分隔符与围栏噪声零误判', () => {
    const root = mkdtempSync(join(tmpdir(), 'four-consumer-'))
    try {
      for (let seed = 0; seed < BUNDLE_CASES; seed += 1) {
        const bundle = makeDeliverableBundle(seed)
        const ws = join(root, `ws-${String(seed)}`)
        const deliverableDir = join(ws, '.dsh-company', 'deliverables', bundle.slug)
        mkdirSync(join(deliverableDir, 'drafts'), { recursive: true })
        writeFileSync(join(deliverableDir, 'meta.md'), bundle.meta)
        writeFileSync(join(deliverableDir, 'drafts/mrd.md'), bundle.mrd)
        writeFileSync(join(deliverableDir, 'drafts/prd.md'), bundle.prd)
        writeFileSync(join(deliverableDir, 'final.md'), '# final\n')

        const presentPath = bundle.useBackslashPath
          ? `${ws}\\.dsh-company\\deliverables\\${bundle.slug}\\final.md`
          : `.dsh-company/deliverables/${bundle.slug}/final.md`

        const prdResult = validateProductDocs(bundle.mrd, bundle.prd)
        const reqResult = checkRequirements({
          meta: { rel: 'meta.md', text: bundle.meta },
          docs: [
            { rel: 'drafts/mrd.md', text: bundle.mrd },
            { rel: 'drafts/prd.md', text: bundle.prd },
          ],
        })
        const gateDecision = gateToolCall(
          {
            name: 'present',
            arguments: { files: [{ path: presentPath }] },
            cwd: ws,
          },
          { check: validateProductDocs, readFile: readCompanyFileAt },
        )

        const cardFm = parseFrontmatter(bundle.card) as { readonly present: boolean; readonly data: Record<string, unknown> | null }
        const cardBodyRepo = sectionBody(bundle.card, '修复证据', { structuralOnly: true }) ?? ''
        const cardBodyPack = sectionStructuralText(bundle.card, '修复证据') ?? ''

        // 围栏里的假证据字段在两套读卡出口中都必须被清空，绝不当真字段
        expect(cardBodyRepo, `seed=${String(seed)} repo-markdown 漏进了围栏假字段`).not.toContain('fake/fenced.ts')
        expect(cardBodyPack, `seed=${String(seed)} markdown-shape 漏进了围栏假字段`).not.toContain('fake/fenced.ts')
        expect(cardFm.present, `seed=${String(seed)} frontmatter 丢失`).toBe(true)

        if (bundle.fault === 'valid') {
          expect(prdResult.ok, `seed=${String(seed)} prd-check 误杀: ${prdResult.errors.join('; ')}`).toBe(true)
          expect(reqResult.ok, `seed=${String(seed)} req-check 误杀: ${reqResult.errors.join('; ')}`).toBe(true)
          expect(reqResult.skipped, `seed=${String(seed)} 新动议误走豁免`).toBe(false)
          expect(gateDecision, `seed=${String(seed)} prd-gate 误拦`).toBeUndefined()
          expect(cardBodyRepo).toContain('- 改动面：`packages/company-pack/src/lib/prd-check.ts`')
          expect(cardBodyPack).toContain('- 改动面：`packages/company-pack/src/lib/prd-check.ts`')
        } else if (bundle.fault === 'legacy-exempt') {
          // 围栏里的假 `numbering: identity` 不得把旧动议拉进强制编号检查
          expect(reqResult.skipped, `seed=${String(seed)} 旧动议围栏假 numbering 误触发检查`).toBe(true)
          expect(gateDecision, `seed=${String(seed)} 旧动议被 prd-gate 误拦`).toBeUndefined()
        } else if (bundle.fault === 'bad-numbering') {
          expect(reqResult.ok, `seed=${String(seed)} req-check 漏放坏 numbering`).toBe(false)
          expect(reqResult.skipped).toBe(false)
          expect(gateDecision?.kind, `seed=${String(seed)} prd-gate 漏放坏 numbering`).toBe('deny')
        } else {
          // dangling-mr / duplicate-req / unclosed-comment：三处交付校验消费者必须一致判红并拦截 present
          expect(prdResult.ok, `seed=${String(seed)} [${bundle.fault}] prd-check 漏放`).toBe(false)
          expect(reqResult.ok, `seed=${String(seed)} [${bundle.fault}] req-check 漏放`).toBe(false)
          expect(
            gateDecision?.kind,
            `seed=${String(seed)} [${bundle.fault}] prd-gate 漏放 (${presentPath})`,
          ).toBe('deny')
        }
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
