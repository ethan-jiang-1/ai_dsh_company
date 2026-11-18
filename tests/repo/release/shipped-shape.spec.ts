import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'
import { EXPECTED_PATCH, REQUIRED_SHIPPED, checkShippedPackage, checkSourceShape, freshnessProblem, packageRootOf, platformModules, sanitizePackage, scrubDevPaths, staleFlagProblem, stripComments } from '../../../tools/lib/release/shipped-shape.mjs'
import { CONTENT_VERSION } from '../../../tools/lib/company/content-contract.mjs'
import { devBuildFingerprint, packageSourceFiles, releasePipelineFiles, releasePipelineFingerprint, sourceFingerprint } from '../../../tools/lib/core/pack-source.mjs'

// 负例留证 2026-11-17：类型面植入内部 .d.ts，checker 红（BUG-213）；删除 → 绿。
// 负例留证 2026-11-17：manifest 植入 scripts.prepack，checker 红（BUG-214）；删除 → 绿。
// 负例留证 2026-11-17：README 植入出包相对链接，checker 红（BUG-215）；删除 → 绿。
// 负例留证 2026-11-17：cordis 注释植入 tests 路径，checker 红（BUG-216）；加「不随包」→ 绿。
// 负例留证 2026-11-17：移除 primitives 的 inject/peer，checker 红（BUG-217）；接回 → 绿。
// 负例留证 2026-11-17：README 把 pnpm 写成运行时前置，checker 红（BUG-218）；补安装器诊断 → 绿。
// 负例留证 2026-11-17：manifest 植入 workspace devDeps，checker 红（BUG-219）；删除 → 绿。
// 负例留证 2026-11-17：bundle 植入 sourceMappingURL，checker 红（BUG-220）；剥注释 → 绿。
// 负例留证 2026-11-17：inject 植入未 require 的幽灵边，checker 红（BUG-221）；删除 → 绿。
// 负例留证 2026-11-17：platform 移除 react，checker 红（BUG-222）；接回 → 绿。
// 负例留证 2026-11-18：删 content/presets 条目，files glob 红（BUG-223）；接回 → 绿。
// 负例留证 2026-11-18：content 写 dev 路径，TEXT_FACE 红（BUG-224）；加「不随包」→ 绿。
// 负例留证 2026-11-18：cordis 写目录级 tests 路径，DEV_DIR 红（BUG-225）；删除 → 绿。
// 负例留证 2026-11-18：dsh.bundle.patch 指向不存在的 preset，红（BUG-226）；接回 → 绿。
// 负例留证 2026-11-18：manifest sourceFingerprint 与当前源码不一致，freshness 红（BUG-227）；prepare 后 → 绿。
// 负例留证 2026-11-18：README.shipped 写未限定 dev 路径，source shape 红（BUG-228）；改回 → 绿。
// 负例留证 2026-11-18：删 content/templates/prd.md，checker 红（BUG-233）；接回 → 绿。
// 负例留证 2026-11-18：patch 裁到 6 条/空 preset，checker 红（BUG-234）；接回 → 绿。
// 负例留证 2026-11-18：dev README 在指纹内，改它指纹变（BUG-235）；移出后 → 不变。
// 负例留证 2026-11-18：裸 --allow-stale，staleFlagProblem 红（BUG-236）；带 =理由 → 绿。
// 负例留证 2026-11-18：空 charter/非法 manifest，checker 红（BUG-237）；接回 → 绿。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-243）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-244）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-245）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-246）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-247）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-248）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-249）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-250）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-251）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-252）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-253）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-254）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-255）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-256）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-257）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-258）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-259）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-260）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-261）。
// 负例留证 2026-11-18：C16 合成/真实输入负例（BUG-262）。

/**
 * shipped package 形状的判据（C13：BUG-213..222）。
 *
 * 这组卡不是十个独立补丁：tarball 是仓库树的子集，`files`/manifest/README/注释/client 声明各自
 * 手写。这里用合成 package 逐条钉住 sanitizer/checker 的拒绝分支，真实 tarball 由
 * `pnpm release:shape` 判。
 *
 * 负例留证 2026-11-17：合成 fixture 逐条植入 → 对应 describe/it 红；删掉植入侵入 → 绿。
 */
const PLATFORM = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  'zod', '@tanstack/react-virtual', '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const README = [
  '# dsh-company-pack',
  '',
  '安装：DSH Plugins → Add plugin，或 `dsh plugin add dsh-company-pack`。',
  'DSH 插件安装器使用 pnpm；缺 pnpm 时 CLI 打印 `dsh: pnpm was not found; install pnpm and make it available on PATH.`。',
  'react / react-jsx-runtime 由 web platform baseline 提供。',
  '',
].join('\n')

/** delivery-rules 在 fixture 里引用的模板名（按交付模式固定，fixture 会建同名文件）。 */
function deliveryTemplate(rel: string): string {
  return rel.includes('managed-service') ? 'sla' : 'sow'
}

/** 合成关键件 JSON 的最小合法形状（与 checker 的 schema/跨引用判据同步）。 */
function requiredJson(rel: string): string {
  if (rel.includes('delivery-rules.json')) {
    const mode = rel.includes('managed-service') ? 'managed-service' : 'project-services'
    return JSON.stringify({
      deliveryMode: mode,
      kind: 'delivery',
      entry: 'overview.md',
      documents: { DOC: { file: `drafts/${deliveryTemplate(rel)}.md`, owner: 'COO', template: `templates/${deliveryTemplate(rel)}.md` } },
    })
  }
  if (rel.endsWith('seed.json')) return JSON.stringify({ seeds: [{ source: 'state/company.md', target: '.dsh-company/kb/company.md' }] })
  if (rel.endsWith('check-rules.json')) return JSON.stringify({ productType: 'x', layers: ['MRD'], files: { MRD: 'mrd.md' } })
  return '{"tiers":{}}'
}

function fixture(overrides: { pkg?: Record<string, unknown>; entries?: string[]; texts?: Record<string, string>; platformModules?: string[] } = {}) {
  const pkg = {
    name: 'dsh-company-pack',
    version: '0.0.0',
    main: 'lib/index.js',
    exports: {
      '.': { types: './lib/types/index.d.ts', default: './lib/index.js' },
      './client': { types: './lib/types/client/index.d.ts', default: './lib/client.js' },
      './locale/*.json': './locale/*.json',
    },
    files: [
      'lib/index.js', 'lib/client.js', 'lib/types/index.d.ts', 'lib/types/client/index.d.ts',
      'lib/types/host/cultivation/cultivation.d.ts',
      'presets/**', 'locale/*.json', 'cordis.patch.yml', 'content/**', 'LICENSE',
    ],
    peerDependencies: { '@deepseek-ai/dsh-client-ui-primitives': '^0.2.1-rc.2' },
    dsh: { bundle: { patch: EXPECTED_PATCH }, client: { inject: ['@deepseek-ai/dsh-client-ui-primitives'], platform: 'web' } },
    ...overrides.pkg,
  }
  // delivery-rules 的 entry/template 是**被引用就存在**：fixture 按规则文件建同名件（BUG-269 判据的前提）。
  const deliveryExtras = REQUIRED_SHIPPED
    .filter(rel => /^content\/delivery-modes\/.*\/delivery-rules\.json$/.test(rel))
    .flatMap(rel => {
      const dir = rel.slice('content/'.length).replace(/\/delivery-rules\.json$/, '')
      return [`package/content/${dir}/overview.md`, `package/content/${dir}/document-map.md`, `package/content/${dir}/templates/${deliveryTemplate(rel)}.md`]
    })
  const entries = overrides.entries ?? [
    'package/package.json', 'package/lib/index.js', 'package/lib/client.js',
    'package/lib/types/index.d.ts', 'package/lib/types/client/index.d.ts',
    'package/lib/types/host/cultivation/cultivation.d.ts',
    'package/LICENSE', 'package/README.md', 'package/cordis.patch.yml',
    ...REQUIRED_SHIPPED.map(rel => `package/${rel}`),
    ...EXPECTED_PATCH.map(rel => `package/${rel.replace(/^\.\//, '')}`),
    ...deliveryExtras,
  ]
  const contentInventory = entries
    .filter(entry => entry.startsWith('package/content/'))
    .map(entry => entry.slice('package/content/'.length))
    .filter(rel => rel !== 'manifest.json')
    .sort()
  const requiredTexts = Object.fromEntries(REQUIRED_SHIPPED.map(rel => [
    `package/${rel}`,
    rel.endsWith('.json') ? `${requiredJson(rel)}\n` : '# x\n',
  ]))
  for (const entry of deliveryExtras) requiredTexts[entry as keyof typeof requiredTexts] = '# x\n'
  requiredTexts['package/content/manifest.json'] = `${JSON.stringify({ version: CONTENT_VERSION, tiers: {}, inventory: contentInventory })}\n`
  const presetTexts = Object.fromEntries(EXPECTED_PATCH.filter(rel => rel.includes('presets/')).map(rel => [
    `package/${rel.replace(/^\.\//, '')}`,
    'id: x\n',
  ]))
  const texts = {
    ...requiredTexts,
    ...presetTexts,
    'package/lib/index.js': 'export const x = 1\n',
    'package/lib/client.js': 'require("react")\nrequire("react/jsx-runtime")\nrequire("@deepseek-ai/dsh-client-ui-primitives")\n',
    'package/lib/types/index.d.ts': "import type { CultivationHostConfig } from './host/cultivation/cultivation.js'\nexport declare const x: CultivationHostConfig\n",
    'package/lib/types/client/index.d.ts': 'export declare const y: number\n',
    'package/lib/types/host/cultivation/cultivation.d.ts': 'export interface CultivationHostConfig { readonly cultivationRoot?: string }\n',
    'package/README.md': README,
    'package/cordis.patch.yml': '# runtime note\n',
    'package/content/AGENTS.md': '# handbook\n',
    'package/presets/ceo/agent.cordis.yml': 'id: ceo\n',
    'package/LICENSE': 'MIT\n',
    ...overrides.texts,
  }
  return { pkg, entries, read: (entry: string) => texts[entry as keyof typeof texts] ?? '', platformModules: overrides.platformModules ?? PLATFORM }
}

/** 一个「包里有、清单里没有」的 content 文件 → checker 必须红（双向对账缺的一侧）。 */
function guardUnlisted(rel: string): boolean {
  const base = fixture()
  const contentRel = rel.replace(/^content\//, '')
  const entry = `package/content/${contentRel}`
  const entries = [...base.entries, entry]
  const read = (path: string) => path === entry ? '# x\n' : base.read(path)
  return checkShippedPackage({ ...base, entries, read }).some(problem => problem.includes('未登记的 content 文件'))
}

describe('shipped package 形状判据（C13）', () => {
  it('干净 fixture 通过（正例）', () => {
    expect(checkShippedPackage(fixture())).toEqual([])
  })

  it('类型面只留 exports 闭包（BUG-213）', () => {
    const extra = fixture({ entries: [...fixture().entries, 'package/lib/types/lib/internal.d.ts'] })
    expect(checkShippedPackage(extra).some(problem => problem.startsWith('types:'))).toBe(true)
    // 入口 .d.ts 的相对 import 必须带 .js（消费方按 .js→.d.ts 解析），且目标必须在包里
    const tsSpecifier = fixture({ texts: { 'package/lib/types/index.d.ts': "import type { X } from './host/cultivation/cultivation.ts'\n" } })
    expect(checkShippedPackage(tsSpecifier).some(problem => problem.includes('.ts 后缀'))).toBe(true)
    const missingTarget = fixture({ texts: { 'package/lib/types/index.d.ts': "import type { X } from './host/cultivation/missing.js'\n" } })
    expect(checkShippedPackage(missingTarget).some(problem => problem.includes('不在 tarball'))).toBe(true)
  })

  it('manifest 不保留 prepack/scripts（BUG-214）', () => {
    const input = fixture({ pkg: { scripts: { prepack: 'node scripts/prepack-check.mjs' } } })
    expect(checkShippedPackage(input).some(problem => problem.includes('scripts'))).toBe(true)
  })

  it('README 相对链接不得出包（BUG-215）', () => {
    const input = fixture({ texts: { 'package/README.md': `${README}[data](../../docs/contracts/data-model.md)\n` } })
    expect(checkShippedPackage(input).some(problem => problem.startsWith('README: 相对链接'))).toBe(true)
  })

  it('shipped 文本里的 dev 路径必须带「不随包」（BUG-216）', () => {
    const bad = fixture({ texts: { 'package/cordis.patch.yml': '# tests/repo/x.spec.ts\n' } })
    expect(checkShippedPackage(bad).some(problem => problem.includes('dev 路径'))).toBe(true)
    const good = fixture({ texts: { 'package/cordis.patch.yml': '# tests/repo/x.spec.ts（不随包）\n' } })
    expect(checkShippedPackage(good)).toEqual([])
  })

  it('client 实际 require 的 package row 必须进 inject/peer（BUG-217）', () => {
    const input = fixture({ pkg: { dsh: { client: { inject: [], platform: 'web' } }, peerDependencies: {} } })
    const problems = checkShippedPackage(input)
    expect(problems.some(problem => problem.includes('缺 @deepseek-ai/dsh-client-ui-primitives'))).toBe(true)
    expect(problems.some(problem => problem.includes('peerDependencies'))).toBe(true)
  })

  it('README 提 pnpm 必须给安装入口与 DSH 诊断（BUG-218）', () => {
    const input = fixture({ texts: { 'package/README.md': '# x\n\npnpm 需在 PATH。\n' } })
    const problems = checkShippedPackage(input)
    expect(problems.some(problem => problem.includes('dsh plugin add'))).toBe(true)
    expect(problems.some(problem => problem.includes('缺包管理器诊断'))).toBe(true)
  })

  it('manifest 不得带 devDependencies/workspace 协议（BUG-219）', () => {
    const input = fixture({ pkg: { devDependencies: { '@deepseek-ai/x': 'workspace:*' } } })
    const problems = checkShippedPackage(input)
    expect(problems.some(problem => problem.includes('devDependencies'))).toBe(true)
    expect(problems.some(problem => problem.includes('workspace:'))).toBe(true)
  })

  it('bundle 不得留 sourceMappingURL 而没有 map（BUG-220）', () => {
    const input = fixture({ texts: { 'package/lib/index.js': 'export const x = 1\n//# sourceMappingURL=index.js.map\n' } })
    expect(checkShippedPackage(input).some(problem => problem.includes('sourceMappingURL'))).toBe(true)
  })

  it('inject 不得有未 require 的幽灵边（BUG-221）', () => {
    const input = fixture({
      pkg: { dsh: { client: { inject: ['@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-sidebar'], platform: 'web' } } },
    })
    expect(checkShippedPackage(input).some(problem => problem.includes('幽灵边'))).toBe(true)
  })

  it('bundle 的 react 必须在 vendor PLATFORM_MODULES（BUG-222）', () => {
    const input = fixture({ platformModules: PLATFORM.filter(item => item !== 'react') })
    expect(checkShippedPackage(input).some(problem => problem.includes('react'))).toBe(true)
  })
  it('files 的 glob 和 content/presets 关键件必须命中（BUG-223）', () => {
    const missing = fixture({ entries: fixture().entries.filter(entry => !entry.startsWith('package/content/') && !entry.startsWith('package/presets/')) })
    expect(checkShippedPackage(missing).some(problem => problem.includes('files glob'))).toBe(true)
  })

  it('TEXT_FACE 覆盖 content 的 dev 路径（BUG-224）', () => {
    const input = fixture({ texts: { 'package/content/AGENTS.md': 'see tests/x.spec.ts\n' } })
    expect(checkShippedPackage(input).some(problem => problem.includes('dev 路径'))).toBe(true)
  })

  it('运行时关键件（templates/contracts/methods）缺失也红（BUG-233）', () => {
    const missing = fixture({ entries: fixture().entries.filter(entry => entry !== 'package/content/templates/prd.md') })
    expect(checkShippedPackage(missing).some(problem => problem.includes('templates/prd.md'))).toBe(true)
  })

  it('patch 集合必须含六角色 + 五 support（BUG-234）', () => {
    const trimmed = fixture({ pkg: { dsh: { bundle: { patch: EXPECTED_PATCH.slice(0, 6) }, client: { inject: ['@deepseek-ai/dsh-client-ui-primitives'], platform: 'web' } } } })
    expect(checkShippedPackage(trimmed).some(problem => problem.includes('缺组合目标'))).toBe(true)
  })

  it('关键件存在但不可读也红（BUG-237 边界）', () => {
    const base = fixture()
    const unreadable = checkShippedPackage({ ...base, read: entry => {
      if (entry === 'package/locale/en.json') throw new Error('EACCES')
      return base.read(entry)
    } })
    expect(unreadable.some(problem => problem.includes('不可读'))).toBe(true)
    const textUnreadable = checkShippedPackage({ ...base, read: entry => {
      if (entry === 'package/content/AGENTS.md') throw new Error('EACCES')
      return base.read(entry)
    } })
    expect(textUnreadable.some(problem => problem.includes('content/AGENTS.md: 不可读'))).toBe(true)
  })

  it('组合目标存在但为空也红（BUG-234/237）', () => {
    const empty = fixture({ texts: { 'package/presets/ceo/agent.cordis.yml': '   \n' } })
    expect(checkShippedPackage(empty).some(problem => problem.includes('组合目标为空'))).toBe(true)
  })

  it('组合目标存在但不可读也红（BUG-234 边界）', () => {
    const base = fixture()
    const unreadable = checkShippedPackage({ ...base, read: entry => {
      if (entry === 'package/presets/ceo/agent.cordis.yml') throw new Error('EACCES')
      return base.read(entry)
    } })
    expect(unreadable.some(problem => problem.includes('组合目标不可读'))).toBe(true)
  })

  it('关键件存在但为空/非法 JSON 也红（BUG-237）', () => {
    const empty = fixture({ texts: { 'package/content/charters/ceo.md': '  \n' } })
    expect(checkShippedPackage(empty).some(problem => problem.includes('关键运行时件为空'))).toBe(true)
    const badJson = fixture({ texts: { 'package/content/manifest.json': 'not json\n' } })
    expect(checkShippedPackage(badJson).some(problem => problem.includes('不是合法 JSON'))).toBe(true)
  })

  it('content inventory 缺文件也红（BUG-261）', () => {
    const base = fixture()
    const entries = base.entries.filter(entry => entry !== 'package/content/templates/prd.md')
    const read = (entry: string) => entry === 'package/content/templates/prd.md' ? '' : base.read(entry)
    expect(checkShippedPackage({ ...base, entries, read }).some(problem => problem.includes('inventory 缺文件'))).toBe(true)
  })

  // 随包 content 文件必须在 inventory（双向对账缺的一侧）——每张卡各自的守卫（标题带字面 BUG 号）。
  it('随包 content 文件：product-types 文档面必须在 inventory（BUG-245）', () => {
    expect(guardUnlisted('content/product-types/business-software/document-map.md')).toBe(true)
  })

  it('随包 content 文件：delivery-modes 文档必须在 inventory（BUG-246）', () => {
    expect(guardUnlisted('content/delivery-modes/project-services/glossary.md')).toBe(true)
  })

  it('随包 content 文件：templates 全家族必须在 inventory（BUG-247）', () => {
    expect(guardUnlisted('content/templates/strs.md')).toBe(true)
  })

  it('随包 content 文件：README 也必须在 inventory（BUG-244）', () => {
    expect(guardUnlisted('content/README.md')).toBe(true)
  })

  it('delivery-modes 模板缺文件红（BUG-246）', () => {
    const base = fixture()
    const entry = 'package/content/delivery-modes/project-services/templates/sow.md'
    const entries = base.entries.filter(item => item !== entry)
    expect(checkShippedPackage({ ...base, entries }).some(problem => problem.includes('inventory 缺文件'))).toBe(true)
  })

  it('delivery-rules 空对象 schema 红（BUG-248）', () => {
    const emptyRules = fixture({ texts: { 'package/content/delivery-modes/managed-service/delivery-rules.json': '{}\n' } })
    expect(checkShippedPackage(emptyRules).some(problem => problem.includes('delivery-rules 缺'))).toBe(true)
  })

  it('seed 空对象 schema 红（BUG-249）', () => {
    const emptySeed = fixture({ texts: { 'package/content/kb-setup/seed.json': '{}\n' } })
    expect(checkShippedPackage(emptySeed).some(problem => problem.includes('seed 缺'))).toBe(true)
  })

  it('preset 坏 YAML / 空组合目标红（BUG-250）', () => {
    const badYaml = fixture({ texts: { 'package/presets/ceo/agent.cordis.yml': 'not: [valid\n' } })
    expect(checkShippedPackage(badYaml).some(problem => problem.includes('YAML'))).toBe(true)
  })

  it('tier 引用不在 inventory 红（BUG-262）', () => {
    const base = fixture()
    const bad = JSON.stringify({ tiers: { t2: ['generic/missing.md'] }, inventory: JSON.parse(base.read('package/content/manifest.json')).inventory })
    const input = { ...base, read: (entry: string) => entry === 'package/content/manifest.json' ? bad : base.read(entry) }
    expect(checkShippedPackage(input).some(problem => problem.includes('tier t2 引用不在 inventory'))).toBe(true)
  })

  it('content/locale 关键件缺失也红（BUG-223 sentinel）', () => {
    const missing = fixture({ entries: fixture().entries.filter(entry => entry !== 'package/content/charters/ceo.md' && entry !== 'package/locale/en.json') })
    const problems = checkShippedPackage(missing)
    expect(problems.some(problem => problem.includes('charters/ceo.md'))).toBe(true)
    expect(problems.some(problem => problem.includes('locale/en.json'))).toBe(true)
  })

  it('DEV_DIR 归一化 ../ 与尾斜杠后再命中白名单（BUG-225）', () => {
    const input = fixture({ texts: { 'package/cordis.patch.yml': '# ../tools/pre-execute/ / tools/pre-execute/ / ../tests/simulation/samples\n' } })
    expect(checkShippedPackage(input)).toEqual([])
  })
  it('无扩展名目录级 dev 路径也判，通用词白名单不误杀（BUG-225）', () => {
    const input = fixture({ texts: { 'package/cordis.patch.yml': '# see tests/host/cultivation/ for evidence\n' } })
    expect(checkShippedPackage(input).some(problem => problem.includes('dev 路径'))).toBe(true)
    const allowed = fixture({ texts: { 'package/cordis.patch.yml': '# tools/pre-execute / tools/skills / tests/simulation/samples\n' } })
    expect(checkShippedPackage(allowed)).toEqual([])
  })

  it('dsh.bundle.patch 的每个目标必须在 tarball（BUG-226）', () => {
    const input = fixture({ pkg: { dsh: { bundle: { patch: ['./presets/ceo/missing.yml'] }, client: { inject: ['@deepseek-ai/dsh-client-ui-primitives'], platform: 'web' } } } })
    expect(checkShippedPackage(input).some(problem => problem.includes('dsh.bundle.patch'))).toBe(true)
  })

  it('README.shipped 进入源码指纹，dev README 不进（BUG-235）', () => {
    const base = mkdtempSync(join(tmpdir(), 'fingerprint-'))
    writeFileSync(join(base, 'package.json'), '{}\n')
    const before = sourceFingerprint(base)
    expect(packageSourceFiles(base)).not.toContain('README.shipped.md')
    writeFileSync(join(base, 'README.md'), '# dev\n')
    expect(sourceFingerprint(base)).toBe(before)
    writeFileSync(join(base, 'README.shipped.md'), '# shipped\n')
    expect(packageSourceFiles(base)).toContain('README.shipped.md')
    expect(sourceFingerprint(base)).not.toBe(before)
    rmSync(base, { recursive: true, force: true })
  })
  it('pipelineFingerprint 变化 → freshness 红（BUG-243）', () => {
    expect(freshnessProblem({ manifest: { sourceFingerprint: 'a', pipelineFingerprint: 'old' }, currentFingerprint: 'a', currentPipeline: 'new' })).toContain('pipelineFingerprint')
  })

  it('--allow-stale 的 sha 必须是 HEAD/manifest 前缀（BUG-253）', () => {
    expect(staleFlagProblem({ args: ['--allow-stale=deadbee:test'], head: '1990fcc3aaaa' })).toContain('前缀')
    expect(staleFlagProblem({ args: ['--allow-stale=1990fcc3:test'], head: '1990fcc3aaaa' })).toBeUndefined()
  })

  it('--allow-stale 必须带理由且 CI 禁止（BUG-236）', () => {
    expect(staleFlagProblem({ args: [] })).toBeUndefined()
    expect(staleFlagProblem({ args: ['--allow-stale'] })).toContain('理由')
    expect(staleFlagProblem({ args: ['--allow-stale='] })).toContain('理由')
    expect(staleFlagProblem({ args: ['--allow-stale=test'] })).toContain('sha')
    expect(staleFlagProblem({ args: ['--allow-stale=1990fcc3:test'], head: '1990fcc3aaaa' })).toBeUndefined()
    expect(staleFlagProblem({ args: ['--allow-stale=deadbee:test'], head: '1990fcc3aaaa' })).toContain('前缀')
    expect(staleFlagProblem({ args: ['--allow-stale=1990fcc3:test'], ci: true })).toContain('CI')
  })

  it('freshness 认 sourceFingerprint + pipelineFingerprint；gitSha 落后不误红（BUG-227/243）', () => {
    expect(freshnessProblem({ manifest: { sourceFingerprint: 'a', pipelineFingerprint: 'p', gitSha: 'old' }, currentFingerprint: 'b', currentPipeline: 'p' })).toContain('sourceFingerprint')
    expect(freshnessProblem({ manifest: { sourceFingerprint: 'a', pipelineFingerprint: 'p', gitSha: 'old' }, currentFingerprint: 'a', currentPipeline: 'p' })).toBeUndefined()
    expect(freshnessProblem({ manifest: { sourceFingerprint: 'a', pipelineFingerprint: 'old', gitSha: 'old' }, currentFingerprint: 'a', currentPipeline: 'new' })).toContain('pipelineFingerprint')
  })

  it('glob 分支（**、*、?）与字面 files 缺失都判（BUG-223）', () => {
    const missingLiteral = fixture({ pkg: { files: [...fixture().pkg.files, 'missing.txt'] } })
    expect(checkShippedPackage(missingLiteral).some(problem => problem.includes('missing.txt'))).toBe(true)
    const weirdGlob = fixture({ pkg: { files: ['content/**/missing.md', 'lib/?.js', 'lib/types/**', 'x?y'] } })
    const problems = checkShippedPackage(weirdGlob)
    expect(problems.some(problem => problem.includes('files glob'))).toBe(true)
    expect(problems.some(problem => problem.includes('lib/types/**'))).toBe(true)
  })

  it('exports 目标缺失、.map 随包、client 未知 external 都判', () => {
    const missingExport = fixture({ pkg: { exports: { '.': { default: './lib/missing.js' } } } })
    expect(checkShippedPackage(missingExport).some(problem => problem.includes('exports:'))).toBe(true)
    const maps = fixture({ entries: [...fixture().entries, 'package/lib/index.js.map'] })
    expect(checkShippedPackage(maps).some(problem => problem.includes('.map'))).toBe(true)
    const unknown = fixture({ texts: { 'package/lib/client.js': 'require("lodash")\n' } })
    expect(checkShippedPackage(unknown).some(problem => problem.includes('lodash'))).toBe(true)
  })

  it('README 相对链接（存在/缺失）与 source shape 负例', () => {
    const linked = fixture({ texts: { 'package/README.md': `${README}[license](./LICENSE)\n[bad](../x.md)\n[home](https://example.com)\n` } })
    const problems = checkShippedPackage(linked)
    expect(problems.some(problem => problem.includes('../x.md'))).toBe(true)
    expect(problems.every(problem => !problem.includes('./LICENSE'))).toBe(true)
    const missing = freshnessProblem({ currentFingerprint: 'a' })
    expect(missing).toContain('release-manifest')
  })

  it('platformModules 读 vendor 表；缺声明块抛错', () => {
    const base = mkdtempSync(join(tmpdir(), 'platform-'))
    mkdirSync(join(base, 'vendor/dsh/packages/client/web/src'), { recursive: true })
    writeFileSync(join(base, 'vendor/dsh/packages/client/web/src/platform.ts'), "export const PLATFORM_MODULES = ['react', 'zod'] as const\n")
    expect(platformModules(base)).toEqual(['react', 'zod'])
    writeFileSync(join(base, 'vendor/dsh/packages/client/web/src/platform.ts'), 'export const OTHER = []\n')
    expect(() => platformModules(base)).toThrow(/PLATFORM_MODULES/)
    rmSync(base, { recursive: true, force: true })
  })

  it('source shape 正例：关键件/链接/pnpm/patch 全在（BUG-228）', () => {
    const base = mkdtempSync(join(tmpdir(), 'source-shape-ok-'))
    const write = (rel: string, text: string) => { mkdirSync(join(base, rel, '..'), { recursive: true }); writeFileSync(join(base, rel), text) }
    write('package.json', `${JSON.stringify({ dsh: { bundle: { patch: EXPECTED_PATCH } }, files: ['content/**', 'presets/**', 'locale/*.json', 'LICENSE'] })}\n`)
    write('README.shipped.md', '# x\n\n[home](https://example.com)\ndsh plugin add\ndsh: pnpm was not found; install pnpm and make it available on PATH.\n')
    const deliveryRefs = REQUIRED_SHIPPED
      .filter(rel => /^content\/delivery-modes\/.*\/delivery-rules\.json$/.test(rel))
      .flatMap(rel => {
        const dir = rel.slice('content/'.length).replace(/\/delivery-rules\.json$/, '')
        return [`content/${dir}/overview.md`, `content/${dir}/document-map.md`, `content/${dir}/templates/${deliveryTemplate(rel)}.md`]
      })
    const sourceContent = [...REQUIRED_SHIPPED.filter(rel => rel.startsWith('content/')), ...deliveryRefs]
      .map(rel => rel.slice('content/'.length)).filter(rel => rel !== 'manifest.json').sort()
    for (const rel of [...REQUIRED_SHIPPED, ...deliveryRefs, ...EXPECTED_PATCH.map(item => item.replace(/^\.\//, '')), 'LICENSE']) {
      write(rel, rel === 'content/manifest.json'
        ? `${JSON.stringify({ version: CONTENT_VERSION, tiers: {}, inventory: sourceContent })}\n`
        : rel.endsWith('.json') ? `${requiredJson(rel)}\n`
          : rel.startsWith('presets/') ? 'id: x\n' : '# x\n')
    }
    expect(checkSourceShape({ packDir: base })).toEqual([])
    write('README.shipped.md', '# x\n\npnpm methods:init\n')
    // 合成 pack 没有仓库根 package.json：脚本表由调用方给（真实入口从磁盘派生）。
    expect(checkSourceShape({ packDir: base, devScripts: ['methods:init'] }).some(problem => problem.includes('dev 命令'))).toBe(true)
    rmSync(base, { recursive: true, force: true })
  })

  it('source shape 关键件不可读/为空/非法 JSON 也红（BUG-237 源码侧）', () => {
    const packDir = join(ROOT, 'packages/company-pack')
    const problems = checkSourceShape({ packDir, readFile: rel => {
      if (rel === 'content/AGENTS.md') throw new Error('EACCES')
      if (rel === 'content/charters/ceo.md') return ''
      if (rel === 'content/kb-setup/seed.json') return 'not json'
      return readFileSync(join(packDir, rel), 'utf8')
    } })
    expect(problems.some(problem => problem.includes('不可读'))).toBe(true)
    expect(problems.some(problem => problem.includes('为空'))).toBe(true)
    expect(problems.some(problem => problem.includes('不是合法 JSON'))).toBe(true)
  })

  it('source shape 组合目标不可读/为空也红（BUG-234 源码侧）', () => {
    const packDir = join(ROOT, 'packages/company-pack')
    const unreadable = checkSourceShape({ packDir, readFile: rel => {
      if (rel === 'presets/ceo/agent.cordis.yml') throw new Error('EACCES')
      return readFileSync(join(packDir, rel), 'utf8')
    } })
    expect(unreadable.some(problem => problem.includes('组合目标不可读'))).toBe(true)
    const empty = checkSourceShape({ packDir, readFile: rel => {
      if (rel === 'presets/ceo/agent.cordis.yml') return '  \n'
      return readFileSync(join(packDir, rel), 'utf8')
    } })
    expect(empty.some(problem => problem.includes('组合目标为空'))).toBe(true)
  })

  it('source shape 负例：出包链接/pnpm 文案/patch 目标/glob/ dev 路径（BUG-228）', () => {
    const base = mkdtempSync(join(tmpdir(), 'source-shape-'))
    mkdirSync(join(base, 'content'), { recursive: true })
    writeFileSync(join(base, 'package.json'), `${JSON.stringify({ dsh: { bundle: { patch: ['./presets/missing.yml'] } }, files: ['content/**', 'presets/**'] })}\n`)
    writeFileSync(join(base, 'README.shipped.md'), '# x\n\n[bad](../x.md)\npnpm\nsee tests/readme.spec.ts\n')
    writeFileSync(join(base, 'content/a.md'), 'see tests/x.spec.ts\n')
    const problems = checkSourceShape({ packDir: base })
    expect(problems.some(problem => problem.includes('出包'))).toBe(true)
    expect(problems.some(problem => problem.includes('dsh plugin add'))).toBe(true)
    expect(problems.some(problem => problem.includes('缺包管理器诊断'))).toBe(true)
    expect(problems.some(problem => problem.includes('presets/missing.yml'))).toBe(true)
    expect(problems.some(problem => problem.includes('files glob presets/**'))).toBe(true)
    expect(problems.some(problem => problem.includes('README.shipped.md') && problem.includes('dev 路径'))).toBe(true)
    rmSync(base, { recursive: true, force: true })
  })
})

describe('sanitizer 与字节工具', () => {
  const dir = mkdtempSync(join(tmpdir(), 'shipped-shape-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('source 组合目标缺失 → 红（BUG-256 边界）', () => {
    const packDir = join(ROOT, 'packages/company-pack')
    const problems = checkSourceShape({ packDir, exists: rel => rel === 'presets/ceo/agent.cordis.yml' ? false : existsSync(join(packDir, rel)) })
    expect(problems.some(problem => problem.includes('组合目标不在源码树'))).toBe(true)
  })

  it('source shape 扫描 pnpm dev 命令（BUG-251）', () => {
    const packDir = join(ROOT, 'packages/company-pack')
    const problems = checkSourceShape({ packDir, readFile: rel => {
      if (rel === 'README.shipped.md') return '# x\n\npnpm methods:init\n'
      return readFileSync(join(packDir, rel), 'utf8')
    } })
    expect(problems.some(problem => problem.includes('dev 命令'))).toBe(true)
  })

  it('source shape 扫描 node tools/run-env dev 命令（BUG-252）', () => {
    const packDir = join(ROOT, 'packages/company-pack')
    const problems = checkSourceShape({ packDir, readFile: rel => {
      if (rel === 'README.shipped.md') return '# x\n\nnode tools/repo/check.mjs\n'
      return readFileSync(join(packDir, rel), 'utf8')
    } })
    expect(problems.some(problem => problem.includes('dev 命令'))).toBe(true)
  })

  // 负例留证 2026-11-19：`pnpm -s test` / `pnpm exec` / `npm run` / `npx` / `node probes/…` 不在旧白名单正则里 → 放行（BUG-271/272）。
  it('source shape 扫 dev 命令：包管理器形式与 probes（BUG-271/272）', () => {
    const packDir = join(ROOT, 'packages/company-pack')
    const readmeWith = (text: string) => (rel: string) => rel === 'README.shipped.md'
      ? `${text}\ndsh plugin add dsh-company-pack\ndsh: pnpm was not found; install pnpm and make it available on PATH.\n`
      : readFileSync(join(packDir, rel), 'utf8')
    for (const command of ['pnpm -s test', 'pnpm exec vitest run', 'npm run test', 'npx vitest', 'node probes/browser-visual/cdp-probe.mjs']) {
      const problems = checkSourceShape({ packDir, readFile: readmeWith(`# x\n\n${command}\n`) })
      expect(problems.some(problem => problem.includes('dev 命令')), command).toBe(true)
    }
    // 散文里的包管理器不误伤（判据理解形状，不是关键词）
    const prose = checkSourceShape({ packDir, readFile: readmeWith('# x\n\nThe DSH plugin installer uses pnpm. DSH Desktop bundles pnpm; install pnpm and retry.\n') })
    expect(prose.some(problem => problem.includes('dev 命令'))).toBe(false)
  })

  it('最小 pkg / 最小源码树走全部分支（无 files/dsh/README/client.js）', () => {
    // shipped checker：缺 files 数组 / 无 README / 无 client.js / 无 dsh —— 每条 fallback 都得走通。
    const bare = checkShippedPackage({ pkg: { name: 'x', version: '0' }, entries: [], read: () => '', platformModules: [] })
    expect(bare.some(problem => problem.includes('关键运行时件'))).toBe(true)
    // freshness：manifest 没有 pipelineFingerprint 时也要报（不抛）
    expect(freshnessProblem({ manifest: { sourceFingerprint: 'same' }, currentFingerprint: 'same', currentPipeline: 'p' })).toContain('pipelineFingerprint')
    // sanitize：pkg 没有 peerDependencies/dsh/client —— fallback 全部生效
    const packageDir = join(dir, 'package-min')
    mkdirSync(join(packageDir, 'lib'), { recursive: true })
    writeFileSync(join(packageDir, 'package.json'), `${JSON.stringify({ name: 'x', version: '0' })}\n`)
    const shipped = sanitizePackage({ dir: packageDir, shippedReadme: join(dir, 'missing-readme.md') })
    expect(shipped.files).toContain('content/**')
    expect(shipped.peerDependencies?.['@deepseek-ai/dsh-client-ui-primitives']).toBeDefined()
    expect(shipped.dsh.client.inject).toContain('@deepseek-ai/dsh-client-ui-primitives')
    // source shape：package.json 没有 dsh/files 也不崩
    const bareSource = mkdtempSync(join(tmpdir(), 'source-bare-'))
    try {
      writeFileSync(join(bareSource, 'package.json'), `${JSON.stringify({ name: 'x', version: '0' })}\n`)
      writeFileSync(join(bareSource, 'README.shipped.md'), '# x\n')
      const problems = checkSourceShape({ packDir: bareSource, devScripts: [] })
      expect(problems.some(problem => problem.includes('关键运行时件'))).toBe(true)
    } finally { rmSync(bareSource, { recursive: true, force: true }) }
  })

  it('source shape 的合同错误路径：manifest/关键件坏 JSON、关键件不可读', () => {
    const packDir = join(ROOT, 'packages/company-pack')
    const base = (rel: string) => readFileSync(join(packDir, rel), 'utf8')
    const badManifest = checkSourceShape({ packDir, readFile: rel => rel === 'content/manifest.json' ? 'not json' : base(rel) })
    expect(badManifest.some(problem => problem.includes('source manifest: content/manifest.json 不是合法 JSON'))).toBe(true)
    const badSeed = checkSourceShape({ packDir, readFile: rel => rel === 'content/kb-setup/seed.json' ? 'not json' : base(rel) })
    expect(badSeed.some(problem => problem.includes('关键运行时件不是合法 JSON'))).toBe(true)
    const unreadable = checkSourceShape({ packDir, readFile: rel => { if (rel === 'content/AGENTS.md') throw new Error('EACCES'); return base(rel) } })
    expect(unreadable.some(problem => problem.includes('不可读'))).toBe(true)
  })

  it('sanitizePackage 去 scripts/devDeps、收类型、剥注释、换 README', () => {
    const packageDir = join(dir, 'package')
    mkdirSync(join(packageDir, 'lib/types/lib'), { recursive: true })
    mkdirSync(join(packageDir, 'lib/types/client'), { recursive: true })
    mkdirSync(join(packageDir, 'lib/types/host/cultivation'), { recursive: true })
    writeFileSync(join(packageDir, 'package.json'), `${JSON.stringify({
      name: 'x',
      version: '0.0.0',
      scripts: { prepack: 'node scripts/prepack-check.mjs' },
      devDependencies: { '@deepseek-ai/x': 'workspace:*' },
      peerDependencies: {},
      files: ['lib/types/**/*.d.ts'],
      dsh: { client: { inject: [], platform: 'web' } },
    }, null, 2)}\n`)
    writeFileSync(join(packageDir, 'lib/index.js'), 'export const x = 1\n//# sourceMappingURL=index.js.map\n')
    writeFileSync(join(packageDir, 'lib/types/index.d.ts'), "/** dev: tests/x.spec.ts */\nimport type { C } from './host/cultivation/cultivation.ts'\nexport declare const x: C\n")
    writeFileSync(join(packageDir, 'lib/types/host/cultivation/cultivation.d.ts'), 'export interface C { readonly root?: string }\n')
    writeFileSync(join(packageDir, 'lib/types/client/index.d.ts'), 'export declare const y: number\n')
    writeFileSync(join(packageDir, 'lib/types/lib/internal.d.ts'), 'export declare const z: number\n')
    const shipped = join(dir, 'README.shipped.md')
    writeFileSync(shipped, README)
    sanitizePackage({ dir: packageDir, shippedReadme: shipped })
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
    expect(pkg.scripts).toBeUndefined()
    expect(pkg.devDependencies).toBeUndefined()
    expect(pkg.dsh.client.inject).toEqual(['@deepseek-ai/dsh-client-ui-primitives'])
    expect(pkg.files).toContain('lib/types/index.d.ts')
    expect(pkg.files).toContain('lib/types/host/cultivation/cultivation.d.ts')
    expect(pkg.files).not.toContain('lib/types/**/*.d.ts')
    expect(readFileSync(join(packageDir, 'lib/index.js'), 'utf8')).not.toContain('sourceMappingURL')
    expect(readFileSync(join(packageDir, 'lib/types/index.d.ts'), 'utf8')).not.toContain('tests/')
    expect(readFileSync(join(packageDir, 'lib/types/index.d.ts'), 'utf8')).toContain('cultivation.js')
    expect(readFileSync(join(packageDir, 'lib/types/host/cultivation/cultivation.d.ts'), 'utf8')).toContain('interface C')
    expect(() => readFileSync(join(packageDir, 'lib/types/lib/internal.d.ts'))).toThrow()
    expect(readFileSync(join(packageDir, 'README.md'), 'utf8')).toContain('dsh plugin add')
  })

  it('stripComments 只剥注释，不碰字符串；注释邻接 token 补空格', () => {
    const text = 'const u = "http://x/y" // comment\n/* block */\nexport const x = 1\n'
    expect(stripComments(text)).toContain('http://x/y')
    expect(stripComments(text)).not.toContain('comment')
    expect(stripComments(text)).not.toContain('block')
    expect(stripComments('const a=1/*c*/+2')).toMatch(/1\s+\+2/)
  })

  it('scrubDevPaths 只改 CSS 注释里的路径；运行时字符串直接拒绝', () => {
    expect(scrubDevPaths('const css = `/* tests/x.spec.ts */`')).toContain('仓库内路径')
    expect(() => scrubDevPaths('const s = "tests/x.spec.ts"')).toThrow(/拒绝自动改写/)
  })

  it('sanitizePackage 无 lib/types 时 walk 不崩（BUG-213 边界）', () => {
    const packageDir = join(dir, 'package-no-types')
    mkdirSync(join(packageDir, 'lib'), { recursive: true })
    writeFileSync(join(packageDir, 'package.json'), `${JSON.stringify({ name: 'x', version: '0', peerDependencies: {}, dsh: { client: { inject: [], platform: 'web' } } })}\n`)
    writeFileSync(join(packageDir, 'lib/index.js'), 'export const x = 1\n')
    expect(() => sanitizePackage({ dir: packageDir, shippedReadme: join(dir, 'missing-readme.md') })).not.toThrow()
  })

  it('pipeline fingerprint 覆盖 sanitizer/export-dist/pack-source（BUG-243）', () => {
    expect(releasePipelineFiles(ROOT)).toContain('tools/lib/release/shipped-shape.mjs')
    expect(releasePipelineFingerprint(ROOT)).toMatch(/^[0-9a-f]{64}$/)
    expect(devBuildFingerprint('packages/company-pack', { vendorSha: 'x', lockfilePath: join(ROOT, 'pnpm-lock.yaml') })).toMatch(/^[0-9a-f]{64}$/)
  })

  // 负例留证 2026-11-19：发布面目录里任一 .mjs（install-manual / market-index）改字节，指纹不变（BUG-263/264）；目录派生后必变。
  it('改发布面任一 .mjs 字节 → pipeline 指纹必变（BUG-263/264）', () => {
    const MUTATE = ['tools/lib/release/install-manual.mjs', 'tools/lib/release/market-index.mjs', 'tools/release/market-index.mjs']
    const temp = mkdtempSync(join(tmpdir(), 'pipeline-inputs-'))
    try {
      for (const dir of ['tools/release', 'tools/lib/release']) {
        mkdirSync(join(temp, dir), { recursive: true })
        for (const name of readdirSync(join(ROOT, dir))) {
          if (name.endsWith('.mjs')) copyFileSync(join(ROOT, dir, name), join(temp, dir, name))
        }
      }
      mkdirSync(join(temp, 'tools/lib/core'), { recursive: true })
      copyFileSync(join(ROOT, 'tools/lib/core/pack-source.mjs'), join(temp, 'tools/lib/core/pack-source.mjs'))
      const base = releasePipelineFingerprint(temp)
      expect(base).toMatch(/^[0-9a-f]{64}$/)
      for (const rel of MUTATE) {
        appendFileSync(join(temp, rel), '\n// mutation\n')
        expect(releasePipelineFingerprint(temp), `${rel} 改动没进指纹`).not.toBe(base)
        copyFileSync(join(ROOT, rel), join(temp, rel))
      }
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  })

  // 负例留证 2026-11-19：inventory 写 `..\\evil`、version=2、seed target 越界、delivery template 缺件、
  // check-rules files 为空对象时，旧 checker 全绿（BUG-265/267/268/269/270）；接回 content 合同后各自红。
  it('content 合同：版本/反斜杠/seed/交付引用/规则值（BUG-265/267/268/269/270）', () => {
    const base = fixture()
    const inventory = JSON.parse(base.read('package/content/manifest.json')).inventory as string[]
    const withManifest = (manifest: unknown) => ({ ...base, read: (entry: string) => entry === 'package/content/manifest.json' ? JSON.stringify(manifest) : base.read(entry) })
    const withText = (rel: string, text: string) => ({ ...base, read: (entry: string) => entry === rel ? text : base.read(entry) })
    // 265：`..\\evil` 在 posix-only 判据里只是一个怪文件名 → 穿过
    expect(checkShippedPackage(withManifest({ version: CONTENT_VERSION, tiers: {}, inventory: [...inventory, '..\\evil.md'] })).some(problem => problem.includes('反斜杠'))).toBe(true)
    // 267：清单版本
    expect(checkShippedPackage(withManifest({ version: 2, tiers: {}, inventory })).some(problem => problem.includes('version 必须是 1'))).toBe(true)
    // 268：seed 的 target 越界 / source 缺文件
    const seedRel = 'package/content/kb-setup/seed.json'
    expect(checkShippedPackage(withText(seedRel, JSON.stringify({ seeds: [{ source: 'state/company.md', target: '../../evil.md' }] }))).some(problem => problem.includes('.. 段'))).toBe(true)
    expect(checkShippedPackage(withText(seedRel, JSON.stringify({ seeds: [{ source: 'state/missing.md', target: '.dsh-company/kb/x.md' }] }))).some(problem => problem.includes('source 不在 inventory'))).toBe(true)
    // 269：delivery documents 的 template 不在 content
    const rulesRel = 'package/content/delivery-modes/managed-service/delivery-rules.json'
    const rules = { deliveryMode: 'managed-service', kind: 'delivery', entry: 'overview.md', documents: { SLA: { file: 'drafts/sla.md', owner: 'COO', template: 'templates/missing.md' } } }
    expect(checkShippedPackage(withText(rulesRel, JSON.stringify(rules))).some(problem => problem.includes('template 不在 content'))).toBe(true)
    // 270：check-rules 的 files 值是对象
    const checkRel = 'package/content/product-types/business-software/check-rules.json'
    expect(checkShippedPackage(withText(checkRel, JSON.stringify({ productType: 'x', layers: ['MRD'], files: { MRD: {} } }))).some(problem => problem.includes('files.MRD 必须是'))).toBe(true)
  })

  it('content inventory/JSON schema 缺省和非法值红（BUG-244/261/262）', () => {
    const noInventory = fixture({ texts: { 'package/content/manifest.json': '{"tiers":{}}\n' } })
    expect(checkShippedPackage(noInventory).some(problem => problem.includes('缺非空 inventory'))).toBe(true)
    const duplicate = fixture({ texts: { 'package/content/manifest.json': JSON.stringify({ tiers: {}, inventory: ['AGENTS.md', 'AGENTS.md'] }) } })
    expect(checkShippedPackage(duplicate).some(problem => problem.includes('inventory 重复'))).toBe(true)
    const unsafe = fixture({ texts: { 'package/content/manifest.json': JSON.stringify({ tiers: {}, inventory: ['../x.md'] }) } })
    expect(checkShippedPackage(unsafe).some(problem => problem.includes('不安全路径'))).toBe(true)
    const badJson = fixture({ texts: { 'package/content/manifest.json': 'not json' } })
    expect(checkShippedPackage(badJson).some(problem => problem.includes('不是合法 JSON'))).toBe(true)
    const arrayManifest = fixture({ texts: { 'package/content/manifest.json': '[]\n' } })
    expect(checkShippedPackage(arrayManifest).some(problem => problem.includes('不是对象'))).toBe(true)
    const noTiers = fixture({ texts: { 'package/content/manifest.json': JSON.stringify({ inventory: ['AGENTS.md'] }) } })
    expect(checkShippedPackage(noTiers).some(problem => problem.includes('缺 tiers'))).toBe(true)
    const badTier = fixture({ texts: { 'package/content/manifest.json': JSON.stringify({ inventory: ['AGENTS.md'], tiers: { t2: 'x' } }) } })
    expect(checkShippedPackage(badTier).some(problem => problem.includes('不是数组'))).toBe(true)
    const unsafeTier = fixture({ texts: { 'package/content/manifest.json': JSON.stringify({ inventory: ['AGENTS.md'], tiers: { t2: ['../x'] } }) } })
    expect(checkShippedPackage(unsafeTier).some(problem => problem.includes('不安全路径'))).toBe(true)
  })

  it('packageRootOf 取 package 名', () => {
    expect(packageRootOf('react/jsx-runtime')).toBe('react')
    expect(packageRootOf('@scope/name/sub')).toBe('@scope/name')
    expect(packageRootOf('name')).toBe('name')
  })
})
