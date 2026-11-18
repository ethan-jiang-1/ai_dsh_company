import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'
import { checkShippedPackage, checkSourceShape, freshnessProblem, packageRootOf, platformModules, sanitizePackage, scrubDevPaths, stripComments } from '../../../tools/lib/release/shipped-shape.mjs'
import { packageSourceFiles, sourceFingerprint } from '../../../tools/lib/core/pack-source.mjs'

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
    dsh: { bundle: { patch: ['./presets/ceo/agent.cordis.yml'] }, client: { inject: ['@deepseek-ai/dsh-client-ui-primitives'], platform: 'web' } },
    ...overrides.pkg,
  }
  const entries = overrides.entries ?? [
    'package/package.json', 'package/lib/index.js', 'package/lib/client.js',
    'package/lib/types/index.d.ts', 'package/lib/types/client/index.d.ts',
    'package/lib/types/host/cultivation/cultivation.d.ts',
    'package/LICENSE', 'package/README.md', 'package/cordis.patch.yml',
    'package/locale/en.json', 'package/locale/zh.json', 'package/content/AGENTS.md',
    'package/content/manifest.json',
    'package/content/charters/ceo.md', 'package/content/charters/cfo.md',
    'package/content/charters/cmo.md', 'package/content/charters/coo.md',
    'package/content/charters/vp-eng.md', 'package/content/charters/vp-sales.md',
    'package/content/company/policy-lines.md', 'package/content/company/review-protocol.md',
    'package/presets/ceo/agent.cordis.yml',
  ]
  const texts = {
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

  it('README.shipped 进入源码指纹（BUG-227 B1）', () => {
    const base = mkdtempSync(join(tmpdir(), 'fingerprint-'))
    writeFileSync(join(base, 'package.json'), '{}\n')
    const before = sourceFingerprint(base)
    expect(packageSourceFiles(base)).not.toContain('README.shipped.md')
    writeFileSync(join(base, 'README.shipped.md'), '# shipped\n')
    expect(packageSourceFiles(base)).toContain('README.shipped.md')
    expect(sourceFingerprint(base)).not.toBe(before)
    rmSync(base, { recursive: true, force: true })
  })
  it('freshness 只认 sourceFingerprint；gitSha 落后不误红（BUG-227）', () => {
    expect(freshnessProblem({ manifest: { sourceFingerprint: 'a', gitSha: 'old' }, currentFingerprint: 'b' })).toContain('sourceFingerprint')
    expect(freshnessProblem({ manifest: { sourceFingerprint: 'a', gitSha: 'old' }, currentFingerprint: 'a' })).toBeUndefined()
  })

  it('glob 分支（**、*、?）与字面 files 缺失都判（BUG-223）', () => {
    const missingLiteral = fixture({ pkg: { files: [...fixture().pkg.files, 'missing.txt'] } })
    expect(checkShippedPackage(missingLiteral).some(problem => problem.includes('missing.txt'))).toBe(true)
    const weirdGlob = fixture({ pkg: { files: ['content/**/missing.md', 'lib/?.js', 'lib/types/**'] } })
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
    const write = (rel, text) => { mkdirSync(join(base, rel, '..'), { recursive: true }); writeFileSync(join(base, rel), text) }
    write('package.json', `${JSON.stringify({ dsh: { bundle: { patch: ['./presets/ceo/agent.cordis.yml'] } }, files: ['content/**', 'presets/**', 'locale/*.json', 'LICENSE'] })}\n`)
    write('README.shipped.md', '# x\n\n[home](https://example.com)\ndsh plugin add\ndsh: pnpm was not found; install pnpm and make it available on PATH.\n')
    for (const rel of ['content/AGENTS.md', 'content/manifest.json', 'content/charters/ceo.md', 'content/charters/cfo.md',
      'content/charters/cmo.md', 'content/charters/coo.md', 'content/charters/vp-eng.md', 'content/charters/vp-sales.md',
      'content/company/policy-lines.md', 'content/company/review-protocol.md', 'locale/en.json', 'locale/zh.json',
      'presets/ceo/agent.cordis.yml', 'LICENSE']) write(rel, '# x\n')
    expect(checkSourceShape({ packDir: base })).toEqual([])
    rmSync(base, { recursive: true, force: true })
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

  it('packageRootOf 取 package 名', () => {
    expect(packageRootOf('react/jsx-runtime')).toBe('react')
    expect(packageRootOf('@scope/name/sub')).toBe('@scope/name')
    expect(packageRootOf('name')).toBe('name')
  })
})
