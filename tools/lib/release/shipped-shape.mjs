/**
 * shipped package 形状的纯逻辑（唯一家；CLI/解包 = tools/release/shipped-shape.mjs）。
 *
 * 为什么：`packages/company-pack` 的运行时面是**构造出来的**，不是仓库树的子集。
 * `files` / manifest / README / 注释 / client 声明各自手写，于是 dev 字节（类型树、source map）、
 * dev 元数据（prepack、workspace devDeps）、dev 文本（tests/probes/tools 路径）和未声明的
 * 运行时依赖会同时漏进 tarball。本模块给出 sanitizer 与 checker 的判据；release 管线在替换
 * `_dist` 前调用它。
 *
 * 判据（机械、窄）：
 *   1. 类型：`lib/types/` 只保留 `exports.types` 可达闭包（实测两个入口 `.d.ts`）。
 *   2. 字节：无 `.map`、无 `sourceMappingURL`；bundle 注释在打包前剥离。
 *   3. manifest：无 `scripts`、无 `devDependencies`、无 `workspace:`；`main`/`exports` 目标在包内。
 *   4. client：`lib/client.js` 的每个 `require` 必须是 vendor `PLATFORM_MODULES` 或 package 自身
 *      的 inject/peer；inject 的每条非 require 边必须有 peerDependencies 背书（组合/排序边）。
 *   5. 文本：README 相对链接全在包内；README/cordis/presets/lib 的 dev 路径必须带「不随包」限定；
 *      README 提 pnpm 时必须是「DSH 插件安装器 + 明确诊断」，不能写成包运行时前置。
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { packageSourceFiles } from '../core/pack-source.mjs'
import { REQUIRED_CONTENT_FILES, contentManifestProblems } from '../company/content-contract.mjs'
import { devCommandInText, scriptsFromManifest } from '../core/dev-command.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..', '..')
const yaml = createRequire(join(root, 'vendor/dsh/package.json'))('js-yaml')
const yamlSchema = yaml.DEFAULT_SCHEMA.extend([
  new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: data => data }),
])

/** dev-only 路径（shipped 文本里出现时必须有「不随包」限定）。 */
const DEV_PATH = /(?<![A-Za-z0-9_./-])(?:tests|probes|tools|checks|_backlog|notes|docs)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g
const REL_DEV_PATH = /\.\.\/(?:tests|probes|tools|checks|_backlog|notes|docs)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g
const QUALIFIER = /不随包|仓库内|dev-only|发布面自包含/
const TEXT_FACE = /^package\/(?:README\.md|cordis\.patch\.yml|presets\/.*|content\/.*\.(?:md|ya?ml|json)|lib\/.*\.(?:js|mjs|d\.ts))$/
const DEV_DIR = /(?<![A-Za-z0-9_./-])((?:\.\.\/)*(?:tests|probes|tools|checks|_backlog|notes|docs)\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\/?)/g
const DEV_DIR_ALLOW = [
  /^tests\/simulation(?:\/|$)/,
  /^tools\/skills(?:\/|$)/,
  /^tools\/source(?:\/|$)/,
  /^tools\/pre-execute$/,
]
/**
 * 发布包必须有的运行时关键件。content 部分**派生**自 `tools/lib/company/content-contract.mjs`
 * 的 `REQUIRED_CONTENT_FILES`（content 合同唯一家；2026-11-19 BUG-273 前这里是第二份手写清单）。
 */
export const REQUIRED_SHIPPED = [
  // 清单本体不在 inventory 里（它是清单），但它是随包关键件。
  'content/manifest.json',
  ...REQUIRED_CONTENT_FILES.map(rel => `content/${rel}`),
  'locale/en.json',
  'locale/zh.json',
]

/** 组合入口必须包含的 12 个 patch 目标（六角色 + 五 support + cordis 行；BUG-234）。 */
export const EXPECTED_PATCH = [
  './cordis.patch.yml',
  './presets/ceo/agent.cordis.yml',
  './presets/vp-eng/agent.cordis.yml',
  './presets/vp-sales/agent.cordis.yml',
  './presets/coo/agent.cordis.yml',
  './presets/cfo/agent.cordis.yml',
  './presets/cmo/agent.cordis.yml',
  './presets/worker-researcher/agent.cordis.yml',
  './presets/worker/agent.cordis.yml',
  './presets/worker-orchestrator/agent.cordis.yml',
  './presets/quality-loop-producer/agent.cordis.yml',
  './presets/quality-loop-verifier/agent.cordis.yml',
]
/** 运行时字节里出现的 dev 路径（字符串/模板内的 CSS 注释也可能有）→ 中性占位。 */
const SCRUB = /(?<![A-Za-z0-9_./-])(?:\.\.\/)*(?:tests|probes|tools|checks|_backlog|notes|docs)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g

/** vendor 的 web 平台模块表（baseline；只读钉树）。 */
export function platformModules(base = root) {
  const file = join(base, 'vendor/dsh/packages/client/web/src/platform.ts')
  const text = readFileSync(file, 'utf8')
  const block = /export const PLATFORM_MODULES = \[([\s\S]*?)\]\s*as const/.exec(text)?.[1]
  if (!block) throw new Error(`shipped-shape: ${file} 里找不到 PLATFORM_MODULES`)
  return [...block.matchAll(/'([^']+)'/g)].map(match => match[1])
}

/** 去注释但保留其余字节（TypeScript parser 收集 leading comments；字符串/正则里的注释记号不动）。 */
export function stripComments(text) {
  const source = ts.createSourceFile('bundle.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const ranges = []
  const visit = node => {
    for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) ranges.push(range)
    for (const range of ts.getTrailingCommentRanges(text, node.getEnd()) ?? []) ranges.push(range)
    ts.forEachChild(node, visit)
  }
  visit(source)
  ranges.sort((a, b) => a.pos - b.pos)
  let out = ''
  let last = 0
  for (const range of ranges) {
    if (range.pos < last) continue
    out += text.slice(last, range.pos)
    // 注释相邻两个 token 且两侧都没空白时补一个空格，避免 `a/*c*/b` 合成 `ab`。
    const before = out === '' ? '' : out[out.length - 1]
    if (before !== '' && !/\s/.test(before) && range.end < text.length && !/\s/.test(text[range.end])) out += ' '
    last = range.end
  }
  return out + text.slice(last)
}

/**
 * 替换运行时字节里落在 **CSS 注释** 内的 dev 路径。任何不在注释内的 dev 路径直接拒绝，
 * 不静默改写用户可见字符串/错误文案。
 */
export function scrubDevPaths(text) {
  const matches = [...text.matchAll(SCRUB)]
  if (matches.length === 0) return text
  const replacements = []
  for (const match of matches) {
    const index = match.index ?? 0
    const open = text.lastIndexOf('/*', index)
    const close = text.indexOf('*/', index)
    const inCssComment = open !== -1 && close !== -1 && open < index && close > index
    if (!inCssComment) throw new Error(`shipped-shape: dev 路径出现在非注释运行时字节（${match[0]}）——先改源文案，拒绝自动改写`)
    replacements.push([index, index + match[0].length])
  }
  let out = ''
  let last = 0
  for (const [start, end] of replacements) {
    out += text.slice(last, start)
    out += '仓库内路径（不随包）'
    last = end
  }
  return out + text.slice(last)
}

/** 包名（`@scope/name/sub` → `@scope/name`；`react/jsx-runtime` → `react`）。 */
export function packageRootOf(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]
}

function entryOfExport(value) {
  return `package/${String(value).replace(/^\.\//, '')}`
}



function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** content 相对路径的安全判据 / JSON 跨引用 / 清单判据的唯一家 = ./content-contract.mjs 之上（见该文件）。 */

/** tarball 条目里的 content 相对文件列表（不含清单本体）。 */
function contentFilesOf(entries) {
  return entries
    .filter(entry => entry.startsWith('package/content/'))
    .map(entry => entry.slice('package/content/'.length))
    .filter(rel => rel !== 'manifest.json')
}

/** YAML 关键件（preset）必须可加载；cordis.patch.yml 可能带 !!js 自定义 tag，不在此列。 */
function yamlProblem(rel, text) {
  if (!rel.startsWith('presets/') || !rel.endsWith('.yml')) return undefined
  try {
    const value = yaml.load(text, { schema: yamlSchema })
    return (Array.isArray(value) && value.length > 0) || (isRecord(value) && Object.keys(value).length > 0)
      ? undefined : 'YAML 空/不是对象或数组'
  } catch (error) {
    return `YAML 不可解析：${String(error).split('\n')[0]}`
  }
}

/** 简单 glob → 正则（`**` 跨段、`*` 段内、`?` 单字符）。 */
function globToRegExp(glob) {
  let out = ''
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i]
    if (char === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2 } else { out += '.*'; i += 1 }
        continue
      }
      out += '[^/]*'
      continue
    }
    if (char === '?') { out += '[^/]'; continue }
    out += /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char
  }
  return new RegExp(`^${out}$`)
}

/** 一行里的 dev 路径（文件级优先，其次目录级；目录级白名单见 DEV_DIR_ALLOW）。 */
export function devPathInLine(line) {
  const fileHit = line.match(DEV_PATH)?.[0]
  if (fileHit !== undefined) return fileHit
  const dirHit = line.match(DEV_DIR)?.[0]
  if (dirHit === undefined) return undefined
  const normalized = dirHit.replace(/^(?:\.\.\/)+/, '').replace(/\/$/, '')
  return DEV_DIR_ALLOW.some(pattern => pattern.test(normalized)) ? undefined : normalized
}

/**
 * 对解包后的 package（或 tarball 抽象）判 shipped 形状。
 * @param {{pkg:Record<string,any>,entries:string[],read:(entry:string)=>string,platformModules?:string[]}} input
 * @returns {string[]} violations（空 = 通过）
 */
export function checkShippedPackage({ pkg, entries, read, platformModules: platform = platformModules() }) {
  const problems = []
  const entrySet = new Set(entries)
  const files = Array.isArray(pkg.files) ? pkg.files : []

  // 1. 类型面 = exports.types 可达闭包
  const typeEntries = entries.filter(entry => entry.startsWith('package/lib/types/') && entry.endsWith('.d.ts'))
  const allowedTypes = new Set([
    'package/lib/types/index.d.ts',
    'package/lib/types/client/index.d.ts',
    'package/lib/types/host/cultivation/cultivation.d.ts',
  ])
  const extraTypes = typeEntries.filter(entry => !allowedTypes.has(entry))
  if (extraTypes.length > 0) problems.push(`types: ${String(extraTypes.length)} 个 exports 不可达 .d.ts（首个 ${extraTypes[0]}）；只许 exports 闭包`)
  for (const entry of typeEntries) {
    const text = read(entry)
    for (const match of text.matchAll(/(?:from\s+|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
      const spec = match[1]
      if (spec.endsWith('.ts')) { problems.push(`types: ${entry} 的声明 import 仍带 .ts 后缀（${spec}）——消费方无法解析`); continue }
      const target = posix.normalize(posix.join(posix.dirname(entry), spec.replace(/\.js$/, '.d.ts')))
      if (!entrySet.has(target)) problems.push(`types: ${entry} 引用 ${spec} → ${target} 不在 tarball`)
    }
  }
  for (const value of [pkg.main, ...Object.values(pkg.exports ?? {}).flatMap(row => typeof row === 'object' && row !== null ? [row.default, row.types] : [row])]) {
    if (value === undefined || String(value).includes('*')) continue
    const entry = entryOfExport(value)
    if (!entrySet.has(entry)) problems.push(`exports: ${String(value)} → ${entry} 不在 tarball`)
  }

  // 2. 字节：map / sourceMappingURL
  const maps = entries.filter(entry => entry.endsWith('.map'))
  if (maps.length > 0) problems.push(`bytes: ${String(maps.length)} 个 .map 随包（首个 ${maps[0]}）`)
  for (const entry of entries.filter(item => /^package\/lib\/.*\.js$/.test(item))) {
    if (read(entry).includes('sourceMappingURL')) problems.push(`bytes: ${entry} 仍有 sourceMappingURL 但没有 map 随包`)
  }

  // 3. manifest
  if (pkg.scripts !== undefined) problems.push('manifest: 仍带 scripts（prepack 是仓库 build-time 检查，不属于安装面）')
  if (pkg.devDependencies !== undefined) problems.push(`manifest: 仍带 devDependencies（${String(Object.keys(pkg.devDependencies).length)} 条）`)
  if (JSON.stringify(pkg).includes('workspace:')) problems.push('manifest: 仍含 workspace: 协议')
  if (files.some(item => item.includes('lib/types/**'))) problems.push('manifest: files 仍整树收 lib/types/**')
  for (const value of files) {
    if (value.includes('*') || value.includes('?')) {
      const pattern = globToRegExp(`package/${value}`)
      if (!entries.some(entry => pattern.test(entry))) problems.push(`manifest: files glob ${value} 未命中任何 entry`)
      continue
    }
    if (!entrySet.has(`package/${value.replace(/^\.\//, '')}`)) problems.push(`manifest: files 条目 ${value} 不在 tarball`)
  }
  for (const rel of REQUIRED_SHIPPED) {
    const entry = `package/${rel}`
    if (!entrySet.has(entry)) { problems.push(`manifest: 缺关键运行时件 ${rel}`); continue }
    let text
    try { text = read(entry) } catch { problems.push(`manifest: 关键运行时件不可读 ${rel}`); continue }
    if (text.trim() === '') problems.push(`manifest: 关键运行时件为空 ${rel}`)
    if (rel.endsWith('.json')) {
      try { JSON.parse(text) } catch { problems.push(`manifest: 关键运行时件不是合法 JSON ${rel}`) }
    }
  }
  const patches = Array.isArray(pkg.dsh?.bundle?.patch) ? pkg.dsh.bundle.patch : []
  for (const rel of patches) {
    const entry = `package/${String(rel).replace(/^\.\//, '')}`
    if (!entrySet.has(entry)) problems.push(`manifest: dsh.bundle.patch 目标 ${String(rel)} 不在 tarball`)
  }
  for (const rel of EXPECTED_PATCH) {
    if (!patches.some(item => String(item).replace(/^\.\//, '') === rel.replace(/^\.\//, ''))) {
      problems.push(`manifest: dsh.bundle.patch 缺组合目标 ${rel}`)
      continue
    }
    const entry = `package/${rel.replace(/^\.\//, '')}`
    if (!entrySet.has(entry)) continue
    let text
    try { text = read(entry) } catch { problems.push(`manifest: 组合目标不可读 ${rel}`); continue }
    if (text.trim() === '') problems.push(`manifest: 组合目标为空 ${rel}`)
    const yamlIssue = yamlProblem(rel.replace(/^\.\//, ''), text)
    if (yamlIssue !== undefined) problems.push(`manifest: 组合目标 ${rel} ${yamlIssue}`)
  }
  if (entrySet.has('package/content/manifest.json')) {
    try {
      const manifest = JSON.parse(read('package/content/manifest.json'))
      for (const problem of contentManifestProblems({
        manifest,
        files: contentFilesOf(entries),
        read: rel => read(`package/content/${rel}`),
      })) problems.push(`manifest: ${problem}`)
    } catch { problems.push('manifest: content/manifest.json 不是合法 JSON') }
  }

  // 4. client require × inject / platform
  const clientText = entrySet.has('package/lib/client.js') ? read('package/lib/client.js') : ''
  const required = [...new Set([...clientText.matchAll(/require\((['"])([^'"]+)\1\)/g)].map(match => match[2]))]
  const platformSet = new Set(platform)
  const inject = Array.isArray(pkg.dsh?.client?.inject) ? pkg.dsh.client.inject : []
  const requiredPackages = [...new Set(required.map(packageRootOf))]
  const undeclared = required.filter(specifier => !platformSet.has(specifier) && !inject.includes(packageRootOf(specifier)))
  if (undeclared.length > 0) problems.push(`client: require 未声明（既不在 PLATFORM_MODULES 也不在 dsh.client.inject）：${undeclared.join(', ')}`)
  // inject 同时承载 factory arrival 与插件组合/排序边：未被 factory require 的 entry 只有在
  // peerDependencies 里也有对应包时才算已声明的组合边；否则是幽灵边。
  const phantom = inject.filter(id => !requiredPackages.includes(id) && !required.includes(id) && pkg.peerDependencies?.[id] === undefined)
  if (phantom.length > 0) problems.push(`client: inject 有未被 bundle require 且无 peer 背书的幽灵边：${phantom.join(', ')}`)
  if (!inject.includes('@deepseek-ai/dsh-client-ui-primitives')) problems.push('client: 缺 @deepseek-ai/dsh-client-ui-primitives（bundle 实际 require）')
  const requiredPeers = requiredPackages.filter(id => id.startsWith('@deepseek-ai/'))
  for (const id of requiredPeers) {
    if (pkg.peerDependencies?.[id] === undefined) problems.push(`client: ${id} 是运行时 package row，但 peerDependencies 没有它`)
  }
  for (const specifier of required) {
    if (!platformSet.has(specifier) && !specifier.startsWith('@deepseek-ai/') && specifier !== 'react' && specifier !== 'react/jsx-runtime') {
      problems.push(`client: require ${specifier} 不在 PLATFORM_MODULES 且不是已声明 package row`)
    }
  }

  // 5. shipped 文本
  const readme = entrySet.has('package/README.md') ? read('package/README.md') : ''
  for (const match of readme.matchAll(/\]\(([^)\s]+)\)/g)) {
    const link = match[1]
    if (/^(?:https?:|#|mailto:)/.test(link)) continue
    const target = posix.normalize(posix.join('package', link.split('#')[0]))
    if (!target.startsWith('package/') || !entrySet.has(target)) problems.push(`README: 相对链接出包或不存在：${link}`)
  }
  if (readme.includes('pnpm')) {
    if (!readme.includes('dsh plugin add')) problems.push('README: 提 pnpm 但没给 DSH 插件安装入口（dsh plugin add）')
    if (!readme.includes('dsh: pnpm was not found')) problems.push('README: 提 pnpm 但没给 DSH 的缺包管理器诊断（dsh: pnpm was not found…）')
  }
  for (const entry of entries.filter(item => TEXT_FACE.test(item))) {
    let text
    try { text = read(entry) } catch { problems.push(`${entry}: 不可读`); continue }
    const lines = text.split('\n')
    lines.forEach((line, index) => {
      if (QUALIFIER.test(line)) return
      const hit = devPathInLine(line) ?? line.match(REL_DEV_PATH)?.[0]
      if (hit !== undefined) problems.push(`${entry}:${String(index + 1)} → dev 路径 ${hit} 未带「不随包」限定`)
    })
  }
  return problems
}

/** 仓库根 `package.json` 的脚本名（`pnpm <script>` 判据的唯一源；读不到 = 空表，判据退化成只认子命令）。 */
function repoScripts(packDir) {
  try { return scriptsFromManifest(readFileSync(join(packDir, '..', '..', 'package.json'), 'utf8')) } catch { return [] }
}

/**
 * 源码侧 shipped 面（不依赖 _dist）：README.shipped 链接/pnpm、cordis/presets/content dev 限定、patch 目标。
 * @param {{packDir:string, readFile?:(rel:string)=>string, exists?:(rel:string)=>boolean, devScripts?:string[]}} options
 */
export function checkSourceShape({
  packDir,
  readFile = rel => readFileSync(join(packDir, rel), 'utf8'),
  exists = rel => existsSync(join(packDir, rel)),
  devScripts,
}) {
  const problems = []
  // dev 命令判据的脚本名唯一源 = 仓库根 package.json（pack 的 package.json 只有 prepack 等打包脚本）。
  const scripts = devScripts ?? repoScripts(packDir)
  const readme = readFile('README.shipped.md')
  for (const match of readme.matchAll(/\]\(([^)\s]+)\)/g)) {
    const link = match[1]
    if (/^(?:https?:|#|mailto:)/.test(link)) continue
    const target = posix.normalize(link.split('#')[0])
    if (target.startsWith('..') || !exists(target)) problems.push(`source README.shipped: 相对链接出包或不存在：${link}`)
  }
  if (readme.includes('pnpm')) {
    if (!readme.includes('dsh plugin add')) problems.push('source README.shipped: 提 pnpm 但没给 DSH 插件安装入口（dsh plugin add）')
    if (!readme.includes('dsh: pnpm was not found')) problems.push('source README.shipped: 提 pnpm 但没给 DSH 的缺包管理器诊断')
  }
  const manifest = JSON.parse(readFile('package.json'))
  for (const rel of REQUIRED_SHIPPED) {
    if (!exists(rel)) { problems.push(`source manifest: 缺关键运行时件 ${rel}`); continue }
    let text
    try { text = readFile(rel) } catch { problems.push(`source manifest: 关键运行时件不可读 ${rel}`); continue }
    if (text.trim() === '') problems.push(`source manifest: 关键运行时件为空 ${rel}`)
    if (rel.endsWith('.json')) {
      try { JSON.parse(text) } catch { problems.push(`source manifest: 关键运行时件不是合法 JSON ${rel}`) }
    }
  }
  const patches = Array.isArray(manifest.dsh?.bundle?.patch) ? manifest.dsh.bundle.patch : []
  for (const rel of patches) {
    if (!exists(String(rel).replace(/^\.\//, ''))) problems.push(`source manifest: dsh.bundle.patch 目标 ${String(rel)} 不在源码树`)
  }
  for (const rel of EXPECTED_PATCH) {
    if (!patches.some(item => String(item).replace(/^\.\//, '') === rel.replace(/^\.\//, ''))) {
      problems.push(`source manifest: dsh.bundle.patch 缺组合目标 ${rel}`)
      continue
    }
    const target = rel.replace(/^\.\//, '')
    if (!exists(target)) { problems.push(`source manifest: 组合目标不在源码树 ${rel}`); continue }
    let text
    try { text = readFile(target) } catch { problems.push(`source manifest: 组合目标不可读 ${rel}`); continue }
    if (text.trim() === '') problems.push(`source manifest: 组合目标为空 ${rel}`)
    const yamlIssue = yamlProblem(target, text)
    if (yamlIssue !== undefined) problems.push(`source manifest: 组合目标 ${rel} ${yamlIssue}`)
  }
  const sourceFiles = packageSourceFiles(packDir)
  try {
    const contentManifest = JSON.parse(readFile('content/manifest.json'))
    for (const problem of contentManifestProblems({
      manifest: contentManifest,
      files: sourceFiles
        .filter(rel => rel.startsWith('content/'))
        .map(rel => rel.slice('content/'.length))
        .filter(rel => rel !== 'manifest.json'),
      read: rel => readFile(`content/${rel}`),
    })) problems.push(`source manifest: ${problem}`)
  } catch { problems.push('source manifest: content/manifest.json 不是合法 JSON') }
  for (const value of Array.isArray(manifest.files) ? manifest.files : []) {
    if ((!value.includes('*') && !value.includes('?')) || value.startsWith('lib/')) continue
    const pattern = globToRegExp(value)
    if (!sourceFiles.some(file => pattern.test(file))) problems.push(`source manifest: files glob ${value} 未命中源码文件`)
  }
  const textFiles = ['README.shipped.md', 'cordis.patch.yml', ...sourceFiles.filter(file => /^(?:presets|content)\/.*\.(?:md|ya?ml|json|mjs)$/.test(file))]
  for (const rel of [...new Set(textFiles)]) {
    let text
    try { text = readFile(rel) } catch { continue }
    text.split('\n').forEach((line, index) => {
      if (QUALIFIER.test(line) || line.trim().startsWith('#')) return
      const hit = devPathInLine(line) ?? line.match(REL_DEV_PATH)?.[0]
      if (hit !== undefined) problems.push(`${rel}:${String(index + 1)} → dev 路径 ${hit} 未带「不随包」限定`)
      const command = devCommandInText(line, { scripts })
      if (command !== undefined) problems.push(`${rel}:${String(index + 1)} → dev 命令 ${command} 不随包`)
    })
  }
  return problems
}

/**
 * `--allow-stale` 的降级判据：必须带 `<sha>:<reason>`，sha 绑 HEAD/manifest；CI 禁止（BUG-236/253）。
 * @param {{args?: string[], ci?: boolean, head?: string, manifestGitSha?: string}} options
 */
export function staleFlagProblem({ args = [], ci = false, head, manifestGitSha } = {}) {
  const arg = args.find(item => item === '--allow-stale' || String(item).startsWith('--allow-stale='))
  if (arg === undefined) return undefined
  const reason = String(arg).includes('=') ? String(arg).slice(String(arg).indexOf('=') + 1) : ''
  if (reason.trim() === '') return '--allow-stale 必须带 =理由（无理由降级不允许）'
  const match = /^([0-9a-f]{7,40}):([^\s].*)$/i.exec(reason.trim())
  if (match === null) return '--allow-stale 必须用 =<sha>:<reason>（绑定具体提交，不接受任意词）'
  const sha = match[1].toLowerCase()
  const known = [head, manifestGitSha].filter(value => typeof value === 'string' && value.length > 0).map(value => String(value).toLowerCase())
  if (known.length > 0 && !known.some(value => value.startsWith(sha))) return `--allow-stale 的 sha ${sha} 不是 HEAD/manifest 提交前缀`
  if (ci) return 'CI 环境禁止 --allow-stale（只在本地人工排障时用 =<sha>:<reason>）'
  return undefined
}

/** 发布新鲜度：manifest 的 sourceFingerprint 必须等于当前源码指纹；gitSha 落后仅提示（docs-only）。 */
export function freshnessProblem({ manifest, currentFingerprint, currentPipeline } = {}) {
  if (manifest === undefined) return '缺 release-manifest.json；先 pnpm release --prepare'
  if (manifest.sourceFingerprint !== currentFingerprint) {
    return `_dist 的 sourceFingerprint ${String(manifest.sourceFingerprint).slice(0, 12)}… ≠ 当前源码 ${String(currentFingerprint).slice(0, 12)}…——先 pnpm release --prepare（或 --allow-stale 显式降级）`
  }
  if (manifest.pipelineFingerprint !== currentPipeline) {
    return `_dist 的 pipelineFingerprint ${String(manifest.pipelineFingerprint ?? 'missing').slice(0, 12)}… ≠ 当前发布管线 ${String(currentPipeline ?? 'missing').slice(0, 12)}…——先 pnpm release --prepare`
  }
  return undefined
}

/** 把解包后的 package 清洗成可发布形态（原地改）。 */
export function sanitizePackage({ dir, shippedReadme }) {
  const manifestPath = join(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'))
  delete pkg.scripts
  delete pkg.devDependencies
  pkg.files = [
    'lib/index.js',
    'lib/client.js',
    'lib/types/index.d.ts',
    'lib/types/client/index.d.ts',
    'lib/types/host/cultivation/cultivation.d.ts',
    'presets/**',
    'locale/*.json',
    'icon.svg',
    'cordis.patch.yml',
    'content/**',
    'LICENSE',
  ]
  pkg.peerDependencies = {
    ...(pkg.peerDependencies ?? {}),
    '@deepseek-ai/dsh-client-ui-primitives': '^0.2.1-rc.2',
  }
  pkg.dsh = pkg.dsh ?? {}
  const existingInject = Array.isArray(pkg.dsh.client?.inject) ? pkg.dsh.client.inject : []
  pkg.dsh.client = {
    ...(pkg.dsh.client ?? {}),
    inject: [...new Set([...existingInject, '@deepseek-ai/dsh-client-ui-primitives'])],
  }
  writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

  // 类型：只留两个 exports 入口
  const keep = new Set([
    join(dir, 'lib/types/index.d.ts'),
    join(dir, 'lib/types/client/index.d.ts'),
    join(dir, 'lib/types/host/cultivation/cultivation.d.ts'),
  ])
  const walk = current => {
    if (!existsSync(current)) return
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (current.startsWith(join(dir, 'lib/types')) && !keep.has(path)) rmSync(path, { force: true })
    }
  }
  walk(join(dir, 'lib/types'))

  // 运行时字节里的注释（含 dev 指针与 sourceMappingURL）与字符串内的 dev 路径剥离
  for (const rel of ['lib/index.js', 'lib/client.js', 'lib/types/index.d.ts', 'lib/types/client/index.d.ts', 'lib/types/host/cultivation/cultivation.d.ts']) {
    const path = join(dir, rel)
    if (existsSync(path) && statSync(path).isFile()) {
      const stripped = stripComments(readFileSync(path, 'utf8'))
      const rewritten = scrubDevPaths(stripped)
      writeFileSync(path, rewritten.replace(/(from\s+['"])(\.[^'"]+)\.ts(['"])/g, '$1$2.js$3'), 'utf8')
    }
  }

  if (existsSync(shippedReadme)) copyFileSync(shippedReadme, join(dir, 'README.md'))
  return pkg
}
