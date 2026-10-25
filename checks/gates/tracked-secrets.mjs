// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增/修改源码、脚本、文档或夹具后。
// 为什么：`tracked-token` 只认 URL 查询串；BUG-013 的真实形状是 `const TOKEN = '...'`，它会漏。
// 本门禁扫 tracked 文本里的「带引号凭据赋值」（>=16 字符、熵 >=3.5），值不打印；合成夹具面
// （checks/lib/ci-security-gates/fixtures|evidence）由 a2 自测与 MANIFEST 指纹负责，不在本门重复扫。
// 负例留证 2026-10-25：`notes/zz-secret-test.md` 写
//   `const TOKEN = '<value>'` + `git add` → 红：
//   `FAIL tracked-secrets: 1 件 tracked 文本含硬编码凭据赋值：notes/zz-secret-test.md:1 key=TOKEN len=32`；
//   `git rm --cached` + `rm` → 绿。
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { findSecretAssignments } from '../../tools/lib/tracked-secrets.mjs'

const MAX_BYTES = 2 * 1024 * 1024
const SKIP_PREFIXES = ['vendor/', 'checks/lib/ci-security-gates/fixtures/', 'checks/lib/ci-security-gates/evidence/']

export function run({ root, ok, fail }) {
  let files
  try {
    files = execFileSync('git', ['ls-files', '-z'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }).split('\0').filter(Boolean)
  } catch (error) {
    fail('tracked-secrets', `git ls-files 失败，无法判定 tracked 面：${String(error?.message ?? error)}`)
    return
  }

  const hits = []
  let scanned = 0
  let skipped = 0
  for (const rel of files) {
    if (SKIP_PREFIXES.some(prefix => rel.startsWith(prefix))) continue
    const abs = join(root, rel)
    let stat
    try { stat = statSync(abs) } catch { continue }
    if (!stat.isFile() || stat.size > MAX_BYTES) { skipped++; continue }
    const buffer = readFileSync(abs)
    if (buffer.includes(0)) { skipped++; continue }
    scanned++
    for (const hit of findSecretAssignments(buffer.toString('utf8'))) {
      hits.push(`${rel}:${String(hit.line)} key=${hit.key} len=${String(hit.valueLength)}`)
    }
  }

  if (hits.length === 0) {
    ok(`tracked-secrets ×${String(scanned)}（tracked 面零硬编码凭据赋值；跳过 ${String(skipped)} 个二进制/超大/夹具件）`)
    return
  }
  fail(
    'tracked-secrets',
    `${String(hits.length)} 件 tracked 文本含硬编码凭据赋值（值不打印）：${hits.slice(0, 10).join('；')}`
      + (hits.length > 10 ? '；…' : ''),
  )
}
