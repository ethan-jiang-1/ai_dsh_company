// 状态：常驻
// 何时跑：改七个高风险门禁（naming-contract / company-root-carriers / fix-evidence / notes-tree / notes-axes / backlog-liveness / ledger-routing）的判据后；
//         `pnpm test:checks` 与 `node checks/lanes/generative.e2e.mjs`。
// 这是**分支级定向 mutation**：逐条阉割门禁的核心拒绝分支（或浅克隆跳过分支），坏夹具必须当场漏过（或浅克隆分支翻转）；
// 证明夹具真正踩在该条规则上，而不是靠别的分支顺带变红。
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as naming from '../../checks/gates/naming-contract.mjs'
import * as carrier from '../../checks/gates/company-root-carriers.mjs'
import * as fixEvidence from '../../checks/gates/fix-evidence.mjs'
import * as notesTree from '../../checks/gates/notes-tree.mjs'
import * as notesAxes from '../../checks/gates/notes-axes.mjs'
import * as ledgerRouting from '../../checks/gates/ledger-routing.mjs'
import { backlogLivenessProblems } from '../../tools/lib/backlog-liveness.mjs'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../..')
const GATES = join(ROOT_DIR, 'checks/gates')
const TOOLS_LIB = join(ROOT_DIR, 'tools/lib')

function rewriteMutantSource(source, dir, baseName) {
  const originalUrl = JSON.stringify(pathToFileURL(join(dir, `${baseName}.mjs`)).href)
  return source
    .replace(
      /((?:import|export)\s+(?:[^'"]*?\s+from\s+)?|import\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2/g,
      (_full, prefix, quote, relSpec) => `${prefix}${quote}${pathToFileURL(resolve(dir, relSpec)).href}${quote}`,
    )
    .replaceAll('import.meta.url', originalUrl)
}

const MUTANT_CACHE = join(ROOT_DIR, 'node_modules/.cache/gate-mutations')

async function mutantInDir(dir, baseName, from, to) {
  const source = readFileSync(join(dir, `${baseName}.mjs`), 'utf8')
  assert.ok(source.includes(from), `${baseName} 的 mutation 锚点不在了——先同步本测试`)
  mkdirSync(MUTANT_CACHE, { recursive: true })
  const tempDir = mkdtempSync(join(MUTANT_CACHE, `${baseName}-`))
  const path = join(tempDir, `${baseName}.mjs`)
  writeFileSync(path, rewriteMutantSource(source.replace(from, to), dir, baseName))
  const mod = await import(`${pathToFileURL(path).href}?v=${String(Date.now())}`)
  return { mod, cleanup: () => rmSync(tempDir, { recursive: true, force: true }) }
}

const mutant = (gate, from, to) => mutantInDir(GATES, gate, from, to)
const libMutant = (name, from, to) => mutantInDir(TOOLS_LIB, name, from, to)

function fixture(files, dirs = []) {
  const root = mkdtempSync(join(tmpdir(), 'gate-mutation-'))
  for (const dir of dirs) mkdirSync(join(root, dir), { recursive: true })
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  return root
}

function invoke(mod, root, extra = {}) {
  const problems = []
  let okLine = ''
  mod.run({ root, ...extra, ok: line => { okLine = line }, fail: (_name, detail) => problems.push(detail) })
  return { problems, okLine }
}

function initGitRepo(root, files, commitDate = '2026-11-14T10:00:00Z') {
  const runGit = (args, env = {}) => {
    const res = spawnSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 't',
        GIT_AUTHOR_EMAIL: 't@example.com',
        GIT_COMMITTER_NAME: 't',
        GIT_COMMITTER_EMAIL: 't@example.com',
        GIT_AUTHOR_DATE: commitDate,
        GIT_COMMITTER_DATE: commitDate,
        ...env,
      },
    })
    assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`)
    return res.stdout.trim()
  }
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  runGit(['init', '-q'])
  runGit(['add', '.'])
  runGit(['commit', '-q', '-m', 'init'])
  const sha = runGit(['rev-parse', '--short=8', 'HEAD'])
  return { sha, runGit }
}

function minimalBacklogFiles(extraFiles = {}) {
  const pools = [
    '', '_archive', 'issues', 'bugs', 'research', 'methods',
    '_archive/settled_issues', '_archive/suspended_issues',
    '_archive/fixed_bugs', '_archive/suspended_bugs', '_archive/research', '_archive/legacy',
  ]
  const files = {}
  for (const p of pools) {
    files[p ? `_backlog/${p}/README.md` : '_backlog/README.md'] = '# idx\n'
  }
  return { ...files, ...extraFiles }
}

// ── 1. naming-contract（3 分支）──────────────────────────────────────────────

test('naming-contract：删「tests/checks 必须 .test.mjs」→ 坏夹具漏过', async () => {
  const root = fixture({
    'checks/lanes/ok.e2e.mjs': '',
    'tests/checks/bad.mjs': '',
    'checks/audit/ok-audit.mjs': '',
    'checks/gates/ok.mjs': '',
    'probes/team/ok-probe.mjs': '',
  }, ['checks/lanes', 'checks/audit', 'checks/gates', 'tests/checks', 'probes'])
  const mutated = await mutant('naming-contract',
    "if (!entry.name.endsWith('.test.mjs')) failWith(join(checksDir, entry.name), '期望 .test.mjs（门禁自身）')",
    "if (false) failWith(join(checksDir, entry.name), '期望 .test.mjs（门禁自身）')")
  try {
    assert.match(invoke(naming, root).problems.join(), /bad\.mjs/)
    assert.deepEqual(invoke(mutated.mod, root).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

test('naming-contract：删「probes 必须 -probe.mjs」与「禁词表」→ 各自坏夹具漏过', async () => {
  const rootProbe = fixture({
    'checks/lanes/ok.e2e.mjs': '',
    'checks/audit/ok-audit.mjs': '',
    'checks/gates/ok.mjs': '',
    'probes/team/bad-e2e.mjs': '',
  }, ['checks/lanes', 'checks/audit', 'checks/gates', 'probes'])
  const mutProbe = await mutant('naming-contract',
    "if (!path.endsWith('-probe.mjs')) failWith(path, '期望 -probe.mjs（fixture 入口只允许 <域>/<fixture>/index.mjs）')",
    'if (false) failWith(path, "")')
  try {
    assert.match(invoke(naming, rootProbe).problems.join(), /bad-e2e\.mjs/)
    assert.deepEqual(invoke(mutProbe.mod, rootProbe).problems, [])
  } finally { mutProbe.cleanup(); rmSync(rootProbe, { recursive: true, force: true }) }

  const rootBanned = fixture({
    'checks/lanes/golden-case.e2e.mjs': '',
    'checks/audit/ok-audit.mjs': '',
    'checks/gates/ok.mjs': '',
  }, ['checks/lanes', 'checks/audit', 'checks/gates', 'probes'])
  const mutBanned = await mutant('naming-contract',
    'if (hit) failWith(path, `文件名含禁用词 ${hit}（改用准确的词，如 expected）`)',
    'if (false) failWith(path, "")')
  try {
    assert.match(invoke(naming, rootBanned).problems.join(), /含禁用词 golden/)
    assert.deepEqual(invoke(mutBanned.mod, rootBanned).problems, [])
  } finally { mutBanned.cleanup(); rmSync(rootBanned, { recursive: true, force: true }) }
})

// ── 2. company-root-carriers（3 分支）────────────────────────────────────────

test('company-root-carriers：删「未登记写入口」→ 未登记 writer 漏过', async () => {
  const root = fixture({
    'packages/company-pack/src/host/writer.ts': ["const p = '.dsh-company/x'", "writeFileSync(p, 'x')"].join('\n'),
  })
  const mutated = await mutant('company-root-carriers', 'if (!registered.has(rel)) {', 'if (false) {')
  try {
    const extra = { carriers: [], exempt: [], knownGap: [], markdownPrimitives: [], tooling: [] }
    assert.match(invoke(carrier, root, extra).problems.join(), /未登记的公司盘写入口/)
    assert.deepEqual(invoke(mutated.mod, root, extra).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

test('company-root-carriers：删「禁裸节切分正则」与「SKILL.md YAML 头校验」→ 坏门禁与坏技能漏过', async () => {
  const rootRaw = fixture({
    'packages/company-pack/src/host/noop.ts': 'export const x = 1\n',
    'checks/gates/raw-split.mjs': 'export const h = /^##\\s+(.+)$/m\n',
  })
  const mutRaw = await mutant('company-root-carriers',
    'else if (RAW_HEADING_SPLIT_RE.test(pattern) || RAW_HEADING_ANYWHERE_RE.test(pattern)) {',
    'else if (false) {')
  try {
    const extra = { carriers: [], exempt: [], knownGap: [], markdownPrimitives: [], tooling: [] }
    assert.match(invoke(carrier, rootRaw, extra).problems.join(), /禁止手写裸 Markdown 节切分正则/)
    assert.deepEqual(invoke(mutRaw.mod, rootRaw, extra).problems, [])
  } finally { mutRaw.cleanup(); rmSync(rootRaw, { recursive: true, force: true }) }

  const rootStr = fixture({
    'packages/company-pack/src/host/noop.ts': 'export const x = 1\n',
    'checks/gates/str-split.mjs': 'export const f = line => line.startsWith(\'## 节\') || line.split(\'\\n## 尾\')\n',
  })
  const mutStr = await mutant('company-root-carriers',
    'else if (prefix !== undefined && RAW_HEADING_STRING_RE.test(prefix)) {',
    'else if (false) {')
  try {
    const extra = { carriers: [], exempt: [], knownGap: [], markdownPrimitives: [], tooling: [] }
    assert.match(invoke(carrier, rootStr, extra).problems.join(), /禁止手写裸 Markdown 节判据/)
    assert.deepEqual(invoke(mutStr.mod, rootStr, extra).problems, [])
  } finally { mutStr.cleanup(); rmSync(rootStr, { recursive: true, force: true }) }

  const rootSkill = fixture({
    'packages/company-pack/src/host/noop.ts': 'export const x = 1\n',
    '.agents/skills/broken/SKILL.md': '---\nname: broken\ndescription: unquoted: colon: error\n---\n# broken\n',
  })
  const mutSkill = await mutant('company-root-carriers',
    'if (!parsed.present || parsed.error !== undefined) {',
    'if (false) {')
  try {
    const extra = { carriers: [], exempt: [], knownGap: [], markdownPrimitives: [], tooling: [] }
    assert.match(invoke(carrier, rootSkill, extra).problems.join(), /SKILL\.md YAML frontmatter 不可解析/)
    assert.deepEqual(invoke(mutSkill.mod, rootSkill, extra).problems, [])
  } finally { mutSkill.cleanup(); rmSync(rootSkill, { recursive: true, force: true }) }
})

test('company-root-carriers：删「工具盘 .dsh-company 未登记」→ 未登记 tooling 漏过（B2）', async () => {
  const root = fixture({
    'packages/company-pack/src/host/noop.ts': 'export const x = 1\n',
    'tools/lib/scaffold.mjs': ["mkdirSync(join(ws, '.dsh-company/kb'), { recursive: true })", ''].join('\n'),
  }, ['tools/lib'])
  const mutTooling = await mutant('company-root-carriers',
    'if (pos === undefined) continue',
    'if (pos !== undefined) continue')
  try {
    const extra = { carriers: [], exempt: [], knownGap: [], markdownPrimitives: [], tooling: [] }
    assert.match(invoke(carrier, root, extra).problems.join(), /tools\/lib\/scaffold\.mjs:1 → 禁止手写裸 \.dsh-company 路径拼接/)
    assert.deepEqual(invoke(mutTooling.mod, root, extra).problems, [])
  } finally { mutTooling.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

// ── 3. fix-evidence（5 分支：缺节 / 空操作命令 / 围栏假字段 / 提交改动面对账 / 浅克隆跳过）──

test('fix-evidence：删「缺修复证据」→ 缺节卡漏过', async () => {
  const root = fixture({
    '_backlog/_archive/fixed_bugs/BUG-900-fixture.md': ['---', 'status: 已修', 'opened: 2026-11-14', '---', '', '# BUG-900'].join('\n'),
  })
  const mutated = await mutant('fix-evidence',
    "state.problems.push(`${rel} 缺「## 修复证据」（已修卡必须给改动面/红/绿/提交——翻状态 + git mv 不算修复）`)\n    return",
    'return')
  try {
    assert.match(invoke(fixEvidence, root).problems.join(), /缺「## 修复证据」/)
    assert.deepEqual(invoke(mutated.mod, root).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

test('fix-evidence：删「sh -c 内联脚本拒绝」与「围栏假字段隔离」→ 伪命令与围栏假字段漏过', async () => {
  const rootCmd = mkdtempSync(join(tmpdir(), 'gate-mut-fix-cmd-'))
  const { sha } = initGitRepo(rootCmd, {
    'package.json': JSON.stringify({ scripts: { test: 'echo ok' } }),
    'packages/company-pack/src/a.ts': 'export const a = 1\n',
  })
  mkdirSync(join(rootCmd, '_backlog/_archive/fixed_bugs'), { recursive: true })
  writeFileSync(join(rootCmd, '_backlog/_archive/fixed_bugs/BUG-901-cmd.md'), [
    '---', 'status: 已修', 'opened: 2026-11-14', '---', '',
    '## 修复证据',
    '- 改动面：`packages/company-pack/src/a.ts`',
    '- 红：`sh -c false`',
    '- 绿：`sh -c false`',
    `- 提交：commit ${sha}`,
  ].join('\n'))
  const mutCmd = await mutant('fix-evidence',
    "if (tokens.includes('-c')) return 'sh -c 是内联脚本，不算可复跑证据（写成脚本文件）'",
    'if (tokens.includes("-c")) return undefined')
  try {
    assert.match(invoke(fixEvidence, rootCmd).problems.join(), /sh -c 是内联脚本/)
    assert.deepEqual(invoke(mutCmd.mod, rootCmd).problems, [])
  } finally { mutCmd.cleanup(); rmSync(rootCmd, { recursive: true, force: true }) }

  // 围栏假字段：真节正文为空，四行证据全躲在代码块示例里
  const rootFence = mkdtempSync(join(tmpdir(), 'gate-mut-fix-fence-'))
  const repoFence = initGitRepo(rootFence, {
    'package.json': JSON.stringify({ scripts: { test: 'echo ok' } }),
    'packages/company-pack/src/a.ts': 'export const a = 1\n',
  })
  mkdirSync(join(rootFence, '_backlog/_archive/fixed_bugs'), { recursive: true })
  writeFileSync(join(rootFence, '_backlog/_archive/fixed_bugs/BUG-902-fence.md'), [
    '---', 'status: 已修', 'opened: 2026-11-14', '---', '',
    '## 修复证据',
    '```md',
    '- 改动面：`packages/company-pack/src/a.ts`',
    '- 红：`pnpm test`',
    '- 绿：`pnpm test`',
    `- 提交：commit ${repoFence.sha}`,
    '```',
  ].join('\n'))
  const mutFence = await mutant('fix-evidence',
    'return sectionStructuralText(text, heading)',
    'return text')
  try {
    assert.match(invoke(fixEvidence, rootFence).problems.join(), /缺反引号路径/)
    assert.deepEqual(invoke(mutFence.mod, rootFence).problems, [])
  } finally { mutFence.cleanup(); rmSync(rootFence, { recursive: true, force: true }) }
})

test('fix-evidence：删「提交改动面交集对账」与「浅克隆跳过分支」→ 假改动面漏过 / 浅克隆误判不存在', async () => {
  const rootDiff = mkdtempSync(join(tmpdir(), 'gate-mut-fix-diff-'))
  const { sha } = initGitRepo(rootDiff, {
    'package.json': JSON.stringify({ scripts: { test: 'echo ok' } }),
    'packages/company-pack/src/touched.ts': 'export const t = 1\n',
  })
  mkdirSync(join(rootDiff, '_backlog/_archive/fixed_bugs'), { recursive: true })
  writeFileSync(join(rootDiff, '_backlog/_archive/fixed_bugs/BUG-903-diff.md'), [
    '---', 'status: 已修', 'opened: 2026-11-14', '---', '',
    '## 修复证据',
    '- 改动面：`packages/company-pack/src/untouched.ts`',
    '- 红：`pnpm test`',
    '- 绿：`pnpm test`',
    `- 提交：commit ${sha}`,
  ].join('\n'))
  const mutDiff = await mutant('fix-evidence',
    'if (surfaces.length > 0 && !hit) {',
    'if (false) {')
  try {
    assert.match(invoke(fixEvidence, rootDiff).problems.join(), /没有改到改动面里的任何路径/)
    assert.deepEqual(invoke(mutDiff.mod, rootDiff).problems, [])
  } finally { mutDiff.cleanup(); rmSync(rootDiff, { recursive: true, force: true }) }

  // 浅克隆分支：写入 .git/shallow 使 `git rev-parse --is-shallow-repository` 为 true，且卡引用不可达的古老提交
  const rootShallow = mkdtempSync(join(tmpdir(), 'gate-mut-fix-shallow-'))
  const shallowRepo = initGitRepo(rootShallow, {
    'package.json': JSON.stringify({ scripts: { test: 'echo ok' } }),
    'packages/company-pack/src/a.ts': 'export const a = 1\n',
  })
  const fullHead = shallowRepo.runGit(['rev-parse', 'HEAD'])
  writeFileSync(join(rootShallow, '.git/shallow'), `${fullHead}\n`)
  mkdirSync(join(rootShallow, '_backlog/_archive/fixed_bugs'), { recursive: true })
  writeFileSync(join(rootShallow, '_backlog/_archive/fixed_bugs/BUG-904-shallow.md'), [
    '---', 'status: 已修', 'opened: 2026-11-14', '---', '',
    '## 修复证据',
    '- 改动面：`packages/company-pack/src/a.ts`',
    '- 红：`pnpm test`',
    '- 绿：`pnpm test`',
    '- 提交：commit 11111111',
  ].join('\n'))
  const mutShallow = await mutant('fix-evidence',
    "if (git(root, ['rev-parse', '--is-shallow-repository']) === 'true') { state.shallowSkipped += 1; return }",
    'if (false) { state.shallowSkipped += 1; return }')
  try {
    const origRes = invoke(fixEvidence, rootShallow)
    assert.deepEqual(origRes.problems, [])
    assert.match(origRes.okLine, /1 张跳过提交解析/)
    assert.match(invoke(mutShallow.mod, rootShallow).problems.join(), /提交 11111111 不存在/)
  } finally { mutShallow.cleanup(); rmSync(rootShallow, { recursive: true, force: true }) }
})

// ── 4. notes-tree（4 分支：未知生命周期 / symlink / 非闰年假日期 / 状态词错位）────────

test('notes-tree：删「未知生命周期目录」→ zz 目录漏过', async () => {
  const root = fixture({ 'notes/README.md': '# notes\n' }, ['notes/zz-lifecycle'])
  const mutated = await mutant('notes-tree',
    "if (!LIFECYCLES.includes(entry.name)) {\n      problems.push(`notes/${entry.name}/ — 未知生命周期目录（允许：${LIFECYCLES.join('、')}）`)\n      continue\n    }",
    'if (false) {\n      continue\n    }')
  try {
    assert.match(invoke(notesTree, root).problems.join(), /未知生命周期目录/)
    assert.deepEqual(invoke(mutated.mod, root).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

test('notes-tree：删「软链拒绝」「真实日历日期」「状态词前缀」→ 各自坏夹具漏过', async () => {
  // 软链
  const rootSym = fixture({
    'notes/README.md': '# notes\n',
    'outside.md': '状态：implemented\n',
  }, ['notes/implemented'])
  symlinkSync(join(rootSym, 'outside.md'), join(rootSym, 'notes/implemented/2026-11-14-sym.md'))
  const mutSym = await mutant('notes-tree',
    "if (child.isSymbolicLink()) {\n        problems.push(`${rel} — 符号链接（Notes 只许普通文件/目录；链接内容绕不过状态与形状门）`)\n        continue\n      }",
    'if (child.isSymbolicLink()) {\n        continue\n      }')
  try {
    assert.match(invoke(notesTree, rootSym).problems.join(), /符号链接/)
    assert.deepEqual(invoke(mutSym.mod, rootSym).problems, [])
  } finally { mutSym.cleanup(); rmSync(rootSym, { recursive: true, force: true }) }

  // 非闰年假日期 2026-02-29
  const rootDate = fixture({
    'notes/README.md': '# notes\n',
    'notes/implemented/2026-02-29-bad-leap.md': '状态：implemented\n',
  })
  const mutDate = await mutant('notes-tree',
    'if (date !== undefined && !isCalendarDate(date)) {',
    'if (false) {')
  try {
    assert.match(invoke(notesTree, rootDate).problems.join(), /不是真实日历日期/)
    assert.deepEqual(invoke(mutDate.mod, rootDate).problems, [])
  } finally { mutDate.cleanup(); rmSync(rootDate, { recursive: true, force: true }) }

  // implemented 误写 proposed 状态词
  const rootStatus = fixture({
    'notes/README.md': '# notes\n',
    'notes/implemented/2026-11-14-wrong-status.md': '状态：proposed\n',
  })
  const mutStatus = await mutant('notes-tree',
    'if (!/^状态[:：]\\s*\\**\\s*(implemented|已交付|已消化)/.test(statusText)) {',
    'if (false) {')
  try {
    assert.match(invoke(notesTree, rootStatus).problems.join(), /状态词须以 implemented/)
    assert.deepEqual(invoke(mutStatus.mod, rootStatus).problems, [])
  } finally { mutStatus.cleanup(); rmSync(rootStatus, { recursive: true, force: true }) }
})

// ── 5. notes-axes（2 分支：四分类前缀 / 右侧实盘锚点）──────────────────────────

test('notes-axes：删「四分类前缀」与「右侧实盘文件锚点」→ 裸条目与空头支票漏过', async () => {
  const rootNoCat = fixture({
    'docs/policy.md': '# policy\n',
    'notes/implemented/2026-11-14-nocat.md': '状态：implemented\n\n## 未覆盖轴\n- 某轴 → `docs/policy.md`\n',
  })
  const mutNoCat = await mutant('notes-axes',
    'if (!CATEGORY_PREFIX.test(trimmed)) {',
    'if (false) {')
  try {
    assert.match(invoke(notesAxes, rootNoCat).problems.join(), /四分类前缀/)
    assert.deepEqual(invoke(mutNoCat.mod, rootNoCat).problems, [])
  } finally { mutNoCat.cleanup(); rmSync(rootNoCat, { recursive: true, force: true }) }

  const rootHollow = fixture({
    'notes/implemented/2026-11-14-hollow.md': '状态：implemented\n\n## 未覆盖轴\n- [policy] 4 消费者差分 → 决定：留后续卡\n',
  })
  const mutHollow = await mutant('notes-axes',
    'if (!hasRealTargetFile(target, rootDir, noteDir, selfAbsPath)) {',
    'if (false) {')
  try {
    assert.match(invoke(notesAxes, rootHollow).problems.join(), /右侧缺盘上真实文件锚点/)
    assert.deepEqual(invoke(mutHollow.mod, rootHollow).problems, [])
  } finally { mutHollow.cleanup(); rmSync(rootHollow, { recursive: true, force: true }) }

  const rootSelfLink = fixture({
    'notes/implemented/2026-11-14-self.md': '状态：implemented\n\n## 未覆盖轴\n- [policy] 自链逃逸 → [自己](./2026-11-14-self.md)\n',
  })
  const mutSelfLink = await mutant('notes-axes',
    'if (resolved !== selfAbsPath && isExistingRepoFile(rootDir, resolved)) return true',
    'if (isExistingRepoFile(rootDir, resolved)) return true')
  try {
    assert.match(invoke(notesAxes, rootSelfLink).problems.join(), /右侧缺盘上真实文件锚点/)
    assert.deepEqual(invoke(mutSelfLink.mod, rootSelfLink).problems, [])
  } finally { mutSelfLink.cleanup(); rmSync(rootSelfLink, { recursive: true, force: true }) }

  const rootArchived = fixture({
    'notes/archived/2026-11-14-escaped.md': '状态：implemented\n\n## 未覆盖轴\n- [policy] 迁入归档逃逸 → 决定：留后续卡\n',
  })
  const mutArchived = await mutant('notes-axes',
    "const LIFECYCLE_DIRS = ['notes/implemented', 'notes/archived']",
    "const LIFECYCLE_DIRS = ['notes/implemented']")
  try {
    assert.match(invoke(notesAxes, rootArchived).problems.join(), /四分类前缀|右侧缺盘上真实文件锚点/)
    assert.deepEqual(invoke(mutArchived.mod, rootArchived).problems, [])
  } finally { mutArchived.cleanup(); rmSync(rootArchived, { recursive: true, force: true }) }
})

// ── 6. backlog-liveness（2 分支：验收标准可执行标记 / 归档 note 去向真实文件锚点）──

test('backlog-liveness：删「待落地可执行标记」与「归档去向=note 实盘校验」→ 空泛门票与自链漏过', async () => {
  const cardNoExec = [
    '---', 'status: 待落地', 'opened: 2026-11-14', '---', '',
    '# 卡',
    '> 立卡：2026-11-14 ｜ 状态：待落地 ｜ 毕业：做 ｜ 可关闭：否',
    '> **结论/去向**：note — `计划:notes/implemented/2026-11-14-x.md`',
    '',
    '## 验收标准',
    '全部测试通过即可。',
    '',
    '## 落地证据',
    '计划跑 `pnpm verify`。',
  ].join('\n')
  const rootExec = fixture(minimalBacklogFiles({
    '_backlog/issues/README.md': '# issues\n- [x](2026-11-14-no-exec.md)\n',
    '_backlog/issues/2026-11-14-no-exec.md': cardNoExec,
  }))
  const mutExec = await libMutant('backlog-liveness',
    "else if (String(data.opened ?? '') >= '2026-11-14' && !EXECUTABLE.test(acceptance))",
    'else if (false)')
  try {
    assert.match(backlogLivenessProblems(join(rootExec, '_backlog')).join(), /没有可执行标记/)
    assert.deepEqual(mutExec.mod.backlogLivenessProblems(join(rootExec, '_backlog')), [])
  } finally { mutExec.cleanup(); rmSync(rootExec, { recursive: true, force: true }) }

  const cardSelfLink = [
    '---', 'status: 已结', 'opened: 2026-11-14', '---', '',
    '# 已结卡',
    '> 立卡：2026-11-14 ｜ 状态：已结 ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — ok',
    '> **结论/去向**：note — [自链](2026-11-14-self.md)',
  ].join('\n')
  const rootSelf = fixture(minimalBacklogFiles({
    '_backlog/_archive/README.md': '# archive\n- [s](settled_issues/2026-11-14-self.md)\n',
    '_backlog/_archive/settled_issues/2026-11-14-self.md': cardSelfLink,
  }), ['notes/implemented'])
  const mutSelf = await libMutant('backlog-liveness',
    'if (!resolved)',
    'if (false)')
  try {
    assert.match(backlogLivenessProblems(join(rootSelf, '_backlog')).join(), /未解析到 notes\/ 下的真实文件/)
    assert.deepEqual(mutSelf.mod.backlogLivenessProblems(join(rootSelf, '_backlog')), [])
  } finally { mutSelf.cleanup(); rmSync(rootSelf, { recursive: true, force: true }) }
})

// ── 7. keyless-lane 零命中防假绿（真实子进程退出码断言）────────────────────────

test('keyless-lane：--filter zz-none 选中 0 个资产必须非零退出（拒绝 0 命中假绿）', () => {
  const res = spawnSync(process.execPath, [join(ROOT_DIR, 'checks/lanes/keyless-lane.mjs'), '--filter', 'zz-none'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  })
  assert.equal(res.status, 1)
  assert.match(res.stderr, /0 个资产命中过滤条件/)
})

// ── 8. ledger-routing（5 分支：现行表禁退役残留 / 表外散文上限 / 禁非结构块 / 行尾闭合竖线 / 编号连续不断档）──

test('ledger-routing：删「现行表禁删除线」「表外散文上限」「禁代码块」「行尾闭合竖线」「断档检查」→ 各自坏台账漏过', async () => {
  const mkLedger = ({ intro = ['> 路由表。'], dirty = false, skip24 = false, unclosed4th = false } = {}) => {
    const active = Array.from({ length: 20 }, (_, i) => {
      const n = i + 1
      const txt = dirty && n === 3 ? '~~旧决定~~ 现已废止' : `现行决定 ${String(n)}`
      const tail = unclosed4th && n === 2 ? ' 第四列逃逸正文' : ''
      return `| <a id="d${String(n)}"></a>D${String(n)} | ${txt} | [Note](../../notes/implemented/n.md) |${tail}`
    })
    const retired = [
      '| <a id="d21"></a>D21 | 退役 21 | [旧](../../notes/archived/o.md) |',
      '| <a id="d22"></a>D22 | 退役 22 | [旧](../../notes/archived/o.md) |',
      skip24
        ? '| <a id="d24"></a>D24 | 跳过 D23 | [旧](../../notes/archived/o.md) |'
        : '| <a id="d23"></a>D23 | 退役 23 | [旧](../../notes/archived/o.md) |',
    ]
    return [
      '# 决策台账', '', ...intro, '',
      '## 现行决定', '', '| # | 一句话 | 决定的家 |', '|---|---|---|', ...active, '',
      '## 已退役', '', '| # | 一句话 | 决定的家 |', '|---|---|---|', ...retired, '',
    ].join('\n')
  }

  const rootDirty = fixture({
    'notes/implemented/n.md': '# n\n',
    'notes/archived/o.md': '# o\n',
    'docs/reference/decisions.md': mkLedger({ dirty: true }),
  })
  const mutDirty = await mutant('ledger-routing',
    "if (sec.title === '现行决定' && ACTIVE_FORBIDDEN.test(summary)) {",
    'if (false) {')
  try {
    assert.match(invoke(ledgerRouting, rootDirty).problems.join(), /含删除线或已退役/)
    assert.deepEqual(invoke(mutDirty.mod, rootDirty).problems, [])
  } finally { mutDirty.cleanup(); rmSync(rootDirty, { recursive: true, force: true }) }

  const rootProse = fixture({
    'notes/implemented/n.md': '# n\n',
    'notes/archived/o.md': '# o\n',
    'docs/reference/decisions.md': mkLedger({ intro: Array.from({ length: 11 }, (_, i) => `散文 ${String(i + 1)}`) }),
  })
  const mutProse = await mutant('ledger-routing',
    'if (proseLines.length > LEDGER_MAX_PROSE_LINES) {',
    'if (false) {')
  try {
    assert.match(invoke(ledgerRouting, rootProse).problems.join(), /表外散文 11 行超上限 10 行/)
    assert.deepEqual(invoke(mutProse.mod, rootProse).problems, [])
  } finally { mutProse.cleanup(); rmSync(rootProse, { recursive: true, force: true }) }

  const rootCode = fixture({
    'notes/implemented/n.md': '# n\n',
    'notes/archived/o.md': '# o\n',
    'docs/reference/decisions.md': mkLedger({ intro: ['```txt', '代码块膨胀', '```'] }),
  })
  const mutCode = await mutant('ledger-routing',
    'if (nonStructural.length > 0) {',
    'if (false) {')
  try {
    assert.match(invoke(ledgerRouting, rootCode).problems.join(), /不许出现代码块、块级 HTML 或 frontmatter/)
    assert.deepEqual(invoke(mutCode.mod, rootCode).problems, [])
  } finally { mutCode.cleanup(); rmSync(rootCode, { recursive: true, force: true }) }

  const rootUnclosed = fixture({
    'notes/implemented/n.md': '# n\n',
    'notes/archived/o.md': '# o\n',
    'docs/reference/decisions.md': mkLedger({ unclosed4th: true }),
  })
  const mutUnclosed = await mutant('ledger-routing',
    'if (cells.length !== 5 || !closedLeft || !closedRight) {',
    'if (cells.length !== 5) {')
  try {
    assert.match(invoke(ledgerRouting, rootUnclosed).problems.join(), /行必须是闭合三列/)
    assert.deepEqual(invoke(mutUnclosed.mod, rootUnclosed).problems, [])
  } finally { mutUnclosed.cleanup(); rmSync(rootUnclosed, { recursive: true, force: true }) }

  const rootGap = fixture({
    'notes/implemented/n.md': '# n\n',
    'notes/archived/o.md': '# o\n',
    'docs/reference/decisions.md': mkLedger({ skip24: true }),
  })
  const mutGap = await mutant('ledger-routing',
    'if (missing.length) {',
    'if (false) {')
  try {
    assert.match(invoke(ledgerRouting, rootGap).problems.join(), /编号断档.*缺 D23/)
    assert.deepEqual(invoke(mutGap.mod, rootGap).problems, [])
  } finally { mutGap.cleanup(); rmSync(rootGap, { recursive: true, force: true }) }
})
