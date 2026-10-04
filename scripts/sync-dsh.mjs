#!/usr/bin/env node
// 状态：常驻
// 何时跑：升 pin 前/后的簿记核对（默认只读检查）；`--pin <tag>` 走完整程序（成本与合同唯一见 docs/release.md）。
// 认证档（不进 pnpm test）：检查模式只读；--pin 在验证候选后发布簿记/兼容矩阵。
// 失败恢复受控元数据和原 HEAD，不 reset/clean。依赖和 ignored 构建产物不在回滚范围。
// 人审证据只作声明校验，不声称脚本能语义审计流程合同。完整合同见 docs/release.md。
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireDevHome } from './lib/runtime-home.mjs'
import { assertProcessReview, pinTransaction, replaceOne } from './lib/pin-transaction.mjs'
import { plainNodeEnv, releaseProcesses } from './lib/release-process.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(ROOT, 'vendor/dsh')
const args = process.argv.slice(2)
let processes
try {
  const pinAt = args.indexOf('--pin')
  const reviewAt = args.indexOf('--process-review')
  const pin = pinAt < 0 ? undefined : args[pinAt + 1]
  if (args.length && (pinAt !== 0 || reviewAt !== 2 || args.length !== 4 || !/^[\w][\w.-]*$/.test(pin ?? ''))) {
    throw new Error('用法：sync-dsh.mjs [--pin <tag> --process-review <repo-relative.json>]')
  }
  const home = pin === undefined ? undefined : requireDevHome('sync-dsh')
  const env = plainNodeEnv({ ...process.env, ...(home ? {
    DSH_HOME: home, npm_config_cache: join(home, 'tmp/npm-cache'), npm_config_store_dir: join(ROOT, '.pnpm-store'),
    npm_config_verify_deps_before_run: 'false',
  } : {}) })
  processes = releaseProcesses({ cwd: ROOT, env })
  const run = (cmd, argv, options) => processes.run(cmd, argv, options)
  const gitVendor = async argv => (await run('git', ['-C', VENDOR, ...argv])).trim()
  const verifyPath = join(ROOT, 'scripts/verify.mjs')
  const agentsPath = join(ROOT, 'AGENTS.md')
  const manifestPath = join(ROOT, 'packages/company-pack/package.json')
  const lockPath = join(ROOT, 'pnpm-lock.yaml')
  const verifyText = readFileSync(verifyPath, 'utf8')
  const agentsText = readFileSync(agentsPath, 'utf8')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const v = { tag: /const expectedTag = '([^']+)'/.exec(verifyText)?.[1], sha: /const expectedSha = '([0-9a-f]{40})'/.exec(verifyText)?.[1] }
  const a = /当前钉住：tag `([^`]+)` = `([0-9a-f]{40})`/.exec(agentsText)
  const matrix = manifest?.dsh?.compatibility?.dshReleases
  const head = await gitVendor(['rev-parse', 'HEAD'])
  const problems = []
  if (v.sha !== head) problems.push(`verify.mjs SHA ${v.sha} ≠ HEAD ${head}`)
  if (a?.[2] !== head) problems.push(`AGENTS.md SHA ${a?.[2]} ≠ HEAD ${head}`)
  if (!v.tag || a?.[1] !== v.tag) problems.push('verify.mjs 与 AGENTS.md tag 缺失或不一致')
  if (!Array.isArray(matrix) || !matrix.includes(v.tag)) problems.push(`兼容矩阵缺当前 tag ${v.tag}`)
  if (problems.length) throw new Error(`簿记漂移：\n  ${problems.join('\n  ')}`)
  if (pin === undefined) {
    console.log(`sync-dsh: 簿记一致（${v.tag} @ ${head.slice(0, 8)}；矩阵 ${matrix.length} 列；未做流程语义审计）`)
  } else {
    const dirtyVendor = await gitVendor(['status', '--porcelain'])
    if (dirtyVendor) throw new Error(`vendor/dsh 工作树不干净：\n${dirtyVendor}`)
    const dirtyRepo = (await run('git', ['status', '--porcelain'])).trim()
    if (dirtyRepo) throw new Error(`仓库工作树不干净；不覆盖用户改动：\n${dirtyRepo.slice(0, 500)}`)
    const reviewPath = realpathSync(resolve(ROOT, args[reviewAt + 1]))
    const reviewRel = relative(ROOT, reviewPath)
    if (isAbsolute(reviewRel) || reviewRel.startsWith('..')) throw new Error('process-review 必须在仓库内')
    await run('git', ['ls-files', '--error-unmatch', '--', reviewRel])
    const review = JSON.parse(readFileSync(reviewPath, 'utf8'))
    // Reject absent evidence before network or checkout; exact candidate SHA is checked below.
    assertProcessReview(review, head, review.toSha)
    if (!/^[0-9a-f]{40}$/.test(review.toSha ?? '')) throw new Error('process-review toSha 必须为完整 SHA')
    await run('pnpm', ['verify'])
    console.log(`① fetch 候选 tag ${pin}（尚未写入兼容矩阵）`)
    await gitVendor(['fetch', '--tags', 'origin'])
    const newSha = await gitVendor(['rev-parse', '--verify', `refs/tags/${pin}^{commit}`])
    assertProcessReview(review, head, newSha)
    if (newSha === head) throw new Error('候选与当前 SHA 相同；未进行升 pin')
    console.log(`人审声明：${review.reviewedBy} / ${review.reviewedAt} / ${reviewRel}；仅校验声明字段与 SHA，不是脚本语义审计`)
    const oldRef = await gitVendor(['rev-parse', '--abbrev-ref', 'HEAD'])
    const nextManifest = structuredClone(manifest)
    nextManifest.dsh.compatibility.dshReleases = [...new Set([...matrix, pin])]
    const updates = [
      { path: verifyPath, content: replaceOne(replaceOne(verifyText, /const expectedTag = '[^']+'/, `const expectedTag = '${pin}'`), /const expectedSha = '[0-9a-f]{40}'/, `const expectedSha = '${newSha}'`) },
      { path: agentsPath, content: replaceOne(agentsText, /当前钉住：tag `[^`]+` = `[0-9a-f]{40}`/, `当前钉住：tag \`${pin}\` = \`${newSha}\``) },
      { path: manifestPath, content: `${JSON.stringify(nextManifest, null, 2)}\n` },
    ]
    let checkoutAttempted = false
    await pinTransaction({
      updates, observedPaths: [lockPath],
      async validate({ observe }) {
        checkoutAttempted = true
        await gitVendor(['checkout', '--detach', newSha])
        console.log('② 安装候选依赖；候选 metadata 仍只在内存')
        try { await run('pnpm', ['install'], { timeoutMs: 180_000 }) } finally { observe(lockPath) }
        console.log('③ vendor 自有 build（确保新 pin 不借用旧产物）')
        await run('pnpm', ['run', 'build'], { cwd: VENDOR, timeoutMs: 600_000 })
        console.log('④ test + release-smoke（真实 built CLI / tarball 安装）')
        await run('pnpm', ['test'], { timeoutMs: 120_000 })
        const smokeOutput = await run(process.execPath, [join(ROOT, 'scripts/release-smoke.mjs')], { timeoutMs: 600_000, killGraceMs: 20_000 })
        console.log(smokeOutput)
      },
      async verify() {
        console.log('⑤ 候选已通过：写入簿记/矩阵，再 verify；失败仍回滚')
        await run('pnpm', ['verify'])
      },
      async rollback() {
        if (!checkoutAttempted) return
        // A signal cancels the ordinary runner; recovery has its own bounded lifetime.
        await processes.close()
        const recovery = releaseProcesses({ cwd: ROOT, env })
        try {
          const current = (await recovery.run('git', ['-C', VENDOR, 'rev-parse', 'HEAD'])).trim()
          if (current !== newSha && current !== head) throw new Error(`vendor HEAD 已被另一个操作改变，保留 ${current}；请人工恢复`)
          const dirty = (await recovery.run('git', ['-C', VENDOR, 'status', '--porcelain'])).trim()
          if (dirty) throw new Error(`vendor 有新改动，不覆盖：${dirty}`)
          await recovery.run('git', ['-C', VENDOR, 'checkout', oldRef === 'HEAD' ? head : oldRef])
          console.error('sync-dsh: 已恢复原 vendor HEAD 与受控元数据；依赖/ignored 产物未回滚，请按原 pin 重装/重建')
        } finally { await recovery.close() }
      },
    })
    console.log(`sync-dsh: 升 pin 验证完成 ${pin} @ ${newSha}；提交 vendor 指针、两处簿记、矩阵、lockfile；人审证据 ${reviewRel}`)
  }
} catch (error) {
  console.error(`sync-dsh: ${error.message}`)
  process.exitCode = 1
} finally {
  try { await processes?.close() } catch (error) { console.error(error); process.exitCode = 1 }
}
