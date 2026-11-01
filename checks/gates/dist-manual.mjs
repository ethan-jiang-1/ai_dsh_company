// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expectedTag } from './lib/pin.mjs'

// ── 2g. 手动分发手册版本 + 安装形状门禁（2026-09-28 立；2026-11-01 v3 重写）────────
// 为什么：手册是收件人的唯一安装路径；版本对但内容教旧形状（launcher/--workspace/一 home
// 一 workspace/seed）就是装错。0.6.0 起形状 = Plugins 页默认、`dsh --profile company`、
// run bundle 在 `<workspace>/.dsh-company/`、插件内容在包 `content/`。
// 负例留证：删「Plugins」或写入 `--workspace` → 本门禁红；重跑 export-dist → 绿。
export function run({ root, ok, fail }) {
  const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
  const manualPath = join(root, '_dist', '安装手册.md')
  if (!existsSync(manualPath)) {
    fail('dist-manual', '_dist/安装手册.md 缺失——跑 `node tools/export-dist.mjs` 生成（tracked 生成物，随版本变更同 diff 重导）')
    return
  }
  const manual = readFileSync(manualPath, 'utf8')
  const header = manual.split('| 版本 |')[1]?.split('|')[0]?.trim()
  const problems = []
  if (header !== packVersion) {
    problems.push(`表头版本（${header ?? '解析不到'}）≠ pack package.json（${packVersion}）——重跑 \`node tools/export-dist.mjs\` 再提交，别手改手册`)
  }
  const required = ['Plugins', 'dsh --profile company', '.dsh-company/bundle.json', 'content/', 'kb/',
    'deliverables/', 'exports', 'company/ledger', 'sha256', 'DSH', 'dsh --version', '卸载', '回退',
    'DSH_COMPANY_BROWSER', 'dsh-web-app', '仅 `dsh web`', '三个成功']
  const missing = required.filter(phrase => !manual.includes(phrase))
  if (missing.length > 0) problems.push(`手册缺安装形状/契约关键句：${missing.join(' / ')}`)
  const forbidden = ['--workspace', '--profile desktop', 'bin/dsh-company', 'seed-consent',
    'handbookTarget', '一次安装 = 一个 DSH home', '换项目 = 新建一个 home']
  const found = forbidden.filter(phrase => manual.includes(phrase))
  if (found.length > 0) problems.push(`手册仍教旧形状：${found.join(' / ')}（0.6.0 以 .dsh-company/ 与 named profile 为准）`)
  if (!/Plugins/.test(manual)) problems.push('手册缺应用内 Plugins 页默认安装路径')
  if (!/不需要.*Node|不要求.*Node/.test(manual)) problems.push('手册应说明不要求用户单独安装 Node/pnpm（DSH 已装好）')
  if (!/仅 `dsh web`/.test(manual)) problems.push('手册的 CLI 段缺「仅 `dsh web`」边界')
  if (!manual.includes(expectedTag)) problems.push(`手册缺验证基线 \`${expectedTag}\`（pin 漂了或没重导）`)
  const manualHash = /[0-9a-f]{64}/.exec(manual)?.[0]
  if (manualHash === undefined) problems.push('手册缺 tgz 的 sha256（64 位十六进制）——重跑 `node tools/export-dist.mjs`')
  const tarball = join(root, '_dist', `dsh-company-pack-${packVersion}.tgz`)
  if (existsSync(tarball) && manualHash !== undefined) {
    const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
    if (digest !== manualHash) problems.push(`手册 sha256（${manualHash}）≠ tgz 本体（${digest}）——重跑 \`node tools/export-dist.mjs\``)
    const sidecar = `${tarball}.sha256`
    if (!existsSync(sidecar)) problems.push('_dist 缺 tgz 的 .sha256 旁文件——重跑 `node tools/export-dist.mjs`')
    else if (!readFileSync(sidecar, 'utf8').trim().startsWith(digest)) problems.push('_dist 的 .sha256 旁文件与 tgz 本体不一致——重跑 `node tools/export-dist.mjs`')
  }
  problems.length === 0
    ? ok(`dist-manual（版本 ${packVersion} + DSH 安装形状 + sha256 + pin ${expectedTag}）`)
    : fail('dist-manual', problems.join('；'))
}
