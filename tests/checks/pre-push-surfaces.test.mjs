// 状态：常驻
// 何时跑：改 `checks/pre-push-surfaces.mjs`（push 范围计算）或 `tools/lib/asset-lanes.mjs` SURFACE_RULES 后；
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
const DOC_FILE = 'docs/index.md'

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
