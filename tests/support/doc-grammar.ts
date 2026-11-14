/**
 * 组合式 Markdown 与交付物语法生成器（W3.1 / W3.2，2026-11-14）。
 *
 * 只生成字符串与独立语法标注（如 BUG-181 声明的跨行 code span 行号），不 import pack；
 * seed 固定 → 文档与故障注入类别固定。`markdown-shape.property`、`structure-agreement`
 * 与 4 消费者差分契约共用同一生成器。
 */
export function rng(seed: number): () => number {
  let state = (seed ^ 0x9e3779b9) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GeneratedDoc {
  readonly text: string
  /** 1-based 归一化行号：属于 BUG-181 段落内跨行反引号（故意与纯 CommonMark 分叉为非结构行）。 */
  readonly multilineSpanLines: readonly number[]
  readonly hasUnclosedBlockComment: boolean
  readonly hasUnclosedFence: boolean
}

const SECTION_NAMES = ['修复证据', '验收', '决定', '其它', '状态事实与载体', '未覆盖轴'] as const

function joinWithRandomEol(lines: readonly string[], random: () => number): string {
  const mode = Math.floor(random() * 4)
  if (mode === 0) return lines.join('\n')
  if (mode === 1) return lines.join('\r\n')
  if (mode === 2) return lines.join('\r')
  let out = ''
  let prevSep = ''
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index] ?? ''
    out += current
    if (index + 1 < lines.length) {
      const pick = Math.floor(random() * 3)
      // 若上一分隔符是孤立 `\r` 且本行为空串，再拼 `\n` 会在字节流层面合并成单个 `\r\n` 吞掉空行
      const sep = prevSep === '\r' && current === ''
        ? '\r'
        : pick === 0 ? '\n' : pick === 1 ? '\r\n' : '\r'
      out += sep
      prevSep = sep
    }
  }
  return out
}

function buildCombinatorialTable(random: () => number, seed: number): string[] {
  const colCount = 2 + Math.floor(random() * 4) // 2..5 列
  const rowCount = 2 + Math.floor(random() * 3) // 2..4 数据行
  const alignments = ['---', ':---', ':---:', '---:'] as const
  const headers = Array.from({ length: colCount }, (_, col) => `列${String(col + 1)}`)
  const seps = Array.from({ length: colCount }, () => alignments[Math.floor(random() * alignments.length)] ?? '---')
  const out = [`| ${headers.join(' | ')} |`, `| ${seps.join(' | ')} |`]

  const rawCellTemplates = [
    (r: number, c: number) => `v-${String(seed % 7)}-${String(r)}${String(c)}`,
    () => 'a\\|b',
    () => '左\\|中\\|右',
    () => 'C:\\\\',
    () => '奇\\\\\\|偶',
    () => '`x\\|y`',
    () => '',
    () => '尾\\\\',
  ] as const

  for (let row = 0; row < rowCount; row += 1) {
    const rowMode = Math.floor(random() * 3)
    if (rowMode === 0) {
      // 紧邻分隔符模式（如 `| adj\\| next |` 与行尾 `末\\|`）：专测 `\\` 后紧跟真列分隔 `|`
      const pieces = Array.from({ length: colCount }, (_, col) => {
        if (col === 0) return `adj-${String(row)}\\\\`
        if (col === colCount - 1) return '末\\\\'
        return rawCellTemplates[(seed + row + col) % rawCellTemplates.length]!(row, col)
      })
      out.push(`| ${pieces.join('| ')}|`)
    } else if (rowMode === 1) {
      // 无闭合尾竖线 + 末列转义竖线 `末列\|`
      const pieces = Array.from({ length: colCount }, (_, col) =>
        col === colCount - 1
          ? `末列-${String(row)}\\|`
          : rawCellTemplates[Math.floor(random() * rawCellTemplates.length)]!(row, col),
      )
      out.push(`| ${pieces.join(' | ')}`)
    } else {
      const pieces = Array.from({ length: colCount }, (_, col) =>
        rawCellTemplates[Math.floor(random() * rawCellTemplates.length)]!(row, col),
      )
      out.push(`| ${pieces.join(' | ')} |`)
    }
  }
  return out
}

/** 生成覆盖全语法轴的 Markdown 文档及独立元数据。 */
export function makeDocDetailed(seed: number): GeneratedDoc {
  const random = rng(seed)
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(random() * values.length)] as T
  const lines: string[] = []
  const multilineSpanLines: number[] = []
  let hasUnclosedBlockComment = false
  let hasUnclosedFence = false

  // 1. Frontmatter 轴：无 / 标准 / 紧凑无键值（非 frontmatter）
  const fmMode = Math.floor(random() * 4)
  if (fmMode === 1) {
    lines.push('---', `status: ${pick(['已修', '待落地', '已结'])}`, `opened: 2026-11-${String(10 + (seed % 19)).padStart(2, '0')}`, '---', '')
  } else if (fmMode === 2) {
    lines.push('---', 'layer: PRD', 'definition: headings', '---', '')
  } else if (fmMode === 3) {
    lines.push('---', '---', '')
  }

  // 2. 顶层 ATX 标题与前导空格轴（0..3 空格 = 真标题；4..6 空格 = CommonMark §4.4 缩进代码块或段落惰性续行）
  const leadSpaces = ' '.repeat(Math.floor(random() * 4))
  const hDepth = 1 + Math.floor(random() * 2)
  lines.push(`${leadSpaces}${'#'.repeat(hDepth)} 文档样本 ${String(seed)}`, '')

  const indentAxis = Math.floor(random() * 3)
  if (indentAxis === 0) {
    // 4..6 前导空格缩进代码块（含假标题、假围栏、假 REQ）
    const codePad = ' '.repeat(4 + Math.floor(random() * 3))
    lines.push(
      `${codePad}## ${pick(SECTION_NAMES)}`,
      `${codePad}### REQ-995 缩进代码块假需求`,
      `${codePad}\`\`\`json`,
      `${codePad}{"indented": true}`,
      `${codePad}\`\`\``,
      '',
    )
  } else if (indentAxis === 1) {
    // 段落后紧跟 4..6 空格惰性续行（CommonMark 归入同一段落，既非缩进代码块也非标题）
    const lazyPad = ' '.repeat(4 + Math.floor(random() * 3))
    lines.push('普通段落首行', `${lazyPad}## ${pick(SECTION_NAMES)} 惰性续行不构成标题`, '')
  }

  // 3. 顶层与嵌套围栏轴（3/4/5 反引号、3/4/5 波浪号、0..3 空格缩进、反引号信息串非围栏）
  const fenceVariant = Math.floor(random() * 5)
  if (fenceVariant === 0) {
    const indent = ' '.repeat(Math.floor(random() * 4))
    const outerLen = 4 + Math.floor(random() * 2)
    const outer = '`'.repeat(outerLen)
    lines.push(
      `${indent}${outer}markdown`,
      `${indent}\`\`\`json`,
      `${indent}{"fake": ${String(seed)}}`,
      `${indent}\`\`\``,
      `${indent}## ${pick(SECTION_NAMES)}`,
      `${indent}- 改动面：\`fake/in-fence.ts\``,
      `${indent}| a | b |`,
      `${indent}|---|---|`,
      `${indent}| 1 | 2 |`,
      `${indent}${outer}`,
      '',
    )
  } else if (fenceVariant === 1) {
    const outerTilde = '~'.repeat(4 + Math.floor(random() * 2))
    lines.push(
      `${outerTilde}yaml`,
      '```md',
      `## ${pick(SECTION_NAMES)}`,
      '```',
      '~~~',
      'still inside outer tilde fence',
      outerTilde,
      '',
    )
  } else if (fenceVariant === 2) {
    const indent = ' '.repeat(Math.floor(random() * 4))
    lines.push(`${indent}\`\`\`json`, `${indent}{"seed": ${String(seed)}, "ok": true}`, `${indent}\`\`\``, '')
  } else if (fenceVariant === 3) {
    // CommonMark §4.5：反引号围栏信息串再含反引号 → 不是围栏，而是行内代码段落
    lines.push('```js `inline-not-a-fence` 尾部字面', '')
  }

  // 4. HTML 注释轴（单行注释吞尾标题、多行块注释、行内注释、跨行行内注释、行内字面 <!--）
  const commentVariant = Math.floor(random() * 5)
  if (commentVariant === 0) {
    lines.push(`<!-- 单行注释 --> ## ${pick(SECTION_NAMES)}`, '')
  } else if (commentVariant === 1) {
    lines.push('  <!--', `## ${pick(SECTION_NAMES)}`, '### REQ-998 注释内假需求', '| x | y |', '-->', '')
  } else if (commentVariant === 2) {
    lines.push(`段落前缀 <!-- 同行行内注释 --> 段落后缀 \`<!--\` 字面。`, '')
  } else if (commentVariant === 3) {
    lines.push('段落前缀 <!-- 跨行行内注释', '普通续行', `--> ## ${pick(SECTION_NAMES)}`, '')
  } else {
    lines.push('段落把 <!-- 当未闭合字面示例（后跟空行不吞标题）', '')
  }

  // 5. 转义字符（奇偶反斜杠紧邻反引号 + 次行真标题）与 BUG-181 跨行反引号策略轴
  const escapeVariant = Math.floor(random() * 5)
  if (escapeVariant === 0) {
    lines.push(`\\# 转义井号不是标题 \`## 也不是\` \`\` \`双反引号内含<!--\` \`\``, '')
  } else if (escapeVariant === 1) {
    // 奇数反斜杠转义反引号：不开启跨行 code span，次行 `## <节>` 必须保持结构态真标题
    lines.push(
      '前缀 \\` 字面转义反引号（非跨行起点）',
      `## ${pick(SECTION_NAMES)}`,
      '后缀 \\` 另一个转义反引号',
      '',
    )
  } else if (escapeVariant === 2) {
    // 偶数反斜杠 + 未转义反引号（或裸未转义反引号）：开启 BUG-181 段落内跨行 code span
    const tick = random() < 0.5 ? '`' : '``'
    const evenSlashes = random() < 0.5 ? '\\\\' : ''
    lines.push(`- 示例字段：${evenSlashes}${tick}跨行起点`)
    multilineSpanLines.push(lines.length + 1)
    lines.push(`## ${pick(SECTION_NAMES)}`)
    multilineSpanLines.push(lines.length + 1)
    lines.push(`### REQ-997 跨行代码假标题 ${tick} 尾部收口`)
    lines.push('')
  } else if (escapeVariant === 3) {
    lines.push('\\`<!-- 转义反引号后字面注释记号', '')
  } else {
    lines.push('```inline triple backtick ## 非标题``` 普通正文', '')
  }

  // 6. 真实二级节 + 组合式 GFM 转义表格轴（2..5 列 × 2..4 行 × 奇偶反斜杠紧邻分隔符）
  const primaryHeading = pick(SECTION_NAMES)
  lines.push(`${' '.repeat(Math.floor(random() * 4))}## ${primaryHeading}`, '')
  lines.push(`- 改动面：\`packages/demo/file-${String(seed % 11)}.ts\``)
  lines.push('- 红：拆守卫 → `pnpm test` 失败')
  lines.push('- 绿：恢复守卫 → `pnpm test` 通过', '')

  if (random() < 0.85) {
    lines.push(...buildCombinatorialTable(random, seed), '')
  }

  const secondaryHeading = SECTION_NAMES[(SECTION_NAMES.indexOf(primaryHeading) + 2) % SECTION_NAMES.length] ?? '验收'
  lines.push(`## ${secondaryHeading}`, '', `### 子节 ${String(seed % 17)}`, '', '收尾正文。')

  // 7. 尾部未闭合容器轴（互斥注入未闭合围栏或未闭合块注释）
  const tailMode = Math.floor(random() * 8)
  if (tailMode === 0) {
    hasUnclosedFence = true
    lines.push('', '```markdown', `## ${pick(SECTION_NAMES)}`, '- 改动面：`unclosed.ts`')
  } else if (tailMode === 1) {
    hasUnclosedBlockComment = true
    lines.push('', '<!-- 尾部未闭合块注释', `## ${pick(SECTION_NAMES)}`)
  }

  const bom = random() < 0.35 ? '\uFEFF' : ''
  return {
    text: bom + joinWithRandomEol(lines, random),
    multilineSpanLines,
    hasUnclosedBlockComment,
    hasUnclosedFence,
  }
}

/** 生成单份测试文档字符串。 */
export function makeDoc(seed: number): string {
  return makeDocDetailed(seed).text
}

export type BundleFault =
  | 'valid'
  | 'legacy-exempt'
  | 'missing-field'
  | 'bad-numbering'
  | 'dangling-mr'
  | 'duplicate-req'
  | 'bad-ledger'
  | 'bad-path'
  | 'unclosed-comment'

export interface GeneratedDeliverableBundle {
  readonly seed: number
  readonly slug: string
  readonly fault: BundleFault
  readonly meta: string
  readonly mrd: string
  readonly prd: string
  readonly card: string
  readonly useBackslashPath: boolean
  readonly badPathVariant: 'symlink-inside' | 'symlink-prefix' | 'trailing-dotdot'
}

const FAULT_ROTATION: readonly BundleFault[] = [
  'valid',
  'legacy-exempt',
  'missing-field',
  'bad-numbering',
  'dangling-mr',
  'duplicate-req',
  'bad-ledger',
  'bad-path',
  'unclosed-comment',
]

/** 生成同源 4 消费者契约语料（meta + mrd + prd + 缺陷卡），带语法噪声与可控故障类。 */
export function makeDeliverableBundle(seed: number): GeneratedDeliverableBundle {
  const random = rng(seed + 10_000)
  const fault = FAULT_ROTATION[seed % FAULT_ROTATION.length] ?? 'valid'
  const slug = `2026-11-14-seed-${String(seed)}`
  const bom = random() < 0.4 ? '\uFEFF' : ''
  const useBackslashPath = random() < 0.5
  const badPathVariants = ['symlink-inside', 'symlink-prefix', 'trailing-dotdot'] as const
  const badPathVariant = badPathVariants[Math.floor(random() * badPathVariants.length)] ?? 'symlink-inside'

  const metaLines: string[] = [`slug: ${slug}`, 'kickoff: 2026-11-14']
  if (fault === 'legacy-exempt') {
    metaLines.push('```md', 'numbering: identity', '```')
  } else if (fault === 'bad-numbering') {
    metaLines.push(random() < 0.5 ? 'numbering:' : 'numbering: legacy-v0')
  } else {
    metaLines.push('numbering: identity', 'layers: MRD, PRD')
  }

  const mrdJson = fault === 'bad-ledger'
    ? (random() < 0.5
      ? '{"mrd":{"opportunities":[BROKEN_JSON}}'
      : JSON.stringify({
        mrd: {
          version: '0.1',
          status: 'draft',
          opportunities: [{ id: 'MR-BAD', title: '坏编号', segment: 's', pain: 'p', evidence: [{ kind: 'fact', source: 'x' }], recommendation: 'go' }],
        },
      }))
    : JSON.stringify({
      mrd: {
        version: '0.1',
        status: 'draft',
        opportunities: [
          {
            id: 'MR-001',
            title: `自动化对账-${String(seed)}`,
            segment: '财务团队',
            pain: '手工核对慢',
            evidence: [{ kind: 'fact', source: '客户访谈' }],
            recommendation: 'go',
          },
        ],
      },
    }, null, 2)

  const mrdLines = [
    '---',
    'layer: MRD',
    'definition: json-ledger',
    '---',
    '',
    '# MRD',
    '',
    '````markdown',
    '```json',
    '{"mrd":{"opportunities":[{"id":"MR-999","title":"示例假账本","recommendation":"no-go"}]}}',
    '```',
    '````',
    '',
    '```json',
    mrdJson,
    '```',
  ]

  const targetMr = fault === 'dangling-mr' ? 'MR-999' : 'MR-001'
  const leadHeadingSpaces = ' '.repeat(Math.floor(random() * 4)) // 0..3 前导空格真标题
  const prdLines = [
    '---',
    'layer: PRD',
    'definition: headings',
    '---',
    '',
    '# PRD',
    '',
    '<!--',
    '## Slices',
    '| S9 | 注释假切片 | REQ-999 | no |',
    '### REQ-999 注释假需求',
    '-->',
    '',
    `${leadHeadingSpaces}## Slices`,
    '',
    '| slice | Goal | Requirements (explicit ids) | Exit condition |',
    '|---|---|---|---|',
    `| S1 | 端到端 \\| 主链路 ${String(seed)} | REQ-001 | 全绿 |`,
    '',
    '## Requirements (definition point)',
    '',
    '````md',
    '### REQ-998 围栏假需求',
    '- source: [MR-888]',
    '````',
    '',
    '    ### REQ-996 缩进代码块假需求（4 空格）',
    '    - source: [MR-888]',
    '',
    `${leadHeadingSpaces}### REQ-001 核心需求`,
    '',
    '- userStory: 作为财务，我要支持 `<!--` 与跨行示例，以便稳定对账',
    '- acceptance:',
    '  - AC-001-1',
    '    - given: 有效账单',
    '    - when: 执行导入',
    '    - then: 结果一致',
    ...(fault === 'missing-field' ? [] : [`- source: [${targetMr}]`]),
    '- slice: S1',
    '- type: functional',
    '- priority: P0',
    '- status: draft',
    '- verification: test',
    '- dependsOn: []',
    '- openQuestions: []',
    '- changeLog: []',
  ]

  if (fault === 'duplicate-req') {
    prdLines.push(
      '',
      '### REQ-001 重复定义号',
      '- userStory: 重复号',
      '- acceptance:',
      '  - AC-001-2',
      '    - given: g',
      '    - when: w',
      '    - then: t',
      '- source: [MR-001]',
      '- slice: S1',
      '- type: functional',
      '- priority: P1',
      '- status: draft',
      '- verification: test',
    )
  }
  if (fault === 'unclosed-comment') {
    prdLines.push('', '<!-- 未闭合尾部注释', '### REQ-777 被吞')
  }

  const cardLines = [
    '---',
    `status: ${fault === 'valid' ? '已修' : '修复就绪'}`,
    'opened: 2026-11-14',
    '---',
    '',
    `# 缺陷样本 ${String(seed)}`,
    '',
    '## 修复证据',
    '',
    '```markdown',
    '- 改动面：`fake/fenced.ts`',
    '- 红：假红',
    '- 绿：假绿',
    '```',
    '',
    ...(fault === 'valid'
      ? [
        '- 改动面：`packages/company-pack/src/lib/prd-check.ts`',
        '- 红：注入坏 MR → `pnpm vitest run tests/lib/prd-check.spec.ts` 失败',
        '- 绿：恢复 MR → `pnpm vitest run tests/lib/prd-check.spec.ts` 通过',
      ]
      : ['（正文尚未填写结构化证据字段）']),
  ]

  return {
    seed,
    slug,
    fault,
    meta: (random() < 0.4 ? '\uFEFF' : '') + joinWithRandomEol(metaLines, random),
    mrd: bom + joinWithRandomEol(mrdLines, random),
    prd: (random() < 0.5 ? '\uFEFF' : '') + joinWithRandomEol(prdLines, random),
    card: (random() < 0.3 ? '\uFEFF' : '') + joinWithRandomEol(cardLines, random),
    useBackslashPath,
    badPathVariant,
  }
}
