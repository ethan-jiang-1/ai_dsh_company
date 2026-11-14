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

  // 2. 顶层 ATX 标题（0..3 前导空格，1..4 级）
  const leadSpaces = ' '.repeat(Math.floor(random() * 4))
  lines.push(`${leadSpaces}# 文档样本 ${String(seed)}`, '')

  // 3. 顶层与嵌套围栏轴（3/4 反引号、3/4 波浪号、1..2 空格缩进、反引号信息串非围栏）
  const fenceVariant = Math.floor(random() * 5)
  if (fenceVariant === 0) {
    const indent = ' '.repeat(Math.floor(random() * 3))
    lines.push(
      `${indent}\`\`\`\`markdown`,
      `${indent}\`\`\`json`,
      `${indent}{"fake": ${String(seed)}}`,
      `${indent}\`\`\``,
      `${indent}## ${pick(SECTION_NAMES)}`,
      `${indent}- 改动面：\`fake/in-fence.ts\``,
      `${indent}| a | b |`,
      `${indent}|---|---|`,
      `${indent}| 1 | 2 |`,
      `${indent}\`\`\`\``,
      '',
    )
  } else if (fenceVariant === 1) {
    lines.push(
      '~~~~yaml',
      '```md',
      `## ${pick(SECTION_NAMES)}`,
      '```',
      '~~~',
      'still inside four-tilde fence',
      '~~~~',
      '',
    )
  } else if (fenceVariant === 2) {
    lines.push(' ```json', ` {"seed": ${String(seed)}, "ok": true}`, ' ```', '')
  } else if (fenceVariant === 3) {
    // CommonMark §4.5：反引号围栏信息串再含反引号 → 不是围栏，而是行内代码段落
    lines.push('```js `inline-not-a-fence` 尾部字面', '')
  }

  // 4. HTML 注释轴（单行注释吞尾标题、多行块注释、行内注释、行内字面 <!--）
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

  // 5. 转义字符与多反引号行内代码轴 + BUG-181 跨行反引号策略轴
  const escapeVariant = Math.floor(random() * 4)
  if (escapeVariant === 0) {
    lines.push(`\\# 转义井号不是标题 \`## 也不是\` \`\` \`双反引号内含<!--\` \`\``, '')
  } else if (escapeVariant === 1) {
    lines.push('\\`<!-- 转义反引号后字面注释记号', '')
  } else if (escapeVariant === 2) {
    // BUG-181：段落内跨行单/双反引号（闭合于同一段落内，无空行）
    const tick = random() < 0.5 ? '`' : '``'
    lines.push(`- 示例字段：${tick}跨行起点`)
    multilineSpanLines.push(lines.length + 1)
    lines.push(`## ${pick(SECTION_NAMES)}`)
    multilineSpanLines.push(lines.length + 1)
    lines.push(`### REQ-997 跨行代码假标题 ${tick} 尾部收口`)
    lines.push('')
  } else {
    lines.push('```inline triple backtick ## 非标题``` 普通正文', '')
  }

  // 6. 真实二级节 + GFM 转义表格轴
  const primaryHeading = pick(SECTION_NAMES)
  lines.push(`${' '.repeat(Math.floor(random() * 4))}## ${primaryHeading}`, '')
  lines.push(`- 改动面：\`packages/demo/file-${String(seed % 11)}.ts\``)
  lines.push('- 红：拆守卫 → `pnpm test` 失败')
  lines.push('- 绿：恢复守卫 → `pnpm test` 通过', '')

  if (random() < 0.75) {
    lines.push(
      '| 列A | 列B | 列C |',
      '| --- | :---: | ---: |',
      `| s-${String(seed % 5)} | a\\|b | ok |`,
      '| C:\\\\ | `x\\|y` | 尾\\\\ |',
      '| 奇数尾转义 | val\\| | 末列\\|',
      '',
    )
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
  | 'bad-numbering'
  | 'dangling-mr'
  | 'duplicate-req'
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
}

const FAULT_ROTATION: readonly BundleFault[] = [
  'valid',
  'valid',
  'legacy-exempt',
  'bad-numbering',
  'dangling-mr',
  'duplicate-req',
  'unclosed-comment',
]

/** 生成同源 4 消费者契约语料（meta + mrd + prd + 缺陷卡），带语法噪声与可控故障类。 */
export function makeDeliverableBundle(seed: number): GeneratedDeliverableBundle {
  const random = rng(seed + 10_000)
  const fault = FAULT_ROTATION[seed % FAULT_ROTATION.length] ?? 'valid'
  const slug = `2026-11-14-seed-${String(seed)}`
  const bom = random() < 0.4 ? '\uFEFF' : ''
  const useBackslashPath = random() < 0.5

  const metaLines: string[] = [`slug: ${slug}`, 'kickoff: 2026-11-14']
  if (fault === 'legacy-exempt') {
    metaLines.push('```md', 'numbering: identity', '```')
  } else if (fault === 'bad-numbering') {
    metaLines.push(random() < 0.5 ? 'numbering:' : 'numbering: legacy-v0')
  } else {
    metaLines.push('numbering: identity', 'layers: MRD, PRD')
  }

  const mrdJson = JSON.stringify({
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
    '## Slices',
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
    '### REQ-001 核心需求',
    '',
    '- userStory: 作为财务，我要支持 `<!--` 与跨行示例，以便稳定对账',
    '- acceptance:',
    '  - AC-001-1',
    '    - given: 有效账单',
    '    - when: 执行导入',
    '    - then: 结果一致',
    `- source: [${targetMr}]`,
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
  }
}
