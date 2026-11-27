// 状态：常驻
// 何时跑：改 `checks/pre-push-surfaces.mjs`（push 范围计算）或 `tools/lib/core/asset-lanes.mjs` SURFACE_RULES 后；
//   `pnpm test:checks`（pre-push 也跑）。keyless，秒级，不进 pnpm test。
//
// 为什么在这里：判据要真起 git 仓库 + 真跑脚本子进程（`--root` 只服务本自测，见脚本头注）；
//   tests/ 的 layering 守卫禁止 import checks 驱动，所以自测住 tests/checks/。
//
// 判据（BUG-158，三种 push 形状各一条）：
//   ① 新分支首次 push（remote 全零）：父提交改了 client、tip 只改 docs → 必须印出 client 面；
//   ② 删除 ref（local 全零）：跳过该 ref、不跑 git diff、退出码 0；
//   ③ 普通 push（remote 非零）：仍按 <remote>..<local> 范围（不回归）。
// 判据（BUG-161，merge 形状）：
//   ④ 新分支 tip 是 merge 提交、合并结果里新增 client 文件 → 必须印出 client 面（diff-tree 对 merge 无输出）。
//
// 负例留证 2026-11-14：把 `pathsOfRef` 改回「零 remote → 只 diff-tree tip」→ ① 红；
//   去掉 `isZero(localSha)` 跳过 → ② 红（`bad object 000…`，退出码非零）；
//   把 `commitPaths` 的 merge 分支删掉（回退成单 diff-tree）→ ④ 红（印「未触发」）。
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const SCRIPT = new URL('../../checks/pre-push-surfaces.mjs', import.meta.url).pathname
const ZERO = '0000000000000000000000000000000000000000'
const CLIENT_FILE = 'packages/company-pack/src/client/wiring/error-ring.ts'
const DOC_FILE = 'docs/README.md'

/** 在临时目录造一个带提交的 git 仓库；返回 { dir, commit, cleanup }。 */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'pp-surfaces-'))
  const git = args => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  git(['init', '-q', '--initial-branch', 'main'])
  git(['config', 'user.email', 't@t'])
  git(['config', 'user.name', 't'])
  git(['config', 'commit.gpgsign', 'false'])
  const commit = (rel, body, message) => {
    mkdirSync(join(dir, rel, '..'), { recursive: true })
    writeFileSync(join(dir, rel), body)
    git(['add', '-A'])
    git(['commit', '-q', '-m', message])
    return git(['rev-parse', 'HEAD'])
  }
  return { dir, commit, git, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** 把 refs 四元组写进临时 stdin 文件并以 --dry-run 跑真脚本。 */
function run(workdir, refs) {
  const stdinPath = join(workdir, 'refs.txt')
  writeFileSync(stdinPath, `${refs.join('\n')}\n`)
  const result = spawnSync(process.execPath, [SCRIPT, '--root', workdir, '--stdin', stdinPath, '--dry-run'], { encoding: 'utf8' })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

test('新分支首次 push（remote 全零）：覆盖整条出站提交集，不只看 tip', () => {
  const { dir, commit, cleanup } = repo()
  try {
    // 父提交改 client 面；tip 只改 docs——只看 tip 就会漏掉 client-load（假绿）。
    const parent = commit(CLIENT_FILE, 'export const x = 1\n', 'feat: client')
    const tip = commit(DOC_FILE, '# docs\n', 'docs: note')
    assert.notEqual(parent, tip)
    const { status, out } = run(dir, [`refs/heads/feat ${tip} refs/heads/feat ${ZERO}`])
    assert.equal(status, 0, out)
    assert.match(out, /because|因为改了/, `应命中面级检查：${out}`)
    assert.match(out, /client-load/, `父提交的 client 改动必须带出 client-load：${out}`)
  } finally { cleanup() }
})

test('删除 ref（local 全零）：跳过该 ref，不调 diff，退出码 0', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const head = commit(CLIENT_FILE, 'export const x = 1\n', 'feat: client')
    const { status, out } = run(dir, [`(delete) ${ZERO} refs/heads/feat ${head}`])
    assert.equal(status, 0, `删除 ref 不许崩：${out}`)
    assert.doesNotMatch(out, /bad object/, out)
    assert.match(out, /跳过/, `应说明跳过而不是静默：${out}`)
    assert.doesNotMatch(out, /client-load/, `被删除的 ref 没有变更面：${out}`)
  } finally { cleanup() }
})

test('普通 push（remote 非零）：仍按 <remote>..<local> 范围，不回归', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const base = commit(DOC_FILE, '# docs\n', 'docs: base')
    const tip = commit(CLIENT_FILE, 'export const x = 1\n', 'feat: client')
    const { status, out } = run(dir, [`refs/heads/feat ${tip} refs/heads/feat ${base}`])
    assert.equal(status, 0, out)
    assert.match(out, /client-load/, `范围内有 client 改动 → client-load：${out}`)
  } finally { cleanup() }
})

test('merge 提交（remote 全零）：合并结果里的 surface 改动必须带出 client-load', () => {
  const { dir, commit, git, cleanup } = repo()
  try {
    commit(DOC_FILE, '# base\n', 'base')
    commit('notes/feat.md', '# feat\n', 'feat: docs')
    // side 的提交已在远端：merge 本身才是出站提交
    git(['checkout', '-q', '-b', 'side', 'HEAD~1'])
    const side = commit('notes/side.md', '# side\n', 'side: docs')
    git(['update-ref', 'refs/remotes/origin/main', side])
    git(['checkout', '-q', 'main'])
    git(['merge', '--no-commit', 'side'])
    // 只有合并结果才有的 client 改动（模拟冲突解决/合并编辑）
    mkdirSync(join(dir, 'packages/company-pack/src/client/wiring'), { recursive: true })
    writeFileSync(join(dir, CLIENT_FILE), 'export const merged = 1\n')
    git(['add', '-A'])
    git(['commit', '-q', '-m', 'merge: client change in result'])
    const tip = git(['rev-parse', 'HEAD'])
    const { status, out } = run(dir, [`refs/heads/main ${tip} refs/heads/main ${ZERO}`])
    assert.equal(status, 0, out)
    assert.match(out, /client-load/, `merge 合并结果的 client 改动必须带出 client-load：${out}`)
  } finally { cleanup() }
})

// 判据（2026-11-16 二轮，BUG-199/201）：
//   ⑤ 未登记改动面（既无 asset 也无 coveredBy）必须阻断：--dry-run 也退出非零；
//   ⑥ `--paths` 入口必须归一 `./` 与 Windows 反斜杠，否则维护者复制来的路径会假阴性。
// 负例留证 2026-11-16（二轮）：删掉 unseen → exitCode 1 的分支 → ⑤ 红（exit 0）；
//   去掉 normalizePath → ⑥ 红（`./` 打印未分类、无反斜杠命中）。
test('未登记改动面：--dry-run 退出非零并点名登记（2026-11-16 二轮，BUG-199）', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--dry-run', '--paths', 'zz-unregistered/file.txt'], { encoding: 'utf8' })
  const out = `${result.stdout}${result.stderr}`
  assert.notEqual(result.status, 0, `未分类必须阻断（不能只打印）：${out}`)
  assert.match(out, /未分类改动面/, out)
  assert.match(out, /登记 SURFACE_RULES/, out)
})

test('--paths 归一 ./ 与反斜杠：与裸路径同一结论（2026-11-16 二轮，BUG-201）', () => {
  const runPaths = paths => spawnSync(process.execPath, [SCRIPT, '--dry-run', '--paths', paths], { encoding: 'utf8' })
  const bare = runPaths('packages/company-pack/src/lib/presence/presence.ts')
  const dot = runPaths('./packages/company-pack/src/lib/presence/presence.ts')
  const win = runPaths('packages\\company-pack\\src\\lib\\presence\\presence.ts')
  for (const [label, result] of [['./ 前缀', dot], ['反斜杠', win]]) {
    const out = `${result.stdout}${result.stderr}`
    assert.equal(result.status, bare.status, `${label} 与裸路径退出码应一致：${out}`)
    assert.match(out, /→ replay/, `${label} 应命中 replay：${out}`)
  }
})

// 判据（2026-11-16 二轮·盲审 B1）：git 默认对非 ASCII 路径做 C-quote（`"_dist/\345…md"`），
//   引号字符串不命中锚定 glob → 合法路径在 fail-closed 下被误判「未分类」。三处 diff 必须 `-z`。
// 负例留证 2026-11-16（二轮）：把 `pathsOfRef` 的 `-z` 去掉 → 非 ASCII 用例红（未分类 + exit 1）。
test('非 ASCII 路径不被 git 的 C-quote 误判未分类（2026-11-16 二轮，BUG-199）', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const base = commit(DOC_FILE, '# docs\n', 'docs: base')
    const tip = commit('docs/中文说明.md', '# 中文\n', 'docs: non-ascii')
    const { status, out } = run(dir, [`refs/heads/feat ${tip} refs/heads/feat ${base}`])
    assert.equal(status, 0, `非 ASCII docs 路径必须命中 docs/** 且不阻断：${out}`)
    assert.doesNotMatch(out, /未分类/, out)
  } finally { cleanup() }
})

test('--exec-plan --dry-run：docs-only 走快速路径，代码/探针改动按面精准计划（BUG-406）', () => {
  const runPlan = paths => spawnSync(
    process.execPath,
    [SCRIPT, '--exec-plan', '--dry-run', '--paths', paths],
    { encoding: 'utf8' },
  )
  const docs = runPlan('docs/testing.md,notes/implemented/x.md')
  assert.equal(docs.status, 0, docs.stdout + docs.stderr)
  assert.match(docs.stdout, /docs-only 快速路径/, docs.stdout)

  const client = runPlan('packages/company-pack/src/client/wiring/error-ring.ts')
  assert.equal(client.status, 0, client.stdout + client.stderr)
  assert.match(client.stdout, /steps=\[typecheck, lint, dup, smoke:fast, test:spec\]/, client.stdout)
  assert.match(client.stdout, /assets=\[client-load\]/, client.stdout)
  assert.match(client.stdout, /移出 push 阻塞链，收口用 pnpm smoke:surface/, client.stdout)
  assert.match(client.stdout, /vitest = related/, client.stdout)

  const probe = runPlan('probes/analyze/orient-probe.mjs')
  assert.equal(probe.status, 0, probe.stdout + probe.stderr)
  assert.match(probe.stdout, /entry-import-graph\.spec\.ts/, probe.stdout)
  assert.match(probe.stdout, /vitest = targeted/, probe.stdout)

  // 盲审 S-2：未分类路径退出非零且不得误印 docs-only 快速路径；已删除源码路径须带出兜底 targetedSpecs。
  const unseen = runPlan('zz-unseen/file.txt')
  assert.notEqual(unseen.status, 0, unseen.stdout + unseen.stderr)
  assert.doesNotMatch(unseen.stdout, /docs-only 快速路径/, unseen.stdout)

  const deletedSrc = runPlan('packages/company-pack/src/client/zz-deleted-nonexistent.ts')
  assert.equal(deletedSrc.status, 0, deletedSrc.stdout + deletedSrc.stderr)
  assert.match(deletedSrc.stdout, /deletedFallback = packages\/company-pack\/src\/client\/zz-deleted-nonexistent\.ts/, deletedSrc.stdout)
  assert.match(deletedSrc.stdout, /entry-import-graph\.spec\.ts/, deletedSrc.stdout)
  assert.match(deletedSrc.stdout, /pack-exports\.spec\.ts/, deletedSrc.stdout)

  // 合并去重与超阈值回退单次全测：小改动合并 related+targeted 为单次 merged，大目录展开回退 full。
  const merged = runPlan('tools/lib/core/markdown-links.mjs')
  assert.equal(merged.status, 0, merged.stdout + merged.stderr)
  assert.match(merged.stdout, /vitest = merged/, merged.stdout)

  const fullFallback = runPlan('vitest.config.ts')
  assert.equal(fullFallback.status, 0, fullFallback.stdout + fullFallback.stderr)
  assert.match(fullFallback.stdout, /vitest = full/, fullFallback.stdout)
})

test('--lanes-only --dry-run：收口命令精准列出命中面、--all 全量、自动嗅探未推送/单提交仓，且 unseen 仍 fail-closed', () => {
  const all = spawnSync(process.execPath, [SCRIPT, '--lanes-only', '--all', '--dry-run'], { encoding: 'utf8' })
  assert.equal(all.status, 0, all.stdout + all.stderr)
  assert.match(all.stdout, /应跑 client-load、preset、replay/, all.stdout)

  const one = spawnSync(process.execPath, [SCRIPT, '--lanes-only', '--dry-run', '--paths', 'packages/company-pack/src/client/wiring/error-ring.ts'], { encoding: 'utf8' })
  assert.equal(one.status, 0, one.stdout + one.stderr)
  assert.match(one.stdout, /应跑 client-load/, one.stdout)

  const unseen = spawnSync(process.execPath, [SCRIPT, '--lanes-only', '--dry-run', '--paths', 'zz-unseen/file.txt'], { encoding: 'utf8' })
  assert.notEqual(unseen.status, 0, unseen.stdout + unseen.stderr)
  assert.match(unseen.stdout, /未分类改动面/, unseen.stdout)

  // 单 commit 干净树（无 HEAD~1、无 upstream）：不崩且能识别根提交命中面。
  const single = repo()
  try {
    single.commit(CLIENT_FILE, 'export const rootOnly = 1\n', 'feat: initial client')
    const res = spawnSync(process.execPath, [SCRIPT, '--root', single.dir, '--lanes-only', '--dry-run'], { encoding: 'utf8' })
    const out = `${res.stdout}${res.stderr}`
    assert.equal(res.status, 0, `单 commit 仓不许崩：${out}`)
    assert.match(out, /应跑 client-load/, `单 commit 根提交 client 改动必须命中 client-load：${out}`)
  } finally { single.cleanup() }

  // 无 upstream 的多提交本地分支（父提交改 client、tip 只改 docs，工作树干净）：须聚合所有未推送提交不漏面。
  const multi = repo()
  try {
    multi.commit(CLIENT_FILE, 'export const parentClient = 1\n', 'feat: client')
    multi.commit(DOC_FILE, '# docs\n', 'docs: follow-up')
    const res = spawnSync(process.execPath, [SCRIPT, '--root', multi.dir, '--lanes-only', '--dry-run'], { encoding: 'utf8' })
    const out = `${res.stdout}${res.stderr}`
    assert.equal(res.status, 0, out)
    assert.match(out, /应跑 client-load/, `无 upstream 多提交分支不能静默漏掉父提交 client-load：${out}`)
  } finally { multi.cleanup() }
})
