/**
 * release 就绪判据（纯逻辑；**唯一家**，2026-11-19 BUG-280/282）。
 *
 * 为什么：`stamp` 与 `check` 各写一份「manifest 是否对得上产物」的检查——stamp 少了 check 的
 * 若干项，于是两个入口对同一棵树可以给出不同结论（BUG-282）。手册也是产物（同源生成），
 * 但它的判据只活在 `pnpm verify` 的 dist-manual 门禁里，发布路径不查（BUG-280）。
 * 这里把两件都收成纯函数：入口只负责读盘/写盘，判据只有一份。
 */
import { renderInstallManual } from './install-manual.mjs'

/** 从手册表头读渲染输入（版本/包名/sha/日期）；缺一项 = undefined。 */
export function manualHeaderCells(manual) {
  if (typeof manual !== 'string') return undefined
  const cell = label => {
    const line = manual.split('\n').find(candidate => candidate.startsWith(`| ${label} |`))
    if (line === undefined) return undefined
    const raw = line.split('|').slice(2, -1).join('|').trim()
    return /`([^`]+)`/.exec(raw)?.[1]?.trim() ?? raw
  }
  const tarballName = cell('安装包')
  const digest = cell('校验（sha256）')
  const date = cell('打包日期')
  const version = cell('版本')
  if (version === undefined || tarballName === undefined || digest === undefined || date === undefined) return undefined
  return { version, tarballName, digest, date }
}

/**
 * 手册必须是**当前模板的产物**（逐字节等于用自身表头字段重渲染的结果）。
 * @param {{manual:string, version:string, expectedTag:string}} input
 * @returns {string|undefined}
 */
export function manualProductProblem({ manual, version, expectedTag }) {
  const cells = manualHeaderCells(manual)
  if (cells === undefined) return '手册表头缺版本/安装包/校验/打包日期（不是模板产物，或手改坏了表头）'
  if (cells.version !== version) return `手册版本 ${cells.version} ≠ package ${version}`
  const rendered = renderInstallManual({ ...cells, version, expectedTag, entries: 0 })
  if (rendered === manual) return undefined
  let at = 0
  while (at < rendered.length && at < manual.length && rendered[at] === manual[at]) at += 1
  const around = text => JSON.stringify(text.slice(Math.max(0, at - 40), at + 60))
  return `手册不是当前模板的产物：首处差异 @${String(at)} 模板=${around(rendered)} 手册=${around(manual)}`
}

/**
 * 「manifest 对得上当前源码/管线/产物」的判据（`--verify` 的入口前置、以及 stamp/check 的前半段）。
 * 只判**可提前判**的三项身份；脏树与 checks 状态在 `readinessProblems` 里补。
 * @param {{manifest: Record<string, any>, version: string, sourceFingerprint: string, pipelineFingerprint: string, artifactSha256: string}} input
 * @returns {string[]} 问题列表（空 = 产物身份对齐）
 */
export function artifactAlignmentProblems({ manifest, version, sourceFingerprint, pipelineFingerprint, artifactSha256 }) {
  if (manifest === undefined || manifest === null || typeof manifest !== 'object') return ['缺 release-manifest.json；先 --prepare/--verify']
  const problems = []
  if (manifest.version !== version) problems.push(`manifest 版本 ${String(manifest.version)} ≠ package ${version}`)
  if (manifest.sourceFingerprint !== sourceFingerprint) problems.push('pack 源码面已变但 _dist 没重打')
  if (manifest.pipelineFingerprint !== pipelineFingerprint) problems.push('发布管线已变但 _dist 没重打')
  if (manifest.artifact?.sha256 !== artifactSha256) problems.push('manifest sha256 与当前 tgz 不一致')
  return problems
}

/**
 * manifest 与当前仓库/产物的就绪判据（`--stamp` 与 `--check` 共用）。
 * **不含** gitSha 判定（那是两入口唯一允许的差别：stamp 就是要把 gitSha 挪到 HEAD）。
 * @param {{manifest: Record<string, any>, version: string, sourceFingerprint: string, pipelineFingerprint: string, artifactSha256: string}} input
 * @returns {string[]} 问题列表（空 = 就绪）
 */
export function readinessProblems({ manifest, version, sourceFingerprint, pipelineFingerprint, artifactSha256 }) {
  const problems = artifactAlignmentProblems({ manifest, version, sourceFingerprint, pipelineFingerprint, artifactSha256 })
  if (problems.length > 0 && (manifest === undefined || manifest === null || typeof manifest !== 'object')) return problems
  if (manifest.dirty !== false) problems.push('manifest 记录的是脏树（发布字节不对应一个干净 commit；重跑 --verify）')
  const checks = manifest.checks ?? {}
  if (checks.verify !== 'pass' || checks.test !== 'pass') problems.push('manifest 未记录 verify/test 通过（--prepare 后必须 --verify）')
  const notPass = Object.entries(checks).filter(([, status]) => status !== 'pass')
  if (notPass.length > 0) problems.push(`manifest 有未通过的检查：${notPass.map(([name, status]) => `${name}=${String(status)}`).join(', ')}`)
  return problems
}
